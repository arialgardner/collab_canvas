/**
 * Test: Extended OT for Size, Rotation, Style (PR #8)
 * 
 * Validates:
 * 1. Size transforms are multiplicative
 * 2. Rotation transforms are additive (wrapped)
 * 3. Style transforms use last-write-wins
 * 4. Composite transforms work correctly
 */

import { test, expect } from '@playwright/test'

test.describe('PR #8: Extended OT - Size Transform', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.waitForTimeout(1000)
  })
  
  test('transformSize applies both scale factors (multiplicative)', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const module = await import('/src/utils/operationalTransform.js')
      
      // User A scales width 2x (100 → 200)
      const opA = {
        type: 'update',
        delta: { width: 200 },
        baseState: { width: 100 },
        timestamp: Date.now()
      }
      
      // User B scales width 1.5x (100 → 150) concurrently
      const opB = {
        type: 'update',
        delta: { width: 150 },
        baseState: { width: 100 },
        timestamp: Date.now() + 100
      }
      
      const transformed = module.transformSize(opA, opB)
      return transformed.delta.width
    })
    
    // Combined scale: 2.0 × 1.5 = 3.0
    // Final width: 100 × 3.0 = 300
    expect(result).toBeCloseTo(300, 1)
  })
  
  test('transformSize handles height scaling', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const module = await import('/src/utils/operationalTransform.js')
      
      const opA = {
        type: 'update',
        delta: { height: 100 },
        baseState: { height: 50 },
        timestamp: Date.now()
      }
      
      const opB = {
        type: 'update',
        delta: { height: 75 },
        baseState: { height: 50 },
        timestamp: Date.now() + 100
      }
      
      const transformed = module.transformSize(opA, opB)
      return transformed.delta.height
    })
    
    // Scale A: 2.0x, Scale B: 1.5x
    // Combined: 50 × 2.0 × 1.5 = 150
    expect(result).toBeCloseTo(150, 1)
  })
  
  test('transformSize handles radius for circles', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const module = await import('/src/utils/operationalTransform.js')
      
      const opA = {
        type: 'update',
        delta: { radius: 100 },
        baseState: { radius: 50 },
        timestamp: Date.now()
      }
      
      const opB = {
        type: 'update',
        delta: { radius: 60 },
        baseState: { radius: 50 },
        timestamp: Date.now() + 100
      }
      
      const transformed = module.transformSize(opA, opB)
      return transformed.delta.radius
    })
    
    // Scale A: 2.0x, Scale B: 1.2x
    // Combined: 50 × 2.0 × 1.2 = 120
    expect(result).toBeCloseTo(120, 1)
  })
  
})

test.describe('PR #8: Extended OT - Rotation Transform', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.waitForTimeout(1000)
  })
  
  test('transformRotation adds both rotations', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const module = await import('/src/utils/operationalTransform.js')
      
      // User A rotates 45 degrees
      const opA = {
        type: 'update',
        delta: { rotation: 45 },
        baseState: { rotation: 0 },
        timestamp: Date.now()
      }
      
      // User B rotates 30 degrees concurrently
      const opB = {
        type: 'update',
        delta: { rotation: 30 },
        baseState: { rotation: 0 },
        timestamp: Date.now() + 100
      }
      
      const transformed = module.transformRotation(opA, opB)
      return transformed.delta.rotation
    })
    
    // Combined: 0 + 45 + 30 = 75
    expect(result).toBe(75)
  })
  
  test('transformRotation wraps around 360 degrees', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const module = await import('/src/utils/operationalTransform.js')
      
      // User A rotates to 350 degrees
      const opA = {
        type: 'update',
        delta: { rotation: 350 },
        baseState: { rotation: 0 },
        timestamp: Date.now()
      }
      
      // User B rotates to 30 degrees concurrently
      const opB = {
        type: 'update',
        delta: { rotation: 30 },
        baseState: { rotation: 0 },
        timestamp: Date.now() + 100
      }
      
      const transformed = module.transformRotation(opA, opB)
      return transformed.delta.rotation
    })
    
    // Combined: 0 + 350 + 30 = 380 → wraps to 20
    expect(result).toBe(20)
  })
  
  test('transformRotation handles negative rotations', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const module = await import('/src/utils/operationalTransform.js')
      
      // User A rotates -45 degrees
      const opA = {
        type: 'update',
        delta: { rotation: 315 }, // -45 normalized
        baseState: { rotation: 0 },
        timestamp: Date.now()
      }
      
      // User B rotates 45 degrees
      const opB = {
        type: 'update',
        delta: { rotation: 45 },
        baseState: { rotation: 0 },
        timestamp: Date.now() + 100
      }
      
      const transformed = module.transformRotation(opA, opB)
      return transformed.delta.rotation
    })
    
    // Combined: 0 + 315 + 45 = 360 → wraps to 0
    expect(result).toBe(0)
  })
  
})

