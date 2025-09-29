#!/bin/bash

# TourneyDo Database Migration Script
# This script applies the new database schema with proper error handling

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DB_HOST=${DB_HOST:-"localhost"}
DB_PORT=${DB_PORT:-"5432"}
DB_NAME=${DB_NAME:-"postgres"}
DB_USER=${DB_USER:-"postgres"}

echo -e "${GREEN}🚀 TourneyDo Database Migration${NC}"
echo "=================================="

# Check if required environment variables are set
if [ -z "$DATABASE_URL" ] && [ -z "$DB_PASSWORD" ]; then
    echo -e "${RED}❌ Error: DATABASE_URL or DB_PASSWORD must be set${NC}"
    echo "Set DATABASE_URL or individual DB_* variables"
    exit 1
fi

# Function to run SQL file
run_sql_file() {
    local file=$1
    local description=$2
    
    echo -e "${YELLOW}📄 Running: $description${NC}"
    
    if [ -n "$DATABASE_URL" ]; then
        psql "$DATABASE_URL" -f "$file"
    else
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$file"
    fi
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Success: $description${NC}"
    else
        echo -e "${RED}❌ Failed: $description${NC}"
        exit 1
    fi
}

# Backup warning
echo -e "${YELLOW}⚠️  WARNING: This will drop and recreate all tables!${NC}"
echo "Make sure you have a backup of your data."
read -p "Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Migration cancelled."
    exit 0
fi

# Run migrations in order
echo -e "${GREEN}🔄 Starting migration...${NC}"

# Step 1: New Schema
if [ -f "supabase/migrations/001_new_schema.sql" ]; then
    run_sql_file "supabase/migrations/001_new_schema.sql" "Creating new schema with tables, indexes, and triggers"
else
    echo -e "${RED}❌ Schema file not found: supabase/migrations/001_new_schema.sql${NC}"
    exit 1
fi

# Step 2: RLS Policies
if [ -f "supabase/migrations/002_rls_policies.sql" ]; then
    run_sql_file "supabase/migrations/002_rls_policies.sql" "Applying Row Level Security policies"
else
    echo -e "${RED}❌ RLS file not found: supabase/migrations/002_rls_policies.sql${NC}"
    exit 1
fi

# Step 3: Seed Data (optional)
if [ -f "supabase/migrations/003_seed_data.sql" ]; then
    read -p "Load seed data for development? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        run_sql_file "supabase/migrations/003_seed_data.sql" "Loading seed data"
    fi
fi

# Verify migration
echo -e "${YELLOW}🔍 Verifying migration...${NC}"

VERIFICATION_SQL="
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('profiles', 'tournaments', 'teams', 'athletes', 'tournament_registrations', 'divisions')
ORDER BY tablename;
"

echo "Tables with RLS status:"
if [ -n "$DATABASE_URL" ]; then
    psql "$DATABASE_URL" -c "$VERIFICATION_SQL"
else
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "$VERIFICATION_SQL"
fi

echo
echo -e "${GREEN}🎉 Migration completed successfully!${NC}"
echo
echo "Next steps:"
echo "1. Update your application code to use the new query functions"
echo "2. Test the application with the new schema"
echo "3. Update any custom queries or reports"
echo
echo "For more information, see DATABASE_SCHEMA_V2.md"
