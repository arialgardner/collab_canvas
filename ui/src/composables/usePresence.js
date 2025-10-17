import { ref, reactive, onUnmounted } from 'vue'
import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot,
  serverTimestamp,
  deleteDoc,
  updateDoc
} from 'firebase/firestore'
import { db } from '../firebase/config'

// Shared state across all components
const activeUsers = reactive(new Map())
const activeUsersVersion = ref(0) // Increment to force reactivity updates
const isOnline = ref(false)
let presenceUnsubscribe = null
let heartbeatInterval = null
let cleanupInterval = null
let beforeUnloadHandler = null

export const usePresence = () => {

  // Get presence collection reference
  const getPresenceCollectionRef = (canvasId = 'default') => {
    return collection(db, 'presence', canvasId, 'users')
  }

  // Get presence document reference
  const getPresenceDocRef = (canvasId, userId) => {
    return doc(db, 'presence', canvasId, 'users', userId)
  }

  // Set user online
  const setUserOnline = async (canvasId = 'default', userId, userName, cursorColor) => {
    if (!userId) return

    try {
      const presenceData = {
        userId,
        userName,
        cursorColor,
        online: true,
        lastSeen: serverTimestamp(),
        canvasId,
        joinedAt: serverTimestamp()
      }
      
      const docRef = getPresenceDocRef(canvasId, userId)
      await setDoc(docRef, presenceData)
      
      isOnline.value = true
      // console.log(`User ${userName} set online`)
      
      // Start heartbeat to keep presence alive
      startHeartbeat(canvasId, userId)
      
      // Setup beforeunload handler for browser close
      setupBeforeUnloadHandler(canvasId, userId)
      
    } catch (error) {
      console.error('Error setting user online:', error)
      throw error
    }
  }

  // Set user offline
  const setUserOffline = async (canvasId = 'default', userId) => {
    if (!userId) return

    try {
      // Stop heartbeat first
      stopHeartbeat()
      
      // Remove presence document
      const docRef = getPresenceDocRef(canvasId, userId)
      await deleteDoc(docRef)
      
      isOnline.value = false
      // console.log(`User ${userId} set offline`)
      
    } catch (error) {
      console.error('Error setting user offline:', error)
    }
  }

  // Update last seen timestamp (heartbeat)
  const updateLastSeen = async (canvasId = 'default', userId) => {
    if (!userId) return

    try {
      const docRef = getPresenceDocRef(canvasId, userId)
      await updateDoc(docRef, {
        lastSeen: serverTimestamp(),
        online: true
      })
    } catch (error) {
      // Silently fail heartbeat updates to avoid spam
      console.warn('Heartbeat update failed:', error)
    }
  }

  // Start heartbeat to maintain presence
  const startHeartbeat = (canvasId, userId) => {
    // Clear any existing heartbeat
    stopHeartbeat()
    
    // Update presence every 30 seconds
    heartbeatInterval = setInterval(() => {
      updateLastSeen(canvasId, userId)
    }, 30000) // 30 seconds
  }

  // Stop heartbeat
  const stopHeartbeat = () => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval)
      heartbeatInterval = null
    }
  }

  // Clean up stale presence entries (users who haven't sent heartbeat in 60+ seconds)
  const cleanupStalePresence = () => {
    const now = Date.now()
    const STALE_THRESHOLD = 60000 // 60 seconds (2x heartbeat interval)
    let hasChanges = false
    
    for (const [userId, presence] of activeUsers.entries()) {
      if (presence.lastSeen && (now - presence.lastSeen > STALE_THRESHOLD)) {
        // console.log(`Removing stale presence for user: ${presence.userName || userId}`)
        activeUsers.delete(userId)
        hasChanges = true
      }
    }
    
    // Force reactivity update if changes occurred
    if (hasChanges) {
      activeUsersVersion.value++
    }
  }

  // Start periodic cleanup of stale presence
  const startPresenceCleanup = () => {
    // Clear any existing cleanup interval
    stopPresenceCleanup()
    
    // Check for stale presence every 30 seconds
    cleanupInterval = setInterval(cleanupStalePresence, 30000)
    // console.log('Started periodic presence cleanup')
  }

  // Stop periodic cleanup
  const stopPresenceCleanup = () => {
    if (cleanupInterval) {
      clearInterval(cleanupInterval)
      cleanupInterval = null
    }
  }

  // Subscribe to presence updates
  const subscribeToPresence = (canvasId = 'default', currentUserId) => {
    // If there's an existing subscription, unsubscribe first
    if (presenceUnsubscribe) {
      // console.log('Unsubscribing from previous presence subscription')
      presenceUnsubscribe()
      presenceUnsubscribe = null
      // Note: Don't clear activeUsers here - let the new subscription update it
      // This prevents UI flicker when reconnecting
    }

    try {
      const presenceRef = getPresenceCollectionRef(canvasId)
      
      presenceUnsubscribe = onSnapshot(presenceRef, (snapshot) => {
        // Batch process changes to prevent UI thrashing
        const usersToAdd = []
        const usersToRemove = []
        
        snapshot.docChanges().forEach((change) => {
          const presenceData = change.doc.data()
          const userId = change.doc.id
          
          // Don't include current user in active users list
          if (userId === currentUserId) return
          
          // Only process users for this specific canvas
          if (presenceData.canvasId !== canvasId) return
          
          // Convert Firestore timestamps
          const presence = {
            ...presenceData,
            lastSeen: presenceData.lastSeen?.toMillis ? presenceData.lastSeen.toMillis() : Date.now(),
            joinedAt: presenceData.joinedAt?.toMillis ? presenceData.joinedAt.toMillis() : Date.now()
          }

          if (change.type === 'added' || change.type === 'modified') {
            // Only add users who are marked as online
            if (presence.online) {
              usersToAdd.push({ userId, presence })
            } else {
              // User marked as offline, remove them
              usersToRemove.push(userId)
            }
          }
          
          if (change.type === 'removed') {
            usersToRemove.push(userId)
          }
        })
        
        // Track if any changes were made
        let hasChanges = false
        
        // Apply batch updates
        usersToRemove.forEach(userId => {
          const user = activeUsers.get(userId)
          activeUsers.delete(userId)
          hasChanges = true
          // console.log(`👋 User ${user?.userName || userId} left canvas (total: ${activeUsers.size})`)
        })
        
        usersToAdd.forEach(({ userId, presence }) => {
          const isNew = !activeUsers.has(userId)
          activeUsers.set(userId, presence)
          if (isNew) {
            hasChanges = true
            // console.log(`✅ User ${presence.userName} joined canvas ${canvasId} (total: ${activeUsers.size})`)
          }
        })
        
        // Force reactivity update if changes occurred
        if (hasChanges) {
          activeUsersVersion.value++
        }
        
        // console.log(`📊 Presence updated: ${activeUsers.size} users online`)
      })
      
      // Start periodic cleanup of stale presence
      startPresenceCleanup()
      
      // console.log(`Presence subscription started for canvas: ${canvasId}`)
      return presenceUnsubscribe
      
    } catch (error) {
      console.error('Error subscribing to presence:', error)
      throw error
    }
  }

  // Get all active users as array
  const getActiveUsers = () => {
    return Array.from(activeUsers.values())
  }

  // Get active user count
  const getActiveUserCount = () => {
    return activeUsers.size
  }

  // Check if specific user is online
  const isUserOnline = (userId) => {
    return activeUsers.has(userId)
  }

  // Setup beforeunload handler to cleanup on browser close
  const setupBeforeUnloadHandler = (canvasId, userId) => {
    // Remove existing handler if any
    if (beforeUnloadHandler) {
      window.removeEventListener('beforeunload', beforeUnloadHandler)
    }
    
    // Create new handler
    beforeUnloadHandler = () => {
      if (userId) {
        // Use synchronous approach with navigator.sendBeacon for more reliability
        const docRef = getPresenceDocRef(canvasId, userId)
        const deleteUrl = `https://firestore.googleapis.com/v1/${docRef.path}`
        
        try {
          // Try to delete the presence document
          setUserOffline(canvasId, userId).catch(() => {})
        } catch (error) {
          // Ignore errors during unload
        }
      }
    }
    
    // Add the event listener
    window.addEventListener('beforeunload', beforeUnloadHandler)
    // console.log('Setup beforeunload handler for presence cleanup')
  }

  // Remove beforeunload handler
  const removeBeforeUnloadHandler = () => {
    if (beforeUnloadHandler) {
      window.removeEventListener('beforeunload', beforeUnloadHandler)
      beforeUnloadHandler = null
    }
  }

  // Cleanup all presence tracking
  const cleanup = async (canvasId = 'default', userId) => {
    // Stop heartbeat
    stopHeartbeat()
    
    // Stop presence cleanup
    stopPresenceCleanup()
    
    // Remove beforeunload handler
    removeBeforeUnloadHandler()
    
    // Unsubscribe from presence updates
    if (presenceUnsubscribe) {
      presenceUnsubscribe()
      presenceUnsubscribe = null
    }
    
    // Set user offline
    if (userId) {
      await setUserOffline(canvasId, userId)
    }
    
    // Clear local state
    activeUsers.clear()
    activeUsersVersion.value++ // Trigger reactivity update
    isOnline.value = false
    
    // console.log('Presence tracking cleaned up')
  }

  // Auto-cleanup on component unmount
  onUnmounted(() => {
    cleanup()
  })

  return {
    // State
    activeUsers,
    activeUsersVersion, // Export version for reactivity tracking
    isOnline,
    
    // Methods
    setUserOnline,
    setUserOffline,
    subscribeToPresence,
    getActiveUsers,
    getActiveUserCount,
    isUserOnline,
    updateLastSeen,
    cleanupStalePresence,
    setupBeforeUnloadHandler,
    removeBeforeUnloadHandler,
    cleanup
  }
}
