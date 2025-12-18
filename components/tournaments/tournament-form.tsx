'use client'

import { useTransition } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { createTournament, updateTournament } from '@/lib/actions/tournaments'
import { Tournament } from '@/types/models'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { routes } from '@/config/routes'
import { TournamentFormInput, tournamentFormSchema } from '@/lib/validations/tournament'

interface TournamentFormProps {
  tournament?: Tournament
}

export function TournamentForm({ tournament }: TournamentFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const defaultValues: TournamentFormInput = {
    name: tournament?.name || '',
    start_date: tournament?.start_date ? new Date(tournament.start_date).toISOString().split('T')[0] : '',
    end_date: tournament?.end_date ? new Date(tournament.end_date).toISOString().split('T')[0] : '',
    weigh_in_start: tournament?.weigh_in_start ? new Date(tournament.weigh_in_start).toISOString().split('T')[0] : '',
    weigh_in_end: tournament?.weigh_in_end ? new Date(tournament.weigh_in_end).toISOString().split('T')[0] : '',
    description: tournament?.description || '',
    entry_fee: tournament?.entry_fee ?? null,
    venue: tournament?.venue || '',
    max_players: tournament?.max_players ?? null,
    registration_deadline: tournament?.registration_deadline ? new Date(tournament.registration_deadline).toISOString().split('T')[0] : '',
    courts: (tournament?.courts as any) ?? null,
    status: (tournament?.status as any) || 'upcoming',
    tournament_type: (tournament?.tournament_type as any) || 'standard',
  }

  const form = useForm<TournamentFormInput>({
    resolver: zodResolver(tournamentFormSchema) as Resolver<TournamentFormInput>,
    defaultValues,
  })

  function onSubmit(data: TournamentFormInput) {
    startTransition(async () => {
      const formData = new FormData()
      Object.entries(data).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formData.append(key, value.toString())
        } else {
          formData.append(key, '')
        }
      })

      const result = tournament
        ? await updateTournament(tournament.id, null, formData)
        : await createTournament(null, formData)

      if (result?.error) {
        toast.error(result.error)
      } else if (result?.success) {
        toast.success(tournament ? 'Tournament updated' : 'Tournament created')
        if (result.tournamentId) {
          router.push(routes.organizer.tournamentDetail(result.tournamentId))
        } else if (tournament) {
          router.push(routes.organizer.tournamentDetail(tournament.id))
        }
      }
    })
  }

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
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tournament Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Summer Championship 2025" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tournament_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tournament Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select tournament type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="open-belt">Open Belt</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    <strong>Standard:</strong> Grouped by belt level. <strong>Open Belt:</strong> All belts compete together.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="weigh_in_start"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weigh-In Start</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="weigh_in_end"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weigh-In End</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe your tournament..." {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="entry_fee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entry Fee (₱)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0.00" 
                        min="0" 
                        step="0.01"
                        {...field} 
                        value={field.value ?? ''} 
                        onChange={(e) => {
                          const val = e.target.value
                          field.onChange(val === '' ? null : Number(val))
                        }}
                      />
                    </FormControl>
                    <FormDescription>Leave blank if there's no entry fee.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="max_players"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Participants</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Unlimited" 
                        min="1"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const val = e.target.value
                          field.onChange(val === '' ? null : Number(val))
                        }}
                      />
                    </FormControl>
                    <FormDescription>Leave blank for unlimited participants.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="courts"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Courts</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="e.g. 3" 
                        min="1"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const val = e.target.value
                          field.onChange(val === '' ? null : Number(val))
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="venue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Venue</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. City Sports Center" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="registration_deadline"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Registration Deadline</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="ongoing">Ongoing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <CardFooter className="flex justify-end space-x-2 px-0 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {tournament ? 'Update Tournament' : 'Create Tournament'}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
