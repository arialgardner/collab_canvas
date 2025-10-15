# CollabCanvas API Documentation

This document provides comprehensive API documentation for developers extending CollabCanvas or integrating new features.

---

## Shape API

### `useShapes` Composable

The primary interface for shape operations.

```javascript
import { useShapes } from './composables/useShapes'

const {
  shapes,              // Reactive Map<shapeId, Shape>
  createShape,
  updateShape,
  deleteShapes,
  duplicateShapes,
  getAllShapes,
  // ... other methods
} = useShapes()
```

#### `createShape(type, properties, userId, canvasId)`

Creates a new shape on the canvas.

**Parameters:**
- `type` (string): Shape type - `'rectangle'`, `'circle'`, `'line'`, or `'text'`
- `properties` (object): Shape-specific properties
- `userId` (string): ID of user creating the shape
- `canvasId` (string): ID of target canvas

**Returns:** Promise<Shape> - The created shape object

**Example:**
```javascript
const rectangle = await createShape('rectangle', {
  x: 100,
  y: 100,
  width: 200,
  height: 150,
  fill: '#3b82f6'
}, user.id, 'canvas-123')

const circle = await createShape('circle', {
  x: 300,
  y: 300,
  radius: 50,
  fill: '#ef4444'
}, user.id, 'canvas-123')

const text = await createShape('text', {
  x: 500,
  y: 100,
  text: 'Hello World',
  fontSize: 24,
  fontFamily: 'Arial',
  fill: '#000000'
}, user.id, 'canvas-123')
```

#### `updateShape(shapeId, updates, userId, canvasId, skipUndoTracking)`

Updates an existing shape.

**Parameters:**
- `shapeId` (string): ID of shape to update
- `updates` (object): Properties to update
- `userId` (string): ID of user making update
- `canvasId` (string): Canvas ID
- `skipUndoTracking` (boolean): If true, don't add to undo stack

**Returns:** Promise<void>

**Example:**
```javascript
await updateShape('shape-123', {
  x: 150,
  y: 200,
  fill: '#10b981'
}, user.id, 'canvas-123')
```

#### `deleteShapes(shapeIds, canvasId)`

Deletes one or more shapes.

**Parameters:**
- `shapeIds` (string[]): Array of shape IDs to delete
- `canvasId` (string): Canvas ID

**Returns:** Promise<void>

**Example:**
```javascript
await deleteShapes(['shape-1', 'shape-2'], 'canvas-123')
```

#### `duplicateShapes(shapeIds, userId, canvasId)`

Duplicates shapes with +20px offset.

**Parameters:**
- `shapeIds` (string[]): Array of shape IDs to duplicate
- `userId` (string): User ID
- `canvasId` (string): Canvas ID

**Returns:** Promise<Shape[]> - Array of new shape objects

**Example:**
```javascript
const duplicates = await duplicateShapes(['shape-1'], user.id, 'canvas-123')
```

### Layer Management

#### `bringToFront(shapeIds, userId, canvasId)`

Move shapes to front (highest z-index).

```javascript
await bringToFront(['shape-1', 'shape-2'], user.id, 'canvas-123')
```

#### `sendToBack(shapeIds, userId, canvasId)`

Move shapes to back (lowest z-index).

```javascript
await sendToBack(['shape-1'], user.id, 'canvas-123')
```

#### `bringForward(shapeIds, userId, canvasId)`

Move shapes forward one layer (+1 z-index).

```javascript
await bringForward(['shape-1'], user.id, 'canvas-123')
```

#### `sendBackward(shapeIds, userId, canvasId)`

Move shapes backward one layer (-1 z-index).

```javascript
await sendBackward(['shape-1'], user.id, 'canvas-123')
```

---

## Canvas API

### `useCanvases` Composable

Manages canvas operations and permissions.

```javascript
import { useCanvases } from './composables/useCanvases'

const {
  canvases,            // Reactive Map<canvasId, Canvas>
  currentCanvas,       // Ref<Canvas>
  createCanvas,
  getCanvas,
  updateCanvas,
  deleteCanvas,
  // ... other methods
} = useCanvases()
```

#### `createCanvas(userId, userName, options)`

Creates a new canvas.

