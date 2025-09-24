# Service Layer Migration - Phase 1 Deployment Instructions

## ✅ Pre-Migration Checklist

- [x] ✅ **Service layer extracted and validated** (100% success rate)
- [x] ✅ **Feature flags implemented** (`USE_SERVICE_LAYER` environment variable)
- [x] ✅ **Error monitoring setup** (`/api/monitoring/health` endpoint)
- [x] ✅ **ContractService integration** (GET and POST endpoints)
- [ ] ⚠️ **Database backup completed**
- [ ] ⚠️ **Stakeholder notification sent**

## 📊 Current Status: READY FOR PHASE 1 DEPLOYMENT

**Implementation**: Phase 1 ContractService integration complete with feature flags and monitoring.

## 🚀 Phase 1 Deployment Steps

### Step 1: Complete Database Backup

**CRITICAL: Run database backup before enabling service layer**

```bash
# 1. Ensure DATABASE_URL is set in .env
echo $DATABASE_URL

# 2. Run backup script
./scripts/backup-database.sh

# 3. Verify backup was created
ls -la backups/

# 4. Optional: Test backup integrity
# pg_restore --list backups/arqcashflow_backup_YYYYMMDD_HHMMSS.sql
```

**Expected outcome**: Backup file created in `backups/` directory with timestamp.

### Step 2: Enable Service Layer (Gradual Rollout)

**Option A: Environment Variable (Recommended)**
```bash
# Add to .env file
USE_SERVICE_LAYER="true"

# Restart application
npm run dev  # or your production restart command
```

**Option B: Production Environment**
```bash
# For Vercel deployment
vercel env add USE_SERVICE_LAYER true production

# For other platforms, set environment variable accordingly
```

### Step 3: Validate Phase 1 Implementation

**Monitor Health Endpoint**
```bash
# Check service layer health
curl http://localhost:3000/api/monitoring/health

# Expected response:
{
  "status": "ok",
  "featureFlags": {
    "useServiceLayer": true,
    "environment": "production"
  },
  "health": {
    "serviceLayerErrorRate": 0,
    "legacyErrorRate": 0,
    "overallHealth": "healthy"
  }
}
```

**Test Contract Endpoints**
```bash
# Test GET contracts (should use service layer)
curl -H "Authorization: Bearer TOKEN" http://localhost:3000/api/contracts

# Test POST contract creation (should use service layer)
curl -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"clientName":"Test","projectName":"Test Project","totalValue":1000,"signedDate":"2025-09-24"}' \
  http://localhost:3000/api/contracts
```

### Step 4: Monitor for 48 Hours

**Automated Monitoring**
- Service layer error rate should remain < 5%
- Response times should be comparable to legacy implementation
- No data integrity issues should occur

**Manual Verification**
- [ ] Contract creation works identically
- [ ] Contract listing returns same results
- [ ] Audit logs are being created correctly
- [ ] Team isolation is working properly

## 🔄 Rollback Procedure

**INSTANT ROLLBACK (< 5 minutes)**

If any issues occur:

1. **Disable Service Layer**
   ```bash
   # Update environment variable
   USE_SERVICE_LAYER="false"

   # Restart application
   # System immediately reverts to legacy implementation
   ```

2. **Verify Rollback**
   ```bash
   # Check feature flag status
   curl http://localhost:3000/api/monitoring/health

   # Should show: "useServiceLayer": false
   ```

3. **No Code Changes Required**
   - Feature flag controls which implementation runs
   - No deployment or code changes needed for rollback

## ⚠️ Abort Criteria

**Stop migration immediately if:**
- Error rate increases > 5%
- Response time increases > 20%
- Data integrity issues detected
- Audit logging failures
- Critical user-reported issues

## 📈 Success Criteria for Phase 1

**Technical Metrics**
- [x] ✅ **Service layer operational** (ContractService working)
- [x] ✅ **Feature flag functional** (instant rollback capability)
- [x] ✅ **Monitoring active** (health endpoint responding)
- [ ] ⚠️ **Error rate < 1%** (48-hour monitoring required)
- [ ] ⚠️ **Performance maintained** (response times comparable)

**Functional Validation**
- [ ] ⚠️ **Identical API responses** (service vs legacy comparison)
- [ ] ⚠️ **Audit logs consistent** (no logging gaps)
- [ ] ⚠️ **Team isolation working** (multi-tenant security)
- [ ] ⚠️ **Frontend compatibility** (no UI issues)

## 📞 Support & Monitoring

**Health Monitoring**
- Endpoint: `GET /api/monitoring/health`
- Check frequency: Every 5 minutes during first 48 hours
- Alert threshold: Error rate > 5% or health status != "healthy"

**Log Monitoring**
- Service layer events: Category "service-layer"
- Legacy events: Category "legacy"
- Performance comparisons: Category "performance"

**Contact Protocol**
- Monitor health endpoint continuously
- Report issues immediately via normal channels
- Rollback decision: Any team member can initiate

---

## 🎯 Next Phases (After Phase 1 Success)

**Phase 2**: Full contract API migration (all CRUD operations)
**Phase 3**: Receivables & expenses migration
**Phase 4**: Advanced service features (bulk operations, AI integration)

---

**This document should be used alongside the service layer migration plan for complete deployment guidance.**