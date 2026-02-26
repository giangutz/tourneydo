"use client"

import { useEffect, useState } from 'react'
import { useSession } from '@clerk/nextjs'
import { createClerkSupabaseClient } from '@/lib/supabase/client'
import { KPICard } from '../kpi-card'
import { Activity, Clock, Users, Zap } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Database } from '@/lib/supabase/types'
import { OngoingViewSkeleton } from './skeletons'


interface OngoingViewProps {
  tournamentId: string
}

type Match = Database['public']['Tables']['matches']['Row']

export function OngoingView({ tournamentId }: OngoingViewProps) {
  const { session } = useSession()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    scheduleVariance: 0, // Minutes ahead/behind
    activeCheckIns: 0,
    matchesPerHour: 0,
    stagingQueue: 0
  })
  const [paceData, setPaceData] = useState<{time: string, scheduled: number, actual: number}[]>([])

  useEffect(() => {
    if (!session) return

    const fetchData = async () => {
      setLoading(true)
      const supabase = createClerkSupabaseClient({ session })

      // Fetch Matches
      const { data } = await supabase
        .from('matches')
        .select('*')
        .eq('tournament_id', tournamentId)
        
      const matches = data as Match[] | null

      if (matches) {
        // Schedule Variance
        let varianceMinutes = 0
        let completedMatches = 0 // eslint-disable-line @typescript-eslint/no-unused-vars
        let matchesLastHour = 0
        const now = new Date()
        
        matches.forEach((m) => {
          if (m.status === 'completed' && m.actual_end_time && m.scheduled_end_time) {
            const actual = new Date(m.actual_end_time).getTime()
            const scheduled = new Date(m.scheduled_end_time).getTime()
            varianceMinutes += (actual - scheduled) / (1000 * 60)
            completedMatches++
            
            if (now.getTime() - actual < 60 * 60 * 1000) {
              matchesLastHour++
            }
          }
        })

        // Real calculations for Ongoing stats
        const activeMatches = matches.filter(m => m.lifecycle_state === 'IN_PROGRESS').length
        const stagingMatches = matches.filter(m => m.lifecycle_state === 'CONTEST').length

        setStats({
          scheduleVariance: Math.round(varianceMinutes),
          activeCheckIns: activeMatches, 
          matchesPerHour: matchesLastHour,
          stagingQueue: stagingMatches 
        })
        
        // Schedule Pace Chart Data Logic
        // We group matches by the hour of their scheduled end time.
        const hourlyData = new Map<string, { time: string, scheduled: number, actual: number }>()

        matches.forEach((m) => {
          if (!m.scheduled_end_time) return
          
          // Get the hour string, e.g., "09:00"
          const date = new Date(m.scheduled_end_time)
          const hourKey = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }).substring(0, 3) + '00'

          if (!hourlyData.has(hourKey)) {
            hourlyData.set(hourKey, { time: hourKey, scheduled: 0, actual: 0 })
          }
          hourlyData.get(hourKey)!.scheduled += 1
        })

        // Also add actual completions to their respective hours based on actual_end_time
        matches.forEach((m) => {
          if (m.status === 'completed' && m.actual_end_time) {
            const date = new Date(m.actual_end_time)
            const hourKey = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }).substring(0, 3) + '00'
            
            if (!hourlyData.has(hourKey)) {
              hourlyData.set(hourKey, { time: hourKey, scheduled: 0, actual: 0 })
            }
            hourlyData.get(hourKey)!.actual += 1
          }
        })

        // Sort chronologically and calculate cumulative totals
        const sortedHours = Array.from(hourlyData.values()).sort((a, b) => a.time.localeCompare(b.time))
        let cumulativeScheduled = 0
        let cumulativeActual = 0

        const finalPaceData = sortedHours.map(hour => {
          cumulativeScheduled += hour.scheduled
          cumulativeActual += hour.actual
          return {
            time: hour.time,
            scheduled: cumulativeScheduled,
            actual: cumulativeActual
          }
        })
        
        setPaceData(finalPaceData.length > 0 ? finalPaceData : [
          { time: '09:00', scheduled: 0, actual: 0 }
        ])
      }
      setLoading(false)
    }

    fetchData()
  }, [tournamentId, session])



  if (loading) return <OngoingViewSkeleton />

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard 
          title="Schedule Variance" 
          value={`${stats.scheduleVariance > 0 ? '+' : ''}${stats.scheduleVariance} min`}
          icon={<Clock className={stats.scheduleVariance > 30 ? "text-red-500" : "text-green-500"} />}
          description={stats.scheduleVariance > 0 ? "Behind Schedule" : "Ahead of Schedule"}
          trendDirection={stats.scheduleVariance > 15 ? 'down' : 'up'}
        />
        <KPICard 
          title="Matches / Hour" 
          value={stats.matchesPerHour}
          icon={<Zap className="h-4 w-4 text-yellow-500" />}
          description="Last 60 mins"
        />
        <KPICard 
          title="Staging Queue" 
          value={stats.stagingQueue}
          icon={<Users className="h-4 w-4 text-blue-500" />}
          description="Athletes in holding"
        />
        <KPICard 
          title="Total Completed" 
          value={paceData.length > 0 ? paceData[paceData.length-1].actual : 0}
          icon={<Activity className="h-4 w-4 text-green-500" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Schedule Pace</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={paceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="scheduled" stroke="#8884d8" name="Scheduled" strokeDasharray="5 5" />
              <Line type="monotone" dataKey="actual" stroke="#82ca9d" name="Actual Completed" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
