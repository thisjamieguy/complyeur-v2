# Maintainability & Scale Readiness Audit

**Project:** ComplyEUR v2.0
**Date:** 2026-01-19
**Auditor:** Principal/Staff+ Engineer (Automated)
**Scope:** Long-term maintainability and scale readiness review (READ-ONLY)

---

## 1. Executive Summary

- **Codebase is reasonably well-structured** for a solo-founder SaaS but exhibits patterns that will create friction at scale
- **Compliance engine (`lib/compliance/`)** is exemplary: pure functions, isolated, extensively tested, AI-safe
- **Import subsystem** represents highest complexity concentration: 10+ files, 4000+ lines, tightly coupled
- **Critical test coverage gaps** exist in services, database layer, and GDPR utilities
- **Architectural drift is already present**: dual error systems, inconsistent toast patterns, mixed naming conventions
- **Two files exceed 800 lines** and one exceeds 1200 lines, creating LLM context window risks
- **Scale breakpoint is approximately 2-3 contributors** before merge conflicts and cognitive load become problematic

---

## 2. Maintainability Score

**Score: 6.5 / 10**

The codebase demonstrates solid foundational architecture with clear layer separation (UI → actions → services → DB), excellent TypeScript coverage, and a well-isolated core domain (compliance engine). However, the score is reduced by: accumulated pattern inconsistencies (error handling, toast notifications, naming), several files exceeding maintainable size thresholds, duplicate data access layers (`lib/db/` vs `lib/data/`), critical test coverage gaps, and business logic leakage into UI components. The import subsystem's complexity concentration is a significant concern. For a solo-founder project, this is acceptable; for a 2-3 person team, these issues would need immediate attention.

---

## 3. Cognitive Load Assessment

**Rating: MEDIUM**

### Supporting Observations

**Low cognitive load areas:**
- Entry points are clearly defined (middleware.ts, Next.js App Router conventions)
- Domain model is simple and well-documented (companies → employees → trips → compliance)
- Compliance engine has excellent JSDoc with usage examples
- File structure follows predictable Next.js patterns

**Medium cognitive load areas:**
- Understanding which data access layer to use (`lib/db/` for mutations vs `lib/data/` for cached reads) requires tribal knowledge
- Import subsystem requires understanding 10+ interdependent files to make safe changes
- Action files (`app/(dashboard)/actions.ts`) mix multiple domains, making responsibility discovery harder

**High cognitive load areas:**
- `lib/db/alerts.ts` (650 lines) handles alerts + notifications + settings + logging - requires full-context reading
- `lib/exports/pdf-generator.tsx` (885 lines) mixes styles with layout logic
- Understanding error handling requires knowing about three competing systems (`lib/errors.ts`, `lib/errors/index.ts`, `lib/compliance/errors.ts`)
- Calendar component executes compliance calculations inline, hiding business logic in UI

### Mental Overhead Accumulation Points

1. **Import pipeline**: Any change requires understanding parser → date-parser → validator → inserter flow
2. **Alert system**: Detection service → DB alerts → notification preferences → email service
3. **Export system**: Action → compliance calculation → format transformation → file generation

---

## 4. Scale Breakpoints

### At 2 Contributors

| Issue | Impact |
|-------|--------|
| `app/(dashboard)/actions.ts` mixes domains | Frequent merge conflicts on unrelated features |
| Single `lib/db/alerts.ts` handles 4 concerns | Both devs touching same file for different features |
| Duplicate data layers undocumented | One dev uses cached, other uses raw - inconsistent behavior |
| No established error handling pattern | New code creates fourth error system |
| Import subsystem has no clear ownership | Changes require cross-file coordination |

### At 5 Contributors

| Issue | Impact |
|-------|--------|
| Component naming convention split (PascalCase vs kebab-case) | Style drift accelerates, 40+ files in inconsistent state |
| Toast notification pattern split (12 direct vs 14 helper) | UX consistency impossible to maintain |
| Services have zero tests | Changes deployed without safety net |
| Large files exceed single-reviewer comprehension | Code review quality degrades |
| No contribution guidelines beyond CLAUDE.md | Onboarding becomes oral tradition |

### At 10x Feature Size

| Issue | Impact |
|-------|--------|
| No module boundaries enforced | Import graph becomes unmaintainable |
| Import subsystem complexity compounds | Adding new data formats requires touching 10+ files |
| `types/database.ts` at 1288 lines | Schema changes cascade unpredictably |
| Calendar component pattern spreads | Business logic fragments across UI layer |
| No service layer tests | Refactoring becomes high-risk |

---

## 5. Future Refactor Cost Map

### Low-Cost Areas (Safe to change)

| Area | Why |
|------|-----|
| `lib/compliance/*` | Pure functions, 6 test files, zero side effects |
| `lib/validations/*` | Zod schemas, self-documenting, no dependencies |
| `components/ui/*` | Primitive components, clear contracts, no business logic |
| `lib/constants/*` | Static data, no coupling |
| Individual validation schemas | Isolated, well-tested |

