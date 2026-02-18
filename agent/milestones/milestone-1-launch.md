# Milestone 1: GA Launch Readiness

**Goal**: Complete all remaining work to take ComplyEUR from closed beta to a confident general-availability launch
**Duration**: 2-3 weeks (estimated)
**Dependencies**: None — all core features are already built
**Status**: In Progress

---

## Overview

ComplyEUR has completed its core feature build. All major functionality — compliance engine, dashboard, employee/trip CRUD, import/export, billing, alerts, calendar, forecasting, GDPR, MFA, team management — is implemented and working. Recent commits are focused on bug fixes, edge cases, and polish.

This milestone covers the final pre-launch tasks: hardening, testing, operational readiness, and go-to-market preparation. The goal is to move from "works in development" to "confidently handles real users in production."

---

## Deliverables

### 1. Testing & Quality Assurance
- Full E2E test suite passing on staging
- Load/stress testing against production-scale data
- Stripe webhook edge case testing in sandbox mode
- Cross-browser testing (Chrome, Safari, Firefox, mobile)

### 2. Security & Performance
- Rate limiting integrated across all server actions (not just auth)
- CSP headers reviewed and tightened for production
- Final security audit (RLS policies, service role key usage, exposed endpoints)
- Performance profiling and optimisation (Vercel Speed Insights review)

### 3. Operational Readiness
- Sentry alerting configured with appropriate thresholds
- Database backup strategy confirmed with Supabase
- Staging environment mirrors production configuration
- All migrations pushed to staging and verified

### 4. Go-to-Market
- Landing page copy finalised and live
- Privacy policy, terms of service, and accessibility pages reviewed for accuracy
- Pricing page reflects final Stripe plans and tier names
- Customer support channel established (email or chat)
- Analytics tracking in place (basic product metrics)

### 5. Beta Validation
- First 5-10 beta users onboarded
- Feedback collected and critical issues addressed
- Onboarding flow validated with real users

---

## Success Criteria

- [ ] All E2E tests pass on staging (`npm run test:e2e`)
- [ ] Unit and integration tests pass with no regressions (`npm run test:coverage`)
- [ ] Stress test completes without errors under expected load
- [ ] Stripe subscription flow tested end-to-end (signup → pay → access features → cancel)
- [ ] All migrations deployed to production via staging pipeline
- [ ] No Critical or High severity Sentry errors in staging for 48+ hours
- [ ] Landing page, pricing, privacy, and terms pages live and accurate
- [ ] At least 5 beta users have signed up and used the core features
- [ ] Rate limiting active on server actions and API endpoints
- [ ] GDPR data subject request flow tested manually

---

## Tasks

### Testing
1. Run full E2E test suite on staging and fix any failures
2. Execute stress test against staging with realistic data volumes
3. Test Stripe webhook scenarios (payment failure, subscription change, cancellation, disputed charge)
4. Cross-browser manual testing (Chrome, Safari, Firefox, iOS Safari, Android Chrome)
5. Test MFA enrollment, login, backup code usage, and unenrollment flow

### Security & Hardening
6. Audit rate limiting coverage — extend beyond auth to all server actions
7. Review and tighten Content Security Policy headers
8. Verify no service_role key usage in client-side code
9. Run through admin panel as superadmin — verify audit logging works
10. Test multi-tenant isolation (verify company A cannot see company B data)

### Operational
11. Configure Sentry alert rules (error rate thresholds, new issue notifications)
12. Verify staging environment matches production config (env vars, Stripe keys, Supabase project)
13. Push all migrations to production (dry-run first, then apply)
14. Document incident response process (who to contact, how to rollback)

### Go-to-Market
15. Review and finalise landing page copy and CTAs
16. Review pricing page — confirm tiers, features, and pricing match Stripe configuration
17. Review privacy policy and terms of service for accuracy and completeness
18. Set up customer support channel (email inbox or help widget)
19. Configure basic analytics (sign-ups, active users, feature usage)

### Beta
20. Invite first batch of beta users (5-10 companies)
21. Collect structured feedback after 1 week of usage
22. Triage and fix any critical issues discovered during beta
23. Validate onboarding flow works for new users who didn't build the product

---

## Environment Variables

No new environment variables required. All existing variables documented in `.env.example` and CLAUDE.md.

Verify these are set correctly in production:
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (production project)
- `SUPABASE_SERVICE_ROLE_KEY` (production, server-side only)
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` (production/live keys)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (production/live key)
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` (rate limiting)
- `SENTRY_DSN` (error tracking)

---

## Testing Requirements

- [ ] E2E: Dashboard loads with correct compliance data
- [ ] E2E: Import workflow handles CSV/Excel correctly
- [ ] E2E: Multi-user isolation prevents cross-tenant data access
- [ ] E2E: Authentication flow (signup → verify → login → dashboard)
- [ ] E2E: Stripe checkout and subscription management
- [ ] Integration: Compliance calculations match known test scenarios
- [ ] Unit: All validation schemas pass with valid/invalid inputs
- [ ] Performance: Auth flow completes within acceptable thresholds
- [ ] Stress: System handles 50+ concurrent users without degradation

---

## Risks and Mitigation

| Risk | Impact | Probability | Mitigation Strategy |
|------|--------|-------------|---------------------|
| Staging environment drift from production | High | Medium | Run diff on env configs before production push |
| Stripe live mode behaves differently from test | Medium | Medium | Test with small real transactions before GA |
| Beta users find critical bugs | Medium | Medium | Plan 1-week buffer between beta feedback and GA |
| Landing page doesn't convert | Medium | Medium | A/B test headline and CTA, iterate quickly |
| Rate limiting too aggressive / too loose | Low | Medium | Start conservative, monitor and adjust |

---

## Documentation Requirements

- [ ] CLAUDE.md is current and accurate (verified 2026-02-18)
- [ ] Privacy policy covers all data processing activities
- [ ] Terms of service reviewed by legal (or at minimum, a template service)
- [ ] FAQ page answers the most common questions
- [ ] Pricing page clearly explains what each tier includes

---

**Next Milestone**: Milestone 2 — Post-Launch Growth (SEO, content marketing, feature iteration based on user feedback)
**Blockers**: None currently identified
**Notes**: The codebase is feature-complete. This milestone is about confidence, not code. Most tasks are testing, verification, and operational — not new development.
