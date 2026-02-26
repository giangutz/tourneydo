import { notFound, redirect } from 'next/navigation'
import { auth } from "@clerk/nextjs/server"
import { getTournamentById } from '@/lib/db/queries/tournaments'
import { getPendingPaymentsByTournament } from '@/lib/db/queries/payments'
import { checkTournamentAccess } from '@/lib/auth/tournament-access'
import { DashboardShell } from '@/components/layouts/dashboard-shell'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { 
  Card, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card'
import { 
  Users, 
  Trophy, 
  Swords, 
  Settings, 
  ArrowLeft,
  ExternalLink,
  Scale,
  Calendar
} from 'lucide-react'
import Link from 'next/link'
import { routes } from '@/config/routes'
import { PhaseProvider } from '@/components/tournaments/dashboard/phase-context'
import { DashboardContent } from '@/components/tournaments/dashboard/dashboard-content'
import { TournamentRole } from '@/types/models'
import { RealtimeListener } from '@/components/tournaments/realtime-listener'
import { PaymentSubmissionsCard } from '@/components/tournaments/payment-submissions-card'

interface TournamentDashboardPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function TournamentDashboardPage({ params }: TournamentDashboardPageProps) {
  const { id } = await params
  
  // Check access first
  const access = await checkTournamentAccess(id)
  
  if (!access.hasAccess) {
    redirect('/dashboard/tournament-organizer')
  }

  const [tournament, pendingPayments] = await Promise.all([
    getTournamentById(id),
    getPendingPaymentsByTournament(id)
  ])

  if (!tournament) {
    notFound()
  }

  const userRoles = (access.userRoles ?? []) as TournamentRole[]
  const isOrganizer = access.isOrganizer
  const hasRole = (...r: TournamentRole[]) => r.some(role => userRoles.includes(role))

  // Define permissions
  const canManageParticipants = isOrganizer || hasRole('admin', 'staff', 'registration_manager')
  const canManageBracket = isOrganizer || hasRole('admin', 'staff', 'bracket_manager')
  const canManageMatches = isOrganizer || hasRole('admin', 'staff', 'bracket_manager', 'official')
  const canManageSettings = isOrganizer || hasRole('admin')
  const canManageStaff = isOrganizer || hasRole('admin')
  const canWeighIn = isOrganizer || hasRole('admin', 'staff', 'official', 'weigh_in_staff')

  const { userId } = await auth()
  if (!userId) {
     redirect('/sign-in')
  }

  return (
    <DashboardShell>
      {/* ... header */}
      <PageHeader
        title={tournament.name}
        description={`Tournament Dashboard ${isOrganizer ? '• Organizer View' : userRoles.length > 0 ? `• ${userRoles.map(r => r.charAt(0).toUpperCase() + r.slice(1)).join(', ')} View` : ''}`}
        action={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={routes.organizer.tournaments}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to List
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/tournaments/${tournament.id}`} target="_blank">
                <ExternalLink className="mr-2 h-4 w-4" />
                Public Page
              </Link>
            </Button>
          </div>
        }
      />

      <PhaseProvider tournament={tournament}>
        <DashboardContent tournamentId={tournament.id} userId={userId} />
      </PhaseProvider>
      <RealtimeListener tournamentId={tournament.id} />

      <div className="border-t pt-8 mt-8">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          
          {canManageParticipants && (
            <Link href={routes.organizer.tournamentParticipants(tournament.id)} className="block">
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex items-center text-base">
                    <Users className="mr-2 h-5 w-5 text-primary" />
                    Manage Participants
                  </CardTitle>
                  <CardDescription>Approvals & Edits</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          )}

          {canManageBracket && (
            <Link href={routes.organizer.tournamentBracket(tournament.id)} className="block">
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex items-center text-base">
                    <Trophy className="mr-2 h-5 w-5 text-primary" />
                    Bracket Manager
                  </CardTitle>
                  <CardDescription>Generate & View</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          )}

          {canManageMatches && (
            <Link href={routes.organizer.tournamentMatches(tournament.id)} className="block">
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex items-center text-base">
                    <Swords className="mr-2 h-5 w-5 text-primary" />
                    Match Console
                  </CardTitle>
                  <CardDescription>Live Scoring</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          )}

          {canManageBracket && (
            <Link href={routes.organizer.schedule(tournament.id)} className="block">
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex items-center text-base">
                    <Calendar className="mr-2 h-5 w-5 text-primary" />
                    Schedule
                  </CardTitle>
                  <CardDescription>Time & Courts</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          )}

          {canManageSettings && (
            <Link href={`/dashboard/tournament-organizer/tournaments/${tournament.id}/divisions`} className="block">
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex items-center text-base">
                    <Trophy className="mr-2 h-5 w-5 text-primary" />
                    Divisions
                  </CardTitle>
                  <CardDescription>Configure Categories</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          )}

          {canWeighIn && (
            <Link href={routes.organizer.randomweighIn(tournament.id)} className="block">
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex items-center text-base">
                    <Scale className="mr-2 h-5 w-5 text-primary" />
                    Random Weigh-In
                  </CardTitle>
                  <CardDescription>Surprise Checks</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          )}

          {canManageStaff && (
            <Link href={routes.organizer.staff(tournament.id)} className="block">
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex items-center text-base">
                    <Users className="mr-2 h-5 w-5 text-primary" />
                    Manage Staff
                  </CardTitle>
                  <CardDescription>Invites & Roles</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          )}

          {canManageSettings && (
            <PaymentSubmissionsCard pendingPayments={pendingPayments} tournamentId={tournament.id} />
          )}

          {canManageSettings && (
            <Link href={routes.organizer.tournamentEdit(tournament.id)} className="block">
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex items-center text-base">
                    <Settings className="mr-2 h-5 w-5 text-primary" />
                    Settings
                  </CardTitle>
                  <CardDescription>Configuration</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          )}
        </div>
      </div>
    </DashboardShell>
  )
}
