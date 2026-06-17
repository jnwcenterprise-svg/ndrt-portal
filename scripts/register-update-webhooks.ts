// Registers the create_update webhook on all contractor Monday boards.
// Run once to backfill boards that were set up before this event was added.
import { config } from "dotenv"
import { createClient } from "@supabase/supabase-js"
config({ path: ".env.local" })

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

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
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/monday`
  console.log(`Webhook URL: ${url}`)

  const { data: contractors } = await admin
    .from("contractors")
    .select("company_name, monday_board_id, monday_board_ids")
    .not("monday_board_id", "is", null)

  for (const c of contractors ?? []) {
    const allBoardIds = [c.monday_board_id, ...(c.monday_board_ids ?? [])].filter(Boolean) as string[]
    for (const boardId of allBoardIds) {
      try {
        await mondayRequest(
          `mutation ($boardId: ID!, $url: String!, $event: WebhookEventType!) {
            create_webhook(board_id: $boardId, url: $url, event: $event) { id }
          }`,
          { boardId, url, event: "create_update" }
        )
        console.log(`  ✓ ${c.company_name} (board ${boardId})`)
      } catch (e: any) {
        console.log(`  ✗ ${c.company_name} (board ${boardId}): ${e.message}`)
      }
    }
  }

  console.log("\nDone.")
}

main().catch(console.error)
