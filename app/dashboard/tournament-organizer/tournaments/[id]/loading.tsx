import { Skeleton } from "@/components/ui/skeleton"
import { DashboardShell } from "@/components/layouts/dashboard-shell"

export default function Loading() {
  return (
    <DashboardShell>
      {/* Page Header Skeleton */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-[250px]" />
          <Skeleton className="h-4 w-[350px]" />
        </div>
        <div className="mb-4">
            <div className="flex gap-2">
                <Skeleton className="h-10 w-[100px]" />
                 <Skeleton className="h-10 w-[120px]" />
            </div>
        </div>
      </div>

       {/* Phase Toggle Skeleton */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
             <Skeleton className="h-8 w-[180px]" />
             <Skeleton className="h-10 w-[200px]" />
        </div>
        
        {/* Stats View Skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-[120px] rounded-xl" />
            <Skeleton className="h-[120px] rounded-xl" />
            <Skeleton className="h-[120px] rounded-xl" />
            <Skeleton className="h-[120px] rounded-xl" />
        </div>
         <Skeleton className="h-[300px] w-full rounded-xl" />
      </div>
      
       {/* Quick Actions Skeleton */}
       <div className="border-t pt-8 mt-8">
            <Skeleton className="h-6 w-[150px] mb-4" />
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                 <Skeleton className="h-[100px] rounded-xl" />
                 <Skeleton className="h-[100px] rounded-xl" />
                 <Skeleton className="h-[100px] rounded-xl" />
                 <Skeleton className="h-[100px] rounded-xl" />
            </div>
       </div>
    </DashboardShell>
  )
}
