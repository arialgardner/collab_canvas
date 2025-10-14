# CollabCanvas Core Features
## Product Requirements Document

**Document Version:** 2.0  
**Last Updated:** October 14, 2025

---

## Executive Summary

This PRD defines the core feature set that extends the CollabCanvas MVP to include comprehensive shape support, object transformations, and advanced canvas operations. The focus is on building an extremely bulletproof foundation for collaborative design tools before AI features are integrated.

**Status:** MVP Complete ✓  
**Next Phase:** Core Collaborative Canvas Features  
**Future Phase:** AI Canvas Agent (separate PRD)

---

## Core Objectives

1. **Expand shape support** beyond rectangles to circles, lines, and text layers
2. **Implement full object transformations** (move, resize, rotate)
3. **Build robust selection system** (single, multiple, shift-click, drag-to-select)
4. **Add layer management** with z-index control
5. **Implement essential operations** (delete, duplicate, copy/paste)
6. **Maintain bulletproof real-time sync** across all new features
7. **Preserve 60 FPS performance** with 500+ objects

---

## Shape System

### Supported Shape Types

#### 1. Rectangle (Already Implemented ✓)
- Default size: 100x100px
- Solid fill color
- Maintained for backward compatibility

#### 2. Circle
```typescript
{
  id: string;
  type: 'circle';
  x: number;              // center x position
  y: number;              // center y position
  radius: number;         // default 50px
  fill: string;           // hex color
  stroke?: string;        // optional outline color
  strokeWidth?: number;   // default 0
  rotation: number;       // degrees (default 0)
  createdBy: string;
  createdAt: timestamp;
  lastModified: timestamp;
  lastModifiedBy: string;
}
```

**Circle Behavior:**
- Position defined by center point (not top-left like rectangle)
- Click-to-create places center at click position
- Default radius: 50px
- Rotation property exists but has no visual effect (maintained for consistency)

#### 3. Line
```typescript
{
  id: string;
  type: 'line';
  points: number[];       // [x1, y1, x2, y2]
  stroke: string;         // line color (hex)
  strokeWidth: number;    // default 2px
  rotation: number;       // degrees (default 0)
  createdBy: string;
  createdAt: timestamp;
  lastModified: timestamp;
  lastModifiedBy: string;
}
```

**Line Behavior:**
- Two-point line definition
- Click-and-drag to create: first click sets start point, release sets end point
- During creation, preview line follows cursor
- Minimum length: 10px (shorter lines are not created - no visual feedback)
- Line rotation rotates around midpoint of the line

#### 4. Text Layer
- Position at top-left corner (x, y)
- Text content with font properties (size, family, style)
- Text alignment (left, center, right)
- Optional width for text box (auto-wraps if set)
- Fill color and rotation properties

**Text Behavior:**
- Double-click empty canvas area to create new text layer
- Double-click existing text shape to edit that text's content  
- Double-click on non-text shapes has no effect (prevents accidental text creation)
- Opens inline text editor at click position for new text, or existing text bounds for editing
- Default text: "Text" (placeholder for new text)
- User can immediately start typing

**Text Editing Conflicts:**
- Lock-based editing: First user to double-click gets exclusive edit access
- Other users see "[User Name] is editing" indicator over text shape
- Prevents simultaneous editing conflicts and data loss
- Lock released when user presses Escape or clicks outside text
- Text editor has basic formatting toolbar:
  - Font size (12, 14, 16, 18, 24, 32, 48)
  - Font family: Arial, Helvetica, Times New Roman, Courier, Georgia (system fonts)
  - Bold, Italic toggles
  - Text alignment (left, center, right)
  - Text color picker
- Press Escape or click outside to finish editing
- Double-click existing text to edit again
- Text auto-wraps if width is set, otherwise expands horizontally

### Shape Creation Methods

**Rectangle:** Single click places top-left corner, creates 100x100px rectangle  
**Circle:** Single click places center, creates 50px radius circle  
**Line:** Click-and-drag from start point to end point  
**Text:** Double-click opens text editor with inline editing

### Shape Properties Panel

Display properties panel when shape(s) selected:

**Rectangle Properties:**
- Position: X, Y (top-left corner)
- Size: Width, Height
- Fill color picker
- Rotation: degrees (0-360)

**Circle Properties:**
- Position: X, Y (center)
- Radius
- Fill color picker
- Stroke color picker (optional)
- Stroke width

**Line Properties:**
- Start point: X1, Y1
- End point: X2, Y2
- Stroke color picker
- Stroke width (1-10px)

**Text Properties:**
- Position: X, Y (top-left)
- Text content (editable)
- Font size dropdown
- Font style (bold, italic toggles)
- Text alignment buttons
- Fill color picker
- Rotation: degrees

