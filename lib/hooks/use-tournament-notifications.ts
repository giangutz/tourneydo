"use client";

import { useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { emailService } from "@/lib/email/email-service";
import { Tournament } from "@/lib/types/database";

export function useTournamentNotifications() {
  const supabase = createClient();

  const notifyTournamentCancellation = useCallback(async (tournament: Tournament) => {
    // Get all registered participants
    const { data: registrations } = await supabase
      .from('tournament_registrations')
      .select(`
        *,
        athlete:athletes(*),
        coach:profiles(*)
      `)
      .eq('tournament_id', tournament.id);

    if (registrations) {
      for (const registration of registrations) {
        if (registration.coach) {
          await emailService.sendTournamentNotification({
            email: registration.coach.email,
            name: registration.coach.full_name,
            tournamentName: tournament.name,
            message: `Unfortunately, the tournament "${tournament.name}" has been cancelled. We apologize for any inconvenience.`,
            type: 'cancelled',
            tournamentDate: tournament.tournament_date,
            location: tournament.location,
          });
        }
      }
    }
  }, [supabase]);

  const notifyTournamentUpdate = useCallback(async (tournament: Tournament) => {
    // Get all registered participants
    const { data: registrations } = await supabase
      .from('tournament_registrations')
      .select(`
        *,
        athlete:athletes(*),
        coach:profiles(*)
      `)
      .eq('tournament_id', tournament.id);

    if (registrations) {
      for (const registration of registrations) {
        if (registration.coach) {
          await emailService.sendTournamentNotification({
            email: registration.coach.email,
            name: registration.coach.full_name,
            tournamentName: tournament.name,
            message: `The tournament "${tournament.name}" has been updated. Please check the latest details.`,
            type: 'updated',
            tournamentDate: tournament.tournament_date,
            location: tournament.location,
          });
        }
      }
    }
  }, [supabase]);

  const handleTournamentCreated = useCallback(async (tournament: Tournament) => {
    try {
      // Get organizer info
      const { data: organizer } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', tournament.organizer_id)
        .single();

      if (!organizer) return;

      // Get all coaches who might be interested
      const { data: coaches } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'coach');

      if (coaches) {
        // Send notifications to coaches about new tournament
        for (const coach of coaches) {
          await emailService.sendTournamentNotification({
            email: coach.email,
            name: coach.full_name,
            tournamentName: tournament.name,
            message: `A new tournament "${tournament.name}" has been created and is now open for registration!`,
            type: 'created',
            tournamentDate: tournament.tournament_date,
            location: tournament.location,
          });
        }
      }
    } catch (error) {
      console.error('Error sending tournament creation notifications:', error);
    }
  }, [supabase]);

  const handleTournamentUpdated = useCallback(async (newTournament: Tournament, oldTournament: Tournament) => {
    try {
      // Check if tournament was cancelled
      if (oldTournament.status !== 'cancelled' && newTournament.status === 'cancelled') {
        await notifyTournamentCancellation(newTournament);
        return;
      }

      // Check for significant changes
      const significantChanges = [
        newTournament.tournament_date !== oldTournament.tournament_date,
        newTournament.location !== oldTournament.location,
        newTournament.registration_deadline !== oldTournament.registration_deadline,
      ];

      if (significantChanges.some(Boolean)) {
        await notifyTournamentUpdate(newTournament);
      }
    } catch (error) {
      console.error('Error sending tournament update notifications:', error);
    }
  }, [notifyTournamentCancellation, notifyTournamentUpdate]);

  useEffect(() => {
    // Subscribe to tournament changes
    const channel = supabase
      .channel('tournament-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournaments'
        },
        async (payload) => {
          console.log('Tournament change detected:', payload);
          
          if (payload.eventType === 'INSERT') {
            await handleTournamentCreated(payload.new as Tournament);
          } else if (payload.eventType === 'UPDATE') {
            await handleTournamentUpdated(payload.new as Tournament, payload.old as Tournament);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, handleTournamentCreated, handleTournamentUpdated]);

  const sendTournamentReminder = async (tournamentId: string) => {
    try {
      const { data: tournament } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

      if (!tournament) return;

      // Get all registered participants
      const { data: registrations } = await supabase
        .from('tournament_registrations')
        .select(`
          *,
          athlete:athletes(*),
          coach:profiles(*)
        `)
        .eq('tournament_id', tournamentId);

      if (registrations) {
        for (const registration of registrations) {
          if (registration.coach) {
            await emailService.sendTournamentNotification({
              email: registration.coach.email,
              name: registration.coach.full_name,
              tournamentName: tournament.name,
              message: `Reminder: The tournament "${tournament.name}" is coming up soon. Please ensure your athletes are prepared and arrive on time.`,
              type: 'reminder',
              tournamentDate: tournament.tournament_date,
              location: tournament.location,
            });
          }
        }
      }
    } catch (error) {
      console.error('Error sending tournament reminders:', error);
    }
  };

  return {
    sendTournamentReminder,
  };
}
