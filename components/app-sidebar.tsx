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
  ]

  const items = role === "coach" ? coachItems : role === "tournament-organizer" ? organizerItems : []

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-4 py-2">
          <Image src="/td-blue.svg" alt="TourneyDo Logo" width={32} height={32} className="h-8 w-8" />
          <div className="font-semibold">TourneyDo</div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{role === "coach" ? "Coach" : "Tournament Organizer"}</SidebarGroupLabel>
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
