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

    // Target the two main round score inputs specifically (not technique panel inputs)
    const p1Input = await screen.findByTestId('round-score-p1')
    const p2Input = await screen.findByTestId('round-score-p2')

    expect(p1Input).toBeInTheDocument()
    expect(p2Input).toBeInTheDocument()

    fireEvent.change(p1Input, { target: { value: '5' } })
    expect(p1Input).toHaveValue(5)
  })
})
