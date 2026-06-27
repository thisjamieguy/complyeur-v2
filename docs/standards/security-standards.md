# Security Standards

Security work in ComplyEur must favor explicit boundaries, least privilege, and evidence over assumptions.

## Non-Negotiables

- Never commit secrets, `.env*` files, debug logs, raw exports, customer data, or production data dumps.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never reach client components, browser bundles, logs, or screenshots.
- Every tenant-owned table must have RLS enabled and policies reviewed before use.
- Application authorization must be enforced server-side. UI-only gating is not authorization.
- Production data must never be copied into Test/Preview.

## Tenant Isolation

- Scope every tenant-owned query by `company_id` or the established repository helper for the current user/company context.
- Treat cross-tenant read, write, update, and delete attempts as core regression scenarios.
- Verify migrations preserve RLS, grants, indexes, and tenant-scoped constraints.

## Logging And PII

- Do not log access tokens, refresh tokens, service keys, passwords, raw Stripe payloads, passport numbers, or personal data.
- Redact emails, IP addresses, user IDs, and token-like values in diagnostic output unless the file is deliberately synthetic test data.
- Debug artifacts belong outside git and should be ignored by default.

## Dependency And Supply Chain

- Prefer maintained packages already present in the repo.
- Run the existing security checks before changing auth, billing, import, or compliance code.
- Treat old audit findings as historical until verified against current dependencies and code.

## Pre-Deploy Security Checklist

- [ ] No `service_role` key in frontend code
- [ ] RLS policies on all tables
- [ ] Environment variables not in Git
- [ ] TypeScript compiles without errors
- [ ] No `console.log` with sensitive data

## Content Security Policy

When adding new third-party services, update CSP headers:

```typescript
// vercel.json or middleware
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' cdn.jsdelivr.net *.supabase.co; connect-src 'self' *.supabase.co"
        }
      ]
    }
  ]
}
```
