/**
 * Regression test: AI line creation rejection
 *
 * Bug: Lines were previously supported but are now disabled
 * 
 * Expected: AI should reject line creation requests with an error message:
 * "Lines are not supported. Only rectangles, circles, and text can be created."
 */

import { test, expect } from '@playwright/test'

test.describe('AI Line Creation Rejection', () => {
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
      await page.getByPlaceholder('Enter canvas name').fill('AI Line Rejection Test')
      await page.getByRole('button', { name: /create/i }).click()
    } else {
      await page.locator('.canvas-card').first().click()
    }

    // Wait for canvas view
    await page.waitForURL(/\/canvas\//)
    await page.waitForTimeout(1500)
  })

  test('AI should reject "draw a line" with error message', async ({ page }) => {
    const aiInput = page.locator('[data-testid="ai-command-input"]')
    await expect(aiInput).toBeVisible()
    
    await aiInput.fill('draw a line')
    
    const submitButton = page.locator('[data-testid="ai-submit-button"]')
    await submitButton.click()

    // Wait for AI processing
    await page.waitForTimeout(3000)

    // Check for error message
    const statusMessage = page.locator('[data-testid="ai-status"]')
    await expect(statusMessage).toBeVisible()
    
    // Should show error about lines not being supported
    const messageText = await statusMessage.textContent()
    expect(messageText).toContain('not supported')
    expect(messageText.toLowerCase()).toMatch(/rectangle|circle|text/)
  })

  test('AI should reject "create a vertical line" with error message', async ({ page }) => {
    const aiInput = page.locator('[data-testid="ai-command-input"]')
    await aiInput.fill('create a vertical line')
    
    const submitButton = page.locator('[data-testid="ai-submit-button"]')
    await submitButton.click()

    await page.waitForTimeout(3000)

    const statusMessage = page.locator('[data-testid="ai-status"]')
    await expect(statusMessage).toBeVisible()
    
    const messageText = await statusMessage.textContent()
    expect(messageText).toContain('not supported')
  })

  test('AI should reject "create 5 lines" with error message', async ({ page }) => {
    const aiInput = page.locator('[data-testid="ai-command-input"]')
    await aiInput.fill('create 5 lines')
    
    const submitButton = page.locator('[data-testid="ai-submit-button"]')
    await submitButton.click()

    await page.waitForTimeout(5000)

    const statusMessage = page.locator('[data-testid="ai-status"]')
    await expect(statusMessage).toBeVisible()
    
    const messageText = await statusMessage.textContent()
    expect(messageText).toContain('not supported')
  })

  test('AI should still allow creating circles', async ({ page }) => {
    const aiInput = page.locator('[data-testid="ai-command-input"]')
    await aiInput.fill('create a circle')
    
    const submitButton = page.locator('[data-testid="ai-submit-button"]')
    await submitButton.click()

    await page.waitForTimeout(3000)

    // Should succeed - check that a circle was created
    const shapeCreated = await page.evaluate(() => {
      const stage = window.__TEST_STAGE__
      if (!stage) return null
      
      const layer = stage.children?.[0]
      if (!layer) return null
      
      const shapes = layer.children || []
      const lastShape = shapes[shapes.length - 1]
      
      return lastShape?.className || null
    })

    expect(shapeCreated).toBe('Circle')
  })

  test('AI should still allow creating rectangles', async ({ page }) => {
    const aiInput = page.locator('[data-testid="ai-command-input"]')
    await aiInput.fill('create a rectangle')
    
    const submitButton = page.locator('[data-testid="ai-submit-button"]')
    await submitButton.click()

    await page.waitForTimeout(3000)

    const shapeCreated = await page.evaluate(() => {
      const stage = window.__TEST_STAGE__
      if (!stage) return null
      
      const layer = stage.children?.[0]
      if (!layer) return null
      
      const shapes = layer.children || []
      const lastShape = shapes[shapes.length - 1]
      
      return lastShape?.className || null
    })

    expect(shapeCreated).toBe('Rect')
  })
})