**Parameters:**
- `userId` (string): Creator's user ID
- `userName` (string): Creator's display name
- `options` (object): Optional configuration
  - `name` (string): Canvas name (default: "Canvas [date]")
  - `width` (number): Width in pixels (default: 3000, max: 10000)
  - `height` (number): Height in pixels (default: 3000, max: 10000)

**Returns:** Promise<Canvas>

**Example:**
```javascript
const canvas = await createCanvas(user.id, user.name, {
  name: 'My Design',
  width: 5000,
  height: 4000
})
```

#### `getCanvas(canvasId)`

Fetches canvas metadata.

**Parameters:**
- `canvasId` (string): Canvas ID

**Returns:** Promise<Canvas>

**Example:**
```javascript
const canvas = await getCanvas('canvas-123')
console.log(canvas.name, canvas.permissions)
```

#### `updateCanvas(canvasId, updates)`

Updates canvas properties.

**Parameters:**
- `canvasId` (string): Canvas ID
- `updates` (object): Properties to update

**Returns:** Promise<void>

**Example:**
```javascript
await updateCanvas('canvas-123', {
  name: 'Updated Name',
  width: 4000
})
```

#### `deleteCanvas(canvasId)`

Deletes a canvas and all its shapes (owner only).

**Parameters:**
- `canvasId` (string): Canvas ID

**Returns:** Promise<void>

**Example:**
```javascript
await deleteCanvas('canvas-123')
```

### Permission Management

#### `updatePermissions(canvasId, userId, role)`

Updates a user's permissions on a canvas.

**Parameters:**
- `canvasId` (string): Canvas ID
- `userId` (string): Target user ID
- `role` (string): 'owner', 'editor', or 'viewer'

**Returns:** Promise<void>

**Example:**
```javascript
await updatePermissions('canvas-123', 'user-456', 'editor')
```

#### `getUserRole(canvas, userId)`

Gets user's role on a canvas.

**Parameters:**
- `canvas` (Canvas): Canvas object
- `userId` (string): User ID

**Returns:** string | null - Role or null if no access

**Example:**
```javascript
const role = getUserRole(canvas, user.id)
if (role === 'owner') {
  // Show admin options
}
```

#### `canEdit(canvas, userId)`

Checks if user can edit shapes.

**Returns:** boolean

```javascript
if (canEdit(canvas, user.id)) {
  // Allow shape creation
}
```

#### `canManagePermissions(canvas, userId)`

Checks if user can manage permissions.

**Returns:** boolean

```javascript
if (canManagePermissions(canvas, user.id)) {
  // Show permission management UI
}
```

---

## Undo/Redo API

### `useUndoRedo` Composable

Manages action history.

```javascript
import { useUndoRedo } from './composables/useUndoRedo'

const {
  canUndo,
  canRedo,
  addAction,
  undo,
  redo,
  clear
} = useUndoRedo()
```

#### `addAction(action)`

Adds an action to the undo stack.

**Parameters:**
- `action` (object): Action object
  - `type` (string): 'create', 'delete', 'update', 'property_change'
  - `data` (object): Action-specific data
  - `timestamp` (number): Action timestamp

**Example:**
```javascript
addAction({
  type: 'create',
  data: {
    id: 'shape-123',
    type: 'rectangle',
    // ... shape data
  },
  timestamp: Date.now()
})

addAction({
  type: 'property_change',
  shapeId: 'shape-123',
  property: 'fill',
  oldValue: '#3b82f6',
  newValue: '#ef4444',
  timestamp: Date.now()
})
```

#### `undo()` / `redo()`

Undo/redo last action.

**Returns:** Action object or null

**Example:**
```javascript
const action = undo()
if (action) {
  // Process undo
}
```

---

## Cursor & Presence API

### `useCursors` Composable

Manages multiplayer cursors.

```javascript
import { useCursors } from './composables/useCursors'

const {
  cursors,             // Reactive Map<userId, CursorData>
  updateCursorPosition,
  subscribeToCursors
} = useCursors()
```

#### `updateCursorPosition(canvasId, userId, x, y)`

Updates user's cursor position (throttled to 50ms).

**Parameters:**
- `canvasId` (string): Canvas ID
- `userId` (string): User ID
- `x` (number): X coordinate
- `y` (number): Y coordinate

