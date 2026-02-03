# Test Suite Implementation Procedure

**Quick reference checklist. Full details in:** `2025-02-03-comprehensive-test-suite-design.md`

---

## Pre-Flight Checklist

```bash
# Verify environment
node --version        # Should be 20+
npm run test          # All 642 tests should pass
npm run test:e2e      # All 17 E2E tests should pass
```

- [ ] Node.js 20+ installed
- [ ] Dependencies installed (`npm ci`)
- [ ] Playwright browsers installed (`npx playwright install`)
- [ ] Dev server can start (`npm run dev`)
- [ ] Supabase connection working
- [ ] Current tests all pass

---

## Phase 0: Infrastructure (Do First)

**Time:** ~30 min
**Prompt:** Prompt 0 (Infrastructure Setup)

```bash
# After implementation, verify:
npm run test:unit         # Script exists
npm run test:integration  # Script exists
npm run test:e2e:stress   # Script exists
```

**Deliverables:**
- [ ] New npm scripts in package.json
- [ ] `__tests__/fixtures/` directory with sample CSVs
- [ ] `__tests__/utils/csv-generator.ts`
- [ ] `__tests__/utils/oracle-calculator.ts`
- [ ] `scripts/generate-test-report.js`

---

## Phase 1: Unit Tests (Layer 1)

**Time:** ~2-3 hours
**Prompt:** Prompt 1 (Unit Test Gap Coverage)

```bash
# During development
npm run test -- lib/compliance/__tests__/cached.test.ts --watch

# After implementation
npm run test:coverage
```

**Deliverables:**
- [ ] `lib/compliance/__tests__/cached.test.ts` (~15 tests)
- [ ] `lib/compliance/__tests__/compliance-vector.test.ts` (~20 tests)
- [ ] Extended `risk-calculator.test.ts`
- [ ] Extended `safe-entry.test.ts`

**Success:**
- [ ] `cached.ts` coverage: 2% → 90%+
- [ ] `compliance-vector.ts` coverage: 0% → 90%+
- [ ] All new tests pass
- [ ] No regressions

---

## Phase 2: Integration Tests (Layer 2)

**Time:** ~2-3 hours
**Prompts:** Prompt 2, 3, 4

```bash
# After implementation
npm run test:integration
```

**Deliverables:**
- [ ] `__tests__/integration/import-pipeline.test.ts` (~15 tests)
- [ ] `__tests__/integration/import-insertion.test.ts` (~12 tests)
- [ ] `__tests__/integration/import-api.test.ts` (~10 tests)

**Success:**
- [ ] All parsing formats tested
- [ ] Database insertion tested (with cleanup)
- [ ] API endpoints tested (auth + validation)
- [ ] No orphaned test data

---

## Phase 3: E2E Functional Tests (Layer 3)

**Time:** ~2-3 hours
**Prompts:** Prompt 5, 6

```bash
# During development (UI mode for debugging)
npx playwright test --ui

# After implementation
npm run test:e2e:import
npm run test:e2e:dashboard
```

**Deliverables:**
- [ ] `e2e/import-workflow.spec.ts` (~15 tests)
- [ ] `e2e/dashboard-verification.spec.ts` (~10 tests)

**Success:**
- [ ] Full import workflow passes
- [ ] Dashboard values match oracle
- [ ] All filters/search/sort work
- [ ] Videos recorded on failure

---

## Phase 4: E2E Stress Tests (Layer 4)

**Time:** ~1-2 hours
**Prompt:** Prompt 7

```bash
# After implementation (extended timeout)
npm run test:e2e:stress
```

**Deliverables:**
- [ ] `e2e/stress-test.spec.ts` (~8 tests)

**Success:**
- [ ] 500-row import < 60 seconds
- [ ] Dashboard values match oracle (0 discrepancies)
- [ ] 10K trips loads < 5 seconds
- [ ] Concurrent imports don't corrupt data

---

## Phase 5: Final Verification

```bash
# Run everything
npm run test:all

# Generate combined report
npm run test:report

# Review
open test-reports/combined-report.html
```

**Final Checklist:**
- [ ] All tests pass
- [ ] Coverage > 80% overall
- [ ] Coverage > 90% for compliance/
- [ ] 0 calculation discrepancies
- [ ] Report generated and reviewed

---

## Quick Commands

| Task | Command |
|------|---------|
| Run all unit tests | `npm run test` |
| Run with coverage | `npm run test:coverage` |
| Run integration only | `npm run test:integration` |
| Run E2E tests | `npm run test:e2e` |
| Run stress tests | `npm run test:e2e:stress` |
| Run everything | `npm run test:all` |
| Debug E2E | `npx playwright test --ui` |
| Generate report | `npm run test:report` |

---

## If Something Fails

1. **Unit test fails:** Check the specific assertion, verify oracle calculation is correct
2. **Integration test fails:** Check database connection, verify test cleanup ran
3. **E2E test fails:** Check Playwright trace/video, verify dev server running
4. **Stress test discrepancy:** Generate detailed report, compare oracle vs app line by line
5. **Coverage drops:** Verify new tests are being discovered, check include patterns

---

## Rollback

If tests destabilize the codebase:

```bash
# Revert test files only (keep existing tests)
git checkout HEAD -- lib/compliance/__tests__/cached.test.ts
git checkout HEAD -- lib/compliance/__tests__/compliance-vector.test.ts
# etc.
```

The core application code should not be modified during this test implementation.
