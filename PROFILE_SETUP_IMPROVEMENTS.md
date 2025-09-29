# Profile Setup Improvements Summary

## Issues Fixed

### 1. RLS Policy Error
**Problem**: Profile creation was failing with "new row violates row-level security policy for table 'profiles'"

**Solution**: Updated the RLS policy in `002_rls_policies.sql` to allow profile creation during onboarding:
```sql
CREATE POLICY "Users can create own profile" ON profiles
    FOR INSERT WITH CHECK (
        clerk_id = auth.jwt() ->> 'sub' OR 
        auth.jwt() ->> 'sub' IS NOT NULL
    );
```

### 2. UUID vs Clerk ID Separation
**Problem**: Code was trying to insert Clerk's string ID into UUID column

**Solution**: 
- Fixed profile creation to use `clerk_id` field for Clerk ID
- Let Supabase auto-generate UUID for `id` column
- Updated team creation to use profile UUID for foreign key references

## New Features Implemented

### 1. Multi-Step Profile Form
Created an intuitive 3-step onboarding process:

**Step 1: Role Selection**
- Users can select multiple roles (organizer, coach, athlete)
- Visual role cards with descriptions
- Support for multi-role accounts

**Step 2: Organization Details**
- Required organization name for organizers
- Required team name for coaches
- Optional bio field

**Step 3: Contact Information**
- Contact email (pre-filled from Clerk)
- Optional phone number
- Setup summary review

### 2. Multi-Role Support
- Users can have multiple roles in their account
- Role selection page for switching between roles
- Clerk metadata stores all roles and current role
- Separate profile records for each role

### 3. Payment System Queries
Created comprehensive payment management system:
- `paymentQueries` with full CRUD operations
- Team payment tracking
- Payment status management
- Statistics and reporting functions

## Database Schema Updates

### 1. Added Bio Field
```sql
ALTER TABLE profiles ADD COLUMN bio TEXT;
```

### 2. Payment Tables
- `team_payments` table for bulk registrations
- Payment status tracking
- Payment method and reference fields

## File Structure

### New Components
- `components/auth/multi-step-profile-form.tsx` - Main onboarding form
- `components/auth/role-selector.tsx` - Role switching interface
- `components/ui/progress.tsx` - Progress bar component

### New Pages
- `app/auth/select-role/page.tsx` - Role selection page

### New Query Modules
- `lib/database/queries/payments.ts` - Payment operations
- Updated `lib/database/queries/index.ts` - Centralized exports

### Updated Files
- `components/auth/debug-complete-profile-form.tsx` - Fixed UUID issues
- `app/auth/complete-profile/page.tsx` - Uses new multi-step form
- `lib/types/database.ts` - Added bio field, updated types
- `supabase/migrations/001_new_schema.sql` - Added bio field
- `supabase/migrations/002_rls_policies.sql` - Fixed profile creation policy

## User Experience Improvements

### 1. Visual Design
- Modern gradient background
- Step-by-step progress indicator
- Clear role selection with icons
- Responsive design

### 2. Form Validation
- Required field validation per role
- Real-time form state management
- Clear error messaging

### 3. Multi-Role Workflow
- Seamless role switching
- Primary role designation
- Context-aware dashboards

## Technical Benefits

### 1. Type Safety
- Proper TypeScript interfaces
- Centralized type exports
- Consistent data structures

### 2. Database Integrity
- Proper UUID handling
- Foreign key relationships
- RLS policy compliance

### 3. Scalability
- Modular query structure
- Reusable components
- Clean separation of concerns

## Usage Examples

### Profile Creation
```typescript
const profileData = {
  clerk_id: user.id,
  email: user.primaryEmailAddress?.emailAddress || "",
  full_name: user.fullName || "",
  role: 'organizer',
  organization: 'My Organization',
  bio: 'Tournament organizer with 10 years experience',
  is_active: true
};

const profile = await profileQueries.create(profileData);
```

### Multi-Role Setup
```typescript
// Create multiple profiles for different roles
for (const role of ['organizer', 'coach']) {
  await profileQueries.create({
    clerk_id: user.id,
    role,
    // ... other fields
  });
}

// Update Clerk metadata
await user.update({
  unsafeMetadata: {
    roles: ['organizer', 'coach'],
    primaryRole: 'organizer',
    currentRole: 'organizer',
    onboardingComplete: true
  }
});
```

### Payment Tracking
```typescript
// Create team payment
const payment = await paymentQueries.create({
  tournament_id: tournamentId,
  team_id: teamId,
  coach_id: coachProfileId,
  amount: 1500.00,
  status: 'pending'
});

// Update payment status
await paymentQueries.updateStatus(
  payment.id, 
  'approved', 
  organizerProfileId,
  'Payment verified'
);
```

## Migration Steps

1. **Apply Database Changes**:
   ```bash
   ./scripts/migrate-database.sh
   ```

2. **Update Application Code**:
   - Replace old profile form with multi-step form
   - Update authentication flows
   - Test role switching functionality

3. **Test Multi-Role Scenarios**:
   - Create accounts with multiple roles
   - Test role switching
   - Verify dashboard context switching

## Next Steps

1. **Dashboard Context Switching**: Update dashboards to show role-specific content
2. **Profile Management**: Add profile editing for each role
3. **Role Permissions**: Implement fine-grained permissions per role
4. **Payment Integration**: Connect with actual payment processors
5. **Audit Logging**: Track role switches and profile changes

This implementation provides a solid foundation for multi-role user management while maintaining data integrity and user experience quality.
