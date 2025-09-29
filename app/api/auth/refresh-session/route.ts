import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // This endpoint just validates the current session
    // The act of calling auth() will refresh the session token
    return NextResponse.json({ 
      success: true, 
      userId,
      message: 'Session refreshed'
    });

  } catch (error) {
    console.error('Session refresh error:', error);
    return NextResponse.json(
      { error: 'Failed to refresh session' },
      { status: 500 }
    );
  }
}
