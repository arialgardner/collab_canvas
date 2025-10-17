/**
 * Regression Test: Auth Card Size and Layout
 * 
 * Bug: Auth card behavior when switching between login and signup modes
 * Fix: Use v-if to remove display name field in login mode, allowing vertical centering
 * 
 * This test ensures the auth card works correctly in both modes with proper
 * field visibility and centering.
 */

import { test, expect } from '@playwright/test';

test.describe('Auth Card Size and Layout', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the auth page
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test('auth card should have appropriate height in both modes', async ({ page }) => {
    // Wait for the auth card to be visible
    const authCard = page.locator('.auth-card');
    await expect(authCard).toBeVisible();

    // Get initial dimensions in signup mode (default is login, so click signup first)
    const signupButton = page.locator('.auth-toggle button', { hasText: 'Sign Up' });
    await signupButton.click();
    await page.waitForTimeout(500); // Wait for transition
    
    const signupHeight = await authCard.evaluate(el => el.offsetHeight);
    const signupWidth = await authCard.evaluate(el => el.offsetWidth);

    // Switch to login mode
    const loginButton = page.locator('.auth-toggle button', { hasText: 'Login' });
    await loginButton.click();
    await page.waitForTimeout(500); // Wait for transition
    
    const loginHeight = await authCard.evaluate(el => el.offsetHeight);
    const loginWidth = await authCard.evaluate(el => el.offsetWidth);

    // Switch back to signup mode
    await signupButton.click();
    await page.waitForTimeout(500); // Wait for transition
    
    const signupHeight2 = await authCard.evaluate(el => el.offsetHeight);
    const signupWidth2 = await authCard.evaluate(el => el.offsetWidth);

    // Verify dimensions are reasonable (login will be shorter without display name)
    expect(signupHeight).toBeGreaterThan(loginHeight);
    expect(Math.abs(signupHeight - signupHeight2)).toBeLessThan(5);
    expect(signupWidth).toBe(loginWidth);
    expect(signupWidth).toBe(signupWidth2);

    // console.log(`Signup height: ${signupHeight}px, Login height: ${loginHeight}px`);
    // console.log(`Height difference: ${Math.abs(signupHeight - loginHeight)}px`);
  });

  test('display name field should not exist in login mode', async ({ page }) => {
    // Start in signup mode
    const signupButton = page.locator('.auth-toggle button', { hasText: 'Sign Up' });
    await signupButton.click();
    await page.waitForTimeout(300);
    
    // Display name should be visible
    const displayNameGroup = page.locator('.display-name-group');
    await expect(displayNameGroup).toBeVisible();
    
    const displayNameInput = page.locator('#displayName');
    await expect(displayNameInput).toBeEnabled();
    
    // Switch to login mode
    const loginButton = page.locator('.auth-toggle button', { hasText: 'Login' });
    await loginButton.click();
    await page.waitForTimeout(300);
    
    // Display name field should not exist in the DOM (v-if removes it)
    await expect(displayNameGroup).not.toBeAttached();
    await expect(displayNameInput).not.toBeAttached();
  });

  test('login mode should have vertically centered fields', async ({ page }) => {
    // Start in login mode (default)
    const authForm = page.locator('.auth-form.login-mode');
    
    // Login form should have centering styles
    const display = await authForm.evaluate(el => 
      window.getComputedStyle(el).display
    );
    const justifyContent = await authForm.evaluate(el => 
      window.getComputedStyle(el).justifyContent
    );
    
    expect(display).toBe('flex');
    expect(justifyContent).toBe('center');
    
    // Display name field should not exist
    const displayNameInput = page.locator('#displayName');
    await expect(displayNameInput).not.toBeAttached();
  });

  test('form validation should work correctly in both modes', async ({ page }) => {
    // Test signup mode validation
    const signupButton = page.locator('.auth-toggle button', { hasText: 'Sign Up' });
    await signupButton.click();
    await page.waitForTimeout(400);
    
    const displayNameInput = page.locator('#displayName');
    const emailInput = page.locator('#email');
    const passwordInput = page.locator('#password');
    const submitButton = page.locator('.auth-button.primary');
    
    // Try to submit with empty fields
    await expect(submitButton).toBeDisabled();
    
    // Fill in fields
    await displayNameInput.fill('Test User');
    await emailInput.fill('test@example.com');
    await passwordInput.fill('password123');
    
    // Submit button should be enabled
    await expect(submitButton).toBeEnabled();
    
    // Switch to login mode
    const loginButton = page.locator('.auth-toggle button', { hasText: 'Login' });
    await loginButton.click();
    await page.waitForTimeout(500); // Wait for mode switch
    
    // Fields should be cleared when switching modes (as per component logic)
    // Fill in login fields
    await emailInput.fill('test@example.com');
    await passwordInput.fill('password123');
    
    // Display name should not be required in login mode
    await expect(submitButton).toBeEnabled(); // Should be enabled with just email and password
  });

  test('signup mode should display all fields', async ({ page }) => {
    // Switch to signup mode
    const signupButton = page.locator('.auth-toggle button', { hasText: 'Sign Up' });
    await signupButton.click();
    await page.waitForTimeout(300);
    
    const displayNameGroup = page.locator('.display-name-group');
    const displayNameInput = page.locator('#displayName');
    const emailInput = page.locator('#email');
    const passwordInput = page.locator('#password');
    
    // All fields should be visible and enabled
    await expect(displayNameGroup).toBeVisible();
    await expect(displayNameInput).toBeEnabled();
    await expect(emailInput).toBeEnabled();
    await expect(passwordInput).toBeEnabled();
    
    // Form should not have login-mode class
    const authForm = page.locator('.auth-form');
    const hasLoginClass = await authForm.evaluate(el => 
      el.classList.contains('login-mode')
    );
    expect(hasLoginClass).toBe(false);
  });
});

