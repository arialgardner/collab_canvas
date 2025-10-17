/**
 * Test: Differential Sync & Delta Encoding (PR #5)
 * 
 * Validates that:
 * 1. Delta encoding calculates correct deltas
 * 2. Delta application works correctly
 * 3. Batch compression reduces size
 * 4. Size reduction is achieved
 * 5. Delta validation works
 */

import { test, expect } from '@playwright/test'

test.describe('PR #5: Delta Encoding', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.waitForTimeout(1000)
  })
  
  test('calculateDelta returns only changed fields', async ({ page }) => {
    const delta = await page.evaluate(async () => {
      const module = await import('/src/utils/deltaEncoding.js')
      
      const oldState = {
        x: 100,
        y: 200,
        width: 100,
        height: 50,
        fill: '#ff0000'
      }
      
      const newState = {
        x: 150,  // Changed
        y: 200,  // Same
        width: 100,  // Same
        height: 50,  // Same
        fill: '#ff0000'  // Same
      }
      
      return module.calculateDelta(oldState, newState)
    })
    
    // Only x should be in the delta
    expect(delta).toHaveProperty('x')
    expect(delta.x).toBe(150)
    expect(Object.keys(delta).length).toBe(1)
  })
  
  test('calculateDelta handles multiple changes', async ({ page }) => {
    const delta = await page.evaluate(async () => {
      const module = await import('/src/utils/deltaEncoding.js')
      
      const oldState = {
        x: 100,
        y: 200,
        fill: '#ff0000',
        opacity: 1
      }
      
      const newState = {
        x: 150,      // Changed
        y: 250,      // Changed
        fill: '#ff0000',  // Same
        opacity: 0.5      // Changed
      }
      
      return module.calculateDelta(oldState, newState)
    })
    
    expect(delta).toHaveProperty('x')
    expect(delta).toHaveProperty('y')
    expect(delta).toHaveProperty('opacity')
    expect(delta).not.toHaveProperty('fill')
    expect(Object.keys(delta).length).toBe(3)
  })
  
  test('calculateDelta returns empty for identical states', async ({ page }) => {
    const delta = await page.evaluate(async () => {
      const module = await import('/src/utils/deltaEncoding.js')
      
      const state = {
        x: 100,
        y: 200,
        fill: '#ff0000'
      }
      
      return module.calculateDelta(state, state)
    })
    
    expect(Object.keys(delta).length).toBe(0)
  })
  
  test('applyDelta merges delta into current state', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const module = await import('/src/utils/deltaEncoding.js')
      
      const currentState = {
        x: 100,
        y: 200,
        width: 100,
        fill: '#ff0000'
      }
      
      const delta = {
        x: 150,
        fill: '#00ff00'
      }
      
      return module.applyDelta(currentState, delta)
    })
    
    expect(result.x).toBe(150)  // Updated
    expect(result.y).toBe(200)  // Preserved
    expect(result.width).toBe(100)  // Preserved
    expect(result.fill).toBe('#00ff00')  // Updated
  })
  
  test('calculateSizeReduction shows correct reduction', async ({ page }) => {
    const reduction = await page.evaluate(async () => {
      const module = await import('/src/utils/deltaEncoding.js')
      
      const fullState = {
        x: 100,
        y: 200,
        width: 100,
        height: 50,
        fill: '#ff0000',
        stroke: '#000000',
        strokeWidth: 2,
        opacity: 1,
        rotation: 0,
        zIndex: 1
      }
      
      const delta = {
        x: 150
      }
      
      return module.calculateSizeReduction(fullState, delta)
    })
    
    expect(reduction).toHaveProperty('originalSize')
    expect(reduction).toHaveProperty('deltaSize')
    expect(reduction).toHaveProperty('reductionPercent')
    expect(reduction.deltaSize).toBeLessThan(reduction.originalSize)
    expect(reduction.reductionPercent).toBeGreaterThan(0)
  })
  
  test('invertDelta creates reverse delta', async ({ page }) => {
    const reversed = await page.evaluate(async () => {
      const module = await import('/src/utils/deltaEncoding.js')
      
      const baseState = {
        x: 100,
        y: 200
      }
      
      const delta = {
        x: 150,
        y: 250
      }
      
      return module.invertDelta(delta, baseState)
    })
    
    expect(reversed.x).toBe(100)
    expect(reversed.y).toBe(200)
  })
  
  test('mergeDeltas combines multiple deltas', async ({ page }) => {
    const merged = await page.evaluate(async () => {
      const module = await import('/src/utils/deltaEncoding.js')
      
      const delta1 = { x: 150 }
      const delta2 = { y: 250 }
      const delta3 = { fill: '#00ff00' }
      
      return module.mergeDeltas([delta1, delta2, delta3])
    })
    
    expect(merged.x).toBe(150)
    expect(merged.y).toBe(250)
    expect(merged.fill).toBe('#00ff00')
  })
  
  test('isDeltaEmpty detects empty deltas', async ({ page }) => {
    const results = await page.evaluate(async () => {
      const module = await import('/src/utils/deltaEncoding.js')
      
      return {
        empty: module.isDeltaEmpty({}),
        notEmpty: module.isDeltaEmpty({ x: 100 }),
        nullEmpty: module.isDeltaEmpty(null)
      }
    })
    
    expect(results.empty).toBe(true)
    expect(results.notEmpty).toBe(false)
    expect(results.nullEmpty).toBe(true)
  })
  
})

