import { screen } from '@testing-library/react'
import { BracketView } from '@/components/tournaments/bracket-view'
import { renderWithProviders, mockMatch } from '@/__tests__/utils/test-utils'

describe('BracketView', () => {
  it('renders the bracket workspace when matches exist', () => {
    const matches = [
      mockMatch({ id: 'm1', round: 1, match_number: 1 }),
      mockMatch({ id: 'm2', round: 2, match_number: 1 }),
    ]

    renderWithProviders(<BracketView matches={matches} participants={[]} />)

    // Non-empty branch: the search/filter control renders and the empty state is gone.
    expect(
      screen.getByPlaceholderText(/Search by player name or match number/i)
    ).toBeInTheDocument()
    expect(screen.queryByText(/No matches found/i)).not.toBeInTheDocument()
  })

  it('renders empty state when no matches', () => {
    renderWithProviders(<BracketView matches={[]} participants={[]} />)

    expect(screen.getByText(/No matches found/i)).toBeInTheDocument()
  })

  it('resolves participant names from the participants prop', () => {
    // BracketView shows "TBD"/"BYE" until the participants prop lets it resolve
    // a player_id to a real name; verify that resolution renders.
    const matches = [
      mockMatch({
        id: 'm1',
        round: 1,
        match_number: 1,
        player1_id: 'p1',
        player2_id: 'p2',
        status: 'completed',
      }),
    ]
    const participants = [
      { player_id: 'p1', player: { first_name: 'Alice', last_name: 'Smith', belt_level: 'Blue' }, team: { name: 'Team A' } },
      { player_id: 'p2', player: { first_name: 'Bob', last_name: 'Jones', belt_level: 'Blue' }, team: { name: 'Team B' } },
    ]

    // Names render inside the SVG bracket (text split across <tspan>s), so assert
    // on the rendered text content rather than a single text node.
    const { container } = renderWithProviders(
      <BracketView matches={matches} participants={participants} />
    )

    expect(container.textContent).toContain('Alice Smith')
    expect(container.textContent).toContain('Bob Jones')
  })
})
