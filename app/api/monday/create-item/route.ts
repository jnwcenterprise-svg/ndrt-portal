export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server"
import crypto from "crypto"
import { createAdminClient } from "@/lib/supabase/admin"
import { createLeadItem } from "@/lib/monday"
import { sendNewLeadEmail } from "@/lib/resend"
import type { Contractor, Lead } from "@/lib/types"

function isValidAdminKey(provided: string | null): boolean {
  const expected = process.env.NDRT_ADMIN_API_KEY
  if (!expected || !provided) return false
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

// Internal NDRT route — called when NDRT assigns a lead to a contractor.
// Creates the contractor_leads record, creates the Monday item in NEW LEADS,
// and notifies the contractor by email.
export async function POST(request: Request) {
  if (!isValidAdminKey(request.headers.get("x-ndrt-admin-key"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
  const { contractor_id, lead_id } = body ?? {}
  if (!contractor_id || !lead_id) {
    return NextResponse.json(
      { error: "contractor_id and lead_id are required" },
      { status: 400 }
    )
  }

  const admin = createAdminClient()
  const [{ data: contractor }, { data: lead }] = await Promise.all([
    admin.from("contractors").select("*").eq("id", contractor_id).single<Contractor>(),
    admin.from("leads").select("*").eq("id", lead_id).single<Lead>(),
  ])

  if (!contractor) {
    return NextResponse.json({ error: "Contractor not found" }, { status: 404 })
  }
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 })
  }
  if (!contractor.monday_board_id) {
    return NextResponse.json(
      { error: "Contractor has no Monday board — call create-board first" },
      { status: 409 }
    )
  }

  const deliveredAt = new Date()

  let mondayItem: { itemId: string; groupId: string } | null = null
  try {
    mondayItem = await createLeadItem(contractor.monday_board_id, lead, deliveredAt)
  } catch (err) {
    console.error("[monday/create-item] Monday item creation failed:", err)
    return NextResponse.json(
      { error: "Monday item creation failed" },
      { status: 502 }
    )
  }

  const { data: contractorLead, error: insertError } = await admin
    .from("contractor_leads")
    .insert({
      contractor_id,
      lead_id,
      delivered_at: deliveredAt.toISOString(),
      lead_status: "new",
      billing_status: "delivered",
      monday_item_id: mondayItem.itemId,
      monday_group_id: mondayItem.groupId,
    })
    .select("id")
    .single()

  if (insertError) {
    console.error("[monday/create-item] contractor_leads insert failed:", insertError)
    return NextResponse.json({ error: "Database insert failed" }, { status: 500 })
  }

  await admin.from("leads").update({ status: "assigned" }).eq("id", lead_id)

  const recipients = [
    contractor.email,
    ...(contractor.notification_emails ?? []),
  ].filter(Boolean) as string[]

  const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/leads/${contractorLead.id}`
  await sendNewLeadEmail(recipients, lead as any, portalUrl)

  return NextResponse.json({
    ok: true,
    contractor_lead_id: contractorLead.id,
    monday_item_id: mondayItem.itemId,
  })
}
