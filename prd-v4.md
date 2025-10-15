## PRD: Canvas Editing Essentials (v4)

### Overview
Add/ensure core editor ergonomics:
- Undo/redo with keyboard shortcuts
- Keyboard shortcuts for delete, duplicate, and arrow-key nudging
- Z-index management (bring/send, forward/backward)
- Recent color swatches (last 5 used) in color pickers (fill and stroke)
- Version history with restore (owner-only)

### Goals
- Ensure existing features behave predictably across multi-selection and multi-user.
- Introduce MRU color swatches for fast reuse.
- Provide version history snapshots with restore.

### Non-Goals
- No full “design tokens” system or named text/paragraph styles in this scope.
- No complex merge tools for version history; restore is whole-canvas.

### Users/Stories
- As an editor, I can undo/redo changes via shortcuts.
- I can delete/duplicate quickly and nudge shapes precisely.
- I can reorder layers with shortcuts and context menu.
- I can reapply recently used colors in 1 click.
- I can restore the canvas to a previous version if things go wrong (owner-only).

### Requirements and Acceptance Criteria

#### 1) Undo/Redo
- Scope:
  - Local-only stacks per user (not synchronized).
  - Per-canvas stacks (clear when switching canvases or on refresh).
  - Track create, delete, update (move/resize/rotate/property changes).
  - Multi-shape operations are grouped into a single undo step.
  - Command-level grouping applies to delete, duplicate, z-index changes, and multi-shape nudges (one step per command).
  - Text editing is a single undo step on commit (blur/Enter), not per keystroke.
  - Stack size: 50 actions.
- Shortcuts:
  - Undo: Cmd/Ctrl+Z
  - Redo: Cmd/Ctrl+Shift+Z and Cmd/Ctrl+Y
- Behavior:
  - Undo create => delete the created shape(s).
  - Undo delete => recreate shape(s) with prior properties (ID may differ).
  - Undo update => restore prior values.
  - Redo mirrors above.
- Constraints:
  - Do not log undo/redo operations as new actions.
  - Does not undo actions from other users.
- Acceptance:
  - With any of the above actions performed, shortcuts correctly revert/reapply state and selection stays consistent.
  - Can undo/redo arrow-key nudges and property changes.
  - Disables undo/redo when stacks are empty.

#### 2) Keyboard Shortcuts (Delete, Duplicate, Arrow Move)
- Shortcuts:
  - Delete/Backspace: delete selected shapes.
  - Duplicate: Cmd/Ctrl+D.
  - Arrow keys: move by 1px; with Shift, move by 10px.
- Behavior:
  - Deleting >5 shapes prompts a confirmation modal; otherwise deletes immediately.
  - Duplicates have new IDs, +20px offset, and move to top z-index.
  - Delete and Duplicate are disabled during text edit mode.
  - While editing text, Arrow keys move the text caret within the editor; shapes do not nudge.
- Acceptance:
  - Shortcuts are cross-platform (Cmd on macOS, Ctrl on others).
  - Deleting adds a reversible action to undo stack.
  - Duplicated shapes become the sole active selection.

#### 3) Z-Index Management
- Shortcuts:
  - Bring to front: Cmd/Ctrl+]
  - Send to back: Cmd/Ctrl+[
  - Bring forward: Cmd/Ctrl+Shift+]
  - Send backward: Cmd/Ctrl+Shift+[
- Behavior:
  - Works for single and multi-selection, maintaining relative order.
  - Persist z-index changes via Firestore; normalize when z-index gaps exceed 1000.
  - No restrictions on reordering (including text or locked states unless otherwise specified elsewhere).
  - Context menu exposes the same four actions.
- Acceptance:
  - Visual stacking reflects commands immediately and after remote updates.
  - Multi-user updates converge (last-write-wins based on server timestamps).
  - No negative z-index values.

#### 4) Recent Colors (MRU 5)
- Scope:
  - Show 5 most recently used colors (per device) next to existing color inputs in `PropertiesPanel`.
  - Applies to both fill and stroke color pickers.
  - MRU is per device (localStorage) and shared across canvases for the same device/user profile; not synchronized between users.
  - Separate MRU lists are maintained for fill and for stroke.
  - Update MRU when user selects a new color (via native color input or MRU swatch).
  - Most-recent-first, unique, cap at 5.
- UI:
  - Row of 5 swatches beside/below the color input.
  - Hover tooltip shows hex; clicking applies color and updates MRU order.
- Acceptance:
  - MRU persists across sessions in same browser profile.
  - Selecting an MRU swatch applies immediately and records an undoable update.
  - If fewer than 5 colors exist, show available swatches only.

#### 5) Version History with Restore
- Scope:
  - Periodic and event-based snapshots stored in Firestore under each canvas (e.g., `canvases/{canvasId}/versions/{versionId}`).
  - Snapshot includes: shapes with properties, canvas metadata (optional), createdBy, serverTimestamp, summary of change trigger.
- Creation Policy:
  - Snapshot on: canvas open (initial), every 5 minutes, and after significant batches (≥10 operations) or explicit “Save version”.
  - Retention: keep last 50 versions; prune oldest.
- Permissions:
  - Only the canvas owner can view the Version History list and perform Restore; non-owners cannot view or restore.
- UI:
  - “Version History” panel listing versions with timestamp, author, count of shapes; preview optional; action to Restore (with confirmation).
- Restore:
  - Replace local state and persist to Firestore; adds an undoable action “restore” locally (so user can revert).
  - Notify other clients via normal sync.
- Acceptance:
  - Versions appear within seconds of creation with accurate metadata.
  - Restoring sets canvas to that version exactly (IDs and properties).
  - Pruning respects the max count without breaking retrieval.

### Performance & Reliability
- Target up to ~2000 shapes per canvas.
- Undo/redo: O(1) stack ops; cap depth to 50.
- MRU colors: localStorage read/write O(1).
- Z-index operations: normalize when gaps exceed 1000.
- Version snapshots: keep payloads compact where reasonable; throttle to avoid excessive writes; batch reads for history panel.

### Telemetry (Optional)
- Count undo/redo usage, MRU clicks, and version restores.

### QA Checklist (Existing Features)
- Undo/Redo:
  - Verify Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z/ Cmd/Ctrl+Y across create/delete/update.
  - Confirm actions from other users aren’t included.
  - Multi-shape operations undo in a single step; text edit undo is per commit.
- Shortcuts:
  - Delete/Backspace with ≤5 and >5 selection (modal).
  - Duplicate selects new shapes, offsets +20px, at top z.
  - Arrow vs Shift+Arrow nudge amounts correct and undoable.
  - Delete/Duplicate disabled during text edit mode.
- Z-Index:
  - All four commands work on single/multi-selection; order preserved.
  - Reflects correctly after reload and across clients.
- MRU Colors:
  - MRU shows in `PropertiesPanel` for fill and stroke; persists and applies correctly.
- Version History:
  - Versions list populates as per cadence; owner-only restore works and is undoable locally.
