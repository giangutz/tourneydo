'use client'

import { Tournament } from "@/types/models"
import { EmptyState } from "@/components/ui/empty-state"
import { Trophy } from "lucide-react"
import { PublicTournamentCard } from "./public/public-tournament-card"
import { motion } from "framer-motion"

interface PublicTournamentListProps {
  tournaments: Tournament[]
}

export function PublicTournamentList({ tournaments }: PublicTournamentListProps) {
  if (tournaments.length === 0) {
    return (
      <div className="py-12">
        <EmptyState
            icon={Trophy}
            title="No tournaments found"
            description="Try adjusting your search or filters to find what you're looking for."
        />
      </div>
    )
  }

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
      key={tournaments.map(t => t.id).join(',')}
      variants={container}
      initial="hidden"
      animate="show"
      className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3" 
      data-testid="tournament-list"
    >
      {tournaments.map((tournament) => (
        <motion.div key={tournament.id} variants={item} className="h-full">
            <PublicTournamentCard tournament={tournament} />
        </motion.div>
      ))}
    </motion.div>
  )
}
