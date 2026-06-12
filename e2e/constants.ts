import path from 'path'

/**
 * Shared E2E constants. Kept dependency-free (no @clerk/testing import) so the
 * Playwright config can reference paths without pulling Clerk tooling into the
 * public, no-auth lane.
 */
export const ORGANIZER_STORAGE_STATE = path.join(__dirname, '.auth/organizer.json')
