/**
 * Firebase Realtime Database Configuration
 * 
 * This module provides helper functions and references for interacting with
 * Firebase Realtime Database, used for ultra-low-latency real-time collaboration.
 * 
 * Architecture:
 * - Cursors: Real-time cursor positions (<50ms sync)
 * - Presence: User online/offline status
 * - Operation Log: Sequence of operations for OT
 * - Ephemeral Shapes: Rapid shape updates during editing
 * - Active Edits: Edit locking to prevent conflicts
 */

import { realtimeDB } from './config.js'
import { ref, onValue, set, update, remove, onDisconnect, serverTimestamp } from 'firebase/database'

/**
 * Get reference to cursor data for a specific canvas
 * @param {string} canvasId - Canvas ID
 * @param {string} userId - User ID (optional, returns specific user cursor if provided)
 * @returns {DatabaseReference} Reference to cursors path
 */
export function getCursorRef(canvasId, userId = null) {
  if (userId) {
    return ref(realtimeDB, `canvases/${canvasId}/cursors/${userId}`)
  }
  return ref(realtimeDB, `canvases/${canvasId}/cursors`)
}

/**
 * Get reference to presence data for a specific canvas
 * @param {string} canvasId - Canvas ID
 * @param {string} userId - User ID (optional, returns specific user presence if provided)
 * @returns {DatabaseReference} Reference to presence path
 */
export function getPresenceRef(canvasId, userId = null) {
  if (userId) {
    return ref(realtimeDB, `canvases/${canvasId}/presence/${userId}`)
  }
  return ref(realtimeDB, `canvases/${canvasId}/presence`)
}

/**
 * Get reference to operation log for a specific canvas
 * @param {string} canvasId - Canvas ID
 * @param {string} operationId - Operation ID (optional, returns specific operation if provided)
 * @returns {DatabaseReference} Reference to operation log path
 */
export function getOperationLogRef(canvasId, operationId = null) {
  if (operationId) {
    return ref(realtimeDB, `canvases/${canvasId}/operationLog/${operationId}`)
  }
  return ref(realtimeDB, `canvases/${canvasId}/operationLog`)
}

/**
 * Get reference to ephemeral shapes for a specific canvas
 * @param {string} canvasId - Canvas ID
 * @param {string} shapeId - Shape ID (optional, returns specific shape if provided)
 * @returns {DatabaseReference} Reference to ephemeral shapes path
 */
export function getEphemeralShapesRef(canvasId, shapeId = null) {
  if (shapeId) {
    return ref(realtimeDB, `canvases/${canvasId}/ephemeralShapes/${shapeId}`)
  }
  return ref(realtimeDB, `canvases/${canvasId}/ephemeralShapes`)
}

/**
 * Get reference to active edits for a specific canvas
 * @param {string} canvasId - Canvas ID
 * @param {string} shapeId - Shape ID (optional, returns specific edit lock if provided)
 * @returns {DatabaseReference} Reference to active edits path
 */
export function getActiveEditsRef(canvasId, shapeId = null) {
  if (shapeId) {
    return ref(realtimeDB, `canvases/${canvasId}/activeEdits/${shapeId}`)
  }
  return ref(realtimeDB, `canvases/${canvasId}/activeEdits`)
}

/**
 * Get reference to canvas metadata
 * @param {string} canvasId - Canvas ID
 * @returns {DatabaseReference} Reference to canvas metadata path
 */
export function getCanvasMetadataRef(canvasId) {
  return ref(realtimeDB, `canvases/${canvasId}/metadata`)
}

/**
 * Set up automatic cleanup on disconnect for a reference
 * @param {DatabaseReference} dbRef - Database reference to clean up
 * @returns {OnDisconnect} OnDisconnect handler
 */
export function setupDisconnectCleanup(dbRef) {
  return onDisconnect(dbRef)
}

/**
 * Update cursor position in Realtime DB
 * @param {string} canvasId - Canvas ID
 * @param {string} userId - User ID
 * @param {Object} cursorData - Cursor data { x, y, userName, timestamp }
 * @returns {Promise<void>}
 */
export async function updateCursorPosition(canvasId, userId, cursorData) {
  const cursorRef = getCursorRef(canvasId, userId)
  await set(cursorRef, {
    ...cursorData,
    timestamp: serverTimestamp()
  })
}

/**
 * Set user presence (online/offline)
 * @param {string} canvasId - Canvas ID
 * @param {string} userId - User ID
 * @param {Object} presenceData - Presence data { userId, userName, cursorColor, online }
 * @returns {Promise<void>}
 */
