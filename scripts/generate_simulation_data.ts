
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load env vars from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase Environment Variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// --- Constants & Data Generators ---

const COACH_ID = 'user_365ZoLkL7wL58gy1hDEbCqYXH5v' // ggutierrez.arbcentrix@gmail.com

// Team Name Components
const TEAM_PREFIXES = ['Iron', 'Golden', 'Silver', 'Red', 'Blue', 'Black', 'White', 'Shadow', 'Light', 'Thunder', 'Storm', 'Royal', 'Elite', 'Master', 'Grand', 'United', 'Global', 'National', 'City', 'Metro']
const TEAM_NOUNS = ['Dragon', 'Tiger', 'Eagle', 'Lion', 'Phoenix', 'Wolf', 'Bear', 'Shark', 'Falcon', 'Hawk', 'Warrior', 'Fighter', 'Champion', 'Legend', 'Samurai', 'Ninja', 'Knight', 'Guardian', 'Spirit', 'Force']
const TEAM_SUFFIXES = ['Dojo', 'Gym', 'Academy', 'Club', 'Team', 'School', 'Center', 'Institute', 'Association', 'Alliance']
const EXCLUDED_NAMES = ['Cobra Kai', 'Generals']

function generateTeamName(existingNames: Set<string>): string {
  let name = ''
  let attempts = 0
  do {
    const p = TEAM_PREFIXES[Math.floor(Math.random() * TEAM_PREFIXES.length)]
    const n = TEAM_NOUNS[Math.floor(Math.random() * TEAM_NOUNS.length)]
    const s = TEAM_SUFFIXES[Math.floor(Math.random() * TEAM_SUFFIXES.length)]

    // Mix formats: "Iron Dragon Dojo", "Golden Tigers", "Elite Academy"
    const rand = Math.random()
    if (rand < 0.4) name = `${p} ${n} ${s}`
    else if (rand < 0.7) name = `${p} ${n}s` // Plural
    else if (rand < 0.9) name = `${n} ${s}`
    else name = `${p} ${s}`

    attempts++
  } while ((existingNames.has(name) || EXCLUDED_NAMES.some(ex => name.includes(ex))) && attempts < 100)

  // Fallback if super unlucky
  if (existingNames.has(name)) name = `${name} ${Math.floor(Math.random() * 1000)}`

  return name
}

// Player Name Components
const FIRST_NAMES = ['James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Charles', 'Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen', 'Liam', 'Noah', 'Oliver', 'Elijah', 'Lucas', 'Mason', 'Ethan', 'Logan', 'Aiden', 'Jackson', 'Olivia', 'Emma', 'Ava', 'Sophia', 'Isabella', 'Mia', 'Amelia', 'Harper', 'Evelyn', 'Abigail', 'Mateo', 'Miguel', 'Santiago', 'Juan', 'Luis', 'Carlos', 'Jose', 'Pedro', 'Rafael', 'Gabriel', 'Sofia', 'Maria', 'Valentina', 'Camila', 'Lucia', 'Elena', 'Victoria', 'Martina', 'Daniela', 'Valeria']
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts']

function generatePlayerName(): { firstName: string, lastName: string } {
  return {
    firstName: FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)],
    lastName: LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]
  }
}

