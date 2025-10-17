/**
 * Regression test for viewport culling bug with new shapes
 * 
 * Bug: Newly created rectangles and circles do not appear on the canvas
 * until the user zooms in or out. This was caused by the viewport culling
 * not updating when new shapes were added to the canvas.
 * 
 * Root Cause: The visibleShapeIds Set was only updated during pan/zoom events,
 * not when the shapes array changed. New shapes were added to the shapes Map
 * but weren't in the visibleShapeIds Set, so they were filtered out by the
 * viewport culling logic.
 * 
 * Fix: Added a watch() on shapesList that calls updateVisibleShapes() whenever
 * shapes are added or removed (when there are 100+ shapes).
 * 
 * Expected: New shapes appear immediately when created, without requiring zoom.
 */

import { test, expect } from '@playwright/test'

test.describe('Viewport Culling - New Shapes Visibility Bug', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173')
    
    // Login
    await page.getByPlaceholder('Enter your email').fill('test@example.com')
    await page.getByPlaceholder('Enter your password').fill('password123')
    await page.getByRole('button', { name: /sign in/i }).click()
    
    // Wait for dashboard
    await page.waitForURL(/\/dashboard/)
    
    // Create or open a canvas
    const createButton = page.getByRole('button', { name: /create canvas/i })
    if (await createButton.isVisible()) {
      await createButton.click()
      await page.getByPlaceholder('Enter canvas name').fill('Test Canvas')
      await page.getByRole('button', { name: /create/i }).click()
    } else {
      // Click first canvas
      await page.locator('.canvas-card').first().click()
    }
    
    // Wait for canvas view
    await page.waitForURL(/\/canvas\//)
    await page.waitForTimeout(1000)
  })

  test('newly created rectangle should appear immediately without zoom', async ({ page }) => {
    // Select rectangle tool
    await page.getByRole('button', { name: /rectangle/i }).click()
    
    // Click on canvas to create rectangle
    const canvas = page.locator('canvas').first()
    await canvas.click({ position: { x: 300, y: 300 } })
    
    // Wait a moment for creation
    await page.waitForTimeout(500)
    
    // Verify rectangle exists in Konva stage (without zooming)
    const rectangleVisible = await page.evaluate(() => {
      const stage = window.__TEST_STAGE__ || {}
      const layer = stage.children?.[0]
      if (!layer) return false
      
      const shapes = layer.children || []
      const rectangles = shapes.filter(s => s.className === 'Rect')
      
      return rectangles.length > 0 && rectangles.some(r => r.visible())
    })
    
    expect(rectangleVisible).toBe(true)
  })

  test('newly created circle should appear immediately without zoom', async ({ page }) => {
    // Select circle tool
    await page.getByRole('button', { name: /circle/i }).click()
    
    // Click on canvas to create circle
    const canvas = page.locator('canvas').first()
    await canvas.click({ position: { x: 400, y: 400 } })
    
    // Wait a moment for creation
    await page.waitForTimeout(500)
    
    // Verify circle exists and is visible in Konva stage (without zooming)
    const circleVisible = await page.evaluate(() => {
      const stage = window.__TEST_STAGE__ || {}
      const layer = stage.children?.[0]
      if (!layer) return false
      
      const shapes = layer.children || []
      const circles = shapes.filter(s => s.className === 'Circle')
      
      return circles.length > 0 && circles.some(c => c.visible())
    })
    
    expect(circleVisible).toBe(true)
  })

  test('multiple newly created shapes should all appear immediately', async ({ page }) => {
    // Create multiple rectangles
    await page.getByRole('button', { name: /rectangle/i }).click()
    
    const canvas = page.locator('canvas').first()
    const positions = [
      { x: 200, y: 200 },
      { x: 400, y: 200 },
      { x: 600, y: 200 }
    ]
    
    for (const pos of positions) {
      await canvas.click({ position: pos })
      await page.waitForTimeout(300)
    }
    
    // Verify all 3 rectangles are visible
    const allVisible = await page.evaluate(() => {
      const stage = window.__TEST_STAGE__ || {}
      const layer = stage.children?.[0]
      if (!layer) return false
      
      const shapes = layer.children || []
      const rectangles = shapes.filter(s => s.className === 'Rect')
      
      // Should have 3 rectangles, all visible
      return rectangles.length === 3 && rectangles.every(r => r.visible())
    })
    
    expect(allVisible).toBe(true)
  })

  test('new shapes should appear for other users without zoom', async ({ browser, page }) => {
    // Get canvas URL
    const canvasUrl = page.url()
    const canvasId = canvasUrl.split('/canvas/')[1]
    
    // Open second browser context (second user)
    const context2 = await browser.newContext()
    const page2 = await context2.newPage()
    
    try {
      // User 2 login
      await page2.goto('http://localhost:5173')
      await page2.getByPlaceholder('Enter your email').fill('user2@example.com')
      await page2.getByPlaceholder('Enter your password').fill('password123')
      await page2.getByRole('button', { name: /sign in/i }).click()
      await page2.waitForURL(/\/dashboard/)
      
      // Navigate to same canvas
      await page2.goto(`http://localhost:5173/canvas/${canvasId}`)
      await page2.waitForTimeout(2000)
      
      // User 1 creates a rectangle
      await page.getByRole('button', { name: /rectangle/i }).click()
      const canvas1 = page.locator('canvas').first()
      await canvas1.click({ position: { x: 500, y: 500 } })
      
      // Wait for real-time sync
      await page2.waitForTimeout(2000)
      
      // User 2 should see the new rectangle WITHOUT zooming
      const rectangleVisibleForUser2 = await page2.evaluate(() => {
        const stage = window.__TEST_STAGE__ || {}
        const layer = stage.children?.[0]
        if (!layer) return false
        
        const shapes = layer.children || []
        const rectangles = shapes.filter(s => s.className === 'Rect')
        
        return rectangles.length > 0 && rectangles.some(r => r.visible())
      })
      
      expect(rectangleVisibleForUser2).toBe(true)
      
    } finally {
      await context2.close()
    }
  })

  test('viewport culling should work correctly with 100+ shapes', async ({ page }) => {
    // This test creates 100+ shapes to trigger viewport culling,
    // then verifies new shapes still appear
    
    // Note: This is a longer test, so skip in quick runs
    test.skip(process.env.QUICK_TEST === 'true', 'Skipping 100+ shapes test in quick mode')
    
    // Select rectangle tool
    await page.getByRole('button', { name: /rectangle/i }).click()
    
    const canvas = page.locator('canvas').first()
    
    // Create 101 rectangles in a grid pattern
    // console.log('Creating 101 rectangles to test viewport culling...')
    for (let i = 0; i < 101; i++) {
      const x = 100 + (i % 10) * 150
      const y = 100 + Math.floor(i / 10) * 150
      await canvas.click({ position: { x, y } })
      
      // Speed up creation (don't wait as long)
      if (i % 10 === 0) {
        await page.waitForTimeout(500)
        // console.log(`Created ${i + 1} rectangles...`)
      }
    }
    
    // console.log('All 101 rectangles created')
    
    // Wait for all shapes to sync
    await page.waitForTimeout(2000)
    
    // Verify shape count
    const shapeCount = await page.evaluate(() => {
      const stage = window.__TEST_STAGE__ || {}
      const layer = stage.children?.[0]
      return layer?.children?.length || 0
    })
    
    expect(shapeCount).toBe(101)
    
    // Now create one more rectangle
    await canvas.click({ position: { x: 800, y: 800 } })
    await page.waitForTimeout(500)
    
    // Verify the new rectangle appears (viewport culling is active but watch should update it)
    const newShapeCount = await page.evaluate(() => {
      const stage = window.__TEST_STAGE__ || {}
      const layer = stage.children?.[0]
      return layer?.children?.length || 0
    })
    
    // Should now have 102 shapes
    expect(newShapeCount).toBe(102)
    
    // Verify the last rectangle is visible (if in viewport)
    const lastRectangleVisible = await page.evaluate(() => {
      const stage = window.__TEST_STAGE__ || {}
      const layer = stage.children?.[0]
      if (!layer) return false
      
      const shapes = layer.children || []
      const lastShape = shapes[shapes.length - 1]
      
      return lastShape && lastShape.visible()
    })
    
    expect(lastRectangleVisible).toBe(true)
  })

  test('zoom should still work after fix', async ({ page }) => {
    // Verify zooming still works correctly
    
    // Create a rectangle
    await page.getByRole('button', { name: /rectangle/i }).click()
    const canvas = page.locator('canvas').first()
    await canvas.click({ position: { x: 300, y: 300 } })
    await page.waitForTimeout(500)
    
    // Get initial zoom level
    const initialZoom = await page.evaluate(() => {
      const stage = window.__TEST_STAGE__ || {}
      return stage.scaleX?.() || 1
    })
    
    // Zoom in (Ctrl+Scroll)
    await canvas.hover()
    await page.mouse.wheel(0, -100) // Scroll up to zoom in
    await page.waitForTimeout(500)
    
    // Verify zoom changed
    const newZoom = await page.evaluate(() => {
      const stage = window.__TEST_STAGE__ || {}
      return stage.scaleX?.() || 1
    })
    
    expect(newZoom).not.toBe(initialZoom)
    
    // Rectangle should still be visible
    const rectangleStillVisible = await page.evaluate(() => {
      const stage = window.__TEST_STAGE__ || {}
      const layer = stage.children?.[0]
      if (!layer) return false
      
      const shapes = layer.children || []
      const rectangles = shapes.filter(s => s.className === 'Rect')
      
      return rectangles.length > 0 && rectangles.some(r => r.visible())
    })
    
    expect(rectangleStillVisible).toBe(true)
  })
})

