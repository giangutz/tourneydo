// Debug script to test authentication flow
// Run this in browser console to debug the redirect loop

console.log('🔍 TourneyDo Auth Flow Debugger');

// Check current user state
function debugUserState() {
  console.log('--- USER STATE DEBUG ---');
  
  // Check if user is signed in
  const user = window.Clerk?.user;
  console.log('1. User signed in:', !!user);
  
  if (user) {
    console.log('2. User ID:', user.id);
    console.log('3. User email:', user.primaryEmailAddress?.emailAddress);
    console.log('4. User name:', user.fullName || `${user.firstName} ${user.lastName}`);
    
    // Check metadata
    const metadata = user.unsafeMetadata;
    console.log('5. User metadata:', metadata);
    console.log('   - Roles:', metadata?.roles);
    console.log('   - Primary role:', metadata?.primaryRole);
    console.log('   - Current role:', metadata?.currentRole);
    console.log('   - Onboarding complete:', metadata?.onboardingComplete);
  }
  
  // Check current URL
  console.log('6. Current URL:', window.location.href);
  console.log('7. Current pathname:', window.location.pathname);
}

// Check database profile
async function debugDatabaseProfile() {
  console.log('--- DATABASE PROFILE DEBUG ---');
  
  try {
    const response = await fetch('/api/debug/profile', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('Database profile:', data);
    } else {
      console.log('Failed to fetch profile:', response.status);
    }
  } catch (error) {
    console.log('Error fetching profile:', error);
  }
}

// Test profile creation
async function testProfileCreation() {
  console.log('--- PROFILE CREATION TEST ---');
  
  const testData = {
    roles: ['organizer'],
    organization: 'Debug Test Org',
    phone: '+1234567890',
    contactEmail: 'debug@test.com',
    bio: 'Debug test profile'
  };
  
  try {
    const response = await fetch('/auth/complete-profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    console.log('Profile creation response:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Profile creation result:', data);
    } else {
      const error = await response.text();
      console.log('Profile creation error:', error);
    }
  } catch (error) {
    console.log('Profile creation failed:', error);
  }
}

// Check middleware behavior
function debugMiddleware() {
  console.log('--- MIDDLEWARE DEBUG ---');
  
  const pathname = window.location.pathname;
  console.log('Current path:', pathname);
  
  // Check if path should be protected
  const protectedPaths = ['/dashboard'];
  const isProtected = protectedPaths.some(path => pathname.startsWith(path));
  console.log('Is protected route:', isProtected);
  
  // Check if path is auth route
  const authPaths = ['/auth/complete-profile', '/auth/select-role'];
  const isAuthRoute = authPaths.some(path => pathname.startsWith(path));
  console.log('Is auth route:', isAuthRoute);
}

// Main debug function
function debugAuthFlow() {
  console.log('🚀 Starting TourneyDo Auth Flow Debug...\n');
  
  debugUserState();
  console.log('\n');
  
  debugMiddleware();
  console.log('\n');
  
  // Run database check if available
  if (typeof fetch !== 'undefined') {
    debugDatabaseProfile();
  }
  
  console.log('✅ Debug complete. Check the logs above for issues.');
  console.log('\n📋 Common Issues:');
  console.log('- onboardingComplete should be true after profile setup');
  console.log('- currentRole should be set for multi-role users');
  console.log('- Database profile should exist with correct clerk_id');
  console.log('- No redirect loops between /auth/complete-profile and /auth/select-role');
}

// Auto-run debug
debugAuthFlow();

// Export functions for manual testing
window.debugTourneyDo = {
  debugUserState,
  debugDatabaseProfile,
  testProfileCreation,
  debugMiddleware,
  debugAuthFlow
};

console.log('\n🛠️  Available debug functions:');
console.log('- debugTourneyDo.debugUserState()');
console.log('- debugTourneyDo.debugDatabaseProfile()');
console.log('- debugTourneyDo.testProfileCreation()');
console.log('- debugTourneyDo.debugMiddleware()');
console.log('- debugTourneyDo.debugAuthFlow()');
