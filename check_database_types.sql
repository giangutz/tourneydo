-- Check actual column types in your database
-- Run this first to see what types you're actually using

SELECT 
    table_name,
    column_name,
    data_type,
    udt_name
FROM information_schema.columns 
WHERE table_name IN ('profiles', 'auth.users')
AND column_name = 'id'
ORDER BY table_name, column_name;

-- Also check if profiles table exists and its structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles'
ORDER BY ordinal_position;
