"use client";

import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { syncUserMetadata } from "@/lib/supabase/actions/sync-metadata";
import { updateCurrentRole } from "@/lib/supabase/actions/update-role";
import { useState } from "react";

export function AuthDebug() {
  const { user } = useUser();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const resetMetadata = async () => {
    if (!user) return;
    
    try {
      // Call server action to reset metadata
      const response = await fetch('/api/auth/reset-metadata', {
        method: 'POST'
      });
      
      if (response.ok) {
        alert('Metadata reset! You can now go through onboarding again.');
        router.push('/auth/complete-profile');
      } else {
        alert('Failed to reset metadata');
      }
    } catch (error) {
      console.error('Error resetting metadata:', error);
    }
  };

  const setCompleteMetadata = async () => {
    if (!user) return;
    
    try {
      await updateCurrentRole('organizer');
      alert('Metadata set for single organizer role!');
      router.push('/dashboard');
    } catch (error) {
      console.error('Error setting metadata:', error);
    }
  };

  const setMultiRoleMetadata = async () => {
    if (!user) return;
    
    try {
      // This would need a separate server action for setting multi-role
      alert('Multi-role setup needs to be done through profile completion');
      router.push('/auth/complete-profile');
    } catch (error) {
      console.error('Error setting multi-role metadata:', error);
    }
  };

  const syncMetadata = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const result = await syncUserMetadata();
      if (result.success) {
        alert('Metadata synced from database successfully!');
        // Refresh the page to see updated metadata
        window.location.reload();
      } else {
        alert(result.message || 'Failed to sync metadata');
      }
    } catch (error) {
      alert(`Error syncing metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshSession = async () => {
    setIsLoading(true);
    try {
      // Call the session refresh endpoint
      const response = await fetch('/api/auth/refresh-session', {
        method: 'POST'
      });
      
      if (response.ok) {
        alert('Session refreshed! Try navigating now.');
        // Reload the user data
        await user?.reload();
        window.location.reload();
      } else {
        alert('Failed to refresh session');
      }
    } catch (error) {
      alert(`Error refreshing session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return <div>Please sign in first</div>;
  }

  const metadata = user.publicMetadata;

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Auth Debug Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold mb-2">Current User Info:</h3>
          <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
            {JSON.stringify({
              id: user.id,
              email: user.primaryEmailAddress?.emailAddress,
              fullName: user.fullName,
              firstName: user.firstName,
              lastName: user.lastName,
              metadata: metadata
            }, null, 2)}
          </pre>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold">Quick Actions:</h3>
          
          <Button 
            onClick={refreshSession}
            variant="outline"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Refreshing...' : 'Refresh Session (Fix Sync Issue)'}
          </Button>
          
          <Button 
            onClick={syncMetadata}
            variant="default"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Syncing...' : 'Sync Metadata from Database'}
          </Button>
          
          <Button 
            onClick={resetMetadata}
            variant="destructive"
            className="w-full"
          >
            Reset All Metadata (Start Fresh)
          </Button>
          
          <Button 
            onClick={setCompleteMetadata}
            variant="default"
            className="w-full"
          >
            Set Single Role (Organizer) - Go to Dashboard
          </Button>
          
          <Button 
            onClick={setMultiRoleMetadata}
            variant="secondary"
            className="w-full"
          >
            Set Multi-Role - Go to Role Selection
          </Button>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Current Status:</h3>
          <ul className="space-y-1 text-sm">
            <li>✅ Onboarding Complete: {metadata?.onboardingComplete ? 'Yes' : 'No'}</li>
            <li>✅ Roles: {metadata?.roles ? JSON.stringify(metadata.roles) : 'None'}</li>
            <li>✅ Primary Role: {String(metadata?.primaryRole || 'None')}</li>
            <li>✅ Current Role: {String(metadata?.currentRole || 'None')}</li>
          </ul>
        </div>

        <div className="text-xs text-gray-600">
          <p><strong>Expected Flow:</strong></p>
          <p>1. If onboardingComplete = false → /auth/complete-profile</p>
          <p>2. If multiple roles + no currentRole → /auth/select-role</p>
          <p>3. If single role OR currentRole set → /dashboard</p>
        </div>
      </CardContent>
    </Card>
  );
}
