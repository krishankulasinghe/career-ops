# Disaster Recovery Runbook

**RTO (Recovery Time Objective):** 1 hour for P0 (production down)  
**RPO (Recovery Point Objective):** 15 minutes (RDS automated backups + PITR)  
**Last Reviewed:** 2025-06-10

---

## Regional Failover

Career-Ops runs in 3 regions: **us-east-1** (primary), **eu-west-1**, **ap-southeast-1**.

Route53 latency-based routing automatically routes traffic to the nearest healthy region.
If us-east-1 is fully down, traffic automatically fails over to eu-west-1 or ap-southeast-1.

**To verify failover is working:**
```bash
# Check Route53 health checks
aws route53 list-health-checks

# Force traffic to EU (emergency DNS override)
aws route53 change-resource-record-sets --hosted-zone-id $ZONE_ID \
  --change-batch '{"Changes":[{"Action":"UPSERT","ResourceRecordSet":{
    "Name":"app.career-ops.io","Type":"A","AliasTarget":{
      "HostedZoneId":"$EU_ALB_ZONE_ID",
      "DNSName":"$EU_ALB_DNS",
      "EvaluateTargetHealth":true
    }
  }}]}'
```

---

## Database Recovery

### Point-in-Time Recovery (PITR)
RDS supports PITR to any second within the backup retention window (35 days for Enterprise).

```bash
# Restore to a specific point in time
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier career-ops-production-us-east-1-pg \
  --target-db-instance-identifier career-ops-production-us-east-1-pg-restored \
  --restore-time "2025-06-09T12:00:00Z"

# After restore: update app DATABASE_URL to point to restored instance
# Then promote read replica to writer if needed
aws rds promote-read-replica \
  --db-instance-identifier career-ops-production-eu-west-1-pg
```

### Backup Verification (monthly)
Test that backups are restorable:
```bash
# Create test restore (in staging environment)
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier career-ops-dr-test \
  --db-snapshot-identifier $(aws rds describe-db-snapshots \
    --db-instance-identifier career-ops-production-us-east-1-pg \
    --query 'DBSnapshots[-1].DBSnapshotIdentifier' --output text)

# Verify data integrity
psql $DR_TEST_URL -c "SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM applications;"

# Clean up
aws rds delete-db-instance --db-instance-identifier career-ops-dr-test --skip-final-snapshot
```

---

## Complete Region Loss Recovery

If us-east-1 is completely unavailable:

1. **Verify** the region is down (AWS status page + manual health checks)
2. **Promote** eu-west-1 read replica to writer:
   ```bash
   aws rds promote-read-replica \
     --db-instance-identifier career-ops-production-eu-west-1-pg \
     --region eu-west-1
   ```
3. **Update ECS** task definitions in eu-west-1 to point to local DB
4. **Force DNS** Route53 to route all traffic to eu-west-1 ALB
5. **Notify customers** of region change (impacts EU data residency orgs — they're already in EU)
6. **Monitor** eu-west-1 for capacity issues (scale up ECS if needed)

**Expected recovery time:** 20–45 minutes

---

## S3 Data Recovery

S3 cross-region replication ensures data is available in all 3 regions.
If primary bucket is unavailable, switch `S3_BUCKET` env var to replica bucket.

```bash
# List available replicas
aws s3 ls | grep career-ops-production

# Point application to EU replica
# Update ECS task env var: S3_BUCKET=career-ops-production-assets-euw1
```

---

## Checklist: DR Test (Quarterly)

- [ ] Restore a database snapshot to staging and verify data integrity
- [ ] Simulate single-region failure: disable health check, verify Route53 failover
- [ ] Verify S3 cross-region replication is working
- [ ] Test PITR to a timestamp 24h ago
- [ ] Verify Redis failover (ElastiCache Multi-AZ automatic failover)
- [ ] Document test results in `docs/dr-test-YYYY-QN.md`
