'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import type { UserRole } from '@/lib/types/database';

interface ProfileData {
  roles: UserRole[];
  organization?: string;
  teamName?: string;
  phone?: string;
  contactEmail?: string;
  bio?: string;
}

export async function createUserProfiles(formData: ProfileData) {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('Unauthorized');
  }

  const supabase = createAdminClient();
  const createdProfiles = [];

  try {
    // Get user details from Clerk
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    
    // Create a single profile with the primary role (first selected)
    // Store all roles in Clerk metadata instead of separate profiles
    const primaryRole = formData.roles[0];
    
    const profileData = {
      clerk_id: userId,
      email: formData.contactEmail || user.primaryEmailAddress?.emailAddress || '',
      full_name: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User',
      role: primaryRole,
      phone: formData.phone || null,
      organization: formData.organization || null,
      bio: formData.bio || null,
      is_active: true,
    };

    const { data: profile, error } = await supabase
      .from('profiles')
      .upsert(profileData, { onConflict: 'clerk_id' })
      .select()
      .single();

    if (error) {
      console.error('Error creating profile:', error);
      throw new Error(`Failed to create profile: ${error.message}`);
    }

    if (profile) {
      createdProfiles.push(profile);
    }

    // If user selected coach role, create a team
    if (formData.roles.includes('coach') && formData.teamName && profile) {
      const { error: teamError } = await supabase
        .from('teams')
        .insert({
          coach_id: profile.id,
          name: formData.teamName,
          organization: formData.organization || null,
          description: formData.bio || null,
          is_active: true,
        });

      if (teamError) {
        console.error('Error creating team:', teamError);
        // Don't throw here, team creation is secondary
      }
    }

    revalidatePath('/dashboard');
    
    // Return success with redirect info
    return {
      success: true,
      profiles: createdProfiles,
      redirectTo: formData.roles.length > 1 ? '/auth/select-role' : '/dashboard'
    };

  } catch (error) {
    console.error('Profile creation error:', error);
    throw error;
  }
}
