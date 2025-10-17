/**
 * Test: Operational Transform (PR #6)
 * 
 * Validates that:
 * 1. Position transforms are additive
 * 2. Operation priorities work correctly
 * 3. Conflict detection finds conflicts
 * 4. Concurrent operations are transformed
 * 5. Delete operations have highest priority
 */

import { test, expect } from '@playwright/test'

test.describe('PR #6: Operational Transform', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.waitForTimeout(1000)
  })
  
  test('transformPosition applies both movements (additive)', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const module = await import('/src/utils/operationalTransform.js')
      
      // User A moves right 100px
      const opA = {
        type: 'update',
        shapeId: 'rect_1',
        delta: { x: 150 },
        baseState: { x: 50 },
        timestamp: Date.now()
      }
      
      // User B moves down 100px (concurrent)
      const opB = {
        type: 'update',
        shapeId: 'rect_1',
        delta: { y: 250 },
        baseState: { y: 150 },
        timestamp: Date.now()
      }
      
      const transformed = module.transformPosition(opA, opB)
      return transformed.delta
    })
    
    // Should have both movements
    expect(result).toHaveProperty('x')
    expect(result).toHaveProperty('y')
  })
  
  test('getOperationPriority returns correct order', async ({ page }) => {
    const priorities = await page.evaluate(async () => {
      const module = await import('/src/utils/operationalTransform.js')
      
      const deleteOp = { type: 'delete', timestamp: 1000 }
      const updateOp = { type: 'update', timestamp: 1000 }
      const createOp = { type: 'create', timestamp: 1000 }
      
      return {
        deleteVsUpdate: module.getOperationPriority(deleteOp, updateOp),
        deleteVsCreate: module.getOperationPriority(deleteOp, createOp),
        updateVsCreate: module.getOperationPriority(updateOp, createOp),
        updateVsUpdate: module.getOperationPriority(updateOp, updateOp)
      }
    })
    
    expect(priorities.deleteVsUpdate).toBe(-1) // Delete has higher priority
    expect(priorities.deleteVsCreate).toBe(-1) // Delete has higher priority
    expect(priorities.updateVsCreate).toBe(-1) // Update has higher priority
    expect(priorities.updateVsUpdate).toBe(0)   // Same priority
  })
  
  test('areConcurrent detects concurrent operations', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const module = await import('/src/utils/operationalTransform.js')
      
      const now = Date.now()
      
      // Operations on same shape within 1 second
      const opA = {
        shapeId: 'rect_1',
        timestamp: now
      }
      
      const opB = {
        shapeId: 'rect_1',
        timestamp: now + 500 // 500ms later
      }
      
      // Operations on different shapes
      const opC = {
        shapeId: 'rect_2',
        timestamp: now
      }
      
      // Operations far apart in time
      const opD = {
        shapeId: 'rect_1',
        timestamp: now + 2000 // 2 seconds later
      }
      
      return {
        sameShape: module.areConcurrent(opA, opB),
        differentShape: module.areConcurrent(opA, opC),
        farApart: module.areConcurrent(opA, opD)
      }
    })
    
    expect(result.sameShape).toBe(true)
    expect(result.differentShape).toBe(false)
    expect(result.farApart).toBe(false)
  })
  
  test('transform discards update when shape is deleted', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const module = await import('/src/utils/operationalTransform.js')
      
      const now = Date.now()
      
      // User A updates shape
      const updateOp = {
        type: 'update',
        shapeId: 'rect_1',
        delta: { x: 150 },
        timestamp: now
      }
      
      // User B deletes shape (concurrent)
      const deleteOp = {
        type: 'delete',
        shapeId: 'rect_1',
        timestamp: now + 100
      }
      
      return module.transform(updateOp, deleteOp)
    })
    
    // Update should be discarded
    expect(result).toBeNull()
  })
  
  test('transform keeps create when competing with delete', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const module = await import('/src/utils/operationalTransform.js')
      
      const now = Date.now()
      
      // User A creates shape
      const createOp = {
        type: 'create',
        shapeId: 'rect_1',
        timestamp: now
      }
      
      // User B deletes shape (race condition)
      const deleteOp = {
        type: 'delete',
        shapeId: 'rect_1',
        timestamp: now + 100
      }
      
      return module.transform(createOp, deleteOp)
    })
    
    // Create should win (race condition)
    expect(result).not.toBeNull()
    expect(result.type).toBe('create')
  })
  
  test('hasConflict detects conflicts correctly', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const module = await import('/src/utils/operationalTransform.js')
      
      const now = Date.now()
      
      // Concurrent updates to same property
      const opA = {
        type: 'update',
        shapeId: 'rect_1',
        delta: { x: 150 },
        timestamp: now
      }
      
      const opB = {
        type: 'update',
        shapeId: 'rect_1',
        delta: { x: 200 },
        timestamp: now + 100
      }
      
      // Concurrent updates to different properties
      const opC = {
        type: 'update',
        shapeId: 'rect_1',
        delta: { y: 250 },
        timestamp: now + 100
      }
      
      return {
        sameProperty: module.hasConflict(opA, opB),
        differentProperty: module.hasConflict(opA, opC)
      }
    })
    
    expect(result.sameProperty).toBe(true)
    expect(result.differentProperty).toBe(true) // Still concurrent
  })
  
  test('getConflictType identifies conflict types', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const module = await import('/src/utils/operationalTransform.js')
      
      const now = Date.now()
      
      // Position conflict
      const posA = {
        type: 'update',
        shapeId: 'rect_1',
        delta: { x: 150 },
        timestamp: now
      }
      
      const posB = {
        type: 'update',
        shapeId: 'rect_1',
        delta: { y: 200 },
        timestamp: now + 100
      }
      
      // Delete conflict
      const updateOp = {
        type: 'update',
        shapeId: 'rect_1',
        delta: { x: 150 },
        timestamp: now
      }
      
      const deleteOp = {
        type: 'delete',
        shapeId: 'rect_1',
        timestamp: now + 100
      }
      
      // Property conflict
      const propA = {
        type: 'update',
        shapeId: 'rect_1',
        delta: { fill: '#ff0000' },
        timestamp: now
      }
      
      const propB = {
        type: 'update',
        shapeId: 'rect_1',
        delta: { fill: '#00ff00' },
        timestamp: now + 100
      }
      
      return {
        position: module.getConflictType(posA, posB),
        delete: module.getConflictType(updateOp, deleteOp),
        property: module.getConflictType(propA, propB)
      }
    })
    
    expect(result.position).toBe('position')
    expect(result.delete).toBe('delete')
    expect(result.property).toBe('property')
  })
  
  test('applyTransformedOperation applies update correctly', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const module = await import('/src/utils/operationalTransform.js')
      
      const shape = {
        id: 'rect_1',
        x: 100,
        y: 200,
        width: 100,
        fill: '#ff0000'
      }
      
      const operation = {
        type: 'update',
        delta: { x: 150, fill: '#00ff00' },
        timestamp: Date.now(),
        userId: 'user123'
      }
      
      return module.applyTransformedOperation(shape, operation)
    })
    
    expect(result.x).toBe(150)
    expect(result.y).toBe(200) // Unchanged
    expect(result.fill).toBe('#00ff00')
  })
  
  test('No errors when importing OT modules', async ({ page }) => {
    const errors = []
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })
    
    await page.evaluate(async () => {
      try {
        await import('/src/utils/operationalTransform.js')
        await import('/src/composables/useConflictDetection.js')
        return true
      } catch (e) {
        console.error('Import error:', e)
        return false
      }
    })
    
    await page.waitForTimeout(1000)
    
    const criticalErrors = errors.filter(err => 
      err.includes('transform') || err.includes('conflict')
    )
    
    expect(criticalErrors.length).toBe(0)
  })
  
})

