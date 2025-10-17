/**
 * Regression test: AI command "create circle" creates rectangle instead
 *
 * Bug: When asking the AI to "create a circle", a rectangle is created instead.
 * Root cause: TBD - likely AI parsing returns shapeType in wrong field or
 * the mapping/executor doesn't properly extract it.
 *
 * Expected: "create circle" should create a circle shape.
 */

import { test, expect } from '@playwright/test'

test.describe('AI Command - Circle Creation Bug', () => {
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
      await page.getByPlaceholder('Enter canvas name').fill('AI Circle Test')
      await page.getByRole('button', { name: /create/i }).click()
    } else {
      await page.locator('.canvas-card').first().click()
    }

    // Wait for canvas view
    await page.waitForURL(/\/canvas\//)
    await page.waitForTimeout(1000)
  })

  test('AI command "create circle" should create a circle, not rectangle', async ({ page }) => {
    // Find AI command input
    const aiInput = page.locator('[data-testid="ai-command-input"]')
    await expect(aiInput).toBeVisible()

    // Type command to create a circle
    await aiInput.fill('create a circle')
    
    // Submit command
    const submitButton = page.locator('[data-testid="ai-submit-button"]')
    await submitButton.click()

    // Wait for processing
    await page.waitForTimeout(3000) // AI processing takes time

    // Check status message
    const statusMessage = page.locator('[data-testid="ai-status"]')
    await expect(statusMessage).toBeVisible()
    
    // Verify a circle was created (not a rectangle)
    const canvas = page.locator('canvas').first()
    
    // Use Konva stage to check shape type
    const shapeType = await page.evaluate(() => {
      const stage = window.__TEST_STAGE__ || {}
      const layer = stage.children?.[0]
      if (!layer) return null
      
      const shapes = layer.children || []
      const lastShape = shapes[shapes.length - 1]
      
      return lastShape?.className
    })

    // Should be 'Circle', not 'Rect'
    expect(shapeType).toBe('Circle')
  })

  test('AI command "create rectangle" should create a rectangle', async ({ page }) => {
    // Find AI command input
    const aiInput = page.locator('[data-testid="ai-command-input"]')
    await expect(aiInput).toBeVisible()

    // Type command to create a rectangle
    await aiInput.fill('create a rectangle')
    
    // Submit command
    const submitButton = page.locator('[data-testid="ai-submit-button"]')
    await submitButton.click()

    // Wait for processing
    await page.waitForTimeout(3000)

    // Verify a rectangle was created
    const shapeType = await page.evaluate(() => {
      const stage = window.__TEST_STAGE__ || {}
      const layer = stage.children?.[0]
      if (!layer) return null
      
      const shapes = layer.children || []
      const lastShape = shapes[shapes.length - 1]
      
      return lastShape?.className
    })

    expect(shapeType).toBe('Rect')
  })

  test('console log AI response for debugging', async ({ page }) => {
    // Capture console logs
    const logs = []
    page.on('console', msg => {
      if (msg.text().includes('AI parsing') || msg.text().includes('command')) {
        logs.push(msg.text())
      }
    })

    const aiInput = page.locator('[data-testid="ai-command-input"]')
    await aiInput.fill('create a circle')
    
    const submitButton = page.locator('[data-testid="ai-submit-button"]')
    await submitButton.click()

    await page.waitForTimeout(3000)

    // Log captured messages for debugging
    // console.log('Captured logs:', logs)
  })
})

