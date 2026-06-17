import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

const BUCKET = "lead-photos"
const MAX_SIZE = 20 * 1024 * 1024 // 20 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]

// GET — list photos for this contractor_lead
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Verify this contractor_lead belongs to the caller
  const { data: row } = await supabase
    .from("contractor_leads")
    .select("id")
    .eq("id", params.id)
    .eq("contractor_id", user.id)
    .single()
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const admin = createAdminClient()
  const { data: photos, error } = await admin
    .from("lead_photos")
    .select("id, storage_path, caption, uploaded_at")
    .eq("contractor_lead_id", params.id)
    .order("uploaded_at", { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Generate signed URLs (1 hour)
  const withUrls = await Promise.all(
    (photos ?? []).map(async (p) => {
      const { data } = await admin.storage
        .from(BUCKET)
        .createSignedUrl(p.storage_path, 3600)
      return { ...p, url: data?.signedUrl ?? null }
    })
  )

  return NextResponse.json({ photos: withUrls })
}

// POST — upload a new photo
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: row } = await supabase
    .from("contractor_leads")
    .select("id")
    .eq("id", params.id)
    .eq("contractor_id", user.id)
    .single()
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: "Invalid form data" }, { status: 400 })

  const file = form.get("file") as File | null
  const caption = (form.get("caption") as string | null)?.trim() ?? null

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large (max 20 MB)" }, { status: 400 })
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg"
  const storagePath = `${params.id}/${crypto.randomUUID()}.${ext}`
  const bytes = await file.arrayBuffer()

  const admin = createAdminClient()
  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, bytes, { contentType: file.type, upsert: false })
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: photo, error: dbError } = await admin
    .from("lead_photos")
    .insert({
      contractor_lead_id: params.id,
      contractor_id: user.id,
      storage_path: storagePath,
      caption,
    })
    .select("id, storage_path, caption, uploaded_at")
    .single()
  if (dbError) {
    await admin.storage.from(BUCKET).remove([storagePath])
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  const { data: signed } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 3600)

  return NextResponse.json({ photo: { ...photo, url: signed?.signedUrl ?? null } })
}
