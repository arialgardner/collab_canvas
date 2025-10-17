/**
 * Operation Log Composable
 * 
 * Manages operation log for Operational Transform.
 * Tracks all shape operations (create, update, delete) with sequence numbers.
 * 
 * Features:
 * - Append operations to log
 * - Subscribe to operation updates
 * - Track pending operations (not yet acknowledged)
 * - Operation pruning (keep last 1000 or 1 hour)
 * - Acknowledgment system
 */

import { ref, reactive, onUnmounted } from 'vue'
import { 
  ref as dbRef, 
  set, 
  onValue, 
  remove,
  query,
  orderByKey,
  limitToLast
} from 'firebase/database'
import { realtimeDB } from '../firebase/realtimeDB.js'
import { generateOperationId, parseOperationId, isLocalOperation } from '../utils/sequenceNumbers.js'
import { calculateDelta, validateDelta, getDeltaSize } from '../utils/deltaEncoding.js'
import { rtdbMonitoring } from './useRealtimeDBMonitoring.js'

// Pending operations map: operationId -> operation
const pendingOperations = reactive(new Map())

// Operation acknowledgments: operationId -> timestamp
const acknowledgedOperations = reactive(new Map())

export function useOperationLog() {
  const isSubscribed = ref(false)
  let operationUnsubscribe = null
  let ackUnsubscribe = null
  let pruneInterval = null

  /**
   * Get operation log reference for a canvas
   * @param {string} canvasId - Canvas ID
   * @param {string} operationId - Optional specific operation ID
   * @returns {DatabaseReference}
   */
  function getOperationLogRef(canvasId, operationId = null) {
    if (operationId) {
      return dbRef(realtimeDB, `canvases/${canvasId}/operationLog/${operationId}`)
    }
    return dbRef(realtimeDB, `canvases/${canvasId}/operationLog`)
  }

  /**
   * Get acknowledgment reference
   * @param {string} canvasId - Canvas ID
   * @param {string} operationId - Operation ID
   * @returns {DatabaseReference}
   */
  function getAckRef(canvasId, operationId) {
    return dbRef(realtimeDB, `canvases/${canvasId}/acks/${operationId}`)
  }

  /**
   * Create an operation object
   * @param {string} type - Operation type: 'create', 'update', 'delete'
   * @param {string} shapeId - Shape ID
   * @param {string} userId - User ID
   * @param {Object} delta - Changed fields (or full shape for create)
   * @param {Object} baseState - State before change (for rollback)
   * @returns {Object} Operation object
   */
  function createOperation(type, shapeId, userId, delta, baseState = null) {
    const operationId = generateOperationId()
    const { sequenceNumber } = parseOperationId(operationId)
    
    // For updates, calculate delta if both states provided
    let finalDelta = delta
    if (type === 'update' && baseState && delta) {
      // If delta is full state, calculate actual delta
      if (Object.keys(delta).length > 5) {
        finalDelta = calculateDelta(baseState, delta)
      }
    }
    
    return {
      operationId,
      type,
      shapeId,
      userId,
      sequenceNumber,
      timestamp: Date.now(),
      delta: finalDelta,
      baseState: type === 'update' ? baseState : null
    }
  }

  /**
   * Append an operation to the log
   * @param {string} canvasId - Canvas ID
   * @param {Object} operation - Operation object
   * @returns {Promise<void>}
   */
  async function appendOperation(canvasId, operation) {
    if (!canvasId || !operation) return

    try {
      const operationRef = getOperationLogRef(canvasId, operation.operationId)
      
      // Add to pending operations
      pendingOperations.set(operation.operationId, {
        ...operation,
        addedAt: Date.now(),
        acknowledged: false
      })
      
      // Write to Realtime DB
      await set(operationRef, operation)
      
      // Track bandwidth (with delta size)
      const dataSize = getDeltaSize(operation)
      rtdbMonitoring.recordBytesSent(dataSize)
      
      // Log size reduction for updates
      if (operation.type === 'update' && operation.baseState) {
        const fullSize = getDeltaSize({ ...operation.baseState, ...operation.delta })
        const deltaSize = getDeltaSize(operation.delta)
        const reduction = ((fullSize - deltaSize) / fullSize * 100).toFixed(1)
        // console.log(`[OperationLog] Delta reduction: ${reduction}% (${fullSize}→${deltaSize} bytes)`)
      }
      
      // console.log(`[OperationLog] Appended operation: ${operation.operationId} (${operation.type})`)
      
    } catch (error) {
      console.error('[OperationLog] Error appending operation:', error)
      rtdbMonitoring.recordError('operation-append', error)
      throw error
    }
  }

  /**
   * Subscribe to operation log updates
   * @param {string} canvasId - Canvas ID
   * @param {Function} callback - Callback function(operations)
   * @returns {Function} Unsubscribe function
   */
  function subscribeToOperations(canvasId, callback) {
    if (!canvasId || !callback) return () => {}

    try {
      const operationsRef = getOperationLogRef(canvasId)
      
      // Query last 1000 operations
      const operationsQuery = query(
        operationsRef,
        orderByKey(),
        limitToLast(1000)
      )
      
      operationUnsubscribe = onValue(operationsQuery, (snapshot) => {
        const operations = snapshot.val() || {}
        
        // Track bandwidth
        const dataSize = JSON.stringify(operations).length
        rtdbMonitoring.recordBytesReceived(dataSize)
        
        // Convert to array and sort by sequence
        const operationList = Object.values(operations).sort((a, b) => {
          return a.sequenceNumber - b.sequenceNumber
        })
        
        callback(operationList)
      }, (error) => {
        console.error('[OperationLog] Subscription error:', error)
        rtdbMonitoring.recordError('operation-subscription', error)
      })
      
      isSubscribed.value = true
      // console.log(`[OperationLog] Subscribed to operations for canvas: ${canvasId}`)
      
      return () => {
        if (operationUnsubscribe) {
          operationUnsubscribe()
          operationUnsubscribe = null
        }
        isSubscribed.value = false
      }
      
    } catch (error) {
      console.error('[OperationLog] Error subscribing to operations:', error)
      rtdbMonitoring.recordError('operation-subscribe', error)
      throw error
    }
  }

  /**
   * Acknowledge an operation (mark as successfully processed)
   * @param {string} canvasId - Canvas ID
   * @param {string} operationId - Operation ID
   * @returns {Promise<void>}
   */
  async function acknowledgeOperation(canvasId, operationId) {
    if (!canvasId || !operationId) return

    try {
      const ackRef = getAckRef(canvasId, operationId)
      await set(ackRef, {
        operationId,
        acknowledgedAt: Date.now()
      })
      
      // Remove from pending operations
      const pending = pendingOperations.get(operationId)
      if (pending) {
        pending.acknowledged = true
        acknowledgedOperations.set(operationId, Date.now())
        pendingOperations.delete(operationId)
        
        // console.log(`[OperationLog] Acknowledged operation: ${operationId}`)
      }
      
    } catch (error) {
      console.error('[OperationLog] Error acknowledging operation:', error)
      rtdbMonitoring.recordError('operation-ack', error)
    }
  }

  /**
   * Subscribe to operation acknowledgments
   * @param {string} canvasId - Canvas ID
   * @param {Function} callback - Callback function(operationId)
   * @returns {Function} Unsubscribe function
   */
  function subscribeToAcknowledgments(canvasId, callback) {
    if (!canvasId || !callback) return () => {}

    try {
      const acksRef = dbRef(realtimeDB, `canvases/${canvasId}/acks`)
      
      ackUnsubscribe = onValue(acksRef, (snapshot) => {
        const acks = snapshot.val() || {}
        
        // Process each acknowledgment
        for (const [operationId, ackData] of Object.entries(acks)) {
          // Only process if this is our operation
          if (isLocalOperation(operationId)) {
            callback(operationId, ackData)
            
            // Remove from pending
            if (pendingOperations.has(operationId)) {
              pendingOperations.delete(operationId)
              acknowledgedOperations.set(operationId, ackData.acknowledgedAt)
            }
          }
        }
      }, (error) => {
        console.error('[OperationLog] Acknowledgment subscription error:', error)
        rtdbMonitoring.recordError('ack-subscription', error)
      })
      
      // console.log(`[OperationLog] Subscribed to acknowledgments for canvas: ${canvasId}`)
      
      return () => {
        if (ackUnsubscribe) {
          ackUnsubscribe()
          ackUnsubscribe = null
        }
      }
      
    } catch (error) {
      console.error('[OperationLog] Error subscribing to acknowledgments:', error)
      rtdbMonitoring.recordError('ack-subscribe', error)
      throw error
    }
  }

  /**
   * Get pending operations (not yet acknowledged)
   * @param {string} shapeId - Optional shape ID to filter by
   * @returns {Array} Pending operations
   */
  function getPendingOperations(shapeId = null) {
    const pending = Array.from(pendingOperations.values())
    
    if (shapeId) {
      return pending.filter(op => op.shapeId === shapeId)
    }
    
    return pending
  }

  /**
   * Check for timed-out operations (>5 seconds without ack)
   * @returns {Array} Timed out operations
   */
  function getTimedOutOperations() {
    const now = Date.now()
    const TIMEOUT = 5000 // 5 seconds
    
    return Array.from(pendingOperations.values()).filter(op => {
      return now - op.addedAt > TIMEOUT
    })
  }

  /**
   * Prune old operations from the log
   * @param {string} canvasId - Canvas ID
   * @returns {Promise<void>}
   */
  async function pruneOperations(canvasId) {
    if (!canvasId) return

    try {
      const operationsRef = getOperationLogRef(canvasId)
      const snapshot = await new Promise((resolve, reject) => {
        onValue(operationsRef, resolve, { onlyOnce: true })
      })
      
      const operations = snapshot.val() || {}
      const now = Date.now()
      const ONE_HOUR = 60 * 60 * 1000
      const MAX_OPERATIONS = 1000
      
      // Convert to array and sort by timestamp
      const operationList = Object.entries(operations)
        .map(([id, op]) => ({ id, ...op }))
        .sort((a, b) => b.timestamp - a.timestamp)
      
      // Prune operations older than 1 hour OR keep only last 1000
      const operationsToPrune = operationList.filter((op, index) => {
        const isOld = now - op.timestamp > ONE_HOUR
        const isBeyondLimit = index >= MAX_OPERATIONS
        return isOld || isBeyondLimit
      })
      
      // Delete pruned operations
      for (const op of operationsToPrune) {
        const opRef = getOperationLogRef(canvasId, op.id)
        await remove(opRef)
      }
      
      if (operationsToPrune.length > 0) {
        // console.log(`[OperationLog] Pruned ${operationsToPrune.length} operations`)
      }
      
    } catch (error) {
      console.error('[OperationLog] Error pruning operations:', error)
      rtdbMonitoring.recordError('operation-prune', error)
    }
  }

  /**
   * Start automatic pruning (every 5 minutes)
   * @param {string} canvasId - Canvas ID
   */
  function startAutoPruning(canvasId) {
    if (pruneInterval) {
      clearInterval(pruneInterval)
    }
    
    // Prune every 5 minutes
    pruneInterval = setInterval(() => {
      pruneOperations(canvasId)
    }, 5 * 60 * 1000)
    
    // console.log('[OperationLog] Started auto-pruning (5 min interval)')
  }

  /**
   * Stop automatic pruning
   */
  function stopAutoPruning() {
    if (pruneInterval) {
      clearInterval(pruneInterval)
      pruneInterval = null
      // console.log('[OperationLog] Stopped auto-pruning')
    }
  }

  /**
   * Cleanup subscriptions and intervals
   */
  function cleanup() {
    if (operationUnsubscribe) {
      operationUnsubscribe()
      operationUnsubscribe = null
    }
    
    if (ackUnsubscribe) {
      ackUnsubscribe()
      ackUnsubscribe = null
    }
    
    stopAutoPruning()
    
    pendingOperations.clear()
    acknowledgedOperations.clear()
    isSubscribed.value = false
    
    // console.log('[OperationLog] Cleaned up')
  }

  // Auto-cleanup on unmount
  onUnmounted(() => {
    cleanup()
  })

  return {
    // State
    isSubscribed,
    pendingOperations,
    acknowledgedOperations,
    
    // Methods
    createOperation,
    appendOperation,
    subscribeToOperations,
    acknowledgeOperation,
    subscribeToAcknowledgments,
    getPendingOperations,
    getTimedOutOperations,
    pruneOperations,
    startAutoPruning,
    stopAutoPruning,
    cleanup
  }
}

