'use client'

import { motion } from 'framer-motion'
import { Search, Trophy, Calendar, Users } from 'lucide-react'

export function TournamentsHero() {
  return (
    <div className="relative w-full rounded-3xl overflow-hidden bg-background border shadow-sm mb-8">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5 dark:opacity-5 bg-[radial-gradient(#000000_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />
      
      {/* Abstract Gradient Blob */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/20 blur-3xl rounded-full" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-secondary/10 blur-3xl rounded-full" />

      <div className="relative z-10 px-6 py-12 md:py-20 md:px-12 flex flex-col items-center text-center max-w-4xl mx-auto">
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-muted/50 backdrop-blur-sm p-3 rounded-full mb-6 border"
        >
          <Trophy className="h-6 w-6 text-primary" />
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="text-4xl md:text-6xl font-black tracking-tight text-foreground leading-tight mb-6"
        >
          Find Your Next <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">
            Competition
          </span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-8 leading-relaxed"
        >
          Discover top-tier martial arts tournaments, track live results, and showcase your skills on the mat.
        </motion.p>
        
        {/* Quick Stats or decorative elements could go here */}
        <motion.div 
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.3 }}
           className="flex gap-4 text-sm font-medium text-muted-foreground"
        >
           <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>Year-round Events</span>
           </div>
           <div className="w-1 h-1 rounded-full bg-border self-center" />
           <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              <span>Active Community</span>
           </div>
        </motion.div>

      </div>
    </div>
  )
}
