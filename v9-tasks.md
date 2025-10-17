# V9 Tasks - Rectangle Rotation Position Fix

## Overview
Fix rectangle rotation to maintain visual position after rotation. When a rectangle is rotated, its stored x,y coordinates must be updated to reflect the new top-left corner position so the rectangle appears in the correct location after re-render.

**PRD**: See `rectangle_rotate.prd` for full technical specification.

**Priority**: High - Core functionality bug

---

## Tasks

### 1. Create Rotation Utility Functions
**File**: `ui/src/utils/rotationUtils.js` (new file)

Create centralized utility functions for rotation calculations:
- [ ] `calculateRectPositionAfterRotation(x, y, width, height, rotation)` - Calculate new top-left position
- [ ] `applyRotationToRectangle(rectangle, newRotation)` - Update rectangle object with corrected position
- [ ] Add JSDoc documentation for both functions
- [ ] Export functions for use across components

**Implementation Details**:
```javascript
// Convert rotation to radians and calculate rotated top-left corner position
// Maintains visual center while updating stored x,y coordinates
const centerX = x + width / 2
const centerY = y + height / 2
const radians = (rotation * Math.PI) / 180
const newX = centerX - (width / 2) * Math.cos(radians) + (height / 2) * Math.sin(radians)
const newY = centerY - (width / 2) * Math.sin(radians) - (height / 2) * Math.cos(radians)
```

---

### 2. Update PropertiesPanel.vue - Rotation Input Handler
**File**: `ui/src/components/PropertiesPanel.vue`

Fix rotation updates from properties panel:
- [ ] Import `calculateRectPositionAfterRotation` from rotationUtils
- [ ] Modify `handlePropertyChange` function around line 722
- [ ] Add special case for `property === 'rotation' && selectedShapes[0].type === 'rectangle'`
- [ ] Calculate new x,y position using utility function
- [ ] Emit `update-property` with rotation value AND additionalUpdates `{ x: newX, y: newY }`
- [ ] Ensure debouncing still works (300ms)

**Code Location**: Lines 722-733

---

### 3. Update CanvasView.vue - Transform End Handler
**File**: `ui/src/views/CanvasView.vue`

Fix rotation position when using transform tool:
- [ ] Import `calculateRectPositionAfterRotation` from rotationUtils
- [ ] Locate `handleTransformEnd` function (around line 1266)
- [ ] Find rectangle handling section (around line 1304-1327)
- [ ] Update pure rotation case (line 1323-1327) to use utility function
- [ ] Calculate corrected x,y position based on final rotation
- [ ] Apply updates with correct x, y, rotation values
- [ ] Ensure transform tool visual feedback works correctly

**Current Code Location**: Lines 1323-1327 (pure rotation case)

---

### 4. Update CanvasView.vue - Properties Panel Update Handler
**File**: `ui/src/views/CanvasView.vue`

Support additionalUpdates from properties panel:
- [ ] Locate `handleUpdateProperty` function (around line 2228)
- [ ] Modify function signature to accept `additionalUpdates` in destructured parameter
- [ ] Merge additionalUpdates into the updates object before calling updateShape
- [ ] Ensure validation still applies to all properties

**Code Location**: Lines 2228-2253

**Change**:
```javascript
// From:
const handleUpdateProperty = ({ shapeId, property, value }) => {

// To:
const handleUpdateProperty = ({ shapeId, property, value, additionalUpdates }) => {
  // ...
  let updates = { [property]: validatedValue }
  if (additionalUpdates) {
    updates = { ...updates, ...additionalUpdates }
  }
  // ...
  updateShape(shapeId, updates, userId, canvasId.value, true, true, userName.value)
}
```

---

### 5. Update Rectangle.vue - Rotation Watcher (Optional Enhancement)
**File**: `ui/src/components/Rectangle.vue`

Add defensive watcher to sync position on rotation changes:
- [ ] Import `calculateRectPositionAfterRotation` from rotationUtils
- [ ] Enhance existing rotation watcher (lines 46-54)
- [ ] Calculate corrected position when rotation changes
- [ ] Update node x,y position to reflect corrected coordinates
- [ ] Only update if rotation actually changed (avoid infinite loops)
- [ ] Batch draw after updates

**Code Location**: Lines 46-54

**Note**: This is optional defensive coding - main fixes are in PropertiesPanel and CanvasView

---

### 6. Create Automated Test
**File**: `ui/tests/rectangle-rotation-position.spec.js` (new file)

