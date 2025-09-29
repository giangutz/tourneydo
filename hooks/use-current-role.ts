"use client";

import { useUser } from "@clerk/nextjs";
import { UserRole } from "@/lib/types/database";

interface UseCurrentRoleReturn {
  currentRole: UserRole | null;
  allRoles: UserRole[];
  primaryRole: UserRole | null;
  isMultiRole: boolean;
  isLoading: boolean;
  onboardingComplete: boolean;
}

/**
 * Custom hook to get current role information from Clerk metadata
 * This is the single source of truth for role information
 */
export function useCurrentRole(): UseCurrentRoleReturn {
  const { user, isLoaded } = useUser();

  if (!isLoaded || !user) {
    return {
      currentRole: null,
      allRoles: [],
      primaryRole: null,
      isMultiRole: false,
      isLoading: true,
      onboardingComplete: false,
    };
  }

  const metadata = user.publicMetadata || {};
  const allRoles = (metadata.roles as UserRole[]) || [];
  const currentRole = (metadata.currentRole as UserRole) || null;
  const primaryRole = (metadata.primaryRole as UserRole) || null;
  const onboardingComplete = Boolean(metadata.onboardingComplete);

  return {
    currentRole,
    allRoles,
    primaryRole,
    isMultiRole: allRoles.length > 1,
    isLoading: false,
    onboardingComplete,
  };
}
