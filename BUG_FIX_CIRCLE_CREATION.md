# Bug Fix: AI Circle Creation Issue

## Problem
When using the AI agent to create a circle (e.g., "create a circle"), a rectangle was created instead.

## Root Cause
The AI prompt did not explicitly emphasize the importance of including the shape `type` parameter in the response. The AI was either:
1. Not returning the `type` or `shapeType` field in parameters
2. Returning it with an incorrect value
3. Returning it in a different format

The command executor has a fallback: if `shapeType` is undefined or falsy, it defaults to `'rectangle'`.

```javascript
// In useCommandExecutor.js, line 134 (before fix)
const shape = await createShape(shapeType || 'rectangle', properties, ...)
```

This meant that when the AI didn't return the correct `shapeType`, circles would become rectangles.

## Solution

### 1. Enhanced AI Prompt
Updated `/ui/src/services/aiService.js` to include:

- **Explicit requirement**: Added "MUST include 'type' or 'shapeType' parameter" to intent descriptions
- **Clear examples**: Added specific examples showing correct format:
  - `"create a circle"` → `{"intent": "CREATE_SHAPE", "parameters": {"type": "circle"}}`
  - `"draw a rectangle"` → `{"intent": "CREATE_SHAPE", "parameters": {"type": "rectangle"}}`

### 2. Debug Logging
Added comprehensive logging to trace the issue:

- **In `useAICommands.js`**: Log raw AI response and extracted intent/parameters
- **In `useCommandExecutor.js`**: Log parameters received and final shapeType used

### 3. Regression Test
Created `/ui/tests/ai-circle-creation-bug.spec.js` to:
- Test that "create a circle" creates a Circle (not Rect)
- Test that "create a rectangle" creates a Rect
- Capture console logs for debugging

## Files Changed

1. **`ui/src/services/aiService.js`**
   - Enhanced SYSTEM_PROMPT with explicit type requirements
   - Added concrete examples for shape creation

2. **`ui/src/composables/useCommandExecutor.js`**
   - Added debug logging to trace shapeType parameter
   - Added explicit variable for clarity

3. **`ui/src/composables/useAICommands.js`**
   - Added debug logging for AI raw response

4. **`ui/tests/ai-circle-creation-bug.spec.js`** (NEW)
   - Regression test to prevent future occurrences

## Testing

### Manual Testing
1. Start the development server
2. Open the AI command panel
3. Type "create a circle"
4. Verify a circle is created (not a rectangle)
5. Type "create a rectangle"
6. Verify a rectangle is created
7. Check console logs for debugging output

### Automated Testing
Run the regression test:
```bash
cd ui
npx playwright test ai-circle-creation-bug.spec.js
```

## Expected Console Output (After Fix)

```
🤖 Sending command to OpenAI: create a circle
✅ OpenAI response received in XXXms
✅ Command parsed successfully: { intent: 'CREATE_SHAPE', parameters: { type: 'circle' } }
🔍 AI raw response (llm): { "intent": "CREATE_SHAPE", "parameters": { "type": "circle" } }
🔍 Intent: CREATE_SHAPE Parameters: { type: 'circle' }
🔍 executeCreation params: { shapeType: 'circle', color: undefined, size: undefined, ... }
🔍 shapeType extracted: circle
🔍 Creating shape with type: circle
```

## Prevention
The enhanced prompt with explicit examples should prevent this issue. The debug logging will help quickly identify if the AI starts returning incorrect formats in the future.

## Related
- User rules: "create a regression test case for each bug fix"
- This follows the user's preference for automated testing of fixes

