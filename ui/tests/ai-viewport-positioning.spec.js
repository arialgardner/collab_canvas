/**
 * Regression test: AI shapes created in viewport
 *
 * Bug: AI-created shapes may appear outside the current viewport,
 * requiring the user to pan/zoom to find them.
 *
 * Expected: AI should create shapes within the visible viewport area,
 * specifically at or near the viewport center.
 */

import { test, expect } from '@playwright/test'

test.describe('AI Shape Positioning in Viewport', () => {
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
      await page.getByPlaceholder('Enter canvas name').fill('AI Viewport Test')
      await page.getByRole('button', { name: /create/i }).click()
    } else {
      await page.locator('.canvas-card').first().click()
    }

    // Wait for canvas view
    await page.waitForURL(/\/canvas\//)
    await page.waitForTimeout(1500)
  })

  test('AI-created shape should appear in viewport after panning away from origin', async ({ page }) => {
    // Pan the canvas away from the origin
    const canvas = page.locator('canvas').first()
    const canvasBox = await canvas.boundingBox()
    
    // Drag to pan the canvas significantly
    await page.mouse.move(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(canvasBox.x + canvasBox.width / 2 - 300, canvasBox.y + canvasBox.height / 2 - 300)
    await page.mouse.up()
    
    await page.waitForTimeout(500)

    // Use AI to create a shape
    const aiInput = page.locator('[data-testid="ai-command-input"]')
    await expect(aiInput).toBeVisible()
    await aiInput.fill('create a circle')
    
    const submitButton = page.locator('[data-testid="ai-submit-button"]')
    await submitButton.click()

    // Wait for AI processing
    await page.waitForTimeout(3000)

    // Check if a shape was created and is visible in the viewport
    const shapeCreated = await page.evaluate(() => {
      const stage = window.__TEST_STAGE__
      if (!stage) return null
      
      const layer = stage.children?.[0]
      if (!layer) return null
      
      const shapes = layer.children || []
      const lastShape = shapes[shapes.length - 1]
      
      if (!lastShape || lastShape.className === 'Transformer') return null
      
      // Get the shape's position
      const shapeX = lastShape.x()
      const shapeY = lastShape.y()
      
      // Get the viewport bounds (visible area in canvas coordinates)
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
      
      const viewportCenterX = (viewportLeft + viewportRight) / 2
      const viewportCenterY = (viewportTop + viewportBottom) / 2
      
      return {
        shapeX,
        shapeY,
        viewportLeft,
        viewportTop,
        viewportRight,
        viewportBottom,
        viewportCenterX,
        viewportCenterY,
        isInViewport: shapeX >= viewportLeft && shapeX <= viewportRight && 
                      shapeY >= viewportTop && shapeY <= viewportBottom
      }
    })

    // console.log('Shape positioning:', shapeCreated)
    
    // Verify shape was created
    expect(shapeCreated).not.toBeNull()
    
    // Verify shape is in viewport
    expect(shapeCreated.isInViewport).toBe(true)
    
    // Verify shape is reasonably close to viewport center (within 50% of viewport dimensions)
    const distanceFromCenterX = Math.abs(shapeCreated.shapeX - shapeCreated.viewportCenterX)
    const distanceFromCenterY = Math.abs(shapeCreated.shapeY - shapeCreated.viewportCenterY)
    const viewportWidth = shapeCreated.viewportRight - shapeCreated.viewportLeft
    const viewportHeight = shapeCreated.viewportBottom - shapeCreated.viewportTop
    
    expect(distanceFromCenterX).toBeLessThan(viewportWidth / 2)
    expect(distanceFromCenterY).toBeLessThan(viewportHeight / 2)
  })

  test('AI-created shape should appear in viewport when zoomed in', async ({ page }) => {
    // Zoom in
    const zoomInButton = page.getByRole('button', { name: /zoom in/i })
    await zoomInButton.click()
    await zoomInButton.click()
    await page.waitForTimeout(500)

    // Use AI to create a shape
    const aiInput = page.locator('[data-testid="ai-command-input"]')
    await aiInput.fill('create a rectangle')
    
    const submitButton = page.locator('[data-testid="ai-submit-button"]')
    await submitButton.click()

    await page.waitForTimeout(3000)

    // Verify shape is in viewport
    const isInViewport = await page.evaluate(() => {
      const stage = window.__TEST_STAGE__
      if (!stage) return false
      
      const layer = stage.children?.[0]
      if (!layer) return false
      
      const shapes = layer.children || []
      const lastShape = shapes[shapes.length - 1]
      
      if (!lastShape || lastShape.className === 'Transformer') return false
      
      const shapeX = lastShape.x()
      const shapeY = lastShape.y()
      
      const stageX = stage.x()
      const stageY = stage.y()
      const scale = stage.scaleX()
      const stageWidth = stage.width()
      const stageHeight = stage.height()
      
      const viewportLeft = -stageX / scale
      const viewportTop = -stageY / scale
      const viewportRight = viewportLeft + (stageWidth / scale)
      const viewportBottom = viewportTop + (stageHeight / scale)
      
      return shapeX >= viewportLeft && shapeX <= viewportRight && 
             shapeY >= viewportTop && shapeY <= viewportBottom
    })

    expect(isInViewport).toBe(true)
  })

  test('multiple AI-created shapes should all appear in viewport', async ({ page }) => {
    // Pan away from origin
    const canvas = page.locator('canvas').first()
    const canvasBox = await canvas.boundingBox()
    
    await page.mouse.move(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(canvasBox.x + canvasBox.width / 2 + 200, canvasBox.y + canvasBox.height / 2 + 200)
    await page.mouse.up()
    await page.waitForTimeout(500)

    // Create multiple shapes via AI
    const aiInput = page.locator('[data-testid="ai-command-input"]')
    const submitButton = page.locator('[data-testid="ai-submit-button"]')
    
    await aiInput.fill('create 3 circles')
    await submitButton.click()
    await page.waitForTimeout(3000)

    // Check that all 3 shapes are in viewport
    const shapesInViewport = await page.evaluate(() => {
      const stage = window.__TEST_STAGE__
      if (!stage) return { count: 0, allInViewport: false }
      
      const layer = stage.children?.[0]
      if (!layer) return { count: 0, allInViewport: false }
      
      const shapes = layer.children || []
      const stageX = stage.x()
      const stageY = stage.y()
      const scale = stage.scaleX()
      const stageWidth = stage.width()
      const stageHeight = stage.height()
      
      const viewportLeft = -stageX / scale
      const viewportTop = -stageY / scale
      const viewportRight = viewportLeft + (stageWidth / scale)
      const viewportBottom = viewportTop + (stageHeight / scale)
      
      let count = 0
      let allInViewport = true
      
      for (const shape of shapes) {
        if (shape.className === 'Transformer') continue
        if (shape.className !== 'Circle') continue
        
        count++
        const shapeX = shape.x()
        const shapeY = shape.y()
        
        const isInViewport = shapeX >= viewportLeft && shapeX <= viewportRight && 
                            shapeY >= viewportTop && shapeY <= viewportBottom
        
        if (!isInViewport) {
          allInViewport = false
        }
      }
      
      return { count, allInViewport }
    })

    expect(shapesInViewport.count).toBe(3)
    expect(shapesInViewport.allInViewport).toBe(true)
  })
})

