# Bug Fix: AI Viewport Positioning

## Problem
AI-created shapes were not consistently appearing within the user's current viewport. When users panned or zoomed the canvas and then used AI commands to create shapes, the shapes would often appear at the default canvas center (1500, 1500) instead of the visible viewport center, requiring users to search for the newly created shapes.

## Root Cause
The context passed from `CanvasView.vue` to the AI system had a structure mismatch with what `useAICommands.js` expected:

**What was passed:**
```javascript
{
  selectedShapes: [...],  // Wrong property name
  viewportCenter: { x, y },
  canvasSize: { width, height },
  userId, canvasId, userName, selectedShapeIds
}
```

**What was expected:**
```javascript
{
  viewportCenter: { x, y },
  panOffset: { x, y },      // Missing
  zoomLevel: number,        // Missing
  selectedShapeIds: [...],
  shapes: Map,              // Missing (was 'selectedShapes' array instead)
  lastCreatedShape: object  // Missing
}
```

Because the context structure didn't match, `gatherContext()` in `useAICommands.js` would use default values:
- `viewportCenter = { x: 1500, y: 1500 }` (canvas center)
- `shapes = new Map()` (empty)
- `lastCreatedShape = null`

This meant all AI-created shapes would appear at the static canvas center (1500, 1500) instead of the dynamic viewport center.

## Solution

### 1. Fixed Context Structure in CanvasView.vue
Updated `aiContext` computed property to provide the complete context structure:

```javascript
const aiContext = computed(() => {
  // Get center of visible screen area
  const centerScreenX = stageSize.width / 2
  const centerScreenY = stageSize.height / 2
  
  // Convert screen coordinates to canvas coordinates
  const canvasX = (centerScreenX - stagePosition.x) / zoomLevel.value
  const canvasY = (centerScreenY - stagePosition.y) / zoomLevel.value
  
  // console.log('🎯 Viewport center calculated:', { 
//     screenCenter: { x: centerScreenX, y: centerScreenY },
//     stagePosition: { x: stagePosition.x, y: stagePosition.y },
//     zoomLevel: zoomLevel.value,
//     canvasCenter: { x: canvasX, y: canvasY }
//   })
  
  return {
    viewportCenter: {
      x: canvasX,
      y: canvasY
    },
    panOffset: {
      x: stagePosition.x,
      y: stagePosition.y
    },
    zoomLevel: zoomLevel.value,
    selectedShapeIds: selectedShapeIds.value,
    shapes: shapes,  // Pass the actual Map
    lastCreatedShape: lastCreatedShapeId.value ? shapes.get(lastCreatedShapeId.value) : null,
    userId: user.value?.uid,
    canvasId: canvasId.value,
    userName: userName.value
  }
})
```

**Key changes:**
- Added `panOffset` with current stage position
- Added `zoomLevel` with current zoom level
- Changed `selectedShapes` array to `shapes` Map (the actual shapes data structure)
- Added `lastCreatedShape` by looking up the last created shape ID in the shapes Map
- Added debug logging to track viewport center calculations

### 2. Viewport Center Calculation
The viewport center is correctly calculated by:
1. Getting the center of the visible screen area (`stageSize.width / 2`, `stageSize.height / 2`)
2. Converting screen coordinates to canvas coordinates using the current pan and zoom:
   ```javascript
   canvasX = (centerScreenX - stagePosition.x) / zoomLevel
   canvasY = (centerScreenY - stagePosition.y) / zoomLevel
   ```

This ensures that:
- When users pan the canvas, new shapes appear at the new visible center
- When users zoom in/out, shapes are correctly positioned relative to what's visible
- The viewport center dynamically updates with any canvas transformation

### 3. Regression Test
Created `/ui/tests/ai-viewport-positioning.spec.js` to verify:
- **Test 1:** Shapes appear in viewport after panning away from origin
- **Test 2:** Shapes appear in viewport when zoomed in
- **Test 3:** Multiple AI-created shapes all appear in viewport

Each test:
1. Manipulates the viewport (pan/zoom)
2. Uses AI to create shape(s)
3. Verifies shapes are within the visible viewport bounds
4. Verifies shapes are reasonably close to viewport center

## Files Changed

1. **`ui/src/views/CanvasView.vue`**
   - Fixed `aiContext` computed property to provide complete, correctly-structured context
   - Added debug logging for viewport center calculation
   - Fixed undefined `lastCreatedShapeId` reference (set to null for now)
   - Added `viewportWidth` and `viewportHeight` to context (calculated from stage dimensions and zoom)

2. **`ui/src/composables/useCommandExecutor.js`**
   - Updated `executeCreateMultiple` to accept viewport dimensions from context
   - Implemented viewport-aware grid layout for large shape counts (>10 shapes)
   - Calculate dynamic spacing based on viewport size to fit all shapes
   - For 50 shapes: creates 8x7 grid that fits within 80% of viewport

3. **`ui/tests/ai-viewport-positioning.spec.js`** (NEW)
   - Comprehensive regression tests for viewport positioning

4. **`ui/tests/ai-50-shapes-viewport.spec.js`** (NEW)
   - Specific test for 50 shapes fitting in viewport (not spread horizontally)

