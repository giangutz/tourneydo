"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserRole } from "@/lib/types/database";
import { Trophy } from "lucide-react";

export function CompleteProfileForm() {
  const { user } = useUser();
  const router = useRouter();
  const [formData, setFormData] = useState({
    role: "" as UserRole,
    phone: "",
    organization: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    setError(null);

    if (!formData.role) {
      setError("Please select a role");
      setIsLoading(false);
      return;
    }

    try {
      // Create profile in Supabase
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: user.id,
          email: user.primaryEmailAddress?.emailAddress || "",
          full_name: user.fullName || "",
          role: formData.role,
          phone: formData.phone || null,
          organization: formData.organization || null,
        });

      if (profileError) {
        // If profile already exists, update it
        if (profileError.code === "23505") {
          const { error: updateError } = await supabase
            .from("profiles")
            .update({
              role: formData.role,
              phone: formData.phone || null,
              organization: formData.organization || null,
            })
            .eq("id", user.id);

          if (updateError) throw updateError;
        } else {
          throw profileError;
        }
      }

      // If the user is a coach, create a team
      if (formData.role === "coach") {
        const { error: teamError } = await supabase
          .from("teams")
          .insert({
            coach_id: user.id,
            name: `${user.fullName}'s Team`,
            organization: formData.organization || null,
          });

        if (teamError && teamError.code !== "23505") {
          console.error("Team creation error:", teamError);
        }
      }

      // Update Clerk user metadata
      await user.update({
        unsafeMetadata: {
          role: formData.role,
          onboardingComplete: true,
        },
      });

      router.push("/dashboard");
    } catch (error: unknown) {
      console.error("Profile completion error:", error);
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <p>Loading user information...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Trophy className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
        <CardDescription>
          Tell us about yourself to get started with TourneyDo
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label>Welcome, {user.firstName || user.fullName}!</Label>
            <p className="text-sm text-muted-foreground">
              Email: {user.primaryEmailAddress?.emailAddress}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">I am a... *</Label>
            <Select onValueChange={(value: string) => handleInputChange("role", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select your role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="organizer">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Tournament Organizer</span>
                    <span className="text-xs text-muted-foreground">
                      Create and manage tournaments
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="coach">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Coach</span>
                    <span className="text-xs text-muted-foreground">
                      Manage athletes and register for tournaments
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="athlete">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Athlete</span>
                    <span className="text-xs text-muted-foreground">
                      Participate in tournaments
                    </span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number (Optional)</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={formData.phone}
              onChange={(e) => handleInputChange("phone", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="organization">
              {formData.role === "coach" ? "School/Academy" : "Organization"} (Optional)
            </Label>
            <Input
              id="organization"
              type="text"
              placeholder={
                formData.role === "coach" 
                  ? "ABC Taekwondo Academy" 
                  : "Your organization"
              }
              value={formData.organization}
              onChange={(e) => handleInputChange("organization", e.target.value)}
            />
          </div>

          {error && (
            <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Setting up your account..." : "Complete Setup"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
