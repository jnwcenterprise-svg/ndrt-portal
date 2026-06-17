// Resend transactional email helpers. Server-side only.
import { Resend } from "resend"
import { EMAIL_FROM, NDRT_CONTACT } from "@/lib/config"

const FOOTER = [
  "",
  "—",
  "Natural Disaster Response Team",
  NDRT_CONTACT.email,
  NDRT_CONTACT.phone,
].join("\n")

async function sendEmail(to: string, subject: string, body: string) {
  if (!process.env.RESEND_API_KEY) {
    console.warn(`[resend] RESEND_API_KEY not set — skipping email "${subject}"`)
    return
  }
  const resend = new Resend(process.env.RESEND_API_KEY)
  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject,
      text: `${body}\n${FOOTER}`,
    })
  } catch (err) {
    // Email failures should never break webhook fulfillment
    console.error(`[resend] failed to send "${subject}" to ${to}:`, err)
  }
}

export async function sendCreditsAddedEmail(
  to: string,
  creditsAdded: number,
  balance: number
) {
  await sendEmail(
    to,
    "Your NDRT lead credits have been added",
    `${creditsAdded} credits have been added to your account. Balance: ${balance} credits.\n\nLog in to your portal to view your account: ${process.env.NEXT_PUBLIC_APP_URL}`
  )
}

export async function sendNewLeadEmail(
  to: string | string[],
  lead: {
    property_name: string
    address: string
    city: string
    state: string
    lead_type?: string | null
    contact_name?: string | null
    contact_phone?: string | null
    contact_email?: string | null
    appt_date?: string | null
    appt_time?: string | null
    booked_by?: string | null
    insurance_carrier?: string | null
    hail_size?: string | null
    dol?: string | null
    roof_type?: string | null
    damage_type?: string | null
    squares?: number | null
    square_footage?: number | null
    ndrt_notes?: string | null
  },
  portalLeadUrl?: string
) {
  const lines = [
    `A new lead has been assigned to your account.`,
    ``,
    `PROPERTY`,
    `  Name:    ${lead.property_name}`,
    `  Address: ${lead.address}, ${lead.city}, ${lead.state}`,
    lead.lead_type ? `  Type:    ${lead.lead_type}` : null,
    lead.square_footage ? `  Sq Ft:   ${lead.square_footage.toLocaleString()}` : null,
    lead.roof_type ? `  Roof:    ${lead.roof_type}` : null,
    ``,
    `CONTACT`,
    `  Name:    ${lead.contact_name ?? "—"}`,
    `  Phone:   ${lead.contact_phone ?? "—"}`,
    lead.contact_email ? `  Email:   ${lead.contact_email}` : null,
    ``,
    `APPOINTMENT`,
    `  Date:    ${lead.appt_date ?? "—"}`,
    `  Time:    ${lead.appt_time ?? "—"}`,
    `  Booked by: ${lead.booked_by ?? "—"}`,
    ``,
    `STORM / CLAIM`,
    `  Date of Loss:     ${lead.dol ?? "—"}`,
    `  Damage:           ${lead.damage_type ?? "—"}`,
    `  Hail Size:        ${lead.hail_size ?? "—"}`,
    `  Insurance Carrier: ${lead.insurance_carrier ?? "—"}`,
    lead.ndrt_notes ? `\nNOTES\n  ${lead.ndrt_notes}` : null,
    ``,
    portalLeadUrl
      ? `View in portal: ${portalLeadUrl}`
      : `Log in to your portal for full details: ${process.env.NEXT_PUBLIC_APP_URL}/leads`,
  ].filter((l) => l !== null).join("\n")

  const recipients = Array.isArray(to) ? to : [to]
  for (const recipient of recipients) {
    await sendEmail(recipient, `New lead assigned: ${lead.property_name}`, lines)
  }
}

export async function sendLeadPaidEmail(
  to: string,
  propertyName: string,
  remainingCredits: number
) {
  await sendEmail(
    to,
    `Lead confirmed paid: ${propertyName}`,
    `Your lead for ${propertyName} has been confirmed and marked paid. 1 credit has been deducted from your balance. Remaining credits: ${remainingCredits}.`
  )
}

