import { getPublicTournaments } from '@/lib/db/queries/tournaments'
import { PublicTournamentList } from '@/components/tournaments/public-tournament-list'
import { TournamentSearch } from '@/components/tournaments/tournament-search'
import { TournamentFilters } from '@/components/tournaments/tournament-filters'
import { SiteHeader } from '@/components/layouts/site-header'
// import { SiteFooter } from '@/components/layouts/site-footer'
import { Trophy } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface TournamentsPageProps {
  searchParams: Promise<{
    search?: string
    status?: string
  }>
}

export default async function TournamentsPage({ searchParams }: TournamentsPageProps) {
  const params = await searchParams
  const tournaments = await getPublicTournaments({
    search: params.search,
    status: params.status,
  })

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-primary/10 via-background to-background border-b">
          <div className="container mx-auto max-w-7xl py-12 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 mb-4">
              <Trophy className="h-8 w-8 text-primary" />
              <h1 className="text-4xl md:text-5xl font-bold">Tournaments</h1>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Browse and register for upcoming tournaments. Join the competition and showcase your skills!
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto max-w-7xl py-8 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <TournamentSearch />
              <TournamentFilters />
            </div>

            <PublicTournamentList tournaments={tournaments} />
          </div>
        </div>
      </main>
      {/* <SiteFooter /> */}
    </div>
  )
}
