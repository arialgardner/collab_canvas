/**
 * Memory Leak Prevention (PR #11)
 * 
 * Monitors and prevents common memory leaks in the app:
 * - Unsubscribed listeners
 * - Abandoned timers/intervals
 * - Large object retention
 * - Event listener cleanup
 */

// Track active timers and intervals
const activeTimers = new Set()
const activeIntervals = new Set()
const activeListeners = new Map() // element -> Set of { event, handler }

// Memory usage snapshots
let lastMemorySnapshot = null
let memoryGrowthRate = 0

/**
 * Wrapped setTimeout that auto-tracks timers
 * @param {Function} callback
 * @param {number} delay
 * @returns {number} Timer ID
 */
export function safeSetTimeout(callback, delay) {
  const timerId = setTimeout(() => {
    activeTimers.delete(timerId)
    callback()
  }, delay)
  
  activeTimers.add(timerId)
  return timerId
}

/**
 * Wrapped clearTimeout
 * @param {number} timerId
 */
export function safeClearTimeout(timerId) {
  clearTimeout(timerId)
  activeTimers.delete(timerId)
}

/**
 * Wrapped setInterval that auto-tracks intervals
 * @param {Function} callback
 * @param {number} delay
 * @returns {number} Interval ID
 */
export function safeSetInterval(callback, delay) {
  const intervalId = setInterval(callback, delay)
  activeIntervals.add(intervalId)
  return intervalId
}

/**
 * Wrapped clearInterval
 * @param {number} intervalId
 */
export function safeClearInterval(intervalId) {
  clearInterval(intervalId)
  activeIntervals.delete(intervalId)
}

/**
 * Wrapped addEventListener with automatic tracking
 * @param {Element} element
 * @param {string} event
 * @param {Function} handler
 * @param {Object} options
 */
export function safeAddEventListener(element, event, handler, options) {
  if (!activeListeners.has(element)) {
    activeListeners.set(element, new Set())
  }
  
  activeListeners.get(element).add({ event, handler, options })
  element.addEventListener(event, handler, options)
}

/**
 * Wrapped removeEventListener
 * @param {Element} element
 * @param {string} event
 * @param {Function} handler
 */
export function safeRemoveEventListener(element, event, handler) {
  const listeners = activeListeners.get(element)
  if (listeners) {
    listeners.forEach(listener => {
      if (listener.event === event && listener.handler === handler) {
        listeners.delete(listener)
      }
    })
    
    if (listeners.size === 0) {
      activeListeners.delete(element)
    }
  }
  
  element.removeEventListener(event, handler)
}

/**
 * Clean up all listeners for a specific element
 * @param {Element} element
 */
export function cleanupElement(element) {
  const listeners = activeListeners.get(element)
  if (!listeners) return
  
  listeners.forEach(({ event, handler }) => {
    element.removeEventListener(event, handler)
  })
  
  activeListeners.delete(element)
  // console.log(`[MemoryLeak] Cleaned up ${listeners.size} listeners for element`)
}

/**
 * Clear all active timers
 */
export function clearAllTimers() {
  // console.log(`[MemoryLeak] Clearing ${activeTimers.size} active timers`)
  activeTimers.forEach(timerId => clearTimeout(timerId))
  activeTimers.clear()
}

/**
 * Clear all active intervals
 */
export function clearAllIntervals() {
  // console.log(`[MemoryLeak] Clearing ${activeIntervals.size} active intervals`)
  activeIntervals.forEach(intervalId => clearInterval(intervalId))
  activeIntervals.clear()
}

/**
 * Clear all active event listeners
 */
export function clearAllListeners() {
  let totalListeners = 0
  
  activeListeners.forEach((listeners, element) => {
    listeners.forEach(({ event, handler }) => {
      element.removeEventListener(event, handler)
      totalListeners++
    })
  })
  
  activeListeners.clear()
  // console.log(`[MemoryLeak] Cleared ${totalListeners} active listeners`)
}

/**
 * Clean up all tracked resources
 */
export function cleanupAll() {
  clearAllTimers()
  clearAllIntervals()
  clearAllListeners()
  // console.log('[MemoryLeak] All resources cleaned up')
}

/**
 * Get memory usage (if available)
 * @returns {Object|null}
 */
