import Link from "next/link";
import { Calendar, Shield, Trophy, Users } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { UpcomingTournaments } from "@/components/tournaments/upcoming-tournaments";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-20 items-center">
        <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
          <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
            <div className="flex gap-5 items-center font-semibold">
              <Link href={"/"}>
                <div className="flex items-center space-x-2">
                  <Trophy className="h-6 w-6 text-primary" />
                  <h1 className="text-xl font-bold text-primary">TourneyDo</h1>
                </div>
              </Link>
            </div>
            <div className="flex gap-5 items-center">
              <Link href="/tournaments">
                <Button variant="ghost">Tournaments</Button>
              </Link>
              <Link href="/auth/sign-in">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/auth/sign-up">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </nav>
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Tournament Management Made Simple
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Streamline martial arts tournaments with automated brackets, QR
              check-ins, real-time results, and comprehensive reporting. Built
              for organizers and coaches.
            </p>
            <Link href="/auth">
              <Button
                size="lg"
                className="text-lg px-8 py-4"
              >
                Start Your Tournament
              </Button>
            </Link>
          </div>
        </section>

        {/* Features Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-3xl font-bold text-center mb-12">
            Everything You Need
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="text-center">
                <Users className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Online Registration</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center">
                  Coaches register athletes with automatic division sorting by
                  age, weight, and belt rank.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <Trophy className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Smart Bracketing</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center">
                  Auto-generate brackets with visualization and PDF export.
                  Support for single/double elimination.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <Calendar className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>QR Check-In</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center">
                  Unique QR codes for each athlete enable fast check-in and
                  bracket validation.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Live Results</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center">
                  Real-time match results with automatic bracket updates and
                  comprehensive reporting.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Upcoming Tournaments Section */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Upcoming Tournaments</h2>
              <p className="text-xl text-muted-foreground">
                Discover and register for taekwondo competitions near you
              </p>
            </div>
            <UpcomingTournaments />
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-primary/5 py-16">
          <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold mb-4">
              Ready to Organize Your Next Tournament?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join tournament organizers and coaches who trust TourneyDo for
              their martial arts competitions.
            </p>
            <div className="space-x-4">
              <Link
                href="/auth/sign-up"
                className={cn(buttonVariants({ size: "lg" }), "px-8")}
              >
                Get Started
              </Link>
              <Link
                href="/auth/sign-in"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "px-8"
                )}
              >
                Sign In
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-background border-t py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-muted-foreground">
            © {new Date().getFullYear()} TourneyDo. All rights reserved.
          </div>
        </footer>
      </div>
    </main>
  );
}
