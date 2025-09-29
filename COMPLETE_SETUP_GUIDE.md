# 🚀 Complete TourneyDo Setup Guide

## 📋 **System Overview**

TourneyDo is now a complete Competition Management System with:
- **Enhanced Sidebar** - Collapsible navigation with member avatars
- **Members Module** - Team management with role-based permissions
- **Email System** - Professional branded notifications with SMTP integration
- **Real-time Notifications** - Instant updates for all tournament events

## 🗄️ **Database Setup**

### **1. Run Database Migration**

```bash
# Apply the complete schema
supabase db reset

# Or apply the migration specifically
supabase migration up
```

### **2. Verify Tables Created**

The following tables should now exist:
- ✅ `profiles` - User profiles with roles
- ✅ `tournaments` - Tournament management
- ✅ `teams` - Coach team management
- ✅ `athletes` - Athlete profiles
- ✅ `members` - Organizer team members ⭐ **NEW**
- ✅ `tournament_members` - Member-tournament assignments ⭐ **NEW**
- ✅ `email_preferences` - User email settings ⭐ **NEW**
- ✅ `email_logs` - Email delivery tracking ⭐ **NEW**

### **3. Database Policies**

All tables have proper Row Level Security (RLS) policies:
- **Members** - Organizers manage their team members
- **Tournament Members** - Role-based tournament access
- **Email Preferences** - Users control their own settings
- **Email Logs** - Service role access for system monitoring

## 📧 **Email System Configuration**

### **1. Deploy Supabase Edge Function**

```bash
# Deploy the email function
supabase functions deploy send-email

# Verify deployment
supabase functions list
```

### **2. Configure SMTP Environment Variables**

In your Supabase Dashboard → Settings → Edge Functions:

```bash
# Set your SMTP server credentials
supabase secrets set SMTP_HOST=your-smtp-server.com
supabase secrets set SMTP_USER=your-smtp-username
supabase secrets set SMTP_PASS=your-smtp-password
supabase secrets set FROM_EMAIL=noreply@tourneydo.com

# Set application URL
supabase secrets set NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### **3. Test Email Function**

```bash
# Test the email function
supabase functions invoke send-email --data '{
  "to": "test@example.com",
  "subject": "Test Email",
  "html": "<h1>Hello from TourneyDo!</h1>",
  "from": "noreply@tourneydo.com"
}'
```

## 🔧 **Application Configuration**

### **1. Environment Variables**

Update your `.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Clerk Configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your-clerk-key
CLERK_SECRET_KEY=your-clerk-secret

# Email Configuration
NEXT_PUBLIC_FROM_EMAIL=noreply@tourneydo.com
NEXT_PUBLIC_APP_URL=https://your-domain.com

# SMTP Configuration (for Edge Function)
SMTP_HOST=your-smtp-server.com
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
```

### **2. Add Notification Provider**

Update your main layout to include notifications:

```typescript
// app/layout.tsx or app/dashboard/layout.tsx
import { NotificationProvider } from '@/components/providers/notification-provider';

export default function Layout({ children }) {
  return (
    <html>
      <body>
        <NotificationProvider>
          {children}
        </NotificationProvider>
      </body>
    </html>
  );
}
```

### **3. Install Required Dependencies**

```bash
# Install any missing UI components
npx shadcn@latest add avatar dialog dropdown-menu textarea switch

# Verify all components are installed
ls components/ui/
```

## 🎯 **Feature Testing Guide**

### **1. Members Module Testing**

#### **Add Team Members:**
1. Login as an organizer
2. Navigate to `/dashboard/members`
3. Click "Add Member" button
4. Fill out member form with invitation email
5. Verify invitation email is sent
6. Check member appears in list with correct role

#### **Member Avatar Display:**
1. Add 2+ team members
2. Check header shows organizer + member avatars
3. Click "+" button to see member overview modal
4. Verify "Manage All Members" link works

#### **Member Management:**
1. Test member search and filtering
2. Try activating/deactivating members
3. Test member deletion with confirmation
4. Verify member role badges display correctly

### **2. Email System Testing**

#### **Member Invitations:**
1. Add new member with "Send invitation email" checked
2. Check email received with proper branding
3. Verify role-specific descriptions in email
4. Test invitation link functionality

#### **Tournament Notifications:**
1. Create a new tournament
2. Verify coaches receive creation notification
3. Update tournament details
4. Check update notifications are sent
5. Cancel tournament and verify cancellation emails

#### **Registration Emails:**
1. Register athlete for tournament
2. Verify coach receives confirmation email
3. Approve/reject registration as organizer
4. Check status update emails are sent

#### **Result Notifications:**
1. Add tournament results
2. Verify coaches receive result emails
3. Test podium finish notifications (1st, 2nd, 3rd)
4. Check celebration styling for achievements

### **3. Email Preferences Testing**

#### **Settings Integration:**
1. Navigate to `/dashboard/settings`
2. Locate "Notification Preferences" section
3. Toggle different email preferences
4. Save settings and verify they persist

#### **Preference Enforcement:**
1. Disable "Tournament reminders" in settings
2. Create tournament reminder
3. Verify no email is sent to that user
4. Re-enable and test email is sent again

## 🔍 **Troubleshooting Guide**

### **Common Issues & Solutions**

#### **Email Function Not Working:**
```bash
# Check function logs
supabase functions logs send-email

