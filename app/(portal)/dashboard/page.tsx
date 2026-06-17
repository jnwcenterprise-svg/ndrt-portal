import Link from "next/link"
import { redirect } from "next/navigation"
import { CreditCard, Inbox, Activity, History, ExternalLink } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Topbar } from "@/components/layout/topbar"
import { StatCard } from "@/components/dashboard/stat-card"
import { RecentLeadsTable } from "@/components/leads/recent-leads-table"
import { Alert } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Contractor, ContractorLead } from "@/lib/types"

export default async function DashboardPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [{ data: contractor }, { data: contractorLeads }] = await Promise.all([
    supabase.from("contractors").select("*").eq("id", user.id).single<Contractor>(),
    supabase
      .from("contractor_leads")
      .select("*, lead:leads(*)")
      .eq("contractor_id", user.id)
      .order("delivered_at", { ascending: false })
      .returns<ContractorLead[]>(),
  ])

  const rows = contractorLeads ?? []
  const activeLeads = rows.filter((r) =>
    ["new", "pending"].includes(r.lead_status)
  ).length

  return (
    <>
      <Topbar
        title="Dashboard"
        action={{ label: "Buy Lead Credits", href: "/buy" }}
      />

      {/* Low-credit banner is handled globally in layout.tsx */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Lead Credits Remaining"
          value={contractor?.lead_credits ?? 0}
          icon={CreditCard}
        />
        <StatCard label="Total Leads Received" value={rows.length} icon={Inbox} />
        <StatCard label="Active Leads" value={activeLeads} icon={Activity} />
        <StatCard
          label="Credits Used"
          value={contractor?.lead_credits_used ?? 0}
          icon={History}
        />
      </div>

      {contractor?.monday_board_id && (
        <a
          href={`https://naturaldisasterresponseteam.monday.com/boards/${contractor.monday_board_id}`}
          target="_blank"
          rel="noreferrer"
          className="mt-6 flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm transition-colors hover:bg-gray-50"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0073EA]/10">
              <span className="text-lg">📋</span>
            </div>
            <div>
              <p className="font-semibold text-navy">Open Your Monday Board</p>
              <p className="text-xs text-gray-400">Create and manage leads for your reps</p>
            </div>
          </div>
          <ExternalLink className="h-4 w-4 text-gray-400" />
        </a>
      )}

      <Card className="mt-6">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Recent Leads</CardTitle>
          <Link
            href="/leads"
            className="text-sm font-medium text-gold-dark hover:underline"
          >
            View all
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <RecentLeadsTable rows={rows.slice(0, 5)} />
        </CardContent>
      </Card>
    </>
  )
}
