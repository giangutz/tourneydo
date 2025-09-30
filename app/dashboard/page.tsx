"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import {
  Trophy,
  Users,
  DollarSign,
  Calendar,
  TrendingUp,
  TrendingDown,
  Plus,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  Activity,
  Target,
  Award,
  BarChart3
} from "lucide-react";
import { createClerkSupabaseClient } from "@/lib/supabase";
import { useUser, useSession } from "@clerk/nextjs";
import type { Tournament, Registration } from "@/types/database";
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

interface DashboardStats {
  totalTournaments: number;
  activeTournaments: number;
  totalParticipants: number;
  totalRevenue: number;
  upcomingEvents: number;
  completedEvents: number;
  averageParticipants: number;
  growthRate: number;
}

interface ChartData {
  revenueData: Array<{ date: string; revenue: number; tournaments: number }>;
  participantData: Array<{ month: string; participants: number; registrations: number }>;
  statusData: Array<{ name: string; value: number; color: string }>;
  tournamentTrend: Array<{ date: string; count: number }>;
}

interface RecentActivity {
  id: string;
  type: 'registration' | 'tournament' | 'payment';
  title: string;
  description: string;
  timestamp: string;
  status?: 'success' | 'warning' | 'error';
}

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useUser();
  const { session } = useSession();
  const [mounted, setMounted] = useState(false);

  const [stats, setStats] = useState<DashboardStats>({
    totalTournaments: 0,
    activeTournaments: 0,
    totalParticipants: 0,
    totalRevenue: 0,
    upcomingEvents: 0,
    completedEvents: 0,
    averageParticipants: 0,
    growthRate: 0,
  });

  const [chartData, setChartData] = useState<ChartData>({
    revenueData: [],
    participantData: [],
    statusData: [],
    tournamentTrend: [],
  });

  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  // Ensure component only renders after mounting on client
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (user?.id) {
      fetchDashboardData();
    }
  }, [user?.id]);

  const fetchDashboardData = async () => {
    if (!user?.id || !session) return;

    try {
      const supabase = createClerkSupabaseClient(session);

      // Check if Supabase client is properly configured
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.error('Supabase environment variables are not configured');
        setLoading(false);
        return;
      }

      // Fetch tournaments
      const { data: tournaments } = await supabase
        .from('tournaments')
        .select('*')
        .eq('organizer_id', user.id)
        .order('created_at', { ascending: false });

      // Fetch registrations
      const { data: registrations } = await supabase
        .from('registrations')
        .select(`
          *,
          tournament:tournaments(title),
          athlete:athletes(first_name, last_name)
        `)
        .order('registration_date', { ascending: false })
        .limit(50);

      // Calculate basic stats
      const totalTournaments = tournaments?.length || 0;
      const activeTournaments = tournaments?.filter(t =>
        ['published', 'registration_open', 'in_progress'].includes(t.status)
      ).length || 0;
      const completedEvents = tournaments?.filter(t => t.status === 'completed').length || 0;
      const upcomingEvents = tournaments?.filter(t => {
        const startDate = new Date(t.start_date);
        const now = new Date();
        return startDate > now;
      }).length || 0;

      const totalParticipants = registrations?.length || 0;
      const totalRevenue = registrations?.reduce((sum, reg) =>
        reg.payment_status === 'paid' ? sum + (reg.payment_amount || 0) : sum, 0
      ) || 0;

      const averageParticipants = totalTournaments > 0 ? Math.round(totalParticipants / totalTournaments) : 0;

      // Calculate growth rate (comparing last 30 days to previous 30 days)
      const thirtyDaysAgo = subDays(new Date(), 30);
      const sixtyDaysAgo = subDays(new Date(), 60);

      const recentRegistrations = registrations?.filter(r =>
        new Date(r.registration_date) >= thirtyDaysAgo
      ).length || 0;

      const previousRegistrations = registrations?.filter(r => {
        const regDate = new Date(r.registration_date);
        return regDate >= sixtyDaysAgo && regDate < thirtyDaysAgo;
      }).length || 0;

      const growthRate = previousRegistrations > 0
        ? ((recentRegistrations - previousRegistrations) / previousRegistrations) * 100
        : recentRegistrations > 0 ? 100 : 0;

      setStats({
        totalTournaments,
        activeTournaments,
        totalParticipants,
        totalRevenue,
        upcomingEvents,
        completedEvents,
        averageParticipants,
        growthRate,
      });

      // Generate chart data
      generateChartData(tournaments || [], registrations || []);

      // Generate recent activities
      generateRecentActivities(registrations || [], tournaments || []);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateChartData = (tournaments: Tournament[], registrations: any[]) => {
    // Revenue data for last 30 days
    const revenueData = [];
    for (let i = 29; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayRegistrations = registrations.filter(r => {
        const regDate = new Date(r.registration_date);
        return regDate.toDateString() === date.toDateString() && r.payment_status === 'paid';
      });

      const revenue = dayRegistrations.reduce((sum, r) => sum + (r.payment_amount || 0), 0);
      const tournamentCount = tournaments.filter(t =>
        new Date(t.created_at).toDateString() === date.toDateString()
      ).length;

      revenueData.push({
        date: format(date, 'MMM dd'),
        revenue,
        tournaments: tournamentCount,
      });
    }

    // Monthly participant data for last 6 months
    const participantData = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subDays(new Date(), i * 30));
      const monthEnd = endOfMonth(monthStart);

      const monthRegistrations = registrations.filter(r => {
        const regDate = new Date(r.registration_date);
        return regDate >= monthStart && regDate <= monthEnd;
      });

      participantData.push({
        month: format(monthStart, 'MMM yyyy'),
        participants: monthRegistrations.length,
        registrations: monthRegistrations.length,
      });
    }

    // Status distribution
    const statusCounts = registrations.reduce((acc, reg) => {
      acc[reg.status] = (acc[reg.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const statusData = [
      { name: 'Confirmed', value: statusCounts.confirmed || 0, color: '#10b981' },
      { name: 'Pending', value: statusCounts.pending || 0, color: '#f59e0b' },
      { name: 'Cancelled', value: statusCounts.cancelled || 0, color: '#ef4444' },
    ];

    // Tournament creation trend
    const tournamentTrend = [];
    for (let i = 29; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayTournaments = tournaments.filter(t =>
        new Date(t.created_at).toDateString() === date.toDateString()
      ).length;

      tournamentTrend.push({
        date: format(date, 'MMM dd'),
        count: dayTournaments,
      });
    }

    setChartData({
      revenueData,
      participantData,
      statusData,
      tournamentTrend,
    });
  };

  const generateRecentActivities = (registrations: any[], tournaments: Tournament[]) => {
    const activities: RecentActivity[] = [];

    // Recent registrations
    const recentRegistrations = registrations.slice(0, 5).map(reg => ({
      id: `reg-${reg.id}`,
      type: 'registration' as const,
      title: 'New Registration',
      description: `${reg.athlete?.first_name} ${reg.athlete?.last_name} registered for ${reg.tournament?.title}`,
      timestamp: reg.registration_date,
      status: (reg.status === 'confirmed' ? 'success' : reg.status === 'pending' ? 'warning' : 'error') as 'success' | 'warning' | 'error',
    }));

    // Recent tournaments
    const recentTournaments = tournaments.slice(0, 3).map(tournament => ({
      id: `tournament-${tournament.id}`,
      type: 'tournament' as const,
      title: 'Tournament Created',
      description: `${tournament.title} was created`,
      timestamp: tournament.created_at,
      status: 'success' as const,
    }));

    activities.push(...recentRegistrations, ...recentTournaments);
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    setRecentActivities(activities.slice(0, 8));
  };

  const getActivityIcon = (type: string, status?: string) => {
    switch (type) {
      case 'registration':
        return status === 'success' ? <CheckCircle className="h-4 w-4 text-green-600" /> :
               status === 'warning' ? <Clock className="h-4 w-4 text-yellow-600" /> :
               <XCircle className="h-4 w-4 text-red-600" />;
      case 'tournament':
        return <Trophy className="h-4 w-4 text-blue-600" />;
      case 'payment':
        return <DollarSign className="h-4 w-4 text-green-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  // Prevent rendering until component is mounted on client to avoid SSR issues
  if (!mounted) {
    return (
      <SidebarProvider defaultOpen={false}>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <main className="flex-1 flex flex-col">
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Loading dashboard...</p>
              </div>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  if (loading) {
    return (
      <SidebarProvider defaultOpen={false}>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <main className="flex-1 flex flex-col">
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Loading dashboard...</p>
              </div>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <BarChart3 className="h-6 w-6 text-blue-600 flex-shrink-0" />
              <h1 className="text-xl font-semibold truncate">Dashboard Overview</h1>
            </div>
            <Button
              onClick={() => router.push('/dashboard/tournaments/create')}
              className="bg-gradient-to-r from-blue-600 to-red-600 hover:from-blue-700 hover:to-red-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Tournament
            </Button>
          </header>

          <div className="flex-1 space-y-6 p-6">
            {/* Welcome Section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Welcome back!</h2>
                <p className="text-muted-foreground">
                  Here's what's happening with your tournaments today.
                </p>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Tournaments</CardTitle>
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalTournaments}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.activeTournaments} active events
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Participants</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalParticipants}</div>
                  <p className="text-xs text-muted-foreground">
                    Avg {stats.averageParticipants} per tournament
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">
                    From paid registrations
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
                  {stats.growthRate >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${stats.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stats.growthRate >= 0 ? '+' : ''}{stats.growthRate.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Last 30 days vs previous
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Section */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Revenue Trend Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Trend</CardTitle>
                  <CardDescription>Daily revenue from registrations (last 30 days)</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={chartData.revenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.1}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Registration Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Registration Status</CardTitle>
                  <CardDescription>Distribution of participant registrations</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={chartData.statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {chartData.statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [value, 'Registrations']} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-4 mt-4">
                    {chartData.statusData.map((entry, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-sm text-muted-foreground">
                          {entry.name}: {entry.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Monthly Participants Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Participants</CardTitle>
                  <CardDescription>Participant growth over the last 6 months</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData.participantData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="participants" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Tournament Creation Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Tournament Activity</CardTitle>
                  <CardDescription>Daily tournament creation (last 30 days)</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData.tournamentTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        dot={{ fill: '#8b5cf6' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Bottom Section */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest updates from your tournaments</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentActivities.length > 0 ? (
                      recentActivities.map((activity) => (
                        <div key={activity.id} className="flex items-start gap-3">
                          <div className="mt-0.5">
                            {getActivityIcon(activity.type, activity.status)}
                          </div>
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium">{activity.title}</p>
                            <p className="text-xs text-muted-foreground">{activity.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(activity.timestamp), 'MMM dd, yyyy hh:mm a')}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No recent activity</p>
                        <p className="text-sm">Activity will appear here as you create tournaments and receive registrations</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common tasks and shortcuts</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => router.push('/dashboard/tournaments/create')}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create New Tournament
                  </Button>
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => router.push('/dashboard/tournaments')}
                  >
                    <Trophy className="mr-2 h-4 w-4" />
                    Manage Tournaments
                  </Button>
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => router.push('/dashboard/tournaments/participants')}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    View Participants
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    View Analytics
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Target className="mr-2 h-4 w-4" />
                    Set Goals
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
