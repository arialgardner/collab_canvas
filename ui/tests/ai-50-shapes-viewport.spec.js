/**
 * Regression test: AI creates 50 shapes all within viewport
 *
 * Bug: When asking AI to "draw 50 shapes", they were spread horizontally
 * across a massive area (50 * 120px = 6000px wide), requiring extensive
 * panning to see all shapes.
 *
 * Expected: All 50 shapes should appear in a grid layout within the current
 * visible viewport, not spread horizontally.
 */

import { test, expect } from '@playwright/test'

test.describe('AI 50 Shapes in Viewport', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173')

    // Login
    await page.getByPlaceholder('Enter your email').fill('test@example.com')
    await page.getByPlaceholder('Enter your password').fill('password123')
    await page.getByRole('button', { name: /sign in/i }).click()

    // Wait for dashboard
    await page.waitForURL(/\/(dashboard)?$/)

    // Create or open a canvas
    const createButton = page.getByRole('button', { name: /create canvas/i })
    if (await createButton.isVisible()) {
      await createButton.click()
      await page.getByPlaceholder('Enter canvas name').fill('AI 50 Shapes Test')
      await page.getByRole('button', { name: /create/i }).click()
    } else {
      await page.locator('.canvas-card').first().click()
    }

    // Wait for canvas view
    await page.waitForURL(/\/canvas\//)
    await page.waitForTimeout(1500)
  })

  test('AI should create 50 shapes all within current viewport (not spread horizontally)', async ({ page }) => {
    // Get viewport dimensions
    const viewportSize = await page.evaluate(() => {
      const stage = window.__TEST_STAGE__
      if (!stage) return null
      
      const stageX = stage.x()
      const stageY = stage.y()
      const scale = stage.scaleX()
      const stageWidth = stage.width()
      const stageHeight = stage.height()
      
      // Convert viewport screen bounds to canvas coordinates
      const viewportLeft = -stageX / scale
      const viewportTop = -stageY / scale
      const viewportRight = viewportLeft + (stageWidth / scale)
      const viewportBottom = viewportTop + (stageHeight / scale)
      
      return {
        left: viewportLeft,
        top: viewportTop,
        right: viewportRight,
        bottom: viewportBottom,
        width: viewportRight - viewportLeft,
        height: viewportBottom - viewportTop
      }
    })

    // console.log('Initial viewport:', viewportSize)

    // Use AI to create 50 shapes
    const aiInput = page.locator('[data-testid="ai-command-input"]')
    await expect(aiInput).toBeVisible()
    await aiInput.fill('create 50 circles')
    
    const submitButton = page.locator('[data-testid="ai-submit-button"]')
    await submitButton.click()

    // Wait for AI processing and shape creation
    await page.waitForTimeout(5000) // AI processing + creating 50 shapes takes time

    // Check that all 50 shapes are within viewport
    const shapesAnalysis = await page.evaluate(() => {
      const stage = window.__TEST_STAGE__
      if (!stage) return null
      
      const layer = stage.children?.[0]
      if (!layer) return null
      
      const stageX = stage.x()
      const stageY = stage.y()
      const scale = stage.scaleX()
      const stageWidth = stage.width()
      const stageHeight = stage.height()
      
      const viewportLeft = -stageX / scale
      const viewportTop = -stageY / scale
      const viewportRight = viewportLeft + (stageWidth / scale)
      const viewportBottom = viewportTop + (stageHeight / scale)
      
      const shapes = layer.children || []
      const circles = shapes.filter(s => s.className === 'Circle')
      
      let shapesInViewport = 0
      let shapesOutsideViewport = 0
      let minX = Infinity
      let maxX = -Infinity
      let minY = Infinity
      let maxY = -Infinity
      
      circles.forEach(shape => {
        const shapeX = shape.x()
        const shapeY = shape.y()
        
        minX = Math.min(minX, shapeX)
        maxX = Math.max(maxX, shapeX)
        minY = Math.min(minY, shapeY)
        maxY = Math.max(maxY, shapeY)
        
        const isInViewport = shapeX >= viewportLeft && shapeX <= viewportRight && 
                            shapeY >= viewportTop && shapeY <= viewportBottom
        
        if (isInViewport) {
          shapesInViewport++
        } else {
          shapesOutsideViewport++
        }
      })
      
      const shapesWidth = maxX - minX
      const shapesHeight = maxY - minY
      const viewportWidth = viewportRight - viewportLeft
      const viewportHeight = viewportBottom - viewportTop
      
      return {
        totalCircles: circles.length,
        shapesInViewport,
        shapesOutsideViewport,
        shapesWidth,
        shapesHeight,
        viewportWidth,
        viewportHeight,
        widthRatio: shapesWidth / viewportWidth,
        heightRatio: shapesHeight / viewportHeight,
        bounds: { minX, maxX, minY, maxY },
        viewport: { viewportLeft, viewportTop, viewportRight, viewportBottom }
      }
    })

    // console.log('Shapes analysis:', shapesAnalysis)

    // Verify 50 circles were created
    expect(shapesAnalysis.totalCircles).toBe(50)
    
    // Most shapes should be in viewport (allow a small margin for edge cases)
    expect(shapesAnalysis.shapesInViewport).toBeGreaterThan(45)
    
    // Shapes should NOT be spread horizontally across huge area
    // They should fit within viewport (with some reasonable margin)
    expect(shapesAnalysis.widthRatio).toBeLessThan(1.5) // Max 1.5x viewport width
    expect(shapesAnalysis.heightRatio).toBeLessThan(1.5) // Max 1.5x viewport height
    
    // The old bug would create shapes spanning 6000px horizontally
    // This should not happen - shapes width should be reasonable
    expect(shapesAnalysis.shapesWidth).toBeLessThan(2000)
  })

  test('AI should create 50 shapes in grid layout, not horizontal line', async ({ page }) => {
    // Use AI to create 50 shapes
    const aiInput = page.locator('[data-testid="ai-command-input"]')
    await aiInput.fill('draw 50 rectangles')
    
    const submitButton = page.locator('[data-testid="ai-submit-button"]')
    await submitButton.click()

    await page.waitForTimeout(5000)

    // Analyze the layout pattern
    const layoutAnalysis = await page.evaluate(() => {
      const stage = window.__TEST_STAGE__
      if (!stage) return null
      
      const layer = stage.children?.[0]
      if (!layer) return null
      
      const shapes = layer.children || []
      const rectangles = shapes.filter(s => s.className === 'Rect')
      
      // Count unique Y positions (should have multiple rows for grid)
      const yPositions = new Set()
      const xPositions = new Set()
      
      rectangles.forEach(shape => {
        // Round to nearest 10 to account for small variations
        const roundedY = Math.round(shape.y() / 10) * 10
        const roundedX = Math.round(shape.x() / 10) * 10
        yPositions.add(roundedY)
        xPositions.add(roundedX)
      })
      
      return {
        totalRectangles: rectangles.length,
        uniqueRows: yPositions.size,
        uniqueCols: xPositions.size,
        isGrid: yPositions.size > 1 && xPositions.size > 1,
        isHorizontalLine: yPositions.size === 1 && xPositions.size > 1
      }
    })

    // console.log('Layout analysis:', layoutAnalysis)

    // Verify 50 rectangles were created
    expect(layoutAnalysis.totalRectangles).toBe(50)
    
    // Should be a grid (multiple rows and columns)
    expect(layoutAnalysis.isGrid).toBe(true)
    
    // Should NOT be a horizontal line (single row)
    expect(layoutAnalysis.isHorizontalLine).toBe(false)
    
    // Should have multiple rows (at least 5 for 50 shapes)
    expect(layoutAnalysis.uniqueRows).toBeGreaterThan(5)
  })
})

