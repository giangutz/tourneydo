
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-96 mt-2" />
      </div>
      
      {/* Top Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Revenue */}
        <Card className="lg:col-span-2 overflow-hidden border-none shadow-md">
          <CardContent className="p-6">
             <div className="flex items-center justify-between space-y-0 pb-2">
               <Skeleton className="h-4 w-24" />
               <Skeleton className="h-8 w-8 rounded-full" />
             </div>
             <div className="flex items-baseline space-x-2 mt-2">
                <Skeleton className="h-8 w-32" />
             </div>
          </CardContent>
        </Card>
        
        {/* Registrations */}
        <Card className="overflow-hidden border-none shadow-md">
           <CardContent className="p-6">
              <div className="flex items-center justify-between pb-2">
                 <Skeleton className="h-4 w-24" />
                 <Skeleton className="h-8 w-8 rounded-full" />
              </div>
              <Skeleton className="h-8 w-16 mt-2" />
           </CardContent>
        </Card>

        {/* Tournaments */}
        <Card className="overflow-hidden border-none shadow-md">
           <CardContent className="p-6">
              <div className="flex items-center justify-between pb-2">
                 <Skeleton className="h-4 w-24" />
                 <Skeleton className="h-8 w-8 rounded-full" />
              </div>
              <Skeleton className="h-8 w-16 mt-2" />
           </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Status Breakdown */}
        <Card className="lg:col-span-4 border-none shadow-md">
           <CardHeader>
              <Skeleton className="h-6 w-40" />
           </CardHeader>
           <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                 {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-24 w-full rounded-2xl" />
                 ))}
              </div>
           </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-3 border-none shadow-md">
          <CardHeader>
             <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
               {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-start gap-4">
                     <Skeleton className="h-10 w-10 rounded-full" />
                     <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                     </div>
                  </div>
               ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
