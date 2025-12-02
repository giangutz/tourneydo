
import { getTournamentById } from '@/lib/db/queries/tournaments'
import { getTournamentParticipants } from '@/lib/db/queries/registrations'
import { IDCard } from '@/components/tournaments/id-card'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'
import { PrintButton } from '@/components/tournaments/print-button'
import { PrintStyles } from '@/components/tournaments/print-styles'

interface PrintIDsPageProps {
  params: Promise<{
    id: string
  }>
  searchParams: Promise<{
    teamId?: string
    coachId?: string
  }>
}

export default async function PrintIDsPage({ params, searchParams }: PrintIDsPageProps) {
  const { id } = await params
  const { teamId, coachId } = await searchParams
  
  const tournament = await getTournamentById(id)
  if (!tournament) notFound()

  const participants = await getTournamentParticipants(id)

  // Filter participants
  let filteredParticipants = participants
  if (teamId) {
    filteredParticipants = participants.filter(p => p.team_id === teamId)
  }

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

  return (
    <div className="min-h-screen bg-white p-8 print:p-0">
      <div className="mb-8 print:hidden flex justify-between items-center max-w-[210mm] mx-auto">
        <h1 className="text-2xl font-bold">Print ID Cards</h1>
        <PrintButton />
      </div>

      <div className="max-w-[210mm] mx-auto grid grid-cols-2 gap-4 print:block print:gap-0">
        {/* Coaches */}
        {Array.from(coachesToPrint.values()).map(coach => (
          <div key={coach.id} className="print:inline-block print:m-1 break-inside-avoid">
            <IDCard
              name={coach.name}
              role="Coach"
              teamName={coach.teamName}
              tournamentName={tournament.name}
              date={tournament.start_date || undefined}
              uniqueId={`${coach.id.substring(0, 8)}-${tournament.id.substring(0, 4)}`}
            />
          </div>
        ))}

        {/* Athletes */}
        {(!coachId) && filteredParticipants.map(p => (
          <div key={p.id} className="print:inline-block print:m-1 break-inside-avoid">
            <IDCard
              name={`${p.player?.first_name} ${p.player?.last_name}`}
              role="Athlete"
              teamName={p.team?.name || 'Unattached'}
              tournamentName={tournament.name}
              division={p.division_id ? 'Assigned' : 'Pending'} // Ideally fetch division name
              category={p.player?.weight ? `${p.player.weight}kg` : undefined}
              date={tournament.start_date || undefined}
              uniqueId={`${p.player_id.substring(0, 8)}-${tournament.id.substring(0, 4)}`}
            />
          </div>
        ))}
      </div>
      
      <PrintStyles />
    </div>
  )
}
