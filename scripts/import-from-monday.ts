// Import leads from a contractor's Monday board into the portal.
// Pulls from all active groups (New Leads, Pending Payroll, Paid Dialer, Signed).
// Skips Denied Lead and Do Not Call entirely.
// Usage: CONTRACTOR_EMAIL=bruce@truproroofing.com npx tsx scripts/import-from-monday.ts
//        ALL=1 npx tsx scripts/import-from-monday.ts  (run for every contractor)
import { config } from "dotenv"
import { createClient } from "@supabase/supabase-js"

config({ path: ".env.local" })

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Monday group title → portal lead_status
// Keys are lowercase — all lookups are .toLowerCase() before matching
const GROUP_STATUS_MAP: Record<string, string> = {
  // New
  "new lead":             "new",
  "new leads":            "new",
  "new":                  "new",
  // Pending
  "pending payroll":      "pending",
  "pending":              "pending",
  // Paid
  "paid dialer":          "paid",
  "paid":                 "paid",
  "paid leads":           "paid",
  "paid 2026":            "paid",
  "2025 paid":            "paid",
  // Signed
  "signed":               "signed",
}

// Groups to skip entirely — no import, no portal record
const SKIP_GROUPS = new Set([
  "denied lead", "denied", "do not call",
  "2025 denied", "dead lead", "denied/ not inspected",
  "need rescheduled or dead",
])

function col(item: any, ...titles: string[]): string {
  for (const t of titles) {
    const v = item.column_values?.find(
      (c: any) => c.column?.title?.toLowerCase() === t.toLowerCase()
    )?.text?.trim()
    if (v) return v
  }
  return ""
}

function parseAddress(raw: string): { address: string; city: string; state: string } {
  const parts = raw.trim().split(/\s+/)
  const stateAbbr = parts[parts.length - 1]?.toUpperCase()
  const city = parts[parts.length - 2] ?? ""
  const address = parts.slice(0, parts.length - 2).join(" ")
  return { address: address || raw, city, state: stateAbbr || "TX" }
}

async function importForContractor(contractor: { id: string; company_name: string; monday_board_id: string; monday_board_ids?: string[] }) {
  const allBoardIds = [contractor.monday_board_id, ...(contractor.monday_board_ids ?? [])].filter(Boolean) as string[]
  let total = 0
  for (const boardId of allBoardIds) {
    total += await importFromBoard(contractor, boardId)
  }
  return total
}

const RESIDENTIAL_BOARD_IDS = new Set(["18416239123"])

async function importFromBoard(contractor: { id: string; company_name: string }, boardId: string) {
  const lead_type = RESIDENTIAL_BOARD_IDS.has(boardId) ? "residential" : "commercial"
  console.log(`\n=== ${contractor.company_name} (board ${boardId}) ===`)

  const res = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: process.env.MONDAY_API_TOKEN!,
      "API-Version": "2024-10",
    },
    body: JSON.stringify({
      query: `query {
        boards(ids: [${boardId}]) {
          groups { id title }
          items_page(limit: 500) {
            items {
              id name group { id title }
              column_values { id text column { title } }
            }
          }
        }
      }`,
    }),
  })
  const json = await res.json()
  const board = json.data?.boards?.[0]
  if (!board) { console.log("  Board not found — skipping"); return 0 }

  const items = board.items_page.items as any[]

  // Check which Monday item IDs are already in the portal for this contractor
  const { data: existing } = await admin
    .from("contractor_leads")
    .select("monday_item_id")
    .eq("contractor_id", contractor.id)
  const existingIds = new Set(existing?.map((r) => r.monday_item_id) ?? [])

  let imported = 0
  for (const item of items) {
    const groupTitle = item.group.title.trim().toLowerCase()

    // Skip denied/DNC completely
    if (SKIP_GROUPS.has(groupTitle)) continue

    const leadStatus = GROUP_STATUS_MAP[groupTitle]
    if (!leadStatus) {
      console.log(`  Unknown group "${item.group.title}" — skipping item: ${item.name}`)
      continue
    }

    if (existingIds.has(item.id)) continue

    const rawAddress = col(item, "Address")
    const { address, city, state } = rawAddress
      ? parseAddress(rawAddress)
      : { address: "Unknown", city: "Unknown", state: "TX" }

    const dolRaw    = col(item, "DOL")
    const apptRaw   = col(item, "Appt Date", "date booked", "Appointment Date")
    const apptTimeRaw = col(item, "Appt Time", "Appointment Time", "Time")
    const hailRaw   = col(item, "(if) Hail Size", "Hail Size")
    const damageRaw = col(item, "Damage Type")
    const roofRaw   = col(item, "Roof Type")
    const phoneRaw  = col(item, "Phone Number", "Phone")
    const emailRaw  = col(item, "Email")
    const ownerRaw  = col(item, "Owner Name", "Contact Name")
    const bookedRaw = col(item, "People", "Person", "Booked By")
    const sqFtRaw   = col(item, "sq ft", "Square Footage", "Sq Ft")

    const lead = {
      property_name: col(item, "Business Name", "Property Name", "Company") || item.name,
      address,
      city,
      state,
      contact_name:    ownerRaw  || null,
      contact_phone:   phoneRaw  || null,
      contact_email:   emailRaw  || null,
      square_footage:  sqFtRaw   ? parseInt(sqFtRaw) : null,
      roof_type:       roofRaw   || null,
      damage_type:     damageRaw || null,
      hail_size:       hailRaw   || null,
      dol:             dolRaw    || null,
      appt_date:       apptRaw   || null,
      appt_time:       apptTimeRaw || null,
      lead_type,
      booked_by:       bookedRaw || null,
      asset_class:     "retail" as const,
      status:          "assigned" as const,
    }

    const { data: inserted, error } = await admin.from("leads").insert(lead).select("id").single()
    if (error) { console.log(`  Error inserting ${item.name}: ${error.message}`); continue }

    const billingStatus = leadStatus === "paid" ? "paid"
      : leadStatus === "pending" ? "pending_payroll"
      : "delivered"

    const { error: clError } = await admin.from("contractor_leads").insert({
      contractor_id:   contractor.id,
      lead_id:         inserted.id,
      delivered_at:    new Date().toISOString(),
      lead_status:     leadStatus,
      billing_status:  billingStatus,
      monday_item_id:  item.id,
      monday_group_id: item.group.id,
    })
    if (clError) { console.log(`  Error linking ${item.name}: ${clError.message}`); continue }

    console.log(`  [${leadStatus}] ${item.name} (DOL: ${dolRaw || "—"})`)
    imported++
  }

  console.log(`  → ${imported} new leads imported`)
  return imported
}

async function main() {
  if (process.env.ALL === "1") {
    const { data: contractors } = await admin
      .from("contractors")
      .select("id, company_name, monday_board_id, monday_board_ids")
      .not("monday_board_id", "is", null)
      .neq("status", "pending")

    let total = 0
    for (const c of contractors ?? []) {
      total += await importForContractor(c as any)
    }
    console.log(`\n=== TOTAL: ${total} leads imported across all boards ===`)
  } else {
    const email = process.env.CONTRACTOR_EMAIL
    if (!email) { console.error("Set CONTRACTOR_EMAIL or ALL=1"); process.exit(1) }
    const { data: contractor } = await admin
      .from("contractors")
      .select("id, company_name, monday_board_id, monday_board_ids")
      .eq("email", email)
      .single()
    if (!contractor?.monday_board_id) throw new Error("No Monday board for contractor")
    await importForContractor(contractor as any)
  }
}

main().catch(console.error)
