"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { emailService } from "@/lib/email/email-service";

interface RegistrationData {
  id: string;
  tournament_id: string;
  athlete_id: string;
  coach_id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

export function useRegistrationNotifications() {
  const supabase = createClient();

  useEffect(() => {
    // Subscribe to registration changes
    const channel = supabase
      .channel('registration-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_registrations'
        },
        async (payload) => {
          console.log('Registration change detected:', payload);
          
          if (payload.eventType === 'INSERT') {
            await handleRegistrationCreated(payload.new as RegistrationData);
          } else if (payload.eventType === 'UPDATE') {
            await handleRegistrationUpdated(payload.new as RegistrationData, payload.old as RegistrationData);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const handleRegistrationCreated = async (registration: RegistrationData) => {
    try {
      // Get registration details with related data
      const { data: fullRegistration } = await supabase
        .from('tournament_registrations')
        .select(`
          *,
          tournament:tournaments(*),
          athlete:athletes(*),
          coach:profiles(*)
        `)
        .eq('id', registration.id)
        .single();

      if (!fullRegistration || !fullRegistration.tournament || !fullRegistration.athlete || !fullRegistration.coach) {
        return;
      }

      // Send confirmation email to coach
      await emailService.sendRegistrationConfirmation({
        email: fullRegistration.coach.email,
        athleteName: fullRegistration.athlete.full_name,
        tournamentName: fullRegistration.tournament.name,
        tournamentDate: fullRegistration.tournament.tournament_date,
        location: fullRegistration.tournament.location,
        division: `${fullRegistration.athlete.age_group} - ${fullRegistration.athlete.belt_rank} - ${fullRegistration.athlete.weight_class}`,
        entryFee: fullRegistration.tournament.entry_fee,
      });

      // Notify organizer of new registration
      const { data: organizer } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', fullRegistration.tournament.organizer_id)
        .single();

      if (organizer) {
        await emailService.sendTournamentNotification({
          email: organizer.email,
          name: organizer.full_name,
          tournamentName: fullRegistration.tournament.name,
          message: `New registration received from ${fullRegistration.coach.full_name} for athlete ${fullRegistration.athlete.full_name}.`,
          type: 'updated',
          tournamentDate: fullRegistration.tournament.tournament_date,
          location: fullRegistration.tournament.location,
        });
      }

    } catch (error) {
      console.error('Error sending registration confirmation:', error);
    }
  };

  const handleRegistrationUpdated = async (newRegistration: RegistrationData, oldRegistration: RegistrationData) => {
    try {
      // Check if status changed
      if (oldRegistration.status !== newRegistration.status) {
        await notifyRegistrationStatusChange(newRegistration);
      }
    } catch (error) {
      console.error('Error sending registration update notification:', error);
    }
  };

  const notifyRegistrationStatusChange = async (registration: RegistrationData) => {
    try {
      // Get registration details with related data
      const { data: fullRegistration } = await supabase
        .from('tournament_registrations')
        .select(`
          *,
          tournament:tournaments(*),
          athlete:athletes(*),
          coach:profiles(*)
        `)
        .eq('id', registration.id)
        .single();

      if (!fullRegistration || !fullRegistration.tournament || !fullRegistration.athlete || !fullRegistration.coach) {
        return;
      }

      let message = '';
      let type: 'created' | 'updated' | 'cancelled' | 'reminder' = 'updated';

      switch (registration.status) {
        case 'approved':
          message = `Great news! The registration for ${fullRegistration.athlete.full_name} has been approved for "${fullRegistration.tournament.name}".`;
          break;
        case 'rejected':
          message = `Unfortunately, the registration for ${fullRegistration.athlete.full_name} has been rejected for "${fullRegistration.tournament.name}". Please contact the organizer for more information.`;
          type = 'cancelled';
          break;
        default:
          message = `The registration status for ${fullRegistration.athlete.full_name} in "${fullRegistration.tournament.name}" has been updated to ${registration.status}.`;
      }

      // Send status update email to coach
      await emailService.sendTournamentNotification({
        email: fullRegistration.coach.email,
        name: fullRegistration.coach.full_name,
        tournamentName: fullRegistration.tournament.name,
        message: message,
        type: type,
        tournamentDate: fullRegistration.tournament.tournament_date,
        location: fullRegistration.tournament.location,
      });

    } catch (error) {
      console.error('Error sending registration status notification:', error);
    }
  };

  return {
    // Expose any manual notification functions if needed
  };
}
