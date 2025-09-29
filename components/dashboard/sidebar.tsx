"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { 
  Trophy, 
  Users, 
  Calendar, 
  BarChart3, 
  Settings, 
  User,
  ClipboardList,
  Medal
} from "lucide-react";
import { Profile } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { UserButton } from "@clerk/nextjs";
import { MemberAvatars } from "./member-avatars";
import { RoleSwitcher } from "./role-switcher";

interface DashboardSidebarProps {
  profile: Profile;
  children: React.ReactNode;
}

function AppSidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const { state } = useSidebar();

  const getNavigationItems = () => {
    const baseItems = [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: BarChart3,
      },
    ];

    switch (profile.role) {
      case "organizer":
        return [
          ...baseItems,
          {
            title: "Tournaments",
            href: "/dashboard/tournaments",
            icon: Trophy,
          },
          {
            title: "Members",
            href: "/dashboard/members",
            icon: Users,
          },
          {
            title: "Participants",
            href: "/dashboard/participants",
            icon: User,
          },
          {
            title: "Reports",
            href: "/dashboard/reports",
            icon: ClipboardList,
          },
        ];

      case "coach":
        return [
          ...baseItems,
          {
            title: "My Athletes",
            href: "/dashboard/athletes",
            icon: Users,
          },
          {
            title: "Tournaments",
            href: "/dashboard/tournaments",
            icon: Trophy,
          },
          {
            title: "Registrations",
            href: "/dashboard/registrations",
            icon: Calendar,
          },
        ];

      case "athlete":
        return [
          ...baseItems,
          {
            title: "My Profile",
            href: "/dashboard/profile",
            icon: User,
          },
          {
            title: "Tournaments",
            href: "/dashboard/tournaments",
            icon: Trophy,
          },
          {
            title: "My Results",
            href: "/dashboard/results",
            icon: Medal,
          },
        ];

      default:
        return baseItems;
    }
  };

  const navigationItems = getNavigationItems();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link href="/dashboard" className="flex items-center space-x-2 p-2">
          <Trophy className="h-8 w-8 text-primary flex-shrink-0" />
          {state === "expanded" && (
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-primary truncate">TourneyDo</h1>
              <p className="text-xs text-muted-foreground capitalize truncate">
                {profile.role} Dashboard
              </p>
            </div>
          )}
        </Link>
        
        {/* Role Switcher */}
        {state === "expanded" && (
          <div className="px-2 pb-2">
            <RoleSwitcher />
          </div>
        )}
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          {state === "expanded" && <SidebarGroupLabel>Navigation</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        {state === "expanded" && <span>{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
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
            <SidebarMenuButton asChild isActive={pathname === "/dashboard/settings"} tooltip="Settings">
              <Link href="/dashboard/settings">
                <Settings className="h-4 w-4 flex-shrink-0" />
                {state === "expanded" && <span>Settings</span>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          {/* User Profile */}
          <SidebarMenuItem>
            <div className={`flex items-center p-3 border-t border-border ${
              state === "expanded" ? "space-x-3" : "justify-center"
            }`}>
              <UserButton 
                appearance={{
                  elements: {
                    avatarBox: "h-8 w-8",
                  }
                }}
                afterSignOutUrl="/"
              />
              {state === "expanded" && (
                <div className="flex flex-col min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{profile.full_name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{profile.role}</p>
                </div>
              )}
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export function DashboardSidebar({ profile, children }: DashboardSidebarProps) {
  return (
    <SidebarProvider>
      <AppSidebar profile={profile} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b bg-background p-4">
          <SidebarTrigger />
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Member Avatars */}
            <MemberAvatars profile={profile} />
            
            {/* Theme Switcher */}
            <ThemeSwitcher />
            
            {/* Notifications */}
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10">
              <Bell className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </SidebarProvider>
  );
}
