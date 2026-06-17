import cron from "node-cron"
import { config } from "dotenv"
config({ path: ".env.local" })

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? ""
const AUTH    = `Bearer ${process.env.CRON_SECRET ?? ""}`

async function callCronEndpoint(path: string): Promise<void> {
  const res = await fetch(`${APP_URL}${path}`, {
    headers: { authorization: AUTH },
  })
  console.log(`[cron] ${path} → ${res.status}`)
}

// Daily at 2pm UTC — appointment follow-up emails
cron.schedule("0 14 * * *", async () => {
  console.log("[cron] Running appt-followup...")
  try {
    await callCronEndpoint("/api/cron/appt-followup")
  } catch (err) {
    console.error("[cron] appt-followup failed:", err)
  }
})

// Every hour — Monday↔Supabase reconciliation + dedup table prune
cron.schedule("0 * * * *", async () => {
  console.log("[cron] Running reconcile...")
  try {
    await callCronEndpoint("/api/cron/reconcile")
  } catch (err) {
    console.error("[cron] reconcile failed:", err)
  }
})

console.log("[cron] Scheduler started. Waiting for triggers...")
