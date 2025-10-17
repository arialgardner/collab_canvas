/**
 * Conflict Detection Composable
 * 
 * Detects when two operations target the same shape concurrently
 * and determines if OT transformation is needed.
 */

import { ref, reactive } from 'vue'
import { performanceMetrics } from './usePerformanceMetrics' // Added
import { areConcurrent, hasConflict, getConflictType } from '../utils/operationalTransform.js'

// Track detected conflicts for monitoring
const detectedConflicts = reactive([])
const conflictStats = reactive({
  total: 0,
  position: 0,
  property: 0,
  delete: 0,
  resolved: 0
})

export function useConflictDetection() {
  const isEnabled = ref(true)

  /**
   * Detect if two operations conflict
   * @param {Object} localOp - Local operation
   * @param {Object} remoteOp - Remote operation
   * @returns {Object} { hasConflict, conflictType, needsTransform }
   */
  function detectConflict(localOp, remoteOp) {
    if (!isEnabled.value) {
      return { hasConflict: false, conflictType: 'none', needsTransform: false }
    }
    
    if (!localOp || !remoteOp) {
      return { hasConflict: false, conflictType: 'none', needsTransform: false }
    }
    
    // Check if concurrent
    const concurrent = areConcurrent(localOp, remoteOp)
    if (!concurrent) {
      return { hasConflict: false, conflictType: 'none', needsTransform: false }
    }
    
    // Check if conflict exists
    const conflict = hasConflict(localOp, remoteOp)
    if (!conflict) {
      return { hasConflict: false, conflictType: 'none', needsTransform: false }
    }
    
    // Get conflict type
    const conflictType = getConflictType(localOp, remoteOp)
    
    // Record conflict
    recordConflict({
      localOp,
      remoteOp,
      conflictType,
      timestamp: Date.now()
    })
    
    return {
      hasConflict: true,
      conflictType,
      needsTransform: true
    }
  }

  /**
   * Find pending local operations for a shape
   * @param {string} shapeId - Shape ID
   * @param {Map} pendingOps - Pending operations map
   * @returns {Array} Pending operations for this shape
   */
  function getPendingOpsForShape(shapeId, pendingOps) {
    if (!pendingOps || !(pendingOps instanceof Map)) {
      return []
    }
    
    const operations = []
    for (const [opId, op] of pendingOps.entries()) {
      if (op.shapeId === shapeId) {
        operations.push(op)
      }
    }
    
    return operations
  }

  /**
   * Check if remote operation conflicts with any pending local operations
   * @param {Object} remoteOp - Remote operation
   * @param {Map} pendingOps - Pending local operations
   * @returns {Array} Conflicting local operations
   */
  function findConflictingOperations(remoteOp, pendingOps) {
    const pendingForShape = getPendingOpsForShape(remoteOp.shapeId, pendingOps)
    
    const conflicts = []
    for (const localOp of pendingForShape) {
      const detection = detectConflict(localOp, remoteOp)
      if (detection.hasConflict) {
        conflicts.push({
          localOp,
          conflictType: detection.conflictType
        })
      }
    }
    
    return conflicts
  }

  /**
   * Record a detected conflict
   * @param {Object} conflict - Conflict details
   */
  function recordConflict(conflict) {
    detectedConflicts.push(conflict)
    
    // Keep only last 100 conflicts
    if (detectedConflicts.length > 100) {
      detectedConflicts.shift()
    }
    
    // Update stats
    conflictStats.total++
    
    if (conflict.conflictType === 'position') {
      conflictStats.position++
    } else if (conflict.conflictType === 'property') {
      conflictStats.property++
    } else if (conflict.conflictType === 'delete') {
      conflictStats.delete++
    }
    
    // console.log(`[ConflictDetection] Detected ${conflict.conflictType} conflict on shape ${conflict.localOp.shapeId}`)
  }

  /**
   * Mark a conflict as resolved
   */
  function markResolved() {
    conflictStats.resolved++
  }

  /**
   * Get conflict statistics
   * @returns {Object} Conflict stats
   */
  function getConflictStats() {
    return {
      ...conflictStats,
      successRate: conflictStats.total > 0 
        ? (conflictStats.resolved / conflictStats.total * 100).toFixed(1)
        : 100
    }
  }

  /**
   * Get recent conflicts
   * @param {number} count - Number of conflicts to return
   * @returns {Array} Recent conflicts
   */
  function getRecentConflicts(count = 10) {
    return detectedConflicts.slice(-count)
  }

  /**
   * Reset conflict tracking
   */
  function reset() {
    detectedConflicts.length = 0
    conflictStats.total = 0
    conflictStats.position = 0
    conflictStats.property = 0
    conflictStats.delete = 0
    conflictStats.resolved = 0
    // console.log('[ConflictDetection] Reset')
  }

  /**
   * Enable/disable conflict detection
   * @param {boolean} enabled - Enable or disable
   */
  function setEnabled(enabled) {
    isEnabled.value = enabled
    // console.log(`[ConflictDetection] ${enabled ? 'Enabled' : 'Disabled'}`)
  }

  return {
    // State
    isEnabled,
    detectedConflicts,
    conflictStats,
    
    // Methods
    detectConflict,
    findConflictingOperations,
    getPendingOpsForShape,
    recordConflict,
    markResolved,
    getConflictStats,
    getRecentConflicts,
    reset,
    setEnabled
  }
}

// Singleton for global access
export const conflictDetection = useConflictDetection()

