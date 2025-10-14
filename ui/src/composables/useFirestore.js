import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  getDocs, 
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
  enableNetwork,
  disableNetwork
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { usePerformance } from './usePerformance'
import { useErrorHandling } from './useErrorHandling'

export const useFirestore = () => {
  const { trackFirestoreOperation, trackListener, debounce } = usePerformance()
  const { handleFirebaseError, retry } = useErrorHandling()
  
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

  // Save shape to Firestore with error handling and retry
  const saveShape = async (canvasId = 'default', shape) => {
    const operation = async () => {
      trackFirestoreOperation()
      
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
      handleFirebaseError(error, 'save shape')
      throw error
    }
  }

  // Backward compatible rectangle save
  const saveRectangle = async (canvasId = 'default', rectangle) => {
    return saveShape(canvasId, rectangle)
  }

  // Generic update shape method
  const updateShape = async (canvasId = 'default', shapeId, updates, userId = 'anonymous') => {
    try {
      trackFirestoreOperation()
      
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
      
      const shapesRef = getCanvasShapesRef(canvasId)
      const q = query(shapesRef, orderBy('createdAt', 'asc'))
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const changes = snapshot.docChanges()
        callback(changes, snapshot)
      }, (error) => {
        console.error('Firestore listener error:', error)
        handleFirebaseError(error, 'subscribe to shapes')
        trackListener('remove')
      })
      
      console.log(`Subscribed to shape changes for canvas: ${canvasId}`)
      
      // Return wrapped unsubscribe that tracks listener removal
      return () => {
        unsubscribe()
        trackListener('remove')
      }
    } catch (error) {
      console.error('Error subscribing to shapes:', error)
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
    loadShapes,
    subscribeToShapes,

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
