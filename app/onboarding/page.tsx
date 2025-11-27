'use client'

import * as React from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { completeOnboarding } from '@/app/onboarding/_actions'
import { RadioCard } from '@/components/ui/radio-group-card'
import { RadioGroup } from '@/components/ui/radio-group'
import { Trophy, Users2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form'
import { Button } from '@/components/ui/button'

const onboardingSchema = z.object({
  role: z.enum(['tournament-organizer', 'coach']),
  clubName: z.string().optional(),
}).refine((data) => {
  if (data.role === 'coach') {
    return !!data.clubName && data.clubName.trim().length > 0
  }
  return true
}, {
  message: 'Club/Gym/School Name is required for Coaches.',
  path: ['clubName'],
})

export default function OnboardingComponent() {
  const [error, setError] = React.useState('')
  const { user } = useUser()
  const router = useRouter()

  const form = useForm<z.infer<typeof onboardingSchema>>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      role: 'tournament-organizer',
      clubName: '',
    },
  })

  const selectedRole = form.watch('role')

  const onSubmit = async (data: z.infer<typeof onboardingSchema>) => {
    const formData = new FormData()
    formData.append('role', data.role)
    if (data.clubName) {
      formData.append('clubName', data.clubName)
    }

    const res = await completeOnboarding(formData)
    
    if (res?.success && res?.role) {
      // Reloads the user's data from the Clerk API
      await user?.reload()
      // Redirect to role-specific dashboard
      if (res.role === 'coach') {
        router.push('/dashboard/coach')
      } else {
        router.push('/dashboard/tournament-organizer')
      }
    }
    
    if (res?.error) {
      setError(res.error)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-8">
      <div className="flex flex-col gap-4 text-black text-center max-w-2xl w-full">
        <h2 className="text-3xl font-bold">How are you planning to use TourneyDo?</h2>
        <p className="text-sm text-muted-foreground">
          We'll fit the experience to your needs. Don't worry, you can always change it later.
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 flex flex-col items-center justify-center">
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col sm:flex-row gap-2"
                    >
                      <FormItem>
                        <FormControl>
                          <RadioCard
                            value="tournament-organizer"
                            title="Tournament Organizer"
                            description="Manage your tournaments seamlessly."
                            icon={<Trophy size={20} />}
                          />
                        </FormControl>
                      </FormItem>
                      <FormItem>
                        <FormControl>
                          <RadioCard
                            value="coach"
                            title="Coach"
                            description="Join tournaments and register your players."
                            icon={<Users2 size={20} />}
                          />
                        </FormControl>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedRole === 'coach' && (
              <FormField
                control={form.control}
                name="clubName"
                render={({ field }) => (
                  <FormItem className="w-full max-w-md">
                    <FormControl>
                      <Input placeholder="Club/Gym/School Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {error && <p className="text-red-600">Error: {error}</p>}
            <Button type="submit" className="bg-black text-white p-2 rounded-lg w-full max-w-xs">Submit</Button>
          </form>
        </Form>
      </div>
    </div>
  )
}