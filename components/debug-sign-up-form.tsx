"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { UserRole } from "@/lib/types/database";

export function DebugSignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    repeatPassword: "",
    fullName: "",
    role: "" as UserRole,
    phone: "",
    organization: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const testConnection = async () => {
    const supabase = createClient();
    setDebugInfo("Testing Supabase connection...");
    
    try {
      // Test basic connection
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        setDebugInfo(`Connection test failed: ${error.message}`);
        return;
      }
      
      setDebugInfo(`Connection successful! Session: ${data.session ? 'Active' : 'None'}`);
      
      // Test if we can access the database
      try {
        const { error: dbError } = await supabase
          .from('profiles')
          .select('count')
          .limit(1);
        
        if (dbError) {
          setDebugInfo(prev => prev + `\nDatabase test: ${dbError.message}`);
        } else {
          setDebugInfo(prev => prev + `\nDatabase accessible: Yes`);
        }
      } catch (dbErr) {
        setDebugInfo(prev => prev + `\nDatabase test failed: ${dbErr}`);
      }
      
    } catch (err) {
      setDebugInfo(`Connection failed: ${err}`);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);
    setDebugInfo("");

    if (formData.password !== formData.repeatPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (!formData.role) {
      setError("Please select a role");
      setIsLoading(false);
      return;
    }

    setDebugInfo("Starting sign-up process...");

    try {
      // Log the request details (without password)
      setDebugInfo(prev => prev + `\nAttempting to sign up: ${formData.email}`);
      setDebugInfo(prev => prev + `\nRole: ${formData.role}`);
      setDebugInfo(prev => prev + `\nName: ${formData.fullName}`);

      // Try a simple sign-up first without metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      setDebugInfo(prev => prev + `\nAuth response received`);

      if (authError) {
        setDebugInfo(prev => prev + `\nAuth error: ${authError.message}`);
        setDebugInfo(prev => prev + `\nError code: ${authError.status || 'unknown'}`);
        setDebugInfo(prev => prev + `\nError details: ${JSON.stringify(authError, null, 2)}`);
        throw authError;
      }

      if (authData.user) {
        setDebugInfo(prev => prev + `\nUser created successfully: ${authData.user.id}`);
        setDebugInfo(prev => prev + `\nEmail confirmed: ${authData.user.email_confirmed_at ? 'Yes' : 'No'}`);
        
        // Try to create profile
        setDebugInfo(prev => prev + `\nAttempting to create profile...`);
        
        try {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: authData.user.id,
              email: formData.email,
              full_name: formData.fullName,
              role: formData.role,
              phone: formData.phone || null,
              organization: formData.organization || null,
            });

          if (profileError) {
            setDebugInfo(prev => prev + `\nProfile error: ${profileError.message}`);
            setDebugInfo(prev => prev + `\nProfile error details: ${JSON.stringify(profileError, null, 2)}`);
          } else {
            setDebugInfo(prev => prev + `\nProfile created successfully`);
          }
        } catch (profileErr) {
          setDebugInfo(prev => prev + `\nProfile creation failed: ${profileErr}`);
        }

        setDebugInfo(prev => prev + `\nSign-up completed successfully!`);
        
        // Don't redirect immediately, let user see the debug info
        setTimeout(() => {
          router.push("/auth/sign-up-success");
        }, 3000);
      } else {
        setDebugInfo(prev => prev + `\nNo user data returned from auth`);
        setError("Sign-up failed: No user data returned");
      }

    } catch (error: unknown) {
      console.error('Full sign up error:', error);
      setDebugInfo(prev => prev + `\nCaught error: ${error}`);
      
      if (error instanceof Error) {
        setError(`Sign-up failed: ${error.message}`);
        setDebugInfo(prev => prev + `\nError message: ${error.message}`);
        setDebugInfo(prev => prev + `\nError stack: ${error.stack}`);
      } else {
        setError("An unknown error occurred during sign-up");
        setDebugInfo(prev => prev + `\nUnknown error type: ${typeof error}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Debug Sign-Up</CardTitle>
          <CardDescription>Testing sign-up with detailed logging</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button onClick={testConnection} variant="outline" className="w-full">
              Test Supabase Connection
            </Button>
            
            {debugInfo && (
              <div className="p-4 bg-gray-100 rounded-lg">
                <Label className="text-sm font-medium">Debug Information:</Label>
                <pre className="text-xs mt-2 whitespace-pre-wrap">{debugInfo}</pre>
              </div>
            )}
          </div>

          <form onSubmit={handleSignUp} className="mt-6">
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  required
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  required
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="role">I am a...</Label>
                <Select onValueChange={(value: string) => handleInputChange('role', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="organizer">Tournament Organizer</SelectItem>
                    <SelectItem value="coach">Coach</SelectItem>
                    <SelectItem value="athlete">Athlete</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="phone">Phone (Optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="organization">Organization/School (Optional)</Label>
                <Input
                  id="organization"
                  type="text"
                  placeholder="ABC Taekwondo Academy"
                  value={formData.organization}
                  onChange={(e) => handleInputChange('organization', e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="repeat-password">Confirm Password</Label>
                <Input
                  id="repeat-password"
                  type="password"
                  required
                  value={formData.repeatPassword}
                  onChange={(e) => handleInputChange('repeatPassword', e.target.value)}
                />
              </div>

              {error && (
                <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Creating Account..." : "Create Account (Debug Mode)"}
              </Button>
            </div>

            <div className="mt-4 text-center text-sm">
              Already have an account?{" "}
              <Link href="/auth/login" className="underline underline-offset-4">
                Sign In
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
