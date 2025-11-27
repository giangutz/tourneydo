"use client"

import * as React from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useUser } from "@clerk/nextjs"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Calendar, Users, Trophy, LayoutDashboard, Shield } from "lucide-react"

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
    {
      title: "Athletes",
      url: "/dashboard/tournament-organizer/athletes",
      icon: Users,
    },
  ]

  const items = role === "coach" ? coachItems : role === "tournament-organizer" ? organizerItems : []

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-4 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Trophy className="h-4 w-4" />
          </div>
          <div className="font-semibold">Startup Boilerplate</div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
