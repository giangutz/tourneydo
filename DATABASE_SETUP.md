# TourneyDo Database Setup Guide

## Quick Fix for Database Error

The "Database error saving new user" issue occurs because the database tables haven't been created in your Supabase instance yet. Here's how to fix it:

## Step 1: Set up Supabase Database

1. **Go to your Supabase Dashboard**
   - Visit [supabase.com](https://supabase.com)
   - Sign in and go to your project

2. **Open the SQL Editor**
   - In your Supabase dashboard, click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Run the Database Setup Script**
   - Copy the entire contents of `supabase/setup-database.sql`
   - Paste it into the SQL editor
   - Click "Run" to execute the script

This will create all the necessary tables, types, indexes, and security policies.

## Step 2: Verify Environment Variables

Make sure your `.env.local` file has the correct Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=your_supabase_anon_key
```

You can find these values in your Supabase dashboard under Settings > API.

## Step 3: Test the Sign-up

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Navigate to the sign-up page**:
   - Go to `http://localhost:3001/auth/sign-up`
   - Fill out the form and try creating an account

## What the Database Setup Creates

The setup script creates:

### Core Tables
- `profiles` - User profiles with roles (organizer, coach, athlete)
- `tournaments` - Tournament information and settings
- `teams` - Coach teams for managing athletes
- `athletes` - Athlete profiles and information
- `tournament_registrations` - Registration records
- `divisions` - Auto-generated tournament divisions
- `brackets` - Tournament brackets and matches
- `matches` - Individual match results
- `tournament_results` - Final tournament results

### Security Features
- Row Level Security (RLS) policies
- Role-based access control
- Automatic timestamp updates
- Data integrity constraints

## Troubleshooting

### If you still get database errors:

1. **Check the browser console** for detailed error messages
2. **Verify RLS policies** are working correctly
3. **Check Supabase logs** in the dashboard under Logs > Database

### Common Issues:

1. **"relation does not exist"** - The setup script wasn't run successfully
2. **"permission denied"** - RLS policies are blocking the operation
3. **"duplicate key value"** - Trying to create a user that already exists

### Reset Database (if needed):

If you need to start fresh, you can drop all tables and re-run the setup:

```sql
-- WARNING: This will delete all data!
DROP TABLE IF EXISTS tournament_results CASCADE;
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS brackets CASCADE;
DROP TABLE IF EXISTS division_participants CASCADE;
DROP TABLE IF EXISTS divisions CASCADE;
DROP TABLE IF EXISTS tournament_registrations CASCADE;
DROP TABLE IF EXISTS athletes CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS tournaments CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop custom types
DROP TYPE IF EXISTS match_status CASCADE;
DROP TYPE IF EXISTS gender CASCADE;
DROP TYPE IF EXISTS belt_rank CASCADE;
DROP TYPE IF EXISTS tournament_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
```

Then re-run the setup script.

## Next Steps

Once the database is set up:

1. **Create your first organizer account** through the sign-up form
2. **Test the dashboard** functionality
3. **Create a tournament** to test the full workflow
4. **Invite coaches** to register athletes

The application should now work without database errors!
