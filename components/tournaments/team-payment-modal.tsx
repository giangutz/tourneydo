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
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Users, Trash2, Edit, AlertCircle } from "lucide-react";

interface Tournament {
  id: string;
  name: string;
  entry_fee: number;
  payment_methods?: string[];
}

interface TeamRegistration {
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
  payment_status: string;
}

interface TeamPaymentModalProps {
  tournament: Tournament;
  coachId: string;
  teamName: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function TeamPaymentModal({ 
  tournament, 
  coachId, 
  teamName, 
  isOpen, 
  onClose, 
  onUpdate 
}: TeamPaymentModalProps) {
  const [registrations, setRegistrations] = useState<TeamRegistration[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<string | null>(null);
  const [playerEdits, setPlayerEdits] = useState<Record<string, any>>({});

  const supabase = createClient();

  useEffect(() => {
    if (isOpen && coachId && teamName) {
      fetchTeamRegistrations();
    }
  }, [isOpen, coachId, teamName]);

  const fetchTeamRegistrations = async () => {
    try {
      const { data, error } = await supabase
        .from("tournament_registrations")
        .select(`
          *,
          athlete:athletes(*),
          team:teams(*)
        `)
        .eq("tournament_id", tournament.id)
        .eq("team.coach_id", coachId)
        .eq("team.name", teamName);

      if (error) throw error;
      setRegistrations(data || []);
    } catch (error) {
      console.error("Error fetching team registrations:", error);
    }
  };

  const handleRemovePlayer = async (registrationId: string) => {
    if (!confirm("Are you sure you want to remove this player from the tournament?")) return;

    try {
      const { error } = await supabase
        .from("tournament_registrations")
        .delete()
        .eq("id", registrationId);

      if (error) throw error;
      
      setRegistrations(prev => prev.filter(reg => reg.id !== registrationId));
    } catch (error) {
      console.error("Error removing player:", error);
      alert("Error removing player. Please try again.");
    }
  };

  const handleEditPlayer = (registrationId: string, field: string, value: any) => {
    setPlayerEdits(prev => ({
      ...prev,
      [registrationId]: {
        ...prev[registrationId],
        [field]: value
      }
    }));
  };

  const handleSavePlayerEdits = async (registrationId: string) => {
    const edits = playerEdits[registrationId];
    if (!edits) return;

    try {
      // Update athlete information
      const athleteUpdates: any = {};
      if (edits.weight) athleteUpdates.weight = parseFloat(edits.weight);
      if (edits.height) athleteUpdates.height = parseFloat(edits.height);
      if (edits.belt_rank) athleteUpdates.belt_rank = edits.belt_rank;

      if (Object.keys(athleteUpdates).length > 0) {
        const registration = registrations.find(r => r.id === registrationId);
        if (registration) {
          const { error } = await supabase
            .from("athletes")
            .update(athleteUpdates)
            .eq("id", registration.athlete.id);

          if (error) throw error;
        }
      }

      // Clear edits and refresh
      setPlayerEdits(prev => {
        const newEdits = { ...prev };
        delete newEdits[registrationId];
        return newEdits;
      });
      setEditingPlayer(null);
      await fetchTeamRegistrations();
    } catch (error) {
      console.error("Error updating player:", error);
      alert("Error updating player information. Please try again.");
    }
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentMethod || !referenceNumber) return;

    setLoading(true);
    try {
      // Create team payment record
      const { data: paymentData, error: paymentError } = await supabase
        .from("team_payments")
        .insert({
          tournament_id: tournament.id,
          coach_id: coachId,
          team_name: teamName,
          amount: registrations.length * tournament.entry_fee,
          payment_method: paymentMethod,
          reference_number: referenceNumber,
          description: description,
          status: "pending",
          participant_count: registrations.length,
          registration_ids: registrations.map(r => r.id)
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Update registration payment status to pending_approval
      const { error: updateError } = await supabase
        .from("tournament_registrations")
        .update({ payment_status: "pending_approval" })
        .in("id", registrations.map(r => r.id));

      if (updateError) throw updateError;

      onUpdate();
      onClose();
      
      // Reset form
      setPaymentMethod("");
      setReferenceNumber("");
      setDescription("");
      
      alert("Payment submitted for approval. You will be notified once it's processed.");
    } catch (error) {
      console.error("Error submitting payment:", error);
      alert("Error submitting payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = registrations.length * tournament.entry_fee;
  const defaultPaymentMethods = ["Bank Transfer", "GCash", "PayMaya", "Cash", "Check"];
  const availablePaymentMethods = tournament.payment_methods || defaultPaymentMethods;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <CreditCard className="h-5 w-5 mr-2" />
            Team Payment - {teamName}
          </DialogTitle>
          <DialogDescription>
            Submit payment for your team's tournament registration
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmitPayment}>
          <div className="space-y-6 py-4">
            {/* Payment Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Payment Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Tournament:</span>
                    <div>{tournament.name}</div>
                  </div>
                  <div>
                    <span className="font-medium">Team:</span>
                    <div>{teamName}</div>
                  </div>
                  <div>
                    <span className="font-medium">Participants:</span>
                    <div>{registrations.length} athletes</div>
                  </div>
                  <div>
                    <span className="font-medium">Entry Fee per Athlete:</span>
                    <div>₱{tournament.entry_fee.toLocaleString()}</div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total Amount:</span>
                    <span>₱{totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Team Roster */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Team Roster</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {registrations.map((registration) => (
                    <div key={registration.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        {editingPlayer === registration.id ? (
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              placeholder="Weight (kg)"
                              type="number"
                              step="0.1"
                              defaultValue={registration.athlete.weight}
                              onChange={(e) => handleEditPlayer(registration.id, "weight", e.target.value)}
                            />
                            <Input
                              placeholder="Height (cm)"
                              type="number"
                              defaultValue={registration.athlete.height}
                              onChange={(e) => handleEditPlayer(registration.id, "height", e.target.value)}
                            />
                            <select
                              defaultValue={registration.athlete.belt_rank}
                              onChange={(e) => handleEditPlayer(registration.id, "belt_rank", e.target.value)}
                              className="p-2 border rounded"
                            >
                              <option value="white">White Belt</option>
                              <option value="yellow">Yellow Belt</option>
                              <option value="orange">Orange Belt</option>
                              <option value="green">Green Belt</option>
                              <option value="blue">Blue Belt</option>
                              <option value="brown">Brown Belt</option>
                              <option value="black_1">Black Belt 1st Dan</option>
                              <option value="black_2">Black Belt 2nd Dan</option>
                              <option value="black_3">Black Belt 3rd Dan</option>
                            </select>
                            <div className="flex space-x-2">
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleSavePlayerEdits(registration.id)}
                              >
                                Save
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingPlayer(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-medium">{registration.athlete.full_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {registration.athlete.gender} • {registration.athlete.age} years • 
                              {registration.athlete.weight}kg • {registration.athlete.height}cm
                            </div>
                            <Badge variant="outline" className="mt-1">
                              {registration.athlete.belt_rank.replace("_", " ").toUpperCase()}
                            </Badge>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex space-x-2">
                        {editingPlayer !== registration.id && (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingPlayer(registration.id)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRemovePlayer(registration.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {registrations.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No registered athletes found for this team.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Details */}
            {registrations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Payment Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="payment-method">Payment Method *</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        {availablePaymentMethods.map((method) => (
                          <SelectItem key={method} value={method}>
                            {method}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reference">Reference Number (Last 4-6 digits) *</Label>
                    <Input
                      id="reference"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      placeholder="Enter last 4-6 digits of reference number"
                      maxLength={6}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Payment Description</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Additional payment details or notes..."
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-blue-600 mr-2" />
                    <div className="text-sm text-blue-800">
                      Your payment will be reviewed by tournament organizers. 
                      Athletes will be marked as paid once approved.
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || registrations.length === 0 || !paymentMethod || !referenceNumber}
            >
              {loading ? "Submitting..." : `Submit Payment (₱${totalAmount.toLocaleString()})`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
