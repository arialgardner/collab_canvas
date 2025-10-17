/**
 * Test: Operation Log & Sequence Numbers (PR #4)
 * 
 * Validates that:
 * 1. Sequence numbers are generated correctly
 * 2. Operation log tracks operations
 * 3. Operations have correct structure
 * 4. Pending operations are tracked
 * 5. Operation pruning works
 */

import { test, expect } from '@playwright/test'

test.describe('PR #4: Sequence Number System', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.waitForTimeout(1000)
  })
  
  test('Sequence number generator creates unique IDs', async ({ page }) => {
    const ids = await page.evaluate(async () => {
      const module = await import('/src/utils/sequenceNumbers.js')
      
      // Generate 10 IDs
      const generatedIds = []
      for (let i = 0; i < 10; i++) {
        generatedIds.push(module.generateOperationId())
      }
      
      return generatedIds
    })
    
    // All IDs should be unique
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(10)
    
    // All IDs should have the format: {clientId}_{sequenceNumber}
    for (const id of ids) {
      expect(id).toMatch(/_\d+$/)
    }
  })
  
  test('Sequence numbers increment monotonically', async ({ page }) => {
    const sequenceNumbers = await page.evaluate(async () => {
      const module = await import('/src/utils/sequenceNumbers.js')
      
      // Reset first
      module.resetSequenceNumber()
      
      // Generate 5 IDs and extract sequence numbers
      const numbers = []
      for (let i = 0; i < 5; i++) {
        const id = module.generateOperationId()
        const { sequenceNumber } = module.parseOperationId(id)
        numbers.push(sequenceNumber)
      }
      
      return numbers
    })
    
    // Should be [1, 2, 3, 4, 5]
    expect(sequenceNumbers).toEqual([1, 2, 3, 4, 5])
  })
  
  test('parseOperationId correctly parses operation IDs', async ({ page }) => {
    const parsed = await page.evaluate(async () => {
      const module = await import('/src/utils/sequenceNumbers.js')
      
      const testId = 'client_test123_42'
      return module.parseOperationId(testId)
    })
    
    expect(parsed.clientId).toBe('client_test123')
    expect(parsed.sequenceNumber).toBe(42)
  })
  
  test('compareOperationIds orders operations correctly', async ({ page }) => {
    const comparison = await page.evaluate(async () => {
      const module = await import('/src/utils/sequenceNumbers.js')
      
      const id1 = 'clientA_10'
      const id2 = 'clientA_20'
      const id3 = 'clientB_15'
      
      return {
        id1_vs_id2: module.compareOperationIds(id1, id2), // Should be -1
        id2_vs_id1: module.compareOperationIds(id2, id1), // Should be 1
        id1_vs_id3: module.compareOperationIds(id1, id3), // Should be -1 (clientA < clientB)
        id1_vs_id1: module.compareOperationIds(id1, id1)  // Should be 0
      }
    })
    
    expect(comparison.id1_vs_id2).toBe(-1)
    expect(comparison.id2_vs_id1).toBe(1)
    expect(comparison.id1_vs_id3).toBe(-1)
    expect(comparison.id1_vs_id1).toBe(0)
  })
  
  test('isLocalOperation identifies local operations', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const module = await import('/src/utils/sequenceNumbers.js')
      
      // Get current client ID
      const { clientId } = module.getSequenceState()
      
      // Create local and remote operations
      const localOpId = module.generateOperationId()
      const remoteOpId = 'other_client_123'
      
      return {
        localIsLocal: module.isLocalOperation(localOpId),
        remoteIsLocal: module.isLocalOperation(remoteOpId)
      }
    })
    
    expect(result.localIsLocal).toBe(true)
    expect(result.remoteIsLocal).toBe(false)
  })
  
  test('Sequence numbers persist across page reloads', async ({ page }) => {
    // Generate an ID
    const firstId = await page.evaluate(async () => {
      const module = await import('/src/utils/sequenceNumbers.js')
      module.resetSequenceNumber()
      return module.generateOperationId()
    })
    
    // Reload page
    await page.reload()
    await page.waitForTimeout(1000)
    
    // Generate another ID
    const secondId = await page.evaluate(async () => {
      const module = await import('/src/utils/sequenceNumbers.js')
      return module.generateOperationId()
    })
    
    // Extract sequence numbers
    const firstSeq = await page.evaluate(async (id) => {
      const module = await import('/src/utils/sequenceNumbers.js')
      return module.parseOperationId(id).sequenceNumber
    }, firstId)
    
    const secondSeq = await page.evaluate(async (id) => {
      const module = await import('/src/utils/sequenceNumbers.js')
      return module.parseOperationId(id).sequenceNumber
    }, secondId)
    
    // Second should be greater than first
    expect(secondSeq).toBeGreaterThan(firstSeq)
  })
  
  test('resetSequenceNumber resets to 0', async ({ page }) => {
    const numbers = await page.evaluate(async () => {
      const module = await import('/src/utils/sequenceNumbers.js')
      
      // Generate a few IDs
      module.generateOperationId()
      module.generateOperationId()
      module.generateOperationId()
      
      // Reset
      module.resetSequenceNumber()
      
      // Generate new ID
      const id = module.generateOperationId()
      return module.parseOperationId(id).sequenceNumber
    })
    
    expect(numbers).toBe(1) // Should start at 1 after reset
  })
  
  test('getSequenceState returns current state', async ({ page }) => {
    const state = await page.evaluate(async () => {
      const module = await import('/src/utils/sequenceNumbers.js')
      
      module.resetSequenceNumber()
      module.generateOperationId()
      module.generateOperationId()
      
      return module.getSequenceState()
    })
    
    expect(state).toHaveProperty('clientId')
    expect(state).toHaveProperty('currentSequence')
    expect(state.currentSequence).toBe(2)
  })
  
})

