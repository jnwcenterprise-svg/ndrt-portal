import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { LeadStatusBadge } from "@/components/leads/lead-status-badge"
import { BillingStatusPill } from "@/components/billing/billing-status-pill"
import { formatDate } from "@/lib/format"
import type { ContractorLead } from "@/lib/types"

export function LeadLedgerTable({ rows }: { rows: ContractorLead[] }) {
  if (rows.length === 0) {
    return (
      <p className="px-6 py-10 text-center text-sm text-gray-500">
        No lead activity yet.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Property</TableHead>
          <TableHead>Delivered Date</TableHead>
          <TableHead>Lead Status</TableHead>
          <TableHead>Billing Status</TableHead>
          <TableHead>Paid Date</TableHead>
          <TableHead className="text-right">Credits Deducted</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-medium text-navy">
              {row.lead?.property_name ?? "—"}
            </TableCell>
            <TableCell>{formatDate(row.delivered_at)}</TableCell>
            <TableCell>
              <LeadStatusBadge status={row.lead_status} />
            </TableCell>
            <TableCell>
              <BillingStatusPill status={row.billing_status} />
            </TableCell>
            <TableCell>{row.paid_at ? formatDate(row.paid_at) : "—"}</TableCell>
            <TableCell className="text-right font-medium text-red-600">
              {row.billing_status === "paid" ? "−1" : ""}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
