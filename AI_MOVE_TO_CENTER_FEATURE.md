# AI Move to Center Feature

## Overview
This feature enables users to move selected shapes to the center of the viewport using natural language AI commands.

## What Changed

### 1. AI Service Updates (`ui/src/services/aiService.js`)
- Updated system prompt to recognize "move to center" commands
- Added examples for center movement commands:
  - "move selected to center"
  - "center the selected rectangle"
  - "move it to the middle of the screen"
- Added documentation for `moveTo` parameter in positioning rules

### 2. Command Mapping (`ui/src/composables/useAICommands.js`)
- Updated `MOVE_SHAPE` intent mapping to include `moveTo` parameter
- This allows the AI to communicate the "center" intent to the executor

### 3. Command Execution (`ui/src/composables/useCommandExecutor.js`)
- Enhanced `executeManipulation` function to handle `moveTo: "center"` parameter
- Added logic to move shapes to viewport center:
  - **Single shape**: Moves directly to viewport center
  - **Multiple shapes**: Moves as a group, maintaining relative positions
- Calculates viewport center based on current pan and zoom state

### 4. UI Updates (`ui/src/components/AICommandPanel.vue`)
- Added "move selected to center of screen" to suggested commands
- Provides users with a clear example of the new feature

### 5. Test Coverage (`ui/tests/ai-move-to-center.spec.js`)
- Comprehensive test suite with 5 test cases:
  1. Move rectangle to center with "move to center" command
  2. Move circle to center with "center it" command
  3. Move shape with "move to middle of screen" command
  4. Move multiple shapes as a group maintaining relative positions
  5. Verify shapes actually moved from initial position

## Usage Examples

### Single Shape
```
1. Select a shape on the canvas
2. Type in AI panel: "move to center"
3. Shape moves to viewport center
```

### Multiple Shapes
```
1. Select multiple shapes (Cmd/Ctrl+A or click multiple)
2. Type: "center the selected shapes"
3. Group moves to center maintaining relative positions
```

### Natural Language Variations
The AI understands various phrasings:
- "move to center"
- "center it"
- "move to middle"
- "move the selected rectangle to the center"
- "move it to the middle of the screen"
- "center the selected shapes"

## Technical Details

### Viewport Center Calculation
The feature uses the current viewport state to determine the center:
```javascript
viewportCenter = {
  x: (viewportLeft + viewportRight) / 2,
  y: (viewportTop + viewportBottom) / 2
}
```

This accounts for:
- Current pan offset
- Current zoom level
- Screen dimensions

### Group Movement
When multiple shapes are selected:
1. Calculate the bounding box of all selected shapes
2. Find the center of that group
3. Calculate offset needed to move group center to viewport center
4. Apply the same offset to all shapes

This preserves the layout and spacing of multiple selected shapes.

## Testing

Run the test suite:
```bash
cd ui
npx playwright test ai-move-to-center.spec.js
```

## Benefits

1. **Improved UX**: Users can quickly center important shapes in their view
2. **Natural Language**: Works with conversational commands
3. **Viewport Aware**: Always moves to the visible center, regardless of pan/zoom
4. **Group Support**: Maintains relative positions when moving multiple shapes
5. **Consistent**: Works like other AI commands in the system

## Future Enhancements

Potential improvements:
- Support for "move to top left", "move to bottom right", etc.
- Relative positioning: "move 50 pixels to the right"
- Snap to grid when centering
- Animate the movement for better visual feedback

