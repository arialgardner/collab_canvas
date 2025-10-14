# CollabCanvas Phase 2 - Task List & PR Breakdown
**Goal:** Bulletproof collaborative canvas with full shape system, transformations, selection, and layer management

**Updated Requirements from Phase-2.md PRD:**
- Expand beyond rectangles to circles, lines, and text layers
- Full object transformations (move, resize, rotate) with real-time sync
- Robust selection system (single, multiple, shift-click, drag-to-select)
- Layer management with z-index control
- Essential operations (delete, duplicate, copy/paste)
- Canvas dashboard for managing multiple canvases
- Role-based permissions (Owner/Editor/Viewer)
- Performance targets: 1000+ shapes at 60 FPS, 10+ concurrent users
- Desktop-focused (responsive design for various desktop sizes)

---

## PR #1: Enhanced Shape System Foundation
**Purpose:** Extend MVP to support multiple shape types with unified data model

### Migrate rectangle collection to shapes collection
- Rename Firestore collection from `/rectangles` to `/shapes`
- Add `type` discriminator field to existing rectangles
- Add `zIndex` field for layer management (new shapes get `currentMaxZIndex + 1`)
- Add `rotation` field (degrees 0-360 with wraparound)
- Update Firestore security rules for shapes collection

### Update base shape data model
- Create `src/types/shapes.ts` with TypeScript interfaces
- Define `BaseShape` interface with common properties (id, type, zIndex, rotation, timestamps)
- Define `Rectangle` interface extending BaseShape
- Define `Circle` interface extending BaseShape (center x,y, radius)
- Define `Line` interface extending BaseShape (points array [x1,y1,x2,y2])
- Define `Text` interface extending BaseShape (text content, font properties, 300 char max)

### Update shapes composable
- Rename `useRectangles.js` to `useShapes.js`
- Support multiple shape types in reactive Map
- Implement `createShape(type, properties)` with shape-specific defaults
- Implement `updateShape(id, updates)` for any shape type
- Add z-index management functions (getMaxZIndex, getMinZIndex)
- Add periodic z-index normalization (0 to N range) to prevent runaway values

### Update Konva rendering system
- Modify shape rendering to handle different types
- Create shape factory function for Konva objects (Rectangle, Circle, Line, Text)
- Update event handlers for multi-shape support
- Ensure all existing rectangle functionality still works

**Deliverable:**
✅ Shape system foundation supports multiple types. Rectangles still work. Ready for new shapes.

---

## PR #2: Circle and Line Shape Implementation  
**Purpose:** Add circle and line shape creation and manipulation

### Implement Circle shape
- Add circle creation tool to toolbar (keyboard: C)
- Implement click-to-create circles (click sets center, default 50px radius)
- Create `src/components/Circle.vue` with Konva Circle rendering
- Handle circle-specific resize behavior (4 handles: N, S, E, W adjusting radius)
- Circle rotation stored but no rotation handle shown (circles visually identical)
- Default color: #EF4444 (red)
- Minimum radius: 5px

### Implement Line shape  
- Add line creation tool to toolbar (keyboard: L)
- Implement click-and-drag line creation (start point to end point)
- Create `src/components/Line.vue` with Konva Line rendering
- Handle line-specific resize behavior (endpoint handles only, stretch longer/shorter)
- Line rotation around midpoint between endpoints
- Minimum length validation (10px, shorter lines not created - no feedback)
- Default color: #000000 (black)

### Add shape creation toolbar
- Create `src/components/Toolbar.vue`
- Add tool buttons: Rectangle (R), Circle (C), Line (L), Select (V)
- Implement tool state management (tools stay active until ESC or Select clicked)
- Add keyboard shortcuts: R, C, L, V
- Visual feedback for active tool
- Position: Top horizontal toolbar on desktop

### Update canvas interaction system
- Detect clicks on empty canvas vs. shape clicks (topmost shape when overlapping)
- Route creation events to appropriate shape creators
- Handle tool-specific cursor changes
- Prevent shape creation outside canvas bounds (0 to canvas dimensions)
- Coordinate validation: positive values only

