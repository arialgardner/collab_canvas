/**
 * Test: Firebase Realtime Database Setup (PR #1)
 * 
 * Validates that:
 * 1. Realtime DB is properly initialized
 * 2. Feature flags system works
 * 3. Helper functions return correct references
 * 4. Monitoring system initializes
 */

import { test, expect } from '@playwright/test'

test.describe('PR #1: Realtime DB Setup', () => {
  
  test('Feature flags system is accessible', async ({ page }) => {
    await page.goto('http://localhost:5173')
    
    // Feature flags should be exposed on window for debugging
    const hasFeatureFlags = await page.evaluate(() => {
      return typeof window.featureFlags !== 'undefined'
    })
    
    expect(hasFeatureFlags).toBe(true)
  })
  
  test('Feature flag get/set works', async ({ page }) => {
    await page.goto('http://localhost:5173')
    
    // Set a feature flag
    await page.evaluate(() => {
      window.featureFlags.set('USE_REALTIME_DB', true)
    })
    
    // Get the feature flag
    const flagValue = await page.evaluate(() => {
      return window.featureFlags.get('USE_REALTIME_DB')
    })
    
    expect(flagValue).toBe(true)
  })
  
  test('Feature flags persist to localStorage', async ({ page }) => {
    await page.goto('http://localhost:5173')
    
    // Set a feature flag
    await page.evaluate(() => {
      window.featureFlags.set('USE_REALTIME_DB', true)
    })
    
    // Check localStorage
    const storedFlags = await page.evaluate(() => {
      return localStorage.getItem('featureFlags')
    })
    
    expect(storedFlags).toContain('USE_REALTIME_DB')
    expect(storedFlags).toContain('true')
  })
  
  test('Feature flags can be reset', async ({ page }) => {
    await page.goto('http://localhost:5173')
    
    // Set a flag
    await page.evaluate(() => {
      window.featureFlags.set('USE_REALTIME_DB', true)
    })
    
    // Reset flags
    await page.evaluate(() => {
      window.featureFlags.reset()
    })
    
    // Verify flag is back to default (false)
    const flagValue = await page.evaluate(() => {
      return window.featureFlags.get('USE_REALTIME_DB')
    })
    
    expect(flagValue).toBe(false)
  })
  
  test('getAllFeatureFlags returns all flags', async ({ page }) => {
    await page.goto('http://localhost:5173')
    
    const allFlags = await page.evaluate(() => {
      return window.featureFlags.getAll()
    })
    
    expect(allFlags).toHaveProperty('USE_REALTIME_DB')
    expect(allFlags).toHaveProperty('ENABLE_OT')
    expect(allFlags).toHaveProperty('ENABLE_PREDICTION')
    expect(allFlags).toHaveProperty('ENABLE_DELTA_SYNC')
  })
  
  test('enableRealtimeDB helper sets flag to true', async ({ page }) => {
    await page.goto('http://localhost:5173')
    
    await page.evaluate(() => {
      window.featureFlags.enableRealtimeDB()
    })
    
    const flagValue = await page.evaluate(() => {
      return window.featureFlags.get('USE_REALTIME_DB')
    })
    
    expect(flagValue).toBe(true)
  })
  
  test('disableRealtimeDB helper sets flag to false', async ({ page }) => {
    await page.goto('http://localhost:5173')
    
    // Enable first
    await page.evaluate(() => {
      window.featureFlags.enableRealtimeDB()
    })
    
    // Then disable
    await page.evaluate(() => {
      window.featureFlags.disableRealtimeDB()
    })
    
    const flagValue = await page.evaluate(() => {
      return window.featureFlags.get('USE_REALTIME_DB')
    })
    
    expect(flagValue).toBe(false)
  })
  
  test('Realtime DB config module can be imported', async ({ page }) => {
    await page.goto('http://localhost:5173')
    
    // Try importing the module (will fail if syntax errors)
    const moduleExists = await page.evaluate(async () => {
      try {
        const module = await import('/src/firebase/realtimeDB.js')
        return module !== null && typeof module.getCursorRef === 'function'
      } catch (e) {
        return false
      }
    })
    
    expect(moduleExists).toBe(true)
  })
  
  test('Realtime DB helper functions are defined', async ({ page }) => {
    await page.goto('http://localhost:5173')
    
    const helpersExist = await page.evaluate(async () => {
      try {
        const module = await import('/src/firebase/realtimeDB.js')
        return {
          hasCursorRef: typeof module.getCursorRef === 'function',
          hasPresenceRef: typeof module.getPresenceRef === 'function',
          hasOperationLogRef: typeof module.getOperationLogRef === 'function',
          hasEphemeralShapesRef: typeof module.getEphemeralShapesRef === 'function',
          hasActiveEditsRef: typeof module.getActiveEditsRef === 'function'
        }
      } catch (e) {
        return null
      }
    })
    
    expect(helpersExist).not.toBeNull()
    expect(helpersExist.hasCursorRef).toBe(true)
    expect(helpersExist.hasPresenceRef).toBe(true)
    expect(helpersExist.hasOperationLogRef).toBe(true)
    expect(helpersExist.hasEphemeralShapesRef).toBe(true)
    expect(helpersExist.hasActiveEditsRef).toBe(true)
  })
  
  test('Monitoring composable exports correct interface', async ({ page }) => {
    await page.goto('http://localhost:5173')
    
    const monitoringInterface = await page.evaluate(async () => {
      try {
        const module = await import('/src/composables/useRealtimeDBMonitoring.js')
        const monitoring = module.useRealtimeDBMonitoring()
        
        return {
          hasInitialize: typeof monitoring.initializeMonitoring === 'function',
          hasRecordOperation: typeof monitoring.recordOperationStart === 'function',
          hasRecordComplete: typeof monitoring.recordOperationComplete === 'function',
          hasGetSummary: typeof monitoring.getMonitoringSummary === 'function',
          hasConnectionState: monitoring.connectionState !== undefined,
          hasOperationCount: monitoring.operationCount !== undefined
        }
      } catch (e) {
        return null
      }
    })
    
    expect(monitoringInterface).not.toBeNull()
    expect(monitoringInterface.hasInitialize).toBe(true)
    expect(monitoringInterface.hasRecordOperation).toBe(true)
    expect(monitoringInterface.hasRecordComplete).toBe(true)
    expect(monitoringInterface.hasGetSummary).toBe(true)
    expect(monitoringInterface.hasConnectionState).toBe(true)
    expect(monitoringInterface.hasOperationCount).toBe(true)
  })
  
  test('Firebase config includes databaseURL', async ({ page }) => {
    await page.goto('http://localhost:5173')
    
    // Check that config.js exports realtimeDB
    const hasRealtimeDB = await page.evaluate(async () => {
      try {
        const module = await import('/src/firebase/config.js')
        return module.realtimeDB !== undefined
      } catch (e) {
        return false
      }
    })
    
    expect(hasRealtimeDB).toBe(true)
  })
  
  test('No console errors during initialization', async ({ page }) => {
    const consoleErrors = []
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })
    
    await page.goto('http://localhost:5173')
    await page.waitForTimeout(2000) // Wait for initialization
    
    // Filter out known non-critical errors
    const criticalErrors = consoleErrors.filter(err => 
      !err.includes('Firebase') || // Firebase config errors are critical
      err.includes('Realtime Database')
    )
    
    expect(criticalErrors.length).toBe(0)
  })
  
})