// Divisions Structure (Simplified Copy from lib/constants/divisions.ts)
const DIVISIONS = [
  {
    name: 'Gradeschool',
    minAge: null,
    maxAge: 11,
    categories: [
      { name: 'Group 0', gender: 'male', minHeight: 112.00, maxHeight: 119.99 },
      { name: 'Group 1', gender: 'male', minHeight: 120.00, maxHeight: 127.99 },
      { name: 'Group 2', gender: 'male', minHeight: 128.00, maxHeight: 135.99 },
      { name: 'Group 3', gender: 'male', minHeight: 136.00, maxHeight: 143.99 },
      { name: 'Group 4', gender: 'male', minHeight: 144.00, maxHeight: 151.99 },
      { name: 'Group 5', gender: 'male', minHeight: 152.00, maxHeight: 159.99 },
      { name: 'Group 6', gender: 'male', minHeight: 160.00, maxHeight: 168.00 },
      { name: 'Group 0', gender: 'female', minHeight: 112.00, maxHeight: 119.99 },
      { name: 'Group 1', gender: 'female', minHeight: 120.00, maxHeight: 127.99 },
      { name: 'Group 2', gender: 'female', minHeight: 128.00, maxHeight: 135.99 },
      { name: 'Group 3', gender: 'female', minHeight: 136.00, maxHeight: 143.99 },
      { name: 'Group 4', gender: 'female', minHeight: 144.00, maxHeight: 151.99 },
      { name: 'Group 5', gender: 'female', minHeight: 152.00, maxHeight: 159.99 },
      { name: 'Group 6', gender: 'female', minHeight: 160.00, maxHeight: 168.00 },
    ],
  },
  {
    name: 'Cadet',
    minAge: 12,
    maxAge: 14,
    categories: [
      { name: 'Fin', gender: 'male', minWeight: null, maxWeight: 33.00 },
      { name: 'Fly', gender: 'male', minWeight: 33.01, maxWeight: 37.00 },
      { name: 'Bantam', gender: 'male', minWeight: 37.01, maxWeight: 41.00 },
      { name: 'Feather', gender: 'male', minWeight: 41.01, maxWeight: 45.00 },
      { name: 'Light', gender: 'male', minWeight: 45.01, maxWeight: 49.00 },
      { name: 'Welter', gender: 'male', minWeight: 49.01, maxWeight: 53.00 },
      { name: 'Lt. Middle', gender: 'male', minWeight: 53.01, maxWeight: 57.00 },
      { name: 'Middle', gender: 'male', minWeight: 57.01, maxWeight: 61.00 },
      { name: 'Lt. Heavy', gender: 'male', minWeight: 61.01, maxWeight: 65.00 },
      { name: 'Heavy', gender: 'male', minWeight: 65.01, maxWeight: null },
      { name: 'Fin', gender: 'female', minWeight: null, maxWeight: 29.00 },
      { name: 'Fly', gender: 'female', minWeight: 29.01, maxWeight: 33.00 },
      { name: 'Bantam', gender: 'female', minWeight: 33.01, maxWeight: 37.00 },
      { name: 'Feather', gender: 'female', minWeight: 37.01, maxWeight: 41.00 },
      { name: 'Light', gender: 'female', minWeight: 41.01, maxWeight: 44.00 },
      { name: 'Welter', gender: 'female', minWeight: 44.01, maxWeight: 47.00 },
      { name: 'Lt. Middle', gender: 'female', minWeight: 47.01, maxWeight: 51.00 },
      { name: 'Middle', gender: 'female', minWeight: 51.01, maxWeight: 55.00 },
      { name: 'Lt. Heavy', gender: 'female', minWeight: 55.01, maxWeight: 59.00 },
      { name: 'Heavy', gender: 'female', minWeight: 59.01, maxWeight: null },
    ],
  },
  {
    name: 'Junior',
    minAge: 15,
    maxAge: 17,
    categories: [
      { name: 'Fin', gender: 'male', minWeight: null, maxWeight: 45.00 },
      { name: 'Fly', gender: 'male', minWeight: 45.01, maxWeight: 48.00 },
      { name: 'Bantam', gender: 'male', minWeight: 48.01, maxWeight: 51.00 },
      { name: 'Feather', gender: 'male', minWeight: 51.01, maxWeight: 55.00 },
      { name: 'Light', gender: 'male', minWeight: 55.01, maxWeight: 59.00 },
      { name: 'Welter', gender: 'male', minWeight: 59.01, maxWeight: 63.00 },
      { name: 'Lt. Middle', gender: 'male', minWeight: 63.01, maxWeight: 68.00 },
      { name: 'Middle', gender: 'male', minWeight: 68.01, maxWeight: 73.00 },
      { name: 'Lt. Heavy', gender: 'male', minWeight: 73.01, maxWeight: 78.00 },
      { name: 'Heavy', gender: 'male', minWeight: 78.01, maxWeight: null },
      { name: 'Fin', gender: 'female', minWeight: null, maxWeight: 42.00 },
      { name: 'Fly', gender: 'female', minWeight: 42.01, maxWeight: 44.00 },
      { name: 'Bantam', gender: 'female', minWeight: 44.01, maxWeight: 46.00 },
      { name: 'Feather', gender: 'female', minWeight: 46.01, maxWeight: 49.00 },
      { name: 'Light', gender: 'female', minWeight: 49.01, maxWeight: 52.00 },
      { name: 'Welter', gender: 'female', minWeight: 52.01, maxWeight: 55.00 },
      { name: 'Lt. Middle', gender: 'female', minWeight: 55.01, maxWeight: 59.00 },
      { name: 'Middle', gender: 'female', minWeight: 59.01, maxWeight: 63.00 },
      { name: 'Lt. Heavy', gender: 'female', minWeight: 63.01, maxWeight: 68.00 },
      { name: 'Heavy', gender: 'female', minWeight: 68.01, maxWeight: null },
    ],
  },
  {
    name: 'Senior',
    minAge: 18,
    maxAge: 35,
    categories: [
      { name: 'Fin', gender: 'male', minWeight: null, maxWeight: 54.00 },
      { name: 'Fly', gender: 'male', minWeight: 54.01, maxWeight: 58.00 },
      { name: 'Bantam', gender: 'male', minWeight: 58.01, maxWeight: 63.00 },
      { name: 'Feather', gender: 'male', minWeight: 63.01, maxWeight: 68.00 },
      { name: 'Light', gender: 'male', minWeight: 68.01, maxWeight: 74.00 },
      { name: 'Welter', gender: 'male', minWeight: 74.01, maxWeight: 80.00 },
      { name: 'Middle', gender: 'male', minWeight: 80.01, maxWeight: 87.00 },
      { name: 'Heavy', gender: 'male', minWeight: 87.01, maxWeight: null },
      { name: 'Fin', gender: 'female', minWeight: null, maxWeight: 46.00 },
      { name: 'Fly', gender: 'female', minWeight: 46.01, maxWeight: 49.00 },
      { name: 'Bantam', gender: 'female', minWeight: 49.01, maxWeight: 53.00 },
      { name: 'Feather', gender: 'female', minWeight: 53.01, maxWeight: 57.00 },
      { name: 'Light', gender: 'female', minWeight: 57.01, maxWeight: 62.00 },
      { name: 'Welter', gender: 'female', minWeight: 62.01, maxWeight: 67.00 },
      { name: 'Middle', gender: 'female', minWeight: 67.01, maxWeight: 73.00 },
      { name: 'Heavy', gender: 'female', minWeight: 73.01, maxWeight: null },
    ],
  },
]

