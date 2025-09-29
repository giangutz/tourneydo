"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AvatarGroup } from "@/components/ui/avatar-group";
import { NotificationSystem } from "@/components/notifications/notification-system";
import { 
  Search, 
  Settings, 
  LogOut, 
  User,
  ChevronDown
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Member {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  role: string;
  organization?: string;
}

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  organization?: string;
  avatar_url?: string;
}

interface EnhancedHeaderProps {
  userProfile: UserProfile;
  onSignOut: () => void;
}

export function EnhancedHeader({ userProfile, onSignOut }: EnhancedHeaderProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    fetchRecentMembers();
  }, []);

  const fetchRecentMembers = async () => {
    setLoading(true);
    try {
      // Get recent active members based on role
      let query = supabase
        .from("profiles")
        .select("id, full_name, email, role, organization, avatar_url")
        .neq("id", userProfile.id)
        .order("created_at", { ascending: false })
        .limit(8);

      // Filter based on user role
      if (userProfile.role === "organizer") {
        // Organizers see coaches and athletes
        query = query.in("role", ["coach", "athlete"]);
      } else if (userProfile.role === "coach") {
        // Coaches see other coaches and their athletes
        query = query.in("role", ["coach", "athlete"]);
      } else {
        // Athletes see coaches and other athletes
        query = query.in("role", ["coach", "athlete"]);
      }

      const { data, error } = await query;

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error("Error fetching members:", error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'organizer':
        return 'bg-purple-500 text-white';
      case 'coach':
        return 'bg-blue-500 text-white';
      case 'athlete':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Left section - Logo and Search */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">TD</span>
            </div>
            <span className="font-bold text-xl">TourneyDo</span>
          </div>
          
          <div className="hidden md:flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tournaments, athletes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </div>

        {/* Center section - Recent Members */}
        <div className="hidden lg:flex items-center space-x-4">
          <span className="text-sm text-muted-foreground">Recent Members:</span>
          {loading ? (
            <div className="flex space-x-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-8 w-8 rounded-full bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <AvatarGroup 
              members={members} 
              maxVisible={5} 
              size="sm"
              className="hover:scale-105 transition-transform"
            />
          )}
        </div>

        {/* Right section - Notifications and User Menu */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <NotificationSystem 
            userId={userProfile.id} 
            className="hover:scale-110 transition-transform"
          />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-auto px-2">
                <div className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={userProfile.avatar_url} alt={userProfile.full_name} />
                    <AvatarFallback className={getRoleBadgeColor(userProfile.role)}>
                      {getInitials(userProfile.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:flex flex-col items-start">
                    <span className="text-sm font-medium">{userProfile.full_name}</span>
                    <Badge variant="outline" className="text-xs">
                      {userProfile.role.charAt(0).toUpperCase() + userProfile.role.slice(1)}
                    </Badge>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{userProfile.full_name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {userProfile.email}
                  </p>
                  {userProfile.organization && (
                    <p className="text-xs leading-none text-muted-foreground">
                      {userProfile.organization}
                    </p>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile search bar */}
      <div className="md:hidden px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tournaments, athletes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>
    </header>
  );
}
