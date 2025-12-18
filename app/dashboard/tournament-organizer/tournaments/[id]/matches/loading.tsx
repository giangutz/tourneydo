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

      {/* Live Courts Card */}
      <div className="border rounded-lg p-6">
           <Skeleton className="h-6 w-[150px] mb-4" />
           <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Skeleton className="h-[150px] rounded-lg" />
                <Skeleton className="h-[150px] rounded-lg" />
                <Skeleton className="h-[150px] rounded-lg" />
                <Skeleton className="h-[150px] rounded-lg" />
           </div>
      </div>

      {/* Matches List/Bracket Placeholder */}
       <div className="border rounded-lg p-6">
            <Skeleton className="h-10 w-[300px] mb-6" />
            <div className="space-y-4">
                <Skeleton className="h-[80px] w-full" />
                <Skeleton className="h-[80px] w-full" />
                <Skeleton className="h-[80px] w-full" />
            </div>
       </div>
    </DashboardShell>
  )
}
