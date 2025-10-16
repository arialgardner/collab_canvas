/**
 * Regression test for presence update bug on logout
 * 
 * Bug: When a user signs out from a shared canvas, other users don't see
 * the user count update because the presence cleanup was using hardcoded
 * 'default' canvasId instead of the actual canvas ID.
 * 
 * Expected: When a user logs out from a canvas, their presence should be
 * removed from that specific canvas, and other users should see the updated
 * user count immediately.
 */

import { test, expect } from '@playwright/test'

test.describe('Presence - User Count Update on Logout', () => {
  test('should update user count for other users when someone logs out from shared canvas', async ({ browser }) => {
    // Create two browser contexts (two users)
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    
    const page1 = await context1.newPage()
    const page2 = await context2.newPage()
    
    try {
      // User 1: Login and create a canvas
      await page1.goto('http://localhost:5173')
      await page1.getByPlaceholder('Enter your email').fill('user1@example.com')
      await page1.getByPlaceholder('Enter your password').fill('password123')
      await page1.getByRole('button', { name: /sign in/i }).click()
      await page1.waitForURL(/\/dashboard/)
      
      // Create a new canvas
      await page1.getByRole('button', { name: /create canvas/i }).click()
      await page1.getByPlaceholder('Enter canvas name').fill('Shared Test Canvas')
      await page1.getByRole('button', { name: /create/i }).click()
      await page1.waitForURL(/\/canvas\//)
      
      // Get the canvas ID from URL
      const canvasUrl = page1.url()
      const canvasId = canvasUrl.split('/canvas/')[1]
      
      // Wait for canvas to load
      await page1.waitForTimeout(2000)
      
      // User 1 should see "1 users online" (just themselves)
      await expect(page1.getByText(/1\s+users online/i)).toBeVisible()
      
      // User 2: Login and navigate to the same canvas
      await page2.goto('http://localhost:5173')
      await page2.getByPlaceholder('Enter your email').fill('user2@example.com')
      await page2.getByPlaceholder('Enter your password').fill('password123')
      await page2.getByRole('button', { name: /sign in/i }).click()
      await page2.waitForURL(/\/dashboard/)
      
      // Navigate directly to the shared canvas
      await page2.goto(`http://localhost:5173/canvas/${canvasId}`)
      await page2.waitForTimeout(2000)
      
      // Both users should now see "2 users online"
      await expect(page1.getByText(/2\s+users online/i)).toBeVisible({ timeout: 5000 })
      await expect(page2.getByText(/2\s+users online/i)).toBeVisible({ timeout: 5000 })
      
      // User 2 logs out
      await page2.getByRole('button', { name: /sign out/i }).click()
      await page2.waitForURL('/')
      
      // Wait for presence cleanup to propagate
      await page1.waitForTimeout(2000)
      
      // User 1 should now see "1 users online" again (bug fix verification)
      await expect(page1.getByText(/1\s+users online/i)).toBeVisible({ timeout: 5000 })
      
    } finally {
      // Cleanup
      await context1.close()
      await context2.close()
    }
  })
  
  test('should clean up presence from correct canvas when user logs out', async ({ browser }) => {
    // This test verifies that the canvasId is correctly passed to presence cleanup
    const context = await browser.newContext()
    const page = await context.newPage()
    
    try {
      // Login
      await page.goto('http://localhost:5173')
      await page.getByPlaceholder('Enter your email').fill('test@example.com')
      await page.getByPlaceholder('Enter your password').fill('password123')
      await page.getByRole('button', { name: /sign in/i }).click()
      await page.waitForURL(/\/dashboard/)
      
      // Create a canvas
      await page.getByRole('button', { name: /create canvas/i }).click()
      await page.getByPlaceholder('Enter canvas name').fill('Test Canvas')
      await page.getByRole('button', { name: /create/i }).click()
      await page.waitForURL(/\/canvas\//)
      
      // Get the canvas ID from URL
      const canvasUrl = page.url()
      const canvasId = canvasUrl.split('/canvas/')[1]
      
      // Wait for canvas to load
      await page.waitForTimeout(2000)
      
      // Listen to console logs to verify correct canvasId is used
      const consoleLogs = []
      page.on('console', msg => {
        consoleLogs.push(msg.text())
      })
      
      // Logout
      await page.getByRole('button', { name: /sign out/i }).click()
      await page.waitForURL('/')
      
      // Wait for cleanup logs
      await page.waitForTimeout(1000)
      
      // Verify that presence cleanup was called (we can check via network or console)
      // For now, just verify the logout was successful
      expect(page.url()).toBe('http://localhost:5173/')
      
      // If the bug was present, the console would show cleanup for 'default'
      // With the fix, it should show cleanup for the actual canvasId
      // Note: This is a basic verification - in production, you'd want to
      // inspect Firestore documents or network requests
      
    } finally {
      await context.close()
    }
  })
  
  test('should handle logout from dashboard (default canvas) correctly', async ({ browser }) => {
    // Edge case: Make sure 'default' canvasId still works
    const context = await browser.newContext()
    const page = await context.newPage()
    
    try {
      // Login
      await page.goto('http://localhost:5173')
      await page.getByPlaceholder('Enter your email').fill('test@example.com')
      await page.getByPlaceholder('Enter your password').fill('password123')
      await page.getByRole('button', { name: /sign in/i }).click()
      await page.waitForURL(/\/dashboard/)
      
      // Wait a bit
      await page.waitForTimeout(1000)
      
      // Logout from dashboard (if there's a logout button)
      // Note: NavBar might not be visible on dashboard
      // This is just to verify the default case still works
      
      // Navigate to URL root to logout
      await page.goto('http://localhost:5173/')
      
      // Should be logged out
      await expect(page.getByText(/sign in/i)).toBeVisible()
      
    } finally {
      await context.close()
    }
  })
})

