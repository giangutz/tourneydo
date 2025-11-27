export { }

declare global {
  interface CustomJwtSessionClaims {
    metadata: {
      onboardingComplete?: boolean
      role: 'tournament-organizer' | 'coach'
      clubName?: string
    }
  }
}