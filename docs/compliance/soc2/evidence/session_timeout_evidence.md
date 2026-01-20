Date: 2026-01-19
Environment: local
Timeout configured: company_settings.session_timeout_minutes = 5 (inactivity)

Commands executed:
```
NODE_PATH=/Users/jameswalsh/Dev/Web\ Projects/ComplyEur-v2/complyeur/node_modules node /tmp/session-timeout-evidence.js | tee /tmp/session-timeout-evidence.log
```

Steps executed:
1. Sign in as a test user via Supabase Auth (local) and ensure the profile exists.
2. Upsert company_settings for the user's company with session_timeout_minutes = 5.
3. Generate the SSR session cookie payload from the current session.
4. Request /dashboard with the session cookie (active session validation).
5. Set profiles.last_activity_at to 6 minutes in the past (simulate inactivity beyond timeout).
6. Request /dashboard again with the same session cookie (expired session validation).
7. Request /login to confirm re-authentication is required.

Results observed:
```
EVIDENCE_START
timestamp_start=2026-01-19T22:37:25.274Z
user_id=c1ab3686-23b8-417b-b923-2b5ff162b76a
company_id=c7988e4c-c988-4234-b8b2-1c4aeb0ae531
session_timeout_minutes=5
initial_request_status=200
initial_request_location=
last_activity_after_first=2026-01-19T22:37:25.32+00:00
expired_request_status=307
expired_request_location=http://localhost:3000/login
last_activity_after_expiry=2026-01-19T22:31:25.456+00:00
reauth_request_status=200
reauth_request_location=
timestamp_end=2026-01-19T22:37:26.394Z
EVIDENCE_END
```

Outcome:
- Active session succeeds within timeout window.
- Session is rejected after inactivity exceeds configured timeout.
- Protected route access fails and redirects to /login.
- Re-authentication is required.
