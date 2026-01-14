import { getTournamentById } from '@/lib/db/queries/tournaments'
import { getTournamentParticipants } from '@/lib/db/queries/registrations'
import { getTournamentDivisions } from '@/lib/db/queries/divisions'
import { IDCard } from '@/components/tournaments/id-card'
import { notFound } from 'next/navigation'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Printer, Calendar, MapPin, Users, Trophy, IdCard as IdCardIcon } from 'lucide-react'
import { PrintButton } from '@/components/tournaments/print-button'
import { PrintStyles } from '@/components/tournaments/print-styles'
import { SiteHeader } from '@/components/layouts/site-header'
import { formatShortDate } from '@/lib/utils'

interface PrintIDsPageProps {
  params: Promise<{
    id: string
  }>
  searchParams: Promise<{
    teamId?: string
    coachId?: string
  }>
}

// Helper function to format division label matching bracket view
function getDivisionLabel(division: any, category: any): string {
  if (!division || !category) return ''
  
  // Normalize category name (FEATHER -> Feather)
  const categoryName = category.name.charAt(0).toUpperCase() + category.name.slice(1).toLowerCase()
  
  // Determine if it's a youth division (Cadet or Gradeschool)
  const isYouth = division.name.toLowerCase().includes('cadet') || division.name.toLowerCase().includes('gradeschool')
  
  // Determine gender label
  let genderLabel = ''
  if (category.gender === 'male') {
    genderLabel = isYouth ? 'Boys' : 'Men'
  } else if (category.gender === 'female') {
    genderLabel = isYouth ? 'Girls' : 'Women'
  }

  return `${division.name} ${genderLabel} - ${categoryName}`.trim()
}

export default async function PrintIDsPage({ params, searchParams }: PrintIDsPageProps) {
  const { id } = await params
  const { teamId, coachId } = await searchParams
  
  const tournament = await getTournamentById(id)
  if (!tournament) notFound()

  const { data: participants } = await getTournamentParticipants(id, { limit: 1000 })
  const divisions = await getTournamentDivisions(id)

  // Filter participants
  let filteredParticipants = participants
  if (teamId) {
    filteredParticipants = participants.filter(p => p.team_id === teamId)
  } else if (coachId) {
    filteredParticipants = participants.filter(p => p.coach_id === coachId)
  }

  // Get team name if filtering by team
  const teamName = teamId ? filteredParticipants[0]?.team?.name : null

  // Get unique coaches if coachId is provided or if printing for a team
  const coachesToPrint = new Map<string, any>()
  
  if (coachId) {
    // Find any registration with this coach to get their details
    const registration = participants.find(p => p.coach_id === coachId)
    if (registration && registration.team) {
       // We need the coach's name. We updated the query to fetch it.
       // registration.team.users contains the coach's user data
       const coachUser = (registration.team as any).users
       if (coachUser) {
         coachesToPrint.set(coachId, {
           name: `${coachUser.first_name || ''} ${coachUser.last_name || ''}`.trim() || 'Coach',
           teamName: registration.team.name,
           id: coachId
         })
       }
    }
  } else if (teamId) {
    // If printing for a team, include the coach(es) of that team
    filteredParticipants.forEach(p => {
      if (p.coach_id && p.team) {
        const coachUser = (p.team as any).users
        if (coachUser) {
           coachesToPrint.set(p.coach_id, {
             name: `${coachUser.first_name || ''} ${coachUser.last_name || ''}`.trim() || 'Coach',
             teamName: p.team.name,
             id: p.coach_id
           })
        }
      }
    })
  }

  const totalCards = coachesToPrint.size + filteredParticipants.length

  // Helper to get division label for a participant
  const getParticipantDivision = (participant: any): string => {
    if (!participant.division_id || !participant.category_id) {
      return ''
    }

    const division = divisions.find(d => d.id === participant.division_id)
    if (!division) return ''

    const category = (division as any).tournament_categories?.find(
      (c: any) => c.id === participant.category_id
    )
    
    if (!category) return ''

    return getDivisionLabel(division, category)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col print:bg-white print:block">
      <div className="print:hidden">
        <SiteHeader />
      </div>
      
      <main className="flex-1 print:p-0">
        {/* Hero Section - Hidden on print */}
        <div className="bg-gradient-to-br from-primary/10 via-background to-background border-b print:hidden">
          <div className="container mx-auto max-w-7xl py-12 px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <Badge 
                    variant={tournament.status === 'ongoing' ? 'default' : 'secondary'}
                    className="text-sm px-3 py-1"
                  >
                    {tournament.status}
                  </Badge>
                  <IdCardIcon className="h-5 w-5 text-primary" />
                </div>
                <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                  Print ID Cards
                </h1>
                <p className="text-lg text-muted-foreground mb-4">
                  {tournament.name}
                  {teamName && <span className="ml-2">• {teamName}</span>}
                </p>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {tournament.start_date && (
                    <div className="flex items-center gap-2 bg-muted/50 px-3 py-2 rounded-md">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {formatShortDate(tournament.start_date)}
                        {tournament.end_date && tournament.end_date !== tournament.start_date && ` - ${formatShortDate(tournament.end_date)}`}
                      </span>
                    </div>
                  )}
                  {tournament.venue && (
                    <div className="flex items-center gap-2 bg-muted/50 px-3 py-2 rounded-md">
                      <MapPin className="h-4 w-4" />
                      <span>{tournament.venue}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 bg-muted/50 px-3 py-2 rounded-md">
                    <IdCardIcon className="h-4 w-4" />
                    <span>{totalCards} ID {totalCards === 1 ? 'card' : 'cards'}</span>
                  </div>
                </div>
              </div>
              <PrintButton />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto max-w-7xl py-8 px-4 sm:px-6 lg:px-8 print:p-0 print:max-w-none">
          <div className="print:hidden mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Printer className="h-5 w-5" />
                  Ready to Print
                </CardTitle>
                <CardDescription>
                  {coachesToPrint.size > 0 && `${coachesToPrint.size} coach ${coachesToPrint.size === 1 ? 'card' : 'cards'}`}
                  {coachesToPrint.size > 0 && filteredParticipants.length > 0 && ' and '}
                  {filteredParticipants.length > 0 && `${filteredParticipants.length} athlete ${filteredParticipants.length === 1 ? 'card' : 'cards'}`}
                  {' '}prepared for printing. Click the print button above to print all cards.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* ID Cards Grid - Visible on screen, formatted for print */}
          <div className="max-w-[210mm] mx-auto grid grid-cols-2 gap-4 print:block print:gap-0">
            {/* Coaches */}
            {Array.from(coachesToPrint.values()).map(coach => (
              <div key={coach.id} className="print:inline-block print:m-1 break-inside-avoid">
                <IDCard
                  name={coach.name}
                  role="Coach"
                  teamName={coach.teamName}
                  tournamentName={tournament.name}
                  uniqueId={`${coach.id.substring(0, 8)}-${tournament.id.substring(0, 4)}`}
                />
              </div>
            ))}

            {/* Athletes */}
            {filteredParticipants.map(p => (
              <div key={p.id} className="print:inline-block print:m-1 break-inside-avoid">
                <IDCard
                  name={`${p.player?.first_name} ${p.player?.last_name}`}
                  role="Athlete"
                  teamName={p.team?.name || 'Unattached'}
                  tournamentName={tournament.name}
                  division={getParticipantDivision(p)}
                  uniqueId={`${p.player_id.substring(0, 8)}-${tournament.id.substring(0, 4)}`}
                />
              </div>
            ))}
          </div>
        </div>
      </main>
      
      <PrintStyles />
    </div>
  )
}
