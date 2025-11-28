import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getPlayerCountByCoachId } from '@/lib/db/queries/players'
import { getActiveRegistrationCount, getUpcomingEventsCount } from '@/lib/db/queries/registrations'
import { DashboardShell } from '@/components/layouts/dashboard-shell'
import { StatCard } from '@/components/ui/stat-card'
import { Users, Trophy, Calendar } from 'lucide-react'

export default async function CoachDashboard() {
  const { userId, sessionClaims } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  const role = sessionClaims?.metadata?.role

  if (role !== 'coach') {
    redirect('/dashboard/tournament-organizer')
  }

  // Fetch dashboard stats
  const [playerCount, registrationCount, eventsCount] = await Promise.all([
    getPlayerCountByCoachId(userId),
    getActiveRegistrationCount(userId),
    getUpcomingEventsCount(),
  ])

  return (
    <DashboardShell>
      <div>
        <h1 className="text-3xl font-bold">Coach Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back! Manage your team and tournament registrations.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Athletes"
          value={playerCount}
          description="Registered athletes"
          icon={Users}
        />
        <StatCard
          title="Tournaments"
          value={registrationCount}
          description="Active registrations"
          icon={Trophy}
        />
        <StatCard
          title="Upcoming Events"
          value={eventsCount}
          description="Events this month"
          icon={Calendar}
        />
      </div>
    </DashboardShell>
  )
}
