# Feature: Multi-Select by Dragging Rectangle + Group Drag

## Overview
Added the ability to select multiple shapes by clicking and dragging a selection rectangle over shapes on the canvas. Also added group drag functionality to move all selected shapes together as one operation.

## Changes Made

### 1. Default Selection Behavior
- **Before**: Click-drag on empty canvas would pan the viewport (in select mode)
- **After**: Click-drag on empty canvas creates a selection rectangle to select multiple shapes

### 2. Panning Behavior
To accommodate the new selection behavior, panning has been updated:
- **Spacebar + Drag**: Hold spacebar and drag to pan the canvas (like Figma/Adobe XD)
- **Middle Mouse Button + Drag**: Use middle mouse button to pan
- **Mouse Wheel**: Continue to use for zooming (Ctrl/Cmd + wheel for zoom)

### 3. Selection Rectangle
- Drag in any direction (including negative width/height) to create selection
- All shapes that intersect with the selection rectangle will be selected
- Previous selection is cleared when starting a new drag selection
- Selection rectangle is rendered with blue dashed border during drag

### 4. Group Drag
- **Before**: Individual shapes could only be dragged one at a time
- **After**: Multiple selected shapes can be dragged together by clicking and dragging any selected shape
- All selected shapes move together maintaining their relative positions
- Group drag counts as a single operation for undo/redo
- Individual shape dragging is disabled when shape is part of multi-selection

## User Experience

### Selecting Multiple Shapes
1. Ensure the **Select** tool is active (toolbar)
2. Click on an empty area of the canvas
3. Drag to create a selection rectangle
4. Release to select all shapes within the rectangle

### Panning the Canvas
1. Hold **Spacebar** key
2. Cursor changes to "grab" icon
3. Click and drag to pan
4. Release spacebar to return to normal mode

**OR**

1. Click with **Middle Mouse Button** (scroll wheel click)
2. Drag to pan
3. Release to stop panning

### Dragging Multiple Shapes Together
1. Select multiple shapes (using drag selection or Shift+click)
2. Click on any of the selected shapes
3. Drag to move all shapes together
4. Release to complete the move
5. All shapes maintain their relative positions

### Adding to Selection
- Hold **Shift** and click individual shapes to add/remove from selection
- Use context menu **Select All** (Cmd/Ctrl+A) to select all shapes

### Undo/Redo
- Group drag counts as **one operation** for undo/redo
- Press Cmd/Ctrl+Z to undo the entire group move
- Press Cmd/Ctrl+Shift+Z to redo the group move

## Implementation Details

### Code Changes
- `CanvasView.vue`:
  - Added `isPanning` state to distinguish between panning and other drag operations
  - Added `isSpacebarPressed` state to track spacebar for pan mode
  - Added `isDraggingGroup`, `groupDragStart`, and `groupDragInitialPositions` for group drag tracking
  - Updated `handleMouseDown` to:
    - Start selection rectangle by default (no Shift required)
    - Detect clicks on selected shapes to start group drag
    - Store initial positions of all selected shapes
  - Added `handleSpacebarDown` and `handleSpacebarUp` for spacebar detection
  - Updated `handleMouseMove` to:
    - Handle group dragging by calculating delta and updating all shapes
    - Check `isPanning` instead of `isDragging` for pan operations
  - Updated `handleMouseUp` to:
    - Finalize group drag with grouped undo/redo operation
    - Save all shape positions to Firestore as one batch
  - Updated cursor styles to reflect current mode
  - Passed `disable-drag` prop to shape components to disable individual dragging in multi-selection

- Shape Components (`Rectangle.vue`, `Circle.vue`, `Line.vue`, `TextShape.vue`):
  - Added `disableDrag` prop to disable individual dragging
  - Set `draggable: !props.disableDrag` in Konva config
  - Individual shapes can't be dragged separately when part of multi-selection

### Selection Algorithm
Located in `handleMouseUp`:
```javascript
// Normalize selection rectangle (handle negative width/height)
const selX = selectionRect.width < 0 ? selectionRect.x + selectionRect.width : selectionRect.x
const selY = selectionRect.height < 0 ? selectionRect.y + selectionRect.height : selectionRect.y
const selWidth = Math.abs(selectionRect.width)
const selHeight = Math.abs(selectionRect.height)

// Find shapes that intersect with selection rectangle
const intersectingShapes = shapesList.value.filter(shape => {
  // Calculate shape bounds based on type
  // Check for rectangle intersection
  return !(shapeX + shapeWidth < selX || 
           shapeX > selX + selWidth ||
           shapeY + shapeHeight < selY ||
           shapeY > selY + selHeight)
})
```

