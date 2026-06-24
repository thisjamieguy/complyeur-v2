# Processor and Subprocessor Register

Last reviewed: 2026-06-24

This register maps ComplyEur production processors and subprocessors to the
personal data they may process. It is an engineering evidence artefact for legal
review, customer due diligence, and public-release readiness. It is not legal
advice.

## Review Standard

- Confirm DPA, SCC, UK IDTA/Addendum, and transfer safeguards before public use.
- Update this register before adding a processor, analytics tool, support tool,
  AI service, email service, storage provider, or monitoring service that can
  receive personal data.
- The privacy policy provider list must match this register.

## Register

| Provider | Role | Processing purpose | Personal data categories | Region / transfer position | DPA / SCC status | Retention notes | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Supabase | Subprocessor / infrastructure provider | PostgreSQL database, Auth, Storage, Edge Functions | Account users, company records, employees, trips, alerts, import rows, audit records, auth metadata, DSAR archives | Production database is declared as London, UK; auth and platform services may process in provider regions | Legal to confirm current DPA and transfer terms | App data follows product retention; Auth deletion via admin process; backups expire by plan | `lib/supabase/*`, `supabase/migrations/*`, `app/auth/callback/route.ts` |
| Vercel | Subprocessor / hosting provider | Application hosting, serverless execution, edge delivery, deployment logs | Request metadata, IP-derived logs, application errors, limited user identifiers in logs where unavoidable | Global edge/platform processing; transfer safeguards required | Legal to confirm DPA and transfer terms | Platform logs per Vercel retention; application avoids sensitive logging | `vercel.json`, `proxy.ts`, `next.config.ts` |
| Stripe | Independent controller and/or processor depending context | Checkout, subscription billing, invoices, refunds, disputes, tax/accounting records | Billing contact data, Stripe customer IDs, subscription and invoice metadata, payment records handled by Stripe | Stripe operates internationally with transfer safeguards | Legal to confirm Stripe DPA/controller terms | Financial records retained for legal/tax obligations | `lib/billing/*`, `app/api/billing/*`, `docs/billing/STRIPE_FINALIZATION_RUNBOOK.md` |
| Resend | Subprocessor | Transactional email delivery for auth-related product email, compliance alerts, billing/support notifications | Recipient email, subject, notification content, delivery metadata | Provider-region processing; transfer safeguards required | Legal to confirm DPA and transfer terms | Provider logs retained by Resend; app notification logs scrubbed on erasure/anonymisation | `lib/services/email-service.ts`, `lib/services/waitlist-email.ts` |
| Sentry | Subprocessor | Error monitoring and operational diagnostics | Error events, stack traces, route context, limited identifiers where present; browser replay disabled | Provider-region processing; transfer safeguards required | Legal to confirm DPA and transfer terms | Event retention per Sentry project settings | `sentry.*.config.ts`, `instrumentation.ts`, `app/global-error.tsx` |
| Google Analytics 4 | Processor / analytics provider | Consent-gated website and product analytics | Cookie identifiers, device/browser metadata, page/event data | International transfer safeguards required | Legal to confirm GA terms and regional settings | Retention controlled in GA4 property; analytics only after consent | `components/analytics/consent-aware-google-analytics.tsx`, `lib/analytics/consent.ts` |
| CookieYes | Subprocessor / consent platform | Cookie consent banner, consent preference storage, consent event handling | Consent preference, cookie identifiers, browser metadata | Provider-region processing; transfer safeguards required | Legal to confirm DPA and transfer terms | Consent records per CookieYes settings | `app/layout.tsx`, `lib/cookieyes.ts`, `app/(public)/cookies/page.tsx` |
| Cloudflare Turnstile | Subprocessor / anti-abuse provider | Bot protection on selected public forms | Challenge token, IP/device/browser signals required for abuse prevention | Cloudflare international processing; transfer safeguards required | Legal to confirm DPA and transfer terms | Token/verification data per Cloudflare retention | `components/ui/turnstile.tsx`, `app/(preview)/landing/actions.ts` |
| Upstash Redis | Subprocessor | Distributed rate limiting and abuse prevention | IP-derived rate-limit keys, request counters, rate-limit analytics metadata | Provider-region processing; transfer safeguards required | Legal to confirm DPA and transfer terms | Rate-limit keys expire by limiter window/provider policy | `lib/rate-limit.ts` |

## Release Review Checklist

- [ ] Legal confirms each provider role and DPA/SCC status.
- [ ] Public Privacy Policy provider list matches this register.
- [ ] Cookie Policy reflects CookieYes, GA4, Stripe, Sentry, and Turnstile behavior.
- [ ] Production environment owners confirm Supabase, Vercel, Sentry, Stripe,
  Resend, CookieYes, Cloudflare, and Upstash account settings.
- [ ] New processors are added here before deployment.

