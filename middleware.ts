import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/profile(.*)',
  // Add other protected routes here
]);

const isOnboardingRoute = createRouteMatcher([
  '/onboarding(.*)',
]);

const isAuthRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
]);

const isPublicRoute = createRouteMatcher([
  '/tournaments(.*)',
  '/',
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();

  // Allow access to auth routes (sign-in/sign-up) for unauthenticated users
  if (isAuthRoute(req)) {
    return NextResponse.next();
  }

  // Allow access to public routes (tournaments, home page) for all users
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // If user is not authenticated and trying to access protected routes, redirect to sign-in
  if (!userId && isProtectedRoute(req)) {
    const signInUrl = new URL('/sign-in', req.url);
    return NextResponse.redirect(signInUrl);
  }

  // If user is authenticated but hasn't completed onboarding
  if (userId && !sessionClaims?.metadata?.onboardingComplete) {
    // Allow access to onboarding routes
    if (isOnboardingRoute(req)) {
      return NextResponse.next();
    }
    // Allow access to dashboard routes (users might be in the process of completing onboarding)
    if (isProtectedRoute(req)) {
      return NextResponse.next();
    }
    // Redirect to onboarding for all other routes
    const onboardingUrl = new URL('/onboarding', req.url);
    return NextResponse.redirect(onboardingUrl);
  }

  // If user is authenticated and has completed onboarding, protect routes as usual
  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
