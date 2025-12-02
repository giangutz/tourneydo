import { screen } from '@testing-library/react'
import { ParticipantList } from '@/components/tournaments/participant-list'
import { renderWithProviders, mockRegistration, mockPlayer, mockTeam } from '@/__tests__/utils/test-utils'

describe('ParticipantList', () => {
  it('renders list of participants', () => {
    const participants = [
      {
        ...mockRegistration(),
        player: mockPlayer({ first_name: 'John', last_name: 'Doe' }),
        team: mockTeam({ name: 'Team A' })
      }
    ]
    
    renderWithProviders(<ParticipantList participants={participants} tournamentId="t1" teams={[]} />)
    
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Team A')).toBeInTheDocument()
  })

  it('renders empty state', () => {
    renderWithProviders(<ParticipantList participants={[]} tournamentId="t1" teams={[]} />)
    
    expect(screen.getByText(/No participants found/i)).toBeInTheDocument()
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
        ...mockRegistration({ id: 'r2', status: 'verified', payment_status: 'paid' }),
        status: 'paid',
        player: mockPlayer({ id: 'p2', first_name: 'Player', last_name: 'Two' }),
        team: mockTeam({ id: 't2' })
      }
    ]
    
    renderWithProviders(<ParticipantList participants={participants} tournamentId="t1" teams={[]} />)
    
    expect(screen.getByText(/verified/i)).toBeInTheDocument()
    expect(screen.getByText(/paid/i)).toBeInTheDocument()
  })
})
