import { createClient as createSupabaseClient } from "@supabase/supabase-js"

// Service-role client. Server-side only — bypasses RLS. Never import from
// client components.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// Returns NDRT team notification emails from the NDRT_ADMIN_EMAILS env var.
// Set in Vercel as a comma-separated list, e.g.:
//   NDRT_ADMIN_EMAILS=cody@naturaldisasterresponseteam.com,jennifer@naturaldisasterresponseteam.com
export function getAdminEmails(): string[] {
  const raw = process.env.NDRT_ADMIN_EMAILS ?? ""
  return raw.split(",").map((e) => e.trim()).filter(Boolean)
}
