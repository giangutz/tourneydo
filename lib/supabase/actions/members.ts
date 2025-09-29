'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

interface InviteMemberData {
  email: string;
  role: 'organizer' | 'coach' | 'athlete';
  organizationId: string;
  message?: string;
}

export async function inviteMember(data: InviteMemberData) {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('Unauthorized');
  }

  const supabase = createAdminClient();

  try {
    // Check if user is an organizer
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('clerk_id', userId)
      .single();

    if (!profile || profile.role !== 'organizer') {
      throw new Error('Only organizers can invite members');
    }

    // Check if invitation already exists
    const { data: existingInvite } = await supabase
      .from('member_invitations')
      .select('*')
      .eq('email', data.email)
      .eq('organization_id', data.organizationId)
      .eq('status', 'pending')
      .single();

    if (existingInvite) {
      throw new Error('Invitation already sent to this email');
    }

    // Create invitation record
    const { data: invitation, error } = await supabase
      .from('member_invitations')
      .insert({
        email: data.email,
        role: data.role,
        organization_id: data.organizationId,
        invited_by: profile.id,
        message: data.message,
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create invitation: ${error.message}`);
    }

    // Send invitation email (you can integrate with your email service)
    await sendInvitationEmail({
      email: data.email,
      inviterName: profile.full_name,
      organizationName: profile.organization || 'TourneyDo',
      role: data.role,
      inviteToken: invitation.id,
      message: data.message,
    });

    revalidatePath('/dashboard/members');
    
    return {
      success: true,
      invitation,
    };

  } catch (error) {
    console.error('Member invitation error:', error);
    throw error;
  }
}

export async function getOrganizationMembers(organizationId: string) {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('Unauthorized');
  }

  const supabase = createAdminClient();

  try {
    // Get organization members
    const { data: members, error } = await supabase
      .from('profiles')
      .select(`
        *,
        teams (
          id,
          name
        )
      `)
      .eq('organization', organizationId)
      .eq('is_active', true);

    if (error) {
      throw new Error(`Failed to fetch members: ${error.message}`);
    }

    // Get pending invitations
    const { data: invitations, error: inviteError } = await supabase
      .from('member_invitations')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('status', 'pending');

    if (inviteError) {
      console.error('Failed to fetch invitations:', inviteError);
    }

    return {
      members: members || [],
      pendingInvitations: invitations || [],
    };

  } catch (error) {
    console.error('Error fetching organization members:', error);
    throw error;
  }
}

export async function acceptInvitation(inviteToken: string) {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('Unauthorized');
  }

  const supabase = createAdminClient();

  try {
    // Get invitation details
    const { data: invitation, error } = await supabase
      .from('member_invitations')
      .select('*')
      .eq('id', inviteToken)
      .eq('status', 'pending')
      .single();

    if (error || !invitation) {
      throw new Error('Invalid or expired invitation');
    }

    // Check if invitation has expired
    if (new Date(invitation.expires_at) < new Date()) {
      throw new Error('Invitation has expired');
    }

    // Get user details from Clerk
    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    // Check if user already has a profile
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('clerk_id', userId)
      .single();

    if (existingProfile) {
      // Update existing profile to add organization
      await supabase
        .from('profiles')
        .update({
          organization: invitation.organization_id,
        })
        .eq('id', existingProfile.id);
    } else {
      // Create new profile
      await supabase
        .from('profiles')
        .insert({
          clerk_id: userId,
          email: user.primaryEmailAddress?.emailAddress || invitation.email,
          full_name: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User',
          role: invitation.role,
          organization: invitation.organization_id,
          is_active: true,
        });
    }

    // Mark invitation as accepted
    await supabase
      .from('member_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', inviteToken);

    revalidatePath('/dashboard');
    
    return {
      success: true,
      role: invitation.role,
      organization: invitation.organization_id,
    };

  } catch (error) {
    console.error('Accept invitation error:', error);
    throw error;
  }
}

async function sendInvitationEmail(params: {
  email: string;
  inviterName: string;
  organizationName: string;
  role: string;
  inviteToken: string;
  message?: string;
}) {
  // This is a placeholder for email sending functionality
  // You can integrate with services like Resend, SendGrid, etc.
  
  console.log('Sending invitation email:', {
    to: params.email,
    subject: `Invitation to join ${params.organizationName} on TourneyDo`,
    inviteLink: `${process.env.NEXT_PUBLIC_APP_URL}/auth/accept-invite/${params.inviteToken}`,
    ...params,
  });

  // For now, just log the invitation details
  // In production, implement actual email sending
}
