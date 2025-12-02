import { screen } from '@testing-library/react'
import { BracketView } from '@/components/tournaments/bracket-view'
import { renderWithProviders, mockMatch } from '@/__tests__/utils/test-utils'

describe('BracketView', () => {
  it('renders bracket with matches', () => {
    const matches = [
      mockMatch({ id: 'm1', round: 1, match_number: 1 }),
      mockMatch({ id: 'm2', round: 2, match_number: 1 })
    ]
    
    renderWithProviders(<BracketView matches={matches} participants={[]} />)
    
    // Should show round labels
    expect(screen.getAllByText(/Finals/i).length).toBeGreaterThan(0)
  })

  it('renders empty state when no matches', () => {
    renderWithProviders(<BracketView matches={[]} participants={[]} />)
    
    expect(screen.getByText(/No matches found/i)).toBeInTheDocument()
  })

  it('displays match status correctly', () => {
    const matches = [
      mockMatch({ 
        id: 'm1', 
        round: 1, 
        status: 'completed',
        score_player1: 10,
        score_player2: 5
      })
    ]
    
    renderWithProviders(<BracketView matches={matches} participants={[]} />)
    
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })
})
