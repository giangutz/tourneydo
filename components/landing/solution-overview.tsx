'use client'

import { Layout, CheckCircle2, Trophy, Monitor } from 'lucide-react'

export function SolutionOverview() {
  const steps = [
    {
      title: "Smart Brackets & Registration",
      description: "Stop manually seeding players. Our algorithm automatically creates fair, balanced brackets based on age, weight, and rank. Registration handles payments and divisions effortlessly.",
      icon: Layout,
      points: ["One-click bracket generation", "Automatic conflict avoidance", "Instant participant assignment"],
      imageBg: "bg-blue-100"
    },
    {
      title: "Digital Weigh-In Management",
      description: "Eliminate the bottleneck at the scales. Staff can use any tablet or phone to weigh-in athletes, updating their status instantly across the entire tournament.",
      icon: CheckCircle2,
      points: ["Real-time weight verification", "Auto-disqualification logic", "Digital weight cards"],
      imageBg: "bg-indigo-100" 
    },
    {
      title: "Live Match Deployment",
      description: "Keep the tournament moving. Push matches to specific courts, display live scores on large screens, and let spectators follow along on their phones.",
      icon: Monitor,
      points: ["Drag-and-drop court management", "Live scoreboard display", "Real-time medal tracking"],
      imageBg: "bg-sky-100"
    }
  ]

  return (
    <section className="py-24 bg-muted/30 overflow-hidden">
      <div className="container mx-auto px-4">
        
        <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                A Unified Platform for <span className="text-primary">Modern Tournaments</span>
            </h2>
            <p className="text-lg text-muted-foreground">
                Replace your stack of disconnected apps with one seamless operating system.
            </p>
        </div>

        <div className="space-y-32">
          {steps.map((step, index) => (
            <div key={index} className={`flex flex-col lg:flex-row items-center gap-12 lg:gap-20 ${index % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}>
              
              {/* Text Side */}
              <div className="flex-1 space-y-8">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-background shadow-sm flex items-center justify-center border">
                        <step.icon className="w-6 h-6 text-primary" />
                    </div>
                    <span className="text-sm font-bold tracking-wider text-muted-foreground uppercase">Step 0{index + 1}</span>
                </div>
                
                <h3 className="text-3xl md:text-4xl font-bold text-foreground">
                    {step.title}
                </h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                    {step.description}
                </p>

                <ul className="space-y-4 pt-2">
                    {step.points.map((point, i) => (
                        <li key={i} className="flex items-center gap-3">
                            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                            <span className="text-foreground font-medium">{point}</span>
                        </li>
                    ))}
                </ul>
              </div>

              {/* Visual Side */}
              <div className="flex-1 w-full">
                <div className={`relative rounded-3xl overflow-hidden aspect-video shadow-2xl border-4 border-white ${step.imageBg}`}>
                    {/* Abstract Representation of UI */}
                     <div className="absolute inset-x-8 top-8 bottom-0 bg-white rounded-t-xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] p-6 space-y-4 opacity-90">
                        <div className="h-4 w-1/3 bg-slate-100 rounded-lg animate-pulse" />
                        <div className="h-32 w-full bg-slate-50 rounded-xl border border-slate-100" />
                        <div className="flex gap-4">
                            <div className="h-20 w-1/2 bg-blue-50/50 rounded-lg border border-blue-50" />
                            <div className="h-20 w-1/2 bg-blue-50/50 rounded-lg border border-blue-50" />
                        </div>
                     </div>
                </div>
              </div>

            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
