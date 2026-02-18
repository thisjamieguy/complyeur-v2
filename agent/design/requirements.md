# Project Requirements — ComplyEUR

**Project Name**: ComplyEUR
**Created**: 2026-02-18
**Status**: Active (Beta — approaching GA)

---

## Overview

ComplyEUR is a B2B SaaS application that helps UK companies track employee travel compliance with the EU's 90/180-day Schengen visa rule. Post-Brexit, UK citizens are treated as third-country nationals and can stay a maximum of 90 days within any rolling 180-day window in the Schengen Area. ComplyEUR automates tracking, alerting, and reporting so HR and compliance teams don't have to manage this manually in spreadsheets.

**Target Market**: UK businesses with employees who travel to the EU for work.

---

## Problem Statement

After Brexit, UK employees travelling to the EU must comply with the Schengen 90/180-day rule. Violations can result in fines, deportation, and entry bans. Companies currently track this with spreadsheets, which are error-prone, lack real-time visibility, and can't handle the rolling-window calculation correctly. There is no affordable, purpose-built tool for SMEs to manage this compliance risk.

---

## Goals and Objectives

### Primary Goals
1. Accurately calculate 90/180-day Schengen compliance for any employee at any point in time
2. Provide a clear dashboard showing compliance status across all employees
3. Alert users before employees approach or exceed the 90-day limit
4. Enable bulk import of trip data from existing spreadsheets (CSV/Excel)
5. Support multi-tenant architecture — each company sees only its own data

### Secondary Goals
1. Provide trip forecasting to help plan future travel
2. Support team collaboration with role-based access (admin, user, owner)
3. Offer GDPR-compliant data handling including subject access requests and anonymisation
4. Provide exportable compliance reports (CSV, PDF) for audit purposes
5. Support MFA for enhanced security on admin accounts

---

## Functional Requirements

### Core Features (Implemented)
1. **Authentication**: Email/password signup, Google OAuth, password reset, MFA (TOTP + backup codes)
2. **Dashboard**: Compliance overview table with per-employee status, alerts banner, pagination, search
3. **Employee Management**: CRUD operations with nationality type tracking (UK citizen, EU/Schengen citizen, rest of world — used for 90/180 exemptions)
4. **Trip Management**: Full CRUD for travel records with entry/exit dates, Schengen country selection, computed travel_days
5. **90/180 Compliance Engine**: Rolling-window calculator, presence calculator, risk scoring, safe-entry analysis, calendar-optimised compliance vectors
6. **Alerts System**: Real-time compliance alerts with severity levels (compliant, warning, violation), configurable thresholds
7. **Bulk Import**: CSV/Excel upload with column mapping, validation, batch insertion, import history
8. **Data Export**: CSV and PDF export with audit tracking
9. **Calendar View**: Visual trip timeline (entitlement-gated)
10. **Trip Forecasting**: Future alert projection and trip modelling
11. **Settings**: Company settings, column mappings for import, import history
12. **Admin Panel**: Company management, tier management, activity logs (superadmin only)
13. **Billing**: Stripe subscription management with tiered plans, entitlement-based feature gating
14. **Team Management**: Invite system, role assignment (owner/admin/user), user limits per tier
15. **GDPR**: Data subject access requests, data anonymisation, consent management (CookieYes)
16. **Onboarding**: Dashboard tour for new users, completion tracking
17. **Feedback**: In-app feedback submission

### Feature Gating (Entitlement System)
Features are gated by subscription tier via `company_entitlements`:
- Free tier: Basic compliance tracking, limited employees
- Paid tiers: Calendar view, exports, forecasting, team invites, increased limits

---

## Non-Functional Requirements

### Performance
- Dashboard loads in < 2 seconds for companies with up to 500 employees
- Compliance calculations complete in < 200ms per employee
- Bulk import handles 1000+ rows without timeout

### Security
- Row-Level Security (RLS) on every table — enforced by `rls_auto_enable()` trigger
- Multi-tenant isolation via `get_current_user_company_id()` (cached per-statement)
- Service role key never exposed in frontend code
- MFA available for all users, enforceable for admin accounts
- Audit logging for admin actions
- Content Security Policy headers configured
- Rate limiting on auth endpoints (Upstash Redis)