**Example:**
```javascript
stage.on('mousemove', (e) => {
  const pos = stage.getPointerPosition()
  updateCursorPosition(canvasId, user.id, pos.x, pos.y)
})
```

### `usePresence` Composable

Manages user presence.

```javascript
import { usePresence } from './composables/usePresence'

const {
  activeUsers,         // Reactive Map<userId, UserPresence>
  setUserOnline,
  setUserOffline,
  getActiveUserCount
} = usePresence()
```

#### `setUserOnline(canvasId, userId, userName, cursorColor)`

Sets user as online.

**Example:**
```javascript
await setUserOnline(
  'canvas-123',
  user.id,
  user.displayName,
  '#667eea'
)
```

---

## Performance API

### `usePerformance` Composable

Performance monitoring and optimization.

```javascript
import { usePerformance } from './composables/usePerformance'

const {
  trackFirestoreOperation,
  measureRender,
  debounce,
  throttle
} = usePerformance()
```

#### `throttle(func, delay)`

Creates throttled function.

**Parameters:**
- `func` (Function): Function to throttle
- `delay` (number): Minimum time between calls (ms)

**Returns:** Throttled function

**Example:**
```javascript
const throttledUpdate = throttle((x, y) => {
  updateShape(shapeId, { x, y }, userId, canvasId)
}, 16) // 60 FPS

stage.on('dragmove', (e) => {
  const pos = e.target.position()
  throttledUpdate(pos.x, pos.y)
})
```

### `useViewportCulling` Composable

Optimizes rendering by culling off-screen shapes.

```javascript
import { useViewportCulling } from './composables/useViewportCulling'

const {
  visibleShapeIds,
  updateVisibleShapes,
  isVisible
} = useViewportCulling(stageRef)
```

#### `updateVisibleShapes(shapes)`

Calculates which shapes are in viewport.

**Example:**
```javascript
watch([shapes, stagePosition, zoomLevel], () => {
  updateVisibleShapes(Array.from(shapes.values()))
})

// In template
<Rectangle 
  v-if="isVisible(rectangle.id)"
  :rectangle="rectangle"
/>
```

### `useSpatialIndex` Composable

Fast collision detection for selections.

```javascript
import { useSpatialIndex } from './composables/useSpatialIndex'

const {
  addShape,
  updateShape,
  getShapesInRect
} = useSpatialIndex(200) // 200px grid size
```

#### `getShapesInRect(x, y, width, height)`

Gets shapes in rectangular area (O(1) average).

**Example:**
```javascript
// Marquee selection
const shapeIds = getShapesInRect(
  selectionRect.x,
  selectionRect.y,
  selectionRect.width,
  selectionRect.height
)
```

---

## Network Resilience API

### `useNetworkResilience` Composable

Handles network failures and retries.

```javascript
import { useNetworkResilience } from './composables/useNetworkResilience'

const {
  isOnline,
  isSyncing,
  connectionQuality,
  retryWithBackoff,
  queueFailedOperation
} = useNetworkResilience()
```

#### `retryWithBackoff(operation, maxRetries, baseDelay)`

Retries failed operations with exponential backoff.

**Parameters:**
- `operation` (Function): Async operation to retry
- `maxRetries` (number): Maximum retry attempts (default: 3)
- `baseDelay` (number): Initial delay in ms (default: 1000)

**Returns:** Promise<result>

**Example:**
```javascript
const shape = await retryWithBackoff(
  async () => await createShape('rectangle', props, userId, canvasId),
  3,
  1000
)
```

---

## Crash Recovery API

### `useCrashRecovery` Composable

Auto-save and crash recovery.

```javascript
import { useCrashRecovery } from './composables/useCrashRecovery'

const {
  hasRecoverableData,
  startAutoSave,
  applyRecovery
} = useCrashRecovery(canvasId)
```

#### `startAutoSave(getCanvasStateFn)`

Starts auto-saving canvas state every 30s.

**Parameters:**
- `getCanvasStateFn` (Function): Function that returns canvas state object

**Example:**
```javascript
startAutoSave(() => ({
  shapes: Array.from(shapes.values()),
  selectedIds: selectedIds.value,
  zoom: zoomLevel.value
}))
```

#### `applyRecovery(applyStateFn)`

Restores saved state after crash.

