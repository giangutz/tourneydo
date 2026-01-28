import { getTournamentsByOrganizerId } from '@/lib/db/queries/tournaments'
import { getTotalRegistrationsByOrganizerId, getRecentRegistrationsByOrganizerId } from '@/lib/db/queries/registrations'
import { getTotalRevenueByOrganizerId } from '@/lib/db/queries/payments'
import { auth } from "@clerk/nextjs/server"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { StatCard } from '@/components/ui/stat-card'
import { Trophy, Users, DollarSign, Activity, Calendar } from "lucide-react"
import { formatDistanceToNow } from 'date-fns'

export default async function TournamentOrganizerDashboard() {
  const { userId } = await auth()
  if (!userId) return null

  // Fetch data in parallel
  const [tournaments, totalRegistrations, recentActivity, totalRevenue] = await Promise.all([
    getTournamentsByOrganizerId(userId),
    getTotalRegistrationsByOrganizerId(userId),
    getRecentRegistrationsByOrganizerId(userId),
    getTotalRevenueByOrganizerId(userId)
  ])

  const stats = {
    total: tournaments.length,
    upcoming: tournaments.filter(t => t.status === 'upcoming').length,
    ongoing: tournaments.filter(t => t.status === 'ongoing').length,
    completed: tournaments.filter(t => t.status === 'completed').length,
    cancelled: tournaments.filter(t => t.status === 'cancelled').length
  }

  // Format currency
  const formattedRevenue = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(totalRevenue)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Organizer Dashboard</h1>
        <p className="text-muted-foreground mt-2">Overview of your tournaments and revenue.</p>
      </div>
      
      {/* Top Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={formattedRevenue}
          description="Verified payments"
          icon={DollarSign}
          className="lg:col-span-2"
        />
        <StatCard
          title="Total Registrations"
          value={totalRegistrations}
          description={`Avg. ${(stats.total > 0 ? totalRegistrations / stats.total : 0).toFixed(1)} per event`}
          icon={Users}
        />
        <StatCard
          title="Total Tournaments"
          value={stats.total}
          description="All time events"
          icon={Trophy}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        
        {/* Tournament Status Breakdown (Custom Card) */}
        <Card className="lg:col-span-4 shadow-sm border bg-card transition-all hover:shadow-md">
           <CardHeader>
              <CardTitle>Tournament Status</CardTitle>
           </CardHeader>
           <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                 <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.upcoming}</span>
                    <span className="text-sm font-medium text-blue-600/80 dark:text-blue-400/80">Upcoming</span>
                 </div>
                 <div className="p-4 rounded-2xl bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20 flex flex-col items-center justify-center text-center">
                    <div className="flex items-center gap-1.5">
                       <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <span className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.ongoing}</span>
                    </div>
                    <span className="text-sm font-medium text-green-600/80 dark:text-green-400/80">Active Now</span>
                 </div>
                 <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-bold text-slate-600 dark:text-slate-400">{stats.completed}</span>
                    <span className="text-sm font-medium text-slate-500">Completed</span>
                 </div>
                 <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.cancelled}</span>
                    <span className="text-sm font-medium text-red-600/80 dark:text-red-400/80">Cancelled</span>
                 </div>
              </div>
           </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-3 shadow-sm border bg-card transition-all hover:shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {recentActivity.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                   <Calendar className="h-8 w-8 mb-2 opacity-20" />
                   <p className="text-sm">No recent activity.</p>
                </div>
              ) : (
                recentActivity.map((activity: any, i: number) => (
                  <div key={activity.id} className="group flex items-start gap-4 p-3 -mx-3 rounded-xl hover:bg-muted/50 transition-colors">
                     {/* Avatar / Icon Placeholder */}
                    <div className="h-10 w-10 flex-shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs ring-2 ring-background group-hover:ring-muted transition-all">
                        {activity.players?.first_name?.[0]}{activity.players?.last_name?.[0]}
                    </div>
                    
                    <div className="space-y-1 flex-1 min-w-0">
                      <p className="text-sm font-medium leading-none truncate">
                        {activity.players?.first_name} {activity.players?.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                         Registered for <span className="font-medium text-foreground">{activity.tournaments?.name}</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

