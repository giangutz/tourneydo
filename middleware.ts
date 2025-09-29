import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/api/protected(.*)'
])

const isAuthRoute = createRouteMatcher([
  '/auth/complete-profile',
  '/auth/select-role'
])

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth()
  
  // Protect routes that require authentication
  if (isProtectedRoute(req)) {
    await auth.protect()
    
    // Check if user has completed onboarding
    if (userId) {
      // Skip checks if already on auth routes to prevent loops
      if (req.nextUrl.pathname.startsWith('/auth/')) {
        console.log('Allowing auth route:', req.nextUrl.pathname)
        return NextResponse.next()
      }
      
      const metadata = sessionClaims?.publicMetadata as any
      
      // If metadata is undefined or null, this might be a session sync issue
      if (!metadata || metadata === null || Object.keys(metadata).length === 0) {
        console.log('No metadata found - possible session sync issue')
        
        // Allow access to auth routes and dashboard temporarily
        // The client-side will handle proper routing based on actual metadata
        if (req.nextUrl.pathname.startsWith('/dashboard') || 
            req.nextUrl.pathname.startsWith('/auth/')) {
          console.log('Allowing access due to metadata sync issue:', req.nextUrl.pathname)
          return NextResponse.next()
        }
        
        // Only redirect to complete-profile for other protected routes
        console.log('No metadata - redirecting to complete profile')
        return NextResponse.redirect(new URL('/auth/complete-profile', req.url))
      } else {
        // If no onboarding completed, redirect to complete profile
        if (!metadata?.onboardingComplete) {
          console.log('Redirecting to complete profile - onboarding not complete')
          return NextResponse.redirect(new URL('/auth/complete-profile', req.url))
        }
        
        // If multiple roles but no current role selected, redirect to role selection
        if (metadata?.roles?.length > 1 && !metadata?.currentRole) {
          console.log('Redirecting to role selection - multiple roles, no current role')
          return NextResponse.redirect(new URL('/auth/select-role', req.url))
        }
        
        // Debug logging
        console.log('Middleware check passed:', {
          onboardingComplete: metadata?.onboardingComplete,
          roles: metadata?.roles,
          currentRole: metadata?.currentRole,
          pathname: req.nextUrl.pathname
        })
      }
    }
  }
  
  // Allow auth routes without additional checks
  if (isAuthRoute(req)) {
    return NextResponse.next()
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
