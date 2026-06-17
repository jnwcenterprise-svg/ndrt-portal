export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

// DELETE — remove a photo (contractor can only delete their own)
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; photoId: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createAdminClient()
  const { data: photo } = await admin
    .from("lead_photos")
    .select("id, storage_path, contractor_id")
    .eq("id", params.photoId)
    .eq("contractor_lead_id", params.id)
    .single()

  if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (photo.contractor_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await admin.storage.from("lead-photos").remove([photo.storage_path])
  await admin.from("lead_photos").delete().eq("id", params.photoId)

  return NextResponse.json({ ok: true })
}
