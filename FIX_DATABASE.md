# 🔧 Fix Database for Clerk Integration

## The Problem
The error shows: `invalid input syntax for type uuid: "user_33GhS24iHkWW5XQWQSU1vilsCcC"`

**Cause:** Clerk uses string IDs like `user_xxxxx` but our database expects UUID format.

## The Solution
Run the Clerk-compatible database setup script that uses TEXT instead of UUID for user IDs.

## Steps to Fix

### 1. Go to Supabase SQL Editor
- Open your Supabase dashboard
- Click "SQL Editor" in the sidebar
- Click "New Query"

### 2. Run the Fix Script
- Copy the entire contents of `supabase/clerk-compatible-setup.sql`
- Paste into the SQL editor
- Click "Run"

### 3. Test Profile Completion
- Go back to your app
- Try completing your profile again
- The debug form should now show success!

## What the Fix Does

### Changes Made:
- ✅ **profiles.id**: UUID → TEXT (for Clerk user IDs)
- ✅ **tournaments.organizer_id**: UUID → TEXT
- ✅ **teams.coach_id**: UUID → TEXT
- ✅ **athletes.profile_id**: UUID → TEXT
- ✅ **RLS policies**: Updated for TEXT IDs
- ✅ **All other tables**: Keep UUID for internal IDs

### Database Structure:
```sql
-- Before (broken)
profiles.id UUID  -- ❌ Can't store "user_xxxxx"

-- After (fixed)  
profiles.id TEXT  -- ✅ Can store "user_xxxxx"
```

## Expected Result
After running the script, your profile completion should work perfectly:

```
✅ Profile created successfully
✅ Team created (if coach)
✅ Clerk metadata updated
✅ Redirected to dashboard
```

## Run the script now and try profile completion again! 🚀