async function main() {
  console.log('--- Starting Tournament Data Generation ---')

  // 1. Create Tournament
  const tournamentName = `Simulations Open ${new Date().getFullYear()}`
  console.log(`Creating tournament: ${tournamentName}`)

  const { data: tournament, error: tourneyError } = await supabase
    .from('tournaments')
    .insert({
      name: tournamentName,
      organizer_id: COACH_ID,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 86400000).toISOString(),
      status: 'upcoming',
      venue: 'Simulation Arena',
      entry_fee: 1000,
      tournament_type: 'standard'
    })
    .select()
    .single()

  if (tourneyError || !tournament) {
    console.error('Failed to create tournament:', tourneyError)
    return
  }
  const tournamentId = tournament.id
  console.log(`Tournament created: ${tournamentId}`)

  // 2. Setup Divisions & Categories in Database
  console.log('Setting up divisions and categories...')
  const divisionMap = new Map<string, string>() // Name -> ID
  const categoryMap = new Map<string, string>() // DivisionName:CategoryName:Gender -> ID

  for (const div of DIVISIONS) {
    const { data: divData } = await supabase
      .from('tournament_divisions')
      .insert({
        tournament_id: tournamentId,
        name: div.name,
        min_age: div.minAge || 0,
        max_age: div.maxAge || 99,
        enabled: true
      })
      .select()
      .single()

    if (divData) {
      divisionMap.set(div.name, divData.id)

      for (const cat of div.categories) {
        const { data: catData } = await supabase
          .from('tournament_categories')
          .insert({
            division_id: divData.id,
            name: cat.name,
            gender: cat.gender,
            min_weight: (cat as any).minWeight,
            max_weight: (cat as any).maxWeight,
            min_height: (cat as any).minHeight,
            max_height: (cat as any).maxHeight
          })
          .select()
          .single()

        if (catData) {
          categoryMap.set(`${div.name}:${cat.name}:${cat.gender}`, catData.id)
        }
      }
    }
  }

  // 3. Create Teams
  console.log('Generating teams...')
  const teamIds: string[] = []
  const teamNames = new Set<string>()
  const NUM_TEAMS = 40

  for (let i = 0; i < NUM_TEAMS; i++) {
    const teamName = generateTeamName(teamNames)
    teamNames.add(teamName)

    // Check if exists first (to be safe, though usage of unique name gen helps)
    const { data: existing } = await supabase.from('teams').select('id').eq('name', teamName).eq('user_id', COACH_ID).maybeSingle()

    if (existing) {
      teamIds.push(existing.id)
    } else {
      const { data: newTeam } = await supabase.from('teams').insert({ name: teamName, user_id: COACH_ID }).select().single()
      if (newTeam) teamIds.push(newTeam.id)
    }
  }
  console.log(`Created/Found ${teamIds.length} teams`)

  // 4. Generate Athletes
  console.log('Generating athletes...')
  const athletes = []
  const registrations = []
  const teamPlayers = [] // To populate team_players table

  // Target: At least 5 per category to ensure coverage
  const TARGET_PER_CATEGORY = 5
  // Total aim
  const TOTAL_ATHLETES = 1000

  // Pass 1: Ensure coverage
  for (const div of DIVISIONS) {
    for (const cat of div.categories) {
      const catId = categoryMap.get(`${div.name}:${cat.name}:${cat.gender}`)
      if (!catId) continue

      for (let k = 0; k < TARGET_PER_CATEGORY; k++) {
        athletes.push(generateAthlete(div, cat, catId, divisionMap.get(div.name)!))
      }
    }
  }

  // Pass 2: Fill remainder randomly
  while (athletes.length < TOTAL_ATHLETES) {
    const div = DIVISIONS[Math.floor(Math.random() * DIVISIONS.length)]
    const cat = div.categories[Math.floor(Math.random() * div.categories.length)]
    const catId = categoryMap.get(`${div.name}:${cat.name}:${cat.gender}`)
    const divId = divisionMap.get(div.name)

    if (divId && catId) {
      athletes.push(generateAthlete(div, cat, catId, divId))
    }
  }

  console.log(`Prepared ${athletes.length} athletes. Inserting...`)

  // Helper to generate athlete object
  function generateAthlete(div: any, cat: any, catId: string, divId: string) {
    const { firstName, lastName } = generatePlayerName()
    const teamId = teamIds[Math.floor(Math.random() * teamIds.length)]

    // Generate valid DOB
    const currentYear = new Date().getFullYear()
    const minAge = div.minAge || 5
    const maxAge = div.maxAge || 35
    const age = Math.floor(Math.random() * (maxAge - minAge + 1)) + minAge
    const birthYear = currentYear - age
    const dob = `${birthYear}-${Math.floor(Math.random() * 12) + 1}-${Math.floor(Math.random() * 28) + 1}`

    // Generate valid measurments
    let weight = 0, height = 0

    // Height
    if (cat.minHeight || cat.maxHeight) {
      const minH = cat.minHeight || 100
      const maxH = cat.maxHeight || 180
      height = Math.floor((Math.random() * (maxH - minH) + minH) * 100) / 100
    }

    // Weight
    if (cat.minWeight || cat.maxWeight) {
      const minW = cat.minWeight || 30
      const maxW = cat.maxWeight || 100
      weight = Math.floor((Math.random() * (maxW - minW) + minW) * 100) / 100
    } else {
      // Random reasonable weight if not specified
      weight = 40 + (age * 1.5)
    }

    return {
      first_name: firstName,
      last_name: lastName,
      gender: cat.gender,
      dob: dob,
      weight: weight,
      height: height,
      coach_id: COACH_ID,
      belt_level: 'Yellow', // Simplification
      // Meta (not for DB insert directly)
      _teamId: teamId,
      _divId: divId,
      _catId: catId
    }
  }

  // Batch Insert
  const BATCH_SIZE = 50
  for (let i = 0; i < athletes.length; i += BATCH_SIZE) {
    const batch = athletes.slice(i, i + BATCH_SIZE)

    // Insert Players
    const { data: insertedPlayers, error: pErr } = await supabase
      .from('players')
      .insert(batch.map(a => ({
        first_name: a.first_name,
        last_name: a.last_name,
        gender: a.gender,
        dob: a.dob,
        weight: a.weight,
        height: a.height,
        coach_id: a.coach_id,
        belt_level: a.belt_level
      })))
      .select()

    if (pErr) {
      console.error(`Error inserting batch ${i}:`, pErr)
      continue
    }

    if (insertedPlayers) {
      // Link Team and Create Registration
      const teamLinks = []
      const regs = []

      for (let j = 0; j < insertedPlayers.length; j++) {
        const p = insertedPlayers[j]
        const original = batch[j]

        teamLinks.push({
          team_id: original._teamId,
          player_id: p.id
        })

        regs.push({
          tournament_id: tournamentId,
          player_id: p.id,
          team_id: original._teamId,
          coach_id: COACH_ID,
          division_id: original._divId,
          category_id: original._catId,
          status: 'verified',
          disqualified: false
        })
      }

      await supabase.from('team_players').insert(teamLinks)
      await supabase.from('tournament_registrations').insert(regs)
    }
    console.log(`Processed batch ${i} - ${i + BATCH_SIZE}`)
  }

  console.log('--- Completed! ---')
}

main()
