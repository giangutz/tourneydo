import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Users, Clock, Zap, ArrowRight, Dna } from 'lucide-react'
import { DailyScheduleSummary } from '@/types/models'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

interface DailyScheduleCardProps {
  summary: DailyScheduleSummary
  config: {
    daily_start_time: string
    daily_end_time: string
    courts: number
  }
}

export function DailyScheduleCard({ summary, config }: DailyScheduleCardProps) {
  
  return (
    <Card className="h-full border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow flex flex-col">
      <CardHeader className="pb-4 bg-muted/20 border-b space-y-4">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
          <div>
             <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary shrink-0" />
              <span className="shrink-0">Day {summary.day}</span>
              <Separator orientation="vertical" className="h-5 mx-1 hidden sm:block" />
              <span className="text-muted-foreground font-normal text-base hidden sm:inline-block truncate">
                {new Date(summary.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
              </span>
              <span className="text-muted-foreground font-normal text-base sm:hidden">
                {new Date(summary.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            </CardTitle>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-sm text-muted-foreground">
               <span className="flex items-center gap-1.5 bg-background border px-2 py-0.5 rounded-full shadow-sm">
                <Clock className="w-3.5 h-3.5" />
                <span className="whitespace-nowrap">{summary.startTime} - {summary.endTime}</span>
               </span>
               <span className="flex items-center gap-1.5 px-1">
                <Zap className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" />
                <span className="whitespace-nowrap">~{summary.avgMatchesPerHour} matches/hr</span>
               </span>
            </div>
          </div>
          
          <div className="flex gap-6 text-sm shrink-0 w-full xl:w-auto mt-2 xl:mt-0 pt-2 xl:pt-0 border-t xl:border-t-0">
             <div className="flex-1 xl:flex-initial text-left xl:text-right">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Total Matches</p>
                <p className="font-bold text-2xl text-foreground tabular-nums leading-none mt-1">{summary.matchCount}</p>
             </div>
             <Separator orientation="vertical" className="h-10 hidden xl:block" />
             <div className="flex-1 xl:flex-initial text-left xl:text-right">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Courts Active</p>
                <p className="font-bold text-2xl text-foreground tabular-nums leading-none mt-1">
                  {Math.min(summary.courtsActive, config.courts)} <span className="text-sm font-normal text-muted-foreground">/ {config.courts}</span>
                </p>
             </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 flex-grow flex flex-col min-h-[300px]">
        <h4 className="text-xs font-bold uppercase text-muted-foreground mb-3 flex items-center gap-2 tracking-wide">
            <Dna className="w-4 h-4" /> Scheduled Divisions
        </h4>
        
        {summary.divisions.length === 0 ? (
           <div className="flex-grow flex items-center justify-center border-2 border-dashed rounded-lg bg-muted/10 p-4">
             <p className="text-sm text-muted-foreground italic text-center">No matches scheduled.</p>
           </div>
        ) : (
          <div className="rounded-lg border border-border bg-card overflow-hidden flex flex-col flex-grow shadow-sm">
             <div className="grid grid-cols-12 gap-2 p-3 bg-muted/60 text-[11px] font-bold text-muted-foreground border-b uppercase tracking-wider">
                <div className="col-span-6 pl-1">Group</div>
                <div className="col-span-4 text-center">Time Window</div>
                <div className="col-span-2 text-right pr-2">Matches</div>
             </div>
             <ScrollArea className="flex-grow relative h-[250px]">
                <div className="divide-y divide-border/30">
                  {summary.divisions.map((div, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 p-3 text-sm hover:bg-muted/40 transition-colors items-center">
                      <div className="col-span-6 font-medium pl-1 leading-tight flex items-center" title={div.divisionName}>
                        <span className="line-clamp-2">{div.divisionName}</span>
                      </div>
                      <div className="col-span-4 text-muted-foreground text-xs flex flex-col items-center justify-center text-center leading-tight bg-muted/20 rounded py-1 px-1 mx-1">
                         <span className="whitespace-nowrap font-medium text-foreground">{div.startTime}</span>
                         <span className="text-[10px] opacity-70">to</span>
                         <span className="whitespace-nowrap font-medium text-foreground">{div.endTime}</span>
                      </div>
                      <div className="col-span-2 text-right font-medium pr-2 tabular-nums text-foreground/80">
                        {div.matchCount}
                      </div>
                    </div>
                  ))}
                </div>
             </ScrollArea>
           </div>
        )}
      </CardContent>
    </Card>
  )
}
