"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Search, 
  MoreHorizontal, 
  UserCheck, 
  Scale, 
  CreditCard, 
  Download,
  Users,
  CheckCircle,
  Clock,
  Edit
} from "lucide-react";
import { WeighInModal, CheckInModal, PaymentUpdateModal } from "./registration-modals";
import { TeamPaymentModal } from "./team-payment-modal";
import { PaymentApprovalModal } from "./payment-approval-modal";
import { ParticipantEditModal } from "./participant-edit-modal";

interface Tournament {
  id: string;
  name: string;
  organizer_id: string;
  entry_fee: number;
  payment_methods?: string[];
}

interface UserProfile {
  id: string;
  role: string;
}
interface Registration {
  id: string;
  athlete: {
    id: string;
    full_name: string;
    email?: string;
    gender: string;
    age: number;
    date_of_birth: string;
    belt_rank: string;
    weight: number;
    height: number;
  };
  team: {
    id: string;
    name: string;
    coach_id: string;
  };
  registration_date: string;
  payment_status: string;
  checked_in: boolean;
  weighed_in: boolean;
  weight_recorded?: number;
  height_recorded?: number;
  notes?: string;
}

interface RegistrationsTableProps {
  tournament: Tournament;
  userProfile: UserProfile;
  registrations: Registration[];
  onRegistrationsUpdate: () => void;
  loading: boolean;
}

