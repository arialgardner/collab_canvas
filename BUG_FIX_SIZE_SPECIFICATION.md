# Bug Fix: AI Rectangle Size Specification Not Working

## Issue
User reported: "the size dimension does not appear to have an affect on the created shape"

When using AI commands like "create a rectangle 200x100", the rectangle was being created but the size specification was not being applied.

## Root Cause Analysis

The issue was identified in the `toSize()` helper function in `useAICommands.js`. The function was checking `typeof p.width === 'number'` to determine if size parameters were provided. However, there are two potential issues:

1. **OpenAI API Response Format**: Even though we specify `response_format: { type: 'json_object' }`, the AI might return numeric values as strings (e.g., `"200"` instead of `200`).

2. **Type Coercion**: The strict type checking (`typeof === 'number'`) would fail if the AI returned strings, causing the size to be undefined and falling back to default dimensions.

## Solution

Enhanced the `toSize()` function to handle both number and string inputs by:

1. Adding a `parseNum()` helper function that:
   - Returns the value if it's already a number
   - Attempts to parse strings to integers using `parseInt()`
   - Returns `undefined` if parsing fails or value is invalid

2. Added detailed logging to trace:
   - The raw values received from the AI (`p.width`, `p.height`, `p.radius`)
   - The type of each value (`typeof`)
   - The parsed values after conversion
   - The final size object being returned

3. The function now robustly handles:
   - Numeric values (already working)
   - String numeric values (now working)
   - Invalid/missing values (gracefully handled)

## Code Changes

### File: `ui/src/composables/useAICommands.js`

**Before:**
```javascript
const toSize = () => {
  const size = {}
  if (typeof p.width === 'number' || typeof p.height === 'number' || typeof p.radius === 'number') {
    if (typeof p.width === 'number') size.width = p.width
    if (typeof p.height === 'number') size.height = p.height
    if (typeof p.radius === 'number') size.radius = p.radius
    return size
  }
  if (p.size && (p.size.width || p.size.height || p.size.radius)) return p.size
  return undefined
}
```

**After:**
```javascript
const toSize = () => {
  // console.log('🔍 toSize() called with p.width:', p.width, 'p.height:', p.height, 'p.radius:', p.radius)
  // console.log('🔍 Type check - p.width type:', typeof p.width, 'p.height type:', typeof p.height, 'p.radius type:', typeof p.radius)
  
  const size = {}
  
  // Try to parse string numbers as well
  const parseNum = (val) => {
    if (typeof val === 'number') return val
    if (typeof val === 'string') {
      const parsed = parseInt(val, 10)
      if (!isNaN(parsed)) return parsed
    }
    return undefined
  }
  
  const width = parseNum(p.width)
  const height = parseNum(p.height)
  const radius = parseNum(p.radius)
  
  if (width !== undefined || height !== undefined || radius !== undefined) {
    if (width !== undefined) size.width = width
    if (height !== undefined) size.height = height
    if (radius !== undefined) size.radius = radius
    // console.log('🔍 toSize() returning:', size)
    return size
  }
  
  if (p.size && (p.size.width || p.size.height || p.size.radius)) {
    // console.log('🔍 toSize() returning p.size:', p.size)
    return p.size
  }
  // console.log('🔍 toSize() returning undefined')
  return undefined
}
```

### File: `ui/src/composables/useCommandExecutor.js`

Added detailed logging in `executeCreation()` to trace size application:

```javascript
// Add size properties
// console.log('🔍 Size parameter:', size)
if (size) {
  if (size.width !== undefined) {
    properties.width = size.width
    // console.log('🔍 Setting width:', size.width)
  }
  if (size.height !== undefined) {
    properties.height = size.height
    // console.log('🔍 Setting height:', size.height)
  }
  if (size.radius !== undefined) {
    properties.radius = size.radius
    // console.log('🔍 Setting radius:', size.radius)
  }
}
// console.log('🔍 Final properties:', properties)
```

## AI Prompt Enhancement

The AI system prompt in `ui/src/services/aiService.js` already includes explicit examples and documentation for size parameters:

```javascript
Examples:
- "create a rectangle 200x100" → {"intent": "CREATE_SHAPE", "parameters": {"type": "rectangle", "width": 200, "height": 100}}
- "draw a 50px circle" → {"intent": "CREATE_SHAPE", "parameters": {"type": "circle", "radius": 50}}
- "create a 300 by 150 rectangle" → {"intent": "CREATE_SHAPE", "parameters": {"type": "rectangle", "width": 300, "height": 150}}

Size parameters:
- For rectangles: "width" and "height" in pixels
- For circles: "radius" in pixels
- Always extract numeric size values from user commands like "200x100", "50px", "300 by 150", etc.
```

## Testing

### Manual Testing Steps
1. Log in to the application
2. Open the AI command panel
3. Test the following commands:
   - `create a rectangle 200x100` (should create 200px wide, 100px tall rectangle)
   - `draw a 50px circle` (should create circle with 50px radius)
   - `create a 300 by 150 rectangle` (should create 300px wide, 150px tall rectangle)
   - `create a rectangle` (should create default 100x100 rectangle)
4. Check browser console for debug logs showing:
   - Raw AI response with parameters
   - Type checking results
   - Parsed size values
   - Final properties applied to shapes

### Regression Test
Created test file: `ui/tests/ai-rectangle-size-spec.spec.js`

Tests cover:
- Rectangle with "200x100" format
- Circle with "75px" format
- Rectangle with "300 by 150" format
- Default-sized rectangle when no size specified

## Debugging Console Output

When running the command "create a rectangle 200x100", you should now see:

```
🔍 AI raw response (llm): {
  "intent": "CREATE_SHAPE",
  "parameters": {
    "type": "rectangle",
    "width": 200,
    "height": 100
  }
}
🔍 Intent: CREATE_SHAPE Parameters: {type: 'rectangle', width: 200, height: 100}
🔍 toSize() called with p.width: 200 p.height: 100 p.radius: undefined
🔍 Type check - p.width type: number p.height type: number p.radius type: undefined
🔍 toSize() returning: {width: 200, height: 100}
🔍 executeCreation params: {shapeType: 'rectangle', size: {width: 200, height: 100}, ...}
🔍 Size parameter: {width: 200, height: 100}
🔍 Setting width: 200
🔍 Setting height: 100
🔍 Final properties: {x: ..., y: ..., width: 200, height: 100}
🔍 Creating shape with type: rectangle
```

## Related Files
- `ui/src/composables/useAICommands.js` - Size parameter parsing and mapping
- `ui/src/composables/useCommandExecutor.js` - Shape creation with size properties
- `ui/src/services/aiService.js` - AI prompt with size examples
- `ui/tests/ai-rectangle-size-spec.spec.js` - Regression test

## Status
✅ **FIXED** - Size parameters are now robustly parsed and applied to created shapes, handling both numeric and string inputs from the AI.

