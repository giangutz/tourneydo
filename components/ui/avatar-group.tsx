"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Member {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  role: string;
  organization?: string;
}

interface AvatarGroupProps {
  members: Member[];
  maxVisible?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function AvatarGroup({ 
  members, 
  maxVisible = 5, 
  size = "md", 
  className = "" 
}: AvatarGroupProps) {
  const visibleMembers = members.slice(0, maxVisible);
  const hiddenCount = Math.max(0, members.length - maxVisible);

  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm", 
    lg: "h-12 w-12 text-base"
  };

  const overlapClasses = {
    sm: "-ml-2 first:ml-0",
    md: "-ml-3 first:ml-0",
    lg: "-ml-4 first:ml-0"
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'organizer':
        return 'bg-purple-500 text-white';
      case 'coach':
        return 'bg-blue-500 text-white';
      case 'athlete':
        return 'bg-green-500 text-white';
      case 'admin':
        return 'bg-red-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  if (members.length === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className={`flex items-center ${className}`}>
        {visibleMembers.map((member, index) => (
          <Tooltip key={member.id}>
            <TooltipTrigger asChild>
              <div 
                className={`relative ${overlapClasses[size]} border-2 border-background rounded-full hover:z-10 transition-transform hover:scale-110`}
                style={{ zIndex: maxVisible - index }}
              >
                <Avatar className={`${sizeClasses[size]} ${getRoleColor(member.role)} ring-2 ring-background`}>
                  <AvatarImage 
                    src={member.avatar_url} 
                    alt={member.full_name}
                  />
                  <AvatarFallback className={getRoleColor(member.role)}>
                    {getInitials(member.full_name)}
                  </AvatarFallback>
                </Avatar>
                
                {/* Role indicator badge */}
                <div className="absolute -bottom-1 -right-1">
                  <Badge 
                    variant="secondary" 
                    className="h-4 w-4 p-0 flex items-center justify-center text-xs font-bold border border-background"
                  >
                    {member.role.charAt(0).toUpperCase()}
                  </Badge>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <div className="text-center">
                <div className="font-medium">{member.full_name}</div>
                <div className="text-xs text-muted-foreground">{member.email}</div>
                <div className="text-xs">
                  <Badge variant="outline" className="mt-1">
                    {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                  </Badge>
                </div>
                {member.organization && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {member.organization}
                  </div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        ))}
        
        {hiddenCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div 
                className={`relative ${overlapClasses[size]} border-2 border-background rounded-full`}
              >
                <Avatar className={`${sizeClasses[size]} bg-muted text-muted-foreground ring-2 ring-background`}>
                  <AvatarFallback className="bg-muted text-muted-foreground font-medium">
                    +{hiddenCount}
                  </AvatarFallback>
                </Avatar>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <div className="max-w-xs">
                <div className="font-medium mb-2">
                  {hiddenCount} more member{hiddenCount !== 1 ? 's' : ''}
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {members.slice(maxVisible).map((member) => (
                    <div key={member.id} className="text-xs">
                      <div className="font-medium">{member.full_name}</div>
                      <div className="text-muted-foreground">{member.role}</div>
                    </div>
                  ))}
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}

// Compact version for smaller spaces
export function AvatarGroupCompact({ 
  members, 
  maxVisible = 3, 
  className = "" 
}: AvatarGroupProps) {
  return (
    <AvatarGroup 
      members={members}
      maxVisible={maxVisible}
      size="sm"
      className={className}
    />
  );
}

// Large version for prominent display
export function AvatarGroupLarge({ 
  members, 
  maxVisible = 7, 
  className = "" 
}: AvatarGroupProps) {
  return (
    <AvatarGroup 
      members={members}
      maxVisible={maxVisible}
      size="lg"
      className={className}
    />
  );
}
