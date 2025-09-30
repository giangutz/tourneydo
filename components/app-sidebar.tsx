"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import {
  Trophy,
  Users,
  Calendar,
  TrendingUp,
  Settings,
  Home,
  LogOut,
  User,
  ChevronDown,
  ChevronRight,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { createClerkSupabaseClient } from "@/lib/supabase"
import { useUser, useSession } from "@clerk/nextjs"
import type { Tournament } from "@/types/database"

// Unified menu items for all user types
const menuItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Tournaments",
    url: "/dashboard/tournaments",
    icon: Trophy,
  },
  {
    title: "Events",
    url: "/dashboard/events",
    icon: Calendar,
  },
  {
    title: "Settings",
    url: "/dashboard/settings",
    icon: Settings,
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useUser();
  const { session } = useSession();
  const { state } = useSidebar();
  const [mounted, setMounted] = React.useState(false);
  const [recentTournaments, setRecentTournaments] = React.useState<Tournament[]>([]);
  const [tournamentsExpanded, setTournamentsExpanded] = React.useState(false);

  // Ensure component only renders after mounting on client
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch recent tournaments when user is available and component is mounted
  React.useEffect(() => {
    if (mounted && user?.id && session) {
      fetchRecentTournaments();
    }
  }, [mounted, user?.id, session]);

  const fetchRecentTournaments = async () => {
    if (!user?.id || !session) return;

    try {
      const supabase = createClerkSupabaseClient(session);
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('organizer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      setRecentTournaments(data || []);
    } catch (error) {
      console.error('Error fetching recent tournaments:', error);
    }
  };

  const isExpanded = state === "expanded";

  return (
    <TooltipProvider>
      <Sidebar collapsible="icon" {...props}>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-sidebar-primary-foreground">
              <Trophy className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
              <span className="truncate font-semibold">Tourneydo</span>
              <span className="truncate text-xs">Tournament Management</span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map((item) => {
                  if (item.title === "Tournaments") {
                    return (
                      <SidebarMenuItem key={item.title}>
                        <div className="group-data-[collapsible=icon]:hidden">
                          {isExpanded ? (
                            <div>
                              <button
                                onClick={() => setTournamentsExpanded(!tournamentsExpanded)}
                                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                              >
                                <item.icon className="h-4 w-4" />
                                <span className="flex-1">{item.title}</span>
                                {tournamentsExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </button>
                              {tournamentsExpanded && (
                                <div className="ml-6 mt-1 space-y-1">
                                  <a
                                    href={item.url}
                                    className="block rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                                  >
                                    All Tournaments
                                  </a>
                                  {recentTournaments.length > 0 && (
                                    <>
                                      <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                                        Recent
                                      </div>
                                      {recentTournaments.map((tournament) => (
                                        <a
                                          key={tournament.id}
                                          href={`/dashboard/tournaments/${tournament.id}`}
                                          className="block rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground truncate"
                                          title={tournament.title}
                                        >
                                          {tournament.title}
                                        </a>
                                      ))}
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <SidebarMenuButton asChild>
                                  <a href={item.url}>
                                    <item.icon />
                                    <span>{item.title}</span>
                                  </a>
                                </SidebarMenuButton>
                              </TooltipTrigger>
                              <TooltipContent side="right">
                                {item.title}
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <div className="hidden group-data-[collapsible=icon]:block">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <SidebarMenuButton asChild>
                                <a href={item.url}>
                                  <item.icon />
                                  <span>{item.title}</span>
                                </a>
                              </SidebarMenuButton>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                              {item.title}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </SidebarMenuItem>
                    );
                  }

                  return (
                    <SidebarMenuItem key={item.title}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton asChild>
                            <a href={item.url}>
                              <item.icon />
                              <span>{item.title}</span>
                            </a>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          {item.title}
                        </TooltipContent>
                      </Tooltip>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src="/avatars/01.png" alt="User" />
                    <AvatarFallback className="rounded-lg">TU</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">Tournament User</span>
                    <span className="truncate text-xs">tournament@example.com</span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage src="/avatars/01.png" alt="User" />
                      <AvatarFallback className="rounded-lg">TU</AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">Tournament User</span>
                      <span className="truncate text-xs">tournament@example.com</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User />
                  Account
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <LogOut />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
    </TooltipProvider>
  )
}
