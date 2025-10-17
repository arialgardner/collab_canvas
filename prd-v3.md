# CollabCanvas v3 PRD
**Product Requirements Document - Version 3.0**

**Document Version:** 3.0  
**Last Updated:** October 15, 2025  
**Status:** Planning Phase

---

## Executive Summary

CollabCanvas v3 focuses on delivering production-grade real-time synchronization, network resilience, and conflict management while retaining all existing functionality from Phase 2. This upgrade transforms the collaborative canvas from a functional prototype into a bulletproof, enterprise-ready platform.

**Foundation:** Builds on Phase 2 (full shape system, transformations, selection, layer management, permissions)

**Core Focus:** Sub-100ms sync, zero visible lag, bulletproof conflict resolution, network resilience

**Key Principle:** Enhance performance and reliability without changing existing features or user experience

---

## Problem Statement

The current Phase 2 implementation provides solid collaborative functionality but lacks the performance guarantees and resilience needed for production use:

- **Sync latency unpredictable:** No guaranteed sub-100ms object sync or sub-50ms cursor sync
- **Network interruptions disruptive:** Lost work during disconnects, unclear connection status
- **Conflict resolution basic:** Last-write-wins works but provides no visual feedback on who edited what
- **Rapid edits cause issues:** Multiple rapid changes (10+ per second) can corrupt state or create race conditions
- **Reconnection incomplete:** Users may not see complete state after long disconnects or refreshes

---

## Success Criteria

### Performance Requirements (Hard Gates)

**Object Synchronization:**
- ✅ Sub-100ms object sync for all operations (create, move, resize, rotate, delete)
- ✅ Zero visible lag during rapid multi-user edits
- ✅ Rapid edits (10+ changes/sec) don't corrupt state
- ✅ Measured and logged sync latency with performance dashboard

**Cursor Synchronization:**
- ✅ Sub-50ms cursor sync between users
- ✅ Smooth cursor interpolation (no jittery movement)
- ✅ Cursor position accurate within 5px

**User Experience:**
- ✅ No "ghost" objects or duplicates
- ✅ Clear visual feedback on who last edited each object
- ✅ All users see consistent final state after simultaneous edits

### Resilience Requirements (Hard Gates)

**State Persistence:**
- ✅ User refreshes mid-edit → returns to exact state
- ✅ All users disconnect → canvas persists fully
- ✅ Canvas state never corrupts or loses data

**Network Resilience:**
- ✅ Network drop (30s+) → auto-reconnects with complete state
- ✅ Operations during disconnect queue and sync on reconnect
- ✅ Clear UI indicator for connection status (connected, syncing, offline, error)
- ✅ Automatic retry with exponential backoff

**Conflict Management:**
- ✅ Two users edit same object simultaneously → both see consistent final state
- ✅ Documented and enforced conflict resolution strategy (last-write-wins with visual feedback)
- ✅ Concurrent text editing handled gracefully with lock system

---

## Key Features & Requirements

### 1. Enhanced Real-Time Synchronization Engine

#### 1.1 Object Sync Performance (<100ms)

**Current State:**
- Optimistic updates with Firestore listeners
- Server timestamp-based conflict resolution
- No latency guarantees

**v3 Requirements:**
- **Sub-100ms sync guarantee:** Measure time from local action to remote render
- **Performance monitoring:** Built-in latency tracking for all operations
- **Optimized Firestore operations:**
  - Batch writes where possible
  - Efficient listeners with minimal re-renders
  - Delta updates (only changed properties)
- **Operation priority system:**
  - High priority: Final positions on drag end, shape creation/deletion
  - Low priority: Interim drag updates, cursor positions
- **Performance dashboard:** Real-time display of sync metrics for debugging

#### 1.2 Cursor Sync Performance (<50ms)

**Current State:**
- 50ms throttled cursor updates via Firestore
- Basic cursor rendering

**v3 Requirements:**
- **Sub-50ms cursor sync:** Optimize cursor update path
- **Cursor interpolation:** Smooth movement between updates (linear interpolation)
- **Efficient cursor updates:**
  - Separate cursor collection for faster reads
  - Minimal payload (only userId, x, y, timestamp)
  - Aggressive throttling during idle (reduce to 100ms if no movement change >10px)
