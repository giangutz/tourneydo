
import { notFound } from 'next/navigation'
import { getRegistrationById } from '@/lib/db/queries/registrations'
import { getTournamentById } from '@/lib/db/queries/tournaments'
import { getDivisionCategoryDetails } from '@/lib/db/queries/divisions'
import { RandomWeighInForm } from '@/components/tournaments/weigh-in/random-weigh-in-form'

export default async function RandomWeighInParticipantPage({
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

    let divisionName: string | undefined
    let categoryName: string | undefined
    let categoryMaxWeight: number | null = null

    if (registration.division_id && registration.category_id) {
      const details = await getDivisionCategoryDetails(registration.division_id, registration.category_id)

      if (details) {
        divisionName = details.division.name
        categoryName = details.category.name
        // Pass the raw max weight — RandomWeighInForm applies the 5% tolerance itself
        categoryMaxWeight = details.category.max_weight ?? null
      }
    }

    return (
      <div className="container max-w-[1600px] py-6">
        <RandomWeighInForm
          participant={registration as any}
          tournamentId={id}
          divisionName={divisionName}
          categoryName={categoryName}
          categoryMaxWeight={categoryMaxWeight}
        />
      </div>
    )
  } catch (error) {
    console.error('Error loading random weigh-in page:', error)
    return <div>Error loading participant data: {(error as Error).message}</div>
  }
}
