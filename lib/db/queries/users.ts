/**
 * User database queries
 * 
 * Centralized data access layer for user operations.
 * All queries are properly typed and handle errors consistently.
 */

import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { User, UserInsert, UserUpdate } from '@/types/models'

/**
 * Get user by ID
 * 
 * @param id - User ID (Clerk user ID)
 * @returns User object or null if not found
 */
export async function getUserById(id: string): Promise<User | null> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('user_id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null
    }
    throw new Error(`Failed to fetch user: ${error.message}`)
  }

  return data as unknown as User
}

/**
 * Get user by email
 * 
 * @param email - User email address
 * @returns User object or null if not found
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(`Failed to fetch user: ${error.message}`)
  }

  return data as unknown as User
}

/**
 * Create a new user
 * 
 * @param userData - User data to insert
 * @returns Created user object
 */
export async function createUser(userData: UserInsert): Promise<User> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await (supabase as any)
    .from('users')
    .insert(userData)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create user: ${error.message}`)
  }

  return data as unknown as User
}

/**
 * Update an existing user
 * 
 * @param id - User ID to update
 * @param userData - Partial user data to update
 * @returns Updated user object
 */
export async function updateUser(id: string, userData: UserUpdate): Promise<User> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await (supabase as any)
    .from('users')
    .update(userData)
    .eq('user_id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update user: ${error.message}`)
  }

  return data as unknown as User
}

/**
 * Upsert a user (insert or update if exists)
 * 
 * @param userData - User data to upsert
 * @returns Upserted user object
 */
export async function upsertUser(userData: UserInsert): Promise<User> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await (supabase as any)
    .from('users')
    .upsert(userData)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to upsert user: ${error.message}`)
  }

  return data as unknown as User
}