**Multi-Selection Transformations:**
- All selected shapes maintain their exact relative positions during group transformations
- Shapes with different anchor points (circle centers vs rectangle corners) move together as a rigid group
- Group bounding box calculated from all selected shapes for transform handles

---

## Object Transformation System

### Transform Operations

#### 1. Move (Translation)
**Interaction:**
- Click and drag any shape to move
- Shape follows cursor with visual feedback
- All users see movement in real-time (<100ms sync)
- Snap-to-grid optional (16px grid)

**Technical Requirements:**
- Update x, y coordinates (or points for lines)
- Broadcast position delta, not full object state
- Optimistic update on drag, reconcile with server on release
**Canvas Configuration:**
- Canvas size configurable per canvas (default: 3000x3000px)
- Maximum canvas size: 10000x10000px (memory considerations)
- Constrain movement within canvas bounds (0 to canvas width/height)
- Canvas metadata stores dimensions alongside other properties

**Edge Cases:**
- Multi-selection: moves all selected objects together, maintaining relative positions
- Objects partially off-canvas: constrain to keep at least 20x20px visible
- Rapid movement: throttle broadcasts to 16ms (60 FPS)

#### 2. Resize
**Interaction:**
- Select shape to show 8 resize handles (corners and sides)
- Click and drag handle to resize
- Shift+drag maintains aspect ratio
- Alt+drag resizes from center (not corners)
- Visual bounding box shows new size during resize

**Resize Handles:**
Standard 8-handle resize system:
- Corner handles: Northwest, Northeast, Southwest, Southeast
- Side handles: North, South, East, West

**Technical Requirements:**
- Minimum size constraints:
  - Rectangle: 10x10px
  - Circle: radius 5px
  - Text: 20px width minimum
- Update width/height or radius based on handle dragged
- Maintain position reference point (e.g., opposite corner when dragging corner)
- Broadcast size changes with lastModified timestamp

**Shape-Specific Behavior:**
- Rectangle: Standard 8-handle resize
- Circle: 4 handles only (N, S, E, W), adjusts radius uniformly
- Line: Handles at endpoints only, stretches line longer/shorter by moving endpoints
- Text: Horizontal resize only (East/West handles), height auto-adjusts to content

#### 3. Rotate
**Interaction:**
- Select shape to show rotation handle (above bounding box)
- Click and drag rotation handle to rotate around center
- Displays rotation angle tooltip while rotating
- Snap to 45° increments when Shift held

**Technical Requirements:**
- Rotation in degrees (0-360, wraps around)
- Rotate around shape's center point
- Update rotation property in object model
- Broadcast rotation delta with lastModified timestamp
- Visual feedback: semi-transparent outline shows original position

**Shape-Specific Behavior:**
- Rectangle: Rotates around geometric center
- Circle: Rotation property stored for consistency, but no rotation handle shown (circles are visually identical at all rotations)
- Line: Rotates around midpoint between endpoints  
- Text: Rotates around center of text bounding box

### Transform Handles Visual Design

**Selection Indicators:**
- Primary selection: Blue bounding box, 2px stroke  
- Multi-selection: Purple bounding box, 2px dashed stroke
- Resize handles: 8x8px white squares, 1px blue border
- Rotation handle: 12px circle, connected to bounding box by 20px line

**Default Shape Colors:**
- Rectangle: #3B82F6 (blue)
- Circle: #EF4444 (red) 
- Line: #000000 (black)
- Text: #000000 (black)

**UI Design:**
- Simple, clean theme (no dark mode in this phase)
- Responsive design for desktop and mobile viewports
- Properties panel: 300px width on desktop, collapsible on mobile
- Toolbar: Top horizontal on desktop, bottom on mobile

**Handle Interaction States:**
- Default: White fill, blue border
- Hover: Light blue fill, darker blue border
- Active (dragging): Solid blue fill, white border
- Cursor changes based on handle type (resize cursors, rotate cursor)

---

## Selection System

### Single Selection
**Interaction:**
- Click any shape to select it
- Previously selected shape deselects
- Selected shape shows bounding box and transform handles
- Properties panel updates to show selected shape's properties

**Technical:**
- Maintain `selectedIds: Set<string>` in local state
- Broadcast selection state? No - selections are local to each user
- Each user has independent selection state

### Multiple Selection

#### Method 1: Shift+Click
- Hold Shift and click shapes to add to selection
- Shift+click selected shape to deselect it
- All selected shapes show individual bounding boxes
- Additional bounding box shows collective bounds

#### Method 2: Drag-to-Select (Marquee Selection)
**Interaction:**
- Click and drag on empty canvas area (not on a shape)
- Shows selection rectangle (dashed blue border, semi-transparent blue fill)
- All shapes whose bounds intersect selection rectangle are selected
- Release to finalize selection
- Shift+drag adds to existing selection instead of replacing

