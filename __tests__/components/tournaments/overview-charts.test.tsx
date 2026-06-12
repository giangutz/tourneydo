import '@testing-library/jest-dom'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/__tests__/utils/test-utils'
import {
  TeamDelegationsChart,
  BeltDistributionChart,
  GenderSplitChart,
} from '@/components/tournaments/overview/charts'

type ChartParticipant = {
  id: string
  players: { belt_level: string | null; gender: string | null }
  teams?: { name: string } | null
}

const sampleParticipants: ChartParticipant[] = [
  { id: '1', players: { belt_level: 'Blue', gender: 'male' }, teams: { name: 'Tigers' } },
  { id: '2', players: { belt_level: 'Red', gender: 'female' }, teams: { name: 'Dragons' } },
]

describe('Overview charts empty states', () => {
  describe('with no participants (newly created tournament)', () => {
    it('TeamDelegationsChart shows an empty state instead of an empty graph', () => {
      renderWithProviders(<TeamDelegationsChart participants={[]} />)
      // Card title still renders so the section stays recognizable
      expect(screen.getByText('Biggest Delegations')).toBeInTheDocument()
      expect(screen.getByText(/Team delegations will appear here/i)).toBeInTheDocument()
    })

    it('BeltDistributionChart shows an empty state', () => {
      renderWithProviders(<BeltDistributionChart participants={[]} />)
      expect(screen.getByText('Belt Distribution')).toBeInTheDocument()
      expect(screen.getByText(/Belt distribution will appear/i)).toBeInTheDocument()
    })

    it('GenderSplitChart shows an empty state', () => {
      renderWithProviders(<GenderSplitChart participants={[]} />)
      expect(screen.getByText('Gender Split')).toBeInTheDocument()
      expect(screen.getByText(/gender split will appear/i)).toBeInTheDocument()
    })
  })

  describe('with participants', () => {
    it('TeamDelegationsChart does not show the empty state', () => {
      renderWithProviders(<TeamDelegationsChart participants={sampleParticipants} />)
      expect(screen.queryByText(/Team delegations will appear here/i)).not.toBeInTheDocument()
    })

    it('BeltDistributionChart does not show the empty state', () => {
      renderWithProviders(<BeltDistributionChart participants={sampleParticipants} />)
      expect(screen.queryByText(/Belt distribution will appear/i)).not.toBeInTheDocument()
    })

    it('GenderSplitChart does not show the empty state', () => {
      renderWithProviders(<GenderSplitChart participants={sampleParticipants} />)
      expect(screen.queryByText(/gender split will appear/i)).not.toBeInTheDocument()
    })
  })
})
