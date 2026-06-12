'use client'

import { CheckCircle2, Calendar, Clock, Users, Trophy, TrendingUp } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { AthleteClashWarning } from '@/components/tournaments/athlete-clash-warning'
import type { AthleteClash } from '@/types/models'

interface ScheduleSuccessSummaryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  summary: {
    totalMatches: number
    totalDays: number
    courtsUsed: number
    dailyHours: number
    utilizationPercent: number
    matchesPerDay: Record<number, number>
    earliestStart?: string
    latestEnd?: string
    athleteClashes?: AthleteClash[]
  } | null
}

export function ScheduleSuccessSummaryDialog({
  open,
  onOpenChange,
  summary
}: ScheduleSuccessSummaryDialogProps) {
  if (!summary) return null

  const avgMatchesPerDay = summary.totalMatches / summary.totalDays
  const peakDay = Object.entries(summary.matchesPerDay).reduce((max, [day, count]) => 
    count > (summary.matchesPerDay[max[0] as unknown as number] || 0) ? [day, count] : max, 
    ['1', 0] as [string, number]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <DialogTitle className="text-xl">Schedule Generated Successfully!</DialogTitle>
              <DialogDescription className="mt-1">
                All matches have been scheduled and assigned match numbers
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Athlete clash warning (non-blocking) */}
          {summary.athleteClashes && summary.athleteClashes.length > 0 && (
            <AthleteClashWarning clashes={summary.athleteClashes} />
          )}

          {/* Key Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Matches</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.totalMatches}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  ~{Math.round(avgMatchesPerDay)} per day
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Tournament Days</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.totalDays}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {summary.dailyHours}h per day
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Courts Used</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.courtsUsed}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Active courts
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Utilization</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {Math.round(summary.utilizationPercent)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Capacity used
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Utilization Bar */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Schedule Efficiency
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Progress value={summary.utilizationPercent} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Optimized for {summary.utilizationPercent < 80 ? 'flexibility' : 'efficiency'}</span>
                <span>{summary.utilizationPercent}% of available time used</span>
              </div>
            </CardContent>
          </Card>

          {/* Daily Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Daily Match Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(summary.matchesPerDay).map(([day, count]) => (
                  <div key={day} className="flex items-center gap-3">
                    <div className="w-16 text-sm font-medium">Day {day}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={(count / summary.totalMatches) * 100} 
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
          {summary.earliestStart && summary.latestEnd && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Schedule Times
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground mb-1">Earliest Start</div>
                    <div className="font-medium">{summary.earliestStart}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Latest End</div>
                    <div className="font-medium">{summary.latestEnd}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Next Steps */}
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <Trophy className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="space-y-2">
                  <p className="font-semibold text-sm">Next Steps:</p>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Review the bracket view to see match assignments</li>
                    <li>• Print match slips or brackets for your event</li>
                    <li>• Share the schedule with participants and staff</li>
                    <li>• Monitor match progress during the tournament</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Got it, thanks!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
