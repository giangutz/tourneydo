"use client"

import * as React from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useUser } from "@clerk/nextjs"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { 
  LayoutDashboard, 
  Trophy, 
  Users, 
  CreditCard,
  Shield,
  Settings
} from "lucide-react"
import Image from "next/image"
import { NavMain, NavItem } from "./nav-main"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useUser()
  const pathname = usePathname()
  const role = user?.publicMetadata?.role as "coach" | "tournament-organizer" | undefined

  // Coach Navigation Groups
  const coachGroups: { label: string; items: NavItem[] }[] = [
    {
      label: "", // Main group has no label or "Platform"
      items: [
        {
          title: "Dashboard",
          url: "/dashboard/coach",
          icon: LayoutDashboard,
        },
      ]
    },
    {
      label: "Management",
      items: [
        {
          title: "My Team",
          url: "/dashboard/coach/teams",
          icon: Shield,
          items: [
             { title: "Active Rosters", url: "/dashboard/coach/teams" },
             { title: "Create Team", url: "/dashboard/coach/teams/new" },
          ]
        },
        {
          title: "Athletes",
          url: "/dashboard/coach/players",
          icon: Users,
          items: [
             { title: "All Athletes", url: "/dashboard/coach/players" },
             { title: "Add Athlete", url: "/dashboard/coach/players/new" },
          ]
        },
      ]
    },
    {
      label: "Events",
      items: [
        {
          title: "Tournaments",
          url: "/dashboard/coach/tournaments",
          icon: Trophy,
          items: [
             { title: "Find Tournaments", url: "/dashboard/coach/tournaments" },
          ]
        },
        {
            title: "Finance",
            url: "/dashboard/coach/payments",
            icon: CreditCard,
            items: [
                { title: "Payment History", url: "/dashboard/coach/payments" },
            ]
        }
      ]
    }
  ]

  // Organizer Navigation Groups
  const organizerGroups: { label: string; items: NavItem[] }[] = [
    {
      label: "",
      items: [
        {
          title: "Dashboard",
          url: "/dashboard/tournament-organizer",
          icon: LayoutDashboard,
        },
      ]
    },
    {
       label: "Management",
       items: [
          {
             title: "Tournaments",
             url: "/dashboard/tournament-organizer/tournaments",
             icon: Trophy,
             items: [
                { title: "All Tournaments", url: "/dashboard/tournament-organizer/tournaments" },
                { title: "Create New", url: "/dashboard/tournament-organizer/tournaments/new" },
             ]
          }
       ]
    },
    {
        label: "Settings",
        items: [
            {
                title: "Platform",
                url: "#", // Placeholder
                icon: Settings,
                items: [
                    { title: "General", url: "#" },
                    { title: "Billing", url: "#" },
                ]
            }
        ]
    }
  ]

  const isOrganizerRoute = pathname?.startsWith("/dashboard/tournament-organizer")
  
  const items = isOrganizerRoute 
    ? organizerGroups 
    : role === "coach" 
      ? coachGroups 
      : organizerGroups

  return (
    <Sidebar collapsible="icon" {...props} className="border-none pt-2">
      <SidebarHeader className="group-data-[collapsible=icon]:pt-4!">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg text-sidebar-primary-foreground">
                  <Image src="/td-blue.svg" alt="TourneyDo Logo" width={28} height={28} />
                </div>
                <div className="flex flex-1 items-center text-left text-sm leading-tight">
                  <span className="truncate font-bold text-lg">TourneyDo</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="px-2 group-data-[collapsible=icon]:px-2! group-data-[collapsible=icon]:pt-2!">
         {items.map((group, index) => (
             <NavMain key={index} items={group.items} label={group.label} />
         ))}
      </SidebarContent>
    </Sidebar>
  )
}
