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

const createMockQueryBuilder = () => ({
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  ilike: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  single: jest.fn().mockImplementation(() => {
    return Promise.resolve(getMockResponseQueue().length > 0 ? shiftMockResponseQueue() : getMockQueryResponse())
  }),
  then: jest.fn((resolve) => {
    const queue = getMockResponseQueue()
    resolve(queue.length > 0 ? shiftMockResponseQueue() : getMockQueryResponse())
  }),
})

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