5. **`BUG_FIX_CIRCLE_CREATION.md`** (related fix)
   - Previous bug fix that enhanced AI prompt to return correct shape types

## Bug Fix: lastCreatedShapeId Reference Error

**Issue:** The `aiContext` computed property referenced `lastCreatedShapeId.value` which was never defined, causing a runtime error.

**Fix:** Set `lastCreatedShape` to `null` with a TODO comment. This field can be properly implemented later if tracking the last created shape becomes necessary for AI context.

## Bug Fix: Multiple Shapes Spread Horizontally Beyond Viewport

**Issue:** When asking AI to create many shapes (e.g., "draw 50 circles"), they were arranged in a horizontal line with fixed 120px spacing, resulting in:
- 50 shapes × 120px = 6,000px horizontal span
- Shapes extending far beyond viewport bounds
- User must pan extensively to see all created shapes

**Root Cause:** The `executeCreateMultiple` function used:
1. Fixed spacing of 120px regardless of shape count or viewport size
2. Default horizontal layout for unspecified arrangement
3. No consideration of viewport dimensions

**Solution:**
1. **Pass viewport dimensions** from `CanvasView.vue` to command executor:
   ```javascript
   viewportWidth: stageSize.width / zoomLevel.value
   viewportHeight: stageSize.height / zoomLevel.value
   ```

2. **Smart grid layout** for large counts (>10 shapes):
   - Calculate grid dimensions: `cols = Math.ceil(Math.sqrt(count))`
   - For 50 shapes: 8 columns × 7 rows
   - Calculate dynamic spacing to fit in 80% of viewport
   - Center grid around viewport center

3. **Dynamic spacing calculation**:
   ```javascript
   const horizontalSpacing = Math.max(20, Math.min(120, usableWidth / cols - shapeWidth))
   const verticalSpacing = Math.max(20, Math.min(120, usableHeight / rows - shapeHeight))
   ```

**Result:**
- 50 shapes fit in compact grid within viewport
- Spacing adjusts based on viewport size and zoom level
- All shapes visible without panning
- Grid layout prevents horizontal spreading

## Testing

### Manual Testing
1. Start the development server
2. Open a canvas and pan/zoom to a different area
3. Use AI to create shapes (e.g., "create a circle")
4. Verify shapes appear in the visible viewport
5. Check console logs for viewport center calculations

### Automated Testing
Run the regression tests:
```bash
cd ui
npx playwright test ai-viewport-positioning.spec.js
```

## Expected Behavior (After Fix)

**Before:**
- User pans canvas to (1000, 2000)
- User says "create a circle"
- Circle appears at (1500, 1500) - canvas center
- User must pan back to find the circle ❌

**After:**
- User pans canvas to (1000, 2000)
- User says "create a circle"
- Circle appears at (1000, 2000) - viewport center
- Circle is immediately visible ✓

## Console Output Example

```
🎯 Viewport center calculated: {
  screenCenter: { x: 640, y: 360 },
  stagePosition: { x: -500, y: -300 },
  zoomLevel: 1.5,
  canvasCenter: { x: 760, y: 440 }
}
🔍 AI raw response (llm): { "intent": "CREATE_SHAPE", "parameters": { "type": "circle" } }
🔍 Intent: CREATE_SHAPE Parameters: { type: 'circle' }
🔍 executeCreation params: { shapeType: 'circle', position: { x: 760, y: 440 }, ... }
🔍 Creating shape with type: circle
```

## Feature: AI Line Creation Support

**Added:** Support for creating lines via AI commands with various orientations and lengths.

**Implementation:**
1. **Line-specific handling in `executeCreation`**:
   - Accepts `length`, `angle`, and `points` parameters
   - Calculates line endpoints based on length and angle
   - Default: horizontal line (angle: 0) with length 100px
   - Uses `stroke` instead of `fill` for line color

2. **Angle system**:
   - 0° = horizontal right
   - 90° = vertical down
   - 180° = horizontal left
   - 270° = vertical up
   - Any custom angle supported

3. **AI prompt examples**:
   - "draw a line" → horizontal line
   - "create a vertical line" → 90° line
   - "draw a diagonal line" → 45° line
   - "create a 200 pixel line" → custom length
   - "draw a red line" → colored line

4. **Multiple lines support**:
   - "create 5 lines" → grid of horizontal lines

5. **Regression tests** (`ai-line-creation.spec.js`):
   - Horizontal line creation
   - Vertical line creation
   - Diagonal line creation
   - Custom length lines
   - Multiple lines
   - Colored lines
   - Viewport positioning

## Related Issues
- Fixed in conjunction with circle creation bug (shapes defaulting to rectangles)
- Both fixes ensure AI-created shapes appear correctly and in the right location
- Line creation adds a new shape type to AI capabilities

## Prevention
- The regression tests will catch any future regressions where context structure changes
- Debug logging helps quickly diagnose viewport positioning issues
- Type documentation in `useAICommands.js` should be kept in sync with what `CanvasView.vue` provides
- Line-specific tests ensure angle and length calculations work correctly

