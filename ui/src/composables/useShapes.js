import { ref, reactive } from 'vue'
import { 
  generateId, 
  generateRandomColor, 
  DEFAULT_RECT_SIZE,
  DEFAULT_SHAPE_PROPERTIES,
  getMaxZIndex,
  getMinZIndex,
  needsZIndexNormalization
} from '../types/shapes'
import { useFirestore } from './useFirestore'
import { usePerformance } from './usePerformance'
import { useNotifications } from './useNotifications'
import { usePerformanceMonitoring } from './usePerformanceMonitoring'
import { useOperationLog } from './useOperationLog'
import { getFeatureFlag } from '../utils/featureFlags'
import { transform, applyTransformedOperation } from '../utils/operationalTransform'
import { useConflictDetection } from './useConflictDetection'
import { usePrediction } from './usePrediction'

// Shared state (singleton) - defined outside composable function
// Store shapes in a reactive Map for O(1) lookups
const shapes = reactive(new Map())
const isLoading = ref(false)
const error = ref(null)
const isConnected = ref(true)
const isSyncing = ref(false)
const syncPaused = ref(false) // v5: Pause sync during bulk operations
// Track local editing state and queued remote updates
const currentlyEditing = reactive(new Set())
const pendingRemoteUpdates = new Map()
// Real-time listener management
let realtimeUnsubscribe = null

