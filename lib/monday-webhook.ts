// Core Monday webhook event processing — used by both the live webhook route
// and the retry runner. Extracted so failed events can be replayed without
// going through HTTP.
import type { SupabaseClient } from "@supabase/supabase-js"
import { createAdminClient } from "@/lib/supabase/admin"
import { isDuplicateEvent } from "@/lib/webhook-dedup"
import {
  lookupGroupStatus,
  getItemGroupTitle,
  getItemNotesText,
  getItemUpdates,
  fetchBoardItem,
} from "@/lib/monday"
import { createLeadFromMondayItem } from "@/lib/monday-sync"
import { sendLeadPaidEmail, sendLowCreditEmail } from "@/lib/resend"
import { LOW_CREDIT_THRESHOLD } from "@/lib/config"
import type { Contractor, ContractorLead, Lead } from "@/lib/types"

/**
 * Process a Monday webhook event payload.
 *
 * @param event     The `body.event` object from Monday's webhook POST.
 * @param skipDedup Pass true when replaying from the retry queue — the event
 *                  key is already in webhook_events from the first attempt, so
 *                  the dedup check would incorrectly block it.
 */
export async function processEvent(event: any, skipDedup = false): Promise<void> {
  if (!event?.pulseId) return

  const admin = createAdminClient()

  if (!skipDedup && await isDuplicateEvent(admin, event)) {
    console.log("[monday webhook] duplicate event skipped:", event.type, event.pulseId)
    return
  }

  const eventType = String(event.type ?? "")

  if (eventType === "create_pulse" || eventType === "create_item") {
    await handleItemCreated(admin, event)
    return
  }

  const itemId = String(event.pulseId)

  const { data: contractorLead } = await admin
    .from("contractor_leads")
    .select("*")
    .eq("monday_item_id", itemId)
    .single<ContractorLead>()

  if (!contractorLead) return

  if (
    eventType === "move_item_to_group" ||
    eventType === "item_moved_to_any_group" ||
    eventType === "move_pulse_into_group"
  ) {
    await handleGroupMove(admin, contractorLead, event)
  } else if (
    eventType === "change_column_value" ||
    eventType === "change_column_values" ||
    eventType === "update_column_value"
  ) {
    await handleColumnChange(admin, contractorLead, event)
  } else if (eventType === "create_update") {
    await handleItemUpdate(admin, contractorLead, event)
  }
}

async function handleItemCreated(admin: SupabaseClient, event: any) {
  const itemId  = String(event.pulseId)
  const boardId = String(event.boardId)

  let contractorId: string | null = null

  const { data: byMain } = await admin
    .from("contractors")
    .select("id")
    .eq("monday_board_id", boardId)
    .eq("status", "active")
    .maybeSingle()

  if (byMain) {
    contractorId = byMain.id
  } else {
    const { data: byArr } = await admin
      .from("contractors")
      .select("id")
      .contains("monday_board_ids", [boardId])
      .eq("status", "active")
      .maybeSingle()
    contractorId = byArr?.id ?? null
  }

  if (!contractorId) {
    console.warn(`[monday webhook] create_pulse: no contractor for board ${boardId}`)
    return
  }

  let item: Awaited<ReturnType<typeof fetchBoardItem>>
  try {
    item = await fetchBoardItem(itemId)
  } catch (err) {
    console.error("[monday webhook] create_pulse: item fetch failed:", err)
    throw err // propagate so the retry queue can catch it
  }
  if (!item) return

  const { error } = await createLeadFromMondayItem(admin, contractorId, item)
  if (error) {
    throw new Error(`createLeadFromMondayItem failed for item ${itemId}: ${error}`)
  }
}

