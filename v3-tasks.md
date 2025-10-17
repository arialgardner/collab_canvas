# CollabCanvas v3 - Task List & PR Breakdown
**Goal:** Production-grade real-time sync with sub-100ms object sync, sub-50ms cursor sync, and bulletproof network resilience

**Foundation:** Builds on Phase 2 (all shape types, transformations, selection, layer management, permissions)

**Updated Requirements from PRD v3:**
- Sub-100ms object synchronization guarantee
- Sub-50ms cursor synchronization guarantee
- Zero visible lag during rapid multi-user edits (10+ changes/sec)
- Operation queue system for offline resilience
- Network drop auto-reconnect with complete state recovery
- Enhanced conflict resolution with visual feedback (last-write-wins)
- Clear connection status indicators
- State reconciliation and crash recovery
- Performance monitoring dashboard

---

## PR #1: Performance Monitoring Infrastructure
**Purpose:** Build foundation for measuring and monitoring sync performance

### Create performance monitoring composable
- Create `src/composables/usePerformanceMonitoring.js`
- Track object sync latency (create, update, delete operations)
  - Timestamp on local action
  - Timestamp on Firestore write confirmation
  - Timestamp on remote client receive (via custom field)
  - Calculate end-to-end latency
- Track cursor sync latency
  - Timestamp on position update
  - Timestamp on remote receive
  - Rolling average over last 100 updates
- Track FPS with requestAnimationFrame
  - Rolling 1-second average
  - Detect drops below 30 FPS
- Track Firestore metrics
  - Active listeners count
  - Write operations per second
  - Read operations per second
  - Failed operations count

### Build performance dashboard component
- Create `src/components/PerformanceMonitor.vue`
- Keyboard shortcut: Shift+P to toggle
- Display position: Top-right overlay panel
- Metrics displayed:
  - Current FPS (color-coded: green >55, yellow 30-55, red <30)
  - Object sync latency: avg/min/max over last 10 ops (green <100ms, yellow 100-200ms, red >200ms)
  - Cursor sync latency: avg/min/max over last 100 updates (green <50ms, yellow 50-100ms, red >100ms)
  - Active Firestore listeners
  - Shapes in memory vs rendered (viewport culling stats)
  - Network round-trip estimate
- Auto-refresh every 1 second
- Export metrics to console for debugging
- Collapsible/expandable sections

### Add performance logging
- Console warnings when targets missed
  - "⚠️ Object sync latency exceeded 100ms: 145ms"
  - "⚠️ Cursor sync latency exceeded 50ms: 78ms"
  - "⚠️ FPS dropped below 30: 24 FPS"
- Alert user if consistently slow
  - Track warnings over 1 minute window
  - Show toast notification if >5 warnings: "Performance degraded - check connection"
- Log all metrics to browser console (development mode)

### Integrate performance tracking into existing composables
- Update `useShapes.js`:
  - Add timing measurements to create/update/delete operations
  - Report to performance monitor
- Update `useCursors.js`:
  - Add timing measurements to cursor updates
  - Report to performance monitor
- Update `useFirestore.js`:
  - Track all Firestore operations
  - Report success/failure metrics

**Deliverable:**
✅ Performance monitoring infrastructure in place. Real-time dashboard showing all sync metrics. Ready for optimization work.

---

## PR #2: Enhanced Object Sync Performance (<100ms)
**Purpose:** Optimize object synchronization to guarantee sub-100ms latency

### Optimize Firestore write operations
- Implement write batching for related operations
  - Multi-select moves → single batch write
  - Multiple property changes → batch commit
  - Atomic batch commits (all-or-nothing)
- Add sequence numbers to all operations
  - Increment counter per user session
  - Include in shape updates: `sequenceNumber: number`
  - Detect out-of-order delivery
  - Handle out-of-order gracefully (accept if timestamp newer)
- Reduce payload sizes
  - Delta updates only (changed properties)
  - Remove unnecessary fields from sync
  - Compress large payloads (e.g., text content)

### Implement operation priority system
- Create priority queue for operations
  - High priority: Shape creation, deletion, final positions (dragEnd)
  - Low priority: Interim drag positions, property panel typing
  - Process high priority first
- Throttle low-priority operations more aggressively
  - Interim drag updates: 100ms throttle (was 16ms)
  - Final position: Immediate send (no throttle)
  - Property changes: 500ms debounce while typing, immediate on blur

### Optimize Firestore listeners
- Ensure single listener per collection (not per document)
- Minimize listener re-initialization
  - Cache listener references
  - Only detach/reattach on canvas change
- Efficient change detection
  - Use `docChanges()` not full snapshot iteration
  - Process only 'added', 'modified', 'removed'
  - Skip processing if no actual changes

### Reduce rendering latency
- Optimize local state updates
  - Use Vue's `nextTick` for batched renders
  - Throttle Konva layer redraws
  - Batch multiple shape updates before redraw
- Update Konva rendering
  - Use `batchDraw()` for all updates
  - Skip intermediate renders during rapid updates
  - Implement frame skipping if behind (>16ms)

### Add operation deduplication
- Track recently processed operations
  - Cache last 100 operation IDs
  - Check incoming operations against cache
  - Skip if already processed
- Handle duplicate operations gracefully
  - Log duplicates for debugging
  - Don't apply twice

