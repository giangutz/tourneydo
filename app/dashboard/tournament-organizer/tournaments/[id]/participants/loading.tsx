import { Skeleton } from "@/components/ui/skeleton"
import { DashboardShell } from "@/components/layouts/dashboard-shell"

export default function Loading() {
  return (
    <DashboardShell>
      {/* Breadcrumbs */}
      <Skeleton className="h-5 w-[200px]" />

      {/* Page Header */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center items-start justify-between my-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-[150px]" />
          <Skeleton className="h-4 w-[250px]" />
        </div>
        <div className="mb-4">
             <Skeleton className="h-10 w-[120px]" />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-[180px]" />
          <Skeleton className="h-10 w-[180px]" />
      </div>

      {/* Table Skeleton */}
      <div className="rounded-md border">
        <div className="h-12 border-b bg-muted/50 px-4 flex items-center">
            <Skeleton className="h-4 w-full" />
        </div>
        {/* Rows */}
        {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-16 border-b px-4 flex items-center gap-4">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-1 flex-1">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-3 w-[150px]" />
                </div>
                <Skeleton className="h-6 w-[80px]" />
                <Skeleton className="h-6 w-[80px]" />
                <Skeleton className="h-8 w-8" />
            </div>
        ))}
      </div>
    </DashboardShell>
  )
}
