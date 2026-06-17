import { Card, CardContent } from "@/components/ui/card"

interface CreditBalanceCardProps {
  leadCredits: number
  creditsUsed: number
}

export function CreditBalanceCard({ leadCredits, creditsUsed }: CreditBalanceCardProps) {
  return (
    <Card className="border-navy bg-navy text-white">
      <CardContent className="flex flex-col gap-6 p-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-gray-400">
            Lead Credits Remaining
          </div>
          <div className="mt-2 text-6xl font-bold text-gold">{leadCredits}</div>
        </div>
        <div className="sm:text-right">
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-gray-400">
            Credits Used to Date
          </div>
          <div className="mt-2 text-3xl font-semibold text-white">{creditsUsed}</div>
        </div>
      </CardContent>
    </Card>
  )
}