**Deliverable:**
✅ Object sync consistently <100ms. Write batching working. Priority system in place. Performance dashboard shows green metrics.

---

## PR #3: Enhanced Cursor Sync Performance (<50ms)
**Purpose:** Optimize cursor synchronization to guarantee sub-50ms latency

### Optimize cursor update path
- Reduce throttle interval
  - Current: 50ms throttle
  - New: 30ms throttle for moving cursor, 100ms for idle
  - Adaptive throttling based on movement delta
- Minimize cursor payload
  - Only send: userId, x, y, timestamp
  - Remove unnecessary fields
  - Use integer coordinates (round before send)
- Optimize Firestore cursor collection
  - Dedicated lightweight collection
  - Aggressive TTL on cursor documents (auto-delete after 30s)
  - Indexed queries for fast reads

### Implement cursor interpolation
- Add smooth interpolation between updates
  - Linear interpolation for position
  - Calculate intermediate positions client-side
  - Render at 60 FPS even with 30ms updates
- Cursor prediction
  - Extrapolate next position based on velocity
  - Show predicted position until next update
  - Correct smoothly when real update arrives

### Optimize cursor rendering
- Use Konva FastLayer for cursor layer
  - Separate from main shapes layer
  - Higher refresh rate
  - Lighter rendering overhead
- Reduce cursor component complexity
  - Simplify cursor SVG (fewer paths)
  - Use CSS transforms for positioning (not Konva properties)
  - Render only cursors in viewport + margin

### Adaptive cursor updates
- Reduce frequency when cursor idle
  - No movement for 1 second → reduce to 200ms updates
  - No movement for 5 seconds → stop updates entirely
  - Resume 30ms updates on movement
- Skip updates for small movements
  - Only send if moved >5px from last sent position
  - Reduces unnecessary writes
  - Maintains smooth appearance with interpolation

### Cursor visibility optimization
- Only show cursors in viewport area
  - Calculate viewport bounds
  - Hide cursors outside bounds + 500px margin
  - Update visibility on pan/zoom
- Fade out stale cursors
  - After 10 seconds no update → 50% opacity
  - After 20 seconds no update → hide completely
  - Remove from memory after 30 seconds

**Deliverable:**
✅ Cursor sync consistently <50ms. Smooth interpolation working. Cursors feel responsive and fluid.

---

## PR #4: Connection State Management System
**Purpose:** Implement robust connection state tracking and visual indicators

### Create connection state composable
- Create `src/composables/useConnectionState.js`
- Define connection states:
  - `CONNECTED` - Normal operation, sync active
  - `SYNCING` - Processing queued operations after reconnect
  - `OFFLINE` - No connection, operations queued locally
  - `ERROR` - Connection issue, attempting reconnection
- Track connection metrics:
  - Current state
  - Last sync timestamp
  - Queue length
  - Retry attempts
  - Next retry time
  - Last error message
- State transitions:
  - Automatic detection via Firestore connection events
  - Manual state changes for testing
  - Event emission on state changes

### Implement connection detection
- Listen to Firestore connection state
  - Use `onSnapshot` error callbacks
  - Detect network failures
  - Track successful operations
- Heartbeat mechanism
  - Ping Firestore every 10 seconds
  - Lightweight read operation
  - Detect connection issues before user actions fail
- Browser online/offline events
  - Listen to `window.addEventListener('online')`
  - Listen to `window.addEventListener('offline')`
  - Cross-check with Firestore connection

### Build connection status indicator component
- Create `src/components/ConnectionStatus.vue`
- Location: Top navigation bar, right side
- Visual design by state:
  - **Connected:** Green dot + "Connected" text
  - **Syncing:** Blue spinner + "Syncing X ops..." text
  - **Offline:** Yellow dot + "Offline" text
  - **Error:** Red dot + "Connection Error" text
- Compact mode (default): Dot + text only
- Tooltip on hover:
  - Connected: "Real-time sync active • Ping: Xms"
  - Syncing: "Processing X operations"
  - Offline: "Changes saved locally • X operations queued"
  - Error: "Retrying in Xs..."

### Build expanded connection menu
- Click status indicator to expand dropdown
- Display detailed information:
  - Current connection state
  - Last successful sync time
  - Operation queue length
  - Sync latency metrics (from performance monitor)
  - Firestore connection status
  - Authentication status
- Action buttons:
  - "Sync Now" - Force state reconciliation
  - "View Queue" - Show queued operations modal
  - "Retry Connection" - Manual retry
  - "Clear Queue" - Emergency clear (with confirmation)
- Connection info section:
  - Network latency estimate
  - Active listeners count
  - Last error details (if any)

### Integrate with navigation
- Update `src/components/NavBar.vue`
- Add ConnectionStatus component to right side
- Ensure responsive design (hide text on small screens, keep icon)
- Z-index management (status menu above other UI)

**Deliverable:**
✅ Connection state system working. Visual indicator always visible. Users always know connection status.

---

## PR #5: Operation Queue System (IndexedDB)
**Purpose:** Implement local operation queue for offline resilience

### Set up IndexedDB infrastructure
- Create `src/utils/indexedDB.js` helper
- Database name: `collabcanvas`
- Object store: `operationQueue`
- Schema:
  ```javascript
  {
    id: string (primary key),
    canvasId: string (indexed),
    userId: string,
    timestamp: number,
    sequenceNumber: number,
    type: 'create' | 'update' | 'delete' | 'batch',
    payload: object,
    retryCount: number,
    status: 'pending' | 'processing' | 'failed' | 'completed',
    error: string | null
  }
  ```
