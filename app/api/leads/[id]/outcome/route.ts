export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { postMondayUpdate, moveItemToGroup } from "@/lib/monday"
import { sendOutcomeSubmittedEmail } from "@/lib/resend"
import { getAdminEmails } from "@/lib/supabase/admin"
import type { Contractor, ContractorLead } from "@/lib/types"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.naturaldisasterresponseteam.com"

// Contractor submits post-appointment outcome.
// lead_quality: 'good' | 'bad'
// damage_found: boolean
// outcome_notes: string (optional)
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: any
  try { body = await request.json() } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const lead_quality: string | null = body?.lead_quality ?? null
  const damage_found: boolean | null = body?.damage_found ?? null
  const outcome_notes: string = (body?.outcome_notes ?? "").trim().slice(0, 5000)

  if (lead_quality && !["good", "bad"].includes(lead_quality)) {
    return NextResponse.json({ error: "lead_quality must be 'good' or 'bad'" }, { status: 400 })
  }

  const { data: cl } = await supabase
    .from("contractor_leads")
    .select("id, monday_item_id")
    .eq("id", params.id)
    .eq("contractor_id", user.id)
    .single<Pick<ContractorLead, "id" | "monday_item_id">>()

  if (!cl) return NextResponse.json({ error: "Lead not found" }, { status: 404 })

  const { data: contractor } = await supabase
    .from("contractors")
    .select("full_name, company_name, monday_board_id")
    .eq("id", user.id)
    .single<Pick<Contractor, "full_name" | "company_name" | "monday_board_id">>()

  const authorName = contractor?.company_name ?? contractor?.full_name ?? "Contractor"

  const admin = createAdminClient()

  // Good lead = auto-approve (no NDRT review needed). Bad lead = pending review.
  const outcome_status = lead_quality === "good" ? "approved" : "pending_review"

  // Update contractor_leads with outcome fields
  const { data: updatedCl } = await admin
    .from("contractor_leads")
    .update({
      lead_quality,
      damage_found,
      outcome_notes: outcome_notes || null,
      outcome_submitted_at: new Date().toISOString(),
      outcome_status,
      ...(outcome_status === "approved" ? {
        outcome_reviewed_at: new Date().toISOString(),
        outcome_reviewed_by: authorName,
      } : {}),
    })
    .eq("id", cl.id)
    .select("id, lead:leads(property_name, appt_date)")
    .single()

  // Add outcome as a lead_note for the activity log
  const summaryLines = [
    `POST-APPOINTMENT OUTCOME`,
    lead_quality ? `Lead Quality: ${lead_quality === "good" ? "✅ Good Lead" : "❌ Bad Lead"}` : null,
    damage_found !== null ? `Damage Found: ${damage_found ? "✅ Yes" : "❌ No"}` : null,
    outcome_notes ? `Notes: ${outcome_notes}` : null,
  ].filter(Boolean).join("\n")

  await admin.from("lead_notes").insert({
    contractor_lead_id: cl.id,
    source: "contractor",
    author: authorName,
    content: summaryLines,
  })

  // Post to Monday so NDRT sees outcome in the Updates tab
  if (cl.monday_item_id) {
    postMondayUpdate(cl.monday_item_id, `[${authorName} — Outcome Update]\n${summaryLines}`).catch(
      (err) => console.error("[outcome] Monday post failed:", err)
    )

    // Option 1: contractor marked good → auto-move to Pending Payroll
    if (lead_quality === "good" && contractor?.monday_board_id) {
      moveItemToGroup(cl.monday_item_id, contractor.monday_board_id, "PENDING PAYROLL").catch(
        (err) => console.error("[outcome] Monday move to Pending Payroll failed:", err)
      )
    }
  }

  // Only notify NDRT for bad leads — good leads are auto-approved, no review needed
  const lead = (updatedCl as any)?.lead
  if (outcome_status === "pending_review") {
    const adminEmails = getAdminEmails()
    sendOutcomeSubmittedEmail(
      adminEmails,
      {
        property_name: lead?.property_name ?? "Unknown",
        appt_date: lead?.appt_date ?? null,
        company_name: authorName,
        lead_quality,
        damage_found,
        outcome_notes: outcome_notes || null,
      },
      `${process.env.NEXT_PUBLIC_APP_URL ?? "https://team.naturaldisasterresponseteam.com"}/outcome-reviews`
    ).catch((err) => console.error("[outcome] NDRT notification failed:", err))
  }

  return NextResponse.json({ ok: true })
}
