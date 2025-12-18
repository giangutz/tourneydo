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

      {/* Bracket Controls */}
      <div className="border rounded-lg p-6 space-y-4">
           <div className="flex gap-4">
               <Skeleton className="h-10 flex-1" />
               <Skeleton className="h-10 w-[200px]" />
           </div>
      </div>

      {/* Bracket Area */}
      <div className="border rounded-lg p-6 min-h-[500px] flex items-center justify-center bg-muted/10">
           <div className="space-y-8 w-full max-w-3xl">
                {/* Simulated bracket tree */}
                <div className="flex justify-between items-center gap-8">
                     <div className="space-y-8">
                        <Skeleton className="h-20 w-[180px]" />
                        <Skeleton className="h-20 w-[180px]" />
                        <Skeleton className="h-20 w-[180px]" />
                        <Skeleton className="h-20 w-[180px]" />
                     </div>
                     <div className="space-y-16">
                        <Skeleton className="h-20 w-[180px]" />
                        <Skeleton className="h-20 w-[180px]" />
                     </div>
                     <div className="space-y-8">
                        <Skeleton className="h-24 w-[180px]" />
                     </div>
                </div>
           </div>
      </div>
    </DashboardShell>
  )
}
