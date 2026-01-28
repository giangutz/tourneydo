'use client'

import Link from 'next/link'
import { ArrowRight, Trophy, Search } from 'lucide-react'
import { MockTournamentCard } from './mock-tournament-card'
import { HeroSearch } from './hero-search'
import { HeroSearchMobile } from './hero-search-mobile'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'

export function HeroSection() {
  return (
    <section className="relative w-full overflow-hidden bg-background pt-16 pb-20 lg:pt-32 lg:pb-40">
      
      {/* Background Decor */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#000000_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
      
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
         <div className="absolute top-20 left-10 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen animate-blob" />
         <div className="absolute top-40 right-10 w-[400px] h-[400px] bg-secondary/20 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen animate-blob animation-delay-2000" />
      </div>

      <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
          
          {/* Text Content (Left) */}
          <div className="flex-1 w-full max-w-2xl text-center lg:text-left z-10">
             <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.5 }}
               className="inline-flex items-center gap-2 px-4 py-1.5 bg-muted/50 backdrop-blur-sm border rounded-full text-foreground/80 text-sm font-medium mb-8"
             >
                <Trophy className="h-4 w-4 text-primary" />
                <span>The #1 Platform for Martial Arts</span>
             </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tighter text-foreground leading-[1.1] mb-6"
            >
              Master Your <br className="hidden lg:block"/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary/80 to-secondary animate-gradient-x">
                Competition
              </span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="mt-6 text-xl text-muted-foreground leading-relaxed max-w-lg mx-auto lg:mx-0 mb-10"
            >
              The complete ecosystem for martial arts tournaments. Organize events, track live brackets, and showcase your legacy.
            </motion.p>

            <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.3, duration: 0.5 }}
               className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4"
            >
               <Button size="lg" className="h-12 px-8 text-base rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:scale-105" asChild>
                  <Link href="/tournaments">
                     Browse Tournaments
                  </Link>
               </Button>
               <Button variant="outline" size="lg" className="h-12 px-8 text-base rounded-full hover:bg-muted/50 transition-all" asChild>
                  <Link href="/sign-up">
                    Host an Event
                  </Link>
               </Button>
            </motion.div>
          </div>

          {/* Visual Content (Right) */}
          <div className="flex-1 w-full flex justify-center lg:justify-end relative z-10">
            <motion.div 
               initial={{ opacity: 0, scale: 0.9, rotate: -5 }}
               animate={{ opacity: 1, scale: 1, rotate: 0 }}
               transition={{ delay: 0.2, duration: 0.8, type: "spring" }}
               className="relative w-full max-w-[450px]"
            >
                 <div className="absolute inset-0 bg-gradient-to-tr from-primary to-secondary rounded-[2.5rem] rotate-6 scale-95 opacity-20 blur-2xl animate-pulse-slow"></div>
                 <div className="relative bg-card/50 backdrop-blur-xl border border-white/10 dark:border-white/5 rounded-3xl p-2 shadow-2xl">
                    <MockTournamentCard />
                 </div>
                 
                 {/* Floating Badge */}
                 <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="absolute -top-10 -right-4 bg-background/80 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-border/50 animate-bounce-slow"
                 >
                    <div className="flex items-center gap-3">
                        <div className="h-3 w-3 rounded-full bg-red-500 animate-ping" />
                        <span className="font-bold text-sm">Live Updates</span>
                    </div>
                 </motion.div>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  )
}
