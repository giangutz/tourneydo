import { Suspense } from 'react'
import AcceptInvitationClient from './client'
import { Loader2 } from 'lucide-react'

function LoadingState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
      <div className="flex flex-col gap-6 text-center max-w-lg w-full">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold text-black">Tournament Invitation</h2>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
        <div className="bg-white rounded-lg border p-8 shadow-sm">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-black" />
            <p className="text-sm text-muted-foreground">Please wait...</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <AcceptInvitationClient />
    </Suspense>
  )
}
