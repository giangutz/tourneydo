"use client"

import { useEffect, useState } from 'react'
import { useSession } from '@clerk/nextjs'
import { createClerkSupabaseClient } from '@/lib/supabase/client'
import { KPICard } from '../kpi-card'
import { Scale, CheckCircle, AlertTriangle, ArrowRightLeft } from 'lucide-react'
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Database } from '@/lib/supabase/types'
import { WeighInViewSkeleton } from './skeletons'


interface WeighInViewProps {
  tournamentId: string
}

type Registration = Database['public']['Tables']['tournament_registrations']['Row']

export function WeighInView({ tournamentId }: WeighInViewProps) {
  const { session } = useSession()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalToWeigh: 0,
    weighedIn: 0,
    failedWeight: 0,
    movedDivisions: 0
  })

  useEffect(() => {
    if (!session) return

    const fetchData = async () => {
      setLoading(true)
      const supabase = createClerkSupabaseClient({ session })

      const { data } = await supabase
        .from('tournament_registrations')
        .select('*')
        .eq('tournament_id', tournamentId)

      const registrations = data as Registration[] | null

      if (registrations) {
        const total = registrations.length
        const completed = registrations.filter((r) => r.weighed_in_at).length
        
        const failed = registrations.filter((r) => r.disqualified && r.disqualification_reason?.toLowerCase().includes('weight')).length
        
        setStats({
          totalToWeigh: total,
          weighedIn: completed,
          failedWeight: failed,
          movedDivisions: 0 
        })
      }
      setLoading(false)
    }

    fetchData()
  }, [tournamentId, session])


  const percentComplete = stats.totalToWeigh > 0 ? Math.round((stats.weighedIn / stats.totalToWeigh) * 100) : 0

  if (loading) return <WeighInViewSkeleton />

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard 
          title="Weigh-In Progress" 
          value={`${percentComplete}%`}
          icon={<Scale className="h-4 w-4 text-primary" />}
          description={`${stats.weighedIn}/${stats.totalToWeigh} athletes`}
        />
        <KPICard 
          title="Completed" 
          value={stats.weighedIn} 
          icon={<CheckCircle className="h-4 w-4 text-green-500" />}
        />
        <KPICard 
          title="Failed Weight (DQ)" 
          value={stats.failedWeight} 
          icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
          description="Disqualified due to weight"
        />
        <KPICard 
          title="Moved Divisions" 
          value={stats.movedDivisions} 
          icon={<ArrowRightLeft className="h-4 w-4 text-orange-500" />}
          description="Adjusted weight class"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Weigh-In Completion</CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={percentComplete} className="h-4 w-full" />
          <p className="text-sm text-muted-foreground mt-2">
            {stats.totalToWeigh - stats.weighedIn} athletes remaining
          </p>
        </CardContent>
      </Card>
      
      {/* List of pending weigh-ins could go here */}
    </div>
  )
}
