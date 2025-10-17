# CollabCanvas v5: Performance Optimization Tasks

**Goal:** Optimize canvas performance to restore 1000+ shapes in under 5 seconds and maintain smooth real-time collaboration for multiple users.

**Current Performance:** ~30+ seconds to restore 1000 shapes
**Target Performance:** <5 seconds to restore 1000 shapes

---

## PR #1: Foundation - Batch Operations & Sync Control

**Goal:** Implement core batch write operations and sync pause/resume functionality

**Expected Impact:** 1000 shapes in ~10-15 seconds (50% improvement)

### Tasks:

#### 1.1 Add Batch Write Operations to Firestore Composable
- [ ] Add `saveShapesBatch()` function to `ui/src/composables/useFirestore.js`
  - Accept array of shapes and canvasId
  - Split shapes into 500-operation chunks (Firestore batch limit)
  - Create writeBatch for each chunk
  - Execute all batches in parallel with Promise.all
  - Add error handling and retry logic
  - Track performance metrics with existing tracking functions

#### 1.2 Add Batch Delete Operations
- [ ] Add `deleteShapesBatch()` function to `ui/src/composables/useFirestore.js`
  - Similar pattern to saveShapesBatch
  - Used for clearing canvas before version restore
  - Handle 500-operation batch limit

#### 1.3 Add Sync Pause/Resume to Shapes Composable
- [ ] Add `syncPaused` ref to `ui/src/composables/useShapes.js`
- [ ] Implement `pauseSync()` function
  - Set syncPaused flag to true
  - Log pause status
- [ ] Implement `resumeSync()` function
  - Set syncPaused flag to false
  - Force reload from Firestore to sync state
  - Log resume status
- [ ] Modify `startRealtimeSync()` to check syncPaused flag
  - Return early from listener callback if paused
  - Prevent processing of real-time updates during bulk ops

#### 1.4 Update Version Restore Flow
- [ ] Refactor `handleRestoreVersion()` in `ui/src/views/CanvasView.vue`
  - Call pauseSync() before operations
  - Use deleteShapesBatch() to clear current shapes
  - Use saveShapesBatch() to create version shapes
  - Call resumeSync() after completion
  - Add try/catch/finally for error handling
  - Ensure sync resumes even on error

#### 1.5 Export New Functions
- [ ] Export `saveShapesBatch` and `deleteShapesBatch` from `useFirestore.js`
- [ ] Export `pauseSync` and `resumeSync` from `useShapes.js`
- [ ] Update imports in `CanvasView.vue`

#### 1.6 Testing
- [ ] Test batch operations with 100 shapes
- [ ] Test batch operations with 1000 shapes
- [ ] Test error handling when batch fails
- [ ] Verify sync resumes correctly after bulk operation
- [ ] Test with multiple users - ensure other users see updates
- [ ] Measure and log restore time

**Deliverable:** Version restore uses batch operations and temporarily pauses real-time sync during bulk operations

---

## PR #2: Compression Infrastructure

**Goal:** Add compression utilities and prepare for snapshot storage

**Expected Impact:** Foundation for Phase 3 optimization

### Tasks:

#### 2.1 Install Compression Library
- [ ] Run `cd ui && npm install lz-string`
- [ ] Verify dependency added to `ui/package.json`
- [ ] Test import works in development

#### 2.2 Create Compression Utility
- [ ] Create new file `ui/src/utils/compression.js`
- [ ] Import LZString from 'lz-string'
- [ ] Implement `compressShapes(shapes)` function
  - Accept array of shape objects
  - Convert to JSON string
  - Compress with LZString.compressToUTF16()
  - Return compressed string
- [ ] Implement `decompressShapes(compressed)` function
  - Accept compressed string
  - Decompress with LZString.decompressFromUTF16()
  - Parse JSON and return array
  - Add error handling for corrupt data
- [ ] Add `estimateCompressedSize(shapes)` helper
  - Calculate compressed size in bytes
  - Warn if approaching 1MB Firestore limit

