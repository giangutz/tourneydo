'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { MockTournamentCard } from './mock-tournament-card'
import { HeroSearch } from './hero-search'
import { HeroSearchMobile } from './hero-search-mobile'

export function HeroSection() {
  return (
    <section className="relative w-full overflow-hidden bg-white dark:bg-slate-950 pt-16 pb-20 lg:pt-24 lg:pb-32">
      {/* Background Decor */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
         <div className="absolute top-20 left-10 w-72 h-72 bg-purple-200/30 rounded-full blur-3xl mix-blend-multiply dark:mix-blend-normal dark:bg-purple-900/10 animate-blob" />
         <div className="absolute top-20 right-10 w-72 h-72 bg-indigo-200/30 rounded-full blur-3xl mix-blend-multiply dark:mix-blend-normal dark:bg-indigo-900/10 animate-blob animation-delay-2000" />
         <div className="absolute -bottom-32 left-1/2 w-72 h-72 bg-blue-200/30 rounded-full blur-3xl mix-blend-multiply dark:mix-blend-normal dark:bg-blue-900/10 animate-blob animation-delay-4000" />
      </div>

      <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
          
          {/* Text Content (Left) */}
          <div className="flex-1 w-full max-w-2xl text-center lg:text-left">
             <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-full text-primary dark:text-blue-400 text-sm font-medium mb-6">
                <span className="flex h-2 w-2 rounded-full bg-primary dark:bg-blue-400"></span>
                The #1 Platform for Taekwondo
             </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 dark:text-white leading-[1.15]">
              Find & Compete in <br className="hidden lg:block"/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600 dark:from-blue-400 dark:to-blue-600">
                Local Tournaments
              </span>
            </h1>
            
            <p className="mt-6 text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-lg mx-auto lg:mx-0">
              Discover tournaments in your area, register in seconds, and track your progress. The easiest way to compete.
            </p>

            {/* Search Components */}
            <HeroSearch />
            <HeroSearchMobile />

            {/* B2B Call to Action */}
            <div className="mt-8 flex items-center justify-center lg:justify-start gap-2 text-sm text-slate-500">
                <span>Are you an organizer?</span>
                <Link href="/sign-up" className="font-semibold text-primary hover:text-blue-700 flex items-center group">
                    Host your tournament <ArrowRight className="ml-1 w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
            </div>
          </div>

          {/* Visual Content (Right) */}
          <div className="flex-1 w-full flex justify-center lg:justify-end relative">
            {/* The abstract card representation */}
            <div className="relative w-full max-w-[400px] lg:max-w-none perspective-1000">
                 <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-blue-500 rounded-[2.5rem] rotate-6 scale-95 opacity-20 blur-xl"></div>
                 <MockTournamentCard />
                 
                 {/* Floating Elements (Decor) */}
                 <div className="absolute -top-6 -left-6 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 animate-bounce-slow hidden sm:block">
                    <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Live Now</p>
                    <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="font-bold text-slate-900 dark:text-white">NY Open 2025</span>
                    </div>
                 </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
