import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Trophy, UserPlus, LogIn } from "lucide-react";

export default function AuthPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background to-muted/20">
      <div className="w-full max-w-md space-y-8 px-4">
        {/* Logo and Title */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center space-x-2 mb-8">
            <Trophy className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-primary">TourneyDo</h1>
          </Link>
          <h2 className="text-3xl font-bold mb-2">Welcome</h2>
          <p className="text-muted-foreground">
            Choose how you&apos;d like to get started with TourneyDo
          </p>
        </div>

        {/* Auth Options */}
        <div className="space-y-4">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center pb-4">
              <UserPlus className="h-8 w-8 text-primary mx-auto mb-2" />
              <CardTitle>Create Account</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground text-center mb-4">
                New to TourneyDo? Create your account to start organizing tournaments.
              </p>
              <Link href="/auth/sign-up" className="w-full">
                <Button className="w-full" size="lg">
                  Sign Up
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center pb-4">
              <LogIn className="h-8 w-8 text-primary mx-auto mb-2" />
              <CardTitle>Sign In</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground text-center mb-4">
                Already have an account? Sign in to access your tournaments.
              </p>
              <Link href="/auth/login" className="w-full">
                <Button variant="outline" className="w-full" size="lg">
                  Sign In
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Back to Home */}
        <div className="text-center">
          <Link href="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