#### 2.3 Add Compression Tests
- [ ] Create test file `ui/tests/compression.spec.js`
- [ ] Test compression/decompression roundtrip
- [ ] Test with 100 shapes
- [ ] Test with 1000 shapes
- [ ] Test with 5000 shapes
- [ ] Verify compressed size is under 1MB for 5000 shapes
- [ ] Test error handling with invalid compressed data

**Deliverable:** Compression utility ready for snapshot implementation

---

## PR #3: Snapshot Storage System

**Goal:** Implement canvas snapshot documents for fast bulk loading

**Expected Impact:** 1000 shapes in ~3-5 seconds (TARGET MET)

### Tasks:

#### 3.1 Update Firestore Rules
- [ ] Add snapshot document rules to `firestore.rules`
  - Add match rule for `/canvases/{canvasId}/snapshot`
  - Allow read if user has canvas access (same as shapes)
  - Allow write if user has canvas access
  - Pattern after existing shape rules

#### 3.2 Add Snapshot CRUD Functions
- [ ] Add snapshot functions to `ui/src/composables/useFirestore.js`
- [ ] Implement `updateCanvasSnapshot(canvasId, shapes)`
  - Get reference to `canvases/{canvasId}/snapshot` document
  - Compress shapes array using compression utility
  - Check compressed size vs 1MB limit
  - Save with setDoc (merge: true)
  - Include shapeCount, lastUpdated timestamp, version number
  - Add error handling and logging
- [ ] Implement `loadCanvasSnapshot(canvasId)`
  - Get reference to snapshot document
  - Fetch with getDoc
  - Return null if doesn't exist (graceful fallback)
  - Decompress shapes if exists
  - Validate decompressed data
  - Add error handling for corrupt snapshots

#### 3.3 Export Snapshot Functions
- [ ] Export `updateCanvasSnapshot` from `useFirestore.js`
- [ ] Export `loadCanvasSnapshot` from `useFirestore.js`
- [ ] Import in files that need them

#### 3.4 Testing
- [ ] Test snapshot creation with 100 shapes
- [ ] Test snapshot creation with 1000 shapes
- [ ] Test snapshot loading
- [ ] Test graceful fallback when snapshot doesn't exist
- [ ] Test error handling with corrupt snapshot
- [ ] Verify snapshot size stays under 1MB

**Deliverable:** Canvas snapshot documents can be created and loaded

---

## PR #4: Integrate Snapshots into Version System

**Goal:** Use snapshots for fast version restoration

**Expected Impact:** Target performance achieved (<5s for 1000 shapes)

### Tasks:

#### 4.1 Update Version Creation
- [ ] Modify `createVersion()` in `ui/src/composables/useVersions.js`
- [ ] Import compression utilities
- [ ] Compress shapes array before storing
- [ ] Update payload structure:
  - Add `compressed` field with compressed shapes
  - Add `shapeCount` field
  - Remove or deprecate `shapes` array field
- [ ] Call `updateCanvasSnapshot()` after version creation
  - Creates/updates the canvas snapshot document
  - Used for fast restore later

#### 4.2 Update Version Listing
- [ ] Modify `listVersions()` in `useVersions.js`
- [ ] Handle both old format (shapes array) and new format (compressed)
- [ ] Display shapeCount in version metadata

#### 4.3 Update Version Restore Flow
- [ ] Update `handleRestoreVersion()` in `CanvasView.vue`
- [ ] Import snapshot functions from useFirestore
- [ ] Import compression utilities
- [ ] Implement new restore flow:
  1. Pause sync
  2. Try loading from canvas snapshot first (fastest)
  3. Fallback to decompressing version.compressed if no snapshot
  4. Fallback to version.shapes for old versions
  5. Use batch operations to write shapes
  6. Update canvas snapshot for next time
  7. Resume sync
- [ ] Add progress tracking and logging
- [ ] Add error handling with fallbacks

#### 4.4 Migration Support
- [ ] Handle existing versions with `shapes` array (old format)
- [ ] Decompress `compressed` field for new versions
- [ ] Log warnings for very old data format

#### 4.5 Testing
- [ ] Test version creation with compression
- [ ] Test version restore from snapshot (fast path)
- [ ] Test version restore from compressed version (fallback)
- [ ] Test version restore from old format (backward compat)
- [ ] Measure restore time for 1000 shapes
- [ ] Verify <5 second target is met
- [ ] Test with multiple users during restore

