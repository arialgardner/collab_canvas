import { ref, reactive } from 'vue'
import { 
  generateId, 
  generateRandomColor, 
  DEFAULT_RECT_SIZE,
  DEFAULT_SHAPE_PROPERTIES,
  constrainToBounds,
  getMaxZIndex,
  getMinZIndex,
  needsZIndexNormalization
} from '../types/shapes'
import { useFirestore } from './useFirestore'
import { usePerformance } from './usePerformance'

export const useShapes = () => {
  // Firestore integration
  const { saveShape, updateShape: updateShapeInFirestore, loadShapes, subscribeToShapes } = useFirestore()
  const { measureRectangleSync, measureRender, trackListener } = usePerformance()
  
  // Store shapes in a reactive Map for O(1) lookups
  const shapes = reactive(new Map())
  const isLoading = ref(false)
  const error = ref(null)
  const isConnected = ref(true)
  const isSyncing = ref(false)
  
  // Real-time listener management
  let realtimeUnsubscribe = null

  // Create a new shape at specified position (backward compatible for rectangles)
  const createRectangle = async (x, y, userId = 'anonymous', canvasId = 'default') => {
    return createShape('rectangle', { x, y }, userId, canvasId)
  }

  // Generic create shape function
  const createShape = async (type = 'rectangle', properties = {}, userId = 'anonymous', canvasId = 'default') => {
    try {
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
        lastModifiedBy: userId
      }

      // Type-specific properties
      let shape
      switch (type) {
        case 'rectangle': {
          const { x = 0, y = 0 } = properties
          const constrainedPos = constrainToBounds(x, y)
          shape = {
            ...baseShape,
            x: constrainedPos.x,
            y: constrainedPos.y,
            width: DEFAULT_SHAPE_PROPERTIES.rectangle.width,
            height: DEFAULT_SHAPE_PROPERTIES.rectangle.height,
            fill: DEFAULT_SHAPE_PROPERTIES.rectangle.fill
          }
          break
        }
        case 'circle': {
          const { x = 0, y = 0 } = properties
          shape = {
            ...baseShape,
            x,
            y,
            radius: DEFAULT_SHAPE_PROPERTIES.circle.radius,
            fill: DEFAULT_SHAPE_PROPERTIES.circle.fill
          }
          break
        }
        case 'line': {
          const { points = [0, 0, 100, 100] } = properties
          shape = {
            ...baseShape,
            x: 0, // Lines need x,y for drag positioning
            y: 0,
            points,
            stroke: DEFAULT_SHAPE_PROPERTIES.line.stroke,
            strokeWidth: DEFAULT_SHAPE_PROPERTIES.line.strokeWidth
          }
          break
        }
        case 'text': {
          const { x = 0, y = 0 } = properties
          shape = {
            ...baseShape,
            x,
            y,
            ...DEFAULT_SHAPE_PROPERTIES.text,
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

  // Generic update shape function
  const updateShape = async (id, updates, userId = 'anonymous', canvasId = 'default', saveToFirestore = false) => {
    const shape = shapes.get(id)
    if (!shape) {
      console.warn(`Shape with id ${id} not found`)
      return null
    }

    // Constrain all shapes to canvas bounds
    if (updates.x !== undefined || updates.y !== undefined) {
      const newX = updates.x !== undefined ? updates.x : shape.x
      const newY = updates.y !== undefined ? updates.y : shape.y
      
      // Get dimensions based on shape type
      let width = 0
      let height = 0
      
      if (shape.type === 'rectangle' || shape.type === 'text') {
        width = updates.width !== undefined ? updates.width : shape.width || 0
        height = updates.height !== undefined ? updates.height : shape.height || 0
      } else if (shape.type === 'circle') {
        const radius = updates.radius !== undefined ? updates.radius : shape.radius
        width = radius * 2
        height = radius * 2
      } else if (shape.type === 'line') {
        // For lines, ensure endpoints stay within bounds
        // Lines use points array, keep x,y at 0,0 and constrain points instead
        width = 0
        height = 0
      }
      
      const constrainedPos = constrainToBounds(newX, newY, width, height)
      updates.x = constrainedPos.x
      updates.y = constrainedPos.y
    }

    // Update shape with new properties
    const updatedShape = {
      ...shape,
      ...updates,
      lastModified: Date.now(),
      lastModifiedBy: userId
    }

    // Update local state immediately (optimistic update)
    shapes.set(id, updatedShape)

    // Save to Firestore if requested (e.g., on drag end)
    if (saveToFirestore) {
      try {
        await updateShapeInFirestore(canvasId, id, updates, userId)
      } catch (err) {
        console.error('Error updating shape in Firestore:', err)
        error.value = err.message
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
    return Array.from(shapes.values())
  }

  // Remove shape (backward compatible)
  const removeRectangle = (id) => {
    return shapes.delete(id)
  }

  const removeShape = (id) => {
    return shapes.delete(id)
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
  const startRealtimeSync = (canvasId = 'default') => {
    if (realtimeUnsubscribe) {
      console.warn('Real-time sync already active')
      return
    }

    try {
      console.log('Starting real-time sync...')
      isSyncing.value = true
      
      realtimeUnsubscribe = subscribeToShapes(canvasId, (changes, snapshot) => {
        isConnected.value = true
        
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
            
            // Conflict resolution: Last write wins with server timestamp
            if (!localShape || shape.lastModified > localShape.lastModified) {
              shapes.set(shapeId, shape)
              console.log(`Real-time: Shape ${shapeId} (${shape.type}) updated`)
            } else {
              console.log(`Real-time: Ignoring older update for shape ${shapeId}`)
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

    // Text lock management
    isTextLocked,
    acquireTextLock,
    releaseTextLock,
    getLockedTextOwner
  }
}
