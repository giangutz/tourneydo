# 🚀 Quick Fix for RLS Policy Error

## The Issue
```
Profile error: new row violates row-level security policy for table "profiles"
```

**Cause:** Row Level Security (RLS) policies are blocking Clerk users because they expect Supabase auth.

## The Solution
Run the simplified setup that disables RLS and uses application-level authorization instead.

## Steps to Fix (2 minutes)

### 1. Go to Supabase SQL Editor
- Open your Supabase dashboard
- SQL Editor → New Query

### 2. Run the Simple Setup
- Copy **ALL** contents of `supabase/clerk-simple-setup.sql`
- Paste into SQL editor
- Click "Run"

### 3. Test Profile Completion
- Go back to your app
- Try completing your profile
- Should work perfectly now!

## What This Does
- ✅ **Disables RLS** that conflicts with Clerk
- ✅ **Keeps TEXT IDs** for Clerk compatibility  
- ✅ **Grants permissions** for database access
- ✅ **Creates all tables** needed for TourneyDo

## Expected Result
```
✅ Profile created successfully
✅ Team created successfully (if coach)
✅ Clerk metadata updated successfully
✅ Profile setup complete! Redirecting to dashboard...
```

**Run `clerk-simple-setup.sql` now and try again!** 🎯
