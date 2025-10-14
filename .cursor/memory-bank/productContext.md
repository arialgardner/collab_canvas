# Product Context: CollabCanvas

## Why This Project Exists
CollabCanvas enables real-time collaborative design work in a web browser. Multiple users can simultaneously create and manipulate shapes on a shared canvas, seeing each other's changes instantly. The goal is to provide a bulletproof foundation for collaborative visual work that will eventually support AI-powered canvas agents.

## Problems It Solves

### Real-Time Collaboration Challenges
- **Sync Conflicts:** Handles multiple users editing simultaneously with last-write-wins resolution
- **Performance:** Maintains 60 FPS even with 1000+ shapes and 10+ users
- **Latency:** <100ms sync for shapes, <50ms for cursors
- **State Consistency:** Optimistic updates with server reconciliation ensure users see changes immediately

### User Experience Goals
- **Instant Feedback:** All interactions feel immediate (optimistic updates)
- **Smooth Performance:** 60 FPS maintained during all operations
- **Clear Visibility:** See other users' cursors, selections, and changes in real-time
- **Intuitive Controls:** Familiar design tool patterns (select, move, resize, rotate)
- **Error Recovery:** Graceful handling of network failures and conflicts

## How It Should Work

### Core User Flows

#### Canvas Management
1. User logs in (Email/Password or Google)
2. Sees dashboard with canvas thumbnails
3. Can create new canvas or open existing
4. Share canvas link for collaboration
5. Manage permissions (Owner/Editor/Viewer)

#### Shape Creation
1. Select tool from toolbar (Rectangle, Circle, Line, Text)
2. Tool stays active until ESC or Select tool clicked
3. Create shapes with appropriate interaction:
   - Rectangle/Circle: Single click places shape
   - Line: Click and drag from start to end
   - Text: Double-click to create/edit
4. Shapes appear immediately for user, sync to others <100ms

#### Shape Manipulation
1. Click shape to select (topmost when overlapping)
2. Drag to move (smooth, real-time updates)
3. Resize with 8 handles (shape-specific behavior)
4. Rotate with rotation handle (shape-specific)
5. All changes sync in real-time to collaborators

#### Multi-Selection
1. Shift+click to add shapes to selection
2. Drag to select (marquee selection)
3. Group operations maintain relative positions
4. Each user has independent selection (not synchronized)

#### Layer Management
1. Use context menu or keyboard shortcuts
2. Bring to front/back, forward/backward operations
3. Z-index automatically normalized when gap >1000
4. Changes sync immediately to all users

### Key Interactions

**Selection:**
- Click: Select single shape
- Shift+Click: Add/remove from selection  
- Drag on empty: Marquee selection
- Ctrl+A: Select all
- ESC: Deselect all

**Clipboard:**
- Ctrl+C: Copy selected shapes
- Ctrl+V: Paste with +20px offset
- Ctrl+D: Duplicate selected shapes
- Delete/Backspace: Delete selected shapes

**Layers:**
- Ctrl+]: Bring to front
- Ctrl+[: Send to back
- Ctrl+Shift+]: Bring forward
- Ctrl+Shift+[: Send backward

**Undo/Redo:**
- Ctrl+Z: Undo last action (local, per-user)
- Ctrl+Y: Redo action
- Tracks individual property changes
- Does not undo other users' actions

**Navigation:**
- Drag empty canvas: Pan
- Touch pinch: Zoom (desktop touch devices)
- Zoom buttons: Zoom in/out
- Ctrl+0: Reset zoom to 100%

### Real-Time Collaboration Experience

**Presence Awareness:**
- See other users' cursors with names and avatars (initials)
- Cursors visible only when in same viewport area
- Cursors persist for 10 seconds after idle
- Online user count displayed in navigation

**Conflict Resolution:**
- Last write wins (server timestamp)
- Visual feedback when local change overwritten (brief highlight)
- Text editing locked to first user (prevents simultaneous edits)
- Delete conflicts show notification: "Shape was deleted by [User]"

**Network Resilience:**
- Optimistic updates continue during network issues
- "Changes failed to sync" message after 5 second timeout
- 3 automatic retry attempts
- On reconnect: discard offline changes, sync fresh state
- Browser crash recovery via localStorage (auto-save every 30 seconds)

### Performance Experience
- Smooth 60 FPS during all interactions
- Viewport culling (off-screen shapes not rendered)
- Throttled network updates (16ms intervals during drag)
- Performance warning if FPS drops below 30 for >5 seconds
- Efficient rendering with Konva layer caching

## User Personas

### Primary: Collaborative Designer
- Works with team on visual designs
- Needs real-time feedback and co-creation
- Values smooth performance and reliability
- Expects familiar design tool interactions

### Secondary: Individual Creator
- Creates designs alone but may share for feedback
- Needs reliable state persistence
- Values clean, intuitive interface
- May work on large, complex canvases

### Future: AI-Assisted User
- Will leverage AI agent for canvas manipulation
- Needs clean, programmatic API
- Expects AI to understand and modify canvas state
- Values consistency and predictability

## Success Metrics

**Technical:**
- 60 FPS with 1000+ shapes ✓
- <100ms shape sync latency ✓
- <50ms cursor sync latency ✓
- 10+ concurrent users supported ✓

**User Experience:**
- Zero data loss during collaboration ✓
- Smooth, responsive interactions ✓
- Clear error messages and recovery ✓
- Intuitive keyboard shortcuts ✓

**Product:**
- Multi-user canvas collaboration ✓
- Complete shape system ✓
- Canvas management and sharing ✓
- Ready for AI integration ✓

