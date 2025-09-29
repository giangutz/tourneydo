"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function ClientSideRouter() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    if (!isLoaded || !user || hasChecked) return;

    const metadata = user.unsafeMetadata;
    console.log('Client-side routing check:', {
      pathname,
      metadata,
      onboardingComplete: metadata?.onboardingComplete,
      roles: metadata?.roles,
      currentRole: metadata?.currentRole
    });

    // Skip if already on auth routes
    if (pathname.startsWith('/auth/')) {
      setHasChecked(true);
      return;
    }

    // If no metadata or onboarding not complete, go to complete profile
    if (!metadata || !metadata.onboardingComplete) {
      console.log('Client-side: Redirecting to complete profile');
      router.push('/auth/complete-profile');
      setHasChecked(true);
      return;
    }

    // If multiple roles but no current role, go to role selection
    if (Array.isArray(metadata.roles) && metadata.roles.length > 1 && !metadata.currentRole) {
      console.log('Client-side: Redirecting to role selection');
      router.push('/auth/select-role');
      setHasChecked(true);
      return;
    }

    // If on dashboard and everything is good, stay
    if (pathname.startsWith('/dashboard')) {
      console.log('Client-side: User properly configured for dashboard');
      setHasChecked(true);
      return;
    }

    // If not on dashboard but should be, redirect there
    if (metadata.onboardingComplete && (
      (Array.isArray(metadata.roles) && metadata.roles.length === 1) || 
      metadata.currentRole
    )) {
      console.log('Client-side: Redirecting to dashboard');
      router.push('/dashboard');
      setHasChecked(true);
      return;
    }

    setHasChecked(true);
  }, [isLoaded, user, pathname, router, hasChecked]);

  // Don't render anything, this is just for routing logic
  return null;
}
