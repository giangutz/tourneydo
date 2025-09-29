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
  CardTitle,
} from "@/components/ui/card";
import { Calendar, MapPin, DollarSign, Users, FileText, CreditCard, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface CreateTournamentFormProps {
  organizerId: string;
}

export function CreateTournamentForm({ organizerId }: CreateTournamentFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    location: "",
    tournament_date: "",
    registration_deadline: "",
    weigh_in_date: "",
    entry_fee: 0,
    max_participants: undefined as number | undefined,
    rules: "",
  });
  const [paymentMethods, setPaymentMethods] = useState<string[]>([
    "Bank Transfer", "GCash", "PayMaya", "Cash"
  ]);
  const [customPaymentMethod, setCustomPaymentMethod] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const defaultPaymentMethods = [
    "Bank Transfer", "GCash", "PayMaya", "Cash", "Check", 
    "Credit Card", "Debit Card", "Online Banking"
  ];

  const handleInputChange = (field: string, value: string | number | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePaymentMethodToggle = (method: string, checked: boolean) => {
    if (checked) {
      setPaymentMethods(prev => [...prev, method]);
    } else {
      setPaymentMethods(prev => prev.filter(m => m !== method));
    }
  };

  const handleAddCustomPaymentMethod = () => {
    if (customPaymentMethod.trim() && !paymentMethods.includes(customPaymentMethod.trim())) {
      setPaymentMethods(prev => [...prev, customPaymentMethod.trim()]);
      setCustomPaymentMethod("");
    }
  };

  const handleRemovePaymentMethod = (method: string) => {
    setPaymentMethods(prev => prev.filter(m => m !== method));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Validate dates
      const tournamentDate = new Date(formData.tournament_date);
      const registrationDeadline = new Date(formData.registration_deadline);
      const weighInDate = new Date(formData.weigh_in_date);

      if (registrationDeadline >= tournamentDate) {
        throw new Error("Registration deadline must be before tournament date");
      }

      if (weighInDate > tournamentDate) {
        throw new Error("Weigh-in date must be on or before tournament date");
      }

      // Create tournament
      const { data: tournament, error: tournamentError } = await supabase
        .from("tournaments")
        .insert({
          organizer_id: organizerId,
          name: formData.name,
          description: formData.description || null,
          location: formData.location,
          tournament_date: formData.tournament_date,
          registration_deadline: formData.registration_deadline,
          weigh_in_date: formData.weigh_in_date,
          entry_fee: formData.entry_fee,
          max_participants: formData.max_participants || null,
          rules: formData.rules || null,
          payment_methods: paymentMethods,
          status: "draft",
        })
        .select()
        .single();

      if (tournamentError) throw tournamentError;

      // Redirect to tournament details page
      router.push(`/dashboard/tournaments/${tournament.id}`);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            Basic Information
          </CardTitle>
          <CardDescription>
            Enter the basic details for your tournament
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Tournament Name *</Label>
              <Input
                id="name"
                placeholder="Spring Championship 2024"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="location"
                  placeholder="Sports Center, City, State"
                  className="pl-10"
                  value={formData.location}
                  onChange={(e) => handleInputChange("location", e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe your tournament..."
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            Dates & Deadlines
          </CardTitle>
          <CardDescription>
            Set important dates for your tournament
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="tournament_date">Tournament Date *</Label>
              <Input
                id="tournament_date"
                type="date"
                value={formData.tournament_date}
                onChange={(e) => handleInputChange("tournament_date", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="registration_deadline">Registration Deadline *</Label>
              <Input
                id="registration_deadline"
                type="datetime-local"
                value={formData.registration_deadline}
                onChange={(e) => handleInputChange("registration_deadline", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weigh_in_date">Weigh-in Date *</Label>
              <Input
                id="weigh_in_date"
                type="date"
                value={formData.weigh_in_date}
                onChange={(e) => handleInputChange("weigh_in_date", e.target.value)}
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5" />
            Participation & Fees
          </CardTitle>
          <CardDescription>
            Configure participation limits and entry fees
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="entry_fee">Entry Fee ($) *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="entry_fee"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="50.00"
                  className="pl-10"
                  value={formData.entry_fee}
                  onChange={(e) => handleInputChange("entry_fee", parseFloat(e.target.value) || 0)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_participants">Max Participants (Optional)</Label>
              <Input
                id="max_participants"
                type="number"
                min="1"
                placeholder="200"
                value={formData.max_participants || ""}
                onChange={(e) => handleInputChange("max_participants", parseInt(e.target.value) || undefined)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="mr-2 h-5 w-5" />
            Payment Methods
          </CardTitle>
          <CardDescription>
            Configure accepted payment methods for this tournament
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {defaultPaymentMethods.map((method) => (
              <div key={method} className="flex items-center space-x-2">
                <Checkbox
                  id={method}
                  checked={paymentMethods.includes(method)}
                  onCheckedChange={(checked) => handlePaymentMethodToggle(method, checked as boolean)}
                />
                <Label htmlFor={method} className="text-sm font-normal">
                  {method}
                </Label>
              </div>
            ))}
          </div>

          {/* Custom Payment Method */}
          <div className="pt-4 border-t">
            <Label className="text-sm font-medium">Add Custom Payment Method</Label>
            <div className="flex space-x-2 mt-2">
              <Input
                placeholder="e.g., Crypto, Western Union"
                value={customPaymentMethod}
                onChange={(e) => setCustomPaymentMethod(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddCustomPaymentMethod()}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddCustomPaymentMethod}
                disabled={!customPaymentMethod.trim()}
              >
                Add
              </Button>
            </div>
          </div>

          {/* Selected Payment Methods */}
          {paymentMethods.length > 0 && (
            <div className="pt-4 border-t">
              <Label className="text-sm font-medium">Selected Payment Methods:</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {paymentMethods.map((method) => (
                  <div
                    key={method}
                    className="flex items-center space-x-1 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm"
                  >
                    <span>{method}</span>
                    <button
                      type="button"
                      onClick={() => handleRemovePaymentMethod(method)}
                      className="ml-1 hover:bg-primary/20 rounded-full p-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rules & Regulations</CardTitle>
          <CardDescription>
            Specify tournament rules and regulations (optional)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            id="rules"
            placeholder="Enter tournament rules, regulations, and any special instructions..."
            value={formData.rules}
            onChange={(e) => handleInputChange("rules", e.target.value)}
            rows={6}
          />
        </CardContent>
      </Card>

      {error && (
        <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="flex justify-end space-x-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Creating Tournament..." : "Create Tournament"}
        </Button>
      </div>
    </form>
  );
}
