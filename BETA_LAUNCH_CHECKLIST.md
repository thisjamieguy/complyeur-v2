# ComplyEur — Pre-Beta Launch Checklist

**Version:** 1.1
**Last updated:** 2026-02-05

---

## Change Log

| Version | Date       | Changes                                                        |
|---------|------------|----------------------------------------------------------------|
| 1.0     | 2026-02-05 | Initial checklist — 18 sections, ~180 items                    |
| 1.1     | 2026-02-05 | Added: Definition of Done, compliance engine source-of-truth   |
|         |            | checks, auth lifecycle edge cases, abuse & blast-radius        |
|         |            | testing, Stripe money-truth checks, UI panic prevention,       |
|         |            | screen reader testing, cold start & worst-case performance,    |
|         |            | soft/hard delete strategy, data corruption recovery, DMARC,    |
|         |            | early warning alerts, data minimisation, passport masking,     |
|         |            | beta ops improvements (feedback owner, known-issues list,      |
|         |            | changelog cadence, legal disclaimer in-app)                    |

---

## Beta Launch Definition of Done

This checklist is considered complete when:

- All **critical** items are checked
- All **known risks** are documented and accepted
- One full end-to-end journey has been completed by a non-founder
- A rollback plan exists for the top 3 failure scenarios

---

## 1. Core Product / Features

**Best tool:** Claude Code (Opus) — audit calculation logic, trace edge cases in code

### Compliance Engine (Source of Truth)

- [ ] Single authoritative function/module for 90/180 calculation (no duplicate logic)
- [ ] Unit tests assert inputs → outputs for the calculation engine in isolation
- [ ] Manual "oracle" test cases documented (spreadsheet or reference table)
- [ ] Timezone explicitly defined (UTC everywhere, no implicit local time)
- [ ] Day counting rule explicitly defined (inclusive start/end documented)

### 90/180-Day Calculations

- [ ] Calculation correct at 0, 1, 89, 90, 91 days used
- [ ] Rolling 180-day window moves correctly day by day
- [ ] Overlapping trips don't double-count days
- [ ] Single-day trips (start === end) count as 1 day
- [ ] Future trips included in projections
- [ ] Past trips outside 180-day window excluded
- [ ] Trips spanning month/year boundaries calculate correctly
- [ ] "Days remaining" matches manual calculation
- [ ] Status thresholds correct (compliant → warning → violation)
- [ ] Employee with zero trips shows 90 days remaining

### Trip Management

- [ ] Create, edit, delete trips — all recalculate compliance
- [ ] End date before start date → rejected
- [ ] Duplicate trip detection or warning

### Employee Management

- [ ] Create, edit, delete employees — all work
- [ ] Delete employee → trips handled correctly
- [ ] Pagination/search on employee list

### Dashboard

- [ ] Dashboard data accurate and refreshes after changes
- [ ] Empty states for zero employees/trips
- [ ] Works with 1 employee and 50+ employees

---

## 2. Authentication & Account Management

**Best tool:** Playwright e2e tests + manual testing

### Signup & Login

- [ ] Signup form validates all fields
- [ ] Confirmation email arrives (test Gmail, Outlook, corporate)
- [ ] Confirmation link works and logs user in
- [ ] Duplicate email rejected with clear message
- [ ] Password requirements enforced and displayed
- [ ] Login with valid credentials → dashboard
- [ ] Login with invalid credentials → clear error
- [ ] Auth error messages do not leak account existence

### Password Reset

- [ ] Password reset email arrives and link works
- [ ] Reset link expires after use
- [ ] Orphaned sessions invalidated on password reset

### Session Management

- [ ] Session persists across refreshes and tabs
- [ ] Session expires after reasonable time
- [ ] Expired session → redirect to login, not a crash
- [ ] Logout clears session fully

### Account Lifecycle

- [ ] User changes email → re-verification required
- [ ] User deletes account → session invalidated immediately
- [ ] Every `/dashboard/*` route redirects to login if unauthenticated
- [ ] API routes return 401 (not 500) when unauthenticated
- [ ] After login, redirect to originally requested page

---

## 3. Security

**Best tool:** Claude Code (Opus) — deep code audit for RLS, secrets, input validation

### Data Isolation

- [ ] Company A cannot see Company B's employees or trips
- [ ] RLS policies on every table
- [ ] URL manipulation doesn't expose other companies' data

### Secrets & Keys

