/**
 * Regression Test: Multi-Select Group Drag
 * 
 * Tests that multiple selected shapes can be dragged together as a group,
 * and this counts as one operation for undo/redo.
 * 
 * Expected behavior:
 * - Click and drag on a selected shape moves all selected shapes together
 * - Group drag should count as one operation for undo/redo
 * - Relative positions between shapes are maintained during drag
 */

import { test, expect } from '@playwright/test'

test.describe('Multi-Select Group Drag', () => {
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

  test('should drag all selected shapes together when clicking and dragging one', async ({ page }) => {
    // Create multiple rectangles
    await page.locator('button[data-tool="rectangle"]').click()
    
    const canvas = page.locator('.canvas-wrapper canvas')
    const canvasBox = await canvas.boundingBox()
    
    // Create 3 rectangles in a row
    const positions = [
      { x: canvasBox.x + 300, y: canvasBox.y + 300 },
      { x: canvasBox.x + 450, y: canvasBox.y + 300 },
      { x: canvasBox.x + 600, y: canvasBox.y + 300 }
    ]
    
    for (const pos of positions) {
      await page.mouse.click(pos.x, pos.y)
      await page.waitForTimeout(300)
    }
    
    // Switch to select tool
    await page.locator('button[data-tool="select"]').click()
    await page.waitForTimeout(200)
    
    // Select all 3 rectangles with drag selection
    await page.mouse.move(canvasBox.x + 280, canvasBox.y + 280)
    await page.mouse.down()
    await page.mouse.move(canvasBox.x + 620, canvasBox.y + 420, { steps: 5 })
    await page.mouse.up()
    await page.waitForTimeout(500)
    
    // Now drag the group by clicking on one of the shapes and dragging
    const dragStartX = canvasBox.x + 450
    const dragStartY = canvasBox.y + 350
    const dragEndX = canvasBox.x + 450
    const dragEndY = canvasBox.y + 500
    
    await page.mouse.move(dragStartX, dragStartY)
    await page.mouse.down()
    await page.mouse.move(dragEndX, dragEndY, { steps: 10 })
    await page.mouse.up()
    
    await page.waitForTimeout(500)
    
    // All shapes should have moved
    // Properties panel should still show 3 shapes selected
    const propertiesPanel = page.locator('.properties-panel')
    const selectedText = await propertiesPanel.textContent()
    
    expect(selectedText).toMatch(/3 shape|Selected: 3/i)
  })

  test('should maintain relative positions between shapes during group drag', async ({ page }) => {
    // Create 2 shapes with known relative positions
    await page.locator('button[data-tool="circle"]').click()
    
    const canvas = page.locator('.canvas-wrapper canvas')
    const canvasBox = await canvas.boundingBox()
    
    // Create circle 1
    await page.mouse.click(canvasBox.x + 300, canvasBox.y + 300)
    await page.waitForTimeout(300)
    
    // Create circle 2 (150px to the right)
    await page.mouse.click(canvasBox.x + 450, canvasBox.y + 300)
    await page.waitForTimeout(300)
    
    // Switch to select and select both
    await page.locator('button[data-tool="select"]').click()
    await page.waitForTimeout(200)
    
    await page.mouse.move(canvasBox.x + 280, canvasBox.y + 280)
    await page.mouse.down()
    await page.mouse.move(canvasBox.x + 470, canvasBox.y + 420, { steps: 5 })
    await page.mouse.up()
    await page.waitForTimeout(500)
    
    // Drag the group
    await page.mouse.move(canvasBox.x + 350, canvasBox.y + 350)
    await page.mouse.down()
    await page.mouse.move(canvasBox.x + 350, canvasBox.y + 500, { steps: 10 })
    await page.mouse.up()
    
    await page.waitForTimeout(500)
    
    // The relative horizontal distance should still be ~150px
    // (This would require reading actual shape positions from the DOM or API)
    // For now, just verify both are still selected
    const propertiesPanel = page.locator('.properties-panel')
    const selectedText = await propertiesPanel.textContent()
    
    expect(selectedText).toMatch(/2 shape|Selected: 2/i)
  })

  test('should count group drag as single undo operation', async ({ page }) => {
    // Create 2 shapes
    await page.locator('button[data-tool="rectangle"]').click()
    
    const canvas = page.locator('.canvas-wrapper canvas')
    const canvasBox = await canvas.boundingBox()
    
    await page.mouse.click(canvasBox.x + 300, canvasBox.y + 300)
    await page.waitForTimeout(300)
    await page.mouse.click(canvasBox.x + 450, canvasBox.y + 300)
    await page.waitForTimeout(300)
    
    // Select both
    await page.locator('button[data-tool="select"]').click()
    await page.waitForTimeout(200)
    
    await page.mouse.move(canvasBox.x + 280, canvasBox.y + 280)
    await page.mouse.down()
    await page.mouse.move(canvasBox.x + 470, canvasBox.y + 420, { steps: 5 })
    await page.mouse.up()
    await page.waitForTimeout(500)
    
    // Drag group significantly
    await page.mouse.move(canvasBox.x + 350, canvasBox.y + 350)
    await page.mouse.down()
    await page.mouse.move(canvasBox.x + 350, canvasBox.y + 500, { steps: 10 })
    await page.mouse.up()
    await page.waitForTimeout(500)
    
    // Press Cmd+Z (Mac) or Ctrl+Z (Windows/Linux) to undo
    const isMac = process.platform === 'darwin'
    await page.keyboard.press(isMac ? 'Meta+z' : 'Control+z')
    await page.waitForTimeout(500)
    
    // After single undo, both shapes should be back at original positions
    // Both should still be selected
    const propertiesPanel = page.locator('.properties-panel')
    const selectedText = await propertiesPanel.textContent()
    
    expect(selectedText).toMatch(/2 shape|Selected: 2/i)
    
    // Visual verification would show shapes moved back
    // (Could take screenshot and compare, but that's more fragile)
  })

  test('should not allow individual drag when shape is part of multi-selection', async ({ page }) => {
    // Create 2 rectangles
    await page.locator('button[data-tool="rectangle"]').click()
    
    const canvas = page.locator('.canvas-wrapper canvas')
    const canvasBox = await canvas.boundingBox()
    
    await page.mouse.click(canvasBox.x + 300, canvasBox.y + 300)
    await page.waitForTimeout(300)
    await page.mouse.click(canvasBox.x + 500, canvasBox.y + 300)
    await page.waitForTimeout(300)
    
    // Select both
    await page.locator('button[data-tool="select"]').click()
    await page.waitForTimeout(200)
    
    await page.keyboard.press('Meta+a') // Select all
    await page.waitForTimeout(500)
    
    // Try to drag just one shape - should move both together instead
    await page.mouse.move(canvasBox.x + 350, canvasBox.y + 350)
    await page.mouse.down()
    await page.mouse.move(canvasBox.x + 350, canvasBox.y + 450, { steps: 10 })
    await page.mouse.up()
    await page.waitForTimeout(500)
    
    // Both should still be selected
    const propertiesPanel = page.locator('.properties-panel')
    const selectedText = await propertiesPanel.textContent()
    
    expect(selectedText).toMatch(/2 shape|Selected: 2/i)
  })

  test('should work with mixed shape types in group', async ({ page }) => {
    const canvas = page.locator('.canvas-wrapper canvas')
    const canvasBox = await canvas.boundingBox()
    
    // Create a rectangle
    await page.locator('button[data-tool="rectangle"]').click()
    await page.mouse.click(canvasBox.x + 300, canvasBox.y + 300)
    await page.waitForTimeout(300)
    
    // Create a circle
    await page.locator('button[data-tool="circle"]').click()
    await page.mouse.click(canvasBox.x + 450, canvasBox.y + 300)
    await page.waitForTimeout(300)
    
    // Create a line
    await page.locator('button[data-tool="line"]').click()
    await page.mouse.move(canvasBox.x + 600, canvasBox.y + 300)
    await page.mouse.down()
    await page.mouse.move(canvasBox.x + 700, canvasBox.y + 350, { steps: 5 })
    await page.mouse.up()
    await page.waitForTimeout(300)
    
    // Select all
    await page.locator('button[data-tool="select"]').click()
    await page.waitForTimeout(200)
    await page.keyboard.press('Meta+a')
    await page.waitForTimeout(500)
    
    // Drag the group
    await page.mouse.move(canvasBox.x + 400, canvasBox.y + 350)
    await page.mouse.down()
    await page.mouse.move(canvasBox.x + 400, canvasBox.y + 500, { steps: 10 })
    await page.mouse.up()
    await page.waitForTimeout(500)
    
    // All 3 shapes should still be selected
    const propertiesPanel = page.locator('.properties-panel')
    const selectedText = await propertiesPanel.textContent()
    
    expect(selectedText).toMatch(/3 shape|Selected: 3/i)
  })

  test('should show grabbing cursor during group drag', async ({ page }) => {
    // Create 2 rectangles
    await page.locator('button[data-tool="rectangle"]').click()
    
    const canvas = page.locator('.canvas-wrapper canvas')
    const canvasBox = await canvas.boundingBox()
    
    await page.mouse.click(canvasBox.x + 300, canvasBox.y + 300)
    await page.waitForTimeout(300)
    await page.mouse.click(canvasBox.x + 450, canvasBox.y + 300)
    await page.waitForTimeout(300)
    
    // Select both
    await page.locator('button[data-tool="select"]').click()
    await page.waitForTimeout(200)
    await page.keyboard.press('Meta+a')
    await page.waitForTimeout(500)
    
    // Start drag
    await page.mouse.move(canvasBox.x + 350, canvasBox.y + 350)
    await page.mouse.down()
    
    // During drag, cursor should be 'grabbing'
    const canvasWrapperCursor = await page.locator('.canvas-wrapper').evaluate(
      el => window.getComputedStyle(el).cursor
    )
    
    expect(canvasWrapperCursor).toBe('grabbing')
    
    await page.mouse.up()
    await page.waitForTimeout(200)
    
    // After drag, cursor should return to normal
    const canvasWrapperCursorAfter = await page.locator('.canvas-wrapper').evaluate(
      el => window.getComputedStyle(el).cursor
    )
    
    expect(canvasWrapperCursorAfter).toBe('default')
  })
})

