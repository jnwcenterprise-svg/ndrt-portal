import { Badge } from "@/components/ui/badge"
import type { BillingStatus } from "@/lib/types"

const STATUS_MAP: Record<BillingStatus, { label: string; className: string }> = {
  delivered: { label: "Delivered", className: "bg-slate-100 text-slate-700" },
  pending_payroll: { label: "Pending Payroll", className: "bg-amber-100 text-amber-800" },
  paid: { label: "Paid", className: "bg-emerald-100 text-emerald-800" },
}

export function BillingStatusPill({ status }: { status: BillingStatus }) {
  const config = STATUS_MAP[status] ?? STATUS_MAP.delivered
  return <Badge className={config.className}>{config.label}</Badge>
}
