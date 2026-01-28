import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DivisionManagement } from '@/components/tournaments/division-management'
import { getAllTournamentDivisions } from '@/lib/db/queries/divisions'
import { getTournamentById } from '@/lib/db/queries/tournaments'
import { redirect } from 'next/navigation'
import { Skeleton } from '@/components/ui/skeleton'
import { id } from 'zod/v4/locales'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { routes } from '@/config/routes'

interface DivisionsPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function DivisionsPage({ params }: DivisionsPageProps) {
  const { id: tournamentId } = await params
  
  const [tournament, divisions] = await Promise.all([
    getTournamentById(tournamentId),
    getAllTournamentDivisions(tournamentId)
  ])

  if (!tournament) {
    redirect('/dashboard/tournament-organizer/tournaments')
  }

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <Button variant="outline" asChild className="w-fit">
          <Link href={routes.organizer.tournamentDetail(tournamentId)}>
             <ArrowLeft className="mr-2 h-4 w-4" />
             Back to Tournament
          </Link>
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Division Management</h2>
        <p className="text-muted-foreground">
          Configure divisions and categories for {tournament.name}. Enable/disable divisions, customize weight and height limits, and manage categories.
        </p>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-lg">Quick Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>• <strong>Enable/Disable Divisions</strong>: Toggle divisions on or off based on your tournament needs (e.g., Cadet & Junior only)</p>
          <p>• <strong>Customize Categories</strong>: Edit weight/height limits or add custom categories for specific divisions</p>
          <p>• <strong>Gender Options</strong>: Categories can be configured for Boys/Girls (youth) or Men/Women (adult)</p>
          <p>• <strong>Safety</strong>: Categories with assigned participants cannot be deleted</p>
        </CardContent>
      </Card>

      <Suspense fallback={<DivisionsSkeleton />}>
        <DivisionManagement tournamentId={tournamentId} divisions={divisions as any} />
      </Suspense>
    </div>
  )
}

function DivisionsSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-1/2 mt-2" />
          </CardHeader>
        </Card>
      ))}
    </div>
  )
}
