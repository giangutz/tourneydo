"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/client";
import { profileQueries, teamQueries } from "@/lib/supabase/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { UserRole } from "@/lib/types/database";
import { Trophy } from "lucide-react";

export function DebugCompleteProfileForm() {
  const { user } = useUser();
  const router = useRouter();
  const [formData, setFormData] = useState({
    role: "" as UserRole,
    phone: "",
    organization: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const supabase = createClient();

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const testDatabaseConnection = async () => {
    setDebugInfo("Testing database connection...");

    try {
      // Test if profiles table exists
      const { data, error } = await supabase
        .from("profiles")
        .select("count")
        .limit(1);

      if (error) {
        setDebugInfo((prev) => prev + `\nDatabase error: ${error.message}`);
        setDebugInfo((prev) => prev + `\nError code: ${error.code}`);
        setDebugInfo(
          (prev) => prev + `\nError details: ${JSON.stringify(error, null, 2)}`
        );
      } else {
        setDebugInfo((prev) => prev + `\nDatabase connection successful!`);
        setDebugInfo((prev) => prev + `\nProfiles table exists and accessible`);
      }
    } catch (err) {
      setDebugInfo((prev) => prev + `\nConnection test failed: ${err}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    setError(null);
    setDebugInfo("");

    if (!formData.role) {
      setError("Please select a role");
      setIsLoading(false);
      return;
    }

    setDebugInfo("Starting profile creation...");
    setDebugInfo((prev) => prev + `\nUser ID: ${user.id}`);
    setDebugInfo(
      (prev) => prev + `\nEmail: ${user.primaryEmailAddress?.emailAddress}`
    );
    setDebugInfo((prev) => prev + `\nFull Name: ${user.fullName}`);
    setDebugInfo((prev) => prev + `\nRole: ${formData.role}`);

    try {
      // Create profile using new query function
      setDebugInfo((prev) => prev + `\nAttempting to create profile...`);

      const profileData = {
        clerk_id: user.id, // Store Clerk ID in clerk_id field, let Supabase auto-generate UUID for id
        email: user.primaryEmailAddress?.emailAddress || "",
        full_name: user.fullName || "",
        role: formData.role,
        phone: formData.phone || undefined,
        organization: formData.organization || undefined,
        is_active: true // Set default active status
      };

      setDebugInfo(
        (prev) =>
          prev + `\nProfile data: ${JSON.stringify(profileData, null, 2)}`
      );

      // Try to create or update profile using upsert
      const createdProfile = await profileQueries.upsert(profileData);

      if (createdProfile) {
        setDebugInfo((prev) => prev + `\nProfile created/updated successfully`);
        setDebugInfo(
          (prev) =>
            prev +
            `\nProfile result: ${JSON.stringify(createdProfile, null, 2)}`
        );
      } else {
        throw new Error("Failed to create profile");
      }

      // If the user is a coach, create a team
      if (formData.role === "coach" && createdProfile) {
        setDebugInfo((prev) => prev + `\nCreating team for coach...`);

        const teamData = {
          coach_id: createdProfile.id, // Use the profile UUID from the created profile
          name: `${user.fullName}'s Team`,
          organization: formData.organization || undefined,
          is_active: true
        };

        const createdTeam = await teamQueries.create(teamData);

        if (createdTeam) {
          setDebugInfo((prev) => prev + `\nTeam created successfully`);
          setDebugInfo(
            (prev) =>
              prev + `\nTeam result: ${JSON.stringify(createdTeam, null, 2)}`
          );
        } else {
          setDebugInfo((prev) => prev + `\nTeam creation failed`);
        }
      }

      // Update Clerk user metadata
      setDebugInfo((prev) => prev + `\nUpdating Clerk metadata...`);

      await user.update({
        unsafeMetadata: {
          role: formData.role,
          onboardingComplete: true
        }
      });

      setDebugInfo((prev) => prev + `\nClerk metadata updated successfully`);
      setDebugInfo(
        (prev) => prev + `\nProfile setup complete! Redirecting to dashboard...`
      );

      // Redirect after a delay to show debug info
      setTimeout(() => {
        router.push("/dashboard");
      }, 3000);
    } catch (error: unknown) {
      console.error("Profile completion error:", error);
      setDebugInfo(
        (prev) => prev + `\nCaught error: ${JSON.stringify(error, null, 2)}`
      );

      if (error instanceof Error) {
        setError(`Profile setup failed: ${error.message}`);
        setDebugInfo((prev) => prev + `\nError message: ${error.message}`);
        setDebugInfo((prev) => prev + `\nError stack: ${error.stack}`);
      } else {
        setError("An unknown error occurred during profile setup");
        setDebugInfo((prev) => prev + `\nUnknown error type: ${typeof error}`);
      }
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
        <CardTitle className="text-2xl">
          Complete Your Profile (Debug Mode)
        </CardTitle>
        <CardDescription>
          Tell us about yourself to get started with TourneyDo
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Button
            onClick={testDatabaseConnection}
            variant="outline"
            className="w-full"
          >
            Test Database Connection
          </Button>

          {debugInfo && (
            <div className="p-4 bg-gray-100 rounded-lg">
              <Label className="text-sm font-medium">Debug Information:</Label>
              <pre className="text-xs mt-2 whitespace-pre-wrap max-h-40 overflow-y-auto">
                {debugInfo}
              </pre>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          <div className="space-y-2">
            <Label>Welcome, {user.firstName || user.fullName}!</Label>
            <p className="text-sm text-muted-foreground">
              Email: {user.primaryEmailAddress?.emailAddress}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">I am a... *</Label>
            <Select
              onValueChange={(value: string) =>
                handleInputChange("role", value)
              }
            >
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
              {formData.role === "coach" ? "School/Academy" : "Organization"}{" "}
              (Optional)
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
              onChange={(e) =>
                handleInputChange("organization", e.target.value)
              }
            />
          </div>

          {error && (
            <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading
              ? "Setting up your account..."
              : "Complete Setup (Debug)"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
