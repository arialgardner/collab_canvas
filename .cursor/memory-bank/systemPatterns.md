# System Patterns: CollabCanvas

## Architecture Overview

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────┐
│                     Vue 3 Frontend                       │
│  ┌────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │ Components │  │  Composables │  │   Konva Canvas │  │
│  │            │──│  (State Mgmt)│──│                │  │
│  └────────────┘  └──────────────┘  └────────────────┘  │
└────────────────────────┬────────────────────────────────┘
                         │
                    Firebase SDK
                         │
┌────────────────────────┴────────────────────────────────┐
│                   Firebase Backend                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Firestore  │  │     Auth     │  │   Hosting    │  │
│  │  (Real-time) │  │              │  │              │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Core Patterns

### 1. Composables-Based State Management

**Pattern:** Vue 3 Composition API with composables for encapsulated, reusable logic

**Structure:**
```javascript
// Composable Pattern
export const useShapes = () => {
  // Local reactive state (Map for O(1) lookups)
  const shapes = reactive(new Map())
  const isLoading = ref(false)
  const error = ref(null)
  
  // Operations
  const createShape = async (type, properties) => { ... }
  const updateShape = async (id, updates) => { ... }
  const deleteShape = async (id) => { ... }
  
  // Real-time sync
  const startRealtimeSync = (canvasId) => { ... }
  const stopRealtimeSync = () => { ... }
  
  return {
    shapes,
    isLoading,
    error,
    createShape,
    updateShape,
    deleteShape,
    startRealtimeSync,
    stopRealtimeSync
  }
}
```

**Key Composables:**
- `useShapes.js` - Shape CRUD and real-time sync (will be renamed from useRectangles.js)
- `useFirestore.js` - Firebase operations abstraction
- `useAuth.js` - Authentication state and operations
- `useCursors.js` - Real-time cursor tracking
- `usePresence.js` - User online/offline presence
- `usePerformance.js` - Performance monitoring utilities

### 2. Optimistic Updates with Server Reconciliation

**Pattern:** Update local state immediately, sync to Firestore, reconcile with server timestamps

**Implementation:**
```javascript
// 1. Optimistic: Update local state immediately
shapes.set(shapeId, updatedShape)

// 2. Broadcast: Send to Firestore with serverTimestamp
await updateDoc(docRef, {
  ...updates,
  lastModified: serverTimestamp(),
  lastModifiedBy: userId
})

// 3. Reconcile: Listener receives server update
onSnapshot(collection, (snapshot) => {
  snapshot.docChanges().forEach((change) => {
    const serverShape = change.doc.data()
    const localShape = shapes.get(change.doc.id)
    
    // Accept server version if newer (last write wins)
    if (!localShape || serverShape.lastModified > localShape.lastModified) {
      shapes.set(change.doc.id, serverShape)
    }
  })
})
```

**Benefits:**
- Instant UI feedback (no perceived latency)
- Server is source of truth
- Automatic conflict resolution
- Works offline (with eventual consistency)

### 3. Reactive Map for Shape Storage

**Pattern:** Use `reactive(new Map())` for O(1) lookups and automatic reactivity

**Why Map over Array:**
```javascript
// ❌ Array - O(n) lookups
const shapes = ref([])
const shape = shapes.value.find(s => s.id === id) // O(n)

// ✅ Map - O(1) lookups  
const shapes = reactive(new Map())
const shape = shapes.get(id) // O(1)

// Still get array when needed
const shapesList = Array.from(shapes.values())
```

**Pattern Usage:**
- Shapes indexed by ID for instant access
- Reactive Map updates trigger Vue re-renders
- Efficient for 1000+ shapes
- Clean CRUD operations (set, get, delete, clear)

### 4. Component-Based Shape Rendering

**Pattern:** Separate Vue components for each shape type with Konva integration

**Structure:**
```vue
<template>
  <v-rect :config="konvaConfig" @dragend="handleDragEnd" />
</template>

<script>
export default {
  props: ['rectangle'],
  emits: ['update'],
  setup(props, { emit }) {
    const konvaConfig = computed(() => ({
      id: props.rectangle.id,
      x: props.rectangle.x,
      y: props.rectangle.y,
      width: props.rectangle.width,
      height: props.rectangle.height,
      fill: props.rectangle.fill,
      draggable: true,
      // Performance optimizations
      perfectDrawEnabled: false,
      listening: true
    }))
    
    const handleDragEnd = (e) => {
      emit('update', props.rectangle.id, {
        x: e.target.x(),
        y: e.target.y()
      }, true) // true = save to Firestore
    }
    
    return { konvaConfig, handleDragEnd }
  }
}
</script>
```

**Pattern Benefits:**
- Separation of concerns (shape logic encapsulated)
- Reusable across different contexts
- Event-driven updates (parent handles persistence)
- Type-specific components (Rectangle.vue, Circle.vue, Line.vue, Text.vue)

### 5. Real-Time Sync Pattern

**Pattern:** Firestore onSnapshot listeners with change detection

**Implementation:**
```javascript
const startRealtimeSync = (canvasId) => {
  const collectionRef = collection(db, 'canvases', canvasId, 'shapes')
  const q = query(collectionRef, orderBy('createdAt', 'asc'))
  
  unsubscribe = onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      const shape = { id: change.doc.id, ...change.doc.data() }
      
      if (change.type === 'added') {
        if (!shapes.has(shape.id)) {
          shapes.set(shape.id, shape)
        }
      }
      
      if (change.type === 'modified') {
        const local = shapes.get(shape.id)
        // Last write wins based on server timestamp
        if (!local || shape.lastModified > local.lastModified) {
          shapes.set(shape.id, shape)
        }
      }
      
      if (change.type === 'removed') {
        shapes.delete(shape.id)
      }
    })
  })
  
  return unsubscribe // Cleanup function
}
```

