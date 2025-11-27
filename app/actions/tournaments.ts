'use server'

import { createClerkSupabaseClient } from '@/lib/supabase/client'
import { auth } from '@clerk/nextjs/server'
import { Database } from '@/lib/supabase/types'
import { SupabaseClient } from '@supabase/supabase-js'

export async function getTournaments() {
  const { getToken } = await auth()
  const supabase: SupabaseClient<Database> = createClerkSupabaseClient(getToken)

  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .order('date', { ascending: true })

  if (error) return { error: error.message }
  return { data }
}

export async function getTournament(id: string) {
  const { getToken } = await auth()
  const supabase: SupabaseClient<Database> = createClerkSupabaseClient(getToken)

  const { data, error } = await supabase
    .from('tournaments')
    .select(`
      *,
      divisions (*)
    `)
    .eq('id', id)
    .single()

  if (error) return { error: error.message }
  return { data }
}
