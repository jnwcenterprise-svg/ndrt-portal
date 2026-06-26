import { NextResponse, type NextRequest } from "next/server"
import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { createAdminClient } from "@/lib/supabase/admin"

const ADMIN_EMAIL = "admin@naturaldisasterresponseteam.com"
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.naturaldisasterresponseteam.com"
// Both portals share the same Supabase project, so the service role key
// is a strong shared secret that's already configured on both Render services.
const SHARED_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Called by the employee portal sidebar "Contractor Portal" link.
// Verifies the shared key, then generates and immediately verifies a magic link
// server-side so there are no password env vars or token expiry issues.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const key = searchParams.get("key")
  const next = searchParams.get("next") ?? "/dashboard"

  if (key !== SHARED_KEY) {
    return NextResponse.redirect(`${BASE_URL}/login`)
  }

  const admin = createAdminClient()

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: ADMIN_EMAIL,
  })

  if (linkError || !linkData?.properties?.hashed_token) {
    console.error("[admin-auth] generateLink error:", linkError)
    return NextResponse.redirect(`${BASE_URL}/login?error=admin_auth_failed`)
  }

  const response = NextResponse.redirect(`${BASE_URL}${next}`)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { error: otpError } = await supabase.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: "magiclink",
  })

  if (!otpError) return response

  console.error("[admin-auth] verifyOtp error:", otpError.message)
  return NextResponse.redirect(`${BASE_URL}/login?error=admin_auth_failed`)
}
