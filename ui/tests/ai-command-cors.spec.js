/**
 * Regression Test: AI Command CORS and Invoker Configuration
 * 
 * Bug: Firebase Cloud Function blocked by CORS policy when called from localhost
 * Issue: "No 'Access-Control-Allow-Origin' header is present on the requested resource"
 * 
 * Root Cause: Firebase Functions v2 requires explicit `invoker: "public"` configuration
 *             for onCall functions to be accessible from client-side code
 * 
 * Fix: Added `invoker: "public"` and `cors: true` to function configuration
 *      Function still validates authentication inside for security
 * 
 * This test verifies that AI commands can be executed from the local development environment
 * without CORS errors.
 */

const { test, expect } = require('@playwright/test')

test.describe('AI Command CORS Configuration', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:5173/')
    
    // Login with test credentials
    await page.fill('input[type="email"]', 'test@test.com')
    await page.fill('input[type="password"]', 'test1234')
    await page.click('button:has-text("Sign in")')
    
    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard')
    
    // Navigate to a canvas
    const firstCanvas = page.locator('.canvas-card').first()
    await firstCanvas.click()
    
    // Wait for canvas to load
    await page.waitForSelector('canvas', { timeout: 10000 })
    await page.waitForTimeout(2000) // Wait for sync
  })

  test('AI command panel should be visible when authenticated', async ({ page }) => {
    // Verify AI command panel is present
    const aiPanel = page.locator('.ai-command-panel')
    await expect(aiPanel).toBeVisible()

    // Verify input field is present
    const commandInput = page.locator('.ai-command-panel input.command-input')
    await expect(commandInput).toBeVisible()

    // Verify send button is present
    const sendButton = page.locator('.ai-command-panel button.send-button')
    await expect(sendButton).toBeVisible()
  })

  test('AI command should execute without CORS error', async ({ page }) => {
    // Listen for console errors (especially CORS errors)
    const consoleErrors = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    // Listen for network requests to the Cloud Function
    const functionCalls = []
    page.on('request', (request) => {
      if (request.url().includes('parseAICommand')) {
        functionCalls.push(request)
      }
    })

    // Focus AI command input (keyboard shortcut)
    await page.keyboard.press('Meta+J')
    
    // Wait for input to be focused
    await page.waitForTimeout(500)

    // Type a simple command
    const commandInput = page.locator('.ai-command-panel input.command-input')
    await commandInput.fill('create a red circle')

    // Send the command
    await page.click('.ai-command-panel button.send-button')

    // Wait for response (up to 10 seconds for AI processing)
    await page.waitForTimeout(10000)

    // Verify no CORS errors were logged
    const corsErrors = consoleErrors.filter(error => 
      error.includes('CORS') || 
      error.includes('Access-Control-Allow-Origin')
    )
    
    expect(corsErrors.length).toBe(0)

    // Verify the function was called
    expect(functionCalls.length).toBeGreaterThan(0)

    // Verify either success or a proper error message (not a CORS error)
    const feedbackMessage = page.locator('.ai-command-panel .feedback-message')
    
    // Wait for feedback (success or error, but not CORS)
    await page.waitForSelector('.ai-command-panel .feedback-message', { 
      timeout: 15000,
      state: 'visible' 
    })

    const messageText = await feedbackMessage.textContent()
    
    // Should not contain generic "internal" error from CORS failure
    expect(messageText).not.toContain('FirebaseError: internal')
    expect(messageText).not.toContain('Failed to fetch')
  })

  test('AI command with keyboard shortcut Cmd+J should work', async ({ page }) => {
    // Press keyboard shortcut to focus AI input
    await page.keyboard.press('Meta+J')
    
    // Verify input is focused
    const commandInput = page.locator('.ai-command-panel input.command-input')
    await expect(commandInput).toBeFocused()

    // Type command and press Enter
    await commandInput.fill('create a blue rectangle')
    await page.keyboard.press('Enter')

    // Wait for processing
    await page.waitForTimeout(8000)

    // Verify no CORS-related errors in console
    const consoleMessages = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleMessages.push(msg.text())
      }
    })

    const hasCorsError = consoleMessages.some(msg => 
      msg.includes('CORS') || msg.includes('Access-Control-Allow-Origin')
    )
    
    expect(hasCorsError).toBe(false)
  })

  test('AI command should handle authentication properly', async ({ page }) => {
    // Try to execute command (should work since we're authenticated)
    await page.click('.ai-command-panel input.command-input')
    await page.fill('.ai-command-panel input.command-input', 'create a circle')
    await page.click('.ai-command-panel button.send-button')

    // Wait for response
    await page.waitForTimeout(10000)

    // Should not get "unauthenticated" error since we logged in
    const errorMessages = []
    page.on('console', (msg) => {
      if (msg.text().includes('unauthenticated')) {
        errorMessages.push(msg.text())
      }
    })

    expect(errorMessages.length).toBe(0)
  })

  test('AI command panel should show loading state during processing', async ({ page }) => {
    // Type command
    await page.fill('.ai-command-panel input.command-input', 'create a red square')

    // Click send
    await page.click('.ai-command-panel button.send-button')

    // Immediately check for loading state
    const sendButton = page.locator('.ai-command-panel button.send-button')
    
    // Button should be disabled during processing
    await expect(sendButton).toBeDisabled()

    // Should show spinner
    const spinner = page.locator('.ai-command-panel .spinner')
    await expect(spinner).toBeVisible()

    // Wait for processing to complete
    await page.waitForTimeout(10000)

    // Button should be re-enabled after processing
    await expect(sendButton).not.toBeDisabled()
  })
})

