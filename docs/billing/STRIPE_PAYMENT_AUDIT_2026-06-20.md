# Stripe Payment System Audit — ComplyEur

**Audit date:** 2026-06-20
**Scope:** Every part of the Stripe integration — checkout, webhooks, customer portal,
entitlements, billing emails, database schema, operational scripts, security, and tests.
**Auditor:** Automated code audit (claude/stripe-payment-audit)

---

## How to read this

Each area gets a **score out of 10** and a short plain-English explanation, followed by
the technical detail. Findings are tagged by severity:

- 🔴 **High** — fix before relying on it for real money / real customers
- 🟠 **Medium** — works today but will bite you; fix soon
- 🟡 **Low** — polish, consistency, or nice-to-have
- 🟢 **Good** — done well, no action needed

---

## Overall verdict

**Overall score: 8.0 / 10 — Solid and genuinely well-built for a solo founder.**

The hard, dangerous parts are done correctly: webhook signatures are verified, the
webhook is idempotent (it won't double-charge or double-provision on Stripe retries),
secret keys never touch the frontend, and every billing action is permission-checked and
rate-limited. This is better than most early-stage SaaS billing code.

The weaknesses are not security holes — they're **correctness gaps around edge cases**
(first-period renewal dates, annual vs monthly amounts in emails) and **three competing
sources of truth for pricing** (your code, your database, and Stripe). None will lose you
money silently, but a couple will produce wrong-looking emails and could confuse a
customer.

| Area | Score | One-line summary |
|------|-------|------------------|
| Webhook security & idempotency | 9.5 / 10 | Excellent — signature verified, replay-proof |
| Secret / key management | 10 / 10 | Textbook. Server-only, env-driven |
| Checkout flow | 8 / 10 | Solid, well-validated; minor inconsistencies |
| Customer portal | 9 / 10 | Clean and correct |
| Entitlements & access control | 8.5 / 10 | Permission + MFA + rate-limit on every path |
| Database schema & constraints | 9 / 10 | Format checks, unique indexes, RLS all present |
| Subscription lifecycle coverage | 6.5 / 10 | Missing a couple of events; first-period gap |
| Billing emails (cron) | 7 / 10 | Works; shows wrong amount for annual plans |
| Pricing source-of-truth | 6 / 10 | Price defined in 3 places, no drift guard |
| Operational scripts | 8.5 / 10 | Sync/audit/configure scripts are a real asset |
| Tests | 8 / 10 | Good coverage of the risky webhook logic |

---

## 1. Webhook security & idempotency — 9.5 / 10 🟢

**File:** `app/api/billing/webhook/route.ts`, `lib/billing/stripe.ts`

This is the strongest part of the system. In plain English: when Stripe phones your app to
say "this customer paid," you correctly prove the call really came from Stripe, and you
make sure that if Stripe phones twice about the same thing (which it does), you only act
once.

What's done well 🟢:
- **Signature verification** via `constructWebhookEvent` using `STRIPE_WEBHOOK_SECRET`.
  An attacker can't fake a "payment succeeded" event.
- **Raw body read with `request.text()`** before parsing — required for signature checks
  to work. (A very common bug is to parse JSON first, which breaks verification. You
  avoided it.)
- **Idempotency via a claim table** (`stripe_webhook_events`): you `INSERT` the event ID
  first; the unique constraint (Postgres error `23505`) tells you it's a duplicate. This is
  the correct, race-safe pattern.
- **Stale-claim reclaim**: if a previous attempt died mid-processing, after 5 minutes
  another attempt can reclaim it. Prevents events getting permanently stuck.
- **Guardrails**: missing-signature → 400, wrong content-type → 400, empty body → 400,
  >1 MB payload → 413.
- **Correct retry semantics**: processing failures return **500**, so Stripe retries.
  Success returns **200**.
- Webhook is correctly **excluded from first-party origin checks** in `proxy.ts` (it
  authenticates via Stripe signature, not browser origin) and is in the public-route list.
- RLS is enabled on `stripe_webhook_events`; only the service-role admin client touches it.

🟡 **Low — permanent errors retry for ~3 days.** Some failures are *not* transient — e.g.
`Unknown tier slug`, or metadata mismatch. These currently return 500, so Stripe will keep
retrying them every few hours for ~3 days before giving up. Consider returning **200** (and
logging loudly / alerting) for *known-permanent* errors so they don't masquerade as
outages. Transient DB errors should still 500. This is a refinement, not a bug.

🟡 **Low — webhook payloads contain PII with no retention policy.** The full event JSON
(customer email, names) is stored in `stripe_webhook_events.payload` forever. For GDPR
hygiene, add a periodic cleanup (e.g. delete `processed` rows older than 90 days). You
already have GDPR retention cron infrastructure to model this on.

---

## 2. Secret / key management — 10 / 10 🟢

**Files:** `lib/billing/stripe.ts`, `app/api/billing/checkout/route.ts`

- `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are read **only server-side**, from env
  vars, and throw clearly if missing.
- **No `@stripe/stripe-js`, no `loadStripe`, no publishable key embedded in client code** —
  you use Stripe **Hosted Checkout** (full redirect to `stripe.com`) and the **Hosted
  Customer Portal**. This is the simplest, safest model: card data never touches your
  servers or your DOM, so your PCI scope is minimal (SAQ A).
- The Stripe client is a lazily-initialised singleton — no key is read at import time.

No action needed. This is exactly how it should look.

---

## 3. Checkout flow — 8 / 10 🟠

**File:** `app/api/billing/checkout/route.ts`

Plain English: when someone clicks "Subscribe," this builds a secure Stripe checkout page
and sends them to it. It's well-guarded and validates everything.

What's done well 🟢:
- `requireMutationPermission(BILLING_MANAGE)` → auth + role + MFA + rate-limit on every
  call.
- Strict input validation: plan slug must be a known self-serve plan, billing interval must
  be `monthly`/`annual`, source must be `pricing`/`onboarding`, promo code length capped.
- Tier is re-read from the DB (not trusted from the client) and inactive tiers are rejected.
- Rich metadata on the session (`plan_slug`, `company_id`, `user_id`, `client_reference_id`)
  — and the webhook **cross-checks** that `metadata.user_id` and `metadata.company_id`
  match the authenticated profile. Tampering is caught.
- Promo codes are resolved server-side against Stripe and validated before use.
- Reuses an existing `stripe_customer_id` when present (avoids duplicate Stripe customers).
- The **localhost bypass** (`provisionLocalCheckoutBypass`) is correctly gated on
  `NODE_ENV !== 'production'` **and** hostname `localhost`/`127.0.0.1`/`[::1]`, and tags the
  result `manual_override: true`. Safe — it cannot fire on Vercel preview/prod.

🟠 **Medium — inconsistent Stripe access style.** Checkout talks to Stripe via **raw
`fetch`** to `api.stripe.com`, while the portal uses the **SDK** (`getStripe()`). Both work,
but the raw-fetch path re-implements error handling and is easier to get subtly wrong.
Recommend standardising on the SDK (`getStripe().checkout.sessions.create(...)`) so you get
typing, retries, and version pinning for free. (You already pin `Stripe-Version` manually
here, which is good — but it's a thing you have to remember.)

🟡 **Low — `successUrl.searchParams.set('checkout','success')` is set twice** (lines ~311
and ~363). Harmless, just dead duplication.

🟡 **Low — no Stripe trial on the session.** Checkout always provisions
`is_trial: false` / `subscription_status: 'active'`. Your trials are **app-managed** (via
`is_trial` / `trial_ends_at`), not Stripe-managed. That's a valid choice, but it means the
Stripe dashboard never shows "trialing." Just be aware the two systems can disagree.

---

## 4. Customer portal — 9 / 10 🟢

**File:** `app/api/billing/portal/route.ts`, `components/settings/billing-section.tsx`

- Permission-guarded, looks up the company's `stripe_customer_id`, creates a Billing Portal
  session via the SDK, returns the URL. Clean.
- Friendly 404 if the company has no Stripe customer yet ("subscribe first").
- UI has a loading state and an error state, and only shows "Manage Billing" when a Stripe
  customer exists — matches your "no broken buttons" UI standard.

🟡 **Low** — `return_url` points to `/settings?section=general` while the portal entry in
`entitlement-middleware.ts` redirects to `/api/billing/portal?reason=entitlement_denied`.
Minor: confirm `reason` is actually consumed anywhere (it appears to be informational only).

---

## 5. Entitlements & access control — 8.5 / 10 🟢

**Files:** `lib/billing/entitlements.ts`, `lib/billing/entitlement-middleware.ts`

- `checkEntitlement()` is server-only, uses RLS, and is wrapped in `React.cache()` so many
  feature checks in one request collapse to a single DB query. Good for performance.
- `enforceBillingEntitlements()` is a flexible gate: checks subscription status, allowed
  plans, and seat limits (via the `get_company_seat_usage` RPC). Fails closed (deny on
  error). 🟢

🟠 **Medium — entitlement booleans are duplicated, not derived.** On every checkout /
subscription change you copy ~10 capability flags (`can_export_csv`, `can_forecast`, …)
from `tiers` onto `company_entitlements`. If you ever change what a tier includes, existing
customers keep the **old** flags until their next subscription event. Consider deriving
capabilities by joining to `tiers` at read time, or add a backfill job when a tier changes.
This is a maintainability trap more than a live bug.

---

## 6. Database schema & constraints — 9 / 10 🟢

**Files:** `supabase/migrations/2026021618...`, `...200000_stripe_billing_hardening...`,
`...221914_security_rls_stripe_webhook_events`, `...add_processing_started_at...`

- `stripe_customer_id` and `stripe_subscription_id` are **UNIQUE** with partial indexes —
  one Stripe customer can't be attached to two companies.
- **Format CHECK constraints** (`cus_…`, `sub_…`, `price_…`) catch bad/placeholder IDs at
  the DB layer. The migration even scrubs old underscore-style placeholder price IDs before
  adding the constraint. Thoughtful.
- `subscription_status` is constrained to the real Stripe status set.
- `stripe_webhook_events` has the right shape for idempotency (`stripe_event_id UNIQUE`,
  status, timestamps, `processing_started_at` for stale reclaim) and RLS is on.
- The migration also wires up `rls_auto_enable_trigger` so future tables get RLS
  automatically — good defence in depth.

🟡 **Low** — two migrations both add the Stripe columns (`add_stripe_billing_columns` and
the later `hardening_template`). Both are idempotent (`IF NOT EXISTS`), so it's safe, just
slightly redundant history.

---

## 7. Subscription lifecycle coverage — 6.5 / 10 🟠

**File:** `app/api/billing/webhook/route.ts`, `scripts/configureStripeWebhook.ts`

You handle four events: `checkout.session.completed`,
`customer.subscription.updated`, `customer.subscription.deleted`,
`invoice.payment_failed`. The core path is correct, but there are gaps:

🟠 **Medium — `current_period_end` may be null for a brand-new subscription.**
`checkout.session.completed` provisions the plan but does **not** set `current_period_end`.
That field is only populated by `customer.subscription.updated`. You do **not** subscribe to
`customer.subscription.created`. So after a first successful checkout, the renewal date can
stay `null` until Stripe happens to send an `updated` event — which means the **"upcoming
renewal" email won't fire for the first billing period**. Fix options:
  1. Subscribe to `customer.subscription.created` and set the period end there, **or**
  2. In `handleCheckoutCompleted`, fetch the subscription
     (`stripe.subscriptions.retrieve(subscriptionId)`) and set `current_period_end`
     immediately.

🟠 **Medium — no `charge.refunded` / `charge.dispute.created` handling.** Refunds and
chargebacks won't update your records or alert you. Not catastrophic (entitlements still
follow `subscription.updated`/`deleted`), but for a paid product you'll want at least an
**alert** on disputes — chargebacks can threaten your Stripe account standing.

🟢 **Good** — `handleSubscriptionUpdated` correctly reads `current_period_end` at the
**subscription-item** level (`items.data[0].current_period_end`), which is right for the
`2026-01-28.clover` API version where that field moved off the subscription object. Many
integrations get this wrong.

🟢 **Good** — `invoice.payment_failed` sends a dunning email; the actual status change to
`past_due` correctly arrives via `customer.subscription.updated`.

---

## 8. Billing emails (cron) — 7 / 10 🟠

**File:** `app/api/cron/billing/route.ts`

- Daily cron (`0 9 * * *`), authenticated with `withCronAuth` (constant-time secret
  compare, fail-closed in prod). 🟢
- Dedupe via `billing_email_log` so retries don't spam customers. 🟢
- Sends trial-expiring (3 days out) and upcoming-renewal (7 days out) emails.

🟠 **Medium — wrong amount shown for annual subscribers.** The renewal email always uses
`plan.monthlyPriceGbp` (line ~163), even for annual plans. An annual Pro customer will be
told their renewal is **£149** when it's actually **£1,490**. The code comment even flags
"in practice this should come from Stripe." Fix: read the actual upcoming amount from the
Stripe invoice/subscription, or at minimum branch on the stored billing interval.

🟠 **Medium — depends on the §7 gap.** Because `current_period_end` can be null for the
first period, the renewal email may never send for a customer's first renewal regardless.
Fixing §7 fixes this too.

🟡 **Low — N+1 queries.** The cron loops candidates and does a `billing_email_log` lookup +
a `companies` lookup per row. Fine at beta volume; revisit if you scale to thousands of
companies.

---

## 9. Pricing source-of-truth — 6 / 10 🟠

This is the biggest *structural* risk, and the one I'd most want you to understand as a
newcomer.

Your prices live in **three** places:
1. **`lib/billing/plans.ts`** — hardcoded `monthlyPriceGbp` / `annualPriceGbp` shown on the
   pricing page and used in renewal emails.
2. **`tiers` table** — `stripe_price_id_monthly` / `stripe_price_id_annual` (what actually
   gets charged).
3. **Stripe** — the real price objects.

If you change a price in Stripe but forget `plans.ts`, your **pricing page lies** to
customers. If `tiers` points at the wrong Stripe price, you **charge the wrong amount**.
There's no automated check that all three agree.

🟠 **Medium — add a drift guard.** You already have `auditStripePriceIds.ts` (compares
`tiers` ↔ Stripe). Extend it (or add a test) to also assert the **amount** in Stripe
matches `plans.ts`, and run it in CI / pre-release. That turns a silent customer-facing bug
into a build failure.

---

## 10. Operational scripts — 8.5 / 10 🟢

**Files:** `scripts/syncStripePrices.ts`, `scripts/auditStripePriceIds.ts`,
`scripts/configureStripeWebhook.ts`

This is a genuine strength and unusual to see this early:
- `syncStripePrices` — maps tier slugs → Stripe price IDs, **validates each price exists in
  Stripe** before writing, supports `--dry-run`, warns on inactive prices. 🟢
- `auditStripePriceIds` — verifies every `tiers` price ID resolves in Stripe, exits non-zero
  on invalid (CI-friendly). 🟢
- `configureStripeWebhook` — creates/updates the webhook endpoint with the exact required
  event set, plus a `--check` mode for CI. 🟢

🟡 **Low — API version not pinned in scripts.** These create `new Stripe(key, { typescript:
true })` **without** `apiVersion`, so they use the SDK's built-in default, which can differ
from the `2026-01-28.clover` version pinned in `lib/billing/stripe.ts`. Pin the same
`STRIPE_API_VERSION` constant everywhere to avoid surprises when the SDK upgrades.

---

## 11. Tests — 8 / 10 🟢

**Files:** `__tests__/unit/billing/webhook.test.ts`, `routes.test.ts`,
`__tests__/jest/billing/*`

- The risky logic — webhook idempotency, claim/reclaim, CLI price sync, entitlement
  middleware, a Stripe-CLI simulation — all have tests. Good prioritisation: you tested the
  parts most likely to lose money.

🟡 **Low — add tests for the gaps above** once fixed: first-period `current_period_end`,
annual renewal amount, and a price-drift assertion.

---

## Prioritised action list

Do these in order. The first three are the ones that affect real customers.

| # | Severity | Action | File |
|---|----------|--------|------|
| 1 | 🟠 Medium | Set `current_period_end` on first checkout (handle `subscription.created` or fetch the sub in `handleCheckoutCompleted`) | `webhook/route.ts`, `configureStripeWebhook.ts` |
| 2 | 🟠 Medium | Fix renewal email to use the real amount (or branch monthly/annual) | `cron/billing/route.ts` |
| 3 | 🟠 Medium | Add `charge.dispute.created` alerting (at minimum) | `webhook/route.ts`, `configureStripeWebhook.ts` |
| 4 | 🟠 Medium | Add a price-drift guard across `plans.ts` ↔ `tiers` ↔ Stripe in CI | `auditStripePriceIds.ts` |
| 5 | 🟠 Medium | Derive entitlement capabilities from `tiers` (or backfill on tier change) | `webhook/route.ts`, `entitlements.ts` |
| 6 | 🟡 Low | Standardise on the Stripe SDK in checkout (drop raw `fetch`) | `checkout/route.ts` |
| 7 | 🟡 Low | Pin `STRIPE_API_VERSION` in all scripts | `scripts/*.ts` |
| 8 | 🟡 Low | Add retention cleanup for `stripe_webhook_events` payloads | new migration / cron |
| 9 | 🟡 Low | Return 200 (+ alert) for known-permanent webhook errors | `webhook/route.ts` |

**Nothing here is an emergency.** The system is safe to take real payments with today — the
fixes are about correctness at the edges and long-term maintainability.
