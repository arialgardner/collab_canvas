import { 
  collection, 
  doc, 
  getDoc,
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
    const { type, shapeId, canvasId, data, userId, sequenceNumber, id } = operation
    
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
      
      // Clean up from IndexedDB on success (only persist failed operations)
      if (id) {
        const { markCompleted } = useOperationQueue()
        await markCompleted(id)
        // console.log(`✅ Operation ${id} completed and removed from queue`)
      }
      
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
      // console.log(`Skipping duplicate create for shape ${shape.id}`)
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
      
      // console.log(`Shape ${shape.id} (${shape.type}) queued for save (${priority} priority)`)
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
      
      // console.log(`Shape ${shape.id} (${shape.type}) saved to Firestore`)
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
      // console.log(`Skipping duplicate update for shape ${shapeId}`)
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
      
      // console.log(`Shape ${shapeId} update queued (${actualPriority} priority, final: ${isFinal})`)
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
      
      // console.log(`Shape ${shapeId} updated in Firestore`)
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
      
      // console.log(`Shape ${shapeId} deleted from Firestore`)
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
      
      // console.log(`Shape ${shapeId} position updated in Firestore`)
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
      
      // console.log(`Loaded ${shapes.length} shapes from Firestore`)
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
      
      // console.log(`Subscribed to shape changes for canvas: ${canvasId}`)
      
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
      // console.log('Firestore connection successful')
      return true
    } catch (error) {
      console.error('Firestore connection failed:', error)
      return false
    }
  }

  // Batch write operations for bulk shape creation (PR #1 v5)
  const saveShapesBatch = async (canvasId, shapes, options = {}) => {
    const { onProgress } = options
    
    try {
      // console.log(`📦 Starting batch save of ${shapes.length} shapes`)
      trackFirestoreOpV3('batch_write')
      
      // Split into 500-operation chunks (Firestore batch limit)
      const chunks = []
      for (let i = 0; i < shapes.length; i += 500) {
        chunks.push(shapes.slice(i, i + 500))
      }
      
      // console.log(`Split into ${chunks.length} batches`)
      
      // Execute batches in parallel
      let processedCount = 0
      await Promise.all(chunks.map(async (chunk, chunkIndex) => {
        const batch = writeBatch(db)
        
        chunk.forEach(shape => {
          const ref = getShapeDocRef(canvasId, shape.id)
          // Prepare shape data with server timestamp
          const shapeData = {
            ...shape,
            lastModified: serverTimestamp()
          }
          batch.set(ref, shapeData, { merge: true })
        })
        
        await batch.commit()
        processedCount += chunk.length
        
        // Report progress if callback provided
        if (onProgress) {
          onProgress(processedCount, shapes.length)
        }
        
        // console.log(`✅ Batch ${chunkIndex + 1}/${chunks.length} committed (${chunk.length} shapes)`)
      }))
      
      // console.log(`✅ Batch save complete: ${shapes.length} shapes saved`)
      return true
    } catch (error) {
      console.error('Error in batch save:', error)
      trackFirestoreError()
      throw error
    }
  }

  // Batch delete operations for bulk shape deletion (PR #1 v5)
  const deleteShapesBatch = async (canvasId, shapeIds, options = {}) => {
    const { onProgress } = options
    
    try {
      // console.log(`🗑️ Starting batch delete of ${shapeIds.length} shapes`)
      trackFirestoreOpV3('batch_delete')
      
      // Split into 500-operation chunks (Firestore batch limit)
      const chunks = []
      for (let i = 0; i < shapeIds.length; i += 500) {
        chunks.push(shapeIds.slice(i, i + 500))
      }
      
      // console.log(`Split into ${chunks.length} batches`)
      
      // Execute batches in parallel
      let processedCount = 0
      await Promise.all(chunks.map(async (chunk, chunkIndex) => {
        const batch = writeBatch(db)
        
        chunk.forEach(shapeId => {
          const ref = getShapeDocRef(canvasId, shapeId)
          batch.delete(ref)
        })
        
        await batch.commit()
        processedCount += chunk.length
        
        // Report progress if callback provided
        if (onProgress) {
          onProgress(processedCount, shapeIds.length)
        }
        
        // console.log(`✅ Delete batch ${chunkIndex + 1}/${chunks.length} committed (${chunk.length} shapes)`)
      }))
      
      // console.log(`✅ Batch delete complete: ${shapeIds.length} shapes deleted`)
      return true
    } catch (error) {
      console.error('Error in batch delete:', error)
      trackFirestoreError()
      throw error
    }
  }

  // Batch update operations for bulk shape updates
  const updateShapesBatch = async (canvasId, shapeUpdates, options = {}) => {
    const { onProgress } = options
    
    try {
      // shapeUpdates is an array of { id, updates } objects
      trackFirestoreOpV3('batch_update')
      
      // Split into 500-operation chunks (Firestore batch limit)
      const chunks = []
      for (let i = 0; i < shapeUpdates.length; i += 500) {
        chunks.push(shapeUpdates.slice(i, i + 500))
      }
      
      // Execute batches in parallel
      let processedCount = 0
      await Promise.all(chunks.map(async (chunk, chunkIndex) => {
        const batch = writeBatch(db)
        
        chunk.forEach(({ id, updates }) => {
          const ref = getShapeDocRef(canvasId, id)
          const updateData = {
            ...updates,
            lastModified: serverTimestamp()
          }
          batch.update(ref, updateData)
        })
        
        await batch.commit()
        processedCount += chunk.length
        
        // Report progress if callback provided
        if (onProgress) {
          onProgress(processedCount, shapeUpdates.length)
        }
      }))
      
      return true
    } catch (error) {
      console.error('Error in batch update:', error)
      trackFirestoreError()
      throw error
    }
  }

  // Canvas snapshot operations for fast bulk loading (PR #3 v5)
  // Import compression utilities at the top level (will add to imports)
  
  /**
   * Update or create canvas snapshot document
   * @param {string} canvasId - Canvas ID
   * @param {Array} shapes - Array of shape objects (uncompressed)
   * @returns {Promise<boolean>} - Success status
   */
  const updateCanvasSnapshot = async (canvasId, shapes) => {
    try {
      // Import compression utility dynamically to avoid circular dependency
      const { compressShapes, canFitInSnapshot } = await import('../utils/compression.js')
      
      // console.log(`📸 Creating snapshot for ${shapes.length} shapes`)
      
      // Check if shapes will fit within Firestore 1MB limit
      if (!canFitInSnapshot(shapes)) {
        console.warn('⚠️ Shapes exceed Firestore document limit - snapshot will not be created')
        return false
      }
      
      // Compress shapes
      const compressed = compressShapes(shapes)
      
      // Create snapshot document
      const snapshotRef = doc(db, 'canvases', canvasId, 'snapshot')
      const snapshotData = {
        shapes: compressed,
        shapeCount: shapes.length,
        lastUpdated: serverTimestamp(),
        version: 1 // Can be incremented for future schema changes
      }
      
      await setDoc(snapshotRef, snapshotData)
      
      // console.log(`✅ Snapshot created successfully (${shapes.length} shapes)`)
      trackFirestoreOpV3('snapshot_write')
      
      return true
    } catch (error) {
      console.error('Error creating canvas snapshot:', error)
      trackFirestoreError()
      // Don't throw - snapshot creation is optional optimization
      return false
    }
  }
  
  /**
   * Load canvas snapshot document
   * @param {string} canvasId - Canvas ID
   * @returns {Promise<Array|null>} - Array of shapes or null if no snapshot exists
   */
  const loadCanvasSnapshot = async (canvasId) => {
    try {
      // Import compression utility dynamically
      const { decompressShapes } = await import('../utils/compression.js')
      
      // console.log(`📸 Loading snapshot for canvas ${canvasId}`)
      
      const snapshotRef = doc(db, 'canvases', canvasId, 'snapshot')
      const snapshotDoc = await getDoc(snapshotRef)
      
      if (!snapshotDoc.exists()) {
        // console.log('No snapshot found for canvas')
        return null
      }
      
      const data = snapshotDoc.data()
      
      // Validate snapshot data
      if (!data.shapes || typeof data.shapes !== 'string') {
        console.warn('Invalid snapshot data - missing or invalid shapes field')
        return null
      }
      
      // Decompress shapes
      const shapes = decompressShapes(data.shapes)
      
      // console.log(`✅ Snapshot loaded successfully (${shapes.length} shapes)`)
      trackFirestoreOpV3('snapshot_read')
      
      return shapes
    } catch (error) {
      console.error('Error loading canvas snapshot:', error)
      trackFirestoreError()
      // Return null to allow graceful fallback
      return null
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
    
    // Batch operations (v5)
    saveShapesBatch,
    updateShapesBatch,
    deleteShapesBatch,
    
    // Snapshot operations (v5)
    updateCanvasSnapshot,
    loadCanvasSnapshot,

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