**Deliverable:**
✅ Users can create circles and lines. All shape tools work. Shape-specific behaviors implemented.

---

## PR #3: Text Layer System
**Purpose:** Implement text layers with inline editing and formatting

### Implement Text shape creation
- Double-click empty canvas to create text layer
- Double-click existing text to edit (not create new)
- Double-click on non-text shapes has no effect
- Default text: "Text" placeholder for new layers
- Position at top-left corner of click location
- Default color: #000000 (black)

### Create inline text editor
- Build text editing overlay component
- Support immediate typing after creation
- Handle ESC key to finish editing
- Click outside to finish editing
- Maximum 300 characters validation

### Add text formatting toolbar
- Font size dropdown: 12, 14, 16, 18, 24, 32, 48
- Font family: Arial, Helvetica, Times New Roman, Courier, Georgia (system fonts)
- Bold and Italic toggle buttons
- Text alignment buttons (left, center, right)
- Text color picker
- Display toolbar inline near text being edited

### Implement text editing lock system
- **Implementation:** Add `lockedBy` and `lockedAt` fields to text shape document
- First user to double-click gets exclusive edit access
- Show "[User Name] is editing" indicator for other users
- Lock expires after 30 seconds or on user disconnect
- Release lock on ESC, click outside, or unmount

### Text-specific behaviors
- Text box width setting (optional, auto-wraps if set)
- Horizontal resize only (East/West handles)
- Height auto-adjusts to content
- Rotation around center of text bounding box
- Create `src/components/TextShape.vue` for rendering

**Deliverable:**
✅ Full text layer system with inline editing, formatting, and lock-based conflict resolution.

---

## PR #4: Object Transformation System
**Purpose:** Implement move, resize, and rotate operations for all shapes

### Implement universal move/drag system
- Enable dragging for all shape types
- Maintain relative positions for multi-selection moves
- Constrain movement within canvas bounds (keep 20x20px visible minimum)
- Throttle position broadcasts to 16ms (60 FPS) during drag
- Send final position with server timestamp on drag end
- Delta updates (only x, y, lastModified)

### Build resize system with Konva Transformer
- Implement standard 8-handle resize system using Konva.Transformer
- Shape-specific customizations:
  - **Rectangle:** Standard 8-handle resize (all anchors enabled)
  - **Circle:** Custom handling for 4 handles only (N,S,E,W), adjust radius uniformly
  - **Line:** Custom implementation with endpoint handles, stretch line longer/shorter
  - **Text:** Disable vertical resize (only horizontal E/W handles)
- Shift+drag maintains aspect ratio
- Alt+drag resizes from center
- Minimum size constraints:
  - Rectangle: 10x10px
  - Circle: 5px radius
  - Text: 20px width minimum

### Add rotation system
- Rotation handle above bounding box (20px line + 12px circle) using Konva.Transformer
- Rotate around shape center points
- Shift+rotate snaps to 45° increments
- Unlimited rotation with wraparound (360° → 0°, 361° → 1°)
- Shape-specific rotation:
  - Rectangle: Around geometric center
  - Circle: No rotation handle shown (visually identical at all rotations)
  - Line: Around midpoint between endpoints
  - Text: Around center of text bounding box

