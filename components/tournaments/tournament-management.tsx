"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TournamentOverview } from "./tournament-overview";
import { RegistrationsTable } from "./registrations-table";
import { DivisionManagement } from "./division-management";
import { BracketManagement } from "./bracket-management";

interface Tournament {
  id: string;
  name: string;
  description: string;
  location: string;
  tournament_date: string;
  registration_deadline: string;
  weigh_in_date: string;
  entry_fee: number;
  status: string;
  max_participants: number;
  rules: string;
  organizer_id: string;
  created_at: string;
  updated_at: string;
  organizer: {
    id: string;
    full_name: string;
    email: string;
  };
}

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

interface TournamentManagementProps {
  tournament: Tournament;
  userProfile: UserProfile;
}

export function TournamentManagement({ tournament, userProfile }: TournamentManagementProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [registrations, setRegistrations] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchTournamentData();
  }, [tournament.id]);

  const fetchTournamentData = async () => {
    setLoading(true);
    try {
      // Fetch registrations with athlete and team data
      const { data: registrationData, error: regError } = await supabase
        .from("tournament_registrations")
        .select(`
          *,
          athlete:athletes(*),
          team:teams(*)
        `)
        .eq("tournament_id", tournament.id);

      if (regError) throw regError;
      setRegistrations(registrationData || []);

      // Fetch divisions
      const { data: divisionData, error: divError } = await supabase
        .from("divisions")
        .select("*")
        .eq("tournament_id", tournament.id);

      if (divError) throw divError;
      setDivisions(divisionData || []);

    } catch (error) {
      console.error("Error fetching tournament data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tournament Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-lg">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">{tournament.name}</h1>
            <p className="text-blue-100 mb-4">{tournament.description}</p>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center">
                <span className="mr-1">📅</span>
                {new Date(tournament.tournament_date).toLocaleDateString()}
              </div>
              <div className="flex items-center">
                <span className="mr-1">📍</span>
                {tournament.location}
              </div>
              <div className="px-2 py-1 bg-white/20 rounded-full text-xs font-medium">
                {tournament.status.replace("_", " ").toUpperCase()}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">
              ₱{tournament.entry_fee.toLocaleString()}
            </div>
            <div className="text-blue-100">Entry Fee</div>
          </div>
        </div>
      </div>

      {/* Enhanced Management Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 h-12">
          <TabsTrigger value="overview" className="text-sm">
            📊 Overview
          </TabsTrigger>
          <TabsTrigger value="registrations" className="text-sm">
            👥 Registrations
          </TabsTrigger>
          <TabsTrigger value="divisions" className="text-sm">
            🏆 Divisions
          </TabsTrigger>
          <TabsTrigger value="brackets" className="text-sm">
            🥋 Brackets
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <TournamentOverview 
            tournament={tournament}
            userProfile={userProfile}
            registrations={registrations}
            divisions={divisions}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="registrations" className="space-y-6">
          <RegistrationsTable 
            tournament={tournament}
            userProfile={userProfile}
            registrations={registrations}
            onRegistrationsUpdate={fetchTournamentData}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="divisions" className="space-y-6">
          <DivisionManagement 
            tournament={tournament}
            userProfile={userProfile}
            registrations={registrations}
            divisions={divisions}
            onDivisionsUpdate={fetchTournamentData}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="brackets" className="space-y-6">
          <BracketManagement 
            tournament={tournament}
            userProfile={userProfile}
            divisions={divisions}
            onBracketsUpdate={fetchTournamentData}
            loading={loading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
