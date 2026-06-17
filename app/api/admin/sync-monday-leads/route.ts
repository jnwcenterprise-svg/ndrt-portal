export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server"
import crypto from "crypto"
import { createAdminClient } from "@/lib/supabase/admin"
import { syncBoardToSupabase, syncAllBoards } from "@/lib/monday-sync"

function isValidAdminKey(provided: string | null): boolean {
  const expected = process.env.NDRT_ADMIN_API_KEY
  if (!expected || !provided) return false
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

// POST /api/admin/sync-monday-leads
// Body: { contractor_id?: string }  — omit to sync all active contractors.
// Header: x-ndrt-admin-key
export async function POST(request: Request) {
  if (!isValidAdminKey(request.headers.get("x-ndrt-admin-key"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: any
  try { body = await request.json() } catch { body = {} }

  const contractorId: string | null = body?.contractor_id ?? null

  if (contractorId) {
    const admin = createAdminClient()
    const { data: contractor } = await admin
      .from("contractors")
      .select("monday_board_id, company_name")
      .eq("id", contractorId)
      .single()

    if (!contractor) {
      return NextResponse.json({ error: "Contractor not found" }, { status: 404 })
    }
    if (!contractor.monday_board_id) {
      return NextResponse.json({ error: "Contractor has no Monday board" }, { status: 409 })
    }

    const result = await syncBoardToSupabase(contractorId, contractor.monday_board_id)
    return NextResponse.json({ ok: true, results: [result] })
  }

  // Sync all active contractors with a board
  const results = await syncAllBoards()
  const totalCreated = results.reduce((sum, r) => sum + r.created, 0)
  const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0)
  const allErrors    = results.flatMap((r) => r.errors)

  return NextResponse.json({
    ok: true,
    contractors_synced: results.length,
    total_created: totalCreated,
    total_skipped: totalSkipped,
    errors: allErrors,
    results,
  })
}
