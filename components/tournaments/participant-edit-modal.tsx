"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Edit, User, Calendar, Scale, Ruler, Mail, Trophy } from "lucide-react";

interface Registration {
  id: string;
  athlete: {
    id: string;
    full_name: string;
    email: string;
    gender: string;
    date_of_birth: string;
    belt_rank: string;
    weight: number;
    height: number;
  };
  team: {
    id: string;
    name: string;
  };
  payment_status: string;
  checked_in: boolean;
  weighed_in: boolean;
  weight_recorded?: number;
  height_recorded?: number;
  notes?: string;
}

interface ParticipantEditModalProps {
  registration: Registration | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function ParticipantEditModal({
  registration,
  isOpen,
  onClose,
  onUpdate
}: ParticipantEditModalProps) {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    gender: "",
    date_of_birth: "",
    belt_rank: "",
    weight: "",
    height: "",
    weight_recorded: "",
    height_recorded: "",
    notes: ""
  });
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState("");

  const supabase = createClient();

  useEffect(() => {
    if (registration) {
      setFormData({
        full_name: registration.athlete.full_name || "",
        email: registration.athlete.email || "",
        gender: registration.athlete.gender || "",
        date_of_birth: registration.athlete.date_of_birth || "",
        belt_rank: registration.athlete.belt_rank || "",
        weight: registration.athlete.weight?.toString() || "",
        height: registration.athlete.height?.toString() || "",
        weight_recorded: registration.weight_recorded?.toString() || "",
        height_recorded: registration.height_recorded?.toString() || "",
        notes: registration.notes || ""
      });
      setSelectedTeam(registration.team.id);
      fetchTeams();
    }
  }, [registration]);

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setTeams(data || []);
    } catch (error) {
      console.error("Error fetching teams:", error);
    }
  };

  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return 0;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registration) return;

    setLoading(true);
    try {
      // Update athlete information
      const mapBeltToDb = (belt: string) => {
        if (!belt) return null as any;
        if (belt === 'black') return 'black_1';
        if (belt === 'red') return 'brown'; // temporary mapping until enum updated
        return belt;
      };

      const { error: athleteError } = await supabase
        .from("athletes")
        .update({
          full_name: formData.full_name,
          gender: formData.gender,
          date_of_birth: formData.date_of_birth,
          belt_rank: mapBeltToDb(formData.belt_rank),
          weight_class: formData.weight ? parseFloat(formData.weight) : null,
          height: formData.height ? parseFloat(formData.height) : null,
        })
        .eq("id", registration.athlete.id);

      if (athleteError) throw athleteError;

      // Update registration information
      const registrationUpdate: any = {
        notes: formData.notes
      };

      if (formData.weight_recorded) {
        registrationUpdate.weight_recorded = parseFloat(formData.weight_recorded);
      }
      if (formData.height_recorded) {
        registrationUpdate.height_recorded = parseFloat(formData.height_recorded);
      }

      const { error: regError } = await supabase
        .from("tournament_registrations")
        .update(registrationUpdate)
        .eq("id", registration.id);

      if (regError) throw regError;

      // Update team if changed
      if (selectedTeam !== registration.team.id) {
        const { error: teamError } = await supabase
          .from("tournament_registrations")
          .update({ team_id: selectedTeam })
          .eq("id", registration.id);

        if (teamError) throw teamError;
      }

      onUpdate();
      onClose();
    } catch (error) {
      console.error("Error updating participant:", error);
      alert("Error updating participant. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!registration) return null;

  const age = calculateAge(formData.date_of_birth);
  const requiresHeight = age < 12;
  const requiresWeight = age >= 12;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Edit className="h-5 w-5 mr-2" />
            Edit Participant Details
          </DialogTitle>
          <DialogDescription>
            Update athlete information and registration details
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6 py-4">
            {/* Current Status */}
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">Current Status</div>
                <div className="flex items-center space-x-2">
                  <Badge variant={registration.payment_status === "paid" ? "default" : "outline"}>
                    {registration.payment_status.toUpperCase()}
                  </Badge>
                  {registration.checked_in && (
                    <Badge variant="secondary">Checked In</Badge>
                  )}
                  {registration.weighed_in && (
                    <Badge variant="default">Weighed In</Badge>
                  )}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Team: {registration.team.name} • Age: {age} years
              </div>
            </div>

            {/* Personal Information */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-3">
                <User className="h-4 w-4" />
                <h3 className="font-medium">Personal Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => handleInputChange("full_name", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">Gender *</Label>
                  <Select value={formData.gender} onValueChange={(value) => handleInputChange("gender", value)}>
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
                  <Label htmlFor="date_of_birth">Date of Birth *</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => handleInputChange("date_of_birth", e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Competition Details */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-3">
                <Trophy className="h-4 w-4" />
                <h3 className="font-medium">Competition Details</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="belt_rank">Belt Rank *</Label>
                  <Select value={formData.belt_rank} onValueChange={(value) => handleInputChange("belt_rank", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select belt rank" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="white">White</SelectItem>
                      <SelectItem value="yellow">Yellow</SelectItem>
                      <SelectItem value="blue">Blue</SelectItem>
                      <SelectItem value="red">Red</SelectItem>
                      <SelectItem value="brown">Brown</SelectItem>
                      <SelectItem value="black">Black</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="team">Team</Label>
                  <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Physical Measurements */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-3">
                <Scale className="h-4 w-4" />
                <h3 className="font-medium">Physical Measurements</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weight">
                    Registration Weight (kg) {requiresWeight && "*"}
                  </Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.1"
                    value={formData.weight}
                    onChange={(e) => handleInputChange("weight", e.target.value)}
                    required={requiresWeight}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="height">
                    Registration Height (cm) {requiresHeight && "*"}
                  </Label>
                  <Input
                    id="height"
                    type="number"
                    step="0.1"
                    value={formData.height}
                    onChange={(e) => handleInputChange("height", e.target.value)}
                    required={requiresHeight}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weight_recorded">Official Weight (kg)</Label>
                  <Input
                    id="weight_recorded"
                    type="number"
                    step="0.1"
                    value={formData.weight_recorded}
                    onChange={(e) => handleInputChange("weight_recorded", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="height_recorded">Official Height (cm)</Label>
                  <Input
                    id="height_recorded"
                    type="number"
                    step="0.1"
                    value={formData.height_recorded}
                    onChange={(e) => handleInputChange("height_recorded", e.target.value)}
                  />
                </div>
              </div>

              {/* Age-based Requirements Info */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm text-blue-800">
                  <strong>Division Requirements:</strong>
                  {age < 12 ? (
                    <span> Height is required for athletes under 12 years old</span>
                  ) : (
                    <span> Weight is required for athletes 12 years and older</span>
                  )}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                rows={3}
                placeholder="Additional notes about this participant..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update Participant"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
