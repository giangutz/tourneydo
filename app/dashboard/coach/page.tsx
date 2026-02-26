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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Coach Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back! Manage your team and tournament registrations.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Athletes"
          value={playerCount}
          description="Registered athletes"
          icon={Users}
        />
        <StatCard
          title="Active Registrations"
          value={registrationCount}
          description="Tournaments enrolled"
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
            className="bg-primary/5 border-primary/20"
          />
        )}
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-semibold tracking-tight">Quick Actions</h2>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
           {/* 1. Find Tournaments */}
           <Link href="/dashboard/coach/tournaments" className="group p-6 rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-md hover:border-primary/50 transition-all flex flex-col items-center text-center">
              <div className="h-12 w-12 text-blue-500 bg-blue-500/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                 <Trophy className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-base mb-1">Find Tournaments</h3>
              <p className="text-xs text-muted-foreground">Browse & register</p>
           </Link>

           {/* 2. Create Team */}
           <Link href="/dashboard/coach/teams/new" className="group p-6 rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-md hover:border-primary/50 transition-all flex flex-col items-center text-center">
              <div className="h-12 w-12 text-indigo-500 bg-indigo-500/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                 <Users className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-base mb-1">Create Team</h3>
              <p className="text-xs text-muted-foreground">Add a new team roster</p>
           </Link>

           {/* 3. Add Athlete */}
           <Link href="/dashboard/coach/players/new" className="group p-6 rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-md hover:border-primary/50 transition-all flex flex-col items-center text-center">
              <div className="h-12 w-12 text-primary bg-primary/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                 <Users className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-base mb-1">Add Athlete</h3>
              <p className="text-xs text-muted-foreground">Register new players</p>
           </Link>

           {/* 4. Payment History */}
           <Link href="/dashboard/coach/payments" className="group p-6 rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-md hover:border-primary/50 transition-all flex flex-col items-center text-center">
              <div className="h-12 w-12 text-green-500 bg-green-500/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                 <Calendar className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-base mb-1">Payment History</h3>
              <p className="text-xs text-muted-foreground">Track financial records</p>
           </Link>
        </div>
      </div>
        
      {/* Staff / System Notification */}
      {isStaff && (
         <div className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">System Access</h2>
            <div className="rounded-xl border bg-linear-to-br from-primary/10 via-background to-background p-6 flex flex-col sm:flex-row justify-between items-center gap-6">
                <div>
                   <h3 className="font-semibold text-lg text-foreground">Organizer Access</h3>
                   <p className="text-sm text-muted-foreground mt-1">You have staff access to {staffTournaments.length} tournaments.</p>
                </div>
                <Link href="/dashboard/tournament-organizer" className="w-full sm:w-auto inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-10 px-6 py-2">
                   Switch to Organizer View
                </Link>
             </div>
         </div>
      )}
    </div>
  )
}
