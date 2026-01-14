
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

// Load env vars from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase Environment Variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// --- Constants & Helpers (Copied/Adapted from divisions.ts to avoid alias setup issues in simple script) ---

const DEFAULT_DIVISIONS = [
  {
    name: 'Toddler',
    minAge: 3,
    maxAge: 5,
    categories: [
      { name: 'Under 15kg', gender: 'male', maxWeight: 15 },
      { name: 'Under 15kg', gender: 'female', maxWeight: 15 },
      { name: 'Under 20kg', gender: 'male', maxWeight: 20 },
      { name: 'Under 20kg', gender: 'female', maxWeight: 20 },
      { name: 'Over 20kg', gender: 'male', minWeight: 20 },
      { name: 'Over 20kg', gender: 'female', minWeight: 20 },
    ],
  },
  {
    name: 'Gradeschool',
    minAge: 6,
    maxAge: 12,
    categories: [
      // Height-based for Grade School
      { name: 'Under 120cm', gender: 'male', maxHeight: 120 },
      { name: 'Under 120cm', gender: 'female', maxHeight: 120 },
      { name: 'Under 130cm', gender: 'male', maxHeight: 130 },
      { name: 'Under 130cm', gender: 'female', maxHeight: 130 },
      { name: 'Under 140cm', gender: 'male', maxHeight: 140 },
      { name: 'Under 140cm', gender: 'female', maxHeight: 140 },
      { name: 'Under 150cm', gender: 'male', maxHeight: 150 },
      { name: 'Under 150cm', gender: 'female', maxHeight: 150 },
      { name: 'Over 150cm', gender: 'male', minHeight: 150 },
      { name: 'Over 150cm', gender: 'female', minHeight: 150 },
    ],
  },
  {
    name: 'Junior',
    minAge: 13,
    maxAge: 17,
    categories: [
      { name: 'Fin weight (<45kg)', gender: 'male', maxWeight: 45 },
      { name: 'Fin weight (<42kg)', gender: 'female', maxWeight: 42 },
      { name: 'Fly weight (45-48kg)', gender: 'male', minWeight: 45, maxWeight: 48 },
      { name: 'Fly weight (42-44kg)', gender: 'female', minWeight: 42, maxWeight: 44 },
    ],
  },
  {
    name: 'Senior',
    minAge: 18,
    maxAge: 35,
    categories: [
      { name: 'Fin weight (<54kg)', gender: 'male', maxWeight: 54 },
      { name: 'Fin weight (<46kg)', gender: 'female', maxWeight: 46 },
      { name: 'Fly weight (54-58kg)', gender: 'male', minWeight: 54, maxWeight: 58 },
      { name: 'Fly weight (46-49kg)', gender: 'female', minWeight: 46, maxWeight: 49 },
    ],
  },
]

function findDivisionByAge(age: number, divisions: any[]) {
  // Try to find exact match
  let division = divisions.find(
    (d) => age >= d.minAge && age <= d.maxAge
  )

  // If no exact match (e.g. older than max age), map to Senior logic or closest
  if (!division) {
    if (age > 35) {
      // Find senior division
      division = divisions.find(d => d.name === 'Senior')
    } else if (age < 3) {
      division = divisions.find(d => d.name === 'Toddler')
    }
  }
  return division
}

function normalizeBeltLevel(belt: string): string {
  if (!belt) return 'White'
  const cleaned = belt.trim().toUpperCase().split(' ')[0]
  const normalized = cleaned.charAt(0) + cleaned.slice(1).toLowerCase()
  return normalized
}

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

