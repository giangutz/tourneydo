import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScheduleConfigForm } from '@/components/tournaments/schedule-config-form'
import { DailyScheduleCard } from '@/components/tournaments/daily-schedule-card'
import { ScheduleSummaryStats } from '@/components/tournaments/schedule-summary-stats'
import { getTournamentScheduleConfig, getDailyScheduleSummary } from '@/lib/db/queries/schedule'
import { getTournamentById } from '@/lib/db/queries/tournaments'
import { getTournamentMatches } from '@/lib/db/queries/matches'

interface SchedulePageProps {
  params: Promise<{
    id: string
  }>
}

export default async function SchedulePage({ params }: SchedulePageProps) {
  const { id: tournamentId } = await params
  
  // Fetch data
  const [config, dailySchedule, tournament, matches] = await Promise.all([
    getTournamentScheduleConfig(tournamentId),
    getDailyScheduleSummary(tournamentId),
    getTournamentById(tournamentId),
    getTournamentMatches(tournamentId)
  ])
  
  // Default for cards if no config yet
  const displayConfig = config || {
    daily_start_time: '09:00',
    daily_end_time: '18:00',
    courts: tournament?.courts || 4,
    max_divisions_per_day: null
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Schedule Management</h2>
        <p className="text-muted-foreground">
          Configure tournament timing, manage match durations, and visualize daily court usage.
        </p>
      </div>

      <div className="space-y-8">
        
        {/* Daily Breakdown - Full width at top */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold tracking-tight">Daily Schedule Breakdown</h3>
          {dailySchedule.length === 0 ? (
             <Card className="border-dashed border-2 bg-muted/20">
               <CardContent className="py-8 text-center">
                 <div className="mx-auto w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
                    <svg
                      className="w-5 h-5 text-muted-foreground"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                 </div>
                 <p className="text-sm text-muted-foreground">
                   No schedule generated yet.
                 </p>
               </CardContent>
             </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {dailySchedule.map((day) => (
                <DailyScheduleCard 
                  key={day.day} 
                  summary={day} 
                  config={displayConfig} 
                />
              ))}
            </div>
          )}
        </div>

        {/* Schedule Summary Stats */}
        {config && matches.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold tracking-tight">Schedule Overview</h3>
            <ScheduleSummaryStats 
              matches={matches}
              scheduleConfig={displayConfig}
              tournamentDays={tournament?.start_date && tournament?.end_date
                ? Math.ceil((new Date(tournament.end_date).getTime() - new Date(tournament.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1
                : 2
              }
            />
          </div>
        )}

        {/* Config Form - Full width */}
        <div className="w-full">
           <ScheduleConfigForm 
             tournamentId={tournamentId} 
             initialConfig={config}
             tournamentCourts={tournament?.courts || 4}
           />
        </div>

      </div>
    </div>
  )
}
