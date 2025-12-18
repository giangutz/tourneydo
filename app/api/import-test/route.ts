
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import { DEFAULT_DIVISIONS, findDivisionByAge } from '@/lib/constants/divisions'

// Initialize Supabase Admin Client (Service Role) to bypass RLS for import
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase Environment Variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Helper to normalize belt levels from CSV format to database format
function normalizeBeltLevel(belt: string): string {
  const cleaned = belt.trim().toUpperCase().split(' ')[0]
  // Map to proper case: WHITE, YELLOW, BLUE, RED, BROWN, BLACK -> White, Yellow, etc.
  const normalized = cleaned.charAt(0) + cleaned.slice(1).toLowerCase()
  return normalized
}

// Helper to extract weight or height from category string
// Examples: "Under 55kg" -> { weight: 55 }, "Under 156cm" -> { height: 156 }
function extractPlayerMeasurement(category: string): { weight: number | null, height: number | null } {
  const kgMatch = category.match(/Under (\d+)kg/)
  const cmMatch = category.match(/Under (\d+)cm/)

  if (kgMatch) {
    return { weight: parseFloat(kgMatch[1]), height: null }
  } else if (cmMatch) {
    return { weight: null, height: parseFloat(cmMatch[1]) }
  }

  return { weight: null, height: null }
}

