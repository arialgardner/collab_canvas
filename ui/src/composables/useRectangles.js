import { ref, reactive } from 'vue'
import { 
  generateId, 
  generateRandomColor, 
  DEFAULT_RECT_SIZE, 
  constrainToBounds 
} from '../types/shapes'
import { useFirestore } from './useFirestore'

export const useRectangles = () => {
  // Firestore integration
  const { saveRectangle, updateRectanglePosition, loadRectangles, subscribeToRectangles } = useFirestore()
  
  // Store rectangles in a reactive Map for O(1) lookups
  const rectangles = reactive(new Map())
  const isLoading = ref(false)
  const error = ref(null)
  const isConnected = ref(true)
  const isSyncing = ref(false)
  
  // Real-time listener management
  let realtimeUnsubscribe = null

  // Create a new rectangle at specified position
  const createRectangle = async (x, y, userId = 'anonymous', canvasId = 'default') => {
    try {
      // Constrain position within canvas bounds
      const constrainedPos = constrainToBounds(x, y)
      
      const rectangle = {
        id: generateId(),
        x: constrainedPos.x,
        y: constrainedPos.y,
        width: DEFAULT_RECT_SIZE.width,
        height: DEFAULT_RECT_SIZE.height,
        fill: generateRandomColor(),
        createdBy: userId,
        createdAt: Date.now(),
        lastModified: Date.now(),
        lastModifiedBy: userId
      }

      // Add to local state immediately (optimistic update)
      rectangles.set(rectangle.id, rectangle)

      // Save to Firestore
      await saveRectangle(canvasId, rectangle)
      
      return rectangle
    } catch (err) {
      console.error('Error creating rectangle:', err)
      error.value = err.message
      throw err
    }
  }

  // Update rectangle properties
  const updateRectangle = async (id, updates, userId = 'anonymous', canvasId = 'default', saveToFirestore = false) => {
    const rectangle = rectangles.get(id)
    if (!rectangle) {
      console.warn(`Rectangle with id ${id} not found`)
      return null
    }

    // If updating position, constrain to bounds
    if (updates.x !== undefined || updates.y !== undefined) {
      const newX = updates.x !== undefined ? updates.x : rectangle.x
      const newY = updates.y !== undefined ? updates.y : rectangle.y
      const constrainedPos = constrainToBounds(newX, newY, rectangle.width, rectangle.height)
      updates.x = constrainedPos.x
      updates.y = constrainedPos.y
    }

    // Update rectangle with new properties
    const updatedRectangle = {
      ...rectangle,
      ...updates,
      lastModified: Date.now(),
      lastModifiedBy: userId
    }

    // Update local state immediately (optimistic update)
    rectangles.set(id, updatedRectangle)

    // Save to Firestore if requested (e.g., on drag end)
    if (saveToFirestore) {
      try {
        await updateRectanglePosition(canvasId, id, updates.x, updates.y, userId)
      } catch (err) {
        console.error('Error updating rectangle in Firestore:', err)
        error.value = err.message
      }
    }

    return updatedRectangle
  }

  // Get rectangle by ID
  const getRectangle = (id) => {
    return rectangles.get(id)
  }

  // Get all rectangles as array
  const getAllRectangles = () => {
    return Array.from(rectangles.values())
  }

  // Remove rectangle
  const removeRectangle = (id) => {
    return rectangles.delete(id)
  }

  // Clear all rectangles
  const clearRectangles = () => {
    rectangles.clear()
  }

  // Load rectangles from Firestore and populate local state
  const loadRectanglesFromFirestore = async (canvasId = 'default') => {
    try {
      isLoading.value = true
      error.value = null
      
      const firestoreRectangles = await loadRectangles(canvasId)
      
      // Clear local state and repopulate
      rectangles.clear()
      firestoreRectangles.forEach(rectangle => {
        rectangles.set(rectangle.id, rectangle)
      })
      
      console.log(`Loaded ${firestoreRectangles.length} rectangles from Firestore`)
      return firestoreRectangles
    } catch (err) {
      console.error('Error loading rectangles from Firestore:', err)
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
      
      realtimeUnsubscribe = subscribeToRectangles(canvasId, (changes, snapshot) => {
        isConnected.value = true
        
        changes.forEach((change) => {
          const rectangleData = change.doc.data()
          const rectangleId = change.doc.id
          
          // Convert Firestore timestamps
          const rectangle = {
            id: rectangleId,
            ...rectangleData,
            createdAt: rectangleData.createdAt?.toMillis ? rectangleData.createdAt.toMillis() : (rectangleData.createdAt || Date.now()),
            lastModified: rectangleData.lastModified?.toMillis ? rectangleData.lastModified.toMillis() : (rectangleData.lastModified || Date.now())
          }

          if (change.type === 'added') {
            // New rectangle from another user
            if (!rectangles.has(rectangleId)) {
              rectangles.set(rectangleId, rectangle)
              console.log(`Real-time: Rectangle ${rectangleId} added`)
            }
          }
          
          if (change.type === 'modified') {
            const localRectangle = rectangles.get(rectangleId)
            
            // Conflict resolution: Last write wins with server timestamp
            if (!localRectangle || rectangle.lastModified > localRectangle.lastModified) {
              rectangles.set(rectangleId, rectangle)
              console.log(`Real-time: Rectangle ${rectangleId} updated`)
            } else {
              console.log(`Real-time: Ignoring older update for rectangle ${rectangleId}`)
            }
          }
          
          if (change.type === 'removed') {
            // Rectangle deleted (future feature)
            if (rectangles.has(rectangleId)) {
              rectangles.delete(rectangleId)
              console.log(`Real-time: Rectangle ${rectangleId} removed`)
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

  // Get rectangle count
  const getRectangleCount = () => {
    return rectangles.size
  }

  return {
    // State
    rectangles,
    isLoading,
    error,
    isConnected,
    isSyncing,

    // Methods
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
    handleConnectionError
  }
}
