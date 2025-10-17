/**
 * Regression test: Text toolbar closes when clicking away
 *
 * Bug: When editing text and interacting with the toolbar (e.g., selecting a color),
 * clicking away should close both the text editor and toolbar.
 * 
 * Fix: Added global click handler to TextEditor that detects clicks outside
 * both the editor and toolbar, then saves/cancels appropriately.
 */

import { test, expect } from '@playwright/test'

test.describe('Text Editor and Toolbar - Click Away Behavior', () => {
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
      await page.getByPlaceholder('Enter canvas name').fill('Text Toolbar Test')
      await page.getByRole('button', { name: /create/i }).click()
    } else {
      await page.locator('.canvas-card').first().click()
    }

    // Wait for canvas view
    await page.waitForURL(/\/canvas\//)
    await page.waitForTimeout(1000)
  })

  test('text editor and toolbar should close when clicking outside both', async ({ page }) => {
    // Select text tool
    await page.getByRole('button', { name: /text/i }).click()

    // Create a text shape by clicking on canvas
    const canvas = page.locator('canvas').first()
    await canvas.click({ position: { x: 400, y: 300 } })

    // Wait for editor and toolbar to appear
    await page.waitForTimeout(500)

    // Verify text editor is visible
    const textEditor = page.locator('.text-editor-overlay')
    await expect(textEditor).toBeVisible()

    // Verify toolbar is visible
    const toolbar = page.locator('.text-format-toolbar')
    await expect(toolbar).toBeVisible()

    // Type some text
    const textarea = page.locator('.text-input')
    await textarea.fill('Test Text')

    // Click away from both editor and toolbar (click on canvas elsewhere)
    await canvas.click({ position: { x: 100, y: 100 } })

    // Wait a moment for the close action
    await page.waitForTimeout(500)

    // Both editor and toolbar should be closed
    await expect(textEditor).not.toBeVisible()
    await expect(toolbar).not.toBeVisible()
  })

  test('interacting with toolbar should not close it', async ({ page }) => {
    // Select text tool
    await page.getByRole('button', { name: /text/i }).click()

    // Create a text shape
    const canvas = page.locator('canvas').first()
    await canvas.click({ position: { x: 400, y: 300 } })
    await page.waitForTimeout(500)

    // Type some text
    const textarea = page.locator('.text-input')
    await textarea.fill('Formatted Text')

    // Verify toolbar is visible
    const toolbar = page.locator('.text-format-toolbar')
    await expect(toolbar).toBeVisible()

    // Click on bold button
    const boldButton = toolbar.locator('button[title="Bold"]')
    await boldButton.click()

    // Toolbar should still be visible after clicking bold
    await expect(toolbar).toBeVisible()

    // Click on color picker
    const colorPicker = toolbar.locator('input[type="color"]')
    await colorPicker.click()

    // Toolbar should still be visible after clicking color picker
    await expect(toolbar).toBeVisible()
  })

  test('toolbar should close when clicking away after color selection', async ({ page }) => {
    // Select text tool
    await page.getByRole('button', { name: /text/i }).click()

    // Create a text shape
    const canvas = page.locator('canvas').first()
    await canvas.click({ position: { x: 400, y: 300 } })
    await page.waitForTimeout(500)

    // Type some text
    const textarea = page.locator('.text-input')
    await textarea.fill('Colored Text')

    const toolbar = page.locator('.text-format-toolbar')
    await expect(toolbar).toBeVisible()

    // Select a color (simulate interaction)
    const colorPicker = toolbar.locator('input[type="color"]')
    await colorPicker.fill('#ff0000')

    // Now click away from both editor and toolbar
    await canvas.click({ position: { x: 100, y: 100 } })
    await page.waitForTimeout(500)

    // Both should be closed
    const textEditor = page.locator('.text-editor-overlay')
    await expect(textEditor).not.toBeVisible()
    await expect(toolbar).not.toBeVisible()
  })

  test('empty text should cancel editor when clicking away', async ({ page }) => {
    // Select text tool
    await page.getByRole('button', { name: /text/i }).click()

    // Create a text shape
    const canvas = page.locator('canvas').first()
    await canvas.click({ position: { x: 400, y: 300 } })
    await page.waitForTimeout(500)

    const textEditor = page.locator('.text-editor-overlay')
    await expect(textEditor).toBeVisible()

    // Don't type anything, just click away
    await canvas.click({ position: { x: 100, y: 100 } })
    await page.waitForTimeout(500)

    // Editor should be closed
    await expect(textEditor).not.toBeVisible()
  })

  test('ESC key should close editor and toolbar', async ({ page }) => {
    // Select text tool
    await page.getByRole('button', { name: /text/i }).click()

    // Create a text shape
    const canvas = page.locator('canvas').first()
    await canvas.click({ position: { x: 400, y: 300 } })
    await page.waitForTimeout(500)

    // Type some text
    const textarea = page.locator('.text-input')
    await textarea.fill('ESC Test')

    const textEditor = page.locator('.text-editor-overlay')
    const toolbar = page.locator('.text-format-toolbar')

    await expect(textEditor).toBeVisible()
    await expect(toolbar).toBeVisible()

    // Press ESC
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)

    // Both should be closed
    await expect(textEditor).not.toBeVisible()
    await expect(toolbar).not.toBeVisible()
  })
})

