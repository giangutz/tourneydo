
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase env vars')
  process.exit(1)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function main() {
  console.log('Fetching all tournaments...')

  const { data: tournaments, error } = await supabase
    .from('tournaments')
    .select('id, name, status, start_date, end_date')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching tournaments:', error)
    return
  }

  const now = new Date()
  console.log(`Current Time: ${now.toISOString()}\n`)

  console.log('Analysis:')
  tournaments.forEach(t => {
    const start = t.start_date ? new Date(t.start_date) : null
    const end = t.end_date ? new Date(t.end_date) : null

    let expected = 'upcoming'
    if (end && now > end) {
      expected = 'completed'
    } else if (start && now >= start) {
      expected = 'ongoing'
    }

    const matches = t.status === expected

    console.log(`[${matches ? 'MATCH' : 'MISMATCH'}] ID: ${t.id} Name: "${t.name}"`)
    console.log(`  DB Status: ${t.status}`)
    console.log(`  Expected : ${expected}`)
    console.log(`  Start    : ${t.start_date}`)
    console.log(`  End      : ${t.end_date}`)
    console.log('---')
  })
}

main()
