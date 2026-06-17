// Backfills appt_date on leads that were imported before the column existed.
// Reads each contractor's Monday board, finds items already linked in portal,
// and updates appt_date + booked_by where they're currently null.
// Usage: npx tsx scripts/backfill-appt-dates.ts
//        CONTRACTOR_EMAIL=bruce@truproroofing.com npx tsx scripts/backfill-appt-dates.ts
import { config } from "dotenv"
import { createClient } from "@supabase/supabase-js"
config({ path: ".env.local" })

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

function col(item: any, ...titles: string[]): string {
  for (const t of titles) {
    const v = item.column_values?.find(
      (c: any) => c.column?.title?.toLowerCase() === t.toLowerCase()
    )?.text?.trim()
    if (v) return v
  }
  return ""
}

async function fetchBoardItems(boardId: string) {
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
          items_page(limit: 500) {
            items {
              id
              column_values { id text column { title } }
            }
          }
        }
      }`,
    }),
  })
  const json = await res.json()
  if (json.errors) throw new Error(JSON.stringify(json.errors))
  return json.data?.boards?.[0]?.items_page?.items ?? []
}

async function backfillForContractor(contractor: {
  id: string
  company_name: string
  monday_board_id: string
  monday_board_ids?: string[] | null
}) {
  console.log(`\n=== ${contractor.company_name} ===`)

  const allBoardIds = [contractor.monday_board_id, ...(contractor.monday_board_ids ?? [])].filter(Boolean) as string[]
  let items: any[] = []
  for (const boardId of allBoardIds) {
    try {
      items = items.concat(await fetchBoardItems(boardId))
    } catch (e: any) {
      console.log(`  Error fetching board ${boardId}: ${e.message}`)
    }
  }
  if (items.length === 0) return

  // Build map: monday_item_id → { appt_date, booked_by }
  const itemMap = new Map<string, { appt_date: string | null; appt_time: string | null; booked_by: string | null }>()
  for (const item of items) {
    const appt = col(item, "Appt Date", "date booked", "Appointment Date") || null
    const apptTime = col(item, "Appt Time", "Appointment Time", "Time") || null
    const booked = col(item, "People", "Person", "Booked By") || null
    if (appt || apptTime || booked) itemMap.set(item.id, { appt_date: appt, appt_time: apptTime, booked_by: booked })
  }

  if (itemMap.size === 0) {
    console.log("  No appt dates found on board")
    return
  }

  // Get all contractor_leads for this contractor that have a monday_item_id
  const { data: cls } = await admin
    .from("contractor_leads")
    .select("lead_id, monday_item_id")
    .eq("contractor_id", contractor.id)
    .not("monday_item_id", "is", null)

  let updated = 0
  for (const cl of cls ?? []) {
    const data = itemMap.get(cl.monday_item_id)
    if (!data) continue

    const patch: Record<string, string | null> = {}
    if (data.appt_date) patch.appt_date = data.appt_date
    if (data.appt_time) patch.appt_time = data.appt_time
    if (data.booked_by) patch.booked_by = data.booked_by
    if (Object.keys(patch).length === 0) continue

    const { error } = await admin.from("leads").update(patch).eq("id", cl.lead_id)
    if (error) {
      console.log(`  Error updating lead ${cl.lead_id}: ${error.message}`)
    } else {
      console.log(`  Updated lead ${cl.lead_id}: appt=${data.appt_date}, booked=${data.booked_by}`)
      updated++
    }
  }

  console.log(`  → ${updated} leads updated`)
}

async function main() {
  const email = process.env.CONTRACTOR_EMAIL

  let contractors: { id: string; company_name: string; monday_board_id: string }[]

  if (email) {
    const { data } = await admin
      .from("contractors")
      .select("id, company_name, monday_board_id, monday_board_ids")
      .eq("email", email)
      .not("monday_board_id", "is", null)
    contractors = (data ?? []) as any
  } else {
    const { data } = await admin
      .from("contractors")
      .select("id, company_name, monday_board_id, monday_board_ids")
      .not("monday_board_id", "is", null)
      .neq("status", "pending")
    contractors = (data ?? []) as any
  }

  for (const c of contractors) {
    await backfillForContractor(c)
  }
  console.log("\nDone.")
}

main().catch(console.error)
