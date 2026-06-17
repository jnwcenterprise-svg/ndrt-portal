import { NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { randomBytes } from "crypto"

export async function POST() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createAdminClient()
  const newKey = "ndrt_" + randomBytes(32).toString("hex")
  const { error } = await admin
    .from("contractors")
    .update({ api_key: newKey })
    .eq("id", user.id)

  if (error) return NextResponse.json({ error: "Failed to regenerate" }, { status: 500 })

  return NextResponse.json({ api_key: newKey })
}