**Technical Requirements:**
- Detect clicks on empty canvas vs. shape clicks
- Calculate bounding box intersection for all shapes
- Selection rectangle follows cursor in real-time
- No network broadcast during drag (local only)
- Efficient collision detection for 500+ shapes

**Selection Rectangle:**
Temporary state tracking selection area with start/end coordinates and selection status.

#### Method 3: Select All
- Keyboard shortcut: Ctrl+A (Cmd+A on Mac)
- Selects all shapes on canvas
- Shows collective bounding box

### Selection Behavior with Multi-User

**Independent Selections:**
- Each user has their own selection state (not synchronized)
- User A's selection does not affect User B's view
- Prevents confusion and allows independent workflows

**Visual Indicators:**
- Show other users' selections with their cursor color
- Dim outline around shapes selected by other users  
- Tooltip on hover: "Selected by [User Name]"

**Canvas Sharing & Permissions:**
- Dashboard with canvas thumbnails for management
- Canvas naming: Users can rename canvases, default scheme "Canvas [Date]" or "Untitled Canvas [Number]"
- Canvas deletion: Owner only, with confirmation modal "Delete '[Canvas Name]'? This action cannot be undone."
- Role-based permissions:
  - Owner: Full access, can manage permissions, delete canvas
  - Editor: Create, modify, delete shapes  
  - Viewer: Read-only access, can see live changes
- Google Authentication and email/password sign-in via Firebase
- No guest access in this phase

**Conflict Prevention:**
- No locking mechanism (KISS principle for now)
- Last write wins if multiple users edit same object
- Visual feedback: Brief highlight flash when remote change overwrites local state

---

## Layer Management (Z-Index)

### Z-Index System

**Data Model:**
All shapes include a zIndex property (integer, higher values appear on top).

**Default Z-Index:**
- New shapes: `zIndex = currentMaxZIndex + 1`
- Ensures new shapes appear on top by default
- Z-index range: 0 to infinity (no upper limit)

### Layer Operations

**Note:** Focus on layer operations through keyboard shortcuts and context menus. Visual layer panel UI is not included in this phase.

#### Bring to Front
- Keyboard: Ctrl+] (Cmd+] on Mac)
- Sets `zIndex = currentMaxZIndex + 1`
- Works with single or multi-selection
- All selected shapes move to top, maintaining relative order

#### Send to Back
- Keyboard: Ctrl+[ (Cmd+[ on Mac)
- Sets `zIndex = currentMinZIndex - 1`
- Works with single or multi-selection
- All selected shapes move to bottom, maintaining relative order

#### Bring Forward
- Keyboard: Ctrl+Shift+] (Cmd+Shift+] on Mac)
- Increments `zIndex` by 1
- If multiple shapes selected, all increment together

