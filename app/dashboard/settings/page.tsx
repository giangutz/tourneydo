import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Bell, Shield, Globe, Download, HelpCircle, Trophy, User } from "lucide-react";

export default async function SettingsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/auth/sign-in");
  }

  const supabase = await createClient();

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (!profile) {
    redirect("/auth/sign-in");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your application preferences and tournament settings
        </p>
      </div>

      <div className="grid gap-6">
        {/* User Profile Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="mr-2 h-5 w-5" />
              Profile Management
            </CardTitle>
            <CardDescription>
              Manage your personal information and account settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Personal Information</p>
                <p className="text-sm text-muted-foreground">
                  Update your name, email, password, and profile picture
                </p>
              </div>
              <Button variant="outline" asChild>
                <a href="/user-profile" target="_blank" rel="noopener noreferrer">
                  Manage Profile
                </a>
              </Button>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Account Security</p>
                <p className="text-sm text-muted-foreground">
                  Two-factor authentication, security keys, and login history
                </p>
              </div>
              <Button variant="outline" asChild>
                <a href="/user-profile/security" target="_blank" rel="noopener noreferrer">
                  Security Settings
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="mr-2 h-5 w-5" />
              Notification Preferences
            </CardTitle>
            <CardDescription>
              Choose how you want to be notified about tournament updates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="email-notifications">Email notifications</Label>
                <p className="text-sm text-muted-foreground">Receive tournament updates via email</p>
              </div>
              <Switch id="email-notifications" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="tournament-reminders">Tournament reminders</Label>
                <p className="text-sm text-muted-foreground">Get reminders before tournaments start</p>
              </div>
              <Switch id="tournament-reminders" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="registration-updates">Registration updates</Label>
                <p className="text-sm text-muted-foreground">Notifications when registration status changes</p>
              </div>
              <Switch id="registration-updates" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="result-notifications">Result notifications</Label>
                <p className="text-sm text-muted-foreground">Get notified when tournament results are posted</p>
              </div>
              <Switch id="result-notifications" />
            </div>
          </CardContent>
        </Card>

        {/* Tournament Preferences - Only for Organizers */}
        {profile.role === "organizer" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Trophy className="mr-2 h-5 w-5" />
                Tournament Defaults
              </CardTitle>
              <CardDescription>
                Set default preferences for new tournaments you create
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Default tournament format</Label>
                <Select defaultValue="elimination">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="elimination">Single Elimination</SelectItem>
                    <SelectItem value="round-robin">Round Robin</SelectItem>
                    <SelectItem value="swiss">Swiss System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Default registration period</Label>
                <Select defaultValue="30">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days before tournament</SelectItem>
                    <SelectItem value="14">14 days before tournament</SelectItem>
                    <SelectItem value="30">30 days before tournament</SelectItem>
                    <SelectItem value="60">60 days before tournament</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Auto-approve registrations</Label>
                <Select defaultValue="manual">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Automatically approve all registrations</SelectItem>
                    <SelectItem value="manual">Manually review each registration</SelectItem>
                    <SelectItem value="payment">Auto-approve after payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Display Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Globe className="mr-2 h-5 w-5" />
              Display Preferences
            </CardTitle>
            <CardDescription>
              Customize how information is displayed throughout the application
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select defaultValue="asia/manila">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asia/manila">Asia/Manila (GMT+8)</SelectItem>
                  <SelectItem value="utc">UTC (GMT+0)</SelectItem>
                  <SelectItem value="america/new_york">America/New_York (GMT-5)</SelectItem>
                  <SelectItem value="europe/london">Europe/London (GMT+0)</SelectItem>
                  <SelectItem value="asia/tokyo">Asia/Tokyo (GMT+9)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date format</Label>
              <Select defaultValue="mm/dd/yyyy">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mm/dd/yyyy">MM/DD/YYYY (12/25/2024)</SelectItem>
                  <SelectItem value="dd/mm/yyyy">DD/MM/YYYY (25/12/2024)</SelectItem>
                  <SelectItem value="yyyy-mm-dd">YYYY-MM-DD (2024-12-25)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select defaultValue="php">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="php">Philippine Peso (₱)</SelectItem>
                  <SelectItem value="usd">US Dollar ($)</SelectItem>
                  <SelectItem value="eur">Euro (€)</SelectItem>
                  <SelectItem value="jpy">Japanese Yen (¥)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="compact-mode">Compact display mode</Label>
                <p className="text-sm text-muted-foreground">Show more information in less space</p>
              </div>
              <Switch id="compact-mode" />
            </div>
          </CardContent>
        </Card>

        {/* Privacy & Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="mr-2 h-5 w-5" />
              Privacy & Data
            </CardTitle>
            <CardDescription>
              Control your data privacy and sharing preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="profile-visibility">Public profile visibility</Label>
                <p className="text-sm text-muted-foreground">Allow others to see your tournament history</p>
              </div>
              <Switch id="profile-visibility" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="analytics">Usage analytics</Label>
                <p className="text-sm text-muted-foreground">Help improve TourneyDo with anonymous usage data</p>
              </div>
              <Switch id="analytics" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="marketing">Marketing communications</Label>
                <p className="text-sm text-muted-foreground">Receive updates about new features and tournaments</p>
              </div>
              <Switch id="marketing" />
            </div>
            
            <Separator />
            
            <div className="space-y-3">
              <h4 className="font-medium">Data Management</h4>
              <div className="grid gap-2">
                <Button variant="outline" className="w-full justify-start">
                  <Download className="mr-2 h-4 w-4" />
                  Export my tournament data
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <HelpCircle className="mr-2 h-4 w-4" />
                  Help & Support Center
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Changes */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <Button variant="outline" className="sm:w-auto">
            Reset to defaults
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 sm:flex-none">
              Cancel
            </Button>
            <Button className="flex-1 sm:flex-none">
              Save changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
