'use client'

import { Trophy, Users, Calendar, MapPin, ChevronRight, Medal } from 'lucide-react'

export function MockTournamentCard() {
  return (
    <div className="relative w-full max-w-sm mx-auto">
      {/* Abstract Background Elements */}
      <div className="absolute -top-12 -right-12 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl animate-pulse" />
      <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl" />

      {/* Main Card */}
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        {/* Header Image Area */}
        <div className="h-32 bg-gradient-to-br from-indigo-600 to-blue-600 relative p-6 flex flex-col justify-between">
            <div className="flex justify-between items-start">
               <span className="bg-white/20 backdrop-blur-md text-white text-xs font-semibold px-2.5 py-1 rounded-full border border-white/10">
                Registering
               </span>
               <div className="h-8 w-8 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10">
                 <Trophy className="w-4 h-4 text-white" />
               </div>
            </div>
            <div>
               <h3 className="text-white font-bold text-lg">National Championship</h3>
               <p className="text-blue-100 text-xs">Dec 15, 2025 • New York, NY</p>
            </div>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {/* Stats Row */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <Users className="w-4 h-4" />
              <span>128 Athletes</span>
            </div>
             <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <Medal className="w-4 h-4" />
              <span>Prize Pool</span>
            </div>
          </div>

          {/* Division Tags */}
          <div className="flex flex-wrap gap-2">
            {['Sparring', 'Poomsae', 'Team'].map((tag) => (
              <span key={tag} className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium">
                {tag}
              </span>
            ))}
          </div>

          <div className="h-px bg-slate-100 dark:bg-slate-800 my-2" />

          {/* User/Organizer Mini Profile */}
          <div className="flex items-center gap-3">
             <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-orange-400 to-red-400 p-0.5">
                <div className="h-full w-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">TKD</span>
                </div>
             </div>
             <div className="flex-1">
                <p className="text-sm font-medium text-slate-900 dark:text-white">Master Kim's Dojang</p>
                <p className="text-xs text-slate-500">Organizer</p>
             </div>
             <button className="h-8 w-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-100 transition-colors">
                <ChevronRight className="w-4 h-4 text-slate-600" />
             </button>
          </div>
        </div>
      </div>
      
       {/* Floating Notification/Card behind */}
       <div className="absolute -z-10 top-4 -right-4 w-full h-full bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 opacity-60 scale-95 origin-left" />
    </div>
  )
}