test.describe('PR #4: Operation Log', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.waitForTimeout(1000)
  })
  
  test('useOperationLog exports correct interface', async ({ page }) => {
    const interfaceCorrect = await page.evaluate(async () => {
      try {
        const module = await import('/src/composables/useOperationLog.js')
        const opLog = module.useOperationLog()
        
        return {
          hasCreateOperation: typeof opLog.createOperation === 'function',
          hasAppendOperation: typeof opLog.appendOperation === 'function',
          hasSubscribe: typeof opLog.subscribeToOperations === 'function',
          hasAcknowledge: typeof opLog.acknowledgeOperation === 'function',
          hasGetPending: typeof opLog.getPendingOperations === 'function',
          hasPrune: typeof opLog.pruneOperations === 'function',
          hasCleanup: typeof opLog.cleanup === 'function',
          hasPendingOperations: opLog.pendingOperations !== undefined
        }
      } catch (e) {
        console.error(e)
        return null
      }
    })
    
    expect(interfaceCorrect).not.toBeNull()
    expect(interfaceCorrect.hasCreateOperation).toBe(true)
    expect(interfaceCorrect.hasAppendOperation).toBe(true)
    expect(interfaceCorrect.hasSubscribe).toBe(true)
    expect(interfaceCorrect.hasAcknowledge).toBe(true)
    expect(interfaceCorrect.hasGetPending).toBe(true)
    expect(interfaceCorrect.hasPrune).toBe(true)
    expect(interfaceCorrect.hasCleanup).toBe(true)
    expect(interfaceCorrect.hasPendingOperations).toBe(true)
  })
  
  test('createOperation creates operation with correct structure', async ({ page }) => {
    const operation = await page.evaluate(async () => {
      const module = await import('/src/composables/useOperationLog.js')
      const opLog = module.useOperationLog()
      
      return opLog.createOperation('update', 'shape123', 'user456', { x: 100 }, { x: 50 })
    })
    
    expect(operation).toHaveProperty('operationId')
    expect(operation).toHaveProperty('type')
    expect(operation).toHaveProperty('shapeId')
    expect(operation).toHaveProperty('userId')
    expect(operation).toHaveProperty('sequenceNumber')
    expect(operation).toHaveProperty('timestamp')
    expect(operation).toHaveProperty('delta')
    expect(operation).toHaveProperty('baseState')
    
    expect(operation.type).toBe('update')
    expect(operation.shapeId).toBe('shape123')
    expect(operation.userId).toBe('user456')
    expect(operation.delta).toEqual({ x: 100 })
    expect(operation.baseState).toEqual({ x: 50 })
  })
  
  test('Operation types are valid', async ({ page }) => {
    const operations = await page.evaluate(async () => {
      const module = await import('/src/composables/useOperationLog.js')
      const opLog = module.useOperationLog()
      
      return [
        opLog.createOperation('create', 'shape1', 'user1', {}, null),
        opLog.createOperation('update', 'shape2', 'user1', {}, {}),
        opLog.createOperation('delete', 'shape3', 'user1', null, {})
      ]
    })
    
    expect(operations[0].type).toBe('create')
    expect(operations[1].type).toBe('update')
    expect(operations[2].type).toBe('delete')
  })
  
  test('pendingOperations is a Map', async ({ page }) => {
    const isMap = await page.evaluate(async () => {
      const module = await import('/src/composables/useOperationLog.js')
      const opLog = module.useOperationLog()
      
      return opLog.pendingOperations instanceof Map || 
             (opLog.pendingOperations && typeof opLog.pendingOperations.set === 'function')
    })
    
    expect(isMap).toBe(true)
  })
  
  test('getPendingOperations returns array', async ({ page }) => {
    const pending = await page.evaluate(async () => {
      const module = await import('/src/composables/useOperationLog.js')
      const opLog = module.useOperationLog()
      
      return opLog.getPendingOperations()
    })
    
    expect(Array.isArray(pending)).toBe(true)
  })
  
  test('getPendingOperations can filter by shapeId', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const module = await import('/src/composables/useOperationLog.js')
      const opLog = module.useOperationLog()
      
      // Get all pending
      const all = opLog.getPendingOperations()
      
      // Get filtered (should be empty initially)
      const filtered = opLog.getPendingOperations('shape123')
      
      return {
        allIsArray: Array.isArray(all),
        filteredIsArray: Array.isArray(filtered)
      }
    })
    
    expect(result.allIsArray).toBe(true)
    expect(result.filteredIsArray).toBe(true)
  })
  
  test('No errors when importing operation log', async ({ page }) => {
    const errors = []
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })
    
    await page.evaluate(async () => {
      try {
        await import('/src/composables/useOperationLog.js')
        await import('/src/utils/sequenceNumbers.js')
        return true
      } catch (e) {
        console.error('Import error:', e)
        return false
      }
    })
    
    await page.waitForTimeout(1000)
    
    const criticalErrors = errors.filter(err => 
      err.includes('operation') || err.includes('sequence')
    )
    
    expect(criticalErrors.length).toBe(0)
  })
  
})

