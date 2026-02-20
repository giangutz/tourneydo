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
  initialEnabledDivisions?: string[]
  availableDivisions?: { name: string }[]
}

export function TournamentForm({ tournament, initialEnabledDivisions, availableDivisions = [] }: TournamentFormProps) {
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
    gender_preference: (tournament?.gender_preference as any) || 'mixed',
    allowed_belt_groups: tournament?.allowed_belt_groups ?? undefined,
    division_move_policy: (tournament?.division_move_policy as any) || 'allow_move',
    divisions: initialEnabledDivisions ? JSON.stringify(initialEnabledDivisions) : undefined
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
          if (Array.isArray(value)) {
            // Append each item individually for standard FormData handling
            // This works better with getAll() on server
            if (key === 'divisions') {
               // specific exception: divisions is expected as a JSON string by the server schema currently
               formData.append(key, JSON.stringify(value))
            } else {
               value.forEach((v: any) => formData.append(key, v))
            }
          } else {
            formData.append(key, value.toString())
          }
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            {/* Division Configuration */}
            <div className="space-y-6">
                <div className="space-y-4 border rounded-md p-4 bg-muted/20">
                  <div className="space-y-1">
                    <FormLabel className="text-base">Gender Configuration</FormLabel>
                    <FormDescription>
                      Select the gender format for this tournament. This will automatically configure the available categories.
                    </FormDescription>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      { value: 'mixed', label: 'Mixed (All)' },
                      { value: 'male', label: 'Male Only' },
                      { value: 'female', label: 'Female Only' }
                    ].map((option) => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id={`gender-${option.value}`}
                          name="gender_pref"
                          value={option.value}
                          defaultChecked={tournament?.gender_preference ? tournament.gender_preference === option.value : option.value === 'mixed'}
                          className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                          onChange={(e) => {
                            form.setValue('gender_preference', e.target.value as any)
                          }}
                        />
                        <label 
                          htmlFor={`gender-${option.value}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {option.label}
                        </label>
                      </div>
                    ))}
                  </div>
                   {/* Initialize default value */}
                  <input type="hidden" {...form.register('gender_preference')} defaultValue="mixed" />
                </div>

                <div className="space-y-4 border rounded-md p-4 bg-muted/20">
                  <div className="space-y-1">
                    <FormLabel className="text-base">Weigh-In Division Movement Policy</FormLabel>
                    <FormDescription>
                      Control what happens when a participant's actual weight/height is out of range during weigh-in.
                    </FormDescription>
                  </div>
                  <div className="space-y-3">
                    {[
                      { 
                        value: 'allow_move', 
                        label: 'Allow Division Moves',
                        description: 'Participants can be moved to a different division if their measurements are out of range'
                      },
                      { 
                        value: 'disqualify_only', 
                        label: 'Disqualify Only',
                        description: 'Participants must be disqualified if measurements are out of range (no division moves allowed)'
                      }
                    ].map((option) => (
                      <div key={option.value} className="flex items-start space-x-3 rounded-lg border p-3 hover:bg-accent">
                        <input
                          type="radio"
                          id={`policy-${option.value}`}
                          name="division_move_policy"
                          value={option.value}
                          defaultChecked={tournament?.division_move_policy ? tournament.division_move_policy === option.value : option.value === 'allow_move'}
                          className="mt-1 h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                          onChange={(e) => {
                            form.setValue('division_move_policy', e.target.value as any)
                          }}
                        />
                        <label 
                          htmlFor={`policy-${option.value}`}
                          className="flex-1 cursor-pointer"
                        >
                          <div className="font-medium">{option.label}</div>
                          <div className="text-sm text-muted-foreground">{option.description}</div>
                        </label>
                      </div>
                    ))}
                  </div>
                  {/* Initialize default value */}
                  <input type="hidden" {...form.register('division_move_policy')} defaultValue="allow_move" />
                </div>

                <div className="space-y-4 border rounded-md p-4 bg-muted/20">
                  <div className="space-y-1">
                    <FormLabel className="text-base">Allowed Belt Levels</FormLabel>
                    <FormDescription>
                      Select which belt groups can interact/register for this tournament.
                    </FormDescription>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {['Beginner', 'Novice', 'Advanced I', 'Advanced II'].map((group) => (
                      <div key={group} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`belt-${group.replace(/\s/g, '')}`}
                          defaultChecked={tournament?.allowed_belt_groups ? tournament.allowed_belt_groups.includes(group) : true}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          onChange={(e) => {
                             const current = form.getValues('allowed_belt_groups') || ['Beginner', 'Novice', 'Advanced I', 'Advanced II']
                             let next: string[]
                             if (e.target.checked) {
                               next = [...current, group]
                             } else {
                               next = current.filter((g) => g !== group)
                             }
                             form.setValue('allowed_belt_groups', next)
                          }}
                        />
                        <label 
                          htmlFor={`belt-${group.replace(/\s/g, '')}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {group}
                        </label>
                      </div>
                    ))}
                  </div>
                  {/* Initialize default value - using a custom logic to sync with form state since we don't have a direct field for array in UI easily without specialized component */}
                  {/* We just need to make sure the form knows about it */}
                </div>

                <div className="space-y-4 border rounded-md p-4">
                   <div className="space-y-1">
                    <FormLabel className="text-base">Enabled Divisions</FormLabel>
                    <FormDescription>
                      Select which divisions to include. You can always change this later in Division Settings.
                    </FormDescription>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(availableDivisions.length > 0 ? availableDivisions : [{name: 'Gradeschool'}, {name: 'Cadet'}, {name: 'Junior'}, {name: 'Senior'}]).map((div) => (
                      <div key={div.name} className="flex items-center space-x-2">
                         <input
                          type="checkbox"
                          id={`div-${div.name}`}
                          defaultChecked={initialEnabledDivisions ? initialEnabledDivisions.includes(div.name) : true}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          onChange={(e) => {
                             // Helper to get current array from form state or default
                            const val = form.getValues('divisions')
                            const defaultDivs = (availableDivisions.length > 0 ? availableDivisions : [{name: 'Gradeschool'}, {name: 'Cadet'}, {name: 'Junior'}, {name: 'Senior'}]).map(d => d.name)
                            const current = val ? JSON.parse(val) : (initialEnabledDivisions || defaultDivs)
                            
                            let next: string[]
                            if (e.target.checked) {
                               next = [...current, div.name]
                            } else {
                               next = current.filter((d: string) => d !== div.name)
                            }
                            form.setValue('divisions', JSON.stringify(next))
                          }}
                        />
                        <label 
                          htmlFor={`div-${div.name}`} 
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {div.name}
                        </label>
                      </div>
                    ))}
                  </div>
                  {/* Initialize default value */}
                  {/* Initialize default value */}
                  <input type="hidden" {...form.register('divisions')} defaultValue={JSON.stringify(initialEnabledDivisions || (availableDivisions.length > 0 ? availableDivisions.map(d => d.name) : ['Gradeschool', 'Cadet', 'Junior', 'Senior']))} />
                </div>
              </div>
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
