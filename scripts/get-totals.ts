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
    .select("company_name, email, lead_credits, lead_credits_used, lead_credits_total, status")
    .order("company_name")
  console.log(JSON.stringify(data, null, 2))
}
main().catch(console.error)
