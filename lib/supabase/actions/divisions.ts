import { createClient } from '@/lib/supabase/client';
import type { Division, DivisionParticipant } from '@/lib/types/database';

const supabase = createClient();

export const divisionQueries = {
  // Get divisions by tournament
  getByTournament: async (tournamentId: string): Promise<Division[]> => {
    const { data, error } = await supabase
      .from('divisions')
      .select(`
        *,
        tournament:tournaments(
          id,
          name,
          status
        ),
        participants:division_participants(
          id,
          seed_number,
          athlete:athletes(
            id,
            full_name,
            gender,
            belt_rank,
            weight,
            height,
            date_of_birth
          ),
          registration:tournament_registrations(
            id,
            weight_recorded,
            height_recorded
          )
        )
      `)
      .eq('tournament_id', tournamentId)
      .eq('is_active', true)
      .order('category')
      .order('gender')
      .order('name');

    if (error) {
      console.error('Error fetching divisions by tournament:', error);
      return [];
    }

    return data || [];
  },

  // Get division by ID
  getById: async (id: string): Promise<Division | null> => {
    const { data, error } = await supabase
      .from('divisions')
      .select(`
        *,
        tournament:tournaments(
          id,
          name,
          status,
          organizer:profiles!tournaments_organizer_id_fkey(
            id,
            full_name,
            email
          )
        ),
        participants:division_participants(
          id,
          seed_number,
          assigned_at,
          athlete:athletes(
            id,
            full_name,
            gender,
            belt_rank,
            weight,
            height,
            date_of_birth,
            team:teams(
              id,
              name,
              organization
            )
          ),
          registration:tournament_registrations(
            id,
            weight_recorded,
            height_recorded,
            checked_in,
            weighed_in
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching division by ID:', error);
      return null;
    }

    return data;
  },

  // Create division
  create: async (divisionData: Omit<Division, 'id' | 'created_at' | 'updated_at'>): Promise<Division | null> => {
    const { data, error } = await supabase
      .from('divisions')
      .insert(divisionData)
      .select(`
        *,
        tournament:tournaments(
          id,
          name,
          status
        )
      `)
      .single();

    if (error) {
      console.error('Error creating division:', error);
      return null;
    }

    return data;
  },

  // Bulk create divisions
  createBulk: async (divisionsData: Omit<Division, 'id' | 'created_at' | 'updated_at'>[]): Promise<Division[]> => {
    const { data, error } = await supabase
      .from('divisions')
      .insert(divisionsData)
      .select(`
        *,
        tournament:tournaments(
          id,
          name,
          status
        )
      `);

    if (error) {
      console.error('Error creating bulk divisions:', error);
      return [];
    }

    return data || [];
  },

  // Update division
  update: async (id: string, updates: Partial<Division>): Promise<Division | null> => {
    const { data, error } = await supabase
      .from('divisions')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        tournament:tournaments(
          id,
          name,
          status
        )
      `)
      .single();

    if (error) {
      console.error('Error updating division:', error);
      return null;
    }

    return data;
  },

  // Get divisions by category
  getByCategory: async (tournamentId: string, category: string): Promise<Division[]> => {
    const { data, error } = await supabase
      .from('divisions')
      .select(`
        *,
        tournament:tournaments(
          id,
          name,
          status
        ),
        participants:division_participants(
          id,
          athlete:athletes(
            id,
            full_name,
            gender,
            belt_rank
          )
        )
      `)
      .eq('tournament_id', tournamentId)
      .eq('category', category)
      .eq('is_active', true)
      .order('gender')
      .order('name');

    if (error) {
      console.error('Error fetching divisions by category:', error);
      return [];
    }

    return data || [];
  },

  // Add participant to division
  addParticipant: async (divisionId: string, athleteId: string, registrationId: string, seedNumber?: number): Promise<DivisionParticipant | null> => {
    const { data, error } = await supabase
      .from('division_participants')
      .insert({
        division_id: divisionId,
        athlete_id: athleteId,
        registration_id: registrationId,
        seed_number: seedNumber
      })
      .select(`
        *,
        division:divisions(
          id,
          name,
          category
        ),
        athlete:athletes(
          id,
          full_name,
          gender,
          belt_rank
        ),
        registration:tournament_registrations(
          id,
          weight_recorded,
          height_recorded
        )
      `)
      .single();

    if (error) {
      console.error('Error adding participant to division:', error);
      return null;
    }

    return data;
  },

  // Remove participant from division
  removeParticipant: async (divisionId: string, athleteId: string): Promise<boolean> => {
    const { error } = await supabase
      .from('division_participants')
      .delete()
      .eq('division_id', divisionId)
      .eq('athlete_id', athleteId);

    if (error) {
      console.error('Error removing participant from division:', error);
      return false;
    }

    return true;
  },

  // Update participant seed
  updateParticipantSeed: async (participantId: string, seedNumber: number): Promise<boolean> => {
    const { error } = await supabase
      .from('division_participants')
      .update({ seed_number: seedNumber })
      .eq('id', participantId);

    if (error) {
      console.error('Error updating participant seed:', error);
      return false;
    }

    return true;
  },

  // Get eligible athletes for division (weighed in, not already assigned)
  getEligibleAthletes: async (tournamentId: string, category: string, gender: string, minAge: number, maxAge: number, minWeight?: number, maxWeight?: number, minHeight?: number, maxHeight?: number): Promise<any[]> => {
    // Calculate date range for age
    const minDate = new Date();
    minDate.setFullYear(minDate.getFullYear() - maxAge - 1);
    
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() - minAge);

    let query = supabase
      .from('tournament_registrations')
      .select(`
        id,
        weight_recorded,
        height_recorded,
        athlete:athletes(
          id,
          full_name,
          gender,
          belt_rank,
          weight,
          height,
          date_of_birth,
          team:teams(
            id,
            name
          )
        )
      `)
      .eq('tournament_id', tournamentId)
      .eq('weighed_in', true)
      .not('athlete_id', 'in', 
        supabase
          .from('division_participants')
          .select('athlete_id')
          .in('division_id', 
            supabase
              .from('divisions')
              .select('id')
              .eq('tournament_id', tournamentId)
          )
      );

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching eligible athletes:', error);
      return [];
    }

    // Filter by criteria
    return (data || []).filter(reg => {
      if (!reg.athlete) return false;

      // Gender check
      if (reg.athlete.gender !== gender) return false;

      // Age check
      const birthDate = new Date(reg.athlete.date_of_birth);
      if (birthDate < minDate || birthDate > maxDate) return false;

      // Weight check (use recorded weight if available, otherwise athlete weight)
      const weight = reg.weight_recorded || reg.athlete.weight;
      if (weight) {
        if (minWeight && weight <= minWeight) return false;
        if (maxWeight && weight > maxWeight) return false;
      }

      // Height check (use recorded height if available, otherwise athlete height)
      const height = reg.height_recorded || reg.athlete.height;
      if (height) {
        if (minHeight && height <= minHeight) return false;
        if (maxHeight && height > maxHeight) return false;
      }

      return true;
    });
  },

  // Generate divisions automatically
  generateDivisions: async (tournamentId: string): Promise<Division[]> => {
    // Clear existing divisions
    await supabase
      .from('divisions')
      .delete()
      .eq('tournament_id', tournamentId);

    // Get all weighed-in registrations
    const { data: registrations, error } = await supabase
      .from('tournament_registrations')
      .select(`
        id,
        weight_recorded,
        height_recorded,
        athlete:athletes(
          id,
          full_name,
          gender,
          belt_rank,
          weight,
          height,
          date_of_birth
        )
      `)
      .eq('tournament_id', tournamentId)
      .eq('weighed_in', true);

    if (error || !registrations) {
      console.error('Error fetching registrations for division generation:', error);
      return [];
    }

    const newDivisions: Omit<Division, 'id' | 'created_at' | 'updated_at'>[] = [];

    // Group by age categories
    const categories = {
      gradeschool: registrations.filter(r => {
        const age = calculateAge(r.athlete!.date_of_birth);
        return age >= 5 && age <= 11;
      }),
      cadet: registrations.filter(r => {
        const age = calculateAge(r.athlete!.date_of_birth);
        return age >= 12 && age <= 14;
      }),
      junior: registrations.filter(r => {
        const age = calculateAge(r.athlete!.date_of_birth);
        return age >= 15 && age <= 17;
      }),
      senior: registrations.filter(r => {
        const age = calculateAge(r.athlete!.date_of_birth);
        return age >= 18;
      })
    };

    // Generate divisions for each category
    for (const [categoryName, categoryRegistrations] of Object.entries(categories)) {
      if (categoryRegistrations.length === 0) continue;

      // Group by gender
      const maleRegistrations = categoryRegistrations.filter(r => r.athlete!.gender === 'male');
      const femaleRegistrations = categoryRegistrations.filter(r => r.athlete!.gender === 'female');

      for (const [gender, genderRegistrations] of [['male', maleRegistrations], ['female', femaleRegistrations]]) {
        if (genderRegistrations.length === 0) continue;

        if (categoryName === 'gradeschool') {
          // Height-based divisions for gradeschool
          const heightGroups = [
            { name: 'Group 0', min: 0, max: 120 },
            { name: 'Group 1', min: 120, max: 128 },
            { name: 'Group 2', min: 128, max: 136 },
            { name: 'Group 3', min: 136, max: 144 },
            { name: 'Group 4', min: 144, max: 152 },
            { name: 'Group 5', min: 152, max: 160 },
            { name: 'Group 6', min: 160, max: 168 }
          ];

          for (const group of heightGroups) {
            const groupParticipants = genderRegistrations.filter(r => {
              const height = r.height_recorded || r.athlete!.height;
              if (!height) return false;
              return group.min === 0 ? height <= group.max : height > group.min && height <= group.max;
            });

            if (groupParticipants.length > 0) {
              newDivisions.push({
                tournament_id: tournamentId,
                name: `Gradeschool ${gender.charAt(0).toUpperCase() + gender.slice(1)} ${group.name}`,
                category: 'gradeschool',
                gender: gender as 'male' | 'female',
                min_age: 5,
                max_age: 11,
                min_height: group.min === 0 ? undefined : group.min,
                max_height: group.max,
                participant_count: groupParticipants.length
              });
            }
          }
        } else {
          // Weight-based divisions for other categories
          const weightRanges = getWeightRanges(categoryName, gender as 'male' | 'female');
          
          for (let i = 0; i < weightRanges.length; i++) {
            const weightLimit = weightRanges[i];
            let divisionParticipants;
            let divisionName;

            if (weightLimit > 0) {
              // Plus category
              divisionParticipants = genderRegistrations.filter(r => {
                const weight = r.weight_recorded || r.athlete!.weight;
                return weight && weight > weightLimit;
              });
              divisionName = `${categoryName.charAt(0).toUpperCase() + categoryName.slice(1)} ${gender.charAt(0).toUpperCase() + gender.slice(1)} +${weightLimit}kg`;
            } else {
              // Weight limit category
              const prevLimit = i > 0 ? Math.abs(weightRanges[i - 1]) : 0;
              const currentLimit = Math.abs(weightLimit);
              
              divisionParticipants = genderRegistrations.filter(r => {
                const weight = r.weight_recorded || r.athlete!.weight;
                return weight && weight > prevLimit && weight <= currentLimit;
              });
              divisionName = `${categoryName.charAt(0).toUpperCase() + categoryName.slice(1)} ${gender.charAt(0).toUpperCase() + gender.slice(1)} ${weightLimit}kg`;
            }

            if (divisionParticipants.length > 0) {
              const ageRanges = getAgeRange(categoryName);
              newDivisions.push({
                tournament_id: tournamentId,
                name: divisionName,
                category: categoryName,
                gender: gender as 'male' | 'female',
                min_age: ageRanges.min,
                max_age: ageRanges.max,
                min_weight: weightLimit > 0 ? weightLimit : (i > 0 ? Math.abs(weightRanges[i - 1]) : undefined),
                max_weight: weightLimit > 0 ? undefined : Math.abs(weightLimit),
                participant_count: divisionParticipants.length
              });
            }
          }
        }
      }
    }

    // Insert new divisions
    if (newDivisions.length > 0) {
      const { data: createdDivisions, error: insertError } = await supabase
        .from('divisions')
        .insert(newDivisions)
        .select();

      if (insertError) {
        console.error('Error inserting divisions:', insertError);
        return [];
      }

      return createdDivisions || [];
    }

    return [];
  },

  // Delete division
  delete: async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('divisions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting division:', error);
      return false;
    }

    return true;
  },

  // Deactivate division
  deactivate: async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('divisions')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      console.error('Error deactivating division:', error);
      return false;
    }

    return true;
  }
};

// Helper functions
function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

function getWeightRanges(category: string, gender: 'male' | 'female'): number[] {
  const ranges = {
    cadet: {
      male: [-33, -37, -41, -45, -49, -53, -57, -61, 61],
      female: [-29, -33, -37, -41, -44, -47, -51, -55, 55]
    },
    junior: {
      male: [-45, -48, -51, -55, -59, -63, -68, -73, -78, 78],
      female: [-42, -44, -46, -49, -52, -55, -59, -63, -68, 68]
    },
    senior: {
      male: [-54, -58, -63, -68, -74, -80, -87, 87],
      female: [-46, -49, -53, -57, -62, -67, -73, 73]
    }
  };

  return ranges[category as keyof typeof ranges]?.[gender] || [];
}

function getAgeRange(category: string): { min: number; max: number } {
  const ranges = {
    gradeschool: { min: 5, max: 11 },
    cadet: { min: 12, max: 14 },
    junior: { min: 15, max: 17 },
    senior: { min: 18, max: 100 }
  };

  return ranges[category as keyof typeof ranges] || { min: 5, max: 100 };
}
