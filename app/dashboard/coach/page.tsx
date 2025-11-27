import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createClerkSupabaseClient } from "@/lib/supabase/server"
import type { Team } from '@/lib/supabase/types'

export default async function CoachDashboard() {
  const { userId, sessionClaims } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  const role = sessionClaims?.metadata?.role

  if (role !== 'coach') {
    redirect('/dashboard/tournament-organizer')
  }

  // Fetch coach's team data
  const supabase = await createClerkSupabaseClient()
  const { data: teams, error } = await (supabase as any)
    .from('teams')
    .select('*')
    .eq('user_id', userId)

  const team = teams?.[0] as Team | undefined

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Coach Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back! Manage your team and tournament registrations.
        </p>
      </div>

      {team && (
        <div className="rounded-lg border bg-white p-6">
          <h2 className="text-xl font-semibold mb-4">Your Team</h2>
          <div className="space-y-2">
            <div>
              <span className="text-sm text-muted-foreground">Team Name:</span>
              <p className="font-medium">{team.name}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Created:</span>
              <p className="font-medium">{new Date(team.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-800">Error loading team data. Please try again later.</p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border bg-white p-6">
          <h3 className="font-semibold mb-2">Athletes</h3>
          <p className="text-3xl font-bold">0</p>
          <p className="text-sm text-muted-foreground mt-1">Registered athletes</p>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <h3 className="font-semibold mb-2">Tournaments</h3>
          <p className="text-3xl font-bold">0</p>
          <p className="text-sm text-muted-foreground mt-1">Active registrations</p>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <h3 className="font-semibold mb-2">Upcoming Events</h3>
          <p className="text-3xl font-bold">0</p>
          <p className="text-sm text-muted-foreground mt-1">Events this month</p>
        </div>
      </div>
    </div>
  )
}
