# Supabase Integration

This directory contains the Supabase configuration and database schema for the Tourneydo application.

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be fully initialized
3. Go to Settings → API to get your project credentials

### 2. Configure Environment Variables

Update your `.env.local` file with your Supabase credentials:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Run Database Migrations

Execute the SQL migration file in your Supabase SQL editor:

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase/migrations/001_initial_schema.sql`
4. Run the migration

### 4. Configure Authentication

Since we're using Clerk for authentication, we need to set up Supabase to work with Clerk:

1. In Supabase Dashboard, go to Authentication → Settings
2. Disable "Enable email confirmations" (Clerk handles this)
3. Go to Authentication → Hooks
4. The migration file includes a trigger that automatically creates profiles when users sign up through Clerk

## Database Schema

### Tables

#### `profiles`
Extends Clerk users with additional tournament management data:
- `id`: References `auth.users(id)`
- `organization_name`: User's organization name
- `organization_type`: Type of organization
- `onboarding_completed`: Whether user has completed onboarding
- `role`: User role for permissions

#### `organizations`
Represents taekwondo gyms, federations, etc.:
- `name`: Organization name
- `type`: Organization type (gym, federation, etc.)
- `owner_id`: References the profile of the owner

#### `tournaments`
Tournament events:
- `title`, `description`: Tournament details
- `start_date`, `end_date`: Event dates
- `location`: Where the tournament takes place
- `organizer_id`: References the profile of the organizer
- `status`: Current tournament status

#### `athletes`
Individual athletes:
- `first_name`, `last_name`: Athlete name
- `date_of_birth`, `gender`: Personal information
- `belt_rank`, `weight_class`: Taekwondo ranking
- `organization_id`: References the athlete's organization

#### `registrations`
Links athletes to tournaments:
- `tournament_id`, `athlete_id`: Foreign keys
- `status`: Registration status
- `payment_status`: Payment information

## Row Level Security (RLS)

The database includes comprehensive RLS policies:

- **Profiles**: Users can only access their own profile
- **Organizations**: Users can access organizations they own
- **Tournaments**: Public read access for published tournaments, owner-only write access
- **Athletes**: Organization owners can manage athletes in their organizations
- **Registrations**: Complex policies based on tournament and athlete ownership

## Integration with Clerk

The system seamlessly integrates Clerk authentication with Supabase:

1. **User Creation**: When users sign up via Clerk, a profile is automatically created in Supabase
2. **Session Management**: Clerk handles authentication, Supabase handles data
3. **Metadata Sync**: User onboarding data is stored in both Clerk metadata and Supabase profiles

## API Usage

### Client-Side Queries

```typescript
import { createClientComponentClient } from '@/lib/supabase'

const supabase = createClientComponentClient()

// Fetch user profile
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single()
```

### Server-Side Queries

```typescript
import { createServerComponentClient } from '@/lib/supabase'

const supabase = createServerComponentClient()

// Fetch tournaments for the current user
const { data: tournaments } = await supabase
  .from('tournaments')
  .select('*')
  .eq('organizer_id', userId)
```

### Admin Operations

```typescript
import { createAdminClient } from '@/lib/supabase'

const supabase = createAdminClient()

// Admin operations (bypass RLS)
const { data } = await supabase
  .from('profiles')
  .select('*')
```

## Development Tips

### Local Development
- Use the Supabase CLI for local development: `supabase start`
- Reset local database: `supabase db reset`
- View local dashboard: `supabase dashboard`

### Testing
- The test suite includes authentication tests
- Use the admin client for test data setup
- Mock Supabase responses for unit tests

### Deployment
- Ensure environment variables are set in production
- Run migrations before deploying application code
- Monitor RLS policies for security

## Troubleshooting

### Common Issues

1. **RLS Policy Errors**: Check that user is authenticated and has proper permissions
2. **Foreign Key Constraints**: Ensure referenced records exist before creating dependent records
3. **Type Errors**: Use the generated types from `types/database.ts`

### Debug Queries

Enable query logging in development:

```typescript
const supabase = createClientComponentClient()
supabase.supabaseUrl // Check if URL is correct
```

### Reset Database

If you need to reset the database during development:

```sql
-- In Supabase SQL Editor
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

Then re-run the migration file.

## Security Considerations

- **RLS Policies**: All tables have comprehensive row-level security
- **Service Role**: Only used for admin operations, never in client code
- **API Keys**: Anon key is safe for client use, service role key is secret
- **Authentication**: Clerk handles auth, Supabase enforces data access

## Performance Optimization

- **Indexes**: Created on frequently queried columns
- **Pagination**: Implement for large datasets
- **Caching**: Use appropriate caching strategies
- **Connection Pooling**: Supabase handles this automatically
