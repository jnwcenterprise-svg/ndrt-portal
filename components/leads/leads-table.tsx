"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Search, ChevronDown, ChevronRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { LeadStatusBadge } from "@/components/leads/lead-status-badge"
import { BillingStatusPill } from "@/components/billing/billing-status-pill"
import { formatDate, formatNumber } from "@/lib/format"
import type { ContractorLead } from "@/lib/types"

const ACTIVE_STATUSES   = ["new", "pending"]
const PAID_STATUSES     = ["paid"]
const SIGNED_STATUSES   = ["signed"]
const REJECTED_STATUSES = ["denied", "do_not_call"]

function LeadRow({ row }: { row: ContractorLead }) {
  const router = useRouter()
  return (
    <tr
      className="cursor-pointer border-b border-gray-100 hover:bg-gray-50 last:border-0"
      onClick={() => router.push(`/leads/${row.id}`)}
    >
      <td className="px-4 py-3 font-medium text-navy">{row.lead?.property_name ?? "—"}</td>
      <td className="px-4 py-3 text-sm text-gray-600">{row.lead?.address ?? "—"}</td>
      <td className="px-4 py-3 text-sm text-gray-600">
        {row.lead ? `${row.lead.city}, ${row.lead.state}` : "—"}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">{formatNumber(row.lead?.squares)}</td>
      <td className="px-4 py-3 text-sm text-gray-600">{row.lead?.roof_type ?? "—"}</td>
      <td className="px-4 py-3">
        <LeadStatusBadge status={row.lead_status} />
      </td>
      <td className="px-4 py-3">
        <BillingStatusPill status={row.billing_status} />
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(row.delivered_at)}</td>
      <td className="px-4 py-3 text-right text-sm font-medium text-gold-dark">View</td>
    </tr>
  )
}

function Section({
  title,
  rows,
  accent,
  defaultOpen = true,
  muted = false,
}: {
  title: string
  rows: ContractorLead[]
  accent: string
  defaultOpen?: boolean
  muted?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  if (rows.length === 0) return null

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${accent}`} />
          <span className={`text-sm font-semibold ${muted ? "text-gray-400" : "text-gray-800"}`}>
            {title}
          </span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
            {rows.length}
          </span>
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {open && (
        <div className="border-t border-gray-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Property</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Address</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Market</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Squares</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Roof Type</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Status</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Billing</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Delivered</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <LeadRow key={row.id} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function TypeGroup({
  type,
  rows,
}: {
  type: "commercial" | "residential" | "mixed"
  rows: ContractorLead[]
}) {
  const commercial = rows.filter((r) => (r.lead as any)?.lead_type !== "residential")
  const residential = rows.filter((r) => (r.lead as any)?.lead_type === "residential")
  const hasTypes = residential.length > 0 && commercial.length > 0

  if (!hasTypes) {
    // All same type — no sub-grouping needed
    return (
      <>
        {rows.map((row) => (
          <LeadRow key={row.id} row={row} />
        ))}
      </>
    )
  }

  return (
    <>
      {commercial.length > 0 && (
        <>
          <tr className="bg-gray-50">
            <td colSpan={9} className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Commercial
            </td>
          </tr>
          {commercial.map((row) => (
            <LeadRow key={row.id} row={row} />
          ))}
        </>
      )}
      {residential.length > 0 && (
        <>
          <tr className="bg-blue-50">
            <td colSpan={9} className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-blue-400">
              Residential
            </td>
          </tr>
          {residential.map((row) => (
            <LeadRow key={row.id} row={row} />
          ))}
        </>
      )}
    </>
  )
}

export function LeadsTable({ rows }: { rows: ContractorLead[] }) {
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => {
      const haystack = `${r.lead?.property_name ?? ""} ${r.lead?.address ?? ""} ${r.lead?.city ?? ""}`.toLowerCase()
      return haystack.includes(q)
    })
  }, [rows, search])

  const active   = useMemo(() => filtered.filter((r) => ACTIVE_STATUSES.includes(r.lead_status)), [filtered])
  const paid     = useMemo(() => filtered.filter((r) => PAID_STATUSES.includes(r.lead_status)), [filtered])
  const signed   = useMemo(() => filtered.filter((r) => SIGNED_STATUSES.includes(r.lead_status)), [filtered])
  const rejected = useMemo(() => filtered.filter((r) => REJECTED_STATUSES.includes(r.lead_status)), [filtered])

  const hasResidential = rows.some((r) => (r.lead as any)?.lead_type === "residential")

  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-gray-300 bg-white px-6 py-16 text-center text-sm text-gray-500">
        No leads yet. Your NDRT rep will assign leads to your account once you
        have an active credit balance.
      </p>
    )
  }

  // If contractor has both types, render Commercial and Residential as top-level sections
  if (hasResidential) {
    const commercialActive   = active.filter((r) => (r.lead as any)?.lead_type !== "residential")
    const residentialActive  = active.filter((r) => (r.lead as any)?.lead_type === "residential")
    const commercialPaid     = paid.filter((r) => (r.lead as any)?.lead_type !== "residential")
    const residentialPaid    = paid.filter((r) => (r.lead as any)?.lead_type === "residential")
    const commercialSigned   = signed.filter((r) => (r.lead as any)?.lead_type !== "residential")
    const residentialSigned  = signed.filter((r) => (r.lead as any)?.lead_type === "residential")

    return (
      <div className="space-y-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search by property, address, or city…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {(commercialActive.length > 0 || commercialPaid.length > 0 || commercialSigned.length > 0) && (
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">Commercial</h2>
            <Section title="Active Leads" rows={commercialActive} accent="bg-emerald-400" defaultOpen={true} />
            <Section title="Paid" rows={commercialPaid} accent="bg-amber-400" defaultOpen={true} />
            <Section title="Signed" rows={commercialSigned} accent="bg-blue-400" defaultOpen={true} />
          </div>
        )}

        {(residentialActive.length > 0 || residentialPaid.length > 0 || residentialSigned.length > 0) && (
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-blue-400">Residential</h2>
            <Section title="Active Leads" rows={residentialActive} accent="bg-emerald-400" defaultOpen={true} />
            <Section title="Paid" rows={residentialPaid} accent="bg-amber-400" defaultOpen={true} />
            <Section title="Signed" rows={residentialSigned} accent="bg-blue-400" defaultOpen={true} />
          </div>
        )}

        <Section title="Rejected" rows={rejected} accent="bg-gray-300" defaultOpen={false} muted={true} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search by property, address, or city…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Section title="Active Leads" rows={active} accent="bg-emerald-400" defaultOpen={true} />
      <Section title="Paid" rows={paid} accent="bg-amber-400" defaultOpen={true} />
      <Section title="Signed" rows={signed} accent="bg-blue-400" defaultOpen={true} />
      <Section title="Rejected" rows={rejected} accent="bg-gray-300" defaultOpen={false} muted={true} />

      {filtered.length > 0 && active.length === 0 && paid.length === 0 && signed.length === 0 && rejected.length === 0 && (
        <p className="rounded-lg border border-dashed border-gray-300 bg-white px-6 py-10 text-center text-sm text-gray-500">
          No leads match your search.
        </p>
      )}
    </div>
  )
}
