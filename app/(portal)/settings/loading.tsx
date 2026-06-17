import { Skeleton } from "@/components/ui/skeleton"

export default function SettingsLoading() {
  return (
    <>
      <div className="mb-8">
        <Skeleton className="h-8 w-32" />
      </div>
      <div className="max-w-2xl space-y-8">
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-56 rounded-lg" />
      </div>
    </>
  )
}
