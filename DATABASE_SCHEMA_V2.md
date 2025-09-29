# TourneyDo Database Schema v2.0

## Overview

This document describes the comprehensive, scalable database schema for TourneyDo - a Competition Management System for taekwondo tournaments. The schema is designed with proper UUID support, Clerk authentication integration, comprehensive RLS policies, and organized query structure.

## Key Features

- ✅ **UUID Primary Keys**: All tables use UUID primary keys for better scalability
- ✅ **Clerk Integration**: Proper separation of Clerk user IDs and internal UUIDs
- ✅ **Row Level Security**: Comprehensive RLS policies for all tables
- ✅ **Type Safety**: Strongly typed with proper enums and constraints
- ✅ **Organized Queries**: Reusable query functions organized by feature
- ✅ **Simplified Belt Ranks**: Only 6 belt ranks (White, Yellow, Blue, Red, Brown, Black)
- ✅ **Performance Optimized**: Proper indexes and triggers

## Database Structure

### Core Tables

#### 1. Profiles
- **Purpose**: User profiles linked to Clerk authentication
- **Key Fields**: `clerk_id` (Clerk user ID), `role` (organizer/coach/athlete)
- **RLS**: Users can view/edit own profile, public profiles viewable by all

#### 2. Tournaments
- **Purpose**: Tournament management
- **Key Fields**: `organizer_id` (UUID), `status`, `is_public`
- **RLS**: Public tournaments viewable by all, organizers manage own tournaments

#### 3. Teams
- **Purpose**: Team management by coaches
- **Key Fields**: `coach_id` (UUID), `is_active`
- **RLS**: Coaches manage own teams, athletes can view their teams

#### 4. Athletes
- **Purpose**: Athlete profiles and information
- **Key Fields**: `profile_id` (optional), `team_id`, `belt_rank`, `weight`, `height`
- **RLS**: Athletes manage own profile, coaches manage team athletes

#### 5. Tournament Registrations
- **Purpose**: Athlete registrations for tournaments
- **Key Fields**: `tournament_id`, `athlete_id`, `payment_status`, `weight_recorded`
- **RLS**: Complex policies for athletes, coaches, and organizers

#### 6. Divisions
- **Purpose**: Tournament divisions and categories
- **Key Fields**: `category` (gradeschool/cadet/junior/senior), `participant_count`
- **RLS**: Public for public tournaments, organizers manage own

#### 7. Division Participants
- **Purpose**: Athletes assigned to divisions
- **Key Fields**: `division_id`, `athlete_id`, `seed_number`
- **RLS**: View permissions based on tournament visibility

## Belt Rank System

The new schema uses a simplified 6-rank system:

```typescript
type BeltRank = 'white' | 'yellow' | 'blue' | 'red' | 'brown' | 'black';
```

**Ranking Order:**
1. White (beginner)
2. Yellow
3. Blue
4. Red
5. Brown
6. Black (advanced)

## Migration Guide

### 1. Run Migrations

```bash
# Apply the new schema
psql -h your-host -U your-user -d your-db -f supabase/migrations/001_new_schema.sql

# Apply RLS policies
psql -h your-host -U your-user -d your-db -f supabase/migrations/002_rls_policies.sql

# Optional: Add seed data for development
psql -h your-host -U your-user -d your-db -f supabase/migrations/003_seed_data.sql
```

### 2. Update Application Code

Replace direct Supabase calls with organized query functions:

```typescript
// Old way
const { data } = await supabase.from('profiles').select('*').eq('id', userId);

// New way
import { profileQueries } from '@/lib/database/queries';
const profile = await profileQueries.getById(userId);
```

## Query Organization

All database queries are organized in `/lib/database/queries/`:

- **`profiles.ts`** - User profile operations
- **`tournaments.ts`** - Tournament management
- **`teams.ts`** - Team operations
- **`athletes.ts`** - Athlete management
- **`registrations.ts`** - Tournament registrations
- **`divisions.ts`** - Division and bracket management
- **`index.ts`** - Centralized exports

