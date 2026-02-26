import { screen } from '@testing-library/react'
import { ParticipantList } from '@/components/tournaments/participant-list'
import { renderWithProviders, mockRegistration, mockPlayer, mockTeam } from '@/__tests__/utils/test-utils'

jest.mock('@clerk/nextjs', () => ({
  useSession: () => ({
    session: {
      getToken: jest.fn(() => Promise.resolve('mock-token')),
    }
  }),
}))

jest.mock('@/lib/supabase/client', () => ({
  createClerkSupabaseClient: jest.fn(() => ({
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockImplementation((cb) => {
        if (cb) cb('SUBSCRIBED')
        return { unsubscribe: jest.fn() }
      })
    })),
    removeChannel: jest.fn(),
    realtime: {
      connect: jest.fn(),
      disconnect: jest.fn(),
    }
  })),
}))
describe('ParticipantList', () => {
  it('renders list of participants', () => {
    const participants = [
      {
        ...mockRegistration(),
        player: mockPlayer({ first_name: 'John', last_name: 'Doe' }),
        team: mockTeam({ name: 'Team A' })
      }
    ]
    
    renderWithProviders(<ParticipantList participants={participants as any} tournamentId="t1" teams={[]} count={1} page={1} limit={10} totalPages={1} />)
    
    expect(screen.getAllByText('John Doe')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Team A')[0]).toBeInTheDocument()
  })

  it('renders empty state', () => {
    renderWithProviders(<ParticipantList participants={[]} tournamentId="t1" teams={[]} count={0} page={1} limit={10} totalPages={0} />)
    
    expect(screen.getAllByText(/No participants found/i)[0]).toBeInTheDocument()
  })

  it('displays status badges', () => {
    const participants = [
      {
        ...mockRegistration({ id: 'r1', status: 'verified' }),
        status: 'verified',
        player: mockPlayer({ id: 'p1', first_name: 'Player', last_name: 'One' }),
        team: mockTeam({ id: 't1' })
      },
      {
        ...mockRegistration({ id: 'r2', status: 'verified', payment_status: 'paid' } as any),
        status: 'paid',
        player: mockPlayer({ id: 'p2', first_name: 'Player', last_name: 'Two' }),
        team: mockTeam({ id: 't2' })
      }
    ]
    
    renderWithProviders(<ParticipantList participants={participants as any} tournamentId="t1" teams={[]} count={2} page={1} limit={10} totalPages={1} />)
    
    expect(screen.getAllByText(/verified/i)[0]).toBeInTheDocument()
    expect(screen.getAllByText(/paid/i)[0]).toBeInTheDocument()
  })
})
