# Stripe Finalization Runbook

This runbook closes the remaining manual actions for Section 4.

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
