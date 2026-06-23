# Stripe Lifecycle Replay And Reconciliation Evidence

Date: 2026-06-18
Environment: http://127.0.0.1:3100
Stripe mode: test
Webhook target: http://127.0.0.1:3100/api/billing/webhook
Monitoring target: http://127.0.0.1:3100/api/cron/beta-monitoring

## Verified Outcomes

- A Stripe CLI `checkout.session.completed` fixture was delivered with real Stripe test-mode customer and subscription IDs bound into the webhook payload.
- First webhook delivery provisioned the paid tier, persisted the Stripe customer/subscription IDs, and marked the event row as processed.
- Immediate replay of the same event was accepted and returned `duplicate: true` without re-applying entitlements.
- A real `customer.subscription.updated` event was processed before cancellation.
- A real `invoice.payment_failed` event was processed against a dedicated evidence company bound to the fixture customer.
- A real `customer.subscription.deleted` event downgraded the company back to the free tier.
- Replaying the older subscription update after cancellation was ignored by the stale-event ordering guard.
- A second checkout fixture delivery failed on the first attempt because the Stripe metadata company ID did not match the authenticated company context, surfaced in `stripe_webhook_events`, tripped the webhook monitoring alert path, then processed successfully on replay after the company context was corrected.

## Happy Path

- Company: Evidence happy-1781807110796
- Company ID: 630b5e05-ba48-434b-9627-559ff6cc9384
- User ID: c6a0629f-b6c4-43ad-942a-ceeafc650f1f
- Checkout Session: cs_test_a13VgqbLavTAwCeFcl2P3iaEqMRaBktJ61soLIwazX21hwqb5C6BnvDTBn
- Customer: cus_UjD2ubM9wOqtQ1
- Subscription: sub_1TjkcmANIxv7H45OqSUDl8Nj
- Checkout event: evt_1TjkcuANIxv7H45OyGuRUdPG
- Replay duplicate: true
- Update event: evt_1TjkcxANIxv7H45OniPNMgQc
- Payment failed event: evt_1Tjkd3ANIxv7H45OqvbwrmB4
- Cancellation event: evt_1Tjkd8ANIxv7H45OOiJrmRF3
- Stale replay ignored: true

## Reconciliation Path

- Company: Evidence reconcile-1781807134704
- Company ID: 03e609ea-b426-4c63-8237-d6ce4c39062b
- User ID: 7d380207-742f-452d-b576-6663a825afdd
- Checkout Session: cs_test_a1N5HTahlRA3DjoPlGFcDQ5T6p3qeUkxwjdeorxHjDWrbV5TtHFBM1yucM
- Checkout event: evt_1TjkdIANIxv7H45OrwnuC38f
- First attempt HTTP status: 500
- First attempt error: checkout.session.completed metadata.company_id does not match authenticated profile company
- Final webhook row status after replay: processed

## Monitoring Response

```json
{
  "httpStatus": 200,
  "success": true,
  "results": {
    "windowHours": 24,
    "since": "2026-06-17T18:25:44.756Z",
    "companiesCreated": 23,
    "usersCreated": 13,
    "failedWebhooks": 2,
    "staleProcessingWebhooks": 0,
    "zeroSignupAlert": false,
    "zeroSignupAlertSent": false,
    "webhookAlert": true,
    "webhookAlertSent": true
  }
}
```

## Operator Notes

- The lifecycle matrix was exercised by directly invoking the current route handlers with signed webhook requests after updating the local Supabase schema to the current repo migrations.
- Production endpoint wiring was separately verified on `https://complyeur.com` via `pnpm billing:webhook:check` and `pnpm beta:monitoring:check`.
- Real Stripe objects and events were created in Stripe test mode. No production billing state was mutated.
- No secret values are stored in this note.