- Indexes:
  - Primary: `id`
  - Secondary: `canvasId` (for filtering by canvas)
  - Secondary: `timestamp` (for ordering)

### Create operation queue composable
- Create `src/composables/useOperationQueue.js`
- Queue operations:
  - `enqueue(operation)` - Add operation to queue
  - `dequeue()` - Get next pending operation (oldest first)
  - `markCompleted(operationId)` - Remove from queue
  - `markFailed(operationId, error)` - Increment retry, update status
  - `getQueueLength()` - Count pending operations
  - `getQueueOperations()` - Get all pending for display
  - `clearQueue()` - Emergency clear (with confirmation)
- Queue management:
  - Automatic cleanup of completed operations
  - Maximum 1000 operations (oldest dropped if exceeded)
  - Warning at 500 operations
  - Persist across browser sessions (IndexedDB)

### Integrate queue with Firestore operations
- Update `useFirestore.js` to use queue
- Queue all write operations when offline:
  - Shape creation → queue create operation
  - Shape update → queue update operation
  - Shape deletion → queue delete operation
  - Batch operations → queue as single batch
- Optimistic local updates continue
  - Update local state immediately
  - Queue operation for later sync
  - Mark shape as `syncStatus: 'pending'`
- Online mode (normal):
  - Execute operation directly
  - On success: Mark as synced
  - On failure: Queue and retry

### Handle queue edge cases
- Queue size limits:
  - Show warning toast at 500 operations
  - Block new operations at 1000 (show error)
  - User option to clear queue and reload
- Operation conflicts in queue:
  - Multiple updates to same shape → merge into single update
  - Delete followed by update → remove update from queue
  - Create followed by delete → remove both from queue
- Queue corruption:
  - Validate queue on load
  - Remove invalid operations
  - Log errors for debugging

### Add queue visualization
- Create `src/components/QueueViewer.vue` modal
- Display all queued operations:
  - Operation type (icon)
  - Shape affected (thumbnail if available)
  - Timestamp (relative time)
  - Status (pending, processing, failed)
  - Retry count
  - Error message (if failed)
- Actions:
  - "Retry Now" for failed operations
  - "Remove" individual operations
  - "Clear All" with confirmation
- Real-time updates as queue processes

**Deliverable:**
✅ Operation queue system working. Operations persist offline. Queue visible to users. Ready for sync processing.

---

## PR #6: Automatic Reconnection & Queue Processing
**Purpose:** Implement automatic reconnection with exponential backoff and queue sync

### Implement exponential backoff reconnection
- Create `src/utils/reconnection.js` helper
- Backoff schedule: 1s, 2s, 4s, 8s, 16s, 32s (max)
- Retry indefinitely until connected
- Reset backoff on successful connection
- Track retry attempts in connection state

### Build reconnection flow
- Detect connection loss:
  - Firestore listener errors
  - Failed write operations
  - Heartbeat timeout
- Transition to offline state:
  - Update connection status to OFFLINE
  - Start queuing operations
  - Begin reconnection attempts
- Reconnection attempts:
  - Wait for backoff duration
  - Attempt Firestore connection
  - Verify authentication still valid
  - On success: Transition to SYNCING state
  - On failure: Increment retry, continue backoff
- User notifications:
  - "Connection lost - working offline"
  - "Reconnecting..." (during attempts)
  - "Reconnecting in Xs..." (during backoff)

### Implement queue processing on reconnect
- Trigger on successful reconnection:
  1. Load operation queue from IndexedDB
  2. Sort operations by timestamp (oldest first)
  3. Transition to SYNCING state
  4. Process queue sequentially
- Queue processing logic:
  - For each operation:
    - Update status to 'processing'
    - Execute against Firestore
    - If success: Mark completed, remove from queue
    - If failure: Mark failed, increment retry count
    - Update progress notification
  - Skip operations with retry count > 3
  - Continue processing even if some fail
- Progress tracking:
  - Show in connection status: "Syncing 5 of 12 operations..."
  - Update progress bar in expanded menu
  - Estimated time remaining
- Completion:
  - Trigger state reconciliation
  - Transition to CONNECTED state
  - Show success notification: "All changes synced"

### Handle queue processing errors
- Individual operation failures:
  - Retry up to 3 times with exponential backoff
  - After 3 failures: Skip and notify user
  - "Failed to sync operation - [shape name] - [error]"
- Queue processing timeout:
  - Maximum 5 minutes for full queue
  - If exceeded: Pause queue, notify user
  - User option to continue or clear queue
- Conflicts during sync:
  - Check if shape still exists
  - Check if shape modified by another user (timestamp)
  - Apply conflict resolution (last-write-wins)
  - Log conflicts for debugging

### Add user controls
- Manual retry button in connection status menu
- Pause/resume queue processing (advanced users)
- Skip failed operations (after 3 retries)
- Clear queue option (emergency)

**Deliverable:**
✅ Automatic reconnection working with exponential backoff. Queue processes on reconnect. Users notified of progress.

---

## PR #7: State Reconciliation System
**Purpose:** Implement periodic state reconciliation to catch inconsistencies

