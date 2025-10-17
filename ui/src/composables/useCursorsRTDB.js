/**
 * Realtime Database Cursor Composable
 * 
 * Ultra-low-latency cursor tracking using Firebase Realtime Database.
 * Target: <50ms cursor sync (vs. 100-300ms with Firestore)
 * 
 * Features:
 * - Adaptive throttling (16ms active, 50ms idle)
 * - Cursor interpolation for smooth animation
 * - Position rounding for smaller payloads
 * - Automatic cleanup on disconnect
 * - Small movement suppression (<5px)
 */

import { ref, reactive, onUnmounted } from 'vue'
import { 
  ref as dbRef, 
  set, 
  onValue, 
  remove, 
  onDisconnect,
  serverTimestamp as rtdbServerTimestamp
} from 'firebase/database'
import { realtimeDB } from '../firebase/realtimeDB.js'
import { CursorInterpolator } from '../utils/cursorInterpolation.js'
import { rtdbMonitoring } from './useRealtimeDBMonitoring.js'

export const useCursorsRTDB = () => {
  // Store cursors for other users (not including current user)
  const cursors = reactive(new Map())
  const isTracking = ref(false)
  
  // Cursor interpolator for smooth animation
  const interpolator = new CursorInterpolator()
  
  // Throttling for cursor updates
  let lastUpdateTime = 0
  const ACTIVE_MOVE_THROTTLE = 16 // 16ms ≈ 60fps for active movement
  const IDLE_THROTTLE = 50         // 50ms when idle
  const IDLE_THRESHOLD = 1000      // 1s without movement considered idle
  const SMALL_MOVE_THRESHOLD = 5   // px; movements smaller than this are ignored
  let lastSentX = null
  let lastSentY = null
  let lastSignificantMoveTime = 0
  let updateTimeout = null
  let cursorUnsubscribe = null
  let disconnectHandlers = new Map() // userId -> onDisconnect handler

  // Get cursor reference for a user
  const getCursorRef = (canvasId, userId) => {
    return dbRef(realtimeDB, `canvases/${canvasId}/cursors/${userId}`)
  }

  // Get all cursors reference
  const getAllCursorsRef = (canvasId) => {
    return dbRef(realtimeDB, `canvases/${canvasId}/cursors`)
  }

  // Helper: choose throttle interval based on recent movement
  const getThrottleInterval = (now) => {
    const isIdle = now - lastSignificantMoveTime > IDLE_THRESHOLD
    return isIdle ? IDLE_THROTTLE : ACTIVE_MOVE_THROTTLE
  }

  // Update cursor position in Realtime DB (adaptive throttled)
  const updateCursorPosition = async (canvasId = 'default', userId, x, y, userName, cursorColor) => {
    if (!userId) return

    const now = Date.now()
    
    // Start latency measurement
    const operationId = `cursor-${userId}-${now}`
    rtdbMonitoring.recordOperationStart('cursor', operationId)
    
    // Small-movement suppression
    if (lastSentX !== null && lastSentY !== null) {
      const dx = Math.abs(Math.round(x) - lastSentX)
      const dy = Math.abs(Math.round(y) - lastSentY)
      const maxDelta = Math.max(dx, dy)
      if (maxDelta < SMALL_MOVE_THRESHOLD && now - lastUpdateTime < IDLE_THROTTLE) {
        // Ignore tiny moves if we've sent recently
        return
      }
    }

    const throttleInterval = getThrottleInterval(now)

    // Throttle updates to avoid excessive writes
    if (now - lastUpdateTime < throttleInterval) {
      // Clear previous timeout and set new one
      if (updateTimeout) {
        clearTimeout(updateTimeout)
      }
      
      updateTimeout = setTimeout(() => {
        updateCursorPosition(canvasId, userId, x, y, userName, cursorColor)
      }, throttleInterval)
      return
    }

    try {
      lastUpdateTime = now
      lastSentX = Math.round(x)
      lastSentY = Math.round(y)
      lastSignificantMoveTime = now
      
      const cursorData = {
        userId,
        userName,
        cursorColor,
        x: lastSentX, // Rounded for smaller payloads
        y: lastSentY,
        timestamp: rtdbServerTimestamp()
      }
      
      const cursorRef = getCursorRef(canvasId, userId)
      await set(cursorRef, cursorData)
      
      // Set up auto-cleanup on disconnect (if not already set)
      if (!disconnectHandlers.has(userId)) {
        const disconnectRef = onDisconnect(cursorRef)
        await disconnectRef.remove()
        disconnectHandlers.set(userId, disconnectRef)
      }
      
      // Track bandwidth
      const dataSize = JSON.stringify(cursorData).length
      rtdbMonitoring.recordBytesSent(dataSize)
      
      // Complete latency measurement
      rtdbMonitoring.recordOperationComplete(operationId)
      
    } catch (error) {
      console.error('Error updating cursor position (RTDB):', error)
      rtdbMonitoring.recordError('cursor-update', error)
    }
  }

  // Subscribe to cursor updates from other users
  const subscribeToCursors = (canvasId = 'default', currentUserId) => {
    // If there's an existing subscription, unsubscribe first
    if (cursorUnsubscribe) {
      // console.log('Unsubscribing from previous cursor subscription (RTDB)')
      cursorUnsubscribe()
      cursorUnsubscribe = null
      cursors.clear()
    }

    try {
      const cursorsRef = getAllCursorsRef(canvasId)
      
      cursorUnsubscribe = onValue(cursorsRef, (snapshot) => {
        const cursorsData = snapshot.val() || {}
        
        // Track received data size
        const dataSize = JSON.stringify(cursorsData).length
        rtdbMonitoring.recordBytesReceived(dataSize)
        
        // Update cursors map
        const currentCursorIds = new Set(Object.keys(cursorsData))
        
        // Remove cursors that no longer exist
        for (const userId of cursors.keys()) {
          if (!currentCursorIds.has(userId)) {
            cursors.delete(userId)
            interpolator.removeCursor(userId)
          }
        }
        
        // Add/update cursors
        for (const [userId, cursorData] of Object.entries(cursorsData)) {
          // Don't show our own cursor
          if (userId === currentUserId) continue
          
          // Convert timestamp if needed
          const cursor = {
            ...cursorData,
            timestamp: cursorData.timestamp || Date.now()
          }
          
          // Set interpolation target
          interpolator.setTarget(userId, cursor.x, cursor.y)
          
          // Update callback to update reactive map
          if (!interpolator.callbacks.has(userId)) {
            interpolator.onPositionUpdate(userId, (x, y) => {
              const existingCursor = cursors.get(userId)
              if (existingCursor) {
                cursors.set(userId, {
                  ...existingCursor,
                  x,
                  y
                })
              } else {
                cursors.set(userId, {
                  ...cursor,
                  x,
                  y
                })
              }
            })
          }
          
          // Initialize in map if new
          if (!cursors.has(userId)) {
            cursors.set(userId, cursor)
          }
        }
      }, (error) => {
        console.error('Error in cursor subscription (RTDB):', error)
        rtdbMonitoring.recordError('cursor-subscription', error)
      })
      
      // Set up periodic cleanup of stale cursors
      const cleanupInterval = setInterval(cleanupStaleCursors, 10000) // Every 10 seconds
      
      // console.log(`Cursor subscription started (RTDB) for canvas: ${canvasId}`)
      
      // Return wrapped unsubscribe
      return () => {
        if (cursorUnsubscribe) {
          cursorUnsubscribe()
          cursorUnsubscribe = null
        }
        clearInterval(cleanupInterval)
      }
    } catch (error) {
      console.error('Error subscribing to cursors (RTDB):', error)
      rtdbMonitoring.recordError('cursor-subscribe', error)
      throw error
    }
  }

  // Remove cursor when user leaves
  const removeCursor = async (canvasId = 'default', userId) => {
    if (!userId) return
    
    try {
      // Remove from local state immediately
      cursors.delete(userId)
      interpolator.removeCursor(userId)
      
      // Remove from Realtime DB
      const cursorRef = getCursorRef(canvasId, userId)
      await remove(cursorRef)
      
      // Clean up disconnect handler
      disconnectHandlers.delete(userId)
      
      // console.log(`Cursor removed (RTDB) for user: ${userId}`)
    } catch (error) {
      console.error('Error removing cursor (RTDB):', error)
      rtdbMonitoring.recordError('cursor-remove', error)
    }
  }

  // Clean up stale cursors (older than 30 seconds)
  const cleanupStaleCursors = () => {
    const now = Date.now()
    const STALE_THRESHOLD = 30000 // 30 seconds
    
    for (const [userId, cursor] of cursors.entries()) {
      if (cursor.timestamp && (now - cursor.timestamp > STALE_THRESHOLD)) {
        // console.log(`Removing stale cursor (RTDB) for user: ${userId}`)
        cursors.delete(userId)
        interpolator.removeCursor(userId)
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
    
    // Remove our cursor from Realtime DB
    if (userId) {
      await removeCursor(canvasId, userId)
    }
    
    // Clear local cursors and interpolator
    cursors.clear()
    interpolator.clear()
    disconnectHandlers.clear()
    
    // console.log('Cursor tracking cleaned up (RTDB)')
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

