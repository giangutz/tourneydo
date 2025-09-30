"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Trophy,
  ArrowLeft,
  Save,
  Trash2,
  Calendar,
  MapPin,
  DollarSign,
  Users,
  Clock,
  AlertTriangle
} from "lucide-react";
import { createClerkSupabaseClient } from "@/lib/supabase";
import { useUser, useSession } from "@clerk/nextjs";
import type { Tournament } from "@/types/database";

const tournamentSchema = z.object({
  title: z.string()
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title must be less than 100 characters"),
  description: z.string()
    .max(500, "Description must be less than 500 characters")
    .optional(),
  start_date: z.string()
    .min(1, "Start date is required"),
  end_date: z.string()
    .min(1, "End date is required"),
  location: z.string()
    .min(3, "Location must be at least 3 characters")
    .max(200, "Location must be less than 200 characters"),
  max_participants: z.number()
    .min(1, "Must allow at least 1 participant")
    .max(1000, "Cannot exceed 1000 participants")
    .optional(),
  registration_deadline: z.string()
    .optional(),
  registration_fee: z.number()
    .min(0, "Registration fee cannot be negative")
    .optional(),
  currency: z.string()
    .min(1, "Currency is required"),
  status: z.enum(["draft", "published"]),
  rules: z.string()
    .max(1000, "Rules must be less than 1000 characters")
    .optional(),
  contact_email: z.string()
    .email("Invalid email address")
    .optional()
    .or(z.literal("")),
  contact_phone: z.string()
    .max(20, "Phone number must be less than 20 characters")
    .optional(),
  website_url: z.string()
    .url("Invalid URL")
    .optional()
    .or(z.literal("")),
});

type TournamentFormData = z.infer<typeof tournamentSchema>;

