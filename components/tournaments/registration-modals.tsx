"use client";

import { useEffect, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Scale, UserCheck, CreditCard, AlertCircle } from "lucide-react";
import { calculateAge } from "@/lib/types/database";

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
  payment_status: string;
  checked_in: boolean;
  weighed_in: boolean;
  weight_recorded?: number;
  height_recorded?: number;
  notes?: string;
}

interface WeighInModalProps {
  registration: Registration | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function WeighInModal({
  registration,
  isOpen,
  onClose,
  onUpdate
}: WeighInModalProps) {
  const weightValue =
    registration?.weight_recorded || registration?.athlete.weight || "";
  const heightValue = registration?.athlete.height || "";
  const [weight, setWeight] = useState(weightValue.toString());
  const [height, setHeight] = useState(heightValue.toString());
  const [notes, setNotes] = useState(registration?.notes || "");
  const [loading, setLoading] = useState(false);

  // Calculate age from date of birth
  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return 0;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  };

  useEffect(() => {
    if (registration) {
      setWeight(weightValue.toString());
      setHeight(heightValue.toString());
      setNotes(registration.notes || "");
    }
  }, [registration, weightValue, heightValue]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registration) return;

    const supabase = createClient();

    setLoading(true);
    try {
      // Update registration with weigh-in data
      const { error: regError } = await supabase
        .from("tournament_registrations")
        .update({
          weighed_in: true,
          weight_recorded: parseFloat(weight),
          height_recorded: parseFloat(height),
          notes: notes
        })
        .eq("id", registration.id);

      if (regError) throw regError;

      // Update athlete's height if provided
      if (
        (height && parseFloat(height) !== registration.athlete.height) ||
        (weight && parseFloat(weight) !== registration.athlete.weight)
      ) {
        const { error: athleteError } = await supabase
          .from("athletes")
          .update({ height: parseFloat(height), weight: parseFloat(weight) })
          .eq("id", registration.athlete.id);

        if (athleteError) throw athleteError;
      }

      onUpdate();
      onClose();
      setWeight("");
      setHeight("");
      setNotes("");
    } catch (error) {
      console.error("Error recording weigh-in:", error);
      alert("Error recording weigh-in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!registration) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Scale className="h-5 w-5 mr-2" />
            Record Weigh-In
          </DialogTitle>
          <DialogDescription>
            Record the official weight and height for{" "}
            {registration.athlete.full_name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Athlete Info */}
            <div className="bg-muted p-3 rounded-lg">
              <div className="font-medium">
                {registration.athlete.full_name}
              </div>
              <div className="text-sm text-muted-foreground">
                {registration.team.name} • {registration.athlete.gender} •{" "}
                {calculateAge(registration.athlete.date_of_birth || "")} years
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <Badge variant="outline">
                  {registration.athlete.belt_rank
                    .replace("_", " ")
                    .toUpperCase()}
                </Badge>
                <Badge
                  variant={
                    registration.payment_status === "paid"
                      ? "default"
                      : "outline"
                  }
                >
                  {registration.payment_status.toUpperCase()}
                </Badge>
              </div>
            </div>

            {/* Current Measurements */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Registered Weight:</span>
                <div>{registration.athlete.weight}kg</div>
              </div>
              <div>
                <span className="font-medium">Registered Height:</span>
                <div>{registration.athlete.height}cm</div>
              </div>
            </div>

            {/* Weight Input */}
            <div className="space-y-2">
              <Label htmlFor="weight">Official Weight (kg) *</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                min="0"
                max="200"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="Enter official weight"
                required
              />
              {weight && parseFloat(weight) !== registration.athlete.weight && (
                <div className="flex items-center text-sm text-amber-600">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  Weight differs from registration (
                  {registration.athlete.weight}kg)
                </div>
              )}
            </div>

            {/* Height Input */}
            <div className="space-y-2">
              <Label htmlFor="height">Height (cm)</Label>
              <Input
                id="height"
                type="number"
                min="0"
                max="250"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="Enter height (optional)"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes or observations..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !weight}>
              {loading ? "Recording..." : "Record Weigh-In"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface CheckInModalProps {
  registration: Registration | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function CheckInModal({
  registration,
  isOpen,
  onClose,
  onUpdate
}: CheckInModalProps) {
  const [notes, setNotes] = useState(registration?.notes || "");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registration) return;

    const supabase = createClient();

    setLoading(true);
    try {
      const { error } = await supabase
        .from("tournament_registrations")
        .update({
          checked_in: true,
          notes: notes
        })
        .eq("id", registration.id);

      if (error) throw error;

      onUpdate();
      onClose();
      setNotes("");
    } catch (error) {
      console.error("Error checking in participant:", error);
      alert("Error checking in participant. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!registration) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <UserCheck className="h-5 w-5 mr-2" />
            Check-In Participant
          </DialogTitle>
          <DialogDescription>
            Confirm check-in for {registration.athlete.full_name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Athlete Info */}
            <div className="bg-muted p-3 rounded-lg">
              <div className="font-medium">
                {registration.athlete.full_name}
              </div>
              <div className="text-sm text-muted-foreground">
                {registration.team.name} • {registration.athlete.gender} •{" "}
                {calculateAge(registration.athlete.date_of_birth || "")} years
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <Badge variant="outline">
                  {registration.athlete.belt_rank
                    .replace("_", " ")
                    .toUpperCase()}
                </Badge>
                <Badge
                  variant={
                    registration.payment_status === "paid"
                      ? "default"
                      : "outline"
                  }
                >
                  {registration.payment_status.toUpperCase()}
                </Badge>
              </div>
            </div>

            {/* Payment Warning */}
            {registration.payment_status !== "paid" && (
              <div className="flex items-center p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle className="h-4 w-4 text-amber-600 mr-2" />
                <div className="text-sm text-amber-800">
                  Payment status is not confirmed. Please verify payment before
                  check-in.
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Check-in Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any notes or special instructions..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Checking In..." : "Confirm Check-In"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface PaymentUpdateModalProps {
  registration: Registration | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function PaymentUpdateModal({
  registration,
  isOpen,
  onClose,
  onUpdate
}: PaymentUpdateModalProps) {
  const [paymentStatus, setPaymentStatus] = useState(
    registration?.payment_status || "pending"
  );
  const [notes, setNotes] = useState(registration?.notes || "");
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registration) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("tournament_registrations")
        .update({
          payment_status: paymentStatus,
          notes: notes
        })
        .eq("id", registration.id);

      if (error) throw error;

      onUpdate();
      onClose();
    } catch (error) {
      console.error("Error updating payment:", error);
      alert("Error updating payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!registration) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <CreditCard className="h-5 w-5 mr-2" />
            Update Payment Status
          </DialogTitle>
          <DialogDescription>
            Update payment status for {registration.athlete.full_name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Athlete Info */}
            <div className="bg-muted p-3 rounded-lg">
              <div className="font-medium">
                {registration.athlete.full_name}
              </div>
              <div className="text-sm text-muted-foreground">
                {registration.team.name} • {registration.athlete.gender} •{" "}
                {calculateAge(registration.athlete.date_of_birth || "")} years
              </div>
            </div>

            {/* Payment Status */}
            <div className="space-y-2">
              <Label htmlFor="payment-status">Payment Status</Label>
              <select
                id="payment-status"
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                className="w-full p-2 border border-input rounded-md"
              >
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Payment Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Payment reference, method, or other notes..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
