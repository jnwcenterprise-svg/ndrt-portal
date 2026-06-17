import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"
dotenv.config({ path: ".env.local" })

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data } = await supabase
    .from("contractors")
    .select("company_name, email, api_key, lead_credits, lead_credits_used, lead_credits_total, status")
    .order("company_name")
  // Print as CSV
  console.log("Company,Email,API Key,Status,Credits Remaining,Credits Used,Lifetime Total")
  for (const c of data ?? []) {
    console.log(`"${c.company_name}","${c.email}","${c.api_key ?? ""}","${c.status}",${c.lead_credits},${c.lead_credits_used},${c.lead_credits_total}`)
  }
}
main().catch(console.error)
