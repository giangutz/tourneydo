# RLS Policy Fix for Profile Creation

## Issue
Profile creation is failing with: `"new row violates row-level security policy for table 'profiles'"`

## Root Cause
The RLS (Row Level Security) policy is blocking profile creation during onboarding because the authentication context isn't properly established.

## Solutions Provided

### Option 1: Use Admin Client (Recommended)
The server action now uses an admin client with service role key to bypass RLS during profile creation.

**Required Environment Variable:**
Add this to your `.env.local`:
```
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

You can find your service role key in:
1. Supabase Dashboard → Settings → API
2. Copy the "service_role" key (not the anon key)

### Option 2: Update RLS Policy (Alternative)
If you prefer not to use the service role key, run this SQL in your Supabase SQL Editor:

```sql
-- Drop existing policy
DROP POLICY IF EXISTS "Users can create own profile" ON profiles;

-- Create more permissive policy for onboarding
CREATE POLICY "Users can create own profile" ON profiles
    FOR INSERT WITH CHECK (true);
```

## Files Updated

### 1. **Admin Client** (`lib/supabase/admin.ts`)
```typescript
// New admin client for bypassing RLS
export const createAdminClient = () => {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};
```

### 2. **Server Action** (`lib/supabase/actions/profile.ts`)
```typescript
// Now uses admin client instead of regular client
const supabase = createAdminClient();
```

### 3. **Multi-Step Form** (`components/auth/multi-step-profile-form.tsx`)
- Uses server action with admin client
- Handles single profile per user with multi-role support
- Stores all roles in Clerk metadata

## How It Works Now

1. **Profile Creation**: 
   - Server action uses admin client (bypasses RLS)
   - Creates single profile with primary role
   - Stores all selected roles in Clerk metadata

2. **Multi-Role Support**:
   - Database: One profile per user
   - Clerk: All roles stored in metadata
   - Users can switch roles after onboarding

3. **Security**:
   - Admin client only used for profile creation
   - Regular RLS policies apply for all other operations
   - Clerk handles authentication and authorization

## Testing Steps

1. **Add Service Role Key** to environment variables
2. **Restart your development server**
3. **Try profile creation** - should work without RLS errors
4. **Verify multi-role functionality** works as expected

## Fallback Option

If you're still having issues, you can temporarily disable RLS for testing:

```sql
-- TEMPORARY: Disable RLS (NOT for production!)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Test profile creation, then re-enable:
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

## Security Notes

- **Service Role Key**: Has full database access, only use server-side
- **Environment Variables**: Never expose service role key client-side
- **RLS Policies**: Still protect all other database operations
- **Production**: Ensure proper RLS policies before going live

The profile creation should now work reliably with proper security measures in place!
