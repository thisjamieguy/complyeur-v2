# Stripe Finalization Runbook

This runbook closes the remaining manual actions for Section 4.

## Repository Controls Added 2026-06-15

- Stripe client API version is pinned in `lib/billing/stripe.ts`.
- Checkout and portal mutations require `PERMISSIONS.BILLING_MANAGE`.
- Checkout reuses an existing `companies.stripe_customer_id` when present.
- Checkout session creation sends `client_reference_id`, `company_id`,
  `user_id`, `plan_slug`, `billing_interval`, and `source` metadata.
- Checkout completion refuses entitlement changes when required metadata is
  missing or when Stripe customer/company/user invariants do not match.

These controls still require live Stripe evidence before paid/public beta.

Repository-side hardening added on 2026-06-18:

- The billing webhook now stores the latest applied Stripe event metadata on
  `company_entitlements`.
- Older subscription lifecycle events are ignored instead of overwriting newer
  entitlement state.

## Prerequisites
- `STRIPE_SECRET_KEY` is set (test or live key, matching the environment).
- `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set.
- `NEXT_PUBLIC_APP_URL` or `STRIPE_WEBHOOK_BASE_URL` is set.

## 1) Replace Placeholder Price IDs in `tiers`

### 1.1 Fill mapping file
Edit:
- `scripts/stripe-price-mapping.beta.template.json`

Replace each `price_REPLACE_*` value with real Stripe `price_...` IDs.

### 1.2 Dry run validation
```bash
pnpm tsx scripts/syncStripePrices.ts \
  --mapping scripts/stripe-price-mapping.beta.template.json \
  --interval both \
  --dry-run
```

### 1.3 Apply update
```bash
pnpm tsx scripts/syncStripePrices.ts \
  --mapping scripts/stripe-price-mapping.beta.template.json \
  --interval both
```

### 1.4 Verify stored IDs actually exist in Stripe
```bash
pnpm tsx scripts/auditStripePriceIds.ts
```

Optional JSON output:
```bash
pnpm tsx scripts/auditStripePriceIds.ts --json
```

## 2) Configure/Validate Webhook Endpoint

Required event set:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`
- `charge.refunded`
- `charge.dispute.created`

### 2.1 Create or update endpoint
```bash
pnpm tsx scripts/configureStripeWebhook.ts
```

By default, this targets:
- `${STRIPE_WEBHOOK_BASE_URL}/api/billing/webhook`
- or `${NEXT_PUBLIC_APP_URL}/api/billing/webhook`

Override explicitly:
```bash
pnpm tsx scripts/configureStripeWebhook.ts \
  --endpoint https://your-domain.com/api/billing/webhook
```

### 2.2 Check-only validation
```bash
pnpm tsx scripts/configureStripeWebhook.ts --check
```

### 2.3 List all Stripe webhook endpoints
```bash
pnpm tsx scripts/configureStripeWebhook.ts --list
```

## 3) Confirm Beta Pricing Model

Reference:
- `docs/billing/BETA_PRICING_MODEL.md`

This doc defines:
- tier prices
- value metric (`tracked employees`)
- seat guardrails
- Stripe product/price naming convention

## 4) Stripe CLI Smoke Test (optional)

1. Forward events:
```bash
stripe listen --forward-to http://127.0.0.1:3000/api/billing/webhook
```
2. Trigger event:
```bash
stripe trigger checkout.session.completed
```
3. Confirm webhook logs and DB updates.

## 5) Required Lifecycle Evidence Before Paid/Public Beta

Store evidence in `docs/operations/evidence/stripe-verification/`.

- webhook endpoint configured for the deployed environment
- webhook signing secret present in the matching environment
- successful checkout creates or reuses the expected Stripe customer
- checkout metadata contains company, user, plan, interval, and source
- webhook replay does not duplicate entitlement changes
- stale or out-of-order subscription events do not downgrade fresh state
- failed payment produces the expected subscription/entitlement state and alert
- cancellation produces the expected subscription/entitlement state
- failed webhook events are visible to the billing/support owner
- reconciliation script or manual reconciliation process resolves any missed
  lifecycle events

## 6) Deployed Monitoring First-Run Evidence

Store zero-signup and webhook monitoring evidence in `docs/operations/evidence/`.

```bash
pnpm beta:monitoring:check -- --base-url https://complyeur.com
```

This helper:

- calls the CRON-protected `/api/cron/beta-monitoring` endpoint
- validates the JSON response shape
- writes a dated Markdown evidence note without storing secrets

If alert delivery is expected, attach the corresponding mailbox or dashboard
proof to the generated evidence note.

## 7) Reconcile Stripe Subscription State

Use this after a webhook outage, missed event, or manual Stripe dashboard
change. The script refreshes subscription status, current period end, and tier
capabilities from Stripe for entitlements that still have a Stripe subscription
ID. Cancelled subscriptions are downgraded to the free tier.

Dry run:

```bash
pnpm tsx scripts/reconcileStripeSubscriptions.ts --dry-run
```

Apply:

```bash
pnpm tsx scripts/reconcileStripeSubscriptions.ts
```

Limit to one subscription:

```bash
pnpm tsx scripts/reconcileStripeSubscriptions.ts --subscription sub_...
```
