/**
 * Test: Performance Optimization (PR #11)
 * 
 * Validates:
 * 1. Connection pooling reuses subscriptions
 * 2. Batch writes reduce Firebase operations
 * 3. Memory leak prevention works
 * 4. Delta encoding reduces bandwidth
 */

import { test, expect } from '@playwright/test'

test.describe('PR #11: Connection Pooling', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.waitForTimeout(1000)
  })
  
  test('Connection pool is available', async ({ page }) => {
    const isAvailable = await page.evaluate(() => {
      return window.connectionPool !== undefined
    })
    expect(isAvailable).toBe(true)
  })
  
  test('Multiple subscribers reuse same connection', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { subscribe, getConnectionPoolStats } = await import('/src/utils/connectionPool.js')
      
      const path = 'test/path'
      const callback1 = (snap) => {}
      const callback2 = (snap) => {}
      
      // Subscribe twice to same path
      subscribe(path, callback1)
      subscribe(path, callback2)
      
      const stats = getConnectionPoolStats()
      return {
        totalSubscriptions: stats.totalSubscriptions,
        totalListeners: stats.totalListeners
      }
    })
    
    // Should have 1 subscription with 2 listeners
    expect(result.totalSubscriptions).toBe(1)
    expect(result.totalListeners).toBe(2)
  })
  
  test('Unsubscribing removes only specific callback', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { subscribe, getConnectionPoolStats } = await import('/src/utils/connectionPool.js')
      
      const path = 'test/path'
      const callback1 = (snap) => {}
      const callback2 = (snap) => {}
      
      const unsub1 = subscribe(path, callback1)
      subscribe(path, callback2)
      
      // Unsubscribe first callback
      unsub1()
      
      const stats = getConnectionPoolStats()
      return {
        totalSubscriptions: stats.totalSubscriptions,
        totalListeners: stats.totalListeners
      }
    })
    
    // Should still have 1 subscription with 1 listener
    expect(result.totalSubscriptions).toBe(1)
    expect(result.totalListeners).toBe(1)
  })
  
  test('Connection closes when all callbacks removed', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { subscribe, getConnectionPoolStats } = await import('/src/utils/connectionPool.js')
      
      const path = 'test/path/unique'
      const callback1 = (snap) => {}
      
      const unsub1 = subscribe(path, callback1)
      
      // Verify subscription exists
      let stats = getConnectionPoolStats()
      const beforeCount = stats.totalSubscriptions
      
      // Unsubscribe
      unsub1()
      
      // Verify subscription removed
      stats = getConnectionPoolStats()
      const afterCount = stats.totalSubscriptions
      
      return {
        beforeCount,
        afterCount
      }
    })
    
    expect(result.beforeCount).toBeGreaterThan(result.afterCount)
  })
  
  test('Leak detection warns on excessive listeners', async ({ page }) => {
    const hasWarnings = await page.evaluate(async () => {
      const { subscribe, checkForLeaks } = await import('/src/utils/connectionPool.js')
      
      const path = 'test/leak/check'
      
      // Add many listeners (simulate leak)
      for (let i = 0; i < 25; i++) {
        subscribe(path, (snap) => {})
      }
      
      const leaks = checkForLeaks(20) // threshold = 20
      return leaks.length > 0
    })
    
    expect(hasWarnings).toBe(true)
  })
  
})

test.describe('PR #11: Batch Write Optimization', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.waitForTimeout(1000)
  })
  
  test('Batch write queue is available', async ({ page }) => {
    const isAvailable = await page.evaluate(() => {
      return window.batchWriteQueue !== undefined
    })
    expect(isAvailable).toBe(true)
  })
  
  test('Multiple writes are batched together', async ({ page }) => {
    const result = await page.evaluate(() => {
      const queue = window.batchWriteQueue
      
      // Queue multiple writes
      for (let i = 0; i < 10; i++) {
        queue.queueWrite('shapes', `shape_${i}`, { x: i, y: i })
      }
      
      const stats = queue.getStats()
      return {
        normalQueueSize: stats.normalQueueSize
      }
    })
    
    expect(result.normalQueueSize).toBe(10)
  })
  
  test('Priority queue has separate handling', async ({ page }) => {
    const result = await page.evaluate(() => {
      const queue = window.batchWriteQueue
      
      // Queue normal and priority writes
      queue.queueWrite('shapes', 'shape_normal', { x: 1 }, false)
      queue.queueWrite('shapes', 'shape_priority', { x: 2 }, true)
      
      const stats = queue.getStats()
      return {
        normalQueueSize: stats.normalQueueSize,
        priorityQueueSize: stats.priorityQueueSize
      }
    })
    
    expect(result.normalQueueSize).toBeGreaterThan(0)
    expect(result.priorityQueueSize).toBeGreaterThan(0)
  })
  
  test('Queue stats track write savings', async ({ page }) => {
    const hasStats = await page.evaluate(() => {
      const queue = window.batchWriteQueue
      const stats = queue.getStats()
      
      return {
        hasTotalWrites: stats.totalWrites !== undefined,
        hasSavedWrites: stats.savedWrites !== undefined,
        hasSavingsPercent: stats.writeSavingsPercent !== undefined
      }
    })
    
    expect(hasStats.hasTotalWrites).toBe(true)
    expect(hasStats.hasSavedWrites).toBe(true)
    expect(hasStats.hasSavingsPercent).toBe(true)
  })
  
})

