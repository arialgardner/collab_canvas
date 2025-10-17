import { ref } from 'vue'

export const usePerformance = () => {
  const performanceMetrics = ref({
    rectangleSyncLatency: [],
    cursorSyncLatency: [],
    renderTime: [],
    firestoreOperations: 0,
    activeListeners: 0
  })

  // Performance targets from PRD
  const TARGETS = {
    RECTANGLE_SYNC: 100, // ms
    CURSOR_SYNC: 50,     // ms
    MAX_RENDER_TIME: 16, // ms (60fps)
    MAX_RECTANGLES: 100
  }

  // Measure rectangle sync latency
  const measureRectangleSync = (startTime = Date.now()) => {
    return {
      start: () => startTime,
      end: () => {
        const latency = Date.now() - startTime
        performanceMetrics.value.rectangleSyncLatency.push(latency)
        
        // Keep only last 10 measurements
        if (performanceMetrics.value.rectangleSyncLatency.length > 10) {
          performanceMetrics.value.rectangleSyncLatency.shift()
        }
        
        // Warn if target exceeded
        if (latency > TARGETS.RECTANGLE_SYNC) {
          console.warn(`⚠️ Rectangle sync latency: ${latency}ms (target: ${TARGETS.RECTANGLE_SYNC}ms)`)
        }
        
        return latency
      }
    }
  }

  // Measure cursor sync latency
  const measureCursorSync = (startTime = Date.now()) => {
    return {
      start: () => startTime,
      end: () => {
        const latency = Date.now() - startTime
        performanceMetrics.value.cursorSyncLatency.push(latency)
        
        // Keep only last 20 measurements
        if (performanceMetrics.value.cursorSyncLatency.length > 20) {
          performanceMetrics.value.cursorSyncLatency.shift()
        }
        
        // Warn if target exceeded
        if (latency > TARGETS.CURSOR_SYNC) {
          console.warn(`⚠️ Cursor sync latency: ${latency}ms (target: ${TARGETS.CURSOR_SYNC}ms)`)
        }
        
        return latency
      }
    }
  }

  // Measure render performance
  const measureRender = (callback) => {
    const startTime = performance.now()
    
    // Execute the render operation
    const result = callback()
    
    const renderTime = performance.now() - startTime
    performanceMetrics.value.renderTime.push(renderTime)
    
    // Keep only last 30 measurements
    if (performanceMetrics.value.renderTime.length > 30) {
      performanceMetrics.value.renderTime.shift()
    }
    
    // Warn if render is too slow
    if (renderTime > TARGETS.MAX_RENDER_TIME) {
      console.warn(`⚠️ Slow render: ${renderTime.toFixed(2)}ms (target: ${TARGETS.MAX_RENDER_TIME}ms)`)
    }
    
    return result
  }

  // Track Firestore operations
  const trackFirestoreOperation = () => {
    performanceMetrics.value.firestoreOperations++
  }

  // Track active listeners
  const trackListener = (action) => {
    if (action === 'add') {
      performanceMetrics.value.activeListeners++
    } else if (action === 'remove') {
      performanceMetrics.value.activeListeners--
    }
  }

  // Get performance statistics
  const getPerformanceStats = () => {
    const rectangleLatencies = performanceMetrics.value.rectangleSyncLatency
    const cursorLatencies = performanceMetrics.value.cursorSyncLatency
    const renderTimes = performanceMetrics.value.renderTime

    const avgRectangleLatency = rectangleLatencies.length > 0 
      ? rectangleLatencies.reduce((a, b) => a + b, 0) / rectangleLatencies.length 
      : 0

    const avgCursorLatency = cursorLatencies.length > 0 
      ? cursorLatencies.reduce((a, b) => a + b, 0) / cursorLatencies.length 
      : 0

    const avgRenderTime = renderTimes.length > 0 
      ? renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length 
      : 0

    return {
      rectangleSync: {
        average: Math.round(avgRectangleLatency),
        latest: rectangleLatencies[rectangleLatencies.length - 1] || 0,
        target: TARGETS.RECTANGLE_SYNC,
        samples: rectangleLatencies.length
      },
      cursorSync: {
        average: Math.round(avgCursorLatency),
        latest: cursorLatencies[cursorLatencies.length - 1] || 0,
        target: TARGETS.CURSOR_SYNC,
        samples: cursorLatencies.length
      },
      rendering: {
        average: Math.round(avgRenderTime * 100) / 100,
        latest: Math.round((renderTimes[renderTimes.length - 1] || 0) * 100) / 100,
        target: TARGETS.MAX_RENDER_TIME,
        samples: renderTimes.length
      },
      system: {
        firestoreOperations: performanceMetrics.value.firestoreOperations,
        activeListeners: performanceMetrics.value.activeListeners
      }
    }
  }

  // Log performance summary
  const logPerformanceSummary = () => {
    const stats = getPerformanceStats()
    
    console.group('🎯 Performance Summary')
    // console.log(`📦 Rectangle Sync: ${stats.rectangleSync.average}ms avg (target: ${stats.rectangleSync.target}ms)`)
    // console.log(`🖱️ Cursor Sync: ${stats.cursorSync.average}ms avg (target: ${stats.cursorSync.target}ms)`)
    // console.log(`🖥️ Render Time: ${stats.rendering.average}ms avg (target: ${stats.rendering.target}ms)`)
    // console.log(`🔥 Firestore Ops: ${stats.system.firestoreOperations}`)
    // console.log(`👂 Active Listeners: ${stats.system.activeListeners}`)
    console.groupEnd()
    
    return stats
  }

  // Debounce function for performance
  const debounce = (func, wait) => {
    let timeout
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout)
        func(...args)
      }
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
    }
  }

  // Throttle function for performance  
  const throttle = (func, limit) => {
    let inThrottle
    return function() {
      const args = arguments
      const context = this
      if (!inThrottle) {
        func.apply(context, args)
        inThrottle = true
        setTimeout(() => inThrottle = false, limit)
      }
    }
  }

  return {
    // Metrics
    performanceMetrics,
    
    // Measurement functions
    measureRectangleSync,
    measureCursorSync,
    measureRender,
    trackFirestoreOperation,
    trackListener,
    
    // Analysis
    getPerformanceStats,
    logPerformanceSummary,
    
    // Utilities
    debounce,
    throttle,
    
    // Constants
    TARGETS
  }
}
