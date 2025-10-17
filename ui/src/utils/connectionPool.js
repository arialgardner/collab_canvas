/**
 * Connection Pooling & Resource Management (PR #11)
 * 
 * Optimizes Firebase Realtime Database connections and resource usage:
 * - Reuse connections across components
 * - Batch multiple listeners into shared subscriptions
 * - Automatic cleanup on disconnect
 * - Memory leak prevention
 */

import { ref as dbRef, onValue, off } from 'firebase/database'
import { realtimeDB } from '../firebase/realtimeDB'

// Shared subscription registry
const subscriptions = new Map() // path -> { listeners: Set, unsubscribe: Function }

// Reference counting for cleanup
const refCounts = new Map() // path -> count

// Memory usage tracking
let totalSubscriptions = 0
let totalListeners = 0

/**
 * Subscribe to a path with automatic connection pooling
 * Multiple components can subscribe to the same path; only one Firebase listener is created
 * 
 * @param {string} path - Database path (e.g., 'canvases/abc/cursors')
 * @param {Function} callback - Callback function (snapshot)
 * @returns {Function} Unsubscribe function
 */
export function subscribe(path, callback) {
  if (!path || !callback) {
    console.error('[ConnectionPool] Invalid path or callback')
    return () => {}
  }
  
  // Check if subscription already exists
  if (subscriptions.has(path)) {
    // Add callback to existing subscription
    const subscription = subscriptions.get(path)
    subscription.listeners.add(callback)
    totalListeners++
    
    // console.log(`[ConnectionPool] Reusing connection for ${path} (${subscription.listeners.size} listeners)`)
  } else {
    // Create new subscription
    const listeners = new Set([callback])
    const ref = dbRef(realtimeDB, path)
    
    const firebaseUnsubscribe = onValue(ref, (snapshot) => {
      // Broadcast to all listeners
      listeners.forEach(listener => {
        try {
          listener(snapshot)
        } catch (error) {
          console.error('[ConnectionPool] Listener error:', error)
        }
      })
    }, (error) => {
      console.error(`[ConnectionPool] Firebase error on ${path}:`, error)
    })
    
    subscriptions.set(path, {
      listeners,
      unsubscribe: firebaseUnsubscribe
    })
    
    totalSubscriptions++
    totalListeners++
    
    // console.log(`[ConnectionPool] New connection for ${path} (total: ${totalSubscriptions} subscriptions)`)
  }
  
  // Increment ref count
  refCounts.set(path, (refCounts.get(path) || 0) + 1)
  
  // Return unsubscribe function
  return () => unsubscribe(path, callback)
}

/**
 * Unsubscribe a specific callback from a path
 * Automatically cleans up Firebase listener when no more callbacks exist
 * 
 * @param {string} path - Database path
 * @param {Function} callback - Callback function to remove
 */
export function unsubscribe(path, callback) {
  const subscription = subscriptions.get(path)
  if (!subscription) return
  
  // Remove callback
  subscription.listeners.delete(callback)
  totalListeners--
  
  // Decrement ref count
  const refCount = refCounts.get(path) || 1
  refCounts.set(path, refCount - 1)
  
  // If no more listeners, clean up Firebase subscription
  if (subscription.listeners.size === 0) {
    subscription.unsubscribe()
    subscriptions.delete(path)
    refCounts.delete(path)
    totalSubscriptions--
    
    // console.log(`[ConnectionPool] Closed connection for ${path} (total: ${totalSubscriptions} subscriptions)`)
  } else {
    // console.log(`[ConnectionPool] Removed listener from ${path} (${subscription.listeners.size} remaining)`)
  }
}

/**
 * Unsubscribe all callbacks from a path
 * 
 * @param {string} path - Database path
 */
