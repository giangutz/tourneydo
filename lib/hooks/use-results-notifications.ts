"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { emailService } from "@/lib/email/email-service";

interface ResultData {
  id: string;
  tournament_id: string;
  division_id: string;
  athlete_id: string;
  placement: number;
  medal_type?: string;
  created_at: string;
}

export function useResultsNotifications() {
  const supabase = createClient();

  useEffect(() => {
    // Subscribe to tournament results changes
    const channel = supabase
      .channel('results-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tournament_results'
        },
        async (payload) => {
          console.log('Result added:', payload);
          await handleResultAdded(payload.new as ResultData);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tournament_results'
        },
        async (payload) => {
          console.log('Result updated:', payload);
          await handleResultUpdated(payload.new as ResultData);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const handleResultAdded = async (result: ResultData) => {
    try {
      await sendResultNotification(result);
    } catch (error) {
      console.error('Error sending result notification:', error);
    }
  };

  const handleResultUpdated = async (result: ResultData) => {
    try {
      await sendResultNotification(result);
    } catch (error) {
      console.error('Error sending updated result notification:', error);
    }
  };

  const sendResultNotification = async (result: ResultData) => {
    try {
      // Get result details with related data
      const { data: resultDetails } = await supabase
        .from('tournament_results')
        .select(`
          *,
          tournament:tournaments(*),
          division:divisions(*),
          athlete:athletes(*, coach:profiles(*))
        `)
        .eq('id', result.id)
        .single();

      if (!resultDetails || !resultDetails.tournament || !resultDetails.athlete || !resultDetails.athlete.coach) {
        return;
      }

      // Send result notification to coach
      await emailService.sendResultNotification({
        email: resultDetails.athlete.coach.email,
        athleteName: resultDetails.athlete.full_name,
        tournamentName: resultDetails.tournament.name,
        placement: resultDetails.placement,
        division: resultDetails.division?.name || `${resultDetails.athlete.age_group} - ${resultDetails.athlete.belt_rank}`,
        medalType: resultDetails.medal_type,
      });

      // If it's a podium finish (1st, 2nd, 3rd), also notify the organizer
      if (resultDetails.placement <= 3) {
        const { data: organizer } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', resultDetails.tournament.organizer_id)
          .single();

        if (organizer) {
          const placementText = resultDetails.placement === 1 ? "1st place" : 
                               resultDetails.placement === 2 ? "2nd place" : "3rd place";
          
          await emailService.sendTournamentNotification({
            email: organizer.email,
            name: organizer.full_name,
            tournamentName: resultDetails.tournament.name,
            message: `🏆 Congratulations! ${resultDetails.athlete.full_name} achieved ${placementText} in their division at "${resultDetails.tournament.name}".`,
            type: 'updated',
            tournamentDate: resultDetails.tournament.tournament_date,
            location: resultDetails.tournament.location,
          });
        }
      }

    } catch (error) {
      console.error('Error sending result notification:', error);
    }
  };

  const sendBulkResultNotifications = async (tournamentId: string) => {
    try {
      // Get all results for the tournament
      const { data: results } = await supabase
        .from('tournament_results')
        .select(`
          *,
          tournament:tournaments(*),
          division:divisions(*),
          athlete:athletes(*, coach:profiles(*))
        `)
        .eq('tournament_id', tournamentId);

      if (!results) return;

      // Group results by coach to send one email per coach with all their athletes' results
      const resultsByCoach = results.reduce((acc, result) => {
        if (!result.athlete?.coach?.email) return acc;
        
        const coachEmail = result.athlete.coach.email;
        if (!acc[coachEmail]) {
          acc[coachEmail] = {
            coach: result.athlete.coach,
            tournament: result.tournament,
            results: []
          };
        }
        acc[coachEmail].results.push(result);
        return acc;
      }, {} as Record<string, any>);

      // Send consolidated results email to each coach
      for (const coachData of Object.values(resultsByCoach)) {
        await sendConsolidatedResultsEmail(coachData);
      }

    } catch (error) {
      console.error('Error sending bulk result notifications:', error);
    }
  };

  const sendConsolidatedResultsEmail = async (coachData: any) => {
    try {
      const { coach, tournament, results } = coachData;
      
      // Create a summary of all results
      const resultsSummary = results
        .map((result: any) => {
          const placementText = result.placement === 1 ? "🥇 1st Place" : 
                               result.placement === 2 ? "🥈 2nd Place" : 
                               result.placement === 3 ? "🥉 3rd Place" : 
                               `${result.placement}th Place`;
          return `${result.athlete.full_name}: ${placementText}`;
        })
        .join('\n');

      const message = `Final results are now available for "${tournament.name}"!\n\nYour athletes' results:\n${resultsSummary}\n\nCongratulations to all participants for their hard work and dedication!`;

      await emailService.sendTournamentNotification({
        email: coach.email,
        name: coach.full_name,
        tournamentName: tournament.name,
        message: message,
        type: 'updated',
        tournamentDate: tournament.tournament_date,
        location: tournament.location,
      });

    } catch (error) {
      console.error('Error sending consolidated results email:', error);
    }
  };

  return {
    sendBulkResultNotifications,
  };
}
