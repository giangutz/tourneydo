/**
 * Mock for @clerk/nextjs/server
 * Used in server-side tests to mock authentication
 */

type MockAuthReturn = {
  userId: string | null
  sessionClaims: {
    metadata?: {
      role?: 'tournament-organizer' | 'coach'
      onboardingComplete?: boolean
    }
  } | null
}

let mockAuthData: MockAuthReturn = {
  userId: null,
  sessionClaims: null,
}

export const auth = jest.fn(async () => mockAuthData)

/**
 * Test utility to set mock user for server-side tests
 */
export function setMockAuth(data: Partial<MockAuthReturn>) {
  mockAuthData = {
    userId: data.userId || null,
    sessionClaims: data.sessionClaims || null,
  }
}

/**
 * Test utility to clear mock auth
 */
export function clearMockAuth() {
  mockAuthData = {
    userId: null,
    sessionClaims: null,
  }
}

/**
 * Test utility to set mock user as tournament organizer
 */
export function setMockOrganizer(userId = 'test-organizer-id') {
  setMockAuth({
    userId,
    sessionClaims: {
      metadata: {
        role: 'tournament-organizer',
        onboardingComplete: true,
      },
    },
  })
}

/**
 * Test utility to set mock user as coach
 */
export function setMockCoach(userId = 'test-coach-id') {
  setMockAuth({
    userId,
    sessionClaims: {
      metadata: {
        role: 'coach',
        onboardingComplete: true,
      },
    },
  })
}
