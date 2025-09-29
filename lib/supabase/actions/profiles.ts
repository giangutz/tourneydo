import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/lib/types/database';

const supabase = createClient();

export const profileQueries = {
  // Get profile by Clerk ID
  getByClerkId: async (clerkId: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('clerk_id', clerkId)
      .single();

    if (error) {
      console.error('Error fetching profile by clerk ID:', error);
      return null;
    }

    return data;
  },

  // Get profile by ID
  getById: async (id: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching profile by ID:', error);
      return null;
    }

    return data;
  },

  // Create new profile (Supabase auto-generates UUID for id)
  create: async (profileData: Omit<Profile, 'id' | 'created_at' | 'updated_at'>): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .insert(profileData)
      .select()
      .single();

    if (error) {
      console.error('Error creating profile:', error);
      return null;
    }

    return data;
  },

  // Create or update profile
  upsert: async (profileData: Omit<Profile, 'id' | 'created_at' | 'updated_at'>): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .upsert(profileData, { onConflict: 'clerk_id' })
      .select()
      .single();

    if (error) {
      console.error('Error upserting profile:', error);
      return null;
    }

    return data;
  },

  // Update profile
  update: async (id: string, updates: Partial<Profile>): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      return null;
    }

    return data;
  },

  // Get profiles by role
  getByRole: async (role: Profile['role']): Promise<Profile[]> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', role)
      .eq('is_active', true)
      .order('full_name');

    if (error) {
      console.error('Error fetching profiles by role:', error);
      return [];
    }

    return data || [];
  },

  // Search profiles
  search: async (query: string): Promise<Profile[]> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`full_name.ilike.%${query}%,email.ilike.%${query}%,organization.ilike.%${query}%`)
      .eq('is_active', true)
      .order('full_name')
      .limit(20);

    if (error) {
      console.error('Error searching profiles:', error);
      return [];
    }

    return data || [];
  },

  // Deactivate profile
  deactivate: async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      console.error('Error deactivating profile:', error);
      return false;
    }

    return true;
  }
};
