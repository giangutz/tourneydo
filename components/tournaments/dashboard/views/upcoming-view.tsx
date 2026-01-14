"use client"

import { useEffect, useState } from 'react'
import { useSession } from '@clerk/nextjs'
import { createClerkSupabaseClient } from '@/lib/supabase/client'
import { KPICard } from '../kpi-card'
import { Users, AlertCircle, Shield, CreditCard } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import type { Database } from '@/lib/supabase/types'
import { UpcomingViewSkeleton } from './skeletons'


interface UpcomingViewProps {
  tournamentId: string
}

type RegistrationWithTeam = Database['public']['Tables']['tournament_registrations']['Row'] & {
  teams: { name: string } | null
}

export function UpcomingView({ tournamentId }: UpcomingViewProps) {
  const { session } = useSession()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalRegistrations: 0,
    registrationVelocity: 0,
    unpaidRegistrations: 0,
    teamCount: 0,
    outstandingRevenue: 0,
    entryFee: 0
  })
  const [divisionData, setDivisionData] = useState<{name: string, value: number}[]>([])
  const [teamData, setTeamData] = useState<{name: string, count: number, unpaid: number}[]>([])

  useEffect(() => {
    if (!session) return

    const fetchData = async () => {
      setLoading(true)
      const supabase = createClerkSupabaseClient({ session })

      const [registrationsRes, divisionsRes, tournamentRes] = await Promise.all([
        supabase
          .from('tournament_registrations')
          .select('*, teams(name)')
          .eq('tournament_id', tournamentId),
        supabase
          .from('tournament_divisions')
          .select('id, name')
          .eq('tournament_id', tournamentId),
        supabase
          .from('tournaments')
          .select('entry_fee')
          .eq('id', tournamentId)
          .single()
      ])

      const registrations = registrationsRes.data as unknown as RegistrationWithTeam[] | null
      const divisions = divisionsRes.data as { id: string, name: string }[] | null
      const tournament = tournamentRes.data as { entry_fee: number } | null

      if (registrations) {
        const now = new Date()
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

        const total = registrations.length
        const newLast24h = registrations.filter((r) => new Date(r.created_at) > oneDayAgo).length
        const unpaid = registrations.filter((r) => r.status !== 'paid').length
        const uniqueTeams = new Set(registrations.map((r) => r.team_id)).size
        
        setStats({
          totalRegistrations: total,
          registrationVelocity: newLast24h,
          unpaidRegistrations: unpaid,
          teamCount: uniqueTeams,
          outstandingRevenue: 0,
          entryFee: tournament?.entry_fee || 0
        })

        const divisionsMap: Record<string, number> = {}
        const outputMap: Record<string, string> = {}

        // Create ID -> Name map
        if (divisions) {
          divisions.forEach(d => {
            outputMap[d.id] = d.name
          })
        }

        registrations.forEach((r) => {
          const key = r.division_id || 'Unassigned'
          divisionsMap[key] = (divisionsMap[key] || 0) + 1
        })
        
        setDivisionData(Object.entries(divisionsMap).map(([id, count]) => ({
          name: outputMap[id] ? outputMap[id] : (id === 'Unassigned' ? 'Unassigned' : id.substring(0, 8)),
          value: count
        })))

        const teamMap: Record<string, { name: string, count: number, unpaid: number }> = {}
        registrations.forEach((r) => {
          const teamName = r.teams?.name || 'Unknown Team'
          if (!teamMap[teamName]) {
            teamMap[teamName] = { name: teamName, count: 0, unpaid: 0 }
          }
          teamMap[teamName].count++
          if (r.status !== 'paid') {
            teamMap[teamName].unpaid++
          }
        })
        setTeamData(Object.values(teamMap))
      }
      setLoading(false)
    }

    fetchData()
  }, [tournamentId, session])

  if (loading) return <UpcomingViewSkeleton />

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard 
          title="Total Registrations" 
          value={stats.totalRegistrations} 
          icon={<Users className="h-4 w-4 text-primary" />}
          trend={`+${stats.registrationVelocity} in last 24h`}
          trendDirection="up"
        />
        <KPICard 
          title="Unpaid Registrations" 
          value={stats.unpaidRegistrations} 
          icon={<AlertCircle className="h-4 w-4 text-destructive" />}
          description="Action required"
          trendDirection="down"
        />
        <KPICard 
          title="Participating Teams" 
          value={stats.teamCount} 
          icon={<Shield className="h-4 w-4 text-blue-500" />}
        />
        <KPICard 
          title="Est. Revenue" 
          value={`₱${(stats.totalRegistrations * stats.entryFee).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
          icon={<CreditCard className="h-4 w-4 text-green-500" />}
          description={`Based on ${stats.totalRegistrations} regs @ ₱${stats.entryFee}`}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Division Health</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={divisionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="var(--chart-1)" name="Athletes" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Team Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[300px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team</TableHead>
                    <TableHead>Athletes</TableHead>
                    <TableHead>Unpaid</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamData.map((team, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{team.name}</TableCell>
                      <TableCell>{team.count}</TableCell>
                      <TableCell className={team.unpaid > 0 ? "text-red-500 font-bold" : "text-green-600"}>
                        {team.unpaid}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
