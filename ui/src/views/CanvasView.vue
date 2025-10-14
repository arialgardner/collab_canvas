<template>
  <div class="canvas-container">
    <!-- Loading indicator -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-spinner">
        <div class="spinner"></div>
        <p>Loading canvas...</p>
      </div>
    </div>

    <!-- Error message -->
    <div v-if="error && !isLoading" class="error-message">
      <p>{{ error }}</p>
      <button @click="error = null" class="dismiss-error">Dismiss</button>
    </div>

    <!-- Sync Status -->
    <SyncStatus
      :is-connected="isConnected"
      :is-syncing="isSyncing"
      :has-error="!!error"
      :user-count="1"
    />

    <!-- Zoom Controls -->
    <ZoomControls 
      :zoom="zoomLevel"
      @zoom-in="handleZoomIn"
      @zoom-out="handleZoomOut"
      @zoom-reset="handleZoomReset"
    />

    <!-- Konva Canvas -->
    <div ref="canvasWrapper" class="canvas-wrapper">
      <v-stage
        ref="stage"
        :config="stageConfig"
        @wheel="handleWheel"
        @mousedown="handleMouseDown"
        @mousemove="handleMouseMove"
        @mouseup="handleMouseUp"
      >
        <v-layer ref="shapeLayer">
          <!-- Rectangles -->
          <Rectangle
            v-for="rectangle in rectanglesList"
            :key="rectangle.id"
            :rectangle="rectangle"
            @update="handleRectangleUpdate"
          />
        </v-layer>
      </v-stage>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import VueKonva from 'vue-konva'
import ZoomControls from '../components/ZoomControls.vue'
import Rectangle from '../components/Rectangle.vue'
import SyncStatus from '../components/SyncStatus.vue'
import { useRectangles } from '../composables/useRectangles'
import { useAuth } from '../composables/useAuth'

