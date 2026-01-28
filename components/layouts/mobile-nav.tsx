'use client'

import * as React from 'react'
import Link from 'next/link'
import { Menu, Trophy, Info, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { SignedIn } from '@clerk/nextjs'
import Image from 'next/image'

export function MobileNav() {
  const [open, setOpen] = React.useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="bg-background">
        <SheetHeader className="text-left border-b pb-4 mb-4">
             <Link href="/" onClick={() => setOpen(false)} className="flex items-center space-x-2">
               <Image src="/td-blue.svg" alt="TourneyDo Logo" width={24} height={24} className="h-6 w-6" />
               <span className="font-bold text-lg">TourneyDo</span>
             </Link>
             <SheetTitle className="sr-only">Mobile Menu</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col space-y-4">
          <Link
            href="/tournaments"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary"
          >
            <Trophy className="h-4 w-4" />
            Tournaments
          </Link>
          <Link
            href="/about"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary"
          >
            <Info className="h-4 w-4" />
            About
          </Link>
          
          <SignedIn>
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary"
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
          </SignedIn>
        </nav>
      </SheetContent>
    </Sheet>
  )
}
