// One-time provisioning script for Trupro Roofing.
// Usage: npx tsx scripts/provision-trupro.ts
import { config } from "dotenv"
import { createClient } from "@supabase/supabase-js"

config({ path: ".env.local" })
config({ path: ".env" })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const EMAIL = "bruce@truproroofing.com"
const PASSWORD = "ndrt-trupro-2026!"
const MONDAY_BOARD_ID = "18415830037"

async function main() {
  console.log("Provisioning Trupro Roofing…")

  // Create auth user
  let userId: string
  const { data: created, error: userError } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  })

  if (userError) {
    const { data: list } = await admin.auth.admin.listUsers()
    const existing = list?.users.find((u) => u.email === EMAIL)
    if (!existing) throw userError
    userId = existing.id
    console.log("Auth user already existed:", EMAIL)
  } else {
    userId = created.user.id
    console.log("Created auth user:", EMAIL)
  }

  // Upsert contractor row
  const { error: contractorError } = await admin.from("contractors").upsert(
    {
      id: userId,
      email: EMAIL,
      full_name: "Joel",
      company_name: "Trupro Roofing",
      states: ["TX"],
      trade_type: "Commercial Roofing",
      status: "active",
      lead_credits: 0,
      lead_credits_used: 0,
      monday_board_id: MONDAY_BOARD_ID,
    },
    { onConflict: "email" }
  )

  if (contractorError) throw contractorError

  console.log("\n✓ Trupro Roofing provisioned.")
  console.log("  Portal login:", EMAIL)
  console.log("  Password:    ", PASSWORD)
  console.log("  Monday board:", MONDAY_BOARD_ID)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
