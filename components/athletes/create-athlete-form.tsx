"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { CreateAthleteData, BeltRank, Gender } from "@/lib/types/database";
import {
  User,
  Calendar,
  Award,
  Weight,
  Ruler,
  Phone,
  Heart
} from "lucide-react";

interface CreateAthleteFormProps {
  teamId: string;
}

export function CreateAthleteForm({ teamId }: CreateAthleteFormProps) {
  const [formData, setFormData] = useState<CreateAthleteData>({
    full_name: "",
    date_of_birth: "",
    gender: "male",
    belt_rank: "white",
    weight_class: undefined,
    height: undefined,
    emergency_contact_name: "",
    emergency_contact_phone: "",
    medical_conditions: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleInputChange = (
    field: keyof CreateAthleteData,
    value: string | number | Gender | BeltRank
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Validate age (must be reasonable for taekwondo)
      const birthDate = new Date(formData.date_of_birth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();

      if (age < 4 || age > 80) {
        throw new Error("Athlete age must be between 4 and 80 years");
      }

      // Create athlete
      const { error: athleteError } = await supabase
        .from("athletes")
        .insert({
          team_id: teamId,
          full_name: formData.full_name,
          date_of_birth: formData.date_of_birth,
          gender: formData.gender,
          belt_rank: formData.belt_rank,
          weight_class: formData.weight_class || null,
          height: formData.height || null,
          emergency_contact_name: formData.emergency_contact_name || null,
          emergency_contact_phone: formData.emergency_contact_phone || null,
          medical_conditions: formData.medical_conditions || null
        })

      if (athleteError) throw athleteError;

      // Redirect to athletes list
      router.push("/dashboard/athletes");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const beltRanks: { value: BeltRank; label: string }[] = [
    { value: "white", label: "White Belt" },
    { value: "yellow", label: "Yellow Belt" },
    { value: "blue", label: "Blue Belt" },
    { value: "red", label: "Red Belt" },
    { value: "brown", label: "Brown Belt" },
    { value: "black", label: "Black Belt" }
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="mr-2 h-5 w-5" />
            Personal Information
          </CardTitle>
          <CardDescription>
            Enter the athlete&apos;s basic information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                placeholder="John Doe"
                value={formData.full_name}
                onChange={(e) => handleInputChange("full_name", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date_of_birth">Date of Birth *</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="date_of_birth"
                  type="date"
                  className="pl-10"
                  value={formData.date_of_birth}
                  onChange={(e) =>
                    handleInputChange("date_of_birth", e.target.value)
                  }
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="gender">Gender *</Label>
              <Select
                onValueChange={(value: Gender) =>
                  handleInputChange("gender", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="belt_rank">Belt Rank *</Label>
              <div className="relative">
                <Award className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                <Select
                  onValueChange={(value: BeltRank) =>
                    handleInputChange("belt_rank", value)
                  }
                >
                  <SelectTrigger className="pl-10">
                    <SelectValue placeholder="Select belt rank" />
                  </SelectTrigger>
                  <SelectContent>
                    {beltRanks.map((belt) => (
                      <SelectItem key={belt.value} value={belt.value}>
                        {belt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Weight className="mr-2 h-5 w-5" />
            Physical Information
          </CardTitle>
          <CardDescription>
            Enter weight and height information (optional but recommended)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="weight_class">Weight (kg)</Label>
              <div className="relative">
                <Weight className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="weight_class"
                  type="number"
                  min="20"
                  max="200"
                  step="0.1"
                  placeholder="65.5"
                  className="pl-10"
                  value={formData.weight_class || ""}
                  onChange={(e) =>
                    handleInputChange(
                      "weight_class",
                      parseFloat(e.target.value) || undefined
                    )
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="height">Height (cm)</Label>
              <div className="relative">
                <Ruler className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="height"
                  type="number"
                  min="100"
                  max="250"
                  step="0.1"
                  placeholder="175.5"
                  className="pl-10"
                  value={formData.height || ""}
                  onChange={(e) =>
                    handleInputChange(
                      "height",
                      parseFloat(e.target.value) || undefined
                    )
                  }
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Phone className="mr-2 h-5 w-5" />
            Emergency Contact
          </CardTitle>
          <CardDescription>
            Emergency contact information (recommended)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="emergency_contact_name">Contact Name</Label>
              <Input
                id="emergency_contact_name"
                placeholder="Jane Doe"
                value={formData.emergency_contact_name}
                onChange={(e) =>
                  handleInputChange("emergency_contact_name", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergency_contact_phone">Contact Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="emergency_contact_phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  className="pl-10"
                  value={formData.emergency_contact_phone}
                  onChange={(e) =>
                    handleInputChange("emergency_contact_phone", e.target.value)
                  }
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Heart className="mr-2 h-5 w-5" />
            Medical Information
          </CardTitle>
          <CardDescription>
            Any medical conditions or allergies (optional)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            id="medical_conditions"
            placeholder="Enter any medical conditions, allergies, or special requirements..."
            value={formData.medical_conditions}
            onChange={(e) =>
              handleInputChange("medical_conditions", e.target.value)
            }
            rows={4}
          />
        </CardContent>
      </Card>

      {error && (
        <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="flex justify-end space-x-4">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Adding Athlete..." : "Add Athlete"}
        </Button>
      </div>
    </form>
  );
}
