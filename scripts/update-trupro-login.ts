import { config } from "dotenv"
import { createClient } from "@supabase/supabase-js"
config({ path: ".env.local" })

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function main() {
  const { data: contractor } = await admin
    .from("contractors")
    .select("id")
    .eq("email", "portal@truproroofing.com")
    .single()

  if (!contractor) throw new Error("Trupro not found")

  await admin.auth.admin.updateUserById(contractor.id, { email: "admin@truproroofing.com" })
  await admin.from("contractors").update({ email: "admin@truproroofing.com" }).eq("id", contractor.id)

  console.log("Done. Email updated to admin@truproroofing.com")
}
main().catch(console.error)
