'use client'

import { useUser, UserButton, useClerk } from '@clerk/nextjs'
import { 
  LayoutDashboard, 
  Trophy, 
  Users, 
  CreditCard, 
  Settings, 
  Menu,
  LogOut,
  Swords,
  CalendarDays
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

interface NavItem {
  title: string
  href: string
  icon: React.ReactNode
}

const adminNavItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard/admin',
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    title: 'Tournaments',
    href: '/dashboard/admin/tournaments',
    icon: <Trophy className="h-5 w-5" />,
  },
  {
    title: 'Payments',
    href: '/dashboard/admin/payments',
    icon: <CreditCard className="h-5 w-5" />,
  },
]

const coachNavItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard/coach',
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    title: 'My Team',
    href: '/dashboard/coach/team',
    icon: <Users className="h-5 w-5" />,
  },
  {
    title: 'Registrations',
    href: '/dashboard/coach/registrations',
    icon: <CalendarDays className="h-5 w-5" />,
  },
  {
    title: 'Payments',
    href: '/dashboard/coach/payments',
    icon: <CreditCard className="h-5 w-5" />,
  },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser()
  const { signOut } = useClerk()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  if (!isLoaded) return null

  const role = user?.publicMetadata?.role as string
  const navItems = role === 'tournament-organizer' ? adminNavItems : coachNavItems

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-zinc-900 text-white">
      <div className="p-6 flex items-center gap-2">
        <Swords className="h-8 w-8 text-red-500" />
        <span className="text-xl font-bold tracking-tight">TourneyDo</span>
      </div>
      
      <div className="px-4 py-2">
        <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 px-2">
          Menu
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                pathname === item.href || pathname.startsWith(item.href + '/')
                  ? "bg-red-600 text-white"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
              )}
            >
              {item.icon}
              {item.title}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-4 border-t border-zinc-800">
        <div className="flex items-center gap-3 mb-4 px-2">
          <UserButton afterSignOutUrl="/" />
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-medium truncate text-white">
              {user?.fullName || user?.username}
            </span>
            <span className="text-xs text-zinc-400 truncate capitalize">
              {role?.replace('-', ' ')}
            </span>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Mobile Header */}
      <header className="lg:hidden flex items-center justify-between p-4 bg-zinc-900 text-white sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Swords className="h-6 w-6 text-red-500" />
          <span className="font-bold">TourneyDo</span>
        </div>
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-white hover:bg-zinc-800">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 border-r-zinc-800 bg-zinc-900">
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </header>

      <div className="flex h-screen overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <SidebarContent />
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
