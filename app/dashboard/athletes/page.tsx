import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Users, UserPlus, Trophy, Calendar, TrendingUp, Plus, Search, Filter } from "lucide-react";

export default function AthletesDashboard() {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Users className="h-6 w-6 text-blue-600 flex-shrink-0" />
              <h1 className="text-xl font-semibold truncate">Athlete Management</h1>
            </div>
          </header>

          <div className="flex-1 space-y-6 p-6">
            {/* Welcome Section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Welcome back!</h2>
                <p className="text-muted-foreground">
                  Manage your athletes and track tournament registrations.
                </p>
              </div>
              <Button className="bg-gradient-to-r from-blue-600 to-red-600 hover:from-blue-700 hover:to-red-700 w-full sm:w-auto">
                <UserPlus className="mr-2 h-4 w-4" />
                Add Athlete
              </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Athletes</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">156</div>
                  <p className="text-xs text-muted-foreground">
                    +12 from last month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Registrations</CardTitle>
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">89</div>
                  <p className="text-xs text-muted-foreground">
                    +8% from last month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Upcoming Tournaments</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">15</div>
                  <p className="text-xs text-muted-foreground">
                    Next event in 5 days
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Performance Rating</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">4.2</div>
                  <p className="text-xs text-muted-foreground">
                    +0.3 from last month
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  placeholder="Search athletes..."
                  className="pl-8 h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>
            </div>

            {/* Athletes List */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Athletes</CardTitle>
                  <CardDescription>
                    Your latest athlete registrations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    {
                      name: "Kim Ji-hoon",
                      belt: "Black Belt",
                      age: 16,
                      status: "Active",
                      lastTournament: "Regional Qualifiers 2024"
                    },
                    {
                      name: "Park Min-ji",
                      belt: "Red Belt",
                      age: 14,
                      status: "Active",
                      lastTournament: "Youth Championship 2024"
                    },
                    {
                      name: "Lee Seo-yun",
                      belt: "Blue Belt",
                      age: 12,
                      status: "Training",
                      lastTournament: "Local Competition 2024"
                    },
                    {
                      name: "Choi Woo-jin",
                      belt: "Green Belt",
                      age: 15,
                      status: "Active",
                      lastTournament: "Spring Tournament 2024"
                    }
                  ].map((athlete, index) => (
                    <div key={index} className="flex items-center space-x-4 p-3 rounded-lg border">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={`/api/placeholder/40/40`} />
                        <AvatarFallback>
                          {athlete.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {athlete.name}
                        </p>
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <span>{athlete.belt}</span>
                          <span>•</span>
                          <span>{athlete.age} years old</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Last: {athlete.lastTournament}
                        </p>
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        <Badge
                          variant={athlete.status === 'Active' ? 'default' : 'secondary'}
                        >
                          {athlete.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>
                    Common athlete management tasks
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start" variant="outline">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Register New Athlete
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Trophy className="mr-2 h-4 w-4" />
                    View Tournament Results
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Calendar className="mr-2 h-4 w-4" />
                    Schedule Training
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Performance Reports
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Upcoming Tournaments for Athletes */}
            <Card>
              <CardHeader>
                <CardTitle>Available Tournaments</CardTitle>
                <CardDescription>
                  Tournaments your athletes can register for
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    {
                      title: "Regional Qualifiers",
                      date: "April 2, 2024",
                      location: "Busan Sports Complex",
                      registered: 12,
                      maxCapacity: 64,
                      status: "Registration Open"
                    },
                    {
                      title: "Youth Development Cup",
                      date: "April 20, 2024",
                      location: "Daegu Olympic Gymnasium",
                      registered: 28,
                      maxCapacity: 48,
                      status: "Registration Open"
                    },
                    {
                      title: "National Championships",
                      date: "May 15, 2024",
                      location: "Seoul Olympic Stadium",
                      registered: 156,
                      maxCapacity: 200,
                      status: "Early Bird Open"
                    }
                  ].map((tournament, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <h4 className="font-medium">{tournament.title}</h4>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <div className="flex items-center">
                            <Calendar className="mr-1 h-3 w-3" />
                            {tournament.date}
                          </div>
                          <div className="flex items-center">
                            <Users className="mr-1 h-3 w-3" />
                            {tournament.registered}/{tournament.maxCapacity} registered
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{tournament.location}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={tournament.status === 'Registration Open' ? 'default' : 'secondary'}>
                          {tournament.status}
                        </Badge>
                        <Button size="sm" variant="outline">
                          Register Athletes
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Belt Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Belt Distribution</CardTitle>
                <CardDescription>
                  Current belt ranks of your athletes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { belt: "White Belt", count: 23, color: "bg-gray-100" },
                    { belt: "Yellow Belt", count: 18, color: "bg-yellow-100" },
                    { belt: "Green Belt", count: 15, color: "bg-green-100" },
                    { belt: "Blue Belt", count: 12, color: "bg-blue-100" },
                    { belt: "Red Belt", count: 8, color: "bg-red-100" },
                    { belt: "Black Belt", count: 5, color: "bg-gray-800" },
                    { belt: "Advanced", count: 3, color: "bg-purple-100" },
                    { belt: "Master", count: 1, color: "bg-orange-100" }
                  ].map((belt, index) => (
                    <div key={index} className="text-center">
                      <div className={`w-16 h-16 ${belt.color} rounded-full flex items-center justify-center mx-auto mb-2`}>
                        <span className="text-xs font-medium">{belt.count}</span>
                      </div>
                      <p className="text-xs font-medium">{belt.belt}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
