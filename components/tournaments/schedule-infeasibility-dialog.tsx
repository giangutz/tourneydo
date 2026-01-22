'use client'

import { AlertTriangle, Calendar, Clock, Users, TrendingUp } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

interface ScheduleInfeasibilityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  validation: {
    feasible: boolean
    totalDays: number
    totalMatches: number
    totalRequiredMinutes: number
    totalAvailableMinutes: number
    recommendations: string[]
    overflowCount?: number
    overflowMinutes?: number
    errors: Array<{ type: string; message: string; suggestedFix: string }>
  } | null
  currentConfig: {
    courts: number
    dailyHours: number
    tournamentDays: number
  }
}

export function ScheduleInfeasibilityDialog({
  open,
  onOpenChange,
  validation,
  currentConfig
}: ScheduleInfeasibilityDialogProps) {
  if (!validation || validation.feasible) return null

  const overflowHours = validation.overflowMinutes ? validation.overflowMinutes / 60 : 0
  const requiredHours = validation.totalRequiredMinutes / 60
  const availableHours = validation.totalAvailableMinutes / 60
  const utilizationPercent = (requiredHours / availableHours) * 100

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <DialogTitle className="text-xl">Schedule Cannot Be Generated</DialogTitle>
              <DialogDescription className="mt-1">
                Current configuration cannot accommodate all matches within tournament dates
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Matches</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{validation.totalMatches}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Overflow</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {validation.overflowCount || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {overflowHours.toFixed(1)}h unscheduled
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Capacity Used</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {Math.round(utilizationPercent)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {requiredHours.toFixed(0)}h / {availableHours.toFixed(0)}h
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Current Setup</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <div>{currentConfig.courts} courts</div>
                  <div>{currentConfig.dailyHours}h/day</div>
                  <div>{currentConfig.tournamentDays} days</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Problem Explanation */}
          <Alert variant="destructive" className="bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
            <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <AlertDescription className="text-orange-800 dark:text-orange-200">
              <p className="font-semibold mb-2">Why This Won't Work:</p>
              {validation.errors.map((error, i) => (
                <p key={i} className="text-sm">{error.message}</p>
              ))}
            </AlertDescription>
          </Alert>

          <Separator />

          {/* Recommendations */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Solutions - Choose One
            </h3>
            
            <div className="space-y-3">
              {validation.recommendations.map((rec, i) => {
                const isCourtRec = rec.includes('court')
                const isHourRec = rec.includes('hour')
                const isDayRec = rec.includes('day')
                
                return (
                  <Card key={i} className="border-2 hover:border-primary/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-lg font-bold text-primary">{i + 1}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {isCourtRec && <Users className="h-4 w-4 text-muted-foreground" />}
                            {isHourRec && <Clock className="h-4 w-4 text-muted-foreground" />}
                            {isDayRec && <Calendar className="h-4 w-4 text-muted-foreground" />}
                            <Badge variant="outline" className="text-xs">
                              {isCourtRec && 'Add Courts'}
                              {isHourRec && 'Extend Hours'}
                              {isDayRec && 'Extend Days'}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium">{rec}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Next Steps */}
          <Alert>
            <AlertDescription>
              <p className="font-semibold mb-2">Next Steps:</p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Choose one of the solutions above</li>
                <li>Update your tournament configuration in the Schedule Management page</li>
                <li>Save the configuration to validate the new setup</li>
                <li>Generate the schedule once validation passes</li>
              </ol>
            </AlertDescription>
          </Alert>
        </div>
      </DialogContent>
    </Dialog>
  )
}
