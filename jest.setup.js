// Learn more: https://github.com/testing-library/jest-dom
/* eslint-disable @typescript-eslint/no-require-imports */
import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    }
  },
  usePathname() {
    return '/'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  redirect: jest.fn(),
}))

// Mock Clerk client hooks
jest.mock('@clerk/nextjs', () => ({
  useUser: jest.fn(() => ({
    isSignedIn: true,
    user: {
      id: 'test-user-id',
      emailAddresses: [{ emailAddress: 'test@example.com' }],
      publicMetadata: {
        role: 'coach',
        onboardingComplete: true,
      },
    },
  })),
  useAuth: jest.fn(() => ({
    userId: 'test-user-id',
    sessionId: 'test-session-id',
    isSignedIn: true,
  })),
  SignedIn: ({ children }) => children,
  SignedOut: () => null,
  UserButton: () => null,
}))

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
  unstable_cache: jest.fn((fn) => fn),
}))

// Mock window.matchMedia
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })
}

// Polyfill ResizeObserver (used by Radix UI primitives like RadioGroup/Checkbox).
// jsdom does not implement it, so components relying on useSize throw on mount.
if (typeof global.ResizeObserver === 'undefined') {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

// Polyfill TextEncoder/TextDecoder
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util')
  global.TextEncoder = TextEncoder
  global.TextDecoder = TextDecoder
}

// Suppress console errors in tests (optional)
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
}

// Polyfill Request/Response/Headers for Next.js Server Actions
if (typeof global.Request === 'undefined') {
  const { Request, Response, Headers } = require('node-fetch')
  global.Request = Request
  global.Response = Response
  global.Headers = Headers
}

// Polyfill crypto.randomUUID
if (typeof crypto === 'undefined') {
  global.crypto = {
    randomUUID: () => 'test-uuid-' + Math.random(),
  }
} else if (!crypto.randomUUID) {
  crypto.randomUUID = () => 'test-uuid-' + Math.random()
}
