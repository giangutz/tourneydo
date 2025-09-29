"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { UserRole } from "@/lib/types/database";
import { Building, Users, User, ChevronDown, Check } from "lucide-react";
import { useCurrentRole } from "@/hooks/use-current-role";
import { updateCurrentRole } from "@/lib/supabase/actions/update-role";

export function RoleSwitcher() {
  const { user } = useUser();
  const { currentRole, allRoles, primaryRole, isMultiRole } = useCurrentRole();
  const [isLoading, setIsLoading] = useState(false);

  if (!user || !isMultiRole) return null;

  const roleConfig = {
    organizer: {
      icon: Building,
      title: 'Organizer',
      description: 'Manage tournaments',
      color: 'bg-blue-500'
    },
    coach: {
      icon: Users,
      title: 'Coach',
      description: 'Manage teams',
      color: 'bg-green-500'
    },
    athlete: {
      icon: User,
      title: 'Athlete',
      description: 'Participate',
      color: 'bg-purple-500'
    }
  };

  const handleRoleSwitch = async (role: UserRole) => {
    if (role === currentRole || isLoading) return;

    setIsLoading(true);
    try {
      // Update Clerk public metadata with new current role using server action
      await updateCurrentRole(role);

      // Wait a moment for metadata to propagate
      await new Promise(resolve => setTimeout(resolve, 500));

      // Force a full page reload to ensure dashboard reflects new role
      window.location.reload();
    } catch (error) {
      console.error('Error switching role:', error);
      setIsLoading(false);
    }
    // Don't set loading false here since we're reloading the page
  };

  const currentConfig = currentRole ? roleConfig[currentRole] : (primaryRole ? roleConfig[primaryRole] : null);
  const CurrentIcon = currentConfig?.icon || User;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="flex items-center gap-2 px-3 py-2"
          disabled={isLoading}
        >
          <div className={`p-1 rounded-full ${currentConfig?.color || 'bg-gray-500'} text-white`}>
            <CurrentIcon className="h-3 w-3" />
          </div>
          <span className="font-medium">{currentConfig?.title || 'Select Role'}</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Switch Role</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {allRoles.map((role) => {
          const config = roleConfig[role];
          const Icon = config.icon;
          const isActive = role === currentRole;
          const isPrimary = role === primaryRole;

          return (
            <DropdownMenuItem
              key={role}
              onClick={() => handleRoleSwitch(role)}
              className="flex items-center gap-3 cursor-pointer"
              disabled={isActive || isLoading}
            >
              <div className={`p-1.5 rounded-full ${config.color} text-white`}>
                <Icon className="h-3 w-3" />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{config.title}</span>
                  {isPrimary && (
                    <Badge variant="secondary" className="text-xs">
                      Primary
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{config.description}</p>
              </div>
              
              {isActive && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
