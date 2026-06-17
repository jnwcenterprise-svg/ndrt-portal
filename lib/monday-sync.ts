// Syncs Monday board items into Supabase contractor_leads + leads tables.
// Handles leads that were entered directly in Monday (not via the portal flow).
import { createAdminClient } from "@/lib/supabase/admin"
import {
  fetchAllBoardItems,
  lookupGroupStatus,
  type MondayBoardItem,
} from "@/lib/monday"
import type { SupabaseClient } from "@supabase/supabase-js"

export type { MondayBoardItem }

export interface SyncResult {
  contractor_id: string
  board_id: string
  created: number
  skipped: number
  errors: string[]
}

function colText(item: MondayBoardItem, ...titles: string[]): string | null {
  for (const title of titles) {
    const col = item.column_values.find(
      (c) => c.column.title.toLowerCase() === title.toLowerCase()
    )
    if (col?.text?.trim()) return col.text.trim()
  }
  return null
}

// Parse the briefing block written by buildBriefingBlock() back into fields.
function parseBriefingBlock(notes: string | null): {
  address: string | null
  city: string | null
  state: string | null
  squares: number | null
  roof_type: string | null
  dol: string | null
  damage_type: string | null
  hail_size: string | null
  contact_name: string | null
  contact_title: string | null
  contact_phone: string | null
  contact_email: string | null
} {
  const empty = {
    address: null, city: null, state: null,
    squares: null, roof_type: null, dol: null,
    damage_type: null, hail_size: null,
    contact_name: null, contact_title: null,
    contact_phone: null, contact_email: null,
  }
  if (!notes) return empty

  const val = (s: string) => (s === "—" || !s.trim() ? null : s.trim())

  const addr = notes.match(/^Address:\s+(.+),\s+(.+),\s+([A-Z]{2})\s*$/m)
  const sq   = notes.match(/^Squares:\s+(\S+)\s+\|\s+Roof Type:\s+(.+?)\s*$/m)
  const dol  = notes.match(/^DOL:\s+(\S+)\s+\|\s+Damage:\s+(.+?)\s+\|\s+Hail:\s+(.+?)\s*$/m)
  const con  = notes.match(/^Contact:\s+(.+?),\s+(.+?)\s*$/m)
  const ph   = notes.match(/^Phone:\s+(\S+)\s+\|\s+Email:\s+(.+?)\s*$/m)

  return {
    address:       addr ? val(addr[1]) : null,
    city:          addr ? val(addr[2]) : null,
    state:         addr ? val(addr[3]) : null,
    squares:       sq  ? (val(sq[1]) ? parseFloat(sq[1]) || null : null) : null,
    roof_type:     sq  ? val(sq[2])  : null,
    dol:           dol ? val(dol[1]) : null,
    damage_type:   dol ? val(dol[2]) : null,
    hail_size:     dol ? val(dol[3]) : null,
    contact_name:  con ? val(con[1]) : null,
    contact_title: con ? val(con[2]) : null,
    contact_phone: ph  ? val(ph[1])  : null,
    contact_email: ph  ? val(ph[2])  : null,
  }
}

// Create a leads + contractor_leads row from a raw Monday board item.
// Idempotent — skips items that already have a contractor_leads row.
export async function createLeadFromMondayItem(
  admin: SupabaseClient,
  contractorId: string,
  item: MondayBoardItem
): Promise<{ created: boolean; error: string | null }> {
  const mondayItemId = item.id

  const { data: existing } = await admin
    .from("contractor_leads")
    .select("id")
    .eq("monday_item_id", mondayItemId)
    .maybeSingle()

  if (existing) return { created: false, error: null }

  const notesText    = colText(item, "Notes", "Details", "Description")
  const parsed       = parseBriefingBlock(notesText)
  const bookedBy     = colText(item, "Booked By", "Owner Name", "Rep Name")
  const dateText     = colText(item, "Date", "Delivery Date")
  const contactPhone = colText(item, "Phone Number", "Phone", "Contact Phone") ?? parsed.contact_phone
  const contactEmail = colText(item, "Email", "Contact Email")                 ?? parsed.contact_email
  const propertyName = colText(item, "Business Name", "Property Name", "Company") ?? item.name

  const mapping       = lookupGroupStatus(item.group.title)
  const leadStatus    = mapping?.lead_status    ?? "new"
  const billingStatus = mapping?.billing_status ?? "delivered"
  const isPaid        = leadStatus === "paid"

  let deliveredAt = new Date().toISOString()
  if (dateText) {
    const d = new Date(dateText)
    if (!isNaN(d.getTime())) deliveredAt = d.toISOString()
  }

  const { data: lead, error: leadErr } = await admin
    .from("leads")
    .insert({
      property_name:  propertyName,
      address:        parsed.address    ?? "",
      city:           parsed.city       ?? "",
      state:          parsed.state      ?? "",
      asset_class:    "warehouse",
      claim_verified: false,
      status:         "assigned",
      contact_name:   parsed.contact_name,
      contact_title:  parsed.contact_title,
      contact_phone:  contactPhone,
      contact_email:  contactEmail,
      roof_type:      parsed.roof_type,
      damage_type:    parsed.damage_type,
      hail_size:      parsed.hail_size,
      squares:        parsed.squares,
      dol:            parsed.dol,
      booked_by:      bookedBy,
      ndrt_notes:     notesText,
    })
    .select("id")
    .single()

  if (leadErr || !lead) {
    return { created: false, error: leadErr?.message ?? "lead insert returned no data" }
  }

  const { error: clErr } = await admin.from("contractor_leads").insert({
    contractor_id:   contractorId,
    lead_id:         lead.id,
    delivered_at:    deliveredAt,
    lead_status:     leadStatus,
    billing_status:  billingStatus,
    monday_item_id:  mondayItemId,
    monday_group_id: item.group.id,
    paid_at:         isPaid ? deliveredAt : null,
  })

  if (clErr) {
    // Roll back the orphaned lead row
    await admin.from("leads").delete().eq("id", lead.id)
    return { created: false, error: clErr.message }
  }

  return { created: true, error: null }
}

export async function syncBoardToSupabase(
  contractorId: string,
  boardId: string
): Promise<SyncResult> {
  const admin = createAdminClient()
  const result: SyncResult = { contractor_id: contractorId, board_id: boardId, created: 0, skipped: 0, errors: [] }

  let items: MondayBoardItem[]
  try {
    items = await fetchAllBoardItems(boardId)
  } catch (err: any) {
    result.errors.push(`Board fetch failed: ${err.message}`)
    return result
  }

  for (const item of items) {
    try {
      const { created, error } = await createLeadFromMondayItem(admin, contractorId, item)
      if (error) {
        result.errors.push(`Item ${item.id} (${item.name}): ${error}`)
      } else if (created) {
        result.created++
      } else {
        result.skipped++
      }
    } catch (err: any) {
      result.errors.push(`Item ${item.id} (${item.name}): ${err.message}`)
    }
  }

  return result
}

export async function syncAllBoards(): Promise<SyncResult[]> {
  const admin = createAdminClient()
  const { data: contractors } = await admin
    .from("contractors")
    .select("id, monday_board_id")
    .not("monday_board_id", "is", null)
    .eq("status", "active")

  if (!contractors?.length) return []

  const results: SyncResult[] = []
  for (const c of contractors) {
    const r = await syncBoardToSupabase(c.id, c.monday_board_id!)
    results.push(r)
  }
  return results
}
