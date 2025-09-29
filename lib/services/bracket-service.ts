import { createClient } from "@/lib/supabase/client";
import { 
  Division, 
  DivisionParticipant, 
  Bracket, 
  Match,
  MatchStatus 
} from "@/lib/types/database";

export interface BracketNode {
  id: string;
  participant1?: DivisionParticipant;
  participant2?: DivisionParticipant;
  winner?: DivisionParticipant;
  round: number;
  matchNumber: number;
  nextMatchId?: string;
}

export class BracketService {
  private supabase = createClient();

  /**
   * Generate single elimination bracket for a division
   */
  async generateSingleEliminationBracket(divisionId: string): Promise<Bracket> {
    try {
      // Get division participants
      const { data: participants, error: participantsError } = await this.supabase
        .from("division_participants")
        .select(`
          *,
          athlete:athletes(*),
          registration:tournament_registrations(*)
        `)
        .eq("division_id", divisionId)
        .order("seed_number");

      if (participantsError) throw participantsError;
      if (!participants || participants.length < 2) {
        throw new Error("Need at least 2 participants to create a bracket");
      }

      // Calculate bracket structure
      const participantCount = participants.length;
      const bracketSize = this.getNextPowerOfTwo(participantCount);
      const totalRounds = Math.log2(bracketSize);
      const byeCount = bracketSize - participantCount;

      // Create bracket
      const { data: bracket, error: bracketError } = await this.supabase
        .from("brackets")
        .insert({
          division_id: divisionId,
          bracket_type: "single_elimination",
          total_rounds: totalRounds,
        })
        .select()
        .single();

      if (bracketError) throw bracketError;

      // Generate matches
      await this.generateMatches(bracket.id, participants, bracketSize, totalRounds);

      return bracket;
    } catch (error) {
      console.error("Error generating bracket:", error);
      throw error;
    }
  }

  /**
   * Generate all matches for the bracket
   */
  private async generateMatches(
    bracketId: string,
    participants: DivisionParticipant[],
    bracketSize: number,
    totalRounds: number
  ): Promise<void> {
    const matches: Omit<Match, "id" | "created_at" | "updated_at">[] = [];
    
    // Shuffle participants while respecting seeding and avoiding same team matchups
    const shuffledParticipants = this.shuffleParticipants(participants, bracketSize);

    // Generate first round matches
    const firstRoundMatches = Math.floor(bracketSize / 2);
    
    for (let i = 0; i < firstRoundMatches; i++) {
      const participant1 = shuffledParticipants[i * 2];
      const participant2 = shuffledParticipants[i * 2 + 1];

      matches.push({
        bracket_id: bracketId,
        round_number: 1,
        match_number: i + 1,
        participant1_id: participant1?.id || null,
        participant2_id: participant2?.id || null,
        winner_id: null,
        participant1_score: 0,
        participant2_score: 0,
        status: "pending" as MatchStatus,
        scheduled_time: null,
        actual_start_time: null,
        actual_end_time: null,
        notes: null,
      });
    }

    // Generate subsequent rounds (empty matches to be filled as tournament progresses)
    for (let round = 2; round <= totalRounds; round++) {
      const matchesInRound = Math.floor(bracketSize / Math.pow(2, round));
      
      for (let i = 0; i < matchesInRound; i++) {
        matches.push({
          bracket_id: bracketId,
          round_number: round,
          match_number: i + 1,
          participant1_id: null,
          participant2_id: null,
          winner_id: null,
          participant1_score: 0,
          participant2_score: 0,
          status: "pending" as MatchStatus,
          scheduled_time: null,
          actual_start_time: null,
          actual_end_time: null,
          notes: null,
        });
      }
    }

    // Insert all matches
    const { error } = await this.supabase
      .from("matches")
      .insert(matches);

    if (error) throw error;
  }

  /**
   * Shuffle participants while avoiding same team matchups in first round
   */
  private shuffleParticipants(
    participants: DivisionParticipant[],
    bracketSize: number
  ): (DivisionParticipant | null)[] {
    const result: (DivisionParticipant | null)[] = new Array(bracketSize).fill(null);
    const shuffled = [...participants];

    // Simple shuffle that tries to avoid same team matchups
    for (let i = 0; i < shuffled.length; i++) {
      let placed = false;
      let attempts = 0;
      
      while (!placed && attempts < 10) {
        const position = Math.floor(Math.random() * bracketSize);
        
        if (result[position] === null) {
          // Check if this would create a same-team matchup in first round
          const pairPosition = position % 2 === 0 ? position + 1 : position - 1;
          const pairParticipant = result[pairPosition];
          
          if (!pairParticipant || 
              !shuffled[i].registration?.team_id || 
              shuffled[i].registration.team_id !== pairParticipant.registration?.team_id) {
            result[position] = shuffled[i];
            placed = true;
          }
        }
        attempts++;
      }
      
      // If we couldn't avoid same team matchup, place anyway
      if (!placed) {
        const position = result.findIndex(p => p === null);
        if (position !== -1) {
          result[position] = shuffled[i];
        }
      }
    }

    return result;
  }

  /**
   * Get the next power of 2 greater than or equal to n
   */
  private getNextPowerOfTwo(n: number): number {
    return Math.pow(2, Math.ceil(Math.log2(n)));
  }

