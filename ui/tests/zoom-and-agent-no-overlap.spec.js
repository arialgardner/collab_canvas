/**
 * Regression test: Ensure Zoom Controls and AI Command Panel do not overlap
 *
 * Bug: Zoom controls overlapped with the AI agent panel in the bottom-right.
 * Fix: Repositioned ZoomControls to bottom-left to avoid AI panel.
 */

import { test, expect } from '@playwright/test'

test.describe('UI Layout - Zoom vs AI Panel overlap', () => {
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
      await page.getByPlaceholder('Enter canvas name').fill('Overlap Layout Test')
      await page.getByRole('button', { name: /create/i }).click()
    } else {
      await page.locator('.canvas-card').first().click()
    }

    // Wait for canvas view
    await page.waitForURL(/\/canvas\//)
    await page.waitForTimeout(800)
  })

  test('ZoomControls and AI panel should not overlap', async ({ page }) => {
    const aiPanel = page.locator('[data-testid="ai-panel"]')
    const zoomControls = page.locator('.zoom-controls')

    await expect(aiPanel).toBeVisible()
    await expect(zoomControls).toBeVisible()

    const aiBox = await aiPanel.boundingBox()
    const zoomBox = await zoomControls.boundingBox()

    expect(aiBox).not.toBeNull()
    expect(zoomBox).not.toBeNull()

    const ai = aiBox!
    const zm = zoomBox!

    const aiLeft = ai.x
    const aiRight = ai.x + ai.width
    const aiTop = ai.y
    const aiBottom = ai.y + ai.height

    const zLeft = zm.x
    const zRight = zm.x + zm.width
    const zTop = zm.y
    const zBottom = zm.y + zm.height

    const isOverlapping = !(aiRight <= zLeft || aiLeft >= zRight || aiBottom <= zTop || aiTop >= zBottom)

    expect(isOverlapping, 'ZoomControls must not overlap AI Command Panel').toBeFalsy()
  })
})


