import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  getDocs, 
  onSnapshot,
  serverTimestamp,
  query,
  orderBy 
} from 'firebase/firestore'
import { db } from '../firebase/config'

export const useFirestore = () => {
  // Get reference to canvas rectangles collection
  const getCanvasRectanglesRef = (canvasId = 'default') => {
    return collection(db, 'canvases', canvasId, 'rectangles')
  }

  // Get reference to specific rectangle document
  const getRectangleDocRef = (canvasId, rectangleId) => {
    return doc(db, 'canvases', canvasId, 'rectangles', rectangleId)
  }

  // Save rectangle to Firestore
  const saveRectangle = async (canvasId = 'default', rectangle) => {
    try {
      const rectangleData = {
        ...rectangle,
        lastModified: serverTimestamp()
      }
      
      const docRef = getRectangleDocRef(canvasId, rectangle.id)
      await setDoc(docRef, rectangleData)
      
      console.log(`Rectangle ${rectangle.id} saved to Firestore`)
      return true
    } catch (error) {
      console.error('Error saving rectangle:', error)
      throw error
    }
  }

  // Update rectangle position in Firestore
  const updateRectanglePosition = async (canvasId = 'default', rectangleId, x, y, userId = 'anonymous') => {
    try {
      const docRef = getRectangleDocRef(canvasId, rectangleId)
      await updateDoc(docRef, {
        x,
        y,
        lastModified: serverTimestamp(),
        lastModifiedBy: userId
      })
      
      console.log(`Rectangle ${rectangleId} position updated in Firestore`)
      return true
    } catch (error) {
      console.error('Error updating rectangle position:', error)
      throw error
    }
  }

  // Load all rectangles from Firestore (one-time fetch)
  const loadRectangles = async (canvasId = 'default') => {
    try {
      const rectanglesRef = getCanvasRectanglesRef(canvasId)
      const q = query(rectanglesRef, orderBy('createdAt', 'asc'))
      const querySnapshot = await getDocs(q)
      
      const rectangles = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        rectangles.push({
          id: doc.id,
          ...data,
          // Convert Firestore timestamps to numbers for local state
          createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt || Date.now()),
          lastModified: data.lastModified?.toMillis ? data.lastModified.toMillis() : (data.lastModified || Date.now())
        })
      })
      
      console.log(`Loaded ${rectangles.length} rectangles from Firestore`)
      return rectangles
    } catch (error) {
      console.error('Error loading rectangles:', error)
      throw error
    }
  }

  // Subscribe to rectangle changes (for real-time sync - used in PR #6)
  const subscribeToRectangles = (canvasId = 'default', callback) => {
    try {
      const rectanglesRef = getCanvasRectanglesRef(canvasId)
      const q = query(rectanglesRef, orderBy('createdAt', 'asc'))
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const changes = snapshot.docChanges()
        callback(changes, snapshot)
      })
      
      console.log(`Subscribed to rectangle changes for canvas: ${canvasId}`)
      return unsubscribe
    } catch (error) {
      console.error('Error subscribing to rectangles:', error)
      throw error
    }
  }

  // Helper to check Firestore connection
  const testFirestoreConnection = async () => {
    try {
      // Try to read a small collection to test connection
      const testRef = collection(db, 'canvases', 'default', 'rectangles')
      await getDocs(testRef)
      console.log('Firestore connection successful')
      return true
    } catch (error) {
      console.error('Firestore connection failed:', error)
      return false
    }
  }

  return {
    // Core operations
    saveRectangle,
    updateRectanglePosition,
    loadRectangles,
    subscribeToRectangles,
    
    // Utilities
    testFirestoreConnection,
    getCanvasRectanglesRef,
    getRectangleDocRef
  }
}
