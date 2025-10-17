/**
 * Test: AI move selected shape to center of viewport
 *
 * Feature: AI should accept commands to move selected shapes to the center
 * of the visible viewport area.
 *
 * Expected behavior:
 * - User can say "move to center", "center it", "move to middle of screen"
 * - Selected shape(s) should move to viewport center
 * - Multiple shapes should move as a group maintaining relative positions
 */

import { test, expect } from '@playwright/test'

test.describe('AI Move Shape to Center', () => {
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
      await page.getByPlaceholder('Enter canvas name').fill('AI Move to Center Test')
      await page.getByRole('button', { name: /create/i }).click()
    } else {
      await page.locator('.canvas-card').first().click()
    }

    // Wait for canvas view
    await page.waitForURL(/\/canvas\//)
    await page.waitForTimeout(1500)
  })

  test('should move a selected rectangle to viewport center with "move to center" command', async ({ page }) => {
    // Create a rectangle at a specific position
    const aiInput = page.locator('[data-testid="ai-command-input"]')
    const submitButton = page.locator('[data-testid="ai-submit-button"]')
    
    await aiInput.fill('create a rectangle')
    await submitButton.click()
    await page.waitForTimeout(3000)

    // Pan the canvas so the shape is not at center
    const canvas = page.locator('canvas').first()
    const canvasBox = await canvas.boundingBox()
    
    await page.mouse.move(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(canvasBox.x + canvasBox.width / 2 - 200, canvasBox.y + canvasBox.height / 2 - 200)
    await page.mouse.up()
    await page.waitForTimeout(500)

    // Get initial shape position and viewport center
    const initialData = await page.evaluate(() => {
      const stage = window.__TEST_STAGE__
      if (!stage) return null
      
      const layer = stage.children?.[0]
      if (!layer) return null
      
      const shapes = layer.children || []
      const rectangle = shapes.find(s => s.className === 'Rect')
      
      if (!rectangle) return null
      
      const stageX = stage.x()
      const stageY = stage.y()
      const scale = stage.scaleX()
      const stageWidth = stage.width()
      const stageHeight = stage.height()
      
      const viewportLeft = -stageX / scale
      const viewportTop = -stageY / scale
      const viewportRight = viewportLeft + (stageWidth / scale)
      const viewportBottom = viewportTop + (stageHeight / scale)
      
      const viewportCenterX = (viewportLeft + viewportRight) / 2
      const viewportCenterY = (viewportTop + viewportBottom) / 2
      
      return {
        initialX: rectangle.x(),
        initialY: rectangle.y(),
        viewportCenterX,
        viewportCenterY
      }
    })

    expect(initialData).not.toBeNull()

    // Click on the rectangle to select it
    const canvas2 = page.locator('canvas').first()
    const box = await canvas2.boundingBox()
    
    // Click at canvas center (where shape should be approximately)
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
    await page.waitForTimeout(500)

    // Use AI to move to center
    await aiInput.fill('move the selected rectangle to the center')
    await submitButton.click()
    await page.waitForTimeout(3000)

    // Verify shape moved to viewport center
    const finalData = await page.evaluate(() => {
      const stage = window.__TEST_STAGE__
      if (!stage) return null
      
      const layer = stage.children?.[0]
      if (!layer) return null
      
      const shapes = layer.children || []
      const rectangle = shapes.find(s => s.className === 'Rect')
      
      if (!rectangle) return null
      
      const stageX = stage.x()
      const stageY = stage.y()
      const scale = stage.scaleX()
      const stageWidth = stage.width()
      const stageHeight = stage.height()
      
      const viewportLeft = -stageX / scale
      const viewportTop = -stageY / scale
      const viewportRight = viewportLeft + (stageWidth / scale)
      const viewportBottom = viewportTop + (stageHeight / scale)
      
      const viewportCenterX = (viewportLeft + viewportRight) / 2
      const viewportCenterY = (viewportTop + viewportBottom) / 2
      
      return {
        finalX: rectangle.x(),
        finalY: rectangle.y(),
        viewportCenterX,
        viewportCenterY
      }
    })

    expect(finalData).not.toBeNull()

    // Shape should be at or very close to viewport center (within 10 pixels)
    expect(Math.abs(finalData.finalX - finalData.viewportCenterX)).toBeLessThan(10)
    expect(Math.abs(finalData.finalY - finalData.viewportCenterY)).toBeLessThan(10)

    // Shape position should have changed from initial
    const moved = Math.abs(finalData.finalX - initialData.initialX) > 5 ||
                  Math.abs(finalData.finalY - initialData.initialY) > 5
    expect(moved).toBe(true)
  })

  test('should move selected shape to center with "center it" command', async ({ page }) => {
    // Create a circle
    const aiInput = page.locator('[data-testid="ai-command-input"]')
    const submitButton = page.locator('[data-testid="ai-submit-button"]')
    
    await aiInput.fill('create a circle')
    await submitButton.click()
    await page.waitForTimeout(3000)

    // Click to select the circle
    const canvas = page.locator('canvas').first()
    const box = await canvas.boundingBox()
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
    await page.waitForTimeout(500)

    // Use AI with shorter command
    await aiInput.fill('center it')
    await submitButton.click()
    await page.waitForTimeout(3000)

    // Verify shape is at viewport center
    const result = await page.evaluate(() => {
      const stage = window.__TEST_STAGE__
      if (!stage) return null
      
      const layer = stage.children?.[0]
      if (!layer) return null
      
      const shapes = layer.children || []
      const circle = shapes.find(s => s.className === 'Circle')
      
      if (!circle) return null
      
      const stageX = stage.x()
      const stageY = stage.y()
      const scale = stage.scaleX()
      const stageWidth = stage.width()
      const stageHeight = stage.height()
      
      const viewportLeft = -stageX / scale
      const viewportTop = -stageY / scale
      const viewportRight = viewportLeft + (stageWidth / scale)
      const viewportBottom = viewportTop + (stageHeight / scale)
      
      const viewportCenterX = (viewportLeft + viewportRight) / 2
      const viewportCenterY = (viewportTop + viewportBottom) / 2
      
      return {
        shapeX: circle.x(),
        shapeY: circle.y(),
        viewportCenterX,
        viewportCenterY,
        distanceX: Math.abs(circle.x() - viewportCenterX),
        distanceY: Math.abs(circle.y() - viewportCenterY)
      }
    })

    expect(result).not.toBeNull()
    expect(result.distanceX).toBeLessThan(10)
    expect(result.distanceY).toBeLessThan(10)
  })

  test('should move selected shape to center with "move to middle of screen" command', async ({ page }) => {
    // Create a rectangle
    const aiInput = page.locator('[data-testid="ai-command-input"]')
    const submitButton = page.locator('[data-testid="ai-submit-button"]')
    
    await aiInput.fill('create a rectangle')
    await submitButton.click()
    await page.waitForTimeout(3000)

    // Pan away from center
    const canvas = page.locator('canvas').first()
    const box = await canvas.boundingBox()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 + 150, box.y + box.height / 2 + 150)
    await page.mouse.up()
    await page.waitForTimeout(500)

    // Click to select
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
    await page.waitForTimeout(500)

    // Use natural language command
    await aiInput.fill('move it to the middle of the screen')
    await submitButton.click()
    await page.waitForTimeout(3000)

    // Verify centered
    const isCentered = await page.evaluate(() => {
      const stage = window.__TEST_STAGE__
      if (!stage) return false
      
      const layer = stage.children?.[0]
      if (!layer) return false
      
      const shapes = layer.children || []
      const rectangle = shapes.find(s => s.className === 'Rect')
      
      if (!rectangle) return false
      
      const stageX = stage.x()
      const stageY = stage.y()
      const scale = stage.scaleX()
      const stageWidth = stage.width()
      const stageHeight = stage.height()
      
      const viewportLeft = -stageX / scale
      const viewportTop = -stageY / scale
      const viewportRight = viewportLeft + (stageWidth / scale)
      const viewportBottom = viewportTop + (stageHeight / scale)
      
      const viewportCenterX = (viewportLeft + viewportRight) / 2
      const viewportCenterY = (viewportTop + viewportBottom) / 2
      
      const distanceX = Math.abs(rectangle.x() - viewportCenterX)
      const distanceY = Math.abs(rectangle.y() - viewportCenterY)
      
      return distanceX < 10 && distanceY < 10
    })

    expect(isCentered).toBe(true)
  })

  test('should move multiple selected shapes to center as a group', async ({ page }) => {
    // Create two rectangles
    const aiInput = page.locator('[data-testid="ai-command-input"]')
    const submitButton = page.locator('[data-testid="ai-submit-button"]')
    
    await aiInput.fill('create a rectangle')
    await submitButton.click()
    await page.waitForTimeout(3000)

    await aiInput.fill('create a rectangle')
    await submitButton.click()
    await page.waitForTimeout(3000)

    // Get initial positions
    const initialPositions = await page.evaluate(() => {
      const stage = window.__TEST_STAGE__
      if (!stage) return null
      
      const layer = stage.children?.[0]
      if (!layer) return null
      
      const shapes = layer.children || []
      const rectangles = shapes.filter(s => s.className === 'Rect')
      
      if (rectangles.length < 2) return null
      
      return {
        rect1X: rectangles[0].x(),
        rect1Y: rectangles[0].y(),
        rect2X: rectangles[1].x(),
        rect2Y: rectangles[1].y(),
        relativeDistanceX: rectangles[1].x() - rectangles[0].x(),
        relativeDistanceY: rectangles[1].y() - rectangles[0].y()
      }
    })

    expect(initialPositions).not.toBeNull()

    // Select both rectangles (Cmd+A to select all)
    await page.keyboard.press('Meta+a')
    await page.waitForTimeout(500)

    // Move to center
    await aiInput.fill('move selected to center')
    await submitButton.click()
    await page.waitForTimeout(3000)

    // Verify shapes moved and maintained relative positions
    const finalPositions = await page.evaluate(() => {
      const stage = window.__TEST_STAGE__
      if (!stage) return null
      
      const layer = stage.children?.[0]
      if (!layer) return null
      
      const shapes = layer.children || []
      const rectangles = shapes.filter(s => s.className === 'Rect')
      
      if (rectangles.length < 2) return null
      
      const stageX = stage.x()
      const stageY = stage.y()
      const scale = stage.scaleX()
      const stageWidth = stage.width()
      const stageHeight = stage.height()
      
      const viewportLeft = -stageX / scale
      const viewportTop = -stageY / scale
      const viewportRight = viewportLeft + (stageWidth / scale)
      const viewportBottom = viewportTop + (stageHeight / scale)
      
      const viewportCenterX = (viewportLeft + viewportRight) / 2
      const viewportCenterY = (viewportTop + viewportBottom) / 2
      
      // Calculate center of the group
      const groupCenterX = (rectangles[0].x() + rectangles[1].x()) / 2
      const groupCenterY = (rectangles[0].y() + rectangles[1].y()) / 2
      
      return {
        rect1X: rectangles[0].x(),
        rect1Y: rectangles[0].y(),
        rect2X: rectangles[1].x(),
        rect2Y: rectangles[1].y(),
        relativeDistanceX: rectangles[1].x() - rectangles[0].x(),
        relativeDistanceY: rectangles[1].y() - rectangles[0].y(),
        groupCenterX,
        groupCenterY,
        viewportCenterX,
        viewportCenterY,
        groupDistanceFromCenterX: Math.abs(groupCenterX - viewportCenterX),
        groupDistanceFromCenterY: Math.abs(groupCenterY - viewportCenterY)
      }
    })

    expect(finalPositions).not.toBeNull()

    // Group center should be at viewport center
    expect(finalPositions.groupDistanceFromCenterX).toBeLessThan(10)
    expect(finalPositions.groupDistanceFromCenterY).toBeLessThan(10)

    // Relative positions should be maintained (within 1 pixel tolerance)
    expect(Math.abs(finalPositions.relativeDistanceX - initialPositions.relativeDistanceX)).toBeLessThan(2)
    expect(Math.abs(finalPositions.relativeDistanceY - initialPositions.relativeDistanceY)).toBeLessThan(2)
  })
})

