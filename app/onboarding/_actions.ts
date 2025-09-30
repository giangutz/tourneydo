'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';
import { createAdminClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';
import type { OrganizationInsert, ProfileUpdate } from '@/types/database';

export async function completeOnboarding(formData: FormData) {
  try {
    const { userId } = await auth();

    if (!userId) {
      throw new Error('User not authenticated');
    }

    const organizationName = formData.get('organizationName') as string;
    const organizationType = formData.get('organizationType') as string;

    if (!organizationName || !organizationType) {
      throw new Error('All fields are required');
    }

    const supabase = createAdminClient();

    // Map form organization type to database enum
    const dbOrganizationType = organizationType === 'taekwondo-gym' ? 'taekwondo_gym' :
                              organizationType === 'tournament-organizer' ? 'tournament_organizer' :
                              organizationType === 'federation' ? 'federation' :
                              organizationType === 'school' ? 'school' :
                              organizationType === 'other' ? 'other' : 'other';

    // Map to user role
    const userRole = organizationType === 'tournament-organizer' ? 'tournament_organizer' :
                    organizationType === 'federation' ? 'federation' :
                    organizationType === 'taekwondo-gym' ? 'gym_owner' :
                    organizationType === 'school' ? 'school_admin' : 'other';

    // First, ensure profile exists (create if not exists)
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (!existingProfile) {
      // Get user data from Clerk to create profile
      const client = await clerkClient();
      const user = await client.users.getUser(userId);

      const profileData = {
        id: userId,
        email: user.emailAddresses[0]?.emailAddress || '',
        full_name: user.firstName && user.lastName
          ? `${user.firstName} ${user.lastName}`
          : user.firstName || user.lastName || null,
        avatar_url: user.imageUrl || null,
      };

      const { error: profileCreateError } = await supabase
        .from('profiles')
        .insert(profileData);

      if (profileCreateError) {
        console.error('Error creating profile:', profileCreateError);
        throw new Error('Failed to create user profile');
      }
    }

    // Create organization
    const organizationData: OrganizationInsert = {
      name: organizationName,
      type: dbOrganizationType as any,
      owner_id: userId,
    };

    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .insert(organizationData)
      .select()
      .single();

    if (orgError) {
      console.error('Error creating organization:', orgError);
      throw new Error(`Failed to create organization: ${orgError.message}`);
    }

    // Update profile with onboarding completion and organization info
    const profileUpdate: ProfileUpdate = {
      organization_name: organizationName,
      organization_type: dbOrganizationType,
      onboarding_completed: true,
      role: userRole as any,
    };

    const { error: profileError } = await supabase
      .from('profiles')
      .update(profileUpdate)
      .eq('id', userId);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      throw new Error('Failed to update profile');
    }

    // Also update Clerk metadata for middleware compatibility
    const client = await clerkClient();
    await client.users.updateUser(userId, {
      publicMetadata: {
        onboardingComplete: true,
        applicationName: organizationName,
        applicationType: organizationType,
        organizationId: organization.id,
      },
    });

    // Revalidate paths
    revalidatePath('/');
    revalidatePath('/dashboard');

    return { success: true };
  } catch (error) {
    console.error('Error completing onboarding:', error);
    return { success: false, error: 'Failed to complete onboarding' };
  }
}