- **Cursor prediction:** Client-side prediction for local cursor smoothness

#### 1.3 Rapid Edit Handling

**Current State:**
- Throttled updates during drag operations
- Potential for race conditions with rapid edits

**v3 Requirements:**
- **High-frequency edit support:** Handle 10+ changes per second per user
- **Edit batching:** Group rapid changes into batches (e.g., 100ms windows)
- **Sequence numbers:** Add sequence numbers to all operations to detect out-of-order delivery
- **Operation deduplication:** Prevent duplicate operations from being applied
- **State reconciliation:** Periodic state reconciliation to catch any inconsistencies

---

### 2. Network Resilience & Offline Operations

#### 2.1 Connection State Management

**Current State:**
- Basic online/offline detection
- No clear connection status indicator

**v3 Requirements:**

**Connection States:**
- `CONNECTED` - Normal operation, all features available
- `SYNCING` - Processing queued operations after reconnect
- `OFFLINE` - No connection, operations queued locally
- `ERROR` - Connection issue, attempting to reconnect

**Visual Indicators:**
- **Status indicator component:** Always visible, non-intrusive (top bar)
- **State-specific icons and colors:**
  - Connected: Green dot, "Connected"
  - Syncing: Blue spinner, "Syncing X operations..."
  - Offline: Yellow dot, "Offline (changes saved locally)"
  - Error: Red dot, "Connection error - retrying..."
- **Tooltip details:** Hover for connection details (latency, last sync time)

#### 2.2 Operation Queue System

**Current State:**
- No offline operation queuing
- Work lost during disconnects

**v3 Requirements:**

**Operation Queue:**
- **Local queue structure:** IndexedDB-based operation queue
- **Queue all operations during offline:**
  - Shape creation, modification, deletion
  - Property changes
  - Layer operations
  - Final positions (prioritize over interim updates)
- **Queue metadata:**
  - Operation ID (unique)
  - Timestamp
  - Operation type
  - Payload
  - Retry count
  - User ID

**Queue Processing:**
- **Automatic sync on reconnect:** Process queue in order
- **Conflict detection during sync:** Check if shapes still exist, haven't been modified by others
- **Conflict resolution:** Apply last-write-wins with server timestamps
- **User notification:** Show progress ("Syncing 5 of 12 operations...")
- **Error handling:** Retry failed operations up to 3 times, then notify user

**Queue Limits:**
- Maximum 1000 operations queued
- Queue size warning at 500 operations
- Oldest operations dropped if limit exceeded (with user notification)

#### 2.3 Automatic Reconnection

**Current State:**
- Basic reconnection via Firestore
- No exponential backoff

**v3 Requirements:**

**Reconnection Strategy:**
- **Exponential backoff:** 1s, 2s, 4s, 8s, 16s, 32s (max)
- **Automatic retry:** Continue retrying indefinitely until connected
- **Connection health checks:** Ping server to verify connection before processing queue
- **Progressive reconnection:**
  1. Establish Firestore connection
  2. Verify authentication still valid
  3. Load current canvas state
  4. Reconcile with local state
  5. Process operation queue
  6. Resume normal operation

**User Notifications:**
- "Reconnecting..." during retry attempts
- "Connected - syncing your changes..." when processing queue
- "All changes synced" when complete
- "Connection failed after X retries - trying again in Xs" for long outages

---

### 3. Enhanced Conflict Resolution & Visual Feedback

#### 3.1 Conflict Resolution Strategy

**Current State:**
- Last-write-wins with server timestamps
- No user feedback on conflicts

**v3 Requirements:**

**Strategy: Last-Write-Wins with Enhanced Feedback**
- **Maintain server timestamp authority:** Firestore `serverTimestamp()` remains source of truth
- **Local timestamp tracking:** Track local edit timestamp for each shape
- **Conflict detection:** Compare timestamps when receiving remote updates
- **Resolution:** Always accept server's version (last write wins)

**Why Last-Write-Wins:**
- Simple and predictable behavior
- Firestore provides atomic timestamps
- Works well for shape-based collaboration (vs. document editing)
- Acceptable for creative/design tools where "undo" is available
- CRDT/OT unnecessary complexity for shape manipulation