export function unsubscribeAll(path) {
  const subscription = subscriptions.get(path)
  if (!subscription) return
  
  const listenerCount = subscription.listeners.size
  subscription.unsubscribe()
  subscriptions.delete(path)
  refCounts.delete(path)
  totalSubscriptions--
  totalListeners -= listenerCount
  
  // console.log(`[ConnectionPool] Forcefully closed connection for ${path}`)
}

/**
 * Get active subscription count
 * @returns {number}
 */
export function getActiveSubscriptionCount() {
  return totalSubscriptions
}

/**
 * Get total listener count across all subscriptions
 * @returns {number}
 */
export function getTotalListenerCount() {
  return totalListeners
}

/**
 * Get stats for monitoring
 * @returns {Object}
 */
export function getConnectionPoolStats() {
  const stats = {
    totalSubscriptions,
    totalListeners,
    averageListenersPerSubscription: totalSubscriptions > 0 
      ? (totalListeners / totalSubscriptions).toFixed(2) 
      : 0,
    paths: []
  }
  
  subscriptions.forEach((subscription, path) => {
    stats.paths.push({
      path,
      listenerCount: subscription.listeners.size,
      refCount: refCounts.get(path) || 0
    })
  })
  
  return stats
}

/**
 * Clean up all subscriptions (use sparingly, e.g., on app unmount)
 */
export function cleanupAll() {
  // console.log(`[ConnectionPool] Cleaning up ${totalSubscriptions} subscriptions...`)
  
  subscriptions.forEach((subscription, path) => {
    subscription.unsubscribe()
  })
  
  subscriptions.clear()
  refCounts.clear()
  totalSubscriptions = 0
  totalListeners = 0
  
  // console.log('[ConnectionPool] All connections closed')
}

/**
 * Check for potential memory leaks (subscriptions with excessive listeners)
 * @param {number} threshold - Max listeners per subscription before warning
 */
export function checkForLeaks(threshold = 20) {
  const leaks = []
  
  subscriptions.forEach((subscription, path) => {
    if (subscription.listeners.size > threshold) {
      leaks.push({
        path,
        listenerCount: subscription.listeners.size
      })
    }
  })
  
  if (leaks.length > 0) {
    console.warn('[ConnectionPool] Potential memory leaks detected:')
    leaks.forEach(leak => {
      console.warn(`  - ${leak.path}: ${leak.listenerCount} listeners (threshold: ${threshold})`)
    })
  }
  
  return leaks
}

/**
 * Batch subscribe to multiple paths
 * @param {Array<{path: string, callback: Function}>} subscriptions
 * @returns {Function} Unsubscribe all function
 */
export function batchSubscribe(subscriptionsArray) {
  const unsubscribers = subscriptionsArray.map(({ path, callback }) => {
    return subscribe(path, callback)
  })
  
  return () => {
    unsubscribers.forEach(unsub => unsub())
  }
}

// Periodic leak detection
let leakCheckInterval = null

/**
 * Start automatic leak detection
 * @param {number} intervalMs - Check interval in milliseconds
 * @param {number} threshold - Max listeners per subscription before warning
 */
export function startLeakDetection(intervalMs = 30000, threshold = 20) {
  if (leakCheckInterval) {
    clearInterval(leakCheckInterval)
  }
  
  leakCheckInterval = setInterval(() => {
    checkForLeaks(threshold)
  }, intervalMs)
  
  // console.log(`[ConnectionPool] Started leak detection (every ${intervalMs}ms, threshold: ${threshold})`)
}

/**
 * Stop automatic leak detection
 */
export function stopLeakDetection() {
  if (leakCheckInterval) {
    clearInterval(leakCheckInterval)
    leakCheckInterval = null
    // console.log('[ConnectionPool] Stopped leak detection')
  }
}

// Expose to window for debugging
if (typeof window !== 'undefined') {
  window.connectionPool = {
    getStats: getConnectionPoolStats,
    cleanupAll,
    checkForLeaks,
    startLeakDetection,
    stopLeakDetection
  }
}

