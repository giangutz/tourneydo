import { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  description?: string
  icon?: LucideIcon
  className?: string
  trend?: {
    value: number
    label: string
    positive?: boolean
  }
}

export function StatCard({ title, value, description, icon: Icon, className, trend }: StatCardProps) {
  return (
    <Card className={cn("overflow-hidden border shadow-sm bg-card transition-all hover:shadow-md", className)}>
      <CardContent>
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {Icon && (
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon className="h-4 w-4 text-primary" />
            </div>
          )}
        </div>
        <div className="flex items-baseline space-x-2 mt-2">
           <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{value}</h2>
           {trend && (
             <span className={cn("text-xs font-medium", trend.positive ? "text-green-600" : "text-red-600")}>
               {trend.positive ? "+" : ""}{trend.value}% {trend.label}
             </span>
           )}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}
