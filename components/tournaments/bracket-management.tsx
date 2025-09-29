"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Trophy, 
  Users, 
  Play, 
  Download,
  Eye,
  Settings,
  Shuffle,
  Medal,
  Crown
} from "lucide-react";
import { BracketVisualization } from "./bracket-visualization";

interface Tournament {
  id: string;
  name: string;
  organizer_id: string;
}

interface UserProfile {
  id: string;
  role: string;
}

interface Division {
  id: string;
  name: string;
  category: string;
  gender: string;
  participants?: any[];
}

interface Match {
  id: string;
  division_id: string;
  round: number;
  match_number: number;
  participant1_id?: string;
  participant2_id?: string;
  winner_id?: string;
  status: 'pending' | 'in_progress' | 'completed';
  scheduled_time?: string;
  participant1?: {
    id: string;
    athlete: {
      full_name: string;
      team: { name: string };
    };
  };
  participant2?: {
    id: string;
    athlete: {
      full_name: string;
      team: { name: string };
    };
  };
  winner?: {
    id: string;
    athlete: {
      full_name: string;
      team: { name: string };
    };
  };
}

interface BracketManagementProps {
  tournament: Tournament;
  userProfile: UserProfile;
  divisions: Division[];
  onBracketsUpdate: () => void;
  loading: boolean;
}

