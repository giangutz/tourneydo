import { auth } from '@clerk/nextjs/server'
import { getRecentRegistrationsByOrganizerId } from '@/lib/db/queries/registrations'
import { getRecentPaymentsByOrganizer } from '@/lib/db/queries/payments'
import { formatDistanceToNow } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { CreditCard, UserPlus, Trophy, Bell, CheckCircle, XCircle } from 'lucide-react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface NotificationsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function NotificationsPage({ searchParams }: NotificationsPageProps) {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  const { page } = await searchParams
  const currentPage = Number(page) || 1
  const limit = 20
  const offset = (currentPage - 1) * limit

  // Fetch paginated data
  const [registrations, payments] = await Promise.all([
    getRecentRegistrationsByOrganizerId(userId, limit, offset),
    getRecentPaymentsByOrganizer(userId, limit, offset)
  ])

  // Group Registrations logic (Same as NotificationsNav)
  const groupedRegs: Record<string, any> = {}
  ;(registrations || []).forEach(r => {
    const key = r.teams?.id 
        ? `${r.tournaments?.id}-${r.teams?.id}` 
        : `single-${r.id}`
        
    if (!groupedRegs[key]) {
        groupedRegs[key] = {
          ...r,
          count: 0,
          latest_created_at: r.created_at 
        }
    }
    groupedRegs[key].count++
  })

  // Map to unified activity format
  const regActivities = Object.values(groupedRegs).map(r => {
    const isBulk = r.count > 1
    const displayName = isBulk 
        ? `${r.teams?.name} (${r.count} players)` 
        : `${r.players?.first_name} ${r.players?.last_name}`

    return {
        id: `org-reg-${r.id}`,
        type: 'registration',
        created_at: r.latest_created_at || r.created_at,
        status: r.status,
        player_name: displayName,
        tournament_name: r.tournaments?.name,
        tournament_id: r.tournaments?.id,
        data: r
    }
  })

  const payActivities = (payments || []).map((p: any) => ({
    id: `org-pay-${p.id}`,
    type: 'payment',
    created_at: p.created_at,
    status: p.status,
    player_name: p.teams?.name || 'Unknown Team',
    tournament_name: p.tournaments?.name,
    tournament_id: p.tournaments?.id,
    data: p
  }))

  // Merge and sort
  const activities = [...regActivities, ...payActivities]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  // Helper for icons
  const getIcon = (type: string, status: string) => {
    switch (type) {
      case 'payment':
        return <CreditCard className="h-5 w-5" />
      case 'registration':
        return <UserPlus className="h-5 w-5" />
      default:
        return <Bell className="h-5 w-5" />
    }
  }

  const getIconColor = (type: string, status: string) => {
    switch (type) {
      case 'payment':
        return 'bg-green-100 text-green-600'
      case 'registration':
        return 'bg-blue-100 text-blue-600'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  // Links for redirects
  const getLink = (activity: any) => {
    if (activity.type === 'registration') {
      return `/dashboard/tournament-organizer/tournaments/${activity.tournament_id}/participants`
    }
    if (activity.type === 'payment') {
      return `/dashboard/tournament-organizer/tournaments/${activity.tournament_id}/payments`
    }
    return '#'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground mt-2">
            Recent activity across all your tournaments.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity Feed</CardTitle>
          <CardDescription>
            Showing recent registrations and payments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bell className="mx-auto h-12 w-12 opacity-20 mb-4" />
              <p>No notifications found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => (
                <Link 
                  href={getLink(activity)} 
                  key={activity.id}
                  className="block p-4 border rounded-lg hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${getIconColor(activity.type, activity.status)}`}>
                      {getIcon(activity.type, activity.status)}
                    </div>
                    <div>
                      <p className="font-medium text-base">
                        {activity.type === 'payment' && (
                            <>
                            <span className="font-semibold">{activity.player_name}</span> submitted a payment for <span className="text-muted-foreground">{activity.tournament_name}</span>
                            </>
                        )}
                        {activity.type === 'registration' && (
                            <>
                            <span className="font-semibold">{activity.player_name}</span> registered for <span className="text-muted-foreground">{activity.tournament_name}</span>
                            </>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          <div className="flex items-center justify-between mt-8 pt-4 border-t">
             <Button
                variant="outline"
                disabled={currentPage <= 1}
                asChild
             >
                <Link href={`?page=${currentPage - 1}`}>Previous</Link>
             </Button>
             <span className="text-sm text-muted-foreground">Page {currentPage}</span>
             <Button
                variant="outline"
                disabled={activities.length < limit} // Rough check, ideal is generic count
                asChild
             >
                <Link href={`?page=${currentPage + 1}`}>Next</Link>
             </Button>
          </div>

        </CardContent>
      </Card>
    </div>
  )
}
