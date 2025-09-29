# Database Migration Instructions

## Issue Resolution

The profile creation is failing due to RLS policies. Here's how to fix it:

## Step 1: Apply Database Migrations

You need to run the database migrations to update the schema and RLS policies:

```bash
# Navigate to your project directory
cd /Users/gian/Downloads/tourneydo

# Make the migration script executable
chmod +x scripts/migrate-database.sh

# Run the migration (you'll need your database credentials)
./scripts/migrate-database.sh
```

**OR** manually apply the SQL files in your Supabase dashboard:

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run the following files in order:
   - `supabase/migrations/001_new_schema.sql`
   - `supabase/migrations/002_rls_policies.sql`
   - `supabase/migrations/003_seed_data.sql` (optional, for test data)

## Step 2: Verify RLS Policy

The key fix is in the RLS policy for profile creation:

```sql
-- This policy allows authenticated users to create their own profiles
CREATE POLICY "Users can create own profile" ON profiles
    FOR INSERT WITH CHECK (
        clerk_id = auth.jwt() ->> 'sub'
    );
```

## Step 3: Test Profile Creation

After applying the migrations:

1. Try the profile creation form again
2. The server action should now work properly
3. Multiple roles will be supported

## Alternative Quick Fix

If you're still having issues, you can temporarily disable RLS for testing:

```sql
-- TEMPORARY: Disable RLS for profiles table (NOT for production!)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
```

**Remember to re-enable RLS after testing:**

```sql
-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

## What Was Fixed

1. **RLS Policy**: Updated to properly allow profile creation during onboarding
2. **Server Action**: Created `lib/actions/profile.ts` for server-side profile creation
3. **Multi-Step Form**: Implemented intuitive 3-step onboarding process
4. **Multi-Role Support**: Users can now have multiple roles
5. **Payment Queries**: Added comprehensive payment management system

## Files Updated

- `supabase/migrations/002_rls_policies.sql` - Fixed RLS policy
- `lib/actions/profile.ts` - New server action for profile creation
- `components/auth/multi-step-profile-form.tsx` - New onboarding form
- `components/auth/role-selector.tsx` - Role switching interface
- `lib/database/queries/payments.ts` - Payment management queries

## Next Steps

1. Apply the database migrations
2. Test the new profile creation flow
3. Verify multi-role functionality
4. Test role switching after onboarding

The new system supports:
- Multiple roles per user
- Intuitive step-by-step onboarding
- Role-specific required fields
- Secure server-side profile creation
- Comprehensive payment tracking
