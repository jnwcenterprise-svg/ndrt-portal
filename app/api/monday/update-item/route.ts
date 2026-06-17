export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server"
import crypto from "crypto"
import { createAdminClient } from "@/lib/supabase/admin"
import { updateItemNotes } from "@/lib/monday"
import type { Contractor, ContractorLead } from "@/lib/types"

function isValidAdminKey(provided: string | null): boolean {
  const expected = process.env.NDRT_ADMIN_API_KEY
  if (!expected || !provided) return false
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

// Updates the Notes column on a Monday item. The contractor-facing path goes
// through PATCH /api/leads/[id]/notes which calls the Monday helper directly;
// this route exposes the same operation for NDRT internal tooling.
export async function PATCH(request: Request) {
  if (!isValidAdminKey(request.headers.get("x-ndrt-admin-key"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
  const { contractor_lead_id, notes } = body ?? {}
  if (!contractor_lead_id || typeof notes !== "string") {
    return NextResponse.json(
      { error: "contractor_lead_id and notes are required" },
      { status: 400 }
    )
  }

  const admin = createAdminClient()
  const { data: row } = await admin
    .from("contractor_leads")
    .select("id, contractor_id, monday_item_id")
    .eq("id", contractor_lead_id)
    .single<Pick<ContractorLead, "id" | "contractor_id" | "monday_item_id">>()

  if (!row?.monday_item_id) {
    return NextResponse.json(
      { error: "Lead not found or not synced to Monday" },
      { status: 404 }
    )
  }

  const { data: contractor } = await admin
    .from("contractors")
    .select("monday_board_id")
    .eq("id", row.contractor_id)
    .single<Pick<Contractor, "monday_board_id">>()

  if (!contractor?.monday_board_id) {
    return NextResponse.json({ error: "Contractor has no Monday board" }, { status: 409 })
  }

  try {
    await updateItemNotes(contractor.monday_board_id, row.monday_item_id, notes)
  } catch (err) {
    console.error("[monday/update-item] failed:", err)
    return NextResponse.json({ error: "Monday update failed" }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
