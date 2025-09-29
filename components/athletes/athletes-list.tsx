"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Athlete, calculateAge } from "@/lib/types/database";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Users, 
  Plus, 
  Eye, 
  Edit, 
  Search,
  UserPlus,
  Award,
  Calendar,
  Weight
} from "lucide-react";
import Link from "next/link";

interface AthletesListProps {
  teamId: string;
}

export function AthletesList({ teamId }: AthletesListProps) {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [filteredAthletes, setFilteredAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const supabase = createClient();

  useEffect(() => {
    fetchAthletes();
  }, []);

  useEffect(() => {
    filterAthletes();
  }, [athletes, searchTerm]);

  const fetchAthletes = async () => {
    try {
      const { data, error } = await supabase
        .from("athletes")
        .select("*")
        .eq("team_id", teamId)
        .order("full_name");

      if (error) throw error;
      setAthletes(data || []);
    } catch (error) {
      console.error("Error fetching athletes:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterAthletes = () => {
    let filtered = athletes;

    if (searchTerm) {
      filtered = filtered.filter(athlete =>
        athlete.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        athlete.belt_rank.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredAthletes(filtered);
  };

  const getBeltColor = (beltRank: string) => {
    const colors: Record<string, string> = {
      white: "bg-gray-100 text-gray-800",
      yellow: "bg-yellow-100 text-yellow-800",
      orange: "bg-orange-100 text-orange-800",
      green: "bg-green-100 text-green-800",
      blue: "bg-blue-100 text-blue-800",
      brown: "bg-amber-100 text-amber-800",
      black_1: "bg-black text-white",
      black_2: "bg-black text-white",
      black_3: "bg-black text-white",
      black_4: "bg-black text-white",
      black_5: "bg-black text-white",
    };
    return colors[beltRank] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading athletes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search athletes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Link href="/dashboard/athletes/create">
          <Button>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Athlete
          </Button>
        </Link>
      </div>

      {/* Athletes Grid */}
      {filteredAthletes.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {athletes.length === 0 ? "No athletes yet" : "No athletes match your search"}
          </h3>
          <p className="text-muted-foreground mb-4">
            {athletes.length === 0 
              ? "Add your first athlete to get started"
              : "Try adjusting your search terms"}
          </p>
          {athletes.length === 0 && (
            <Link href="/dashboard/athletes/create">
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Athlete
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredAthletes.map((athlete) => (
            <Card key={athlete.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{athlete.full_name}</CardTitle>
                    <CardDescription className="flex items-center">
                      <Calendar className="mr-1 h-3 w-3" />
                      Age: {calculateAge(athlete.date_of_birth)}
                    </CardDescription>
                  </div>
                  <Badge className={getBeltColor(athlete.belt_rank)}>
                    {athlete.belt_rank.replace("_", " ").toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-muted-foreground">
                    <Users className="mr-2 h-4 w-4" />
                    {athlete.gender.charAt(0).toUpperCase() + athlete.gender.slice(1)}
                  </div>
                  
                  {athlete.weight_class && (
                    <div className="flex items-center text-muted-foreground">
                      <Weight className="mr-2 h-4 w-4" />
                      Weight: {athlete.weight_class}kg
                    </div>
                  )}

                  {athlete.height && (
                    <div className="flex items-center text-muted-foreground">
                      Height: {athlete.height}cm
                    </div>
                  )}

                  {athlete.emergency_contact_name && (
                    <div className="text-muted-foreground">
                      Emergency Contact: {athlete.emergency_contact_name}
                    </div>
                  )}
                </div>

                {athlete.medical_conditions && (
                  <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                    <strong>Medical Notes:</strong> {athlete.medical_conditions}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Link href={`/dashboard/athletes/${athlete.id}`} className="flex-1">
                    <Button variant="outline" className="w-full">
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </Button>
                  </Link>
                  
                  <Link href={`/dashboard/athletes/${athlete.id}/edit`} className="flex-1">
                    <Button variant="outline" className="w-full">
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {athletes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Team Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{athletes.length}</div>
                <div className="text-sm text-muted-foreground">Total Athletes</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {athletes.filter(a => a.gender === "male").length}
                </div>
                <div className="text-sm text-muted-foreground">Male</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {athletes.filter(a => a.gender === "female").length}
                </div>
                <div className="text-sm text-muted-foreground">Female</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {athletes.filter(a => a.belt_rank.startsWith("black_")).length}
                </div>
                <div className="text-sm text-muted-foreground">Black Belts</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
