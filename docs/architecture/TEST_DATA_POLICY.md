# ComplyEur Test Data Policy

This document defines what test data is, where it belongs, how it is used, and what is forbidden. Test data exists to validate the application without risking customer data.

Production and test data never mix.

---

## Definition of Test Data

Test data is synthetic information created specifically for development, testing, and validation purposes. It has the following characteristics:

- **Synthetic**: Invented, not derived from real customers
- **Recognizable**: Clearly identifiable as fake (e.g., "Test Company Ltd", "Jane Testuser")
- **Disposable**: Can be deleted, reset, or modified without consequence
- **Complete**: Covers the scenarios needed for testing

Test data is not:

- Anonymized production data
- Copies of real customer records
- Data exported from production and modified
- Real personal information

---

## Where Test Data Lives

Test data exists only in the Test/Preview environment:

| Environment | Contains Test Data |
|-------------|-------------------|
| Test/Preview | Yes |
| Production | No |

There is no exception to this rule.

### Test Database

The test Supabase project contains:

- Test companies with synthetic details
- Test employees with fake names and passport numbers
- Test trips with arbitrary dates and destinations
- Test subscriptions with Stripe test mode data

### Production Database

The production Supabase project contains:

- Real customer companies
- Real employee records (PII protected by GDPR)
- Real travel data
- Real payment information

Production never contains synthetic test records.

---

## Purpose of Test Data

Test data serves specific purposes:

### Development Testing

Developers use test data to:

- Verify new features work correctly
- Test edge cases and boundary conditions
- Debug issues without affecting real data
- Experiment with schema changes

### Quality Assurance

QA processes use test data to:

- Validate user workflows end-to-end
- Test error handling and edge cases
- Verify calculations (90/180-day rule compliance)
- Confirm UI displays data correctly

### Preview Deployments

Vercel preview deployments use the test database to:

- Demonstrate features for review
- Allow stakeholders to interact with changes
- Validate deployments before production

### Automated Testing

CI/CD pipelines use test data to:

- Run integration tests against real database schemas
- Validate migrations before promotion
- Ensure application behavior is consistent

---

## Test Data Requirements

### Naming Conventions

Test data must be obviously fake:

**Companies:**
- "Test Company Ltd"
- "Demo Corp"
- "Acme Testing Inc"

**Employees:**
- "Jane Testuser"
- "John Demo"
- "Test Employee One"

**Email addresses:**
- test@example.com
- demo@test.invalid
- user1@complyeur-test.local

### Data Completeness

Test data should cover:

| Scenario | Test Data Needed |
|----------|------------------|
| New company, no employees | Company with empty employee list |
| Company with many employees | Company with 50+ employees |
| Employee with no trips | Employee record with zero trips |
| Employee approaching limit | Employee with 85+ days used |
| Employee in violation | Employee exceeding 90-day limit |
| Various nationalities | Employees with different passport countries |
| Multi-destination trips | Trips spanning multiple Schengen countries |

### Passport Numbers

Test passport numbers must:

- Follow realistic formats for the nationality
- Be obviously fake (e.g., "TEST123456")
- Never match real passport number patterns that could exist

### Dates

Test trip dates should:

- Cover past, present, and future scenarios
- Include edge cases (trips spanning year boundaries)
- Support testing of the rolling 180-day window

---

## Forbidden in Production

The following are never permitted in production:

### Test Records

Production must not contain:

- Records with "test" or "demo" in names
- Fake company entries for development purposes
- Placeholder employees for debugging
- Synthetic trips for validation

### Test Users

Production must not contain:

- Admin accounts with test credentials
- Developer accounts using personal details
- Shared testing accounts
- Accounts with weak/known passwords

### Test Subscriptions

Production Stripe must not contain:

- Test mode payments
- Fake subscription records
- Development card tokens

### Debug Flags

Production must not contain:

- Records with debug flags enabled
- Entries marked as "skip validation"
- Data with development-only fields populated

---

## Safe Testing Practices

### GDPR Deletion Testing

To test GDPR deletion functionality:

1. Create a synthetic test company in the test environment
2. Add synthetic employees and trips
3. Execute the deletion flow
4. Verify all related data is removed
5. Confirm audit logs are created correctly

Never test GDPR deletion on production data. If production deletion is required for a real request, follow the deletion procedure in PRODUCTION_SAFETY_RAILS.md.

### Data Corruption Testing

To test how the application handles corrupted data:

1. Create a test database backup
2. Introduce specific corruption (null values, invalid references)
3. Verify application handles corruption gracefully
4. Reset test database from backup

Corruption testing happens only in test environments.

### Edge Case Testing

To test boundary conditions:

1. Create test data that represents the edge case
2. Example: Employee with exactly 90 days used in rolling window
3. Verify calculations and UI handle the case correctly
4. Document the edge case for regression testing

### Performance Testing

To test with large data volumes:

1. Use the test environment
2. Generate synthetic data at scale (thousands of employees/trips)
3. Run performance tests
4. Clean up after testing to reset to baseline

---

## Test Data Lifecycle

### Creation

Test data is created by:

- Seed scripts (with environment guards)
- Manual entry in test environment
- Automated test setup

### Maintenance

Test data is maintained by:

- Resetting when it becomes stale or corrupted
- Adding new scenarios as features require
- Removing data that no longer serves a purpose

### Cleanup

Test data is cleaned up by:

- Database reset (`supabase db reset` in test only)
- Targeted deletion scripts
- Periodic purges of old test data

### Backup

Test data backups are optional. The test database can be reset from migrations and seed scripts. If test data is complex and valuable, backups may be taken, but are not required.

---

## Isolation Verification

### How to Verify Environments Are Isolated

Periodically verify that test and production remain isolated:

1. **Check Supabase projects**: Confirm test and production are separate projects
2. **Check Vercel variables**: Confirm environment variables point to correct projects
3. **Spot check data**: Look at test database, confirm only synthetic data exists
4. **Audit production**: Confirm no test records exist in production

### What Isolation Failure Looks Like

Signs that isolation has been compromised:

- Test records appearing in production
- Production data appearing in test
- Single Supabase project serving both environments
- Environment variables pointing to wrong project

If any of these occur, treat it as a critical incident.

---

## Prohibited Practices

### No Production Data Copies

Never copy production data to test, even if anonymized:

- Anonymization is error-prone
- Residual PII may remain
- It creates compliance risk
- Synthetic data is sufficient

### No Shared Databases

Test and production must use separate database instances:

- Same database with different schemas: forbidden
- Same database with table prefixes: forbidden
- Same Supabase project with row-level filtering: forbidden

Complete isolation means separate Supabase projects.

### No Test Data in Production

Even "temporary" test data in production is forbidden:

- "I'll delete it later" is not acceptable
- "It's just for debugging" is not acceptable
- "It won't affect anything" is not acceptable

Test data belongs in test. No exceptions.

### No Production Credentials in Test Scripts

Test scripts must not accept production credentials:

```typescript
// WRONG - allows production targeting
const supabaseUrl = process.argv[2] // Could be production URL

// RIGHT - hardcoded to test environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
requireTestEnvironment() // Fails if production
```

---

## Test Data Examples

### Sample Company

```json
{
  "name": "Test Company Ltd",
  "email": "admin@test-company.invalid",
  "subscription_tier": "professional",
  "created_at": "2024-01-01T00:00:00Z"
}
```

### Sample Employee

```json
{
  "name": "Jane Testuser",
  "email": "jane@test-company.invalid",
  "passport_number": "TEST123456",
  "nationality": "GB",
  "created_at": "2024-01-15T00:00:00Z"
}
```

### Sample Trip

```json
{
  "employee_id": "[test employee UUID]",
  "start_date": "2024-06-01",
  "end_date": "2024-06-10",
  "destination": "Germany",
  "notes": "Test trip for compliance calculation validation"
}
```

---

## Checklist for Test Data Operations

### Creating Test Data

- [ ] Am I in the test environment?
- [ ] Is the data obviously synthetic (names, emails)?
- [ ] Does the data serve a specific testing purpose?
- [ ] Have I documented what the test data is for?

### Resetting Test Data

- [ ] Am I targeting the test database only?
- [ ] Have I verified the environment before reset?
- [ ] Do I understand what will be deleted?
- [ ] Is this reset necessary (or can I add to existing data)?

### Verifying Isolation

- [ ] Are test and production using separate Supabase projects?
- [ ] Do environment variables correctly target each environment?
- [ ] Does production contain only real customer data?
- [ ] Does test contain only synthetic data?

---

## Change Log

This document is canonical. Changes require explicit review and approval.

| Date | Change | Approved By |
|------|--------|-------------|
| 2025-01-14 | Initial version | Architecture review |