export async function sendPaymentFailedEmail(to: string) {
  await sendEmail(
    to,
    "Your NDRT lead credit payment did not go through",
    `Your recent bank (ACH) payment for lead credits could not be completed, so no credits were added to your account. This usually means the bank declined or returned the debit.\n\nPlease try again at ${process.env.NEXT_PUBLIC_APP_URL}/buy or contact your NDRT rep if you believe this is an error.`
  )
}

export async function sendApptFollowupEmail(
  to: string | string[],
  lead: { property_name: string; address: string; city: string; state: string; appt_date?: string | null; appt_time?: string | null },
  portalLeadUrl: string,
  reminderCount: number
) {
  const subject =
    reminderCount === 1
      ? `Action required: Update your appointment outcome — ${lead.property_name}`
      : `Reminder #${reminderCount}: Appointment outcome still needed — ${lead.property_name}`

  const body = [
    `Your appointment${lead.appt_date ? ` on ${lead.appt_date}${lead.appt_time ? ` at ${lead.appt_time}` : ""}` : ""} for ${lead.property_name} (${lead.address}, ${lead.city}, ${lead.state}) has passed.`,
    ``,
    `Please log in to the portal and submit your outcome for this lead:`,
    `  • Was it a good or bad lead?`,
    `  • Was there damage found?`,
    `  • Any notes for your NDRT rep?`,
    ``,
    `Update here: ${portalLeadUrl}`,
    ``,
    `This reminder will continue until the lead is updated.`,
  ].join("\n")

  const recipients = Array.isArray(to) ? to : [to]
  for (const recipient of recipients) {
    await sendEmail(recipient, subject, body)
  }
}

export async function sendLowCreditEmail(to: string, remainingCredits: number) {
  await sendEmail(
    to,
    "Your NDRT lead credit balance is low",
    `Your lead credit balance is down to ${remainingCredits} ${remainingCredits === 1 ? "credit" : "credits"}. Purchase a package to keep receiving leads without interruption: ${process.env.NEXT_PUBLIC_APP_URL}/buy`
  )
}

export async function sendOutcomeSubmittedEmail(
  to: string[],
  outcome: {
    property_name: string
    appt_date?: string | null
    company_name: string
    lead_quality: string | null
    damage_found: boolean | null
    outcome_notes: string | null
  },
  reviewUrl: string
) {
  const body = [
    `A contractor has submitted a post-appointment outcome that needs your review.`,
    ``,
    `LEAD`,
    `  Property:   ${outcome.property_name}`,
    outcome.appt_date ? `  Appt Date:  ${outcome.appt_date}` : null,
    `  Contractor: ${outcome.company_name}`,
    ``,
    `OUTCOME`,
    outcome.lead_quality ? `  Lead Quality: ${outcome.lead_quality === "good" ? "✅ Good Lead" : "❌ Bad Lead"}` : null,
    outcome.damage_found !== null ? `  Damage Found: ${outcome.damage_found ? "Yes" : "No"}` : null,
    outcome.outcome_notes ? `  Notes: ${outcome.outcome_notes}` : null,
    ``,
    `Review and approve or dispute at:`,
    reviewUrl,
  ].filter((l) => l !== null).join("\n")

  for (const recipient of to) {
    await sendEmail(recipient, `Outcome submitted — ${outcome.property_name} (${outcome.company_name})`, body)
  }
}

export async function sendOutcomeReviewedEmail(
  to: string[],
  outcome: {
    property_name: string
    company_name: string
    decision: string
    review_notes: string | null
  },
  portalUrl: string
) {
  const approved = outcome.decision === "approved"
  const body = [
    `NDRT has reviewed the outcome you submitted for ${outcome.property_name}.`,
    ``,
    `Decision: ${approved ? "✅ APPROVED" : "⚠️ DISPUTED"}`,
    outcome.review_notes ? `NDRT Notes: ${outcome.review_notes}` : null,
    ``,
    `View lead: ${portalUrl}`,
  ].filter((l) => l !== null).join("\n")

  for (const recipient of to) {
    await sendEmail(
      recipient,
      `Your outcome for ${outcome.property_name} has been ${outcome.decision}`,
      body
    )
  }
}