### Scalability
- Supabase PostgreSQL handles horizontal read scaling
- Vercel edge deployment for global performance
- Entitlement system allows flexible tier management without code changes

### Reliability
- Three-environment deployment pipeline (local → staging → production)
- Error boundaries with server-side logging (Sentry)
- Graceful error handling with user-friendly messages
- Toast notifications for all async action feedback

---

## Technical Requirements

### Technology Stack
- **Framework**: Next.js 16.1.1 (App Router, Turbopack)
- **UI Library**: React 19.2.3
- **Language**: TypeScript 5 (strict mode)
- **Styling**: Tailwind CSS 4 + Shadcn/UI (Radix primitives)
- **Database**: Supabase (PostgreSQL + Auth + RLS)
- **Payments**: Stripe 20.3.1
- **Date Handling**: date-fns 4.1.0 (mandatory — no native JS Date for compliance calculations)
- **Forms**: React Hook Form 7.70.0 + Zod 4.3.5
- **Email**: Resend 6.6.0
- **Error Tracking**: Sentry 10.32.1
- **Rate Limiting**: Upstash Redis
- **Testing**: Vitest 4.0.16 (unit/integration) + Playwright 1.57.0 (E2E)
- **Hosting**: Vercel (frontend) + Supabase Cloud (backend)

### Key Dependencies
- `@supabase/supabase-js` 2.89.0 — Database client
- `@supabase/ssr` 0.8.0 — Server-side auth management
- `stripe` 20.3.1 — Payment processing
- `date-fns` 4.1.0 — Date calculations (critical for compliance accuracy)
- `zod` 4.3.5 — Runtime validation
- `xlsx` / `jszip` — Spreadsheet import/export
- `@react-pdf/renderer` 4.3.2 — PDF generation
- `next-themes` 0.4.6 — Dark mode

### Integrations
- **Supabase Auth**: User authentication (email + Google OAuth)
- **Stripe**: Subscription billing, webhook handling, entitlement sync
- **Resend**: Transactional email (invites, alerts)
- **Sentry**: Error tracking and performance monitoring
- **Vercel**: Hosting, edge functions, speed insights
- **CookieYes**: GDPR cookie consent

---

## User Stories

### As a Company Admin
1. I want to see all my employees' Schengen compliance status at a glance so I can identify risks immediately
2. I want to import trip data from Excel so I don't have to re-enter hundreds of records manually
3. I want to receive alerts when an employee is approaching the 90-day limit so I can prevent violations
4. I want to export compliance reports as PDF so I can share them with leadership or auditors
5. I want to invite team members with specific roles so the right people can manage travel data
6. I want to forecast future trips so I can plan travel without risking non-compliance

### As an Employee Manager
1. I want to add and edit employee travel records so compliance status stays current
2. I want to see a calendar view of an employee's travel history so I can visualise patterns
3. I want to configure alert thresholds so warnings trigger at the right time for our risk tolerance

### As a Site Owner / Superadmin
1. I want to manage company tiers and entitlements so I can control feature access
2. I want to view activity logs so I can monitor platform usage
3. I want to manage billing through Stripe so subscriptions are handled automatically

---

## Constraints

### Technical Constraints
- Must use `date-fns` (parseISO) for all date operations — native JS Date causes timezone-related calculation errors
- Supabase RLS is mandatory on every table — no exceptions
- Stripe webhook must be validated server-side only (service role key)
- ISO date strings (`'2025-10-12'`) required for all compliance calculations

### Business Constraints
- Solo founder with AI-assisted development — no dedicated QA team
- Must support UK businesses as primary market (post-Brexit compliance)
- Free tier must be viable for small companies to drive adoption
- Must comply with GDPR (UK and EU data protection)

### Resource Constraints
- Single developer for implementation
- Supabase free/pro tier for infrastructure
- Vercel hosting (hobby/pro tier)
- Budget-conscious infrastructure choices

---

## Success Criteria

