"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  ClipboardList,
  CreditCard,
  Receipt,
  Settings,
  ShieldCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { SignOutButton } from "@/components/layout/sign-out-button"

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: ClipboardList },
  { href: "/buy", label: "Buy Credits", icon: CreditCard },
  { href: "/billing", label: "Billing", icon: Receipt },
  { href: "/settings", label: "Settings", icon: Settings },
]

interface SidebarProps {
  companyName: string
  fullName: string
  leadCredits: number
  isAdmin?: boolean
  pendingReviews?: number
}

export function Sidebar({ companyName, fullName, leadCredits, isAdmin, pendingReviews }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-navy md:flex">
      <div className="border-b border-navy-border px-6 py-6">
        <div className="text-2xl font-bold tracking-tight text-white">
          NDRT<span className="text-gold">.</span>
        </div>
        <div className="mt-1 text-[11px] font-medium uppercase tracking-[0.18em] text-gray-400">
          Contractor Portal
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-6">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || (href !== "/dashboard" && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-navy-light text-gold"
                  : "text-gray-300 hover:bg-navy-light hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          )
        })}
      </nav>

      {isAdmin && (
        <div className="px-3 pb-2">
          <Link
            href="/admin/reviews"
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
              pathname.startsWith("/admin")
                ? "bg-gold/20 text-gold"
                : "text-gold/80 hover:bg-navy-light hover:text-gold"
            )}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>NDRT Reviews</span>
            {(pendingReviews ?? 0) > 0 && (
              <span className="ml-auto rounded-full bg-gold px-2 py-0.5 text-xs font-bold text-navy">
                {pendingReviews}
              </span>
            )}
          </Link>
        </div>
      )}

      <div className="border-t border-navy-border px-6 py-4">
        <div className="mb-4 flex items-center justify-between rounded-md bg-navy-light px-3 py-2.5">
          <span className="text-xs text-gray-300">Lead Credits</span>
          <span className="text-sm font-bold text-gold">{leadCredits}</span>
        </div>
        <div className="truncate text-sm font-medium text-white">{fullName}</div>
        <div className="truncate text-xs text-gray-400">{companyName}</div>
        <SignOutButton />
      </div>
    </aside>
  )
}
