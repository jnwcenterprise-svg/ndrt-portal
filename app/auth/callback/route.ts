import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const next = searchParams.get("next") ?? "/dashboard"

  // Admin-generated magic links use token_hash flow
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type") as "magiclink" | "email" | null

  if (token_hash && type) {
    const supabase = createClient()
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // PKCE flow fallback (client-initiated flows)
  const code = searchParams.get("code")
  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
