'use client'

import * as React from 'react'
import Image from 'next/image'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Trophy,
  Users2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  CalendarDays,
  BarChart3,
  Bell,
  Layout,
  FileDown,
  Loader2,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { RadioCard } from '@/components/ui/radio-group-card'
import { RadioGroup } from '@/components/ui/radio-group'
import { onboardingSchema, type OnboardingInput } from '@/lib/validations/user'
import { getDashboardRoute } from '@/config/routes'
import { completeOnboarding } from '@/app/onboarding/_actions'

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 'role-select' | 'coach-setup' | 'confirm'
type Role = 'tournament-organizer' | 'coach' | null

// ─── Left-panel content per role ─────────────────────────────────────────────

const PANEL_CONTENT: Record<
  string,
  { headline: string; sub: string; bullets: { icon: React.ReactNode; text: string }[] }
> = {
  default: {
    headline: 'Welcome to TourneyDo',
    sub: 'Everything you need to run world-class martial arts tournaments.',
    bullets: [
      { icon: <Layout className="h-4 w-4" />, text: 'Brackets generated in minutes' },
      { icon: <BarChart3 className="h-4 w-4" />, text: 'Live real-time scoring' },
      { icon: <Bell className="h-4 w-4" />, text: 'Coach & athlete coordination' },
    ],
  },
  'tournament-organizer': {
    headline: 'Built for tournament directors',
    sub: 'Run larger, smoother events with less manual work.',
    bullets: [
      { icon: <Layout className="h-4 w-4" />, text: 'Drag-and-drop bracket builder' },
      { icon: <CalendarDays className="h-4 w-4" />, text: 'Multi-court auto-scheduling' },
      { icon: <FileDown className="h-4 w-4" />, text: 'Export results to PDF & CSV' },
    ],
  },
  coach: {
    headline: 'Your team deserves the best',
    sub: 'From registration to the podium — manage everything in one place.',
    bullets: [
      { icon: <Users2 className="h-4 w-4" />, text: 'Register players in one tap' },
      { icon: <BarChart3 className="h-4 w-4" />, text: 'Track your athletes’ stats over time' },
      { icon: <Bell className="h-4 w-4" />, text: 'Get notified when schedule changes' },
    ],
  },
}

// ─── Animation variants ───────────────────────────────────────────────────────

const stepVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 40 : -40 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -40 : 40 }),
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const { user } = useUser()
  const router = useRouter()

  const [step, setStep] = React.useState<Step>('role-select')
  const [selectedRole, setSelectedRole] = React.useState<Role>(null)
  const [direction, setDirection] = React.useState(1)
  const [serverError, setServerError] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const firstName = user?.firstName ?? 'there'
  const panelKey = selectedRole ?? 'default'
  const panel = PANEL_CONTENT[panelKey]

  // Step index for progress dots (0-based)
  const stepIndex: Record<Step, number> = {
    'role-select': 0,
    'coach-setup': 1,
    confirm: 1,
  }
  const totalSteps = 2

  const form = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: { role: undefined, clubName: '' },
  })

  // ─── Navigation helpers ────────────────────────────────────────────────────

  const goTo = (next: Step, dir: number) => {
    setDirection(dir)
    setServerError('')
    setStep(next)
  }

  const handleRoleContinue = () => {
    if (!selectedRole) return
    form.setValue('role', selectedRole)

    if (selectedRole === 'coach') {
      goTo('coach-setup', 1)
    } else {
      // Organizer: submit immediately, show confirm step on success
      handleSubmitOrganizer()
    }
  }

  // ─── Submit handlers ───────────────────────────────────────────────────────

  const handleSubmitOrganizer = async () => {
    setIsSubmitting(true)
    setServerError('')
    const fd = new FormData()
    fd.append('role', 'tournament-organizer')
    const res = await completeOnboarding(fd)
    setIsSubmitting(false)

    if (res?.error) {
      setServerError(res.error)
      return
    }
    goTo('confirm', 1)
    // Reload Clerk session then redirect
    await user?.reload()
    router.push(getDashboardRoute('tournament-organizer'))
  }

  const handleSubmitCoach = async (data: OnboardingInput) => {
    setIsSubmitting(true)
    setServerError('')
    const fd = new FormData()
    fd.append('role', 'coach')
    if (data.clubName) fd.append('clubName', data.clubName)

    const res = await completeOnboarding(fd)
    setIsSubmitting(false)

    if (res?.error) {
      setServerError(res.error)
      return
    }
    goTo('confirm', 1)
    await user?.reload()
    router.push(getDashboardRoute('coach'))
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen">
      {/* ── Left brand panel (desktop only) ─────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[420px] xl:w-[480px] shrink-0 flex-col justify-between bg-primary p-10 text-white relative overflow-hidden">
        {/* Dot grid decoration */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        {/* Animated blobs */}
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-white/10 blur-3xl animate-pulse" />
        <div className="absolute -bottom-24 -right-16 w-64 h-64 rounded-full bg-white/10 blur-3xl animate-pulse [animation-delay:2s]" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <Image src="/td-blue.svg" alt="TourneyDo" width={36} height={36} className="invert" />
          <span className="text-xl font-bold tracking-tight">TourneyDo</span>
        </div>

        {/* Adaptive content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={panelKey}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3 }}
            className="relative z-10 space-y-6"
          >
            <div className="space-y-2">
              <h2 className="text-3xl font-bold leading-snug">{panel.headline}</h2>
              <p className="text-white/70 text-sm leading-relaxed">{panel.sub}</p>
            </div>
            <ul className="space-y-3">
              {panel.bullets.map((b, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15">
                    {b.icon}
                  </span>
                  {b.text}
                </li>
              ))}
            </ul>
          </motion.div>
        </AnimatePresence>

        {/* Footer tagline */}
        <p className="relative z-10 text-xs text-white/40">
          Trusted by taekwondo clubs across Southeast Asia.
        </p>
      </div>

      {/* ── Right wizard panel ───────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col bg-background">
        {/* Progress dots */}
        <div className="flex items-center justify-between px-8 pt-8 pb-0">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2">
            <Image src="/td-blue.svg" alt="TourneyDo" width={28} height={28} className="dark:invert" />
            <span className="font-bold text-base">TourneyDo</span>
          </div>
          <div className="hidden lg:block" /> {/* spacer */}
          <div className="flex items-center gap-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <span
                key={i}
                className={`block h-2 rounded-full transition-all duration-300 ${
                  i <= stepIndex[step]
                    ? 'w-6 bg-primary'
                    : 'w-2 bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Centered step content */}
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="w-full max-w-md">
            <AnimatePresence mode="wait" custom={direction}>
              {/* ── Step 1: Role selection ──────────────────────────────── */}
              {step === 'role-select' && (
                <motion.div
                  key="role-select"
                  custom={direction}
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.25 }}
                  className="space-y-8"
                >
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Step 1 of 2</p>
                    <h1 className="text-2xl font-bold">Welcome, {firstName}!</h1>
                    <p className="text-muted-foreground">
                      How are you planning to use TourneyDo?
                    </p>
                  </div>

                  <RadioGroup
                    value={selectedRole ?? ''}
                    onValueChange={(v) => setSelectedRole(v as Role)}
                    className="grid gap-3 sm:grid-cols-2"
                  >
                    <RadioCard
                      value="tournament-organizer"
                      title="Tournament Organizer"
                      description="Create events, build brackets, and manage multi-court schedules."
                      icon={<Trophy className="h-5 w-5" />}
                      className="min-h-[140px]"
                    />
                    <RadioCard
                      value="coach"
                      title="Coach"
                      description="Register your athletes and track their journey through tournaments."
                      icon={<Users2 className="h-5 w-5" />}
                      className="min-h-[140px]"
                    />
                  </RadioGroup>

                  {serverError && (
                    <p className="text-sm text-destructive">{serverError}</p>
                  )}

                  <Button
                    className="w-full"
                    disabled={!selectedRole || isSubmitting}
                    onClick={handleRoleContinue}
                  >
                    {isSubmitting ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Setting up…</>
                    ) : (
                      <>Continue <ArrowRight className="ml-2 h-4 w-4" /></>
                    )}
                  </Button>
                </motion.div>
              )}

              {/* ── Step 2A: Coach club setup ───────────────────────────── */}
              {step === 'coach-setup' && (
                <motion.div
                  key="coach-setup"
                  custom={direction}
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.25 }}
                  className="space-y-8"
                >
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Step 2 of 2</p>
                    <h1 className="text-2xl font-bold">Set up your club</h1>
                    <p className="text-muted-foreground">
                      We&apos;ll create your team profile so you can start registering athletes right away.
                    </p>
                  </div>

                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(handleSubmitCoach)}
                      className="space-y-5"
                    >
                      <FormField
                        control={form.control}
                        name="clubName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Club / Gym / School Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g. Lions Taekwondo Academy"
                                autoFocus
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {serverError && (
                        <p className="text-sm text-destructive">{serverError}</p>
                      )}

                      <div className="flex gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1"
                          onClick={() => goTo('role-select', -1)}
                          disabled={isSubmitting}
                        >
                          <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Button>
                        <Button type="submit" className="flex-1" disabled={isSubmitting}>
                          {isSubmitting ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating…</>
                          ) : (
                            <>Create my club <ArrowRight className="ml-2 h-4 w-4" /></>
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </motion.div>
              )}

              {/* ── Step 2B / Confirm ───────────────────────────────────── */}
              {step === 'confirm' && (
                <motion.div
                  key="confirm"
                  custom={direction}
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.25 }}
                  className="space-y-8 text-center"
                >
                  <div className="flex justify-center">
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                      <CheckCircle2 className="h-8 w-8 text-primary" />
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h1 className="text-2xl font-bold">You&apos;re all set!</h1>
                    <p className="text-muted-foreground">
                      {selectedRole === 'coach'
                        ? 'Your club has been created. Head to your dashboard to add your athletes.'
                        : 'Your organizer account is ready. Create your first tournament from the dashboard.'}
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Redirecting to your dashboard…
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
