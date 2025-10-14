<template>
  <div class="canvas-container">
    <!-- Loading indicator -->
    <LoadingSpinner 
      v-if="isLoading" 
      title="Loading Canvas..." 
      message="Setting up your collaborative workspace"
    />

    <!-- Error message -->
    <div v-if="error && !isLoading" class="error-message">
      <p>{{ error }}</p>
      <button @click="error = null" class="dismiss-error">Dismiss</button>
    </div>

    <!-- Toolbar -->
    <Toolbar @tool-selected="handleToolSelected" />

    <!-- Sync Status -->
    <SyncStatus
      :is-connected="isConnected"
      :is-syncing="isSyncing"
      :has-error="!!error"
      :user-count="activeUserCount + 1"
    />

    <!-- Zoom Controls -->
    <ZoomControls 
      :zoom="zoomLevel"
      @zoom-in="handleZoomIn"
      @zoom-out="handleZoomOut"
      @zoom-reset="handleZoomReset"
    />

    <!-- Performance Monitor (shown with ?debug=performance) -->
    <PerformanceMonitor />

    <!-- Testing Dashboard (shown with ?testing=true) -->
    <TestingDashboard />

    <!-- Konva Canvas -->
    <div ref="canvasWrapper" class="canvas-wrapper">
      <v-stage
        ref="stage"
        :config="stageConfig"
        @wheel="handleWheel"
        @mousedown="handleMouseDown"
        @mousemove="handleMouseMove"
        @mouseup="handleMouseUp"
        @mouseleave="handleMouseLeave"
        @dblclick="handleDoubleClick"
      >
        <v-layer ref="shapeLayer">
          <!-- Empty state when no shapes -->
          <EmptyState 
            v-if="!isLoading && shapesList.length === 0"
            type="canvas"
            title="Welcome to CollabCanvas!"
            message="Select a tool from the toolbar above and click on the canvas to create shapes"
            style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 10;"
          />
          
          <!-- Render all shapes based on type -->
          <template v-for="shape in shapesList" :key="shape.id">
            <!-- Rectangles -->
            <Rectangle
              v-if="shape.type === 'rectangle'"
              :rectangle="shape"
              :is-selected="selectedShapeIds.includes(shape.id)"
              @update="handleShapeUpdate"
              @select="handleShapeSelect"
            />
            
            <!-- Circles -->
            <Circle
              v-if="shape.type === 'circle'"
              :circle="shape"
              :is-selected="selectedShapeIds.includes(shape.id)"
              @update="handleShapeUpdate"
              @select="handleShapeSelect"
            />
            
            <!-- Lines -->
            <Line
              v-if="shape.type === 'line'"
              :line="shape"
              :is-selected="selectedShapeIds.includes(shape.id)"
              @update="handleShapeUpdate"
              @select="handleShapeSelect"
            />

            <!-- Text -->
            <TextShape
              v-if="shape.type === 'text'"
              :text="shape"
              :is-selected="selectedShapeIds.includes(shape.id)"
              @update="handleShapeUpdate"
              @edit="handleTextEdit"
              @select="handleShapeSelect"
            />
          </template>

          <!-- Transformer for resize/rotate handles -->
          <v-transformer ref="transformer" />
        </v-layer>
      </v-stage>

      <!-- Remote User Cursors -->
      <UserCursor
        v-for="cursor in remoteCursors"
        :key="cursor.userId"
        :cursor="cursor"
        :stage-attrs="stageConfig"
      />

      <!-- Text Editor -->
      <TextEditor
        :is-visible="showTextEditor"
        :text-shape="editingText"
        :stage-position="stagePosition"
        :stage-scale="zoomLevel"
        @save="handleTextSave"
        @cancel="handleTextCancel"
      />

      <!-- Text Format Toolbar -->
      <TextFormatToolbar
        :is-visible="showFormatToolbar"
        :text-shape="editingText"
        :stage-position="stagePosition"
        :stage-scale="zoomLevel"
        @format-change="handleFormatChange"
      />
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import VueKonva from 'vue-konva'
import Toolbar from '../components/Toolbar.vue'
import ZoomControls from '../components/ZoomControls.vue'
import Rectangle from '../components/Rectangle.vue'
import Circle from '../components/Circle.vue'
import Line from '../components/Line.vue'
import TextShape from '../components/TextShape.vue'
import TextEditor from '../components/TextEditor.vue'
import TextFormatToolbar from '../components/TextFormatToolbar.vue'
import SyncStatus from '../components/SyncStatus.vue'
import UserCursor from '../components/UserCursor.vue'
import PerformanceMonitor from '../components/PerformanceMonitor.vue'
import LoadingSpinner from '../components/LoadingSpinner.vue'
import EmptyState from '../components/EmptyState.vue'
import TestingDashboard from '../components/TestingDashboard.vue'
import { useShapes } from '../composables/useShapes'
import { useAuth } from '../composables/useAuth'
import { useCursors } from '../composables/useCursors'
import { usePresence } from '../composables/usePresence'
import { usePerformance } from '../composables/usePerformance'
import { useBugFixes } from '../utils/bugFixUtils'

