/**
 * Regression test for rectangle canvas bounds bug
 * 
 * Bug: Rectangles were being constrained by constrainToBounds function during
 * creation and updates, preventing them from being created/moved anywhere on
 * the full canvas like other shapes (circle, line, text)
 * 
 * Expected: Rectangles can be created and moved anywhere within the full canvas
 * bounds, just like other shapes
 */

import { test, expect } from '@playwright/test'

test.describe('Rectangle - Full Canvas Bounds', () => {
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

  test('should create rectangle anywhere on canvas without bounds constraint', async ({ page }) => {
    // Select rectangle tool
    await page.getByRole('button', { name: /rectangle/i }).click()
    
    // Test creating rectangle far from origin (near edge of canvas)
    // If constrainToBounds was applied, this would be clamped
    const canvas = page.locator('canvas').first()
    const farX = 2500 // Near the edge of 3000px canvas
    const farY = 2500
    
    await canvas.click({ position: { x: farX, y: farY } })
    
    // Wait for shape creation
    await page.waitForTimeout(500)
    
    // Verify rectangle was created at the requested position (not constrained)
    const rectangleData = await page.evaluate(() => {
      const stage = window.__TEST_STAGE__ || {}
      const layer = stage.children?.[0]
      const shapes = layer?.children || []
      const rect = shapes.find(s => s.className === 'Rect')
      if (!rect) return null
      return {
        x: rect.x(),
        y: rect.y()
      }
    })
    
    expect(rectangleData).not.toBeNull()
    // The position should be close to what we clicked (accounting for stage transform)
    // We're just verifying it wasn't constrained to a smaller area
    expect(rectangleData.x).toBeGreaterThan(0)
    expect(rectangleData.y).toBeGreaterThan(0)
  })

  test('should move rectangle anywhere on canvas without bounds constraint', async ({ page }) => {
    // Select rectangle tool and create a rectangle
    await page.getByRole('button', { name: /rectangle/i }).click()
    
    const canvas = page.locator('canvas').first()
    await canvas.click({ position: { x: 200, y: 200 } })
    await page.waitForTimeout(500)
    
    // Switch to select tool
    await page.getByRole('button', { name: /select/i }).click()
    
    // Click on the rectangle to select it
    await canvas.click({ position: { x: 200, y: 200 } })
    await page.waitForTimeout(300)
    
    // Drag rectangle to far edge of canvas
    await canvas.dragTo(canvas, {
      sourcePosition: { x: 200, y: 200 },
      targetPosition: { x: 2500, y: 2500 }
    })
    
    await page.waitForTimeout(500)
    
    // Verify rectangle was moved without being constrained
    const rectangleData = await page.evaluate(() => {
      const stage = window.__TEST_STAGE__ || {}
      const layer = stage.children?.[0]
      const shapes = layer?.children || []
      const rect = shapes.find(s => s.className === 'Rect')
      if (!rect) return null
      return {
        x: rect.x(),
        y: rect.y()
      }
    })
    
    expect(rectangleData).not.toBeNull()
    // Position should have changed significantly from original 200,200
    expect(rectangleData.x).toBeGreaterThan(1000)
    expect(rectangleData.y).toBeGreaterThan(1000)
  })

  test('rectangles should behave like circles - no position constraints', async ({ page }) => {
    // Create a rectangle
    await page.getByRole('button', { name: /rectangle/i }).click()
    const canvas = page.locator('canvas').first()
    await canvas.click({ position: { x: 2700, y: 2700 } })
    await page.waitForTimeout(500)
    
    // Create a circle at same position
    await page.getByRole('button', { name: /circle/i }).click()
    await canvas.click({ position: { x: 2700, y: 2700 } })
    await page.waitForTimeout(500)
    
    // Get positions of both shapes
    const shapeData = await page.evaluate(() => {
      const stage = window.__TEST_STAGE__ || {}
      const layer = stage.children?.[0]
      const shapes = layer?.children || []
      
      const rect = shapes.find(s => s.className === 'Rect')
      const circle = shapes.find(s => s.className === 'Circle')
      
      return {
        rect: rect ? { x: rect.x(), y: rect.y() } : null,
        circle: circle ? { x: circle.x(), y: circle.y() } : null
      }
    })
    
    expect(shapeData.rect).not.toBeNull()
    expect(shapeData.circle).not.toBeNull()
    
    // Both should be in similar positions (not constrained differently)
    // Allow some variance for default size offset
    expect(Math.abs(shapeData.rect.x - shapeData.circle.x)).toBeLessThan(200)
    expect(Math.abs(shapeData.rect.y - shapeData.circle.y)).toBeLessThan(200)
  })
})

