import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { updateItemNotes } from "@/lib/monday"
import type { Contractor, ContractorLead } from "@/lib/types"

// The ONLY data mutation endpoint contractors can call. Updates the notes on
// their own contractor_leads row and syncs the change to Monday immediately.
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
  if (typeof body?.notes !== "string") {
    return NextResponse.json({ error: "notes must be a string" }, { status: 400 })
  }
  const notes = body.notes.slice(0, 10000)

  // Ownership check on top of RLS
  const { data: row, error: updateError } = await supabase
    .from("contractor_leads")
    .update({ notes })
    .eq("id", params.id)
    .eq("contractor_id", user.id)
    .select("id, monday_item_id")
    .single<Pick<ContractorLead, "id" | "monday_item_id">>()

  if (updateError || !row) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 })
  }

  // Sync to the contractor's Monday board
  let mondaySynced = false
  if (row.monday_item_id) {
    const { data: contractor } = await supabase
      .from("contractors")
      .select("monday_board_id")
      .eq("id", user.id)
      .single<Pick<Contractor, "monday_board_id">>()

    if (contractor?.monday_board_id) {
      try {
        await updateItemNotes(contractor.monday_board_id, row.monday_item_id, notes)
        mondaySynced = true
      } catch (err) {
        console.error("[notes] Monday sync failed:", err)
      }
    }
  }

  return NextResponse.json({ ok: true, monday_synced: mondaySynced })
}
