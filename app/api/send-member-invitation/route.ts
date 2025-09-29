import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/email/email-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, organizerName, role, inviteLink } = body;

    // Validate required fields
    if (!email || !name || !organizerName || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Send the invitation email
    const success = await emailService.sendMemberInvitation({
      email,
      name,
      organizerName,
      role,
      inviteLink,
    });

    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('API Error sending member invitation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
