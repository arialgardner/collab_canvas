# CollabCanvas v8 - Task List & PR Breakdown

**Goal:** Ultra-low-latency real-time collaboration with Firebase Realtime Database + Operational Transform

**Performance Targets:**
- Object sync: <100ms (vs. current 100-500ms)
- Cursor sync: <50ms (vs. current 100-300ms)
- Zero visible lag during rapid edits (10+ changes/sec)
- Consistent state with OT (no overwrites from concurrent edits)
- No ghost objects or duplicates
- Exact state recovery on refresh

**Architecture:** Hybrid Firebase (Realtime DB for ephemeral data + Firestore for persistence)

---

## PR #1: Firebase Realtime Database Setup & Configuration
**Purpose:** Add Realtime DB to project and design schema

**Tasks:**

✅ Add Firebase Realtime Database to project
- Enable Realtime Database in Firebase Console
- Choose region (same as Firestore for consistency)
- Start in test mode initially (will add security rules later)
- Update Firebase SDK imports to include `firebase/database`

✅ Design Realtime DB schema
- Create `/canvases/{canvasId}/cursors/{userId}` path for cursor positions
- Create `/canvases/{canvasId}/presence/{userId}` path for user presence
- Create `/canvases/{canvasId}/operationLog/{sequenceNumber}` for operation history
- Create `/canvases/{canvasId}/ephemeralShapes/{shapeId}` for rapid edits
- Create `/canvases/{canvasId}/activeEdits/{shapeId}` for edit locking
- Document schema in `REALTIME_DB_SCHEMA.md`

✅ Create Realtime DB configuration file
- Create `src/firebase/realtimeDB.js` with database initialization
- Export `realtimeDB` reference for use in composables
- Add helper functions: `getCursorRef()`, `getPresenceRef()`, `getOperationLogRef()`

✅ Set up basic security rules (test mode)
```javascript
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
```
- Will be refined in PR #9

✅ Create feature flag system
- Add `USE_REALTIME_DB` flag to Firebase Remote Config
- Create `src/utils/featureFlags.js` to read flags
- Default to `false` (use existing Firestore)
- Allow per-user rollout (10% → 50% → 100%)

✅ Add monitoring setup
- Create `src/composables/useRealtimeDBMonitoring.js`
- Track connection state (connected/disconnected)
- Track operation count and bandwidth
- Log latency for cursor and shape operations

**Deliverable:**
✅ Realtime DB initialized, schema documented, feature flag system ready. No user-facing changes yet.

---

## PR #2: Cursor Migration to Realtime Database
**Purpose:** Move cursor tracking from Firestore to Realtime DB for sub-50ms sync

**Tasks:**

✅ Create new cursor composable for Realtime DB
- Create `src/composables/useCursorsRTDB.js` (separate from existing `useCursors.js`)
- Implement `updateCursorPosition()` using Realtime DB `set()`
- Implement `subscribeToCursors()` using Realtime DB `.on('value')`
- Implement `removeCursor()` using Realtime DB `remove()`
- Use same data structure as existing cursor system for compatibility

✅ Add adaptive throttling for cursor updates
- 16ms throttle when actively moving (60 FPS)
- 50ms throttle when idle (no movement for 1 second)
- Suppress updates for movements <5px (reduce noise)
- Track last significant movement time

✅ Implement cursor interpolation
- Create `CursorInterpolator` class in `src/utils/cursorInterpolation.js`
- Store current position and target position
- Linear interpolation between updates
- Smooth animation via `requestAnimationFrame`
- Prevents jerky cursor movement

✅ Add cursor position rounding
- Round cursor coordinates to integers before sending
- Reduces payload size (no decimal precision)
- Reduces bandwidth usage

✅ Implement automatic cleanup on disconnect
- Use Realtime DB `.onDisconnect()` to auto-remove cursor
- Ensures cursors disappear when users close tab
- Backup cleanup: remove cursors older than 30 seconds

✅ Add dual-write mode for migration
- If `USE_REALTIME_DB` flag is enabled, write to Realtime DB
- If flag is disabled, write to Firestore (existing behavior)
- Always read from active source only (no dual-read)
- Log which system is being used

✅ Update CanvasView to use new cursor system
- Check feature flag on mount
- Initialize appropriate cursor composable
- Pass flag state to cursor components
- No UI changes needed

