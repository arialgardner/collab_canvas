import { test, expect } from '@playwright/test';

test.describe('AI Rectangle Size Specification Bug', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // This test assumes you're already logged in or have a way to bypass auth
    await page.waitForSelector('canvas', { timeout: 10000 });
  });

  test('should create a rectangle with specified size 200x100', async ({ page }) => {
    // Get initial shape count
    const initialShapes = await page.evaluate(() => {
      const canvasView = document.querySelector('[data-test="canvas-view"]');
      if (!canvasView) return 0;
      return document.querySelectorAll('rect, circle, text').length;
    });

    // Find AI command input
    const aiInput = page.locator('textarea[placeholder*="command"], input[placeholder*="command"]').first();
    await aiInput.fill('create a rectangle 200x100');
    await aiInput.press('Enter');

    // Wait for shape to be created
    await page.waitForTimeout(2000);

    // Verify a new shape was created
    const newShapes = await page.evaluate(() => {
      return document.querySelectorAll('rect, circle, text').length;
    });
    
    expect(newShapes).toBeGreaterThan(initialShapes);

    // Check that the rectangle has the correct dimensions
    const rectangleProps = await page.evaluate(() => {
      const rects = document.querySelectorAll('rect');
      if (rects.length === 0) return null;
      const lastRect = rects[rects.length - 1];
      return {
        width: parseFloat(lastRect.getAttribute('width')),
        height: parseFloat(lastRect.getAttribute('height'))
      };
    });

    expect(rectangleProps).not.toBeNull();
    expect(rectangleProps.width).toBe(200);
    expect(rectangleProps.height).toBe(100);
  });

  test('should create a circle with specified radius 75', async ({ page }) => {
    const aiInput = page.locator('textarea[placeholder*="command"], input[placeholder*="command"]').first();
    await aiInput.fill('draw a 75px circle');
    await aiInput.press('Enter');

    await page.waitForTimeout(2000);

    const circleProps = await page.evaluate(() => {
      const circles = document.querySelectorAll('circle');
      if (circles.length === 0) return null;
      const lastCircle = circles[circles.length - 1];
      return {
        radius: parseFloat(lastCircle.getAttribute('r'))
      };
    });

    expect(circleProps).not.toBeNull();
    expect(circleProps.radius).toBe(75);
  });

  test('should create a rectangle with "300 by 150" format', async ({ page }) => {
    const aiInput = page.locator('textarea[placeholder*="command"], input[placeholder*="command"]').first();
    await aiInput.fill('create a 300 by 150 rectangle');
    await aiInput.press('Enter');

    await page.waitForTimeout(2000);

    const rectangleProps = await page.evaluate(() => {
      const rects = document.querySelectorAll('rect');
      if (rects.length === 0) return null;
      const lastRect = rects[rects.length - 1];
      return {
        width: parseFloat(lastRect.getAttribute('width')),
        height: parseFloat(lastRect.getAttribute('height'))
      };
    });

    expect(rectangleProps).not.toBeNull();
    expect(rectangleProps.width).toBe(300);
    expect(rectangleProps.height).toBe(150);
  });

  test('should create default-sized rectangle when no size specified', async ({ page }) => {
    const aiInput = page.locator('textarea[placeholder*="command"], input[placeholder*="command"]').first();
    await aiInput.fill('create a rectangle');
    await aiInput.press('Enter');

    await page.waitForTimeout(2000);

    const rectangleProps = await page.evaluate(() => {
      const rects = document.querySelectorAll('rect');
      if (rects.length === 0) return null;
      const lastRect = rects[rects.length - 1];
      return {
        width: parseFloat(lastRect.getAttribute('width')),
        height: parseFloat(lastRect.getAttribute('height'))
      };
    });

    expect(rectangleProps).not.toBeNull();
    // Default size should be 100x100
    expect(rectangleProps.width).toBe(100);
    expect(rectangleProps.height).toBe(100);
  });
});
