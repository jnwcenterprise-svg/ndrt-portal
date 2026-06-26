import { NextResponse, type NextRequest } from "next/server"
import { createServerClient, type CookieOptions } from "@supabase/ssr"

const ADMIN_EMAIL = "admin@naturaldisasterresponseteam.com"
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.naturaldisasterresponseteam.com"

// Called by the employee portal sidebar "Contractor Portal" link.
// Verifies the shared NDRT_ADMIN_API_KEY, then signs in the shared admin account.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const key = searchParams.get("key")
  const next = searchParams.get("next") ?? "/dashboard"

  const expectedKey = process.env.NDRT_ADMIN_API_KEY
  if (!expectedKey || key !== expectedKey) {
    return NextResponse.redirect(`${BASE_URL}/login`)
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

  const { error } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: process.env.CONTRACTOR_ADMIN_PASSWORD!,
  })

  if (!error) return response

  console.error("[admin-auth] signIn error:", error.message)
  return NextResponse.redirect(`${BASE_URL}/login?error=admin_auth_failed`)
}