**Deliverable:**
✅ Cursor sync via Realtime DB working behind feature flag. Sub-50ms latency achieved. Smooth interpolation. No regressions.

---

## PR #3: Presence Migration to Realtime Database
**Purpose:** Move presence system to Realtime DB for faster updates

**Tasks:**

✅ Create new presence composable for Realtime DB
- Create `src/composables/usePresenceRTDB.js`
- Implement `setUserOnline()` using Realtime DB `set()`
- Implement `setUserOffline()` using Realtime DB `remove()`
- Implement `subscribeToPresence()` using Realtime DB `.on('value')`
- Store: `{ userId, userName, cursorColor, online, lastSeen, joinedAt }`

✅ Implement presence heartbeat system
- Send heartbeat every 30 seconds to update `lastSeen`
- Use `serverTimestamp()` equivalent (Realtime DB `ServerValue.TIMESTAMP`)
- Prevents false "offline" status from stale timestamps

✅ Implement automatic offline cleanup
- Use `.onDisconnect().remove()` to clean up presence on disconnect
- Mark user offline when browser closes
- Handle ungraceful disconnects (network loss)

✅ Add stale presence detection
- Client-side cleanup: Remove presence entries with `lastSeen` > 60 seconds old
- Run cleanup every 30 seconds
- Prevents "ghost" online users from accumulating

✅ Add beforeunload handler for cleanup
- Listen to `beforeunload` event
- Attempt to set user offline (best-effort, may not complete)
- Rely on `.onDisconnect()` as primary mechanism

✅ Add dual-write mode for migration
- If `USE_REALTIME_DB` flag enabled, write to Realtime DB
- If disabled, write to Firestore (existing)
- Read from active source only

✅ Update presence UI components
- No changes to `PresenceList.vue` needed (data structure same)
- Update `usePresence` calls in `CanvasView.vue` to check flag
- Ensure presence count updates in NavBar

**Deliverable:**
✅ Presence via Realtime DB working behind feature flag. Faster updates. Reliable disconnect detection. No regressions.

---

## PR #4: Sequence Number System & Operation Log
**Purpose:** Implement foundation for Operational Transform

**Tasks:**

✅ Create sequence number generator
- Create `src/utils/sequenceNumbers.js`
- Implement client-side sequence counter (starts at 0, increments per operation)
- Store in `localStorage` for persistence across refreshes
- Format: `{clientId}_{sequenceNumber}` (e.g., `user123_42`)

✅ Create operation data structure
```javascript
{
  type: 'create' | 'update' | 'delete',
  shapeId: 'rect_12345',
  userId: 'user123',
  sequenceNumber: 42,
  clientSequence: 'user123_42',
  timestamp: 1697654321000,
  delta: { x: 150, y: 200 },  // Only changed fields
  baseState: { x: 100, y: 200 }  // State before change (for rollback)
}
```

✅ Implement operation log in Realtime DB
- Create `src/composables/useOperationLog.js`
- Write operations to `/canvases/{canvasId}/operationLog/{clientSequence}`
- Use `clientSequence` as key (ensures uniqueness)
- Implement `appendOperation(operation)` function
- Implement `subscribeToOperations(callback)` function

✅ Add operation log pruning
- Keep only last 1000 operations (rolling window)
- Prune operations older than 1 hour
- Run cleanup every 5 minutes (Firebase Functions or client-side)
- Prevents unbounded growth

✅ Track pending operations locally
- Create `pendingOperations` Map in `useShapes.js`
- Store operations that haven't been acknowledged by server yet
- Key: `clientSequence`, Value: operation object
- Remove from pending when acknowledged

✅ Add operation acknowledgment system
- Server writes back acknowledgment to `/canvases/{canvasId}/acks/{clientSequence}`
- Client subscribes to acknowledgments
- On ack, remove from pending operations
- Timeout after 5 seconds (retry or show error)

✅ Update shape operations to include sequence numbers
- Modify `createShape()` to generate and attach sequence number
- Modify `updateShape()` to generate and attach sequence number
- Modify `deleteShapes()` to generate and attach sequence number
- Log all operations to operation log

**Deliverable:**
✅ Sequence number system working. Operation log storing all shape operations. Foundation for OT ready.

---

## PR #5: Differential Sync Implementation
**Purpose:** Send only changed fields, not full objects (85% bandwidth reduction)

**Tasks:**