test.describe('PR #5: Batch Compression', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.waitForTimeout(1000)
  })
  
  test('compressBatch compresses similar shapes', async ({ page }) => {
    const compressed = await page.evaluate(async () => {
      const module = await import('/src/utils/batchCompression.js')
      
      // Create 10 similar rectangles
      const shapes = []
      for (let i = 0; i < 10; i++) {
        shapes.push({
          id: `rect_${i}`,
          type: 'rectangle',
          x: i * 100,
          y: 100,
          width: 100,
          height: 50,
          fill: '#ff0000'
        })
      }
      
      return module.compressBatch(shapes)
    })
    
    expect(compressed).not.toBeNull()
    expect(Array.isArray(compressed)).toBe(true)
    expect(compressed.length).toBeGreaterThan(0)
    
    // Should have batch type
    const batch = compressed[0]
    expect(batch.type).toBe('batch')
    expect(batch.shapeType).toBe('rectangle')
    expect(batch.baseProperties).toBeDefined()
    expect(batch.variations).toBeDefined()
  })
  
  test('decompressBatch restores original shapes', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const module = await import('/src/utils/batchCompression.js')
      
      // Create shapes
      const shapes = []
      for (let i = 0; i < 5; i++) {
        shapes.push({
          id: `rect_${i}`,
          type: 'rectangle',
          x: i * 100,
          y: 100,
          width: 100,
          height: 50,
          fill: '#ff0000'
        })
      }
      
      // Compress
      const compressed = module.compressBatch(shapes)
      
      // Decompress
      const decompressed = module.decompressBatch(compressed)
      
      return {
        originalCount: shapes.length,
        decompressedCount: decompressed.length,
        firstShape: decompressed[0],
        hasAllProperties: decompressed.every(s => 
          s.id && s.type && s.x !== undefined && s.y !== undefined
        )
      }
    })
    
    expect(result.originalCount).toBe(result.decompressedCount)
    expect(result.hasAllProperties).toBe(true)
    expect(result.firstShape).toHaveProperty('id')
    expect(result.firstShape).toHaveProperty('type')
  })
  
  test('calculateCompressionRatio shows size reduction', async ({ page }) => {
    const ratio = await page.evaluate(async () => {
      const module = await import('/src/utils/batchCompression.js')
      
      // Create 50 similar shapes
      const shapes = []
      for (let i = 0; i < 50; i++) {
        shapes.push({
          id: `rect_${i}`,
          type: 'rectangle',
          x: i * 100,
          y: 100,
          width: 100,
          height: 50,
          fill: '#ff0000',
          stroke: '#000000',
          strokeWidth: 2
        })
      }
      
      const compressed = module.compressBatch(shapes)
      return module.calculateCompressionRatio(shapes, compressed)
    })
    
    expect(ratio).toHaveProperty('originalSize')
    expect(ratio).toHaveProperty('compressedSize')
    expect(ratio).toHaveProperty('ratio')
    expect(ratio).toHaveProperty('savedBytes')
    expect(ratio.compressedSize).toBeLessThan(ratio.originalSize)
    expect(ratio.ratio).toBeGreaterThan(0)
  })
  
  test('shouldCompressBatch returns false for small batches', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const module = await import('/src/utils/batchCompression.js')
      
      const smallBatch = [
        { id: '1', type: 'rectangle', x: 0, y: 0 },
        { id: '2', type: 'rectangle', x: 100, y: 0 }
      ]
      
      const largeBatch = []
      for (let i = 0; i < 20; i++) {
        largeBatch.push({ id: `${i}`, type: 'rectangle', x: i * 100, y: 0 })
      }
      
      return {
        small: module.shouldCompressBatch(smallBatch),
        large: module.shouldCompressBatch(largeBatch)
      }
    })
    
    expect(result.small).toBe(false)
    expect(result.large).toBe(true)
  })
  
  test('compressCreateBatch creates compact format', async ({ page }) => {
    const operation = await page.evaluate(async () => {
      const module = await import('/src/utils/batchCompression.js')
      
      const positions = []
      for (let i = 0; i < 100; i++) {
        positions.push([i * 100, 100])
      }
      
      return module.compressCreateBatch('rectangle', {
        width: 100,
        height: 50,
        fill: '#ff0000'
      }, positions)
    })
    
    expect(operation.type).toBe('createBatch')
    expect(operation.shapeType).toBe('rectangle')
    expect(operation.baseProperties).toBeDefined()
    expect(operation.positions).toBeDefined()
    expect(operation.count).toBe(100)
    expect(operation.positions.length).toBe(100)
  })
  
  test('No errors when importing differential sync modules', async ({ page }) => {
    const errors = []
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })
    
    await page.evaluate(async () => {
      try {
        await import('/src/utils/deltaEncoding.js')
        await import('/src/utils/batchCompression.js')
        return true
      } catch (e) {
        console.error('Import error:', e)
        return false
      }
    })
    
    await page.waitForTimeout(1000)
    
    const criticalErrors = errors.filter(err => 
      err.includes('delta') || err.includes('batch') || err.includes('compression')
    )
    
    expect(criticalErrors.length).toBe(0)
  })
  
})