Create comprehensive rotation test:
- [ ] Test: Rectangle maintains position after rotation via properties panel
  - Create rectangle at known position
  - Record visual center position
  - Rotate rectangle to 45° via properties panel
  - Assert visual center unchanged
  - Assert stored x,y values updated
  - Reload page
  - Assert rectangle still in correct position
- [ ] Test: Multiple sequential rotations maintain position
  - Rotate to 45°, 90°, 180°, 360°
  - Verify position maintained through all
- [ ] Test: Rotation + drag work correctly together
  - Create and rotate rectangle
  - Drag to new position
  - Assert rotation maintained
  - Assert new position correct
- [ ] Test: Negative rotations work correctly
  - Test -45°, -90° rotations
  - Verify position calculations correct

---

### 7. Manual Testing & Validation

Perform comprehensive manual testing:
- [ ] **Basic rotation**: Create rectangle, rotate via properties panel, verify position maintained
- [ ] **Refresh test**: Rotate rectangle, refresh page, verify position persists
- [ ] **Multi-user test**: User A rotates, User B sees correct position
- [ ] **Transform tool test**: Rotate using transform tool (if available), verify position
- [ ] **Edge cases**: Test 0°, 90°, 180°, 270°, 360°, negative angles
- [ ] **Drag + rotate**: Combine dragging and rotation, verify both work
- [ ] **Properties panel**: Test typing rotation values, using arrow keys
- [ ] **Undo/redo**: If undo/redo exists, verify it works with rotation

---

### 8. Update TypeScript Types (If Needed)
**File**: `ui/src/types/shapes.ts`

Verify Rectangle interface is correct:
- [ ] Confirm `rotation?: number` is optional property in Rectangle interface
- [ ] Ensure no type conflicts with new utility functions
- [ ] Add JSDoc comments if needed

**Code Location**: Lines 14-22

---

### 9. Documentation Updates
**Files**: Various

Update relevant documentation:
- [ ] Add note about rotation coordinate system in `rectangle_rotate.prd`
- [ ] Update `CHANGELOG_v9.md` (create if needed) with bug fix details
- [ ] Add inline code comments explaining rotation math
- [ ] Update any architecture docs mentioning rectangle coordinates

---

### 10. Performance Validation

Ensure no performance regression:
- [ ] Profile rotation updates with Chrome DevTools
- [ ] Verify no jank during rotation (maintain 60fps)
- [ ] Test with 50+ rectangles on canvas, rotate multiple
- [ ] Check network traffic - ensure no excessive Firestore writes
- [ ] Verify operational transform still works correctly with rotation
- [ ] Test client prediction with rotation updates

---

## Testing Checklist

### Automated Tests
- [ ] `rectangle-rotation-position.spec.js` - all tests pass
- [ ] Existing canvas tests still pass
- [ ] No regression in other shape tests

### Manual Tests
- [ ] Basic rotation maintains position
- [ ] Page refresh preserves rotated position
- [ ] Multi-user rotation sync works
- [ ] Drag + rotation work together
- [ ] Transform tool rotation works
- [ ] Edge case angles (0, 90, 180, 270, 360, negative)
- [ ] Properties panel input methods (type, arrows)

### Performance Tests
- [ ] No visual jank during rotation
- [ ] Firestore write count reasonable
- [ ] Works smoothly with 50+ shapes

---

## Success Criteria

1. ✅ Rectangles maintain visual position when rotated
2. ✅ Position persists correctly across page refreshes
3. ✅ Position syncs correctly in multi-user scenarios
4. ✅ Drag and rotation work together without conflicts
5. ✅ All automated tests pass
6. ✅ No performance regression
7. ✅ Code is well-documented

---

## Implementation Order

**Recommended sequence**:
1. Task 1 (Utility functions) - Foundation
2. Task 2 (PropertiesPanel) - Primary user-facing fix
3. Task 4 (CanvasView handler) - Support for Task 2
4. Task 3 (Transform end) - Complete the fix
5. Task 6 (Tests) - Validation
6. Task 7 (Manual testing) - Validation
7. Tasks 5, 8, 9, 10 (Optional enhancements and docs)

---

## Notes

- **Backward Compatibility**: Existing rectangles will continue working. Only new rotation updates use corrected calculation.
- **Migration**: Not required. Existing rotated rectangles will auto-fix upon next rotation.
- **Math**: Rotation calculations use standard 2D rotation matrix around a point.
- **Future**: Consider applying similar fix to other shapes if they support rotation.

