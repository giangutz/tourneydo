/* eslint-disable  @typescript-eslint/no-explicit-any */
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Trophy, 
  Users, 
  Calendar, 
  FileText,
  Download,
  UserCheck,
  Shuffle,
  Edit,
  MapPin,
  DollarSign,
  Clock
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Link from "next/link";

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

interface TournamentOverviewProps {
  tournament: Tournament;
  userProfile: UserProfile;
  registrations: any[];
  divisions: any[];
  loading: boolean;
}

export function TournamentOverview({ tournament, userProfile, registrations, divisions, loading }: TournamentOverviewProps) {
  const canManage = userProfile.role === "organizer" && tournament.organizer_id === userProfile.id;

  // Calculate statistics
  const stats = {
    totalRegistrations: registrations.length,
    paidRegistrations: registrations.filter(r => r.payment_status === "paid").length,
    checkedInAthletes: registrations.filter(r => r.checked_in).length,
    weighedInAthletes: registrations.filter(r => r.weighed_in).length,
    totalRevenue: registrations.filter(r => r.payment_status === "paid").length * tournament.entry_fee,
    daysUntilEvent: Math.ceil((new Date(tournament.tournament_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
  };

  // Chart data
  const registrationsByGender = registrations.reduce((acc, reg) => {
    const gender = reg.athlete?.gender || 'Unknown';
    acc[gender] = (acc[gender] || 0) + 1;
    return acc;
  }, {});

  const genderChartData = Object.entries(registrationsByGender).map(([gender, count]) => ({
    name: gender.charAt(0).toUpperCase() + gender.slice(1),
    value: count as number
  }));

  const registrationsByBelt = registrations.reduce((acc, reg) => {
    const belt = reg.athlete?.belt_rank?.replace('_', ' ') || 'Unknown';
    acc[belt] = (acc[belt] || 0) + 1;
    return acc;
  }, {});

  const beltChartData = Object.entries(registrationsByBelt).map(([belt, count]) => ({
    name: belt.charAt(0).toUpperCase() + belt.slice(1),
    count: count as number
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft": return "bg-gray-500";
      case "registration_open": return "bg-green-500";
      case "registration_closed": return "bg-yellow-500";
      case "weigh_in": return "bg-blue-500";
      case "in_progress": return "bg-purple-500";
      case "completed": return "bg-gray-700";
      default: return "bg-gray-500";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading tournament overview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Registrations</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRegistrations}</div>
            <p className="text-xs text-muted-foreground">
              {tournament.max_participants ? `of ${tournament.max_participants} max` : "No limit"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              {stats.paidRegistrations} paid registrations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Check-in Progress</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.checkedInAthletes}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalRegistrations > 0 ? Math.round((stats.checkedInAthletes / stats.totalRegistrations) * 100) : 0}% checked in
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Days Until Event</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.daysUntilEvent}</div>
            <p className="text-xs text-muted-foreground">
              {stats.daysUntilEvent > 0 ? "Days remaining" : "Event started"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Registration by Gender</CardTitle>
            <CardDescription>Distribution of participants by gender</CardDescription>
          </CardHeader>
          <CardContent>
            {genderChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={genderChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {genderChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No registration data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Registration by Belt Rank</CardTitle>
            <CardDescription>Participants grouped by belt level</CardDescription>
          </CardHeader>
          <CardContent>
            {beltChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={beltChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No registration data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tournament Details and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Tournament Information</CardTitle>
            <CardDescription>Event details and timeline</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="font-medium">Tournament Date</div>
                  <div className="text-sm text-muted-foreground">{formatDate(tournament.tournament_date)}</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="font-medium">Location</div>
                  <div className="text-sm text-muted-foreground">{tournament.location}</div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="font-medium">Registration Deadline</div>
                  <div className="text-sm text-muted-foreground">{formatDate(tournament.registration_deadline)}</div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <UserCheck className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="font-medium">Weigh-in Date</div>
                  <div className="text-sm text-muted-foreground">{formatDate(tournament.weigh_in_date)}</div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="font-medium">Organizer</div>
                  <div className="text-sm text-muted-foreground">{tournament.organizer.full_name}</div>
                </div>
              </div>
            </div>

            {tournament.description && (
              <div className="pt-4 border-t">
                <div className="font-medium mb-2">Description</div>
                <p className="text-sm text-muted-foreground">{tournament.description}</p>
              </div>
            )}

            {tournament.rules && (
              <div className="pt-4 border-t">
                <div className="font-medium mb-2">Rules & Regulations</div>
                <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
                  {tournament.rules}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Manage your tournament efficiently</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col space-y-3">
            {canManage ? (
              <>
                <Link href={`/dashboard/tournaments/${tournament.id}/edit`}>
                  <Button className="w-full justify-start" variant="outline">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Tournament Details
                  </Button>
                </Link>
                
                <Link href={`/dashboard/tournaments/${tournament.id}/generate-divisions`}>
                  <Button className="w-full justify-start" variant="outline">
                    <Shuffle className="h-4 w-4 mr-2" />
                    Generate Divisions
                  </Button>
                </Link>
                
                <Link href={`/dashboard/tournaments/${tournament.id}/create-brackets`}>
                  <Button className="w-full justify-start" variant="outline">
                    <Trophy className="h-4 w-4 mr-2" />
                    Create Brackets
                  </Button>
                </Link>
                
                <Link href={`/dashboard/tournaments/${tournament.id}/export-registration-report`}>
                  <Button className="w-full justify-start" variant="outline">
                    <FileText className="h-4 w-4 mr-2" />
                    Export Registration Report
                  </Button>
                </Link>
                
                <Link href={`/dashboard/tournaments/${tournament.id}/export-results`}>
                  <Button className="w-full justify-start" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export Results
                  </Button>
                </Link>
                </>
            ) : (
              <>
                <Button className="w-full justify-start" variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  View Tournament Details
                </Button>
                
                <Button className="w-full justify-start" variant="outline">
                  <Trophy className="h-4 w-4 mr-2" />
                  View Brackets
                </Button>
                
                <Button className="w-full justify-start" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download Schedule
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status and Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Tournament Status & Progress</CardTitle>
          <CardDescription>Current status and completion progress</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Current Status:</span>
              <Badge className={`${getStatusColor(tournament.status)} text-white`}>
                {tournament.status.replace("_", " ").toUpperCase()}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              Last updated: {formatDate(tournament.updated_at || tournament.created_at)}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Registration Progress</span>
              <span className="text-sm font-medium">
                {stats.totalRegistrations} / {tournament.max_participants || "∞"}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm">Payment Collection</span>
              <span className="text-sm font-medium">
                {stats.paidRegistrations} / {stats.totalRegistrations} ({stats.totalRegistrations > 0 ? Math.round((stats.paidRegistrations / stats.totalRegistrations) * 100) : 0}%)
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm">Check-in Progress</span>
              <span className="text-sm font-medium">
                {stats.checkedInAthletes} / {stats.totalRegistrations} ({stats.totalRegistrations > 0 ? Math.round((stats.checkedInAthletes / stats.totalRegistrations) * 100) : 0}%)
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm">Divisions Created</span>
              <span className="text-sm font-medium">{divisions.length} divisions</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