async function main() {
  try {
    console.log('[IMPORT] Starting import process...')

    const args = process.argv.slice(2)
    // Default to 100 if not specified (or whatever code default was, user said "what is stated on the code" which was 300)
    // The code in route.ts had `const MAX_ROWS = 300`.
    const limitArg = args[0] ? parseInt(args[0]) : 300

    console.log(`[IMPORT] Limit: ${limitArg} rows`)

    const filePath = path.join(process.cwd(), 'temp_import.csv')
    if (!fs.existsSync(filePath)) {
      console.error('File not found:', filePath)
      process.exit(1)
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const lines = fileContent.split('\n').filter(l => l.trim().length > 0)

    console.log(`[IMPORT] Found ${lines.length} lines in CSV`)

    const dataRows = lines.slice(1, limitArg + 1).map(line => {
      const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
      return {
        name: cols[1] || '',
        gym: cols[2] || '',
        instructor: cols[3] || '',
        birthYear: cols[6] || '',
        division: cols[7] || '',
        gender: cols[8] || '',
        belt: cols[9] || '',
        category: cols[10] || '',
      }
    })

    console.log(`[IMPORT] Parsed ${dataRows.length} data rows to process`)

    // IMPORTANT CHECK:
    // The previous code attached to the "Latest" tournament.
    // The user requested: "create a tournament on our system".
    // "We don't need to create a new one since we already have this implemented... uses temp_import.csv"
    // The route.ts logic: "Get Target Tournament ... from tournaments order by created_at desc limit 1".
    // It attaches to the LATEST tournament.

    // However, I previously proposed creating a NEW one. 
    // To be safe and "command line to create a tournament", I will CREATE a new one.
    // This avoids messing up existing tournaments if the user runs this multiple times.

    // 1. Get/Create Organizer (using the first user found or a specific email if known)
    // We'll just grab the most recent created tournament's organizer to reuse, or allow creating one?
    // Let's reuse the logic from route.ts which fetched the latest tournament to get the organizer.

    const { data: latestTourney } = await supabase
      .from('tournaments')
      .select('organizer_id')
      .limit(1)
      .maybeSingle()

    let organizerId = latestTourney?.organizer_id

    if (!organizerId) {
      // Try to find a user
      const { data: user } = await supabase.from('users').select('id').limit(1).maybeSingle()
      organizerId = user?.id
    }

    if (!organizerId) {
      throw new Error('No organizer user found in database to attach tournament to.')
    }

    // Create NEW Query
    const tournamentName = `Simulated Tournament ${new Date().toISOString().split('T')[0]} (${dataRows.length} pax)`
    console.log(`[IMPORT] Creating new tournament: "${tournamentName}"...`)

    const { data: newTournament, error: createError } = await supabase
      .from('tournaments')
      .insert({
        name: tournamentName,
        organizer_id: organizerId,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 86400000).toISOString(), // +1 day
        status: 'upcoming',
        location: 'Simulated Venue',
        registration_fee: 0,
        currency: 'PHP'
      })
      .select()
      .single()

    if (createError || !newTournament) {
      throw new Error(`Failed to create tournament: ${createError?.message}`)
    }

    const tournamentId = newTournament.id
    console.log(`[IMPORT] Created Tournament ID: ${tournamentId}`)

    // --- PROCESSING LOGIC (Copied from route.ts) ---

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
      if (i % 50 === 0) console.log(`[IMPORT] Processing row ${i + 1}/${dataRows.length}`)

      if (!row.name || !row.gym) {
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

        if (age !== null) {
          const correctDivision = findDivisionByAge(age, DEFAULT_DIVISIONS)

          if (correctDivision) {
            targetDivisionName = correctDivision.name

            if (correctDivision.name !== 'Gradeschool') {
              const gender = (row.gender || 'male').toLowerCase()
              const validCategories = correctDivision.categories.filter((c: any) => c.gender === gender)

              if (validCategories.length > 0) {
                const randomCat = validCategories[Math.floor(Math.random() * validCategories.length)]
                targetCategoryName = randomCat.name
                let minW = randomCat.minWeight || 0
                let maxW = randomCat.maxWeight || 100
                if (randomCat.minWeight === null) minW = 30
                if (randomCat.maxWeight === null) maxW = (randomCat.minWeight || 80) + 20
                const randomWeight = Math.floor((Math.random() * (maxW - minW) + minW) * 10) / 10
                assignedWeight = randomWeight
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
            if (newTeam) {
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
            if (targetDivisionName === "Cadet") {
              minAge = 13; maxAge = 15
            } else {
              const years = targetDivisionName.match(/\d{4}/g)
              if (years && years.length >= 2) {
                const y1 = parseInt(years[0])
                const y2 = parseInt(years[1])
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
                enabled: true
              })
              .select()
              .single()
            if (newDiv) {
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
            let maxW: number | null = null
            const weightMatches = targetCategoryName.match(/Under (\d+)kg/)
            if (weightMatches) maxW = parseFloat(weightMatches[1])

            const { data: newCat, error: catErr } = await supabase
              .from('tournament_categories')
              .insert({
                name: targetCategoryName,
                division_id: divisionId,
                gender: (row.gender || 'male').toLowerCase() as any,
                max_weight: maxW
              })
              .select()
              .single()
            if (newCat) {
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
        const dob = row.birthYear ? `${row.birthYear}-01-01` : null

        let playerId = playerMap.get(row.name)
        if (!playerId) {
          const { data: newPlayer, error: pErr } = await supabase
            .from('players')
            .insert({
              first_name: firstName,
              last_name: lastName,
              coach_id: organizerId,
              gender: (row.gender || 'male').toLowerCase() as any,
              belt_level: normalizeBeltLevel(row.belt) as any,
              weight: assignedWeight,
              height: assignedHeight,
              dob: dob
            })
            .select()
            .single()

          if (newPlayer) {
            playerId = newPlayer.id
            results.playersCreated++
            playerMap.set(row.name, playerId)

            if (teamId) {
              await supabase.from('team_players').insert({ team_id: teamId, player_id: playerId })
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
          }
        }
      } catch (rowError: any) {
        console.error(`Row ${i} error:`, rowError.message)
        results.errors.push(rowError.message)
      }
    }

    console.log('\n[IMPORT] Completed!')
    console.log('Results:', results)
    console.log(`\nNew Tournament ID: ${tournamentId}`)

  } catch (err) {
    console.error('Script failed:', err)
    process.exit(1)
  }
}

main()
