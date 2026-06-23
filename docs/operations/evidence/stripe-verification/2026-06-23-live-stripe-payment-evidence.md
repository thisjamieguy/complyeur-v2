# Live Stripe Payment Evidence

Date: 2026-06-23
Verified by: Codex
Environment: Production / Stripe live mode

## Summary

A live Stripe checkout completed successfully for a discounted GBP subscription
payment. Stripe account payments and payouts are enabled, production price IDs
audit cleanly, the live webhook endpoint is configured for the deployed billing
route, and the app database shows the checkout webhook was processed and
provisioned the expected entitlement.

No Stripe API keys, webhook secrets, card numbers, receipt URLs, invoice URLs,
customer addresses, or unredacted personal data are stored in this evidence
note.

## Live Account Readiness

Source: `stripe get /v1/account` using the production Stripe secret key.

- Account: `acct_1SS0VBANIxv7H45O`
- Country: `GB`
- Default currency: `gbp`
- Charges enabled: `true`
- Payouts enabled: `true`
- Details submitted: `true`
- Card payments capability: `active`
- Transfers capability: `active`
- Dashboard display name: `ComplyEur`
- Statement descriptor: `COMPLYEUR.COM`

## Live Checkout And Payment

Source: `stripe checkout sessions list --limit 10` and
`stripe charges list --limit 10` using the production Stripe secret key.

- Checkout session: `cs_live_a14H1GqaKE0in8xu6fu3BNz3nwgE59R2GdbI49MCfnfXmocxN41Nb5vrZb`
- Live mode: `true`
- Checkout status: `complete`
- Payment status: `paid`
- Mode: `subscription`
- Currency: `gbp`
- Plan metadata: `professional`
- Billing interval metadata: `monthly`
- Source metadata: `onboarding`
- Promotion code metadata: present
- Amount before discount: `GBP 349.00`
- Discount applied: `GBP 348.00`
- Amount paid: `GBP 1.00`
- Charge: `ch_3TlMyJANIxv7H45O0Aj3nyO2`
- Charge status: `succeeded`
- Charge paid: `true`
- Captured amount: `GBP 1.00`
- 3D Secure result: `authenticated`
- Risk level: `normal`

## Subscription And Invoice

Source: `stripe subscriptions retrieve sub_1TlMyvANIxv7H45OqQYb2Vt5` and
`stripe invoices retrieve in_1TlMyIANIxv7H45OiR98Cpym`.

- Subscription: `sub_1TlMyvANIxv7H45OqQYb2Vt5`
- Subscription status: `active`
- Subscription price: `price_1TRevoANIxv7H45ObWD8ltH7`
- Subscription price live mode: `true`
- Subscription collection method: `charge_automatically`
- Invoice: `in_1TlMyIANIxv7H45OiR98Cpym`
- Invoice status: `paid`
- Invoice billing reason: `subscription_create`
- Invoice amount due: `GBP 1.00`
- Invoice amount paid: `GBP 1.00`
- Invoice amount remaining: `GBP 0.00`
- Stripe invoice `webhooks_delivered_at`: present

## Production Price Audit

Source: `pnpm tsx scripts/auditStripePriceIds.ts --json` using production env.

- `free` monthly: valid, active, `GBP 49.00 / month`
- `free` annual: valid, active, `GBP 490.00 / year`
- `starter` monthly: valid, active, `GBP 149.00 / month`
- `starter` annual: valid, active, `GBP 1490.00 / year`
- `professional` monthly: valid, active, `GBP 349.00 / month`
- `professional` annual: valid, active, `GBP 3490.00 / year`
- Summary: `valid=6`, `invalid=0`, `total=6`

## Live Webhook Endpoint

Source: `stripe webhook_endpoints list --limit 10` and
`pnpm tsx scripts/configureStripeWebhook.ts --check --endpoint https://complyeur.com/api/billing/webhook`
using production env.

- Endpoint: `we_1TRfesANIxv7H45OVFlG51YK`
- URL: `https://complyeur.com/api/billing/webhook`
- Live mode: `true`
- Status: `enabled`
- API version: `2025-10-29.clover`
- Enabled events:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
- Repo webhook check result: endpoint configured correctly.

## Stripe Event Delivery

Source: `stripe events list --limit 10` using the production Stripe secret key.

- `checkout.session.completed` event: `evt_1TlMyzANIxv7H45O3EZgVZGg`
- Event live mode: `true`
- Event pending webhooks: `0`
- Event session: `cs_live_a14H1GqaKE0in8xu6fu3BNz3nwgE59R2GdbI49MCfnfXmocxN41Nb5vrZb`
- Related invoice payment and paid invoice events were present in the same
  recent event window.

## App Database Verification

Source: production Supabase service-role read of `companies`,
`company_entitlements`, and `stripe_webhook_events` scoped to the checkout
metadata company and subscription IDs.

- Company `stripe_customer_id` matches Stripe customer: `true`
- Entitlement subscription matches Stripe subscription: `true`
- Entitlement tier: `professional`
- Entitlement trial flag: `false`
- Entitlement subscription status: `active`
- Entitlement limits: `max_employees=200`, `max_users=15`
- Entitlement features enabled: CSV export, PDF export, forecasting, calendar,
  and bulk import.
- App webhook event: `evt_1TlMyzANIxv7H45O3EZgVZGg`
- App webhook status: `processed`
- App webhook received at: `2026-06-23T05:34:50.694+00:00`
- App webhook processed at: `2026-06-23T05:34:51.967+00:00`
- App webhook last error: `null`

## Remaining Billing Evidence Gaps

This evidence proves live payment acceptance, live checkout completion, live
price validity, live webhook endpoint configuration, Stripe event delivery, and
app entitlement provisioning for the successful checkout path.

Do not mark Stripe Verification complete yet. The release checklist still needs:

- Webhook replay idempotency evidence.
- Stale or out-of-order subscription event evidence.
- Failed-payment entitlement and alerting evidence.
- Cancellation entitlement evidence.
- Billing/support owner visibility for failed webhook events.
- Reconciliation process evidence for missed lifecycle events.
- Follow-up on `company_entitlements.current_period_end`, which remained `null`
  after this checkout even though the Stripe subscription has a current period
  end. This affects renewal-email/lifecycle evidence and should be fixed or
  risk-accepted before paid/public beta.
