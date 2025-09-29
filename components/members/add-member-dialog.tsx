"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, UserPlus } from "lucide-react";

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizerId: string;
  organizerName: string;
  onMemberAdded: () => void;
}

export function AddMemberDialog({ open, onOpenChange, organizerId, organizerName, onMemberAdded }: AddMemberDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    role: "standard_member",
    avatar_url: "",
    send_invitation: true,
  });

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("members")
        .insert([
          {
            full_name: formData.full_name,
            email: formData.email,
            role: formData.role,
            avatar_url: formData.avatar_url || null,
            organizer_id: organizerId,
            status: "active",
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Send invitation email if requested
      if (formData.send_invitation && data) {
        try {
          // Call API route to send invitation email
          const response = await fetch('/api/send-member-invitation', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: formData.email,
              name: formData.full_name,
              organizerName: organizerName,
              role: formData.role,
              inviteLink: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/members`,
            }),
          });

          if (response.ok) {
            console.log('Invitation email sent successfully');
          } else {
            console.error('Failed to send invitation email');
          }
        } catch (emailError) {
          console.error('Failed to send invitation email:', emailError);
          // Continue even if email fails - member was created successfully
        }
      }

      // Reset form
      setFormData({
        full_name: "",
        email: "",
        role: "standard_member",
        avatar_url: "",
        send_invitation: true,
      });

      onMemberAdded();
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding member:", error);
      // TODO: Add proper error handling/toast
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <UserPlus className="mr-2 h-5 w-5" />
            Add New Member
          </DialogTitle>
          <DialogDescription>
            Add a new team member to help manage your tournaments. They will receive access based on their assigned role.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name *</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => handleInputChange("full_name", e.target.value)}
              placeholder="Enter member's full name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              placeholder="member@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={formData.role} onValueChange={(value) => handleInputChange("role", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Admin</span>
                    <span className="text-xs text-muted-foreground">Full access to all features</span>
                  </div>
                </SelectItem>
                <SelectItem value="bracket_manager">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Bracket Manager</span>
                    <span className="text-xs text-muted-foreground">Manage brackets and match results</span>
                  </div>
                </SelectItem>
                <SelectItem value="standard_member">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Standard Member</span>
                    <span className="text-xs text-muted-foreground">View-only access to schedules and results</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="avatar_url">Avatar URL (Optional)</Label>
            <Input
              id="avatar_url"
              type="url"
              value={formData.avatar_url}
              onChange={(e) => handleInputChange("avatar_url", e.target.value)}
              placeholder="https://example.com/avatar.jpg"
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="send_invitation"
              checked={formData.send_invitation}
              onChange={(e) => handleInputChange("send_invitation", e.target.checked)}
              className="rounded border-gray-300"
            />
            <Label htmlFor="send_invitation" className="text-sm">
              Send invitation email to this member
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Member
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
