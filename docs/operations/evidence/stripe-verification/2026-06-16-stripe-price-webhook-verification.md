# Stripe Price And Webhook Verification

Date: 2026-06-16
Environment: Production
Operator: Codex using Stripe connector plus production env pulled from Vercel

## Scope

This evidence closes the public-beta checks for:

- Live Stripe prices existing and matching `public.tiers`.
- Production billing webhook endpoint existing with the required event set.

It does not close subscription lifecycle simulation/replay evidence.

## Price Mapping Evidence

Stripe connector search confirmed the active GBP prices in the connected Stripe
account:

| Tier | Interval | Stripe price | Amount |
| --- | --- | --- | --- |
| Basic (`free`) | Monthly | `price_1TRevSANIxv7H45OhKV4gmdh` | GBP 49.00 |
| Basic (`free`) | Annual | `price_1TReveANIxv7H45Oa7kFq20Y` | GBP 490.00 |
| Pro (`starter`) | Monthly | `price_1TRevhANIxv7H45O5P9THwcj` | GBP 149.00 |
| Pro (`starter`) | Annual | `price_1TRevlANIxv7H45OQJQbPL4n` | GBP 1,490.00 |
| Pro+ (`professional`) | Monthly | `price_1TRevoANIxv7H45ObWD8ltH7` | GBP 349.00 |
| Pro+ (`professional`) | Annual | `price_1TRevsANIxv7H45OGiVPBhm5` | GBP 3,490.00 |

Production dry-run sync result:

```text
[syncStripePrices] No change for tier 'free'.
[syncStripePrices] No change for tier 'starter'.
[syncStripePrices] No change for tier 'professional'.
[syncStripePrices] Summary: updated=0, skipped=3, failed=0.
```

Production Stripe price audit result:

```text
[VALID] tier=free interval=monthly price=price_1TRevSANIxv7H45OhKV4gmdh :: ok (49.00 GBP, month, active=true)
[VALID] tier=free interval=annual price=price_1TReveANIxv7H45Oa7kFq20Y :: ok (490.00 GBP, year, active=true)
[VALID] tier=starter interval=monthly price=price_1TRevhANIxv7H45O5P9THwcj :: ok (149.00 GBP, month, active=true)
[VALID] tier=starter interval=annual price=price_1TRevlANIxv7H45OQJQbPL4n :: ok (1490.00 GBP, year, active=true)
[VALID] tier=professional interval=monthly price=price_1TRevoANIxv7H45ObWD8ltH7 :: ok (349.00 GBP, month, active=true)
[VALID] tier=professional interval=annual price=price_1TRevsANIxv7H45OGiVPBhm5 :: ok (3490.00 GBP, year, active=true)
[auditStripePriceIds] Summary: valid=6, invalid=0, total=6
```

## Webhook Endpoint Evidence

Production webhook check result:

```text
[configureStripeWebhook] Endpoint we_1TRfesANIxv7H45OVFlG51YK is configured correctly for https://complyeur.com/api/billing/webhook.
```

The script checks the required event set:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

## Remaining Stripe Evidence

Still required before marking the full Stripe lifecycle gate complete:

- Successful checkout creates or reuses the expected Stripe customer.
- Checkout metadata contains company, user, plan, interval, and source.
- Webhook replay does not duplicate entitlement changes.
- Stale or out-of-order subscription events do not downgrade fresh state.
- Failed payment produces expected subscription/entitlement state and alert.
- Cancellation produces expected subscription/entitlement state.
- Failed webhook events are visible to the billing/support owner.
- Reconciliation script or manual reconciliation process resolves missed lifecycle events.

## Secret Handling

No Stripe secret key, webhook signing secret, Supabase service role key, or
customer payment data is recorded in this evidence note.