**Parameters:**
- `applyStateFn` (Function): Function to apply recovered state

**Returns:** boolean - Success status

**Example:**
```javascript
const success = applyRecovery((state) => {
  state.shapes.forEach(shape => {
    shapes.set(shape.id, shape)
  })
  selectedIds.value = state.selectedIds
  zoomLevel.value = state.zoom
  return true
})
```

---

## Event System

### Shape Events

Shapes emit events that can be handled:

```javascript
<Rectangle
  :rectangle="rect"
  @update="handleUpdate"
  @select="handleSelect"
/>

<TextShape
  :text="textShape"
  @update="handleUpdate"
  @edit="handleTextEdit"
  @select="handleSelect"
/>
```

**Events:**
- `update` - Shape properties changed
- `select` - Shape clicked/selected
- `edit` - Text shape double-clicked (text only)

---

## Utility Functions

### Shape Utilities

```javascript
import {
  generateId,
  getMaxZIndex,
  getMinZIndex,
  constrainToBounds,
  needsZIndexNormalization
} from './types/shapes'
```

#### `generateId(type)`

Generates unique shape ID.

```javascript
const id = generateId('rectangle')
// => "rect_1704067200000_abc123xyz"
```

#### `getMaxZIndex(shapes)` / `getMinZIndex(shapes)`

Gets max/min z-index from shape array.

```javascript
const maxZ = getMaxZIndex(shapes)
const newShape = {
  ...shapeData,
  zIndex: maxZ + 1
}
```

#### `constrainToBounds(shape, canvasWidth, canvasHeight)`

Keeps shape within canvas bounds (20px visible minimum).

```javascript
const constrained = constrainToBounds(shape, 3000, 3000)
```

---

## Type Definitions

### Shape Types

```typescript
type ShapeType = 'rectangle' | 'circle' | 'line' | 'text'

type Shape = Rectangle | Circle | Line | Text

interface Rectangle {
  id: string
  type: 'rectangle'
  x: number
  y: number
  width: number
  height: number
  fill: string
  rotation: number
  zIndex: number
  // ... metadata
}

// See ARCHITECTURE.md for complete type definitions
```

---

## Extension Examples

### Adding a New Shape Type

1. **Define shape type in `types/shapes.ts`:**

```typescript
interface Triangle extends BaseShape {
  type: 'triangle'
  points: [number, number, number, number, number, number]
}

export const DEFAULT_SHAPE_PROPERTIES = {
  // ...
  triangle: {
    points: [0, 100, 50, 0, 100, 100],
    fill: '#8b5cf6',
    stroke: null,
    strokeWidth: 0
  }
}
```

2. **Create component `components/Triangle.vue`:**

```vue
<template>
  <v-line
    :config="triangleConfig"
    @dragmove="handleDragMove"
    @dragend="handleDragEnd"
    @click="handleClick"
  />
</template>

<script setup>
// Implementation similar to Rectangle.vue
</script>
```

3. **Add to `useShapes.js` createShape:**

```javascript
case 'triangle':
  newShape = {
    ...baseShape,
    points: properties.points || DEFAULT_SHAPE_PROPERTIES.triangle.points,
    fill: properties.fill || DEFAULT_SHAPE_PROPERTIES.triangle.fill,
    closed: true
  }
  break
```

4. **Add to CanvasView template:**

```vue
<Triangle
  v-if="shape.type === 'triangle'"
  :triangle="shape"
  @update="handleShapeUpdate"
  @select="handleShapeSelect"
/>
```

---

### AI Integration Example

```javascript
// AI-powered shape suggestions
async function suggestLayout(shapes) {
  const layoutData = {
    shapes: shapes.map(s => ({
      type: s.type,
      bounds: { x: s.x, y: s.y, width: s.width, height: s.height }
    }))
  }
  
  const response = await fetch('https://ai-api.example.com/suggest-layout', {
    method: 'POST',
    body: JSON.stringify(layoutData)
  })
  
  const suggestions = await response.json()
  
  // Apply suggestions
  for (const suggestion of suggestions) {
    await updateShape(
      suggestion.shapeId,
      { x: suggestion.x, y: suggestion.y },
      userId,
      canvasId
    )
  }
}
```

---

*Last Updated: January 2025*

