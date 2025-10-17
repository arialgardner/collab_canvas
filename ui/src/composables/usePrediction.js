/**
 * Client-Side Prediction Composable
 * 
 * Implements optimistic updates with server reconciliation.
 * Provides zero perceived latency for local user while maintaining consistency.
 * 
 * Features:
 * - Immediate local updates (0ms perceived latency)
 * - Prediction tracking with unique IDs
 * - Server reconciliation on confirmation
 * - Smooth rollback animations on conflicts
 * - Prediction accuracy tracking
 */

import { ref, reactive } from 'vue'
import { applyDelta, invertDelta } from '../utils/deltaEncoding.js'

// Predictions map: predictionId -> prediction data
const predictions = reactive(new Map())

// Prediction stats
const predictionStats = reactive({
  total: 0,
  confirmed: 0,
  rolledBack: 0,
  accuracy: 100
})

export function usePrediction() {
  const isEnabled = ref(true)
  const PREDICTION_TIMEOUT = 5000 // 5 seconds

  /**
   * Generate unique prediction ID
   * @returns {string} Prediction ID
   */
  function generatePredictionId() {
    return `pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Apply optimistic local update (prediction)
   * @param {string} shapeId - Shape ID
   * @param {Object} delta - Changes to apply
   * @param {Object} baseState - State before change
   * @param {string} operationId - Associated operation ID
   * @returns {string} Prediction ID
   */
  function predict(shapeId, delta, baseState, operationId = null) {
    if (!isEnabled.value) {
      return null
    }

    const predictionId = generatePredictionId()
    
    predictions.set(predictionId, {
      predictionId,
      shapeId,
      delta,
      baseState,
      operationId,
      timestamp: Date.now(),
      confirmed: false,
      rolledBack: false
    })

    predictionStats.total++

    // Set timeout for prediction
    setTimeout(() => {
      checkPredictionTimeout(predictionId)
    }, PREDICTION_TIMEOUT)

    // console.log(`[Prediction] Created prediction ${predictionId} for shape ${shapeId}`)
    
    return predictionId
  }

  /**
   * Confirm prediction (server accepted)
   * @param {string} predictionId - Prediction ID
   */
  function confirmPrediction(predictionId) {
    const prediction = predictions.get(predictionId)
    
    if (!prediction) {
      return
    }

    prediction.confirmed = true
    predictionStats.confirmed++
    
    // Update accuracy
    predictionStats.accuracy = (predictionStats.confirmed / predictionStats.total * 100).toFixed(1)

    // Remove after short delay (keep for debugging)
    setTimeout(() => {
      predictions.delete(predictionId)
    }, 1000)

    // console.log(`[Prediction] Confirmed prediction ${predictionId}`)
  }

  /**
   * Confirm prediction by operation ID
   * @param {string} operationId - Operation ID
   */
  function confirmByOperationId(operationId) {
    for (const [predictionId, prediction] of predictions.entries()) {
      if (prediction.operationId === operationId) {
        confirmPrediction(predictionId)
        return
      }
    }
  }

  /**
   * Rollback prediction (server rejected or conflict)
   * @param {string} predictionId - Prediction ID
   * @param {Function} applyRollback - Function to apply rollback to shape
   * @returns {Object} Reverse delta for rollback
   */
  function rollbackPrediction(predictionId, applyRollback = null) {
    const prediction = predictions.get(predictionId)
    
    if (!prediction || prediction.confirmed) {
      return null
    }

    prediction.rolledBack = true
    predictionStats.rolledBack++
    
    // Update accuracy
    predictionStats.accuracy = (predictionStats.confirmed / predictionStats.total * 100).toFixed(1)

    // Calculate reverse delta
    const reverseDelta = invertDelta(prediction.delta, prediction.baseState)

    // Apply rollback if callback provided
    if (applyRollback) {
      applyRollback(prediction.shapeId, reverseDelta)
    }

    // Remove after animation completes
    setTimeout(() => {
      predictions.delete(predictionId)
    }, 200) // 200ms for rollback animation

    console.warn(`[Prediction] Rolled back prediction ${predictionId}`)
    
    return reverseDelta
  }

  /**
   * Check if prediction has timed out
   * @param {string} predictionId - Prediction ID
   */
  function checkPredictionTimeout(predictionId) {
    const prediction = predictions.get(predictionId)
    
    if (!prediction) {
      return
    }

    // Already confirmed or rolled back
    if (prediction.confirmed || prediction.rolledBack) {
      return
    }

    const age = Date.now() - prediction.timestamp
    
    if (age >= PREDICTION_TIMEOUT) {
      console.error(`[Prediction] Prediction ${predictionId} timed out after ${age}ms`)
      rollbackPrediction(predictionId)
    }
  }

  /**
   * Get pending predictions for a shape
   * @param {string} shapeId - Shape ID
   * @returns {Array} Pending predictions
   */
  function getPendingPredictions(shapeId) {
    const pending = []
    
    for (const prediction of predictions.values()) {
      if (prediction.shapeId === shapeId && !prediction.confirmed && !prediction.rolledBack) {
        pending.push(prediction)
      }
    }
    
    return pending
  }

  /**
   * Get all pending predictions
   * @returns {Array} All pending predictions
   */
  function getAllPendingPredictions() {
    const pending = []
    
    for (const prediction of predictions.values()) {
      if (!prediction.confirmed && !prediction.rolledBack) {
        pending.push(prediction)
      }
    }
    
    return pending
  }

  /**
   * Get prediction statistics
   * @returns {Object} Prediction stats
   */
  function getPredictionStats() {
    return {
      ...predictionStats,
      pending: getAllPendingPredictions().length
    }
  }

  /**
   * Clear all predictions
   */
  function clearPredictions() {
    predictions.clear()
    // console.log('[Prediction] Cleared all predictions')
  }

  /**
   * Reset prediction statistics
   */
  function resetStats() {
    predictionStats.total = 0
    predictionStats.confirmed = 0
    predictionStats.rolledBack = 0
    predictionStats.accuracy = 100
    // console.log('[Prediction] Reset statistics')
  }

  /**
   * Enable/disable predictions
   * @param {boolean} enabled - Enable or disable
   */
  function setEnabled(enabled) {
    isEnabled.value = enabled
    // console.log(`[Prediction] ${enabled ? 'Enabled' : 'Disabled'}`)
  }

  /**
   * Check if prediction should be applied
   * Based on accuracy - if accuracy drops below 80%, may want to disable
   * @returns {boolean} Should apply predictions
   */
  function shouldApplyPrediction() {
    if (!isEnabled.value) {
      return false
    }

    // If accuracy is very low, consider disabling
    if (predictionStats.total > 20 && predictionStats.accuracy < 80) {
      console.warn(`[Prediction] Low accuracy (${predictionStats.accuracy}%) - consider investigating`)
    }

    return true
  }

  return {
    // State
    isEnabled,
    predictions,
    predictionStats,

    // Methods
    predict,
    confirmPrediction,
    confirmByOperationId,
    rollbackPrediction,
    getPendingPredictions,
    getAllPendingPredictions,
    getPredictionStats,
    clearPredictions,
    resetStats,
    setEnabled,
    shouldApplyPrediction
  }
}

// Singleton for global access
export const globalPrediction = usePrediction()

