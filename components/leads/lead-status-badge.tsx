import { Badge } from "@/components/ui/badge"
import type { LeadStatus } from "@/lib/types"

const STATUS_MAP: Record<LeadStatus, { label: string; className: string }> = {
  new: { label: "New", className: "bg-emerald-100 text-emerald-800" },
  pending: { label: "Pending", className: "bg-amber-100 text-amber-800" },
  paid: { label: "Paid", className: "bg-blue-100 text-blue-800" },
  signed: { label: "Signed", className: "bg-purple-100 text-purple-800" },
  denied: { label: "Denied", className: "bg-red-100 text-red-800" },
  do_not_call: { label: "Do Not Call", className: "bg-gray-200 text-gray-700" },
}

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const config = STATUS_MAP[status] ?? STATUS_MAP.new
  return <Badge className={config.className}>{config.label}</Badge>
}
