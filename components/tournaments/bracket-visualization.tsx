"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Crown, 
  Medal,
  Users,
  Clock,
  CheckCircle
} from "lucide-react";

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

interface BracketVisualizationProps {
  matches: Match[];
  canManage: boolean;
  onMatchUpdate: (matchId: string, winnerId: string) => void;
  loading: boolean;
}

export function BracketVisualization({ matches, canManage, onMatchUpdate, loading }: BracketVisualizationProps) {
  const [selectedMatch, setSelectedMatch] = useState<string>("");

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading bracket...</p>
        </CardContent>
      </Card>
    );
  }

  if (matches.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No matches found</h3>
          <p className="text-muted-foreground">
            Generate a bracket to see the tournament structure
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group matches by round
  const matchesByRound = matches.reduce((acc, match) => {
    if (!acc[match.round]) acc[match.round] = [];
    acc[match.round].push(match);
    return acc;
  }, {} as Record<number, Match[]>);

  const rounds = Object.keys(matchesByRound)
    .map(Number)
    .sort((a, b) => a - b);

  const maxRound = Math.max(...rounds);
  const totalParticipants = Math.pow(2, maxRound);

  // Get round name
  const getRoundName = (round: number) => {
    const roundsFromEnd = maxRound - round;
    switch (roundsFromEnd) {
      case 0: return "Final";
      case 1: return "Semi-Final";
      case 2: return "Quarter-Final";
      default: return `Round ${round}`;
    }
  };

  // Get participant display name
  const getParticipantDisplay = (participant: any) => {
    if (!participant) return "TBD";
    return `${participant.athlete.full_name} (${participant.athlete.team.name})`;
  };

  // Handle match result selection
  const handleMatchResult = (matchId: string, winnerId: string) => {
    onMatchUpdate(matchId, winnerId);
    setSelectedMatch("");
  };

  // Get match status badge
  const getMatchStatusBadge = (match: Match) => {
    switch (match.status) {
      case 'completed':
        return <Badge className="bg-green-500 text-white">Completed</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-500 text-white">In Progress</Badge>;
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      default:
        return <Badge variant="secondary">{match.status}</Badge>;
    }
  };

  // Calculate bracket layout
  const getBracketLayout = () => {
    const layout: any[] = [];
    
    rounds.forEach((round, roundIndex) => {
      const roundMatches = matchesByRound[round].sort((a, b) => a.match_number - b.match_number);
      const matchHeight = 80;
      const spacing = Math.pow(2, roundIndex) * matchHeight;
      
      layout.push({
        round,
        matches: roundMatches.map((match, index) => ({
          ...match,
          y: index * spacing + (spacing / 2),
          x: roundIndex * 300
        }))
      });
    });
    
    return layout;
  };

  const bracketLayout = getBracketLayout();

  return (
    <div className="space-y-6">
      {/* Bracket Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Trophy className="h-5 w-5 mr-2" />
            Tournament Bracket
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-lg font-bold">{matches.length}</div>
              <div className="text-sm text-muted-foreground">Total Matches</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold">{matches.filter(m => m.status === 'completed').length}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold">{matches.filter(m => m.status === 'in_progress').length}</div>
              <div className="text-sm text-muted-foreground">In Progress</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold">{maxRound}</div>
              <div className="text-sm text-muted-foreground">Rounds</div>
            </div>
          </div>

          {/* Champion Display */}
          {(() => {
            const finalMatch = matches.find(m => m.round === maxRound);
            if (finalMatch?.winner) {
              return (
                <div className="text-center mb-6 p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg border border-yellow-200">
                  <Crown className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                  <h3 className="text-lg font-bold text-yellow-800">Champion</h3>
                  <p className="text-yellow-700">{getParticipantDisplay(finalMatch.winner)}</p>
                </div>
              );
            }
            return null;
          })()}
        </CardContent>
      </Card>

      {/* Bracket Visualization - Responsive Design */}
      <Card>
        <CardHeader>
          <CardTitle>Bracket Structure</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Desktop Bracket View */}
          <div className="hidden lg:block">
            <div className="relative overflow-x-auto" style={{ minHeight: '400px' }}>
              <svg width={rounds.length * 300} height={Math.pow(2, rounds.length - 1) * 80 + 100}>
                {bracketLayout.map((roundData) => (
                  <g key={roundData.round}>
                    {/* Round Label */}
                    <text
                      x={roundData.matches[0]?.x + 100}
                      y={20}
                      textAnchor="middle"
                      className="text-sm font-semibold fill-current"
                    >
                      {getRoundName(roundData.round)}
                    </text>
                    
                    {/* Matches */}
                    {roundData.matches.map((match: any) => (
                      <g key={match.id}>
                        {/* Match Box */}
                        <rect
                          x={match.x}
                          y={match.y}
                          width={200}
                          height={60}
                          fill="white"
                          stroke="#e2e8f0"
                          strokeWidth="1"
                          rx="4"
                          className="cursor-pointer hover:stroke-blue-500"
                          onClick={() => canManage && setSelectedMatch(match.id)}
                        />
                        
                        {/* Participant 1 */}
                        <text
                          x={match.x + 10}
                          y={match.y + 20}
                          className={`text-xs fill-current ${match.winner_id === match.participant1_id ? 'font-bold' : ''}`}
                        >
                          {match.participant1?.athlete.full_name || "TBD"}
                        </text>
                        
                        {/* Participant 2 */}
                        <text
                          x={match.x + 10}
                          y={match.y + 40}
                          className={`text-xs fill-current ${match.winner_id === match.participant2_id ? 'font-bold' : ''}`}
                        >
                          {match.participant2?.athlete.full_name || "TBD"}
                        </text>
                        
                        {/* Winner Indicator */}
                        {match.winner_id && (
                          <circle
                            cx={match.x + 185}
                            cy={match.y + (match.winner_id === match.participant1_id ? 15 : 35)}
                            r="5"
                            fill="#22c55e"
                          />
                        )}
                        
                        {/* Connection Lines */}
                        {roundData.round < maxRound && (
                          <line
                            x1={match.x + 200}
                            y1={match.y + 30}
                            x2={match.x + 250}
                            y2={match.y + 30}
                            stroke="#e2e8f0"
                            strokeWidth="2"
                          />
                        )}
                      </g>
                    ))}
                  </g>
                ))}
              </svg>
            </div>
          </div>

          {/* Mobile/Tablet Round-by-Round View */}
          <div className="lg:hidden space-y-6">
            {rounds.map((round) => {
              const roundMatches = matchesByRound[round].sort((a, b) => a.match_number - b.match_number);
              
              return (
                <div key={round}>
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    {round === maxRound && <Crown className="h-5 w-5 mr-2 text-yellow-500" />}
                    {getRoundName(round)}
                  </h3>
                  
                  <div className="grid gap-4">
                    {roundMatches.map((match) => (
                      <Card key={match.id} className="relative">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-sm font-medium">Match {match.match_number}</span>
                            {getMatchStatusBadge(match)}
                          </div>
                          
                          <div className="space-y-2">
                            <div className={`p-2 rounded ${match.winner_id === match.participant1_id ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                              <div className="font-medium text-sm">
                                {match.participant1?.athlete.full_name || "TBD"}
                              </div>
                              {match.participant1 && (
                                <div className="text-xs text-muted-foreground">
                                  {match.participant1.athlete.team.name}
                                </div>
                              )}
                              {match.winner_id === match.participant1_id && (
                                <CheckCircle className="h-4 w-4 text-green-600 absolute top-2 right-2" />
                              )}
                            </div>
                            
                            <div className="text-center text-xs text-muted-foreground">vs</div>
                            
                            <div className={`p-2 rounded ${match.winner_id === match.participant2_id ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                              <div className="font-medium text-sm">
                                {match.participant2?.athlete.full_name || "TBD"}
                              </div>
                              {match.participant2 && (
                                <div className="text-xs text-muted-foreground">
                                  {match.participant2.athlete.team.name}
                                </div>
                              )}
                              {match.winner_id === match.participant2_id && (
                                <CheckCircle className="h-4 w-4 text-green-600 absolute top-2 right-2" />
                              )}
                            </div>
                          </div>
                          
                          {canManage && match.status === 'pending' && match.participant1 && match.participant2 && (
                            <div className="mt-3 pt-3 border-t">
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full"
                                onClick={() => setSelectedMatch(match.id)}
                              >
                                Record Result
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Match Result Modal */}
      {selectedMatch && (() => {
        const match = matches.find(m => m.id === selectedMatch);
        if (!match || !match.participant1 || !match.participant2) return null;

        return (
          <Card className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Record Match Result</h3>
              
              <div className="space-y-3 mb-6">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleMatchResult(match.id, match.participant1!.id)}
                >
                  <Trophy className="h-4 w-4 mr-2" />
                  {getParticipantDisplay(match.participant1)} Wins
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleMatchResult(match.id, match.participant2!.id)}
                >
                  <Trophy className="h-4 w-4 mr-2" />
                  {getParticipantDisplay(match.participant2)} Wins
                </Button>
              </div>
              
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setSelectedMatch("")}
              >
                Cancel
              </Button>
            </div>
          </Card>
        );
      })()}
    </div>
  );
}
