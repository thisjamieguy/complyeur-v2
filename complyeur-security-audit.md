## ComplyEur Pre-Launch Security Audit

### Goal
Audit the entire ComplyEur codebase for security vulnerabilities, data protection gaps, and GDPR compliance issues before production launch. This is a B2B SaaS handling sensitive employee travel data (names, passport numbers, travel dates) for corporate clients. A data breach or cross-tenant leak would be business-ending. Do not build or fix anything — report findings only, grouped by severity (CRITICAL / HIGH / MEDIUM / LOW).

### Context
- Next.js 16 (App Router), TypeScript strict mode, Supabase PostgreSQL with RLS, Tailwind + Shadcn/UI
- Multi-tenant: every company's data isolated by company_id
- Auth: Supabase Auth (email/password)
- Server Actions used instead of API routes
- Hosted on Vercel
- Target users: UK and US companies (GDPR + UK GDPR apply)

---

### AUDIT 1: Multi-Tenancy & Data Isolation [CRITICAL — Business-Ending if Failed]

Check every database query across the entire codebase and verify:
- Every SELECT, INSERT, UPDATE, DELETE filters by company_id
- No query relies solely on RLS without also filtering at application level (defense-in-depth)
- No endpoint or Server Action allows a user to pass a company_id as a parameter that differs from their authenticated session
- No bulk operations (delete, update, export) can affect records outside the user's company
- The company_id is always derived from the authenticated user's session/profile, never from client input
- RLS policies are enabled on ALL tables (companies, profiles, employees, trips, alerts, company_settings, audit_log, import_sessions, column_mappings, and any others)
- RLS policies use efficient subquery patterns (not deep joins that degrade at scale)

Test scenario to verify mentally: "If User A from Company X crafts a request with Company Y's employee ID, what happens?"

---

### AUDIT 2: Authentication & Authorization [CRITICAL]

Check every Server Action and any API route:
- Every mutation (create, update, delete) verifies the user is authenticated before executing
- Every mutation verifies the user has permission for the action (role check: admin vs manager vs viewer)
- No Server Action is callable without authentication
- Auth checks happen at the START of the function, not after database queries
- Token/session validation cannot be bypassed by manipulating headers or cookies
- Password reset flow cannot be exploited (no enumeration of valid emails)
- Sign-up flow enforces required fields and cannot create orphaned records

---

### AUDIT 3: Server Action & API Security [CRITICAL]

Check all Server Actions and any API routes:
- All user input is validated with Zod schemas before use
- No raw user input is interpolated into SQL queries (parameterised queries only)
- No use of supabase.rpc() or raw SQL with unsanitised user input
- The Supabase service_role key is NEVER used in client-side code or Server Actions that run in the browser
- The service_role key is only used in server-side contexts where RLS must be bypassed (admin operations only)
- The anon key is the only key exposed to the client
- Rate limiting exists on sensitive operations (login, signup, password reset, data export, bulk imports)
- File upload endpoints validate file type, file size, and scan for malicious content (CSV injection, macro-enabled files like .xlsm)

---

### AUDIT 4: Input Validation & Sanitisation [HIGH]

Check all forms and data input paths:
- All text inputs are sanitised to prevent XSS (check for dangerouslySetInnerHTML usage)
- Employee names, company names, and free-text fields are validated for length and character restrictions
- Date inputs are validated (entry_date before exit_date, no dates impossibly far in past/future)
- Country codes are validated against the known Schengen country list
- Email inputs are validated with proper regex
- Import/upload: CSV and Excel data is sanitised for formula injection (cells starting with =, +, -, @)
- No user-supplied data is rendered as raw HTML anywhere
- Search inputs and filter parameters are sanitised

---

### AUDIT 5: Environment Variables & Secrets [CRITICAL]

