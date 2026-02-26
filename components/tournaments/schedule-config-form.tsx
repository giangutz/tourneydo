'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import { Loader2, AlertTriangle, CheckCircle2, Info, Clock, Save } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
// Table imports removed as we switched to grid layout
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'

import { saveTournamentScheduleConfig, generateSchedule } from '@/lib/actions/schedule'
import { TournamentScheduleConfig } from '@/types/models'

const scheduleFormSchema = z.object({
  daily_start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  daily_end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  courts: z.coerce.number().min(1, 'Must have at least 1 court'),
  
  // Lunch configuration
  lunch_enabled: z.boolean().default(true),
  lunch_start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  lunch_end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  
  // Division constraints
  gradeschool_round_time: z.coerce.number().min(30, 'Minimum 30s'),
  gradeschool_kyeshi_time: z.coerce.number().min(0),
  gradeschool_rest_between_rounds: z.coerce.number().min(0),
  
  cadet_round_time: z.coerce.number().min(30),
  cadet_kyeshi_time: z.coerce.number().min(0),
  cadet_rest_between_rounds: z.coerce.number().min(0),
  
  junior_round_time: z.coerce.number().min(30),
  junior_kyeshi_time: z.coerce.number().min(0),
  junior_rest_between_rounds: z.coerce.number().min(0),
  
  senior_round_time: z.coerce.number().min(30),
  senior_kyeshi_time: z.coerce.number().min(0),
  senior_rest_between_rounds: z.coerce.number().min(0),
})

type ScheduleFormValues = z.infer<typeof scheduleFormSchema>

interface ScheduleConfigFormProps {
  tournamentId: string
  initialConfig?: TournamentScheduleConfig | null
  tournamentCourts?: number
}

