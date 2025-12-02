import { screen, fireEvent } from '@testing-library/react'
import { MatchResultDialog } from '@/components/tournaments/match-result-dialog'
import { renderWithProviders, mockMatch } from '@/__tests__/utils/test-utils'

describe('MatchResultDialog', () => {
  const mockOnClose = jest.fn()
  const mockOnUpdate = jest.fn()

  it('renders dialog with match details', async () => {
    const match = mockMatch()
    
    renderWithProviders(
      <MatchResultDialog 
        match={match} 
        open={true} 
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        participants={[]}
      />
    )
    
    expect(screen.getByRole('heading', { name: /Match Result/i })).toBeInTheDocument()
    expect(await screen.findByText(/Round 1/i)).toBeInTheDocument()
  })

  it('allows score input', async () => {
    const match = mockMatch()
    
    renderWithProviders(
      <MatchResultDialog 
        match={match} 
        open={true} 
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        participants={[]}
      />
    )
    
    const inputs = await screen.findAllByRole('spinbutton')
    expect(inputs).toHaveLength(6) // 3 rounds * 2 players
    
    fireEvent.change(inputs[0], { target: { value: '5' } })
    expect(inputs[0]).toHaveValue(5)
  })
})
