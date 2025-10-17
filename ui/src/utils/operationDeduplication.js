/**
 * Operation Deduplication for v3
 * Prevents duplicate operations from being processed
 * Uses LRU cache to track recent operations
 */

class OperationCache {
  constructor(maxSize = 100) {
    this.cache = new Map()
    this.maxSize = maxSize
    this.hits = 0
    this.misses = 0
  }

  /**
   * Generate operation ID from shape and operation details
   */
  generateOperationId(shapeId, timestamp, userId, operationType) {
    return `${shapeId}-${timestamp}-${userId}-${operationType}`
  }

  /**
   * Check if operation has been processed recently
   */
  isDuplicate(shapeId, timestamp, userId, operationType) {
    const opId = this.generateOperationId(shapeId, timestamp, userId, operationType)
    
    if (this.cache.has(opId)) {
      this.hits++
      // console.log(`🔄 Skipped duplicate operation: ${opId}`)
      return true
    }
    
    this.misses++
    return false
  }

  /**
   * Mark operation as processed
   */
  markProcessed(shapeId, timestamp, userId, operationType) {
    const opId = this.generateOperationId(shapeId, timestamp, userId, operationType)
    
    // Add to cache with current time
    this.cache.set(opId, Date.now())
    
    // Enforce max size (LRU eviction)
    if (this.cache.size > this.maxSize) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
  }

  /**
   * Clean up old entries (older than 5 minutes)
   */
  cleanup() {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
    
    for (const [opId, timestamp] of this.cache.entries()) {
      if (timestamp < fiveMinutesAgo) {
        this.cache.delete(opId)
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits + this.misses > 0 
        ? (this.hits / (this.hits + this.misses) * 100).toFixed(2) + '%'
        : '0%'
    }
  }

  /**
   * Clear cache
   */
  clear() {
    this.cache.clear()
    this.hits = 0
    this.misses = 0
  }
}

// Singleton instance
let cacheInstance = null

export const getOperationCache = () => {
  if (!cacheInstance) {
    cacheInstance = new OperationCache()
    
    // Set up periodic cleanup (every 5 minutes)
    setInterval(() => {
      cacheInstance.cleanup()
    }, 5 * 60 * 1000)
  }
  return cacheInstance
}

export const resetOperationCache = () => {
  if (cacheInstance) {
    cacheInstance.clear()
  }
}

/**
 * Check if an operation is a duplicate
 */
export const isDuplicateOperation = (shapeId, timestamp, userId, operationType) => {
  const cache = getOperationCache()
  return cache.isDuplicate(shapeId, timestamp, userId, operationType)
}

/**
 * Mark an operation as processed
 */
export const markOperationProcessed = (shapeId, timestamp, userId, operationType) => {
  const cache = getOperationCache()
  cache.markProcessed(shapeId, timestamp, userId, operationType)
}

/**
 * Get deduplication statistics
 */
export const getDeduplicationStats = () => {
  const cache = getOperationCache()
  return cache.getStats()
}

