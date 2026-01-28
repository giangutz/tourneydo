'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface Tab {
  id: string
  label: string
  icon?: React.ReactNode
}

interface StickyNavProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (id: string) => void
  showLiveBadge?: boolean 
}

export function StickyNav({ tabs, activeTab, onTabChange, showLiveBadge }: StickyNavProps) {
  return (
    <div className="sticky top-16 z-30 pt-4 pb-4 bg-background/80 backdrop-blur-md">
      <div className={cn(
        "flex p-1 bg-muted/50 rounded-full overflow-x-auto no-scrollbar border",
        "md:grid md:grid-flow-col md:auto-cols-fr gap-1", // Spread out on desktop
        "[mask-image:linear-gradient(to_right,rgba(0,0,0,1)_85%,rgba(0,0,0,0)_100%)] md:[mask-image:none]" // Scroll fade hint on mobile
      )}>
        {tabs.map((tab) => {
           const isActive = activeTab === tab.id
           return (
             <button
               key={tab.id}
               onClick={() => onTabChange(tab.id)}
               className={cn(
                 "relative flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap rounded-full min-w-fit outline-none focus-visible:ring-2 w-full",
                 isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
               )}
             >
               {isActive && (
                 <motion.div
                   layoutId="activeTab"
                   className="absolute inset-0 bg-primary rounded-full shadow-sm"
                   transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                 />
               )}
               <span className="relative z-10 flex items-center gap-2">
                 {tab.icon}
                 {tab.label}
                 {tab.id === 'live' && showLiveBadge && (
                    <span className="relative flex h-2 w-2 ml-0.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                 )}
               </span>
             </button>
           )
        })}
      </div>
    </div>
  )
}