- [ ] `service_role` key not in any client-side code
- [ ] No API keys in git history
- [ ] `.env.local` in `.gitignore`
- [ ] Stripe secret key only used server-side

### Input Validation

- [ ] SQL injection tested on form fields
- [ ] XSS tested on all text inputs (employee names, destinations)
- [ ] Form fields have max length limits
- [ ] API routes validate request body shape and types
- [ ] Large payload / oversized request rejected safely

### Rate Limiting & Abuse

- [ ] Login/signup endpoints rate-limited
- [ ] Rate limits tested under deliberate abuse (login spam, trip creation spam)
- [ ] Internal error IDs logged (but not shown to user)

### Headers & Transport

- [ ] HTTPS enforced
- [ ] CSP, X-Frame-Options, X-Content-Type-Options headers set
- [ ] Stripe webhook signature verified
- [ ] CORS not set to `*` in production

### Sensitive Data

- [ ] Passport numbers not logged in console or error messages
- [ ] No sensitive data in URLs, query params, or localStorage
- [ ] Principle of least privilege verified for Supabase roles
- [ ] Feature flag or kill-switch available for critical features

---

## 4. Payments & Billing (Stripe)

**Best tool:** Manual testing with Stripe test mode + Claude Code to audit webhook handling

### Checkout Flow

- [ ] Pricing page shows correct plans and prices
- [ ] Checkout redirects to Stripe correctly
- [ ] Successful payment → user gets access
- [ ] Cancelled checkout → user returns in clean state

### Webhooks

- [ ] Webhook processes `checkout.session.completed`
- [ ] Webhook handles `invoice.payment_failed` gracefully
- [ ] Duplicate webhook events handled idempotently
- [ ] Webhook endpoint URL correct for production domain
- [ ] App handles webhook delays or missed events

### Subscription Management

- [ ] Subscription status syncs (active, past_due, cancelled)
- [ ] User can view current plan
- [ ] User can access Stripe billing portal
- [ ] Subscription cancelled → graceful degradation

### Money Truth

- [ ] Stripe is the single source of truth for subscription status
- [ ] Manual reconciliation path exists (admin override if webhook fails)
- [ ] User cannot access paid features via client-side state hacks
- [ ] Stripe live mode vs test mode — intentional choice for beta
- [ ] Beta pricing/access model clear to testers

---

## 5. UI / UX

**Best tool:** Claude Code (Sonnet) for quick review + Lighthouse + manual on real devices

### Visual Consistency

- [ ] 8px spacing system throughout
- [ ] 12px border radius consistently
- [ ] One heading font + one body font
- [ ] Colour palette consistent

### Responsive Design

- [ ] Test on real phone (not just devtools)
- [ ] Test on tablet width
- [ ] Navigation works on mobile
- [ ] Tables scrollable or stacked on mobile
- [ ] Touch targets at least 44x44px

### States & Feedback

- [ ] Loading skeletons prevent "is it broken?" moments
- [ ] Error state for every data display
- [ ] Empty state for every list
- [ ] Success feedback for every mutation (toast/message)
- [ ] Disabled button state during submission
- [ ] Compliance warnings explain why (not just red/yellow/green)

### Panic Prevention

- [ ] Destructive actions require confirmation (delete trip, delete employee)
- [ ] Undo or recovery path where feasible
- [ ] No irreversible action without a clear warning

### Navigation & Forms

- [ ] Every link goes somewhere real (no `#` hrefs)
- [ ] Browser back button works correctly
- [ ] Active page highlighted in nav
- [ ] Validation messages are specific
- [ ] Date pickers work correctly

### Content & Copy

- [ ] No placeholder text or developer jargon
- [ ] Consistent terminology throughout
- [ ] 404 page exists and is branded
- [ ] 500 page exists and is helpful

---

## 6. Accessibility

**Best tool:** Lighthouse a11y audit + axe-core browser extension + manual keyboard testing

- [ ] Keyboard navigation through all interactive elements
- [ ] Focus states visible on all interactive elements
- [ ] Headings hierarchy correct (h1 → h2 → h3)
- [ ] All images have alt text
- [ ] Icon-only buttons have aria-labels
- [ ] Colour contrast WCAG AA (4.5:1 text, 3:1 large text)
- [ ] Compliance status not communicated by colour alone (add icons/text)
- [ ] Form errors linked to fields with `aria-describedby`
- [ ] Modals trap focus and close on Escape
- [ ] Skip-to-content link
- [ ] Screen reader tested on key flows (signup, add trip, compliance view)

