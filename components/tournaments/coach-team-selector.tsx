"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Users, Plus } from "lucide-react";
import { TeamPaymentModal } from "./team-payment-modal";

interface Tournament {
  id: string;
  name: string;
  entry_fee: number;
  payment_methods?: string[];
}

interface CoachTeam {
  id: string;
  name: string;
  description?: string;
  registrationCount: number;
  totalAmount: number;
  paymentStatus: 'none' | 'partial' | 'pending' | 'paid';
}

interface CoachTeamSelectorProps {
  tournament: Tournament;
  coachId: string;
  onPaymentUpdate: () => void;
}

export function CoachTeamSelector({ tournament, coachId, onPaymentUpdate }: CoachTeamSelectorProps) {
  const [teams, setTeams] = useState<CoachTeam[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [paymentModal, setPaymentModal] = useState<{teamName: string, coachId: string} | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    fetchCoachTeams();
  }, [coachId, tournament.id]);

  const fetchCoachTeams = async () => {
    setLoading(true);
    try {
      // Get coach's teams with registration counts
      const { data: teamsData, error: teamsError } = await supabase
        .from("teams")
        .select("id, name, description")
        .eq("coach_id", coachId);

      if (teamsError) throw teamsError;

      // Get registration counts and payment status for each team
      const teamsWithStats = await Promise.all(
        (teamsData || []).map(async (team) => {
          const { data: registrations, error: regError } = await supabase
            .from("tournament_registrations")
            .select("id, payment_status")
            .eq("tournament_id", tournament.id)
            .eq("team_id", team.id);

          if (regError) throw regError;

          const registrationCount = registrations?.length || 0;
          const totalAmount = registrationCount * tournament.entry_fee;
          
          // Determine payment status
          let paymentStatus: 'none' | 'partial' | 'pending' | 'paid' = 'none';
          if (registrationCount > 0) {
            const paidCount = registrations?.filter(r => r.payment_status === 'paid').length || 0;
            const pendingCount = registrations?.filter(r => r.payment_status === 'pending_approval').length || 0;
            
            if (paidCount === registrationCount) {
              paymentStatus = 'paid';
            } else if (pendingCount > 0) {
              paymentStatus = 'pending';
            } else if (paidCount > 0) {
              paymentStatus = 'partial';
            }
          }

          return {
            id: team.id,
            name: team.name,
            description: team.description,
            registrationCount,
            totalAmount,
            paymentStatus
          };
        })
      );

      setTeams(teamsWithStats.filter(team => team.registrationCount > 0));
    } catch (error) {
      console.error("Error fetching coach teams:", error);
    } finally {
      setLoading(false);
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500 text-white">Fully Paid</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500 text-white">Pending Approval</Badge>;
      case 'partial':
        return <Badge className="bg-orange-500 text-white">Partially Paid</Badge>;
      case 'none':
      default:
        return <Badge variant="outline">Not Paid</Badge>;
    }
  };

  const handlePayForTeam = (teamName: string) => {
    setPaymentModal({ teamName, coachId });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading your teams...</p>
        </CardContent>
      </Card>
    );
  }

  if (teams.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No registered teams</h3>
          <p className="text-muted-foreground">
            You don't have any athletes registered for this tournament yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="h-5 w-5 mr-2" />
            Team Payment Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Team Selection Dropdown */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Team to Pay For:</label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a team..." />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.name}>
                      {team.name} ({team.registrationCount} athletes)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Teams Overview */}
            <div className="space-y-3">
              <h4 className="font-medium">Your Teams in this Tournament:</h4>
              {teams.map((team) => (
                <div key={team.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{team.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {team.registrationCount} athletes • ₱{team.totalAmount.toLocaleString()} total
                    </div>
                    {team.description && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {team.description}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {getPaymentStatusBadge(team.paymentStatus)}
                    
                    {team.paymentStatus !== 'paid' && (
                      <Button
                        size="sm"
                        onClick={() => handlePayForTeam(team.name)}
                        className="flex items-center"
                      >
                        <CreditCard className="h-4 w-4 mr-1" />
                        Pay Now
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Pay Button for Selected Team */}
            {selectedTeam && (
              <div className="pt-4 border-t">
                <Button
                  onClick={() => handlePayForTeam(selectedTeam)}
                  className="w-full"
                  size="lg"
                >
                  <CreditCard className="h-5 w-5 mr-2" />
                  Pay for {selectedTeam}
                </Button>
              </div>
            )}

            {/* Summary */}
            <div className="pt-4 border-t bg-muted p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Total Teams:</span>
                  <div>{teams.length}</div>
                </div>
                <div>
                  <span className="font-medium">Total Athletes:</span>
                  <div>{teams.reduce((sum, team) => sum + team.registrationCount, 0)}</div>
                </div>
                <div>
                  <span className="font-medium">Total Amount:</span>
                  <div>₱{teams.reduce((sum, team) => sum + team.totalAmount, 0).toLocaleString()}</div>
                </div>
                <div>
                  <span className="font-medium">Paid Teams:</span>
                  <div>{teams.filter(team => team.paymentStatus === 'paid').length}</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Modal */}
      {paymentModal && (
        <TeamPaymentModal
          tournament={tournament}
          coachId={paymentModal.coachId}
          teamName={paymentModal.teamName}
          isOpen={!!paymentModal}
          onClose={() => setPaymentModal(null)}
          onUpdate={() => {
            onPaymentUpdate();
            fetchCoachTeams();
          }}
        />
      )}
    </>
  );
}
