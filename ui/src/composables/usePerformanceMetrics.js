/**
 * Performance Metrics Composable (PR #10)
 * 
 * Tracks and reports key performance indicators:
 * - Operation latency (client → server → acknowledged)
 * - Bandwidth usage (sent/received)
 * - Prediction accuracy
 * - OT conflict rate
 * - Frame rate impact
 */

import { ref, reactive, computed, onUnmounted } from 'vue'
import { rtdbMonitoring } from './useRealtimeDBMonitoring'

// Global performance metrics state
const metrics = reactive({
  // Latency tracking
  operationLatencies: [], // Array of { operationId, startTime, endTime, duration }
  averageLatency: 0,
  p50Latency: 0,
  p95Latency: 0,
  p99Latency: 0,
  
  // Bandwidth tracking
  totalBytesSent: 0,
  totalBytesReceived: 0,
  bytesPerSecondSent: 0,
  bytesPerSecondReceived: 0,
  
  // Prediction accuracy
  totalPredictions: 0,
  correctPredictions: 0,
  incorrectPredictions: 0,
  rolledBackPredictions: 0,
  predictionAccuracy: 0,
  
  // OT metrics
  totalTransforms: 0,
  conflictsDetected: 0,
  conflictsResolved: 0,
  conflictRate: 0,
  transformsByType: {
    position: 0,
    size: 0,
    rotation: 0,
    style: 0,
    composite: 0
  },
  
  // Performance impact
  frameDrops: 0,
  averageFPS: 60,
  lastFrameTime: 0,
  
  // Session metrics
  sessionStartTime: Date.now(),
  uptime: 0,
  operationsPerMinute: 0,
  peakOperationsPerMinute: 0
})

// Latency tracking map: operationId -> startTime
const pendingOperations = new Map()

// Bandwidth sampling (for bytes per second calculation)
let lastBandwidthSample = { time: Date.now(), sent: 0, received: 0 }
let bandwidthInterval = null

// Frame rate monitoring
let frameRateInterval = null
let lastFrameCount = 0
let frameCount = 0

// Operations per minute tracking
let operationTimestamps = []
let operationsInterval = null