# Verify environment variables
supabase secrets list

# Test function directly
supabase functions invoke send-email --data '{"to":"test@example.com","subject":"Test","html":"<p>Test</p>"}'
```

#### **Database Connection Issues:**
```bash
# Reset database if needed
supabase db reset

# Check migration status
supabase migration list

# Apply specific migration
supabase migration up --include-all
```

#### **Member Avatars Not Showing:**
1. Check if members table has data
2. Verify organizer has active members
3. Check avatar URLs are valid
4. Ensure proper permissions in RLS policies

#### **Email Preferences Not Working:**
1. Verify email_preferences table exists
2. Check if user has preference record
3. Test preference creation for new users
4. Verify RLS policies allow user access

### **Performance Optimization**

#### **Database Indexes:**
All necessary indexes are created automatically:
- Member lookups by organizer and email
- Tournament member assignments
- Email log queries by status and date

#### **Email Rate Limiting:**
Consider implementing rate limiting for:
- Member invitation emails
- Bulk tournament notifications
- Result notification batches

## 📊 **Monitoring & Analytics**

### **Email Delivery Tracking**

Query email logs for monitoring:

```sql
-- Check email delivery rates
SELECT 
    status,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM email_logs 
WHERE sent_at >= NOW() - INTERVAL '7 days'
GROUP BY status;

-- Recent email activity
SELECT 
    to_email,
    subject,
    status,
    sent_at
FROM email_logs 
ORDER BY sent_at DESC 
LIMIT 20;
```

### **Member Activity Tracking**

Monitor member engagement:

```sql
-- Active members by organizer
SELECT 
    p.full_name as organizer,
    COUNT(m.id) as total_members,
    COUNT(CASE WHEN m.status = 'active' THEN 1 END) as active_members
FROM profiles p
LEFT JOIN members m ON p.id = m.organizer_id
WHERE p.role = 'organizer'
GROUP BY p.id, p.full_name;

-- Tournament member assignments
SELECT 
    t.name as tournament,
    COUNT(tm.id) as assigned_members,
    COUNT(CASE WHEN tm.role = 'admin' THEN 1 END) as admins,
    COUNT(CASE WHEN tm.role = 'bracket_manager' THEN 1 END) as bracket_managers
FROM tournaments t
LEFT JOIN tournament_members tm ON t.id = tm.tournament_id
GROUP BY t.id, t.name;
```

## 🎉 **Production Deployment Checklist**

### **Pre-Deployment:**
- [ ] All environment variables configured
- [ ] Database migration applied successfully
- [ ] Email function deployed and tested
- [ ] SMTP server credentials verified
- [ ] Email templates tested across devices
- [ ] Member management functionality tested
- [ ] Email preferences working correctly

### **Post-Deployment:**
- [ ] Monitor email delivery rates
- [ ] Check error logs for issues
- [ ] Verify member invitations working
- [ ] Test tournament notifications
- [ ] Monitor database performance
- [ ] Set up email delivery alerts

### **Security Checklist:**
- [ ] RLS policies properly configured
- [ ] SMTP credentials secured
- [ ] Email logs access restricted
- [ ] Member data properly isolated
- [ ] API rate limiting configured

## 🚀 **Your TourneyDo System is Complete!**

You now have a **production-ready tournament management system** with:

✅ **Enhanced Navigation** - Collapsible sidebar with member avatars
✅ **Team Management** - Complete member system with role-based permissions
✅ **Professional Email System** - Branded notifications for all events
✅ **Real-time Updates** - Instant notifications for tournament changes
✅ **User Preferences** - Granular email control settings
✅ **Scalable Architecture** - Built for growth and performance

Your tournament organizers can now:
- **Build professional teams** with clear role hierarchies
- **Send branded invitations** to team members
- **Manage tournaments efficiently** with automated notifications
- **Provide excellent user experience** with real-time updates
- **Scale their operations** with robust team management tools

**Ready to manage tournaments like a pro!** 🏆📧👥