export default function EditTournamentPage() {
  const router = useRouter();
  const params = useParams();
  const tournamentId = params.id as string;

  const { user } = useUser();
  const { session } = useSession();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const form = useForm<TournamentFormData>({
    resolver: zodResolver(tournamentSchema),
    defaultValues: {
      title: "",
      description: "",
      start_date: "",
      end_date: "",
      location: "",
      max_participants: undefined,
      registration_deadline: "",
      registration_fee: undefined,
      currency: "USD",
      rules: "",
      contact_email: "",
      contact_phone: "",
      website_url: "",
    },
  });

  useEffect(() => {
    if (user?.id && tournamentId) {
      fetchTournament();
    }
  }, [user?.id, tournamentId]);

  const fetchTournament = async () => {
    if (!user?.id || !session || !tournamentId) return;

    try {
      const supabase = createClerkSupabaseClient(session);

      const { data: tournamentData, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .eq('organizer_id', user.id)
        .single();

      if (error) throw error;

      setTournament(tournamentData);

      // Populate form with existing data
      form.reset({
        title: tournamentData.title,
        description: tournamentData.description || "",
        start_date: tournamentData.start_date,
        end_date: tournamentData.end_date,
        location: tournamentData.location,
        max_participants: tournamentData.max_participants || undefined,
        registration_deadline: tournamentData.registration_deadline || "",
        registration_fee: tournamentData.registration_fee || undefined,
        currency: tournamentData.currency || "USD",
        status: tournamentData.status,
        rules: tournamentData.rules || "",
        contact_email: tournamentData.contact_email || "",
        contact_phone: tournamentData.contact_phone || "",
        website_url: tournamentData.website_url || "",
      });
    } catch (error) {
      console.error('Error fetching tournament:', error);
      router.push('/dashboard/tournaments');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: TournamentFormData) => {
    if (!session || !tournament) return;

    setSaving(true);
    try {
      const supabase = createClerkSupabaseClient(session);

      const updateData = {
        title: data.title,
        description: data.description || null,
        start_date: data.start_date,
        end_date: data.end_date,
        location: data.location,
        max_participants: data.max_participants || null,
        registration_deadline: data.registration_deadline || null,
        registration_fee: data.registration_fee || null,
        currency: data.currency,
        status: data.status,
        rules: data.rules || null,
        contact_email: data.contact_email || null,
        contact_phone: data.contact_phone || null,
        website_url: data.website_url || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('tournaments')
        .update(updateData)
        .eq('id', tournament.id);

      if (error) throw error;

      router.push(`/dashboard/tournaments/${tournament.id}`);
    } catch (error) {
      console.error('Error updating tournament:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!session || !tournament) return;

    try {
      const supabase = createClerkSupabaseClient(session);

      const { error } = await supabase
        .from('tournaments')
        .delete()
        .eq('id', tournament.id);

      if (error) throw error;

      router.push('/dashboard/tournaments');
    } catch (error) {
      console.error('Error deleting tournament:', error);
    }
  };

  if (loading) {
    return (
      <SidebarProvider defaultOpen={false}>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <main className="flex-1 flex flex-col">
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Loading tournament...</p>
              </div>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  if (!tournament) {
    return (
      <SidebarProvider defaultOpen={false}>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <main className="flex-1 flex flex-col">
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Tournament not found</h3>
                <p className="text-muted-foreground mb-4">
                  The tournament you're looking for doesn't exist or you don't have access to it.
                </p>
                <Button onClick={() => router.push('/dashboard/tournaments')}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Tournaments
                </Button>
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="mr-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Trophy className="h-6 w-6 text-blue-600 flex-shrink-0" />
              <h1 className="text-xl font-semibold truncate">Edit Tournament</h1>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </header>

          <div className="flex-1 space-y-6 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Edit Tournament</h2>
                <p className="text-muted-foreground">
                  Update tournament details and settings
                </p>
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Basic Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Trophy className="h-5 w-5" />
                        Basic Information
                      </CardTitle>
                      <CardDescription>
                        Essential tournament details
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }: { field: any }) => (
                          <FormItem>
                            <FormLabel>Tournament Title</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter tournament title" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }: { field: any }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Brief description of the tournament"
                                className="resize-none"
                                rows={3}
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Optional description to help participants understand the event
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="start_date"
                          render={({ field }: { field: any }) => (
                            <FormItem>
                              <FormLabel>Start Date</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="end_date"
                          render={({ field }: { field: any }) => (
                            <FormItem>
                              <FormLabel>End Date</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="location"
                        render={({ field }: { field: any }) => (
                          <FormItem>
                            <FormLabel>Location</FormLabel>
                            <FormControl>
                              <Input placeholder="Venue address or location" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }: { field: any }) => (
                          <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="draft">Draft</SelectItem>
                                <SelectItem value="published">Published</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Draft tournaments are not visible to participants
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Registration Settings */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Registration Settings
                      </CardTitle>
                      <CardDescription>
                        Participant limits and fees
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="max_participants"
                        render={({ field }: { field: any }) => (
                          <FormItem>
                            <FormLabel>Maximum Participants</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="Leave empty for unlimited"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormDescription>
                              Maximum number of participants allowed
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="registration_deadline"
                        render={({ field }: { field: any }) => (
                          <FormItem>
                            <FormLabel>Registration Deadline</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormDescription>
                              Last date for registration (optional)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="registration_fee"
                          render={({ field }: { field: any }) => (
                            <FormItem>
                              <FormLabel>Registration Fee</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                  value={field.value || ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="currency"
                          render={({ field }: { field: any }) => (
                            <FormItem>
                              <FormLabel>Currency</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select currency" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="USD">USD ($)</SelectItem>
                                  <SelectItem value="EUR">EUR (€)</SelectItem>
                                  <SelectItem value="GBP">GBP (£)</SelectItem>
                                  <SelectItem value="JPY">JPY (¥)</SelectItem>
                                  <SelectItem value="KRW">KRW (₩)</SelectItem>
                                  <SelectItem value="PHP">PHP (₱)</SelectItem>
                                  <SelectItem value="AUD">AUD (A$)</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Rules and Contact */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        Rules & Guidelines
                      </CardTitle>
                      <CardDescription>
                        Tournament rules and requirements
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <FormField
                        control={form.control}
                        name="rules"
                        render={({ field }: { field: any }) => (
                          <FormItem>
                            <FormLabel>Tournament Rules</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Enter tournament rules, requirements, and guidelines"
                                className="resize-none"
                                rows={6}
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Detailed rules, belt requirements, and competition guidelines
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Contact Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        Contact Information
                      </CardTitle>
                      <CardDescription>
                        Contact details for participants
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="contact_email"
                        render={({ field }: { field: any }) => (
                          <FormItem>
                            <FormLabel>Contact Email</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="contact@tournament.com"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Email for tournament inquiries
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="contact_phone"
                        render={({ field }: { field: any }) => (
                          <FormItem>
                            <FormLabel>Contact Phone</FormLabel>
                            <FormControl>
                              <Input
                                type="tel"
                                placeholder="+1 (555) 123-4567"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Phone number for urgent inquiries
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="website_url"
                        render={({ field }: { field: any }) => (
                          <FormItem>
                            <FormLabel>Website URL</FormLabel>
                            <FormControl>
                              <Input
                                type="url"
                                placeholder="https://tournament.com"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Official tournament website (optional)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </main>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tournament</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{tournament.title}"? This action cannot be undone and will remove all associated registrations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete Tournament
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}