**Lifecycle Management:**
```javascript
onMounted(() => {
  startRealtimeSync('default')
})

onUnmounted(() => {
  stopRealtimeSync() // Calls unsubscribe()
})
```

### 6. Throttled Network Updates

**Pattern:** Throttle rapid updates during drag/resize to reduce network load

**Implementation:**
```javascript
// Throttle to 16ms (60 FPS)
const throttledUpdate = throttle((shapeId, updates) => {
  updateDoc(docRef, {
    ...updates,
    lastModified: serverTimestamp()
  })
}, 16)

// During drag: Throttled updates
shape.on('dragmove', () => {
  throttledUpdate(shape.id(), { x: shape.x(), y: shape.y() })
})

// On drag end: Immediate final update
shape.on('dragend', () => {
  updateDoc(docRef, {
    x: shape.x(),
    y: shape.y(),
    lastModified: serverTimestamp()
  })
})
```

### 7. Canvas Coordinate System

**Pattern:** Convert between screen coordinates and canvas coordinates accounting for pan/zoom

**Implementation:**
```javascript
// Screen to canvas coordinates
const screenToCanvas = (screenX, screenY, stageAttrs) => {
  return {
    x: (screenX - stageAttrs.x) / stageAttrs.scaleX,
    y: (screenY - stageAttrs.y) / stageAttrs.scaleY
  }
}

// Canvas to screen coordinates
const canvasToScreen = (canvasX, canvasY, stageAttrs) => {
  return {
    x: canvasX * stageAttrs.scaleX + stageAttrs.x,
    y: canvasY * stageAttrs.scaleY + stageAttrs.y
  }
}
```

**Usage:**
```javascript
// Creating shape at click position
handleMouseDown(e) => {
  const pointer = stage.getPointerPosition()
  const canvasCoords = screenToCanvas(pointer.x, pointer.y, stageConfig.value)
  createShape(canvasCoords.x, canvasCoords.y)
}
```

### 8. Error Handling Pattern

**Pattern:** Retry with exponential backoff for transient failures

**Implementation:**
```javascript
const retry = async (operation, maxAttempts = 3, delay = 1000) => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      if (attempt === maxAttempts) throw error
      
      console.warn(`Attempt ${attempt} failed, retrying...`)
      await new Promise(resolve => setTimeout(resolve, delay * attempt))
    }
  }
}

// Usage
const saveShape = async (shape) => {
  return await retry(async () => {
    await setDoc(docRef, shape)
  }, 3, 1000)
}
```

### 9. Z-Index Management

**Pattern:** Periodic normalization to prevent runaway z-index values

**Implementation:**
```javascript
// Check and normalize if gap exceeds 1000
const normalizeZIndices = async () => {
  const allShapes = Array.from(shapes.values())
  const sorted = allShapes.sort((a, b) => a.zIndex - b.zIndex)
  
  const max = sorted[sorted.length - 1]?.zIndex || 0
  const min = sorted[0]?.zIndex || 0
  
  if (max - min > 1000) {
    // Renumber 0 to N
    const updates = sorted.map((shape, index) => ({
      id: shape.id,
      zIndex: index
    }))
    
    // Batch update to Firestore
    await Promise.all(updates.map(({ id, zIndex }) =>
      updateDoc(docRef(id), { zIndex })
    ))
  }
}

// Run periodically or after 100 operations
```

### 10. Performance Optimization Patterns

**Viewport Culling:**
```javascript
// Only render shapes in viewport + margin
const isShapeInViewport = (shape, viewport, margin = 500) => {
  return (
    shape.x + shape.width >= viewport.x - margin &&
    shape.x <= viewport.x + viewport.width + margin &&
    shape.y + shape.height >= viewport.y - margin &&
    shape.y <= viewport.y + viewport.height + margin
  )
}

// Apply to shape rendering
const visibleShapes = computed(() =>
  getAllShapes().filter(shape => isShapeInViewport(shape, viewport.value))
)
```

**Konva Optimizations:**
```javascript
// Layer caching
layer.cache()
layer.batchDraw() // Instead of draw()

// Shape optimizations
{
  perfectDrawEnabled: false,
  listening: true,
  shadowForStrokeEnabled: false,
  hitStrokeWidth: 0
}
```

## Data Flow Patterns

### Shape Creation Flow
```
User Click → CanvasView Handler → createShape() →
  ├─ Optimistic: shapes.set(id, shape)
  └─ Broadcast: setDoc(firestore) →
      Server → onSnapshot → (reconcile if needed)
```

### Shape Update Flow  
```
User Drag → Rectangle Component → @update event →
  CanvasView Handler → updateShape() →
    ├─ Optimistic: shapes.set(id, updates)
    └─ Throttled: updateDoc(firestore) →
        Server → onSnapshot → (reconcile if newer)
```

### Multi-User Sync Flow
```
User A Action → Firestore Write →
  Server Timestamp → Firestore Broadcast →
    User B Listener → Compare Timestamps →
      Accept if Newer → Update Local State → Re-render
```

## Key Design Decisions

1. **Reactive Map over Array:** O(1) lookups, better performance with many shapes
2. **Optimistic Updates:** Instant UI feedback, server reconciliation
3. **Composables Pattern:** Encapsulated logic, reusable across components
4. **Last Write Wins:** Simple conflict resolution, predictable behavior
5. **Independent Selection:** No selection sync, reduces network traffic
6. **Throttled Updates:** 16ms intervals during continuous operations
7. **Viewport Culling:** Only render visible shapes for performance
8. **TypeScript Interfaces:** Type safety for shape data models
9. **Separate Components:** One component per shape type for clarity
10. **Server Timestamps:** Source of truth for conflict resolution

