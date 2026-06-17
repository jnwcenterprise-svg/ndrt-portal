import { NextResponse } from "next/server"
import crypto from "crypto"
import { createAdminClient, getAdminEmails } from "@/lib/supabase/admin"
import { sendApptFollowupEmail } from "@/lib/resend"

// Called daily by Vercel Cron at 9 AM Central.
// Finds leads with past appointments and no outcome, emails contractor + NDRT.

export async function GET(request: Request) {
  // Vercel passes CRON_SECRET as a bearer token to prevent unauthorized calls
  const provided = request.headers.get("authorization") ?? ""
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  const valid = a.length === b.length && (() => { try { return crypto.timingSafeEqual(a, b) } catch { return false } })()
  if (!valid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createAdminClient()
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.naturaldisasterresponseteam.com"
  const adminEmails = getAdminEmails()

  const { data: rows, error } = await admin
    .from("contractor_leads")
    .select(`
      id,
      outcome_submitted_at,
      outcome_alert_sent_at,
      lead_status,
      contractor:contractors(email, notification_emails),
      lead:leads(property_name, address, city, state, appt_date, appt_time)
    `)
    .in("lead_status", ["new", "pending", "paid"])
    .is("outcome_submitted_at", null)

  if (error) {
    console.error("[cron/appt-followup] query failed:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
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
    if (apptDate > today) continue

    // Only alert once per day
    if (row.outcome_alert_sent_at) {
      const hoursSince = (Date.now() - new Date(row.outcome_alert_sent_at).getTime()) / 3600000
      if (hoursSince < 23) continue
    }

    const daysPast = Math.floor((today.getTime() - apptDate.getTime()) / 86400000)
    const reminderCount = daysPast + 1

    const recipients = [
      contractor?.email,
      ...(contractor?.notification_emails ?? []),
      ...adminEmails,
    ].filter(Boolean) as string[]

    await sendApptFollowupEmail(recipients, lead, `${APP_URL}/leads/${row.id}`, reminderCount)

    await admin
      .from("contractor_leads")
      .update({ outcome_alert_sent_at: new Date().toISOString() })
      .eq("id", row.id)

    alertsSent++
  }

  return NextResponse.json({ ok: true, alertsSent })
}
