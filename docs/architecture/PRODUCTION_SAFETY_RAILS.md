# ComplyEur Production Safety Rails

This document defines the guardrails that protect the production environment from accidental damage. These protections are intentionally inconvenient. The inconvenience is the point.

Production is where customer data lives. Mistakes here have real consequences.

---

## Core Principle

Production access requires friction. Every operation that could damage production must require explicit confirmation, verification, and intent. If an operation feels too easy, something is wrong.

The goal is not developer convenience. The goal is preventing catastrophic mistakes.

---

## Production Access Controls

### Who Can Access Production

Direct production database access is restricted to:

- Emergency incident response
- Scheduled maintenance with documented approval
- Read-only analytics through designated interfaces

Day-to-day development never requires production database access.

### How Access Is Controlled

1. **Supabase Dashboard**: Production project access is limited to authorized personnel
2. **Service Role Key**: Production service role key is stored only in Vercel production environment variables
3. **Connection Strings**: Production database connection strings are not stored in local development environments

### Verification Before Access

Before any production access:

1. Confirm the access is necessary (cannot be done in test)
2. Document the reason for access
3. Verify you are targeting the correct environment
4. Have a second person verify if the operation is destructive

---

## Environment Verification

### Runtime Environment Checks

Any code that performs destructive operations must verify the environment before executing:

```typescript
function assertNotProduction(): void {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL is not configured')
  }

  // Replace with your actual production project reference
  if (supabaseUrl.includes('YOUR_PRODUCTION_PROJECT_REF')) {
    throw new Error('This operation is not permitted in production')
  }
}
```

### Script-Level Checks

Scripts that could damage data must include environment guards:

```typescript
// At the top of any destructive script
const PRODUCTION_PROJECT_REF = 'your-production-project-ref'

function requireTestEnvironment(): void {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

  if (supabaseUrl.includes(PRODUCTION_PROJECT_REF)) {
    console.error('ERROR: This script cannot run against production')
    console.error('Current SUPABASE_URL appears to be production')
    process.exit(1)
  }

  if (!supabaseUrl) {
    console.error('ERROR: SUPABASE_URL is not set')
    process.exit(1)
  }

  console.log('Environment check passed: targeting test database')
}

// Call this before any destructive operations
requireTestEnvironment()
```

### Manual Verification Protocol

When performing manual operations:

1. Read the current `NEXT_PUBLIC_SUPABASE_URL` value
2. Compare it against the known production URL
3. State out loud: "I am about to [operation] in [environment]"
4. Proceed only if certain

---

## Forbidden Operations in Production

The following operations are never performed directly in production:

### Database Resets

```bash
# NEVER run against production
npx supabase db reset
```

This command drops all data. It exists for test environments only.

### Truncate Operations

```sql
-- NEVER run in production
TRUNCATE TABLE employees;
TRUNCATE TABLE trips;
```

Truncate removes all data from a table instantly. There is no undo.

### Mass Deletes Without Conditions

```sql
-- NEVER run in production
DELETE FROM employees;
DELETE FROM trips WHERE 1=1;
```

Unqualified deletes destroy customer data.

### Schema Drops

```sql
-- NEVER run in production without formal approval
DROP TABLE employees;
DROP SCHEMA public CASCADE;
```

Schema drops are destructive and require documented approval.

---

## Seed Script Protection

Seed scripts populate databases with test data. They must never touch production.

### Seed Script Requirements

Every seed script must:

1. Check the environment before executing
2. Fail immediately if production is detected
3. Log which environment it is targeting
4. Require explicit confirmation before proceeding

### Seed Script Template

```typescript
// scripts/seed.ts
import { createClient } from '@supabase/supabase-js'

const PRODUCTION_PROJECT_REF = 'your-production-project-ref'

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing required environment variables')
    process.exit(1)
  }

  // Production guard - this is mandatory
  if (supabaseUrl.includes(PRODUCTION_PROJECT_REF)) {
    console.error('========================================')
    console.error('FATAL: Cannot seed production database')
    console.error('This script is for test environments only')
    console.error('========================================')
    process.exit(1)
  }

  console.log('Environment: TEST')
  console.log('Supabase URL:', supabaseUrl)
  console.log('')
  console.log('This will insert test data into the database.')
  console.log('Press Ctrl+C within 5 seconds to abort.')

  await new Promise(resolve => setTimeout(resolve, 5000))

  // Proceed with seeding...
  const supabase = createClient(supabaseUrl, supabaseKey)

  // Insert test data here
}

main()
```

