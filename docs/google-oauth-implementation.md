# Google OAuth Implementation Guide

This document covers the complete Google OAuth implementation for ComplyEur, including setup, testing, and security considerations.

---

## Priya: QA, Edge Cases & Recovery

### Testing Checklist

#### Happy Path Tests

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 1 | New Google user signup | Click "Continue with Google" on signup page → Complete Google consent | User is created, company provisioned (inferred from email domain), redirected to /dashboard |
| 2 | Returning Google user login | Click "Continue with Google" on login page | User session restored, redirected to /dashboard |
| 3 | Email/password user login | Enter email/password on login page | Normal login flow works unchanged |
| 4 | New email/password signup | Complete signup form with all fields | User and company created, redirected to /dashboard |

#### Error & Edge Case Tests

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 5 | Email exists with password, tries Google OAuth | User with password account clicks "Continue with Google" using same email | Rejected with message: "This email is already registered. Please sign in with your password." |
| 6 | Email exists with Google OAuth, tries password signup | User with Google account tries email/password signup | Rejected with message: "This email is already registered. Please sign in with Google." |
| 7 | User cancels Google OAuth | Click "Continue with Google" → Cancel on Google consent screen | Redirected to /login with message: "Sign-in was cancelled. Please try again." |
| 8 | Google account with unverified email | Use Google account without verified email | Rejected by auth hook with message: "Google account email must be verified to sign in." |
| 9 | OAuth code expired | Wait for OAuth code to expire before callback | Redirected to /login with message: "Authentication failed. Please try again." |
| 10 | Network failure during OAuth | Disconnect network during OAuth flow | Toast error displayed, user can retry |
| 11 | Malicious redirect URL | Manually add `?next=https://evil.com` to callback | Ignored, redirected to /dashboard instead |
| 12 | Database failure during provisioning | DB down when creating company/profile | User signed out, error message displayed, no orphaned auth account |

#### Company Inference Tests

| # | Email | Expected Company Name |
|---|-------|----------------------|
| 13 | user@acme-corp.com | Acme Corp |
| 14 | user@my_company.io | My Company |
| 15 | user@BIGCORP.com | Bigcorp |
| 16 | user@gmail.com | Gmail |
| 17 | user@company.co.uk | Company |

#### Session & State Tests

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 18 | Session persists after page refresh | Login with Google → Refresh page | User remains logged in |
| 19 | Logout clears session | Login with Google → Click logout | Session cleared, redirected to /login |
| 20 | Session expires | Wait for session to expire | Middleware refreshes session automatically |
| 21 | Multiple tabs | Login in one tab | Other tabs recognize session on next navigation |

### User-Visible Error Messages

All error messages are designed to be:
- Clear and actionable
- Free of technical jargon
- Consistent in tone

| Error Code | User Message |
|------------|--------------|
| `access_denied` | Sign-in was cancelled. Please try again. |
| `unauthorized_client` | This application is not authorized for Google sign-in. |
| `email_already_exists` | This email is already registered. Please sign in with [method]. |
| `unverified_email` | Google account email must be verified to sign in. |
| `provisioning_failed` | Failed to set up your account. Please try again or contact support. |
| `generic_failure` | Authentication failed. Please try again. |

---

## Alex: Environment & Deployment

### Required Environment Variables

Add these to your `.env.local` file (local development) and Vercel environment variables (production):

```bash
# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# App URL (CRITICAL for OAuth redirects)
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Local
# NEXT_PUBLIC_APP_URL=https://app.complyeur.com  # Production
```

### Supabase Dashboard Configuration

#### 1. Authentication > URL Configuration

| Setting | Local | Production |
|---------|-------|------------|
| Site URL | `http://localhost:3000` | `https://app.complyeur.com` |
| Redirect URLs | `http://localhost:3000/auth/callback` | `https://app.complyeur.com/auth/callback` |

**Important**: Add ALL environments to Redirect URLs:
- `http://localhost:3000/auth/callback` (local)
- `https://complyeur-*.vercel.app/auth/callback` (preview deployments)
- `https://app.complyeur.com/auth/callback` (production)

#### 2. Authentication > Providers > Google

1. Enable Google provider
2. Add Client ID from Google Cloud Console
3. Add Client Secret from Google Cloud Console
4. Leave "Authorized Client IDs" empty (web only)

#### 3. Authentication > Hooks (Optional but Recommended)

1. Deploy the auth hook Edge Function:
   ```bash
   supabase functions deploy auth-hook-prevent-linking
   ```
2. In Dashboard > Authentication > Hooks:
   - Add hook for "Before User Created" event
   - Select "auth-hook-prevent-linking" function

### Google Cloud Console Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project or create new
3. Navigate to APIs & Services > Credentials
4. Click "Create Credentials" > "OAuth client ID"
5. Select "Web application"
6. Configure:

| Field | Value |
|-------|-------|
| Name | ComplyEUR Production |
| Authorized JavaScript origins | `https://your-project.supabase.co` |
| Authorized redirect URIs | `https://your-project.supabase.co/auth/v1/callback` |

7. Copy Client ID and Client Secret to Supabase dashboard

### Deployment Checklist

Before deploying to production:

- [ ] `NEXT_PUBLIC_APP_URL` set to production URL in Vercel
- [ ] Production URL added to Supabase Redirect URLs
- [ ] Google Cloud Console redirect URI includes Supabase callback URL
- [ ] Auth hook deployed and configured (optional)
- [ ] Test OAuth flow in preview deployment first
- [ ] Verify RLS policies are enabled on all tables

### Vercel Configuration

In your Vercel project settings:

1. Add environment variables for all environments
2. For preview deployments, use `VERCEL_URL` or a wildcard redirect URL
3. Ensure the `NEXT_PUBLIC_APP_URL` is set correctly per environment:

```bash
# vercel.json or environment settings
NEXT_PUBLIC_APP_URL=$VERCEL_URL  # Preview
NEXT_PUBLIC_APP_URL=https://app.complyeur.com  # Production
```

---

## Nina: Security & Abuse Prevention

### Threat Model

#### 1. Account Takeover via Identity Linking

**Threat**: Attacker gains access to victim's Google account and uses it to access their ComplyEur account via automatic identity linking.

**Mitigation**: Auth hook blocks all identity linking attempts. One auth method per email, enforced server-side.

#### 2. Open Redirect Attacks

**Threat**: Attacker crafts malicious URL with `?next=https://evil.com` to steal credentials or session tokens.

**Mitigation**: `validateRedirectUrl()` function only allows relative paths starting with `/`. Absolute URLs, protocol-relative URLs (`//`), and encoded bypasses are rejected.

#### 3. OAuth State/CSRF Attacks

**Threat**: Attacker initiates OAuth flow and tricks victim into completing it, linking attacker's Google account to victim's session.

**Mitigation**: Supabase handles PKCE (Proof Key for Code Exchange) automatically, preventing CSRF attacks on the OAuth flow.

#### 4. Unverified Email Exploitation

**Threat**: Attacker creates Google account with victim's email before verification, then uses OAuth to access victim's ComplyEur account.

**Mitigation**: Auth hook verifies `email_verified` claim from Google before allowing signup.

#### 5. Orphaned Auth Accounts

**Threat**: OAuth succeeds but profile creation fails, leaving a usable auth account without proper database records.

**Mitigation**: Callback route signs out user if profile creation fails, preventing access to orphaned account.

#### 6. Session Fixation

**Threat**: Attacker sets victim's session ID before OAuth, then hijacks session after completion.

**Mitigation**: Supabase Auth generates new session on successful authentication, invalidating any pre-existing session tokens.

### Security Requirements

| Requirement | Implementation |
|-------------|----------------|
| No identity linking | Auth hook + policy enforcement |
| Verified email only | Auth hook checks `email_verified` |
| Secure redirects | `validateRedirectUrl()` in callback |
| PKCE for OAuth | Supabase default behavior |
| Session security | HTTP-only cookies via @supabase/ssr |
| RLS enforcement | All tables have RLS enabled |

### Audit Logging Recommendations

For production, consider logging these events (can use the existing `admin_audit_log` table):

```typescript
// Events to log
type AuthEvent =
  | 'oauth_initiated'
  | 'oauth_success'
  | 'oauth_failure'
  | 'identity_linking_blocked'
  | 'unverified_email_blocked'
  | 'company_created'
  | 'session_created'
  | 'session_revoked'
```

### Rate Limiting

OAuth flows have natural rate limiting via Google's consent screen, but consider:

1. Rate limit the `/auth/callback` endpoint (5 requests per minute per IP)
2. Monitor for unusual patterns (many failed OAuth attempts from same IP)
3. Block IPs with repeated blocked identity linking attempts

### Security Review Checklist

Before production launch:

- [ ] Auth hook deployed and tested
- [ ] All Redirect URLs validated and minimal
- [ ] No sensitive data logged (tokens, secrets)
- [ ] HTTPS enforced on all endpoints
- [ ] CSP headers updated for Google OAuth domains
- [ ] Error messages don't leak internal details
- [ ] Session timeout configured appropriately
- [ ] Logout clears all session data

---

## Files Created/Modified

| File | Action | Purpose |
|------|--------|---------|
| `supabase/functions/auth-hook-prevent-linking/index.ts` | Created | Auth hook to prevent identity linking |
| `supabase/migrations/20260112_google_oauth_support.sql` | Created | Database changes for OAuth support |
| `app/auth/callback/route.ts` | Modified | Enhanced callback with OAuth provisioning |
| `app/(auth)/actions.ts` | Modified | Added `signInWithGoogle` action |
| `app/(auth)/login/page.tsx` | Modified | Added Google OAuth button |
| `app/(auth)/signup/page.tsx` | Modified | Added Google OAuth button |
| `docs/google-oauth-implementation.md` | Created | This documentation |

---

## Quick Start

1. **Configure Google Cloud Console** (see Alex section)
2. **Configure Supabase Dashboard** (see Alex section)
3. **Run migration**:
   ```bash
   supabase db push
   ```
4. **Deploy auth hook** (optional but recommended):
   ```bash
   supabase functions deploy auth-hook-prevent-linking
   ```
5. **Set environment variables**
6. **Test locally**:
   ```bash
   pnpm dev
   ```
7. **Test OAuth flow** by clicking "Continue with Google"

---

## Troubleshooting

### "redirect_uri_mismatch" Error

The redirect URI in Google Cloud Console doesn't match the one Supabase is using.

**Fix**: Add `https://your-project.supabase.co/auth/v1/callback` to Google Cloud Console.

### "access_denied" After Consent

User cancelled or Google rejected the request.

**Check**:
- Is the app verified by Google? (for production)
- Are required scopes granted?

### User Created But No Profile

The database trigger or callback didn't create the profile.

**Check**:
- Is the migration applied?
- Check Supabase logs for RPC errors
- Verify RLS policies allow profile creation

### OAuth Button Does Nothing

JavaScript error preventing the action.

**Check**:
- Browser console for errors
- Is `NEXT_PUBLIC_APP_URL` set correctly?
- Is Supabase client configured?
