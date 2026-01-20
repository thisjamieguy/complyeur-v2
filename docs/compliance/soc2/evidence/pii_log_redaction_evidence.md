# PII Log Redaction Evidence

Date: 2026-01-19
Environment: local
Logger: `lib/logger.mjs` (structured JSON logger with automatic redaction)

## Summary (Before Fix)
- Auth hook logs included raw `email` and provider data in console output.
- Email service logs included raw recipient email addresses and employee names.
- Alert detection logs included raw employee names in console output.
- Error logs used console logging without centralized redaction.

## Redaction Rules Applied
- Key-based redaction (automatic): `email`, `name`, `employeeName`, `ip`, `user_id`, `session_id`, `identifier`, `token`, `secret`, `password`, `api_key`, `authorization`, `access_token`, `refresh_token`.
- Value-pattern redaction (automatic):
  - Email addresses
  - IPv4/IPv6 addresses
  - JWTs
  - Common token prefixes (e.g., `sk_live_`, `sk_test_`, `tok_`, `sess_`, `secret_`)
  - `Bearer <token>` strings
  - `user_id=<id>` / `session_id=<id>` patterns
  - Local user paths (e.g., `/Users/<name>` or `\Users\<name>`) in stacks

## Controlled Log Emission (After Fix)
Command executed:

```
node scripts/pii-log-redaction-demo.mjs
```

Captured output (redacted):

```
{"timestamp":"2026-01-19T22:48:26.272Z","level":"info","message":"PII redaction demo: structured log","meta":{"email":"***REDACTED_EMAIL***","name":"***REDACTED_NAME***","employeeName":"***REDACTED_NAME***","ip":"***REDACTED_IP***","user_id":"***REDACTED_IDENTIFIER***","session_id":"***REDACTED_IDENTIFIER***","token":"***REDACTED_TOKEN***"}}
{"timestamp":"2026-01-19T22:48:26.281Z","level":"warn","message":"PII redaction demo: text patterns","meta":{"message":"Authorization=***REDACTED_TOKEN*** ***REDACTED_TOKEN***","note":"user_id=***REDACTED_IDENTIFIER*** email=***REDACTED_EMAIL*** ip=***REDACTED_IP***"}}
{"timestamp":"2026-01-19T22:48:26.281Z","level":"error","message":"PII redaction demo: error logging","meta":{"error":{"name":"Error","message":"Failed to process user ***REDACTED_EMAIL*** with token ***REDACTED_TOKEN***","stack":"Error: Failed to process user ***REDACTED_EMAIL*** with token ***REDACTED_TOKEN***\n    at file:///Users/***REDACTED***/Dev/Web%20Projects/ComplyEur-v2/complyeur/scripts/pii-log-redaction-demo.mjs:19:10\n    at ModuleJob.run (node:internal/modules/esm/module_job:413:25)\n    at async onImport.tracePromise.__proto__ (node:internal/modules/esm/loader:654:26)\n    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:101:5)"}}}
```

## Post-Fix Verification Notes
- Auth hook, email service, and alert detection service now use the structured logger.
- Redaction is automatic and deterministic; no per-call manual redaction is required.
- Error logs include stack traces with user path segments redacted.
