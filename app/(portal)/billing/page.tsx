import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Topbar } from "@/components/layout/topbar"
import { CreditBalanceCard } from "@/components/billing/credit-balance-card"
import { LeadLedgerTable } from "@/components/billing/lead-ledger-table"
import { PurchaseHistoryTable } from "@/components/billing/purchase-history-table"
import { ManagePaymentButton } from "@/components/billing/manage-payment-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Contractor, ContractorLead, Purchase } from "@/lib/types"

export default async function BillingPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [{ data: contractor }, { data: contractorLeads }, { data: purchases }] =
    await Promise.all([
      supabase.from("contractors").select("*").eq("id", user.id).single<Contractor>(),
      supabase
        .from("contractor_leads")
        .select("*, lead:leads(*)")
        .eq("contractor_id", user.id)
        .order("delivered_at", { ascending: false })
        .returns<ContractorLead[]>(),
      supabase
        .from("purchases")
        .select("*")
        .eq("contractor_id", user.id)
        .order("created_at", { ascending: false })
        .returns<Purchase[]>(),
    ])

  return (
    <>
      <Topbar title="Billing" />

      <CreditBalanceCard
        leadCredits={contractor?.lead_credits ?? 0}
        creditsUsed={contractor?.lead_credits_used ?? 0}
      />

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Lead Ledger</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <LeadLedgerTable rows={contractorLeads ?? []} />
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Purchase History</CardTitle>
          <ManagePaymentButton />
        </CardHeader>
        <CardContent className="p-0">
          <PurchaseHistoryTable rows={purchases ?? []} />
        </CardContent>
      </Card>
    </>
  )
}
