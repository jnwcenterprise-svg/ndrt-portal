// Registers all required webhook events on every active contractor board
// and NDRT sandbox boards. Safe to run multiple times — skips already-registered events.
//
// Usage: npx tsx scripts/register-all-webhooks.ts
import { config } from "dotenv"
import { createClient } from "@supabase/supabase-js"
config({ path: ".env.local" })

const WEBHOOK_URL = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/monday`

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// All events the portal handles
const CONTRACTOR_EVENTS = [
  "create_item",            // new lead added to board
  "item_moved_to_any_group",// lead moved between groups (status changes)
  "change_column_value",    // notes column changes
  "create_update",          // comments/updates added
]

const SANDBOX_BOARD_IDS = (process.env.NDRT_SANDBOX_BOARD_IDS ?? "18416066044")
  .split(",").map((s) => s.trim()).filter(Boolean)

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

async function getExistingWebhooks(boardId: string): Promise<{ id: string; event: string }[]> {
  const data = await mondayRequest(
    `query ($boardId: ID!) { webhooks(board_id: $boardId) { id event } }`,
    { boardId }
  )
  return data.webhooks ?? []
}

async function registerMissingEvents(
  label: string,
  boardId: string,
  events: string[]
): Promise<{ registered: number; skipped: number; errors: number }> {
  const counts = { registered: 0, skipped: 0, errors: 0 }
  let existing: { id: string; event: string }[]

  try {
    existing = await getExistingWebhooks(boardId)
  } catch (e: any) {
    console.log(`  ✗ ${label} (board ${boardId}): could not fetch existing webhooks — ${e.message}`)
    counts.errors++
    return counts
  }

  const existingEvents = new Set(existing.map((w) => w.event))

  for (const event of events) {
    if (existingEvents.has(event)) {
      console.log(`  · ${label} / ${event} — already registered`)
      counts.skipped++
      continue
    }
    try {
      await mondayRequest(
        `mutation ($boardId: ID!, $url: String!, $event: WebhookEventType!) {
          create_webhook(board_id: $boardId, url: $url, event: $event) { id }
        }`,
        { boardId, url: WEBHOOK_URL, event }
      )
      console.log(`  ✓ ${label} / ${event} — registered`)
      counts.registered++
    } catch (e: any) {
      console.log(`  ✗ ${label} / ${event} — ${e.message}`)
      counts.errors++
    }
  }
  return counts
}

async function main() {
  console.log(`Webhook URL: ${WEBHOOK_URL}\n`)

  const { data: contractors } = await admin
    .from("contractors")
    .select("id, company_name, monday_board_id, monday_board_ids")
    .eq("status", "active")

  let totalRegistered = 0, totalSkipped = 0, totalErrors = 0

  // Contractor boards
  for (const c of contractors ?? []) {
    const boardIds = [
      c.monday_board_id,
      ...(c.monday_board_ids ?? []),
    ].filter(Boolean) as string[]

    for (const boardId of boardIds) {
      const counts = await registerMissingEvents(c.company_name, boardId, CONTRACTOR_EVENTS)
      totalRegistered += counts.registered
      totalSkipped    += counts.skipped
      totalErrors     += counts.errors
    }
  }

  // NDRT sandbox boards
  for (const boardId of SANDBOX_BOARD_IDS) {
    const counts = await registerMissingEvents(`NDRT Sandbox (${boardId})`, boardId, CONTRACTOR_EVENTS)
    totalRegistered += counts.registered
    totalSkipped    += counts.skipped
    totalErrors     += counts.errors
  }

  console.log(`\nDone. Registered: ${totalRegistered}  Already set: ${totalSkipped}  Errors: ${totalErrors}`)
}

main().catch(console.error)
