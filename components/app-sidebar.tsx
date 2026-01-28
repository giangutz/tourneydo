"use client"

import * as React from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useUser, UserButton } from "@clerk/nextjs"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { 
  LayoutDashboard, 
  Trophy, 
  Shield, 
  Users, 
  CreditCard,
  Settings,
  HelpCircle,
  Search,
  FileText
} from "lucide-react"
import Image from "next/image"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useUser()
  const pathname = usePathname()
  const role = user?.publicMetadata?.role as "coach" | "tournament-organizer" | undefined

  const coachItems = [
    {
      title: "Dashboard",
      url: "/dashboard/coach",
      icon: LayoutDashboard,
    },
    {
      title: "My Teams",
      url: "/dashboard/coach/teams",
      icon: Shield,
    },
    {
      title: "My Players",
      url: "/dashboard/coach/players",
      icon: Users,
    },
    {
      title: "Tournaments",
      url: "/dashboard/coach/tournaments",
      icon: Trophy,
    },
    {
      title: "Payments",
      url: "/dashboard/coach/payments",
      icon: CreditCard,
    },
  ]

  const organizerItems = [
    {
      title: "Dashboard",
      url: "/dashboard/tournament-organizer",
      icon: LayoutDashboard,
    },
    {
      title: "Tournaments",
      url: "/dashboard/tournament-organizer/tournaments",
      icon: Trophy,
    },
    // Adding some placeholder items to match the "dense" feel of the reference if needed, 
    // but strictly keeping to functional items first.
  ]

  const isOrganizerRoute = pathname?.startsWith("/dashboard/tournament-organizer")
  
  const items = isOrganizerRoute 
    ? organizerItems 
    : role === "coach" 
      ? coachItems 
      : organizerItems

  return (
    <Sidebar collapsible="icon" {...props} className="border-none pt-2">
      <SidebarHeader className="group-data-[collapsible=icon]:!pt-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg text-sidebar-primary-foreground">
                  <Image src="/td-blue.svg" alt="TourneyDo Logo" width={32} height={32} className="size-6" />
                </div>
                <div className="flex flex-1 items-center text-left text-sm leading-tight">
                  <span className="truncate font-bold text-lg">TourneyDo</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="px-2 group-data-[collapsible=icon]:!px-2 group-data-[collapsible=icon]:!pt-2">
        <SidebarMenu>
             {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title} isActive={pathname === item.url}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  )
}
