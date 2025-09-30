import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, sessionClaims } = await auth();

  // If user is not authenticated, redirect to sign-in
  if (!userId) {
    redirect('/sign-in');
  }

  // If user has already completed onboarding, redirect to home
  if (sessionClaims?.metadata?.onboardingComplete) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-red-50">
      <div className="container mx-auto px-4 py-8">
        {children}
      </div>
    </div>
  );
}
