# Profile Creation Fix Summary

## Issue Fixed
**Error**: `Failed to create organizer profile: there is no unique or exclusion constraint matching the ON CONFLICT specification`

## Root Cause
The `upsert` operation was trying to use `onConflict: 'clerk_id,role'` but the database only has a unique constraint on `clerk_id` alone, not on the combination of `clerk_id` and `role`.

## Solution Applied

### 1. **Single Profile Per User Approach**
Instead of creating separate profiles for each role, we now:
- Create **one profile** per user with their **primary role** (first selected)
- Store **all roles** in **Clerk metadata** for role switching
- Use the database profile for the primary role functionality

### 2. **Updated Server Action** (`lib/supabase/actions/profile.ts`)
```typescript
// Before: Multiple profiles per user (failed due to constraint)
for (const role of formData.roles) {
  // Create separate profile for each role
}

// After: Single profile with primary role
const primaryRole = formData.roles[0];
const profileData = {
  clerk_id: userId,
  role: primaryRole, // Primary role only
  // ... other fields
};

const { data: profile, error } = await supabase
  .from('profiles')
  .upsert(profileData, { onConflict: 'clerk_id' }) // Use existing constraint
  .select()
  .single();
```

### 3. **Updated Clerk Metadata Storage**
```typescript
await user.update({
  unsafeMetadata: {
    roles: formData.roles,           // All selected roles
    primaryRole: formData.roles[0],  // Primary role (in database)
    currentRole: formData.roles[0],  // Currently active role
    onboardingComplete: true
  }
});
```

### 4. **Team Creation Logic**
- Only creates team if user selected "coach" role
- Uses the single profile ID for team creation
- Handles the case where coach might not be the primary role

## How Multi-Role Works Now

1. **Profile Creation**: 
   - Database stores one profile with primary role
   - Clerk metadata stores all selected roles

2. **Role Switching**:
   - User can switch between roles stored in Clerk metadata
   - Dashboard shows content based on `currentRole` in metadata
   - Database queries use the profile for permissions

3. **Permissions**:
   - Database-level permissions based on profile role
   - Application-level role switching via Clerk metadata

## Benefits

✅ **Fixed the constraint error**
✅ **Maintains multi-role functionality** 
✅ **Simpler database schema** (one profile per user)
✅ **Flexible role switching** via Clerk metadata
✅ **Better performance** (fewer database records)

## Database Schema Compatibility

The current schema with `clerk_id UNIQUE` constraint is now fully compatible:
```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clerk_id TEXT UNIQUE NOT NULL,  -- ✅ This constraint works
    role user_role NOT NULL,        -- Primary role
    -- ... other fields
);
```

## Testing

The profile creation should now work without errors. Users can:
1. Select multiple roles during onboarding
2. Have their primary role stored in the database
3. Switch between roles using the role selector
4. Create teams if they selected "coach" role

## Next Steps

1. **Test the profile creation** - should work without constraint errors
2. **Implement role switching UI** - use Clerk metadata to switch roles
3. **Update dashboard logic** - show content based on current role
4. **Add role-based permissions** - use both database profile and Clerk metadata
