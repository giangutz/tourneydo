"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tournament } from "@/lib/types/database";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Calendar, 
  MapPin, 
  Users, 
  DollarSign,
  ArrowLeft,
  Save,
  Eye,
  EyeOff,
  AlertCircle
} from "lucide-react";
import Link from "next/link";

interface EditTournamentFormProps {
  tournament: Tournament;
}

export function EditTournamentForm({ tournament }: EditTournamentFormProps) {
  const router = useRouter();
  const supabase = createClient();
  
  const [formData, setFormData] = useState({
    name: tournament.name,
    description: tournament.description || "",
    location: tournament.location,
    tournament_date: tournament.tournament_date.split("T")[0], // Format for date input
    registration_deadline: tournament.registration_deadline.split("T")[0],
    weigh_in_date: tournament.weigh_in_date.split("T")[0],
    entry_fee: tournament.entry_fee.toString(),
    max_participants: tournament.max_participants?.toString() || "",
    rules: tournament.rules || "",
    status: tournament.status
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.name || !formData.location || !formData.tournament_date || 
          !formData.registration_deadline || !formData.weigh_in_date) {
        setError("Please fill in all required fields");
        return;
      }

      // Validate dates
      const tournamentDate = new Date(formData.tournament_date);
      const registrationDeadline = new Date(formData.registration_deadline);
      const weighInDate = new Date(formData.weigh_in_date);

      if (registrationDeadline >= tournamentDate) {
        setError("Registration deadline must be before tournament date");
        return;
      }

      if (weighInDate > tournamentDate) {
        setError("Weigh-in date cannot be after tournament date");
        return;
      }

      // Update tournament
      const { error: updateError } = await supabase
        .from("tournaments")
        .update({
          name: formData.name,
          description: formData.description || null,
          location: formData.location,
          tournament_date: formData.tournament_date,
          registration_deadline: formData.registration_deadline,
          weigh_in_date: formData.weigh_in_date,
          entry_fee: parseFloat(formData.entry_fee) || 0,
          max_participants: formData.max_participants ? parseInt(formData.max_participants) : null,
          rules: formData.rules || null,
          status: formData.status,
          updated_at: new Date().toISOString()
        })
        .eq("id", tournament.id);

      if (updateError) throw updateError;

      setSuccess(true);
      setTimeout(() => {
        router.push(`/dashboard/tournaments/${tournament.id}`);
      }, 1500);

    } catch (error: unknown) {
      console.error("Tournament update error:", error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("An error occurred while updating the tournament");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublishToggle = async () => {
    const newStatus = formData.status === "draft" ? "registration_open" : "draft";
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("tournaments")
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", tournament.id);

      if (error) throw error;

      setFormData(prev => ({ ...prev, status: newStatus }));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);

    } catch (error: unknown) {
      console.error("Status update error:", error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("An error occurred while updating tournament status");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: "Draft", variant: "outline" as const, icon: EyeOff },
      registration_open: { label: "Published", variant: "default" as const, icon: Eye },
      registration_closed: { label: "Registration Closed", variant: "secondary" as const, icon: Eye },
      weigh_in: { label: "Weigh-in", variant: "outline" as const, icon: Eye },
      in_progress: { label: "In Progress", variant: "destructive" as const, icon: Eye },
      completed: { label: "Completed", variant: "outline" as const, icon: Eye },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || 
                  { label: status, variant: "outline" as const, icon: Eye };
    
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center space-x-1">
        <Icon className="h-3 w-3" />
        <span>{config.label}</span>
      </Badge>
    );
  };

  if (success) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="text-green-500 mb-4">
            <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-4">Tournament Updated Successfully!</h2>
          <p className="text-muted-foreground">
            Your tournament details have been saved.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div className="flex items-center justify-between">
        <Link href={`/dashboard/tournaments/${tournament.id}`}>
          <Button variant="ghost">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tournament
          </Button>
        </Link>
        
        <div className="flex items-center space-x-4">
          {getStatusBadge(formData.status)}
          <Button
            onClick={handlePublishToggle}
            disabled={isLoading}
            variant={formData.status === "draft" ? "default" : "outline"}
          >
            {formData.status === "draft" ? (
              <>
                <Eye className="mr-2 h-4 w-4" />
                Publish Tournament
              </>
            ) : (
              <>
                <EyeOff className="mr-2 h-4 w-4" />
                Set as Draft
              </>
            )}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Update tournament name, description, and location
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Tournament Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Enter tournament name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Tournament description (optional)"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleInputChange("location", e.target.value)}
                  placeholder="Tournament venue"
                  className="pl-10"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dates and Schedule */}
        <Card>
          <CardHeader>
            <CardTitle>Dates and Schedule</CardTitle>
            <CardDescription>
              Set tournament date, registration deadline, and weigh-in date
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tournament_date">Tournament Date *</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="tournament_date"
                    type="date"
                    value={formData.tournament_date}
                    onChange={(e) => handleInputChange("tournament_date", e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="registration_deadline">Registration Deadline *</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="registration_deadline"
                    type="date"
                    value={formData.registration_deadline}
                    onChange={(e) => handleInputChange("registration_deadline", e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="weigh_in_date">Weigh-in Date *</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="weigh_in_date"
                    type="date"
                    value={formData.weigh_in_date}
                    onChange={(e) => handleInputChange("weigh_in_date", e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Registration Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Registration Settings</CardTitle>
            <CardDescription>
              Configure entry fee and participant limits
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="entry_fee">Entry Fee (₱)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="entry_fee"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.entry_fee}
                    onChange={(e) => handleInputChange("entry_fee", e.target.value)}
                    placeholder="0.00"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_participants">Max Participants</Label>
                <div className="relative">
                  <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="max_participants"
                    type="number"
                    min="1"
                    value={formData.max_participants}
                    onChange={(e) => handleInputChange("max_participants", e.target.value)}
                    placeholder="Unlimited"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tournament Status */}
        <Card>
          <CardHeader>
            <CardTitle>Tournament Status</CardTitle>
            <CardDescription>
              Control tournament visibility and registration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft (Not visible to public)</SelectItem>
                  <SelectItem value="registration_open">Registration Open</SelectItem>
                  <SelectItem value="registration_closed">Registration Closed</SelectItem>
                  <SelectItem value="weigh_in">Weigh-in Phase</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {formData.status === "draft" 
                  ? "Tournament is not visible to the public and registration is closed"
                  : "Tournament is visible to the public"
                }
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Rules and Additional Information */}
        <Card>
          <CardHeader>
            <CardTitle>Rules and Additional Information</CardTitle>
            <CardDescription>
              Tournament rules and special instructions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rules">Tournament Rules</Label>
              <Textarea
                id="rules"
                value={formData.rules}
                onChange={(e) => handleInputChange("rules", e.target.value)}
                placeholder="Enter tournament rules and regulations"
                rows={6}
              />
            </div>
          </CardContent>
        </Card>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <Link href={`/dashboard/tournaments/${tournament.id}`}>
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