test.describe('PR #8: Extended OT - Style Transform', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.waitForTimeout(1000)
  })
  
  test('transformStyle uses last-write-wins', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const module = await import('/src/utils/operationalTransform.js')
      
      // User A changes color to red
      const opA = {
        type: 'update',
        delta: { fill: '#ff0000' },
        timestamp: Date.now()
      }
      
      // User B changes color to blue (later)
      const opB = {
        type: 'update',
        delta: { fill: '#0000ff' },
        timestamp: Date.now() + 100
      }
      
      const transformed = module.transformStyle(opA, opB)
      return transformed.delta.fill
    })
    
    // Later timestamp wins (B)
    expect(result).toBe('#0000ff')
  })
  
})

test.describe('PR #8: Extended OT - Composite Transforms', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.waitForTimeout(1000)
  })
  
  test('Composite transform handles position + size', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const module = await import('/src/utils/operationalTransform.js')
      
      // User A moves and resizes
      const opA = {
        type: 'update',
        shapeId: 'rect_1',
        delta: { x: 150, width: 200 },
        baseState: { x: 100, width: 100 },
        timestamp: Date.now()
      }
      
      // User B moves and resizes concurrently
      const opB = {
        type: 'update',
        shapeId: 'rect_1',
        delta: { y: 250, width: 150 },
        baseState: { y: 200, width: 100 },
        timestamp: Date.now() + 100
      }
      
      const transformed = module.transform(opA, opB)
      return transformed ? transformed.delta : null
    })
    
    // Position should be additive, size multiplicative
    expect(result).not.toBeNull()
    expect(result).toHaveProperty('x')
    expect(result).toHaveProperty('y')
    expect(result).toHaveProperty('width')
  })
  
  test('Composite transform handles position + rotation', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const module = await import('/src/utils/operationalTransform.js')
      
      // User A moves and rotates
      const opA = {
        type: 'update',
        shapeId: 'rect_1',
        delta: { x: 150, rotation: 45 },
        baseState: { x: 100, rotation: 0 },
        timestamp: Date.now()
      }
      
      // User B moves and rotates concurrently
      const opB = {
        type: 'update',
        shapeId: 'rect_1',
        delta: { y: 250, rotation: 30 },
        baseState: { y: 200, rotation: 0 },
        timestamp: Date.now() + 100
      }
      
      const transformed = module.transform(opA, opB)
      return transformed ? transformed.delta : null
    })
    
    // Both position and rotation should be additive
    expect(result).not.toBeNull()
    expect(result).toHaveProperty('x')
    expect(result).toHaveProperty('y')
    expect(result).toHaveProperty('rotation')
  })
  
  test('No errors when importing extended OT', async ({ page }) => {
    const errors = []
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })
    
    await page.evaluate(async () => {
      try {
        const module = await import('/src/utils/operationalTransform.js')
        // Test all new functions exist
        return {
          hasSize: typeof module.transformSize === 'function',
          hasRotation: typeof module.transformRotation === 'function',
          hasStyle: typeof module.transformStyle === 'function'
        }
      } catch (e) {
        console.error('Import error:', e)
        return null
      }
    })
    
    await page.waitForTimeout(1000)
    
    const criticalErrors = errors.filter(err => 
      err.includes('transform') || err.includes('OT')
    )
    
    expect(criticalErrors.length).toBe(0)
  })
  
})

