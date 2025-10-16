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
      <Toolbar @tool-selected="handleToolSelected" :can-undo="canUndo" :can-redo="canRedo" @undo="handleUndo" @redo="handleRedo" />

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
    <div ref="canvasWrapper" class="canvas-wrapper" @click="handleCloseContextMenu">
      <!-- Empty state when no shapes (outside Konva stage) -->
      <EmptyState 
        v-if="!isLoading && shapesList.length === 0"
        type="canvas"
        title="Welcome to CollabCanvas!"
        message="Select a tool from the toolbar above and click on the canvas to create shapes"
        style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 10; pointer-events: none;"
      />

      <v-stage
        ref="stage"
        :config="stageConfig"
        @wheel="handleWheel"
        @mousedown="handleMouseDown"
        @mousemove="handleMouseMove"
        @mouseup="handleMouseUp"
        @mouseleave="handleMouseLeave"
        @dblclick="handleDoubleClick"
        @contextmenu="handleContextMenu"
      >
        <v-layer ref="shapeLayer">
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

          <!-- Marquee Selection Rectangle -->
          <v-rect
            v-if="selectionRect.visible"
            :config="{
              x: selectionRect.width < 0 ? selectionRect.x + selectionRect.width : selectionRect.x,
              y: selectionRect.height < 0 ? selectionRect.y + selectionRect.height : selectionRect.y,
              width: Math.abs(selectionRect.width),
              height: Math.abs(selectionRect.height),
              stroke: '#3B82F6',
              strokeWidth: 2,
              dash: [10, 5],
              fill: 'rgba(59, 130, 246, 0.1)',
              listening: false
            }"
          />

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

      <!-- Context Menu -->
      <ContextMenu
        :is-visible="contextMenuVisible"
        :position="contextMenuPosition"
        :has-selection="selectedShapeIds.length > 0"
        :has-clipboard="hasClipboard"
        @bring-to-front="handleContextBringToFront"
        @bring-forward="handleContextBringForward"
        @send-backward="handleContextSendBackward"
        @send-to-back="handleContextSendToBack"
        @duplicate="handleContextDuplicate"
        @copy="handleContextCopy"
        @paste="handleContextPaste"
        @delete="handleContextDelete"
        @select-all="handleContextSelectAll"
        @close="handleCloseContextMenu"
      />
    </div>
    
    <!-- Confirmation Modal (outside canvas-wrapper for proper z-index) -->
    <ConfirmModal
      :is-visible="confirmModalVisible"
      title="Delete Shapes"
      :message="confirmModalMessage"
      confirm-text="Delete"
      @confirm="handleConfirmDelete"
      @cancel="handleCancelDelete"
    />

    <!-- Properties Panel -->
    <PropertiesPanel
      :selected-shapes="selectedShapesData"
      :canvas-width="canvasWidth"
      :canvas-height="canvasHeight"
      :total-shapes="shapesList.length"
      :active-users="activeUserCount"
      @update-property="handleUpdateProperty"
      @update-canvas-size="handleUpdateCanvasSize"
      @bulk-update="handleBulkUpdate"
    />

    <!-- Recovery Modal -->
    <RecoveryModal
      :is-visible="showRecoveryModal"
      :recovery-age="recoveryMeta.age"
      :timestamp="recoveryMeta.ts"
      :is-restoring="false"
      @restore="handleRecover"
      @discard="handleDiscardRecovery"
    />

    <!-- Version History Modal (owner-only visibility handled by NavBar button) -->
    <VersionHistory
      :is-visible="showVersionHistory"
      :versions="versionsList"
      :is-loading="versionsLoading"
      :can-restore="canRestoreVersions"
      @close="handleCloseVersionHistory"
      @restore="handleRestoreVersion"
    />
  </div>
</template>

