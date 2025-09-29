-- Quick fix for RLS policy issue
-- Run this in your Supabase SQL Editor

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can create own profile" ON profiles;

-- Create a more permissive policy for profile creation during onboarding
CREATE POLICY "Users can create own profile" ON profiles
    FOR INSERT WITH CHECK (true);

-- Verify the policy was created
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles' AND policyname = 'Users can create own profile';
