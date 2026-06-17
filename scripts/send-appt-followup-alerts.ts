// Daily alert script: find leads where appointment has passed but contractor
// hasn't submitted an outcome yet. Emails contractor + NDRT managers until resolved.
// Run via cron: 0 9 * * * cd ~/ndrt-portal && npx tsx scripts/send-appt-followup-alerts.ts
import { config } from "dotenv"
import { createClient } from "@supabase/supabase-js"
import { sendApptFollowupEmail } from "../lib/resend"

config({ path: ".env.local" })

const NDRT_MANAGERS = [
  "cody@naturaldisasterresponseteam.com",
  // Add more NDRT manager emails here
]

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.naturaldisasterresponseteam.com"

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function main() {
  // Find contractor_leads where:
  // - lead has appt_date in the past
  // - outcome_submitted_at is null
  // - lead_status is active (new/pending/paid)
  const { data: rows, error } = await admin
    .from("contractor_leads")
    .select(`
      id,
      outcome_submitted_at,
      outcome_alert_sent_at,
      lead_status,
      contractor:contractors(id, email, full_name, company_name, notification_emails),
      lead:leads(property_name, address, city, state, appt_date, appt_time)
    `)
    .in("lead_status", ["new", "pending", "paid"])
    .is("outcome_submitted_at", null)

  if (error) {
    console.error("Query failed:", error.message)
    process.exit(1)
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let alertsSent = 0

  for (const row of rows ?? []) {
    const lead = row.lead as any
    const contractor = row.contractor as any

    if (!lead?.appt_date) continue

    const apptDate = new Date(lead.appt_date)
    apptDate.setHours(0, 0, 0, 0)

    // Only alert if appt date is today or in the past
    if (apptDate > today) continue

    const lastAlert = row.outcome_alert_sent_at ? new Date(row.outcome_alert_sent_at) : null
    // Don't spam: only alert once per day
    if (lastAlert) {
      const hoursSince = (Date.now() - lastAlert.getTime()) / 1000 / 60 / 60
      if (hoursSince < 23) continue
    }

    // Count how many times we've already alerted (use days since appt as proxy)
    const daysPast = Math.floor((today.getTime() - apptDate.getTime()) / 1000 / 60 / 60 / 24)
    const reminderCount = daysPast + 1

    const portalUrl = `${APP_URL}/leads/${row.id}`

    const recipients = [
      contractor?.email,
      ...(contractor?.notification_emails ?? []),
      ...NDRT_MANAGERS,
    ].filter(Boolean) as string[]

    console.log(`Sending reminder #${reminderCount} for ${lead.property_name} → ${recipients.join(", ")}`)

    await sendApptFollowupEmail(recipients, lead, portalUrl, reminderCount)

    await admin
      .from("contractor_leads")
      .update({ outcome_alert_sent_at: new Date().toISOString() })
      .eq("id", row.id)

    alertsSent++
  }

  console.log(`\nDone — ${alertsSent} alert(s) sent.`)
}

main().catch(console.error)
