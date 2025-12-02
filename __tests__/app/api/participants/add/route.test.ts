/**
 * @jest-environment node
 */
import { POST } from '@/app/api/participants/add/route'
import { NextRequest } from 'next/server'
import { setMockCoach, clearMockAuth } from '@/__mocks__/@clerk/nextjs/server'
import { mockSuccessQuery, clearMockQueryResponse } from '@/__mocks__/@supabase/supabase-js'

// Mock NextRequest
const createRequest = (body: any) => {
  return new Request('http://localhost:3000/api/participants/add', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

describe('API Route: /api/participants/add', () => {
  beforeEach(() => {
    setMockCoach()
    clearMockQueryResponse()
  })

  afterEach(() => {
    clearMockAuth()
  })

  it('should return 200 for valid request', async () => {
    mockSuccessQuery({ id: 'new-player-id' })

    const req = createRequest({
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      dob: '2010-01-01',
      weight: 50,
      height: 150,
      belt_level: 'White',
      gender: 'male',
      team_id: 'team-1',
      tournamentId: 'tournament-1'
    })

    const res = await POST(req as unknown as NextRequest)
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.success).toBe(true)
  })

  it('should return 400 for invalid data', async () => {
    const req = createRequest({
      // Missing required fields
      first_name: 'John'
    })

    const res = await POST(req as unknown as NextRequest)
    expect(res.status).toBe(400)
  })

  it('should return 401 if unauthorized', async () => {
    clearMockAuth()

    const req = createRequest({
      first_name: 'John',
      last_name: 'Doe'
    })

    const res = await POST(req as unknown as NextRequest)
    expect(res.status).toBe(401)
  })
})
