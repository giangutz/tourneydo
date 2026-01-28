import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"

import { UserNav } from "@/components/layouts/user-nav"
import { ModeToggle } from "@/components/layouts/mode-toggle"
import { NotificationsNav } from "@/components/layouts/notifications-nav"
import { MobileNav } from "@/components/layouts/mobile-nav"
import { SignedOut, SignedIn, ClerkLoading, ClerkLoaded } from "@clerk/nextjs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { LogIn, UserPlus } from "lucide-react"

export function SiteHeader() {

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
            <ClerkLoading>
              <div className="flex items-center gap-4">
                 <div className="h-9 w-24 rounded-md bg-muted animate-pulse" />
                 <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
              </div>
            </ClerkLoading>
            <ClerkLoaded>
              <SignedIn>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" className="hidden md:flex" asChild>
                    <Link href="/dashboard">
                      Dashboard
                    </Link>
                  </Button>
                  <NotificationsNav />
                  <UserNav />
                </div>
              </SignedIn>
              <SignedOut>
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" asChild>
                        <Link href="/sign-in">
                          <LogIn className="h-[1.2rem] w-[1.2rem]" />
                          <span className="sr-only">Sign In</span>
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Sign In</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" asChild>
                        <Link href="/sign-up">
                          <UserPlus className="h-[1.2rem] w-[1.2rem]" />
                          <span className="sr-only">Sign Up</span>
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Sign Up</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </SignedOut>
            </ClerkLoaded>
            <MobileNav />
          </div>
        </div>
      </div>
    </header>
  )
}
