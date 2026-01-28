'use client'

import { Users, Network, Scale, MonitorPlay, UserCog, BarChart3, Printer, Zap } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export function FeatureShowcase() {
  const features = [
    {
      icon: MonitorPlay,
      title: 'Live Match Console',
      description: 'The heart of your event. Queue matches, score points, and manage court flow from a central dashboard.',
      className: "md:col-span-2 md:row-span-2 bg-gradient-to-br from-primary/10 to-transparent",
      iconClassName: "text-primary h-8 w-8",
    },
    {
      icon: Network,
      title: 'Smart Brackets',
      description: 'Create single elimination brackets that optimize for separation.',
      className: "md:col-span-1 bg-card/50",
      iconClassName: "text-blue-500",
    },
    {
      icon: Scale,
      title: 'Digital Weigh-In',
      description: 'Track weights in real-time. Auto-flag disqualifications.',
      className: "md:col-span-1 bg-card/50",
      iconClassName: "text-orange-500",
    },
    {
      icon: Users,
      title: 'Bulk Management',
      description: 'Import hundreds of athletes instantly.',
      className: "md:col-span-1 bg-card/50",
      iconClassName: "text-green-500",
    },
    {
      icon: Zap,
      title: 'Real-Time View',
      description: 'Families follow matches live from anywhere.',
      className: "md:col-span-1 bg-card/50",
      iconClassName: "text-yellow-500",
    },
  ]

  return (
    <section className="py-24 bg-foreground/5 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-30">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-secondary/20 rounded-full blur-[100px]" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-6">
            Everything you need to run <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">World-Class Events</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            From registration to the podium, we handle the chaos so you can focus on the sport.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[minmax(280px,auto)]">
          {features.map((feature, index) => (
            <motion.div 
              key={index} 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              viewport={{ once: true }}
              className={cn(
                "group relative p-8 rounded-3xl border hover:border-primary/50 transition-all duration-300 backdrop-blur-sm overflow-hidden flex flex-col justify-between",
                feature.className
              )}
            >
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative z-10">
                <div className={cn("p-3 rounded-2xl bg-background/80 w-fit mb-4 shadow-sm", feature.iconClassName)}>
                   <feature.icon className="w-full h-full" />
                </div>
                <h3 className="text-xl font-bold mb-2 tracking-tight">
                    {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-[90%]">
                    {feature.description}
                </p>
              </div>

              {/* Decorative / Mock Content for Large Cards */}
              {feature.className.includes('col-span-2') && (
                 <>
                    <div className="absolute bottom-0 right-0 w-full h-1/2 bg-gradient-to-t from-background/40 to-transparent z-0" />
                    
                    {/* Mock Scoreboard UI */}
                    <div className="absolute -right-4 -bottom-4 w-[80%] h-[60%] bg-background rounded-tl-2xl border border-border/50 shadow-xl p-4 flex flex-col gap-2 opacity-90 group-hover:scale-105 group-hover:-translate-y-2 transition-transform duration-500">
                        <div className="flex justify-between items-center text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">
                            <span>Court 3</span>
                            <span className="text-red-500 animate-pulse">Live</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 flex-1">
                            <div className="flex flex-col items-center">
                                <div className="w-8 h-8 rounded-full bg-red-500/10 text-red-600 flex items-center justify-center font-bold text-xs mb-1">R</div>
                                <span className="text-3xl font-black text-foreground">14</span>
                            </div>
                            <div className="h-full w-px bg-border" />
                            <div className="flex flex-col items-center">
                                <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold text-xs mb-1">B</div>
                                <span className="text-3xl font-black text-foreground">09</span>
                            </div>
                        </div>
                    </div>
                 </>
              )}
            </motion.div>
          ))}
            
        </div>
      </div>
    </section>
  )
}