**Deliverable:** Version restore uses snapshots and achieves <5 second target for 1000 shapes

---

## PR #5: Viewport Culling & Rendering Optimization

**Goal:** Optimize rendering to handle 1000+ shapes smoothly during collaboration

**Expected Impact:** Smooth 30+ FPS with 1000+ shapes visible

### Tasks:

#### 5.1 Activate Viewport Culling
- [ ] Import and activate `useViewportCulling` in `CanvasView.vue`
- [ ] Pass stage ref to viewport culling composable
- [ ] Create `visibleShapesList` computed property
  - Return all shapes if <100 shapes (no culling needed)
  - Filter shapes by visibility if 100+ shapes
  - Use culling composable's isVisible function
- [ ] Update template to render `visibleShapesList` instead of `shapesList`
  - Update Rectangle components
  - Update Circle components
  - Update Line components
  - Update TextShape components

#### 5.2 Update Culling on Pan/Zoom
- [ ] Call `updateVisibleShapes()` in handleMouseMove (during pan)
- [ ] Call `updateVisibleShapes()` in handleWheel (during zoom)
- [ ] Debounce updates to avoid excessive recalculations
- [ ] Add throttling to limit updates to 60fps max

#### 5.3 Performance Monitoring
- [ ] Add viewport culling metrics to performance monitor
- [ ] Display visible/total shape count
- [ ] Display culling ratio
- [ ] Log culling statistics in console

#### 5.4 Testing
- [ ] Test with 100 shapes (no culling should occur)
- [ ] Test with 1000 shapes
  - Verify only ~50-200 shapes rendered at a time
  - Pan around and verify shapes appear/disappear smoothly
  - Zoom in/out and verify culling updates
- [ ] Test with 5000 shapes
- [ ] Measure FPS with performance monitor
- [ ] Verify 30+ FPS maintained during panning

**Deliverable:** Viewport culling actively reduces rendered shapes for smooth performance with 1000+ shapes

---

## PR #6: Progressive Loading & UX Improvements

**Goal:** Provide visual feedback during bulk operations

**Expected Impact:** Better user experience during version restore and initial canvas load

### Tasks:

#### 6.1 Add Loading Progress State
- [ ] Add `bulkLoadProgress` ref to `CanvasView.vue`
  - Structure: { active: boolean, current: number, total: number, operation: string }
- [ ] Create `BulkLoadingIndicator.vue` component
  - Display progress bar
  - Show current/total counts
  - Show operation name ("Restoring version...", "Loading canvas...")
  - Animated spinner
  - Estimated time remaining

#### 6.2 Integrate Progress Tracking
- [ ] Update `handleRestoreVersion()` to report progress
  - Set progress.active = true at start
  - Update progress.current after each batch
  - Set progress.active = false when complete
- [ ] Update batch operations to accept progress callback
  - Report progress after each 500-shape batch
- [ ] Show progress in UI
  - Display BulkLoadingIndicator component when active
  - Position as overlay over canvas

#### 6.3 Add Progress to Initial Load
- [ ] Update initial canvas load in onMounted
  - Show progress when loading shapes
  - Display "Loading canvas..." message

#### 6.4 Optimize Loading Sequence
- [ ] Load canvas metadata first (show canvas info immediately)
- [ ] Load shapes in background
- [ ] Show skeleton UI while loading
- [ ] Progressive rendering: render shapes as they load

#### 6.5 Testing
- [ ] Test progress indicator with 1000 shapes
- [ ] Verify accurate progress percentage
- [ ] Test cancellation/error handling
- [ ] Verify indicator disappears on completion
- [ ] Test with slow network conditions

**Deliverable:** Users see clear progress feedback during bulk operations

---

## PR #7: Performance Testing & Benchmarking

**Goal:** Verify performance targets are met and establish performance regression tests

**Expected Impact:** Confidence in production performance

### Tasks:

