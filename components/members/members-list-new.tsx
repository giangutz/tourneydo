"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { InviteMemberModal } from "@/components/dashboard/invite-member-modal";
import { 
  Users, 
  Search,
  Clock,
  Mail,
  Building,
  User as UserIcon,
  Plus,
  UserCheck,
  UserX
} from "lucide-react";

interface Profile {
  id: string;
  clerk_id: string;
  email: string;
  full_name: string;
  role: string;
  organization: string | null;
  is_active: boolean;
  created_at: string;
  avatar_url?: string;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  expires_at: string;
}

interface MembersListProps {
  organizerId: string;
  organizerName: string;
}

export function MembersList({ organizerId, organizerName }: MembersListProps) {
  const [members, setMembers] = useState<Profile[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const supabase = createClient();

  const fetchData = async () => {
    try {
      // Get current profile to find organization
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('organization')
        .eq('id', organizerId)
        .single();

      if (!currentProfile?.organization) {
        setLoading(false);
        return;
      }

      // Fetch organization members
      const { data: membersData, error: membersError } = await supabase
        .from('profiles')
        .select('*')
        .eq('organization', currentProfile.organization)
        .eq('is_active', true);

      if (membersError) {
        console.error('Error fetching members:', membersError);
      } else {
        setMembers(membersData || []);
      }

      // Fetch pending invitations
      const { data: invitationsData, error: invitationsError } = await supabase
        .from('member_invitations')
        .select('*')
        .eq('organization_id', currentProfile.organization)
        .eq('status', 'pending');

      if (invitationsError) {
        console.error('Error fetching invitations:', invitationsError);
      } else {
        setInvitations(invitationsData || []);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [organizerId]);

  const filteredMembers = members.filter(member =>
    member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'organizer':
        return <Building className="h-4 w-4" />;
      case 'coach':
        return <Users className="h-4 w-4" />;
      case 'athlete':
        return <UserIcon className="h-4 w-4" />;
      default:
        return <UserIcon className="h-4 w-4" />;
    }
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      organizer: { variant: "default", label: "Organizer" },
      coach: { variant: "secondary", label: "Coach" },
      athlete: { variant: "outline", label: "Athlete" },
    };
    
    const config = variants[role] || { variant: "outline", label: role };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">Loading members...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <InviteMemberModal 
          organizationId={organizerId} 
          onInviteSent={fetchData}
        />
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Pending Invitations ({invitations.length})</h3>
            </div>
            <div className="space-y-3">
              {invitations.map((invitation) => (
                <div key={invitation.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{invitation.email}</p>
                      <p className="text-sm text-muted-foreground">
                        Invited as {invitation.role} • Expires {new Date(invitation.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">Pending</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Members List */}
      {filteredMembers.length === 0 ? (
        <div className="text-center py-16">
          <div className="max-w-md mx-auto">
            <Users className="h-16 w-16 text-muted-foreground mx-auto mb-6 opacity-50" />
            <h3 className="text-2xl font-semibold mb-3">
              {members.length === 0 ? "No members yet" : "No members match your search"}
            </h3>
            <p className="text-muted-foreground mb-6 text-lg">
              {members.length === 0 
                ? "Invite your first team member to start collaborating on tournaments"
                : "Try adjusting your search criteria"}
            </p>
            {members.length === 0 && (
              <InviteMemberModal 
                organizationId={organizerId} 
                onInviteSent={fetchData}
              />
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Member Count */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {filteredMembers.length} of {members.length} members
            </p>
          </div>

          {/* Member Cards */}
          <div className="grid gap-4">
            {filteredMembers.map((member) => (
              <Card key={member.id} className="hover:shadow-md transition-all duration-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    {/* Member Info */}
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <Avatar className="h-12 w-12 flex-shrink-0">
                        <AvatarImage src={member.avatar_url} alt={member.full_name} />
                        <AvatarFallback>
                          {member.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold truncate">{member.full_name}</h3>
                        <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex items-center gap-1">
                            {getRoleIcon(member.role)}
                            {getRoleBadge(member.role)}
                          </div>
                          <Badge variant={member.is_active ? "default" : "secondary"}>
                            {member.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                      >
                        {member.is_active ? (
                          <>
                            <UserX className="h-3 w-3 mr-2" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-3 w-3 mr-2" />
                            Activate
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
