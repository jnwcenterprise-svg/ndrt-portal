import { Skeleton } from "@/components/ui/skeleton"

export default function BillingLoading() {
  return (
    <>
      <div className="mb-8">
        <Skeleton className="h-8 w-32" />
      </div>
      <Skeleton className="h-40 rounded-lg" />
      <Skeleton className="mt-8 h-64 rounded-lg" />
      <Skeleton className="mt-8 h-64 rounded-lg" />
    </>
  )
}
