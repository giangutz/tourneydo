"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Trophy,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Clock,
  CheckCircle,
  AlertTriangle,
  UserPlus,
  Info,
  Mail,
  Phone,
  Globe,
  Share2,
  Copy,
  Check
} from "lucide-react";
import { createPublicSupabaseClient } from "@/lib/supabase";
import type { Tournament } from "@/types/database";

export default function PublicTournamentPage() {
  const router = useRouter();
  const params = useParams();
  const tournamentId = params.id as string;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (tournamentId) {
      fetchTournament();
    }
  }, [tournamentId]);

  const fetchTournament = async () => {
    try {
      const supabase = createPublicSupabaseClient();

      const { data: tournamentData, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .eq('status', 'published')
        .single();

      if (error || !tournamentData) {
        router.push('/tournaments');
        return;
      }

      setTournament(tournamentData);

      // Get participant count
      const { count } = await supabase
        .from('registrations')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', tournamentId);

      setParticipantCount(count ?? 0);

      // Check if registration is open
      const now = new Date();
      const startDate = new Date(tournamentData.start_date);
      const registrationDeadline = tournamentData.registration_deadline
        ? new Date(tournamentData.registration_deadline)
        : startDate;

      setRegistrationOpen(
        tournamentData.status === 'published' &&
        now <= registrationDeadline &&
        (tournamentData.max_participants ? (count ?? 0) < tournamentData.max_participants : true)
      );

    } catch (error) {
      console.error('Error fetching tournament:', error);
      router.push('/tournaments');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getDaysUntilStart = () => {
    if (!tournament) return 0;
    const now = new Date();
    const startDate = new Date(tournament.start_date);
    const diffTime = startDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getDaysUntilDeadline = () => {
    if (!tournament || !tournament.registration_deadline) return null;
    const now = new Date();
    const deadline = new Date(tournament.registration_deadline);
    const diffTime = deadline.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const copyTournamentLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-red-50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading tournament...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-red-50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <Trophy className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h1 className="text-2xl font-bold mb-2">Tournament Not Found</h1>
              <p className="text-muted-foreground mb-6">
                The tournament you're looking for doesn't exist or is not available.
              </p>
              <Button onClick={() => router.push('/tournaments')}>
                Browse Tournaments
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-red-50">
      <div className="container mx-auto px-4 py-8">
        {/* Copy Link Button - Top Right */}
        <div className="fixed top-4 right-4 z-50">
          <Button
            onClick={copyTournamentLink}
            size="sm"
            className="bg-white/90 backdrop-blur-sm text-gray-700 hover:bg-white shadow-lg"
          >
            {copiedLink ? (
              <Check className="h-4 w-4 mr-2 text-green-600" />
            ) : (
              <Share2 className="h-4 w-4 mr-2" />
            )}
            {copiedLink ? 'Copied!' : 'Share'}
          </Button>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 mb-4">
            <Trophy className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-600">Taekwondo Tournament</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 to-red-600 bg-clip-text text-transparent mb-4">
            {tournament.title}
          </h1>
          {tournament.description && (
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {tournament.description}
            </p>
          )}
        </div>

        {/* Key Information Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Calendar className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Start Date</p>
                  <p className="text-lg font-bold">{formatDate(tournament.start_date)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <MapPin className="h-8 w-8 text-red-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Location</p>
                  <p className="text-lg font-bold">{tournament.location}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Participants</p>
                  <p className="text-lg font-bold">
                    {participantCount}
                    {tournament.max_participants && ` / ${tournament.max_participants}`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Registration Fee</p>
                  <p className="text-lg font-bold">
                    {tournament.registration_fee
                      ? `${tournament.currency} ${tournament.registration_fee}`
                      : 'Free'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Registration Status */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {registrationOpen ? (
                  <>
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    <div>
                      <h3 className="text-lg font-semibold text-green-600">Registration Open</h3>
                      <p className="text-sm text-gray-600">
                        {(() => {
                          const daysLeft = getDaysUntilDeadline();
                          return daysLeft !== null && daysLeft > 0
                            ? `${daysLeft} days left to register`
                            : 'Register now!';
                        })()}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <Clock className="h-6 w-6 text-orange-600" />
                    <div>
                      <h3 className="text-lg font-semibold text-orange-600">Registration Closed</h3>
                      <p className="text-sm text-gray-600">
                        {getDaysUntilStart() > 0
                          ? `Tournament starts in ${getDaysUntilStart()} days`
                          : 'Tournament has started'
                        }
                      </p>
                    </div>
                  </>
                )}
              </div>

              {registrationOpen && (
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-red-600 hover:from-blue-700 hover:to-red-700"
                  onClick={() => setRegistrationOpen(true)}
                >
                  <UserPlus className="mr-2 h-5 w-5" />
                  Register Now
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tournament Details */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Tournament Information */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Tournament Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Start Date</p>
                  <p className="font-semibold">{formatDate(tournament.start_date)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">End Date</p>
                  <p className="font-semibold">{formatDate(tournament.end_date)}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Location</p>
                <p className="font-semibold">{tournament.location}</p>
              </div>

              {tournament.max_participants && (
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Capacity</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${Math.min((participantCount / tournament.max_participants) * 100, 100)}%`
                        }}
                      />
                    </div>
                    <span className="text-sm font-semibold">
                      {participantCount} / {tournament.max_participants}
                    </span>
                  </div>
                </div>
              )}

              {tournament.registration_deadline && (
                <div>
                  <p className="text-sm font-medium text-gray-600">Registration Deadline</p>
                  <p className="font-semibold">{formatDate(tournament.registration_deadline)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rules and Contact */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Rules & Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {tournament.rules && (
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Tournament Rules</p>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm whitespace-pre-wrap">{tournament.rules}</p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-600">Contact Information</p>
                <div className="space-y-2">
                  {tournament.contact_email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <a
                        href={`mailto:${tournament.contact_email}`}
                        className="text-blue-600 hover:underline"
                      >
                        {tournament.contact_email}
                      </a>
                    </div>
                  )}
                  {tournament.contact_phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <a
                        href={`tel:${tournament.contact_phone}`}
                        className="text-blue-600 hover:underline"
                      >
                        {tournament.contact_phone}
                      </a>
                    </div>
                  )}
                  {tournament.website_url && (
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="h-4 w-4 text-gray-500" />
                      <a
                        href={tournament.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Visit Website
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Registration CTA */}
        {registrationOpen && (
          <Card className="bg-gradient-to-r from-blue-600 to-red-600 border-0 shadow-lg">
            <CardContent className="p-8 text-center">
              <h3 className="text-2xl font-bold text-white mb-4">
                Ready to Compete?
              </h3>
              <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
                Join this exciting taekwondo tournament and showcase your skills.
                Registration is quick and easy - just provide your information and you're in!
              </p>
              <Button
                size="lg"
                variant="secondary"
                className="bg-white text-blue-600 hover:bg-gray-100"
                onClick={() => setRegistrationOpen(true)}
              >
                <UserPlus className="mr-2 h-5 w-5" />
                Register for Tournament
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Registration Dialog */}
      <RegistrationDialog
        tournament={tournament}
        open={registrationOpen}
        onOpenChange={setRegistrationOpen}
        onSuccess={() => {
          setRegistrationOpen(false);
          fetchTournament(); // Refresh participant count
        }}
      />
    </div>
  );
}

// Registration Dialog Component
function RegistrationDialog({
  tournament,
  open,
  onOpenChange,
  onSuccess
}: {
  tournament: Tournament;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    date_of_birth: "",
    gender: "",
    weight: "",
    height: "",
    belt_rank: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    medical_conditions: "",
  });
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (step === 1) {
      // Validate first step
      if (!formData.first_name || !formData.last_name || !formData.date_of_birth || !formData.gender) {
        alert('Please fill in all required fields');
        return;
      }
      setStep(2);
      return;
    }

    // Submit registration
    setLoading(true);
    try {
      const supabase = createPublicSupabaseClient();

      // First, get or create a default public organization
      let organizationId;

      // Try to find existing public organization
      const { data: existingOrg } = await supabase
        .from('organizations')
        .select('id')
        .eq('name', 'Public Registrations')
        .eq('type', 'other')
        .single();

      if (existingOrg) {
        organizationId = existingOrg.id;
      } else {
        // Create default public organization
        const { data: newOrg, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: 'Public Registrations',
            type: 'other',
            description: 'Default organization for public tournament registrations',
            owner_id: '00000000-0000-0000-0000-000000000000', // Placeholder owner ID
            status: 'active'
          })
          .select('id')
          .single();

        if (orgError) throw orgError;
        organizationId = newOrg.id;
      }

      // Create the athlete
      const athleteData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        date_of_birth: formData.date_of_birth,
        gender: formData.gender as 'male' | 'female' | 'other',
        belt_rank: formData.belt_rank || 'Not specified',
        weight_class: formData.weight ? `${formData.weight}kg` : null,
        organization_id: organizationId,
        emergency_contact_name: formData.emergency_contact_name || null,
        emergency_contact_phone: formData.emergency_contact_phone || null,
        medical_conditions: formData.medical_conditions || null,
        status: 'active' as const,
      };

      const { data: athlete, error: athleteError } = await supabase
        .from('athletes')
        .insert(athleteData)
        .select()
        .single();

      if (athleteError) throw athleteError;

      // Create registration
      const registrationData = {
        tournament_id: tournament.id,
        athlete_id: athlete.id,
        registration_date: new Date().toISOString(),
        status: 'pending' as const,
        payment_status: tournament.registration_fee ? 'pending' : 'paid',
        payment_amount: tournament.registration_fee || null,
        payment_currency: tournament.currency || null,
        notes: JSON.stringify({
          height: formData.height,
          weight: formData.weight,
          additional_info: formData.medical_conditions,
        }),
      };

      const { error: registrationError } = await supabase
        .from('registrations')
        .insert(registrationData);

      if (registrationError) throw registrationError;

      alert('Registration submitted successfully! You will receive a confirmation email shortly.');
      onSuccess();
      setStep(1);
      setFormData({
        first_name: "",
        last_name: "",
        date_of_birth: "",
        gender: "",
        weight: "",
        height: "",
        belt_rank: "",
        emergency_contact_name: "",
        emergency_contact_phone: "",
        medical_conditions: "",
      });

    } catch (error) {
      console.error('Error submitting registration:', error);
      alert('Failed to submit registration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Register for {tournament.title}</DialogTitle>
          <DialogDescription>
            Fill out the registration form to participate in this tournament.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Personal Information</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="first_name" className="text-sm font-medium">
                    First Name *
                  </label>
                  <input
                    id="first_name"
                    name="first_name"
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={handleInputChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="last_name" className="text-sm font-medium">
                    Last Name *
                  </label>
                  <input
                    id="last_name"
                    name="last_name"
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={handleInputChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="date_of_birth" className="text-sm font-medium">
                    Date of Birth *
                  </label>
                  <input
                    id="date_of_birth"
                    name="date_of_birth"
                    type="date"
                    required
                    value={formData.date_of_birth}
                    onChange={handleInputChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="gender" className="text-sm font-medium">
                    Gender *
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    required
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label htmlFor="weight" className="text-sm font-medium">
                    Weight (kg)
                  </label>
                  <input
                    id="weight"
                    name="weight"
                    type="number"
                    step="0.1"
                    value={formData.weight}
                    onChange={handleInputChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="height" className="text-sm font-medium">
                    Height (cm)
                  </label>
                  <input
                    id="height"
                    name="height"
                    type="number"
                    step="0.1"
                    value={formData.height}
                    onChange={handleInputChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="belt_rank" className="text-sm font-medium">
                    Belt Rank
                  </label>
                  <select
                    id="belt_rank"
                    name="belt_rank"
                    value={formData.belt_rank}
                    onChange={handleInputChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Select belt</option>
                    <option value="Yellow">Yellow</option>
                    <option value="Blue">Blue</option>
                    <option value="Red">Red</option>
                    <option value="Brown">Brown</option>
                    <option value="Black">Black</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Emergency Contact & Medical</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="emergency_contact_name" className="text-sm font-medium">
                    Emergency Contact Name
                  </label>
                  <input
                    id="emergency_contact_name"
                    name="emergency_contact_name"
                    type="text"
                    value={formData.emergency_contact_name}
                    onChange={handleInputChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="emergency_contact_phone" className="text-sm font-medium">
                    Emergency Contact Phone
                  </label>
                  <input
                    id="emergency_contact_phone"
                    name="emergency_contact_phone"
                    type="tel"
                    value={formData.emergency_contact_phone}
                    onChange={handleInputChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="medical_conditions" className="text-sm font-medium">
                  Medical Conditions (if any)
                </label>
                <textarea
                  id="medical_conditions"
                  name="medical_conditions"
                  value={formData.medical_conditions}
                  onChange={handleInputChange}
                  placeholder="Please list any medical conditions, allergies, or medications..."
                  rows={3}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Registration Summary</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <p><strong>Tournament:</strong> {tournament.title}</p>
                  <p><strong>Fee:</strong> {tournament.registration_fee ? `${tournament.currency} ${tournament.registration_fee}` : 'Free'}</p>
                  <p><strong>Participant:</strong> {formData.first_name} {formData.last_name}</p>
                  <p><strong>Belt Rank:</strong> {formData.belt_rank || 'Not specified'}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between">
            {step === 2 && (
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {step === 1 ? 'Next' : (loading ? 'Submitting...' : 'Complete Registration')}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
