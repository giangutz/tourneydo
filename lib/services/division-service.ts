import { createClient } from "@/lib/supabase/client";
import { 
  Athlete, 
  Division, 
  TournamentRegistration, 
  BeltRank, 
  Gender,
  calculateAge,
  BELT_RANK_ORDER 
} from "@/lib/types/database";

export interface DivisionCriteria {
  minAge: number;
  maxAge: number;
  minWeight?: number;
  maxWeight?: number;
  beltRankMin: BeltRank;
  beltRankMax: BeltRank;
  gender: Gender;
}

export interface AthleteWithRegistration extends Athlete {
  registration: TournamentRegistration;
  age: number;
}

export class DivisionService {
  private supabase = createClient();

  /**
   * Generate divisions automatically based on registered athletes
   */
  async generateDivisions(tournamentId: string): Promise<Division[]> {
    try {
      // Get all registered athletes for the tournament
      const { data: registrations, error: regError } = await this.supabase
        .from("tournament_registrations")
        .select(`
          *,
          athlete:athletes(*)
        `)
        .eq("tournament_id", tournamentId);

      if (regError) throw regError;
      if (!registrations || registrations.length === 0) {
        throw new Error("No athletes registered for this tournament");
      }

      // Process athletes and calculate ages
      const athletesWithData: AthleteWithRegistration[] = registrations
        .filter(reg => reg.athlete)
        .map(reg => ({
          ...reg.athlete,
          registration: reg,
          age: calculateAge(reg.athlete.date_of_birth),
        }));

      // Group athletes by gender first
      const maleAthletes = athletesWithData.filter(a => a.gender === "male");
      const femaleAthletes = athletesWithData.filter(a => a.gender === "female");

      const divisions: Division[] = [];

      // Generate divisions for each gender
      if (maleAthletes.length > 0) {
        const maleDivisions = await this.createDivisionsForGender(
          tournamentId,
          maleAthletes,
          "male"
        );
        divisions.push(...maleDivisions);
      }

      if (femaleAthletes.length > 0) {
        const femaleDivisions = await this.createDivisionsForGender(
          tournamentId,
          femaleAthletes,
          "female"
        );
        divisions.push(...femaleDivisions);
      }

      return divisions;
    } catch (error) {
      console.error("Error generating divisions:", error);
      throw error;
    }
  }

  /**
   * Create divisions for a specific gender
   */
  private async createDivisionsForGender(
    tournamentId: string,
    athletes: AthleteWithRegistration[],
    gender: Gender
  ): Promise<Division[]> {
    const divisions: Division[] = [];

    // Group by belt rank categories
    const beltGroups = this.groupByBeltRank(athletes);

    for (const [beltCategory, beltAthletes] of Object.entries(beltGroups)) {
      if (beltAthletes.length === 0) continue;

      // Further divide by age groups
      const ageGroups = this.groupByAge(beltAthletes);

      for (const [ageCategory, ageAthletes] of Object.entries(ageGroups)) {
        if (ageAthletes.length === 0) continue;

        // If we have enough athletes, divide by weight
        if (ageAthletes.length >= 8) {
          const weightGroups = this.groupByWeight(ageAthletes);
          
          for (const [weightCategory, weightAthletes] of Object.entries(weightGroups)) {
            if (weightAthletes.length >= 3) { // Minimum 3 athletes per division
              const division = await this.createDivision(
                tournamentId,
                weightAthletes,
                gender,
                `${gender.charAt(0).toUpperCase() + gender.slice(1)} ${beltCategory} ${ageCategory} ${weightCategory}`
              );
              divisions.push(division);
            }
          }
        } else {
          // Create division without weight categories
          const division = await this.createDivision(
            tournamentId,
            ageAthletes,
            gender,
            `${gender.charAt(0).toUpperCase() + gender.slice(1)} ${beltCategory} ${ageCategory}`
          );
          divisions.push(division);
        }
      }
    }

    return divisions;
  }

  /**
   * Group athletes by belt rank categories
   */
  private groupByBeltRank(athletes: AthleteWithRegistration[]): Record<string, AthleteWithRegistration[]> {
    const groups: Record<string, AthleteWithRegistration[]> = {
      "Color Belts": [],
      "Black Belts": [],
    };

    athletes.forEach(athlete => {
      if (athlete.belt_rank.startsWith("black_")) {
        groups["Black Belts"].push(athlete);
      } else {
        groups["Color Belts"].push(athlete);
      }
    });

    return groups;
  }

  /**
   * Group athletes by age categories
   */
  private groupByAge(athletes: AthleteWithRegistration[]): Record<string, AthleteWithRegistration[]> {
    const groups: Record<string, AthleteWithRegistration[]> = {
      "Tiny Tigers (4-6)": [],
      "Little Dragons (7-9)": [],
      "Cadets (10-12)": [],
      "Juniors (13-15)": [],
      "Youth (16-17)": [],
      "Adults (18-35)": [],
      "Masters (36+)": [],
    };

    athletes.forEach(athlete => {
      const age = athlete.age;
      
      if (age >= 4 && age <= 6) {
        groups["Tiny Tigers (4-6)"].push(athlete);
      } else if (age >= 7 && age <= 9) {
        groups["Little Dragons (7-9)"].push(athlete);
      } else if (age >= 10 && age <= 12) {
        groups["Cadets (10-12)"].push(athlete);
      } else if (age >= 13 && age <= 15) {
        groups["Juniors (13-15)"].push(athlete);
      } else if (age >= 16 && age <= 17) {
        groups["Youth (16-17)"].push(athlete);
      } else if (age >= 18 && age <= 35) {
        groups["Adults (18-35)"].push(athlete);
      } else if (age >= 36) {
        groups["Masters (36+)"].push(athlete);
      }
    });

    return groups;
  }

