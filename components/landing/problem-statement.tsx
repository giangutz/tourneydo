'use client'

import { Card, CardContent } from '@/components/ui/card'
import { ClipboardList, Scale, MonitorPlay } from 'lucide-react'

export function ProblemStatement() {
  const problems = [
    {
      icon: ClipboardList,
      title: 'Manual Bracket Creation',
      description: 'Hours spent drawing brackets by hand and managing matchups manually'
    },
    {
      icon: Scale,
      title: 'Weigh-In Chaos',
      description: 'Tracking weights on clipboards and spreadsheets, prone to errors'
    },
    {
      icon: MonitorPlay,
      title: 'Live Match Confusion',
      description: 'Coordinating multiple courts without real-time updates'
    }
  ]

  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Running a Taekwondo tournament shouldn't feel like a{' '}
            <span className="text-red-600">tournament itself</span>
          </h2>
          <p className="text-xl text-gray-600">
            Traditional tournament management is time-consuming, error-prone, and stressful
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {problems.map((problem, index) => (
            <Card key={index} className="border-2 hover:border-red-200 transition-colors">
              <CardContent className="p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-6">
                  <problem.icon className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {problem.title}
                </h3>
                <p className="text-gray-600">
                  {problem.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-2xl font-semibold text-blue-600 flex items-center justify-center gap-2">
            There's a better way
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </p>
        </div>
      </div>
    </section>
  )
}
