
import { notFound } from 'next/navigation'
import { getRegistrationById } from '@/lib/db/queries/registrations'
import { getTournamentById } from '@/lib/db/queries/tournaments'
import { getDivisionCategoryDetails } from '@/lib/db/queries/divisions'
import { WeighInForm } from '@/components/tournaments/weigh-in/weigh-in-form'

export default async function WeighInParticipantPage({
  params
}: {
  params: Promise<{ id: string; registrationId: string }>
}) {
  try {
    const { id, registrationId } = await params
    const registration = await getRegistrationById(registrationId)
    
    if (!registration) {
      notFound()
    }

    const tournament = await getTournamentById(id)
    if (!tournament) {
      notFound()
    }

    // Get the connected tournament_divisions and tournament_categories for displaying limits
    // Since getRegistrationById doesn't join distinct division/category objects deeply enough for limits (or does it?)
    // Actually getRegistrationById only joins player and team.
    // We need limits.
    
    let categoryLimits = undefined
    let divisionName = undefined
    let categoryName = undefined

    if (registration.division_id && registration.category_id) {
      const details = await getDivisionCategoryDetails(registration.division_id, registration.category_id)
      
      if (details) {
         divisionName = details.division.name
         categoryName = details.category.name
         categoryLimits = {
            minWeight: details.category.min_weight,
            maxWeight: details.category.max_weight,
            minHeight: details.category.min_height,
            maxHeight: details.category.max_height
         }
      }
    }

    // Adapt registration object to what WeighInForm expects (Participant interface)
    // The Participant interface in WeighInForm expects `tournament_categories` and `tournament_divisions` as arrays or objects 
    // to extract names if we didn't pass them explicitly.
    // But we are passing divisionName and categoryName explicitly.
    
    // However, the component tries to extract from participant.tournament_categories if props are missing.
    // We can just pass the props.

    return (
      <div className="container max-w-[1600px] py-6">
        <WeighInForm 
          participant={registration as any}
          tournamentId={id}
          tournamentType={tournament.tournament_type}
          divisionName={divisionName}
          categoryName={categoryName}
          categoryLimits={categoryLimits}
        />
      </div>
    )
  } catch (error) {
    console.error('Error loading weigh-in page:', error)
    return <div>Error loading participant data: {(error as Error).message} <br/>Stack: {(error as Error).stack}</div>
  }
}
