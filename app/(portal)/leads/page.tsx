import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Topbar } from "@/components/layout/topbar"
import { LeadsTable } from "@/components/leads/leads-table"
import type { ContractorLead } from "@/lib/types"

export default async function LeadsPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: contractorLeads } = await supabase
    .from("contractor_leads")
    .select("*, lead:leads(*)")
    .eq("contractor_id", user.id)
    .not("lead_status", "in", '("denied","do_not_call")')
    .order("delivered_at", { ascending: false })
    .returns<ContractorLead[]>()

  return (
    <>
      <Topbar title="Leads" />
      <LeadsTable rows={contractorLeads ?? []} />
    </>
  )
}
