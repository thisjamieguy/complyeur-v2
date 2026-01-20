# Uptime Monitoring Evidence

Date: 2026-01-20
Last Updated: 2026-01-20T18:10:00Z
Environment: Production (complyeur.vercel.app)
Control Mapping: A1 (Availability), CC7 (System Operations)

## Overview

This evidence demonstrates that application uptime monitoring and alerting are configured and functional for ComplyEUR.

## Monitoring Configuration

### Service: Better Stack
- **URL**: https://uptime.betterstack.com
- **Monitor Type**: HTTP(S) Monitor
- **Endpoint**: `https://complyeur.vercel.app/api/health`
- **Check Interval**: 3 minutes

### Health Endpoint Implementation

**File**: `app/api/health/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { version } from '../../../package.json'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const start = Date.now()

  try {
    // Test database connectivity
    const supabase = await createClient()
    const { error } = await supabase.from('companies').select('id').limit(1)

    if (error) throw error

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: version,
      database: 'connected',
      responseTime: `${Date.now() - start}ms`
    })
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: version,
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: `${Date.now() - start}ms`
    }, { status: 503 })
  }
}
```

**Health Check Behavior**:
| Condition | HTTP Status | Response |
|-----------|-------------|----------|
| Database connected | 200 | `{"status":"healthy","version":"0.1.0","database":"connected"}` |
| Database error | 503 | `{"status":"unhealthy","version":"0.1.0","database":"disconnected"}` |

### Alert Configuration

| Setting | Value |
|---------|-------|
| Alert Channels | Better Stack incident alert (escalation to entire team) |
| Incident Escalation | Entire team |

## Better Stack Setup Instructions

### Step 1: Create Monitor
1. Log in to Better Stack dashboard
2. Navigate to Monitors > Create Monitor
3. Configure:
   - **Monitor Type**: HTTP(S)
   - **URL**: `https://complyeur.vercel.app/api/health`
   - **Name**: ComplyEUR Production Health
   - **Check Interval**: 3 minutes
   - **Request Timeout**: 30 seconds
   - **Verify SSL**: Yes
   - **Expected Status Code**: 200

### Step 2: Configure Alerting
1. Navigate to Alerting > Create Policy
2. Add alert channels:
   - Better Stack incident alert with escalation to entire team
3. Set escalation policy to notify the team on incident creation

### Step 3: Verify Monitor
1. Confirm monitor status shows "Up"
2. Confirm checks run every 3 minutes

## Evidence Collection

### Health Endpoint Response Test

```bash
$ curl -s -D - https://complyeur.vercel.app/api/health
HTTP/2 200
date: Tue, 20 Jan 2026 17:40:04 GMT
content-type: application/json
server: Vercel
...
{"status":"healthy","timestamp":"2026-01-20T17:40:04.741Z","version":"0.1.0","database":"connected","responseTime":"332ms"}
```

```bash
$ curl -s https://complyeur.vercel.app/api/health | jq
{
  "status": "healthy",
  "timestamp": "2026-01-20T17:40:04.741Z",
  "version": "0.1.0",
  "database": "connected",
  "responseTime": "332ms"
}
```

**Verified**: 2026-01-20T17:40:04Z (HTTP 200)

### Better Stack Monitor Status

**Screenshot**: Better Stack monitor dashboard showing:
1. Monitor name: "ComplyEUR Production Health"
2. Status: Up
3. Checked every 3 minutes
4. Uptime percentage
5. Last check time

**Location**: `docs/compliance/soc2/evidence/screenshots/uptime_monitor_up.png`

### Alert Evidence

Alert fired and incident created in Better Stack for a 503 failure.

**Incident Details**:
- **Status**: 503 Service Unavailable
- **Incident Created**: 2026-01-20 17:57 UTC (ongoing at time of capture)
- **Checked URL**: `https://complyeur.vercel.app/api/api/health-broken`
- **Response Code**: 503
- **Escalation**: Entire team

**Screenshot**: Better Stack incident details showing:
1. Incident timestamp
2. Monitor name
3. Status 503 and escalation target

**Location**: `docs/compliance/soc2/evidence/screenshots/betterstack_alert_fired.png`

### Local Verification (Development)

```bash
$ curl -s http://localhost:3000/api/health
{"status":"healthy","timestamp":"2026-01-19T23:33:16.398Z","database":"connected","responseTime":"51ms"}
```

## Monitoring Metrics

| Metric | Value | Notes |
|--------|-------|-------|
| Check Frequency | Every 3 minutes | From monitor status screenshot |
| Region | Europe | From response time chart |

## Incident Response Integration

Observed flow on downtime:
1. Better Stack creates incident automatically
2. Alert escalates to entire team
3. Incident documented in Better Stack incident log

## Conclusion

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Uptime monitoring configured | **Verified** | Better Stack monitor status screenshot |
| Health endpoint functional | **Verified** | Live 200 response from production |
| Alert on downtime | **Verified** | Incident created on 503 failure |
| Alert fired/tested | **Verified** | Better Stack incident screenshot |

**Gap Status: Remediated (verified)**

## Deployment Details

| Item | Value |
|------|-------|
| Production URL | https://complyeur.vercel.app |
| Health Endpoint | https://complyeur.vercel.app/api/health |
| Deployment Platform | Vercel (Hobby tier) |
| Deployment Date | 2026-01-20 |
| Application Version | 0.1.0 |
| Monitor Check Interval | 3 minutes |

---

## Evidence Capture Summary

Evidence captured:
1. [x] Monitor status screenshot (`uptime_monitor_up.png`)
2. [x] Alert/incident screenshot (`betterstack_alert_fired.png`)
3. [x] Screenshots saved to `docs/compliance/soc2/evidence/screenshots/`

**Note**: Production health endpoint verified by live HTTP 200.
