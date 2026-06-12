/**
 * Manual mock for @arcjet/next.
 *
 * The real package ships ESM that Jest (CJS transform) cannot parse, which makes
 * any test importing a rate-limited API route fail to load. Rate limiting is an
 * infrastructure concern with nothing to assert in unit tests, so we stub it to
 * always allow. Auto-applied for all tests (node_modules manual mock).
 */

type Decision = {
  isDenied: () => boolean
  isErrored: () => boolean
  isAllowed: () => boolean
  reason: Record<string, unknown>
}

type ArcjetInstance = {
  protect: () => Promise<Decision>
}

const allowDecision: Decision = {
  isDenied: () => false,
  isErrored: () => false,
  isAllowed: () => true,
  reason: {},
}

function arcjet(): ArcjetInstance {
  return {
    protect: async () => allowDecision,
  }
}

export const slidingWindow = (opts?: unknown) => ({ type: 'slidingWindow', opts })
export const fixedWindow = (opts?: unknown) => ({ type: 'fixedWindow', opts })
export const tokenBucket = (opts?: unknown) => ({ type: 'tokenBucket', opts })
export const shield = (opts?: unknown) => ({ type: 'shield', opts })
export const detectBot = (opts?: unknown) => ({ type: 'detectBot', opts })

export default arcjet