### Medium-Cost Areas (Requires coordination)

| Area | Why |
|------|-----|
| `lib/db/*` (except alerts.ts) | Consistent patterns, but no tests to catch regressions |
| `lib/supabase/*` | Clear boundaries, but touches authentication flow |
| `components/forms/*` | Reused across features, changes ripple |
| `lib/services/email-service.ts` | External integration, but isolated |
| `lib/gdpr/*` | Legal implications, but modular |

### High-Cost Areas (Expensive to change)

| Area | Why |
|------|-----|
| `lib/db/alerts.ts` (650 lines) | 4 responsibilities entangled, untested, central to features |
| `lib/import/*` (4000+ lines) | 10+ tightly coupled files, any change requires understanding whole system |
| `lib/exports/pdf-generator.tsx` (885 lines) | Styles and logic mixed, visual testing required |
| `app/(dashboard)/actions.ts` | Multi-domain mutations, used everywhere |
| `types/database.ts` (1288 lines) | Auto-generated but changes cascade to all DB access |
| `lib/services/forecast-service.ts` (503 lines) | Untested, complex algorithm, 15 functions |
| `lib/services/alert-detection-service.ts` | Orchestrates multiple systems, async chains |

---

## 6. Testability Risk Notes

### Where Testing Would Be Trivial

| Area | Structural Reason |
|------|-------------------|
| `lib/compliance/*` | Pure functions, no side effects, explicit inputs/outputs |
| `lib/validations/*` | Zod schemas are inherently testable, deterministic |
| `lib/import/date-parser.ts` | Pure transformation logic, extensive edge cases documentable |
| `lib/import/country-normalizer.ts` | Lookup-based, stateless |
| Error classes in `lib/errors/` | Simple constructors, message formatting |

### Where Testing Would Be Painful

| Area | Structural Reason |
|------|-------------------|
| `lib/db/*.ts` | Every function creates new Supabase client, requires mocking |
| `lib/services/alert-detection-service.ts` | Mixed async patterns (.then/.catch + await), fire-and-forget side effects |
| `lib/services/background-jobs.ts` | Cron scheduling, time-dependent behavior |
| `components/calendar/calendar-view.tsx` | Business logic mixed with rendering, compliance calculation inline |
| `app/(dashboard)/actions.ts` | Side effects scattered, multiple domains, auth required |
| `lib/gdpr/dsar-export.ts` (547 lines) | File I/O, ZIP creation, data aggregation |

### Why (Structural Reasons)

1. **Side effect coupling**: Services directly call `supabase.from()` rather than accepting clients as parameters
2. **Async pattern inconsistency**: `.then().catch()` chains harder to test than `async/await`
3. **No dependency injection**: Supabase client created inside functions, not passed in
4. **Fire-and-forget calls**: Email sending uses `.catch(console.error)` pattern, hard to verify
5. **UI-business logic mixing**: Calendar component runs compliance calculations, requires rendering to test logic

---

## 7. AI-Safety Risk Profile

### Areas Safe for AI Changes

| Area | Why Safe |
|------|----------|
| `lib/compliance/*` | Well-documented, pure functions, extensive tests catch regressions |
| `lib/validations/*` | Self-explanatory Zod schemas, type errors surface immediately |
| `components/ui/*` | Simple primitives, consistent patterns, visual verification easy |
| Individual page components | Isolated scope, clear props interface |
| `lib/constants/*` | Static data, no side effects |
| Test files | Failures immediately visible, no production impact |

### Areas Risky for AI Changes

| Area | Risk Factor |
|------|-------------|
| `types/database.ts` (1288 lines) | Exceeds context window, AI cannot see full schema |
| `lib/db/alerts.ts` (650 lines) | Multi-concern, AI may miss cross-cutting impacts |
| `lib/import/*` (10+ files) | Tight coupling, AI changes one file but breaks another |
| `lib/exports/pdf-generator.tsx` (885 lines) | Visual output, AI cannot verify correctness |
| `app/(dashboard)/actions.ts` | Mixed domains, AI may conflate responsibilities |
| `lib/services/alert-detection-service.ts` | Fire-and-forget patterns, AI may not preserve async semantics |
| `lib/errors.ts` vs `lib/errors/index.ts` | Duplicate systems, AI may use wrong one |

### Why (Pattern Clarity, Size, Coupling)

1. **Context window limits**: Files >500 lines risk truncation, AI loses critical context
2. **Pattern ambiguity**: Dual error systems, dual toast systems, AI will inconsistently choose
3. **Implicit coupling**: Import subsystem dependencies not visible from single-file view
4. **Naming inconsistency**: AI trained on kebab-case may generate different naming than existing PascalCase files
5. **Undocumented conventions**: When to use `lib/db/` vs `lib/data/` not codified
6. **Side effect opacity**: Fire-and-forget calls easy for AI to accidentally remove

