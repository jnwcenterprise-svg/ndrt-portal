// Add a new contractor board to Supabase and register all webhooks in one command.
//
// Usage: npx tsx scripts/add-contractor-board.ts "CONTRACTOR NAME" 12345678901
import { config } from "dotenv"
import { createClient } from "@supabase/supabase-js"
config({ path: ".env.local" })

const PROD_URL = "https://portal.naturaldisasterresponseteam.com"
const WEBHOOK_URL = `${PROD_URL}/api/webhooks/monday`

const EVENTS = [
  "create_item",
  "item_moved_to_any_group",
  "change_column_value",
  "create_update",
]

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function mondayRequest(query: string, variables: Record<string, unknown> = {}) {
  const res = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: process.env.MONDAY_API_TOKEN!,
      "API-Version": "2024-10",
    },
    body: JSON.stringify({ query, variables }),
  })
  const json = await res.json()
  if (json.errors) throw new Error(JSON.stringify(json.errors))
  return json.data
}

async function main() {
  const [, , companyName, boardId] = process.argv

  if (!companyName || !boardId) {
    console.error('Usage: npx tsx scripts/add-contractor-board.ts "CONTRACTOR NAME" <board_id>')
    process.exit(1)
  }

  console.log(`\nAdding contractor: ${companyName} (board ${boardId})\n`)

  // 1. Check if already exists in Supabase
  const { data: existing } = await admin
    .from("contractors")
    .select("id, company_name, monday_board_id")
    .ilike("company_name", companyName)
    .single()

  if (existing) {
    if (existing.monday_board_id === boardId) {
      console.log(`  · Already in Supabase with correct board ID — skipping insert`)
    } else {
      // Update board ID if different
      await admin.from("contractors").update({ monday_board_id: boardId }).eq("id", existing.id)
      console.log(`  ✓ Updated existing record — monday_board_id set to ${boardId}`)
    }
  } else {
    const { error } = await admin.from("contractors").insert({
      company_name: companyName,
      full_name: companyName,
      email: `${companyName.toLowerCase().replace(/[^a-z0-9]/g, "")}@ndrt.placeholder`,
      status: "active",
      monday_board_id: boardId,
      monday_board_ids: [],
      notification_emails: [],
      lead_credits: 0,
      lead_credits_used: 0,
      lead_credits_total: 0,
      is_admin: false,
    })
    if (error) throw new Error(`Supabase insert failed: ${error.message}`)
    console.log(`  ✓ Added to Supabase`)
  }

  // 2. Get existing webhooks on the board
  const data = await mondayRequest(
    `query ($boardId: ID!) { webhooks(board_id: $boardId) { id event } }`,
    { boardId }
  )
  const existingEvents = new Set((data.webhooks ?? []).map((w: any) => w.event))

  // 3. Register missing webhooks
  let registered = 0
  for (const event of EVENTS) {
    if (existingEvents.has(event)) {
      console.log(`  · ${event} — already registered`)
      continue
    }
    await mondayRequest(
      `mutation ($boardId: ID!, $url: String!, $event: WebhookEventType!) {
        create_webhook(board_id: $boardId, url: $url, event: $event) { id }
      }`,
      { boardId, url: WEBHOOK_URL, event }
    )
    console.log(`  ✓ ${event} — registered`)
    registered++
    await sleep(300)
  }

  console.log(`\nDone. ${registered} webhooks registered. ${EVENTS.length - registered} already in place.`)
  console.log(`
MANUAL STEP REQUIRED — open the board in monday.com and add this automation:
  Automations → Create automation → "When item moved to group"
  Trigger:  group = PENDING PAYROLL
  Action:   create item in NDRT Payroll board

Without this, leads moved to Pending Payroll will NOT appear in the payroll board.
`)
}

main().catch((e) => { console.error(e.message); process.exit(1) })
