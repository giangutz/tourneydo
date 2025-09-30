# Implementation Plan

Implement custom sign-in/sign-up pages with enhanced UI/UX and a complete custom onboarding flow for the Tourneydo taekwondo tournament management platform.

The current app has basic Clerk authentication pages, but they need enhancement for better user experience and the addition of a mandatory onboarding flow that collects user information before allowing access to the application.

[Types]
Add TypeScript interfaces for custom session claims and onboarding data.

Create `types/globals.d.ts` with `CustomJwtSessionClaims` interface containing `metadata.onboardingComplete` boolean field.

Define `OnboardingFormData` interface with `applicationName` and `applicationType` string fields.

[Files]
Create new onboarding directory and files, enhance existing auth pages.

New files:
- `types/globals.d.ts` - Global TypeScript declarations for custom session claims
- `app/onboarding/layout.tsx` - Layout component that redirects completed users
- `app/onboarding/page.tsx` - Onboarding form component with application details collection
- `app/onboarding/_actions.ts` - Server action to update user metadata and complete onboarding

Modified files:
- `app/sign-in/[[...sign-in]]/page.tsx` - Enhanced UI with better styling and branding
- `app/sign-up/[[...sign-up]]/page.tsx` - Enhanced UI with better styling and branding
- `middleware.ts` - Updated to handle onboarding redirects and session claims
- `.env.local` - Add onboarding redirect environment variables

[Functions]
Create server actions and update middleware logic.

New functions:
- `completeOnboarding(formData: FormData)` in `app/onboarding/_actions.ts` - Updates user publicMetadata and marks onboarding complete

Modified functions:
- Middleware `clerkMiddleware` - Add onboarding redirect logic and session claims checking

[Classes]
No new classes required - using functional components and server actions.

[Dependencies]
No new dependencies needed - all functionality uses existing Clerk and Next.js features.

[Testing]
Manual testing of authentication flow and onboarding process.

Test sign-in/sign-up pages load correctly with enhanced UI.
Test onboarding flow redirects unauthenticated users.
Test onboarding completion updates user metadata.
Test completed users bypass onboarding.

[Implementation Order]
1. Create TypeScript types for custom session claims
2. Enhance sign-in and sign-up page UI/UX
3. Update middleware for onboarding redirects
4. Add onboarding environment variables
5. Create onboarding layout component
6. Create onboarding form page
7. Create server action for completing onboarding
8. Test complete authentication and onboarding flow
