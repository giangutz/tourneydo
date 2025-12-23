'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth, useUser } from '@clerk/nextjs'
import { Loader2, CheckCircle2, XCircle, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Status = 'loading' | 'success' | 'error'

export default function AcceptInvitationClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isLoaded: authLoaded, isSignedIn } = useAuth()
  const { user, isLoaded: userLoaded } = useUser()
  
  const [status, setStatus] = useState<Status>('loading')
  const [message, setMessage] = useState('Processing your invitation...')

  const email = searchParams.get('email')
  const tournamentId = searchParams.get('tournament')

  useEffect(() => {
    async function handleInvitation() {
      // Wait for auth to load
      if (!authLoaded || !userLoaded) return

      // Validate params
      if (!email || !tournamentId) {
        setStatus('error')
        setMessage('Invalid invitation link. Please check the email or contact the tournament organizer.')
        return
      }

      // Case 1: Not signed in -> redirect to sign-in with return URL
      if (!isSignedIn) {
        setMessage('Redirecting to sign in...')
        // Use Clerk's redirect URL parameter
        router.push(`/sign-in?redirect_url=${encodeURIComponent(`/invitations/accept?email=${encodeURIComponent(email)}&tournament=${tournamentId}`)}`)
        return
      }

      // Case 2: Signed in, check if onboarded
      const userEmail = user?.emailAddresses?.[0]?.emailAddress
      
      // Verify email matches
      if (userEmail?.toLowerCase() !== email.toLowerCase()) {
        setStatus('error')
        setMessage(`This invitation was sent to ${email}. Please sign out and sign in with that email address.`)
        return
      }

      // Check if user has role (onboarded)
      const userRole = user?.publicMetadata?.role as string | undefined

      // Case 3: Not onboarded -> redirect to onboarding
      if (!userRole) {
        setMessage('Setting up your account...')
        router.push('/onboarding')
        return
      }

      // Case 4: Onboarded -> redirect to tournament page
      setStatus('success')
      setMessage('Invitation accepted! Redirecting to tournament...')
      
      // Small delay for user to see success message
      setTimeout(() => {
        if (userRole === 'tournament-organizer') {
          router.push(`/dashboard/tournament-organizer/tournaments/${tournamentId}`)
        } else if (userRole === 'coach') {
          // Coaches redirect to their dashboard
          router.push('/dashboard/coach')
        } else {
          setStatus('error')
          setMessage('Invalid user role. Please contact support.')
        }
      }, 1000)
    }

    handleInvitation()
  }, [authLoaded, userLoaded, isSignedIn, user, email, tournamentId, router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
      <div className="flex flex-col gap-6 text-center max-w-lg w-full">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold text-black">Tournament Invitation</h2>
          <p className="text-sm text-muted-foreground">
            {status === 'loading' && 'Please wait while we process your invitation...'}
            {status === 'success' && 'You\'re all set!'}
            {status === 'error' && 'There was a problem'}
          </p>
        </div>

        <div className="bg-white rounded-lg border p-8 shadow-sm">
          <div className="flex flex-col items-center space-y-4">
            {status === 'loading' && (
              <>
                <Loader2 className="h-12 w-12 animate-spin text-black" />
                <p className="text-sm text-muted-foreground">{message}</p>
              </>
            )}
            
            {status === 'success' && (
              <>
                <CheckCircle2 className="h-12 w-12 text-green-600" />
                <p className="text-base font-medium text-black">{message}</p>
              </>
            )}
            
            {status === 'error' && (
              <>
                <XCircle className="h-12 w-12 text-red-600" />
                <p className="text-sm text-red-600">{message}</p>
                {email && (
                  <div className="flex items-center gap-2 mt-4 px-4 py-2 bg-zinc-50 rounded-md">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{email}</span>
                  </div>
                )}
                <Button 
                  onClick={() => router.push('/dashboard')}
                  className="mt-4 bg-black text-white hover:bg-black/90"
                >
                  Go to Dashboard
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
