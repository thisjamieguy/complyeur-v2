# Supabase Migrations Workflow

This document describes how to manage database schema changes across Development and Production environments using the Supabase CLI.

## Project References

| Environment | Project Name      | Reference ID           | Region              |
|-------------|-------------------|------------------------|---------------------|
| Development | complyeur-dev     | `ympwgavzlvyklkucskcj` | Frankfurt (eu-central-1) |
| Production  | complyeur-prod    | `bewydxxynjtfpytunlcq` | London (eu-west-2)  |
| Staging     | complyeur-staging | `erojhukkihzxksbnjoix` | Frankfurt (eu-central-1) |

## Prerequisites

1. **Supabase CLI installed**: `brew install supabase/tap/supabase`
2. **Authenticated**: Run `supabase login` to authenticate with your Supabase account
3. **Database password**: Available in Supabase Dashboard > Project Settings > Database

## Directory Structure

```
supabase/
├── config.toml          # Local development configuration
├── migrations/          # Versioned SQL migration files
│   └── YYYYMMDD*.sql    # Migration files (chronological order)
├── functions/           # Edge functions
├── .temp/               # CLI cache (gitignored)
├── .branches/           # Branch tracking (gitignored)
└── seed.sql             # Optional seed data
```

## Common Commands

### Switch Between Environments

```bash
# Link to Development (default for schema development)
supabase link --project-ref ympwgavzlvyklkucskcj

# Link to Production (for deploying tested migrations)
supabase link --project-ref bewydxxynjtfpytunlcq

# Link to Staging
supabase link --project-ref erojhukkihzxksbnjoix
```

### Check Migration Status

```bash
# View migration sync status between local and remote
supabase migration list
```

Output shows:
- `Local` column: Migrations in your `supabase/migrations/` folder
- `Remote` column: Migrations applied to the linked database
- Missing entries indicate pending migrations

### Create a New Migration

**Option 1: From Schema Diff (recommended for capturing Dashboard changes)**

```bash
# Generate migration from differences between local and remote
supabase db diff -f migration_name
```

**Option 2: Create Empty Migration**

```bash
# Create a new empty migration file
supabase migration new migration_name
```

This creates `supabase/migrations/YYYYMMDDHHMMSS_migration_name.sql`

### Deploy Migrations

```bash
# Push pending migrations to linked database
supabase db push

# Push with dry-run (preview only)
supabase db push --dry-run
```

## Recommended Workflow

### 1. Development Phase

```bash
# Ensure linked to Dev
supabase link --project-ref ympwgavzlvyklkucskcj

# Check current state
supabase migration list

# Make schema changes in Dev Dashboard or write migration SQL

# If changes made in Dashboard, capture them:
supabase db diff -f descriptive_name

# Review generated migration file
# Edit to remove unwanted system changes if needed

# Apply to Dev (if created manually)
supabase db push
```

### 2. Testing Phase

```bash
# Verify Dev schema is correct
supabase migration list

# Run application tests against Dev database
```

### 3. Production Deployment

```bash
# Switch to Production
supabase link --project-ref bewydxxynjtfpytunlcq

# Preview pending migrations
supabase migration list

# Deploy to Production
supabase db push

# Verify deployment
supabase migration list
```

## Migration Best Practices

### File Naming

Use descriptive names with consistent format:
```
20260120000001_add_user_preferences_table.sql
20260120000002_add_index_on_user_email.sql
```

### Idempotent Migrations

Write migrations that can safely run multiple times:

```sql
-- Good: Uses IF NOT EXISTS
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    theme TEXT DEFAULT 'light'
);

-- Good: Uses IF EXISTS for drops
DROP POLICY IF EXISTS "old_policy_name" ON table_name;

-- Good: Uses CREATE OR REPLACE for functions
CREATE OR REPLACE FUNCTION my_function()
RETURNS void AS $$
BEGIN
    -- function body
END;
$$ LANGUAGE plpgsql;
```

### RLS Policies

Always include RLS policies for new tables:

```sql
-- Enable RLS
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (idempotent)
DROP POLICY IF EXISTS "policy_name" ON new_table;

-- Create new policies
CREATE POLICY "Users can view own data"
ON new_table FOR SELECT
USING (auth.uid() = user_id);
```

### Transaction Safety

Wrap multiple related changes in transactions:

```sql
BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS new_column TEXT;
UPDATE users SET new_column = 'default' WHERE new_column IS NULL;
ALTER TABLE users ALTER COLUMN new_column SET NOT NULL;

COMMIT;
```

## Filtering `db diff` Output

The `db diff` command may include unwanted system changes. Review and remove:

- Extension version updates
- System schema changes (`pg_catalog`, `information_schema`)
- Auth schema internals (unless intentionally modified)
- Storage schema internals

Keep only your application schema changes in `public` schema.

## Troubleshooting

### Migration Already Applied

If a migration fails because objects already exist:

```sql
-- Use conditional statements
CREATE TABLE IF NOT EXISTS ...
DROP POLICY IF EXISTS ...
ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...
```

### Schema Drift

If remote has changes not in migrations:

```bash
# Capture drift as a new migration
supabase db diff -f capture_drift

# Review and clean the generated file
# Apply to other environments
```

### Rollback

Supabase doesn't support automatic rollback. To revert:

1. Create a new migration that reverses the changes
2. Apply the reversal migration

```sql
-- Example rollback migration
DROP TABLE IF EXISTS accidentally_created_table;
ALTER TABLE users DROP COLUMN IF EXISTS wrong_column;
```

## Git Workflow

```bash
# After creating/modifying migrations
git add supabase/migrations/
git commit -m "Add migration: description of changes"
git push

# Team members pull and apply
git pull
supabase link --project-ref <their-dev-ref>
supabase db push
```

## Security Notes

- Never commit database passwords to Git
- The `.temp/` directory contains the linked project reference (gitignored)
- Production changes should only occur through migration files
- Review all migrations before applying to Production
