'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Network, Scale, MonitorPlay } from 'lucide-react'

export function SolutionOverview() {
  const solutions = [
    {
      icon: Network,
      title: 'Automated Bracket Generation',
      description: 'Smart seeding algorithm ensures fair matchups in single elimination format',
      features: ['One-click bracket creation', 'Team distance optimization', 'WTF division support']
    },
    {
      icon: Scale,
      title: 'Digital Weigh-In Management',
      description: 'Track weights in real-time with automatic disqualification for violations',
      features: ['Real-time weight tracking', 'Auto-DQ for violations', 'Surprise check lists']
    },
    {
      icon: MonitorPlay,
      title: 'Live Match Console',
      description: 'Manage multiple courts simultaneously with instant updates',
      features: ['Multi-court management', 'Real-time scoring', 'Instant DQ handling']
    }
  ]

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            One Platform, <span className="text-blue-600">Complete Control</span>
          </h2>
          <p className="text-xl text-gray-600">
            Everything you need to run professional Taekwondo tournaments
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {solutions.map((solution, index) => (
            <Card 
              key={index} 
              className="border-2 hover:border-blue-200 hover:shadow-xl transition-all group"
            >
              <CardContent className="p-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-6 group-hover:scale-110 transition-transform">
                  <solution.icon className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  {solution.title}
                </h3>
                <p className="text-gray-600 mb-6">
                  {solution.description}
                </p>
                <ul className="space-y-2">
                  {solution.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
