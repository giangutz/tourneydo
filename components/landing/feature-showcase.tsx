'use client'

import { Users, Network, Scale, MonitorPlay, UserCog, BarChart3, Printer, Zap } from 'lucide-react'

export function FeatureShowcase() {
  const features = [
    {
      icon: Users,
      title: 'Bulk Participant Management',
      description: 'Import hundreds of athletes via CSV or let them register individually. We handle team assignments automatically.'
    },
    {
      icon: Network,
      title: 'Smart Bracket Generation',
      description: 'Create single elimination brackets that optimize for team separation and rank fairness in one click.'
    },
    {
      icon: Scale,
      title: 'Digital Weigh-In System',
      description: 'Track weights in real-time. System auto-flags disqualifications or division changes instantly.'
    },
    {
      icon: MonitorPlay,
      title: 'Live Match Console',
      description: 'The heart of your event. Queue matches, score points, and manage court flow from a central dashboard.'
    },
    {
      icon: UserCog,
      title: 'Staff Permissions',
      description: 'Give specific access to referees, weigh-in staff, and medical teams with secure role-based controls.'
    },
    {
      icon: Zap,
      title: 'Real-Time Public View',
      description: 'Families can track brackets and match times from their phones without refreshing the page.'
    },
    {
      icon: BarChart3,
      title: 'Financial Analytics',
      description: 'Track entry fees, outstanding balances, and total revenue with built-in financial dashboards.'
    },
    {
      icon: Printer,
      title: 'Export & Print',
      description: 'Need paper backups? Generate PDF brackets, match slips, and weigh-in sheets instantly.'
    }
  ]

  return (
    <section className="py-24 bg-slate-900 text-white relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[100px]" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Power Features for <span className="text-blue-400">Power Users</span>
          </h2>
          <p className="text-lg text-slate-300">
            For organizers who need more than just a spreadsheet.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="group p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-blue-500/50 transition-all duration-300 backdrop-blur-sm"
            >
              <div className="h-12 w-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-6 group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300">
                <feature.icon className="w-6 h-6 text-blue-400 group-hover:text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">
                {feature.title}
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed group-hover:text-slate-300">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