**Documented Limitations:**
- User with slower connection may see their changes overwritten
- No automatic merging of concurrent edits to same object
- Text editing uses lock system to prevent concurrent conflicts

#### 3.2 Visual Feedback System

**Current State:**
- No indication of who edited what
- No feedback when local changes are overwritten

**v3 Requirements:**

**Real-Time Edit Feedback:**
- **Temporary edit highlight:** When shape is modified by another user
  - 2-second highlight border (user's cursor color)
  - Pulsing animation (0.3s)
  - Fades out gradually
- **Override notification:** When local changes are overwritten
  - Brief toast: "[User Name] also edited this shape"
  - Shape flashes briefly in their cursor color
  - Only show if time difference < 2 seconds (actual conflict)

**Last Editor Indicator:**
- **Properties panel display:** When shape selected
  - "Last edited by [User Name]"
  - Timestamp: "2 minutes ago" (relative time)
  - Small avatar with user's cursor color
- **Hover tooltip:** On any shape (without selection)
  - Subtle icon in corner on hover
  - Tooltip: "[User Name] edited 5m ago"

**Multi-User Activity Indicators:**
- **Active editing highlight:** Shape being dragged/resized by another user
  - Continuous subtle border in their cursor color
  - Update in real-time during their drag operation
  - Remove when they release
- **Shape locking (text only):** Visual lock indicator continues from Phase 2
  - "[User Name] is editing this text"
  - Lock icon overlay

---

### 4. State Reconciliation & Recovery

#### 4.1 State Reconciliation

**Current State:**
- Firestore listeners maintain state
- No active reconciliation

**v3 Requirements:**

**Periodic Reconciliation:**
- **Background sync check:** Every 60 seconds
- **Reconciliation process:**
  1. Fetch full canvas state from Firestore
  2. Compare with local state (shape IDs, timestamps)
  3. Detect discrepancies:
     - Shapes in Firestore but not local → Add to local
     - Shapes in local but not Firestore → Remove from local
     - Timestamp mismatches → Update with newer version
  4. Log discrepancies for debugging
  5. Silent reconciliation (no user notification unless significant)

**Significant Discrepancies:**
- Definition: 5+ missing shapes or 10+ timestamp mismatches
- User notification: "Canvas synchronized - X shapes updated"
- Auto-save trigger: Force save after reconciliation

**Reconciliation Triggers:**
- Every 60 seconds (background)
- After reconnection (before processing queue)
- On tab focus (return to window)
- Manual trigger: "Sync Now" button in connection status menu

#### 4.2 Crash Recovery

**Current State:**
- Basic localStorage backup every 30 seconds (Phase 2)
- Simple restore prompt

**v3 Requirements:**

**Enhanced Auto-Save:**
- **Save frequency:** Every 10 seconds (reduced from 30s)
- **Save triggers:**
  - Periodic timer (10s)
  - After any create/delete operation
  - Before browser unload
- **Save data:**
  - All shapes with current state
  - Operation queue
  - Canvas metadata (zoom, pan)
  - User selection state

**Recovery Flow:**
1. **Detect recovery situation:** On page load, check localStorage timestamp
2. **Recovery scenarios:**
   - Timestamp < 5 minutes old → Offer recovery
   - Timestamp > 5 minutes old → Discard (likely stale)
3. **Recovery modal:**
   - "Unsaved changes detected from [time ago]"
   - "Recover X shapes" button
   - "Discard" button
   - Preview thumbnail if possible
4. **Recovery process:**
   - Load localStorage data
   - Fetch current Firestore state
   - Merge: Keep shapes with newer timestamps
   - Apply merged state
   - Process any queued operations
   - Clear localStorage backup

**Collision Handling:**
- If shape exists in both local and Firestore with different timestamps:
  - Keep version with newer timestamp
  - Log collision for debugging
- If shape only in localStorage:
  - Re-create in Firestore with current user as creator
  - Update lastModified to now

---

### 5. Performance Monitoring & Optimization

#### 5.1 Performance Metrics Dashboard

**Current State:**
- Basic FPS counter (Phase 2)
- Console logging

**v3 Requirements:**

**Built-In Performance Dashboard:**
- **Toggle:** Shift+P keyboard shortcut
- **Display location:** Overlay panel, top-right corner
- **Metrics displayed:**
  - Current FPS (rolling 1s average)
  - Object sync latency (average, min, max over last 10 operations)
  - Cursor sync latency (average, min, max over last 100 updates)
  - Active Firestore listeners count
  - Operation queue length
  - Shapes in memory vs. rendered
  - Network round-trip time (estimated)
  - Last reconciliation time

**Latency Measurement:**
- **Object sync:** Timestamp on create/update → receive confirmation from Firestore → see on another client
- **Cursor sync:** Timestamp on position update → receive on another client
- **Color coding:**
  - Green: Within target (<100ms objects, <50ms cursor)
  - Yellow: Above target but acceptable (<200ms objects, <100ms cursor)
  - Red: Unacceptable (>200ms objects, >100ms cursor)

**Performance Alerts:**
- Console warnings when targets missed
- User notification if consistently slow (>5 warnings in 1 minute)

#### 5.2 Advanced Performance Optimizations

**Current State:**
- Viewport culling (Phase 2)
- Basic throttling

**v3 Requirements:**

**Firestore Optimization:**
- **Connection pooling:** Reuse connections efficiently
- **Listener optimization:**
  - Single listener per collection (not per shape)
  - Efficient change detection
  - Minimize listener re-initialization
- **Write batching:**
  - Batch related operations (e.g., multi-select move)
  - Commit batches atomically
  - Reduce total write operations

**Rendering Optimization:**
- **Smart viewport culling:**
  - 500px margin around viewport
  - Update culling on pan/zoom end (not during)
  - Separate culling for cursors (smaller margin)
- **Layer optimization:**
  - Shapes layer (main canvas content)
  - Cursors layer (FastLayer for frequent updates)
  - UI layer (selection boxes, handles)
- **Render throttling:**
  - Batch Konva updates with `batchDraw()`
  - Debounce rapid property changes (e.g., typing in properties panel)
  - Skip render frames if behind (>16ms)

**Memory Management:**
- **Shape data caching:** Keep all shapes in memory (metadata only) for quick access
- **Render object pooling:** Reuse Konva objects when possible
- **Cleanup on unmount:** Remove all listeners, clear maps
- **Periodic GC triggers:** Force garbage collection on major state changes (optional)

---

### 6. Enhanced Connection Status & User Feedback

#### 6.1 Connection Status Indicator

**Location:** Top navigation bar, right side (next to user info)

**Visual Design:**
- **Compact mode (default):** Small colored dot + text
- **Expanded mode (on click):** Dropdown with details

**States:**

**Connected (Green):**
- Icon: Green dot
- Text: "Connected"
- Tooltip: "Real-time sync active • Ping: Xms"
- Expanded: Last sync time, operation count, sync latency

**Syncing (Blue):**
- Icon: Blue spinner
- Text: "Syncing..."
- Tooltip: "Processing X operations"
- Expanded: Progress bar, operation details, estimated time remaining

**Offline (Yellow):**
- Icon: Yellow dot
- Text: "Offline"
- Tooltip: "Changes saved locally • X operations queued"
- Expanded: Queue details, retry status, manual retry button

**Error (Red):**
- Icon: Red dot with exclamation
- Text: "Connection Error"
- Tooltip: "Retrying in Xs..."
- Expanded: Error details, retry count, manual retry button, troubleshooting link

**Expanded Menu Actions:**
- "Sync Now" button (force reconciliation)
- "View Queue" button (show queued operations)
- "Connection Info" (latency, Firestore status, auth status)
- "Clear Queue" button (emergency - with confirmation)

#### 6.2 User Notifications System

**Notification Types:**

**Success Notifications:**
- "All changes synced" (after processing queue)
- "X operations synced successfully"
- Auto-dismiss after 3 seconds

**Warning Notifications:**
- "Connection unstable - changes may sync slowly"
- "Operation queue is growing (X operations)"
- "Sync latency high (Xms) - performance may be affected"
- Persistent until condition resolves

**Error Notifications:**
- "Failed to sync operation - retrying..."
- "Connection lost - working offline"
- "[User Name] also edited this shape" (conflict notification)
- Dismissible but log persists in console

**Info Notifications:**
- "Reconnected - syncing changes..."
- "Canvas synchronized"
- "[User Name] joined the canvas"
- Auto-dismiss after 2 seconds

**Notification UI:**
- Toast notifications (bottom-right corner)
- Stack up to 3 notifications
- Click to dismiss
- Progress indicators for long operations
- Grouping similar notifications (e.g., "5 shapes synced" instead of 5 separate toasts)

---

## Technical Implementation Details

### 7.1 Operation Queue Architecture

**IndexedDB Schema:**

```javascript
// Database: collabcanvas
// Store: operationQueue

{
  id: string,              // Unique operation ID
  canvasId: string,        // Canvas this operation belongs to
  userId: string,          // User who created operation
  timestamp: number,       // Client timestamp
  sequenceNumber: number,  // Sequential number for ordering
  type: 'create' | 'update' | 'delete' | 'batch',
  payload: {
    shapeId: string,
    updates: object,       // Delta updates
    // ... operation-specific data
  },
  retryCount: number,      // Number of retry attempts
  status: 'pending' | 'processing' | 'failed' | 'completed',
  error: string | null     // Last error message
}
```

**Queue Operations:**
- `enqueue(operation)` - Add to queue
- `dequeue()` - Get next pending operation
- `markCompleted(operationId)` - Remove from queue
- `markFailed(operationId, error)` - Increment retry count
- `clearQueue()` - Empty queue (emergency)
- `getQueueLength()` - Number of pending operations
- `getQueueOperations()` - Get all operations for display

**Processing Logic:**
1. Sort operations by timestamp (oldest first)
2. Process sequentially (not parallel to preserve order)
3. For each operation:
   - Attempt to execute against Firestore
   - If success: Mark completed, remove from queue
   - If failure: Increment retry count, mark failed
   - If retry count > 3: Notify user, keep in queue but skip
4. After processing all: Trigger reconciliation
5. Notify user of completion

### 7.2 Sync Latency Measurement

**Object Sync Latency:**

```javascript
// Client A: Start timer on action
const startTime = performance.now()
await updateShape(shapeId, updates)

// Operation flows:
// 1. Local optimistic update (immediate)
// 2. Write to Firestore with serverTimestamp()
// 3. Firestore propagates to all listeners
// 4. Client B receives update via onSnapshot()
// 5. Client B renders update

// Measurement approach:
// - Client A embeds startTime in custom field (temporary)
// - Client B receives update, calculates: performance.now() - startTime
// - Report latency to performance monitoring
// - Remove temporary field

// Note: Requires clock synchronization awareness
// Use server timestamp as authoritative time reference
```

**Cursor Sync Latency:**
- Similar approach but with cursor update events
- Lighter payload, faster expected sync
- Use average over last 100 cursor updates

### 7.3 Conflict Resolution Implementation

**Enhanced Last-Write-Wins:**

```javascript
// When receiving remote update
onSnapshot(shapesRef, (snapshot) => {
  snapshot.docChanges().forEach((change) => {
    const remoteShape = change.doc.data()
    const localShape = shapes.get(remoteShape.id)
    
    if (change.type === 'modified') {
      // Compare timestamps
      const remoteTime = remoteShape.lastModified.toMillis()
      const localTime = localShape?.lastModified || 0
      
      // Check if this is a conflict (edits within 2 seconds)
      const timeDiff = Math.abs(remoteTime - localTime)
      const isConflict = timeDiff < 2000 && localTime > 0
      
      if (remoteTime > localTime) {
        // Remote wins - accept update
        shapes.set(remoteShape.id, remoteShape)
        
        // Show visual feedback if conflict
        if (isConflict) {
          showEditOverrideNotification(remoteShape)
          highlightShape(remoteShape.id, remoteShape.lastModifiedBy)
        } else {
          // Normal update - just show edit indicator
          showEditIndicator(remoteShape.id, remoteShape.lastModifiedBy)
        }
      } else {
        // Local is newer - ignore (shouldn't happen often)
        // console.log('Ignoring older remote update', remoteShape.id)
      }
    }
  })
})
```

### 7.4 State Reconciliation Implementation

```javascript
async function reconcileCanvasState(canvasId) {
  // console.log('🔄 Starting state reconciliation...')
  
  // 1. Fetch authoritative state from Firestore
  const firestoreShapes = await loadShapesFromFirestore(canvasId)
  const firestoreMap = new Map(firestoreShapes.map(s => [s.id, s]))
  
  // 2. Compare with local state
  const localMap = new Map(shapes)
  
  let added = 0, removed = 0, updated = 0
  
  // Check for missing shapes (in Firestore but not local)
  for (const [id, firestoreShape] of firestoreMap) {
    const localShape = localMap.get(id)
    
    if (!localShape) {
      // Add missing shape
      shapes.set(id, firestoreShape)
      added++
    } else {
      // Check timestamp
      const firestoreTime = firestoreShape.lastModified.toMillis()
      const localTime = localShape.lastModified
      
      if (firestoreTime > localTime) {
        // Update with newer version
        shapes.set(id, firestoreShape)
        updated++
      }
    }
  }
  
  // Check for extra shapes (in local but not Firestore)
  for (const [id, localShape] of localMap) {
    if (!firestoreMap.has(id)) {
      // Remove extra shape (was deleted by another user)
      shapes.delete(id)
      removed++
    }
  }
  
  const totalChanges = added + removed + updated
  
  if (totalChanges > 0) {
    // console.log(`✅ Reconciliation: +${added} -${removed} ~${updated}`)
    
    // Notify user if significant
    if (totalChanges >= 5) {
      showNotification(`Canvas synchronized - ${totalChanges} shapes updated`)
    }
  }
  
  return { added, removed, updated }
}
```

---

## Data Model Updates

### Shape Model Enhancement

```typescript
interface BaseShape {
  // Existing fields...
  id: string
  type: 'rectangle' | 'circle' | 'line' | 'text'
  x: number
  y: number
  zIndex: number
  rotation: number
  createdBy: string
  createdAt: Timestamp
  lastModified: Timestamp
  lastModifiedBy: string
  
  // v3 additions:
  sequenceNumber?: number     // Operation ordering
  syncStatus?: 'synced' | 'pending' | 'conflict'  // Client-side only
}
```

### Operation Queue Model

```typescript
interface QueuedOperation {
  id: string
  canvasId: string
  userId: string
  timestamp: number
  sequenceNumber: number
  type: 'create' | 'update' | 'delete' | 'batch'
  payload: {
    shapeId?: string
    shapeIds?: string[]
    updates?: Partial<BaseShape>
    fullShape?: BaseShape
  }
  retryCount: number
  status: 'pending' | 'processing' | 'failed' | 'completed'
  error?: string
}
```

### Connection State Model

```typescript
interface ConnectionState {
  status: 'connected' | 'syncing' | 'offline' | 'error'
  queueLength: number
  lastSyncTime: number
  latency: {
    object: { avg: number, min: number, max: number }
    cursor: { avg: number, min: number, max: number }
  }
  retryAttempts: number
  nextRetryTime?: number
  error?: string
}
```

---

## Performance Targets Summary

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Object sync latency | <100ms | Performance.now() timestamps with server reconciliation |
| Cursor sync latency | <50ms | Cursor update timestamp to remote render |
| Frame rate | 60 FPS | RequestAnimationFrame timing |
| Shapes supported | 1000+ at 60 FPS | Load testing with viewport culling |
| Concurrent users | 10+ without degradation | Multi-client stress testing |
| Reconnection time | <3 seconds | Time from connection restore to sync complete |
| Queue processing | 20 ops/second | Measured during sync after disconnect |
| State reconciliation | <1 second | Time to compare and merge full canvas state |
| Rapid edits | 10+ per second | No state corruption or missing updates |

---

## User Experience Principles

1. **Transparency:** Always show connection status and sync progress
2. **Reliability:** Never lose user work, even during network failures
3. **Performance:** Maintain sub-100ms sync and 60 FPS regardless of canvas complexity
4. **Clarity:** Clear visual feedback on multi-user interactions and conflicts
5. **Predictability:** Consistent conflict resolution (last-write-wins) with visible outcomes
6. **Recoverability:** Automatic recovery from disconnects, crashes, and errors

---

## Migration & Backward Compatibility

### Phase 2 → v3 Migration

**Database Schema:**
- No breaking changes to Firestore schema
- Add optional `sequenceNumber` field to shapes (populated on write, null acceptable)
- IndexedDB for operation queue (new, doesn't affect existing data)

**Code Changes:**
- Enhanced composables (backward compatible)
- New components (ConnectionStatus, PerformanceMonitor)
- Updated sync logic (transparent to existing code)

**User Experience:**
- All existing features work identically
- New features are additive (status indicator, queue system, feedback)
- No user re-training required

**Rollout Strategy:**
- Deploy v3 as update to existing app
- Gradual feature enablement via feature flags
- Monitor performance metrics in production
- Rollback plan if issues detected

---

## Future Considerations (Out of Scope for v3)

- **CRDT implementation:** For true concurrent editing without conflicts
- **Operational Transformation (OT):** Alternative to last-write-wins for text
- **WebRTC data channels:** For peer-to-peer sync (reduce latency)
- **WebSocket alternative:** Custom WebSocket server for more control
- **Collaborative awareness:** Show who's viewing what area of canvas
- **Version history:** Time-travel debugging and restore previous states
- **Conflict resolution UI:** Manual conflict resolution for critical edits
- **Performance analytics:** Server-side aggregation of performance metrics

---

## Definition of Done - v3

✅ **Performance:**
- Object sync consistently <100ms (measured in production)
- Cursor sync consistently <50ms (measured in production)
- 60 FPS maintained with 1000+ shapes
- Rapid edits (10/sec) handled without corruption

✅ **Resilience:**
- Operation queue system implemented and tested
- Automatic reconnection working with exponential backoff
- State reconciliation running and effective
- Crash recovery with localStorage backup

✅ **Conflict Resolution:**
- Last-write-wins enforced with server timestamps
- Visual feedback on edits (highlights, notifications)
- Properties panel shows last editor
- Override notifications for conflicts

✅ **User Experience:**
- Connection status indicator always visible
- Clear notifications for all sync events
- Performance dashboard available (Shift+P)
- Zero data loss in testing scenarios

✅ **Production Ready:**
- Deployed and stable under multi-user load
- Performance metrics logged and monitored
- Documentation updated
- All Phase 2 features still working

---

## Appendix: Conflict Resolution Strategy Documentation

### Last-Write-Wins (LWW) with Server Timestamp

**How it works:**
1. Every write operation includes `serverTimestamp()` from Firestore
2. Firestore atomically assigns timestamp on server (authoritative time)
3. All clients receive updates via listeners with server timestamp
4. When receiving update, compare with local shape's timestamp
5. Accept update if remote timestamp > local timestamp
6. Discard update if remote timestamp ≤ local timestamp

**Benefits:**
- Simple, predictable, easy to reason about
- No complex CRDT or OT algorithms
- Firestore handles atomic timestamps
- Works well for shape-based collaboration
- Acceptable for creative tools with undo capability

**Trade-offs:**
- User with slower connection may see changes overwritten
- No automatic merge of concurrent edits
- Last editor wins (not necessarily "best" edit)
- Requires clear communication to users via visual feedback

**Mitigation strategies:**
- Visual feedback when local changes overwritten (toast notification)
- Show last editor in properties panel
- Temporary highlight on remote edits
- Text editing uses locking to prevent conflicts
- Undo/redo allows recovery from unwanted overwrites

**Why not CRDT or OT:**
- Shape manipulation doesn't require merge semantics
- CRDT adds complexity for minimal benefit in this use case
- OT designed for text/document editing, not geometric shapes
- Last-write-wins is sufficient for design/whiteboard tools
- Can always upgrade to CRDT in future if needed

---

**Document Status:** Ready for Implementation Planning  
**Next Steps:** Break into implementation tasks and PRs  
**Approval Required:** Technical lead, Product owner

