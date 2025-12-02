import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { auth } from "@clerk/nextjs/server"
import { UserNav } from "@/components/layouts/user-nav"
import { ModeToggle } from "@/components/layouts/mode-toggle"
import { SignedOut, SignedIn, UserButton } from "@clerk/nextjs"

export async function SiteHeader() {
  const { userId } = await auth()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center space-x-2">
              <Image src="/td-blue.svg" alt="TourneyDo Logo" width={32} height={32} className="h-8 w-8" />
              <span className="font-bold text-xl">TourneyDo</span>
            </Link>
            <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
              <Link
                href="/tournaments"
                className="transition-colors hover:text-foreground/80 text-foreground/60"
              >
                Tournaments
              </Link>
              <Link
                href="/about"
                className="transition-colors hover:text-foreground/80 text-foreground/60"
              >
                About
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <ModeToggle />
            {userId ? (
              <UserNav />
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link href="/sign-in">Sign In</Link>
                </Button>
                <Button asChild>
                  <Link href="/sign-up">Sign Up</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
