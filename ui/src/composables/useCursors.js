import { ref, reactive, onUnmounted } from 'vue'
import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot,
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { usePerformance } from './usePerformance'

export const useCursors = () => {
  const { measureCursorSync, trackFirestoreOperation, trackListener } = usePerformance()
  
  // Store cursors for other users (not including current user)
  const cursors = reactive(new Map())
  const isTracking = ref(false)
  
  // Throttling for cursor updates
  let lastUpdateTime = 0
  const UPDATE_THROTTLE = 50 // 50ms = ~20fps
  let updateTimeout = null
  let cursorUnsubscribe = null

  // Get cursor collection reference
  const getCursorCollectionRef = (canvasId = 'default') => {
    return collection(db, 'cursors', canvasId, 'positions')
  }

  // Get cursor document reference
  const getCursorDocRef = (canvasId, userId) => {
    return doc(db, 'cursors', canvasId, 'positions', userId)
  }

  // Update cursor position in Firestore (throttled)
  const updateCursorPosition = async (canvasId = 'default', userId, x, y, userName, cursorColor) => {
    if (!userId) return

    const now = Date.now()
    
    // Start measuring cursor sync latency
    const measurement = measureCursorSync()
    
    // Throttle updates to avoid excessive writes
    if (now - lastUpdateTime < UPDATE_THROTTLE) {
      // Clear previous timeout and set new one
      if (updateTimeout) {
        clearTimeout(updateTimeout)
      }
      
      updateTimeout = setTimeout(() => {
        updateCursorPosition(canvasId, userId, x, y, userName, cursorColor)
      }, UPDATE_THROTTLE)
      return
    }

    try {
      lastUpdateTime = now
      trackFirestoreOperation()
      
      const cursorData = {
        userId,
        userName,
        cursorColor,
        x: Math.round(x), // Round for smaller payloads
        y: Math.round(y),
        timestamp: serverTimestamp(),
        lastSeen: serverTimestamp()
      }
      
      const docRef = getCursorDocRef(canvasId, userId)
      await setDoc(docRef, cursorData)
      
      // End measurement
      measurement.end()
      
    } catch (error) {
      console.error('Error updating cursor position:', error)
      measurement.end()
    }
  }

  // Subscribe to cursor updates from other users
  const subscribeToCursors = (canvasId = 'default', currentUserId) => {
    if (cursorUnsubscribe) {
      console.warn('Cursor subscription already active')
      return
    }

    try {
      trackListener('add')
      
      const cursorsRef = getCursorCollectionRef(canvasId)
      
      cursorUnsubscribe = onSnapshot(cursorsRef, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          const cursorData = change.doc.data()
          const userId = change.doc.id
          
          // Don't show our own cursor
          if (userId === currentUserId) return
          
          // Convert Firestore timestamp
          const cursor = {
            ...cursorData,
            timestamp: cursorData.timestamp?.toMillis ? cursorData.timestamp.toMillis() : Date.now(),
            lastSeen: cursorData.lastSeen?.toMillis ? cursorData.lastSeen.toMillis() : Date.now()
          }

          if (change.type === 'added' || change.type === 'modified') {
            cursors.set(userId, cursor)
          }
          
          if (change.type === 'removed') {
            cursors.delete(userId)
          }
        })
      }, (error) => {
        console.error('Error in cursor subscription:', error)
        trackListener('remove')
      })
      
      // Set up periodic cleanup of stale cursors
      const cleanupInterval = setInterval(cleanupStaleCursors, 10000) // Every 10 seconds
      
      console.log('Cursor subscription started')
      
      // Return wrapped unsubscribe that tracks listener removal
      return () => {
        if (cursorUnsubscribe) {
          cursorUnsubscribe()
          cursorUnsubscribe = null
          trackListener('remove')
        }
        clearInterval(cleanupInterval)
      }
    } catch (error) {
      console.error('Error subscribing to cursors:', error)
      throw error
    }
  }

  // Remove cursor when user leaves
  const removeCursor = async (canvasId = 'default', userId) => {
    if (!userId) return
    
    try {
      // Remove from local state immediately
      cursors.delete(userId)
      
      // Remove from Firestore
      const docRef = getCursorDocRef(canvasId, userId)
      await deleteDoc(docRef)
      console.log(`Cursor removed for user: ${userId}`)
    } catch (error) {
      console.error('Error removing cursor:', error)
    }
  }

  // Clean up stale cursors (older than 30 seconds)
  const cleanupStaleCursors = () => {
    const now = Date.now()
    const STALE_THRESHOLD = 30000 // 30 seconds
    
    for (const [userId, cursor] of cursors.entries()) {
      if (cursor.lastSeen && (now - cursor.lastSeen > STALE_THRESHOLD)) {
        console.log(`Removing stale cursor for user: ${userId}`)
        cursors.delete(userId)
      }
    }
  }

  // Start cursor tracking
  const startCursorTracking = () => {
    isTracking.value = true
  }

  // Stop cursor tracking
  const stopCursorTracking = () => {
    isTracking.value = false
  }

  // Clean up subscriptions
  const cleanup = async (canvasId = 'default', userId) => {
    if (cursorUnsubscribe) {
      cursorUnsubscribe()
      cursorUnsubscribe = null
    }
    
    if (updateTimeout) {
      clearTimeout(updateTimeout)
      updateTimeout = null
    }
    
    // Remove our cursor from Firestore
    if (userId) {
      await removeCursor(canvasId, userId)
    }
    
    // Clear local cursors
    cursors.clear()
    
    console.log('Cursor tracking cleaned up')
  }

  // Convert screen coordinates to canvas coordinates
  const screenToCanvas = (screenX, screenY, stageAttrs) => {
    if (!stageAttrs) return { x: screenX, y: screenY }
    
    const canvasX = (screenX - (stageAttrs.x || 0)) / (stageAttrs.scaleX || 1)
    const canvasY = (screenY - (stageAttrs.y || 0)) / (stageAttrs.scaleY || 1)
    
    return { x: canvasX, y: canvasY }
  }

  // Convert canvas coordinates to screen coordinates
  const canvasToScreen = (canvasX, canvasY, stageAttrs) => {
    if (!stageAttrs) return { x: canvasX, y: canvasY }
    
    const screenX = canvasX * (stageAttrs.scaleX || 1) + (stageAttrs.x || 0)
    const screenY = canvasY * (stageAttrs.scaleY || 1) + (stageAttrs.y || 0)
    
    return { x: screenX, y: screenY }
  }

  // Get all cursors as array
  const getAllCursors = () => {
    return Array.from(cursors.values())
  }

  // Auto-cleanup on component unmount
  onUnmounted(() => {
    cleanup()
  })

  return {
    // State
    cursors,
    isTracking,
    
    // Methods
    updateCursorPosition,
    subscribeToCursors,
    removeCursor,
    cleanupStaleCursors,
    startCursorTracking,
    stopCursorTracking,
    cleanup,
    screenToCanvas,
    canvasToScreen,
    getAllCursors
  }
}
