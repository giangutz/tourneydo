// import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
// import { NextRequest, NextResponse } from 'next/server'

// const isOnboardingRoute = createRouteMatcher(['/onboarding'])
// const isPublicRoute = createRouteMatcher([
//   '/sign-in(.*)',
//   '/sign-up(.*)'
// ])

// export default clerkMiddleware(async (auth, req: NextRequest) => {
//   const { isAuthenticated, sessionClaims, redirectToSignIn } = await auth()

//   // For users visiting /onboarding, don't try to redirect
//   if (isAuthenticated && isOnboardingRoute(req)) {
//     return NextResponse.next()
//   }

//   // If the user isn't signed in and the route is private, redirect to sign-in
//   if (!isAuthenticated && !isPublicRoute(req)) return redirectToSignIn({ returnBackUrl: req.url })

//   // Catch users who do not have `onboardingComplete: true` in their publicMetadata
//   // Redirect them to the /onboarding route to complete onboarding
//   if (isAuthenticated && !sessionClaims?.metadata?.onboardingComplete) {
//     const onboardingUrl = new URL('/onboarding', req.url)
//     return NextResponse.redirect(onboardingUrl)
//   }

//   // If the user is logged in and the route is protected, let them view.
//   if (isAuthenticated && !isPublicRoute(req)) return NextResponse.next()
// })

// export const config = {
//   matcher: [
//     // Skip Next.js internals and all static files, unless found in search params
//     '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
//     // Always run for API routes
//     '/(api|trpc)(.*)',
//   ],
// }


import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)', '/tournaments(.*)', '/tournament(.*)'])

const isOnboardingRoute = createRouteMatcher(['/onboarding'])

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth()

  // Allow public routes
  if (isPublicRoute(req)) {
    return NextResponse.next()
  }

  // Redirect unauthenticated users to sign-in
  if (!userId) {
    const signInUrl = new URL('/sign-in', req.url)
    signInUrl.searchParams.set('redirect_url', req.url)
    return NextResponse.redirect(signInUrl)
  }

  // Check if onboarding is complete
  const onboardingComplete = sessionClaims?.metadata?.onboardingComplete === true
  const role = sessionClaims?.metadata?.role as 'tournament-organizer' | 'coach' | undefined

  // If not onboarded and not on onboarding page, redirect to onboarding
  if (!onboardingComplete && !isOnboardingRoute(req)) {
    return NextResponse.redirect(new URL('/onboarding', req.url))
  }

  // If onboarded and on onboarding page, redirect to appropriate dashboard
  if (onboardingComplete && isOnboardingRoute(req)) {
    if (role === 'coach') {
      return NextResponse.redirect(new URL('/dashboard/coach', req.url))
    } else if (role === 'tournament-organizer') {
      return NextResponse.redirect(new URL('/dashboard/tournament-organizer', req.url))
    }
  }

  // Protect dashboard routes - ensure users can only access their role's dashboard
  if (req.nextUrl.pathname.startsWith('/dashboard/')) {
    if (req.nextUrl.pathname.startsWith('/dashboard/coach') && role !== 'coach') {
      return NextResponse.redirect(new URL('/dashboard/tournament-organizer', req.url))
    }
    if (req.nextUrl.pathname.startsWith('/dashboard/tournament-organizer') && role !== 'tournament-organizer') {
      return NextResponse.redirect(new URL('/dashboard/coach', req.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
