/**
 * Cursor Interpolation Utility
 * 
 * Smoothly animates cursor movement between position updates
 * to prevent jerky cursor movement in real-time collaboration.
 * 
 * Uses linear interpolation with requestAnimationFrame for smooth 60fps animation.
 */

/**
 * Cursor Interpolator Class
 * Manages smooth interpolation between cursor positions
 */
export class CursorInterpolator {
  constructor() {
    this.cursors = new Map() // userId -> { current, target, lastUpdate, velocity }
    this.animationFrameId = null
    this.isAnimating = false
    this.INTERPOLATION_SPEED = 0.3 // 30% per frame (higher = faster catch-up)
    this.MIN_DISTANCE = 1 // px; stop interpolating if closer than this
    this.callbacks = new Map() // userId -> callback function
  }
  
  /**
   * Set target position for a cursor
   * @param {string} userId - User ID
   * @param {number} x - Target X position
   * @param {number} y - Target Y position
   */
  setTarget(userId, x, y) {
    const now = Date.now()
    
    if (!this.cursors.has(userId)) {
      // First position - set current = target (no interpolation)
      this.cursors.set(userId, {
        current: { x, y },
        target: { x, y },
        lastUpdate: now,
        velocity: { x: 0, y: 0 }
      })
      this.notifyCallback(userId, x, y)
    } else {
      const cursor = this.cursors.get(userId)
      
      // Calculate velocity (px/ms)
      const timeDelta = now - cursor.lastUpdate
      if (timeDelta > 0) {
        cursor.velocity = {
          x: (x - cursor.target.x) / timeDelta,
          y: (y - cursor.target.y) / timeDelta
        }
      }
      
      // Update target
      cursor.target = { x, y }
      cursor.lastUpdate = now
    }
    
    // Start animation loop if not already running
    if (!this.isAnimating) {
      this.startAnimation()
    }
  }
  
  /**
   * Get current interpolated position for a cursor
   * @param {string} userId - User ID
   * @returns {Object|null} { x, y } or null if cursor not found
   */
  getCurrentPosition(userId) {
    const cursor = this.cursors.get(userId)
    return cursor ? { ...cursor.current } : null
  }
  
  /**
   * Register callback for cursor position updates
   * @param {string} userId - User ID
   * @param {Function} callback - Callback function(x, y)
   */
  onPositionUpdate(userId, callback) {
    this.callbacks.set(userId, callback)
  }
  
  /**
   * Unregister callback
   * @param {string} userId - User ID
   */
  offPositionUpdate(userId) {
    this.callbacks.delete(userId)
  }
  
  /**
   * Notify callback of position update
   * @param {string} userId - User ID
   * @param {number} x - X position
   * @param {number} y - Y position
   */
  notifyCallback(userId, x, y) {
    const callback = this.callbacks.get(userId)
    if (callback) {
      callback(x, y)
    }
  }
  
  /**
   * Remove cursor from interpolation
   * @param {string} userId - User ID
   */
  removeCursor(userId) {
    this.cursors.delete(userId)
    this.callbacks.delete(userId)
    
    // Stop animation if no cursors left
    if (this.cursors.size === 0 && this.isAnimating) {
      this.stopAnimation()
    }
  }
  
  /**
   * Start animation loop
   */
  startAnimation() {
    if (this.isAnimating) return
    
    this.isAnimating = true
    this.animate()
  }
  
  /**
   * Stop animation loop
   */
  stopAnimation() {
    if (!this.isAnimating) return
    
    this.isAnimating = false
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }
  
  /**
   * Animation loop - interpolate all cursors
   */
  animate() {
    if (!this.isAnimating) return
    
    let hasMovement = false
    
    // Interpolate each cursor toward its target
    for (const [userId, cursor] of this.cursors.entries()) {
      const dx = cursor.target.x - cursor.current.x
      const dy = cursor.target.y - cursor.current.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      // If close enough, snap to target
      if (distance < this.MIN_DISTANCE) {
        if (cursor.current.x !== cursor.target.x || cursor.current.y !== cursor.target.y) {
          cursor.current.x = cursor.target.x
          cursor.current.y = cursor.target.y
          this.notifyCallback(userId, cursor.current.x, cursor.current.y)
        }
        continue
      }
      
      // Linear interpolation
      cursor.current.x += dx * this.INTERPOLATION_SPEED
      cursor.current.y += dy * this.INTERPOLATION_SPEED
      
      this.notifyCallback(userId, cursor.current.x, cursor.current.y)
      hasMovement = true
    }
    
    // Continue animation if there's still movement
    if (hasMovement) {
      this.animationFrameId = requestAnimationFrame(() => this.animate())
    } else {
      this.stopAnimation()
    }
  }
  
  /**
   * Clear all cursors
   */
  clear() {
    this.cursors.clear()
    this.callbacks.clear()
    this.stopAnimation()
  }
  
  /**
   * Get number of cursors being interpolated
   * @returns {number}
   */
  getCursorCount() {
    return this.cursors.size
  }
  
  /**
   * Set interpolation speed
   * @param {number} speed - Speed (0-1, higher = faster)
   */
  setInterpolationSpeed(speed) {
    this.INTERPOLATION_SPEED = Math.max(0.1, Math.min(1, speed))
  }
}

// Export singleton instance for global use
export const globalCursorInterpolator = new CursorInterpolator()

/**
 * Helper: Create a cursor interpolator instance
 * @returns {CursorInterpolator}
 */
export function createCursorInterpolator() {
  return new CursorInterpolator()
}

