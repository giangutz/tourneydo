/**
 * Shared state for Supabase mock
 * 
 * This file holds the state (response queue) for the Supabase mock.
 * It is imported by both the manual mock (__mocks__/@supabase/supabase-js.ts)
 * and the tests, ensuring they share the same state.
 */

export type MockQueryResponse = {
  data: any
  error: any
}

let mockResponseQueue: MockQueryResponse[] = []

let mockQueryResponse: MockQueryResponse = {
  data: null,
  error: null,
}

export function getMockResponseQueue() {
  return mockResponseQueue
}

export function getMockQueryResponse() {
  return mockQueryResponse
}

export function shiftMockResponseQueue() {
  return mockResponseQueue.shift()
}

/**
 * Test utility to set mock query response
 */
export function setMockQueryResponse(data: any, error: any = null) {
  mockQueryResponse = { data, error }
}

/**
 * Test utility to clear mock query response and queue
 */
export function clearMockQueryResponse() {
  mockQueryResponse = { data: null, error: null }
  mockResponseQueue = []
}

/**
 * Test utility to mock successful query (persistent)
 */
export function mockSuccessQuery(data: any) {
  setMockQueryResponse(data, null)
}

/**
 * Test utility to mock error query (persistent)
 */
export function mockErrorQuery(errorMessage: string, code = 'PGRST000') {
  setMockQueryResponse(null, {
    message: errorMessage,
    code,
  })
}

/**
 * Test utility to queue a successful query response
 */
export function mockQueueSuccess(data: any) {
  mockResponseQueue.push({ data, error: null })
}

/**
 * Test utility to queue an error query response
 */
export function mockQueueError(errorMessage: string, code = 'PGRST000') {
  mockResponseQueue.push({
    data: null,
    error: { message: errorMessage, code }
  })
}