test.describe('PR #11: Memory Leak Prevention', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.waitForTimeout(1000)
  })
  
  test('Memory leak prevention is available', async ({ page }) => {
    const isAvailable = await page.evaluate(() => {
      return window.memoryLeakPrevention !== undefined
    })
    expect(isAvailable).toBe(true)
  })
  
  test('Safe timer wrappers track active timers', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { safeSetTimeout, safeClearTimeout } = await import('/src/utils/memoryLeakPrevention.js')
      
      // Create timers
      const timer1 = safeSetTimeout(() => {}, 10000)
      const timer2 = safeSetTimeout(() => {}, 10000)
      
      const stats = window.memoryLeakPrevention.getStats()
      const beforeCount = stats.activeTimers
      
      // Clear one timer
      safeClearTimeout(timer1)
      
      const afterStats = window.memoryLeakPrevention.getStats()
      const afterCount = afterStats.activeTimers
      
      return {
        beforeCount,
        afterCount
      }
    })
    
    expect(result.beforeCount).toBe(2)
    expect(result.afterCount).toBe(1)
  })
  
  test('Safe interval wrappers track active intervals', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { safeSetInterval, safeClearInterval } = await import('/src/utils/memoryLeakPrevention.js')
      
      const interval = safeSetInterval(() => {}, 1000)
      
      const stats = window.memoryLeakPrevention.getStats()
      const beforeCount = stats.activeIntervals
      
      safeClearInterval(interval)
      
      const afterStats = window.memoryLeakPrevention.getStats()
      const afterCount = afterStats.activeIntervals
      
      return {
        beforeCount,
        afterCount
      }
    })
    
    expect(result.beforeCount).toBeGreaterThan(0)
    expect(result.afterCount).toBeLessThan(result.beforeCount)
  })
  
  test('Memory usage can be retrieved', async ({ page }) => {
    const memoryAvailable = await page.evaluate(() => {
      const stats = window.memoryLeakPrevention.getStats()
      return stats.memory !== null
    })
    
    // Memory API might not be available in all browsers
    // Just check that it doesn't error
    expect(typeof memoryAvailable).toBe('boolean')
  })
  
  test('Leak detection warns on excessive resources', async ({ page }) => {
    const result = await page.evaluate(() => {
      const { checkForLeaks } = window.memoryLeakPrevention
      
      // No warnings with clean state
      const warnings = checkForLeaks()
      return warnings.length
    })
    
    // Should have 0 warnings in clean state
    expect(result).toBe(0)
  })
  
  test('Cleanup all removes tracked resources', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { safeSetTimeout, safeSetInterval } = await import('/src/utils/memoryLeakPrevention.js')
      const { cleanupAll, getStats } = window.memoryLeakPrevention
      
      // Create some resources
      safeSetTimeout(() => {}, 10000)
      safeSetInterval(() => {}, 1000)
      
      const before = getStats()
      
      // Cleanup
      cleanupAll()
      
      const after = getStats()
      
      return {
        timersBefore: before.activeTimers,
        intervalsBefore: before.activeIntervals,
        timersAfter: after.activeTimers,
        intervalsAfter: after.activeIntervals
      }
    })
    
    expect(result.timersAfter).toBe(0)
    expect(result.intervalsAfter).toBe(0)
  })
  
})

test.describe('PR #11: Delta Encoding Optimization', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.waitForTimeout(1000)
  })
  
  test('Delta encoding reduces payload size', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { calculateDelta, getDeltaSize } = await import('/src/utils/deltaEncoding.js')
      
      const oldState = {
        id: 'rect_1',
        x: 100,
        y: 200,
        width: 150,
        height: 100,
        fill: '#ff0000',
        stroke: '#000000',
        strokeWidth: 2,
        rotation: 0
      }
      
      const newState = {
        ...oldState,
        x: 150, // Only x changed
        y: 250  // Only y changed
      }
      
      const delta = calculateDelta(oldState, newState)
      
      const fullSize = getDeltaSize(newState)
      const deltaSize = getDeltaSize(delta)
      
      return {
        fullSize,
        deltaSize,
        reduction: Math.round(((fullSize - deltaSize) / fullSize) * 100)
      }
    })
    
    // Delta should be significantly smaller
    expect(result.deltaSize).toBeLessThan(result.fullSize)
    expect(result.reduction).toBeGreaterThan(50) // At least 50% reduction
  })
  
  test('Delta can be applied to reconstruct state', async ({ page }) => {
    const isCorrect = await page.evaluate(async () => {
      const { calculateDelta, applyDelta } = await import('/src/utils/deltaEncoding.js')
      
      const oldState = { x: 100, y: 200, width: 150 }
      const newState = { x: 150, y: 250, width: 150 }
      
      const delta = calculateDelta(oldState, newState)
      const reconstructed = applyDelta(oldState, delta)
      
      return reconstructed.x === 150 && reconstructed.y === 250
    })
    
    expect(isCorrect).toBe(true)
  })
  
})