  /**
   * Update match result and advance winner
   */
  async updateMatchResult(
    matchId: string,
    participant1Score: number,
    participant2Score: number,
    winnerId: string
  ): Promise<void> {
    try {
      // Update the match
      const { data: match, error: matchError } = await this.supabase
        .from("matches")
        .update({
          participant1_score: participant1Score,
          participant2_score: participant2Score,
          winner_id: winnerId,
          status: "completed" as MatchStatus,
          actual_end_time: new Date().toISOString(),
        })
        .eq("id", matchId)
        .select()
        .single();

      if (matchError) throw matchError;

      // Find and update the next round match
      await this.advanceWinner(match);
    } catch (error) {
      console.error("Error updating match result:", error);
      throw error;
    }
  }

  /**
   * Advance winner to next round
   */
  private async advanceWinner(completedMatch: Match): Promise<void> {
    if (!completedMatch.winner_id) return;

    const nextRound = completedMatch.round_number + 1;
    const nextMatchNumber = Math.ceil(completedMatch.match_number / 2);

    // Find the next round match
    const { data: nextMatch, error: nextMatchError } = await this.supabase
      .from("matches")
      .select("*")
      .eq("bracket_id", completedMatch.bracket_id)
      .eq("round_number", nextRound)
      .eq("match_number", nextMatchNumber)
      .single();

    if (nextMatchError || !nextMatch) return; // Final match or error

    // Determine which position in the next match
    const isFirstParticipant = completedMatch.match_number % 2 === 1;
    const updateField = isFirstParticipant ? "participant1_id" : "participant2_id";

    // Update the next match
    const { error: updateError } = await this.supabase
      .from("matches")
      .update({
        [updateField]: completedMatch.winner_id,
      })
      .eq("id", nextMatch.id);

    if (updateError) throw updateError;
  }

  /**
   * Get bracket with all matches
   */
  async getBracket(bracketId: string): Promise<Bracket | null> {
    const { data: bracket, error } = await this.supabase
      .from("brackets")
      .select(`
        *,
        division:divisions(*),
        matches:matches(
          *,
          participant1:division_participants!matches_participant1_id_fkey(
            *,
            athlete:athletes(*)
          ),
          participant2:division_participants!matches_participant2_id_fkey(
            *,
            athlete:athletes(*)
          ),
          winner:division_participants!matches_winner_id_fkey(
            *,
            athlete:athletes(*)
          )
        )
      `)
      .eq("id", bracketId)
      .single();

    if (error) {
      console.error("Error fetching bracket:", error);
      return null;
    }

    return bracket;
  }

  /**
   * Get brackets for a division
   */
  async getBracketsForDivision(divisionId: string): Promise<Bracket[]> {
    const { data: brackets, error } = await this.supabase
      .from("brackets")
      .select(`
        *,
        matches:matches(
          *,
          participant1:division_participants!matches_participant1_id_fkey(
            *,
            athlete:athletes(*)
          ),
          participant2:division_participants!matches_participant2_id_fkey(
            *,
            athlete:athletes(*)
          ),
          winner:division_participants!matches_winner_id_fkey(
            *,
            athlete:athletes(*)
          )
        )
      `)
      .eq("division_id", divisionId)
      .order("created_at");

    if (error) throw error;
    return brackets || [];
  }

  /**
   * Delete bracket and all its matches
   */
  async deleteBracket(bracketId: string): Promise<void> {
    const { error } = await this.supabase
      .from("brackets")
      .delete()
      .eq("id", bracketId);

    if (error) throw error;
  }

  /**
   * Get tournament results from completed brackets
   */
  async generateTournamentResults(tournamentId: string): Promise<void> {
    try {
      // Get all divisions for the tournament
      const { data: divisions, error: divisionsError } = await this.supabase
        .from("divisions")
        .select("*")
        .eq("tournament_id", tournamentId);

      if (divisionsError) throw divisionsError;

      for (const division of divisions || []) {
        // Get the bracket for this division
        const { data: brackets, error: bracketsError } = await this.supabase
          .from("brackets")
          .select(`
            *,
            matches:matches(
              *,
              participant1:division_participants!matches_participant1_id_fkey(*),
              participant2:division_participants!matches_participant2_id_fkey(*),
              winner:division_participants!matches_winner_id_fkey(*)
            )
          `)
          .eq("division_id", division.id);

        if (bracketsError) continue;

        for (const bracket of brackets || []) {
          // Find final match (highest round number)
          const finalMatch = bracket.matches?.reduce((latest, match) => 
            match.round_number > latest.round_number ? match : latest
          );

          if (finalMatch?.winner_id && finalMatch.status === "completed") {
            // Create results for 1st, 2nd, 3rd place
            const results = [
              {
                tournament_id: tournamentId,
                division_id: division.id,
                athlete_id: finalMatch.winner.athlete_id,
                placement: 1,
                medal_type: "gold",
              }
            ];

            // Find runner-up (loser of final)
            const runnerUpId = finalMatch.participant1_id === finalMatch.winner_id 
              ? finalMatch.participant2_id 
              : finalMatch.participant1_id;

            if (runnerUpId) {
              const runnerUp = finalMatch.participant1_id === runnerUpId 
                ? finalMatch.participant1 
                : finalMatch.participant2;
              
              results.push({
                tournament_id: tournamentId,
                division_id: division.id,
                athlete_id: runnerUp.athlete_id,
                placement: 2,
                medal_type: "silver",
              });
            }

            // Insert results
            const { error: resultsError } = await this.supabase
              .from("tournament_results")
              .upsert(results, { onConflict: "tournament_id,division_id,athlete_id" });

            if (resultsError) {
              console.error("Error inserting results:", resultsError);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error generating tournament results:", error);
      throw error;
    }
  }
}
