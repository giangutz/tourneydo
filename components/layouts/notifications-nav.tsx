import { auth } from '@clerk/nextjs/server'
import { getRecentRegistrationsByOrganizerId, getRecentRegistrationsByCoachId } from '@/lib/db/queries/registrations'
import { getRecentPaymentsByOrganizer, getRecentPaymentsByCoachId } from '@/lib/db/queries/payments'
import { NotificationsPopover } from './notifications-popover'

export async function NotificationsNav() {
  const { userId } = await auth()

  if (!userId) return null

  let activities: any[] = []
  
  try {
     const [
       registrations, 
       payments,
       coachRegistrations,
       coachPayments
     ] = await Promise.all([
       getRecentRegistrationsByOrganizerId(userId, 10),
       getRecentPaymentsByOrganizer(userId, 10),
       getRecentRegistrationsByCoachId(userId, 10),
       getRecentPaymentsByCoachId(userId, 10)
     ])

     // Map registrations (Organizer View) - Consolidated
     const groupedRegs: Record<string, any> = {}
     
     ;(registrations || []).forEach(r => {
        // Group by Team ID + Tournament ID
        // If no team (individual), fallback to unique ID to keep separate
        const key = r.teams?.id 
           ? `${r.tournaments?.id}-${r.teams?.id}` 
           : `single-${r.id}`
           
        if (!groupedRegs[key]) {
           groupedRegs[key] = {
              ...r,
              count: 0,
              // Keep the original created_at of the MOST RECENT one in the group
              // (which is already the case since we iterate the sorted list first, or we check date)
              latest_created_at: r.created_at 
           }
        }
        groupedRegs[key].count++
     })

     const regActivities = Object.values(groupedRegs).map(r => {
        const isBulk = r.count > 1
        // If bulk, show "Team Name (5 players)"
        // If single, show "Player Name"
        const displayName = isBulk 
           ? `${r.teams?.name} (${r.count} players)` 
           : `${r.players?.first_name} ${r.players?.last_name}`

        return {
           id: `org-reg-${r.id}`, // Prefix to prevent key collision with coach view
           type: 'registration',
           created_at: r.latest_created_at || r.created_at,
           status: r.status,
           player_name: displayName,
           tournament_name: r.tournaments?.name,
           tournament_id: r.tournaments?.id,
           data: r
        }
     })

     // Map payments (Organizer View) - New monies
      const payActivities = (payments || []).map((p: any) => ({
       id: `org-pay-${p.id}`,
       type: 'payment',
       created_at: p.created_at,
       status: p.status,
       player_name: p.teams?.name || 'Unknown Team',
       tournament_name: p.tournaments?.name,
       tournament_id: p.tournaments?.id,
       data: p
     }))

     // Map coach registrations (Coach View) - Consolidated by Tournament
     const groupedCoachRegs: Record<string, any> = {}
     ;(coachRegistrations || []).forEach(r => {
        const key = r.tournaments?.id
        if (!key) return

        if (!groupedCoachRegs[key]) {
           groupedCoachRegs[key] = {
              ...r,
              count: 0,
              latest_created_at: r.created_at
           }
        }
        groupedCoachRegs[key].count++
     })

     const coachRegActivities = Object.values(groupedCoachRegs).map(r => {
       const isBulk = r.count > 1
       const displayName = isBulk 
           ? `${r.count} Athletes`
           : `${r.players?.first_name} ${r.players?.last_name}`

       return {
         id: `coach-reg-${r.id}`, // Use representative ID
         type: 'coach-registration',
         created_at: r.latest_created_at || r.created_at,
         status: r.status,
         player_name: displayName,
         tournament_name: r.tournaments?.name,
         tournament_id: r.tournaments?.id,
         data: r
       }
     })

     // Map coach payments (Coach View) - Consolidated by Tournament & Status
     const groupedCoachPays: Record<string, any> = {}
     ;(coachPayments || []).forEach((p: any) => {
        const key = `${p.tournaments?.id}-${p.status}`
        if (!p.tournaments?.id) return

        if (!groupedCoachPays[key]) {
           groupedCoachPays[key] = {
              ...p,
              count: 0,
              latest_created_at: p.updated_at || p.created_at
           }
        }
        groupedCoachPays[key].count++
     })

     const coachPayActivities = Object.values(groupedCoachPays).map(p => {
       const isBulk = p.count > 1
       const displayName = isBulk 
           ? `${p.count} Teams` // Payments are usually per team, or we could say "Payments"
           : p.teams?.name || 'Your Team'

       return {
         id: `coach-pay-${p.id}`,
         type: 'coach-payment',
         created_at: p.latest_created_at || p.created_at, 
         status: p.status,
         player_name: displayName,
         tournament_name: p.tournaments?.name,
         tournament_id: p.tournaments?.id,
         data: p
       }
     })

     // Merge and sort
     activities = [
        ...regActivities, 
        ...payActivities, 
        ...coachRegActivities, 
        ...coachPayActivities
     ]
       .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
       .slice(0, 20) // Increased limit since we have more sources

  } catch (err) {
     activities = []
  }

  return <NotificationsPopover initialActivities={activities} />
}