async function handleGroupMove(
  admin: SupabaseClient,
  contractorLead: ContractorLead,
  event: any
) {
  let groupTitle: string | null = event.destGroup?.title ?? null
  if (!groupTitle) {
    try {
      groupTitle = await getItemGroupTitle(String(event.pulseId))
    } catch (err) {
      console.error("[monday webhook] group lookup failed:", err)
      throw err
    }
  }
  if (!groupTitle) return

  const mapping = lookupGroupStatus(groupTitle)
  if (!mapping) {
    console.warn(`[monday webhook] unmapped group "${groupTitle}" — ignoring`)
    return
  }

  const movedToPaidDialer =
    groupTitle.trim().toUpperCase() === "PAID DIALER" &&
    contractorLead.billing_status !== "paid"

  const update: Record<string, unknown> = {
    lead_status:     mapping.lead_status,
    billing_status:  mapping.billing_status,
    monday_group_id: event.destGroupId
      ? String(event.destGroupId)
      : contractorLead.monday_group_id,
  }
  if (movedToPaidDialer) update.paid_at = new Date().toISOString()

  await admin.from("contractor_leads").update(update).eq("id", contractorLead.id)

  if (movedToPaidDialer) {
    const { data: contractor } = await admin
      .from("contractors")
      .select("*")
      .eq("id", contractorLead.contractor_id)
      .single<Contractor>()
    if (!contractor) return

    const remaining = Math.max(0, contractor.lead_credits - 1)
    await admin.rpc("decrement_contractor_credits", { contractor_id: contractor.id })

    const { data: lead } = await admin
      .from("leads")
      .select("*")
      .eq("id", contractorLead.lead_id)
      .single<Lead>()

    await sendLeadPaidEmail(contractor.email, lead?.property_name ?? "your lead", remaining)

    if (remaining <= LOW_CREDIT_THRESHOLD) {
      const recipients = [
        contractor.email,
        ...(contractor.notification_emails ?? []),
      ].filter(Boolean) as string[]
      for (const r of recipients) {
        await sendLowCreditEmail(r, remaining)
      }
    }

    if (contractor.crm_webhook_url && lead) {
      try {
        await fetch(contractor.crm_webhook_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source: "ndrt",
            event: "lead_delivered",
            lead: {
              id: lead.id,
              property_name: lead.property_name,
              address: lead.address,
              city: lead.city,
              state: lead.state,
              square_footage: lead.square_footage,
              asset_class: lead.asset_class,
              contact_name: lead.contact_name,
              contact_title: lead.contact_title,
              contact_phone: lead.contact_phone,
              contact_email: lead.contact_email,
              insurance_carrier: lead.insurance_carrier,
              claim_verified: lead.claim_verified,
              storm_event_date: lead.storm_event_date,
              roof_type: lead.roof_type,
              damage_type: lead.damage_type,
              hail_size: lead.hail_size,
              squares: lead.squares,
            },
            contractor: { id: contractor.id, company_name: contractor.company_name },
            delivered_at: new Date().toISOString(),
          }),
        })
      } catch (err) {
        console.error("[monday webhook] crm push failed:", err)
      }
    }
  }
}

async function handleItemUpdate(
  admin: SupabaseClient,
  contractorLead: ContractorLead,
  event: any
) {
  const textBody:   string = (event.textBody ?? event.value?.text ?? "").trim()
  const authorName: string = event.userName ?? "NDRT"
  const updateId:   string = String(event.updateId ?? "")

  if (textBody) {
    await admin.from("lead_notes").upsert(
      {
        contractor_lead_id: contractorLead.id,
        source: "monday",
        author: authorName,
        content: textBody,
        monday_update_id: updateId || null,
      },
      { onConflict: "monday_update_id", ignoreDuplicates: true }
    )
  }

  try {
    const updatesText = await getItemUpdates(String(event.pulseId))
    if (updatesText) {
      await admin
        .from("leads")
        .update({ ndrt_notes: updatesText })
        .eq("id", contractorLead.lead_id)
    }
  } catch (err) {
    console.error("[monday webhook] updates fetch for ndrt_notes failed:", err)
  }
}

async function handleColumnChange(
  admin: SupabaseClient,
  contractorLead: ContractorLead,
  event: any
) {
  const columnTitle = String(event.columnTitle ?? "").toLowerCase()
  const columnId    = String(event.columnId ?? "")
  const isNotes     = columnTitle === "notes" || columnId.startsWith("long_text")
  if (!isNotes) return

  let notes: string | null =
    event.value?.text ?? event.textValue ?? event.value?.value ?? null
  if (notes == null) {
    try {
      notes = await getItemNotesText(String(event.pulseId))
    } catch (err) {
      console.error("[monday webhook] notes lookup failed:", err)
      throw err
    }
  }

  await admin
    .from("contractor_leads")
    .update({ notes: notes ?? "" })
    .eq("id", contractorLead.id)
}
