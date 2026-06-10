# Incident Response Runbook

**Owner:** Engineering Lead  
**Review Cadence:** Quarterly  
**Last Reviewed:** 2025-06-10

---

## Severity Levels

| Level | Definition | Response Time | Examples |
|-------|-----------|---------------|---------|
| **P0 — Critical** | Service down or data breach | 15 min | Production outage, active exploit, data exfiltration |
| **P1 — High** | Major feature broken or security vulnerability | 1 hour | Auth broken, payment processing down, CVSS 9+ vuln |
| **P2 — Medium** | Degraded performance or moderate impact | 4 hours | Slow evaluations, non-critical feature broken |
| **P3 — Low** | Minor issue, no user impact | Next business day | UI bug, typo, minor misconfiguration |

---

## Incident Lifecycle

### 1. Detection
Sources that may surface incidents:
- **Automated alerts**: CloudWatch alarms, Sentry error spikes, uptime monitors
- **User reports**: Discord (#bugs), GitHub Issues, email to support@career-ops.io
- **Internal discovery**: Team member notices anomaly

When an incident is detected, **immediately open an incident channel** (#inc-YYYY-MM-DD) in Discord.

### 2. Triage (0–15 min for P0/P1)

Assign the following roles:
- **Incident Commander (IC)**: Owns coordination, communication. Does NOT fix the issue.
- **Technical Lead (TL)**: Investigates root cause and drives resolution.
- **Communications Lead**: Drafts status page update and customer notifications.

**IC checklist:**
- [ ] Confirm severity level
- [ ] Page on-call if P0/P1 (PagerDuty or Discord @oncall)
- [ ] Create incident timeline doc (copy template below)
- [ ] Notify VP Engineering for P0

### 3. Investigation (P0: <30 min, P1: <2h)

TL investigates using:
```bash
# Check service health across regions
curl https://us.career-ops.io/health | jq
curl https://eu.career-ops.io/health | jq
curl https://ap.career-ops.io/health | jq

# CloudWatch logs (replace REGION and CLUSTER)
aws logs filter-log-events --log-group-name "/ecs/career-ops-production-us-east-1" \
  --start-time $(date -d '1 hour ago' +%s)000 --filter-pattern "ERROR"

# ECS service status
aws ecs describe-services \
  --cluster career-ops-production-us-east-1 \
  --services career-ops-production-us-east-1-app

# Database connections
psql $DATABASE_URL -c "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"

# Redis memory
redis-cli -u $REDIS_URL INFO memory | grep used_memory_human
```

### 4. Containment

Depending on the issue type:

**Database issue:**
```bash
# Force failover to replica (RDS Multi-AZ)
aws rds failover-db-instance --db-instance-identifier career-ops-production-us-east-1-pg

# Emergency read-only mode (set in org settings or via env var)
# DB_READ_ONLY=true
```

**Security breach / unauthorized access:**
```bash
# Revoke all active sessions (emergency)
psql $DATABASE_URL -c "DELETE FROM sessions WHERE created_at < NOW();"

# Rotate all API keys
# Notify affected users immediately
```

**Deploy rollback:**
```bash
# ECS rollback to previous task definition revision
aws ecs update-service \
  --cluster career-ops-production-us-east-1 \
  --service career-ops-production-us-east-1-app \
  --task-definition career-ops-production-us-east-1-app:PREVIOUS_REVISION

# Or: trigger previous green deployment via GitHub Actions
# workflow_dispatch → deploy → regions: us-east-1
```

### 5. Resolution & Recovery

- [ ] Confirm fix is deployed and verified across all regions
- [ ] Run smoke tests: `curl https://us.career-ops.io/health`
- [ ] Monitor error rates for 30 min post-fix
- [ ] Update status page to "Resolved"
- [ ] Send customer notification if P0/P1 (see template below)

### 6. Post-Mortem (within 5 business days for P0/P1)

All P0 and P1 incidents require a post-mortem document covering:
1. **Timeline**: What happened, when, and who noticed
2. **Root cause**: What actually caused it (5 Whys)
3. **Impact**: Users affected, duration, data impact
4. **Response**: What we did and when
5. **Action items**: Concrete improvements with owners and due dates

Post-mortems are blameless — we fix systems, not people.

---

## Communication Templates

### Status Page Update (initial)
```
[INVESTIGATING] We are aware of an issue affecting [feature/service].
Our team is actively investigating. We will provide an update within 30 minutes.
Started: [time UTC]
```

### Customer Email (P0)
```
Subject: Service Disruption — Career-Ops [DATE]

We experienced a service disruption from [START TIME UTC] to [END TIME UTC] affecting [DESCRIPTION].

Impact: [# users affected, what was broken]

We've resolved the issue by [FIX DESCRIPTION]. Here's what happened: [BRIEF ROOT CAUSE].

Steps we're taking to prevent recurrence: [ACTION ITEMS]

We're deeply sorry for the disruption. If you have questions, reply to this email.

— The Career-Ops Team
```

### Security Incident Notification (GDPR Article 33 — must notify within 72h)
```
Subject: Security Notice — Career-Ops [DATE]

We're writing to inform you of a security incident that affected your Career-Ops account.

What happened: [DESCRIPTION]
When: [DATE/TIME UTC]
What data was involved: [DATA TYPES]
What we've done: [RESPONSE]
What you should do: [RECOMMENDED ACTIONS]

We've reported this to the relevant supervisory authority as required by GDPR Article 33.

Questions? Contact privacy@career-ops.io
```

---

## Quarterly Access Review Checklist

Run this checklist every quarter (Jan, Apr, Jul, Oct):

**User Access:**
- [ ] Review all admin/owner role memberships — remove any that are no longer needed
- [ ] Verify offboarded employees/contractors have had accounts deactivated
- [ ] Review service accounts and API keys — revoke unused ones
- [ ] Check AWS IAM users and roles — confirm principle of least privilege

**Infrastructure Access:**
- [ ] Review who has AWS console access
- [ ] Audit RDS parameter groups and security groups
- [ ] Review GitHub org members and permissions
- [ ] Verify Dependabot and GitHub Actions secrets are still current

**Third-Party Access:**
- [ ] Review subprocessors list — any new vendors?
- [ ] Confirm Stripe, Resend, Sentry API keys are rotated within 12 months
- [ ] Check OAuth applications authorized on GitHub org

Document results in `docs/access-review-YYYY-QN.md`.