✅ Create delta encoder
- Create `src/utils/deltaEncoding.js`
- Implement `calculateDelta(oldState, newState)` function
- Compare objects and return only changed fields
- Example: `{ x: 150 }` instead of `{ x: 150, y: 200, width: 100, height: 50, fill: "#ff0000", ... }`

✅ Create delta decoder/applier
- Implement `applyDelta(currentState, delta)` function
- Merge delta into current state
- Validate delta fields (no invalid properties)
- Return updated state

✅ Update shape update operations to use deltas
- Modify `updateShape()` in `useShapes.js`
- Calculate delta before sending to Realtime DB
- Store delta in operation log (not full object)
- Keep full state in Firestore for persistence

✅ Implement delta compression for batch operations
- Create `src/utils/batchCompression.js`
- For bulk shape creation (e.g., 500 rectangles):
  - Send base properties once
  - Send array of position pairs: `[[x1,y1], [x2,y2], ...]`
  - Reconstruct full shapes on client
- Example:
```javascript
{
  type: "createBatch",
  shapeType: "rectangle",
  baseProperties: { width: 100, height: 50, fill: "#ff0000" },
  positions: [[10,10], [120,10], [230,10], ...]  // 500 pairs
}
```

✅ Add delta validation
- Validate delta only contains valid shape properties
- Reject deltas with invalid keys
- Reject deltas with invalid value types
- Log validation errors

✅ Update Firestore writes to persist full state
- On final edit (dragend, transformend), write full shape to Firestore
- During edit (dragging), only send deltas to Realtime DB
- Firestore remains source of truth for persistence
- Realtime DB is for ephemeral rapid updates

✅ Add bandwidth tracking
- Track bytes sent before delta encoding
- Track bytes sent after delta encoding
- Log reduction percentage
- Display in performance dashboard

**Deliverable:**
✅ Delta sync working. 85% bandwidth reduction achieved. Batch compression for bulk operations. No loss of functionality.

---

## PR #6: Basic Operational Transform (Position-Only)
**Purpose:** Implement OT for position updates to merge concurrent edits

**Tasks:**

✅ Create OT transform functions
- Create `src/utils/operationalTransform.js`
- Implement `transformPosition(opA, opB)` for position conflicts
  - Both users move shape → Add both deltas (additive)
  - Result: Both movements applied
- Implement `transformPriority(opA, opB)` for operation prioritization
  - Delete > Update > Create
  - If delete conflicts with update, delete wins

✅ Implement conflict detection
- Create `src/composables/useConflictDetection.js`
- Detect when two operations target same shape
- Check if operations are concurrent (sequence numbers overlap)
- Identify operation types and determine if transform needed

✅ Implement OT resolution flow
```javascript
function receiveRemoteOperation(remoteOp) {
  // 1. Check if we have pending local operations for same shape
  const localOps = getPendingOps(remoteOp.shapeId)
  
  if (localOps.length === 0) {
    // No conflict, apply directly
    applyOperation(remoteOp)
    return
  }
  
  // 2. Transform remote op against local pending ops
  let transformedOp = remoteOp
  for (const localOp of localOps) {
    transformedOp = transform(transformedOp, localOp)
  }
  
  // 3. Apply transformed operation
  applyOperation(transformedOp)
  
  // 4. Transform local pending ops against remote op
  for (const localOp of localOps) {
    const transformed = transform(localOp, remoteOp)
    updatePendingOp(localOp.id, transformed)
  }
}
```

✅ Add OT for position updates only (start simple)
- Transform `{ x, y }` deltas
- Additive transformation: `newDelta = deltaA + deltaB`
- Both users' movements preserved
- Example:
  - User A: move right 100px → `{x: 150}`
  - User B: move down 100px → `{y: 200}`
  - Result: Position (150, 200) - both applied

✅ Implement OT tracking and logging
- Log when transform is applied
- Track transform success rate
- Display transform count in performance dashboard
- Log conflicts to console for debugging

✅ Update shape operations to apply OT
- Modify real-time listener in `useShapes.js`
- Check for pending operations when receiving remote update
- Apply OT if needed
- Fall back to last-write-wins if transform not applicable