Check the entire repository:
- .env files are listed in .gitignore and never committed
- No API keys, database URLs, or secrets hardcoded in source files
- No secrets visible in client-side JavaScript bundles (check NEXT_PUBLIC_ prefix usage — only non-sensitive values should use this prefix)
- Supabase URL and anon key are the ONLY values with NEXT_PUBLIC_ prefix
- service_role key, JWT secret, Resend API key, Stripe secret key are NEVER prefixed with NEXT_PUBLIC_
- No secrets logged to console in any environment
- Verify .env.example exists with placeholder values (not real keys)

---

### AUDIT 6: GDPR & Data Protection Compliance [HIGH — Legal Liability]

Check for implementation of:
- Data export: Users can download all their company data (employees, trips, settings) in a portable format (JSON or CSV)
- Account deletion: Soft delete with 30-day retention, then hard delete — verify cascade deletes all related data (employees, trips, alerts, audit logs, settings, import sessions)
- Consent: Sign-up flow includes explicit "I agree to Terms and Privacy Policy" checkbox that must be checked before account creation
- Cookie consent: CookieYes or equivalent blocks analytics/tracking scripts until user consents
- Data minimisation: No unnecessary personal data is collected or stored (no birthdays, photos, addresses unless required)
- Audit logging: All significant data mutations (create/update/delete employee, trip, settings) are logged with user_id, timestamp, action, and entity details
- Audit log integrity: Logs cannot be modified or deleted by regular users
- Data retention: Old/expired data has a cleanup mechanism or policy
- Right to rectification: Users can edit/correct their data
- Email unsubscribe: All notification emails include a one-click unsubscribe mechanism
- Encrypted sensitive fields: Passport numbers (if stored) are encrypted at rest, not stored as plain text

---

### AUDIT 7: HTTP Security Headers [MEDIUM]

Check vercel.json or next.config.js for these headers:
- X-Frame-Options: DENY (prevents clickjacking)
- Content-Security-Policy: frame-ancestors 'none' (modern clickjacking prevention)
- X-Content-Type-Options: nosniff (prevents MIME-type sniffing)
- Referrer-Policy: strict-origin-when-cross-origin (prevents referrer leaking)
- Strict-Transport-Security: max-age=31536000; includeSubDomains (forces HTTPS)
- Permissions-Policy: restricts camera, microphone, geolocation access
- X-XSS-Protection: 0 (modern browsers — CSP replaces this, but check it is not set to dangerous values)

If any are missing, report which ones and what risk they create.

---

### AUDIT 8: Error Handling & Information Leakage [HIGH]

Check all error handling paths:
- No database error messages are exposed to the client (no table names, column names, SQL syntax in user-facing errors)
- No stack traces are shown in production (check NODE_ENV handling)
- Generic error messages are shown to users ("Something went wrong") while detailed errors are logged server-side only
- No console.log or console.error statements that output sensitive data (user emails, company data, tokens, keys)
- 404 and error pages do not reveal application structure or technology stack
- Failed authentication attempts return generic messages (not "email not found" vs "wrong password" — this enables enumeration)
- Server Action errors are caught and wrapped before reaching the client

---

### AUDIT 9: Client-Side Data Exposure [HIGH]

Check the client-side application:
- No sensitive data stored in localStorage or sessionStorage (tokens managed by Supabase client are acceptable, but no company data, employee lists, or trip data cached client-side)
- No sensitive data in URL parameters (no employee IDs, company IDs, or personal data in query strings that could be bookmarked, shared, or logged)
- React state does not persist sensitive data beyond what is needed for the current view
- Browser dev tools Network tab would not reveal sensitive data from over-fetched API responses (only the data needed for the current view is returned)
- Source maps are disabled in production (no .map files exposing source code)

---

### AUDIT 10: Session & Token Management [MEDIUM]

Check authentication session handling:
- Session tokens have a reasonable expiry (not indefinite)
- Refresh token rotation is enabled (Supabase Auth setting)
- Logout actually invalidates the session server-side (not just clearing client state)
- Inactive sessions expire (idle timeout)
- Session cookies use Secure, HttpOnly, and SameSite attributes
- No session fixation vulnerabilities (session ID changes after login)

