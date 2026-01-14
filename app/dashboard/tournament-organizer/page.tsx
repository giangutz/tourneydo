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

  // Calculate tournament statuses
  const now = new Date()
  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(now.getDate() + 30)

  const stats = {
    total: tournaments.length,
    upcoming: 0,
    ongoing: 0,
    completed: 0,
    cancelled: 0
  }

  tournaments.forEach(t => {
    // Determine status based on dates matching logic in queries/tournaments.ts
    // If status is explicit in DB, use it, but logic here helps validation
    const status = t.status
    
    // We can also double check with dates if status might be stale in UI view
    // But t.status from getTournamentsByOrganizerId should be auto-updated
    if (status === 'upcoming') stats.upcoming++
    else if (status === 'ongoing') stats.ongoing++
    else if (status === 'completed') stats.completed++
    else if (status === 'cancelled') stats.cancelled++
  })

  // Format currency
  const formattedRevenue = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(totalRevenue)

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Organizer Dashboard</h1>
      
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Tournaments Overview Card */}
          <Card className="col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tournaments Overview</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-4">{stats.total} <span className="text-sm font-normal text-muted-foreground">Total</span></div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="flex flex-col items-center p-2 bg-muted/50 rounded-lg">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">Ongoing</span>
                  <span className="text-lg font-bold text-green-600">{stats.ongoing}</span>
                </div>
                <div className="flex flex-col items-center p-2 bg-muted/50 rounded-lg">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">Upcoming</span>
                  <span className="text-lg font-bold text-blue-600">{stats.upcoming}</span>
                </div>
                <div className="flex flex-col items-center p-2 bg-muted/50 rounded-lg">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">Done</span>
                  <span className="text-lg font-bold text-gray-500">{stats.completed}</span>
                </div>
                <div className="flex flex-col items-center p-2 bg-muted/50 rounded-lg">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">Cancelled</span>
                  <span className="text-lg font-bold text-red-500">{stats.cancelled}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        
        {/* Registrations Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Registrations</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRegistrations}</div>
            <p className="text-xs text-muted-foreground">Across all events</p>
            <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
               Approx. {stats.total > 0 ? (totalRegistrations / stats.total).toFixed(1) : 0} registrations / tournament
            </div>
          </CardContent>
        </Card>

        {/* Revenue Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formattedRevenue}</div>
            <p className="text-xs text-muted-foreground">Verified payments</p>
            <div className="mt-4 pt-4 border-t text-xs text-muted-foreground flex items-center gap-1">
              <Activity className="h-3 w-3" />
              <span>Based on confirmed payments</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No recent activity to display.
                </p>
              ) : (
                recentActivity.map((activity: any) => (
                  <div key={activity.id} className="flex items-center">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">
                        <span className="font-semibold">{activity.players?.first_name} {activity.players?.last_name}</span> registered for <span className="font-semibold">{activity.tournaments?.name}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
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
    </div>
  )
}
