"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, Clock, CreditCard, Users, AlertTriangle } from "lucide-react";

interface TeamPayment {
  id: string;
  tournament_id: string;
  coach_id: string;
  team_name: string;
  amount: number;
  payment_method: string;
  reference_number: string;
  description?: string;
  status: string;
  participant_count: number;
  registration_ids: string[];
  created_at: string;
  coach: {
    full_name: string;
    email: string;
  };
  registrations: Array<{
    id: string;
    athlete: {
      full_name: string;
      gender: string;
      age: number;
      belt_rank: string;
    };
  }>;
}

interface PaymentApprovalModalProps {
  tournamentId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function PaymentApprovalModal({ 
  tournamentId, 
  isOpen, 
  onClose, 
  onUpdate 
}: PaymentApprovalModalProps) {
  const [payments, setPayments] = useState<TeamPayment[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<TeamPayment | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (isOpen && tournamentId) {
      fetchPendingPayments();
    }
  }, [isOpen, tournamentId]);

  const fetchPendingPayments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("team_payments")
        .select(`
          *,
          coach:profiles!team_payments_coach_id_fkey(full_name, email),
          registrations:tournament_registrations(
            id,
            athlete:athletes(full_name, gender, age, belt_rank)
          )
        `)
        .eq("tournament_id", tournamentId)
        .in("status", ["pending", "approved", "rejected"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentAction = async (payment: TeamPayment, action: "approve" | "reject") => {
    setSelectedPayment(payment);
    setActionType(action);
  };

  const confirmPaymentAction = async () => {
    if (!selectedPayment || !actionType) return;

    setActionLoading(true);
    try {
      // Update payment status
      const { error: paymentError } = await supabase
        .from("team_payments")
        .update({
          status: actionType === "approve" ? "approved" : "rejected",
          processed_at: new Date().toISOString(),
          notes: notes
        })
        .eq("id", selectedPayment.id);

      if (paymentError) throw paymentError;

      // Update registration payment status
      const newPaymentStatus = actionType === "approve" ? "paid" : "pending";
      const { error: registrationError } = await supabase
        .from("tournament_registrations")
        .update({ payment_status: newPaymentStatus })
        .in("id", selectedPayment.registration_ids);

      if (registrationError) throw registrationError;

      // Refresh data
      await fetchPendingPayments();
      onUpdate();
      
      // Reset form
      setSelectedPayment(null);
      setActionType(null);
      setNotes("");
      
      alert(`Payment ${actionType === "approve" ? "approved" : "rejected"} successfully!`);
    } catch (error) {
      console.error("Error processing payment:", error);
      alert("Error processing payment. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="text-yellow-600"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "approved":
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <CreditCard className="h-5 w-5 mr-2" />
              Payment Approval Center
            </DialogTitle>
            <DialogDescription>
              Review and approve team payments for the tournament
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p>Loading payments...</p>
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No payments found</h3>
                <p>Team payments will appear here when coaches submit them.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {payments.map((payment) => (
                  <Card key={payment.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{payment.team_name}</CardTitle>
                          <div className="text-sm text-muted-foreground">
                            Coach: {payment.coach.full_name} ({payment.coach.email})
                          </div>
                        </div>
                        <div className="text-right">
                          {getStatusBadge(payment.status)}
                          <div className="text-lg font-bold mt-1">
                            ₱{payment.amount.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <div className="text-sm font-medium">Payment Details</div>
                          <div className="text-sm text-muted-foreground">
                            Method: {payment.payment_method}<br />
                            Reference: ***{payment.reference_number}<br />
                            Participants: {payment.participant_count}<br />
                            Submitted: {new Date(payment.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        {payment.description && (
                          <div>
                            <div className="text-sm font-medium">Description</div>
                            <div className="text-sm text-muted-foreground">
                              {payment.description}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Participants List */}
                      <div className="mb-4">
                        <div className="text-sm font-medium mb-2 flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          Registered Athletes ({payment.registrations?.length || 0})
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                          {payment.registrations?.map((reg) => (
                            <div key={reg.id} className="text-xs p-2 bg-muted rounded">
                              <div className="font-medium">{reg.athlete.full_name}</div>
                              <div className="text-muted-foreground">
                                {reg.athlete.gender} • {reg.athlete.age}y • 
                                {reg.athlete.belt_rank.replace("_", " ").toUpperCase()}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Validation Check */}
                      {payment.participant_count !== payment.registrations?.length && (
                        <div className="flex items-center p-2 bg-amber-50 border border-amber-200 rounded mb-4">
                          <AlertTriangle className="h-4 w-4 text-amber-600 mr-2" />
                          <div className="text-sm text-amber-800">
                            Participant count mismatch: Payment for {payment.participant_count} but {payment.registrations?.length || 0} registrations found
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      {payment.status === "pending" && (
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handlePaymentAction(payment, "approve")}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve Payment
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handlePaymentAction(payment, "reject")}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject Payment
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal */}
      {selectedPayment && actionType && (
        <Dialog open={true} onOpenChange={() => {
          setSelectedPayment(null);
          setActionType(null);
          setNotes("");
        }}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                {actionType === "approve" ? (
                  <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 mr-2 text-red-600" />
                )}
                {actionType === "approve" ? "Approve" : "Reject"} Payment
              </DialogTitle>
              <DialogDescription>
                {actionType === "approve" 
                  ? "This will mark all participants as paid and approve the payment."
                  : "This will reject the payment and keep participants as unpaid."
                }
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="bg-muted p-3 rounded-lg">
                <div className="font-medium">{selectedPayment.team_name}</div>
                <div className="text-sm text-muted-foreground">
                  ₱{selectedPayment.amount.toLocaleString()} for {selectedPayment.participant_count} participants
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about this decision..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSelectedPayment(null);
                  setActionType(null);
                  setNotes("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmPaymentAction}
                disabled={actionLoading}
                className={actionType === "approve" ? "bg-green-600 hover:bg-green-700" : ""}
                variant={actionType === "reject" ? "destructive" : "default"}
              >
                {actionLoading ? "Processing..." : `${actionType === "approve" ? "Approve" : "Reject"} Payment`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
