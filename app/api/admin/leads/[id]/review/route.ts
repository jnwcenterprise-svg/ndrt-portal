import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendOutcomeReviewedEmail } from "@/lib/resend"

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Must be NDRT admin
  const { data: me } = await supabase
    .from("contractors")
    .select("is_admin, full_name")
    .eq("id", user.id)
    .single()

  if (!me?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  let body: any
  try { body = await request.json() } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  const { decision, review_notes } = body ?? {}
  if (!["approved", "disputed"].includes(decision)) {
    return NextResponse.json({ error: "decision must be 'approved' or 'disputed'" }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: cl, error } = await admin
    .from("contractor_leads")
    .update({
      outcome_status: decision,
      outcome_reviewed_at: new Date().toISOString(),
      outcome_reviewed_by: me.full_name ?? "NDRT Admin",
      outcome_review_notes: review_notes ?? null,
    })
    .eq("id", params.id)
    .select("id, contractor_id, lead:leads(property_name)")
    .single()

  if (error || !cl) return NextResponse.json({ error: "Lead not found" }, { status: 404 })

  // Add review as a note
  await admin.from("lead_notes").insert({
    contractor_lead_id: cl.id,
    source: "ndrt",
    author: me.full_name ?? "NDRT Admin",
    content: `OUTCOME ${decision.toUpperCase()} by NDRT${review_notes ? `\n${review_notes}` : ""}`,
  })

  // Email the contractor
  const { data: contractor } = await admin
    .from("contractors")
    .select("email, notification_emails, company_name")
    .eq("id", cl.contractor_id)
    .single()

  if (contractor) {
    const recipients = [contractor.email, ...(contractor.notification_emails ?? [])].filter(Boolean) as string[]
    const lead = cl.lead as any
    sendOutcomeReviewedEmail(
      recipients,
      {
        property_name: lead?.property_name ?? "Unknown",
        company_name: contractor.company_name,
        decision,
        review_notes: review_notes ?? null,
      },
      `${process.env.NEXT_PUBLIC_APP_URL}/leads/${cl.id}`
    ).catch(console.error)
  }

  return NextResponse.json({ ok: true })
}
