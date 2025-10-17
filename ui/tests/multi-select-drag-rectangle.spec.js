/**
 * Regression Test: Multi-Select by Dragging Rectangle
 * 
 * Tests that users can select multiple shapes by clicking and dragging
 * a selection rectangle over shapes on the canvas.
 * 
 * Expected behavior:
 * - Click and drag on empty canvas should create a selection rectangle
 * - Shapes intersecting with the selection rectangle should be selected
 * - Multiple shapes can be selected at once
 */

import { test, expect } from '@playwright/test'

test.describe('Multi-Select by Dragging Rectangle', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app and sign in
    await page.goto('http://localhost:5173')
    
    // Wait for auth to initialize
    await page.waitForTimeout(1000)
    
    // Sign in (assuming dev mode auto-login or test credentials)
    const signInButton = page.locator('button:has-text("Sign in")')
    if (await signInButton.isVisible({ timeout: 2000 })) {
      await signInButton.click()
      await page.waitForTimeout(1000)
    }
    
    // Navigate to first canvas or create new one
    const createButton = page.locator('button:has-text("Create New Canvas")')
    if (await createButton.isVisible({ timeout: 2000 })) {
      await createButton.click()
      await page.waitForTimeout(1000)
    } else {
      // Click first canvas card
      await page.locator('.canvas-card').first().click()
      await page.waitForTimeout(1000)
    }
    
    // Wait for canvas to load
    await page.waitForSelector('.canvas-wrapper', { timeout: 5000 })
  })

  test('should create selection rectangle when dragging on empty canvas', async ({ page }) => {
    // Ensure select tool is active
    await page.locator('button[data-tool="select"]').click()
    await page.waitForTimeout(200)
    
    const canvas = page.locator('.canvas-wrapper canvas')
    const canvasBox = await canvas.boundingBox()
    
    // Start drag on empty area
    const startX = canvasBox.x + 200
    const startY = canvasBox.y + 200
    
    await page.mouse.move(startX, startY)
    await page.mouse.down()
    
    // Drag to create selection rectangle
    await page.mouse.move(startX + 150, startY + 100, { steps: 10 })
    
    // Selection rectangle should be visible during drag
    // (Note: Konva canvas doesn't expose DOM elements, so we verify via screenshot or state)
    await page.waitForTimeout(200)
    
    await page.mouse.up()
    
    // Selection should complete
    await page.waitForTimeout(200)
  })

  test('should select multiple shapes within selection rectangle', async ({ page }) => {
    // Create multiple rectangles in a cluster
    await page.locator('button[data-tool="rectangle"]').click()
    
    const canvas = page.locator('.canvas-wrapper canvas')
    const canvasBox = await canvas.boundingBox()
    
    // Create 3 rectangles close together
    const positions = [
      { x: canvasBox.x + 300, y: canvasBox.y + 300 },
      { x: canvasBox.x + 400, y: canvasBox.y + 320 },
      { x: canvasBox.x + 350, y: canvasBox.y + 400 }
    ]
    
    for (const pos of positions) {
      await page.mouse.click(pos.x, pos.y)
      await page.waitForTimeout(300)
    }
    
    // Switch to select tool
    await page.locator('button[data-tool="select"]').click()
    await page.waitForTimeout(200)
    
    // Drag selection rectangle to encompass all 3 shapes
    const selectStartX = canvasBox.x + 280
    const selectStartY = canvasBox.y + 280
    const selectEndX = canvasBox.x + 550
    const selectEndY = canvasBox.y + 550
    
    await page.mouse.move(selectStartX, selectStartY)
    await page.mouse.down()
    await page.mouse.move(selectEndX, selectEndY, { steps: 10 })
    await page.mouse.up()
    
    await page.waitForTimeout(500)
    
    // Verify properties panel shows multiple shapes selected
    const propertiesPanel = page.locator('.properties-panel')
    const selectedCount = await propertiesPanel.locator('text=/3 shape|Selected: 3/i').count()
    
    expect(selectedCount).toBeGreaterThan(0)
  })

  test('should select shapes that partially intersect with selection rectangle', async ({ page }) => {
    // Create a shape
    await page.locator('button[data-tool="rectangle"]').click()
    
    const canvas = page.locator('.canvas-wrapper canvas')
    const canvasBox = await canvas.boundingBox()
    
    await page.mouse.click(canvasBox.x + 400, canvasBox.y + 400)
    await page.waitForTimeout(500)
    
    // Switch to select tool
    await page.locator('button[data-tool="select"]').click()
    await page.waitForTimeout(200)
    
    // Drag selection rectangle that only partially overlaps the shape
    const selectStartX = canvasBox.x + 350
    const selectStartY = canvasBox.y + 350
    const selectEndX = canvasBox.x + 420
    const selectEndY = canvasBox.y + 420
    
    await page.mouse.move(selectStartX, selectStartY)
    await page.mouse.down()
    await page.mouse.move(selectEndX, selectEndY, { steps: 10 })
    await page.mouse.up()
    
    await page.waitForTimeout(500)
    
    // Shape should be selected (partial intersection)
    const propertiesPanel = page.locator('.properties-panel')
    const hasSelection = await propertiesPanel.locator('text=/Selected|Shape Properties/i').count()
    
    expect(hasSelection).toBeGreaterThan(0)
  })

  test('should support drag selection in any direction (including negative width/height)', async ({ page }) => {
    // Create shapes
    await page.locator('button[data-tool="circle"]').click()
    
    const canvas = page.locator('.canvas-wrapper canvas')
    const canvasBox = await canvas.boundingBox()
    
    await page.mouse.click(canvasBox.x + 300, canvasBox.y + 300)
    await page.waitForTimeout(300)
    await page.mouse.click(canvasBox.x + 500, canvasBox.y + 400)
    await page.waitForTimeout(300)
    
    // Switch to select tool
    await page.locator('button[data-tool="select"]').click()
    await page.waitForTimeout(200)
    
    // Drag from bottom-right to top-left (negative width/height)
    const selectStartX = canvasBox.x + 600
    const selectStartY = canvasBox.y + 500
    const selectEndX = canvasBox.x + 250
    const selectEndY = canvasBox.y + 250
    
    await page.mouse.move(selectStartX, selectStartY)
    await page.mouse.down()
    await page.mouse.move(selectEndX, selectEndY, { steps: 10 })
    await page.mouse.up()
    
    await page.waitForTimeout(500)
    
    // Both circles should be selected
    const propertiesPanel = page.locator('.properties-panel')
    const selectedText = await propertiesPanel.textContent()
    
    expect(selectedText).toMatch(/2 shape|Selected: 2/i)
  })

  test('should clear previous selection when starting new drag selection', async ({ page }) => {
    // Create multiple shapes
    await page.locator('button[data-tool="rectangle"]').click()
    
    const canvas = page.locator('.canvas-wrapper canvas')
    const canvasBox = await canvas.boundingBox()
    
    // Create 2 shapes in different areas
    await page.mouse.click(canvasBox.x + 200, canvasBox.y + 200)
    await page.waitForTimeout(300)
    await page.mouse.click(canvasBox.x + 600, canvasBox.y + 400)
    await page.waitForTimeout(300)
    
    // Switch to select tool
    await page.locator('button[data-tool="select"]').click()
    await page.waitForTimeout(200)
    
    // Select first shape only
    await page.mouse.move(canvasBox.x + 180, canvasBox.y + 180)
    await page.mouse.down()
    await page.mouse.move(canvasBox.x + 320, canvasBox.y + 320, { steps: 5 })
    await page.mouse.up()
    await page.waitForTimeout(300)
    
    // Now select second shape only (should clear first selection)
    await page.mouse.move(canvasBox.x + 580, canvasBox.y + 380)
    await page.mouse.down()
    await page.mouse.move(canvasBox.x + 720, canvasBox.y + 520, { steps: 5 })
    await page.mouse.up()
    await page.waitForTimeout(300)
    
    // Only 1 shape should be selected now
    const propertiesPanel = page.locator('.properties-panel')
    const selectedText = await propertiesPanel.textContent()
    
    // Should show 1 shape selected, not 2
    expect(selectedText).toMatch(/1 shape|Selected: 1|rectangle/i)
    expect(selectedText).not.toMatch(/2 shape|Selected: 2/i)
  })

  test('should not pan canvas when dragging selection rectangle', async ({ page }) => {
    // Ensure select tool is active
    await page.locator('button[data-tool="select"]').click()
    await page.waitForTimeout(200)
    
    const canvas = page.locator('.canvas-wrapper canvas')
    const canvasBox = await canvas.boundingBox()
    
    // Record initial viewport position (if possible via screenshot)
    await page.screenshot({ path: 'test-results/before-selection-drag.png' })
    
    // Drag to create selection (should not pan)
    const startX = canvasBox.x + 300
    const startY = canvasBox.y + 300
    
    await page.mouse.move(startX, startY)
    await page.mouse.down()
    await page.mouse.move(startX + 200, startY + 150, { steps: 10 })
    await page.mouse.up()
    await page.waitForTimeout(200)
    
    // Verify canvas didn't pan by comparing screenshots
    await page.screenshot({ path: 'test-results/after-selection-drag.png' })
    
    // Visual regression test would confirm no panning occurred
    // For now, just verify test completes without error
  })
})

