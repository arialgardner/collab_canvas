import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  getDocs, 
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
  enableNetwork,
  disableNetwork,
  writeBatch
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { usePerformance } from './usePerformance'
import { usePerformanceMonitoring } from './usePerformanceMonitoring'
import { useErrorHandling } from './useErrorHandling'
import { getOperationQueue } from '../utils/operationQueue'
import { useOperationQueue } from './useOperationQueue'
import { useNotifications } from './useNotifications'
import { isDuplicateOperation, markOperationProcessed } from '../utils/operationDeduplication'

export const useFirestore = () => {
  const { trackFirestoreOperation, trackListener, debounce } = usePerformance()
  const { 
    trackFirestoreOperation: trackFirestoreOpV3,
    trackFirestoreListener,
    trackFirestoreError 
  } = usePerformanceMonitoring()
  const { handleFirebaseError, retry } = useErrorHandling()
  const { error: notifyError, warning: notifyWarning } = useNotifications()
  
  // Operation queue for batching and prioritization (v3)
  const operationQueue = getOperationQueue()
  const { bridgeEnqueue } = useOperationQueue()
  
  // Set up queue executor
  operationQueue.setExecutor(async (operation) => {
    return await executeQueuedOperation(operation)
  })
  
  // Get reference to canvas shapes collection
  const getCanvasShapesRef = (canvasId = 'default') => {
    return collection(db, 'canvases', canvasId, 'shapes')
  }

  // Get reference to specific shape document
  const getShapeDocRef = (canvasId, shapeId) => {
    return doc(db, 'canvases', canvasId, 'shapes', shapeId)
  }

  // Backward compatible aliases
  const getCanvasRectanglesRef = (canvasId = 'default') => {
    return getCanvasShapesRef(canvasId)
  }

  const getRectangleDocRef = (canvasId, rectangleId) => {
    return getShapeDocRef(canvasId, rectangleId)
  }

  // Execute queued operation (v3)
  const executeQueuedOperation = async (operation) => {
    const { type, shapeId, canvasId, data, userId, sequenceNumber } = operation
    
    try {
      trackFirestoreOperation()
      trackFirestoreOpV3(type === 'create' ? 'write' : type)
      
      const docRef = getShapeDocRef(canvasId, shapeId)
      
      if (type === 'create') {
        // Create operation
        const shapeData = {
          ...data,
          sequenceNumber,  // Add sequence number for ordering
          lastModified: serverTimestamp()
        }
        await setDoc(docRef, shapeData)
      } else if (type === 'update') {
        // Update operation - delta only
        const updates = {
          ...data,
          sequenceNumber,  // Add sequence number
          lastModified: serverTimestamp(),
          lastModifiedBy: userId
        }
        await updateDoc(docRef, updates)
      } else if (type === 'delete') {
        // Delete operation
        await deleteDoc(docRef)
      }
      
      // Mark operation as processed for deduplication
      markOperationProcessed(shapeId, operation.timestamp, userId, type)
      
      return true
    } catch (error) {
      console.error(`Error executing ${type} operation:`, error)
      trackFirestoreError()
      throw error
    }
  }

  // Expose for queue processor (PR #6)
  const processQueuedOperation = async (operation) => {
    return executeQueuedOperation(operation)
  }

  // Save shape to Firestore with error handling and retry (v3 enhanced with priority queue)
  const saveShape = async (canvasId = 'default', shape, options = {}) => {
    const { 
      usePriorityQueue = true,  // Use priority queue by default
      priority = 'high'          // Shape creation is high priority
    } = options
    
    // Check for duplicates (v3)
    if (isDuplicateOperation(shape.id, Date.now(), shape.createdBy, 'create')) {
      console.log(`Skipping duplicate create for shape ${shape.id}`)
      return true
    }
    
    // Use priority queue for v3 optimization
    if (usePriorityQueue) {
      const op = {
        type: 'create',
        shapeId: shape.id,
        canvasId,
        data: shape,
        userId: shape.createdBy,
        timestamp: Date.now()
      }
      await bridgeEnqueue(op, priority)
      
      console.log(`Shape ${shape.id} (${shape.type}) queued for save (${priority} priority)`)
      return true
    }
    
    // Legacy direct save (backward compatible)
    const operation = async () => {
      trackFirestoreOperation()
      trackFirestoreOpV3('write')
      
      const shapeData = {
        ...shape,
        lastModified: serverTimestamp()
      }
      
      const docRef = getShapeDocRef(canvasId, shape.id)
      await setDoc(docRef, shapeData)
      
      console.log(`Shape ${shape.id} (${shape.type}) saved to Firestore`)
      return true
    }

    try {
      return await retry(operation, 3, 1000)
    } catch (error) {
      console.error('Error saving shape:', error)
      notifyError('Failed to save shape - will retry')
      trackFirestoreError()
      handleFirebaseError(error, 'save shape')
      throw error
    }
  }

  // Backward compatible rectangle save
  const saveRectangle = async (canvasId = 'default', rectangle) => {
    return saveShape(canvasId, rectangle)
  }

  // Generic update shape method (v3 enhanced with priority queue)
  const updateShape = async (canvasId = 'default', shapeId, updates, userId = 'anonymous', options = {}) => {
    const {
      usePriorityQueue = true,  // Use priority queue by default
      priority = 'high',         // Default to high priority
      isFinal = true             // Is this a final update (dragend) or interim (dragging)?
    } = options
    
    // Determine priority based on update type
    const actualPriority = isFinal ? 'high' : 'low'
    
    // Check for duplicates (v3)
    if (isDuplicateOperation(shapeId, Date.now(), userId, 'update')) {
      console.log(`Skipping duplicate update for shape ${shapeId}`)
      return true
    }
    
    // Use priority queue for v3 optimization
    if (usePriorityQueue) {
      const op = {
        type: 'update',
        shapeId,
        canvasId,
        data: updates,  // Delta updates only
        userId,
        timestamp: Date.now()
      }
      await bridgeEnqueue(op, actualPriority)
      
      console.log(`Shape ${shapeId} update queued (${actualPriority} priority, final: ${isFinal})`)
      return true
    }
    
    // Legacy direct update (backward compatible)
    try {
      trackFirestoreOperation()
      trackFirestoreOpV3('write')
      
      const docRef = getShapeDocRef(canvasId, shapeId)
      await updateDoc(docRef, {
        ...updates,
        lastModified: serverTimestamp(),
        lastModifiedBy: userId
      })
      
      console.log(`Shape ${shapeId} updated in Firestore`)
      return true
    } catch (error) {
      console.error('Error updating shape:', error)
      notifyWarning('Update failed - queued for retry')
      trackFirestoreError()
      throw error
    }
  }

  // Delete shape from Firestore
  const deleteShape = async (canvasId, shapeId) => {
    try {
      trackFirestoreOperation()
      trackFirestoreOpV3('delete')  // v3 tracking
      
      const docRef = getShapeDocRef(canvasId, shapeId)
      await deleteDoc(docRef)
      
      console.log(`Shape ${shapeId} deleted from Firestore`)
      return true
    } catch (error) {
      console.error('Error deleting shape:', error)
      notifyWarning('Delete failed - will retry')
      trackFirestoreError()
      throw error
    }
  }

  // Debounced update for rapid position changes
  const debouncedUpdatePosition = debounce(async (canvasId, shapeId, x, y, userId) => {
    try {
      trackFirestoreOperation()
      
      const docRef = getShapeDocRef(canvasId, shapeId)
      await updateDoc(docRef, {
        x,
        y,
        lastModified: serverTimestamp(),
        lastModifiedBy: userId
      })
      
      console.log(`Shape ${shapeId} position updated in Firestore`)
      return true
    } catch (error) {
      console.error('Error updating shape position:', error)
      throw error
    }
  }, 250) // Debounce rapid updates by 250ms

  // Update rectangle position in Firestore (with debouncing) - backward compatible
  const updateRectanglePosition = async (canvasId = 'default', rectangleId, x, y, userId = 'anonymous') => {
    // Use debounced version for performance
    return debouncedUpdatePosition(canvasId, rectangleId, x, y, userId)
  }

  // Load all shapes from Firestore (one-time fetch)
  const loadShapes = async (canvasId = 'default') => {
    try {
      trackFirestoreOpV3('read')  // v3 tracking
      
      const shapesRef = getCanvasShapesRef(canvasId)
      const q = query(shapesRef, orderBy('createdAt', 'asc'))
      const querySnapshot = await getDocs(q)
      
      const shapes = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        shapes.push({
          id: doc.id,
          ...data,
          // Convert Firestore timestamps to numbers for local state
          createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt || Date.now()),
          lastModified: data.lastModified?.toMillis ? data.lastModified.toMillis() : (data.lastModified || Date.now())
        })
      })
      
      console.log(`Loaded ${shapes.length} shapes from Firestore`)
      return shapes
    } catch (error) {
      console.error('Error loading shapes:', error)
      trackFirestoreError()  // v3 error tracking
      throw error
    }
  }

  // Backward compatible load rectangles
  const loadRectangles = async (canvasId = 'default') => {
    return loadShapes(canvasId)
  }

  // Subscribe to shape changes (for real-time sync) with error handling
  const subscribeToShapes = (canvasId = 'default', callback) => {
    try {
      trackListener('add')
      trackFirestoreListener('add')  // v3 tracking
      
      const shapesRef = getCanvasShapesRef(canvasId)
      const q = query(shapesRef, orderBy('createdAt', 'asc'))
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const changes = snapshot.docChanges()
        callback(changes, snapshot)
      }, (error) => {
        console.error('Firestore listener error:', error)
        trackFirestoreError()  // v3 error tracking
        handleFirebaseError(error, 'subscribe to shapes')
        trackListener('remove')
        trackFirestoreListener('remove')  // v3 tracking
      })
      
      console.log(`Subscribed to shape changes for canvas: ${canvasId}`)
      
      // Return wrapped unsubscribe that tracks listener removal
      return () => {
        unsubscribe()
        trackListener('remove')
        trackFirestoreListener('remove')  // v3 tracking
      }
    } catch (error) {
      console.error('Error subscribing to shapes:', error)
      trackFirestoreError()  // v3 error tracking
      handleFirebaseError(error, 'subscribe to shapes')
      throw error
    }
  }

  // Backward compatible subscribe to rectangles
  const subscribeToRectangles = (canvasId = 'default', callback) => {
    return subscribeToShapes(canvasId, callback)
  }

  // Helper to check Firestore connection
  const testFirestoreConnection = async () => {
    try {
      // Try to read a small collection to test connection
      const testRef = getCanvasShapesRef('default')
      await getDocs(testRef)
      console.log('Firestore connection successful')
      return true
    } catch (error) {
      console.error('Firestore connection failed:', error)
      return false
    }
  }

  return {
    // New shape operations
    saveShape,
    updateShape,
    deleteShape,
    loadShapes,
    subscribeToShapes,
    processQueuedOperation,

    // Backward compatible rectangle operations
    saveRectangle,
    updateRectanglePosition,
    loadRectangles,
    subscribeToRectangles,
    
    // Utilities
    testFirestoreConnection,
    getCanvasShapesRef,
    getShapeDocRef,
    getCanvasRectanglesRef,
    getRectangleDocRef
  }
}
