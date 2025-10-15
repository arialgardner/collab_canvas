import { ref, reactive, computed } from 'vue'

/**
 * Enhanced Performance Monitoring Composable for v3
 * Tracks object sync, cursor sync, FPS, and Firestore metrics
 * Provides detailed performance dashboard data
 */
export const usePerformanceMonitoring = () => {
  // Performance targets from PRD v3
  const TARGETS = {
    OBJECT_SYNC: 100,    // ms - Sub-100ms object sync
    CURSOR_SYNC: 50,     // ms - Sub-50ms cursor sync
    FPS: 60,             // Target frame rate
    MIN_FPS: 30          // Warning threshold
  }

  // Metrics storage
  const metrics = reactive({
    objectSync: {
      measurements: [],    // Last 10 measurements
      current: null,       // Current measurement in progress
      violations: 0        // Count of target violations
    },
    cursorSync: {
      measurements: [],    // Last 100 measurements
      current: null,
      violations: 0
    },
    fps: {
      measurements: [],    // Last 60 frames
      current: 0,
      violations: 0,       // Count of drops below 30 FPS
      lastFrameTime: 0
    },
    firestore: {
      operations: 0,       // Total operations count
      reads: 0,
      writes: 0,
      deletes: 0,
      listeners: 0,        // Active listeners count
      errors: 0
    },
    shapes: {
      inMemory: 0,         // Total shapes in memory
      rendered: 0,         // Shapes currently rendered (viewport culling)
      created: 0,          // Lifetime counter
      deleted: 0           // Lifetime counter
    },
    network: {
      estimatedRTT: 0,     // Estimated round-trip time
      lastPingTime: null
    }
  })

  // Warning tracking for user alerts
  const warningWindow = reactive({
    objectSyncWarnings: [],  // Timestamps of warnings in last minute
    cursorSyncWarnings: [],
    fpsWarnings: [],
    lastAlertTime: 0,
    alertCooldown: 60000  // 1 minute between alerts
  })

  // Calculate statistics for a set of measurements
  const calculateStats = (measurements) => {
    if (!measurements || measurements.length === 0) {
      return { avg: 0, min: 0, max: 0, count: 0 }
    }

    const count = measurements.length
    const sum = measurements.reduce((a, b) => a + b, 0)
    const avg = sum / count
    const min = Math.min(...measurements)
    const max = Math.max(...measurements)

    return { avg: Math.round(avg), min, max, count }
  }

  // Object Sync Tracking
  const startObjectSyncMeasurement = () => {
    const startTime = performance.now()
    
    return {
      end: () => {
        const latency = performance.now() - startTime
        
        // Add to measurements
        metrics.objectSync.measurements.push(latency)
        if (metrics.objectSync.measurements.length > 10) {
          metrics.objectSync.measurements.shift()
        }
        
        // Check for violations
        if (latency > TARGETS.OBJECT_SYNC) {
          metrics.objectSync.violations++
          trackWarning('objectSync', latency)
          console.warn(`⚠️ Object sync latency exceeded 100ms: ${Math.round(latency)}ms`)
        }
        
        return latency
      }
    }
  }

  // Cursor Sync Tracking
  const startCursorSyncMeasurement = () => {
    const startTime = performance.now()
    
    return {
      end: () => {
        const latency = performance.now() - startTime
        
        // Add to measurements
        metrics.cursorSync.measurements.push(latency)
        if (metrics.cursorSync.measurements.length > 100) {
          metrics.cursorSync.measurements.shift()
        }
        
        // Check for violations
        if (latency > TARGETS.CURSOR_SYNC) {
          metrics.cursorSync.violations++
          trackWarning('cursorSync', latency)
          console.warn(`⚠️ Cursor sync latency exceeded 50ms: ${Math.round(latency)}ms`)
        }
        
        return latency
      }
    }
  }

  // FPS Tracking
  let fpsAnimationFrameId = null
  
  const startFPSTracking = () => {
    const measureFrame = (currentTime) => {
      if (metrics.fps.lastFrameTime > 0) {
        const frameDelta = currentTime - metrics.fps.lastFrameTime
        const fps = 1000 / frameDelta
        
        metrics.fps.measurements.push(fps)
        if (metrics.fps.measurements.length > 60) {
          metrics.fps.measurements.shift()
        }
        
        // Calculate rolling average
        metrics.fps.current = Math.round(
          metrics.fps.measurements.reduce((a, b) => a + b, 0) / metrics.fps.measurements.length
        )
        
        // Check for violations
        if (metrics.fps.current < TARGETS.MIN_FPS) {
          metrics.fps.violations++
          trackWarning('fps', metrics.fps.current)
          console.warn(`⚠️ FPS dropped below 30: ${metrics.fps.current} FPS`)
        }
      }
      
      metrics.fps.lastFrameTime = currentTime
      fpsAnimationFrameId = requestAnimationFrame(measureFrame)
    }
    
    fpsAnimationFrameId = requestAnimationFrame(measureFrame)
  }

  const stopFPSTracking = () => {
    if (fpsAnimationFrameId) {
      cancelAnimationFrame(fpsAnimationFrameId)
      fpsAnimationFrameId = null
    }
  }

  // Firestore Operation Tracking
  const trackFirestoreOperation = (type = 'unknown') => {
    metrics.firestore.operations++
    
    switch (type) {
      case 'read':
        metrics.firestore.reads++
        break
      case 'write':
        metrics.firestore.writes++
        break
      case 'delete':
        metrics.firestore.deletes++
        break
    }
  }

  const trackFirestoreListener = (action) => {
    if (action === 'add') {
      metrics.firestore.listeners++
    } else if (action === 'remove') {
      metrics.firestore.listeners = Math.max(0, metrics.firestore.listeners - 1)
    }
  }

  const trackFirestoreError = () => {
    metrics.firestore.errors++
  }

  // Shape Tracking
  const updateShapeMetrics = (inMemory, rendered) => {
    metrics.shapes.inMemory = inMemory
    metrics.shapes.rendered = rendered
  }

  const trackShapeCreation = () => {
    metrics.shapes.created++
  }

  const trackShapeDeletion = () => {
    metrics.shapes.deleted++
  }

  // Network Estimation
  const estimateNetworkRTT = async () => {
    const startTime = performance.now()
    
    // This will be set when a Firestore operation completes
    return {
      complete: () => {
        const rtt = performance.now() - startTime
        metrics.network.estimatedRTT = Math.round(rtt)
        metrics.network.lastPingTime = Date.now()
        return rtt
      }
    }
  }

  // Warning Tracking
  const trackWarning = (type, value) => {
    const now = Date.now()
    
    // Add warning to appropriate array
    switch (type) {
      case 'objectSync':
        warningWindow.objectSyncWarnings.push(now)
        break
      case 'cursorSync':
        warningWindow.cursorSyncWarnings.push(now)
        break
      case 'fps':
        warningWindow.fpsWarnings.push(now)
        break
    }
    
    // Clean up old warnings (older than 1 minute)
    const oneMinuteAgo = now - 60000
    warningWindow.objectSyncWarnings = warningWindow.objectSyncWarnings.filter(t => t > oneMinuteAgo)
    warningWindow.cursorSyncWarnings = warningWindow.cursorSyncWarnings.filter(t => t > oneMinuteAgo)
    warningWindow.fpsWarnings = warningWindow.fpsWarnings.filter(t => t > oneMinuteAgo)
    
    // Check if we should alert user
    const totalWarnings = warningWindow.objectSyncWarnings.length + 
                         warningWindow.cursorSyncWarnings.length + 
                         warningWindow.fpsWarnings.length
    
    if (totalWarnings >= 5 && now - warningWindow.lastAlertTime > warningWindow.alertCooldown) {
      warningWindow.lastAlertTime = now
      return true // Should show user alert
    }
    
    return false
  }

  // Computed performance stats
  const performanceStats = computed(() => {
    return {
      objectSync: {
        ...calculateStats(metrics.objectSync.measurements),
        target: TARGETS.OBJECT_SYNC,
        status: getStatus(calculateStats(metrics.objectSync.measurements).avg, TARGETS.OBJECT_SYNC, 200),
        violations: metrics.objectSync.violations
      },
      cursorSync: {
        ...calculateStats(metrics.cursorSync.measurements),
        target: TARGETS.CURSOR_SYNC,
        status: getStatus(calculateStats(metrics.cursorSync.measurements).avg, TARGETS.CURSOR_SYNC, 100),
        violations: metrics.cursorSync.violations
      },
      fps: {
        current: metrics.fps.current,
        ...calculateStats(metrics.fps.measurements),
        target: TARGETS.FPS,
        minTarget: TARGETS.MIN_FPS,
        status: getFPSStatus(metrics.fps.current),
        violations: metrics.fps.violations
      },
      firestore: {
        ...metrics.firestore
      },
      shapes: {
        ...metrics.shapes
      },
      network: {
        ...metrics.network
      }
    }
  })

  // Get status (green/yellow/red) based on value
  const getStatus = (value, target, maxYellow) => {
    if (value === 0) return 'gray' // No data
    if (value <= target) return 'green'
    if (value <= maxYellow) return 'yellow'
    return 'red'
  }

  const getFPSStatus = (fps) => {
    if (fps === 0) return 'gray'
    if (fps >= 55) return 'green'
    if (fps >= 30) return 'yellow'
    return 'red'
  }

  // Export metrics to console
  const logPerformanceSummary = () => {
    const stats = performanceStats.value
    
    console.group('🎯 Performance Monitoring Summary (v3)')
    console.log(`📦 Object Sync: ${stats.objectSync.avg}ms avg | ${stats.objectSync.min}-${stats.objectSync.max}ms range | Target: ${stats.objectSync.target}ms | Status: ${stats.objectSync.status}`)
    console.log(`🖱️ Cursor Sync: ${stats.cursorSync.avg}ms avg | ${stats.cursorSync.min}-${stats.cursorSync.max}ms range | Target: ${stats.cursorSync.target}ms | Status: ${stats.cursorSync.status}`)
    console.log(`🖥️ FPS: ${stats.fps.current} current | ${stats.fps.avg} avg | Target: ${stats.fps.target} | Status: ${stats.fps.status}`)
    console.log(`🔥 Firestore: ${stats.firestore.operations} ops | ${stats.firestore.reads} reads | ${stats.firestore.writes} writes | ${stats.firestore.listeners} listeners`)
    console.log(`📐 Shapes: ${stats.shapes.inMemory} in memory | ${stats.shapes.rendered} rendered | ${stats.shapes.created} created | ${stats.shapes.deleted} deleted`)
    console.log(`🌐 Network: ${stats.network.estimatedRTT}ms RTT`)
    console.groupEnd()
    
    return stats
  }

  // Reset all metrics
  const resetMetrics = () => {
    metrics.objectSync.measurements = []
    metrics.objectSync.violations = 0
    metrics.cursorSync.measurements = []
    metrics.cursorSync.violations = 0
    metrics.fps.measurements = []
    metrics.fps.violations = 0
    metrics.firestore.operations = 0
    metrics.firestore.reads = 0
    metrics.firestore.writes = 0
    metrics.firestore.deletes = 0
    metrics.firestore.errors = 0
    // Don't reset listeners count as it's a current state, not cumulative
    
    warningWindow.objectSyncWarnings = []
    warningWindow.cursorSyncWarnings = []
    warningWindow.fpsWarnings = []
  }

  return {
    // State
    metrics,
    performanceStats,
    TARGETS,
    // expose internal metrics for UI consumers
    get shapesInMemory() { return metrics.shapes.inMemory },
    get shapesRendered() { return metrics.shapes.rendered },
    
    // Object Sync Tracking
    startObjectSyncMeasurement,
    
    // Cursor Sync Tracking
    startCursorSyncMeasurement,
    
    // FPS Tracking
    startFPSTracking,
    stopFPSTracking,
    
    // Firestore Tracking
    trackFirestoreOperation,
    trackFirestoreListener,
    trackFirestoreError,
    
    // Shape Tracking
    updateShapeMetrics,
    trackShapeCreation,
    trackShapeDeletion,
    
    // Network Tracking
    estimateNetworkRTT,
    
    // Utilities
    logPerformanceSummary,
    resetMetrics
  }
}

