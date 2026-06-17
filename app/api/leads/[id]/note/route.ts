export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { postMondayUpdate } from "@/lib/monday"
import type { Contractor, ContractorLead } from "@/lib/types"

// Contractor posts a new note on a lead. Saves to lead_notes and posts to
// Monday's Updates tab so NDRT reps see it in their board.
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
  const content = (body?.content ?? "").trim().slice(0, 5000)
  if (!content) return NextResponse.json({ error: "content is required" }, { status: 400 })

  // Ownership check — RLS on contractor_leads ensures contractor_id = user.id
  const { data: cl } = await supabase
    .from("contractor_leads")
    .select("id, monday_item_id")
    .eq("id", params.id)
    .eq("contractor_id", user.id)
    .single<Pick<ContractorLead, "id" | "monday_item_id">>()

  if (!cl) return NextResponse.json({ error: "Lead not found" }, { status: 404 })

  const { data: contractor } = await supabase
    .from("contractors")
    .select("full_name, company_name")
    .eq("id", user.id)
    .single<Pick<Contractor, "full_name" | "company_name">>()

  const authorName = contractor?.company_name ?? contractor?.full_name ?? "Contractor"

  // Save to lead_notes
  const admin = createAdminClient()
  const { data: note, error } = await admin
    .from("lead_notes")
    .insert({
      contractor_lead_id: cl.id,
      source: "contractor",
      author: authorName,
      content,
    })
    .select("id, created_at, author, content, source")
    .single()

  if (error) {
    console.error("[note] insert failed:", error)
    return NextResponse.json({ error: "Failed to save note" }, { status: 500 })
  }

  // Post to Monday updates tab (fire-and-forget — don't fail the request if Monday is down)
  if (cl.monday_item_id) {
    postMondayUpdate(cl.monday_item_id, `[${authorName}] ${content}`).catch((err) =>
      console.error("[note] Monday post failed:", err)
    )
  }

  return NextResponse.json({ ok: true, note })
}
