
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

    let categoryLimits = undefined
    let divisionName = undefined
    let categoryName = undefined

    // Ensure division and category data is included
    let enrichedRegistration = { ...registration }

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
    }    return (
      <div className="container max-w-[1600px] py-6">
        <WeighInForm 
          participant={enrichedRegistration as any}
          tournamentId={id}
          tournamentType={tournament.tournament_type}
          divisionName={divisionName}
          categoryName={categoryName}
          categoryLimits={categoryLimits}
          title="Official Weigh-In"
        />
      </div>
    )
  } catch (error) {
    return <div>Error loading participant data: {(error as Error).message} <br/>Stack: {(error as Error).stack}</div>
  }
}
