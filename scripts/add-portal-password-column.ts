import { createClient } from "@supabase/supabase-js"
import { config } from "dotenv"
config({ path: ".env.local" })

// Use the Supabase REST API to create a function, then call it, then drop it
async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  // Create the exec function first
  const createFn = await fetch(`${url}/rest/v1/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      Prefer: "return=minimal",
    },
  })
  console.log("create fn status:", createFn.status)

  // Try direct SQL via the /sql endpoint
  const res = await fetch(`${url}/rest/v1/rpc/exec`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
    },
    body: JSON.stringify({ query: "ALTER TABLE contractors ADD COLUMN IF NOT EXISTS portal_password text;" }),
  })
  console.log("exec status:", res.status)
  const text = await res.text()
  console.log("Response:", text)
}
main().catch(console.error)
