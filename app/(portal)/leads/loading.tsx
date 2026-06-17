import { Skeleton } from "@/components/ui/skeleton"

export default function LeadsLoading() {
  return (
    <>
      <div className="mb-8">
        <Skeleton className="h-8 w-32" />
      </div>
      <div className="mb-4 flex gap-3">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-36" />
        <Skeleton className="h-10 w-44" />
        <Skeleton className="h-10 w-44" />
      </div>
      <Skeleton className="h-96 rounded-lg" />
    </>
  )
}
