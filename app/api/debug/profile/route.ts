import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { userId, sessionClaims } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const supabase = await createClient();
    
    // Get profile from database
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('clerk_id', userId)
      .single();

    const debugInfo = {
      userId,
      clerkMetadata: sessionClaims?.unsafeMetadata,
      databaseProfile: profile,
      databaseError: error?.message,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(debugInfo);
  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
