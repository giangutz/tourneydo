import { notFound, redirect } from 'next/navigation'
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
  Scale
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

  const role = access.userRole as TournamentRole || (access.isOrganizer ? 'admin' : null)
  const isOrganizer = access.isOrganizer

  // Define permissions
  const canManageParticipants = isOrganizer || role === 'admin' || role === 'staff' || role === 'registration_manager'
  const canManageBracket = isOrganizer || role === 'admin' || role === 'staff' || role === 'bracket_manager'
  const canManageMatches = isOrganizer || role === 'admin' || role === 'staff' || role === 'bracket_manager' || role === 'official'
  const canManageSettings = isOrganizer || role === 'admin'
  const canManageStaff = isOrganizer || role === 'admin'
  const canWeighIn = isOrganizer || role === 'admin' || role === 'staff' || role === 'official' || role === 'weigh_in_staff'

  return (
    <DashboardShell>
      {/* ... header */}
      <PageHeader
        title={tournament.name}
        description={`Tournament Dashboard ${role ? `• ${role.charAt(0).toUpperCase() + role.slice(1)} View` : ''}`}
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
        <DashboardContent tournamentId={tournament.id} />
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

          {canWeighIn && (
            <Link href={routes.organizer.weighIn(tournament.id)} className="block">
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
            <PaymentSubmissionsCard pendingPayments={pendingPayments} />
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
