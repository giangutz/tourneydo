import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getPlayerCountByCoachId } from '@/lib/db/queries/players'
import { getActiveRegistrationCount, getUpcomingEventsCount } from '@/lib/db/queries/registrations'
import { getTournamentsByOrganizerId } from '@/lib/db/queries/tournaments'
import { DashboardShell } from '@/components/layouts/dashboard-shell'
import { StatCard } from '@/components/ui/stat-card'
import { Users, Trophy, Calendar } from 'lucide-react'
import Link from 'next/link'

export default async function CoachDashboard() {
  const { userId, sessionClaims } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  const role = sessionClaims?.metadata?.role

  if (role !== 'coach') {
    redirect('/dashboard/tournament-organizer')
  }

  // Check if coach is also staff for any tournament
  const staffTournaments = await getTournamentsByOrganizerId(userId)
  const isStaff = staffTournaments.some(t => t.organizer_id !== userId) // If they have tournaments but not organizer, they are staff
  
  // If staff, we might want to show a clear link to the organizer dashboard
  // or maybe just rely on the sidebar if it's dynamic.
  // For now, let's just make sure they *can* access the organizer route (which we need to check in that page/layout).
  // The organizer page check is just "userId" existence, so they CAN access it.
  
  // We can add a "Manage Tournaments" card if they are staff.

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
        
        {isStaff && (
          <StatCard
            title="Staff Access"
            value={staffTournaments.length}
            description="Tournaments you manage"
            icon={Trophy}
          />
        )}
      </div>
      
      {isStaff && (
        <div className="mt-8">
           <Link href="/dashboard/tournament-organizer" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
             Go to Tournament Manager Dashboard
           </Link>
        </div>
      )}
    </DashboardShell>
  )
}