<script>
import { ref, reactive, onMounted, onUnmounted, onBeforeUnmount, computed, watch } from 'vue'
import VueKonva from 'vue-konva'
import Toolbar from '../components/Toolbar.vue'
import ZoomControls from '../components/ZoomControls.vue'
import Rectangle from '../components/Rectangle.vue'
import Circle from '../components/Circle.vue'
import Line from '../components/Line.vue'
import TextShape from '../components/TextShape.vue'
import TextEditor from '../components/TextEditor.vue'
import TextFormatToolbar from '../components/TextFormatToolbar.vue'
import ContextMenu from '../components/ContextMenu.vue'
import ConfirmModal from '../components/ConfirmModal.vue'
import SyncStatus from '../components/SyncStatus.vue'
import UserCursor from '../components/UserCursor.vue'
import PerformanceMonitor from '../components/PerformanceMonitor.vue'
import Notifications from '../components/Notifications.vue'
import LoadingSpinner from '../components/LoadingSpinner.vue'
import EmptyState from '../components/EmptyState.vue'
import TestingDashboard from '../components/TestingDashboard.vue'
import PropertiesPanel from '../components/PropertiesPanel.vue'
import RecoveryModal from '../components/RecoveryModal.vue'
import VersionHistory from '../components/VersionHistory.vue'
import { useShapes } from '../composables/useShapes'
import { getMaxZIndex } from '../types/shapes'
import { useAuth } from '../composables/useAuth'
import { useCanvases } from '../composables/useCanvases'
import { useCursors } from '../composables/useCursors'
import { usePresence } from '../composables/usePresence'
import { usePerformance } from '../composables/usePerformance'
import { usePerformanceMonitoring } from '../composables/usePerformanceMonitoring'
import { useUndoRedo } from '../composables/useUndoRedo'
import { useConnectionState } from '../composables/useConnectionState'
import { useQueueProcessor } from '../composables/useQueueProcessor'
import { useStateReconciliation } from '../composables/useStateReconciliation'
import { useCrashRecovery } from '../composables/useCrashRecovery'
import { useVersions } from '../composables/useVersions'
import { useInactivityLogout } from '../composables/useInactivityLogout'
import { useBugFixes } from '../utils/bugFixUtils'
import { useRoute, useRouter } from 'vue-router'

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
    ContextMenu,
    ConfirmModal,
    PropertiesPanel,
    RecoveryModal,
    VersionHistory,
    SyncStatus,
    UserCursor,
    PerformanceMonitor,
    Notifications,
    LoadingSpinner,
    EmptyState,
    TestingDashboard
  },
  setup() {
    // Router
    const route = useRoute()
    const router = useRouter()
    const canvasId = computed(() => route.params.canvasId || 'default')
    
    // Composables
    const { user } = useAuth()
    
    // Computed property for user name
    const userName = computed(() => {
      if (!user.value) return 'Anonymous'
      return user.value.displayName || user.value.email?.split('@')[0] || 'Anonymous'
    })
    
    const {
      currentCanvas,
      getCanvas,
      updateCanvas,
      subscribeToCanvas,
      unsubscribeFromCanvas,
      getUserRole,
      canEdit: canEditCanvas,
      canManagePermissions,
      canDelete: canDeleteCanvas,
      grantAccessFromLink,
      isLoading: canvasLoading,
      error: canvasError
    } = useCanvases()
    
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
      getLockedTextOwner,
      // Layer operations
      bringToFront,
      sendToBack,
      bringForward,
      sendBackward,
      // Delete operations
      deleteShapes,
      // Duplicate operations
      duplicateShapes
    } = useShapes()
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
      cleanup: cleanupPresence
    } = usePresence()
    
    const { measureRender, throttle, logPerformanceSummary } = usePerformance()
    const { state: connectionState, setSyncHandler } = useConnectionState()
    const { processQueue } = useQueueProcessor()
    const { reconcile, startPeriodic, stopPeriodic, triggerOnVisibilityChange } = useStateReconciliation()
    const { saveSnapshot, loadSnapshot, clearSnapshot } = useCrashRecovery()
    const { isLoading: versionsLoading, versions: versionsList, listVersions, createVersion } = useVersions()
    const { canUndo, canRedo, addAction, undo, redo, setUndoRedoFlag, beginGroup, endGroup, clear } = useUndoRedo()

    // Inactivity tracking - auto logout after 10 minutes
    useInactivityLogout(canvasId)

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
    const showVersionHistory = ref(false)
    const canRestoreVersions = computed(() => true) // owner-only checked via NavBar button visibility

    // Grouping state for arrow-key nudges
    const nudgeGroupActive = ref(false)
    let nudgeGroupTimer = null

    // Tool state management
    const activeTool = ref('select')
    const isCreatingLine = ref(false)
    const lineStartPoint = ref(null)
    
    // Viewer mode - computed based on canvas permissions
    const isViewerMode = computed(() => {
      if (!currentCanvas.value || !user.value) return false
      const role = getUserRole(currentCanvas.value, user.value.uid)
      return role === 'viewer'
    })
    
    const canUserEdit = computed(() => {
      if (!currentCanvas.value || !user.value) return false
      return canEditCanvas(currentCanvas.value, user.value.uid)
    })

    // Selection state
    const selectedShapeIds = ref([])
    const transformer = ref(null)
    
    // Marquee selection state
    const isSelecting = ref(false)
    const selectionRect = reactive({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      visible: false
    })

    // Context menu state
    const contextMenuVisible = ref(false)
    const contextMenuPosition = reactive({ x: 0, y: 0 })
    
    // Confirmation modal state
    const confirmModalVisible = ref(false)
    const confirmModalMessage = ref('')
    const pendingDeleteIds = ref([])
    
    // Clipboard state (local, not synchronized)
    const clipboard = ref([])
    const showRecoveryModal = ref(false)
    const recoveryMeta = ref({ age: '', ts: 0 })
    const hasClipboard = computed(() => clipboard.value.length > 0)

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
    const allRemoteCursors = computed(() => getAllCursors())
    
    // Filter cursors to only show those within canvas bounds
    const remoteCursors = computed(() => {
      const cursors = allRemoteCursors.value
      
      // Get actual canvas wrapper dimensions from DOM element
      if (!canvasWrapper.value) {
        return [] // No cursors if canvas wrapper not mounted yet
      }
      
      const wrapperRect = canvasWrapper.value.getBoundingClientRect()
      const canvasWrapperWidth = wrapperRect.width
      const canvasWrapperHeight = wrapperRect.height
      
      return cursors.filter(cursor => {
        // Convert canvas coordinates to screen coordinates
        const canvasX = cursor.x || 0
        const canvasY = cursor.y || 0
        
        const scaleX = stageConfig.value.scaleX || 1
        const scaleY = stageConfig.value.scaleY || 1
        const offsetX = stageConfig.value.x || 0
        const offsetY = stageConfig.value.y || 0
        
        const screenX = canvasX * scaleX + offsetX
        const screenY = canvasY * scaleY + offsetY
        
        // Check if cursor is within canvas wrapper bounds
        // Use tighter bounds (20px margin) to prevent overflow onto properties panel
        return screenX >= -20 && 
               screenX <= canvasWrapperWidth - 20 && 
               screenY >= -20 && 
               screenY <= canvasWrapperHeight + 20
      })
    })
    
    const activeUserCount = computed(() => getActiveUserCount())

    // Performance metrics: update counts (rendered == total for now)
    watch([shapesList], () => {
      try {
        const perf = usePerformanceMonitoring()
        perf.updateShapeMetrics(shapesList.value.length, shapesList.value.length)
      } catch {}
    }, { immediate: true })
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
        
        // Prevent shape creation in viewer mode
        if (isViewerMode.value && activeTool.value !== 'select') {
          // Force select tool in viewer mode
          activeTool.value = 'select'
        }
        
        // Route to appropriate shape creator based on active tool
        if (activeTool.value === 'rectangle' && canUserEdit.value) {
          await createShape('rectangle', { x: canvasX, y: canvasY }, userId, canvasId.value, userName.value)
          return
        } else if (activeTool.value === 'circle' && canUserEdit.value) {
          await createShape('circle', { x: canvasX, y: canvasY }, userId, canvasId.value, userName.value)
          return
        } else if (activeTool.value === 'line' && canUserEdit.value) {
          // Start line creation
          if (!isCreatingLine.value) {
            isCreatingLine.value = true
            lineStartPoint.value = { x: canvasX, y: canvasY }
            return
          }
        } else if (activeTool.value === 'text' && canUserEdit.value) {
          // Create text shape and immediately open editor
          const newText = await createShape('text', { x: canvasX, y: canvasY }, userId, canvasId.value, userName.value)
          if (newText) {
            handleTextEdit(newText.id)
          }
          return
        } else if (activeTool.value === 'select') {
          // Check if Shift key is held for marquee selection
          if (e.evt && e.evt.shiftKey) {
            // Start marquee selection
            isSelecting.value = true
            selectionRect.x = canvasX
            selectionRect.y = canvasY
            selectionRect.width = 0
            selectionRect.height = 0
            selectionRect.visible = true
          } else {
            // Start panning
            isDragging.value = true
            lastPointerPosition.x = pointer.x
            lastPointerPosition.y = pointer.y
            canvasWrapper.value.style.cursor = 'grabbing'
          }
        }
      }
    }

    const handleMouseMove = (e) => {
      // Handle marquee selection update
      if (isSelecting.value) {
        const pointer = stage.value.getNode().getPointerPosition()
        const stageAttrs = stage.value.getNode().attrs
        const canvasX = (pointer.x - stageAttrs.x) / stageAttrs.scaleX
        const canvasY = (pointer.y - stageAttrs.y) / stageAttrs.scaleY
        
        // Update selection rectangle dimensions
        selectionRect.width = canvasX - selectionRect.x
        selectionRect.height = canvasY - selectionRect.y
        return
      }
      
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
      updateCursorPosition(canvasId.value, userId, canvasCoords.x, canvasCoords.y, userName, cursorColor)
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
      // Prevent tool changes in viewer mode
      if (isViewerMode.value) {
        activeTool.value = 'select'
        return
      }
      
      activeTool.value = toolName
      
      // Reset line creation if switching away from line tool
      if (toolName !== 'line') {
        isCreatingLine.value = false
        lineStartPoint.value = null
      }
      
      // Update cursor - add null check to prevent errors during mount
      if (canvasWrapper.value) {
        if (toolName === 'select') {
          canvasWrapper.value.style.cursor = 'grab'
        } else if (toolName === 'text') {
          canvasWrapper.value.style.cursor = 'text'
        } else {
          canvasWrapper.value.style.cursor = 'crosshair'
        }
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

    // Context menu handlers
    const handleContextMenu = (e) => {
      e.evt.preventDefault()
      contextMenuPosition.x = e.evt.clientX
      contextMenuPosition.y = e.evt.clientY
      contextMenuVisible.value = true
    }

    const handleCloseContextMenu = () => {
      contextMenuVisible.value = false
    }

    const handleContextBringToFront = async () => {
      if (selectedShapeIds.value.length > 0 && user.value) {
        await bringToFront(selectedShapeIds.value, user.value.uid, canvasId.value)
      }
    }

    const handleContextBringForward = async () => {
      if (selectedShapeIds.value.length > 0 && user.value) {
        await bringForward(selectedShapeIds.value, user.value.uid, canvasId.value)
      }
    }

    const handleContextSendBackward = async () => {
      if (selectedShapeIds.value.length > 0 && user.value) {
        await sendBackward(selectedShapeIds.value, user.value.uid, canvasId.value)
      }
    }

    const handleContextSendToBack = async () => {
      if (selectedShapeIds.value.length > 0 && user.value) {
        await sendToBack(selectedShapeIds.value, user.value.uid, canvasId.value)
      }
    }

    const handleContextSelectAll = () => {
      selectedShapeIds.value = getAllShapes().map(s => s.id)
      updateTransformer()
    }

    // Duplicate handler
    const handleContextDuplicate = async () => {
      if (selectedShapeIds.value.length > 0 && user.value) {
        const duplicatedIds = await duplicateShapes(selectedShapeIds.value, user.value.uid, canvasId.value)
        // Select duplicated shapes
        selectedShapeIds.value = duplicatedIds
        updateTransformer()
      }
    }

    const handleContextCopy = () => {
      if (selectedShapeIds.value.length > 0) {
        // Copy selected shapes to clipboard
        clipboard.value = selectedShapeIds.value.map(id => {
          const shape = shapes.get(id)
          return shape ? { ...shape } : null
        }).filter(s => s !== null)
        
        console.log(`Copied ${clipboard.value.length} shape(s) to clipboard`)
      }
    }

    const handleContextPaste = async () => {
      if (clipboard.value.length === 0 || !user.value) return
      
      const userId = user.value.uid
      const maxZ = getMaxZIndex(Array.from(shapes.values()))
      const pastedIds = []
      
      for (let i = 0; i < clipboard.value.length; i++) {
        const copiedShape = clipboard.value[i]
        
        // Remove id from copied shape so createShape generates a new one
        const { id, createdBy, createdAt, lastModified, lastModifiedBy, ...shapeData } = copiedShape
        
        const newShape = await createShape(
          copiedShape.type,
          {
            ...shapeData,
            x: copiedShape.x + 20,
            y: copiedShape.y + 20,
            zIndex: maxZ + i + 1
          },
          userId,
          canvasId.value,
          userName.value
        )
        
        if (newShape) {
          pastedIds.push(newShape.id)
        }
      }
      
      // Select pasted shapes
      selectedShapeIds.value = pastedIds
      updateTransformer()
      
      console.log(`Pasted ${pastedIds.length} shape(s)`)
    }

    const handleContextDelete = () => {
      if (selectedShapeIds.value.length === 0) return
      
      // Show confirmation modal if >5 shapes are selected
      if (selectedShapeIds.value.length > 5) {
        pendingDeleteIds.value = [...selectedShapeIds.value]
        confirmModalMessage.value = `Are you sure you want to delete ${selectedShapeIds.value.length} shapes? This action can be undone with Cmd+Z.`
        confirmModalVisible.value = true
      } else {
        // Delete immediately if <=5 shapes
        performDelete(selectedShapeIds.value)
      }
    }
    
    const performDelete = async (shapeIds) => {
      // Track deletion for undo
      shapeIds.forEach(id => {
        const shape = shapes.get(id)
        if (shape) {
          addAction({
            type: 'delete',
            data: { ...shape }
          })
        }
      })
      
      await deleteShapes(shapeIds, canvasId.value)
      clearSelection()
    }
    
    const handleConfirmDelete = async () => {
      await performDelete(pendingDeleteIds.value)
      confirmModalVisible.value = false
      pendingDeleteIds.value = []
    }
    
    const handleCancelDelete = () => {
      confirmModalVisible.value = false
      pendingDeleteIds.value = []
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
        
        // Ensure all nodes have their correct rotation from shape data
        selectedNodes.forEach(node => {
          const shapeId = node.id()
          const shape = shapes.get(shapeId)
          if (shape && shape.rotation !== undefined) {
            node.rotation(shape.rotation)
          }
        })
        
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
          // 8 handles with keepRatio for uniform scaling
          transformerNode.enabledAnchors(['top-left', 'top-center', 'top-right', 
                                         'middle-right', 'middle-left',
                                         'bottom-left', 'bottom-center', 'bottom-right'])
          transformerNode.rotateEnabled(false)
          transformerNode.keepRatio(true) // Keep circular shape
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
    // v3: These are interim updates, will be batched as low priority
    const throttledTransformUpdate = throttle(async (shapeId, updates, userId, userName) => {
      // Update local state only during transform (no Firestore save)
      // isFinal=false means this is an interim update (not used here since saveToFirestore=false)
      await updateShape(shapeId, updates, userId, canvasId.value, false, false, userName)
    }, 16)

    // Handle transform changes during drag (throttled)
    const handleTransform = (e) => {
      const node = e.target
      const shapeId = node.id()
      
      if (!shapeId || !shapes.has(shapeId)) return
      
      const userId = user.value?.uid || 'anonymous'
      const shape = shapes.get(shapeId)
      
      const scaleX = node.scaleX()
      const scaleY = node.scaleY()
      const isResizing = Math.abs(scaleX - 1) > 0.001 || Math.abs(scaleY - 1) > 0.001
      
      // Don't send updates during pure rotation - only on transformend
      if (!isResizing) return
      
      // Get transform updates based on shape type
      const updates = {
        rotation: node.rotation()
      }
      
      if (shape.type === 'rectangle' || shape.type === 'text') {
        const newWidth = node.width() * scaleX
        const newHeight = node.height() * scaleY
        // Convert center position back to top-left (accounting for offset)
        updates.x = node.x() - newWidth / 2
        updates.y = node.y() - newHeight / 2
        updates.width = newWidth
        updates.height = newHeight
      } else if (shape.type === 'circle') {
        // Calculate new radius (keepRatio ensures uniform scaling)
        const newWidth = node.width() * scaleX
        const newRadius = Math.max(5, newWidth / 2) // Min 5px radius
        updates.radius = newRadius
        // Update position (circle uses center, transformer uses top-left with offset)
        updates.x = node.x()
        updates.y = node.y()
      } else if (shape.type === 'line') {
        updates.x = node.x()
        updates.y = node.y()
        updates.points = shape.points.map((coord, i) => 
          i % 2 === 0 ? coord * scaleX : coord * scaleY
        )
      }
      
      // Throttled update during transform (only for resize, not rotation)
      throttledTransformUpdate(shapeId, updates, userId, userName.value)
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
      
      const scaleX = node.scaleX()
      const scaleY = node.scaleY()
      const wasResized = Math.abs(scaleX - 1) > 0.001 || Math.abs(scaleY - 1) > 0.001
      
      if (shape.type === 'rectangle' || shape.type === 'text') {
        // For rectangles/text, node position is at center (due to offset in component)
        // During rotation, Konva updates node.x/y to keep shape visually in place
        // We need to convert this center position back to top-left for our data model
        const currentWidth = wasResized ? node.width() * scaleX : node.width()
        const currentHeight = wasResized ? node.height() * scaleY : node.height()
        
        // Convert center position back to top-left
        updates.x = node.x() - currentWidth / 2
        updates.y = node.y() - currentHeight / 2
        
        if (wasResized) {
          updates.width = currentWidth
          updates.height = currentHeight
          // Update node dimensions and offset
          node.width(currentWidth)
          node.height(currentHeight)
          node.offsetX(currentWidth / 2)
          node.offsetY(currentHeight / 2)
          // Reset scale after applying to width/height
          node.scaleX(1)
          node.scaleY(1)
        }
      } else if (shape.type === 'circle') {
        if (wasResized) {
          // Calculate new radius (keepRatio ensures uniform scaling)
          const newWidth = node.width() * scaleX
          const newRadius = Math.max(5, newWidth / 2) // Min 5px radius
          updates.radius = newRadius
          // Update position (circle uses center, transformer uses top-left with offset)
          updates.x = node.x()
          updates.y = node.y()
          // Reset scale and update node dimensions with new offset
          node.width(newRadius * 2)
          node.height(newRadius * 2)
          node.offsetX(newRadius)
          node.offsetY(newRadius)
          node.scaleX(1)
          node.scaleY(1)
        } else {
          // Rotation without resize - update position
          updates.x = node.x()
          updates.y = node.y()
        }
      } else if (shape.type === 'line') {
        if (wasResized) {
          updates.x = node.x()
          updates.y = node.y()
          // For lines, scale affects the points
          updates.points = shape.points.map((coord, i) => 
            i % 2 === 0 ? coord * scaleX : coord * scaleY
          )
          node.scaleX(1)
          node.scaleY(1)
        } else {
          // Rotation without resize - update position
          updates.x = node.x()
          updates.y = node.y()
        }
      }
      
      // Final update with Firestore save (v3: isFinal=true for high priority)
      await updateShape(shapeId, updates, userId, canvasId.value, true, true, userName.value)
      // Note: pending remote updates are handled in useShapes after local edit ends
      
      // Force the layer to redraw to pick up rotation changes
      if (shapeLayer.value) {
        shapeLayer.value.getNode().batchDraw()
      }
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
      const lockResult = await acquireTextLock(textId, userId, canvasId.value)
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

      // Update text content (v3: isFinal=true for high priority)
      await updateShape(editingTextId.value, { text: newText }, userId, canvasId.value, true, true, userName.value)

      // Release lock and close editor
      await releaseTextLock(editingTextId.value, userId, canvasId.value)
      editingTextId.value = null
      showTextEditor.value = false
      showFormatToolbar.value = false
    }

    const handleTextCancel = async () => {
      if (!editingTextId.value) return

      const userId = user.value?.uid || 'anonymous'

      // Release lock and close editor
      await releaseTextLock(editingTextId.value, userId, canvasId.value)
      editingTextId.value = null
      showTextEditor.value = false
      showFormatToolbar.value = false
    }

    const handleFormatChange = async (format) => {
      if (!editingTextId.value) return

      const userId = user.value?.uid || 'anonymous'

      // Update text formatting (v3: isFinal=true for high priority)
      await updateShape(editingTextId.value, format, userId, canvasId.value, true, true, userName.value)
    }

    // Generic shape update handler
    const handleShapeUpdate = async (shapeUpdate) => {
      const { id, saveToFirestore, ...updates } = shapeUpdate
      const userId = user.value?.uid || 'anonymous'
      
      // Always update local state immediately for smooth dragging
      await updateShape(id, updates, userId, canvasId.value, false, false, userName.value)
      
      // Save to Firestore only when saveToFirestore flag is true (e.g., on drag end)
      // v3: isFinal=true for high priority when saveToFirestore is true
      if (saveToFirestore) {
        console.log(`Shape ${id} updated:`, updates)
        await updateShape(id, updates, userId, canvasId.value, true, true, userName.value)
      }
    }

    // Backward compatible rectangle update handler
    const handleRectangleUpdate = async (rectangleId, updates, isDragEnd = false) => {
      const userId = user.value?.uid || 'anonymous'
      
      // Always update local state immediately for smooth dragging
      await updateRectangle(rectangleId, updates, userId, canvasId.value, false)
      
      // Save to Firestore only on drag end to avoid excessive writes
      if (isDragEnd) {
        console.log(`Rectangle ${rectangleId} moved to:`, updates)
        await updateRectangle(rectangleId, updates, userId, canvasId.value, true)
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
          }, userId, canvasId.value, userName.value)
        }
        
        // Reset line creation state
        isCreatingLine.value = false
        lineStartPoint.value = null
        return
      }
      
      // Finalize marquee selection
      if (isSelecting.value) {
        // Normalize selection rectangle (handle negative width/height)
        const selX = selectionRect.width < 0 ? selectionRect.x + selectionRect.width : selectionRect.x
        const selY = selectionRect.height < 0 ? selectionRect.y + selectionRect.height : selectionRect.y
        const selWidth = Math.abs(selectionRect.width)
        const selHeight = Math.abs(selectionRect.height)
        
        // Find shapes that intersect with selection rectangle
        const intersectingShapes = shapesList.value.filter(shape => {
          // Get shape bounds based on type
          let shapeX, shapeY, shapeWidth, shapeHeight
          
          if (shape.type === 'rectangle' || shape.type === 'text') {
            shapeX = shape.x
            shapeY = shape.y
            shapeWidth = shape.width
            shapeHeight = shape.height
          } else if (shape.type === 'circle') {
            shapeX = shape.x - shape.radius
            shapeY = shape.y - shape.radius
            shapeWidth = shape.radius * 2
            shapeHeight = shape.radius * 2
          } else if (shape.type === 'line') {
            // Calculate line bounding box from points
            const points = shape.points || []
            const allX = [shape.x || 0, ...points.filter((_, i) => i % 2 === 0).map(x => (shape.x || 0) + x)]
            const allY = [shape.y || 0, ...points.filter((_, i) => i % 2 === 1).map(y => (shape.y || 0) + y)]
            shapeX = Math.min(...allX)
            shapeY = Math.min(...allY)
            shapeWidth = Math.max(...allX) - shapeX
            shapeHeight = Math.max(...allY) - shapeY
          }
          
          // Check for intersection
          return !(shapeX + shapeWidth < selX || 
                   shapeX > selX + selWidth ||
                   shapeY + shapeHeight < selY ||
                   shapeY > selY + selHeight)
        })
        
        // Update selection
        selectedShapeIds.value = intersectingShapes.map(s => s.id)
        updateTransformer()
        
        // Hide selection rectangle
        isSelecting.value = false
        selectionRect.visible = false
        return
      }
      
      // Handle panning end
      isDragging.value = false
      if (canvasWrapper.value) {
        if (activeTool.value === 'select') {
          canvasWrapper.value.style.cursor = 'grab'
        } else if (activeTool.value === 'text') {
          canvasWrapper.value.style.cursor = 'text'
        } else {
          canvasWrapper.value.style.cursor = 'crosshair'
        }
      }
    }

    // Handle double-click for text creation
    const handleDoubleClick = async (e) => {
      const clickedOnEmpty = e.target === stage.value.getNode()
      
      // Only create text on double-click if in select or text mode
      if (clickedOnEmpty && (activeTool.value === 'select' || activeTool.value === 'text') && canUserEdit.value) {
        // Double-click on empty canvas - create new text
        const pointer = stage.value.getNode().getPointerPosition()
        const stageAttrs = stage.value.getNode().attrs
        
        // Convert screen coordinates to canvas coordinates
        const canvasX = (pointer.x - stageAttrs.x) / stageAttrs.scaleX
        const canvasY = (pointer.y - stageAttrs.y) / stageAttrs.scaleY
        
        const userId = user.value?.uid || 'anonymous'
        
        // Create text shape
        const newText = await createShape('text', { x: canvasX, y: canvasY }, userId, canvasId.value, userName.value)
        
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
      
      // Force re-computation of cursor filtering by triggering reactive updates
      // This ensures cursors are properly filtered after resize
      if (remoteCursors.value) {
        // Access remoteCursors to trigger recomputation
        remoteCursors.value.length
      }
    }

    // Undo/Redo handlers
    const handleUndo = async () => {
      const action = undo()
      if (!action || !user.value) return
      
      setUndoRedoFlag(true) // Prevent tracking undo as a new action
      
      try {
        if (action.type === 'group') {
          // Undo grouped actions in reverse order
          for (let i = action.actions.length - 1; i >= 0; i--) {
            const a = action.actions[i]
            if (a.type === 'create') {
              await deleteShapes([a.data.id], canvasId.value)
            } else if (a.type === 'delete') {
              const { id, createdBy, createdAt, lastModified, lastModifiedBy, ...shapeProps } = a.data
              await createShape(a.data.type, shapeProps, user.value.uid, canvasId.value, userName.value)
            } else if (a.type === 'update') {
              await updateShape(a.data.id, a.data.oldValues, user.value.uid, canvasId.value, true, true, userName.value)
            } else if (a.type === 'property_change') {
              const { shapeId, property, oldValue } = a
              await updateShape(shapeId, { [property]: oldValue }, user.value.uid, canvasId.value, true, true, userName.value)
            }
          }
        } else if (action.type === 'create') {
          // Undo create = delete
          await deleteShapes([action.data.id], canvasId.value)
        } else if (action.type === 'delete') {
          // Undo delete = recreate with original properties
          const { id, createdBy, createdAt, lastModified, lastModifiedBy, ...shapeProps } = action.data
          const recreatedShape = await createShape(action.data.type, shapeProps, user.value.uid, canvasId.value, userName.value)
          // Note: recreated shape will have a new ID, not the original ID
        } else if (action.type === 'update') {
          // Undo update = restore old values
          await updateShape(action.data.id, action.data.oldValues, user.value.uid, canvasId.value, true, true, userName.value)
        } else if (action.type === 'property_change') {
          const { shapeId, property, oldValue } = action
          await updateShape(shapeId, { [property]: oldValue }, user.value.uid, canvasId.value, true, true, userName.value)
        }
      } finally {
        setUndoRedoFlag(false)
      }
    }

    const handleRedo = async () => {
      const action = redo()
      if (!action || !user.value) return
      
      setUndoRedoFlag(true) // Prevent tracking redo as a new action
      
      try {
        if (action.type === 'group') {
          // Redo grouped actions in recorded order
          for (let i = 0; i < action.actions.length; i++) {
            const a = action.actions[i]
            if (a.type === 'create') {
              const { id, createdBy, createdAt, lastModified, lastModifiedBy, ...shapeProps } = a.data
              await createShape(a.data.type, shapeProps, user.value.uid, canvasId.value, userName.value)
            } else if (a.type === 'delete') {
              await deleteShapes([a.data.id], canvasId.value)
            } else if (a.type === 'update') {
              await updateShape(a.data.id, a.data.newValues, user.value.uid, canvasId.value, true, true, userName.value)
            } else if (a.type === 'property_change') {
              const { shapeId, property, newValue } = a
              await updateShape(shapeId, { [property]: newValue }, user.value.uid, canvasId.value, true, true, userName.value)
            }
          }
        } else if (action.type === 'create') {
          // Redo create with original properties
          const { id, createdBy, createdAt, lastModified, lastModifiedBy, ...shapeProps } = action.data
          await createShape(action.data.type, shapeProps, user.value.uid, canvasId.value, userName.value)
        } else if (action.type === 'delete') {
          // Redo delete
          await deleteShapes([action.data.id], canvasId.value)
        } else if (action.type === 'update') {
          // Redo update = reapply new values
          await updateShape(action.data.id, action.data.newValues, user.value.uid, canvasId.value, true, true, userName.value)
        } else if (action.type === 'property_change') {
          const { shapeId, property, newValue } = action
          await updateShape(shapeId, { [property]: newValue }, user.value.uid, canvasId.value, true, true, userName.value)
        }
      } finally {
        setUndoRedoFlag(false)
      }
    }

    // Keyboard handler for global shortcuts
    const handleKeyDown = async (e) => {
      // Detect platform (Mac uses Cmd, others use Ctrl)
      const modKey = e.metaKey || e.ctrlKey
      
      // ESC to deselect all
      if (e.key === 'Escape') {
        clearSelection()
        // Also cancel text editing if active
        if (showTextEditor.value) {
          handleTextCancel()
        }
        return
      }
      
      // Layer operations (only if shapes are selected)
      if (selectedShapeIds.value.length > 0 && user.value) {
        const userId = user.value.uid
        
        // Cmd+] or Ctrl+]: Bring to front (grouped)
        if (modKey && e.key === ']' && !e.shiftKey) {
          e.preventDefault()
          beginGroup()
          await bringToFront(selectedShapeIds.value, userId, canvasId.value)
          // Track as updates
          for (const id of selectedShapeIds.value) {
            const shape = shapes.get(id)
            if (!shape) continue
            addAction({ type: 'update', data: { id, oldValues: { zIndex: shape.zIndex - 1 }, newValues: { zIndex: shape.zIndex } } })
          }
          endGroup()
          return
        }
        
        // Cmd+[ or Ctrl+[: Send to back (grouped)
        if (modKey && e.key === '[' && !e.shiftKey) {
          e.preventDefault()
          beginGroup()
          await sendToBack(selectedShapeIds.value, userId, canvasId.value)
          for (const id of selectedShapeIds.value) {
            const shape = shapes.get(id)
            if (!shape) continue
            addAction({ type: 'update', data: { id, oldValues: { zIndex: shape.zIndex + 1 }, newValues: { zIndex: shape.zIndex } } })
          }
          endGroup()
          return
        }
        
        // Cmd+Shift+] or Ctrl+Shift+]: Bring forward (grouped)
        if (modKey && e.shiftKey && e.key === ']') {
          e.preventDefault()
          beginGroup()
          await bringForward(selectedShapeIds.value, userId, canvasId.value)
          for (const id of selectedShapeIds.value) {
            const shape = shapes.get(id)
            if (!shape) continue
            addAction({ type: 'update', data: { id, oldValues: { zIndex: (shape.zIndex || 0) - 1 }, newValues: { zIndex: (shape.zIndex || 0) } } })
          }
          endGroup()
          return
        }
        
        // Cmd+Shift+[ or Ctrl+Shift+[: Send backward (grouped)
        if (modKey && e.shiftKey && e.key === '[') {
          e.preventDefault()
          beginGroup()
          await sendBackward(selectedShapeIds.value, userId, canvasId.value)
          for (const id of selectedShapeIds.value) {
            const shape = shapes.get(id)
            if (!shape) continue
            addAction({ type: 'update', data: { id, oldValues: { zIndex: (shape.zIndex || 0) + 1 }, newValues: { zIndex: (shape.zIndex || 0) } } })
          }
          endGroup()
          return
        }
      }
      
      // Cmd+A or Ctrl+A: Select all
      if (modKey && e.key === 'a') {
        e.preventDefault()
        selectedShapeIds.value = getAllShapes().map(s => s.id)
        updateTransformer()
        return
      }
      
      // Cmd+Z or Ctrl+Z: Undo
      if (modKey && e.key === 'z' && !e.shiftKey && canUndo.value) {
        e.preventDefault()
        await handleUndo()
        return
      }
      
      // Cmd+Y or Ctrl+Y or Cmd+Shift+Z: Redo
      if ((modKey && e.key === 'y') || (modKey && e.shiftKey && e.key === 'z')) {
        if (canRedo.value) {
          e.preventDefault()
          await handleRedo()
          return
        }
      }
      
      // Cmd+C or Ctrl+C: Copy selected shapes
      if (modKey && e.key === 'c' && selectedShapeIds.value.length > 0) {
        e.preventDefault()
        handleContextCopy()
        return
      }
      
      // Cmd+V or Ctrl+V: Paste from clipboard
      if (modKey && e.key === 'v' && clipboard.value.length > 0) {
        e.preventDefault()
        await handleContextPaste()
        return
      }
      
      // Cmd+D or Ctrl+D: Duplicate selected shapes
      if (modKey && e.key === 'd' && selectedShapeIds.value.length > 0 && !showTextEditor.value) {
        e.preventDefault()
        beginGroup()
        const userId = user.value?.uid || 'anonymous'
        const duplicatedIds = await duplicateShapes(selectedShapeIds.value, userId, canvasId.value)
        // Track as create actions so undo deletes them
        for (const id of duplicatedIds) {
          const shape = shapes.get(id)
          if (shape) {
            addAction({ type: 'create', data: { ...shape } })
          }
        }
        endGroup()
        
        // Select duplicated shapes (deselect originals)
        selectedShapeIds.value = duplicatedIds
        updateTransformer()
        return
      }
      
      // Delete or Backspace: Delete selected shapes
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedShapeIds.value.length > 0 && !showTextEditor.value) {
        e.preventDefault()
        
        // Show confirmation modal if >5 shapes are selected
        if (selectedShapeIds.value.length > 5) {
          pendingDeleteIds.value = [...selectedShapeIds.value]
          confirmModalMessage.value = `Are you sure you want to delete ${selectedShapeIds.value.length} shapes? This action can be undone with Cmd+Z.`
          confirmModalVisible.value = true
        } else {
          // Delete immediately if <=5 shapes
          beginGroup()
          await performDelete(selectedShapeIds.value)
          endGroup()
        }
      }

      // Arrow keys: Nudge selected shapes (1px, or 10px with Shift)
      if (!modKey && selectedShapeIds.value.length > 0 && !showTextEditor.value) {
        const step = e.shiftKey ? 10 : 1
        let dx = 0, dy = 0
        if (e.key === 'ArrowLeft') dx = -step
        if (e.key === 'ArrowRight') dx = step
        if (e.key === 'ArrowUp') dy = -step
        if (e.key === 'ArrowDown') dy = step
        if (dx !== 0 || dy !== 0) {
          e.preventDefault()
          if (!nudgeGroupActive.value) {
            nudgeGroupActive.value = true
            beginGroup()
          }
          clearTimeout(nudgeGroupTimer)
          const userId = user.value?.uid || 'anonymous'
          for (const id of selectedShapeIds.value) {
            const shape = shapes.get(id)
            if (!shape) continue
            const oldValues = { x: shape.x || 0, y: shape.y || 0 }
            const updates = { x: (shape.x || 0) + dx, y: (shape.y || 0) + dy }
            await updateShape(id, updates, userId, canvasId.value, true, true, userName.value)
            addAction({ type: 'update', data: { id, oldValues, newValues: updates } })
          }
          // Increment version ops counter and snapshot after >=10 ops
          try {
            versionOpsCounter += selectedShapeIds.value.length
            if (versionOpsCounter >= 10 && user.value?.uid) {
              const shapesArray = Array.from(shapes.values())
              if (shapesArray.length > 0) {
                await createVersion(canvasId.value, user.value.uid, userName.value, shapesArray, 'threshold')
                versionOpsCounter = 0
              }
            }
          } catch {}
          nudgeGroupTimer = setTimeout(() => {
            if (nudgeGroupActive.value) {
              endGroup()
              nudgeGroupActive.value = false
            }
          }, 300)
          return
        }
      }
    }

    // Lifecycle
    const updateHistoryFromRoute = async () => {
      if (route.query.history) {
        showVersionHistory.value = true
        try {
          await listVersions(canvasId.value)
        } catch (e) {
          console.error('Failed to load versions:', e)
        }
      } else {
        showVersionHistory.value = false
      }
      // Manual save trigger via ?save=1
      if (route.query.save && user.value?.uid) {
        try {
          const shapesArray = Array.from(shapes.values())
          if (shapesArray.length > 0) {
            await createVersion(canvasId.value, user.value.uid, userName.value, shapesArray, 'manual')
            await listVersions(canvasId.value)
          }
        } catch (e) {
          console.error('Manual version save failed:', e)
        }
      }
    }

    onMounted(async () => {
      // Register sync handler for ConnectionStatus "Sync Now"
      setSyncHandler(async () => {
        await processQueue()
        await reconcile(canvasId.value, shapes)
      })
      // Set initial canvas position
      centerCanvas()
      
      // Add resize listener
      window.addEventListener('resize', handleResize)
      
      // Add keyboard listener
      window.addEventListener('keydown', handleKeyDown)

      await updateHistoryFromRoute()
      // Initial snapshot on open
      try {
        const shapesArray = Array.from(shapes.values())
        if (shapesArray.length > 0 && user.value?.uid) {
          await createVersion(canvasId.value, user.value.uid, userName.value, shapesArray, 'initial')
        }
      } catch (e) {
        console.error('Initial version save failed:', e)
      }
      
      // Set initial cursor - add null check
      if (canvasWrapper.value) {
        canvasWrapper.value.style.cursor = 'grab'
      }
      
      // Set up transformer event listeners
      if (transformer.value) {
        const transformerNode = transformer.value.getNode()
        transformerNode.on('transform', handleTransform) // During transform (throttled)
        transformerNode.on('transformend', handleTransformEnd) // On transform end (save)
      }
      
      // Load canvas metadata first
      try {
        console.log(`🎨 Loading canvas: ${canvasId.value}`)
        await getCanvas(canvasId.value)
        console.log('✅ Canvas loaded:', currentCanvas.value)
        
        // Check if user has access
        if (!currentCanvas.value) {
          console.error('❌ Canvas not found')
          router.push({ name: 'Dashboard' })
          return
        }
        
        let userRole = getUserRole(currentCanvas.value, user.value.uid)
        
        // If user doesn't have access, grant editor permissions via shared link
        if (!userRole) {
          console.log('🔗 User accessing canvas via shared link - granting editor access')
          try {
            await grantAccessFromLink(canvasId.value, user.value.uid)
            userRole = 'editor'
            console.log(`✅ Granted editor access to user ${user.value.uid}`)
          } catch (error) {
            console.error('❌ Failed to grant access from link:', error)
            alert('Unable to access this canvas. Please check the link and try again.')
            router.push({ name: 'Dashboard' })
            return
          }
        }
        
        console.log(`✅ User role: ${userRole}`)
        
        // Subscribe to canvas updates
        subscribeToCanvas(canvasId.value)
        
        // Load existing shapes from Firestore
        console.log('🔄 Loading shapes from Firestore...')
        await loadShapesFromFirestore(canvasId.value)
        console.log(`✅ Loaded ${shapesList.value.length} shapes successfully`)
        
        // Start real-time synchronization after initial load
        console.log('🔄 Starting real-time sync...')
        startRealtimeSync(canvasId.value)
        console.log('✅ Real-time sync started')
      } catch (err) {
        console.error('❌ Failed to load canvas/shapes on mount:', err)
        // Check if it's a permission error
        if (err.message && (err.message.includes('not found') || err.message.includes('permission'))) {
          router.push({ name: 'Dashboard' })
          return
        }
        // Continue without shapes - user can still create new ones
        // Still start real-time sync for new shapes
        try {
          startRealtimeSync(canvasId.value)
        } catch (syncErr) {
          console.error('❌ Failed to start sync:', syncErr)
        }
      }

      // Start cursor tracking if user is authenticated
      if (user.value) {
        subscribeToCursors(canvasId.value, user.value.uid)
        
        // Set user online for presence
        const userName = user.value.displayName || user.value.email?.split('@')[0] || 'Anonymous'
        const cursorColor = '#667eea' // Will get from user profile later
        await setUserOnline(canvasId.value, user.value.uid, userName, cursorColor)
        
        // Subscribe to presence updates
        subscribeToPresence(canvasId.value, user.value.uid)
      }

      // Add cursor tracking to mousemove
      if (canvasWrapper.value) {
        canvasWrapper.value.addEventListener('mousemove', handleCursorMove, { passive: true })
        canvasWrapper.value.addEventListener('mouseenter', handleMouseEnter)
        canvasWrapper.value.addEventListener('mouseleave', handleMouseLeave)
      }

      // Start periodic reconciliation and tab-visibility reconciliation
      startPeriodic(canvasId.value, shapes, () => [], 60000)
      triggerOnVisibilityChange(canvasId.value, shapes, () => [])
      // Periodic version save every 5 minutes
      const savePeriodic = async () => {
        try {
          const shapesArray = Array.from(shapes.values())
          if (shapesArray.length > 0 && user.value?.uid) {
            await createVersion(canvasId.value, user.value.uid, userName.value, shapesArray, 'periodic')
          }
        } catch (e) {
          console.error('Periodic version save failed:', e)
        }
      }
      const periodicTimer = window.setInterval(savePeriodic, 5 * 60 * 1000)

      // Crash recovery detection on mount
      const rec = loadSnapshot(canvasId.value)
      if (rec && rec.timestamp && Date.now() - rec.timestamp < 5 * 60 * 1000) {
        // Offer recovery if < 5 minutes old
        const ageMin = Math.max(1, Math.round((Date.now() - rec.timestamp) / 60000))
        recoveryMeta.value = { age: `${ageMin} minute(s) ago`, ts: rec.timestamp }
        showRecoveryModal.value = true
      } else if (rec) {
        // Stale, clear
        clearSnapshot(canvasId.value)
      }
    })

    watch(() => [route.query.history, route.query.save], async () => {
      await updateHistoryFromRoute()
      // Clear the save flag after processing so subsequent clicks work
      if (route.query.save) {
        const q = { ...route.query }
        delete q.save
        router.replace({ name: route.name, params: route.params, query: q })
      }
    })

    // Cleanup before component unmounts (e.g., when navigating away)
    onBeforeUnmount(async () => {
      const userId = user.value?.uid
      
      if (userId) {
        console.log('🚪 User leaving canvas - cleaning up presence and cursor')
        
        // Remove presence and cursor BEFORE unmounting
        // This ensures other users see the user leave immediately
        try {
          await Promise.all([
            setUserOffline(canvasId.value, userId),
            removeCursor(canvasId.value, userId)
          ])
        } catch (error) {
          console.error('Error during beforeUnmount cleanup:', error)
        }
      }
    })

    onUnmounted(() => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('keydown', handleKeyDown)
      
      // Clean up canvas subscription
      unsubscribeFromCanvas()
      
      // Clean up real-time listeners
      stopRealtimeSync()
      
      // Clean up cursor tracking
      const userId = user.value?.uid
      cleanupCursors(canvasId.value, userId)
      
      // Clean up presence tracking
      cleanupPresence(canvasId.value, userId)
      
      // Remove cursor event listeners
      if (canvasWrapper.value) {
        canvasWrapper.value.removeEventListener('mousemove', handleCursorMove)
        canvasWrapper.value.removeEventListener('mouseenter', handleMouseEnter)
        canvasWrapper.value.removeEventListener('mouseleave', handleMouseLeave)
      }

      stopPeriodic()
      // Clear periodic timer
      try { window.clearInterval(periodicTimer) } catch {}
    })

    // Computed properties for properties panel
    const selectedShapesData = computed(() => {
      return selectedShapeIds.value.map(id => shapes.get(id)).filter(Boolean)
    })

    const canvasWidth = ref(3000)
    const canvasHeight = ref(3000)
    
    // Watch for canvas metadata changes and update dimensions
    watch(currentCanvas, (newCanvas) => {
      if (newCanvas) {
        canvasWidth.value = newCanvas.width || 3000
        canvasHeight.value = newCanvas.height || 3000
      }
    }, { immediate: true })

    // Watch for canvas ID changes (when switching between canvases)
    // Clean up old canvas presence/cursor before loading new canvas
    watch(canvasId, async (newCanvasId, oldCanvasId) => {
      const userId = user.value?.uid
      
      if (userId && oldCanvasId && oldCanvasId !== newCanvasId) {
        console.log(`🔄 Switching from canvas ${oldCanvasId} to ${newCanvasId}`)
        
        try {
          // Clean up presence and cursor from old canvas
          await Promise.all([
            setUserOffline(oldCanvasId, userId),
            removeCursor(oldCanvasId, userId)
          ])
          
          // The new canvas will set up presence/cursor in onMounted
          console.log(`✅ Cleaned up old canvas: ${oldCanvasId}`)
        } catch (error) {
          console.error('Error cleaning up old canvas:', error)
        }
      }
    })

    // Properties panel handlers
    const handleUpdateProperty = ({ shapeId, property, value }) => {
      if (!shapeId) return
      
      // Validate value based on property
      let validatedValue = value
      
      // Rotation wraparound
      if (property === 'rotation') {
        validatedValue = ((value % 360) + 360) % 360
      }
      
      // Minimum constraints
      if (property === 'width' && validatedValue < 10) validatedValue = 10
      if (property === 'height' && validatedValue < 10) validatedValue = 10
      if (property === 'radius' && validatedValue < 5) validatedValue = 5
      
      // Canvas bounds
      if (property === 'x' && validatedValue < 0) validatedValue = 0
      if (property === 'y' && validatedValue < 0) validatedValue = 0
      if (property === 'x' && validatedValue > canvasWidth.value) validatedValue = canvasWidth.value
      if (property === 'y' && validatedValue > canvasHeight.value) validatedValue = canvasHeight.value
      
      // Update the shape
      const userId = user.value?.uid || 'anonymous'
      updateShape(shapeId, { [property]: validatedValue }, userId, canvasId.value, true, true, userName.value)
      
      // Track undo/redo
      const shape = shapes.get(shapeId)
      if (shape) {
        addAction({
          type: 'property_change',
          shapeId,
          property,
          oldValue: shape[property],
          newValue: validatedValue,
          timestamp: Date.now()
        })
      }
    }

    const handleUpdateCanvasSize = async ({ width, height }) => {
      const updates = {}
      
      if (width !== undefined) {
        const newWidth = Math.max(100, Math.min(10000, width))
        canvasWidth.value = newWidth
        stageConfig.width = newWidth
        updates.width = newWidth
      }
      if (height !== undefined) {
        const newHeight = Math.max(100, Math.min(10000, height))
        canvasHeight.value = newHeight
        stageConfig.height = newHeight
        updates.height = newHeight
      }
      
      // Update canvas size in Firestore
      if (Object.keys(updates).length > 0) {
        try {
          await updateCanvas(canvasId.value, updates)
        } catch (err) {
          console.error('Failed to update canvas size:', err)
        }
      }
    }

    const handleBulkUpdate = ({ shapeIds, property, value }) => {
      shapeIds.forEach(shapeId => {
        handleUpdateProperty({ shapeId, property, value })
      })
    }

    // Recovery actions
    const handleRecover = async () => {
      const rec = loadSnapshot(canvasId.value)
      if (!rec) { showRecoveryModal.value = false; return }
      // Merge recovered shapes by timestamp
      const remoteIds = new Set(Array.from(shapes.keys()))
      rec.shapes.forEach(s => {
        const local = shapes.get(s.id)
        if (!local) {
          shapes.set(s.id, s)
        } else if ((s.lastModified || 0) > (local.lastModified || 0)) {
          shapes.set(s.id, s)
        }
      })
      // Close and clear
      clearSnapshot(canvasId.value)
      showRecoveryModal.value = false
    }

    const handleDiscardRecovery = () => {
      clearSnapshot(canvasId.value)
      showRecoveryModal.value = false
    }

    // Version restore
    const handleRestoreVersion = async (version) => {
      if (!version || !Array.isArray(version.shapes)) return
      
      try {
        console.log('🔄 Restoring version with', version.shapes.length, 'shapes')
        
        // Step 1: Delete all current shapes from Firestore
        // This will trigger real-time listeners for all users
        const currentShapes = Array.from(shapes.values())
        console.log('Deleting', currentShapes.length, 'current shapes from Firestore')
        
        // Use deleteShapes which takes (shapeIds, canvasId)
        const shapeIds = currentShapes.map(s => s.id)
        if (shapeIds.length > 0) {
          await deleteShapes(shapeIds, canvasId.value)
        }
        
        // Step 2: Clear local shapes (will be repopulated by real-time sync)
        shapes.clear()
        
        // Step 3: Create all version shapes in Firestore
        // Real-time listeners will sync these to all users
        console.log('Creating', version.shapes.length, 'shapes from version in Firestore')
        
        for (const versionShape of version.shapes) {
          // Extract properties for createShape - it needs (type, properties, userId, canvasId)
          const { type, id, createdBy, createdAt, lastModified, lastModifiedBy, ...properties } = versionShape
          
          // Create shape in Firestore with all its properties
          await createShape(
            type,
            { ...properties, id },  // Pass id to preserve original shape IDs
            user.value.uid,
            canvasId.value,
            userName.value
          )
        }
        
        showVersionHistory.value = false
        console.log('✅ Version restored successfully - all users will receive updates via real-time sync')
      } catch (error) {
        console.error('❌ Error restoring version:', error)
        alert('Failed to restore version. Please try again.')
      }
    }

    const handleCloseVersionHistory = () => {
      // Remove the history query parameter from URL
      const query = { ...route.query }
      delete query.history
      router.replace({ name: route.name, params: route.params, query })
    }

    return {
      // Refs
      stage,
      canvasWrapper,
      shapeLayer,
      transformer,
      
      // State
      stageConfig,
      stagePosition,
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
      selectionRect,
      // Context menu state
      contextMenuVisible,
      contextMenuPosition,
      hasClipboard,
      // Confirmation modal state
      confirmModalVisible,
      confirmModalMessage,
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
      // Context menu handlers
      handleContextMenu,
      handleCloseContextMenu,
      handleContextBringToFront,
      handleContextBringForward,
      handleContextSendBackward,
      handleContextSendToBack,
      handleContextDuplicate,
      handleContextCopy,
      handleContextPaste,
      handleContextDelete,
      handleContextSelectAll,
      // Confirmation modal handlers
      handleConfirmDelete,
      handleCancelDelete,
      // Text handlers
      handleTextEdit,
      handleTextSave,
      handleTextCancel,
      handleFormatChange,
      // Properties panel
      selectedShapesData,
      canvasWidth,
      canvasHeight,
      handleUpdateProperty,
      handleUpdateCanvasSize,
      handleBulkUpdate,
      // Recovery modal
      showRecoveryModal,
      recoveryMeta,
      handleRecover,
      handleDiscardRecovery,
      // Version history
      showVersionHistory,
      versionsList,
      versionsLoading,
      canRestoreVersions,
      handleRestoreVersion,
      handleCloseVersionHistory,
      // Undo/Redo exposure for Toolbar
      handleUndo,
      handleRedo,
      canUndo,
      canRedo
    }
  }
}
</script>

<style scoped>
.canvas-container {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
}

.canvas-wrapper {
  position: fixed;
  top: 70px; /* Account for navbar height */
  left: 0;
  right: 300px; /* Account for properties panel */
  bottom: 0;
  overflow: hidden; /* Clip any overflow content including cursors */
}

/* Responsive canvas width for smaller screens */
@media (max-width: 1200px) {
  .canvas-wrapper {
    right: 250px; /* Account for narrower properties panel */
  }
}

/* Responsive for very small screens */
@media (max-width: 768px) {
  .canvas-wrapper {
    right: 0; /* Full width, properties panel hidden or overlaid */
  }
}

/* Canvas background with subtle grid pattern */
.canvas-wrapper::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: white;
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