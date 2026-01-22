'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, Users, TrendingUp, Trophy } from 'lucide-react'

interface ScheduleSummaryStatsProps {
  matches: any[]
  scheduleConfig: {
    daily_start_time: string
    daily_end_time: string
    courts: number
  }
  tournamentDays: number
}

export function ScheduleSummaryStats({ matches, scheduleConfig, tournamentDays }: ScheduleSummaryStatsProps) {
  if (matches.length === 0) {
    return null
  }

  // Calculate stats
  const matchesWithSchedule = matches.filter(m => m.scheduled_start_time)
  const matchesPerDay: Record<number, number> = {}
  
  matchesWithSchedule.forEach(match => {
    const day = match.day_number || 1
    matchesPerDay[day] = (matchesPerDay[day] || 0) + 1
  })

  const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return hours * 60 + minutes
  }

  const dailyMinutes = timeToMinutes(scheduleConfig.daily_end_time) - timeToMinutes(scheduleConfig.daily_start_time)
  const dailyHours = dailyMinutes / 60
  const totalDays = Math.max(...Object.keys(matchesPerDay).map(Number), tournamentDays)
  
  // Important: some matches might not have duration, use default 10m
  const totalRequiredMinutes = matchesWithSchedule.reduce((sum, m) => sum + (m.duration || 10), 0)
  const totalAvailableMinutes = dailyMinutes * scheduleConfig.courts * totalDays
  const utilizationPercent = totalAvailableMinutes > 0 ? (totalRequiredMinutes / totalAvailableMinutes) * 100 : 0
  const avgMatchesPerDay = matchesWithSchedule.length / totalDays

  const peakDay = Object.entries(matchesPerDay).reduce((max, [day, count]) => 
    count > (matchesPerDay[max[0] as any] || 0) ? [day, count] : max, 
    ['1', 0]
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Scheduled Matches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {matchesWithSchedule.length} 
              <span className="text-sm font-normal text-muted-foreground ml-2">
                / {matches.length} total
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round(avgMatchesPerDay)} avg matches per day
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Tournament Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDays}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {dailyHours}h per day
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Courts Used
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scheduleConfig.courts}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active courts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Utilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${utilizationPercent > 90 ? 'text-orange-600' : 'text-green-600'}`}>
              {Math.round(utilizationPercent)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Capacity used
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Daily Match Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(matchesPerDay).map(([day, count]) => (
              <div key={day} className="flex items-center gap-3">
                <div className="w-16 text-sm font-medium">Day {day}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={(count / matchesWithSchedule.length) * 100} 
                      className="h-2 flex-1" 
                    />
                    <span className="text-sm font-medium w-12 text-right">{count}</span>
                  </div>
                </div>
                {day === peakDay[0] && (
                  <Badge variant="secondary" className="text-xs">Peak</Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Schedule Times */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Daily Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground mb-1">Start Time</div>
              <div className="font-medium">{scheduleConfig.daily_start_time}</div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">End Time</div>
              <div className="font-medium">{scheduleConfig.daily_end_time}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
