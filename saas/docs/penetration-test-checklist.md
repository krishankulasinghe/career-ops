# Penetration Test Preparation Checklist

**Status:** Pre-launch pentest planned (Q4 2025)  
**Scope:** Full-stack web application + API  
**Type:** White-box (share codebase with tester)

---

## Scope Definition

**In scope:**
- Web application: `https://app.career-ops.io`
- REST API: `https://app.career-ops.io/api/v1/`
- Authentication flows (login, registration, session management, API keys, SSO)
- All authenticated API endpoints
- File upload/download (CV PDFs, S3 pre-signed URLs)
- Webhook delivery
- Admin endpoints

**Out of scope:**
- AWS infrastructure attacks (not authorized)
- Social engineering / phishing
- Physical security
- Third-party services (Stripe, Resend, etc.)
- DoS/DDoS attacks

---

## Pre-Pentest Checklist

**Documentation to provide tester:**
- [ ] Architecture diagram (see SAAS_TRANSFORMATION_PLAN.md)
- [ ] API documentation (`/api/docs`)
- [ ] List of all user roles and their permissions
- [ ] List of all data sensitivity classifications
- [ ] Test environment credentials (dedicated test org per plan tier)
- [ ] Known limitations and accepted risks

**Environment setup:**
- [ ] Dedicated staging environment for pentest (never production)
- [ ] Test accounts: free user, pro user, team owner, team member, admin, enterprise user
- [ ] Rate limiting increased for tester IP in staging
- [ ] Audit logging enabled and accessible for review post-test
- [ ] WAF in detection-only mode (not blocking) during test

---

## OWASP Top 10 Self-Assessment

Before engaging external pentesters, verify these internally:

| # | Vulnerability | Status | Notes |
|---|--------------|--------|-------|
| A01 | Broken Access Control | ✅ Checked | RBAC + org scoping enforced on all routes |
| A02 | Cryptographic Failures | ✅ Checked | AES-256-GCM for keys, TLS 1.3, bcrypt for passwords |
| A03 | Injection | ✅ Checked | Drizzle ORM parameterized queries, Zod input validation |
| A04 | Insecure Design | 🔄 In Progress | Threat model in progress |
| A05 | Security Misconfiguration | ✅ Checked | Security headers, CORS, rate limiting |
| A06 | Vulnerable Components | ✅ Checked | Dependabot + npm audit in CI |
| A07 | Auth & Session Failures | ✅ Checked | Lucia sessions, SHA-256 API key hashing |
| A08 | Software & Data Integrity | ✅ Checked | SBOM, Trivy image scanning |
| A09 | Security Logging Failures | ✅ Checked | Audit log on all mutations, structured Pino logs |
| A10 | SSRF | 🔄 Partial | Webhook URL validation needed (TODO) |

---

## Common Attack Vectors to Test

**Authentication:**
- [ ] Brute force on login (rate limiting present?)
- [ ] Password reset token predictability / reuse
- [ ] Session fixation after login
- [ ] JWT/session token replay after logout
- [ ] API key exposure in logs
- [ ] MFA bypass attempts

**Authorization:**
- [ ] IDOR (Insecure Direct Object Reference) — access other org's data via UUID guessing
- [ ] Privilege escalation (member → owner, org → admin)
- [ ] Plan tier bypass (free user accessing Enterprise features)
- [ ] Cross-org data leakage in shared endpoints

**Input Validation:**
- [ ] SQL injection (should be blocked by Drizzle ORM)
- [ ] XSS in evaluation reports rendered in frontend
- [ ] Path traversal in file download endpoints
- [ ] S3 key manipulation (user-controlled path components)
- [ ] Webhook URL SSRF (can attacker exfiltrate internal metadata?)
- [ ] PDF generation: HTML injection in CV templates → code exec in Playwright?

**API Security:**
- [ ] Mass assignment via PUT/PATCH endpoints
- [ ] Undocumented endpoints (fuzzing)
- [ ] Rate limit bypass (IP rotation, header manipulation)
- [ ] Oversized payloads (JSON body size limit set?)

---

## Post-Pentest Remediation Process

1. Receive pentest report with CVSS scores
2. Triage all findings:
   - CVSS 9–10: Fix within 24h (P0)
   - CVSS 7–8.9: Fix within 7 days (P1)
   - CVSS 4–6.9: Fix within 30 days (P2)
   - CVSS 0–3.9: Fix in next sprint (P3)
3. Create GitHub Issues for all findings (mark as Security)
4. Re-test fixed items with original tester
5. Publish summary in Trust Center (findings fixed, no details)
