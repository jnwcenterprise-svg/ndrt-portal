import { NextResponse, type NextRequest } from "next/server"
import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { createAdminClient } from "@/lib/supabase/admin"

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.naturaldisasterresponseteam.com"
const SHARED_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Called by the employee portal "View as" button on the contractors page.
// Verifies the shared key, generates a magic link server-side, and immediately
// verifies it — the token never travels through the browser URL.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const key = searchParams.get("key")
  const email = searchParams.get("email")
  const next = searchParams.get("next") ?? "/dashboard"

  if (key !== SHARED_KEY || !email) {
    return NextResponse.redirect(`${BASE_URL}/login`)
  }

  const admin = createAdminClient()

  // Generate the magic link server-side
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  })

  if (linkError || !linkData?.properties?.hashed_token) {
    console.error("[view-as] generateLink error:", linkError)
    return NextResponse.redirect(`${BASE_URL}/login?error=view_as_failed`)
  }

  const token_hash = linkData.properties.hashed_token
  const response = NextResponse.redirect(`${BASE_URL}${next}`)

  // Verify the OTP immediately on the server — no browser redirect needed
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
    token_hash,
    type: "magiclink",
  })

  if (!otpError) return response

  console.error("[view-as] verifyOtp error:", otpError.message)
  return NextResponse.redirect(`${BASE_URL}/login?error=view_as_failed`)
}
