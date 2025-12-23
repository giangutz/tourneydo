'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Users, Network, Scale, MonitorPlay, UserCog, BarChart3, Printer, Zap } from 'lucide-react'

export function FeatureShowcase() {
  const features = [
    {
      icon: Users,
      title: 'Participant Management',
      description: 'Easy registration, team organization, payment tracking, and CSV import for bulk registration'
    },
    {
      icon: Network,
      title: 'Smart Bracket Generation',
      description: 'One-click single elimination brackets with team distance optimization for fair matchups'
    },
    {
      icon: Scale,
      title: 'Digital Weigh-In System',
      description: 'Track weights in real-time, auto-DQ violations, and generate surprise check lists instantly'
    },
    {
      icon: MonitorPlay,
      title: 'Live Match Console',
      description: 'Manage multiple courts, queue matches, score in real-time, and handle DQs from the console'
    },
    {
      icon: UserCog,
      title: 'Staff Collaboration',
      description: 'Role-based permissions, email invitations, and secure multi-staff access control'
    },
    {
      icon: Zap,
      title: 'Real-Time Updates',
      description: 'Live bracket updates, instant match results, and public viewing pages with no refresh needed'
    },
    {
      icon: BarChart3,
      title: 'Analytics & Insights',
      description: 'Tournament dashboard, weigh-in progress charts, outstanding balances, and participant stats'
    },
    {
      icon: Printer,
      title: 'Print & Export',
      description: 'Printable brackets, match slips generation, and CSV export for participants and weigh-in lists'
    }
  ]

  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Everything You Need in{' '}
            <span className="text-blue-600">One Platform</span>
          </h2>
          <p className="text-xl text-gray-600">
            Comprehensive tools designed specifically for World Taekwondo Federation tournaments
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="hover:shadow-lg transition-shadow border-2 hover:border-blue-100"
            >
              <CardContent className="p-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-4">
                  <feature.icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