export function BracketManagement({ 
  tournament, 
  userProfile, 
  divisions, 
  onBracketsUpdate, 
  loading 
}: BracketManagementProps) {
  const [selectedDivision, setSelectedDivision] = useState<string>("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [generating, setGenerating] = useState(false);
  const [loadingMatches, setLoadingMatches] = useState(false);

  const supabase = createClient();
  const canManage = userProfile.role === "organizer" && tournament.organizer_id === userProfile.id;

  // Filter divisions that have enough participants for brackets
  const eligibleDivisions = divisions.filter(div => (div.participants?.length || 0) >= 2);

  useEffect(() => {
    if (selectedDivision) {
      fetchMatches(selectedDivision);
    }
  }, [selectedDivision]);

  const fetchMatches = async (divisionId: string) => {
    setLoadingMatches(true);
    try {
      const { data, error } = await supabase
        .from("matches")
        .select(`
          *,
          participant1:tournament_registrations!matches_participant1_id_fkey(
            id,
            athlete:athletes(full_name),
            team:teams(name)
          ),
          participant2:tournament_registrations!matches_participant2_id_fkey(
            id,
            athlete:athletes(full_name),
            team:teams(name)
          ),
          winner:tournament_registrations!matches_winner_id_fkey(
            id,
            athlete:athletes(full_name),
            team:teams(name)
          )
        `)
        .eq("division_id", divisionId)
        .order("round")
        .order("match_number");

      if (error) throw error;
      setMatches(data || []);
    } catch (error) {
      console.error("Error fetching matches:", error);
    } finally {
      setLoadingMatches(false);
    }
  };

  // Generate single elimination bracket
  const generateBracket = async (divisionId: string) => {
    setGenerating(true);
    try {
      const division = divisions.find(d => d.id === divisionId);
      if (!division || !division.participants) {
        throw new Error("Division not found or has no participants");
      }

      // Clear existing matches for this division
      await supabase
        .from("matches")
        .delete()
        .eq("division_id", divisionId);

      const participants = [...division.participants];
      
      // Implement team separation logic - avoid same team matchups in first round
      const shuffledParticipants = separateTeammates(participants);
      
      // Calculate number of rounds needed
      const numParticipants = shuffledParticipants.length;
      const numRounds = Math.ceil(Math.log2(numParticipants));
      
      // Generate first round matches
      const firstRoundMatches = [];
      let matchNumber = 1;
      
      for (let i = 0; i < shuffledParticipants.length; i += 2) {
        const participant1 = shuffledParticipants[i];
        const participant2 = shuffledParticipants[i + 1] || null; // Handle odd number of participants
        
        firstRoundMatches.push({
          division_id: divisionId,
          round: 1,
          match_number: matchNumber++,
          participant1_id: participant1.id,
          participant2_id: participant2?.id || null,
          status: participant2 ? 'pending' : 'completed', // Bye if no opponent
          winner_id: participant2 ? null : participant1.id // Auto-advance if bye
        });
      }

      // Insert first round matches
      const { error: matchError } = await supabase
        .from("matches")
        .insert(firstRoundMatches);

      if (matchError) throw matchError;

      // Generate placeholder matches for subsequent rounds
      const subsequentMatches = [];
      let totalMatches = firstRoundMatches.length;
      
      for (let round = 2; round <= numRounds; round++) {
        const matchesInRound = Math.ceil(totalMatches / 2);
        
        for (let i = 1; i <= matchesInRound; i++) {
          subsequentMatches.push({
            division_id: divisionId,
            round: round,
            match_number: i,
            participant1_id: null,
            participant2_id: null,
            status: 'pending'
          });
        }
        
        totalMatches = matchesInRound;
      }

      if (subsequentMatches.length > 0) {
        const { error: subsequentError } = await supabase
          .from("matches")
          .insert(subsequentMatches);

        if (subsequentError) throw subsequentError;
      }

      // Refresh matches
      await fetchMatches(divisionId);
      
      alert("Bracket generated successfully!");
    } catch (error) {
      console.error("Error generating bracket:", error);
      alert("Error generating bracket. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  // Separate teammates to avoid first round matchups
  const separateTeammates = (participants: any[]) => {
    const shuffled = [...participants];
    
    // Group by team
    const teamGroups: Record<string, any[]> = {};
    shuffled.forEach(p => {
      const teamName = p.team.name;
      if (!teamGroups[teamName]) teamGroups[teamName] = [];
      teamGroups[teamName].push(p);
    });

    // If all participants are from the same team, just shuffle
    if (Object.keys(teamGroups).length === 1) {
      return shuffled.sort(() => Math.random() - 0.5);
    }

    // Distribute team members to avoid first round conflicts
    const result: any[] = [];
    const teams = Object.keys(teamGroups);
    let teamIndex = 0;

    // First, place one member from each team
    teams.forEach(team => {
      if (teamGroups[team].length > 0) {
        result.push(teamGroups[team].shift());
      }
    });

    // Then distribute remaining members
    while (result.length < participants.length) {
      const team = teams[teamIndex % teams.length];
      if (teamGroups[team].length > 0) {
        result.push(teamGroups[team].shift());
      }
      teamIndex++;
    }

    return result;
  };

  // Update match result
  const updateMatchResult = async (matchId: string, winnerId: string) => {
    try {
      const { error } = await supabase
        .from("matches")
        .update({ 
          winner_id: winnerId, 
          status: 'completed' 
        })
        .eq("id", matchId);

      if (error) throw error;

      // Advance winner to next round
      await advanceWinner(matchId, winnerId);
      
      // Refresh matches
      await fetchMatches(selectedDivision);
    } catch (error) {
      console.error("Error updating match result:", error);
      alert("Error updating match result. Please try again.");
    }
  };

  // Advance winner to next round
  const advanceWinner = async (matchId: string, winnerId: string) => {
    try {
      const currentMatch = matches.find(m => m.id === matchId);
      if (!currentMatch) return;

      const nextRound = currentMatch.round + 1;
      const nextMatchNumber = Math.ceil(currentMatch.match_number / 2);

      // Find the next match
      const { data: nextMatches, error } = await supabase
        .from("matches")
        .select("*")
        .eq("division_id", selectedDivision)
        .eq("round", nextRound)
        .eq("match_number", nextMatchNumber);

      if (error) throw error;

      if (nextMatches && nextMatches.length > 0) {
        const nextMatch = nextMatches[0];
        const isFirstSlot = currentMatch.match_number % 2 === 1;
        
        const updateField = isFirstSlot ? "participant1_id" : "participant2_id";
        
        await supabase
          .from("matches")
          .update({ [updateField]: winnerId })
          .eq("id", nextMatch.id);
      }
    } catch (error) {
      console.error("Error advancing winner:", error);
    }
  };

  // Export bracket as PDF
  const exportBracket = () => {
    const division = divisions.find(d => d.id === selectedDivision);
    if (!division) return;

    // Create printable bracket view
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const bracketHTML = generateBracketHTML(division, matches);
    
    printWindow.document.write(`
      <html>
        <head>
          <title>${tournament.name} - ${division.name} Bracket</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .match { border: 1px solid #ccc; padding: 10px; margin: 5px; }
            .participant { padding: 5px; border-bottom: 1px solid #eee; }
            .winner { font-weight: bold; background-color: #e8f5e8; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          ${bracketHTML}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
  };

  const generateBracketHTML = (division: Division, matches: Match[]) => {
    const rounds = Math.max(...matches.map(m => m.round), 0);
    
    let html = `
      <div class="header">
        <h1>${tournament.name}</h1>
        <h2>${division.name} Bracket</h2>
        <p>Generated on ${new Date().toLocaleDateString()}</p>
      </div>
    `;

    for (let round = 1; round <= rounds; round++) {
      const roundMatches = matches.filter(m => m.round === round);
      
      html += `<h3>Round ${round}${round === rounds ? ' (Final)' : ''}</h3>`;
      
      roundMatches.forEach(match => {
        html += `
          <div class="match">
            <div class="participant ${match.winner_id === match.participant1_id ? 'winner' : ''}">
              ${match.participant1?.athlete.full_name || 'TBD'} 
              ${match.participant1 ? `(${match.participant1.athlete.team.name})` : ''}
            </div>
            <div class="participant ${match.winner_id === match.participant2_id ? 'winner' : ''}">
              ${match.participant2?.athlete.full_name || 'TBD'} 
              ${match.participant2 ? `(${match.participant2.athlete.team.name})` : ''}
            </div>
          </div>
        `;
      });
    }

    return html;
  };

  const getBracketStats = () => {
    if (!selectedDivision || matches.length === 0) {
      return { totalMatches: 0, completedMatches: 0, rounds: 0 };
    }

    const totalMatches = matches.length;
    const completedMatches = matches.filter(m => m.status === 'completed').length;
    const rounds = Math.max(...matches.map(m => m.round), 0);

    return { totalMatches, completedMatches, rounds };
  };

  const stats = getBracketStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading bracket management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Bracket Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Trophy className="h-5 w-5 mr-2" />
            Tournament Brackets
          </CardTitle>
          <CardDescription>
            Generate and manage single elimination brackets for each division
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{divisions.length}</div>
              <div className="text-sm text-muted-foreground">Total Divisions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{eligibleDivisions.length}</div>
              <div className="text-sm text-muted-foreground">Ready for Brackets</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {selectedDivision ? stats.completedMatches : 0}
              </div>
              <div className="text-sm text-muted-foreground">Completed Matches</div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Select value={selectedDivision} onValueChange={setSelectedDivision}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a division to view bracket" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleDivisions.map((division) => (
                    <SelectItem key={division.id} value={division.id}>
                      {division.name} ({division.participants?.length || 0} participants)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {canManage && selectedDivision && (
              <div className="flex space-x-2">
                <Button
                  onClick={() => generateBracket(selectedDivision)}
                  disabled={generating}
                  variant="outline"
                >
                  <Shuffle className="h-4 w-4 mr-2" />
                  {generating ? "Generating..." : "Generate Bracket"}
                </Button>
                
                {matches.length > 0 && (
                  <Button onClick={exportBracket} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export PDF
                  </Button>
                )}
              </div>
            )}
          </div>

          {selectedDivision && matches.length > 0 && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">Total Matches:</span> {stats.totalMatches}
                </div>
                <div>
                  <span className="font-medium">Completed:</span> {stats.completedMatches}
                </div>
                <div>
                  <span className="font-medium">Rounds:</span> {stats.rounds}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bracket Visualization */}
      {selectedDivision ? (
        matches.length > 0 ? (
          <BracketVisualization
            matches={matches}
            canManage={canManage}
            onMatchUpdate={updateMatchResult}
            loading={loadingMatches}
          />
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No bracket generated yet</h3>
              <p className="text-muted-foreground mb-4">
                Generate a bracket for this division to start the tournament
              </p>
              {canManage && (
                <Button onClick={() => generateBracket(selectedDivision)} disabled={generating}>
                  <Shuffle className="h-4 w-4 mr-2" />
                  Generate Bracket
                </Button>
              )}
            </CardContent>
          </Card>
        )
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Select a division</h3>
            <p className="text-muted-foreground">
              Choose a division from the dropdown above to view or generate its bracket
            </p>
          </CardContent>
        </Card>
      )}

      {/* Division Status Overview */}
      {divisions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Division Status Overview</CardTitle>
            <CardDescription>
              Bracket generation status for all divisions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {divisions.map((division) => {
                const participantCount = division.participants?.length || 0;
                const isEligible = participantCount >= 2;
                
                return (
                  <div key={division.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{division.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {participantCount} participants
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Badge variant={isEligible ? "default" : "secondary"}>
                        {isEligible ? "Ready" : "Needs more participants"}
                      </Badge>
                      
                      {canManage && isEligible && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedDivision(division.id);
                            generateBracket(division.id);
                          }}
                          disabled={generating}
                        >
                          Generate
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
