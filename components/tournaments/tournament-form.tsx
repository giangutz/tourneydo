'use client'

import { useActionState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createTournament, updateTournament, type TournamentFormState } from '@/lib/actions/tournaments'
import { Tournament } from '@/types/models'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { useRouter } from 'next/navigation'
import { routes } from '@/config/routes'

interface TournamentFormProps {
  tournament?: Tournament
}

const initialState: TournamentFormState = {
  error: '',
  fieldErrors: {},
  success: false,
}

export function TournamentForm({ tournament }: TournamentFormProps) {
  const router = useRouter()
  const action = tournament
    ? updateTournament.bind(null, tournament.id)
    : createTournament

  const [state, formAction, isPending] = useActionState(action, initialState)

  useEffect(() => {
    if (state?.error) {
      toast.error(state.error)
    }
    if (state?.success) {
      if (tournament) {
        toast.success('Tournament updated successfully')
        router.push(routes.organizer.tournamentDetail(tournament.id))
      } else if (state.tournamentId) {
        toast.success('Tournament created successfully')
        router.push(routes.organizer.tournamentDetail(state.tournamentId))
      }
    }
  }, [state, tournament, router])

  return (
    <Card>
      <CardHeader>
        <CardTitle>{tournament ? 'Edit Tournament' : 'Create Tournament'}</CardTitle>
        <CardDescription>
          {tournament
            ? 'Update the details of your tournament.'
            : 'Fill in the details to create a new tournament.'}
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Tournament Name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={tournament?.name}
              placeholder="e.g. Summer Championship 2025"
              required
            />
            {state.fieldErrors?.name && (
              <p className="text-sm text-destructive">{state.fieldErrors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tournament_type">Tournament Type</Label>
            <Select name="tournament_type" defaultValue={tournament?.tournament_type || 'standard'} required>
              <SelectTrigger>
                <SelectValue placeholder="Select tournament type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="open-belt">Open Belt</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              <strong>Standard:</strong> Participants are grouped by belt level within divisions. 
              <strong className="ml-2">Open Belt:</strong> All belt levels compete together in the same division.
            </p>
            {state.fieldErrors?.tournament_type && (
              <p className="text-sm text-destructive">{state.fieldErrors.tournament_type}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                name="start_date"
                type="date"
                defaultValue={tournament?.start_date ? new Date(tournament.start_date).toISOString().split('T')[0] : ''}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                name="end_date"
                type="date"
                defaultValue={tournament?.end_date ? new Date(tournament.end_date).toISOString().split('T')[0] : ''}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={tournament?.description || ''}
              placeholder="Describe your tournament..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entry_fee">Entry Fee ($)</Label>
              <Input
                id="entry_fee"
                name="entry_fee"
                type="number"
                min="0"
                step="0.01"
                defaultValue={tournament?.entry_fee || ''}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_players">Max Participants</Label>
              <Input
                id="max_players"
                name="max_players"
                type="number"
                min="1"
                defaultValue={tournament?.max_players || ''}
                placeholder="Unlimited"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="courts">Number of Courts</Label>
              <Input
                id="courts"
                name="courts"
                type="number"
                min="1"
                defaultValue={tournament?.courts || ''}
                placeholder="e.g. 3"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="venue">Venue</Label>
            <Input
              id="venue"
              name="venue"
              defaultValue={tournament?.venue || ''}
              placeholder="e.g. City Sports Center"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="registration_deadline">Registration Deadline</Label>
            <Input
              id="registration_deadline"
              name="registration_deadline"
              type="date"
              defaultValue={tournament?.registration_deadline ? new Date(tournament.registration_deadline).toISOString().split('T')[0] : ''}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select name="status" defaultValue={tournament?.status || 'upcoming'}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="ongoing">Ongoing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
        </CardContent>
        <CardFooter className="flex justify-end space-x-2">
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {tournament ? 'Update Tournament' : 'Create Tournament'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