  /**
   * Group athletes by weight categories
   */
  private groupByWeight(athletes: AthleteWithRegistration[]): Record<string, AthleteWithRegistration[]> {
    // Filter out athletes without weight
    const athletesWithWeight = athletes.filter(a => a.actual_weight || a.weight_class);
    
    if (athletesWithWeight.length < athletes.length * 0.7) {
      // If less than 70% have weight data, don't divide by weight
      return { "All Weights": athletes };
    }

    // Sort by weight
    athletesWithWeight.sort((a, b) => {
      const weightA = a.actual_weight || a.weight_class || 0;
      const weightB = b.actual_weight || b.weight_class || 0;
      return weightA - weightB;
    });

    const groups: Record<string, AthleteWithRegistration[]> = {};
    const athletesPerGroup = Math.max(3, Math.floor(athletesWithWeight.length / 3));

    for (let i = 0; i < athletesWithWeight.length; i += athletesPerGroup) {
      const group = athletesWithWeight.slice(i, i + athletesPerGroup);
      if (group.length >= 3) {
        const minWeight = group[0].actual_weight || group[0].weight_class || 0;
        const maxWeight = group[group.length - 1].actual_weight || group[group.length - 1].weight_class || 0;
        groups[`${minWeight.toFixed(1)}-${maxWeight.toFixed(1)}kg`] = group;
      } else if (i > 0) {
        // Add remaining athletes to the last group
        const lastGroupKey = Object.keys(groups)[Object.keys(groups).length - 1];
        groups[lastGroupKey].push(...group);
      }
    }

    return groups;
  }

  /**
   * Create a division in the database
   */
  private async createDivision(
    tournamentId: string,
    athletes: AthleteWithRegistration[],
    gender: Gender,
    name: string
  ): Promise<Division> {
    // Calculate division parameters
    const ages = athletes.map(a => a.age);
    const minAge = Math.min(...ages);
    const maxAge = Math.max(...ages);

    const weights = athletes
      .map(a => a.actual_weight || a.weight_class)
      .filter(w => w !== undefined) as number[];
    
    const minWeight = weights.length > 0 ? Math.min(...weights) : undefined;
    const maxWeight = weights.length > 0 ? Math.max(...weights) : undefined;

    const beltRanks = athletes.map(a => a.belt_rank);
    const beltRankNumbers = beltRanks.map(rank => BELT_RANK_ORDER[rank]);
    const minBeltRankNumber = Math.min(...beltRankNumbers);
    const maxBeltRankNumber = Math.max(...beltRankNumbers);

    const beltRankMin = Object.keys(BELT_RANK_ORDER).find(
      rank => BELT_RANK_ORDER[rank as BeltRank] === minBeltRankNumber
    ) as BeltRank;
    
    const beltRankMax = Object.keys(BELT_RANK_ORDER).find(
      rank => BELT_RANK_ORDER[rank as BeltRank] === maxBeltRankNumber
    ) as BeltRank;

    // Create division
    const { data: division, error } = await this.supabase
      .from("divisions")
      .insert({
        tournament_id: tournamentId,
        name,
        gender,
        min_age: minAge,
        max_age: maxAge,
        min_weight: minWeight,
        max_weight: maxWeight,
        belt_rank_min: beltRankMin,
        belt_rank_max: beltRankMax,
        max_participants: 32, // Standard tournament bracket size
      })
      .select()
      .single();

    if (error) throw error;

    // Assign athletes to division
    const divisionParticipants = athletes.map((athlete, index) => ({
      division_id: division.id,
      athlete_id: athlete.id,
      registration_id: athlete.registration.id,
      seed_number: index + 1,
    }));

    const { error: participantsError } = await this.supabase
      .from("division_participants")
      .insert(divisionParticipants);

    if (participantsError) throw participantsError;

    return division;
  }

  /**
   * Get divisions for a tournament
   */
  async getDivisions(tournamentId: string): Promise<Division[]> {
    const { data: divisions, error } = await this.supabase
      .from("divisions")
      .select(`
        *,
        participants:division_participants(
          *,
          athlete:athletes(*),
          registration:tournament_registrations(*)
        )
      `)
      .eq("tournament_id", tournamentId)
      .order("name");

    if (error) throw error;
    return divisions || [];
  }

  /**
   * Delete all divisions for a tournament (for regeneration)
   */
  async deleteDivisions(tournamentId: string): Promise<void> {
    const { error } = await this.supabase
      .from("divisions")
      .delete()
      .eq("tournament_id", tournamentId);

    if (error) throw error;
  }
}