export async function setUserPresence(canvasId, userId, presenceData) {
  const presenceRef = getPresenceRef(canvasId, userId)
  await set(presenceRef, {
    ...presenceData,
    lastSeen: serverTimestamp()
  })
  
  // Auto-cleanup on disconnect
  const disconnectHandler = setupDisconnectCleanup(presenceRef)
  await disconnectHandler.remove()
}

/**
 * Remove user presence
 * @param {string} canvasId - Canvas ID
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export async function removeUserPresence(canvasId, userId) {
  const presenceRef = getPresenceRef(canvasId, userId)
  await remove(presenceRef)
}

/**
 * Subscribe to cursor updates for a canvas
 * @param {string} canvasId - Canvas ID
 * @param {Function} callback - Callback function to handle cursor updates
 * @returns {Function} Unsubscribe function
 */
export function subscribeToCursors(canvasId, callback) {
  const cursorsRef = getCursorRef(canvasId)
  const unsubscribe = onValue(cursorsRef, (snapshot) => {
    const cursors = snapshot.val() || {}
    callback(cursors)
  })
  return unsubscribe
}

/**
 * Subscribe to presence updates for a canvas
 * @param {string} canvasId - Canvas ID
 * @param {Function} callback - Callback function to handle presence updates
 * @returns {Function} Unsubscribe function
 */
export function subscribeToPresence(canvasId, callback) {
  const presenceRef = getPresenceRef(canvasId)
  const unsubscribe = onValue(presenceRef, (snapshot) => {
    const presence = snapshot.val() || {}
    callback(presence)
  })
  return unsubscribe
}

/**
 * Subscribe to operation log updates for a canvas
 * @param {string} canvasId - Canvas ID
 * @param {Function} callback - Callback function to handle operation updates
 * @returns {Function} Unsubscribe function
 */
export function subscribeToOperationLog(canvasId, callback) {
  const operationLogRef = getOperationLogRef(canvasId)
  const unsubscribe = onValue(operationLogRef, (snapshot) => {
    const operations = snapshot.val() || {}
    callback(operations)
  })
  return unsubscribe
}

/**
 * Write an operation to the operation log
 * @param {string} canvasId - Canvas ID
 * @param {string} operationId - Unique operation ID
 * @param {Object} operation - Operation data
 * @returns {Promise<void>}
 */
export async function writeOperation(canvasId, operationId, operation) {
  const operationRef = getOperationLogRef(canvasId, operationId)
  await set(operationRef, {
    ...operation,
    timestamp: serverTimestamp()
  })
}

/**
 * Update ephemeral shape data
 * @param {string} canvasId - Canvas ID
 * @param {string} shapeId - Shape ID
 * @param {Object} shapeData - Shape data (delta or full)
 * @returns {Promise<void>}
 */
export async function updateEphemeralShape(canvasId, shapeId, shapeData) {
  const shapeRef = getEphemeralShapesRef(canvasId, shapeId)
  await set(shapeRef, {
    ...shapeData,
    lastModified: serverTimestamp()
  })
}

/**
 * Remove ephemeral shape data
 * @param {string} canvasId - Canvas ID
 * @param {string} shapeId - Shape ID
 * @returns {Promise<void>}
 */
export async function removeEphemeralShape(canvasId, shapeId) {
  const shapeRef = getEphemeralShapesRef(canvasId, shapeId)
  await remove(shapeRef)
}

/**
 * Acquire edit lock for a shape
 * @param {string} canvasId - Canvas ID
 * @param {string} shapeId - Shape ID
 * @param {string} userId - User ID acquiring the lock
 * @returns {Promise<void>}
 */
export async function acquireEditLock(canvasId, shapeId, userId) {
  const editLockRef = getActiveEditsRef(canvasId, shapeId)
  await set(editLockRef, {
    userId,
    acquiredAt: serverTimestamp()
  })
  
  // Auto-release lock on disconnect
  const disconnectHandler = setupDisconnectCleanup(editLockRef)
  await disconnectHandler.remove()
}

/**
 * Release edit lock for a shape
 * @param {string} canvasId - Canvas ID
 * @param {string} shapeId - Shape ID
 * @returns {Promise<void>}
 */
export async function releaseEditLock(canvasId, shapeId) {
  const editLockRef = getActiveEditsRef(canvasId, shapeId)
  await remove(editLockRef)
}

/**
 * Get server timestamp
 * @returns {Object} Server timestamp object
 */
export function getServerTimestamp() {
  return serverTimestamp()
}

// Export the database instance
export { realtimeDB }