---

## 7. Performance

**Best tool:** Lighthouse + Chrome DevTools + `npm run build` output

- [ ] Lighthouse performance score 90+ on landing page
- [ ] Dashboard loads under 3 seconds
- [ ] No layout shift (CLS) during load
- [ ] Images using Next.js `<Image>` component
- [ ] No unnecessary re-renders (React DevTools profiler)
- [ ] Database queries indexed (company_id, employee_id)
- [ ] No N+1 queries
- [ ] Bundle size reasonable (check `npm run build` output)
- [ ] Fonts using `next/font`
- [ ] Test on slow connection (Chrome devtools → Slow 3G)
- [ ] Cold start performance tested (first load after idle)
- [ ] Worst-case dataset tested (max employees + trips expected in beta)
- [ ] Slow Supabase response simulated (what does the user see?)

---

## 8. Backend / Database

**Best tool:** Claude Code (Opus) — schema review, migration audit, query analysis

### Data Integrity

- [ ] Foreign keys enforced
- [ ] Cascade deletes configured correctly
- [ ] Unique constraints where needed
- [ ] NOT NULL on required fields
- [ ] Dates use ISO format consistently
- [ ] Soft-delete vs hard-delete strategy intentional and documented

### API Quality

- [ ] All endpoints return correct HTTP status codes
- [ ] Error responses have consistent shape
- [ ] No stack traces exposed to client
- [ ] Pagination on list endpoints

### Database Operations

- [ ] Migrations run cleanly from scratch (`supabase db reset`)
- [ ] TypeScript types match schema (`npm run db:types`)
- [ ] Indexes on frequently queried columns
- [ ] Timestamps populated (created_at, updated_at)

### Reliability & Recovery

- [ ] Supabase on appropriate plan (not free tier for production)
- [ ] Database backups enabled
- [ ] Data corruption recovery plan documented (manual fix steps)
- [ ] Admin visibility into broken records (basic SQL queries or dashboard)

---

## 9. Email

**Best tool:** Manual testing across email providers

- [ ] Auth emails arrive in inbox (Gmail, Outlook, corporate)
- [ ] Sender address looks professional
- [ ] Email links work
- [ ] SPF/DKIM records configured for custom domain
- [ ] DMARC policy set (even `p=none` initially)
- [ ] Reply-to goes somewhere monitored
- [ ] Email templates mobile-responsive
- [ ] Test links on dark mode email clients
- [ ] Unsubscribe link on any marketing emails

---

## 10. Analytics & Monitoring

**Best tool:** Manual setup verification + Claude Code (Haiku) for quick config checks

### Error Tracking

- [ ] Error tracking active (Sentry, LogRocket, or Vercel)
- [ ] Client-side and server-side errors captured
- [ ] Source maps uploaded
- [ ] Alerting configured (email/Slack on error spikes)

### Product Analytics

- [ ] Signup events tracked
- [ ] Key actions tracked (trip created, employee added)
- [ ] Uptime monitoring active (UptimeRobot, Checkly, etc.)

### Early Warning Alerts

- [ ] Alert on zero signups for X hours/days
- [ ] Alert on webhook failures
- [ ] Alert on unusually high error rate per user/company

---

## 11. GDPR & Privacy

**Best tool:** Claude Code (Opus) — policy review, data flow audit, compliance gaps

### Legal Documents

- [ ] Privacy policy — real content, covers passport data
- [ ] Terms of service
- [ ] Cookie policy
- [ ] Liability disclaimer: "tracking aid, not legal advice"
- [ ] DPA template ready for enterprise testers

### Data Subject Rights

- [ ] Right to access: can you export user data on request?
- [ ] Right to deletion: can you fully delete an account?
- [ ] Right to portability: data export in CSV/JSON
- [ ] Process documented (even if manual)

### Data Handling

