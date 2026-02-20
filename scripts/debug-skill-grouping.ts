import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function debugSkillGrouping() {
  const tournamentId = '9ce9202c-30c7-43b9-80b7-a425a8e53bb8'
  const divisionId = '9d9405a7-3de7-4fac-bd26-4821baab2d69'
  const categoryId = '2bae28c5-a974-40c3-9d08-4228dc5aa1b8'

  console.log('Fetching matches with player belt data...\n')

  const { data: matches, error } = await supabase
    .from('matches')
    .select(`
      id,
      lifecycle_state,
      player1_id,
      player2_id,
      player1:players!matches_player1_id_fkey(belt_level),
      player2:players!matches_player2_id_fkey(belt_level)
    `)
    .eq('tournament_id', tournamentId)
    .eq('division_id', divisionId)
    .eq('category_id', categoryId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log(`Found ${matches.length} matches\n`)

  // Group by detected skill level
  const skillGroups = new Map<string, any[]>()

  matches.forEach((match: any) => {
    let skill = 'Unknown'

    // Try player1 belt
    if (match.player1?.belt_level) {
      skill = getBeltSkillCategory(match.player1.belt_level)
    }
    // Try player2 belt
    else if (match.player2?.belt_level) {
      skill = getBeltSkillCategory(match.player2.belt_level)
    }

    if (!skillGroups.has(skill)) {
      skillGroups.set(skill, [])
    }
    skillGroups.get(skill)!.push(match)
  })

  console.log('Skill Level Grouping:')
  console.log('='.repeat(60))

  for (const [skill, skillMatches] of skillGroups.entries()) {
    const playerIds = new Set<string>()
    skillMatches.forEach(m => {
      if (m.player1_id) playerIds.add(m.player1_id)
      if (m.player2_id) playerIds.add(m.player2_id)
    })

    console.log(`\n${skill}:`)
    console.log(`  Matches: ${skillMatches.length}`)
    console.log(`  Unique Players: ${playerIds.size}`)
    console.log(`  Belt Levels: ${skillMatches.map((m: any) => m.player1?.belt_level || m.player2?.belt_level || 'null').filter((v, i, a) => a.indexOf(v) === i).join(', ')}`)
  }
}

function getBeltSkillCategory(belt: string | null): string {
  if (!belt) return 'Unknown'

  const beltLower = belt.toLowerCase()

  if (beltLower === 'white' || beltLower === 'yellow') {
    return 'Beginner'
  } else if (beltLower === 'blue' || beltLower === 'red') {
    return 'Novice'
  } else if (beltLower === 'brown') {
    return 'Advanced I'
  } else if (beltLower === 'black') {
    return 'Advanced II'
  }

  return 'Unknown'
}

debugSkillGrouping().then(() => {
  console.log('\n✓ Debug complete')
  process.exit(0)
}).catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
