<template>
  <div class="canvas-container">
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
          <!-- Shapes will be added here in PR #4 -->
        </v-layer>
      </v-stage>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import VueKonva from 'vue-konva'
import ZoomControls from '../components/ZoomControls.vue'

export default {
  name: 'CanvasView',
  components: {
    ZoomControls
  },
  setup() {
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

    // Pan functionality
    const handleMouseDown = (e) => {
      // Only pan on background (not on shapes)
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
        } else {
          canvasWrapper.value.style.cursor = 'default'
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
    onMounted(() => {
      // Set initial canvas position
      centerCanvas()
      
      // Add resize listener
      window.addEventListener('resize', handleResize)
      
      // Set initial cursor
      canvasWrapper.value.style.cursor = 'grab'
    })

    onUnmounted(() => {
      window.removeEventListener('resize', handleResize)
    })

    return {
      // Refs
      stage,
      canvasWrapper,
      shapeLayer,
      
      // State
      stageConfig,
      zoomLevel,
      
      // Event handlers
      handleWheel,
      handleMouseDown,
      handleMouseMove,
      handleMouseUp,
      handleZoomIn,
      handleZoomOut,
      handleZoomReset
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
</style>