---

### AUDIT 11: Dependency Vulnerabilities [MEDIUM]

Run and report results of:
- npm audit — list any HIGH or CRITICAL vulnerabilities and which packages
- Check for outdated packages with known CVEs
- Verify no unnecessary packages are installed (attack surface reduction)
- Check that SheetJS (xlsx) is a recent version without known parsing vulnerabilities
- Verify Supabase client libraries are up to date

---

### AUDIT 12: Database Security [HIGH]

Check Supabase configuration:
- RLS is enabled on every single table (list any table where it is NOT enabled)
- No table has a permissive "allow all" policy that bypasses tenant isolation
- Foreign key cascades are correct (deleting a company cascades to profiles, employees, trips, alerts, settings, audit logs)
- No orphaned records possible (employee without company, trip without employee)
- Indexes exist on company_id columns for query performance with RLS
- The public schema is not exposed more broadly than necessary
- Realtime subscriptions (if any) are scoped by company_id and cannot leak cross-tenant data

---

### AUDIT 13: File Upload Security [HIGH — If Import Feature Exists]

Check the import/upload functionality:
- Accepted file types are whitelisted (.xlsx, .csv only — reject .xlsm, .xls, .exe, .js, etc.)
- File size is limited (e.g., 10MB max)
- Files are parsed in memory and never written to the public filesystem
- CSV injection protection: cells starting with =, +, -, @, \t, \r are sanitised or escaped
- Upload does not allow path traversal (../ in filenames)
- Uploaded files are not served back to users from a public URL
- Import row limits are enforced (e.g., 500 rows max)
- Failed imports clean up any partially inserted data (transaction rollback)

---

### AUDIT 14: Deployment & Infrastructure [MEDIUM]

Check Vercel and production configuration:
- Preview deployments are not publicly accessible (or have authentication)
- Environment variables are set in Vercel dashboard (not in code)
- Build logs do not output secrets
- Custom domain has SSL configured
- Vercel project is not linked to a public GitHub repo that exposes source code (if it should be private)
- No debug/development routes are accessible in production (e.g., /api/test, /debug)
- next.config.js does not have dangerously permissive settings (e.g., images.domains allowing any domain)

---

### Output Format

For each audit section, report:
1. Section name and severity rating
2. Status: PASS / FAIL / PARTIAL
3. Findings: List each specific issue found with file path and line number
4. Risk: What could happen if this is exploited
5. No fixes — findings only

At the end, provide a summary table:

| Audit | Severity | Status | Issues Found |
|-------|----------|--------|--------------|
| 1. Multi-Tenancy | CRITICAL | ? | ? |
| 2. Auth & Authz | CRITICAL | ? | ? |
| 3. Server Actions | CRITICAL | ? | ? |
| 4. Input Validation | HIGH | ? | ? |
| 5. Env Variables | CRITICAL | ? | ? |
| 6. GDPR Compliance | HIGH | ? | ? |
| 7. Security Headers | MEDIUM | ? | ? |
| 8. Error Handling | HIGH | ? | ? |
| 9. Client Exposure | HIGH | ? | ? |
| 10. Session Mgmt | MEDIUM | ? | ? |
| 11. Dependencies | MEDIUM | ? | ? |
| 12. Database Security | HIGH | ? | ? |
| 13. File Uploads | HIGH | ? | ? |
| 14. Deployment | MEDIUM | ? | ? |

And a final verdict: SAFE TO LAUNCH / LAUNCH WITH CAUTION (list blockers) / DO NOT LAUNCH

---

### Constraints
- Do not modify any files
- Do not create any files
- Do not install any packages
- Report only — this is a read-only audit
- If you cannot determine something from the code alone (e.g., Supabase dashboard settings), flag it as "REQUIRES MANUAL VERIFICATION" with instructions for what to check