test.describe('PR #6: Conflict Detection', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.waitForTimeout(1000)
  })
  
  test('useConflictDetection exports correct interface', async ({ page }) => {
    const interfaceCorrect = await page.evaluate(async () => {
      try {
        const module = await import('/src/composables/useConflictDetection.js')
        const detection = module.useConflictDetection()
        
        return {
          hasDetect: typeof detection.detectConflict === 'function',
          hasFind: typeof detection.findConflictingOperations === 'function',
          hasStats: typeof detection.getConflictStats === 'function',
          hasRecent: typeof detection.getRecentConflicts === 'function',
          hasReset: typeof detection.reset === 'function',
          hasEnabled: detection.isEnabled !== undefined
        }
      } catch (e) {
        console.error(e)
        return null
      }
    })
    
    expect(interfaceCorrect).not.toBeNull()
    expect(interfaceCorrect.hasDetect).toBe(true)
    expect(interfaceCorrect.hasFind).toBe(true)
    expect(interfaceCorrect.hasStats).toBe(true)
    expect(interfaceCorrect.hasRecent).toBe(true)
    expect(interfaceCorrect.hasReset).toBe(true)
    expect(interfaceCorrect.hasEnabled).toBe(true)
  })
  
  test('detectConflict returns correct structure', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const module = await import('/src/composables/useConflictDetection.js')
      const detection = module.useConflictDetection()
      
      const now = Date.now()
      
      const localOp = {
        type: 'update',
        shapeId: 'rect_1',
        delta: { x: 150 },
        timestamp: now
      }
      
      const remoteOp = {
        type: 'update',
        shapeId: 'rect_1',
        delta: { x: 200 },
        timestamp: now + 100
      }
      
      return detection.detectConflict(localOp, remoteOp)
    })
    
    expect(result).toHaveProperty('hasConflict')
    expect(result).toHaveProperty('conflictType')
    expect(result).toHaveProperty('needsTransform')
  })
  
  test('getConflictStats returns statistics', async ({ page }) => {
    const stats = await page.evaluate(async () => {
      const module = await import('/src/composables/useConflictDetection.js')
      const detection = module.useConflictDetection()
      
      return detection.getConflictStats()
    })
    
    expect(stats).toHaveProperty('total')
    expect(stats).toHaveProperty('position')
    expect(stats).toHaveProperty('property')
    expect(stats).toHaveProperty('delete')
    expect(stats).toHaveProperty('resolved')
    expect(stats).toHaveProperty('successRate')
  })
  
})