---

## 8. Strengths That Scale Well

### Structural Decisions That Age Well

| Strength | Long-term Benefit |
|----------|-------------------|
| **Compliance engine isolation** | Core business logic can evolve without touching UI or DB layers |
| **TypeScript strict mode** | Type errors caught at compile time, safe refactoring |
| **Supabase generated types** | Schema changes automatically type-check across codebase |
| **Server actions pattern** | Clear mutation boundaries, good for incremental adoption |
| **Barrel exports in `lib/db/index.ts`** | Easy to refactor internals without breaking consumers |
| **Zod validation schemas** | Runtime + compile-time safety, self-documenting |
| **Clear route structure** | Next.js App Router conventions reduce navigation overhead |
| **Multi-tenant RLS from day one** | Security correct by construction, not retrofitted |
| **CLAUDE.md documentation** | AI-assisted development has explicit guidelines |
| **Test factories with overrides** | Adding tests for new cases is low friction |

### Things That Reduce Future Pain

| Pattern | Why It Helps |
|---------|--------------|
| ISO date strings in DB | No timezone bugs, consistent parsing |
| `parseISO` from date-fns | Explicit date handling per CLAUDE.md guidance |
| Centralized Supabase client creation | Easy to add instrumentation, logging |
| Explicit error types | Debugging clearer than generic Error |
| Co-located compliance tests | Changes to algorithm immediately verified |

---

## 9. Silent Failure Risks

### Issues Unlikely to Break Immediately

| Risk | Surface Later As |
|------|------------------|
| **No service layer tests** | Production bugs in alert detection, email sending, forecasting discovered by users |
| **GDPR utilities untested** | Retention policy runs, may silently delete wrong data or fail to anonymize |
| **Toast notification inconsistency** | UX degradation, some errors shown briefly, others persistently |
| **Background job failure handling** | Cron jobs fail silently, compliance alerts stop working |
| **Calendar component compliance logic** | Browser timezone issues resurface (per CLAUDE.md warning) |
| **Mixed async patterns** | Unhandled promise rejections in fire-and-forget chains |
| **Duplicate data layers** | Cache staleness bugs, different parts of UI show different data |

### Quality Degradation Over Time

| Area | Degradation Pattern |
|------|---------------------|
| **Error handling systems** | Third system unused, fourth created, inconsistency spreads |
| **Component naming** | New components follow whichever pattern dev sees first |
| **Import statement ordering** | No enforced convention, imports become chaotic |
| **Console logging** | Mix of prefixed and unprefixed, log analysis becomes difficult |
| **Test coverage** | Untested areas grow, "we don't test that" becomes culture |
| **Action file growth** | `actions.ts` attracts more unrelated code (gravity pattern) |
| **Import subsystem** | Complexity compounds, becomes "legacy code" no one wants to touch |

---

## Appendix A: File Size Reference

| File | Lines | Risk Level |
|------|-------|------------|
| `types/database.ts` | 1,288 | CRITICAL (exceeds LLM context) |
| `lib/exports/pdf-generator.tsx` | 885 | HIGH |
| `lib/import/gantt-parser.ts` | 807 | HIGH |
| `lib/import/date-parser.ts` | 698 | MEDIUM |
| `lib/db/alerts.ts` | 650 | CRITICAL (multi-concern) |
| `app/actions/exports.ts` | 588 | HIGH |
| `lib/db/trips.ts` | 549 | MEDIUM |
| `lib/gdpr/dsar-export.ts` | 547 | MEDIUM |
| `lib/import/country-normalizer.ts` | 537 | MEDIUM |
| `types/import.ts` | 515 | MEDIUM |
| `lib/services/forecast-service.ts` | 503 | HIGH (untested) |

---

## Appendix B: Pattern Inconsistencies Detected

| Pattern | Count A | Count B | Risk |
|---------|---------|---------|------|
| Error handling | `lib/errors.ts` | `lib/errors/index.ts` | HIGH |
| Toast notifications | 12 direct imports | 14 helper imports | MEDIUM |
| Component naming | 40+ PascalCase | 70+ kebab-case | MEDIUM |
| Error variable naming | `error` | `err` | LOW |
| Console log prefixes | Bracketed `[Module]` | Plain text | LOW |
| Async patterns | `.then().catch()` | `async/await` | MEDIUM |

---

## Appendix C: Test Coverage Gaps

| Area | Status | Risk |
|------|--------|------|
| `lib/services/*` (4 files, 1300+ lines) | 0% | CRITICAL |
| `lib/db/*` (7 files, 2100+ lines) | 0% | CRITICAL |
| `lib/gdpr/*` (7 files, 2100+ lines) | 0% | CRITICAL |
| `lib/import/*` (7 of 10 files) | ~30% | HIGH |
| React components (128 files) | 0% | MEDIUM |

---

*This audit is based on structural analysis of the current codebase. Speculative risks are identified where patterns suggest future problems but certainty cannot be established.*
