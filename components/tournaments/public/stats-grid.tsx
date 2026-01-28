'use client'

import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Users, LayoutGrid, Activity, Swords, Trophy } from 'lucide-react'
import { Match } from '@/types/models'

interface StatsGridProps {
  participants: any[]
  matches: Match[]
  phase: string
}

export function StatsGrid({ participants, matches, phase }: StatsGridProps) {
  const isLive = phase === 'ongoing'
  
  // Metrics
  const approvedParticipants = participants.filter(p => p.status === 'verified' || p.status === 'paid')
  const activeMatches = matches.filter(m => m.status === 'in_progress').length
  const completedMatches = matches.filter(m => m.status === 'completed').length
  const totalMatches = matches.length
  const progress = totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0
  
  // Unique Teams
  const uniqueTeams = new Set(participants.map(p => p.team_id).filter(Boolean)).size
  
  // Container variants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  }

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4"
    >
      {/* Primary KPI - Registrations or Matches */}
      <motion.div variants={item} className="col-span-2 row-span-2">
        <Card className="h-full bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="h-full flex flex-col justify-between p-6">
            <div className="flex justify-between items-start">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                {isLive ? <Activity className="h-5 w-5" /> : <Users className="h-5 w-5" />}
              </div>
              {isLive && (
                <span className="flex h-2 w-2">
                   <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-primary opacity-75"></span>
                   <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
              )}
            </div>
            
            <div>
               <div className="text-4xl md:text-5xl font-extrabold tracking-tight">
                 {isLive ? activeMatches : approvedParticipants.length}
               </div>
               <div className="font-medium text-muted-foreground mt-1">
                 {isLive ? 'Matches In Progress' : 'Confirmed Athletes'}
               </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Secondary Stats */}
      <motion.div variants={item} className="col-span-2 md:col-span-2 lg:col-span-2">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
               <Trophy className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-bold">{completedMatches} / {totalMatches}</div>
              <div className="text-xs text-muted-foreground uppercase font-bold">Matches Completed</div>
            </div> 
          </CardContent>
        </Card>
      </motion.div>

       <motion.div variants={item} className="col-span-1 md:col-span-1 lg:col-span-1">
        <Card className="h-full">
          <CardContent className="p-4 flex flex-col justify-center h-full">
            <div className="text-muted-foreground mb-1"><LayoutGrid className="h-4 w-4" /></div>
            <div className="text-xl font-bold">{uniqueTeams}</div>
            <div className="text-xs text-muted-foreground font-medium">Teams</div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={item} className="col-span-1 md:col-span-1 lg:col-span-1">
        <Card className="h-full">
          <CardContent className="p-4 flex flex-col justify-center h-full">
            <div className="text-muted-foreground mb-1"><Swords className="h-4 w-4" /></div>
            <div className="text-xl font-bold">{new Set(participants.map(p => p.division_id)).size}</div>
            <div className="text-xs text-muted-foreground font-medium">Divisions</div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Progress Bar (Full Width on mobile, partial on desktop) */}
       <motion.div variants={item} className="col-span-2 md:col-span-4 lg:col-span-4">
         <Card className="bg-muted/30">
           <CardContent className="p-4 flex items-center gap-4">
              <span className="text-xs font-bold text-muted-foreground whitespace-nowrap">Progress {progress}%</span>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                 <motion.div 
                   className="h-full bg-primary" 
                   initial={{ width: 0 }}
                   animate={{ width: `${progress}%` }}
                   transition={{ duration: 1, ease: 'easeOut' }}
                 />
              </div>
           </CardContent>
         </Card>
       </motion.div>
    </motion.div>
  )
}
