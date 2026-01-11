# ComplyEUR Go-Live Checklist

Complete all items before announcing launch.

---

## Infrastructure
- [ ] Vercel deployment green and stable
- [ ] Custom domain working (complyeur.com)
- [ ] SSL certificate valid (padlock icon in browser)
- [ ] HTTP redirects to HTTPS
- [ ] www subdomain redirects correctly
- [ ] Database backups enabled (daily)
- [ ] PITR enabled (Point-in-Time Recovery)

## Environment Variables
- [ ] All env vars set in Vercel Production environment
- [ ] `NEXT_PUBLIC_SUPABASE_URL` configured
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` configured
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configured (NOT exposed to client)
- [ ] `DATABASE_URL` using pooler connection (port 6543)
- [ ] `RESEND_API_KEY` configured
- [ ] `NEXT_PUBLIC_SENTRY_DSN` configured
- [ ] `SENTRY_ORG` and `SENTRY_PROJECT` configured
- [ ] No secrets in client-side code (check Network tab)

## Security
- [ ] RLS enabled on ALL tables (green shield in Supabase)
- [ ] RLS policies verified (multi-tenant isolation tested)
- [ ] No test data in production database
- [ ] `.env` files in `.gitignore`
- [ ] Service role key not exposed in frontend bundle

## Monitoring
- [ ] Sentry capturing errors (test error triggers alert)
- [ ] Source maps uploaded to Sentry
- [ ] Health check endpoint working (`GET /api/health` returns 200)
- [ ] Uptime monitoring configured (UptimeRobot, Better Uptime, etc.)
- [ ] Vercel Analytics enabled
- [ ] GA4 tracking working (after cookie consent)

## Email
- [ ] Resend domain verified
- [ ] SPF record configured
- [ ] DKIM record configured
- [ ] DMARC record configured
- [ ] Test email arrives in inbox (not spam)
- [ ] Email headers show PASS for SPF/DKIM

## Legal & Compliance
- [ ] Privacy Policy page live and accurate
- [ ] Terms of Service page live and accurate
- [ ] Cookie consent banner showing (CookieYes)
- [ ] Accessibility statement live
- [ ] GDPR data export working
- [ ] Account deletion working

## Critical User Flows (Test Each)
- [ ] **Signup**: New user can create account
- [ ] **Email Verification**: Confirmation email received
- [ ] **Login**: User can log in with credentials
- [ ] **Password Reset**: Reset email sent and works
- [ ] **Dashboard**: Shows compliance overview correctly
- [ ] **Add Employee**: Employee creation works
- [ ] **Add Trip**: Trip creation and date validation works
- [ ] **Compliance Calculation**: 90/180 algorithm correct
- [ ] **Alert Triggers**: Warning/violation status triggers alert
- [ ] **Export CSV**: File downloads with correct data
- [ ] **Export PDF**: Report generates correctly
- [ ] **Settings**: User can update preferences
- [ ] **Logout**: Session properly terminated
- [ ] **Delete Account**: Soft delete works correctly

## Performance
- [ ] Lighthouse score >80 for Performance
- [ ] Largest Contentful Paint <2.5s
- [ ] First Input Delay <100ms
- [ ] Cumulative Layout Shift <0.1
- [ ] No console errors in production build

## Documentation
- [ ] Deployment runbook documented (`docs/RUNBOOK.md`)
- [ ] First 24-hour monitoring plan ready
- [ ] Emergency contacts documented
- [ ] Rollback procedure documented

## Final Steps
- [ ] Git tagged `v2.0.0` for rollback point
- [ ] Maintenance mode toggle tested
- [ ] Team notified of launch time
- [ ] Support email monitored

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| Tester | | | |
| Product Owner | | | |

---

## Post-Launch Actions

After confirming all items above:

1. **Hour 0**: Deploy to production via merge to `main`
2. **Hour 0-1**: Follow First 24 Hours monitoring plan
3. **Hour 1**: Announce on social media / email list
4. **Hour 24**: Review first day metrics
5. **Week 1**: Schedule retrospective

---

## Quick Reference

**Health Check**: `curl https://complyeur.com/api/health`

**Rollback**: Vercel Dashboard → Deployments → Previous version → Promote to Production

**Maintenance Mode**: Set `NEXT_PUBLIC_MAINTENANCE_MODE=true` in Vercel → Redeploy

**Support Email**: support@complyeur.com

**Status Page URLs**:
- Vercel: https://www.vercel-status.com
- Supabase: https://status.supabase.com
