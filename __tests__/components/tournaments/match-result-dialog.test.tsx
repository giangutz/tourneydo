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
        match={match as any} 
        open={true} 
        onOpenChange={mockOnClose}
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
        match={match as any} 
        open={true} 
        onOpenChange={mockOnClose}
        participants={[]}
      />
    )
    
    const inputs = await screen.findAllByRole('spinbutton')
    expect(inputs).toHaveLength(2) // 1 round * 2 players displayed a time
    
    fireEvent.change(inputs[0], { target: { value: '5' } })
    expect(inputs[0]).toHaveValue(5)
  })
})
