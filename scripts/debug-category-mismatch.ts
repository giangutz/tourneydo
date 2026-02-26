
import 'dotenv/config'
import { createServiceSupabaseClient } from '../lib/supabase/service'

async function debugCategory() {
  const supabase = createServiceSupabaseClient()
  console.log('Searching for matches...')

  // 1. Find the specific category/division
  // "Gradeschool Girls Advanced II Group 0"
  // Division: Gradeschool
  // Category: Girls Advanced II Group 0 ?? No, Category name is likely "Group 0" with "Girls" gender?
  // User said: "Gradeschool Girls Advanced II Group 0"

  // Let's search matches with this division/category combo
  const { data: matches, error } = await supabase
    .from('matches')
    .select(`
      id,
      round,
      match_number,
      lifecycle_state,
      player1_id,
      player2_id,
      tournament_divisions!inner(name),
      tournament_categories!inner(name, gender)
    `)
    .eq('tournament_divisions.name', 'Gradeschool')
    .ilike('tournament_categories.name', '%Group 0%')

  if (error) {
    console.error('Error fetching matches:', error)
    return
  }

  // Filter for Girls and Advanced II manually since we need to check belt/skill
  // Actually, the category name might capture it given the breakdown logic results.

  console.log(`Found ${matches?.length} total matches in Gradeschool Group 0`)

  const targetMatches = matches?.filter((m: any) => {
    // We want the specific row from the breakdown
    // Breakdown logic: Division + Gender + Skill + Category
    return true // Just dump them all for now to see
  })

  // Group by exact category name logic
  // "Gradeschool Girls Advanced II Group 0"

  targetMatches?.forEach((m: any) => {
    console.log('--- Match ---')
    console.log(`ID: ${m.id}`)
    console.log(`Round: ${m.round}`)
    console.log(`State: ${m.lifecycle_state}`)
    console.log(`P1: ${m.player1_id}`)
    console.log(`P2: ${m.player2_id}`)
    console.log(`Div: ${m.tournament_divisions?.name}`)
    console.log(`Cat: ${m.tournament_categories?.name}`)
    console.log(`Gender: ${m.tournament_categories?.gender}`)
  })

}

debugCategory()
