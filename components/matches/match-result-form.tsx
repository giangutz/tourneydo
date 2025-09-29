"use client";

import { useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Match } from "@/lib/types/database";
import { BracketService } from "@/lib/services/bracket-service";
import { Trophy, Edit, Clock } from "lucide-react";

interface MatchResultFormProps {
  match: Match;
  onResultUpdated: () => void;
}

export function MatchResultForm({ match, onResultUpdated }: MatchResultFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    participant1Score: match.participant1_score,
    participant2Score: match.participant2_score,
    notes: match.notes || "",
  });
  
  const supabase = createClient();
  const bracketService = new BracketService();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Validate scores
      if (formData.participant1Score === formData.participant2Score) {
        throw new Error("Scores cannot be tied. One participant must win.");
      }

      // Determine winner
      const winnerId = formData.participant1Score > formData.participant2Score
        ? match.participant1_id
        : match.participant2_id;

      if (!winnerId) {
        throw new Error("Cannot determine winner - missing participant data");
      }

      // Update match result
      await bracketService.updateMatchResult(
        match.id,
        formData.participant1Score,
        formData.participant2Score,
        winnerId
      );

      // Update notes if provided
      if (formData.notes !== match.notes) {
        await supabase
          .from("matches")
          .update({ notes: formData.notes })
          .eq("id", match.id);
      }

      setIsOpen(false);
      onResultUpdated();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const canEdit = match.status === "pending" || match.status === "in_progress";
  const participant1Name = match.participant1?.athlete?.full_name || "TBD";
  const participant2Name = match.participant2?.athlete?.full_name || "TBD";

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={match.status === "completed" ? "outline" : "default"} 
          size="sm"
          disabled={!match.participant1_id || !match.participant2_id}
        >
          {match.status === "completed" ? (
            <>
              <Trophy className="mr-2 h-4 w-4" />
              View Result
            </>
          ) : (
            <>
              <Edit className="mr-2 h-4 w-4" />
              Enter Result
            </>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {match.status === "completed" ? "Match Result" : "Enter Match Result"}
          </DialogTitle>
          <DialogDescription>
            Round {match.round_number}, Match {match.match_number}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Match Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Match Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium">{participant1Name}</span>
                <span className="text-muted-foreground">vs</span>
                <span className="font-medium">{participant2Name}</span>
              </div>
              
              {match.status === "completed" && (
                <div className="flex justify-center">
                  <Badge variant="secondary">
                    {match.winner?.athlete?.full_name} Wins
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Score Form */}
          {canEdit && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="participant1Score">
                    {participant1Name} Score
                  </Label>
                  <Input
                    id="participant1Score"
                    type="number"
                    min="0"
                    max="50"
                    value={formData.participant1Score}
                    onChange={(e) => handleInputChange("participant1Score", parseInt(e.target.value) || 0)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="participant2Score">
                    {participant2Name} Score
                  </Label>
                  <Input
                    id="participant2Score"
                    type="number"
                    min="0"
                    max="50"
                    value={formData.participant2Score}
                    onChange={(e) => handleInputChange("participant2Score", parseInt(e.target.value) || 0)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Match notes, penalties, etc..."
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  rows={3}
                />
              </div>

              {error && (
                <div className="p-3 border border-red-200 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Saving..." : "Save Result"}
                </Button>
              </DialogFooter>
            </form>
          )}

          {/* Read-only view for completed matches */}
          {match.status === "completed" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="font-semibold">{participant1Name}</div>
                  <div className="text-2xl font-bold text-primary">
                    {match.participant1_score}
                  </div>
                </div>
                
                <div className="text-center p-4 border rounded-lg">
                  <div className="font-semibold">{participant2Name}</div>
                  <div className="text-2xl font-bold text-primary">
                    {match.participant2_score}
                  </div>
                </div>
              </div>

              {match.notes && (
                <div className="p-3 bg-muted rounded-lg">
                  <Label className="text-sm font-medium">Notes:</Label>
                  <p className="text-sm mt-1">{match.notes}</p>
                </div>
              )}

              {match.actual_end_time && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="mr-2 h-4 w-4" />
                  Completed: {new Date(match.actual_end_time).toLocaleString()}
                </div>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
