import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
}

export function StatCard({ label, value, icon: Icon }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-navy">
          <Icon className="h-5 w-5 text-gold" />
        </div>
        <div className="min-w-0">
          <div className="text-2xl font-bold text-navy">{value}</div>
          <div className="truncate text-xs font-medium uppercase tracking-wide text-gray-500">
            {label}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
