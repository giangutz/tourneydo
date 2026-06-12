'use client'

import { useState, useTransition } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
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
import { RadioGroup, RadioCard } from '@/components/ui/radio-group-card'
import { Checkbox } from '@/components/ui/checkbox'
import { createTournament, updateTournament } from '@/lib/actions/tournaments'
import { Tournament } from '@/types/models'
import { TournamentFormInput, tournamentFormSchema } from '@/lib/validations/tournament'
import { Loader2, Check, Trophy, MapPin, Settings } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { routes } from '@/config/routes'
import { cn } from '@/lib/utils'

// ─── Step definitions ───────────────────────────────────────────────────────

const STEPS = [
  { label: 'Basic Info', description: 'Name, type & dates', icon: Trophy },
  { label: 'Logistics', description: 'Venue, fees & capacity', icon: MapPin },
  { label: 'Competition Rules', description: 'Divisions & policies', icon: Settings },
]

const STEP_FIELDS: (keyof TournamentFormInput)[][] = [
  ['name', 'tournament_type', 'start_date', 'end_date', 'weigh_in_start', 'weigh_in_end'],
  ['venue', 'registration_deadline', 'entry_fee', 'max_players', 'courts', 'status'],
  [],
]

const BELT_GROUPS = ['Beginner', 'Novice', 'Advanced I', 'Advanced II']
const DEFAULT_DIVISIONS = ['Gradeschool', 'Cadet', 'Junior', 'Senior']

