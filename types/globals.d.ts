import { JwtPayload } from 'jsonwebtoken';

declare global {
  interface CustomJwtSessionClaims extends JwtPayload {
    metadata: {
      onboardingComplete: boolean;
    };
  }
}

export interface OnboardingFormData {
  applicationName: string;
  applicationType: string;
}