✅ Add OT bypass for non-transformable operations
- Style changes use last-write-wins (can't merge colors)
- Text content uses last-write-wins (complex text OT is v9+)
- Delete always wins (can't merge with delete)

**Deliverable:**
✅ Basic OT working for position updates. Concurrent edits merge instead of overwriting. Position conflicts resolved gracefully.

---

## PR #7: Client-Side Prediction & Server Reconciliation
**Purpose:** Zero perceived latency with optimistic updates and rollback

**Tasks:**

✅ Implement optimistic local updates
- Create `src/composables/usePrediction.js`
- On shape update, apply to local state immediately (0ms perceived)
- Mark update as "prediction" with unique prediction ID
- Don't wait for server confirmation to update UI

✅ Implement prediction tracking
```javascript
{
  predictionId: 'pred_12345',
  operation: { type: 'update', shapeId: 'rect_1', delta: { x: 150 } },
  timestamp: Date.now(),
  confirmed: false
}
```
- Store predictions in Map
- Track up to 10 most recent predictions per shape
- Clean up after confirmation or timeout (5 seconds)

✅ Implement server reconciliation
- Subscribe to operation acknowledgments from server
- When server confirms, mark prediction as confirmed
- If server state matches prediction, remove from pending
- If server state differs, apply rollback

✅ Implement rollback mechanism
```javascript
function rollbackPrediction(predictionId) {
  const prediction = predictions.get(predictionId)
  
  // 1. Get current local state
  const currentState = getShape(prediction.shapeId)
  
  // 2. Revert prediction delta
  const revertedState = applyDelta(currentState, invertDelta(prediction.delta))
  
  // 3. Apply server's authoritative state
  const serverState = getServerState(prediction.shapeId)
  updateShape(prediction.shapeId, serverState)
  
  // 4. Log rollback for debugging
  console.warn('Rolled back prediction:', predictionId)
}
```

✅ Add smooth rollback animations
- If rollback needed, animate from predicted state to server state
- Use 150ms CSS transition
- Prevents jarring jumps
- User sees smooth correction

✅ Track prediction accuracy
- Count correct predictions vs. rollbacks
- Target: >95% accuracy
- Display in performance dashboard
- Log when predictions fail (helps debug)

✅ Add visual indicators for unconfirmed operations
- Optional: Add subtle indicator (small dot/spinner) on shapes with pending operations
- Disabled by default (most predictions confirm <100ms)
- Can enable for debugging

✅ Handle prediction timeouts
- If no confirmation after 5 seconds, consider operation failed
- Show error notification to user
- Attempt to resync from server
- Log timeout for monitoring

**Deliverable:**
✅ Client-side prediction working. Zero perceived latency for local user. Smooth rollback on conflicts. 95%+ prediction accuracy.

---

## PR #8: Extended OT for Size, Rotation, Style
**Purpose:** Apply OT to all shape operations, not just position

**Tasks:**

✅ Implement size transform function
```javascript
function transformSize(opA, opB) {
  // Size changes are multiplicative (scale factors)
  if (opA.delta.width && opB.delta.width) {
    const scaleA = opA.delta.width / opA.baseState.width
    const scaleB = opB.delta.width / opB.baseState.width
    return {
      ...opA,
      delta: {
        width: opA.baseState.width * scaleA * scaleB
      }
    }
  }
  return opA  // No conflict
}
```
- Apply to `width`, `height`, `radius` changes
- Multiplicative transform (combine scale factors)
- Both users' resize operations applied

✅ Implement rotation transform function
```javascript
function transformRotation(opA, opB) {
  // Rotations are additive (degrees)
  if (opA.delta.rotation !== undefined && opB.delta.rotation !== undefined) {
    return {
      ...opA,
      delta: {
        rotation: (opA.delta.rotation + opB.delta.rotation) % 360
      }
    }
  }
  return opA
}
```
- Additive for rotation deltas
- Wrap to 0-360 degrees
- Both rotations applied

✅ Implement style transform function (last-write-wins)
```javascript
function transformStyle(opA, opB) {
  // Styles cannot be merged (colors, strokes, etc.)
  // Use last-write-wins based on timestamp
  if (opA.timestamp > opB.timestamp) {
    return opA  // A is newer, keep A
  } else {
    return opB  // B is newer, use B
  }
}
```
- Used for: `fill`, `stroke`, `strokeWidth`, `opacity`, etc.
- Cannot merge style changes (no meaningful way to combine colors)
- Server timestamp wins

✅ Implement composite transform
- Detect which properties changed in operation
- Apply appropriate transform for each property type
- Example: Position uses additive, size uses multiplicative, style uses last-write-wins
- Handle operations that change multiple properties

✅ Add transform function registry
```javascript
const transformFunctions = {
  'position': transformPosition,    // x, y
  'size': transformSize,            // width, height, radius
  'rotation': transformRotation,    // rotation
  'style': transformStyle,          // fill, stroke, etc.
  'default': lastWriteWins          // fallback
}
```
- Automatically select correct transform based on delta keys

✅ Implement delete priority
- Delete operations always win
- If delete conflicts with update, discard update
- If delete conflicts with create, delete wins (rare edge case)
- Log delete conflicts for debugging

✅ Add OT edge case handlers
- Concurrent create at same position → Offset second shape by 20px
- Delete vs. update → Delete wins, discard update
- Create vs. create with same ID → Use timestamp to determine winner
- Rotation wrap-around (359° + 5° = 4°, not 364°)

✅ Update real-time sync to use extended OT
- Apply appropriate transform based on operation type
- Handle composite operations (multiple properties changed)
- Fall back to last-write-wins if no transform available

**Deliverable:**
✅ Full OT system for position, size, rotation. Last-write-wins for styles. Delete operations prioritized. Complex concurrent edits merge correctly.

---

## PR #9: Security Rules & Data Validation
**Purpose:** Lock down Realtime DB with proper security and validation

**Tasks:**

✅ Implement Realtime DB security rules
```javascript
{
  "rules": {
    "canvases": {
      "$canvasId": {
        "cursors": {
          // Read: Anyone with canvas access
          ".read": "auth != null && root.child('canvases').child($canvasId).child('users').child(auth.uid).exists()",
          "$userId": {
            // Write: Only own cursor
            ".write": "auth != null && auth.uid == $userId"
          }
        },
        "presence": {
          ".read": "auth != null",
          "$userId": {
            ".write": "auth != null && auth.uid == $userId"
          }
        },
        "operationLog": {
          ".read": "auth != null",
          "$operationId": {
            // Write: Only new operations (append-only)
            ".write": "auth != null && !data.exists() && newData.child('userId').val() == auth.uid"
          }
        },
        "ephemeralShapes": {
          ".read": "auth != null",
          "$shapeId": {
            // Write: Only if user is editor or shape creator
            ".write": "auth != null && (!data.exists() || data.child('lastModifiedBy').val() == auth.uid)"
          }
        }
      }
    }
  }
}
```

✅ Add cursor position validation
```javascript
"cursors": {
  "$userId": {
    ".validate": "
      newData.hasChildren(['x', 'y', 'userName', 'timestamp']) &&
      newData.child('x').isNumber() &&
      newData.child('y').isNumber() &&
      newData.child('x').val() >= 0 &&
      newData.child('x').val() <= 10000 &&
      newData.child('y').val() >= 0 &&
      newData.child('y').val() <= 10000 &&
      newData.child('timestamp').val() <= now
    "
  }
}
```
- Validate required fields exist
- Validate data types
- Validate coordinate bounds (0-10000)
- Validate timestamp is not in future

✅ Add operation validation
```javascript
"operationLog": {
  "$operationId": {
    ".validate": "
      newData.hasChildren(['type', 'shapeId', 'userId', 'timestamp', 'sequenceNumber']) &&
      (newData.child('type').val() == 'create' ||
       newData.child('type').val() == 'update' ||
       newData.child('type').val() == 'delete') &&
      newData.child('sequenceNumber').isNumber() &&
      newData.child('timestamp').val() <= now &&
      newData.child('userId').val() == auth.uid
    "
  }
}
```
- Validate operation type
- Validate required fields
- Validate user ID matches auth
- Validate timestamp

✅ Add presence validation
```javascript
"presence": {
  "$userId": {
    ".validate": "
      newData.hasChildren(['userId', 'userName', 'online', 'lastSeen']) &&
      newData.child('userId').val() == $userId &&
      newData.child('online').isBoolean() &&
      newData.child('lastSeen').isNumber()
    "
  }
}
```

✅ Add canvas access control
- Read canvas permissions from Firestore (`/canvases/{canvasId}/users/{userId}`)
- Only allow operations if user has access to canvas
- Editor role can edit shapes
- Viewer role can only read (no writes)

✅ Test security rules with Firebase emulator
- Set up Firebase emulator for Realtime DB
- Write tests for each security rule
- Test unauthorized access is rejected
- Test authorized access is allowed
- Test validation rules reject invalid data

✅ Add rate limiting (abuse prevention)
- Limit cursor updates to 100/second per user
- Limit operations to 50/second per user
- Use Firebase security rules or Cloud Functions
- Return error if rate exceeded

✅ Add operation size limits
- Limit operation delta to 1KB max
- Limit batch operations to 500 shapes max
- Reject oversized operations
- Log rejected operations for monitoring

**Deliverable:**
✅ Realtime DB secured with proper rules. Data validation prevents invalid writes. Rate limiting prevents abuse. All access properly authenticated and authorized.

---

## PR #10: Performance Optimization & Monitoring
**Purpose:** Achieve and validate all performance targets

**Tasks:**

✅ Implement incremental canvas loading
- Load viewport shapes first (priority)
- Load remaining shapes in background (low priority)
- Display shapes as they load (progressive rendering)
- Target: Viewport shapes visible in <500ms

✅ Add connection pooling
- Single WebSocket connection for all Realtime DB operations
- Multiplex cursor, presence, operations over one connection
- Reduce connection overhead
- Measure connection count (should be 1)

✅ Implement adaptive quality settings
```javascript
class AdaptivePerformance {
  degradeQuality() {
    if (fps < 30) {
      // Reduce cursor update rate
      cursorThrottle = 50ms  // Was 16ms
      // Reduce operation log polling
      // Simplify shape rendering (no shadows)
      qualityLevel = 'low'
    }
  }
  
  improveQuality() {
    if (fps > 55) {
      cursorThrottle = 16ms
      qualityLevel = 'high'
    }
  }
}
```
- Monitor FPS continuously
- Degrade quality if FPS drops below 30
- Improve quality when FPS stabilizes above 55
- Log quality changes

✅ Optimize operation log processing
- Batch process operations (10 at a time)
- Process high-priority operations first (creates, deletes)
- Defer low-priority operations (interim updates)
- Target: Process 50 operations/second

✅ Add operation deduplication
- Check if operation already processed (by sequence number)
- Skip duplicate operations (prevent double-processing)
- Log duplicates for debugging
- Prevent state corruption from duplicate ops

✅ Implement lazy shape rendering
- Only render shapes in viewport + 20% margin
- Use existing viewport culling from v7
- Extend to work with Realtime DB ephemeral shapes
- Target: Render only 100-200 shapes even if 2000 total

✅ Add performance dashboard enhancements
- Display Realtime DB metrics:
  - WebSocket connection state
  - Operations per second
  - Bandwidth usage (bytes sent/received)
  - Operation log size
  - Pending operations count
- Display OT metrics:
  - Transform operations count
  - Conflicts detected and resolved
  - Rollback count
  - Prediction accuracy
- Display latency metrics:
  - Cursor sync latency (p50, p95, p99)
  - Object sync latency (p50, p95, p99)
  - Operation log latency

✅ Add performance alerts
- Alert if object sync >200ms (2x target)
- Alert if cursor sync >100ms (2x target)
- Alert if FPS <30 for >5 seconds
- Alert if prediction accuracy <90%
- Display alerts in UI (toast notifications)

✅ Optimize Firestore background persistence
- Batch Firestore writes (10 shapes at a time)
- Debounce Firestore writes (500ms after last edit)
- Only persist on final edit (dragend, not during drag)
- Reduce Firestore writes by 75%

**Deliverable:**
✅ All performance targets met and validated. Dashboard shows real-time metrics. Adaptive quality prevents degradation. System handles 2000 shapes and 20 concurrent users.

---

## PR #11: Migration System & Rollout Strategy
**Purpose:** Safe migration from Firestore-only to hybrid architecture

**Tasks:**

✅ Implement migration status tracking
- Create `migrationStatus` document in Firestore
```javascript
{
  status: 'not_started' | 'in_progress' | 'complete',
  phase: 'cursors' | 'presence' | 'operations' | 'all',
  startedAt: timestamp,
  completedAt: timestamp,
  rolloutPercentage: 0-100,
  errors: []
}
```

✅ Create migration validation script
- Script to compare Firestore vs Realtime DB data
- Check cursor parity (both systems have same data)
- Check presence parity
- Report discrepancies
- Run before each rollout phase

✅ Implement gradual rollout system
- Use Firebase Remote Config for rollout percentage
- 10% of users → 50% → 100%
- Monitor metrics at each phase
- Ability to roll back immediately

✅ Add rollback capability
- Feature flag instantly switches back to Firestore
- No data loss (dual-write maintained during migration)
- Users reconnect within 30 seconds
- Monitor metrics after rollback

✅ Create migration monitoring dashboard
- Display rollout status (current percentage)
- Display per-phase metrics (cursors, presence, operations)
- Compare Firestore vs Realtime DB metrics side-by-side
- Alert on anomalies (latency spike, errors)

✅ Implement automated rollback triggers
- Automatically roll back if:
  - Error rate >5%
  - Latency >2x baseline
  - User complaints >10
- Send alert to team
- Log rollback reason

✅ Add user-facing migration notice
- Optional: "We're improving performance - you may see faster sync"
- Dismiss button
- Only show during migration phases
- Link to changelog

✅ Create post-migration cleanup script
- After 1 week at 100% rollout with no issues:
  - Remove dual-write code
  - Delete old Firestore cursor/presence collections
  - Update documentation
  - Remove feature flags
  - Simplify codebase

**Deliverable:**
✅ Safe migration system with gradual rollout. Instant rollback capability. Monitoring and validation at each phase. Zero downtime migration.

---

## PR #12: Documentation & Deployment
**Purpose:** Document v8 architecture and deploy to production

**Tasks:**

✅ Create REALTIME_DB_SCHEMA.md
- Document Realtime DB structure
- Explain cursors, presence, operation log, ephemeral shapes
- Provide examples of each data structure
- Explain design decisions (why Realtime DB vs Firestore)

✅ Create OPERATIONAL_TRANSFORM.md
- Explain what OT is and why it's needed
- Document transform functions for each operation type
- Provide examples of conflict scenarios and resolutions
- Explain OT limitations (what can't be merged)

✅ Create CONFLICT_RESOLUTION_STRATEGY.md
- Document the conflict resolution approach
- Explain OT for position, size, rotation
- Explain last-write-wins for styles, text
- Explain delete priority
- Provide decision tree for conflict resolution

✅ Create PERFORMANCE_OPTIMIZATION.md
- Document all performance optimizations
- Explain delta sync and bandwidth reduction
- Explain client-side prediction
- Explain cursor interpolation
- Provide before/after metrics

✅ Create MIGRATION_GUIDE.md
- Document migration from v7 to v8
- Explain gradual rollout strategy
- Explain dual-write period
- Explain rollback procedures
- Provide migration checklist

✅ Update README.md
- Add v8 features section
- Add performance benchmarks (with charts)
- Add architecture diagram (Realtime DB + Firestore)
- Update tech stack (add Realtime DB)

✅ Create architecture diagram
- Visual diagram of hybrid architecture
- Show data flow: Client → Realtime DB → Clients
- Show data persistence: Realtime DB → Firestore
- Show OT flow: Operation → Transform → Apply
- Use draw.io or similar

✅ Add JSDoc comments to new code
- Comment all OT functions
- Comment delta encoding functions
- Comment sequence number functions
- Comment prediction/reconciliation logic

✅ Create CHANGELOG_v8.md
- List all new features
- List all performance improvements
- List breaking changes (if any)
- Provide migration instructions

✅ Deploy to production
- Final production testing (all tests pass)
- Update Firebase Remote Config for 100% rollout
- Monitor for 24 hours (no rollback)
- Announce v8 launch to users

✅ Create v8 launch blog post
- Explain new features (from user perspective)
- Show performance benchmarks
- Include GIFs of smooth cursor sync, concurrent editing
- Announce on social media

**Deliverable:**
✅ Complete documentation for v8. Architecture fully explained. Deployed to production. v8 COMPLETE.

---

## v8 Completion Checklist

### Performance Targets (MUST MEET)

- [ ] ✅ Object sync <100ms (p95) - Validated in PR #12
- [ ] ✅ Cursor sync <50ms (p95) - Validated in PR #12
- [ ] ✅ Zero visible lag during rapid edits - Validated in PR #12
- [ ] ✅ Consistent state on concurrent edits (OT working) - Validated in PR #12
- [ ] ✅ No ghost objects or duplicates - Validated in PR #12
- [ ] ✅ Handle 10+ changes/sec without corruption - Validated in PR #12
- [ ] ✅ Exact state recovery on refresh - Validated in PR #12
- [ ] ✅ Full canvas persistence when all disconnect - Validated in PR #12
- [ ] ✅ 60 FPS with 2000+ shapes - Validated in PR #10

### Core Features

- [ ] ✅ Firebase Realtime Database integrated - PR #1
- [ ] ✅ Cursor sync via Realtime DB (<50ms) - PR #2
- [ ] ✅ Presence via Realtime DB - PR #3
- [ ] ✅ Sequence number system - PR #4
- [ ] ✅ Operation log - PR #4
- [ ] ✅ Differential sync (85% bandwidth reduction) - PR #5
- [ ] ✅ Basic OT (position-only) - PR #6
- [ ] ✅ Client-side prediction - PR #7
- [ ] ✅ Extended OT (size, rotation, style) - PR #8
- [ ] ✅ Security rules - PR #9
- [ ] ✅ Performance optimizations - PR #10
- [ ] ✅ Migration system - PR #11
- [ ] ✅ Comprehensive testing - PR #12
- [ ] ✅ Documentation - PR #13

### Testing

- [ ] ✅ All performance tests pass
- [ ] ✅ All OT tests pass
- [ ] ✅ All security tests pass
- [ ] ✅ No regressions from v7
- [ ] ✅ Load tested with 20+ concurrent users
- [ ] ✅ Stress tested with 2000+ shapes

### Documentation

- [ ] ✅ Realtime DB schema documented
- [ ] ✅ OT system explained
- [ ] ✅ Conflict resolution strategy documented
- [ ] ✅ Performance optimizations documented
- [ ] ✅ Migration guide complete
- [ ] ✅ Architecture diagram created

### Deployment

- [ ] ✅ Deployed to production
- [ ] ✅ 100% rollout complete
- [ ] ✅ Monitoring dashboard active
- [ ] ✅ No critical issues for 7 days
- [ ] ✅ Post-migration cleanup complete

---

## Estimated Timeline

**Total Duration:** 9-10 weeks (assuming 1 developer full-time)

**Phase 1 (Week 1-2):** PR #1-3 - Setup and cursor/presence migration
**Phase 2 (Week 2-3):** PR #4-5 - Sequence numbers and differential sync
**Phase 3 (Week 3-5):** PR #6-8 - Operational Transform implementation
**Phase 4 (Week 5-6):** PR #9-10 - Security and performance optimization
**Phase 5 (Week 7-8):** PR #11-12 - Migration and testing
**Phase 6 (Week 8-9):** PR #13 - Documentation and deployment
**Buffer (Week 10):** Bug fixes, polish, production monitoring

---

## Success Metrics

After v8 completion, the following metrics must be achieved:

**Latency (measured over 1000 operations):**
- Cursor sync p50: <30ms
- Cursor sync p95: <50ms
- Object sync p50: <60ms
- Object sync p95: <100ms

**Throughput:**
- Handle 50 operations/sec from single user
- Handle 10+ operations/sec from multiple concurrent users
- Generate and sync 500 rectangles in <5 seconds

**Consistency:**
- 100% state consistency across clients after sync
- 0% ghost objects or duplicates in testing
- >95% prediction accuracy (fewer than 5 rollbacks per 100 operations)

**Reliability:**
- 0 data loss scenarios in testing
- 100% state recovery on refresh
- 100% canvas persistence when all users disconnect

**Performance:**
- 60 FPS with 2000 shapes loaded
- <2 second canvas load time (2000 shapes)
- <500MB memory usage with 2000 shapes

**Cost:**
- 66% cost reduction vs v7 (from $12k/month to $4k/month for 1000 users)
- Bandwidth usage: 85% reduction via differential sync

---

## Rollback Plan

If critical issues arise during or after deployment:

1. **Immediate Rollback (<5 minutes):**
   - Flip feature flag to disable Realtime DB
   - All clients revert to Firestore within 30 seconds (on next operation)
   - No data loss (dual-write maintained during migration)

2. **Investigation (<1 hour):**
   - Review error logs
   - Identify root cause
   - Determine if fixable quickly

3. **Decision (<2 hours):**
   - If fixable in <4 hours: Fix and redeploy
   - If not fixable quickly: Pause v8 rollout, fix offline
   - Continue v7 operation until fix ready

4. **Redeployment:**
   - Fix issue
   - Test thoroughly in staging
   - Retry gradual rollout (10% → 50% → 100%)
   - Monitor closely

---

**Document Version:** 1.0  
**Last Updated:** 2025-10-17  
**Status:** Ready for Implementation  
**Next Step:** Begin PR #1 - Firebase Realtime Database Setup