### Example Usage

```typescript
import { 
  profileQueries, 
  tournamentQueries, 
  registrationQueries 
} from '@/lib/database/queries';

// Get user profile by Clerk ID
const profile = await profileQueries.getByClerkId(clerkId);

// Get public tournaments
const tournaments = await tournamentQueries.getPublic();

// Register athlete for tournament
const registration = await registrationQueries.create({
  tournament_id: tournamentId,
  athlete_id: athleteId,
  team_id: teamId,
  payment_status: 'pending',
  payment_amount: tournament.entry_fee
});
```

## Security Features

### Row Level Security (RLS)

Every table has comprehensive RLS policies:

- **Profiles**: Users manage own profile, view public profiles
- **Tournaments**: Organizers manage own, public tournaments viewable
- **Teams**: Coaches manage own teams, athletes view their teams
- **Athletes**: Multi-level access (self, coach, organizer)
- **Registrations**: Complex policies for all stakeholders

### Data Validation

- Email format validation
- Phone number format validation
- Age constraints (minimum 5 years old)
- Weight/height positive values
- Proper date relationships (tournament date >= registration deadline)

## Performance Optimizations

### Indexes
- Primary keys (UUID)
- Foreign key relationships
- Frequently queried fields (status, dates, active flags)
- Composite indexes for complex queries

### Triggers
- Automatic `updated_at` timestamps
- Division participant count maintenance
- Data consistency enforcement

## Development Setup

### 1. Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your-clerk-key
CLERK_SECRET_KEY=your-clerk-secret
```

### 2. Type Generation

```bash
# Generate TypeScript types from schema
npx supabase gen types typescript --project-id your-project > lib/types/supabase.ts
```

### 3. Testing

```typescript
// Example test
import { profileQueries } from '@/lib/database/queries';

describe('Profile Queries', () => {
  it('should create and retrieve profile', async () => {
    const profile = await profileQueries.upsert({
      clerk_id: 'test_clerk_id',
      email: 'test@example.com',
      full_name: 'Test User',
      role: 'athlete'
    });
    
    expect(profile).toBeDefined();
    expect(profile.email).toBe('test@example.com');
  });
});
```

## Best Practices

### 1. Always Use Query Functions
```typescript
// ✅ Good
import { athleteQueries } from '@/lib/database/queries';
const athletes = await athleteQueries.getByTeam(teamId);

// ❌ Avoid
const { data } = await supabase.from('athletes').select('*').eq('team_id', teamId);
```

### 2. Handle Errors Properly
```typescript
const tournament = await tournamentQueries.getById(id);
if (!tournament) {
  return notFound();
}
```

### 3. Use Type Safety
```typescript
import type { Tournament, BeltRank } from '@/lib/database/queries';

const createTournament = (data: Omit<Tournament, 'id' | 'created_at' | 'updated_at'>) => {
  return tournamentQueries.create(data);
};
```

### 4. Leverage RLS
```typescript
// RLS automatically filters based on user permissions
// No need for manual permission checks in most cases
const myTournaments = await tournamentQueries.getByOrganizer(organizerId);
```

## Troubleshooting

### Common Issues

1. **RLS Policy Errors**: Check if user is authenticated and has proper role
2. **UUID Format**: Ensure UUIDs are properly formatted
3. **Foreign Key Violations**: Verify referenced records exist
4. **Type Mismatches**: Update imports after schema changes

### Debug Queries

```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'tournaments';

-- Verify user context
SELECT auth.jwt() ->> 'sub' as user_id;

-- Check constraints
SELECT conname, contype FROM pg_constraint WHERE conrelid = 'athletes'::regclass;
```

## Future Enhancements

- [ ] Add audit logging
- [ ] Implement soft deletes
- [ ] Add data archiving
- [ ] Performance monitoring
- [ ] Backup strategies
- [ ] Multi-tenant support

---

This schema provides a solid foundation for the TourneyDo application with proper security, performance, and maintainability considerations.