export default {
  name: 'CanvasView',
  components: {
    ZoomControls,
    Rectangle,
    SyncStatus
  },
  setup() {
    // Composables
    const { 
      rectangles, 
      createRectangle, 
      updateRectangle, 
      getAllRectangles, 
      loadRectanglesFromFirestore, 
      startRealtimeSync, 
      stopRealtimeSync,
      isLoading, 
      error,
      isConnected,
      isSyncing 
    } = useRectangles()
    const { user } = useAuth()

    // Refs
    const stage = ref(null)
    const canvasWrapper = ref(null)
    const shapeLayer = ref(null)

    // Canvas configuration
    const CANVAS_SIZE = 3000 // Virtual canvas size
    const MIN_ZOOM = 0.25
    const MAX_ZOOM = 3
    const ZOOM_FACTOR = 1.05

    // Reactive state
    const stageSize = reactive({
      width: window.innerWidth,
      height: window.innerHeight - 70 // Account for navbar height
    })

    const stagePosition = reactive({
      x: 0,
      y: 0
    })

    const zoomLevel = ref(1)
    const isDragging = ref(false)
    const lastPointerPosition = reactive({ x: 0, y: 0 })

    // Rectangle state
    const rectanglesList = computed(() => getAllRectangles())

    // Stage configuration
    const stageConfig = computed(() => ({
      width: stageSize.width,
      height: stageSize.height,
      x: stagePosition.x,
      y: stagePosition.y,
      scaleX: zoomLevel.value,
      scaleY: zoomLevel.value,
      draggable: false // We'll handle dragging manually for better control
    }))

    // Initialize canvas position (centered)
    const centerCanvas = () => {
      const centerX = (stageSize.width - CANVAS_SIZE * zoomLevel.value) / 2
      const centerY = (stageSize.height - CANVAS_SIZE * zoomLevel.value) / 2
      
      stagePosition.x = centerX
      stagePosition.y = centerY
    }

    // Zoom functions
    const clampZoom = (zoom) => {
      return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom))
    }

    const zoomAtPoint = (pointer, direction) => {
      const oldZoom = zoomLevel.value
      const newZoom = clampZoom(
        direction > 0 ? oldZoom * ZOOM_FACTOR : oldZoom / ZOOM_FACTOR
      )
      
      if (newZoom === oldZoom) return

      // Calculate new position to zoom towards cursor
      const mousePointTo = {
        x: (pointer.x - stagePosition.x) / oldZoom,
        y: (pointer.y - stagePosition.y) / oldZoom
      }

      zoomLevel.value = newZoom

      const newPos = {
        x: pointer.x - mousePointTo.x * newZoom,
        y: pointer.y - mousePointTo.y * newZoom
      }

      stagePosition.x = newPos.x
      stagePosition.y = newPos.y
    }

    // Zoom control handlers
    const handleZoomIn = () => {
      const centerPoint = {
        x: stageSize.width / 2,
        y: stageSize.height / 2
      }
      zoomAtPoint(centerPoint, 1)
    }

    const handleZoomOut = () => {
      const centerPoint = {
        x: stageSize.width / 2,
        y: stageSize.height / 2
      }
      zoomAtPoint(centerPoint, -1)
    }

    const handleZoomReset = () => {
      zoomLevel.value = 1
      centerCanvas()
    }

    // Mouse wheel zoom
    const handleWheel = (e) => {
      e.evt.preventDefault()
      
      const pointer = stage.value.getNode().getPointerPosition()
      const direction = e.evt.deltaY > 0 ? -1 : 1
      
      zoomAtPoint(pointer, direction)
    }

    // Mouse events for canvas interaction
    const handleMouseDown = async (e) => {
      const clickedOnEmpty = e.target === stage.value.getNode()
      
      if (clickedOnEmpty) {
        // Get click position relative to the stage (accounting for pan/zoom)
        const pointer = stage.value.getNode().getPointerPosition()
        const stageAttrs = stage.value.getNode().attrs
        
        // Convert screen coordinates to canvas coordinates
        const canvasX = (pointer.x - stageAttrs.x) / stageAttrs.scaleX
        const canvasY = (pointer.y - stageAttrs.y) / stageAttrs.scaleY
        
        // Create rectangle at click position
        const userId = user.value?.uid || 'anonymous'
        await createRectangle(canvasX, canvasY, userId)
        
        // Don't start panning when creating rectangle
        return
      }

      // Start panning only if clicked on empty area
      if (e.target === stage.value.getNode()) {
        isDragging.value = true
        const pointer = stage.value.getNode().getPointerPosition()
        lastPointerPosition.x = pointer.x
        lastPointerPosition.y = pointer.y
        
        // Change cursor to grabbing
        canvasWrapper.value.style.cursor = 'grabbing'
      }
    }

    const handleMouseMove = (e) => {
      if (!isDragging.value) {
        // Change cursor based on what's under the mouse
        if (e.target === stage.value.getNode()) {
          canvasWrapper.value.style.cursor = 'grab'
        }
        return
      }

      // Pan the stage
      const pointer = stage.value.getNode().getPointerPosition()
      const deltaX = pointer.x - lastPointerPosition.x
      const deltaY = pointer.y - lastPointerPosition.y

      stagePosition.x += deltaX
      stagePosition.y += deltaY

      lastPointerPosition.x = pointer.x
      lastPointerPosition.y = pointer.y
    }

    // Handle rectangle updates
    const handleRectangleUpdate = async (rectangleId, updates, isDragEnd = false) => {
      const userId = user.value?.uid || 'anonymous'
      
      // Always update local state immediately for smooth dragging
      await updateRectangle(rectangleId, updates, userId, 'default', false)
      
      // Save to Firestore only on drag end to avoid excessive writes
      if (isDragEnd) {
        console.log(`Rectangle ${rectangleId} moved to:`, updates)
        await updateRectangle(rectangleId, updates, userId, 'default', true)
      }
    }

    const handleMouseUp = () => {
      isDragging.value = false
      canvasWrapper.value.style.cursor = 'grab'
    }

    // Handle window resize
    const handleResize = () => {
      stageSize.width = window.innerWidth
      stageSize.height = window.innerHeight - 70 // Account for navbar
    }

    // Lifecycle
    onMounted(async () => {
      // Set initial canvas position
      centerCanvas()
      
      // Add resize listener
      window.addEventListener('resize', handleResize)
      
      // Set initial cursor
      canvasWrapper.value.style.cursor = 'grab'
      
      // Load existing rectangles from Firestore
      try {
        await loadRectanglesFromFirestore('default')
        
        // Start real-time synchronization after initial load
        startRealtimeSync('default')
      } catch (err) {
        console.error('Failed to load rectangles on mount:', err)
        // Continue without rectangles - user can still create new ones
        // Still start real-time sync for new rectangles
        startRealtimeSync('default')
      }
    })

    onUnmounted(() => {
      window.removeEventListener('resize', handleResize)
      
      // Clean up real-time listener
      stopRealtimeSync()
    })

    return {
      // Refs
      stage,
      canvasWrapper,
      shapeLayer,
      
      // State
      stageConfig,
      zoomLevel,
      rectanglesList,
      isLoading,
      error,
      isConnected,
      isSyncing,
      
      // Event handlers
      handleWheel,
      handleMouseDown,
      handleMouseMove,
      handleMouseUp,
      handleZoomIn,
      handleZoomOut,
      handleZoomReset,
      handleRectangleUpdate
    }
  }
}
</script>

<style scoped>
.canvas-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #f5f5f5;
}

.canvas-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
}

/* Canvas background with subtle grid pattern */
.canvas-wrapper::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: 
    radial-gradient(circle, #ddd 1px, transparent 1px);
  background-size: 20px 20px;
  pointer-events: none;
  z-index: -1;
}

/* Disable text selection on canvas */
.canvas-wrapper {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
}

/* Loading overlay */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(245, 245, 245, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e2e8f0;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-spinner p {
  color: #4a5568;
  font-weight: 500;
}

/* Error message */
.error-message {
  position: absolute;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  background: #fed7d7;
  color: #c53030;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  border: 1px solid #fca5a5;
  z-index: 1001;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.dismiss-error {
  background: none;
  border: 1px solid #c53030;
  color: #c53030;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
}

.dismiss-error:hover {
  background: #c53030;
  color: white;
}
</style>