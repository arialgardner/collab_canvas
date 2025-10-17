/**
 * Feature Flag System
 * 
 * This module manages feature flags for gradual rollout of new features.
 * Flags can be controlled locally or via Firebase Remote Config.
 * 
 * Current Flags:
 * - USE_REALTIME_DB: Enable Firebase Realtime Database for cursors, presence, and operations
 */

/**
 * Local feature flag overrides (for development/testing)
 * Set to null to use remote config, or true/false to override
 */
const localOverrides = {
  USE_REALTIME_DB: true, // null = use remote config, true/false = override
  ENABLE_OT: null,
  ENABLE_PREDICTION: null,
  ENABLE_DELTA_SYNC: null
}

/**
 * Default flag values (used when remote config is unavailable)
 */
const defaultFlags = {
  USE_REALTIME_DB: false, // Default to Firestore (existing behavior)
  ENABLE_OT: false,
  ENABLE_PREDICTION: false,
  ENABLE_DELTA_SYNC: false
}

/**
 * In-memory cache of feature flags
 */
let flagCache = { ...defaultFlags }

/**
 * Flag change listeners
 */
const listeners = new Map()

/**
 * Initialize feature flags
 * In v8 PR #1, we're using local config only.
 * Future PRs will integrate Firebase Remote Config.
 */
export function initializeFeatureFlags() {
  // Load flags from localStorage (for development)
  const stored = localStorage.getItem('featureFlags')
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      flagCache = { ...defaultFlags, ...parsed }
    } catch (e) {
      console.error('Failed to parse stored feature flags:', e)
    }
  }
  
  // Apply local overrides
  for (const [key, value] of Object.entries(localOverrides)) {
    if (value !== null) {
      flagCache[key] = value
    }
  }
  
  // console.log('[FeatureFlags] Initialized:', flagCache)
  return flagCache
}

/**
 * Get a feature flag value
 * @param {string} flagName - Name of the flag
 * @param {boolean} defaultValue - Default value if flag not found
 * @returns {boolean} Flag value
 */
export function getFeatureFlag(flagName, defaultValue = false) {
  // Check local override first
  if (localOverrides[flagName] !== null && localOverrides[flagName] !== undefined) {
    return localOverrides[flagName]
  }
  
  // Check cache
  if (flagCache[flagName] !== undefined) {
    return flagCache[flagName]
  }
  
  // Return default
  return defaultValue
}

/**
 * Set a feature flag value (for development/testing)
 * @param {string} flagName - Name of the flag
 * @param {boolean} value - Flag value
 */
export function setFeatureFlag(flagName, value) {
  flagCache[flagName] = value
  
  // Persist to localStorage
  localStorage.setItem('featureFlags', JSON.stringify(flagCache))
  
  // Notify listeners
  notifyListeners(flagName, value)
  
  // console.log(`[FeatureFlags] Set ${flagName} = ${value}`)
}

/**
 * Subscribe to feature flag changes
 * @param {string} flagName - Name of the flag to watch
 * @param {Function} callback - Callback function(value)
 * @returns {Function} Unsubscribe function
 */
export function subscribeToFlag(flagName, callback) {
  if (!listeners.has(flagName)) {
    listeners.set(flagName, new Set())
  }
  
  listeners.get(flagName).add(callback)
  
  // Return unsubscribe function
  return () => {
    const flagListeners = listeners.get(flagName)
    if (flagListeners) {
      flagListeners.delete(callback)
    }
  }
}

/**
 * Notify all listeners of a flag change
 * @param {string} flagName - Flag that changed
 * @param {boolean} value - New value
 */
function notifyListeners(flagName, value) {
  const flagListeners = listeners.get(flagName)
  if (flagListeners) {
    for (const callback of flagListeners) {
      try {
        callback(value)
      } catch (e) {
        console.error(`[FeatureFlags] Error in listener for ${flagName}:`, e)
      }
    }
  }
}

/**
 * Get all feature flags
 * @returns {Object} All flags
 */
export function getAllFeatureFlags() {
  return { ...flagCache }
}

/**
 * Reset all feature flags to defaults
 */
export function resetFeatureFlags() {
  flagCache = { ...defaultFlags }
  localStorage.removeItem('featureFlags')
  // console.log('[FeatureFlags] Reset to defaults')
}

/**
 * Enable gradual rollout for a percentage of users
 * @param {string} userId - User ID
 * @param {number} rolloutPercentage - Percentage (0-100)
 * @returns {boolean} Whether user is in rollout
 */
export function isUserInRollout(userId, rolloutPercentage) {
  if (rolloutPercentage >= 100) return true
  if (rolloutPercentage <= 0) return false
  
  // Deterministic hash based on user ID
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i)
    hash = hash & hash // Convert to 32-bit integer
  }
  
  const userPercentile = Math.abs(hash) % 100
  return userPercentile < rolloutPercentage
}

/**
 * Check if Realtime DB should be used for this user
 * @param {string} userId - User ID
 * @returns {boolean}
 */
export function shouldUseRealtimeDB(userId) {
  const flag = getFeatureFlag('USE_REALTIME_DB', false)
  
  // If flag is explicitly true/false, use that
  if (typeof flag === 'boolean') {
    return flag
  }
  
  // If flag is a number, treat it as rollout percentage
  if (typeof flag === 'number') {
    return isUserInRollout(userId, flag)
  }
  
  return false
}

/**
 * Development helper: Enable Realtime DB for testing
 */
export function enableRealtimeDB() {
  setFeatureFlag('USE_REALTIME_DB', true)
  // console.log('[FeatureFlags] Realtime DB enabled for this session')
}

/**
 * Development helper: Disable Realtime DB
 */
export function disableRealtimeDB() {
  setFeatureFlag('USE_REALTIME_DB', false)
  // console.log('[FeatureFlags] Realtime DB disabled for this session')
}

// Initialize on module load
initializeFeatureFlags()

// Expose flags to window for debugging
if (typeof window !== 'undefined') {
  window.featureFlags = {
    get: getFeatureFlag,
    set: setFeatureFlag,
    getAll: getAllFeatureFlags,
    reset: resetFeatureFlags,
    enableRealtimeDB,
    disableRealtimeDB
  }
}