### Implement transform handles visual design
- Selection indicators:
  - Primary: Blue bounding box (#3B82F6), 2px stroke
  - Multi-selection: Purple dashed (#A855F7), 2px dashed stroke
- Resize handles: 8x8px white squares with blue border
- Rotation handle: 12px blue circle connected by line
- Handle states:
  - Default: White fill, blue border
  - Hover: Light blue fill, darker blue border
  - Active (dragging): Solid blue fill, white border
- Cursor changes based on handle type (resize cursors, rotate cursor)

### Optimize transformation sync
- Throttled updates during drag/resize/rotate (16ms intervals)
- Delta updates (only changed properties, not full objects)
- Final state broadcast on operation completion
- Conflict resolution: last write wins with server timestamps

**Deliverable:**
✅ Full transformation system working for all shapes. Smooth real-time sync of all operations.

---

## PR #5: Selection System Implementation
**Purpose:** Build robust single and multi-selection with marquee selection

### Implement single selection system
- Click any shape to select (topmost z-index when overlapping)
- Show bounding box and transform handles for selected shape
- Update properties panel with selected shape data
- Shift+click to add/remove from selection
- ESC key to deselect all

### Build multi-selection system  
- Shift+click adds shapes to selection
- Show individual bounding boxes for each selected shape
- Additional collective bounding box for group operations
- Group transformations maintain exact relative positions (rigid group movement)
- Independent selection state per user (not synchronized)

### Implement marquee (drag-to-select) system
- Click and drag on empty canvas creates selection rectangle
- Selection rectangle: dashed blue border (#3B82F6), semi-transparent fill (rgba(59,130,246,0.1))
- Select all shapes whose bounds intersect selection rectangle
- Shift+drag adds to existing selection instead of replacing
- Efficient collision detection using bounding box intersection

### Add keyboard selection operations
- Ctrl+A (Cmd+A): Select all shapes on canvas
- ESC: Deselect all shapes
- Cross-platform modifier key detection (Ctrl vs Cmd)

### Multi-user selection independence
- Each user has independent selection state (not synchronized)
- Show other users' selections with dim outline + cursor color
- Tooltip on hover: "Selected by [User Name]"
- Prevent visual conflicts between user selections

**Deliverable:**
✅ Complete selection system: single, multi, marquee. Independent per user. Efficient performance.

---

## PR #6: Layer Management and Z-Index System
**Purpose:** Implement layer ordering with z-index operations

### Implement z-index system
- Add zIndex property to all shapes (integer, higher = on top)
- New shapes get `zIndex = currentMaxZIndex + 1`
- Render shapes in z-index order (sort before rendering)
- Periodic z-index normalization: renumber all shapes 0 to N when gap exceeds 1000

### Add layer operation functions
- Bring to Front: `zIndex = currentMaxZIndex + 1`
- Send to Back: `zIndex = currentMinZIndex - 1` (minimum 0)
- Bring Forward: increment zIndex by 1
- Send Backward: decrement zIndex by 1 (minimum 0)
- Multi-selection: all shapes move together, maintain relative order

### Implement keyboard shortcuts
- Ctrl+] (Cmd+]): Bring to front
- Ctrl+[ (Cmd+[): Send to back
- Ctrl+Shift+]: Bring forward  
- Ctrl+Shift+[: Send backward
- Cross-platform modifier key detection

### Build context menu system
- Create `src/components/ContextMenu.vue`
- Right-click on selected shapes shows context menu:
  - Layer operations: Bring to Front, Bring Forward, Send Backward, Send to Back
  - Object operations: Copy, Paste, Duplicate, Delete
- Right-click on empty canvas:
  - Paste (if clipboard not empty)
  - Select All
- Menu positioning and click-away handling

### Layer conflict resolution  
- Z-index conflicts handled like other write conflicts (last write wins)
- Server timestamp determines winner for simultaneous operations
- Maximum z-index gap enforcement prevents runaway numbers

### Layer operations sync
- Optimistic z-index updates locally
- Broadcast z-index changes to Firestore (delta update)
- All clients receive updates and re-sort shapes
- Handle concurrent layer operations gracefully

**Deliverable:**
✅ Complete layer management with keyboard shortcuts and context menus. Z-index sync working.

---

## PR #7: Essential Operations (Delete, Duplicate, Copy/Paste, Undo/Redo)
**Purpose:** Implement core editing operations with local undo/redo system

### Implement delete operations
- Delete selected shapes with Delete/Backspace keys
- Context menu "Delete" option
- Confirmation modal for multi-selection (>5 shapes): "Delete X shapes?"
- Optimistic local removal, broadcast deleteDoc to Firestore
- Handle delete conflicts: show notification "Shape was deleted by [User Name]"
- Error handling for attempting to edit deleted shapes

### Build duplicate functionality  
- Ctrl+D (Cmd+D): Duplicate selected shapes
- Context menu "Duplicate" option
- Create copies with:
  - New unique IDs
  - +20px x, +20px y offset from originals
  - `zIndex = currentMaxZIndex + 1` for each duplicate
  - Current user as createdBy
  - Server timestamp for creation
- Duplicates immediately selected (originals deselected)
- Multi-selection: duplicate all shapes, maintain relative positions

### Implement copy/paste system
- Ctrl+C (Cmd+C): Copy selected shapes to local clipboard
- Ctrl+V (Cmd+V): Paste from clipboard
- Context menu: "Copy" and "Paste" options  
- Clipboard storage:
  - Local state (not synchronized between users)
  - Clipboard persists until browser refresh or new copy
  - Structure: shapes array, copied timestamp, user info
- Multiple pastes from same copy all use same +20px offset from original positions
- Paste creates new IDs with current user metadata and highest z-index

### Add local undo/redo system
- Create `src/composables/useUndoRedo.js`
- Each user has independent undo/redo stack (local only, not synchronized)
- Track individual property changes as separate actions
- Multi-shape operations tracked as individual actions per shape
- Stack depth limit: last 50 actions
- Ctrl+Z (Cmd+Z): Undo last action
- Ctrl+Y (Cmd+Y): Redo action
- Does not undo other users' actions
- Stack cleared on browser refresh
- Actions tracked:
  - Shape creation (undo = delete)
  - Shape deletion (undo = recreate)
  - Property changes (position, size, rotation, color, etc.)
  - Note: Individual property changes during drag count as separate actions

**Deliverable:**
✅ All essential operations working. Local undo/redo functional. Proper conflict handling.

---

## PR #8: Properties Panel and UI Enhancements
**Purpose:** Build responsive properties panel and enhance overall UI

### Create properties panel
- Create `src/components/PropertiesPanel.vue`
- Panel width: 300px, positioned as right sidebar
- Display when shapes selected, hide when none selected
- Responsive: adjust width for smaller desktop screens

### Shape-specific property editors
- **Rectangle properties:**
  - Position: X, Y (top-left corner) - numeric inputs
  - Size: Width, Height - numeric inputs
  - Fill color: color picker
  - Rotation: degrees (0-360) - numeric input
  - Z-index: display only (read-only)

- **Circle properties:**
  - Position: X, Y (center point) - numeric inputs
  - Radius - numeric input
  - Fill color: color picker
  - Stroke color: color picker (optional)
  - Stroke width: numeric input
  - Z-index: display only

- **Line properties:**
  - Start point: X1, Y1 - numeric inputs
  - End point: X2, Y2 - numeric inputs
  - Stroke color: color picker
  - Stroke width: 1-10px - numeric input
  - Z-index: display only

- **Text properties:**
  - Position: X, Y (top-left) - numeric inputs
  - Text content: textarea (300 char max)
  - Font size: dropdown
  - Font family: dropdown
  - Font style: Bold, Italic toggles
  - Text alignment: buttons (left, center, right)
  - Fill color: color picker
  - Rotation: degrees - numeric input
  - Width: numeric input (optional)
  - Z-index: display only

### Multi-selection properties panel
- Show only common properties across selected shapes
- Grayed out fields for properties with differing values
- Bulk update capability for common properties
- Property changes apply to all selected shapes simultaneously

### Canvas information panel (no selection)
- Canvas properties display when nothing selected:
  - Canvas size: width x height (display current, allow editing)
  - Maximum canvas size: 10000x10000px
  - Total shapes count
  - Active users count

### Real-time property updates
- Property changes broadcast immediately to Firestore (optimistic updates)
- Input validation and constraint enforcement:
  - Numeric ranges (coordinates: 0 to canvas size, rotation: 0-360 with wraparound)
  - Text length (300 char max)
  - Minimum sizes enforced
- Debounce rapid property changes (e.g., typing in text field)

### Default shape colors
- Rectangle: #3B82F6 (blue)
- Circle: #EF4444 (red)
- Line: #000000 (black)
- Text: #000000 (black)
- Color pickers available to change

### Enhanced toolbar design
- Position: Top horizontal toolbar
- Tool state indicators and active tool highlighting
- Keyboard shortcut hints on hover
- Simple, clean theme (no dark mode)

**Deliverable:**  
✅ Responsive properties panel with full shape editing. Clean, professional UI design.

---

## PR #9: Canvas Management and Permission System
**Purpose:** Implement canvas dashboard, sharing, and permission management

### Build canvas dashboard
- Create `src/views/DashboardView.vue`
- Dashboard route: "/" (replaces auth as home)
- Display canvas thumbnails in grid layout
- Thumbnail generation: render shapes to small canvas element client-side when dashboard loads
- Canvas cards show:
  - Thumbnail preview
  - Canvas name (editable inline)
  - Last modified date
  - Owner indicator
  - Quick actions (open, rename, delete if owner)
- "Create New Canvas" button

### Implement canvas creation flow
- Modal/form for new canvas creation
- Canvas size configuration (default: 3000x3000px, max: 10000x10000px)
- Default naming scheme: "Canvas [Date]" or "Untitled Canvas [Number]"
- Users can rename canvases after creation (inline editing in dashboard)
- Owner set to creating user automatically

### Canvas sharing and permissions
- Canvas URLs: `/canvas/[randomCanvasId]` format using Firebase document IDs
- Shareable link generation (copy to clipboard)
- Role-based permissions stored in canvas metadata:
  - **Owner:** Full access, can manage permissions, delete canvas
  - **Editor:** Create, modify, delete shapes (default for shared links)
  - **Viewer:** Read-only access, can see live changes
- Permission management UI:
  - Add users by email (search Firebase users collection)
  - Change user roles (dropdown)
  - Remove user access
  - Owner-only access to permission management

### Viewer mode implementation
- Disable all interaction when user role = Viewer
- Gray out toolbar tools (visual indication of disabled state)
- Disable shape selection and manipulation
- Prevent context menu access
- Show read-only indicator in UI
- Still show live cursor positions and shape updates

### Permission enforcement
- **Firestore Security Rules only** (server-side enforcement)
- Rules check user role before allowing:
  - Shape creation (Editor or Owner)
  - Shape modification (Editor or Owner)
  - Shape deletion (Editor or Owner)
  - Permission changes (Owner only)
  - Canvas deletion (Owner only)
- Client-side UI disabling is for UX only (not security)

### Canvas deletion
- Owner-only canvas deletion capability
- Confirmation modal: "Delete '[Canvas Name]'? This action cannot be undone."
- Delete confirmation requires typing canvas name or clicking confirm
- Clean up all associated data:
  - All shapes in canvas
  - Canvas metadata
  - Presence data
  - Permission data
- Redirect to dashboard after deletion

### Enhanced navigation system
- Create `src/components/Navigation.vue`
- Canvas breadcrumb: Dashboard > [Canvas Name]
- Back to dashboard button from canvas view
- Canvas title editing inline (click to edit)
- User profile menu with logout option

### Canvas access and error handling
- Invalid canvas URLs show 404 error page
- 404 page includes "Create New Canvas" button
- Permission denied screens for unauthorized access
- Canvas loading states (spinner while fetching data)
- Error recovery for failed loads

### Canvas metadata and persistence
- Firestore structure:
  ```
  /canvases/{canvasId}
    - name: string
    - width: number
    - height: number  
    - owner: userId
    - createdAt: timestamp
    - lastModified: timestamp
    - permissions: map<userId, role>
  /canvases/{canvasId}/shapes/{shapeId}
    - (shape data as before)
  ```
- Real-time auto-save via existing Firestore sync
- Canvas data persists indefinitely (no auto-deletion policy)

**Deliverable:**
✅ Full canvas management system with dashboard, sharing, and permissions. Professional UX.

---

## PR #10: Enhanced Real-Time Sync and Presence
**Purpose:** Upgrade sync system for new features with enhanced presence

### Upgrade Firestore sync for shape system
- Update shape listeners for all shape types
- Handle shape creation, modification, deletion for any type
- Efficient delta updates for transform operations (only changed fields)
- Handle text editing lock fields in sync

### Enhanced cursor and presence system  
- Create `src/composables/useEnhancedPresence.js`
- User avatars: generated from initials with background color
  - Extract initials from user name (first letter of first/last name or first two letters)
  - Background color: use existing cursor color from user profile
  - Simple circle with centered initials
- Show user names and avatars with cursor positions
- Cursors persist for 10 seconds after user goes idle (no mouse movement)
- Cursors only visible when users in same viewport area
- Viewport area calculation: only show cursors if user's last position is within current viewport bounds
- Real-time cursor sync at <50ms when active (existing throttling)

### Network failure handling and resilience
- Show "Changes failed to sync" message after 5 second timeout
- Retry failed requests automatically (3 attempts with exponential backoff)
- On connection resume: discard offline changes, sync fresh server state
- User notification for lost offline edits (toast message)
- Connection status indicator (optional): "Connected" / "Syncing..." / "Offline"

### Performance optimization for sync
- Throttle transformation updates to 16ms (60 FPS) during operations
- Efficient listener management for 1000+ shapes
- Memory cleanup for disconnected users (remove from presence map)
- Batch multiple shape updates when possible

### Sync conflict resolution enhancements
- Enhanced timestamp comparison for all operations
- Graceful handling of simultaneous multi-user edits
- Visual feedback for overwritten local changes (brief highlight flash)
- Conflict logging to console for debugging

### Browser compatibility and recovery
- Auto-save canvas state every 30 seconds to localStorage
- Browser crash recovery mechanism:
  - On page load, check localStorage for unsaved changes
  - Offer to restore if found (modal: "Restore unsaved changes?")
  - Merge restored changes with current server state
- Memory management for large canvases:
  - Monitor memory usage
  - Automatic cleanup of off-viewport shapes from memory (keep in Firestore)
- Performance fallback: show performance warning if FPS drops below 30 for >5 seconds
- Minimum system requirements note: 4GB RAM recommended

**Deliverable:**
✅ Bulletproof sync system handling all new features. Enhanced presence and recovery mechanisms.

---

## PR #11: Performance Optimization and Monitoring
**Purpose:** Achieve and validate performance targets with monitoring

### Canvas rendering optimization
- Konva layer caching: enable with `layer.cache()` for static backgrounds
- Batch drawing operations: use `batchDraw()` instead of `draw()` for updates
- Viewport culling implementation:
  - Custom visibility checking with margin around viewport (e.g., 500px margin)
  - Use Konva's `listening: false` for shapes outside viewport + margin
  - Recalculate visibility on pan/zoom
  - Keep shape data in memory, just disable rendering/interaction
- FastLayer for cursor layer (separate from shapes layer)

### Shape interaction optimization
- Efficient collision detection for selection:
  - Use spatial indexing (simple grid-based or quadtree) for large shape counts
  - Only check shapes in relevant grid cells for intersection
- Optimized event handling:
  - Debounce rapid property changes
  - Throttle mouse move events for cursor updates
- Transform operation performance tuning:
  - Minimize unnecessary re-renders
  - Cache transform calculations where possible

### Network and sync optimization
- Firestore query optimization:
  - Proper indexing for queries (zIndex, lastModified)
  - Composite indexes where needed
- Connection pooling and request batching where possible
- Efficient presence and cursor update algorithms (existing throttling)
- Reduced payload sizes with delta updates (already implemented)

### Z-index normalization routine
- Periodic check (every 5 minutes or on 100 shape changes)
- If max zIndex - min zIndex > 1000:
  - Sort all shapes by current zIndex
  - Renumber sequentially from 0
  - Batch update all shapes in Firestore
  - Optimistic local update, then sync
- Run normalization in background, non-blocking

### Performance monitoring implementation
- Built-in FPS counter for development builds
  - Display in corner: "FPS: 60"
  - Toggle with keyboard shortcut (Shift+P)
- Performance API integration:
  - Track frame times using requestAnimationFrame
  - Calculate rolling average FPS over 1 second
  - Log to console when FPS drops below 30 for >5 seconds
- Performance warning to users:
  - Show toast notification: "Performance degraded. Consider reducing shape count or complexity."
  - Dismiss button
  - Don't show multiple times in same session

### Performance targets validation
- Target: 60 FPS with 1000+ shapes in viewport
- Target: Shape sync latency <100ms across users
- Target: Cursor sync latency <50ms (best effort)
- Target: Support 10+ concurrent users without degradation
- Memory usage optimization for extended sessions (monitor for leaks)

**Deliverable:**
✅ All performance targets met and validated. Monitoring system in place. Bulletproof performance.

---

## PR #12: Production Deployment and Documentation
**Purpose:** Deploy to production and finalize comprehensive documentation

### Production deployment preparation
- Update Firebase configuration for production environment
- Configure Firestore security rules for complete shape system:
  - User authentication required for all operations
  - Permission-based access control for canvases
  - Shape creation/modification requires Editor or Owner role
  - Canvas deletion requires Owner role
- Set up Firebase Hosting with proper caching headers
- Production build optimization:
  - Minimize bundle size
  - Remove console logs
  - Enable Vite production optimizations

### Deploy and validate production system
- Build production version: `npm run build`
- Deploy to Firebase Hosting: `firebase deploy --only hosting`
- Deploy Firestore rules: `firebase deploy --only firestore:rules`
- Verify all features work in production environment
- Smoke test: basic functionality (create shapes, transform, sync)

### Comprehensive documentation update
- Update README.md:
  - Phase 2 features list (all shape types, transformations, selection, etc.)
  - Live demo URL
  - Setup instructions (clone, install, configure Firebase, run dev server)
  - Environment variables needed
  - Deployment instructions
- Document keyboard shortcuts:
  - Tool shortcuts (R, C, L, T, V)
  - Selection (Ctrl+A, ESC, Shift+click)
  - Clipboard (Ctrl+C, V, D)
  - Undo/Redo (Ctrl+Z, Y)
  - Layers (Ctrl+[, ], Shift+[, Shift+])
- Architecture overview diagram

### Create technical documentation
- Document Firestore data structure:
  - Canvas metadata schema
  - Shape schema for each type (BaseShape + type-specific)
  - Permission system structure
  - Presence and cursor data
- Explain real-time sync implementation:
  - Optimistic updates with reconciliation
  - Conflict resolution (last write wins)
  - Delta updates for performance
  - Text editing lock mechanism
- Document performance optimization techniques:
  - Viewport culling strategy
  - Z-index normalization
  - Throttling and debouncing patterns
- Document permission system:
  - Role-based access control
  - Firestore security rules logic
  - Viewer mode implementation

### API documentation for future features
- Document shape API functions for future AI integration:
  - createShape(type, properties)
  - updateShape(id, updates)
  - deleteShape(id)
  - getCanvasState()
  - transformShape(id, transformation)
- Comment complex functions with JSDoc
- Document composables and their APIs

### Technology stack documentation
- Frontend: Vue 3 (Composition API), TypeScript
- Canvas: Konva.js
- Backend: Firebase (Firestore, Auth, Hosting)
- Authentication: Google + Email/Password
- Real-time: Firestore listeners
- Styling: Tailwind CSS (if used) or plain CSS

**Deliverable:**
✅ Phase 2 deployed to production and fully documented. Production-ready collaborative canvas.

---

## Phase 2 Completion Checklist

### Core Shape System ✓
- [ ] Rectangle (enhanced from MVP), Circle, Line, Text shape types  
- [ ] Shape creation tools and toolbar with keyboard shortcuts
- [ ] Shape-specific behaviors and properties
- [ ] TypeScript interfaces for all shape types
- [ ] Default shape colors configured

### Object Transformation System ✓  
- [ ] Move/drag all shape types with real-time sync
- [ ] Resize with 8-handle system (Konva Transformer with shape-specific behaviors)
- [ ] Rotate with rotation handles (shape-specific behaviors, 360° wraparound)
- [ ] Transform handles visual design and interaction states
- [ ] Minimum size constraints enforced

### Selection System ✓
- [ ] Single selection with bounding boxes (topmost when overlapping)
- [ ] Multi-selection with shift+click
- [ ] Marquee selection (drag-to-select with intersection detection)
- [ ] Independent selection per user (not synchronized)
- [ ] Multi-selection transformations (maintain exact relative positions)
- [ ] Ctrl+A select all, ESC deselect

### Layer Management ✓
- [ ] Z-index system for shape ordering
- [ ] Layer operations: bring to front, send to back, forward, backward
- [ ] Keyboard shortcuts for all layer operations
- [ ] Context menus for layer and object operations (right-click)
- [ ] Z-index conflict resolution (last write wins)
- [ ] Periodic z-index normalization (0 to N range)

### Essential Operations ✓
- [ ] Delete shapes with confirmation modal (>5 shapes)
- [ ] Duplicate shapes with +20px offset and highest z-index
- [ ] Copy/paste system with local clipboard (multiple pastes use same offset)
- [ ] Local undo/redo system (last 50 actions, per user, individual property changes)
- [ ] Operation conflict handling with notifications

### Text Editing System ✓
- [ ] Text layer creation (double-click canvas or text to edit)
- [ ] Inline text editor with formatting toolbar
- [ ] Font options: size, family (5 system fonts), style (bold/italic), alignment
- [ ] Text editing lock system (lockedBy/lockedAt fields, 30 second expiry)
- [ ] 300 character maximum validation
- [ ] "[User Name] is editing" indicator

### User Interface ✓
- [ ] Properties panel (300px width, right sidebar)
- [ ] Shape-specific property editors (all shape types)
- [ ] Multi-selection property management (common properties only)
- [ ] Canvas information panel (when no selection)
- [ ] Enhanced toolbar with tool state indicators
- [ ] Context menu system (right-click shapes or canvas)
- [ ] Simple, clean theme (no dark mode)

### Canvas Management ✓
- [ ] Canvas dashboard with thumbnails (client-side generation)
- [ ] Canvas creation flow with size configuration (max 10000x10000px)
- [ ] Canvas naming and inline renaming
- [ ] Canvas deletion with confirmation (owner only)
- [ ] Navigation system with breadcrumbs
- [ ] 404 error page for invalid canvas URLs

### Permission System ✓
- [ ] Role-based permissions: Owner, Editor, Viewer
- [ ] Shareable canvas links with /canvas/[id] format
- [ ] Permission management UI (owner only)
- [ ] Viewer mode: disabled interaction, grayed out tools
- [ ] Firestore security rules enforcement (server-side)
- [ ] Permission denied screens

### Enhanced Presence & Sync ✓
- [ ] User avatars from initials with background color
- [ ] Cursor presence (10 second idle timeout, viewport-scoped)
- [ ] Network failure handling (5 second timeout, 3 retries)
- [ ] Offline change handling (discard on reconnect)
- [ ] Browser crash recovery (localStorage auto-save every 30 seconds)
- [ ] Enhanced conflict resolution with visual feedback

### Performance & Optimization ✓
- [ ] 1000+ shapes at 60 FPS (viewport culling)
- [ ] 10+ concurrent users supported
- [ ] Konva layer caching and batch drawing
- [ ] Efficient collision detection (spatial indexing)
- [ ] Performance monitoring (FPS counter, console warnings)
- [ ] Performance warning notification (FPS <30 for >5 seconds)
- [ ] Memory management and cleanup

### Documentation & Deployment ✓
- [ ] Production deployment on Firebase
- [ ] Comprehensive README with setup instructions
- [ ] Keyboard shortcuts reference
- [ ] Technical documentation (data models, sync, permissions)
- [ ] API documentation for future features
- [ ] Architecture overview
- [ ] Firestore security rules deployed

---

**Phase 2 Success Metrics:**
- ✅ All shape types implemented with full functionality
- ✅ Real-time sync <100ms for all operations  
- ✅ 60 FPS maintained with 1000+ shapes in viewport
- ✅ 10+ concurrent users supported smoothly
- ✅ Desktop-optimized responsive design
- ✅ Bulletproof foundation ready for future AI integration

**PHASE 2 COMPLETE: Production-ready collaborative canvas with comprehensive shape system, transformations, and canvas management** 🚀