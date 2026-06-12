import '@testing-library/jest-dom'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TournamentCreateWizard } from '@/components/tournaments/tournament-create-wizard'
import { renderWithProviders, mockTournament } from '@/__tests__/utils/test-utils'
import { createTournament, updateTournament } from '@/lib/actions/tournaments'

// Mock the server actions — these are the side effects we assert on.
jest.mock('@/lib/actions/tournaments', () => ({
  createTournament: jest.fn(),
  updateTournament: jest.fn(),
}))

// Mock toast so success/error notifications don't blow up in jsdom.
jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}))

const mockCreate = createTournament as jest.Mock
const mockUpdate = updateTournament as jest.Mock

// Consistent dates that satisfy every cross-field refinement in tournamentFormSchema:
//   end >= start, registration_deadline <= start, weigh_in_end >= weigh_in_start
const VALID_DATES = {
  start: '2026-06-01',
  end: '2026-06-03',
  weighInStart: '2026-05-30',
  weighInEnd: '2026-05-31',
  registrationDeadline: '2026-05-20',
}

function fillStep1Basics() {
  fireEvent.change(screen.getByLabelText('Tournament Name'), { target: { value: 'Spring Open' } })
  fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: VALID_DATES.start } })
  fireEvent.change(screen.getByLabelText('End Date'), { target: { value: VALID_DATES.end } })
  fireEvent.change(screen.getByLabelText('Weigh-In Start'), { target: { value: VALID_DATES.weighInStart } })
  fireEvent.change(screen.getByLabelText('Weigh-In End'), { target: { value: VALID_DATES.weighInEnd } })
}

function fillStep2Logistics() {
  fireEvent.change(screen.getByLabelText('Venue'), { target: { value: 'Main Arena' } })
  fireEvent.change(screen.getByLabelText('Registration Deadline'), {
    target: { value: VALID_DATES.registrationDeadline },
  })
}

/** Drive the wizard from step 1 to step 3, filling the required fields along the way. */
async function advanceToStep3(user: ReturnType<typeof userEvent.setup>) {
  fillStep1Basics()
  await user.click(screen.getByRole('button', { name: 'Next' }))
  await screen.findByLabelText('Venue')

  fillStep2Logistics()
  await user.click(screen.getByRole('button', { name: 'Next' }))
  await screen.findByText('Gender Configuration')
}

