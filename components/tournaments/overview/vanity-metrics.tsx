"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Shield, Zap, Trophy, Timer } from "lucide-react"

interface Participant {
  id: string
  teams?: {
    id: string
    name: string
  } | null
}

interface Match {
  status: string
  winner_id: string | null
}

// --- VANITY METRICS ---
export function VanityMetrics({ participants }: { participants: Participant[] }) {
  const stats = (() => {
    const totalAthletes = participants.length
    const teams = new Set(participants.map(p => p.teams?.name).filter(Boolean))
    const totalTeams = teams.size
    
    // Unique teams with avatars (using first letter)
    const uniqueTeams = Array.from(teams).slice(0, 20) // Limit to 20 for the strip

    return { totalAthletes, totalTeams, uniqueTeams }
  })()

  return (
    <div className="w-full bg-card border rounded-xl overflow-hidden shadow-sm mb-6">
      <div className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Left: Big Numbers */}
        <div className="flex items-center gap-8 min-w-max">
           <div>
             <div className="text-3xl font-bold tracking-tight">{stats.totalAthletes}</div>
             <div className="text-sm text-muted-foreground font-medium uppercase tracking-wide">Athletes</div>
           </div>
           <div className="h-10 w-px bg-border" />
           <div>
             <div className="text-3xl font-bold tracking-tight">{stats.totalTeams}</div>
             <div className="text-sm text-muted-foreground font-medium uppercase tracking-wide">Teams</div>
           </div>
        </div>

        {/* Right: Team Strip */}
        <div className="flex-1 w-full overflow-hidden">
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex w-max space-x-2 p-1">
              {stats.uniqueTeams.map((team, i) => (
                <div key={i} className="flex flex-col items-center gap-1 group cursor-default">
                  <Avatar className="h-10 w-10 border-2 border-background ring-1 ring-muted transition-transform group-hover:scale-110">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                      {(team && team[0]) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-4 bg-background px-1 rounded shadow-sm z-10">
                    {team}
                  </span>
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}

// --- LIVE PULSE ---
export function LivePulse({ matches }: { matches: Match[] }) {
  const liveCount = matches.filter(m => m.status === 'in_progress').length
  const completedCount = matches.filter(m => m.status === 'completed').length
  const totalCount = matches.length
  
  // Fake "gold medal matches" detection for now (could be based on round/bracket logic later)
  // For demo, if we have matches, let's just show the active count
  
  if (liveCount === 0) return null

  const progress = Math.round((completedCount / (totalCount || 1)) * 100)

  return (
    <Card className="mb-6 border-red-200 bg-red-50/50 dark:bg-red-900/10 dark:border-red-900/50 overflow-hidden relative">
      <div className="absolute top-0 left-0 w-1 h-full bg-red-500 animate-pulse" />
      <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4 text-sm">
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold tracking-wide">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
          LIVE NOW
        </div>
        
        <div className="hidden md:block w-px h-4 bg-red-200 dark:bg-red-800" />
        
        <div className="flex items-center gap-6 font-medium">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-orange-500" />
            <span>{liveCount} Matches in Progress</span>
          </div>
          
          <div className="flex items-center gap-2 text-muted-foreground">
             <Timer className="h-4 w-4" />
             <span>{progress}% Complete</span>
          </div>
        </div>

        <div className="md:ml-auto">
           <Badge variant="outline" className="bg-background/80 backdrop-blur border-red-200 text-red-700 hover:bg-background">
             Follow Action
           </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
