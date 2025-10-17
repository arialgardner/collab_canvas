# Migration Guide: v7 to v8

Complete guide for migrating from CollabCanvas v7 (Firestore-only) to v8 (Hybrid Realtime DB + Firestore with Operational Transform).

## Table of Contents

1. [Overview](#overview)
2. [Migration Strategy](#migration-strategy)
3. [Pre-Migration Checklist](#pre-migration-checklist)
4. [Phase-by-Phase Migration](#phase-by-phase-migration)
5. [Rollback Procedures](#rollback-procedures)
6. [Validation & Testing](#validation--testing)
7. [Post-Migration Cleanup](#post-migration-cleanup)
8. [Troubleshooting](#troubleshooting)

---

## Overview

**Goal**: Migrate from Firestore-only architecture to hybrid Realtime DB + Firestore with zero downtime and no data loss.

**Key Changes**:
- Cursors: Firestore → Realtime DB
- Presence: Firestore → Realtime DB
- Operations: New operation log in Realtime DB (for OT)
- Shape updates: Dual-write during migration, then Realtime DB for rapid updates
- Persistence: Firestore remains source of truth

**Duration**: 2-3 weeks (gradual rollout)

**Risk Level**: Low (dual-write + feature flags + instant rollback)

---

## Migration Strategy

### Gradual Rollout

**Phase 1**: 10% of users (Week 1)
- Monitor metrics closely
- Validate data consistency
- Quick rollback if issues

**Phase 2**: 50% of users (Week 2)
- Expanded testing
- Performance validation
- Cost monitoring

**Phase 3**: 100% of users (Week 3)
- Full rollout
- Final validation
- Post-migration cleanup

### Feature Flags

**Primary Flag**: `USE_REALTIME_DB`
- Default: `false` (use Firestore)
- Enable: `true` (use Realtime DB)
- Controlled via Firebase Remote Config

**Secondary Flags**:
- `ENABLE_OPERATION_LOG`: Enable operation logging for OT
- `ENABLE_PREDICTION`: Enable client-side prediction
- `ENABLE_OT`: Enable operational transform

**Configuration**:
```javascript
// Firebase Remote Config
{
  "USE_REALTIME_DB": {
    "defaultValue": { "value": "false" },
    "conditionalValues": {
      "rollout_10_percent": { "value": "true" },
      "rollout_50_percent": { "value": "true" },
      "rollout_100_percent": { "value": "true" }
    }
  }
}
```

**Implementation**: `ui/src/utils/featureFlags.js`

---

## Pre-Migration Checklist

### 1. Infrastructure Setup

- [ ] **Enable Firebase Realtime Database**
  - Go to Firebase Console → Realtime Database
  - Click "Create Database"
  - Choose same region as Firestore
  - Start in test mode (will secure later)

- [ ] **Deploy Security Rules** (test mode)
  ```json
  {
    "rules": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
  ```

- [ ] **Set up Feature Flags**
  - Create Remote Config parameters
  - Set default to `false`
  - Create conditions for 10%, 50%, 100% rollout

- [ ] **Configure Monitoring**
  - Set up Firebase Performance Monitoring
  - Configure alerts for errors/latency
  - Set up dashboards for metrics

### 2. Code Deployment

- [ ] **Deploy v8 Code** (with feature flags disabled)
  ```bash
  cd ui
  npm run build
  firebase deploy --only hosting
  ```

- [ ] **Deploy Functions** (if using Cloud Functions)
  ```bash
  cd functions
  npm run deploy
  ```

- [ ] **Verify Deployment**
  - Check that feature flags read correctly
  - Verify app still works with Firestore
  - Test flag toggling in dev environment

### 3. Validation Setup

- [ ] **Create Validation Scripts**
  - Script to compare Firestore vs Realtime DB data
  - Script to check data consistency
  - Script to measure latency

- [ ] **Set up Test Users**
  - Create test accounts
  - Add to 10% rollout group
  - Prepare test scenarios

### 4. Communication

- [ ] **Notify Team**
  - Share migration timeline
  - Assign monitoring responsibilities
  - Prepare rollback procedure

- [ ] **User Communication** (optional)
  - "We're improving performance" banner
  - Link to changelog
  - Dismissable notification

---

## Phase-by-Phase Migration

### Phase 1: 10% Rollout (Week 1)

#### Day 1: Enable for 10%

**1. Update Feature Flag**
```bash
# Firebase Console → Remote Config
USE_REALTIME_DB:
  - condition: user_id % 10 == 0
  - value: true
```

**2. Monitor Metrics**
```javascript
// Check Performance Dashboard
- Cursor sync latency: Should drop from ~150ms to ~30ms
- Object sync latency: Should drop from ~250ms to ~60ms
- Error rate: Should remain <1%
- Realtime DB connections: ~10% of active users
```

**3. Validate Data Consistency**
```bash
npm run validate:cursors
npm run validate:presence
npm run validate:operations
```

#### Day 2-3: Monitor & Adjust

**Watch For**:
- Increased error rate
- Latency spikes
- User complaints
- Cost anomalies

**Success Criteria**:
- Latency improved by >50%
- Error rate <1%
- No data loss
- Cost within expected range

**If Issues**:
- Roll back immediately (set flag to `false`)
- Investigate logs
- Fix issues
- Retry rollout

#### Day 4-7: Stability Period

**Continue Monitoring**:
- 7 days of stable operation
- No critical issues
- Metrics meeting targets

**If Stable**:
- Proceed to Phase 2

**If Unstable**:
- Roll back
- Investigate root cause
- Fix and retry

---

### Phase 2: 50% Rollout (Week 2)

#### Day 1: Expand to 50%

**1. Update Feature Flag**
```bash
USE_REALTIME_DB:
  - condition: user_id % 2 == 0
  - value: true
```

**2. Monitor Closely**
- First 24 hours: Check every hour
- Days 2-3: Check every 4 hours
- Days 4-7: Daily checks

**3. Load Testing**
- Verify system handles increased load
- Monitor Realtime DB performance
- Check Firestore costs dropping

#### Day 2-7: Validation

**Metrics to Track**:
```javascript
{
  "cursor_sync_p95": "<50ms",
  "object_sync_p95": "<100ms",
  "error_rate": "<1%",
  "realtime_db_connections": "~50% of active users",
  "firestore_reads": "~40% reduction",
  "firestore_writes": "~60% reduction",
  "cost_savings": "~30% reduction"
}
```

**Success Criteria**:
- All targets met
- 7 days stable
- No major issues

**Proceed to Phase 3 if successful**

---

### Phase 3: 100% Rollout (Week 3)

#### Day 1: Full Rollout

**1. Enable for All Users**
```bash
USE_REALTIME_DB:
  - default: true
  - no conditions
```

**2. Announce to Users** (optional)
```html
<div class="performance-banner">
  🎉 Performance Update: We've upgraded our real-time sync!
  You should notice faster cursor and shape updates.
  <button>Learn More</button>
  <button>Dismiss</button>
</div>
```

**3. Monitor Intensively**
- First 6 hours: Continuous monitoring
- Day 1-3: Check every 2 hours
- Day 4-7: Daily checks

#### Day 2-7: Stability Period

**Final Validation**:
- All performance targets met
- Error rate <1%
- Cost savings realized
- User feedback positive

**If Successful**:
- Migration complete!
- Proceed to post-migration cleanup

**If Issues**:
- Roll back to 50%
- Investigate and fix
- Retry 100% rollout

---

## Rollback Procedures

### Instant Rollback (<5 minutes)

**Scenario**: Critical issue detected

**Steps**:
1. **Disable Feature Flag**
   ```bash
   # Firebase Console → Remote Config
   USE_REALTIME_DB: false
   ```

2. **Verify Rollback**
   - Check users reverting to Firestore
   - Monitor error rates dropping
   - Verify functionality restored

3. **Communicate**
   - Notify team
   - Log incident
   - Begin investigation

**Expected Result**:
- Users reconnect to Firestore within 30 seconds
- No data loss (dual-write maintained)
- Normal operation restored

### Partial Rollback

**Scenario**: Issues with subset of users

**Steps**:
1. **Reduce Rollout Percentage**
   ```bash
   # Roll back from 100% to 50%
   USE_REALTIME_DB:
     - condition: user_id % 2 == 0
     - value: true
   ```

2. **Identify Affected Users**
   - Check error logs
   - Analyze patterns
   - Contact affected users if needed

3. **Fix and Re-rollout**
   - Address root cause
   - Test thoroughly
   - Gradual re-rollout

---

## Validation & Testing

### Automated Validation Scripts

**1. Cursor Validation**
```bash
# ui/scripts/validate-cursors.js
npm run validate:cursors

# Checks:
- Firestore cursor count == Realtime DB cursor count
- All cursors have valid positions
- No missing user data
```

**2. Presence Validation**
```bash
npm run validate:presence

# Checks:
- Online users match between systems
- lastSeen timestamps current
- No ghost users
```

**3. Operation Log Validation**
```bash
npm run validate:operations

# Checks:
- Operations sequential (no gaps)
- All operations have required fields
- Sequence numbers unique
```

### Manual Testing Scenarios

**Test 1: Cursor Sync**
1. Open canvas in two browsers
2. Move cursor in browser 1
3. Verify cursor updates in browser 2 within 50ms

**Test 2: Shape Editing**
1. Create rectangle in browser 1
2. Verify appears in browser 2 within 100ms
3. Drag in browser 1, verify updates in browser 2

**Test 3: Concurrent Editing**
1. Both users drag same shape simultaneously
2. Verify both movements applied (OT working)
3. No overwrites or data loss

**Test 4: Disconnect Recovery**
1. Disconnect network in browser 1
2. Make edits in browser 2
3. Reconnect browser 1
4. Verify state synchronized correctly

**Test 5: Bulk Operations**
1. Create 500 rectangles via AI command
2. Verify all appear correctly
3. Verify performance remains smooth

---

## Post-Migration Cleanup

### After 1 Week at 100%

**If Stable** (no rollbacks, all metrics met):

1. **Remove Dual-Write Code**
   ```javascript
   // Delete old Firestore cursor/presence writes
   // Keep only Realtime DB writes
   
   // Before:
   if (USE_REALTIME_DB) {
     await updateRealtimeDB(cursor)
   } else {
     await updateFirestore(cursor)
   }
   
   // After:
   await updateRealtimeDB(cursor)
   ```

2. **Clean Up Old Data**
   ```bash
   # Delete old Firestore collections
   firebase firestore:delete cursors --recursive
   firebase firestore:delete presence --recursive
   
   # Keep shapes collection (still used for persistence)
   ```

3. **Remove Feature Flags**
   ```javascript
   // Remove all checks for USE_REALTIME_DB
   // Realtime DB is now default
   ```

4. **Update Security Rules**
   ```json
   // Deploy production security rules
   // Remove test mode
   // Add proper validation and access control
   ```

5. **Update Documentation**
   - Mark migration as complete
   - Update architecture diagrams
   - Update API documentation

6. **Cost Analysis**
   - Compare costs pre/post migration
   - Verify savings realized
   - Adjust budgets

---

## Troubleshooting

### Issue: Cursor Lag After Migration

**Symptoms**:
- Cursors updating slowly (>100ms)
- Jerky cursor movement

**Diagnosis**:
```javascript
// Check throttle settings
console.log('Cursor throttle:', CURSOR_THROTTLE)
// Should be 16ms for active, 50ms for idle

// Check connection state
console.log('Realtime DB connected:', connectionState)

// Check network
console.log('Network latency:', measureLatency())
```

**Solutions**:
1. Verify Realtime DB region matches Firestore
2. Check throttle settings not too conservative
3. Verify cursor interpolation enabled
4. Check for network issues

---

### Issue: Data Inconsistency

**Symptoms**:
- Shapes missing in some clients
- Duplicate shapes
- Incorrect positions

**Diagnosis**:
```bash
# Run validation scripts
npm run validate:cursors
npm run validate:presence  
npm run validate:operations

# Check operation log
firebase database:get /canvases/{canvasId}/operationLog
```

**Solutions**:
1. Verify dual-write functioning during migration
2. Check operation log for gaps
3. Verify OT functioning correctly
4. May need to resync from Firestore

---

### Issue: High Error Rate

**Symptoms**:
- Error rate >5%
- User complaints
- Failed operations

**Diagnosis**:
```javascript
// Check error logs
firebase functions:log

// Check Realtime DB rules
firebase database:get /.settings/rules

// Check client errors
console.error logs
```

**Solutions**:
1. Verify security rules allow operations
2. Check rate limits not exceeded
3. Verify authentication working
4. Roll back if errors persist

---

### Issue: Cost Spike

**Symptoms**:
- Firebase bill higher than expected
- Realtime DB costs excessive

**Diagnosis**:
```bash
# Check Firebase Console → Usage & Billing
- Realtime DB bandwidth
- Realtime DB connections
- Firestore reads/writes

# Check for:
- Excessive cursor updates
- Operation log not pruning
- Dual-write still active (should be temporary)
```

**Solutions**:
1. Verify operation log pruning working (1 hour retention)
2. Check cursor throttling active
3. Verify dual-write disabled after migration
4. Optimize payload sizes

---

## Migration Checklist

### Pre-Migration
- [ ] Realtime DB enabled
- [ ] Security rules deployed (test mode)
- [ ] Feature flags configured
- [ ] Monitoring set up
- [ ] Code deployed (flags disabled)
- [ ] Validation scripts ready
- [ ] Team notified

### Phase 1 (10%)
- [ ] Flag enabled for 10%
- [ ] Metrics monitored
- [ ] Data validated
- [ ] 7 days stable
- [ ] No critical issues

### Phase 2 (50%)
- [ ] Flag enabled for 50%
- [ ] Load testing completed
- [ ] Metrics validated
- [ ] Cost savings visible
- [ ] 7 days stable

### Phase 3 (100%)
- [ ] Flag enabled for 100%
- [ ] Intensive monitoring
- [ ] All targets met
- [ ] User feedback positive
- [ ] 7 days stable

### Post-Migration
- [ ] Dual-write code removed
- [ ] Old data cleaned up
- [ ] Feature flags removed
- [ ] Security rules hardened
- [ ] Documentation updated
- [ ] Cost analysis completed

---

## References

- [Realtime DB Schema](./REALTIME_DB_SCHEMA.md)
- [Performance Optimization](./PERFORMANCE_OPTIMIZATION.md)
- [Security Rules Documentation](./SECURITY_RULES_DOCUMENTATION.md)
- [v8 PRD](./v8-prd.md)

---

**Document Version**: 1.0  
**Last Updated**: 2025-10-17  
**Status**: PR #12 Complete