export const useShapes = () => {
  // Firestore integration
  const { saveShape, updateShape: updateShapeInFirestore, deleteShape: deleteShapeFromFirestore, loadShapes, subscribeToShapes } = useFirestore()
  const { measureRectangleSync, measureRender, trackListener } = usePerformance()
  
  // v8: Operation log for OT (feature flag controlled)
  const useOpLog = getFeatureFlag('USE_REALTIME_DB', false)
  const operationLog = useOpLog ? useOperationLog() : null
  const conflictDetection = useOpLog ? useConflictDetection() : null
  
  // v8: Client-side prediction (feature flag controlled)
  const usePredictionFlag = getFeatureFlag('ENABLE_PREDICTION', false)
  const prediction = usePredictionFlag ? usePrediction() : null
  
  // v3 Performance monitoring
  const { 
    startObjectSyncMeasurement, 
    trackShapeCreation,
    trackShapeDeletion,
    updateShapeMetrics 
  } = usePerformanceMonitoring()
  const { info, warning } = useNotifications()

  // Create a new shape at specified position (backward compatible for rectangles)
  const createRectangle = async (x, y, userId = 'anonymous', canvasId = 'default') => {
    return createShape('rectangle', { x, y }, userId, canvasId)
  }

  // Generic create shape function
  const createShape = async (type = 'rectangle', properties = {}, userId = 'anonymous', canvasId = 'default', userName = 'Anonymous') => {
    try {
      // Start measuring sync latency for v3
      const syncMeasurement = startObjectSyncMeasurement()
      
      const shapeId = generateId(type)
      const currentMaxZ = getMaxZIndex(shapes)
      
      // Base shape properties
      const baseShape = {
        id: shapeId,
        type,
        zIndex: currentMaxZ + 1,
        rotation: 0,
        createdBy: userId,
        createdAt: Date.now(),
        lastModified: Date.now(),
        lastModifiedBy: userId,
        lastModifiedByName: userName
      }

      // Type-specific properties
      let shape
      switch (type) {
        case 'rectangle': {
          const { x = 0, y = 0, width, height, fill } = properties
          shape = {
            ...baseShape,
            x,
            y,
            width: width ?? DEFAULT_SHAPE_PROPERTIES.rectangle.width,
            height: height ?? DEFAULT_SHAPE_PROPERTIES.rectangle.height,
            fill: fill ?? DEFAULT_SHAPE_PROPERTIES.rectangle.fill
          }
          break
        }
        case 'circle': {
          const { x = 0, y = 0, radius, fill } = properties
          shape = {
            ...baseShape,
            x,
            y,
            radius: radius ?? DEFAULT_SHAPE_PROPERTIES.circle.radius,
            fill: fill ?? DEFAULT_SHAPE_PROPERTIES.circle.fill
          }
          break
        }
        case 'line': {
          const { points = [0, 0, 100, 100], stroke, strokeWidth } = properties
          shape = {
            ...baseShape,
            x: 0, // Lines need x,y for drag positioning
            y: 0,
            points,
            stroke: stroke ?? DEFAULT_SHAPE_PROPERTIES.line.stroke,
            strokeWidth: strokeWidth ?? DEFAULT_SHAPE_PROPERTIES.line.strokeWidth
          }
          break
        }
        case 'text': {
          const { x = 0, y = 0, ...textProps } = properties
          shape = {
            ...baseShape,
            x,
            y,
            ...DEFAULT_SHAPE_PROPERTIES.text,
            ...textProps, // Override defaults with provided properties
            lockedBy: null,
            lockedAt: null
          }
          break
        }
        default:
          throw new Error(`Unknown shape type: ${type}`)
      }

      // Add to local state immediately (optimistic update)
      shapes.set(shape.id, shape)

      // Save to Firestore
      await saveShape(canvasId, shape)
      
      // v8: Log operation for OT
      if (operationLog) {
        const operation = operationLog.createOperation('create', shape.id, userId, shape, null)
        await operationLog.appendOperation(canvasId, operation)
      }
      
      // End sync measurement and track creation for v3
      syncMeasurement.end()
      trackShapeCreation()
      
      // Update shape metrics
      updateShapeMetrics(shapes.size, shapes.size)
      
      return shape
    } catch (err) {
      console.error(`Error creating ${type}:`, err)
      error.value = err.message
      throw err
    }
  }

  // Update shape properties (backward compatible)
  const updateRectangle = async (id, updates, userId = 'anonymous', canvasId = 'default', saveToFirestore = false) => {
    return updateShape(id, updates, userId, canvasId, saveToFirestore)
  }

  // Generic update shape function (v3 enhanced with priority options)
  const updateShape = async (id, updates, userId = 'anonymous', canvasId = 'default', saveToFirestore = false, isFinal = true, userName = 'Anonymous') => {
    const shape = shapes.get(id)
    if (!shape) {
      console.warn(`Shape with id ${id} not found`)
      return null
    }

    // Allow shapes to be positioned anywhere on the full canvas

    // Update shape with new properties
    const updatedShape = {
      ...shape,
      ...updates,
      lastModified: Date.now(),
      lastModifiedBy: userId,
      lastModifiedByName: userName
    }

    // Update local state immediately (optimistic update)
    shapes.set(id, updatedShape)
    
    // v8: Create prediction for local update
    let predictionId = null
    if (prediction && prediction.shouldApplyPrediction()) {
      predictionId = prediction.predict(id, updates, shape)
    }

    // Save to Firestore if requested (e.g., on drag end)
    if (saveToFirestore) {
      try {
        // v3: Pass isFinal flag to determine priority
        await updateShapeInFirestore(canvasId, id, updates, userId, {
          isFinal,  // High priority if final, low if interim
          usePriorityQueue: true
        })
        
        // v8: Log operation for OT (only on final edits)
        let operationId = null
        if (operationLog && isFinal) {
          const operation = operationLog.createOperation('update', id, userId, updates, shape)
          await operationLog.appendOperation(canvasId, operation)
          operationId = operation.operationId
        }
        
        // v8: Confirm prediction on successful save
        if (predictionId && prediction) {
          if (operationId) {
            // Will be confirmed when operation is acknowledged
          } else {
            prediction.confirmPrediction(predictionId)
          }
        }
      } catch (err) {
        console.error('Error updating shape in Firestore:', err)
        error.value = err.message
        
        // v8: Rollback prediction on error
        if (predictionId && prediction) {
          prediction.rollbackPrediction(predictionId, (shapeId, reverseDelta) => {
            const currentShape = shapes.get(shapeId)
            if (currentShape) {
              shapes.set(shapeId, { ...currentShape, ...reverseDelta })
            }
          })
        }
      }
    }

    return updatedShape
  }

  // Get shape by ID (backward compatible)
  const getRectangle = (id) => {
    return shapes.get(id)
  }

  const getShape = (id) => {
    return shapes.get(id)
  }

  // Get all shapes as array (backward compatible)
  const getAllRectangles = () => {
    return Array.from(shapes.values())
  }

  const getAllShapes = () => {
    return Array.from(shapes.values()).sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
  }

  // Remove shape (backward compatible)
  const removeRectangle = (id) => {
    return shapes.delete(id)
  }

  const removeShape = (id) => {
    return shapes.delete(id)
  }

  // Delete shapes from both local state and Firestore
  const deleteShapes = async (shapeIds, canvasId = 'default', userId = 'anonymous') => {
    if (!Array.isArray(shapeIds)) shapeIds = [shapeIds]
    
    const deletePromises = []
    
    for (const shapeId of shapeIds) {
      const shape = shapes.get(shapeId)
      
      // Optimistic local removal
      shapes.delete(shapeId)
      
      // Track deletion for v3
      trackShapeDeletion()
      
      // Delete from Firestore
      deletePromises.push(
        deleteShapeFromFirestore(canvasId, shapeId).catch(err => {
          console.error(`Failed to delete shape ${shapeId}:`, err)
          // Don't re-add to local state on error - deletion is optimistic
        })
      )
      
      // v8: Log operation for OT
      if (operationLog && shape) {
        const operation = operationLog.createOperation('delete', shapeId, userId, null, shape)
        deletePromises.push(
          operationLog.appendOperation(canvasId, operation).catch(err => {
            console.error(`Failed to log delete operation for ${shapeId}:`, err)
          })
        )
      }
    }
    
    await Promise.all(deletePromises)
    
    // Update shape metrics
    updateShapeMetrics(shapes.size, shapes.size)
    
    console.log(`Deleted ${shapeIds.length} shape(s)`)
  }

  // Clear all shapes (backward compatible)
  const clearRectangles = () => {
    shapes.clear()
  }

  const clearShapes = () => {
    shapes.clear()
  }

  // Load shapes from Firestore and populate local state (backward compatible)
  const loadRectanglesFromFirestore = async (canvasId = 'default') => {
    return loadShapesFromFirestore(canvasId)
  }

  const loadShapesFromFirestore = async (canvasId = 'default') => {
    try {
      isLoading.value = true
      error.value = null
      
      const firestoreShapes = await loadShapes(canvasId)
      
      // Clear local state and repopulate
      shapes.clear()
      firestoreShapes.forEach(shape => {
        shapes.set(shape.id, shape)
      })
      
      console.log(`Loaded ${firestoreShapes.length} shapes from Firestore`)
      return firestoreShapes
    } catch (err) {
      console.error('Error loading shapes from Firestore:', err)
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Set up real-time synchronization
  const startRealtimeSync = (canvasId = 'default', currentUserId = null) => {
    if (realtimeUnsubscribe) {
      console.warn('Real-time sync already active')
      return
    }

    try {
      console.log('Starting real-time sync...')
      isSyncing.value = true
      
      realtimeUnsubscribe = subscribeToShapes(canvasId, (changes, snapshot) => {
        isConnected.value = true
        
        // v5: Ignore updates during bulk operations
        if (syncPaused.value) {
          console.log('📴 Sync paused - ignoring real-time updates')
          return
        }
        
        changes.forEach((change) => {
          const shapeData = change.doc.data()
          const shapeId = change.doc.id
          
          // Convert Firestore timestamps
          const shape = {
            id: shapeId,
            ...shapeData,
            createdAt: shapeData.createdAt?.toMillis ? shapeData.createdAt.toMillis() : (shapeData.createdAt || Date.now()),
            lastModified: shapeData.lastModified?.toMillis ? shapeData.lastModified.toMillis() : (shapeData.lastModified || Date.now())
          }

          if (change.type === 'added') {
            // New shape from another user
            if (!shapes.has(shapeId)) {
              shapes.set(shapeId, shape)
              console.log(`Real-time: Shape ${shapeId} (${shape.type}) added`)
            }
          }
          
          if (change.type === 'modified') {
            const localShape = shapes.get(shapeId)
            
            // v8: OT-based conflict resolution (if enabled)
            if (useOpLog && conflictDetection && operationLog) {
              // Check for pending local operations
              const pendingOps = operationLog.getPendingOperations(shapeId)
              
              if (pendingOps.length > 0) {
                // Create remote operation from incoming shape
                const remoteOp = {
                  type: 'update',
                  shapeId,
                  userId: shape.lastModifiedBy,
                  timestamp: shape.lastModified,
                  delta: shape,  // Full shape as delta
                  baseState: localShape
                }
                
                // Check for conflicts
                const conflicts = conflictDetection.findConflictingOperations(remoteOp, operationLog.pendingOperations)
                
                if (conflicts.length > 0) {
                  console.log(`[OT] Detected ${conflicts.length} conflict(s) for shape ${shapeId}`)
                  
                  // Transform remote operation against pending local operations
                  let transformedOp = remoteOp
                  for (const { localOp } of conflicts) {
                    transformedOp = transform(transformedOp, localOp)
                    
                    if (!transformedOp) {
                      console.log('[OT] Remote operation discarded after transform')
                      break
                    }
                  }
                  
                  // Apply transformed operation if not discarded
                  if (transformedOp) {
                    const updatedShape = applyTransformedOperation(localShape, transformedOp)
                    if (updatedShape) {
                      shapes.set(shapeId, updatedShape)
                      conflictDetection.markResolved()
                      console.log(`[OT] Applied transformed operation to shape ${shapeId}`)
                    }
                  }
                  
                  return // Skip normal conflict resolution
                }
              }
            }
            
            // Standard conflict resolution: Last write wins with server timestamp
            if (!localShape || shape.lastModified > localShape.lastModified) {
              // If user is editing locally, queue remote update to apply after finish
              if (currentlyEditing.has(shapeId)) {
                pendingRemoteUpdates.set(shapeId, shape)
              } else {
                shapes.set(shapeId, shape)
              }
              console.log(`Real-time: Shape ${shapeId} (${shape.type}) updated`)
              // Visual feedback trigger: mark recent editor for UI highlights
              // Only highlight if edited by someone else, not by current user
              const isOtherUser = currentUserId && shape.lastModifiedBy && shape.lastModifiedBy !== currentUserId
              if (isOtherUser) {
                const marked = { ...shape, __highlightUntil: Date.now() + 2000 }
                shapes.set(shapeId, marked)
                // Basic notification for awareness (optional, lightweight)
                // info(`Edited by ${shape.lastModifiedBy || 'someone'}`)
              }
            } else {
              console.log(`Real-time: Ignoring older update for shape ${shapeId}`)
              // If local is newer within 2s window, show conflict note
              const dt = Math.abs((localShape.lastModified || 0) - (shape.lastModified || 0))
              if (dt < 2000) {
                warning(`Another user also edited ${shape.type}`)
              }
            }
          }
          
          if (change.type === 'removed') {
            // Shape deleted
            if (shapes.has(shapeId)) {
              shapes.delete(shapeId)
              console.log(`Real-time: Shape ${shapeId} removed`)
            }
          }
        })
      })
      
      console.log('Real-time sync started successfully')
    } catch (err) {
      console.error('Error setting up real-time sync:', err)
      error.value = err.message
      isConnected.value = false
    } finally {
      isSyncing.value = false
    }
  }

  // Stop real-time synchronization
  const stopRealtimeSync = () => {
    if (realtimeUnsubscribe) {
      realtimeUnsubscribe()
      realtimeUnsubscribe = null
      console.log('Real-time sync stopped')
    }
  }

  // Handle connection state changes
  const handleConnectionError = (err) => {
    console.error('Connection error:', err)
    isConnected.value = false
    error.value = 'Connection lost. Changes will sync when reconnected.'
  }

  // Get shape count (backward compatible)
  const getRectangleCount = () => {
    return shapes.size
  }

  const getShapeCount = () => {
    return shapes.size
  }

  // Text editing lock management
  const LOCK_EXPIRY_MS = 30000 // 30 seconds

  const isLockExpired = (lockedAt) => {
    if (!lockedAt) return true
    return Date.now() - lockedAt > LOCK_EXPIRY_MS
  }

  const isTextLocked = (shapeId, userId) => {
    const shape = shapes.get(shapeId)
    if (!shape || shape.type !== 'text') return false
    
    // Not locked
    if (!shape.lockedBy) return false
    
    // Locked by current user
    if (shape.lockedBy === userId) return false
    
    // Lock expired
    if (isLockExpired(shape.lockedAt)) return false
    
    // Locked by another user
    return true
  }

  const acquireTextLock = async (shapeId, userId, canvasId = 'default') => {
    const shape = shapes.get(shapeId)
    if (!shape || shape.type !== 'text') {
      throw new Error('Shape is not a text shape')
    }

    // Check if locked by another user
    if (shape.lockedBy && shape.lockedBy !== userId && !isLockExpired(shape.lockedAt)) {
      return {
        success: false,
        lockedBy: shape.lockedBy,
        message: 'Text is currently being edited by another user'
      }
    }

    // Acquire lock
    const updates = {
      lockedBy: userId,
      lockedAt: Date.now()
    }

    // Update local state
    shapes.set(shapeId, { ...shape, ...updates })

    // Update Firestore
    try {
      await updateShapeInFirestore(canvasId, shapeId, updates, userId)
      return { success: true }
    } catch (err) {
      console.error('Failed to acquire text lock:', err)
      return { success: false, message: 'Failed to acquire lock' }
    }
  }

  const releaseTextLock = async (shapeId, userId, canvasId = 'default') => {
    const shape = shapes.get(shapeId)
    if (!shape || shape.type !== 'text') return

    // Only release if locked by current user
    if (shape.lockedBy !== userId) return

    // Release lock
    const updates = {
      lockedBy: null,
      lockedAt: null
    }

    // Update local state
    shapes.set(shapeId, { ...shape, ...updates })

    // Update Firestore
    try {
      await updateShapeInFirestore(canvasId, shapeId, updates, userId)
    } catch (err) {
      console.error('Failed to release text lock:', err)
    }
  }

  const getLockedTextOwner = (shapeId) => {
    const shape = shapes.get(shapeId)
    if (!shape || shape.type !== 'text') return null
    
    if (shape.lockedBy && !isLockExpired(shape.lockedAt)) {
      return shape.lockedBy
    }
    return null
  }

  // Layer operations
  const bringToFront = async (shapeIds, userId, canvasId = 'default') => {
    if (!Array.isArray(shapeIds)) shapeIds = [shapeIds]
    
    const maxZ = getMaxZIndex(Array.from(shapes.values()))
    
    for (const shapeId of shapeIds) {
      const shape = shapes.get(shapeId)
      if (!shape) continue
      
      const newZIndex = maxZ + 1
      await updateShape(shapeId, { zIndex: newZIndex }, userId, canvasId, true)
    }
    
    // Check if normalization is needed
    await checkAndNormalizeZIndices(userId, canvasId)
  }

  const sendToBack = async (shapeIds, userId, canvasId = 'default') => {
    if (!Array.isArray(shapeIds)) shapeIds = [shapeIds]
    
    const minZ = getMinZIndex(Array.from(shapes.values()))
    
    for (const shapeId of shapeIds) {
      const shape = shapes.get(shapeId)
      if (!shape) continue
      
      const newZIndex = Math.max(0, minZ - 1)
      await updateShape(shapeId, { zIndex: newZIndex }, userId, canvasId, true)
    }
    
    // Check if normalization is needed
    await checkAndNormalizeZIndices(userId, canvasId)
  }

  const bringForward = async (shapeIds, userId, canvasId = 'default') => {
    if (!Array.isArray(shapeIds)) shapeIds = [shapeIds]
    
    for (const shapeId of shapeIds) {
      const shape = shapes.get(shapeId)
      if (!shape) continue
      
      const newZIndex = (shape.zIndex || 0) + 1
      await updateShape(shapeId, { zIndex: newZIndex }, userId, canvasId, true)
    }
    
    // Check if normalization is needed
    await checkAndNormalizeZIndices(userId, canvasId)
  }

  const sendBackward = async (shapeIds, userId, canvasId = 'default') => {
    if (!Array.isArray(shapeIds)) shapeIds = [shapeIds]
    
    for (const shapeId of shapeIds) {
      const shape = shapes.get(shapeId)
      if (!shape) continue
      
      const newZIndex = Math.max(0, (shape.zIndex || 0) - 1)
      await updateShape(shapeId, { zIndex: newZIndex }, userId, canvasId, true)
    }
    
    // Check if normalization is needed
    await checkAndNormalizeZIndices(userId, canvasId)
  }

  const normalizeZIndices = async (userId, canvasId = 'default') => {
    const allShapes = getAllShapes() // Already sorted by z-index
    
    for (let i = 0; i < allShapes.length; i++) {
      const shape = allShapes[i]
      if (shape.zIndex !== i) {
        await updateShape(shape.id, { zIndex: i }, userId, canvasId, true)
      }
    }
  }

  const checkAndNormalizeZIndices = async (userId, canvasId = 'default') => {
    const allShapes = Array.from(shapes.values())
    if (needsZIndexNormalization(allShapes)) {
      console.log('🔄 Z-index normalization needed, renumbering shapes...')
      await normalizeZIndices(userId, canvasId)
    }
  }

  // Duplicate shapes with offset
  const duplicateShapes = async (shapeIds, userId, canvasId = 'default') => {
    if (!Array.isArray(shapeIds)) shapeIds = [shapeIds]
    
    const maxZ = getMaxZIndex(Array.from(shapes.values()))
    const duplicatedIds = []
    
    for (let i = 0; i < shapeIds.length; i++) {
      const originalShape = shapes.get(shapeIds[i])
      if (!originalShape) continue
      
      // Create new shape data with offset and new metadata
      const duplicateData = {
        ...originalShape,
        id: undefined, // Will be generated
        x: originalShape.x + 20,
        y: originalShape.y + 20,
        zIndex: maxZ + i + 1,
        createdBy: userId,
        createdAt: new Date(),
        lastModified: new Date(),
        lastModifiedBy: userId
      }
      
      // Remove id from duplicateData so createShape generates a new one
      const { id, ...dataWithoutId } = originalShape
      const newShape = await createShape(
        originalShape.type,
        {
          ...dataWithoutId,
          x: originalShape.x + 20,
          y: originalShape.y + 20,
          zIndex: maxZ + i + 1
        },
        userId,
        canvasId
      )
      
      if (newShape) {
        duplicatedIds.push(newShape.id)
      }
    }
    
    return duplicatedIds
  }

  // v5: Pause sync during bulk operations
  const pauseSync = () => {
    syncPaused.value = true
    console.log('📴 Real-time sync paused for bulk operation')
  }

  // v5: Resume sync after bulk operations
  const resumeSync = async (canvasId) => {
    syncPaused.value = false
    console.log('📡 Real-time sync resuming...')
    
    // Force full reload from Firestore to ensure sync
    try {
      await loadShapesFromFirestore(canvasId)
      console.log('📡 Real-time sync resumed and state reloaded')
    } catch (err) {
      console.error('Error reloading shapes after resuming sync:', err)
      // Still resume sync even if reload fails
    }
  }

  return {
    // State
    shapes, // New primary state
    rectangles: shapes, // Backward compatible alias
    isLoading,
    error,
    isConnected,
    isSyncing,

    // New shape methods
    createShape,
    updateShape,
    getShape,
    getAllShapes,
    removeShape,
    deleteShapes,
    clearShapes,
    getShapeCount,
    loadShapesFromFirestore,

    // Backward compatible rectangle methods
    createRectangle,
    updateRectangle,
    getRectangle,
    getAllRectangles,
    removeRectangle,
    clearRectangles,
    getRectangleCount,
    loadRectanglesFromFirestore,
    
    // Real-time sync
    startRealtimeSync,
    stopRealtimeSync,
    handleConnectionError,
    pauseSync, // v5: Bulk operation support
    resumeSync, // v5: Bulk operation support

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
    normalizeZIndices,

    // Duplicate operations
    duplicateShapes
  }
}