export function RegistrationsTable({ 
  tournament, 
  userProfile, 
  registrations, 
  onRegistrationsUpdate, 
  loading 
}: RegistrationsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGender, setFilterGender] = useState("all");
  const [filterPayment, setFilterPayment] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("registration_date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  
  // Modal states
  const [weighInModal, setWeighInModal] = useState<Registration | null>(null);
  const [checkInModal, setCheckInModal] = useState<Registration | null>(null);
  const [paymentModal, setPaymentModal] = useState<Registration | null>(null);
  const [editModal, setEditModal] = useState<Registration | null>(null);
  const [teamPaymentModal, setTeamPaymentModal] = useState<{teamName: string, coachId: string} | null>(null);
  const [paymentApprovalModal, setPaymentApprovalModal] = useState(false);

  const canManage = userProfile.role === "organizer" && tournament.organizer_id === userProfile.id;
  const isCoach = userProfile.role === "coach";

  // Calculate age from date of birth
  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return 0;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  // Filter and sort registrations
  const filteredRegistrations = useMemo(() => {
    const filtered = registrations.filter(reg => {
      const matchesSearch = 
        reg.athlete.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.team.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesGender = filterGender === "all" || reg.athlete.gender === filterGender;
      const matchesPayment = filterPayment === "all" || reg.payment_status === filterPayment;
      
      let matchesStatus = true;
      if (filterStatus === "checked_in") matchesStatus = reg.checked_in;
      else if (filterStatus === "weighed_in") matchesStatus = reg.weighed_in;
      else if (filterStatus === "pending") matchesStatus = !reg.checked_in && !reg.weighed_in;

      return matchesSearch && matchesGender && matchesPayment && matchesStatus;
    });

    // Sort registrations
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case "name":
          aValue = a.athlete.full_name;
          bValue = b.athlete.full_name;
          break;
        case "team":
          aValue = a.team.name;
          bValue = b.team.name;
          break;
        case "age":
          aValue = a.athlete.age;
          bValue = b.athlete.age;
          break;
        case "weight":
          aValue = a.athlete.weight;
          bValue = b.athlete.weight;
          break;
        case "registration_date":
        default:
          aValue = new Date(a.registration_date);
          bValue = new Date(b.registration_date);
          break;
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [registrations, searchTerm, filterGender, filterPayment, filterStatus, sortBy, sortOrder]);

  // Get unique teams for coach payment options
  const coachTeams = useMemo(() => {
    const teams = new Map();
    registrations.forEach(reg => {
      if (reg.team && reg.team.coach_id) {
        const key = `${reg.team.coach_id}-${reg.team.name}`;
        if (!teams.has(key)) {
          teams.set(key, {
            coachId: reg.team.coach_id,
            teamName: reg.team.name,
            count: 0
          });
        }
        teams.get(key).count++;
      }
    });
    return Array.from(teams.values());
  }, [registrations]);

  const exportRegistrations = () => {
    // Create CSV content
    const headers = [
      "Name", "Team", "Gender", "Age", "Belt Rank", "Weight", "Height",
      "Registration Date", "Payment Status", "Checked In", "Weighed In", "Recorded Weight"
    ];
    
    const csvContent = [
      headers.join(","),
      ...filteredRegistrations.map(reg => [
        reg.athlete.full_name,
        reg.team.name,
        reg.athlete.gender,
        reg.athlete.age,
        reg.athlete.belt_rank.replace("_", " "),
        reg.athlete.weight,
        reg.athlete.height,
        new Date(reg.registration_date).toLocaleDateString(),
        reg.payment_status,
        reg.checked_in ? "Yes" : "No",
        reg.weighed_in ? "Yes" : "No",
        reg.weight_recorded || ""
      ].join(","))
    ].join("\n");

    // Download CSV
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tournament.name}-registrations.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-500 text-white">Paid</Badge>;
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getBeltColor = (beltRank: string) => {
    const colors: Record<string, string> = {
      white: "bg-gray-100 text-gray-800",
      yellow: "bg-yellow-100 text-yellow-800",
      orange: "bg-orange-100 text-orange-800",
      green: "bg-green-100 text-green-800",
      blue: "bg-blue-100 text-blue-800",
      brown: "bg-amber-100 text-amber-800",
      black_1: "bg-gray-900 text-white",
      black_2: "bg-gray-900 text-white",
      black_3: "bg-gray-900 text-white",
    };
    
    return colors[beltRank] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading registrations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Total Registrations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{registrations.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <CreditCard className="h-4 w-4 mr-2" />
              Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {registrations.filter(r => r.payment_status === "paid").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <UserCheck className="h-4 w-4 mr-2" />
              Checked In
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {registrations.filter(r => r.checked_in).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Scale className="h-4 w-4 mr-2" />
              Weighed In
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {registrations.filter(r => r.weighed_in).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div>
              <CardTitle>Participant Registrations</CardTitle>
              <CardDescription>
                Manage athlete registrations, payments, and check-ins
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              {canManage && (
                <Button 
                  onClick={() => setPaymentApprovalModal(true)} 
                  variant="outline" 
                  size="sm"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Approve Payments
                </Button>
              )}
              {isCoach && coachTeams.length > 0 && (
                <Button 
                  onClick={() => setTeamPaymentModal(coachTeams[0])} 
                  size="sm"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pay for Team
                </Button>
              )}
              <Button onClick={exportRegistrations} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by athlete name or team..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={filterGender} onValueChange={setFilterGender}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genders</SelectItem>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterPayment} onValueChange={setFilterPayment}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="checked_in">Checked In</SelectItem>
                <SelectItem value="weighed_in">Weighed In</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Registrations Table */}
          {filteredRegistrations.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {registrations.length === 0 ? "No registrations yet" : "No matches found"}
              </h3>
              <p className="text-muted-foreground">
                {registrations.length === 0 
                  ? "Athletes will appear here once they register for the tournament"
                  : "Try adjusting your search or filter criteria"
                }
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer" onClick={() => {
                      setSortBy("name");
                      setSortOrder(sortBy === "name" && sortOrder === "asc" ? "desc" : "asc");
                    }}>
                      Athlete
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => {
                      setSortBy("team");
                      setSortOrder(sortBy === "team" && sortOrder === "asc" ? "desc" : "asc");
                    }}>
                      Team
                    </TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRegistrations.map((registration) => (
                    <TableRow key={registration.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{registration.athlete.full_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {registration.athlete.gender} • {calculateAge(registration.athlete.date_of_birth)} years old
                          </div>
                          {registration.athlete.email && (
                            <div className="text-xs text-muted-foreground">
                              {registration.athlete.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="font-medium">{registration.team.name}</div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          <Badge className={getBeltColor(registration.athlete.belt_rank)} variant="secondary">
                            {registration.athlete.belt_rank.replace("_", " ").toUpperCase()}
                          </Badge>
                          <div className="text-sm text-muted-foreground space-y-1">
                            {/* Registration measurements */}
                            <div>
                              {registration.athlete.weight && `${registration.athlete.weight}kg`}
                              {registration.athlete.weight && registration.athlete.height && " • "}
                              {registration.athlete.height && `${registration.athlete.height}cm`}
                            </div>
                            {/* Official measurements if different */}
                            {(registration.weight_recorded || registration.height_recorded) && (
                              <div className="text-xs text-blue-600">
                                Official: {registration.weight_recorded && `${registration.weight_recorded}kg`}
                                {registration.weight_recorded && registration.height_recorded && " • "}
                                {registration.height_recorded && `${registration.height_recorded}cm`}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        {getPaymentBadge(registration.payment_status)}
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex space-x-1">
                          {registration.checked_in ? (
                            <Badge variant="default" className="text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Checked In
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                          
                          {registration.weighed_in && (
                            <Badge variant="secondary" className="text-xs">
                              <Scale className="h-3 w-3 mr-1" />
                              {registration.weight_recorded}kg
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell className="text-right">
                        {canManage && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              
                              <DropdownMenuItem
                                onClick={() => setEditModal(registration)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Details
                              </DropdownMenuItem>
                              
                              {!registration.checked_in && (
                                <DropdownMenuItem
                                  onClick={() => setCheckInModal(registration)}
                                >
                                  <UserCheck className="h-4 w-4 mr-2" />
                                  Check In
                                </DropdownMenuItem>
                              )}
                              
                              {registration.checked_in && !registration.weighed_in && (
                                <DropdownMenuItem
                                  onClick={() => setWeighInModal(registration)}
                                >
                                  <Scale className="h-4 w-4 mr-2" />
                                  Record Weight
                                </DropdownMenuItem>
                              )}
                              
                              <DropdownMenuItem
                                onClick={() => setPaymentModal(registration)}
                              >
                                <CreditCard className="h-4 w-4 mr-2" />
                                Update Payment
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <WeighInModal
        registration={weighInModal}
        isOpen={!!weighInModal}
        onClose={() => setWeighInModal(null)}
        onUpdate={onRegistrationsUpdate}
      />

      <CheckInModal
        registration={checkInModal}
        isOpen={!!checkInModal}
        onClose={() => setCheckInModal(null)}
        onUpdate={onRegistrationsUpdate}
      />

      <PaymentUpdateModal
        registration={paymentModal}
        isOpen={!!paymentModal}
        onClose={() => setPaymentModal(null)}
        onUpdate={onRegistrationsUpdate}
      />

      <ParticipantEditModal
        registration={editModal}
        isOpen={!!editModal}
        onClose={() => setEditModal(null)}
        onUpdate={onRegistrationsUpdate}
      />

      {teamPaymentModal && (
        <TeamPaymentModal
          tournament={tournament}
          coachId={teamPaymentModal.coachId}
          teamName={teamPaymentModal.teamName}
          isOpen={!!teamPaymentModal}
          onClose={() => setTeamPaymentModal(null)}
          onUpdate={onRegistrationsUpdate}
        />
      )}

      <PaymentApprovalModal
        tournamentId={tournament.id}
        isOpen={paymentApprovalModal}
        onClose={() => setPaymentApprovalModal(false)}
        onUpdate={onRegistrationsUpdate}
      />
    </div>
  );
}
