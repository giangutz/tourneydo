'use client'

import { Tournament } from "@/types/models"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, MapPin, Users, DollarSign, ArrowRight, Trophy } from "lucide-react"
import { formatShortDate, formatCurrency } from "@/lib/utils"
import { calculateTournamentPhase } from "@/lib/utils/tournament-phases"
import Link from "next/link"
import { motion } from "framer-motion"

interface PublicTournamentCardProps {
  tournament: Tournament
}

export function PublicTournamentCard({ tournament }: PublicTournamentCardProps) {
  const phase = calculateTournamentPhase(tournament)
  const isLive = phase === 'ongoing'

  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ duration: 0.2 }}
      className="h-full"
    >
      <Card className="flex flex-col h-full border-muted hover:border-primary/50 hover:shadow-lg transition-all duration-300 overflow-hidden group bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-3 relative">


          <div className="flex justify-between items-start gap-2 z-10">
             <div className="space-y-1">
                <Badge variant={
                    isLive ? 'destructive' :
                    phase === 'upcoming' ? 'default' :
                    phase === 'weigh-in' ? 'secondary' :
                    'outline'
                  } className="mb-2 capitalize tracking-tight font-semibold">
                    {isLive && (
                        <span className="mr-1.5 relative flex h-2 w-2 inline-block">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                        </span>
                    )}
                    {phase.replace('-', ' ')}
                </Badge>
             </div>
             {/* Organizer Info or other badge could go here */}
          </div>

          <CardTitle className="line-clamp-2 text-xl font-bold group-hover:text-primary transition-colors">
            {tournament.name}
          </CardTitle>
          <CardDescription className="flex items-center gap-2 mt-1 font-medium">
             <Calendar className="h-4 w-4 text-primary/70" />
             <span>
               {tournament.start_date ? formatShortDate(tournament.start_date) : 'TBD'}
             </span>
          </CardDescription>
        </CardHeader>
        
        <CardContent className="flex-1 space-y-4">
           {tournament.description && (
             <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
               {tournament.description}
             </p>
           )}

           <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm text-muted-foreground">
              {tournament.venue && (
                 <div className="col-span-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground/70" />
                    <span className="truncate">{tournament.venue}</span>
                 </div>
              )}
              
              <div className="flex items-center gap-2">
                 <DollarSign className="h-4 w-4 text-muted-foreground/70" />
                 <span>{tournament.entry_fee ? formatCurrency(tournament.entry_fee) : 'Free'}</span>
              </div>

              {tournament.max_players && (
                 <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground/70" />
                    <span>Max {tournament.max_players}</span>
                 </div>
              )}
           </div>
        </CardContent>

        <CardFooter className="pt-2 pb-6">
          <Button asChild className="w-full font-semibold shadow-sm group-hover:shadow-md transition-all" variant={isLive ? "destructive" : "default"}>
            <Link href={`/tournaments/${tournament.id}`}>
               {isLive ? 'Watch Live' : 'View Details'} 
               <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  )
}