export function getMemoryUsage() {
  if (performance.memory) {
    return {
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
      usedPercent: Math.round((performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100)
    }
  }
  return null
}

/**
 * Take a memory snapshot and calculate growth rate
 */
export function takeMemorySnapshot() {
  const current = getMemoryUsage()
  if (!current) return null
  
  if (lastMemorySnapshot) {
    const growth = current.usedJSHeapSize - lastMemorySnapshot.usedJSHeapSize
    const timeDiff = (Date.now() - lastMemorySnapshot.timestamp) / 1000 // seconds
    memoryGrowthRate = growth / timeDiff // bytes per second
  }
  
  lastMemorySnapshot = {
    ...current,
    timestamp: Date.now()
  }
  
  return {
    current,
    growthRate: memoryGrowthRate,
    growthRateMBPerMin: (memoryGrowthRate * 60) / (1024 * 1024) // MB per minute
  }
}

/**
 * Check for memory leaks
 * @returns {Array<string>} Array of warnings
 */
export function checkForLeaks() {
  const warnings = []
  
  // Check for excessive timers
  if (activeTimers.size > 50) {
    warnings.push(`⚠️ ${activeTimers.size} active timers (possible leak)`)
  }
  
  // Check for excessive intervals
  if (activeIntervals.size > 20) {
    warnings.push(`⚠️ ${activeIntervals.size} active intervals (possible leak)`)
  }
  
  // Check for excessive listeners
  let totalListeners = 0
  activeListeners.forEach(listeners => {
    totalListeners += listeners.size
  })
  
  if (totalListeners > 200) {
    warnings.push(`⚠️ ${totalListeners} active event listeners (possible leak)`)
  }
  
  // Check for excessive listener count per element
  activeListeners.forEach((listeners, element) => {
    if (listeners.size > 20) {
      warnings.push(`⚠️ Element has ${listeners.size} listeners (possible leak)`)
    }
  })
  
  // Check memory growth rate
  if (memoryGrowthRate > 1024 * 1024) { // > 1MB per second
    const mbPerSec = (memoryGrowthRate / (1024 * 1024)).toFixed(2)
    warnings.push(`⚠️ High memory growth rate: ${mbPerSec} MB/sec`)
  }
  
  return warnings
}

/**
 * Get leak detection stats
 * @returns {Object}
 */
export function getLeakDetectionStats() {
  let totalListeners = 0
  const listenersByElement = []
  
  activeListeners.forEach((listeners, element) => {
    totalListeners += listeners.size
    listenersByElement.push({
      element: element.tagName || 'Unknown',
      listenerCount: listeners.size
    })
  })
  
  return {
    activeTimers: activeTimers.size,
    activeIntervals: activeIntervals.size,
    totalListeners,
    listenersByElement,
    memory: getMemoryUsage(),
    memoryGrowthRate: memoryGrowthRate,
    warnings: checkForLeaks()
  }
}

/**
 * Start automatic leak detection
 * @param {number} intervalMs - Check interval
 */
let leakDetectionInterval = null

export function startLeakDetection(intervalMs = 30000) {
  if (leakDetectionInterval) {
    clearInterval(leakDetectionInterval)
  }
  
  leakDetectionInterval = setInterval(() => {
    const warnings = checkForLeaks()
    if (warnings.length > 0) {
      console.warn('[MemoryLeak] Potential leaks detected:')
      warnings.forEach(warning => console.warn(warning))
    }
    
    // Take memory snapshot
    const snapshot = takeMemorySnapshot()
    if (snapshot && snapshot.growthRateMBPerMin > 10) { // >10 MB/min growth
      console.warn(`[MemoryLeak] High memory growth: ${snapshot.growthRateMBPerMin.toFixed(2)} MB/min`)
    }
  }, intervalMs)
  
  // console.log(`[MemoryLeak] Started leak detection (every ${intervalMs}ms)`)
}

/**
 * Stop automatic leak detection
 */
export function stopLeakDetection() {
  if (leakDetectionInterval) {
    clearInterval(leakDetectionInterval)
    leakDetectionInterval = null
    // console.log('[MemoryLeak] Stopped leak detection')
  }
}

// Expose to window for debugging
if (typeof window !== 'undefined') {
  window.memoryLeakPrevention = {
    getStats: getLeakDetectionStats,
    checkForLeaks,
    cleanupAll,
    takeSnapshot: takeMemorySnapshot,
    startDetection: startLeakDetection,
    stopDetection: stopLeakDetection
  }
}

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    cleanupAll()
  })
}

