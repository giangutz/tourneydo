'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';
import { UserRole } from '@/lib/types/database';

export async function updateCurrentRole(newRole: UserRole) {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('Not authenticated');
  }

  try {
    const client = await clerkClient();
    
    // Get current public metadata
    const user = await client.users.getUser(userId);
    const currentMetadata = user.publicMetadata || {};

    // Update the current role in public metadata
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        ...currentMetadata,
        currentRole: newRole,
      }
    });

    return {
      success: true,
      currentRole: newRole
    };

  } catch (error) {
    console.error('Error updating current role:', error);
    throw new Error('Failed to update current role');
  }
}
