PRD v4 - Task List & PR Breakdown

PR #1: Editor Ergonomics & MRU (PRD v4)
Purpose: Undo/redo grouping, keyboard/text editing polish, and MRU swatches
Tasks:

 Update undo/redo (per-canvas stacks, grouping, prevent self-tracking)
 
 Add grouping support in useUndoRedo (begin/end group or equivalent)
 Clear stacks on canvas switch
 
 
 Apply command-level grouping in CanvasView
 
 Group multi-shape Delete, Duplicate, Z-index ops, and multi-shape nudges (one step per command)
 
 
 Keyboard/text-edit behavior
 
 Disable Delete/Duplicate while editing text
 Arrow keys move caret in text editor; shapes do not nudge while editing
 Nudge amounts: 1px, Shift=10px; record grouped undo entries
 
 
 MRU swatches in PropertiesPanel
 
 LocalStorage-backed MRU per device; separate lists for fill and stroke; cap 5; most-recent-first
 Render 5-swatch rows; click applies color and updates MRU; update MRU on native picker changes
 Multi-selection support and undoable property updates
 
 
Tests:
 
 Unit: useUndoRedo grouping; MRU utility (add/dedupe/cap/order/persist)
 Integration: grouped operations; PropertiesPanel MRU apply/undo; text-edit keyboard behavior
 E2E: two-user smoke covering grouped undo and MRU persistence
 
 
Deliverable:
 ✅ Editing ergonomics aligned to PRD v4 and MRU implemented in PropertiesPanel.


PR #2: Z-Index Normalization & Ordering (PRD v4)
Purpose: Normalize z-index when gaps >1000 and preserve relative order
Tasks:

 Normalization routine
 
 Renumber shapes 0..N preserving visual order when gap >1000
 Trigger after bulk ops; persist to Firestore; handle conflicts (last-write-wins)
 
 
 Layer operations
 
 Ensure multi-selection bring/send/forward/backward preserve relative ordering
 Parity between context menu and shortcuts confirmed
 
 
Tests:
 
 Unit: normalization correctness preserves order
 Integration: multi-selection ordering after operations
 E2E: cross-client convergence after mixed layer ops and normalization
 
 
Deliverable:
 ✅ Stable z-index behavior with periodic normalization and correct ordering.


PR #3: Version History & Owner-Only Restore (PRD v4)
Purpose: Canvas versioning (cadence, retention) with owner-only visibility and restore
Tasks:
 
 Firestore model & security
 
 Subcollection: /canvases/{canvasId}/versions/{versionId}; payload (shapes, optional metadata, createdBy, serverTimestamp, summary)
 Rules: owner-only can view list and restore
 
 
 Snapshot cadence & retention
 
 On open, every 5 minutes, after ≥10 ops, and manual “Save version”
 Retain last 50 versions; prune oldest
 
 
 UI & restore flow
 
 Version History panel (owner-only) with list and Restore action (confirmation)
 Add VersionHistory.vue and wire from NavBar (owner-only button) and CanvasView
 Implement useVersions composable (createVersion, listVersions, retention)
 Restore replaces state, persists to Firestore, and adds local undoable “restore”
 
 
 Documentation
 
 Update README/API docs to include versioning behavior and permissions
 
 
Tests:
 
 Unit: create/read/prune versions; permission checks
 Integration: restore sets exact state; undoing restore reverts
 E2E: owner vs non-owner access and restore
 
 
Deliverable:
 ✅ Version history implemented with owner-only access and restore per PRD v4.
