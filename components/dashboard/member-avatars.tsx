"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";
import { AvatarGroup } from "@/components/ui/avatar-group";
import { NotificationSystem } from "@/components/notifications/notification-system";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface MemberAvatarsProps {
  profile: Profile;
}

export function MemberAvatars({ profile }: MemberAvatarsProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (profile.role === "organizer") {
      fetchMembers();
    } else {
      setLoading(false);
    }
  }, [profile]);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .eq("organizer_id", profile.id)
        .eq("status", "active")
        .order("created_at", { ascending: true })
        .limit(2);

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error("Error fetching members:", error);
    } finally {
      setLoading(false);
    }
  };

  // Only show for organizers
  if (profile.role !== "organizer" || loading) {
    return null;
  }

  const displayMembers = members.slice(0, 2);
  const hasMoreMembers = members.length > 2;

  return (
    <div className="flex items-center space-x-2">
      {/* Organizer Avatar (always first) */}
      <Avatar className="h-8 w-8 border-2 border-background">
        <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
          {profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
        </AvatarFallback>
      </Avatar>

      {/* Member Avatars (up to 2) */}
      {displayMembers.map((member) => (
        <Avatar key={member.id} className="h-8 w-8 border-2 border-background">
          <AvatarImage src={member.avatar_url} alt={member.full_name} />
          <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
            {member.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
          </AvatarFallback>
        </Avatar>
      ))}

      {/* Plus Button */}
      <Dialog open={showMembersDialog} onOpenChange={setShowMembersDialog}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 w-8 p-0 rounded-full">
            <Plus className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Team Members</DialogTitle>
            <DialogDescription>
              Manage your tournament team members and their roles.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Organizer */}
            <div className="flex items-center space-x-3 p-3 bg-primary/5 rounded-lg">
              <Avatar className="h-10 w-10">
                <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                <AvatarFallback>
                  {profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{profile.full_name}</p>
                <p className="text-sm text-muted-foreground truncate">{profile.email}</p>
              </div>
              <Badge>Organizer</Badge>
            </div>

            {/* Members */}
            {members.length > 0 ? (
              <div className="space-y-2">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.avatar_url} alt={member.full_name} />
                      <AvatarFallback>
                        {member.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{member.full_name}</p>
                      <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                    </div>
                    <Badge variant="secondary">
                      {member.role === "bracket_manager" ? "Bracket Manager" : 
                       member.role === "admin" ? "Admin" : "Member"}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground mb-4">No team members yet</p>
                <Button onClick={() => {
                  setShowMembersDialog(false);
                  // Navigate to members page
                  window.location.href = "/dashboard/members";
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Members
                </Button>
              </div>
            )}
          </div>

          {members.length > 0 && (
            <div className="flex justify-center pt-4 border-t">
              <Button variant="outline" onClick={() => {
                setShowMembersDialog(false);
                window.location.href = "/dashboard/members";
              }}>
                Manage All Members
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