- [ ] Lawful basis identified for data processing
- [ ] Data retention policy defined
- [ ] Sub-processors listed (Supabase, Vercel, Stripe)
- [ ] Data residency documented (which regions?)
- [ ] Breach notification process defined
- [ ] Data minimisation review (are you storing anything you don't truly need?)
- [ ] Passport data masking strategy defined (last 4 chars, etc.)

### UK-Specific

- [ ] ICO registration (required for commercial personal data processing)
- [ ] UK GDPR / Data Protection Act 2018 compliance

---

## 12. Cookies & Consent

**Best tool:** Manual browser audit (DevTools → Application → Cookies)

- [ ] Audit all cookies your app sets
- [ ] Consent banner if using non-essential cookies
- [ ] Auth cookies documented as essential
- [ ] Analytics cookies only fire after consent
- [ ] Consent preference persists
- [ ] Declining cookies doesn't break the app

---

## 13. SEO & Marketing Site

**Best tool:** Lighthouse SEO audit + Claude Code (Sonnet) for meta tag review

- [ ] Meta titles and descriptions on all public pages
- [ ] Open Graph tags (test with LinkedIn/Twitter card validators)
- [ ] Structured data / JSON-LD
- [ ] `sitemap.xml` generated
- [ ] `robots.txt` allows public pages, blocks dashboard
- [ ] Canonical URLs set
- [ ] Landing page explains ComplyEur in 5 seconds
- [ ] CTA is obvious and works
- [ ] Social sharing preview looks correct
- [ ] Favicon and app icons (including Apple touch icon)
- [ ] Page titles unique per page (no duplicates)

---

## 14. Browser & Device Compatibility

**Best tool:** Manual testing + BrowserStack (if available)

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest) — especially date inputs and auth redirects
- [ ] Edge (latest)
- [ ] Safari on iOS
- [ ] Chrome on Android
- [ ] Test with ad blocker enabled (can break Stripe/analytics)

---

## 15. Infrastructure & DevOps

**Best tool:** Claude Code (Sonnet) — config review + manual Vercel/Supabase checks

### Deployment

- [ ] Production env variables set in Vercel
- [ ] Custom domain configured with SSL
- [ ] www redirect configured (pick one canonical)
- [ ] Preview deployments working
- [ ] `npm run build` clean

### CI/CD

- [ ] Tests run on PR (GitHub Actions or similar)
- [ ] Lint + typecheck run on PR
- [ ] Branch protection on `main`

### Disaster Recovery

- [ ] Database backup tested (restore at least once)
- [ ] Rollback plan: can redeploy previous Vercel deployment
- [ ] Vercel spending limits set
- [ ] Supabase plan appropriate for expected usage

---

## 16. Beta Program Operations

**Best tool:** Planning — not AI, this is your decision-making

### Onboarding

- [ ] Welcome email or in-app guide for new testers
- [ ] First-run experience: user knows what to do without help
- [ ] Video walkthrough or docs (even a Loom)

### Feedback Loop

- [ ] Feedback mechanism in-app (button, link, form)
- [ ] Bug report template
- [ ] Email list of all beta testers
- [ ] Single "beta feedback inbox" owner (one human responsible)
- [ ] Regular check-in cadence planned

### Expectations & Communication

- [ ] "Beta" label visible in the app
- [ ] "Please don't rely on this for legal decisions yet" message displayed
- [ ] SLA expectations clear (no uptime guarantee, etc.)
- [ ] What happens to beta data when you go live?
- [ ] Known-issues list shared with testers
- [ ] Changelog cadence defined (weekly/bi-weekly)

### Success Metrics

- [ ] Define what "successful beta" means before you start
- [ ] Activation metric defined
- [ ] Retention metric defined

---

## 17. Business & Legal

**Best tool:** Professional advice for legal matters — Claude (Opus) for drafting starting points

- [ ] Company/sole trader registered
- [ ] Business bank account for Stripe payouts
- [ ] Professional indemnity insurance (recommended for compliance tooling)
- [ ] Terms clearly state: not legal/immigration advice
- [ ] Pricing decided (even if beta is free)
- [ ] Competitor awareness and differentiators documented

---

## 18. Final Checks

**Best tool:** CLI commands + one full manual walkthrough

- [ ] `npm run build` → clean
- [ ] `npm run typecheck` → clean
- [ ] `npm run lint` → clean
- [ ] `npm run test:unit` → all pass
- [ ] `npm run test:e2e` → all pass
- [ ] Browser console clean during normal usage
- [ ] Grep for `TODO`, `FIXME`, `HACK` — resolve or accept
- [ ] No `console.log` with sensitive data
- [ ] Remove test/debug routes
- [ ] Full journey test: signup → add employee → add trip → view compliance → billing
- [ ] Someone who has never seen the app tries it without guidance
