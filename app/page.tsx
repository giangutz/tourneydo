import { SignedIn, SignedOut, SignInButton, SignOutButton, UserButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Users, Calendar, MapPin, ArrowRight, Eye, Plus } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-red-50">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
            <Trophy className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-600">Taekwondo Tournament Platform</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-blue-600 to-red-600 bg-clip-text text-transparent mb-6">
            Tourneydo
          </h1>

          <p className="text-xl md:text-2xl text-gray-600 max-w-4xl mx-auto mb-8">
            The ultimate platform for taekwondo tournament management.
            Connect athletes, organize competitions, and showcase your skills worldwide.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/tournaments">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-red-600 hover:from-blue-700 hover:to-red-700">
                <Eye className="mr-2 h-5 w-5" />
                Browse Tournaments
              </Button>
            </Link>

            <SignedOut>
              <SignInButton mode="modal">
                <Button size="lg" variant="outline">
                  Sign In to Get Started
                </Button>
              </SignInButton>
            </SignedOut>

            <SignedIn>
              <Link href="/dashboard">
                <Button size="lg" variant="outline">
                  <Plus className="mr-2 h-5 w-5" />
                  Go to Dashboard
                </Button>
              </Link>
            </SignedIn>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg text-center">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Trophy className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle className="text-xl">Professional Tournaments</CardTitle>
              <CardDescription>
                Create and manage world-class taekwondo tournaments with advanced registration and scoring systems.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg text-center">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="text-xl">Athlete Management</CardTitle>
              <CardDescription>
                Comprehensive athlete profiles with belt rankings, competition history, and performance tracking.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg text-center">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <Calendar className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-xl">Global Reach</CardTitle>
              <CardDescription>
                Connect with taekwondo communities worldwide and participate in international competitions.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* CTA Section */}
        <Card className="bg-gradient-to-r from-blue-600 to-red-600 border-0 shadow-lg">
          <CardContent className="p-8 md:p-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Compete?
            </h2>
            <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
              Whether you're an athlete looking for your next competition or an organizer wanting to host tournaments,
              Tourneydo has everything you need.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <SignedOut>
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <SignInButton mode="modal">
                      <Button size="lg" variant="secondary" className="bg-white text-blue-600 hover:bg-gray-100">
                        Sign In
                      </Button>
                    </SignInButton>
                    <Link href="/sign-up">
                      <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600">
                        Create Account
                      </Button>
                    </Link>
                  </div>
                  <p className="text-blue-100 text-sm">
                    Or <Link href="/tournaments" className="underline hover:text-white">browse tournaments</Link> without signing in
                  </p>
                </div>
              </SignedOut>

              <SignedIn>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/dashboard">
                    <Button size="lg" variant="secondary" className="bg-white text-blue-600 hover:bg-gray-100">
                      <Plus className="mr-2 h-5 w-5" />
                      Create Tournament
                    </Button>
                  </Link>
                  <Link href="/tournaments">
                    <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600">
                      <Eye className="mr-2 h-5 w-5" />
                      Browse Tournaments
                    </Button>
                  </Link>
                </div>
              </SignedIn>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <footer className="mt-16 text-center text-gray-600">
          <p>&copy; 2025 Tourneydo. Empowering the taekwondo community worldwide.</p>
        </footer>
      </div>
    </div>
  );
}