export function ScheduleConfigForm({ tournamentId, initialConfig, tournamentCourts }: ScheduleConfigFormProps) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [validationResult, setValidationResult] = useState<any>(null)
  const [isFeasible, setIsFeasible] = useState<boolean | null>(null)
  const [isPublishing, setIsPublishing] = useState(false)

  async function onPublish() {
    setIsPublishing(true)
    try {
      const result = await generateSchedule(tournamentId)
      if (result.success) {
        toast.success('Schedule published successfully!')
        router.refresh()
      } else {
         toast.error(result.error || 'Failed to publish schedule')
      }
    } catch {
       toast.error('Failed to publish schedule')
    } finally {
       setIsPublishing(false)
    }
  }

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleFormSchema) as any,
    defaultValues: {
      daily_start_time: initialConfig?.daily_start_time?.slice(0, 5) || '09:00',
      daily_end_time: initialConfig?.daily_end_time?.slice(0, 5) || '18:00',
      courts: tournamentCourts || initialConfig?.courts || 4,
      
      lunch_enabled: initialConfig?.lunch_enabled ?? true,
      lunch_start_time: initialConfig?.lunch_start_time?.slice(0, 5) || '12:00',
      lunch_end_time: initialConfig?.lunch_end_time?.slice(0, 5) || '13:00',
      
      gradeschool_round_time: initialConfig?.gradeschool_round_time || 90,
      gradeschool_kyeshi_time: initialConfig?.gradeschool_kyeshi_time || 60,
      gradeschool_rest_between_rounds: initialConfig?.gradeschool_rest_between_rounds || 30,
      
      cadet_round_time: initialConfig?.cadet_round_time || 90,
      cadet_kyeshi_time: initialConfig?.cadet_kyeshi_time || 60,
      cadet_rest_between_rounds: initialConfig?.cadet_rest_between_rounds || 30,
      
      junior_round_time: initialConfig?.junior_round_time || 120,
      junior_kyeshi_time: initialConfig?.junior_kyeshi_time || 60,
      junior_rest_between_rounds: initialConfig?.junior_rest_between_rounds || 30,
      
      senior_round_time: initialConfig?.senior_round_time || 120,
      senior_kyeshi_time: initialConfig?.senior_kyeshi_time || 60,
      senior_rest_between_rounds: initialConfig?.senior_rest_between_rounds || 30,
    },
  })

  async function onSubmit(values: ScheduleFormValues) {
    setIsPending(true)
    setValidationResult(null)
    setIsFeasible(null)
    try {
      const result = await saveTournamentScheduleConfig({
        tournament_id: tournamentId,
        daily_start_time: values.daily_start_time,
        daily_end_time: values.daily_end_time,
        courts: values.courts,
        lunch_enabled: values.lunch_enabled,
        lunch_start_time: values.lunch_start_time,
        lunch_end_time: values.lunch_end_time,
        gradeschool_round_time: values.gradeschool_round_time,
        gradeschool_kyeshi_time: values.gradeschool_kyeshi_time,
        gradeschool_rest_between_rounds: values.gradeschool_rest_between_rounds,
        cadet_round_time: values.cadet_round_time,
        cadet_kyeshi_time: values.cadet_kyeshi_time,
        cadet_rest_between_rounds: values.cadet_rest_between_rounds,
        junior_round_time: values.junior_round_time,
        junior_kyeshi_time: values.junior_kyeshi_time,
        junior_rest_between_rounds: values.junior_rest_between_rounds,
        senior_round_time: values.senior_round_time,
        senior_kyeshi_time: values.senior_kyeshi_time,
        senior_rest_between_rounds: values.senior_rest_between_rounds,
        max_divisions_per_day: null,
        default_sparring_duration: 10,
        default_poomsae_duration: 8,
        default_breaking_duration: 5,
      })

      if (result.success) {
        setIsFeasible(!!result.data?.feasible)
        setValidationResult(result.data?.validation)
        
        if (result.data?.feasible) {
          toast.success('Configuration saved')
        } else {
          toast.warning('Configuration saved but has issues')
        }
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to update schedule')
      }
    } catch (error) {
      toast.error('Something went wrong')
    } finally {
      setIsPending(false)
    }
  }

  // Helper row component for the table
  const DurationRow = ({ label, prefix }: { label: string, prefix: 'gradeschool' | 'cadet' | 'junior' | 'senior' }) => (
    <div className="flex flex-col md:grid md:grid-cols-12 gap-4 p-4 md:p-2 border rounded-lg md:border-0 bg-muted/10 md:bg-transparent items-start md:items-center">
      <div className="col-span-3 w-full md:w-auto flex justify-between md:block items-center mb-2 md:mb-0">
        <Badge variant="outline" className="bg-muted/50 text-base md:text-sm px-3 py-1 md:px-2.5 md:py-0.5">{label}</Badge>
      </div>
      
      <div className="col-span-3 w-full">
        <FormField
          control={form.control}
          name={`${prefix}_round_time` as any}
          render={({ field }) => (
            <FormItem className="space-y-1 md:space-y-0">
              <FormLabel className="md:hidden text-xs text-muted-foreground">Round Time</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input type="number" {...field} className="pr-8 h-9" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">s</span>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="col-span-3 w-full">
        <FormField
          control={form.control}
          name={`${prefix}_kyeshi_time` as any}
          render={({ field }) => (
            <FormItem className="space-y-1 md:space-y-0">
               <FormLabel className="md:hidden text-xs text-muted-foreground">Kyeshi (Medical)</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input type="number" {...field} className="pr-8 h-9" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">s</span>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="col-span-3 w-full">
        <FormField
          control={form.control}
          name={`${prefix}_rest_between_rounds` as any}
          render={({ field }) => (
            <FormItem className="space-y-1 md:space-y-0">
              <FormLabel className="md:hidden text-xs text-muted-foreground">Rest Interval</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input type="number" {...field} className="pr-8 h-9" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">s</span>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Feasibility Alert Feedback */}
      {isFeasible === false && validationResult && (
        <Alert variant="destructive" className="bg-orange-50 dark:bg-orange-950/20 text-orange-800 dark:text-orange-200 border-orange-200 dark:border-orange-800">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Schedule Constraints Exceeded</AlertTitle>
          <AlertDescription className="mt-2 text-sm leading-relaxed">
            <p>The current configuration cannot accommodate all matches within the tournament dates.</p>
            {validationResult.recommendations && validationResult.recommendations.length > 0 && (
              <div className="mt-3">
                <p className="font-semibold text-sm mb-2">Choose one of these options:</p>
                <ul className="space-y-1.5">
                  {validationResult.recommendations.map((rec: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="font-bold text-orange-600 dark:text-orange-400 min-w-[20px]">{i + 1}.</span>
                      <span className="font-medium">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {validationResult.overflowCount > 0 && (
              <p className="mt-2 text-xs opacity-90 font-mono">
                Overflow: {(validationResult.overflowMinutes / 60).toFixed(1)} hours ({validationResult.overflowCount} match{validationResult.overflowCount !== 1 ? 'es' : ''})
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}

      {isFeasible === true && (
        <Alert className="bg-green-50 dark:bg-green-950/20 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Schedule Feasible</AlertTitle>
          <AlertDescription className="mt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p>All matches fit within the configured time constraints.</p>
            <Button 
              size="sm" 
              onClick={(e) => {
                e.preventDefault();
                onPublish();
              }}
              disabled={isPublishing}
              className="bg-green-600 hover:bg-green-700 text-white border-transparent shadow-sm"
            >
              {isPublishing ? (
                 <>
                   <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                   Publishing...
                 </>
              ) : 'Publish Schedule'}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-muted-foreground" />
                Tournament Operations
              </CardTitle>
              <CardDescription>Configure daily operating hours and court capacity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-6">
                <FormField
                  control={form.control}
                  name="daily_start_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <FormControl>
                         <div className="relative">
                            <Input type="time" {...field} className="pl-9" />
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="daily_end_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time</FormLabel>
                      <FormControl>
                        <div className="relative">
                            <Input type="time" {...field} className="pl-9" />
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="col-span-1 border-t pt-4 mt-2">
                  <div className="flex items-center justify-between mb-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Lunch Break</FormLabel>
                      <FormDescription>
                        Pause all matches during this time period
                      </FormDescription>
                    </div>
                    <FormField
                      control={form.control}
                      name="lunch_enabled"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  {form.watch('lunch_enabled') && (
                    <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 fade-in duration-200">
                      <FormField
                        control={form.control}
                        name="lunch_start_time"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm">Start Time</FormLabel>
                            <FormControl>
                              <div className="relative">
                                  <Input type="time" {...field} className="pl-9" />
                                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lunch_end_time"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm">End Time</FormLabel>
                            <FormControl>
                              <div className="relative">
                                  <Input type="time" {...field} className="pl-9" />
                                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>
                 <FormField
                  control={form.control}
                  name="courts"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Active Courts</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          min={1}
                          max={20}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Syncs with tournament settings
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle>Match Durations (Sparring)</CardTitle>
              <CardDescription>
                Define timing rules for each age group to calculate accurate schedules.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Desktop Header */}
                <div className="hidden md:grid md:grid-cols-12 gap-4 px-2 py-2 text-sm font-medium text-muted-foreground border-b mb-2">
                  <div className="col-span-3">Age Group</div>
                  <div className="col-span-3">Round Time</div>
                  <div className="col-span-3">Kyeshi (Medical)</div>
                  <div className="col-span-3">Rest Interval</div>
                </div>

                <div className="space-y-4 md:space-y-0">
                  <DurationRow label="Gradeschool" prefix="gradeschool" />
                  <DurationRow label="Cadet" prefix="cadet" />
                  <DurationRow label="Junior" prefix="junior" />
                  <DurationRow label="Senior" prefix="senior" />
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/30 p-4 border-t">
              <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>Formula: (Round × 3) + (Rest × 2) + Kyeshi + 1m Transition = Total Match Time</span>
              </p>
            </CardFooter>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={isPending} className="w-full md:w-auto min-w-[150px]">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {!isPending && <Save className="mr-2 h-4 w-4" />}
              Save & Validate
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