#### 7.1 Create Performance Test Suite
- [ ] Create `ui/tests/performance/` directory
- [ ] Create `canvas-performance.spec.js`
  - Test version restore with 1000 shapes (<5s target)
  - Test initial canvas load with 1000 shapes (<3s target)
  - Test rendering with 1000+ shapes (30+ FPS target)
  - Test memory usage with 5000 shapes (<500MB target)
  - Test real-time update latency (<200ms target)

#### 7.2 Performance Benchmarking Script
- [ ] Create `ui/scripts/performance-benchmark.js`
  - Automate performance testing
  - Generate reports with metrics
  - Compare against baselines
  - Detect performance regressions

#### 7.3 Stress Testing
- [ ] Test with 10,000 shapes
  - Verify graceful degradation
  - Verify no crashes or memory leaks
  - Document behavior and limits
- [ ] Test with 5 concurrent users
  - All users creating/editing shapes simultaneously
  - Verify collaboration remains smooth
  - Measure latency and sync times

#### 7.4 Edge Case Testing
- [ ] Test version restore when snapshot is corrupted
  - Should fallback to compressed version
- [ ] Test when compressed version is corrupted
  - Should fallback to original shapes array
- [ ] Test when Firestore is slow/unreliable
  - Verify timeout and retry logic works
- [ ] Test with network disconnect during restore
  - Verify operation queue catches failures

#### 7.5 Performance Documentation
- [ ] Document performance characteristics
- [ ] Document performance best practices
- [ ] Update TESTING_GUIDE.md with performance tests
- [ ] Add performance metrics to README.md

**Deliverable:** Comprehensive performance test suite validates targets are met

---

## PR #8: Migration & Cleanup (Optional)

**Goal:** Migrate existing data and clean up deprecated code

**Expected Impact:** Improved codebase maintainability

### Tasks:

#### 8.1 Data Migration Script
- [ ] Create Cloud Function or script to backfill snapshots
  - Query all canvases
  - Load shapes for each canvas
  - Generate and save snapshot
  - Run incrementally to avoid quota limits
- [ ] Schedule migration for low-traffic periods
- [ ] Monitor migration progress

#### 8.2 Deprecation Cleanup
- [ ] Mark old version format as deprecated
- [ ] Add migration warnings in logs
- [ ] Document migration timeline
- [ ] Plan removal of old format in v6

#### 8.3 Code Cleanup
- [ ] Remove unused compression code paths
- [ ] Clean up old performance monitoring code
- [ ] Update comments and documentation
- [ ] Remove debug logging

**Deliverable:** All existing canvases have snapshots, codebase is cleaner

---

## Success Criteria

### Phase 1 (PR #1): Batch Operations
- ✅ Version restore time: <15s for 1000 shapes
- ✅ Batch operations work correctly
- ✅ Sync pause/resume works reliably

### Phase 2 (PRs #2-4): Snapshot Storage
- ✅ Version restore time: <5s for 1000 shapes (TARGET)
- ✅ Initial canvas load: <3s for 1000 shapes
- ✅ Compression works reliably
- ✅ Backward compatibility maintained

### Phase 3 (PRs #5-6): Rendering & UX
- ✅ Render FPS: 30+ FPS with 1000+ shapes
- ✅ Smooth panning and zooming
- ✅ Clear progress feedback for users

### Phase 4 (PR #7): Validation
- ✅ All performance targets validated
- ✅ Regression tests in place
- ✅ Works with 10,000 shapes

---

## Rollout Plan

1. **PR #1** - Deploy to staging, test with team
2. **PR #2-3** - Deploy to staging, verify compression works
3. **PR #4** - Deploy to production (backward compatible)
4. **PR #5** - Deploy to production (rendering improvement)
5. **PR #6** - Deploy to production (UX improvement)
6. **PR #7** - Run continuously in CI/CD
7. **PR #8** - Run migration script over 1 week

---

## Risk Mitigation

- All changes are backward compatible
- Snapshots are additive (old code continues to work)
- Graceful fallbacks at every level
- Comprehensive error handling
- Performance regression tests prevent future issues
- Incremental rollout allows for early detection of issues

---

## Notes

- PRs #1-4 are required for performance target
- PRs #5-6 improve UX and rendering
- PR #7 validates and protects improvements
- PR #8 can be done incrementally over time
- Each PR is independently testable and deployable

