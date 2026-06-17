import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency, formatDate } from "@/lib/format"
import { LEAD_PACKAGES } from "@/lib/config"
import type { Purchase } from "@/lib/types"

function packageLabel(purchase: Purchase): string {
  const pkg = LEAD_PACKAGES.find(
    (p) => p.stripe_price_id && p.stripe_price_id === purchase.stripe_price_id
  )
  return pkg ? `${pkg.label} (${pkg.credits} leads)` : `${purchase.credits_purchased} leads`
}

export function PurchaseHistoryTable({ rows }: { rows: Purchase[] }) {
  if (rows.length === 0) {
    return (
      <p className="px-6 py-10 text-center text-sm text-gray-500">
        No purchases yet.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Package</TableHead>
          <TableHead>Credits</TableHead>
          <TableHead>Amount Paid</TableHead>
          <TableHead className="text-right">Receipt</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell>{formatDate(row.created_at)}</TableCell>
            <TableCell className="font-medium text-navy">
              {packageLabel(row)}
              {row.status === "pending" && (
                <span className="ml-2 text-xs font-normal text-amber-600">
                  Processing — bank transfer
                </span>
              )}
              {row.status === "failed" && (
                <span className="ml-2 text-xs font-normal text-red-600">
                  Payment failed
                </span>
              )}
            </TableCell>
            <TableCell>{row.credits_purchased}</TableCell>
            <TableCell>{formatCurrency(row.amount)}</TableCell>
            <TableCell className="text-right">
              {row.receipt_url ? (
                <a
                  href={row.receipt_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-gold-dark hover:underline"
                >
                  View Receipt
                </a>
              ) : (
                <span className="text-gray-400">—</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
