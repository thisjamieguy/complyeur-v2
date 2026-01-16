# ComplyEur Architecture Documentation

This directory contains the canonical architecture documents for ComplyEur. These documents define how the system operates, how environments are separated, and how data is protected.

These documents are mandatory. Violations are bugs, not opinions.

---

## Documents

### ENVIRONMENTS.md

Defines the two-environment architecture: Production and Test/Preview. Covers environment isolation, Vercel configuration, and the absolute rules that prevent cross-contamination.

Read this to understand which database your code will connect to and why.

### MIGRATION_WORKFLOW.md

Defines how database schema changes move from development to production. Covers migration creation, validation requirements, and the promotion path.

Read this before creating or applying any database migration.

### PRODUCTION_SAFETY_RAILS.md

Defines the guardrails that protect production from accidental damage. Covers access controls, environment verification, forbidden operations, and deletion safeguards.

Read this before performing any operation that could affect production.

### TEST_DATA_POLICY.md

Defines what test data is, where it belongs, and what is forbidden. Covers test data requirements, naming conventions, and isolation verification.

Read this before creating test data or working with the test database.

---

## Enforcement

These documents are not guidelines. They are architectural constraints.

Code that violates these rules is incorrect. Pull requests that bypass these rules will be rejected. Operations that ignore these rules create incidents.

If a rule seems wrong, the correct response is to propose a change to the documentation with clear justification. The incorrect response is to ignore the rule.

---

## Before Starting Feature Work

1. Confirm you understand which environment you are targeting
2. Confirm your changes comply with the migration workflow
3. Confirm you are not introducing test data into production
4. Confirm any destructive operations have the required safeguards

If any of these cannot be confirmed, stop and read the relevant document.

---

## Change Process

These documents are canonical. Changes require:

1. A clear explanation of why the current rule is insufficient
2. A proposed revision with specific wording
3. Review and approval before the change takes effect

Changes are recorded in the Change Log section of each document.