export function usePerformanceMetrics() {
  
  /**
   * Start tracking an operation's latency
   * @param {string} operationId - Unique operation ID
   */
  function startLatencyTracking(operationId) {
    pendingOperations.set(operationId, Date.now())
  }
  
  /**
   * End tracking an operation's latency (when acknowledged)
   * @param {string} operationId - Unique operation ID
   */
  function endLatencyTracking(operationId) {
    const startTime = pendingOperations.get(operationId)
    if (!startTime) return
    
    const endTime = Date.now()
    const duration = endTime - startTime
    
    metrics.operationLatencies.push({
      operationId,
      startTime,
      endTime,
      duration
    })
    
    pendingOperations.delete(operationId)
    
    // Keep only last 1000 latencies to prevent memory leak
    if (metrics.operationLatencies.length > 1000) {
      metrics.operationLatencies.shift()
    }
    
    // Update latency percentiles
    updateLatencyPercentiles()
  }
  
  /**
   * Calculate latency percentiles (p50, p95, p99)
   */
  function updateLatencyPercentiles() {
    if (metrics.operationLatencies.length === 0) return
    
    const durations = metrics.operationLatencies.map(l => l.duration).sort((a, b) => a - b)
    const total = durations.reduce((sum, d) => sum + d, 0)
    
    metrics.averageLatency = Math.round(total / durations.length)
    metrics.p50Latency = percentile(durations, 50)
    metrics.p95Latency = percentile(durations, 95)
    metrics.p99Latency = percentile(durations, 99)
  }
  
  /**
   * Calculate percentile from sorted array
   * @param {Array<number>} sortedArray - Sorted array of numbers
   * @param {number} p - Percentile (0-100)
   * @returns {number}
   */
  function percentile(sortedArray, p) {
    if (sortedArray.length === 0) return 0
    const index = Math.ceil((p / 100) * sortedArray.length) - 1
    return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))]
  }
  
  /**
   * Track bandwidth usage
   * @param {number} bytesSent - Bytes sent
   * @param {number} bytesReceived - Bytes received
   */
  function trackBandwidth(bytesSent = 0, bytesReceived = 0) {
    metrics.totalBytesSent += bytesSent
    metrics.totalBytesReceived += bytesReceived
  }
  
  /**
   * Start bandwidth monitoring (samples per second)
   */
  function startBandwidthMonitoring() {
    stopBandwidthMonitoring()
    
    bandwidthInterval = setInterval(() => {
      const now = Date.now()
      const elapsed = (now - lastBandwidthSample.time) / 1000 // seconds
      
      const sentDelta = metrics.totalBytesSent - lastBandwidthSample.sent
      const receivedDelta = metrics.totalBytesReceived - lastBandwidthSample.received
      
      metrics.bytesPerSecondSent = Math.round(sentDelta / elapsed)
      metrics.bytesPerSecondReceived = Math.round(receivedDelta / elapsed)
      
      lastBandwidthSample = {
        time: now,
        sent: metrics.totalBytesSent,
        received: metrics.totalBytesReceived
      }
    }, 1000) // Update every second
  }
  
  /**
   * Stop bandwidth monitoring
   */
  function stopBandwidthMonitoring() {
    if (bandwidthInterval) {
      clearInterval(bandwidthInterval)
      bandwidthInterval = null
    }
  }
  
  /**
   * Track prediction outcome
   * @param {string} outcome - 'correct', 'incorrect', or 'rollback'
   */
  function trackPrediction(outcome) {
    metrics.totalPredictions++
    
    if (outcome === 'correct') {
      metrics.correctPredictions++
    } else if (outcome === 'incorrect') {
      metrics.incorrectPredictions++
    } else if (outcome === 'rollback') {
      metrics.rolledBackPredictions++
    }
    
    // Calculate accuracy (excluding rollbacks from denominator)
    const total = metrics.correctPredictions + metrics.incorrectPredictions
    metrics.predictionAccuracy = total > 0 
      ? Math.round((metrics.correctPredictions / total) * 100) 
      : 0
  }
  
  /**
   * Track OT transform
   * @param {string} type - Transform type ('position', 'size', 'rotation', 'style', 'composite')
   * @param {boolean} hadConflict - Whether there was a conflict
   * @param {boolean} resolved - Whether the conflict was resolved
   */
  function trackTransform(type, hadConflict = false, resolved = false) {
    metrics.totalTransforms++
    
    if (metrics.transformsByType[type] !== undefined) {
      metrics.transformsByType[type]++
    }
    
    if (hadConflict) {
      metrics.conflictsDetected++
    }
    
    if (resolved) {
      metrics.conflictsResolved++
    }
    
    // Calculate conflict rate
    metrics.conflictRate = metrics.totalTransforms > 0
      ? Math.round((metrics.conflictsDetected / metrics.totalTransforms) * 100)
      : 0
  }
  
  /**
   * Track frame drop
   */
  function trackFrameDrop() {
    metrics.frameDrops++
  }
  
  /**
   * Increment frame count (for FPS calculation)
   */
  function incrementFrameCount() {
    frameCount++
  }
  
  /**
   * Start frame rate monitoring
   */
  function startFrameRateMonitoring() {
    stopFrameRateMonitoring()
    
    frameRateInterval = setInterval(() => {
      const fps = frameCount - lastFrameCount
      metrics.averageFPS = Math.round((metrics.averageFPS * 0.9) + (fps * 0.1)) // Smoothed
      lastFrameCount = frameCount
      metrics.lastFrameTime = Date.now()
    }, 1000) // Check every second
  }
  
  /**
   * Stop frame rate monitoring
   */
  function stopFrameRateMonitoring() {
    if (frameRateInterval) {
      clearInterval(frameRateInterval)
      frameRateInterval = null
    }
  }
  
  /**
   * Track operation (for operations per minute calculation)
   */
  function trackOperation() {
    const now = Date.now()
    operationTimestamps.push(now)
    
    // Remove timestamps older than 1 minute
    const oneMinuteAgo = now - 60000
    operationTimestamps = operationTimestamps.filter(t => t > oneMinuteAgo)
    
    metrics.operationsPerMinute = operationTimestamps.length
    
    if (metrics.operationsPerMinute > metrics.peakOperationsPerMinute) {
      metrics.peakOperationsPerMinute = metrics.operationsPerMinute
    }
  }
  
  /**
   * Start operations per minute monitoring
   */
  function startOperationsMonitoring() {
    stopOperationsMonitoring()
    
    operationsInterval = setInterval(() => {
      const now = Date.now()
      const oneMinuteAgo = now - 60000
      operationTimestamps = operationTimestamps.filter(t => t > oneMinuteAgo)
      metrics.operationsPerMinute = operationTimestamps.length
    }, 5000) // Update every 5 seconds
  }
  
  /**
   * Stop operations per minute monitoring
   */
  function stopOperationsMonitoring() {
    if (operationsInterval) {
      clearInterval(operationsInterval)
      operationsInterval = null
    }
  }
  
  /**
   * Update uptime
   */
  function updateUptime() {
    metrics.uptime = Math.floor((Date.now() - metrics.sessionStartTime) / 1000) // seconds
  }
  
  /**
   * Get formatted uptime string
   * @returns {string}
   */
  function getFormattedUptime() {
    const seconds = metrics.uptime
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }
  
  /**
   * Get performance summary report
   * @returns {Object}
   */
  function getPerformanceReport() {
    updateUptime()
    
    return {
      session: {
        uptime: getFormattedUptime(),
        uptimeSeconds: metrics.uptime,
        operationsPerMinute: metrics.operationsPerMinute,
        peakOperationsPerMinute: metrics.peakOperationsPerMinute
      },
      latency: {
        average: `${metrics.averageLatency}ms`,
        p50: `${metrics.p50Latency}ms`,
        p95: `${metrics.p95Latency}ms`,
        p99: `${metrics.p99Latency}ms`,
        samplesCount: metrics.operationLatencies.length
      },
      bandwidth: {
        totalSent: formatBytes(metrics.totalBytesSent),
        totalReceived: formatBytes(metrics.totalBytesReceived),
        sentPerSecond: formatBytes(metrics.bytesPerSecondSent) + '/s',
        receivedPerSecond: formatBytes(metrics.bytesPerSecondReceived) + '/s'
      },
      prediction: {
        total: metrics.totalPredictions,
        correct: metrics.correctPredictions,
        incorrect: metrics.incorrectPredictions,
        rolledBack: metrics.rolledBackPredictions,
        accuracy: `${metrics.predictionAccuracy}%`
      },
      ot: {
        totalTransforms: metrics.totalTransforms,
        conflictsDetected: metrics.conflictsDetected,
        conflictsResolved: metrics.conflictsResolved,
        conflictRate: `${metrics.conflictRate}%`,
        transformsByType: metrics.transformsByType
      },
      performance: {
        averageFPS: metrics.averageFPS,
        frameDrops: metrics.frameDrops
      }
    }
  }
  
  /**
   * Format bytes for human readability
   * @param {number} bytes
   * @returns {string}
   */
  function formatBytes(bytes) {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }
  
  /**
   * Reset all metrics
   */
  function resetMetrics() {
    metrics.operationLatencies = []
    metrics.averageLatency = 0
    metrics.p50Latency = 0
    metrics.p95Latency = 0
    metrics.p99Latency = 0
    
    metrics.totalBytesSent = 0
    metrics.totalBytesReceived = 0
    metrics.bytesPerSecondSent = 0
    metrics.bytesPerSecondReceived = 0
    
    metrics.totalPredictions = 0
    metrics.correctPredictions = 0
    metrics.incorrectPredictions = 0
    metrics.rolledBackPredictions = 0
    metrics.predictionAccuracy = 0
    
    metrics.totalTransforms = 0
    metrics.conflictsDetected = 0
    metrics.conflictsResolved = 0
    metrics.conflictRate = 0
    metrics.transformsByType = {
      position: 0,
      size: 0,
      rotation: 0,
      style: 0,
      composite: 0
    }
    
    metrics.frameDrops = 0
    metrics.averageFPS = 60
    
    metrics.sessionStartTime = Date.now()
    metrics.uptime = 0
    metrics.operationsPerMinute = 0
    metrics.peakOperationsPerMinute = 0
    
    pendingOperations.clear()
    operationTimestamps = []
  }
  
  /**
   * Start all monitoring
   */
  function startMonitoring() {
    startBandwidthMonitoring()
    startFrameRateMonitoring()
    startOperationsMonitoring()
    // console.log('[Performance Metrics] Monitoring started')
  }
  
  /**
   * Stop all monitoring
   */
  function stopMonitoring() {
    stopBandwidthMonitoring()
    stopFrameRateMonitoring()
    stopOperationsMonitoring()
    // console.log('[Performance Metrics] Monitoring stopped')
  }
  
  /**
   * Log performance report to console
   */
  function logPerformanceReport() {
    const report = getPerformanceReport()
    // console.log('=== Performance Report ===')
    // console.log('Session:', report.session)
    // console.log('Latency:', report.latency)
    // console.log('Bandwidth:', report.bandwidth)
    // console.log('Prediction:', report.prediction)
    // console.log('OT:', report.ot)
    // console.log('Performance:', report.performance)
    // console.log('========================')
  }
  
  onUnmounted(() => {
    stopMonitoring()
  })
  
  return {
    metrics,
    startLatencyTracking,
    endLatencyTracking,
    trackBandwidth,
    trackPrediction,
    trackTransform,
    trackFrameDrop,
    trackOperation,
    incrementFrameCount,
    startMonitoring,
    stopMonitoring,
    getPerformanceReport,
    logPerformanceReport,
    resetMetrics,
    formatBytes,
    getFormattedUptime
  }
}

// Export singleton instance for global access
export const performanceMetrics = usePerformanceMetrics()

// Expose to window for debugging
if (typeof window !== 'undefined') {
  window.performanceMetrics = performanceMetrics
}

