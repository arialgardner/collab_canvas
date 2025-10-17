/**
 * Rectangle Rotation Position Tests
 * 
 * Tests that rectangles maintain their visual position after rotation.
 * When a rectangle rotates, its stored x,y coordinates (top-left corner) must be
 * updated to reflect the new position so the visual center remains fixed.
 */

const { test, expect } = require('@playwright/test');

test.describe('Rectangle Rotation Position', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to canvas view (assuming user is logged in or using test mode)
    await page.goto('http://localhost:5173');
    
    // Wait for canvas to load
    await page.waitForSelector('[data-testid="canvas-wrapper"]', { timeout: 10000 });
    
    // Clear any existing shapes for clean test
    await page.evaluate(() => {
      // Reset canvas state if needed
      localStorage.clear();
    });
  });

  test('rectangle maintains visual position after rotation via properties panel', async ({ page }) => {
    // Create a rectangle
    await page.click('[data-testid="tool-rectangle"]');
    await page.click('[data-testid="canvas-wrapper"]', { position: { x: 400, y: 300 } });
    
    // Wait for rectangle to be created
    await page.waitForSelector('[data-testid="rectangle"]', { timeout: 5000 });
    
    // Get rectangle element
    const rectangle = await page.locator('[data-testid="rectangle"]').first();
    
    // Get initial bounding box (visual position)
    const initialBox = await rectangle.boundingBox();
    const initialCenterX = initialBox.x + initialBox.width / 2;
    const initialCenterY = initialBox.y + initialBox.height / 2;
    
    console.log('Initial center:', { x: initialCenterX, y: initialCenterY });
    
    // Select the rectangle
    await rectangle.click();
    
    // Wait for properties panel
    await page.waitForSelector('.properties-panel', { timeout: 5000 });
    
    // Find rotation input in properties panel
    const rotationInput = await page.locator('.properties-panel input[type="number"]').filter({ has: page.locator('text=/rotation/i') }).first();
    
    // Alternatively, find it by checking for nearby label
    const rotationField = await page.locator('.property-group:has-text("Rotation") input[type="number"]').first();
    
    // Set rotation to 45 degrees
    await rotationField.fill('45');
    await page.keyboard.press('Enter');
    
    // Wait for rotation to be applied (debounced)
    await page.waitForTimeout(500);
    
    // Get new bounding box after rotation
    const rotatedBox = await rectangle.boundingBox();
    const rotatedCenterX = rotatedBox.x + rotatedBox.width / 2;
    const rotatedCenterY = rotatedBox.y + rotatedBox.height / 2;
    
    console.log('Rotated center:', { x: rotatedCenterX, y: rotatedCenterY });
    
    // Visual center should be approximately the same (allowing for small rounding errors)
    const centerDeltaX = Math.abs(rotatedCenterX - initialCenterX);
    const centerDeltaY = Math.abs(rotatedCenterY - initialCenterY);
    
    expect(centerDeltaX).toBeLessThan(2); // Allow 2px tolerance
    expect(centerDeltaY).toBeLessThan(2);
    
    // Reload page to verify persistence
    await page.reload();
    await page.waitForSelector('[data-testid="rectangle"]', { timeout: 5000 });
    
    // Get rectangle after reload
    const reloadedRectangle = await page.locator('[data-testid="rectangle"]').first();
    const reloadedBox = await reloadedRectangle.boundingBox();
    const reloadedCenterX = reloadedBox.x + reloadedBox.width / 2;
    const reloadedCenterY = reloadedBox.y + reloadedBox.height / 2;
    
    console.log('Reloaded center:', { x: reloadedCenterX, y: reloadedCenterY });
    
    // After reload, position should still be maintained
    const reloadDeltaX = Math.abs(reloadedCenterX - initialCenterX);
    const reloadDeltaY = Math.abs(reloadedCenterY - initialCenterY);
    
    expect(reloadDeltaX).toBeLessThan(5); // Slightly more tolerance for reload
    expect(reloadDeltaY).toBeLessThan(5);
  });

  test('multiple sequential rotations maintain position', async ({ page }) => {
    // Create a rectangle
    await page.click('[data-testid="tool-rectangle"]');
    await page.click('[data-testid="canvas-wrapper"]', { position: { x: 400, y: 300 } });
    
    await page.waitForSelector('[data-testid="rectangle"]', { timeout: 5000 });
    const rectangle = await page.locator('[data-testid="rectangle"]').first();
    
    // Get initial center
    const initialBox = await rectangle.boundingBox();
    const initialCenterX = initialBox.x + initialBox.width / 2;
    const initialCenterY = initialBox.y + initialBox.height / 2;
    
    // Select rectangle
    await rectangle.click();
    await page.waitForSelector('.properties-panel', { timeout: 5000 });
    
    const rotationField = await page.locator('.property-group:has-text("Rotation") input[type="number"]').first();
    
    // Test multiple rotation values
    const rotations = [45, 90, 180, 270, 360];
    
    for (const rotation of rotations) {
      await rotationField.fill(rotation.toString());
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
      
      const currentBox = await rectangle.boundingBox();
      const currentCenterX = currentBox.x + currentBox.width / 2;
      const currentCenterY = currentBox.y + currentBox.height / 2;
      
      const deltaX = Math.abs(currentCenterX - initialCenterX);
      const deltaY = Math.abs(currentCenterY - initialCenterY);
      
      console.log(`Rotation ${rotation}°: center delta (${deltaX}, ${deltaY})`);
      
      // Center should remain approximately fixed for all rotations
      expect(deltaX).toBeLessThan(3);
      expect(deltaY).toBeLessThan(3);
    }
  });

  test('rotation works correctly with drag', async ({ page }) => {
    // Create a rectangle
    await page.click('[data-testid="tool-rectangle"]');
    await page.click('[data-testid="canvas-wrapper"]', { position: { x: 300, y: 300 } });
    
    await page.waitForSelector('[data-testid="rectangle"]', { timeout: 5000 });
    const rectangle = await page.locator('[data-testid="rectangle"]').first();
    
    // Select and rotate rectangle
    await rectangle.click();
    await page.waitForSelector('.properties-panel', { timeout: 5000 });
    
    const rotationField = await page.locator('.property-group:has-text("Rotation") input[type="number"]').first();
    await rotationField.fill('45');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    
    // Get position after rotation
    const rotatedBox = await rectangle.boundingBox();
    
    // Drag rectangle to new position
    await rectangle.click();
    await page.mouse.move(rotatedBox.x + rotatedBox.width / 2, rotatedBox.y + rotatedBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(rotatedBox.x + rotatedBox.width / 2 + 100, rotatedBox.y + rotatedBox.height / 2 + 100);
    await page.mouse.up();
    
    await page.waitForTimeout(300);
    
    // Get new position after drag
    const draggedBox = await rectangle.boundingBox();
    
    // Verify rectangle moved approximately 100px in both directions
    const dragDeltaX = (draggedBox.x + draggedBox.width / 2) - (rotatedBox.x + rotatedBox.width / 2);
    const dragDeltaY = (draggedBox.y + draggedBox.height / 2) - (rotatedBox.y + rotatedBox.height / 2);
    
    console.log(`Drag delta: (${dragDeltaX}, ${dragDeltaY})`);
    
    // Allow some tolerance for drag precision
    expect(Math.abs(dragDeltaX - 100)).toBeLessThan(10);
    expect(Math.abs(dragDeltaY - 100)).toBeLessThan(10);
    
    // Verify rotation is still 45 degrees by checking properties panel
    await rectangle.click();
    const rotationValue = await rotationField.inputValue();
    expect(parseInt(rotationValue)).toBe(45);
  });

  test('negative rotations work correctly', async ({ page }) => {
    // Create a rectangle
    await page.click('[data-testid="tool-rectangle"]');
    await page.click('[data-testid="canvas-wrapper"]', { position: { x: 400, y: 300 } });
    
    await page.waitForSelector('[data-testid="rectangle"]', { timeout: 5000 });
    const rectangle = await page.locator('[data-testid="rectangle"]').first();
    
    // Get initial center
    const initialBox = await rectangle.boundingBox();
    const initialCenterX = initialBox.x + initialBox.width / 2;
    const initialCenterY = initialBox.y + initialBox.height / 2;
    
    // Select rectangle
    await rectangle.click();
    await page.waitForSelector('.properties-panel', { timeout: 5000 });
    
    const rotationField = await page.locator('.property-group:has-text("Rotation") input[type="number"]').first();
    
    // Test negative rotation values
    const negativeRotations = [-45, -90, -180];
    
    for (const rotation of negativeRotations) {
      await rotationField.fill(rotation.toString());
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
      
      const currentBox = await rectangle.boundingBox();
      const currentCenterX = currentBox.x + currentBox.width / 2;
      const currentCenterY = currentBox.y + currentBox.height / 2;
      
      const deltaX = Math.abs(currentCenterX - initialCenterX);
      const deltaY = Math.abs(currentCenterY - initialCenterY);
      
      console.log(`Rotation ${rotation}°: center delta (${deltaX}, ${deltaY})`);
      
      // Center should remain approximately fixed
      expect(deltaX).toBeLessThan(3);
      expect(deltaY).toBeLessThan(3);
    }
  });

  test('rotation values are normalized to 0-360', async ({ page }) => {
    // Create a rectangle
    await page.click('[data-testid="tool-rectangle"]');
    await page.click('[data-testid="canvas-wrapper"]', { position: { x: 400, y: 300 } });
    
    await page.waitForSelector('[data-testid="rectangle"]', { timeout: 5000 });
    const rectangle = await page.locator('[data-testid="rectangle"]').first();
    
    // Select rectangle
    await rectangle.click();
    await page.waitForSelector('.properties-panel', { timeout: 5000 });
    
    const rotationField = await page.locator('.property-group:has-text("Rotation") input[type="number"]').first();
    
    // Enter rotation > 360
    await rotationField.fill('450');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    
    // Click away and click back to update properties panel
    await page.click('[data-testid="canvas-wrapper"]', { position: { x: 100, y: 100 } });
    await rectangle.click();
    await page.waitForTimeout(300);
    
    // Should be normalized to 90 (450 % 360 = 90)
    const normalizedValue = await rotationField.inputValue();
    const rotation = parseInt(normalizedValue);
    
    // Check if normalized correctly
    expect(rotation).toBe(90);
  });
});