export default {
  name: 'CanvasView',
  components: {
    Toolbar,
    ZoomControls,
    Rectangle,
    Circle,
    Line,
    TextShape,
    TextEditor,
    TextFormatToolbar,
    SyncStatus,
    UserCursor,
    PerformanceMonitor,
    LoadingSpinner,
    EmptyState,
    TestingDashboard
  },
  setup() {
    // Composables
    const { 
      shapes,
      rectangles, // Backward compatible alias
      createShape,
      createRectangle, // Backward compatible
      updateShape,
      updateRectangle, // Backward compatible
      getAllShapes,
      getAllRectangles, // Backward compatible
      loadShapesFromFirestore,
      loadRectanglesFromFirestore, // Backward compatible
      startRealtimeSync, 
      stopRealtimeSync,
      isLoading, 
      error,
      isConnected,
      isSyncing,
      // Text lock management
      isTextLocked,
      acquireTextLock,
      releaseTextLock,
      getLockedTextOwner
    } = useShapes()
    const { user } = useAuth()
    const {
      cursors,
      updateCursorPosition,
      subscribeToCursors,
      cleanup: cleanupCursors,
      screenToCanvas,
      getAllCursors,
      cleanupStaleCursors
    } = useCursors()
    const {
      setUserOnline,
      setUserOffline,
      subscribeToPresence,
      getActiveUserCount,
      cleanup: cleanupPresence,
      handleBeforeUnload
    } = usePresence()
    
    const { measureRender, throttle, logPerformanceSummary } = usePerformance()

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

    // Tool state management
    const activeTool = ref('select')
    const isCreatingLine = ref(false)
    const lineStartPoint = ref(null)

    // Selection state
    const selectedShapeIds = ref([])
    const transformer = ref(null)

    // Text editing state
    const editingTextId = ref(null)
    const showTextEditor = ref(false)
    const showFormatToolbar = ref(false)
    const editingText = computed(() => {
      if (!editingTextId.value) return null
      return shapes.get(editingTextId.value)
    })

    // Shape state
    const shapesList = computed(() => getAllShapes())
    const rectanglesList = computed(() => getAllRectangles()) // Backward compatible

    // Cursor state
    const remoteCursors = computed(() => getAllCursors())
    const activeUserCount = computed(() => getActiveUserCount())
    const isMouseOverCanvas = ref(false)

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
        // Clear selection when clicking on empty canvas
        clearSelection()
        
        // Get click position relative to the stage (accounting for pan/zoom)
        const pointer = stage.value.getNode().getPointerPosition()
        const stageAttrs = stage.value.getNode().attrs
        
        // Convert screen coordinates to canvas coordinates
        const canvasX = (pointer.x - stageAttrs.x) / stageAttrs.scaleX
        const canvasY = (pointer.y - stageAttrs.y) / stageAttrs.scaleY
        
        const userId = user.value?.uid || 'anonymous'
        
        // Route to appropriate shape creator based on active tool
        if (activeTool.value === 'rectangle') {
          await createShape('rectangle', { x: canvasX, y: canvasY }, userId)
          return
        } else if (activeTool.value === 'circle') {
          await createShape('circle', { x: canvasX, y: canvasY }, userId)
          return
        } else if (activeTool.value === 'line') {
          // Start line creation
          if (!isCreatingLine.value) {
            isCreatingLine.value = true
            lineStartPoint.value = { x: canvasX, y: canvasY }
            return
          }
        } else if (activeTool.value === 'select') {
          // Start panning
          isDragging.value = true
          lastPointerPosition.x = pointer.x
          lastPointerPosition.y = pointer.y
          canvasWrapper.value.style.cursor = 'grabbing'
        }
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

    // Handle cursor tracking when mouse moves over canvas
    const handleCursorMove = (e) => {
      if (!isMouseOverCanvas.value || !user.value) return

      const pointer = stage.value.getNode().getPointerPosition()
      if (!pointer) return

      // Convert screen coordinates to canvas coordinates
      const canvasCoords = screenToCanvas(pointer.x, pointer.y, stageConfig.value)
      
      // Get user info
      const userId = user.value.uid
      const userName = user.value.displayName || user.value.email?.split('@')[0] || 'Anonymous'
      const cursorColor = '#667eea' // Will get from user profile later
      
      // Update cursor position in Firestore (throttled)
      updateCursorPosition('default', userId, canvasCoords.x, canvasCoords.y, userName, cursorColor)
    }

    // Handle mouse entering canvas
    const handleMouseEnter = () => {
      isMouseOverCanvas.value = true
    }

    // Handle mouse leaving canvas
    const handleMouseLeave = () => {
      isMouseOverCanvas.value = false
    }

    // Handle rectangle updates
    // Tool selection handler
    const handleToolSelected = (toolName) => {
      activeTool.value = toolName
      
      // Reset line creation if switching away from line tool
      if (toolName !== 'line') {
        isCreatingLine.value = false
        lineStartPoint.value = null
      }
      
      // Update cursor
      if (toolName === 'select') {
        canvasWrapper.value.style.cursor = 'grab'
      } else {
        canvasWrapper.value.style.cursor = 'crosshair'
      }
    }

    // Shape selection handlers
    const handleShapeSelect = (shapeId, event) => {
      // Check if Shift key is pressed for multi-select
      const isShiftKey = event?.shiftKey || false
      
      if (isShiftKey) {
        // Multi-select: add/remove from selection
        const index = selectedShapeIds.value.indexOf(shapeId)
        if (index > -1) {
          // Already selected, remove it
          selectedShapeIds.value = selectedShapeIds.value.filter(id => id !== shapeId)
        } else {
          // Not selected, add it
          selectedShapeIds.value = [...selectedShapeIds.value, shapeId]
        }
      } else {
        // Single select: replace selection
        selectedShapeIds.value = [shapeId]
      }
      
      // Attach transformer to selected shapes
      updateTransformer()
    }

    const clearSelection = () => {
      selectedShapeIds.value = []
      if (transformer.value) {
        transformer.value.getNode().nodes([])
      }
    }

    const updateTransformer = () => {
      if (!transformer.value || !stage.value) return
      
      const transformerNode = transformer.value.getNode()
      const stageNode = stage.value.getNode()
      
      if (selectedShapeIds.value.length === 0) {
        transformerNode.nodes([])
        return
      }
      
      // Find selected shape nodes
      const selectedNodes = selectedShapeIds.value
        .map(id => stageNode.findOne(`#${id}`))
        .filter(node => node != null)
      
      if (selectedNodes.length > 0) {
        transformerNode.nodes(selectedNodes)
        
        // Configure transformer based on shape type
        const firstShape = shapes.get(selectedShapeIds.value[0])
        if (firstShape) {
          configureTransformer(firstShape.type)
        }
      }
    }

    const configureTransformer = (shapeType) => {
      if (!transformer.value) return
      
      const transformerNode = transformer.value.getNode()
      
      // Global transformer styling
      transformerNode.borderStroke('#3B82F6') // Blue border
      transformerNode.borderStrokeWidth(2)
      transformerNode.anchorFill('white')
      transformerNode.anchorStroke('#3B82F6')
      transformerNode.anchorStrokeWidth(2)
      transformerNode.anchorSize(8)
      transformerNode.anchorCornerRadius(2)
      
      // Rotation handle styling
      transformerNode.rotateAnchorOffset(20)
      transformerNode.rotationSnaps([0, 45, 90, 135, 180, 225, 270, 315]) // Snap angles for Shift+rotate
      transformerNode.rotationSnapTolerance(5) // Snap tolerance in degrees
      
      // Enable Shift for aspect ratio lock, Alt for center resize (Konva handles these automatically)
      // These work when user holds Shift or Alt during resize/rotate
      
      // Configure based on shape type
      switch (shapeType) {
        case 'rectangle':
          // Standard 8-handle resize + rotation
          transformerNode.enabledAnchors(['top-left', 'top-center', 'top-right', 
                                         'middle-right', 'middle-left',
                                         'bottom-left', 'bottom-center', 'bottom-right'])
          transformerNode.rotateEnabled(true)
          // Minimum size constraint
          transformerNode.boundBoxFunc((oldBox, newBox) => {
            // Minimum 10x10px
            if (Math.abs(newBox.width) < 10 || Math.abs(newBox.height) < 10) {
              return oldBox
            }
            return newBox
          })
          break
        case 'circle':
          // 4 handles only (N, S, E, W), no rotation handle
          transformerNode.enabledAnchors(['top-center', 'bottom-center', 
                                         'middle-left', 'middle-right'])
          transformerNode.rotateEnabled(false)
          // Minimum 5px radius (10px diameter)
          transformerNode.boundBoxFunc((oldBox, newBox) => {
            const minDiameter = 10
            if (Math.abs(newBox.width) < minDiameter || Math.abs(newBox.height) < minDiameter) {
              return oldBox
            }
            return newBox
          })
          break
        case 'line':
          // Endpoint handles only
          transformerNode.enabledAnchors(['top-left', 'bottom-right'])
          transformerNode.rotateEnabled(true)
          transformerNode.boundBoxFunc(null) // No minimum for lines
          break
        case 'text':
          // Horizontal resize only (E/W handles)
          transformerNode.enabledAnchors(['middle-left', 'middle-right'])
          transformerNode.rotateEnabled(true)
          // Minimum 20px width
          transformerNode.boundBoxFunc((oldBox, newBox) => {
            if (Math.abs(newBox.width) < 20) {
              return oldBox
            }
            return newBox
          })
          break
        default:
          // Full transform
          transformerNode.enabledAnchors(['top-left', 'top-center', 'top-right', 
                                         'middle-right', 'middle-left',
                                         'bottom-left', 'bottom-center', 'bottom-right'])
          transformerNode.rotateEnabled(true)
          transformerNode.boundBoxFunc(null)
      }
      
      transformerNode.getLayer().batchDraw()
    }

    // Throttled transform update during drag (60 FPS = 16ms)
    const throttledTransformUpdate = throttle(async (shapeId, updates, userId) => {
      // Update local state only during transform (no Firestore save)
      await updateShape(shapeId, updates, userId, 'default', false)
    }, 16)

    // Handle transform changes during drag (throttled)
    const handleTransform = (e) => {
      const node = e.target
      const shapeId = node.id()
      
      if (!shapeId || !shapes.has(shapeId)) return
      
      const userId = user.value?.uid || 'anonymous'
      const shape = shapes.get(shapeId)
      
      // Get transform updates based on shape type
      const updates = {
        rotation: node.rotation()
      }
      
      if (shape.type === 'rectangle' || shape.type === 'text') {
        updates.x = node.x()
        updates.y = node.y()
        updates.width = node.width() * node.scaleX()
        updates.height = node.height() * node.scaleY()
      } else if (shape.type === 'circle') {
        updates.x = node.x()
        updates.y = node.y()
        updates.radius = shape.radius * Math.max(node.scaleX(), node.scaleY())
      } else if (shape.type === 'line') {
        updates.x = node.x()
        updates.y = node.y()
        const scaleX = node.scaleX()
        const scaleY = node.scaleY()
        updates.points = shape.points.map((coord, i) => 
          i % 2 === 0 ? coord * scaleX : coord * scaleY
        )
      }
      
      // Throttled update during transform
      throttledTransformUpdate(shapeId, updates, userId)
    }

    // Handle transformer end (final save)
    const handleTransformEnd = async (e) => {
      const node = e.target
      const shapeId = node.id()
      
      if (!shapeId || !shapes.has(shapeId)) return
      
      const userId = user.value?.uid || 'anonymous'
      const shape = shapes.get(shapeId)
      
      // Get transform updates based on shape type
      const updates = {
        rotation: node.rotation()
      }
      
      if (shape.type === 'rectangle' || shape.type === 'text') {
        updates.x = node.x()
        updates.y = node.y()
        updates.width = node.width() * node.scaleX()
        updates.height = node.height() * node.scaleY()
        // Reset scale after applying to width/height
        node.scaleX(1)
        node.scaleY(1)
      } else if (shape.type === 'circle') {
        updates.x = node.x()
        updates.y = node.y()
        // Calculate new radius from scale
        updates.radius = shape.radius * Math.max(node.scaleX(), node.scaleY())
        node.scaleX(1)
        node.scaleY(1)
      } else if (shape.type === 'line') {
        updates.x = node.x()
        updates.y = node.y()
        // For lines, scale affects the points
        const scaleX = node.scaleX()
        const scaleY = node.scaleY()
        updates.points = shape.points.map((coord, i) => 
          i % 2 === 0 ? coord * scaleX : coord * scaleY
        )
        node.scaleX(1)
        node.scaleY(1)
      }
      
      // Final update with Firestore save
      await updateShape(shapeId, updates, userId, 'default', true)
    }

    // Text editing handlers
    const handleTextEdit = async (textId) => {
      const userId = user.value?.uid
      if (!userId) return

      // Check if locked by another user
      if (isTextLocked(textId, userId)) {
        const owner = getLockedTextOwner(textId)
        alert(`This text is currently being edited by ${owner}`)
        return
      }

      // Acquire lock
      const lockResult = await acquireTextLock(textId, userId)
      if (!lockResult.success) {
        alert(lockResult.message)
        return
      }

      // Open editor
      editingTextId.value = textId
      showTextEditor.value = true
      showFormatToolbar.value = true
    }

    const handleTextSave = async (newText) => {
      if (!editingTextId.value) return

      const userId = user.value?.uid || 'anonymous'

      // Update text content
      await updateShape(editingTextId.value, { text: newText }, userId, 'default', true)

      // Release lock and close editor
      await releaseTextLock(editingTextId.value, userId)
      editingTextId.value = null
      showTextEditor.value = false
      showFormatToolbar.value = false
    }

    const handleTextCancel = async () => {
      if (!editingTextId.value) return

      const userId = user.value?.uid || 'anonymous'

      // Release lock and close editor
      await releaseTextLock(editingTextId.value, userId)
      editingTextId.value = null
      showTextEditor.value = false
      showFormatToolbar.value = false
    }

    const handleFormatChange = async (format) => {
      if (!editingTextId.value) return

      const userId = user.value?.uid || 'anonymous'

      // Update text formatting
      await updateShape(editingTextId.value, format, userId, 'default', true)
    }

    // Generic shape update handler
    const handleShapeUpdate = async (shapeUpdate) => {
      const { id, saveToFirestore, ...updates } = shapeUpdate
      const userId = user.value?.uid || 'anonymous'
      
      // Always update local state immediately for smooth dragging
      await updateShape(id, updates, userId, 'default', false)
      
      // Save to Firestore only when saveToFirestore flag is true (e.g., on drag end)
      if (saveToFirestore) {
        console.log(`Shape ${id} updated:`, updates)
        await updateShape(id, updates, userId, 'default', true)
      }
    }

    // Backward compatible rectangle update handler
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

    const handleMouseUp = async (e) => {
      // Handle line creation completion
      if (isCreatingLine.value && lineStartPoint.value) {
        const pointer = stage.value.getNode().getPointerPosition()
        const stageAttrs = stage.value.getNode().attrs
        
        // Convert screen coordinates to canvas coordinates
        const canvasX = (pointer.x - stageAttrs.x) / stageAttrs.scaleX
        const canvasY = (pointer.y - stageAttrs.y) / stageAttrs.scaleY
        
        // Calculate line length
        const dx = canvasX - lineStartPoint.value.x
        const dy = canvasY - lineStartPoint.value.y
        const length = Math.sqrt(dx * dx + dy * dy)
        
        // Only create line if minimum length is met (10px)
        if (length >= 10) {
          const userId = user.value?.uid || 'anonymous'
          await createShape('line', { 
            points: [
              lineStartPoint.value.x, 
              lineStartPoint.value.y, 
              canvasX, 
              canvasY
            ] 
          }, userId)
        }
        
        // Reset line creation state
        isCreatingLine.value = false
        lineStartPoint.value = null
        return
      }
      
      // Handle panning end
      isDragging.value = false
      if (activeTool.value === 'select') {
        canvasWrapper.value.style.cursor = 'grab'
      } else {
        canvasWrapper.value.style.cursor = 'crosshair'
      }
    }

    // Handle double-click for text creation
    const handleDoubleClick = async (e) => {
      const clickedOnEmpty = e.target === stage.value.getNode()
      
      if (clickedOnEmpty) {
        // Double-click on empty canvas - create new text
        const pointer = stage.value.getNode().getPointerPosition()
        const stageAttrs = stage.value.getNode().attrs
        
        // Convert screen coordinates to canvas coordinates
        const canvasX = (pointer.x - stageAttrs.x) / stageAttrs.scaleX
        const canvasY = (pointer.y - stageAttrs.y) / stageAttrs.scaleY
        
        const userId = user.value?.uid || 'anonymous'
        
        // Create text shape
        const newText = await createShape('text', { x: canvasX, y: canvasY }, userId)
        
        // Immediately open editor for the new text
        if (newText) {
          handleTextEdit(newText.id)
        }
      }
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
      
      // Set up transformer event listeners
      if (transformer.value) {
        const transformerNode = transformer.value.getNode()
        transformerNode.on('transform', handleTransform) // During transform (throttled)
        transformerNode.on('transformend', handleTransformEnd) // On transform end (save)
      }
      
      // Load existing shapes from Firestore
      try {
        console.log('🔄 Loading shapes from Firestore...')
        await loadShapesFromFirestore('default')
        console.log(`✅ Loaded ${shapesList.value.length} shapes successfully`)
        
        // Start real-time synchronization after initial load
        console.log('🔄 Starting real-time sync...')
        startRealtimeSync('default')
        console.log('✅ Real-time sync started')
      } catch (err) {
        console.error('❌ Failed to load shapes on mount:', err)
        // Continue without shapes - user can still create new ones
        // Still start real-time sync for new shapes
        startRealtimeSync('default')
      }

      // Start cursor tracking if user is authenticated
      if (user.value) {
        subscribeToCursors('default', user.value.uid)
        
        // Set user online for presence
        const userName = user.value.displayName || user.value.email?.split('@')[0] || 'Anonymous'
        const cursorColor = '#667eea' // Will get from user profile later
        await setUserOnline('default', user.value.uid, userName, cursorColor)
        
        // Subscribe to presence updates
        subscribeToPresence('default', user.value.uid)
      }

      // Add cursor tracking to mousemove
      if (canvasWrapper.value) {
        canvasWrapper.value.addEventListener('mousemove', handleCursorMove, { passive: true })
        canvasWrapper.value.addEventListener('mouseenter', handleMouseEnter)
        canvasWrapper.value.addEventListener('mouseleave', handleMouseLeave)
      }

      // Add beforeunload handler for presence cleanup
      const handleUnload = () => {
        const userId = user.value?.uid
        if (userId) {
          handleBeforeUnload('default', userId)
        }
      }
      window.addEventListener('beforeunload', handleUnload)
    })

    onUnmounted(() => {
      window.removeEventListener('resize', handleResize)
      
      // Clean up real-time listeners
      stopRealtimeSync()
      
      // Clean up cursor tracking
      const userId = user.value?.uid
      cleanupCursors('default', userId)
      
      // Clean up presence tracking
      cleanupPresence('default', userId)
      
      // Remove cursor event listeners
      if (canvasWrapper.value) {
        canvasWrapper.value.removeEventListener('mousemove', handleCursorMove)
        canvasWrapper.value.removeEventListener('mouseenter', handleMouseEnter)
        canvasWrapper.value.removeEventListener('mouseleave', handleMouseLeave)
      }

      // Remove beforeunload handler
      const handleUnload = () => {
        const userId = user.value?.uid
        if (userId) {
          handleBeforeUnload('default', userId)
        }
      }
      window.removeEventListener('beforeunload', handleUnload)
    })

    return {
      // Refs
      stage,
      canvasWrapper,
      shapeLayer,
      transformer,
      
      // State
      stageConfig,
      zoomLevel,
      activeTool,
      shapesList,
      rectanglesList, // Backward compatible
      remoteCursors,
      activeUserCount,
      isLoading,
      error,
      isConnected,
      isSyncing,
      // Selection state
      selectedShapeIds,
      // Text editing state
      editingTextId,
      showTextEditor,
      showFormatToolbar,
      editingText,
      
      // Event handlers
      handleToolSelected,
      handleWheel,
      handleMouseDown,
      handleMouseMove,
      handleMouseUp,
      handleMouseLeave,
      handleDoubleClick,
      handleZoomIn,
      handleZoomOut,
      handleZoomReset,
      handleShapeUpdate,
      handleRectangleUpdate, // Backward compatible
      // Selection handlers
      handleShapeSelect,
      clearSelection,
      updateTransformer,
      handleTransformEnd,
      // Text handlers
      handleTextEdit,
      handleTextSave,
      handleTextCancel,
      handleFormatChange
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