/**
 * Realtime Database Presence Composable
 * 
 * Fast presence tracking using Firebase Realtime Database.
 * Features automatic disconnect detection and heartbeat system.
 * 
 * Features:
 * - Heartbeat every 30 seconds to update lastSeen
 * - Automatic cleanup on disconnect via onDisconnect()
 * - Stale presence detection (> 60 seconds)
 * - beforeunload handler for graceful cleanup
 */

import { ref, reactive, onUnmounted } from 'vue'
import { 
  ref as dbRef, 
  set, 
  update,
  onValue, 
  remove, 
  onDisconnect,
  serverTimestamp as rtdbServerTimestamp
} from 'firebase/database'
import { realtimeDB } from '../firebase/realtimeDB.js'
import { rtdbMonitoring } from './useRealtimeDBMonitoring.js'

// Shared state across all components
const activeUsers = reactive(new Map())
const activeUsersVersion = ref(0) // Increment to force reactivity updates
const isOnline = ref(false)
let presenceUnsubscribe = null
let heartbeatInterval = null
let cleanupInterval = null
let beforeUnloadHandler = null
const disconnectHandlers = new Map() // Store per-user disconnect handlers

export const usePresenceRTDB = () => {

  // Get presence reference for a user
  const getPresenceRef = (canvasId, userId) => {
    return dbRef(realtimeDB, `canvases/${canvasId}/presence/${userId}`)
  }

  // Get all presence reference
  const getAllPresenceRef = (canvasId) => {
    return dbRef(realtimeDB, `canvases/${canvasId}/presence`)
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
        lastSeen: rtdbServerTimestamp(),
        canvasId,
        joinedAt: rtdbServerTimestamp()
      }
      
      const presenceRef = getPresenceRef(canvasId, userId)
      await set(presenceRef, presenceData)
      
      // Always set up automatic removal on disconnect (re-establish if reconnecting)
      // Cancel any existing handler for this user first
      const existingHandler = disconnectHandlers.get(userId)
      if (existingHandler) {
        try {
          await existingHandler.cancel()
        } catch (e) {
          // Ignore errors when canceling
        }
      }
      
      // Set up new disconnect handler for this specific user
      const newDisconnectHandler = onDisconnect(presenceRef)
      await newDisconnectHandler.remove()
      disconnectHandlers.set(userId, newDisconnectHandler)
      
      isOnline.value = true
      console.log(`✅ User ${userName} set online (RTDB) - Disconnect handler registered`)
      
      // Start heartbeat to keep presence alive
      startHeartbeat(canvasId, userId)
      
      // Setup beforeunload handler for browser close
      setupBeforeUnloadHandler(canvasId, userId)
      
    } catch (error) {
      console.error('Error setting user online (RTDB):', error)
      rtdbMonitoring.recordError('presence-online', error)
      throw error
    }
  }

  // Set user offline
  const setUserOffline = async (canvasId = 'default', userId) => {
    if (!userId) return

    try {
      // Stop heartbeat first
      stopHeartbeat()
      
      // Remove presence entry
      const presenceRef = getPresenceRef(canvasId, userId)
      await remove(presenceRef)
      
      // Cancel and remove disconnect handler for this user
      const existingHandler = disconnectHandlers.get(userId)
      if (existingHandler) {
        try {
          await existingHandler.cancel()
        } catch (e) {
          // Ignore errors when canceling
        }
        disconnectHandlers.delete(userId)
      }
      
      isOnline.value = false
      console.log(`👋 User ${userId} set offline (RTDB) - Disconnect handler removed`)
      
    } catch (error) {
      console.error('Error setting user offline (RTDB):', error)
      rtdbMonitoring.recordError('presence-offline', error)
    }
  }

  // Update last seen timestamp (heartbeat)
  const updateLastSeen = async (canvasId = 'default', userId) => {
    if (!userId) return

    try {
      const presenceRef = getPresenceRef(canvasId, userId)
      // Use partial update to preserve required fields per security rules
      await update(presenceRef, {
        online: true,
        lastSeen: rtdbServerTimestamp()
      })
    } catch (error) {
      // Silently fail heartbeat updates to avoid spam
      console.warn('Heartbeat update failed (RTDB):', error)
      rtdbMonitoring.recordError('presence-heartbeat', error)
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
    
    // console.log('Started presence heartbeat (RTDB)')
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
    let removedCount = 0
    
    for (const [userId, presence] of activeUsers.entries()) {
      if (presence.lastSeen && (now - presence.lastSeen > STALE_THRESHOLD)) {
        console.log(`🧹 Removing stale presence (RTDB) for user: ${presence.userName || userId} (last seen: ${Math.round((now - presence.lastSeen) / 1000)}s ago)`)
        activeUsers.delete(userId)
        hasChanges = true
        removedCount++
      }
    }
    
    // Force reactivity update if changes occurred
    if (hasChanges) {
      activeUsersVersion.value++
      console.log(`🧹 Cleaned up ${removedCount} stale presence entries. ${activeUsers.size} users remaining`)
    }
  }

  // Start periodic cleanup of stale presence
  const startPresenceCleanup = () => {
    // Clear any existing cleanup interval
    stopPresenceCleanup()
    
    // Check for stale presence every 30 seconds
    cleanupInterval = setInterval(cleanupStalePresence, 30000)
    // console.log('Started periodic presence cleanup (RTDB)')
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
      // console.log('Unsubscribing from previous presence subscription (RTDB)')
      presenceUnsubscribe()
      presenceUnsubscribe = null
      // Note: Don't clear activeUsers here - let the new subscription update it
      // This prevents UI flicker when reconnecting
    }

    try {
      const presenceRef = getAllPresenceRef(canvasId)
      
      presenceUnsubscribe = onValue(presenceRef, (snapshot) => {
        const presenceData = snapshot.val() || {}
        
        // Track received data size
        const dataSize = JSON.stringify(presenceData).length
        rtdbMonitoring.recordBytesReceived(dataSize)
        
        // Get current user IDs from server
        const serverUserIds = new Set(Object.keys(presenceData))
        
        // Remove users that no longer exist on the server
        // This handles multiple users going offline simultaneously
        const usersToRemove = []
        for (const userId of activeUsers.keys()) {
          if (!serverUserIds.has(userId)) {
            usersToRemove.push(userId)
          }
        }
        
        // Track if any changes were made
        let hasChanges = false
        
        // Batch remove users to prevent UI thrashing
        for (const userId of usersToRemove) {
          const user = activeUsers.get(userId)
          activeUsers.delete(userId)
          hasChanges = true
          console.log(`👋 User ${user?.userName || userId} left canvas (RTDB) (total: ${activeUsers.size})`)
        }
        
        // Add/update users from server data
        for (const [userId, presence] of Object.entries(presenceData)) {
          // Don't include current user in active users list
          if (userId === currentUserId) continue
          
          // Only process users for this specific canvas
          if (presence.canvasId !== canvasId) continue
          
          // Convert timestamp if needed
          const presenceObj = {
            ...presence,
            lastSeen: presence.lastSeen || Date.now(),
            joinedAt: presence.joinedAt || Date.now()
          }
          
          // Only add users who are marked as online
          if (presenceObj.online) {
            const isNew = !activeUsers.has(userId)
            activeUsers.set(userId, presenceObj)
            if (isNew) {
              hasChanges = true
              console.log(`✅ User ${presenceObj.userName} joined canvas ${canvasId} (RTDB) (total: ${activeUsers.size})`)
            }
          } else {
            // User marked as offline, remove them
            if (activeUsers.has(userId)) {
              activeUsers.delete(userId)
              hasChanges = true
              console.log(`⚠️ User ${presenceObj.userName} marked offline (RTDB), removing (total: ${activeUsers.size})`)
            }
          }
        }
        
        // Force reactivity update if changes occurred
        if (hasChanges) {
          activeUsersVersion.value++
          console.log(`📊 Presence updated: ${activeUsers.size} users online on canvas ${canvasId}`)
        }
      }, (error) => {
        console.error('Error in presence subscription (RTDB):', error)
        rtdbMonitoring.recordError('presence-subscription', error)
      })
      
      // Start periodic cleanup of stale presence
      startPresenceCleanup()
      
      // console.log(`Presence subscription started (RTDB) for canvas: ${canvasId}`)
      
      return () => {
        if (presenceUnsubscribe) {
          presenceUnsubscribe()
          presenceUnsubscribe = null
        }
        stopPresenceCleanup()
      }
      
    } catch (error) {
      console.error('Error subscribing to presence (RTDB):', error)
      rtdbMonitoring.recordError('presence-subscribe', error)
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
        try {
          // Best effort - onDisconnect will handle this if this fails
          setUserOffline(canvasId, userId).catch(() => {})
        } catch (error) {
          // Ignore errors during unload
        }
      }
    }
    
    // Add the event listener
    window.addEventListener('beforeunload', beforeUnloadHandler)
    // console.log('Setup beforeunload handler for presence cleanup (RTDB)')
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
    
    // Set user offline (this will also clean up the disconnect handler)
    if (userId) {
      await setUserOffline(canvasId, userId)
    }
    
    // Clear local state
    activeUsers.clear()
    activeUsersVersion.value++ // Trigger reactivity update
    isOnline.value = false
    
    // Clear all disconnect handlers
    disconnectHandlers.clear()
    
    // console.log('Presence tracking cleaned up (RTDB)')
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

