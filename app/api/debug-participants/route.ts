import { getTournamentParticipants } from '@/lib/db/queries/registrations'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tournamentId = searchParams.get('id') || 'dbbe53a7-98b4-41a9-8940-36fd883acfdd'

  try {
    const result = await getTournamentParticipants(tournamentId, { limit: 10000 })

    return Response.json({
      tournamentId,
      dataLength: result.data.length,
      count: result.count,
      limit: result.limit,
      page: result.page,
      totalPages: result.totalPages,
      firstFew: result.data.slice(0, 3).map(p => ({
        id: p.id,
        status: p.status,
        player: p.player ? `${p.player.first_name} ${p.player.last_name}` : 'N/A'
      }))
    })
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
