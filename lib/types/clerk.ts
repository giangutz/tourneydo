import { UserRole } from "./database";

export interface ClerkUserMetadata {
  roles?: UserRole[];
  currentRole?: UserRole;
  primaryRole?: UserRole;
  onboardingComplete?: boolean;
}
