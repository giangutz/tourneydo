import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface KPICardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  description?: string
  trend?: string
  trendDirection?: 'up' | 'down' | 'neutral'
  className?: string
}

export function KPICard({ 
  title, 
  value, 
  icon, 
  description, 
  trend, 
  trendDirection,
  className 
}: KPICardProps) {
  return (
    <Card className={cn(className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-muted-foreground">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(description || trend) && (
          <p className="text-xs text-muted-foreground mt-1">
            {trend && (
              <span className={cn(
                "mr-2 font-medium",
                trendDirection === 'up' && "text-green-600",
                trendDirection === 'down' && "text-red-600",
              )}>
                {trend}
              </span>
            )}
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