### MVP Success Criteria (Achieved)
- [x] Users can sign up, log in, and manage their company account
- [x] Employees and trips can be created, read, updated, and deleted
- [x] 90/180-day compliance is calculated accurately with rolling window
- [x] Dashboard shows compliance status for all employees
- [x] Alerts warn users before employees exceed limits
- [x] Bulk import from CSV/Excel works with column mapping
- [x] Multi-tenant data isolation verified
- [x] Stripe billing integration functional

### GA Launch Success Criteria
- [ ] All E2E tests pass on staging environment
- [ ] Load testing validates performance under expected scale
- [ ] Stripe webhook edge cases tested in sandbox
- [ ] Rate limiting fully integrated across all endpoints
- [ ] Monitoring and alerting configured (Sentry + Vercel)
- [ ] Landing page and marketing site ready
- [ ] Privacy policy and terms of service published
- [ ] Customer support process defined
- [ ] First 10 beta users onboarded with positive feedback

---

## Out of Scope

1. **Mobile native app**: Web-only for initial release (responsive design covers mobile use)
2. **Multi-country visa rules**: Only Schengen 90/180 rule — no US, UK, or other visa tracking
3. **Automated trip detection**: Users manually enter trips (no GPS/calendar integration)
4. **Real-time collaboration**: No simultaneous editing (standard request-response)
5. **Advanced analytics/BI**: Basic dashboard only, no custom report builder
6. **API for third-party integrations**: No public API for v1
7. **On-premise deployment**: Cloud-only (Vercel + Supabase)

---

## Assumptions

1. Target users have reliable internet connectivity
2. Companies have HR or admin staff who will manage the tool
3. Trip data is entered manually or via spreadsheet import
4. Supabase and Vercel infrastructure will remain available and affordable
5. Stripe pricing model supports the planned subscription tiers
6. UK remains outside the Schengen Area (fundamental to the product's existence)

---

## Risks

| Risk | Impact | Probability | Mitigation Strategy |
|------|--------|-------------|---------------------|
| Compliance calculation error | Critical | Low | Extensive test suite (5,963+ lines of compliance tests), edge case coverage |
| Data breach / multi-tenant leak | Critical | Low | RLS on all tables, tenant isolation verified in tests, audit logging |
| Stripe billing failure | High | Low | Webhook retry logic, entitlement sync on tier change, manual override in admin |
| Supabase outage | High | Low | Error boundaries, graceful degradation, status monitoring |
| Low user adoption | High | Medium | Free tier for onboarding, Excel import for easy migration, clear value proposition |
| Regulation change (Schengen rules) | Medium | Low | Configurable thresholds, modular compliance engine |
| Solo developer burnout | Medium | Medium | AI-assisted development, incremental releases, clear scope boundaries |

---

## Timeline

### Phase 1: Foundation (Completed)
- Project setup, Supabase schema, auth, basic CRUD
- Compliance calculation engine with tests
- Dashboard and employee/trip management

### Phase 2: Core Features (Completed)
- Bulk import/export
- Alerts system
- Calendar view
- Settings and admin panel
- Stripe billing integration

### Phase 3: Polish & Hardening (Current)
- MFA implementation
- Team management and invites
- GDPR features
- Onboarding flows
- Bug fixes and edge case handling
- Performance optimisation

### Phase 4: Launch (Next)
- Final E2E testing and load testing
- Marketing site and landing page
- Privacy policy and terms
- Beta user onboarding
- GA release

---

## Stakeholders

| Role | Name/Team | Responsibilities |
|------|-----------|------------------|
| Founder / Product Owner | James Walsh | Requirements, priorities, business decisions |
| Lead Developer | James Walsh + AI | Architecture, implementation, testing |
| Target Users | UK HR/Compliance teams | Provide feedback, validate product-market fit |

---

## References

- [Schengen 90/180-day rule](https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/border-crossing_en): Official EU documentation
- [Supabase Documentation](https://supabase.com/docs): Database and auth platform
- [Next.js Documentation](https://nextjs.org/docs): Frontend framework
- [Stripe Documentation](https://stripe.com/docs): Payment processing

---

**Status**: Active
**Last Updated**: 2026-02-18
**Next Review**: Before GA launch
