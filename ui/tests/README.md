# Regression Tests

This directory contains automated regression tests for the CollabCanvas application.

## Test Suites

### auth-card-size-consistency.spec.js

**Bug Fixed:** Auth card layout and field centering in login/signup modes

**Solution:** 
- Use `v-if` to completely remove display name field from DOM in login mode
- Apply flexbox centering (`justify-content: center`) to login form
- Email and password fields are vertically centered in login mode
- All three fields display normally in signup mode

**Test Coverage:**
1. **Card Height Appropriateness** - Verifies auth card has reasonable heights in both modes (login is shorter than signup)
2. **Field Removal** - Ensures display name field is completely removed from DOM in login mode (not just hidden)
3. **Vertical Centering** - Confirms login form uses flexbox centering for email/password fields
4. **Form Validation** - Tests that validation works correctly in both modes with appropriate required fields
5. **Signup Mode Fields** - Verifies all three fields (display name, email, password) are visible and functional in signup mode

**Running Tests:**
```bash
# Run all tests
npm test

# Run tests with UI
npm run test:ui

# Run tests in headed mode (see browser)
npm run test:headed

# Run specific test file
npx playwright test auth-card-size-consistency.spec.js
```

## Test Configuration

Tests are configured in `playwright.config.js` with:
- Automatic dev server startup
- Chrome browser testing
- Screenshot on failure
- HTML report generation