export async function GET() {
  try {
    console.log('[IMPORT] Starting import process...')

    const filePath = path.join(process.cwd(), 'temp_import.csv')
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const lines = fileContent.split('\n').filter(l => l.trim().length > 0)

    console.log(`[IMPORT] Found ${lines.length} lines in CSV`)

    // Parse only first 50 data rows for testing
    const MAX_ROWS = 300
    const dataRows = lines.slice(1, MAX_ROWS + 1).map(line => {
      const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
      return {
        name: cols[1] || '',
        gym: cols[2] || '',
        instructor: cols[3] || '',
        birthYear: cols[6] || '', // BIRTH YEAR column
        division: cols[7] || '',
        gender: cols[8] || '',
        belt: cols[9] || '',
        category: cols[10] || '',
      }
    })

    console.log(`[IMPORT] Parsed ${dataRows.length} data rows`)

    // 1. Get Target Tournament
    const { data: tournament, error: tError } = await supabase
      .from('tournaments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (tError || !tournament) {
      console.error('[IMPORT] Tournament fetch error:', tError)
      throw new Error('No tournament found')
    }

    console.log(`[IMPORT] Target tournament: ${tournament.name} (${tournament.id})`)

    const organizerId = tournament.organizer_id
    const tournamentId = tournament.id

    const results = {
      teamsCreated: 0,
      playersCreated: 0,
      divisionsCreated: 0,
      categoriesCreated: 0,
      registrationsCreated: 0,
      errors: [] as string[]
    }

    const divisionMap = new Map<string, string>()
    const categoryMap = new Map<string, string>()
    const teamMap = new Map<string, string>()
    const playerMap = new Map<string, string>()

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i]

      if (i % 10 === 0) {
        console.log(`[IMPORT] Processing row ${i + 1}/${dataRows.length}`)
      }

      if (!row.name || !row.gym) {
        results.errors.push(`Row ${i + 1}: Missing name or gym`)
        continue
      }

      try {
        // --- AGE & DIVISION LOGIC ---
        const CURRENT_YEAR = 2025
        const birthYear = parseInt(row.birthYear)
        const age = !isNaN(birthYear) ? CURRENT_YEAR - birthYear : null

        let targetDivisionName = row.division
        let targetCategoryName = row.category
        let assignedWeight = extractPlayerMeasurement(row.category).weight
        let assignedHeight = extractPlayerMeasurement(row.category).height

        // Determine correct division based on Age and DEFAULT_DIVISIONS
        if (age !== null) {
          const correctDivision = findDivisionByAge(age, DEFAULT_DIVISIONS)

          if (correctDivision) {
            targetDivisionName = correctDivision.name

            // If the division changed (e.g. Gradeschool -> Cadet) OR if we want to ensure valid weights
            // We should assign a valid category from the new division
            // Especially if moving from Height-based (Gradeschool) to Weight-based (Cadet+)
            if (correctDivision.name !== 'Gradeschool') {
              const gender = row.gender.toLowerCase() as 'male' | 'female'
              const validCategories = correctDivision.categories.filter(c => c.gender === gender)

              if (validCategories.length > 0) {
                // Pick a random category
                const randomCat = validCategories[Math.floor(Math.random() * validCategories.length)]
                targetCategoryName = randomCat.name

                // Generate random weight within category limits
                // Handle open-ended weights (null min or max)
                let minW = randomCat.minWeight || 0
                let maxW = randomCat.maxWeight || 100 // Reasonable max cap if null

                // If null min, set reasonable floor (e.g. 30kg)
                if (randomCat.minWeight === null) minW = 30
                // If null max, set reasonable cap (e.g. min + 20)
                if (randomCat.maxWeight === null) maxW = (randomCat.minWeight || 80) + 20

                // Generate random weight with 1 decimal
                const randomWeight = Math.floor((Math.random() * (maxW - minW) + minW) * 10) / 10

                assignedWeight = randomWeight
                // Clear height if we moved to weight-based
                assignedHeight = null
              }
            }
          }
        }

        // --- TEAM ---
        let teamId = teamMap.get(row.gym)
        if (!teamId) {
          const { data: existingTeam } = await supabase
            .from('teams')
            .select('id')
            .eq('name', row.gym)
            .eq('user_id', organizerId)
            .maybeSingle()

          if (existingTeam) {
            teamId = existingTeam.id
          } else {
            const { data: newTeam, error: teamErr } = await supabase
              .from('teams')
              .insert({ name: row.gym, user_id: organizerId })
              .select()
              .single()
            if (teamErr) {
              results.errors.push(`Team creation error: ${teamErr.message}`)
            } else if (newTeam) {
              teamId = newTeam.id
              results.teamsCreated++
            }
          }
          if (teamId) teamMap.set(row.gym, teamId)
        }

        // --- DIVISION ---
        let divisionId = divisionMap.get(targetDivisionName)
        if (!divisionId) {
          const { data: existingDiv } = await supabase
            .from('tournament_divisions')
            .select('id')
            .eq('name', targetDivisionName)
            .eq('tournament_id', tournamentId)
            .maybeSingle()

          if (existingDiv) {
            divisionId = existingDiv.id
          } else {
            let minAge = 0
            let maxAge = 99

            // If it's the specific "Cadet" division we created
            if (targetDivisionName === "Cadet") {
              minAge = 13
              maxAge = 15
            } else {
              // Fallback to parsing years from string
              const years = targetDivisionName.match(/\d{4}/g)
              if (years && years.length >= 2) {
                const y1 = parseInt(years[0])
                const y2 = parseInt(years[1])
                // Update logic to use CURRENT_YEAR for age calculation if we are parsing
                const age1 = CURRENT_YEAR - Math.min(y1, y2)
                const age2 = CURRENT_YEAR - Math.max(y1, y2)
                minAge = age2
                maxAge = age1
              }
            }

            const { data: newDiv, error: divErr } = await supabase
              .from('tournament_divisions')
              .insert({
                name: targetDivisionName,
                tournament_id: tournamentId,
                min_age: minAge,
                max_age: maxAge,
              })
              .select()
              .single()
            if (divErr) {
              results.errors.push(`Division creation error: ${divErr.message}`)
            } else if (newDiv) {
              divisionId = newDiv.id
              results.divisionsCreated++
            }
          }
          if (divisionId) divisionMap.set(targetDivisionName, divisionId)
        }

        // --- CATEGORY ---
        let categoryId = categoryMap.get(targetCategoryName)
        if (divisionId && !categoryId) {
          const { data: existingCat } = await supabase
            .from('tournament_categories')
            .select('id')
            .eq('name', targetCategoryName)
            .eq('division_id', divisionId)
            .maybeSingle()

          if (existingCat) {
            categoryId = existingCat.id
          } else {
            let minW: number | null = null
            let maxW: number | null = null

            const weightMatches = targetCategoryName.match(/Under (\d+)kg/)
            if (weightMatches) maxW = parseFloat(weightMatches[1])

            const { data: newCat, error: catErr } = await supabase
              .from('tournament_categories')
              .insert({
                name: targetCategoryName,
                division_id: divisionId,
                gender: row.gender.toLowerCase() as any,
                min_weight: minW,
                max_weight: maxW
              })
              .select()
              .single()

            if (catErr) {
              results.errors.push(`Category creation error: ${catErr.message}`)
            } else if (newCat) {
              categoryId = newCat.id
              results.categoriesCreated++
            }
          }
          if (categoryId) categoryMap.set(targetCategoryName, categoryId)
        }

        // --- PLAYER ---
        const nameParts = row.name.split(' ')
        const firstName = nameParts[0]
        const lastName = nameParts.slice(1).join(' ') || 'Unknown'

        // Construct DOB from birth year (YYYY-01-01)
        const dob = row.birthYear ? `${row.birthYear}-01-01` : null

        // Ensure gender is lowercase to match DB constraint
        const gender = row.gender ? row.gender.toLowerCase() : null

        let playerId = playerMap.get(row.name)

        if (!playerId) {
          const { data: newPlayer, error: pErr } = await supabase
            .from('players')
            .insert({
              first_name: firstName,
              last_name: lastName,
              coach_id: organizerId,
              gender: gender as any,
              belt_level: normalizeBeltLevel(row.belt) as any,
              weight: assignedWeight,
              height: assignedHeight,
              dob: dob
            })
            .select()
            .single()

          if (pErr) {
            results.errors.push(`Player creation error: ${pErr.message}`)
          } else if (newPlayer) {
            playerId = newPlayer.id
            results.playersCreated++
            if (playerId) {
              playerMap.set(row.name, playerId)
            }

            if (teamId && playerId) {
              await supabase.from('team_players').insert({
                team_id: teamId,
                player_id: playerId
              })
            }
          }
        }

        // --- REGISTRATION ---
        if (playerId && teamId && divisionId && categoryId) {
          const { error: regErr } = await supabase
            .from('tournament_registrations')
            .insert({
              tournament_id: tournamentId,
              player_id: playerId,
              team_id: teamId,
              coach_id: organizerId,
              division_id: divisionId,
              category_id: categoryId,
              status: 'verified',
              disqualified: false,
              weigh_in_selected: false
            })
          if (!regErr) {
            results.registrationsCreated++
          } else {
            results.errors.push(`Registration error: ${regErr.message}`)
          }
        }
      } catch (rowError: any) {
        results.errors.push(`Row ${i + 1} error: ${rowError.message}`)
      }
    }

    console.log('[IMPORT] Import completed successfully')
    console.log('[IMPORT] Results:', results)

    return NextResponse.json({
      success: true,
      tournament: tournament.name,
      results
    })

  } catch (error: any) {
    console.error('[IMPORT] Fatal error:', error)
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 })
  }
}