describe('TournamentCreateWizard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCreate.mockResolvedValue({ success: true, tournamentId: 'new-tournament-id' })
    mockUpdate.mockResolvedValue({ success: true })
  })

  describe('create mode', () => {
    it('renders step 1 with the progress indicator and no submit button', () => {
      renderWithProviders(<TournamentCreateWizard />)

      // Card title
      expect(screen.getByText('Create Tournament', { selector: 'div' })).toBeInTheDocument()
      // Step heading
      expect(screen.getByText(/Step 1: Basic Info/)).toBeInTheDocument()
      // Progress indicator labels for all three steps
      expect(screen.getByText('Basic Info')).toBeInTheDocument()
      expect(screen.getByText('Logistics')).toBeInTheDocument()
      expect(screen.getByText('Competition Rules')).toBeInTheDocument()
      // Step 1 fields
      expect(screen.getByLabelText('Tournament Name')).toBeInTheDocument()
      expect(screen.getByLabelText('Start Date')).toBeInTheDocument()
      // Navigation: Next exists, but no create/submit button yet
      expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Create Tournament' })).not.toBeInTheDocument()
    })

    it('blocks advancing past step 1 when required fields are empty', async () => {
      const user = userEvent.setup()
      renderWithProviders(<TournamentCreateWizard />)

      await user.click(screen.getByRole('button', { name: 'Next' }))

      // Still on step 1 — step 2's Venue field never appears
      await waitFor(() => {
        expect(screen.getByText(/Step 1: Basic Info/)).toBeInTheDocument()
      })
      expect(screen.queryByLabelText('Venue')).not.toBeInTheDocument()
      expect(mockCreate).not.toHaveBeenCalled()
    })

    it('advances through all three steps with valid input', async () => {
      const user = userEvent.setup()
      renderWithProviders(<TournamentCreateWizard />)

      await advanceToStep3(user)

      // Step 3 content + the explicit submit button are present
      expect(screen.getByText('Allowed Belt Levels')).toBeInTheDocument()
      expect(screen.getByText('Enabled Divisions')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Create Tournament' })).toBeInTheDocument()
    })

    // Regression: Radix RadioCard/Checkbox render as <button>; without type="button"
    // they default to submit and created the tournament prematurely on step 3.
    it('does NOT create the tournament when toggling options on step 3', async () => {
      const user = userEvent.setup()
      renderWithProviders(<TournamentCreateWizard />)

      await advanceToStep3(user)

      await user.click(screen.getByText('Male Only'))
      await user.click(screen.getByRole('checkbox', { name: 'Beginner' }))
      await user.click(screen.getByRole('checkbox', { name: /Cadet/ }))

      // Give any erroneous submission a chance to fire
      await new Promise((r) => setTimeout(r, 0))

      expect(mockCreate).not.toHaveBeenCalled()
      // Still on step 3
      expect(screen.getByText('Gender Configuration')).toBeInTheDocument()
    })

    it('creates the tournament only when "Create Tournament" is clicked', async () => {
      const user = userEvent.setup()
      renderWithProviders(<TournamentCreateWizard />)

      await advanceToStep3(user)
      await user.click(screen.getByRole('button', { name: 'Create Tournament' }))

      await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1))

      const [prevState, formData] = mockCreate.mock.calls[0]
      expect(prevState).toBeNull()
      expect(formData).toBeInstanceOf(FormData)
      expect(formData.get('name')).toBe('Spring Open')
      expect(formData.get('venue')).toBe('Main Arena')
      expect(mockUpdate).not.toHaveBeenCalled()
    })
  })

  describe('edit mode', () => {
    it('renders prefilled values with edit-specific copy', () => {
      const tournament = mockTournament()
      renderWithProviders(<TournamentCreateWizard tournament={tournament} />)

      expect(screen.getByText('Edit Tournament', { selector: 'div' })).toBeInTheDocument()
      expect(screen.getByDisplayValue(tournament.name)).toBeInTheDocument()
      // Step 1 dates are prefilled from the existing tournament
      expect(screen.getByLabelText('Start Date')).toHaveValue(tournament.start_date)
    })

    it('calls updateTournament (not createTournament) on submit', async () => {
      const user = userEvent.setup()
      // Existing tournaments created before weigh-in dates were required may lack them;
      // supply consistent dates so the now-required step 1 fields validate.
      const tournament = mockTournament({
        start_date: VALID_DATES.start,
        end_date: VALID_DATES.end,
        weigh_in_start: VALID_DATES.weighInStart,
        weigh_in_end: VALID_DATES.weighInEnd,
        registration_deadline: VALID_DATES.registrationDeadline,
      })
      renderWithProviders(
        <TournamentCreateWizard tournament={tournament} initialEnabledDivisions={['Cadet', 'Junior']} />
      )

      // All fields prefilled — just walk forward.
      await user.click(screen.getByRole('button', { name: 'Next' }))
      await screen.findByLabelText('Venue')
      await user.click(screen.getByRole('button', { name: 'Next' }))
      await screen.findByText('Gender Configuration')

      await user.click(screen.getByRole('button', { name: 'Save Changes' }))

      await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1))
      const [id, prevState, formData] = mockUpdate.mock.calls[0]
      expect(id).toBe(tournament.id)
      expect(prevState).toBeNull()
      expect(formData).toBeInstanceOf(FormData)
      expect(mockCreate).not.toHaveBeenCalled()
    })
  })
})
