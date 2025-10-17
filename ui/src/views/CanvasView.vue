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
    <div 
      ref="canvasWrapper" 
      class="canvas-wrapper" 
      :data-panning="activeTool === 'pan' ? 'true' : 'false'"
      :data-is-dragging="isPanning ? 'true' : 'false'"
      @click="handleCloseContextMenu"
    >
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
          <!-- Render visible shapes only (v5: viewport culling optimization) -->
          <template v-for="shape in visibleShapesList" :key="shape.id">
            <!-- Rectangles -->
            <Rectangle
              v-if="shape.type === 'rectangle'"
              :rectangle="shape"
              :is-selected="selectedShapeIds.includes(shape.id)"
              :disable-drag="activeTool === 'pan' || (selectedShapeIds.length > 1 && selectedShapeIds.includes(shape.id))"
              @update="handleShapeUpdate"
              @select="handleShapeSelect"
            />
            
            <!-- Circles -->
            <Circle
              v-if="shape.type === 'circle'"
              :circle="shape"
              :is-selected="selectedShapeIds.includes(shape.id)"
              :disable-drag="activeTool === 'pan' || (selectedShapeIds.length > 1 && selectedShapeIds.includes(shape.id))"
              @update="handleShapeUpdate"
              @select="handleShapeSelect"
            />
            
            <!-- Lines -->
            <Line
              v-if="shape.type === 'line'"
              :line="shape"
              :is-selected="selectedShapeIds.includes(shape.id)"
              :disable-drag="activeTool === 'pan' || (selectedShapeIds.length > 1 && selectedShapeIds.includes(shape.id))"
              @update="handleShapeUpdate"
              @select="handleShapeSelect"
            />

            <!-- Text -->
            <TextShape
              v-if="shape.type === 'text'"
              :text="shape"
              :is-selected="selectedShapeIds.includes(shape.id)"
              :disable-drag="activeTool === 'pan' || (selectedShapeIds.length > 1 && selectedShapeIds.includes(shape.id))"
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

    <!-- AI Command Panel (v6: AI-powered natural language commands) -->
    <AICommandPanel
      v-if="user"
      :context="aiContext"
      @command-executed="handleAICommandExecuted"
      @utility-action="handleAIUtilityAction"
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
import UserCursor from '../components/UserCursor.vue'
import PerformanceMonitor from '../components/PerformanceMonitor.vue'
import Notifications from '../components/Notifications.vue'
import LoadingSpinner from '../components/LoadingSpinner.vue'
import EmptyState from '../components/EmptyState.vue'
import TestingDashboard from '../components/TestingDashboard.vue'
import PropertiesPanel from '../components/PropertiesPanel.vue'
import RecoveryModal from '../components/RecoveryModal.vue'
import VersionHistory from '../components/VersionHistory.vue'
import AICommandPanel from '../components/AICommandPanel.vue'
import { useShapes } from '../composables/useShapes'
import { useFirestore } from '../composables/useFirestore' // v5: Batch operations
import { getMaxZIndex, DEFAULT_SHAPE_PROPERTIES } from '../types/shapes'
import { useAuth } from '../composables/useAuth'
import { useCanvases } from '../composables/useCanvases'
import { useCursors } from '../composables/useCursors'
import { useCursorsRTDB } from '../composables/useCursorsRTDB'
import { usePresence } from '../composables/usePresence'
import { usePresenceRTDB } from '../composables/usePresenceRTDB'
import { getFeatureFlag } from '../utils/featureFlags'
import { usePerformance } from '../composables/usePerformance'
import { usePerformanceMonitoring } from '../composables/usePerformanceMonitoring'
import { useConnectionState } from '../composables/useConnectionState'
import { useQueueProcessor } from '../composables/useQueueProcessor'
import { useStateReconciliation } from '../composables/useStateReconciliation'
import { useCrashRecovery } from '../composables/useCrashRecovery'
import { useVersions } from '../composables/useVersions'
import { useInactivityLogout } from '../composables/useInactivityLogout'
import { useViewportCulling } from '../composables/useViewportCulling' // v5: Rendering optimization
import { useBugFixes } from '../utils/bugFixUtils'
import { calculateRectPositionAfterRotation } from '../utils/rotationUtils'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'

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
    UserCursor,
    PerformanceMonitor,
    Notifications,
    LoadingSpinner,
    EmptyState,
    TestingDashboard,
    AICommandPanel
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
      pauseSync, // v5: Bulk operation support
      resumeSync, // v5: Bulk operation support
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
    
    // v5: Batch operations and snapshot support for version restore
    const { saveShapesBatch, updateShapesBatch, deleteShapesBatch, loadCanvasSnapshot, updateCanvasSnapshot } = useFirestore()
    
    // v8: Feature flag controlled dual-mode (Firestore vs Realtime DB)
    const useRealtimeDB = getFeatureFlag('USE_REALTIME_DB', false)
    console.log(`[v8] Using ${useRealtimeDB ? 'Realtime DB' : 'Firestore'} for cursors and presence`)
    
    // Choose cursor composable based on feature flag
    const cursorsComposable = useRealtimeDB ? useCursorsRTDB() : useCursors()
    const {
      cursors,
      updateCursorPosition,
      subscribeToCursors,
      cleanup: cleanupCursors,
      removeCursor,
      screenToCanvas,
      getAllCursors,
      cleanupStaleCursors
    } = cursorsComposable
    
    // Choose presence composable based on feature flag
    const presenceComposable = useRealtimeDB ? usePresenceRTDB() : usePresence()
    const {
      setUserOnline,
      setUserOffline,
      subscribeToPresence,
      getActiveUserCount,
      cleanup: cleanupPresence
    } = presenceComposable
    
    const { measureRender, throttle, logPerformanceSummary } = usePerformance()
    const { state: connectionState, setSyncHandler } = useConnectionState()
    const { processQueue } = useQueueProcessor()
    const { reconcile, startPeriodic, stopPeriodic, triggerOnVisibilityChange } = useStateReconciliation()
    const { saveSnapshot, loadSnapshot, clearSnapshot } = useCrashRecovery()
    const { isLoading: versionsLoading, versions: versionsList, listVersions, createVersion } = useVersions()

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
    const isPanning = ref(false) // Separate panning state
    const isSpacebarPressed = ref(false) // Track spacebar for pan mode
    const lastPointerPosition = reactive({ x: 0, y: 0 })
    const showVersionHistory = ref(false)
    const canRestoreVersions = computed(() => true) // owner-only checked via NavBar button visibility

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
    
    // Group dragging state
    const isDraggingGroup = ref(false)
    const groupDragStart = reactive({ x: 0, y: 0 })
    const groupDragInitialPositions = ref(new Map())

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

    // v5: Viewport culling for rendering optimization
    const { 
      visibleShapeIds, 
      updateVisibleShapes, 
      isVisible: isShapeVisible,
      getVisibilityRatio 
    } = useViewportCulling(stage)
    
    // Computed list of shapes to render (with culling for large canvases)
    const visibleShapesList = computed(() => {
      const allShapes = shapesList.value
      
      // Only apply culling if we have 100+ shapes
      if (allShapes.length < 100) {
        return allShapes
      }
      
      // Filter to only visible shapes
      return allShapes.filter(shape => isShapeVisible(shape.id))
    })
    
    // v5 Bug fix: Update viewport culling when shapes are added/removed
    watch(shapesList, (newShapes) => {
      if (newShapes.length >= 100) {
        updateVisibleShapes(newShapes)
      }
    })

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
    // Debounced keyboard nudge commit state
    let keyboardNudgeTimer = null
    const keyboardNudgePending = new Map()

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

    // (Duplicate AI context and handlers removed; existing v6 integration is retained below.)

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
      
      // v5: Update viewport culling after zoom
      if (shapesList.value.length >= 100) {
        updateVisibleShapes(shapesList.value)
      }
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
      
      // Get click position
      const pointer = stage.value.getNode().getPointerPosition()
      const stageAttrs = stage.value.getNode().attrs
      
      // Convert screen coordinates to canvas coordinates
      const canvasX = (pointer.x - stageAttrs.x) / stageAttrs.scaleX
      const canvasY = (pointer.y - stageAttrs.y) / stageAttrs.scaleY
      
      // Check if clicking on a selected shape to start group drag
      if (!clickedOnEmpty && selectedShapeIds.value.length > 0 && activeTool.value === 'select') {
        // Get the clicked shape ID
        const clickedShapeId = e.target.id()
        
        // If clicking on a selected shape, start group drag
        if (clickedShapeId && selectedShapeIds.value.includes(clickedShapeId)) {
          isDraggingGroup.value = true
          groupDragStart.x = canvasX
          groupDragStart.y = canvasY
          
          // Store initial positions of all selected shapes
          groupDragInitialPositions.value.clear()
          selectedShapeIds.value.forEach(shapeId => {
            const shape = shapes.get(shapeId)
            if (shape) {
              groupDragInitialPositions.value.set(shapeId, { x: shape.x, y: shape.y })
            }
          })
          
          canvasWrapper.value.style.cursor = 'grabbing'
          return
        }
      }
      
      if (clickedOnEmpty) {
        // Clear selection when clicking on empty canvas
        clearSelection()
        
        const userId = user.value?.uid || 'anonymous'
        
        // Prevent shape creation in viewer mode
        if (isViewerMode.value && activeTool.value !== 'select') {
          // Force select tool in viewer mode
          activeTool.value = 'select'
        }
        
        // Route to appropriate shape creator based on active tool
        if (activeTool.value === 'pan') {
          // Start panning immediately on left-click in pan mode
          isPanning.value = true
          isDragging.value = true
          lastPointerPosition.x = pointer.x
          lastPointerPosition.y = pointer.y
          canvasWrapper.value.style.cursor = 'grabbing'
          return
        } else if (activeTool.value === 'rectangle' && canUserEdit.value) {
          // Create rectangle with click treated as center (convert to model's top-left)
          const w = DEFAULT_SHAPE_PROPERTIES.rectangle.width
          const h = DEFAULT_SHAPE_PROPERTIES.rectangle.height
          await createShape('rectangle', { x: canvasX - w / 2, y: canvasY - h / 2 }, userId, canvasId.value, userName.value)
          return
        } else if (activeTool.value === 'circle' && canUserEdit.value) {
          // Create circle with click treated as top-left of its bounding box
          const r = DEFAULT_SHAPE_PROPERTIES.circle.radius
          await createShape('circle', { x: canvasX + r, y: canvasY + r }, userId, canvasId.value, userName.value)
          return
        } else if (activeTool.value === 'line' && canUserEdit.value) {
          // Start line creation
          if (!isCreatingLine.value) {
            isCreatingLine.value = true
            lineStartPoint.value = { x: canvasX, y: canvasY }
            return
          }
        } else if (activeTool.value === 'text' && canUserEdit.value) {
          // Don't create new text if we're currently editing text (prevents duplicate creation when clicking away to close editor)
          if (showTextEditor.value) {
            return
          }
          // Create text shape and immediately open editor
          const newText = await createShape('text', { x: canvasX, y: canvasY }, userId, canvasId.value, userName.value)
          if (newText) {
            handleTextEdit(newText.id)
          }
          return
        } else if (activeTool.value === 'select') {
          // Check if Spacebar is held for panning, or middle mouse button
          const isMiddleButton = e.evt && e.evt.button === 1
          
          if (isMiddleButton || isSpacebarPressed.value) {
            // Start panning
            isPanning.value = true
            isDragging.value = true
            lastPointerPosition.x = pointer.x
            lastPointerPosition.y = pointer.y
            canvasWrapper.value.style.cursor = 'grabbing'
          } else {
            // Start marquee selection by default when clicking empty canvas
            isSelecting.value = true
            selectionRect.x = canvasX
            selectionRect.y = canvasY
            selectionRect.width = 0
            selectionRect.height = 0
            selectionRect.visible = true
          }
        }
      }
    }

    const handleMouseMove = (e) => {
      const pointer = stage.value.getNode().getPointerPosition()
      const stageAttrs = stage.value.getNode().attrs
      const canvasX = (pointer.x - stageAttrs.x) / stageAttrs.scaleX
      const canvasY = (pointer.y - stageAttrs.y) / stageAttrs.scaleY
      
      // Handle group dragging
      if (isDraggingGroup.value) {
        const deltaX = canvasX - groupDragStart.x
        const deltaY = canvasY - groupDragStart.y
        
        const userId = user.value?.uid || 'anonymous'
        
        // Update all selected shapes with the delta
        selectedShapeIds.value.forEach(shapeId => {
          const initialPos = groupDragInitialPositions.value.get(shapeId)
          if (initialPos) {
            const newX = initialPos.x + deltaX
            const newY = initialPos.y + deltaY
            
            // Update local state immediately (optimistic update)
            updateShape(shapeId, { x: newX, y: newY }, userId, canvasId.value, false, false, userName.value)
          }
        })
        return
      }
      
      // Handle marquee selection update
      if (isSelecting.value) {
        // Update selection rectangle dimensions
        selectionRect.width = canvasX - selectionRect.x
        selectionRect.height = canvasY - selectionRect.y
        return
      }
      
      if (!isPanning.value) {
        // Change cursor based on what's under the mouse
        if (activeTool.value === 'pan') {
          canvasWrapper.value.style.cursor = 'grab'
        } else if (e.target === stage.value.getNode()) {
          canvasWrapper.value.style.cursor = 'default'
        }
        return
      }

      // Pan the stage
      const deltaX = pointer.x - lastPointerPosition.x
      const deltaY = pointer.y - lastPointerPosition.y

      stagePosition.x += deltaX
      stagePosition.y += deltaY

      lastPointerPosition.x = pointer.x
      lastPointerPosition.y = pointer.y
      
      // v5: Update viewport culling after pan
      if (shapesList.value.length >= 100) {
        updateVisibleShapes(shapesList.value)
      }
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
          canvasWrapper.value.style.cursor = 'default'
        } else if (toolName === 'pan') {
          canvasWrapper.value.style.cursor = 'grab'
        } else {
          // Text and shape tools use default cursor
          canvasWrapper.value.style.cursor = 'default'
        }
      }
    }

    // Shape selection handlers
    const handleShapeSelect = (shapeId, event) => {
      // Ignore selection while pan tool is active
      if (activeTool.value === 'pan') {
        return
      }
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
        confirmModalMessage.value = `Are you sure you want to delete ${selectedShapeIds.value.length} shapes? `
        confirmModalVisible.value = true
      } else {
        // Delete immediately if <=5 shapes
        performDelete(selectedShapeIds.value)
      }
    }
    
    const performDelete = async (shapeIds) => {
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
          // Standard 8-handle resize (no rotation)
          transformerNode.enabledAnchors(['top-left', 'top-center', 'top-right', 
                                         'middle-right', 'middle-left',
                                         'bottom-left', 'bottom-center', 'bottom-right'])
          transformerNode.rotateEnabled(false)
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

    // Track which shapes are being resized (to detect resize in transformend after scale reset)
    const resizingShapes = ref(new Set())

    // Throttled transform update during drag
    // v3: These are interim updates, will be batched as low priority
    // Using 50ms for smoother, less jittery updates (was 16ms / 60 FPS)
    const throttledTransformUpdate = throttle(async (shapeId, updates, userId, userName) => {
      // Update local state only during transform (no Firestore save)
      // isFinal=false means this is an interim update (not used here since saveToFirestore=false)
      await updateShape(shapeId, updates, userId, canvasId.value, false, false, userName)
    }, 50)

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
      
      // Mark shape as being resized
      resizingShapes.value.add(shapeId)
      
      // Get transform updates based on shape type
      const updates = {
        rotation: node.rotation()
      }
      
      if (shape.type === 'rectangle') {
        // Handle negative scaling (when user drags past opposite corner)
        const newWidth = Math.abs(node.width() * scaleX)
        const newHeight = Math.abs(node.height() * scaleY)
        
        // Calculate position accounting for potential flip
        // When scale is negative, the anchor point shifts
        const offsetX = scaleX < 0 ? -newWidth / 2 : newWidth / 2
        const offsetY = scaleY < 0 ? -newHeight / 2 : newHeight / 2
        
        // Convert center position back to top-left
        updates.x = node.x() - offsetX
        updates.y = node.y() - offsetY
        updates.width = newWidth
        updates.height = newHeight
        
        // Apply size changes immediately to reduce bouncing
        node.width(newWidth)
        node.height(newHeight)
        node.offsetX(newWidth / 2)
        node.offsetY(newHeight / 2)
        node.scaleX(1)
        node.scaleY(1)
      } else if (shape.type === 'circle') {
        // Calculate new radius (keepRatio ensures uniform scaling)
        const newWidth = node.width() * scaleX
        const newRadius = Math.max(5, newWidth / 2) // Min 5px radius
        
        updates.radius = newRadius
        // During transform, just track current node position
        // Don't calculate position changes - let transformer control it
        updates.x = node.x()
        updates.y = node.y()
        
        // Apply size changes immediately to reduce bouncing
        node.width(newRadius * 2)
        node.height(newRadius * 2)
        node.offsetX(newRadius)
        node.offsetY(newRadius)
        node.scaleX(1)
        node.scaleY(1)
      } else if (shape.type === 'text') {
        const newWidth = node.width() * scaleX
        const newHeight = node.height() * scaleY
        // Convert center position back to top-left (accounting for offset)
        updates.x = node.x() - newWidth / 2
        updates.y = node.y() - newHeight / 2
        updates.width = newWidth
        updates.height = newHeight
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
      // Check if was resized using our tracking set (for circles/rectangles with immediate scale reset)
      // or using scale check (for other shapes)
      const wasResized = resizingShapes.value.has(shapeId) || Math.abs(scaleX - 1) > 0.001 || Math.abs(scaleY - 1) > 0.001
      
      // Clear resize tracking for this shape
      resizingShapes.value.delete(shapeId)
      
      if (shape.type === 'rectangle') {
        // For rectangles, always commit visual position after transform (rotate or resize)
        const currentWidth = wasResized ? Math.abs(node.width() * scaleX) : node.width()
        const currentHeight = wasResized ? Math.abs(node.height() * scaleY) : node.height()

        // Convert center position back to top-left (accounting for potential flip on resize)
        if (wasResized) {
          const offsetX = scaleX < 0 ? -currentWidth / 2 : currentWidth / 2
          const offsetY = scaleY < 0 ? -currentHeight / 2 : currentHeight / 2
          updates.x = node.x() - offsetX
          updates.y = node.y() - offsetY
          updates.width = currentWidth
          updates.height = currentHeight
          node.width(currentWidth)
          node.height(currentHeight)
          node.offsetX(currentWidth / 2)
          node.offsetY(currentHeight / 2)
          node.scaleX(1)
          node.scaleY(1)
        } else {
          // Pure rotation: calculate correct top-left position to maintain visual center
          const rotation = node.rotation()
          const { x: newX, y: newY } = calculateRectPositionAfterRotation(
            shape.x,
            shape.y,
            currentWidth,
            currentHeight,
            rotation
          )
          updates.x = newX
          updates.y = newY
        }
      } else if (shape.type === 'text') {
        // Text: preserve top-left on pure rotation to avoid jumps; update only on resize
        const currentWidth = wasResized ? Math.abs(node.width() * scaleX) : node.width()
        const currentHeight = wasResized ? Math.abs(node.height() * scaleY) : node.height()
        if (wasResized) {
          const offsetX = scaleX < 0 ? -currentWidth / 2 : currentWidth / 2
          const offsetY = scaleY < 0 ? -currentHeight / 2 : currentHeight / 2
          updates.x = node.x() - offsetX
          updates.y = node.y() - offsetY
          updates.width = currentWidth
          updates.height = currentHeight
          node.width(currentWidth)
          node.height(currentHeight)
          node.offsetX(currentWidth / 2)
          node.offsetY(currentHeight / 2)
          node.scaleX(1)
          node.scaleY(1)
        }
      } else if (shape.type === 'circle') {
        if (wasResized) {
          // Calculate new radius (keepRatio ensures uniform scaling)
          const oldRadius = shape.radius
          const newWidth = node.width() * scaleX
          const newRadius = Math.max(5, newWidth / 2) // Min 5px radius
          const radiusDelta = newRadius - oldRadius
          
          updates.radius = newRadius
          // Keep top-left corner fixed: as radius grows, center moves by the delta
          updates.x = shape.x + radiusDelta
          updates.y = shape.y + radiusDelta
          
          // Reset scale and update node dimensions with new offset
          node.width(newRadius * 2)
          node.height(newRadius * 2)
          node.offsetX(newRadius)
          node.offsetY(newRadius)
          node.x(updates.x)
          node.y(updates.y)
          node.scaleX(1)
          node.scaleY(1)
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
      // Handle group drag completion
      if (isDraggingGroup.value) {
        const pointer = stage.value.getNode().getPointerPosition()
        const stageAttrs = stage.value.getNode().attrs
        const canvasX = (pointer.x - stageAttrs.x) / stageAttrs.scaleX
        const canvasY = (pointer.y - stageAttrs.y) / stageAttrs.scaleY
        
        const deltaX = canvasX - groupDragStart.x
        const deltaY = canvasY - groupDragStart.y
        
        // Only save if there was actual movement (at least 1px)
        if (Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5) {
          const userId = user.value?.uid || 'anonymous'
          
          // Prepare batch update for all shape positions
          const shapeUpdates = selectedShapeIds.value.map(shapeId => {
            const initialPos = groupDragInitialPositions.value.get(shapeId)
            if (initialPos) {
              return {
                id: shapeId,
                updates: {
                  x: initialPos.x + deltaX,
                  y: initialPos.y + deltaY,
                  lastModifiedBy: userId,
                  lastModifiedByName: userName.value
                }
              }
            }
            return null
          }).filter(Boolean)
          
          // Save all shape positions as a single batch operation
          if (shapeUpdates.length > 0) {
            try {
              await updateShapesBatch(canvasId.value, shapeUpdates)
            } catch (error) {
              console.error('Error updating group positions:', error)
            }
          }
        }
        
        // Reset group drag state
        isDraggingGroup.value = false
        groupDragInitialPositions.value.clear()
        canvasWrapper.value.style.cursor = 'default'
        // Keep selection active and refresh transformer handles
        updateTransformer()
        return
      }
      
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
        
        // Find shapes that intersect with selection rectangle (any overlap)
        const containedShapes = shapesList.value.filter(shape => {
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
          
          // Check for intersection (any overlap between rectangles)
          return (
            shapeX < selX + selWidth &&
            shapeX + shapeWidth > selX &&
            shapeY < selY + selHeight &&
            shapeY + shapeHeight > selY
          )
        })
        
        // Update selection
        selectedShapeIds.value = containedShapes.map(s => s.id)
        updateTransformer()
        
        // Hide selection rectangle
        isSelecting.value = false
        selectionRect.visible = false
        return
      }
      
      // Handle panning end
      isDragging.value = false
      isPanning.value = false
      if (canvasWrapper.value) {
        if (activeTool.value === 'select') {
          canvasWrapper.value.style.cursor = 'default'
        } else if (activeTool.value === 'pan') {
          canvasWrapper.value.style.cursor = 'grab'
        } else {
          // Text and shape tools use default cursor
          canvasWrapper.value.style.cursor = 'default'
        }
      }
    }

    // Global mouseup to finalize selection if user releases outside the stage
    const handleWindowMouseUp = async (e) => {
      // Mirror finalize logic so selection commits on release without extra click
      if (isSelecting.value) {
        // Normalize selection rectangle
        const selX = selectionRect.width < 0 ? selectionRect.x + selectionRect.width : selectionRect.x
        const selY = selectionRect.height < 0 ? selectionRect.y + selectionRect.height : selectionRect.y
        const selWidth = Math.abs(selectionRect.width)
        const selHeight = Math.abs(selectionRect.height)

        const containedShapes = shapesList.value.filter(shape => {
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
            const points = shape.points || []
            const allX = [shape.x || 0, ...points.filter((_, i) => i % 2 === 0).map(x => (shape.x || 0) + x)]
            const allY = [shape.y || 0, ...points.filter((_, i) => i % 2 === 1).map(y => (shape.y || 0) + y)]
            shapeX = Math.min(...allX)
            shapeY = Math.min(...allY)
            shapeWidth = Math.max(...allX) - shapeX
            shapeHeight = Math.max(...allY) - shapeY
          }

          // Check for intersection (any overlap between rectangles)
          return (
            shapeX < selX + selWidth &&
            shapeX + shapeWidth > selX &&
            shapeY < selY + selHeight &&
            shapeY + shapeHeight > selY
          )
        })

        selectedShapeIds.value = containedShapes.map(s => s.id)
        updateTransformer()
        isSelecting.value = false
        selectionRect.visible = false
      }

      // End any panning state
      if (isPanning.value || isDragging.value) {
        isDragging.value = false
        isPanning.value = false
        if (canvasWrapper.value) {
          if (activeTool.value === 'select') {
            canvasWrapper.value.style.cursor = 'default'
          } else if (activeTool.value === 'pan') {
            canvasWrapper.value.style.cursor = 'grab'
          } else {
            // Text and shape tools use default cursor
            canvasWrapper.value.style.cursor = 'default'
          }
        }
      }
    }

    // Handle double-click for text creation
    const handleDoubleClick = async (e) => {
      const clickedOnEmpty = e.target === stage.value.getNode()
      
      // Only create text on double-click when in text mode
      if (clickedOnEmpty && activeTool.value === 'text' && canUserEdit.value) {
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

    // Keyboard handler for spacebar panning
    const handleSpacebarDown = (e) => {
      // Check if spacebar is pressed (and not in a text input)
      if (e.code === 'Space' && !e.repeat) {
        const activeElement = document.activeElement
        const isTyping = activeElement && (
          activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.isContentEditable
        )
        
        if (!isTyping) {
          e.preventDefault() // Prevent page scroll
          isSpacebarPressed.value = true
          
          // Update cursor if hovering over canvas
          if (canvasWrapper.value && activeTool.value === 'select') {
            canvasWrapper.value.style.cursor = 'grab'
          }
        }
      }
    }
    
    const handleSpacebarUp = (e) => {
      if (e.code === 'Space') {
        isSpacebarPressed.value = false
        
        // Restore normal cursor
        if (canvasWrapper.value && activeTool.value === 'select' && !isPanning.value) {
          canvasWrapper.value.style.cursor = 'default'
        }
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
        
        // Cmd+] or Ctrl+]: Bring to front
        if (modKey && e.key === ']' && !e.shiftKey) {
          e.preventDefault()
          await bringToFront(selectedShapeIds.value, userId, canvasId.value)
          return
        }
        
        // Cmd+[ or Ctrl+[: Send to back
        if (modKey && e.key === '[' && !e.shiftKey) {
          e.preventDefault()
          await sendToBack(selectedShapeIds.value, userId, canvasId.value)
          return
        }
        
        // Cmd+Shift+] or Ctrl+Shift+]: Bring forward
        if (modKey && e.shiftKey && e.key === ']') {
          e.preventDefault()
          await bringForward(selectedShapeIds.value, userId, canvasId.value)
          return
        }
        
        // Cmd+Shift+[ or Ctrl+Shift+[: Send backward
        if (modKey && e.shiftKey && e.key === '[') {
          e.preventDefault()
          await sendBackward(selectedShapeIds.value, userId, canvasId.value)
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
        const userId = user.value?.uid || 'anonymous'
        const duplicatedIds = await duplicateShapes(selectedShapeIds.value, userId, canvasId.value)
        
        // Select duplicated shapes (deselect originals)
        selectedShapeIds.value = duplicatedIds
        updateTransformer()
        return
      }
      
      // Delete or Backspace: Delete selected shapes
      // Check if user is typing in an input field
      const activeElement = document.activeElement
      const isTyping = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.isContentEditable
      )
      
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedShapeIds.value.length > 0 && !showTextEditor.value && !isTyping) {
        e.preventDefault()
        
        // Show confirmation modal if >5 shapes are selected
        if (selectedShapeIds.value.length > 5) {
          pendingDeleteIds.value = [...selectedShapeIds.value]
          confirmModalMessage.value = `Are you sure you want to delete ${selectedShapeIds.value.length} shapes? `
          confirmModalVisible.value = true
        } else {
          // Delete immediately if <=5 shapes
          await performDelete(selectedShapeIds.value)
        }
      }

      // Arrow keys: Nudge selected shapes (2px, or 10px with Shift) with local-only update then debounced batch commit
      if (!modKey && selectedShapeIds.value.length > 0 && !showTextEditor.value) {
        const step = e.shiftKey ? 10 : 2
        let dx = 0, dy = 0
        if (e.key === 'ArrowLeft') dx = -step
        if (e.key === 'ArrowRight') dx = step
        if (e.key === 'ArrowUp') dy = -step
        if (e.key === 'ArrowDown') dy = step
        if (dx !== 0 || dy !== 0) {
          e.preventDefault()
          const userId = user.value?.uid || 'anonymous'

          // Local-only optimistic movement for instantaneous visual shift
          selectedShapeIds.value.forEach(id => {
            const shape = shapes.get(id)
            if (!shape) return
            const updates = {}
            if (dx !== 0) updates.x = (shape.x || 0) + dx
            if (dy !== 0) updates.y = (shape.y || 0) + dy
            updateShape(id, updates, userId, canvasId.value, false, false, userName.value)

            // Record pending final value for debounced commit
            const pending = keyboardNudgePending.get(id) || {}
            if (updates.x !== undefined) pending.x = updates.x
            if (updates.y !== undefined) pending.y = updates.y
            keyboardNudgePending.set(id, pending)
          })

          // Debounce a single batch commit to avoid stutter from remote echo
          if (keyboardNudgeTimer) {
            clearTimeout(keyboardNudgeTimer)
          }
          keyboardNudgeTimer = window.setTimeout(async () => {
            try {
              if (keyboardNudgePending.size > 0) {
                const shapeUpdates = Array.from(keyboardNudgePending.entries()).map(([id, updates]) => ({ id, updates }))
                await updateShapesBatch(canvasId.value, shapeUpdates)
                keyboardNudgePending.clear()
              }
            } catch (err) {
              console.error('Keyboard nudge batch update failed:', err)
            } finally {
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
            }
          }, 150)
          
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
      
      // Add keyboard listeners
      window.addEventListener('keydown', handleSpacebarDown)
      window.addEventListener('keyup', handleSpacebarUp)
      window.addEventListener('keydown', handleKeyDown)
      window.addEventListener('mouseup', handleWindowMouseUp)

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
        canvasWrapper.value.style.cursor = 'default'
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
        startRealtimeSync(canvasId.value, user.value?.uid)
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
          startRealtimeSync(canvasId.value, user.value?.uid)
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

    // Navigation guard - cleanup when navigating away
    onBeforeRouteLeave((to, from, next) => {
      console.log('🚪 Navigation guard triggered')
      const userId = user.value?.uid
      
      if (userId && canvasId.value) {
        console.log('🚪 Cleaning up presence and cursor for user:', userId)
        
        // Remove presence and cursor immediately (fire and forget)
        setUserOffline(canvasId.value, userId).catch(err => {
          console.error('Error setting user offline during navigation:', err)
        })
        removeCursor(canvasId.value, userId).catch(err => {
          console.error('Error removing cursor during navigation:', err)
        })
      }
      
      // Always allow navigation to proceed
      console.log('✅ Allowing navigation to:', to.name)
      next()
    })

    // Cleanup before component unmounts (e.g., when navigating away)
    onBeforeUnmount(() => {
      const userId = user.value?.uid
      
      if (userId) {
        console.log('🚪 Component unmounting - final cleanup')
        
        // Remove presence and cursor synchronously
        // Note: setUserOffline and removeCursor are async, but we call them
        // without await so they fire immediately. The Firebase SDK will handle
        // them even if the component unmounts.
        setUserOffline(canvasId.value, userId).catch(err => {
          console.error('Error setting user offline:', err)
        })
        removeCursor(canvasId.value, userId).catch(err => {
          console.error('Error removing cursor:', err)
        })
      }
      
      // Stop all intervals and subscriptions immediately
      stopRealtimeSync()
      stopPeriodic()
      
      // Clear periodic timer
      try { window.clearInterval(periodicTimer) } catch {}
    })

    onUnmounted(() => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('keydown', handleSpacebarDown)
      window.removeEventListener('keyup', handleSpacebarUp)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('mouseup', handleWindowMouseUp)
      
      // Clean up canvas subscription
      unsubscribeFromCanvas()
      
      // Clean up cursor tracking (this will unsubscribe from listeners)
      const userId = user.value?.uid
      cleanupCursors(canvasId.value, userId)
      
      // Clean up presence tracking (this will unsubscribe from listeners)
      cleanupPresence(canvasId.value, userId)
      
      // Remove cursor event listeners
      if (canvasWrapper.value) {
        canvasWrapper.value.removeEventListener('mousemove', handleCursorMove)
        canvasWrapper.value.removeEventListener('mouseenter', handleMouseEnter)
        canvasWrapper.value.removeEventListener('mouseleave', handleMouseLeave)
      }
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

    // Watch for connection state changes to handle reconnection
    let previousConnectionStatus = ref(connectionState.status)
    watch(() => connectionState.status, async (newStatus, oldStatus) => {
      const userId = user.value?.uid
      
      // Only handle reconnection when moving from offline/error to connected
      if (
        userId && 
        canvasId.value && 
        (oldStatus === CONNECTION_STATUS.OFFLINE || oldStatus === CONNECTION_STATUS.ERROR) &&
        newStatus === CONNECTION_STATUS.CONNECTED
      ) {
        console.log('🔄 Connection restored - re-establishing presence and cursors')
        
        try {
          // Re-establish user's own presence
          const userName = user.value.displayName || user.value.email?.split('@')[0] || 'Anonymous'
          const cursorColor = '#667eea'
          
          await setUserOnline(canvasId.value, userId, userName, cursorColor)
          console.log('✅ Presence re-established after reconnection')
          
          // Re-subscribe to presence updates (this will refresh the user list)
          subscribeToPresence(canvasId.value, userId)
          console.log('✅ Presence subscription refreshed')
          
          // Re-subscribe to cursors
          subscribeToCursors(canvasId.value, userId)
          console.log('✅ Cursor subscription refreshed')
          
        } catch (error) {
          console.error('❌ Error re-establishing presence after reconnection:', error)
        }
      }
      
      previousConnectionStatus.value = newStatus
    })

    // Properties panel handlers
    const handleUpdateProperty = ({ shapeId, property, value, additionalUpdates }) => {
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
      
      // Build updates object with primary property
      let updates = { [property]: validatedValue }
      
      // Merge additional updates (e.g., x,y from rotation calculations)
      if (additionalUpdates) {
        updates = { ...updates, ...additionalUpdates }
      }
      
      // Update the shape
      const userId = user.value?.uid || 'anonymous'
      updateShape(shapeId, updates, userId, canvasId.value, true, true, userName.value)
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

    // Version restore (v5: Optimized with snapshots and batch operations)
    const handleRestoreVersion = async (version) => {
      if (!version) return
      
      const startTime = Date.now()
      let shapesToRestore = null
      let restoreMethod = 'unknown'
      
      try {
        // Step 1: Determine restore strategy based on available data
        console.log('🔄 Determining restore strategy...')
        
        // Try 1: Load from canvas snapshot (fastest - single document read)
        try {
          shapesToRestore = await loadCanvasSnapshot(canvasId.value)
          if (shapesToRestore && shapesToRestore.length > 0) {
            restoreMethod = 'snapshot'
            console.log(`✅ Using snapshot (${shapesToRestore.length} shapes)`)
          }
        } catch (snapshotError) {
          console.warn('Snapshot load failed:', snapshotError)
        }
        
        // Try 2: Decompress from version.compressed (fallback)
        if (!shapesToRestore && version.compressed) {
          try {
            const { decompressShapes } = await import('../utils/compression.js')
            shapesToRestore = decompressShapes(version.compressed)
            restoreMethod = 'compressed'
            console.log(`✅ Using compressed version data (${shapesToRestore.length} shapes)`)
          } catch (decompressError) {
            console.warn('Decompression failed:', decompressError)
          }
        }
        
        // Try 3: Use uncompressed shapes array (backward compatibility)
        if (!shapesToRestore && version.shapes && Array.isArray(version.shapes)) {
          shapesToRestore = version.shapes
          restoreMethod = 'legacy'
          console.log(`✅ Using legacy shapes array (${shapesToRestore.length} shapes)`)
        }
        
        // Validate we have shapes to restore
        if (!shapesToRestore || shapesToRestore.length === 0) {
          throw new Error('No valid shape data found in version')
        }
        
        console.log(`🔄 Restoring ${shapesToRestore.length} shapes using ${restoreMethod} method`)
        
        // Step 2: Pause real-time sync to prevent listener spam during bulk operation
        pauseSync()
        
        // Step 3: Batch delete all current shapes from Firestore
        const currentShapes = Array.from(shapes.values())
        console.log('Batch deleting', currentShapes.length, 'current shapes')
        
        const shapeIds = currentShapes.map(s => s.id)
        if (shapeIds.length > 0) {
          await deleteShapesBatch(canvasId.value, shapeIds)
        }
        
        // Step 4: Clear local shapes immediately
        shapes.clear()
        
        // Step 5: Batch create all version shapes in Firestore
        console.log('Batch creating', shapesToRestore.length, 'shapes from version')
        
        // Prepare shapes for batch write (preserve IDs and metadata)
        const shapesToCreate = shapesToRestore.map(versionShape => ({
          ...versionShape,
          // Update metadata to current restore operation
          lastModifiedBy: user.value.uid,
          lastModifiedByName: userName.value
        }))
        
        await saveShapesBatch(canvasId.value, shapesToCreate)
        
        // Step 6: Update canvas snapshot for future fast restores
        if (restoreMethod !== 'snapshot') {
          console.log('📸 Updating canvas snapshot...')
          await updateCanvasSnapshot(canvasId.value, shapesToRestore)
        }
        
        // Step 7: Resume real-time sync (will reload shapes from Firestore)
        await resumeSync(canvasId.value)
        
        const duration = Date.now() - startTime
        console.log(`✅ Version restored successfully in ${duration}ms (${shapesToRestore.length} shapes, ${restoreMethod} method)`)
        
        showVersionHistory.value = false
      } catch (error) {
        console.error('❌ Error restoring version:', error)
        
        // Ensure sync resumes even on error
        try {
          await resumeSync(canvasId.value)
        } catch (resumeError) {
          console.error('Error resuming sync after failure:', resumeError)
        }
        
        alert('Failed to restore version. Please try again.')
      }
    }

    const handleCloseVersionHistory = () => {
      // Remove the history query parameter from URL
      const query = { ...route.query }
      delete query.history
      router.replace({ name: route.name, params: route.params, query })
    }

    // V6: AI Command System Integration
    // Calculate viewport center (visible screen area) for AI positioning
    const aiContext = computed(() => {
      // Get center of visible screen area
      const centerScreenX = stageSize.width / 2
      const centerScreenY = stageSize.height / 2
      
      // Convert screen coordinates to canvas coordinates
      const canvasX = (centerScreenX - stagePosition.x) / zoomLevel.value
      const canvasY = (centerScreenY - stagePosition.y) / zoomLevel.value
      
      // Calculate viewport dimensions in canvas coordinates
      const viewportWidth = stageSize.width / zoomLevel.value
      const viewportHeight = stageSize.height / zoomLevel.value
      
      // Calculate viewport bounds for shape positioning
      const viewportBounds = {
        left: canvasX - viewportWidth / 2,
        right: canvasX + viewportWidth / 2,
        top: canvasY - viewportHeight / 2,
        bottom: canvasY + viewportHeight / 2
      }
      
      console.log('🎯 Viewport center calculated:', { 
        screenCenter: { x: centerScreenX, y: centerScreenY },
        stagePosition: { x: stagePosition.x, y: stagePosition.y },
        zoomLevel: zoomLevel.value,
        canvasCenter: { x: canvasX, y: canvasY },
        viewportDimensions: { width: viewportWidth, height: viewportHeight },
        viewportBounds
      })
      
      // Extract single selected shape details for AI
      let selectedShape = null
      if (selectedShapeIds.value.length === 1) {
        const shapeId = selectedShapeIds.value[0]
        const shape = shapes.get(shapeId)
        if (shape) {
          selectedShape = {
            id: shape.id,
            type: shape.type,
            x: shape.x,
            y: shape.y,
            width: shape.width,
            height: shape.height,
            radius: shape.radius,
            fill: shape.fill,
            stroke: shape.stroke,
            strokeWidth: shape.strokeWidth,
            rotation: shape.rotation,
            opacity: shape.opacity,
            text: shape.text,
            fontSize: shape.fontSize,
            fontFamily: shape.fontFamily,
            fontStyle: shape.fontStyle
          }
        }
      }
      
      return {
        viewportCenter: {
          x: canvasX,
          y: canvasY
        },
        viewportWidth,
        viewportHeight,
        viewportBounds,
        panOffset: {
          x: stagePosition.x,
          y: stagePosition.y
        },
        zoomLevel: zoomLevel.value,
        selectedShapeIds: selectedShapeIds.value,
        selectedShape, // Single selected shape with all attributes
        shapes: shapes,
        lastCreatedShape: null, // TODO: Track last created shape if needed
        userId: user.value?.uid,
        canvasId: canvasId.value,
        userName: userName.value
      }
    })
    
    // Handle AI command execution results
    const handleAICommandExecuted = (result) => {
      if (result.type === 'selection' && result.selectedIds) {
        // Update selection from AI command
        selectedShapeIds.value = result.selectedIds
        updateTransformer()
      }
      // Other command types are already handled by the executor
    }
    
    // Handle utility actions from AI commands
    const handleAIUtilityAction = (action, amount) => {
      switch (action) {
        case 'zoom-in':
          handleZoomIn()
          break
        case 'zoom-out':
          handleZoomOut()
          break
        case 'center':
          handleZoomReset()
          break
        case 'clear-selection':
          clearSelection()
          break
      }
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
      visibleShapesList, // v5: Viewport-culled shapes for rendering
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
      // V6: AI Command System
      aiContext,
      handleAICommandExecuted,
      handleAIUtilityAction,
      user
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

.canvas-wrapper[data-panning="true"] {
  cursor: grab;
}

.canvas-wrapper[data-panning="true"][data-is-dragging="true"] {
  cursor: grabbing !important;
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
  background-color: #ffffff;
  background-image: 
    radial-gradient(circle, #e5e7eb 1px, transparent 1px);
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