/**
 * Realtime Database Monitoring Composable
 * 
 * Tracks connection state, operation counts, bandwidth usage, and latency
 * for Firebase Realtime Database operations.
 */

import { ref, computed } from 'vue'
import { realtimeDB } from '../firebase/realtimeDB.js'
import { onValue, ref as dbRef } from 'firebase/database'

// Global monitoring state
const connectionState = ref('disconnected') // 'connected', 'disconnected', 'connecting'
const operationCount = ref(0)
const bytesSent = ref(0)
const bytesReceived = ref(0)
const cursorLatencies = ref([]) // Array of latency measurements
const objectLatencies = ref([])
const operationLogLatencies = ref([])
const lastConnectionChange = ref(null)
const errors = ref([])

// Track operation timestamps for latency calculation
const operationTimestamps = new Map()

/**
 * Use Realtime DB monitoring
 * @returns {Object} Monitoring state and functions
 */
export function useRealtimeDBMonitoring() {
  /**
   * Initialize monitoring
   * Sets up connection state listener and tracking
   */
  function initializeMonitoring() {
    // Monitor connection state
    const connectedRef = dbRef(realtimeDB, '.info/connected')
    onValue(connectedRef, (snapshot) => {
      const isConnected = snapshot.val()
      connectionState.value = isConnected ? 'connected' : 'disconnected'
      lastConnectionChange.value = Date.now()
      
      // console.log(`[RTDB Monitoring] Connection state: ${connectionState.value}`)
    })
    
    // console.log('[RTDB Monitoring] Initialized')
  }
  
  /**
   * Record an operation start (for latency tracking)
   * @param {string} operationType - 'cursor', 'object', 'operation'
   * @param {string} operationId - Unique operation ID
   */
  function recordOperationStart(operationType, operationId) {
    operationTimestamps.set(operationId, {
      type: operationType,
      startTime: Date.now()
    })
    
    operationCount.value++
  }
  
  /**
   * Record an operation completion (calculates latency)
   * @param {string} operationId - Unique operation ID
   */
  function recordOperationComplete(operationId) {
    const operation = operationTimestamps.get(operationId)
    if (!operation) return
    
    const latency = Date.now() - operation.startTime
    
    // Add to appropriate latency array
    switch (operation.type) {
      case 'cursor':
        cursorLatencies.value.push(latency)
        // Keep only last 1000 measurements
        if (cursorLatencies.value.length > 1000) {
          cursorLatencies.value.shift()
        }
        break
      case 'object':
        objectLatencies.value.push(latency)
        if (objectLatencies.value.length > 1000) {
          objectLatencies.value.shift()
        }
        break
      case 'operation':
        operationLogLatencies.value.push(latency)
        if (operationLogLatencies.value.length > 1000) {
          operationLogLatencies.value.shift()
        }
        break
    }
    
    // Clean up
    operationTimestamps.delete(operationId)
  }
  
  /**
   * Record bytes sent
   * @param {number} bytes - Number of bytes sent
   */
  function recordBytesSent(bytes) {
    bytesSent.value += bytes
  }
  
  /**
   * Record bytes received
   * @param {number} bytes - Number of bytes received
   */
  function recordBytesReceived(bytes) {
    bytesReceived.value += bytes
  }
  
  /**
   * Record an error
   * @param {string} errorType - Type of error
   * @param {Error} error - Error object
   */
  function recordError(errorType, error) {
    errors.value.push({
      type: errorType,
      message: error.message,
      timestamp: Date.now()
    })
    
    // Keep only last 100 errors
    if (errors.value.length > 100) {
      errors.value.shift()
    }
    
    console.error(`[RTDB Monitoring] Error (${errorType}):`, error)
  }
  
  /**
   * Calculate percentile from array of values
   * @param {number[]} values - Array of numbers
   * @param {number} percentile - Percentile (0-100)
   * @returns {number} Percentile value
   */
  function calculatePercentile(values, percentile) {
    if (values.length === 0) return 0
    
    const sorted = [...values].sort((a, b) => a - b)
    const index = Math.ceil((percentile / 100) * sorted.length) - 1
    return sorted[Math.max(0, index)]
  }
  
  /**
   * Calculate average from array of values
   * @param {number[]} values - Array of numbers
   * @returns {number} Average value
   */
  function calculateAverage(values) {
    if (values.length === 0) return 0
    return values.reduce((sum, val) => sum + val, 0) / values.length
  }
  
  // Computed metrics
  const cursorLatencyP50 = computed(() => 
    calculatePercentile(cursorLatencies.value, 50)
  )
  
  const cursorLatencyP95 = computed(() => 
    calculatePercentile(cursorLatencies.value, 95)
  )
  
  const cursorLatencyP99 = computed(() => 
    calculatePercentile(cursorLatencies.value, 99)
  )
  
  const cursorLatencyAvg = computed(() => 
    calculateAverage(cursorLatencies.value)
  )
  
  const objectLatencyP50 = computed(() => 
    calculatePercentile(objectLatencies.value, 50)
  )
  
  const objectLatencyP95 = computed(() => 
    calculatePercentile(objectLatencies.value, 95)
  )
  
  const objectLatencyP99 = computed(() => 
    calculatePercentile(objectLatencies.value, 99)
  )
  
  const objectLatencyAvg = computed(() => 
    calculateAverage(objectLatencies.value)
  )
  
  const operationLogLatencyAvg = computed(() => 
    calculateAverage(operationLogLatencies.value)
  )
  
  const totalBandwidth = computed(() => 
    bytesSent.value + bytesReceived.value
  )
  
  const bandwidthMB = computed(() => 
    (totalBandwidth.value / (1024 * 1024)).toFixed(2)
  )
  
  const isConnected = computed(() => 
    connectionState.value === 'connected'
  )
  
  const errorRate = computed(() => {
    if (operationCount.value === 0) return 0
    return (errors.value.length / operationCount.value * 100).toFixed(2)
  })
  
  /**
   * Get monitoring summary
   * @returns {Object} Summary of all metrics
   */
  function getMonitoringSummary() {
    return {
      connection: {
        state: connectionState.value,
        isConnected: isConnected.value,
        lastChange: lastConnectionChange.value
      },
      operations: {
        count: operationCount.value,
        errorRate: errorRate.value
      },
      bandwidth: {
        sent: bytesSent.value,
        received: bytesReceived.value,
        total: totalBandwidth.value,
        totalMB: bandwidthMB.value
      },
      latency: {
        cursor: {
          avg: cursorLatencyAvg.value,
          p50: cursorLatencyP50.value,
          p95: cursorLatencyP95.value,
          p99: cursorLatencyP99.value,
          samples: cursorLatencies.value.length
        },
        object: {
          avg: objectLatencyAvg.value,
          p50: objectLatencyP50.value,
          p95: objectLatencyP95.value,
          p99: objectLatencyP99.value,
          samples: objectLatencies.value.length
        },
        operationLog: {
          avg: operationLogLatencyAvg.value,
          samples: operationLogLatencies.value.length
        }
      },
      errors: errors.value
    }
  }
  
  /**
   * Reset all metrics
   */
  function resetMetrics() {
    operationCount.value = 0
    bytesSent.value = 0
    bytesReceived.value = 0
    cursorLatencies.value = []
    objectLatencies.value = []
    operationLogLatencies.value = []
    errors.value = []
    operationTimestamps.clear()
    
    // console.log('[RTDB Monitoring] Metrics reset')
  }
  
  /**
   * Log current metrics to console
   */
  function logMetrics() {
    const summary = getMonitoringSummary()
    // console.log('[RTDB Monitoring] Metrics Summary:', summary)
  }
  
  return {
    // State
    connectionState,
    operationCount,
    bytesSent,
    bytesReceived,
    isConnected,
    
    // Computed metrics
    cursorLatencyP50,
    cursorLatencyP95,
    cursorLatencyP99,
    cursorLatencyAvg,
    objectLatencyP50,
    objectLatencyP95,
    objectLatencyP99,
    objectLatencyAvg,
    operationLogLatencyAvg,
    bandwidthMB,
    errorRate,
    
    // Functions
    initializeMonitoring,
    recordOperationStart,
    recordOperationComplete,
    recordBytesSent,
    recordBytesReceived,
    recordError,
    getMonitoringSummary,
    resetMetrics,
    logMetrics
  }
}

// Export singleton instance for global access
export const rtdbMonitoring = useRealtimeDBMonitoring()

