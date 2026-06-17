import Link from "next/link"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { LeadStatusBadge } from "@/components/leads/lead-status-badge"
import { formatDate, formatNumber } from "@/lib/format"
import type { ContractorLead } from "@/lib/types"

export function RecentLeadsTable({ rows }: { rows: ContractorLead[] }) {
  if (rows.length === 0) {
    return (
      <p className="px-6 py-10 text-center text-sm text-gray-500">
        No leads yet. Your NDRT rep will assign leads to your account once you
        have an active credit balance.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Property</TableHead>
          <TableHead>City/State</TableHead>
          <TableHead>Squares</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Delivered</TableHead>
          <TableHead className="text-right">View</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-medium text-navy">
              {row.lead?.property_name ?? "—"}
            </TableCell>
            <TableCell>
              {row.lead ? `${row.lead.city}, ${row.lead.state}` : "—"}
            </TableCell>
            <TableCell>{formatNumber(row.lead?.squares)}</TableCell>
            <TableCell>
              <LeadStatusBadge status={row.lead_status} />
            </TableCell>
            <TableCell>{formatDate(row.delivered_at)}</TableCell>
            <TableCell className="text-right">
              <Link
                href={`/leads/${row.id}`}
                className="text-sm font-medium text-gold-dark hover:underline"
              >
                View
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