### Create state reconciliation composable
- Create `src/composables/useStateReconciliation.js`
- Reconciliation function:
  - Fetch full canvas state from Firestore
  - Compare with local state
  - Detect discrepancies (missing, extra, timestamp mismatches)
  - Apply corrections
  - Log results
- Reconciliation triggers:
  - Periodic: Every 60 seconds (background)
  - After reconnection (before processing queue)
  - On tab focus (user returns to window)
  - Manual: "Sync Now" button
- Configuration:
  - Enable/disable periodic reconciliation
  - Adjust reconciliation interval
  - Dry-run mode (detect but don't apply)

### Implement reconciliation algorithm
- Step 1: Fetch authoritative state
  - Load all shapes from Firestore for current canvas
  - Create map: shapeId → shape
- Step 2: Compare with local state
  - Iterate Firestore shapes:
    - If not in local → Add to local (missing shape)
    - If in local but timestamp different → Update if Firestore newer
  - Iterate local shapes:
    - If not in Firestore → Remove from local (deleted by other user)
- Step 3: Apply corrections
  - Add missing shapes to local state
  - Update shapes with newer Firestore versions
  - Remove extra shapes from local state
  - Maintain z-index ordering after reconciliation
- Step 4: Report results
  - Count: added, removed, updated
  - Log to console
  - Notify user if significant (5+ changes)

### Handle reconciliation edge cases
- Large canvases (1000+ shapes):
  - Process in batches (100 shapes at a time)
  - Non-blocking (use requestIdleCallback)
  - Progress indicator if taking >2 seconds
- Reconciliation during active editing:
  - Don't overwrite shapes user is currently dragging
  - Mark dragging shapes as "locked" during reconciliation
  - Reconcile after drag ends
- Conflicting local changes:
  - If local shape has unsaved changes (syncStatus: 'pending')
  - Prefer local version (user's current work)
  - Queue operation to sync later

### Add reconciliation notifications
- Silent reconciliation (small changes):
  - Log to console only
  - No user notification if <5 changes
- Significant reconciliation:
  - Show toast: "Canvas synchronized - X shapes updated"
  - Include breakdown: "+5 added, -2 removed, ~3 updated"
  - Auto-dismiss after 5 seconds
- Reconciliation errors:
  - Show error toast: "Failed to synchronize canvas"
  - Offer retry button
  - Log error details to console

### Integrate with connection state
- Update connection status during reconciliation
  - Show "Syncing..." during reconciliation
  - Return to "Connected" after completion
- Add reconciliation info to expanded menu:
  - Last reconciliation time
  - Last reconciliation results
  - "Reconcile Now" button

**Deliverable:**
✅ State reconciliation working. Periodic background sync. Manual sync available. Inconsistencies detected and resolved.

---

## PR #8: Enhanced Crash Recovery System
**Purpose:** Upgrade crash recovery with more frequent saves and better merge logic

### Enhance localStorage auto-save
- Reduce save frequency: 10 seconds (was 30s in Phase 2)
- Additional save triggers:
  - After any create/delete operation (immediate)
  - Before browser unload event (immediate)
  - After batch operations (immediate)
  - On visibility change (tab hidden)
- Save data structure:
  ```javascript
  {
    canvasId: string,
    timestamp: number,
    shapes: Array<Shape>,
    operationQueue: Array<QueuedOperation>,
    viewportState: { x, y, scaleX, scaleY },
    selectionState: Array<shapeId>,
    userId: string
  }
  ```
- localStorage key: `collabcanvas_recovery_${canvasId}`
- Size management:
  - Compress data before save (JSON.stringify only essential fields)
  - Maximum 5MB per canvas
  - Cleanup old recovery data (>7 days)

### Implement enhanced recovery detection
- On canvas load:
  - Check localStorage for recovery data
  - Compare timestamp with current time
  - Recovery scenarios:
    - Timestamp <5 minutes ago → Offer recovery (likely crash)
    - Timestamp 5-30 minutes ago → Offer with warning (might be stale)
    - Timestamp >30 minutes ago → Discard (definitely stale)
  - Check if recovery data is for current user

### Build recovery modal UI
- Create `src/components/RecoveryModal.vue`
- Modal content:
  - Title: "Unsaved changes detected"
  - Message: "Found unsaved work from [relative time ago]"
  - Preview: Show shape count and thumbnail if possible
  - Actions:
    - "Recover X shapes" (primary button)
    - "Discard and continue" (secondary button)
  - Additional info:
    - Timestamp of recovery data
    - User who created it (if available)
    - Canvas name
- Modal behavior:
  - Blocks canvas interaction until decision made
  - Keyboard shortcuts: Enter (recover), Escape (discard)
  - Auto-dismiss after 60 seconds → defaults to discard

### Implement smart recovery merge
- Recovery process:
  1. Load recovery data from localStorage
  2. Fetch current Firestore state
  3. Merge intelligently:
     - For each shape in recovery data:
       - If not in Firestore → Re-create (user's lost work)
       - If in Firestore with older timestamp → Update with recovery data
       - If in Firestore with newer timestamp → Keep Firestore version
     - For each shape in Firestore:
       - If not in recovery → Add to local (created by others)
  4. Apply merged state to canvas
  5. Process any queued operations from recovery
  6. Clear localStorage recovery data
  7. Trigger reconciliation for safety

### Handle recovery edge cases
- Multiple recovery sessions:
  - If multiple localStorage keys exist (multiple canvases)
  - Only offer recovery for current canvas
  - Cleanup other old recovery data
- Recovery data corruption:
  - Validate JSON structure before parsing
  - Check for required fields
  - Discard if corrupted, log error
- Recovery during offline:
  - Allow recovery even if offline
  - Queue sync operations for when connection returns
  - Show appropriate status indicator

### Add recovery testing tools
- Development mode tools:
  - Force crash simulation (kill page)
  - Inspect recovery data in localStorage
  - Clear recovery data manually
- Console commands:
  - `window.__collabcanvas_forceRecover()` - Trigger recovery flow
  - `window.__collabcanvas_clearRecovery()` - Clear recovery data
  - `window.__collabcanvas_inspectRecovery()` - Show recovery data

**Deliverable:**
✅ Enhanced crash recovery working. More frequent saves. Smart merge logic. Zero data loss in crash scenarios.

---

## PR #9: Visual Feedback System for Multi-User Edits
**Purpose:** Implement visual feedback showing who edited what and when

### Implement real-time edit highlights
- Create `src/components/EditHighlight.vue` overlay
- Trigger on shape updates from other users:
  - Detect when shape modified by `lastModifiedBy !== currentUserId`
  - Apply temporary highlight to shape
- Highlight visual design:
  - Border: 2px solid with editor's cursor color
  - Pulsing animation: 0.3s pulse (scale 1.0 → 1.02 → 1.0)
  - Duration: 2 seconds total
  - Fade out: Last 0.5s gradual opacity reduction
- Multiple edits:
  - If shape edited again during highlight → restart animation
  - Use most recent editor's color

### Implement conflict override notifications
- Detect edit conflicts:
  - Local shape has pending changes (syncStatus: 'pending')
  - Remote update received with newer timestamp
  - Time difference <2 seconds (actual conflict)
- Show override notification:
  - Toast notification: "[User Name] also edited this shape"
  - Icon: User's avatar with cursor color
  - Duration: 3 seconds
  - Dismissible by user
- Visual conflict indicator:
  - Shape flashes briefly in editor's cursor color
  - 0.5 second flash animation
  - Slightly different animation than normal edit (more obvious)

### Add last editor display in properties panel
- Update `src/components/PropertiesPanel.vue`
- Add "Last Edited By" section when shape selected:
  - User avatar (circular, initials, cursor color background)
  - User name
  - Relative timestamp: "2 minutes ago"
  - Format timestamps nicely:
    - <1 minute: "Just now"
    - <1 hour: "X minutes ago"
    - <24 hours: "X hours ago"
    - >24 hours: "Yesterday" or date
- Display for single selection only
- Multi-selection: Show "Multiple editors" if different

### Implement hover tooltip last editor
- Add tooltip to all shapes on hover (without selection)
- Tooltip content:
  - "[User Name] edited [relative time]"
  - Small avatar icon
  - Position near cursor
- Tooltip behavior:
  - Delay 0.5s after hover start
  - Dismiss on mouse out
  - Don't show if shape selected (use properties panel instead)
- Only show if edited by someone other than current user

### Build active editing indicators
- Show when other users actively editing shapes:
  - Detect ongoing drag/resize/rotate operations
  - Remote user's `isDragging` flag or active transform
- Visual indicator:
  - Continuous subtle border (2px dotted, editor's cursor color)
  - Slightly pulsing opacity (0.5s cycle)
  - Remove immediately when operation ends
- Update in real-time during their operation
- Show user name tooltip: "[User Name] is editing"

### Optimize feedback performance
- Throttle highlight re-renders
  - Don't create new highlight if one exists
  - Restart animation on existing highlight
- Limit simultaneous highlights
  - Maximum 20 shapes highlighted at once
  - Prioritize most recent edits
  - Fade out oldest highlights early
- Efficient DOM management
  - Reuse highlight components
  - Remove from DOM after animation complete

**Deliverable:**
✅ Visual feedback system working. Users see who edited what. Conflicts clearly indicated. Professional multi-user UX.

---

## PR #10: User Notification System
**Purpose:** Build comprehensive notification system for sync events and user actions

### Create notification service
- Create `src/composables/useNotifications.js`
- Notification types:
  - Success (green)
  - Warning (yellow)
  - Error (red)
  - Info (blue)
- Notification methods:
  - `showSuccess(message, duration = 3000)`
  - `showWarning(message, duration = 5000)`
  - `showError(message, duration = 0)` // 0 = persistent
  - `showInfo(message, duration = 2000)`
  - `dismissNotification(id)`
  - `clearAll()`
- Notification data:
  - id (unique)
  - type
  - message
  - timestamp
  - duration
  - dismissible
  - action (optional button)

### Build notification toast component
- Create `src/components/NotificationToast.vue`
- Display position: Bottom-right corner
- Stack up to 3 notifications:
  - Older notifications slide up
  - New notifications appear at bottom of stack
  - Overflow hidden (queue for later display)
- Visual design by type:
  - Success: Green background, checkmark icon
  - Warning: Yellow background, warning icon
  - Error: Red background, error icon
  - Info: Blue background, info icon
- Auto-dismiss behavior:
  - Success: 3 seconds
  - Info: 2 seconds
  - Warning: 5 seconds
  - Error: Manual dismiss only (X button)
- Click to dismiss (all types)
- Progress bar for auto-dismiss duration

### Implement notification grouping
- Group similar notifications:
  - Multiple shape syncs → "5 shapes synced successfully"
  - Multiple user joins → "3 users joined the canvas"
  - Multiple conflicts → "5 conflicts resolved"
- Grouping logic:
  - Same notification type within 2 seconds → Group
  - Show count in message
  - Reset count after 5 seconds of no new notifications
- Avoid notification spam

### Add sync event notifications
- **Success notifications:**
  - "All changes synced" (after queue processing)
  - "Canvas synchronized" (after reconciliation, if significant)
  - "X operations synced successfully"
- **Warning notifications:**
  - "Connection unstable - changes may sync slowly"
  - "Operation queue is growing (X operations)"
  - "Sync latency high (Xms) - performance may be affected"
- **Error notifications:**
  - "Failed to sync operation - retrying..."
  - "Connection lost - working offline"
  - "[User Name] also edited this shape" (conflict)
  - "Failed to sync after 3 retries - operation queued"
- **Info notifications:**
  - "Reconnected - syncing changes..."
  - "[User Name] joined the canvas"
  - "[User Name] left the canvas"

### Add notification preferences (optional)
- User settings for notifications:
  - Enable/disable specific notification types
  - Adjust auto-dismiss durations
  - Disable grouping
  - Mute all notifications
- Persist preferences in localStorage
- Default: All enabled with standard durations

### Integrate notifications throughout app
- Update all composables to use notification service:
  - `useConnectionState.js` → Connection events
  - `useOperationQueue.js` → Queue events
  - `useStateReconciliation.js` → Reconciliation events
  - `useShapes.js` → Shape operation events
  - `usePresence.js` → User join/leave events
- Replace existing // console.log and alert calls
- Consistent messaging across app

**Deliverable:**
✅ Notification system working. Users informed of all important events. Notifications grouped intelligently. Professional UX.

---

## PR #11: Rapid Edit Handling & State Integrity
**Purpose:** Ensure state integrity during rapid edits (10+ per second)

### Implement edit batching system
- Create `src/utils/editBatcher.js`
- Batch rapid edits into windows:
  - Window duration: 100ms
  - Collect all edits to same shape within window
  - Merge into single operation
  - Send batch at window end
- Batching logic:
  - Track last edit timestamp per shape
  - If edit within 100ms of previous → Add to batch
  - If edit after 100ms → Send previous batch, start new batch
  - On batch send: Apply all edits as single Firestore update
- Optimize for common operations:
  - Drag operations: Batch interim positions, send final position immediately
  - Resize operations: Batch size changes, send final size immediately
  - Rotation: Batch angles, send final angle immediately
  - Property changes: Batch all changes, send on blur or 500ms idle

### Add sequence numbers to operations
- Extend shape model:
  - Add `sequenceNumber: number` field (optional, client-side tracking)
  - Increment per user session
  - Include in all update operations
- Use sequence numbers:
  - Detect out-of-order delivery from Firestore
  - Accept updates with newer timestamps regardless of sequence
  - Log out-of-order operations for debugging
  - Don't rely solely on sequence (timestamps are authoritative)

### Implement operation deduplication
- Track recently processed operations:
  - Cache last 100 operation IDs (LRU cache)
  - Operation ID: combination of shapeId + timestamp + userId
  - Check incoming updates against cache
- Skip duplicate operations:
  - If operation ID in cache → Skip processing
  - Log skip for debugging: "Skipped duplicate operation"
  - Update cache with new operations
- Clear cache periodically:
  - Every 5 minutes remove old entries (>5 minutes old)
  - Prevent memory bloat

### Handle concurrent edits to same shape
- Detect concurrent edits:
  - Local update in progress (isDragging = true)
  - Remote update received for same shape
  - Timestamps within 1 second of each other
- Resolution strategy:
  - Continue local edit (don't interrupt user's drag)
  - Queue remote update to apply after local edit completes
  - On local edit complete: Re-check remote updates, apply newer if exists
  - Show conflict notification if remote update newer
- Edge case: Multiple users dragging same shape:
  - Each user sees their own local updates optimistically
  - Server timestamp determines final position
  - Last user to release (dragEnd) wins
  - Other users see their shape "snap" to final position
  - Show conflict notification

### Add state validation and correction
- Periodic state validation:
  - Every 30 seconds validate local state
  - Check for anomalies:
    - Shapes with duplicate IDs
    - Shapes with invalid coordinates (NaN, Infinity)
    - Shapes with broken references
    - Z-index gaps or overlaps
  - Auto-correct minor issues
  - Log validation errors for debugging
- Validation on critical operations:
  - Before save to Firestore
  - After receiving batch updates
  - Before rendering shapes
- Recovery from corruption:
  - If validation fails critically → Trigger reconciliation
  - Notify user: "Canvas state corrected"

### Performance under rapid edits
- Stress test with 10+ edits per second:
  - Multiple users editing simultaneously
  - Verify no dropped edits
  - Verify no duplicate shapes
  - Verify final state consistency
- Optimize batching for performance:
  - Non-blocking batch processing
  - Throttle Firestore writes
  - Prioritize critical operations (create, delete, final positions)
  - Defer low-priority operations (interim drags)

**Deliverable:**
✅ Rapid edits (10+/sec) handled without corruption. State integrity maintained. Batching and deduplication working.

---

## PR #12: Final Performance Optimization & Production Polish
**Purpose:** Final optimizations to ensure all performance targets met consistently

### Optimize Firestore queries and indexes
- Review and optimize Firestore queries:
  - Add composite indexes where needed
  - Use indexed queries for all collections
  - Limit query results (pagination if needed)
- Firestore indexes to create:
  - `shapes` collection: Index on `zIndex`, `lastModified`
  - `cursors` collection: Index on `timestamp`
  - Composite: `canvasId + lastModified` for efficient canvas loads
- Deploy Firestore rules optimizations:
  - Efficient permission checks
  - Minimize reads in rules
  - Cache rule evaluation results

### Final rendering optimizations
- Konva layer caching:
  - Enable caching for static backgrounds
  - Cache layers that rarely change
  - Invalidate cache on actual changes only
- Viewport culling refinement:
  - Tune culling margin (optimize at 500px)
  - Reduce margin for shapes (250px) vs cursors (500px)
  - Update culling on zoom level change
- Shape rendering optimizations:
  - Use `listening: false` for off-viewport shapes
  - Simplify shape rendering (fewer Konva nodes)
  - Batch shape updates with `batchDraw()`

### Memory management and cleanup
- Implement aggressive cleanup:
  - Remove disconnected users from presence after 30s
  - Clear stale cursors after 30s
  - Remove off-viewport shapes from render (keep in memory)
  - Periodic garbage collection triggers (optional)
- Monitor memory usage:
  - Track shapes in memory
  - Track Konva objects count
  - Track listener count
  - Warn if memory usage high
- Prevent memory leaks:
  - Clean up all listeners on unmount
  - Clear all timers and intervals
  - Remove all event listeners
  - Clear all maps and caches

### Network optimization
- Minimize payload sizes:
  - Use delta updates exclusively
  - Remove null/undefined fields before sending
  - Compress large text fields
- Connection pooling:
  - Reuse Firestore connections
  - Minimize new connection creation
  - Efficient listener management
- Reduce write operations:
  - Batch related writes
  - Throttle non-critical updates
  - Skip unchanged updates

### Performance validation
- Run performance benchmarks:
  - Object sync latency: Verify <100ms consistently
  - Cursor sync latency: Verify <50ms consistently
  - FPS: Verify 60 FPS with 1000+ shapes
  - Concurrent users: Verify 10+ users smooth
  - Rapid edits: Verify 10+/sec no corruption
- Load testing:
  - Simulate 10+ concurrent users
  - Create/edit/delete 100+ shapes rapidly
  - Verify no performance degradation
  - Verify no memory leaks (extended sessions)
- Performance profiling:
  - Use Chrome DevTools profiler
  - Identify bottlenecks
  - Optimize hot code paths

### Production configuration
- Environment-specific configs:
  - Production Firestore settings
  - Production performance monitoring
  - Disable debug logging in production
  - Enable production error reporting
- Feature flags:
  - Enable/disable new v3 features
  - Gradual rollout capability
  - Quick rollback if issues
- Monitoring and analytics:
  - Track performance metrics in production
  - Log critical errors
  - Monitor Firestore usage
  - Alert on performance degradation

### Polish and final touches
- Code cleanup:
  - Remove debug code
  - Remove unused imports
  - Fix linting errors
  - Add missing comments
- UI polish:
  - Smooth animations
  - Consistent styling
  - Loading states
  - Error states
- Accessibility:
  - Keyboard navigation working
  - Screen reader support (basic)
  - Focus indicators
  - ARIA labels where needed

**Deliverable:**
✅ All performance targets met consistently. Production-ready optimization. Professional polish. Ready for deployment.

---

## PR #13: Documentation & Deployment
**Purpose:** Update documentation and deploy v3 to production

### Update technical documentation
- Update `README.md`:
  - Add v3 features section
  - Update performance specifications
  - Add sync latency guarantees
  - Update architecture overview
- Create `docs/v3-architecture.md`:
  - Detailed architecture documentation
  - Operation queue system
  - State reconciliation
  - Performance optimizations
  - Conflict resolution strategy
- Create `docs/v3-performance.md`:
  - Performance targets and measurements
  - Optimization techniques
  - Monitoring dashboard usage
  - Performance troubleshooting

### Document new composables and components
- Add JSDoc comments to all new code:
  - `usePerformanceMonitoring.js`
  - `useConnectionState.js`
  - `useOperationQueue.js`
  - `useStateReconciliation.js`
  - `useNotifications.js`
  - All new components
- Document APIs:
  - Function signatures
  - Parameter types
  - Return values
  - Usage examples

### Update deployment configuration
- Update `firebase.json`:
  - Production Firestore rules
  - Hosting configuration
  - Performance settings
- Update `.env` files:
  - Production Firebase config
  - Feature flags
  - Performance monitoring settings
- Update build scripts:
  - Production build optimizations
  - Environment variable handling

### Deploy to production
- Pre-deployment checklist:
  - All tests passing
  - Linting clean
  - Performance benchmarks met
  - Documentation complete
  - Firestore indexes deployed
- Deployment steps:
  1. Build production bundle: `npm run build`
  2. Deploy Firestore rules: `firebase deploy --only firestore:rules`
  3. Deploy Firestore indexes: `firebase deploy --only firestore:indexes`
  4. Deploy hosting: `firebase deploy --only hosting`
  5. Verify deployment successful
- Post-deployment validation:
  - Smoke test: Basic functionality works
  - Performance test: Metrics within targets
  - Multi-user test: 5+ users editing simultaneously
  - Network test: Disconnect/reconnect works
  - Queue test: Operations queue and sync correctly

### Create v3 release notes
- Document all new features:
  - Sub-100ms object sync
  - Sub-50ms cursor sync
  - Operation queue system
  - Enhanced conflict resolution
  - Visual feedback system
  - Connection status indicators
  - Performance monitoring dashboard
  - State reconciliation
  - Enhanced crash recovery
- Document breaking changes (if any)
- Document migration notes (if any)
- Include performance improvements

### Production monitoring setup
- Enable production monitoring:
  - Performance metrics logging
  - Error tracking
  - Usage analytics
- Set up alerts:
  - Performance degradation
  - High error rates
  - Connection issues
  - Queue size warnings
- Create monitoring dashboard:
  - Real-time performance metrics
  - User count
  - Error rates
  - Firestore usage

**Deliverable:**
✅ v3 deployed to production. Documentation complete. Monitoring active. Release notes published. v3 COMPLETE.

---

## v3 Completion Checklist

### Performance ✓
- [ ] Object sync consistently <100ms (measured in production)
- [ ] Cursor sync consistently <50ms (measured in production)
- [ ] 60 FPS maintained with 1000+ shapes
- [ ] 10+ concurrent users supported smoothly
- [ ] Rapid edits (10+/sec) handled without corruption
- [ ] Performance monitoring dashboard working (Shift+P)

### Network Resilience ✓
- [ ] Operation queue system implemented and tested
- [ ] IndexedDB storage for offline operations
- [ ] Automatic reconnection with exponential backoff
- [ ] Queue processing on reconnect
- [ ] Connection status indicator always visible
- [ ] Clear notifications for all connection events

### State Management ✓
- [ ] State reconciliation running (60s intervals)
- [ ] Reconciliation after reconnect
- [ ] Enhanced crash recovery (10s auto-save)
- [ ] Smart recovery merge logic
- [ ] Zero data loss in testing scenarios
- [ ] State validation and auto-correction

### Conflict Resolution ✓
- [ ] Last-write-wins enforced with server timestamps
- [ ] Real-time edit highlights (2s duration)
- [ ] Conflict override notifications
- [ ] Last editor display in properties panel
- [ ] Hover tooltip showing last editor
- [ ] Active editing indicators

### User Experience ✓
- [ ] Connection status in navigation bar
- [ ] Expanded connection menu with details
- [ ] Notification toast system working
- [ ] Notification grouping and smart dismissal
- [ ] Visual feedback for all sync events
- [ ] Performance dashboard accessible (Shift+P)

### Code Quality ✓
- [ ] All composables documented (JSDoc)
- [ ] All components documented
- [ ] No console errors
- [ ] Linting clean
- [ ] Performance optimizations applied
- [ ] Memory leaks fixed

### Documentation ✓
- [ ] README updated with v3 features
- [ ] Architecture documentation complete
- [ ] Performance documentation complete
- [ ] API documentation complete
- [ ] Release notes published
- [ ] Migration guide (if needed)

### Deployment ✓
- [ ] Production build optimized
- [ ] Firestore rules deployed
- [ ] Firestore indexes deployed
- [ ] Application deployed to Firebase Hosting
- [ ] Production monitoring active
- [ ] Performance alerts configured

---

## Success Metrics Summary

| Requirement | Target | Status |
|-------------|--------|--------|
| Object sync latency | <100ms | 🎯 Measured and enforced |
| Cursor sync latency | <50ms | 🎯 Measured and enforced |
| Zero visible lag | Rapid edits smooth | 🎯 Batching + deduplication |
| Consistent final state | All users see same state | 🎯 Last-write-wins + reconciliation |
| No ghost objects | No duplicates or orphans | 🎯 Validation + reconciliation |
| Refresh mid-edit | Return to exact state | 🎯 Enhanced crash recovery |
| Canvas persists fully | All users disconnect | 🎯 Firestore persistence |
| Auto-reconnect | 30s+ disconnect recovery | 🎯 Exponential backoff + queue |
| Operations queue | Sync on reconnect | 🎯 IndexedDB queue system |
| Connection status | Clear visual indicator | 🎯 Status component in nav |
| Visual feedback | Who last edited | 🎯 Highlights + properties panel |

---

**v3 STATUS: READY FOR IMPLEMENTATION** 🚀

**Total PRs:** 13  
**Estimated Timeline:** 6-8 weeks (depending on team size)  
**Complexity:** High (network resilience, queue system, state reconciliation)  
**Risk Level:** Medium (extensive testing required for offline/online transitions)  

**Next Steps:**
1. Review and approve v3 PRD and task list
2. Prioritize PRs (suggest starting with #1, #2, #3 for quick wins)
3. Set up development environment for v3 work
4. Begin implementation with PR #1 (Performance Monitoring)

