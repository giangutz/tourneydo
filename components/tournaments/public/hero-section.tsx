'use client'

import { motion } from 'framer-motion'
import { Tournament } from '@/types/models'
import { Badge } from '@/components/ui/badge'
import { MapPin, Calendar, Trophy, PhilippinePeso } from 'lucide-react'
import { formatShortDate, formatCurrency, formatCurrencyNoSymbol } from '@/lib/utils'
import { calculateTournamentPhase } from '@/lib/utils/tournament-phases'

interface HeroSectionProps {
  tournament: Tournament
  participantCount: number
}

export function HeroSection({ tournament, participantCount }: HeroSectionProps) {
  const phase = calculateTournamentPhase(tournament)
  const isLive = phase === 'ongoing'

  return (
    <div className="relative w-full rounded-3xl overflow-hidden bg-background border shadow-sm mb-6">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5 dark:opacity-5 bg-[radial-gradient(#000000_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />
      
      {/* Abstract Gradient Blob */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/20 blur-3xl rounded-full" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-secondary/10 blur-3xl rounded-full" />

      <div className="relative z-10 p-6 md:p-10 flex flex-col md:flex-row gap-6 justify-between items-start md:items-end">
        
        {/* Left: Title & Info */}
        <div className="space-y-4 max-w-2xl">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <Badge variant={isLive ? "destructive" : "secondary"} className="uppercase tracking-wider font-semibold px-3 py-1">
                {isLive && <span className="mr-1.5 relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                </span>}
                {phase.replace('-', ' ')}
              </Badge>
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-foreground leading-tight">
              {tournament.name}
            </h1>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="flex flex-wrap gap-x-6 gap-y-2 text-sm md:text-base text-muted-foreground font-medium"
          >
            <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>
                    {tournament.start_date ? formatShortDate(tournament.start_date) : 'TBD'}
                    {tournament.end_date && ` - ${formatShortDate(tournament.end_date)}`}
                </span>
            </div>
            {tournament.venue && (
                <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{tournament.venue}</span>
                </div>
            )}
            <div className="flex items-center gap-2">
                <PhilippinePeso className="h-4 w-4" />
                <span>{tournament.entry_fee ? formatCurrencyNoSymbol(tournament.entry_fee) : 'Free Entry'}</span>
            </div>
          </motion.div>
        </div>

        {/* Right: Trophy/Action */}
        <motion.div 
           initial={{ opacity: 0, scale: 0.9 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ delay: 0.2 }}
           className="hidden md:flex flex-col items-end gap-2"
        >
             {/* Could add register button here if applicable */}
             <div className="bg-muted/50 backdrop-blur-sm rounded-2xl p-4 border flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Trophy className="h-6 w-6" />
                </div>
                <div>
                    <div className="text-2xl font-bold">{participantCount}</div>
                    <div className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">Athletes</div>
                </div>
             </div>
        </motion.div>
      </div>
    </div>
  )
}
