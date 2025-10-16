/**
 * Regression test for text editor duplicate creation bug
 * 
 * Bug: When in text mode, clicking to create text and then clicking away
 * to close the editor would create an additional unwanted text shape
 * 
 * Expected: Clicking away should only close the editor, not create another text
 */

import { test, expect } from '@playwright/test'

test.describe('Text Editor - No Duplicate Creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173')
    
    // Login
    await page.getByPlaceholder('Enter your email').fill('test@example.com')
    await page.getByPlaceholder('Enter your password').fill('password123')
    await page.getByRole('button', { name: /sign in/i }).click()
    
    // Wait for dashboard to load
    await page.waitForURL(/\/dashboard/)
    
    // Click on the canvas or create one if needed
    const createButton = page.getByRole('button', { name: /create canvas/i })
    if (await createButton.isVisible()) {
      await createButton.click()
      await page.getByPlaceholder('Enter canvas name').fill('Test Canvas')
      await page.getByRole('button', { name: /create/i }).click()
    } else {
      // Click first canvas
      await page.locator('.canvas-card').first().click()
    }
    
    // Wait for canvas view to load
    await page.waitForURL(/\/canvas\//)
    await page.waitForTimeout(1000)
  })

  test('should not create duplicate text when clicking away to close editor', async ({ page }) => {
    // Select text tool
    await page.getByRole('button', { name: /text/i }).click()
    
    // Click on canvas to create text (first click)
    const canvas = page.locator('canvas').first()
    await canvas.click({ position: { x: 200, y: 200 } })
    
    // Wait for text editor to appear
    await page.waitForSelector('textarea.text-input', { state: 'visible' })
    
    // Type some text
    await page.locator('textarea.text-input').fill('Test text')
    
    // Count shapes before clicking away (should be 1)
    const shapesBeforeClick = await page.evaluate(() => {
      const stage = window.__TEST_STAGE__ || {}
      const layer = stage.children?.[0]
      return layer?.children?.length || 0
    })
    
    // Click on canvas away from editor to close it (second click)
    await canvas.click({ position: { x: 400, y: 400 } })
    
    // Wait for text editor to close
    await page.waitForSelector('textarea.text-input', { state: 'hidden' })
    
    // Wait a bit to ensure no duplicate is created
    await page.waitForTimeout(500)
    
    // Count shapes after clicking away (should still be 1, not 2)
    const shapesAfterClick = await page.evaluate(() => {
      const stage = window.__TEST_STAGE__ || {}
      const layer = stage.children?.[0]
      return layer?.children?.length || 0
    })
    
    // Verify no duplicate was created
    expect(shapesAfterClick).toBe(shapesBeforeClick)
    expect(shapesAfterClick).toBe(1)
  })

  test('should allow creating new text after closing previous editor', async ({ page }) => {
    // Select text tool
    await page.getByRole('button', { name: /text/i }).click()
    
    // Create first text
    const canvas = page.locator('canvas').first()
    await canvas.click({ position: { x: 200, y: 200 } })
    await page.waitForSelector('textarea.text-input', { state: 'visible' })
    await page.locator('textarea.text-input').fill('First text')
    
    // Click away to close editor
    await canvas.click({ position: { x: 400, y: 400 } })
    await page.waitForSelector('textarea.text-input', { state: 'hidden' })
    await page.waitForTimeout(300)
    
    // Now create second text intentionally (after editor is closed)
    await canvas.click({ position: { x: 300, y: 300 } })
    await page.waitForSelector('textarea.text-input', { state: 'visible' })
    await page.locator('textarea.text-input').fill('Second text')
    
    // Click away again
    await canvas.click({ position: { x: 500, y: 500 } })
    await page.waitForSelector('textarea.text-input', { state: 'hidden' })
    await page.waitForTimeout(500)
    
    // Should now have exactly 2 text shapes
    const finalShapeCount = await page.evaluate(() => {
      const stage = window.__TEST_STAGE__ || {}
      const layer = stage.children?.[0]
      return layer?.children?.length || 0
    })
    
    expect(finalShapeCount).toBe(2)
  })

  test('should close editor with ESC key without creating duplicate', async ({ page }) => {
    // Select text tool
    await page.getByRole('button', { name: /text/i }).click()
    
    // Click on canvas to create text
    const canvas = page.locator('canvas').first()
    await canvas.click({ position: { x: 200, y: 200 } })
    
    // Wait for text editor to appear
    await page.waitForSelector('textarea.text-input', { state: 'visible' })
    await page.locator('textarea.text-input').fill('Test ESC')
    
    // Press ESC to close
    await page.keyboard.press('Escape')
    
    // Wait for editor to close
    await page.waitForSelector('textarea.text-input', { state: 'hidden' })
    await page.waitForTimeout(500)
    
    // Verify only 1 shape exists
    const shapeCount = await page.evaluate(() => {
      const stage = window.__TEST_STAGE__ || {}
      const layer = stage.children?.[0]
      return layer?.children?.length || 0
    })
    
    expect(shapeCount).toBe(1)
  })
})

