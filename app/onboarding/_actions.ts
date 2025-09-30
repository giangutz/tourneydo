'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';

export async function completeOnboarding(formData: FormData) {
  try {
    const { userId } = await auth();

    if (!userId) {
      throw new Error('User not authenticated');
    }

    const applicationName = formData.get('organizationName') as string;
    const applicationType = formData.get('organizationType') as string;

    if (!applicationName || !applicationType) {
      throw new Error('All fields are required');
    }

    // Update user metadata to mark onboarding as complete
    const client = await clerkClient();
    await client.users.updateUser(userId, {
      publicMetadata: {
        onboardingComplete: true,
        applicationName,
        applicationType,
      },
    });

    // Revalidate the home page to ensure fresh data
    revalidatePath('/');

    return { success: true };
  } catch (error) {
    console.error('Error completing onboarding:', error);
    return { success: false, error: 'Failed to complete onboarding' };
  }
}
