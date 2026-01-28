'use client'

import { motion } from 'framer-motion'
import { Trophy, Users, Globe, Activity } from 'lucide-react'

const stats = [
  {
    icon: Trophy,
    value: '500+',
    label: 'Tournaments Hosted',
  },
  {
    icon: Users,
    value: '50k+',
    label: 'Active Athletes',
  },
  {
    icon: Activity,
    value: '100k+',
    label: 'Matches Scored',
  },
  {
    icon: Globe,
    value: '10+',
    label: 'Countries',
  },
]

export function StatsTicker() {
  return (
    <div className="w-full border-y bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              viewport={{ once: true }}
              className="flex items-center justify-center gap-4"
            >
              <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                <stat.icon className="w-6 h-6" />
              </div>
              <div className="text-left">
                <div className="text-2xl font-bold tracking-tight text-foreground">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">
                  {stat.label}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
