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

      {/* Action Bar */}
      <div className="flex justify-between items-center bg-muted/50 p-4 rounded-lg mb-6">
           <Skeleton className="h-8 w-[200px]" />
           <Skeleton className="h-10 w-[150px]" />
      </div>

      {/* Courts Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="border rounded-xl p-6 space-y-4">
                   <div className="flex justify-between items-center">
                        <Skeleton className="h-6 w-[100px]" />
                        <Skeleton className="h-6 w-[80px]" />
                   </div>
                   <Skeleton className="h-[120px] w-full rounded-md" />
                   <div className="flex gap-2">
                        <Skeleton className="h-9 flex-1" />
                        <Skeleton className="h-9 flex-1" />
                   </div>
                </div>
            ))}
      </div>
    </DashboardShell>
  )
}
