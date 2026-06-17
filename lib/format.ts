export function formatCurrency(cents: number | null | undefined): string {
  if (cents == null) return "—"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100)
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null) return "—"
  return new Intl.NumberFormat("en-US").format(value)
}

export function formatSettlementRange(
  low: number | null | undefined,
  high: number | null | undefined
): string {
  if (low == null && high == null) return "—"
  const fmt = (cents: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(cents / 100)
  if (low != null && high != null) return `${fmt(low)} – ${fmt(high)}`
  return fmt((low ?? high) as number)
}