test.describe('PR #1: Feature Flag Rollout System', () => {
  
  test('isUserInRollout distributes users correctly', async ({ page }) => {
    await page.goto('http://localhost:5173')
    
    const rolloutResults = await page.evaluate(async () => {
      const module = await import('/src/utils/featureFlags.js')
      
      // Test 100 different user IDs
      let inRollout = 0
      for (let i = 0; i < 100; i++) {
        if (module.isUserInRollout(`user${i}`, 50)) {
          inRollout++
        }
      }
      
      return inRollout
    })
    
    // With 50% rollout, expect roughly 40-60 users (allow variance)
    expect(rolloutResults).toBeGreaterThanOrEqual(40)
    expect(rolloutResults).toBeLessThanOrEqual(60)
  })
  
  test('isUserInRollout is deterministic', async ({ page }) => {
    await page.goto('http://localhost:5173')
    
    const isDeterministic = await page.evaluate(async () => {
      const module = await import('/src/utils/featureFlags.js')
      
      const userId = 'test-user-123'
      const result1 = module.isUserInRollout(userId, 50)
      const result2 = module.isUserInRollout(userId, 50)
      const result3 = module.isUserInRollout(userId, 50)
      
      // All three should be the same
      return result1 === result2 && result2 === result3
    })
    
    expect(isDeterministic).toBe(true)
  })
  
  test('100% rollout includes all users', async ({ page }) => {
    await page.goto('http://localhost:5173')
    
    const allIncluded = await page.evaluate(async () => {
      const module = await import('/src/utils/featureFlags.js')
      
      // Test 20 different users
      for (let i = 0; i < 20; i++) {
        if (!module.isUserInRollout(`user${i}`, 100)) {
          return false
        }
      }
      return true
    })
    
    expect(allIncluded).toBe(true)
  })
  
  test('0% rollout excludes all users', async ({ page }) => {
    await page.goto('http://localhost:5173')
    
    const noneIncluded = await page.evaluate(async () => {
      const module = await import('/src/utils/featureFlags.js')
      
      // Test 20 different users
      for (let i = 0; i < 20; i++) {
        if (module.isUserInRollout(`user${i}`, 0)) {
          return false
        }
      }
      return true
    })
    
    expect(noneIncluded).toBe(true)
  })
  
})

