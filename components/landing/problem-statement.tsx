'use client'

import { ClipboardList, Scale, MonitorPlay, ArrowDown } from 'lucide-react'

export function ProblemStatement() {
  const problems = [
    {
      icon: ClipboardList,
      title: 'Manual Brackets',
      description: 'Hours wasted on paper brackets and manual seeding.'
    },
    {
      icon: Scale,
      title: 'Weigh-In Chaos',
      description: 'Slow clipboards, lost forms, and data entry errors.'
    },
    {
      icon: MonitorPlay,
      title: 'Court Confusion',
      description: 'No real-time info for coaches, athletes, or fans.'
    }
  ]

  return (
    <section className="py-24 bg-background relative overflow-hidden">
      <div className="container mx-auto px-4">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-20">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            The Old Way is <span className="text-destructive line-through decoration-4 decoration-destructive/30">Broken</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Most tournaments are still run on spreadsheets and paper. It's time to stop the chaos.
          </p>
        </div>

        {/* Minimal Icon Row */}
        <div className="flex flex-col md:flex-row justify-center items-center md:items-start gap-12 md:gap-8 max-w-5xl mx-auto relative">
          
          {/* Connector Line (Desktop) */}
          <div className="hidden md:block absolute top-12 left-20 right-20 h-0.5 bg-gradient-to-r from-transparent via-border to-transparent -z-10" />

          {problems.map((problem, index) => (
            <div key={index} className="flex flex-col items-center text-center max-w-xs group">
              <div className="w-24 h-24 bg-destructive/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-destructive/20">
                <problem.icon className="w-10 h-10 text-destructive" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">
                {problem.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {problem.description}
              </p>
            </div>
          ))}
        </div>

        {/* Transition Hint */}
         <div className="flex justify-center mt-20 opacity-20 animate-bounce">
            <ArrowDown className="w-8 h-8 text-muted-foreground" />
         </div>

      </div>
    </section>
  )
}
