# ADR-002: Compliance Engine Boundaries

## Status

Accepted.

## Context

ComplyEUR's core product promise depends on correct Schengen 90/180-day calculations. Calculation errors can mislead employers and employees about legal travel risk.

## Decision

The compliance engine lives in `lib/compliance/` and remains deterministic, auditable, and independent from UI presentation. UI components and server actions may call the engine, but must not reimplement 90/180 logic locally.

Core rules:

- Use date-only, UTC-normalized calculations.
- Count entry and exit days inclusively.
- Expand trips into presence-day keys and deduplicate overlaps.
- Evaluate days used in the rolling 180-day window ending on the reference date.
- Keep country membership rules centralized and source-reviewable.

## Alternatives Considered

- Calculate status directly in React components.
  - Rejected because UI logic is harder to audit and easier to fork.
- Store only precomputed compliance values.
  - Rejected as the sole source because results must be reproducible from trip data.
- Use ad hoc database-only calculations.
  - Rejected for now because the TypeScript engine has extensive test coverage and clearer review ergonomics.

## Risks

- Country membership and legal edge cases can change.
- Residence permits, national visas, SRT/tax rules, and posted-worker rules are adjacent but separate domains.
- Native date parsing can still introduce off-by-one errors if callers bypass utilities.

## Consequences

- New compliance features must reuse `lib/compliance/` primitives or extend them deliberately.
- Algorithm changes require tests and documentation updates.
- Public claims about legal logic require source review beyond implementation tests.

## Current Repository Alignment

- `docs/CALCULATION_LOGIC.md` documents the current algorithm.
- `lib/compliance/presence-calculator.ts`, `window-calculator.ts`, `safe-entry.ts`, and `compliance-vector.ts` implement the core model.
- `lib/compliance/__tests__/` contains edge-case, property-based, vector, snapshot, and load tests.
- `lib/compliance/constants.ts` centralizes Schengen membership and includes a source-review warning.

