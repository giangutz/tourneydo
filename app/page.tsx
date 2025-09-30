import { SignedIn, SignedOut, SignInButton, SignOutButton, UserButton } from '@clerk/nextjs';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Welcome to Tourneydo
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Your Taekwondo Tournament Management Platform
          </p>
        </div>

        <SignedOut>
          <div className="space-y-4">
            <SignInButton mode="modal">
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors">
                Sign In
              </button>
            </SignInButton>
            <p className="text-center text-gray-500 dark:text-gray-400">
              Don't have an account?{' '}
              <a href="/sign-up" className="text-blue-600 hover:text-blue-700 font-medium">
                Sign up
              </a>
            </p>
          </div>
        </SignedOut>

        <SignedIn>
          <div className="space-y-6">
            <div className="text-center">
              <UserButton afterSignOutUrl="/" />
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Dashboard
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Welcome back! You're now signed in to Tourneydo.
              </p>
            </div>
            <SignOutButton>
              <button className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-colors">
                Sign Out
              </button>
            </SignOutButton>
          </div>
        </SignedIn>
      </div>
    </div>
  );
}
