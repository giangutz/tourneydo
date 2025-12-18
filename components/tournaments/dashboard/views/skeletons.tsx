
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export function UpcomingViewSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[120px] rounded-xl" />
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <Skeleton className="h-6 w-[150px]" />
          </CardHeader>
          <CardContent className="h-[300px]">
             <Skeleton className="w-full h-full rounded-md" />
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
             <Skeleton className="h-6 w-[120px]" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
               {Array.from({ length: 5 }).map((_, i) => (
                   <div key={i} className="flex justify-between items-center border-b pb-2">
                        <Skeleton className="h-4 w-[120px]" />
                        <Skeleton className="h-4 w-[40px]" />
                        <Skeleton className="h-4 w-[60px]" />
                   </div>
               ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export function WeighInViewSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
         {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[120px] rounded-xl" />
        ))}
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-[200px]" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full rounded-full" />
          <Skeleton className="h-4 w-[150px] mt-2" />
        </CardContent>
      </Card>
    </div>
  )
}

export function OngoingViewSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
         {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[120px] rounded-xl" />
        ))}
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-[150px]" />
        </CardHeader>
        <CardContent className="h-[300px]">
           <Skeleton className="w-full h-full rounded-md" />
        </CardContent>
      </Card>
    </div>
  )
}

export function ConcludedViewSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
         {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[120px] rounded-xl" />
        ))}
      </div>

      <div className="flex justify-end">
           <Skeleton className="h-10 w-[140px]" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-[180px]" />
          </CardHeader>
          <CardContent>
             <div className="space-y-4">
                 {Array.from({ length: 3 }).map((_, i) => (
                     <Skeleton key={i} className="h-10 w-full" />
                 ))}
             </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-[180px]" />
          </CardHeader>
          <CardContent>
             <div className="space-y-4">
                 {Array.from({ length: 3 }).map((_, i) => (
                     <Skeleton key={i} className="h-10 w-full" />
                 ))}
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
