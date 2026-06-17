import { NextResponse } from "next/server"
import crypto from "crypto"
import { createAdminClient } from "@/lib/supabase/admin"
import { duplicateMasterBoard, registerBoardWebhooks } from "@/lib/monday"
import type { Contractor } from "@/lib/types"

function isValidAdminKey(provided: string | null): boolean {
  const expected = process.env.NDRT_ADMIN_API_KEY
  if (!expected || !provided) return false
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

// Internal NDRT route — called when a contractor is set to active.
// Duplicates the master board template, renames it, stores the board id, and
// registers the portal webhooks on the new board.
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
  const contractorId = body?.contractor_id
  if (!contractorId) {
    return NextResponse.json({ error: "contractor_id is required" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: contractor } = await admin
    .from("contractors")
    .select("*")
    .eq("id", contractorId)
    .single<Contractor>()

  if (!contractor) {
    return NextResponse.json({ error: "Contractor not found" }, { status: 404 })
  }
  if (contractor.monday_board_id) {
    return NextResponse.json({
      ok: true,
      board_id: contractor.monday_board_id,
      already_existed: true,
    })
  }

  try {
    const { boardId, workspaceId } = await duplicateMasterBoard(
      contractor.company_name
    )

    await admin
      .from("contractors")
      .update({
        monday_board_id: boardId,
        monday_workspace_id:
          workspaceId ?? process.env.NEXT_PUBLIC_MONDAY_WORKSPACE_ID ?? null,
      })
      .eq("id", contractor.id)

    await registerBoardWebhooks(boardId)

    return NextResponse.json({ ok: true, board_id: boardId })
  } catch (err) {
    console.error("[monday/create-board] failed:", err)
    return NextResponse.json(
      { error: "Monday board creation failed" },
      { status: 502 }
    )
  }
}
