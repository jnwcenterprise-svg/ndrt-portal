import type { SupabaseClient } from "@supabase/supabase-js"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  fetchAllBoardItems,
  lookupGroupStatus,
  type MondayBoardItem,
} from "@/lib/monday"
import { createLeadFromMondayItem } from "@/lib/monday-sync"

export interface ReconcileResult {
  contractor_id: string
  board_id: string
  missing_created: number
  drift_corrected: number
  /** Billing-status drift found but not auto-fixed — needs manual review */
  drift_skipped: number
  errors: string[]
}

async function reconcileItem(
  admin: SupabaseClient,
  contractorId: string,
  item: MondayBoardItem,
  result: ReconcileResult
): Promise<void> {
  const { data: existing } = await admin
    .from("contractor_leads")
    .select("id, lead_status, billing_status, monday_group_id")
    .eq("monday_item_id", item.id)
    .maybeSingle()

  if (!existing) {
    // Lead exists in Monday but not in Supabase — create it.
    // createLeadFromMondayItem is itself idempotent (checks monday_item_id first).
    const { created, error } = await createLeadFromMondayItem(admin, contractorId, item)
    if (error) {
      result.errors.push(`Create failed for item ${item.id} "${item.name}": ${error}`)
    } else if (created) {
      result.missing_created++
      console.log(`[reconcile] Created missing lead for Monday item ${item.id} "${item.name}"`)
    }
    return
  }

  const groupTitle = item.group.title.trim()
  const mapping = lookupGroupStatus(groupTitle)
  if (!mapping) return // unmapped group (e.g. archive), nothing to reconcile

  const { lead_status: expectedStatus, billing_status: expectedBilling } = mapping

  // ── Billing drift ────────────────────────────────────────────────────────
  // Billing transitions are tied to credit deduction and emails. We cannot
  // safely replay those side effects, so we log and skip rather than mutate.
  if (expectedBilling !== existing.billing_status) {
    result.drift_skipped++
    console.warn(
      `[reconcile] Billing drift on contractor_lead ${existing.id}: ` +
      `Monday group="${groupTitle}" expects billing_status=${expectedBilling}, ` +
      `actual=${existing.billing_status} — manual review required`
    )
    return
  }

  // ── Non-billing status drift ─────────────────────────────────────────────
  // billing_status already matches, so updating lead_status is safe — no
  // credits are deducted and no emails are sent.
  if (expectedStatus !== existing.lead_status) {
    const { error } = await admin
      .from("contractor_leads")
      .update({
        lead_status:     expectedStatus,
        monday_group_id: item.group.id,
      })
      .eq("id", existing.id)

    if (error) {
      result.errors.push(
        `Status update failed for contractor_lead ${existing.id}: ${error.message}`
      )
    } else {
      result.drift_corrected++
      console.log(
        `[reconcile] Corrected contractor_lead ${existing.id}: ` +
        `lead_status ${existing.lead_status} → ${expectedStatus}`
      )
    }
  }
}

export async function reconcileContractorBoard(
  contractorId: string,
  boardId: string
): Promise<ReconcileResult> {
  const admin = createAdminClient()
  const result: ReconcileResult = {
    contractor_id: contractorId,
    board_id: boardId,
    missing_created: 0,
    drift_corrected: 0,
    drift_skipped: 0,
    errors: [],
  }

  let items: MondayBoardItem[]
  try {
    items = await fetchAllBoardItems(boardId)
  } catch (err: any) {
    result.errors.push(`Board fetch failed: ${err.message}`)
    return result
  }

  for (const item of items) {
    try {
      await reconcileItem(admin, contractorId, item, result)
    } catch (err: any) {
      result.errors.push(`Item ${item.id} "${item.name}": ${err.message}`)
    }
  }

  return result
}

/**
 * Reconciles an NDRT-owned sandbox board (e.g. the payroll sandbox).
 * Items on these boards are mirrors of contractor leads — the same pulseId
 * exists on a contractor board. We do drift correction only; we never create
 * new leads because there is no contractor owner to assign them to.
 */
export async function reconcileSandboxBoard(boardId: string): Promise<ReconcileResult> {
  const admin = createAdminClient()
  const result: ReconcileResult = {
    contractor_id: "ndrt-sandbox",
    board_id: boardId,
    missing_created: 0,
    drift_corrected: 0,
    drift_skipped: 0,
    errors: [],
  }

  let items: MondayBoardItem[]
  try {
    items = await fetchAllBoardItems(boardId)
  } catch (err: any) {
    result.errors.push(`Board fetch failed: ${err.message}`)
    return result
  }

  for (const item of items) {
    try {
      const { data: existing } = await admin
        .from("contractor_leads")
        .select("id, lead_status, billing_status, monday_group_id")
        .eq("monday_item_id", item.id)
        .maybeSingle()

      if (!existing) {
        // Mirror item has no Supabase row yet — the contractor board webhook
        // should create it. Log so the reconcile summary makes it visible.
        console.warn(
          `[reconcile][sandbox] No contractor_lead for item ${item.id} "${item.name}" ` +
          `on board ${boardId} — skipping (contractor board webhook should create it)`
        )
        continue
      }

      // Reuse the same drift-correction logic as regular boards
      await reconcileItem(admin, "ndrt-sandbox", item, result)
    } catch (err: any) {
      result.errors.push(`Item ${item.id} "${item.name}": ${err.message}`)
    }
  }

  return result
}

export async function reconcileAllBoards(): Promise<ReconcileResult[]> {
  const admin = createAdminClient()
  const { data: contractors, error } = await admin
    .from("contractors")
    .select("id, monday_board_id, monday_board_ids")
    .eq("status", "active")

  if (error) {
    console.error("[reconcile] Failed to fetch contractors:", error.message)
    return []
  }
  if (!contractors?.length) return []

  // Build a flat list of (contractorId, boardId) pairs covering both the
  // primary board and every board in the monday_board_ids array.
  const pairs: { contractorId: string; boardId: string }[] = []
  for (const c of contractors) {
    const seen = new Set<string>()
    const add = (id: string | null | undefined) => {
      if (id && !seen.has(id)) { seen.add(id); pairs.push({ contractorId: c.id, boardId: id }) }
    }
    add(c.monday_board_id)
    for (const id of c.monday_board_ids ?? []) add(id)
  }

  const results: ReconcileResult[] = []
  for (const { contractorId, boardId } of pairs) {
    const r = await reconcileContractorBoard(contractorId, boardId)
    results.push(r)
    await new Promise(resolve => setTimeout(resolve, 600))
  }

  // Reconcile NDRT-owned sandbox boards (drift correction only, no lead creation)
  const sandboxIds = (process.env.NDRT_SANDBOX_BOARD_IDS ?? "18416066044")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)

  for (const boardId of sandboxIds) {
    const r = await reconcileSandboxBoard(boardId)
    results.push(r)
    await new Promise(resolve => setTimeout(resolve, 600))
  }

  return results
}
