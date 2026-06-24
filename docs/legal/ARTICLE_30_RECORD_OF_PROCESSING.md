# Article 30 Record of Processing Activities

Last reviewed: 2026-06-24

This engineering-owned ROPA draft supports GDPR / UK GDPR Article 30 review. It
must be reviewed by counsel or the nominated privacy owner before being treated
as a final legal record.

## Product Context

ComplyEur provides Schengen 90/180-day travel compliance tracking for customer
organisations. Customer organisations are usually controllers for employee and
traveller data they enter into the product. ComplyEur is generally a processor
for customer-managed employee/travel data and an independent controller for its
own account, billing, security, support, and marketing operations.

## Processing Activities

| Activity | Purpose | Data subjects | Personal data categories | Lawful basis / role | Recipients / processors | Retention | Security controls | Owner |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Account registration and authentication | Create and secure user accounts | Customer users, admins, owners | Email, name, auth provider, user id, MFA status, session metadata | Contract; ComplyEur controller for account operation | Supabase, Vercel | Account lifetime, then deletion/manual DSR process; auth logs per provider retention | Supabase Auth, httpOnly cookies, MFA for privileged users, session timeout | Engineering |
| Company and team administration | Manage company workspace, roles, invites, ownership, seat usage | Customer users and invited users | Email, name, company id, role, invite status, invite timestamps | Contract; ComplyEur processor/controller depending customer context | Supabase, Resend | Account lifetime; invite records expire/revoke; audit logs retained by policy | RLS, owner/admin server guards, rate limits, audit logging, MFA for privileged users | Engineering |
| Employee travel compliance tracking | Calculate Schengen rolling 90/180-day compliance | Customer-managed employees/travellers | Name, optional email, nationality type, trips, destination country, dates, purpose, job ref, private-trip flag | Customer controller; ComplyEur processor under contract | Supabase, Vercel | Company retention settings; deletion/anonymisation tools; backup expiry limitation | Tenant RLS, server-side authorization, audit logs, DSAR/export controls | Product / Engineering |
| Compliance alerts and notifications | Notify customers about travel risk and compliance events | Customer users and employees where included in content | Recipient email, employee-linked alert status, message, notification state | Contract / legitimate interest; customer controller for employee notice content | Resend, Supabase | Notification logs retained by policy; scrubbed on erase/anonymise where applicable | Rate limits, preference controls, notification log scrubbing | Product / Engineering |
| Imports and column mappings | Parse customer travel spreadsheets and reuse import mappings | Customer users and employees in imported files | Raw import rows, validation errors, result payloads, file metadata, user id | Contract; customer controller, ComplyEur processor | Supabase, Vercel | Raw/staging payloads minimized by retention job; mappings retained until changed/deleted | Tenant RLS, import validation, retention redaction | Engineering |
| Billing and subscription management | Process subscriptions, invoices, checkout, portal sessions, refunds and disputes | Customer billing contacts and admins | Stripe customer id, subscription status, invoice/payment metadata, billing emails | Contract and legal obligation; Stripe role varies by service | Stripe, Supabase, Resend | Legal/tax retention for billing records; subscription metadata retained while account active | Stripe-hosted checkout, webhook signature validation, entitlement reconciliation | Billing owner |
| Security, abuse prevention, and audit logging | Protect accounts, detect abuse, support incident response | Users, admins, requestors | User ids, IP-derived rate-limit keys, audit actions, security event metadata | Legitimate interest / legal obligation | Supabase, Upstash, Vercel, Sentry | Audit log retention policy; rate-limit windows; provider log retention | RLS, MFA, CSP, rate limits, origin checks, audit immutability, incident process | Security owner |
| Product analytics and cookies | Understand usage and marketing performance after consent | Website visitors and users | Cookie identifiers, event data, device/browser metadata, consent preferences | Consent for analytics; necessary cookies for requested service | Google Analytics, CookieYes, Vercel | GA4/CookieYes retention settings; user can withdraw consent | CookieYes gating, GA only after analytics consent | Growth / Privacy owner |
| Support and feedback | Respond to user requests and product feedback | Users, prospects, customer contacts | Email/contact details, message content, page path, operational metadata | Contract / legitimate interest | Supabase, Resend, Vercel, Sentry where relevant | Support retention schedule; manual DSR process | Access-limited admin views, audit logging where applicable | Support owner |
| Waitlist and public forms | Manage beta/public interest and prevent automated abuse | Prospects and website visitors | Email, company, message/source fields, Turnstile token metadata | Consent / legitimate interest depending form; anti-abuse legitimate interest | Supabase, Resend, Cloudflare Turnstile | Delete or suppress on request; marketing retention to be reviewed | Turnstile, rate limits, consent-aware communications | Growth / Support owner |

## International Transfers

Primary production database hosting is declared as London, UK. Supporting
services may process in the UK, EEA, United States, or other provider regions.
The processor register records transfer safeguards that legal must confirm
before broad public release.

## Review Cadence

- Review before public launch.
- Review after adding any processor, AI feature, export, import format,
  personal-data field, analytics event category, or automated decision/risk
  scoring beyond current compliance calculations.
- Review at least annually.
