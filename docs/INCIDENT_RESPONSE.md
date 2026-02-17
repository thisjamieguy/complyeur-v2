# Incident Response Plan (SOC 2 / GDPR)

This playbook defines how ComplyEur detects, triages, contains, and communicates security incidents in production.

---

## 1. Scope
Applies to any security event involving:
- Unauthorized access or suspected access to customer data
- Data loss, corruption, or unintended disclosure
- Service availability incidents that impact customer data access
- Credential compromise or MFA bypass attempts

---

## 2. Roles and Responsibilities
- **Incident Commander (IC)**: owns coordination, decisions, and timeline.
- **Security Lead**: investigates root cause, containment, and evidence.
- **Engineering Lead**: executes fixes and recovery steps.
- **Privacy Officer (GDPR)**: handles breach assessment and regulatory notifications.
- **Comms Owner**: manages customer and stakeholder messaging.

---

## 3. Detection and Reporting
Detection sources:
- Sentry error alerts
- Supabase Auth / DB logs
- Vercel runtime logs
- User reports and support tickets

Initial reporting channel:
- Internal incident channel (Slack/Teams)
- Pager/on-call escalation if Sev1

---

## 4. Severity Levels
**Sev1 (Critical):**
- Confirmed data breach
- Widespread unauthorized access
- Production data integrity loss

**Sev2 (High):**
- Suspicious access patterns
- Single-tenant exposure risk
- Major outage affecting data access

**Sev3 (Moderate):**
- Limited impact, no data exposure confirmed
- Partial outage or degraded service

---

## 5. Response Workflow

### 5.1 Triage (0-30 minutes)
1. Confirm incident and severity
2. Establish IC and response team
3. Preserve evidence (logs, audit trails)

### 5.2 Containment (30-120 minutes)
1. Revoke compromised credentials
2. Apply access restrictions or feature flags
3. Isolate affected components if needed

### 5.3 Eradication and Recovery
1. Patch the root cause
2. Validate data integrity
3. Restore from backup if required
4. Monitor for recurrence

### 5.4 Post-Incident
1. Document root cause and timeline
2. Track remediation tasks
3. Conduct post-mortem review

---

## 6. Communications

### Internal
- IC posts status updates every 60 minutes for Sev1/Sev2
- Engineering Lead confirms remediation steps

### External (Customers)
- Notify customers when data access, integrity, or confidentiality is impacted
- Provide scope, timeline, and mitigation steps

### Regulatory (GDPR)
If personal data breach is likely to result in risk to individuals:
- Notify the supervisory authority within **72 hours** of becoming aware
- Notify affected data subjects **without undue delay**
- Record rationale if notification is not required

GDPR execution checklist:
1. Record exact awareness timestamp (`T0`) in incident timeline.
2. Complete initial risk assessment (scope, categories, likely impact).
3. Decide whether regulator notification is required by `T0 + 48h` to preserve reporting margin.
4. If UK data subjects are impacted, submit ICO notification before `T0 + 72h`.
5. Prepare affected-user notice with plain-language impact and remediation guidance.
6. Save regulator/customer notice content in incident evidence records.

---

## 7. Evidence and Audit Trail
For every incident, record:
- Start time, detection time, and resolution time
- Impacted systems and data
- Logs, alerts, and relevant audit entries
- Containment steps and recovery actions
- Communication timestamps and recipients

Store evidence in the incident folder (access controlled) with a link in the post-mortem.

---

## 8. Templates

### Customer Notice (Short)
```
We identified and contained a security incident on [DATE/TIME].
Impact: [SUMMARY]. Actions taken: [SUMMARY].
We will provide a full report within [TIMEFRAME].
```

### Regulator Notice (GDPR)
```
Controller: ComplyEur
Incident date/time: [DATE/TIME]
Nature of breach: [DESCRIPTION]
Categories of data: [DATA TYPES]
Estimated records impacted: [COUNT]
Mitigation steps: [ACTIONS]
Point of contact: [NAME/EMAIL]
```

---

## 9. Review Cadence
Review this plan at least annually and after any Sev1/Sev2 incident.
