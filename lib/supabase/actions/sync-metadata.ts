'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';

export async function syncUserMetadata() {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('Not authenticated');
  }

  const supabase = await createClient();
  
  try {
    // Get user profile from database
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('clerk_id', userId);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    if (!profiles || profiles.length === 0) {
      console.log('No profiles found for user:', userId);
      return {
        success: false,
        message: 'No profiles found - user needs to complete onboarding'
      };
    }

    // Extract roles from profiles
    const roles = profiles.map(profile => profile.role);
    const primaryRole = profiles[0].role; // First profile is primary
    
    // Determine if onboarding is complete
    const onboardingComplete = profiles.length > 0;
    
    // Set currentRole based on number of roles
    const currentRole = roles.length === 1 ? roles[0] : null;

    // Update Clerk metadata
    const client = await clerkClient();
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        roles,
        primaryRole,
        currentRole,
        onboardingComplete
      }
    });

    console.log('Metadata synced successfully:', {
      roles,
      primaryRole,
      currentRole,
      onboardingComplete
    });

    return {
      success: true,
      metadata: {
        roles,
        primaryRole,
        currentRole,
        onboardingComplete
      }
    };

  } catch (error) {
    console.error('Error syncing metadata:', error);
    throw error;
  }
}
