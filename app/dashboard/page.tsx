import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getUserById } from '@/lib/db/queries/users'
import { getDashboardRoute, routes } from '@/config/routes'

export default async function DashboardPage() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect(routes.signIn)
  }

  const user = await getUserById(userId)

  if (!user || !user.role) {
    redirect(routes.onboarding)
  }

  const dashboardRoute = getDashboardRoute(user.role as 'coach' | 'tournament-organizer')
  redirect(dashboardRoute)
}