### Group Drag Algorithm
Located in `handleMouseMove` and `handleMouseUp`:
```javascript
// During drag (handleMouseMove)
if (isDraggingGroup.value) {
  const deltaX = canvasX - groupDragStart.x
  const deltaY = canvasY - groupDragStart.y
  
  // Update all selected shapes with the delta
  selectedShapeIds.value.forEach(shapeId => {
    const initialPos = groupDragInitialPositions.value.get(shapeId)
    if (initialPos) {
      const newX = initialPos.x + deltaX
      const newY = initialPos.y + deltaY
      
      // Optimistic local update
      updateShape(shapeId, { x: newX, y: newY }, userId, canvasId.value, false, false, userName.value)
    }
  })
}

// On drag end (handleMouseUp)
if (isDraggingGroup.value) {
  // Begin grouped operation for undo/redo
  beginGroup()
  
  // Save all shape positions to Firestore and track for undo
  for (const shapeId of selectedShapeIds.value) {
    const initialPos = groupDragInitialPositions.value.get(shapeId)
    if (initialPos) {
      const newX = initialPos.x + deltaX
      const newY = initialPos.y + deltaY
      
      // Track for undo (old and new values)
      addAction({
        type: 'update',
        data: {
          id: shapeId,
          oldValues: { x: initialPos.x, y: initialPos.y },
          newValues: { x: newX, y: newY }
        }
      })
      
      // Save final position to Firestore
      await updateShape(shapeId, { x: newX, y: newY }, userId, canvasId.value, true, true, userName.value)
    }
  }
  
  // End grouped operation
  endGroup()
}
```

## Testing

### Regression Tests

#### `multi-select-drag-rectangle.spec.js`
Test cases for drag selection:
1. ✓ Creates selection rectangle when dragging on empty canvas
2. ✓ Selects multiple shapes within selection rectangle
3. ✓ Selects shapes that partially intersect with selection rectangle
4. ✓ Supports drag selection in any direction (negative width/height)
5. ✓ Clears previous selection when starting new drag selection
6. ✓ Does not pan canvas when dragging selection rectangle

#### `multi-select-group-drag.spec.js`
Test cases for group drag:
1. ✓ Drags all selected shapes together when clicking and dragging one
2. ✓ Maintains relative positions between shapes during group drag
3. ✓ Counts group drag as single undo operation
4. ✓ Does not allow individual drag when shape is part of multi-selection
5. ✓ Works with mixed shape types in group
6. ✓ Shows grabbing cursor during group drag

### Manual Testing Checklist
**Selection:**
- [ ] Drag selection works with multiple rectangles
- [ ] Drag selection works with circles
- [ ] Drag selection works with lines
- [ ] Drag selection works with text shapes
- [ ] Drag selection works with mixed shape types
- [ ] Selection rectangle renders correctly during drag
- [ ] Selection is cleared when clicking empty area
- [ ] Shift+click still adds/removes individual shapes from selection

**Panning:**
- [ ] Spacebar + drag pans the canvas
- [ ] Middle mouse button + drag pans the canvas
- [ ] Cursor updates correctly (default → grab → grabbing)
- [ ] Panning doesn't interfere with selection or group drag

**Group Drag:**
- [ ] Clicking and dragging a selected shape moves all selected shapes
- [ ] Relative positions are maintained during group drag
- [ ] Group drag works with 2+ shapes of same type
- [ ] Group drag works with mixed shape types (rectangle + circle + line + text)
- [ ] Individual shapes can't be dragged when part of multi-selection
- [ ] Cursor shows 'grabbing' during group drag
- [ ] Undo (Cmd/Ctrl+Z) reverts entire group move as one operation
- [ ] Redo (Cmd/Ctrl+Shift+Z) reapplies entire group move
- [ ] Group drag syncs properly to Firestore
- [ ] Other users see the group move in real-time

## Benefits
1. **Intuitive UX**: Matches behavior of popular design tools (Figma, Adobe XD, Sketch)
2. **Efficiency**: 
   - Quickly select multiple shapes without holding modifier keys
   - Move multiple shapes together maintaining their layout
3. **Flexibility**: 
   - Spacebar panning provides easy access without switching tools
   - Works with all shape types and mixed selections
4. **Consistency**: Follows industry-standard interaction patterns
5. **Undo/Redo Support**: Group operations are properly tracked as single actions
6. **Collaboration**: Group moves sync to other users in real-time

## Notes
- The existing selection rectangle rendering was already implemented, this change makes it the default behavior
- Panning is still easily accessible via spacebar or middle mouse button
- Group drag uses the same undo/redo grouping mechanism as other multi-shape operations
- Individual shape dragging is automatically disabled when shapes are part of a multi-selection to prevent conflicts
- This change aligns the app with professional design tool conventions

