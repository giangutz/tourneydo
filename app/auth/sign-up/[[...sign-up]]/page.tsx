import { SignUp } from '@clerk/nextjs'

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <SignUp 
          appearance={{
            elements: {
              formButtonPrimary: 'bg-primary hover:bg-primary/90 text-primary-foreground',
              card: 'shadow-lg border',
              headerTitle: 'text-2xl font-bold',
              headerSubtitle: 'text-muted-foreground',
            }
          }}
          routing="path" 
          path="/auth/sign-up"
          fallbackRedirectUrl="/auth/complete-profile"
        />
      </div>
    </div>
  )
}
