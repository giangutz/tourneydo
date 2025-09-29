/* eslint-disable  @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Trophy, 
  Users, 
  Shuffle, 
  AlertTriangle,
  CheckCircle,
  Info
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Tournament {
  id: string;
  name: string;
  organizer_id: string;
}

interface UserProfile {
  id: string;
  role: string;
}

interface Registration {
  id: string;
  athlete: {
    id: string;
    full_name: string;
    gender: string;
    age: number;
    belt_rank: string;
    weight: number;
    height: number;
  };
  team: {
    id: string;
    name: string;
  };
  weighed_in: boolean;
  weight_recorded: number;
}

interface Division {
  id: string;
  name: string;
  category: string;
  gender: string;
  min_age: number;
  max_age: number;
  min_weight?: number;
  max_weight?: number;
  min_height?: number;
  max_height?: number;
  participants: Registration[];
}

interface DivisionManagementProps {
  tournament: Tournament;
  userProfile: UserProfile;
  registrations: Registration[];
  divisions: Division[];
  onDivisionsUpdate: () => void;
  loading: boolean;
}

// Taekwondo Division Rules
const DIVISION_RULES = {
  gradeschool: {
    name: "Gradeschool",
    ageRange: { min: 5, max: 11 },
    criteria: "height",
    groups: [
      { name: "Group 0", min: 0, max: 120 },
      { name: "Group 1", min: 120, max: 128 },
      { name: "Group 2", min: 128, max: 136 },
      { name: "Group 3", min: 136, max: 144 },
      { name: "Group 4", min: 144, max: 152 },
      { name: "Group 5", min: 152, max: 160 },
      { name: "Group 6", min: 160, max: 168 },
    ]
  },
  cadet: {
    name: "Cadet",
    ageRange: { min: 12, max: 14 },
    criteria: "weight",
    male: [-33, -37, -41, -45, -49, -53, -57, -61, 61],
    female: [-29, -33, -37, -41, -44, -47, -51, -55, 55]
  },
  junior: {
    name: "Junior",
    ageRange: { min: 15, max: 17 },
    criteria: "weight",
    male: [-45, -48, -51, -55, -59, -63, -68, -73, -78, 78],
    female: [-42, -44, -46, -49, -52, -55, -59, -63, -68, 68]
  },
  senior: {
    name: "Senior",
    ageRange: { min: 18, max: 100 },
    criteria: "weight",
    male: [-54, -58, -63, -68, -74, -80, -87, 87],
    female: [-46, -49, -53, -57, -62, -67, -73, 73]
  }
};

export function DivisionManagement({ 
  tournament, 
  userProfile, 
  registrations, 
  divisions, 
  onDivisionsUpdate, 
  loading 
}: DivisionManagementProps) {
  const [generating, setGenerating] = useState(false);
  const supabase = createClient();
  const canManage = userProfile.role === "organizer" && tournament.organizer_id === userProfile.id;

  // Filter only weighed-in participants for division generation
  const eligibleParticipants = registrations.filter(reg => reg.weighed_in && reg.weight_recorded);

  // Generate divisions based on taekwondo rules
  const generateDivisions = async () => {
    setGenerating(true);
    try {
      // Clear existing divisions
      await supabase
        .from("divisions")
        .delete()
        .eq("tournament_id", tournament.id);

      const newDivisions: any[] = [];

      // Group participants by age category
      const participantsByCategory = {
        gradeschool: eligibleParticipants.filter(p => p.athlete.age >= 5 && p.athlete.age <= 11),
        cadet: eligibleParticipants.filter(p => p.athlete.age >= 12 && p.athlete.age <= 14),
        junior: eligibleParticipants.filter(p => p.athlete.age >= 15 && p.athlete.age <= 17),
        senior: eligibleParticipants.filter(p => p.athlete.age >= 18)
      };

      // Generate Gradeschool divisions (by height and gender)
      for (const gender of ['male', 'female']) {
        const genderParticipants = participantsByCategory.gradeschool.filter(p => p.athlete.gender === gender);
        
        for (const group of DIVISION_RULES.gradeschool.groups) {
          const groupParticipants = genderParticipants.filter(p => {
            const height = p.athlete.height;
            return group.min === 0 ? height <= group.max : height > group.min && height <= group.max;
          });

          if (groupParticipants.length > 0) {
            newDivisions.push({
              tournament_id: tournament.id,
              name: `Gradeschool ${gender.charAt(0).toUpperCase() + gender.slice(1)} ${group.name}`,
              category: 'gradeschool',
              gender: gender,
              min_age: 5,
              max_age: 11,
              min_height: group.min === 0 ? null : group.min,
              max_height: group.max,
              participant_count: groupParticipants.length
            });
          }
        }
      }

      // Generate weight-based divisions (Cadet, Junior, Senior)
      for (const [category, rules] of Object.entries(DIVISION_RULES)) {
        if (category === 'gradeschool') continue;

        const categoryParticipants = participantsByCategory[category as keyof typeof participantsByCategory];
        
        for (const gender of ['male', 'female']) {
          const genderParticipants = categoryParticipants.filter(p => p.athlete.gender === gender);
          const weightCategories = rules[gender as 'male' | 'female'] as number[];

          for (let i = 0; i < weightCategories.length; i++) {
            const weightLimit = weightCategories[i];
            let divisionParticipants;
            let divisionName;

            if (weightLimit > 0) {
              // Plus category (e.g., +61kg)
              divisionParticipants = genderParticipants.filter(p => 
                (p.weight_recorded || p.athlete.weight) > weightLimit
              );
              divisionName = `${rules.name} ${gender.charAt(0).toUpperCase() + gender.slice(1)} +${weightLimit}kg`;
            } else {
              // Weight limit category (e.g., -61kg)
              const prevLimit = i > 0 ? Math.abs(weightCategories[i - 1]) : 0;
              const currentLimit = Math.abs(weightLimit);
              
              divisionParticipants = genderParticipants.filter(p => {
                const weight = p.weight_recorded || p.athlete.weight;
                return weight > prevLimit && weight <= currentLimit;
              });
              divisionName = `${rules.name} ${gender.charAt(0).toUpperCase() + gender.slice(1)} ${weightLimit}kg`;
            }

            if (divisionParticipants.length > 0) {
              newDivisions.push({
                tournament_id: tournament.id,
                name: divisionName,
                category: category,
                gender: gender,
                min_age: rules.ageRange.min,
                max_age: rules.ageRange.max,
                min_weight: weightLimit > 0 ? weightLimit : (i > 0 ? Math.abs(weightCategories[i - 1]) : null),
                max_weight: weightLimit > 0 ? null : Math.abs(weightLimit),
                participant_count: divisionParticipants.length
              });
            }
          }
        }
      }

      // Insert divisions into database
      if (newDivisions.length > 0) {
        const { error } = await supabase
          .from("divisions")
          .insert(newDivisions);

        if (error) throw error;
      }

      onDivisionsUpdate();
      alert(`Successfully generated ${newDivisions.length} divisions!`);
    } catch (error) {
      console.error("Error generating divisions:", error);
      alert("Error generating divisions. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  // Check for potential team conflicts
  const getTeamConflicts = (division: Division) => {
    const teamCounts: Record<string, number> = {};
    division.participants?.forEach(p => {
      teamCounts[p.team.name] = (teamCounts[p.team.name] || 0) + 1;
    });
    
    return Object.entries(teamCounts)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .filter(([_, count]) => count > 1)
      .map(([team, count]) => ({ team, count }));
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading divisions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Division Generation Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Trophy className="h-5 w-5 mr-2" />
            Division Management
          </CardTitle>
          <CardDescription>
            Automatic division generation based on official Taekwondo rules
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{registrations.length}</div>
              <div className="text-sm text-muted-foreground">Total Registrations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{eligibleParticipants.length}</div>
              <div className="text-sm text-muted-foreground">Weighed In (Eligible)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{divisions.length}</div>
              <div className="text-sm text-muted-foreground">Generated Divisions</div>
            </div>
          </div>

          {eligibleParticipants.length < registrations.length && (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {registrations.length - eligibleParticipants.length} participants haven&apos;t completed weigh-in yet. 
                Only weighed-in participants will be included in divisions.
              </AlertDescription>
            </Alert>
          )}

          {canManage && (
            <div className="flex space-x-2">
              <Button
                onClick={generateDivisions}
                disabled={generating || eligibleParticipants.length === 0}
                className="flex items-center"
              >
                <Shuffle className="h-4 w-4 mr-2" />
                {generating ? "Generating..." : "Generate Divisions"}
              </Button>
              
              {divisions.length > 0 && (
                <Button variant="outline" disabled>
                  Export Division List
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Division Rules Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Info className="h-5 w-5 mr-2" />
            Division Rules Reference
          </CardTitle>
          <CardDescription>
            Official Taekwondo division categories and criteria
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Gradeschool (5-11 years)</h4>
              <p className="text-xs text-muted-foreground">Height-based divisions</p>
              <div className="space-y-1 text-xs">
                {DIVISION_RULES.gradeschool.groups.map(group => (
                  <div key={group.name}>
                    {group.name}: {group.min === 0 ? '≤' : '>'}{group.min === 0 ? '' : group.min + 'cm to '}≤{group.max}cm
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Cadet (12-14 years)</h4>
              <p className="text-xs text-muted-foreground">Weight-based divisions</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="font-medium">Male</div>
                  <div>-33, -37, -41, -45, -49, -53, -57, -61, +61kg</div>
                </div>
                <div>
                  <div className="font-medium">Female</div>
                  <div>-29, -33, -37, -41, -44, -47, -51, -55, +55kg</div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Junior (15-17 years)</h4>
              <p className="text-xs text-muted-foreground">Weight-based divisions</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="font-medium">Male</div>
                  <div>-45, -48, -51, -55, -59, -63, -68, -73, -78, +78kg</div>
                </div>
                <div>
                  <div className="font-medium">Female</div>
                  <div>-42, -44, -46, -49, -52, -55, -59, -63, -68, +68kg</div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Senior (18+ years)</h4>
              <p className="text-xs text-muted-foreground">Weight-based divisions</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="font-medium">Male</div>
                  <div>-54, -58, -63, -68, -74, -80, -87, +87kg</div>
                </div>
                <div>
                  <div className="font-medium">Female</div>
                  <div>-46, -49, -53, -57, -62, -67, -73, +73kg</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generated Divisions */}
      {divisions.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Generated Divisions ({divisions.length})</CardTitle>
            <CardDescription>
              Divisions created based on participant data and official rules
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Division Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Criteria</TableHead>
                    <TableHead>Participants</TableHead>
                    <TableHead>Team Conflicts</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {divisions.map((division) => {
                    const conflicts = getTeamConflicts(division);
                    return (
                      <TableRow key={division.id}>
                        <TableCell>
                          <div className="font-medium">{division.name}</div>
                        </TableCell>
                        
                        <TableCell>
                          <Badge variant="outline">
                            {division.category ? division.category.charAt(0).toUpperCase() + division.category.slice(1) : ''}
                          </Badge>
                        </TableCell>
                        
                        <TableCell>
                          <div className="text-sm">
                            {division.category === 'gradeschool' ? (
                              `${division.min_height || 0}-${division.max_height}cm`
                            ) : (
                              `${division.min_weight ? division.min_weight + '-' : ''}${division.max_weight || '+'}kg`
                            )}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-1" />
                            {division.participants?.length || 0}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          {conflicts.length > 0 ? (
                            <div className="space-y-1">
                              {conflicts.map(conflict => (
                                <Badge key={conflict.team} variant="destructive" className="text-xs">
                                  {conflict.team} ({conflict.count})
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <Badge variant="default" className="text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              No conflicts
                            </Badge>
                          )}
                        </TableCell>
                        
                        <TableCell>
                          <Badge 
                            variant={division.participants?.length >= 2 ? "default" : "secondary"}
                          >
                            {division.participants?.length >= 2 ? "Ready" : "Needs more participants"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No divisions generated yet</h3>
            <p className="text-muted-foreground mb-4">
              Generate divisions after participants have completed weigh-in
            </p>
            {canManage && eligibleParticipants.length > 0 && (
              <Button onClick={generateDivisions} disabled={generating}>
                <Shuffle className="h-4 w-4 mr-2" />
                Generate Divisions Now
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
