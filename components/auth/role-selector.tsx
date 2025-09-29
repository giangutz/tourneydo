"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { UserRole } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building, Users, User, ChevronRight } from "lucide-react";
import { updateCurrentRole } from "@/lib/supabase/actions/update-role";

export function RoleSelector() {
  const { user } = useUser();
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Get roles from user metadata
  const userRoles = (user?.publicMetadata?.roles as UserRole[]) || [];
  const primaryRole = user?.publicMetadata?.primaryRole as UserRole;

  const handleRoleSelect = async (role: UserRole) => {
    if (!user) return;

    setIsRedirecting(true);
    
    try {
      // Update user metadata with selected role using server action
      await updateCurrentRole(role);

      // Wait for metadata to propagate
      await new Promise(resolve => setTimeout(resolve, 500));

      // Redirect to appropriate dashboard
      router.push("/dashboard");
    } catch (error) {
      console.error('Error selecting role:', error);
      setIsRedirecting(false);
    }
  };

  // Handle single role users
  useEffect(() => {
    if (user && userRoles.length === 1 && !isRedirecting) {
      handleRoleSelect(userRoles[0]);
    }
  }, [user, userRoles, isRedirecting]);

  if (!user || userRoles.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <p>Loading your roles...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (userRoles.length === 1 || isRedirecting) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <p>Redirecting to your dashboard...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const roleConfig = {
    organizer: {
      icon: Building,
      title: 'Tournament Organizer',
      description: 'Create and manage tournaments, handle registrations, generate reports',
      color: 'bg-blue-500'
    },
    coach: {
      icon: Users,
      title: 'Coach',
      description: 'Manage your team, register athletes for tournaments',
      color: 'bg-green-500'
    },
    athlete: {
      icon: User,
      title: 'Athlete',
      description: 'Participate in tournaments, track your progress',
      color: 'bg-purple-500'
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Choose Your Role</CardTitle>
        <CardDescription>
          Welcome back, {user.firstName}! Which role would you like to use today?
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {userRoles.map((role) => {
          const config = roleConfig[role];
          const Icon = config.icon;
          const isPrimary = role === primaryRole;

          return (
            <div
              key={role}
              className={`
                p-6 border rounded-lg cursor-pointer transition-all hover:shadow-md
                ${selectedRole === role
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                  : 'border-border hover:border-primary/50'
                }
              `}
              onClick={() => setSelectedRole(role)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-full ${config.color} text-white`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{config.title}</h3>
                      {isPrimary && (
                        <span className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded-full">
                          Primary
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground">{config.description}</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          );
        })}

        <div className="pt-4">
          <Button
            onClick={() => selectedRole && handleRoleSelect(selectedRole)}
            disabled={!selectedRole}
            className="w-full"
            size="lg"
          >
            Continue as {selectedRole && roleConfig[selectedRole].title}
          </Button>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p>You can switch roles anytime from your profile settings</p>
        </div>
      </CardContent>
    </Card>
  );
}
