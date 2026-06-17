// Registers move_item_to_group, change_column_value, and create_update
// webhooks on NDRT-owned sandbox boards (e.g. the payroll sandbox board).
// These boards are not tied to a contractor so they're skipped by the
// regular register-webhooks flow — run this script separately.
//
// Usage: npx tsx scripts/register-sandbox-webhooks.ts
import { config } from "dotenv"
config({ path: ".env.local" })

const WEBHOOK_URL = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/monday`

// Board IDs come from NDRT_SANDBOX_BOARD_IDS env var (comma-separated)
// or fall back to the known payroll sandbox board.
const SANDBOX_BOARD_IDS = (
  process.env.NDRT_SANDBOX_BOARD_IDS ?? "18416066044"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)

// Events relevant for payroll status changes
const EVENTS = ["item_moved_to_any_group", "change_column_value", "create_update"]

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

async function main() {
  console.log(`Webhook URL: ${WEBHOOK_URL}`)
  console.log(`Sandbox boards: ${SANDBOX_BOARD_IDS.join(", ")}\n`)

  for (const boardId of SANDBOX_BOARD_IDS) {
    console.log(`Board ${boardId}:`)
    const existing = await getExistingWebhooks(boardId)

    for (const event of EVENTS) {
      const alreadyRegistered = existing.some((w) => w.event === event)
      if (alreadyRegistered) {
        console.log(`  ✓ ${event} — already registered`)
        continue
      }
      try {
        await mondayRequest(
          `mutation ($boardId: ID!, $url: String!, $event: WebhookEventType!) {
            create_webhook(board_id: $boardId, url: $url, event: $event) { id }
          }`,
          { boardId, url: WEBHOOK_URL, event }
        )
        console.log(`  ✓ ${event} — registered`)
      } catch (e: any) {
        console.log(`  ✗ ${event} — ${e.message}`)
      }
    }
  }

  console.log("\nDone.")
}

main().catch(console.error)