#### Send Backward
- Keyboard: Ctrl+Shift+[ (Cmd+Shift+[ on Mac)
- Decrements `zIndex` by 1
- Minimum zIndex is 0 (cannot go negative)

### Right-Click Context Menu

When shape(s) selected, right-click shows context menu:
```
┌─────────────────────┐
│ Bring to Front      │
│ Bring Forward       │
│ Send Backward       │
│ Send to Back        │
├─────────────────────┤
│ Duplicate           │
│ Delete              │
├─────────────────────┤
│ Copy                │
│ Paste               │
└─────────────────────┘
```


---

## Essential Operations

**Local Undo/Redo System:**
- Each user has independent undo/redo stack (local only)
- Tracks user's own actions: create, move, resize, rotate, delete, property changes  
- Keyboard shortcuts: Ctrl+Z (undo), Ctrl+Y (redo)
- Does not undo other users' actions
- Stack cleared on browser refresh

### Delete

**Interaction:**
- Select shape(s) and press Delete or Backspace
- Context menu: "Delete"
- Confirmation modal for multi-selection (>5 shapes): "Delete X shapes?"
- Shape(s) removed from canvas immediately

**Technical:**
- Remove from local state optimistically
- Broadcast deletion to Firestore
- Firestore listener handles `removed` event on other clients
- All users see deletion within <100ms

**Data Model:**
Shapes removed via Firestore document deletion.

**Multi-User Conflict:**
- Z-index conflicts handled like other write conflicts (last write wins)
- Maximum z-index gap enforced to prevent runaway numbers (e.g., max increment of 1000 per operation)
- If multiple users perform layer operations simultaneously, server timestamp determines winner

### Duplicate

**Interaction:**
- Select shape(s) and press Ctrl+D (Cmd+D on Mac)
- Context menu: "Duplicate"
- New shape(s) created with offset (+20px x, +20px y)
- Duplicates are immediately selected (originals deselected)
- Duplicates appear on top (highest z-index)

**Technical:**
- Generate new IDs for duplicates
- Copy all properties except id, createdAt, createdBy
- Set `zIndex = currentMaxZIndex + 1` for each duplicate
- Offset position to make duplicate visible
- Broadcast creation to Firestore
- If multi-selection, duplicate all and maintain relative positions

**Duplicate Behavior:**
Duplicates created with new IDs, 20px offset position, highest z-index, and current user metadata.

### Copy/Paste

#### Copy
**Interaction:**
- Select shape(s) and press Ctrl+C (Cmd+C on Mac)
- Context menu: "Copy"
- No visual feedback (shapes remain selected)
- Copies shape data to clipboard

**Technical:**
- Store shape data in clipboard state (local, not synchronized)
- Clipboard persists until browser refresh or new copy operation
- Multi-selection: copies all selected shapes

#### Paste
**Interaction:**
- Press Ctrl+V (Cmd+V on Mac)
- Context menu: "Paste" (only if clipboard has shape data)
- Pasted shape(s) appear with offset (+20px x, +20px y) from originals
- Pasted shapes are immediately selected
- Can paste multiple times from same copy

**Technical:**
- Read shape data from clipboard state
- Generate new IDs for pasted shapes
- Apply position offset (+20px x, +20px y from original position for each paste)
- Set `zIndex = currentMaxZIndex + 1`
- Broadcast creation to Firestore
- If original shapes were deleted, paste still works (clipboard preserves data)
- Multiple pastes from same copy all use same +20px offset from original positions

**Clipboard Data Structure:**
Local clipboard stores shape data with copy timestamp and user information.

---

## User Interface Enhancements

### Toolbar

**Shape Creation Tools:**
Toolbar with buttons for Rectangle, Circle, Line, Text, and Select modes.

**Interaction:**
- Click tool to activate shape creation mode
- Cursor changes to indicate active tool
- ESC key returns to select mode
- Tools remain active until mode change (can create multiple shapes)

**Select Mode (Default):**
- Cursor: default pointer
- Click shapes to select
- Drag canvas to pan
- Drag-to-select for marquee selection

### Properties Panel (Right Sidebar)

**When no selection:**
- Display canvas properties:
  - Canvas size: 3000x3000px
  - Total objects: count
  - Active users: count with names

**When shape(s) selected:**
- Display selected shape properties (detailed above)
- Editable fields for all properties
- Changes broadcast immediately to Firestore
- Multi-selection: show common properties only

**Panel Layout:**
```
┌─────────────────────┐
│ Properties          │
├─────────────────────┤
│ Type: Rectangle     │
│                     │
│ Position            │
│ X: [  100 ]         │
│ Y: [  200 ]         │
│                     │
│ Size                │
│ W: [  150 ]         │
│ H: [  100 ]         │
│                     │
│ Fill                │
│ [██] #3B82F6        │
│                     │
│ Rotation            │
│ [   45 ]°           │
│                     │
│ Layer               │
│ Z: [   12 ]         │
└─────────────────────┘
```

### Keyboard Shortcuts Reference

**Selection:**
- Click: Select single shape
- Shift+Click: Add/remove from selection
- Ctrl+A: Select all
- Escape: Deselect all

**Clipboard:**
- Ctrl+C: Copy
- Ctrl+V: Paste
- Ctrl+D: Duplicate
- Delete/Backspace: Delete

**Layers:**
- Ctrl+]: Bring to front
- Ctrl+[: Send to back
- Ctrl+Shift+]: Bring forward
- Ctrl+Shift+[: Send backward

**Canvas Navigation:**
- Space+Drag: Pan canvas (alternative to default drag)
- Drag on empty canvas: Pan canvas  
- Touch pinch: Zoom in/out
- Zoom buttons: Zoom in/out controls
- Mouse wheel zoom: Optional enhancement (implement if straightforward)
- Ctrl+0: Reset zoom to 100%
- Each user has independent viewport control (zoom/pan not synchronized)

**Tools:**
- R: Rectangle tool
- C: Circle tool  
- L: Line tool
- T: Text tool
- V: Select tool (default)

**Tool Behavior:**
- Tools remain active after shape creation (can create multiple shapes)
- Return to Select mode: ESC key or click Select tool button
- Tool switching via keyboard shortcuts works during any mode

### Context Menu

Right-click on selected shape(s):
```
┌─────────────────────┐
│ Copy                │
│ Paste               │
│ Duplicate           │
│ Delete              │
├─────────────────────┤
│ Bring to Front      │
│ Bring Forward       │
│ Send Backward       │
│ Send to Back        │
└─────────────────────┘
```

Right-click on empty canvas:
```
┌─────────────────────┐
│ Paste               │ (if clipboard not empty)
│ Select All          │
└─────────────────────┘
```

---

## Real-Time Synchronization

### Network Failure Handling
- Optimistic updates apply immediately to local UI  
- Show "Changes failed to sync" message after 5 second timeout
- Retry failed requests automatically (3 attempts)
- On connection resume: discard offline changes, sync fresh server state
- User notification for any lost offline edits

### Sync Strategy for New Features

**Shape Creation:**
- Optimistic: Add to local state immediately
- Broadcast: Send full shape object to Firestore
- Reconcile: Firestore assigns ID and timestamp, broadcasts to all
- Conflict: None (new objects have unique IDs)

**Object Transformation:**
- Optimistic: Apply transform locally during drag
- Throttle: Broadcast position updates every 16ms (60 FPS) during drag
- On Release: Send final state with `lastModified` timestamp
- Reconcile: If remote timestamp newer, accept remote state
- Conflict Resolution: Last write wins (server timestamp)

**Delete Operation:**
- Optimistic: Remove from local state immediately
- Broadcast: Call Firestore `deleteDoc`
- Reconcile: Firestore broadcasts `removed` event to all listeners
- Conflict: If shape already deleted, ignore (idempotent operation)

**Selection State:**
- **Not Synchronized** - Each user has independent selection
- Local state only, no Firestore broadcast
- Reduces network traffic significantly

**Layer Reordering:**
- Optimistic: Update z-index locally
- Broadcast: Update shape document with new zIndex
- Reconcile: All clients receive updated zIndex, re-sort shapes
- Conflict: Last write wins

### Performance Optimization

**Performance Monitoring:**
- Built-in FPS counter displayed during development builds
- Performance API integration to log frame drops to console  
- Automated alerts when performance drops below 60 FPS
- Load testing with 500+ shapes to validate targets

**Throttling Broadcasts:**
During drag/resize/rotate operations, updates are throttled to 16ms (60 FPS) for performance, with final state sent immediately on completion.

**Delta Updates:**
- Only send changed properties, not full object
- Example: Moving shape only sends `{ x, y, lastModified }`
- Reduces payload size significantly

**Listener Optimization:**
Use Firestore query cursors and limits for large datasets (e.g., limit to most recent 500 shapes).

---

## Data Models (Updated)

### Base Shape Interface
```typescript
interface BaseShape {
  id: string;
  type: 'rectangle' | 'circle' | 'line' | 'text';
  zIndex: number;
  rotation: number; // degrees (0-360)
  createdBy: string;
  createdAt: Timestamp;
  lastModified: Timestamp;
  lastModifiedBy: string;
}
```

### Rectangle (Updated)
```typescript
interface Rectangle extends BaseShape {
  type: 'rectangle';
  x: number;           // top-left corner
  y: number;
  width: number;
  height: number;
  fill: string;        // hex color
}
```

### Circle
```typescript
interface Circle extends BaseShape {
  type: 'circle';
  x: number;           // center point
  y: number;
  radius: number;
  fill: string;
  stroke?: string;     // optional outline
  strokeWidth?: number;
}
```

### Line
```typescript
interface Line extends BaseShape {
  type: 'line';
  points: number[];    // [x1, y1, x2, y2]
  stroke: string;
  strokeWidth: number;
}
```

### Text
```typescript
interface Text extends BaseShape {
  type: 'text';
  x: number;           // top-left corner
  y: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  fill: string;
  fontStyle: 'normal' | 'bold' | 'italic' | 'bold italic';
  align: 'left' | 'center' | 'right';
  width?: number;      // text box width (auto if undefined)
}
```

### Firestore Structure (Updated)
```
/canvases
  /{canvasId}
    /shapes              # Renamed from 'rectangles' to 'shapes'
      /{shapeId}
        - type, zIndex, rotation
        - x, y, width, height, fill (rectangle)
        - x, y, radius, fill, stroke, strokeWidth (circle)
        - points, stroke, strokeWidth (line)
        - x, y, text, fontSize, fontFamily, fill, fontStyle, align, width (text)
        - createdBy, createdAt, lastModified, lastModifiedBy
    /metadata
      - createdAt, createdBy, activeUsers
      
/users
  /{userId}
    - name, email, cursorColor, currentCanvas

/presence
  /{canvasId}
    /{userId}
      - online, lastSeen, userName, cursorColor
```

**Migration Note:**
- Existing `/rectangles` collection will be migrated to `/shapes`
- Migration script copies all rectangles and adds `type: 'rectangle'` field
- Old collection can be deleted after successful migration

---

## Testing Scenarios

### Test 1: Shape Creation & Sync
**Setup:**
- Two users in separate browsers
- Start with empty canvas

**Steps:**
1. User A creates rectangle, circle, line, and text
2. User B simultaneously creates their own shapes
3. Both users verify all 8 shapes visible on both canvases

**Success Criteria:**
- All shapes appear on both clients within 100ms
- No duplicates or missing shapes
- Shapes render correctly with proper properties

### Test 2: Object Transformation Sync
**Setup:**
- Canvas with 10 pre-existing shapes
- Two users in separate browsers

**Steps:**
1. User A moves 3 shapes rapidly
2. User B resizes 2 different shapes
3. User A rotates 1 shape
4. Both users verify all transformations synced

**Success Criteria:**
- All transformations sync within 100ms
- No flickering or jumping
- Final state matches on both clients

### Test 3: Multi-Selection Operations
**Setup:**
- Canvas with 20 shapes
- Single user

**Steps:**
1. Shift+click to select 5 shapes
2. Move all 5 together
3. Duplicate the selection (creates 5 new shapes)
4. Delete original 5 shapes
5. Verify 5 duplicates remain with correct positions

**Success Criteria:**
- Multi-selection works smoothly
- Group move maintains relative positions
- Duplicate creates correct copies with offset
- Delete removes only selected shapes

### Test 4: Drag-to-Select (Marquee)
**Setup:**
- Canvas with 30 shapes scattered across canvas
- Single user

**Steps:**
1. Click and drag selection rectangle over 10 shapes
2. Verify 10 shapes selected
3. Move selected group
4. Shift+drag to add 5 more shapes to selection
5. Verify 15 shapes now selected

**Success Criteria:**
- Marquee selection rectangle renders smoothly
- Correct shapes selected based on intersection
- Shift+drag adds to selection without replacing

### Test 5: Layer Management
**Setup:**
- Canvas with 10 shapes
- Two users

**Steps:**
1. User A selects shape and brings to front
2. User B sees shape move to top layer within 100ms
3. User B selects different shape and sends to back
4. User A sees layer change within 100ms
5. Both users verify z-index order matches

**Success Criteria:**
- Layer operations sync correctly
- Z-index changes reflect on all clients
- Shape rendering order consistent

### Test 6: Delete Conflicts
**Setup:**
- Canvas with 1 shape
- Two users

**Steps:**
1. User A starts moving the shape
2. User B deletes the shape
3. User A releases drag (attempts to update deleted shape)

**Success Criteria:**
- Shape disappears on both clients
- User A sees "Shape was deleted" notification
- No errors in console
- Application remains stable

### Test 7: Performance Under Load
**Setup:**
- Canvas with 500 shapes
- Single user

**Steps:**
1. Select and move multiple shapes rapidly
2. Create 20 new shapes quickly
3. Marquee select 50+ shapes and move together
4. Resize, rotate shapes in quick succession
5. Monitor frame rate

**Success Criteria:**
- Maintains 60 FPS during all operations
- No lag or stuttering
- Canvas remains responsive
- Network traffic remains reasonable

### Test 8: Multi-User Concurrent Edits
**Setup:**
- Canvas with 50 shapes
- 5 users in separate browsers

**Steps:**
1. All 5 users create, move, and transform shapes simultaneously
2. Users perform overlapping operations for 2 minutes
3. All users verify canvas state matches

**Success Criteria:**
- No sync errors or conflicts
- All users see consistent final state
- No shapes lost or duplicated
- Performance remains acceptable

---

## Performance Requirements

### Frame Rate Targets
- **60 FPS** during all canvas interactions (pan, zoom, drag, resize, rotate)
- **60 FPS** with 500+ shapes visible on canvas
- **No dropped frames** during rapid object manipulation

### Sync Latency Targets
- Object creation: <100ms from creation to display on other clients
- Object transformation: <100ms from change to display on other clients
- Cursor position: <50ms (best effort, throttled to 60 FPS)
- Delete operation: <100ms from delete to removal on other clients

### Scalability Targets
- Support 1000+ shapes visible in viewport without performance degradation
- Support 10+ concurrent users without major lag  
- Architecture scales to 15+ users (validated by code structure)
- Efficient rendering with Konva layer caching and viewport culling for off-screen shapes

### Network Optimization
- Throttle transformation updates to 16ms (60 FPS) during drag/resize/rotate
- Send delta updates only (changed properties), not full object state
- Batch multiple operations when possible
- Use Firestore offline persistence to reduce network calls

---

## Success Metrics

### Core Features Complete ✓
- ✅ Rectangle, Circle, Line, Text shape types implemented
- ✅ Shape creation tools working (click, drag, double-click)
- ✅ Full transformation support (move, resize, rotate)
- ✅ Single and multi-selection working
- ✅ Drag-to-select (marquee) functional
- ✅ Layer management (z-index, bring to front, send to back)
- ✅ Essential operations (delete, duplicate, copy/paste)
- ✅ Properties panel displays and edits shape properties
- ✅ Keyboard shortcuts implemented
- ✅ Context menu functional

### Real-Time Sync ✓
- ✅ All shape types sync correctly across users
- ✅ Transformations sync within latency targets
- ✅ Conflict resolution working (last write wins)
- ✅ Delete operations sync correctly
- ✅ Layer changes sync correctly
- ✅ No sync errors during testing

### Performance ✓
- ✅ Maintains 60 FPS with 500+ shapes
- ✅ Supports 5+ concurrent users without degradation
- ✅ Sync latency targets met
- ✅ No memory leaks during extended use
- ✅ Efficient network usage (delta updates, throttling)

### User Experience ✓
- ✅ Smooth, responsive interactions
- ✅ Clear visual feedback for all operations
- ✅ Intuitive keyboard shortcuts
- ✅ Professional-looking UI
- ✅ No confusing states or errors
- ✅ Helpful error messages when conflicts occur

---

## Technical Implementation Notes

### Konva.js Configuration

**Konva.js Configuration:**
- Stage and layer setup for canvas rendering
- Transform handling with Konva Transformer component
- Performance optimization through layer caching and batch drawing

**Event Handling:**
- Click selection with shift+click for multi-selection
- Drag operations for movement with throttled network updates
- Transform events for resize, rotate operations

**Vue.js State Management:**
- Component structure with canvas container, toolbar, and properties panel
- Local state management for shapes, selection, and current tool
- Computed properties for selected shapes
- Firestore listeners for real-time collaboration

**Firestore Integration:**
- Real-time listeners for shape changes (added, modified, removed)
- Optimistic updates with server timestamp reconciliation
- Shape creation, update, and deletion operations

**Selection System Implementation:**
- Marquee selection with intersection detection
- Multi-selection state management
- Transform handle management

**Keyboard Shortcuts Implementation:**
- Cross-platform modifier key detection (Ctrl/Cmd)
- Event handling for common operations (copy, paste, delete, etc.)
- Tool shortcuts for shape creation modes

---

## Migration Strategy

### From MVP to Core Features

**Phase 1: Shape System (Week 1)**
1. Update Firestore collection from `/rectangles` to `/shapes`
2. Add `type` discriminator field to existing rectangles
3. Implement Circle, Line, Text shape types
4. Update Konva rendering to handle multiple shape types
5. Build shape creation tools and toolbar
6. Test shape creation and sync across all types

**Phase 2: Transformations (Week 1)**
1. Implement resize handles with Konva Transformer
2. Add rotation handle and rotation logic
3. Test transformation sync across users
4. Optimize transformation broadcasts (throttling)
5. Handle edge cases (minimum sizes, canvas bounds)

**Phase 3: Selection System (Week 2)**
1. Implement single selection (already partially done)
2. Add shift+click multi-selection
3. Build marquee selection (drag-to-select)
4. Integrate Konva Transformer with multi-selection
5. Test selection with concurrent users

**Phase 4: Layer Management (Week 2)**
1. Add zIndex field to all shapes
2. Implement layer operations (bring to front, etc.)
3. Build context menu
4. Add keyboard shortcuts
5. Test z-index sync across users

**Phase 5: Essential Operations (Week 2)**
1. Implement delete operation
2. Build duplicate functionality
3. Add copy/paste with clipboard state
4. Test operations with conflict scenarios
5. Add keyboard shortcuts

**Phase 6: UI/UX Polish (Week 3)**
1. Build properties panel
2. Implement all keyboard shortcuts
3. Add context menus
4. Create keyboard shortcuts reference modal
5. UI/UX testing and refinement

**Phase 7: Performance Testing (Week 3)**
1. Load test with 500+ shapes
2. Test with 5+ concurrent users
3. Profile and optimize rendering
4. Profile and optimize network traffic
5. Fix any performance bottlenecks

**Phase 8: Final Testing & Documentation (Week 3)**
1. Run all test scenarios
2. Fix any bugs found
3. Update documentation
4. Create demo video
5. Prepare for AI integration phase

---

## Definition of Done

### Core Features Complete ✓
- [ ] All shape types implemented (Rectangle, Circle, Line, Text)
- [ ] Shape creation working for all types
- [ ] Full transformation support (move, resize, rotate)
- [ ] Single and multi-selection functional
- [ ] Drag-to-select (marquee) working
- [ ] Layer management complete
- [ ] Essential operations (delete, duplicate, copy/paste) working
- [ ] Properties panel functional
- [ ] Context menus implemented
- [ ] All keyboard shortcuts working

### Real-Time Sync ✓
- [ ] All shape types sync correctly
- [ ] Transformations sync within <100ms
- [ ] Layer changes sync correctly
- [ ] Delete operations sync correctly
- [ ] No sync errors or conflicts
- [ ] Conflict resolution working (last write wins)

### Performance ✓
- [ ] Maintains 60 FPS with 500+ shapes
- [ ] Supports 5+ concurrent users
- [ ] Sync latency targets met
- [ ] No memory leaks
- [ ] Efficient network usage

### Testing ✓
- [ ] All 8 test scenarios pass
- [ ] No critical bugs
- [ ] Stress tested with concurrent users
- [ ] Performance validated on deployed app

### Documentation ✓
- [ ] README updated with new features
- [ ] Architecture documentation complete
- [ ] Keyboard shortcuts documented
- [ ] API documentation for shape operations
- [ ] Setup instructions current

### Deployment ✓
- [ ] Application deployed and stable
- [ ] Works with 5+ concurrent users
- [ ] No deployment errors
- [ ] Firebase rules configured correctly
- [ ] Performance acceptable on production

---

## Future Considerations

### Preparing for Future Enhancements

**API Design Principles:**
- Design clean, simple functions for future extensibility
- Functions should be idempotent where possible
- Return clear success/error states
- Document expected parameters and return values

**Architecture Considerations:**
- Build higher-level operations that can be reused
- Examples: `createGrid()`, `alignHorizontally()`, `distributeEvenly()`
- Error handling should fail gracefully without breaking canvas state
- All complex operations should be atomic (all-or-nothing)

---

## Appendix

### Technology Stack Summary

**Frontend:**
- Vue 3 (Composition API)
- TypeScript
- Konva.js for canvas rendering
- Tailwind CSS for styling
- Vite for build tooling

**Backend:**
- Firebase Firestore (shape persistence, real-time sync)
- Firebase Realtime Database (cursor positions - optional)
- Firebase Authentication (user accounts)
- Firebase Hosting (deployment)

**Development Tools:**
- ESLint + Prettier
- Vue DevTools
- Firebase Emulator Suite (local testing)

### Performance Benchmarks

**Target Metrics:**
- 60 FPS rendering: 16.67ms per frame
- 100ms sync latency: Network round-trip + processing
- 500 shapes: ~1-2ms per shape for rendering updates
- 5 users: ~500ms total for fanout to all users

**Optimization Techniques:**
- Konva layer caching
- Batch drawing (`batchDraw()` instead of `draw()`)
- Throttled broadcasts during drag (16ms intervals)
- Delta updates (only changed properties)
- Firestore query limits (only active canvas)
- Optimistic updates (immediate visual feedback)

### Security Considerations

**Browser Compatibility & System Requirements:**
- Modern browsers: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- Minimum RAM: 4GB recommended for smooth performance with 1000+ shapes
- Browser crash recovery: Auto-save canvas state every 30 seconds to localStorage
- Memory management: Automatic cleanup of off-viewport shapes from memory
- Performance fallback: Reduce frame rate to 30 FPS if system struggles

**Canvas Data Persistence:**
- Real-time auto-save via existing Firestore sync (no additional save mechanism needed)
- Canvas data persists indefinitely (no automatic deletion policy)
- User data stored securely via Firebase Authentication

**Firestore Security Rules:**
Authentication required for all operations. Users can read/write their own user documents. Authenticated users can read/write canvas shapes and presence data, with shape creation/modification tracking user identity.

**Final Implementation Details:**
- Shape selection: Topmost shape (highest z-index) when overlapping
- Canvas URLs: `/canvas/[randomCanvasId]` format, 404 page for invalid URLs  
- New canvases: Start completely empty
- Text limit: 300 characters maximum
- Coordinates: Positive values only (0 to canvas bounds)
- Rotation: Unlimited with wraparound (360° becomes 0°)
- Cursors: Show names/avatars, persist 10 seconds idle, viewport-scoped visibility

**Input Validation:**
- Validate all shape properties on client
- Constrain values to acceptable ranges (e.g., x: 0-3000)
- Sanitize text input (prevent XSS)
- Rate limit shape creation (prevent spam)

---

## Conclusion

This PRD defines a comprehensive, production-ready collaborative canvas foundation. By implementing these features methodically and maintaining bulletproof real-time synchronization, you'll create a solid base for AI integration.

**Key Principles:**
1. **Sync first, features second** - Never compromise real-time collaboration
2. **Performance matters** - 60 FPS is non-negotiable
3. **Test continuously** - Multi-user testing at every stage
4. **Keep it simple** - KISS principle for MVP, complexity later
5. **Design for AI** - Clean APIs that AI agents can easily call

**Next Steps After Completion:**
1. Validate all test scenarios pass
2. Performance test with 500+ shapes and 5+ users
3. Document API functions for AI integration
4. Begin AI Canvas Agent phase (separate PRD)

This foundation will enable seamless AI integration while maintaining the bulletproof collaboration that makes CollabCanvas special.