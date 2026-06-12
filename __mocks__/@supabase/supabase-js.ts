import {
  getMockResponseQueue,
  getMockQueryResponse,
  shiftMockResponseQueue,
  setMockQueryResponse,
  clearMockQueryResponse,
  mockSuccessQuery,
  mockErrorQuery,
  mockQueueSuccess,
  mockQueueError
} from '@/__tests__/utils/supabase-mock-state'

const createMockQueryBuilder = () => {
  const resolveNext = () =>
    getMockResponseQueue().length > 0 ? shiftMockResponseQueue() : getMockQueryResponse()

  const builder: any = {
    // Mutations / projections
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    // Filters (all chainable; no-ops against the queued/persistent response)
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    filter: jest.fn().mockReturnThis(),
    match: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    overlaps: jest.fn().mockReturnThis(),
    // Modifiers
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    // Terminators
    single: jest.fn().mockImplementation(() => Promise.resolve(resolveNext())),
    maybeSingle: jest.fn().mockImplementation(() => Promise.resolve(resolveNext())),
    then: jest.fn((resolve) => resolve(resolveNext())),
  }
  return builder
}

const mockSupabaseClient = {
  from: jest.fn(() => createMockQueryBuilder()),
  auth: {
    getUser: jest.fn().mockResolvedValue({
      data: { user: null },
      error: null,
    }),
  },
}

export const createClient = jest.fn(() => mockSupabaseClient)

export {
  setMockQueryResponse,
  clearMockQueryResponse,
  mockSuccessQuery,
  mockErrorQuery,
  mockQueueSuccess,
  mockQueueError
}
