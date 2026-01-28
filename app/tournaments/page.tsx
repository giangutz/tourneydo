import { getPublicTournaments } from '@/lib/db/queries/tournaments'
import { PublicTournamentList } from '@/components/tournaments/public-tournament-list'
import { TournamentsToolbar } from '@/components/tournaments/public/tournaments-toolbar'
import { TournamentsHero } from '@/components/tournaments/public/tournaments-hero'
import { SiteHeader } from '@/components/layouts/site-header'

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
      <main className="flex-1 pb-20">
         <div className="container mx-auto px-4 py-8 max-w-7xl sm:px-6 lg:px-8">
            <TournamentsHero />
            
            <div className="space-y-8">
               <TournamentsToolbar />
               <PublicTournamentList tournaments={tournaments} />
            </div>
         </div>
      </main>
    </div>
  )
}
