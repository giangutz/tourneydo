# TourneyDo Troubleshooting Guide

## AuthApiError: Database error saving new user

This error typically occurs due to Supabase configuration issues. Here are the most common causes and solutions:

### 1. Check Environment Variables

Verify your `.env.local` file has the correct values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=your-anon-key
```

**How to find these values:**
1. Go to [supabase.com](https://supabase.com)
2. Open your project
3. Go to Settings → API
4. Copy the Project URL and anon/public key

### 2. Check Supabase Project Status

**Verify your project is active:**
1. Go to your Supabase dashboard
2. Check if the project shows as "Active" (green dot)
3. If it's paused, click "Unpause project"

### 3. Enable Email Authentication

**In your Supabase dashboard:**
1. Go to Authentication → Settings
2. Under "Auth Providers", make sure Email is enabled
3. Check "Enable email confirmations" if you want email verification

### 4. Check Email Settings

**If using email confirmation:**
1. Go to Authentication → Settings → Email Templates
2. Verify the "Confirm signup" template is configured
3. Make sure your site URL is correct in Settings → General

### 5. Database Setup

**Run the database setup script:**
1. Go to SQL Editor in Supabase
2. Copy and paste the contents of `supabase/setup-database.sql`
3. Click "Run"

### 6. Test with Debug Form

**Use the debug sign-up form:**
1. The sign-up page now uses a debug form
2. Click "Test Supabase Connection" first
3. Try signing up and check the debug information

### 7. Common Error Messages

**"Invalid API key"**
- Double-check your environment variables
- Make sure you're using the anon/public key, not the service role key
- Restart your development server after changing .env.local

**"Email not confirmed"**
- Check your email for confirmation link
- Or disable email confirmation in Supabase Auth settings

**"User already registered"**
- The email is already in use
- Try with a different email or reset the existing user

**"Database error"**
- Run the database setup script
- Check RLS policies are correctly configured

### 8. Reset and Start Fresh

**If nothing works, try this:**

1. **Delete the user from Supabase:**
   ```sql
   DELETE FROM auth.users WHERE email = 'your-email@example.com';
   ```

2. **Clear browser data:**
   - Clear localStorage and cookies for localhost
   - Or use an incognito window

3. **Restart development server:**
   ```bash
   npm run dev
   ```

### 9. Check Browser Console

**Look for additional error details:**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for red error messages
4. Check Network tab for failed requests

### 10. Supabase Logs

**Check server-side logs:**
1. Go to your Supabase dashboard
2. Click on "Logs" in the sidebar
3. Select "Auth" logs
4. Look for recent errors around your sign-up attempts

## Quick Test Checklist

- [ ] Environment variables are correct
- [ ] Supabase project is active
- [ ] Email auth is enabled
- [ ] Database tables exist (run setup script)
- [ ] Browser console shows no errors
- [ ] Using a fresh email address
- [ ] Development server restarted after env changes

## Still Having Issues?

If the debug form shows connection successful but sign-up still fails:

1. **Check the exact error message** in the debug output
2. **Look at Supabase Auth logs** for server-side errors
3. **Try a different email provider** (sometimes Gmail has issues)
4. **Disable email confirmation** temporarily for testing

The debug form will show you exactly where the process is failing, which will help identify the specific issue.