### What Seed Scripts Must Not Do

- Accept production credentials as arguments
- Bypass environment checks for "convenience"
- Insert data that looks like real customer data
- Run automatically in CI against any environment

---

## Deletion Safeguards

### Soft Delete Preference

When possible, implement soft deletes instead of hard deletes:

```typescript
// Soft delete - data is recoverable
await supabase
  .from('employees')
  .update({ deleted_at: new Date().toISOString() })
  .eq('id', employeeId)

// Hard delete - data is gone forever
// Use only when legally required (GDPR) or explicitly approved
await supabase
  .from('employees')
  .delete()
  .eq('id', employeeId)
```

### Hard Delete Requirements

Hard deletes in production require:

1. A documented reason (GDPR request, data correction, etc.)
2. Verification that the correct record is targeted
3. A backup or export of the data before deletion (where permitted)
4. Logging of what was deleted and why

### Batch Delete Prohibition

Batch deletes (deleting multiple records at once) in production require:

1. Written approval before execution
2. A dry run that logs what would be deleted without deleting
3. Verification of the dry run results
4. Execution in a maintenance window

---

## Reset and Wipe Protections

### Database Reset

Database reset (`supabase db reset`) is forbidden in production. This command:

- Drops all tables
- Removes all data
- Reapplies migrations from scratch

It exists for development and test only.

### Table Truncation

Table truncation in production requires:

1. Explicit written approval
2. Backup of the table data
3. Verification that dependent tables are handled
4. Documentation of why truncation is necessary

In most cases, if you think you need to truncate in production, you are solving the wrong problem.

### Account/Company Deletion

Deleting an entire company's data (e.g., account closure) requires:

1. Confirmation of the deletion request (GDPR, contract termination)
2. Verification of the company ID to be deleted
3. Cascading delete plan (employees, trips, related data)
4. Final confirmation before execution
5. Audit log of the deletion

---

## Intentional Friction

The following friction points are intentional and must not be removed:

### Confirmation Delays

Scripts that perform destructive operations include a countdown:

```typescript
console.log('This operation will DELETE data.')
console.log('Press Ctrl+C within 10 seconds to abort.')
await new Promise(resolve => setTimeout(resolve, 10000))
```

This gives the operator time to reconsider.

### Explicit Environment Naming

Operations require typing the environment name explicitly:

```typescript
const confirmation = await prompt('Type "production" to confirm: ')
if (confirmation !== 'production') {
  console.log('Aborted')
  process.exit(0)
}
```

### No Convenience Aliases

There are no shortcuts for production operations. Commands like `prod-reset` or `quick-delete` must not exist.

### Audit Logging

All destructive operations in production are logged:

```typescript
await supabase.from('audit_log').insert({
  action: 'DELETE_EMPLOYEE',
  target_id: employeeId,
  performed_by: adminUserId,
  performed_at: new Date().toISOString(),
  reason: deletionReason
})
```

---

## Incident Response

### When Something Goes Wrong

If a destructive operation affects production incorrectly:

1. **Stop immediately** — do not attempt fixes without assessment
2. **Assess the damage** — what data was affected?
3. **Determine recovery options** — backup restore, manual correction, etc.
4. **Communicate** — inform stakeholders if customer data is affected
5. **Execute recovery** — with verification at each step
6. **Document** — post-mortem with root cause and prevention measures

### Backup Recovery

Supabase provides point-in-time recovery. To restore:

1. Identify the timestamp before the incident
2. Request restoration through Supabase dashboard
3. Verify the restored data
4. Update application if schema changed

Backup restoration is a last resort. It affects all data, not just the damaged portion.

---

## Checklist Before Any Production Operation

Use this checklist before any operation that modifies production:

### Environment Verification

- [ ] I have verified I am targeting the production environment intentionally
- [ ] I have confirmed the operation cannot be done in test first
- [ ] I have documented why this operation is necessary

### Operation Preparation

- [ ] I have a rollback plan if the operation fails
- [ ] I have verified the operation on test data first
- [ ] I understand exactly what this operation will do

### Safeguards

- [ ] Backups are current and verified
- [ ] I have the correct record IDs / identifiers
- [ ] Someone else has reviewed this operation (for destructive ops)

### Execution

- [ ] I am executing during an appropriate window
- [ ] I am monitoring the operation as it runs
- [ ] I will verify the results immediately after

---

## Change Log

This document is canonical. Changes require explicit review and approval.

| Date | Change | Approved By |
|------|--------|-------------|
| 2025-01-14 | Initial version | Architecture review |
