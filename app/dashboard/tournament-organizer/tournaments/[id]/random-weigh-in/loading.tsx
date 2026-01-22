import { Skeleton } from "@/components/ui/skeleton"
import { DashboardShell } from "@/components/layouts/dashboard-shell"

export default function Loading() {
  return (
    <DashboardShell>
      {/* Page Header */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center items-start justify-between my-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-[250px]" />
          <Skeleton className="h-4 w-[400px]" />
        </div>
        <div className="mb-4 flex gap-2">
             <Skeleton className="h-10 w-[120px]" />
             <Skeleton className="h-10 w-[150px]" />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
           <Skeleton className="h-10 flex-1" />
           <Skeleton className="h-10 w-[200px]" />
      </div>

       {/* Weigh-In List */}
       <div className="space-y-4">
           {Array.from({ length: 5 }).map((_, i) => (
               <div key={i} className="border rounded-lg p-4 flex items-center justify-between">
                   <div className="flex items-center gap-4">
                       <Skeleton className="h-12 w-12 rounded-full" />
                       <div className="space-y-2">
                           <Skeleton className="h-5 w-[180px]" />
                           <Skeleton className="h-4 w-[120px]" />
                       </div>
                   </div>
                   <div className="flex items-center gap-8">
                        <div className="text-right space-y-2">
                            <Skeleton className="h-4 w-[100px]" />
                            <Skeleton className="h-6 w-[80px]" />
                        </div>
                        <Skeleton className="h-10 w-[120px]" />
                   </div>
               </div>
           ))}
       </div>
    </DashboardShell>
  )
}
