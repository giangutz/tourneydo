import { getPublicTournaments } from "@/lib/db/queries/tournaments"
import { PublicTournamentList } from "@/components/tournaments/public-tournament-list"
import { TournamentSearch } from "@/components/tournaments/tournament-search"
import { TournamentFilters } from "@/components/tournaments/tournament-filters"
import { SiteHeader } from "@/components/layouts/site-header"
import { SiteFooter } from "@/components/layouts/site-footer"

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
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 container py-8">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <h1 className="text-3xl font-bold tracking-tight">Tournaments</h1>
            <p className="text-muted-foreground">
              Browse upcoming and past tournaments. Join the competition or check out the results.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <TournamentSearch />
            <TournamentFilters />
          </div>

          <PublicTournamentList tournaments={tournaments} />
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