// ─── Step progress indicator ────────────────────────────────────────────────

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center w-full mb-8">
      {STEPS.map((step, index) => {
        const isCompleted = index < currentStep
        const isCurrent = index === currentStep

        return (
          <div key={step.label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'flex items-center justify-center w-9 h-9 rounded-full border-2 text-sm font-semibold transition-all',
                  isCompleted && 'bg-primary border-primary text-primary-foreground',
                  isCurrent && 'border-primary text-primary bg-primary/10',
                  !isCompleted && !isCurrent && 'border-muted-foreground/30 text-muted-foreground/50'
                )}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
              </div>
              <div className="text-center">
                <p
                  className={cn(
                    'text-xs font-medium',
                    isCurrent ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {step.label}
                </p>
              </div>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  'h-0.5 flex-1 mx-2 mb-5 transition-all',
                  isCompleted ? 'bg-primary' : 'bg-muted-foreground/20'
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Main wizard ────────────────────────────────────────────────────────────

interface TournamentCreateWizardProps {
  /** When provided, the wizard runs in edit mode and updates this tournament. */
  tournament?: Tournament
  /** Names of divisions currently enabled for the tournament (edit mode). */
  initialEnabledDivisions?: string[]
}

// Normalize a stored date (ISO timestamp or date) to a yyyy-MM-dd value for <input type="date">.
function toDateInputValue(value: string | null | undefined): string {
  if (!value) return ''
  return new Date(value).toISOString().split('T')[0]
}

export function TournamentCreateWizard({
  tournament,
  initialEnabledDivisions,
}: TournamentCreateWizardProps = {}) {
  const router = useRouter()
  const isEditing = Boolean(tournament)
  const [isPending, startTransition] = useTransition()
  const [currentStep, setCurrentStep] = useState(0)

  const form = useForm<TournamentFormInput>({
    resolver: zodResolver(tournamentFormSchema) as Resolver<TournamentFormInput>,
    defaultValues: {
      name: tournament?.name ?? '',
      start_date: toDateInputValue(tournament?.start_date),
      end_date: toDateInputValue(tournament?.end_date),
      weigh_in_start: toDateInputValue(tournament?.weigh_in_start),
      weigh_in_end: toDateInputValue(tournament?.weigh_in_end),
      description: tournament?.description ?? '',
      entry_fee: tournament?.entry_fee ?? null,
      venue: tournament?.venue ?? '',
      max_players: tournament?.max_players ?? null,
      registration_deadline: toDateInputValue(tournament?.registration_deadline),
      courts: tournament?.courts ?? null,
      status: tournament?.status ?? 'upcoming',
      tournament_type: tournament?.tournament_type ?? 'standard',
      gender_preference: tournament?.gender_preference ?? 'mixed',
      allowed_belt_groups: tournament?.allowed_belt_groups ?? BELT_GROUPS,
      division_move_policy: tournament?.division_move_policy ?? 'allow_move',
      divisions: JSON.stringify(
        initialEnabledDivisions && initialEnabledDivisions.length > 0
          ? initialEnabledDivisions
          : DEFAULT_DIVISIONS
      ),
    },
  })

  async function handleNext() {
    const fields = STEP_FIELDS[currentStep]
    const valid = fields.length > 0 ? await form.trigger(fields) : true
    if (valid) setCurrentStep((s) => s + 1)
  }

  function handleBack() {
    setCurrentStep((s) => s - 1)
  }

  function onSubmit(data: TournamentFormInput) {
    startTransition(async () => {
      const formData = new FormData()
      Object.entries(data).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          if (Array.isArray(value)) {
            if (key === 'divisions') {
              formData.append(key, JSON.stringify(value))
            } else {
              value.forEach((v: string) => formData.append(key, v))
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
        toast.success(isEditing ? 'Tournament updated' : 'Tournament created')
        if (result.tournamentId) {
          router.push(routes.organizer.tournamentDetail(result.tournamentId))
        } else if (tournament) {
          router.push(routes.organizer.tournamentDetail(tournament.id))
        }
      }
    })
  }

  const stepMeta = STEPS[currentStep]

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? 'Edit Tournament' : 'Create Tournament'}</CardTitle>
        <CardDescription>
          {isEditing
            ? `Update the settings for ${tournament?.name}.`
            : 'Fill in the details to set up your new tournament.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <StepIndicator currentStep={currentStep} />

        <div className="mb-6">
          <h3 className="text-base font-semibold">
            Step {currentStep + 1}: {stepMeta.label}
          </h3>
          <p className="text-sm text-muted-foreground">{stepMeta.description}</p>
        </div>

        <Form {...form}>
          {/*
            Block ALL implicit form submission. Radix UI primitives (RadioCard,
            Checkbox) render as <button> elements; without this guard a stray
            click — or the Enter key — could submit the form prematurely.
            Creation happens ONLY via the explicit "Create Tournament" button below.
          */}
          <form onSubmit={(e) => e.preventDefault()} className="space-y-4">

            {/* ── Step 1: Basic Info ─────────────────────────────────────── */}
            {currentStep === 0 && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tournament Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Summer Championship 2026" {...field} />
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
                      <RadioGroup value={field.value} onValueChange={field.onChange} className="grid-cols-2">
                        <RadioCard
                          value="standard"
                          title="Standard"
                          description="Participants compete within their belt group."
                        />
                        <RadioCard
                          value="open-belt"
                          title="Open Belt"
                          description="All belt levels compete together in the same bracket."
                        />
                      </RadioGroup>
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
                      <FormLabel>Description <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe your tournament..."
                          className="resize-none"
                          rows={3}
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* ── Step 2: Logistics ──────────────────────────────────────── */}
            {currentStep === 1 && (
              <div className="space-y-4">
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
                      <FormDescription>Must be on or before the tournament start date.</FormDescription>
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
                        <FormDescription>Leave blank for no fee.</FormDescription>
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
                        <FormDescription>Leave blank for unlimited.</FormDescription>
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
                </div>
              </div>
            )}

            {/* ── Step 3: Competition Rules ──────────────────────────────── */}
            {currentStep === 2 && (
              <div className="space-y-6">
                {/* Gender preference */}
                <FormField
                  control={form.control}
                  name="gender_preference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">Gender Configuration</FormLabel>
                      <FormDescription>
                        Determines which gender categories are available. Automatically configures the division structure.
                      </FormDescription>
                      <RadioGroup value={field.value} onValueChange={field.onChange} className="grid-cols-3 mt-2">
                        <RadioCard value="mixed" title="Mixed" description="All genders compete (male & female categories)" />
                        <RadioCard value="male" title="Male Only" description="Only male categories are enabled" />
                        <RadioCard value="female" title="Female Only" description="Only female categories are enabled" />
                      </RadioGroup>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Division move policy */}
                <FormField
                  control={form.control}
                  name="division_move_policy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">Weigh-In Division Movement Policy</FormLabel>
                      <FormDescription>
                        What happens when a participant's weight/height is out of range during weigh-in.
                      </FormDescription>
                      <RadioGroup value={field.value} onValueChange={field.onChange} className="grid-cols-1 sm:grid-cols-2 mt-2">
                        <RadioCard
                          value="allow_move"
                          title="Allow Division Moves"
                          description="Participants can be reassigned to a different division if their measurements are out of range."
                        />
                        <RadioCard
                          value="disqualify_only"
                          title="Disqualify Only"
                          description="Participants are disqualified if measurements are out of range — no division moves allowed."
                        />
                      </RadioGroup>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Allowed belt levels */}
                <FormField
                  control={form.control}
                  name="allowed_belt_groups"
                  render={({ field }) => {
                    const selected: string[] = field.value ?? BELT_GROUPS
                    return (
                      <FormItem>
                        <FormLabel className="text-base">Allowed Belt Levels</FormLabel>
                        <FormDescription>
                          Select which belt groups can register for this tournament.
                        </FormDescription>
                        <div className="grid grid-cols-2 gap-3 mt-2">
                          {BELT_GROUPS.map((group) => (
                            <label
                              key={group}
                              className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-accent transition-colors"
                            >
                              <Checkbox
                                checked={selected.includes(group)}
                                onCheckedChange={(checked) => {
                                  const next = checked
                                    ? [...selected, group]
                                    : selected.filter((g) => g !== group)
                                  field.onChange(next)
                                }}
                              />
                              <span className="text-sm font-medium">{group}</span>
                            </label>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )
                  }}
                />

                {/* Enabled divisions */}
                <FormField
                  control={form.control}
                  name="divisions"
                  render={({ field }) => {
                    const selected: string[] = field.value ? JSON.parse(field.value) : DEFAULT_DIVISIONS
                    return (
                      <FormItem>
                        <FormLabel className="text-base">Enabled Divisions</FormLabel>
                        <FormDescription>
                          Select which age divisions to include. You can adjust this later in Division Settings.
                        </FormDescription>
                        <div className="grid grid-cols-2 gap-3 mt-2">
                          {DEFAULT_DIVISIONS.map((div) => (
                            <label
                              key={div}
                              className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-accent transition-colors"
                            >
                              <Checkbox
                                checked={selected.includes(div)}
                                onCheckedChange={(checked) => {
                                  const next = checked
                                    ? [...selected, div]
                                    : selected.filter((d) => d !== div)
                                  field.onChange(JSON.stringify(next))
                                }}
                              />
                              <div>
                                <p className="text-sm font-medium">{div}</p>
                                <p className="text-xs text-muted-foreground">
                                  {div === 'Gradeschool' && 'Age ≤ 11'}
                                  {div === 'Cadet' && 'Age 12–14'}
                                  {div === 'Junior' && 'Age 15–17'}
                                  {div === 'Senior' && 'Age 18+'}
                                </p>
                              </div>
                            </label>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )
                  }}
                />
              </div>
            )}

            {/* ── Navigation ─────────────────────────────────────────────── */}
            <div className="flex justify-between pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={currentStep === 0 ? () => router.back() : handleBack}
              >
                {currentStep === 0 ? 'Cancel' : 'Back'}
              </Button>

              {currentStep < STEPS.length - 1 ? (
                <Button type="button" onClick={handleNext}>
                  Next
                </Button>
              ) : (
                <Button type="button" disabled={isPending} onClick={form.handleSubmit(onSubmit)}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEditing ? 'Save Changes' : 'Create Tournament'}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
