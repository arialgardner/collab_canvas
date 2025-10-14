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

export const usePresence = () => {
  // Store active users (excluding current user)
  const activeUsers = reactive(new Map())
  const isOnline = ref(false)
  
  let presenceUnsubscribe = null
  let heartbeatInterval = null

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
      console.log(`User ${userName} set online`)
      
      // Start heartbeat to keep presence alive
      startHeartbeat(canvasId, userId)
      
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
      console.log(`User ${userId} set offline`)
      
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

  // Subscribe to presence updates
  const subscribeToPresence = (canvasId = 'default', currentUserId) => {
    if (presenceUnsubscribe) {
      console.warn('Presence subscription already active')
      return presenceUnsubscribe
    }

    try {
      const presenceRef = getPresenceCollectionRef(canvasId)
      
      presenceUnsubscribe = onSnapshot(presenceRef, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          const presenceData = change.doc.data()
          const userId = change.doc.id
          
          // Don't include current user in active users list
          if (userId === currentUserId) return
          
          // Convert Firestore timestamps
          const presence = {
            ...presenceData,
            lastSeen: presenceData.lastSeen?.toMillis ? presenceData.lastSeen.toMillis() : Date.now(),
            joinedAt: presenceData.joinedAt?.toMillis ? presenceData.joinedAt.toMillis() : Date.now()
          }

          if (change.type === 'added' || change.type === 'modified') {
            // Only add users who are marked as online
            if (presence.online) {
              activeUsers.set(userId, presence)
              console.log(`User ${presence.userName} joined`)
            }
          }
          
          if (change.type === 'removed') {
            activeUsers.delete(userId)
            console.log(`User ${presenceData.userName || userId} left`)
          }
        })
      })
      
      console.log('Presence subscription started')
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

  // Handle browser close/refresh
  const handleBeforeUnload = (canvasId, userId) => {
    // Try to set offline before page unload
    // Note: This is best effort, may not always execute
    if (userId) {
      navigator.sendBeacon('/api/offline', JSON.stringify({ canvasId, userId }))
      // Also try direct call
      setUserOffline(canvasId, userId).catch(() => {
        // Ignore errors during unload
      })
    }
  }

  // Cleanup all presence tracking
  const cleanup = async (canvasId = 'default', userId) => {
    // Stop heartbeat
    stopHeartbeat()
    
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
    isOnline.value = false
    
    console.log('Presence tracking cleaned up')
  }

  // Auto-cleanup on component unmount
  onUnmounted(() => {
    cleanup()
  })

  return {
    // State
    activeUsers,
    isOnline,
    
    // Methods
    setUserOnline,
    setUserOffline,
    subscribeToPresence,
    getActiveUsers,
    getActiveUserCount,
    isUserOnline,
    updateLastSeen,
    handleBeforeUnload,
    cleanup
  }
}
