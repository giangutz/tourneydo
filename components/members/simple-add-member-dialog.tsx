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

interface SimpleAddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizerId: string;
  organizerName: string;
  onMemberAdded: () => void;
}

export function SimpleAddMemberDialog({ open, onOpenChange, organizerId, onMemberAdded }: SimpleAddMemberDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    role: "standard_member",
    avatar_url: "",
  });

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // First, get the current user to make sure we have the right ID
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current user:', user);
      console.log('Provided organizerId:', organizerId);

      // For testing, use a known test ID if auth fails
      let actualOrganizerId = user?.id || organizerId;
      
      // If still no user ID, use test ID
      if (!actualOrganizerId) {
        actualOrganizerId = 'test-organizer-id';
        console.log('Using test organizer ID:', actualOrganizerId);
      }

      console.log('Attempting to insert member with data:', {
        full_name: formData.full_name,
        email: formData.email,
        role: formData.role,
        avatar_url: formData.avatar_url || null,
        organizer_id: actualOrganizerId,
        status: "active",
      });

      const { data, error } = await supabase
        .from("members")
        .insert([
          {
            full_name: formData.full_name,
            email: formData.email,
            role: formData.role,
            avatar_url: formData.avatar_url || null,
            organizer_id: actualOrganizerId,
            status: "active",
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Member created successfully:', data);

      // Reset form
      setFormData({
        full_name: "",
        email: "",
        role: "standard_member",
        avatar_url: "",
      });

      onMemberAdded();
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding member:", error);
      // Show more detailed error information
      if (error && typeof error === 'object') {
        console.error("Error details:", JSON.stringify(error, null, 2));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <UserPlus className="mr-2 h-5 w-5" />
            Add New Member (Simple)
          </DialogTitle>
          <DialogDescription>
            Add a new team member to help manage your tournaments.
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
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="bracket_manager">Bracket Manager</SelectItem>
                <SelectItem value="standard_member">Standard Member</SelectItem>
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
