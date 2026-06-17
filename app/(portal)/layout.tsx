import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Sidebar } from "@/components/layout/sidebar"
import { MobileNav } from "@/components/layout/mobile-nav"
import { HoldingScreen } from "@/components/layout/holding-screen"
import { LockedScreen } from "@/components/layout/locked-screen"
import { LOW_CREDIT_THRESHOLD } from "@/lib/config"
import type { Contractor } from "@/lib/types"

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: contractor } = await supabase
    .from("contractors")
    .select("*")
    .eq("id", user.id)
    .single<Contractor>()

  // No contractor row yet, or still pending review → holding screen
  if (!contractor || contractor.status === "pending") return <HoldingScreen />
  if (contractor.status === "suspended") return <LockedScreen />

  const isAdmin = (contractor as any).is_admin === true
  let pendingReviews = 0
  if (isAdmin) {
    const { count } = await supabase
      .from("contractor_leads")
      .select("id", { count: "exact", head: true })
      .eq("outcome_status", "pending_review")
    pendingReviews = count ?? 0
  }

  const credits = contractor.lead_credits
  const lowCredits = credits <= LOW_CREDIT_THRESHOLD && !isAdmin

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        companyName={contractor.company_name}
        fullName={contractor.full_name}
        leadCredits={credits}
        isAdmin={isAdmin}
        pendingReviews={pendingReviews}
      />
      <main className="px-4 pb-24 pt-8 md:ml-64 md:px-10 md:pb-12">
        <div className="mx-auto max-w-6xl">
          {lowCredits && (
            <Link
              href="/buy"
              className={`mb-6 flex items-center justify-between rounded-lg border px-4 py-3 text-sm font-medium transition-opacity hover:opacity-90 ${
                credits === 0
                  ? "border-red-200 bg-red-50 text-red-800"
                  : "border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              <span>
                {credits === 0
                  ? "⛔ You have no lead credits remaining — new leads cannot be assigned until you top up."
                  : `⚠️ Low credit balance: ${credits} credit${credits === 1 ? "" : "s"} remaining. Top up to keep receiving leads.`}
              </span>
              <span className="ml-4 shrink-0 rounded-md bg-amber-700/10 px-3 py-1 text-xs font-semibold text-amber-900">
                Buy Credits →
              </span>
            </Link>
          )}
          {children}
        </div>
      </main>
      <MobileNav />
    </div>
  )
}
