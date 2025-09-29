"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { createUserProfiles } from "@/lib/supabase/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { UserRole } from "@/lib/types/database";
import {
  Trophy,
  Users,
  User,
  ChevronRight,
  ChevronLeft,
  Check,
  Building,
  Phone,
  Mail
} from "lucide-react";

interface FormData {
  roles: UserRole[];
  organization?: string;
  teamName?: string;
  phone?: string;
  contactEmail?: string;
  bio?: string;
}

const STEPS = [
  {
    id: 1,
    title: "Choose Your Role",
    description: "Select all roles that apply to you"
  },
  {
    id: 2,
    title: "Organization Details",
    description: "Tell us about your organization"
  },
  { id: 3, title: "Contact Information", description: "How can we reach you?" }
];

export function MultiStepProfileForm() {
  const { user } = useUser();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    roles: [],
    organization: "",
    teamName: "",
    phone: "",
    contactEmail: user?.primaryEmailAddress?.emailAddress || "",
    bio: ""
  });

  const handleRoleToggle = (role: UserRole) => {
    setFormData((prev) => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter((r) => r !== role)
        : [...prev.roles, role]
    }));
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const canProceedFromStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return formData.roles.length > 0;
      case 2:
        // Organization required for organizers, team name required for coaches
        if (
          formData.roles.includes("organizer") &&
          !formData.organization?.trim()
        ) {
          return false;
        }
        if (formData.roles.includes("coach") && !formData.teamName?.trim()) {
          return false;
        }
        return true;
      case 3:
        return true; // Contact info is optional
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (canProceedFromStep(currentStep) && currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!user || !canProceedFromStep(currentStep)) return;

    setIsLoading(true);
    setError(null);

    try {
      // Use server action with admin client to bypass RLS
      const result = await createUserProfiles({
        roles: formData.roles,
        organization: formData.organization,
        teamName: formData.teamName,
        phone: formData.phone,
        contactEmail: formData.contactEmail,
        bio: formData.bio
      });

      if (result.success) {
        // Update Clerk user metadata with all roles FIRST
        await user.update({
          unsafeMetadata: {
            roles: formData.roles, // All selected roles
            primaryRole: formData.roles[0], // Primary role stored in database
            currentRole: formData.roles.length === 1 ? formData.roles[0] : null, // Only set currentRole for single role users
            onboardingComplete: true
          }
        });

        // Wait a moment for metadata to propagate
        await new Promise(resolve => setTimeout(resolve, 500));

        // Redirect based on number of roles
        if (formData.roles.length === 1) {
          // Single role - go directly to dashboard
          router.push('/dashboard');
        } else {
          // Multiple roles - go to role selection
          router.push('/auth/select-role');
        }
      } else {
        throw new Error("Failed to create profiles");
      }

    } catch (error: unknown) {
      console.error("Profile completion error:", error);
      if (error instanceof Error) {
        setError(`Setup failed: ${error.message}`);
      } else {
        setError("An unknown error occurred during setup");
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

  const progress = (currentStep / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Trophy className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold">
            Welcome to TourneyDo!
          </CardTitle>
          <CardDescription className="text-lg">
            Hi {user.firstName || user.fullName}! Let&apos;s set up your account
          </CardDescription>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>
                Step {currentStep} of {STEPS.length}
              </span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step Indicator */}
          <div className="flex justify-center space-x-4 mb-8">
            {STEPS.map((step) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`
                  flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium
                  ${
                    currentStep >= step.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }
                `}
                >
                  {currentStep > step.id ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    step.id
                  )}
                </div>
                {step.id < STEPS.length && (
                  <div
                    className={`
                    w-12 h-0.5 mx-2
                    ${currentStep > step.id ? "bg-primary" : "bg-muted"}
                  `}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step Content */}
          <div className="min-h-[300px]">
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-xl font-semibold mb-2">
                    {STEPS[0].title}
                  </h3>
                  <p className="text-muted-foreground">
                    {STEPS[0].description}
                  </p>
                </div>

                <div className="grid gap-4">
                  {[
                    {
                      role: "organizer" as UserRole,
                      icon: Building,
                      title: "Tournament Organizer",
                      description:
                        "Create and manage tournaments, handle registrations, generate reports"
                    },
                    {
                      role: "coach" as UserRole,
                      icon: Users,
                      title: "Coach",
                      description:
                        "Manage your team, register athletes for tournaments"
                    },
                    {
                      role: "athlete" as UserRole,
                      icon: User,
                      title: "Athlete",
                      description:
                        "Participate in tournaments, track your progress"
                    }
                  ].map(({ role, icon: Icon, title, description }) => (
                    <div
                      key={role}
                      className={`
                        p-4 border rounded-lg cursor-pointer transition-all
                        ${
                          formData.roles.includes(role)
                            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                            : "border-border hover:border-primary/50"
                        }
                      `}
                      onClick={() => handleRoleToggle(role)}
                    >
                      <div className="flex items-start space-x-3">
                        <Icon className="h-6 w-6 text-primary mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{title}</h4>
                            {formData.roles.includes(role) && (
                              <Badge variant="default" className="ml-2">
                                Selected
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {formData.roles.length > 1 && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Multiple roles selected:</strong> You&apos;ll be able
                      to switch between roles after setup.
                    </p>
                  </div>
                )}
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-xl font-semibold mb-2">
                    {STEPS[1].title}
                  </h3>
                  <p className="text-muted-foreground">
                    {STEPS[1].description}
                  </p>
                </div>

                <div className="space-y-4">
                  {formData.roles.includes("organizer") && (
                    <div className="space-y-2">
                      <Label
                        htmlFor="organization"
                        className="flex items-center gap-2"
                      >
                        <Building className="h-4 w-4" />
                        Organization Name *
                      </Label>
                      <Input
                        id="organization"
                        placeholder="e.g., Philippine Taekwondo Association"
                        value={formData.organization}
                        onChange={(e) =>
                          handleInputChange("organization", e.target.value)
                        }
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        This will appear on tournaments you organize
                      </p>
                    </div>
                  )}

                  {formData.roles.includes("coach") && (
                    <div className="space-y-2">
                      <Label
                        htmlFor="teamName"
                        className="flex items-center gap-2"
                      >
                        <Users className="h-4 w-4" />
                        Team/Academy Name *
                      </Label>
                      <Input
                        id="teamName"
                        placeholder="e.g., Elite Taekwondo Academy"
                        value={formData.teamName}
                        onChange={(e) =>
                          handleInputChange("teamName", e.target.value)
                        }
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Your athletes will be registered under this team
                      </p>
                    </div>
                  )}

                  {!formData.roles.includes("organizer") &&
                    !formData.roles.includes("coach") && (
                      <div className="space-y-2">
                        <Label htmlFor="organization">
                          Organization (Optional)
                        </Label>
                        <Input
                          id="organization"
                          placeholder="e.g., Your school or club"
                          value={formData.organization}
                          onChange={(e) =>
                            handleInputChange("organization", e.target.value)
                          }
                        />
                      </div>
                    )}

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio (Optional)</Label>
                    <Textarea
                      id="bio"
                      placeholder="Tell us a bit about yourself..."
                      value={formData.bio}
                      onChange={(e) => handleInputChange("bio", e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-xl font-semibold mb-2">
                    {STEPS[2].title}
                  </h3>
                  <p className="text-muted-foreground">
                    {STEPS[2].description}
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="contactEmail"
                      className="flex items-center gap-2"
                    >
                      <Mail className="h-4 w-4" />
                      Contact Email
                    </Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) =>
                        handleInputChange("contactEmail", e.target.value)
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      We&apos;ll use this for tournament notifications and updates
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Phone Number (Optional)
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+63 912 345 6789"
                      value={formData.phone}
                      onChange={(e) =>
                        handleInputChange("phone", e.target.value)
                      }
                    />
                  </div>
                </div>

                {/* Summary */}
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-3">Setup Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong>Roles:</strong>{" "}
                      {formData.roles
                        .map(
                          (role) => role.charAt(0).toUpperCase() + role.slice(1)
                        )
                        .join(", ")}
                    </div>
                    {formData.organization && (
                      <div>
                        <strong>Organization:</strong> {formData.organization}
                      </div>
                    )}
                    {formData.teamName && (
                      <div>
                        <strong>Team:</strong> {formData.teamName}
                      </div>
                    )}
                    <div>
                      <strong>Email:</strong> {formData.contactEmail}
                    </div>
                    {formData.phone && (
                      <div>
                        <strong>Phone:</strong> {formData.phone}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>

            {currentStep < STEPS.length ? (
              <Button
                onClick={nextStep}
                disabled={!canProceedFromStep(currentStep)}
                className="flex items-center gap-2"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isLoading || !canProceedFromStep(currentStep)}
                className="flex items-center gap-2"
              >
                {isLoading ? "Setting up..." : "Complete Setup"}
                <Check className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
