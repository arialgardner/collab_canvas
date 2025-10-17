# V6 Tasks: AI Command System

This document breaks down the V6 AI Command System PRD into PR-sized, logical units of work.

---

## Phase 1: Backend & Foundation (Week 1)

### ✅ Task 1: Firebase Cloud Function Setup
**PR Size**: Small | **Complexity**: Medium | **Priority**: P0

**Objective**: Set up Firebase Cloud Function infrastructure for AI command parsing.

**Files Created/Modified**:
- `functions/ai/parseCommand.js` (new)
- `functions/ai/templates.js` (new)
- `functions/index.js` (modified - export parseAICommand)
- `functions/package.json` (modified - add dependencies)

**Implementation**:
1. Create `functions/ai/` directory structure
2. Install dependencies in functions:
   ```bash
   cd functions
   npm install langchain @langchain/openai @langchain/core zod
   ```
3. Implement `parseAICommand` Cloud Function with:
   - Firebase auth verification (`context.auth` check)
   - Basic command schema (category, action, parameters)
   - GPT-4-turbo integration
   - Error handling with proper HttpsError
4. Define 3 predefined templates in `templates.js`:
   - loginForm (6 shapes)
   - trafficLight (4 shapes)
   - navigationBar (4 shapes)
5. Configure OpenAI API key:
   ```bash
   firebase functions:config:set openai.key="sk-..."
   ```
6. Deploy function:
   ```bash
   firebase deploy --only functions:parseAICommand
   ```

**Testing**:
- Manual test with Firebase emulator
- Verify auth requirement (unauthenticated requests fail)
- Test with sample commands

**Acceptance Criteria**:
- ✅ Cloud Function deploys successfully
- ✅ Requires authentication (rejects unauth requests)
- ✅ Returns structured command object
- ✅ Templates correctly defined
- ✅ Error handling works (returns HttpsError)

---

### ✅ Task 2: Frontend Type Definitions
**PR Size**: Small | **Complexity**: Low | **Priority**: P0

**Objective**: Define TypeScript interfaces for AI commands.

**Files Created/Modified**:
- `ui/src/types/aiCommands.ts` (new)

**Implementation**:
1. Define command category enum
2. Define parameter types for each category:
   - CreationParams
   - ManipulationParams
   - LayoutParams
   - ComplexParams
   - SelectionParams
   - DeletionParams
   - StyleParams
   - UtilityParams
3. Define main Command interface
4. Define context interfaces (CanvasContext, ViewportInfo)
5. Export all types

**Testing**:
- TypeScript compilation passes
- Types are importable

**Acceptance Criteria**:
- ✅ All command types defined
- ✅ TypeScript compilation successful
- ✅ JSDoc comments for documentation

---

### ✅ Task 3: Frontend AI Service Layer
**PR Size**: Small | **Complexity**: Medium | **Priority**: P0

**Objective**: Create service to communicate with Firebase Cloud Function.

**Files Created/Modified**:
- `ui/src/services/aiService.js` (new)

**Implementation**:
1. Create `AICommandService` class
2. Import Firebase Functions SDK
3. Implement `parseCommand` method:
   - Calls `parseAICommand` Cloud Function via `httpsCallable`
   - Handles auth errors gracefully
   - Returns structured command
4. Add error handling for common cases:
   - `unauthenticated` → user-friendly message
   - Network errors
   - Timeout errors

**Testing**:
- Unit tests for error handling
- Mock Firebase functions calls

**Acceptance Criteria**:
- ✅ Service successfully calls Cloud Function
- ✅ Auth errors handled properly
- ✅ Returns parsed command object
- ✅ Error messages are user-friendly

---

### ✅ Task 4: useAICommands Composable
**PR Size**: Small | **Complexity**: Medium | **Priority**: P0

**Objective**: Create composable for AI command orchestration.

**Files Created/Modified**:
- `ui/src/composables/useAICommands.js` (new)

**Implementation**:
1. Create composable with reactive state:
   - `isProcessing` (prevents concurrent commands)
   - `lastCommand`
   - `error`
   - `commandHistory` (in-memory, max 10)
2. Implement `executeCommand` function:
   - Prevent concurrent execution
   - Call `aiService.parseCommand`
   - Track timing
   - Update history
   - Handle errors
3. Initialize `AICommandService` instance
4. Return composable API

**Testing**:
- Unit tests for state management
- Test command history (max 10 enforcement)
- Test concurrent command prevention

**Acceptance Criteria**:
- ✅ Prevents concurrent commands
- ✅ Maintains command history (max 10)
- ✅ Tracks processing state
- ✅ Error handling works
- ✅ History is in-memory only (lost on refresh)

---

## Phase 2: Command Execution (Week 1-2)

### ✅ Task 5: Command Executor Base + Creation Commands
**PR Size**: Medium | **Complexity**: High | **Priority**: P0

**Objective**: Create command executor with creation command support.

**Files Created/Modified**:
- `ui/src/composables/useCommandExecutor.js` (new)

**Implementation**:
1. Create `useCommandExecutor` composable
2. Import `useShapes` and `useUndoRedo`
3. Implement `execute` function (router for command categories)
4. Implement `executeCreation` function:
   - Support rectangle, circle, line, text
   - Use viewport center as default position
   - Extract color, size, text from parameters
   - Call `createShape` from useShapes
   - Return created shape
5. Add undo/redo integration for complex commands (beginGroup/endGroup)

**Testing**:
- Unit tests for executeCreation
- Test default positioning (viewport center)
- Test all 4 shape types
- Test parameter extraction

**Acceptance Criteria**:
- ✅ Creates rectangles with specified properties
- ✅ Creates circles with specified properties
- ✅ Creates lines with specified properties
- ✅ Creates text with specified content
- ✅ Uses viewport center for default position
- ✅ Integrates with useShapes correctly

**Example Commands to Support**:
- "Create a red circle"
- "Draw a blue rectangle"
- "Add a line"
- "Create text saying 'Hello World'"

---

### ✅ Task 6: Manipulation Commands
**PR Size**: Medium | **Complexity**: Medium | **Priority**: P1

**Objective**: Implement shape manipulation commands.

**Files Created/Modified**:
- `ui/src/composables/useCommandExecutor.js` (modified)

**Implementation**:
1. Implement `executeManipulation` function:
   - Require selected shapes (error if none)
   - Handle scale operations (width/height or radius)
   - Handle color changes (fill property)
   - Handle rotation
   - Handle position deltas (move)
   - Call `updateShape` for each selected shape
2. Support relative and absolute changes
3. Iterate over all selected shape IDs

**Testing**:
- Unit tests for each manipulation type
- Test with multiple selected shapes
- Test error when no shapes selected
- Test different shape types (rectangle vs circle scaling)

**Acceptance Criteria**:
- ✅ Scale selected shapes (1.5x bigger, etc.)
- ✅ Change color of selected shapes
- ✅ Move selected shapes (relative positioning)
- ✅ Rotate selected shapes
- ✅ Error message when no selection
- ✅ Works with multiple shapes

**Example Commands to Support**:
- "Make it bigger"
- "Change color to purple"
- "Move left 50 pixels"
- "Rotate 45 degrees"

---

### ✅ Task 7: Layout Commands
**PR Size**: Medium | **Complexity**: Medium | **Priority**: P1

**Objective**: Implement shape arrangement and alignment commands.

**Files Created/Modified**:
- `ui/src/composables/useCommandExecutor.js` (modified)

**Implementation**:
1. Implement `executeLayout` function:
   - Require selected shapes
   - Implement horizontal arrangement (row with spacing)
   - Implement vertical arrangement (stack with spacing)
   - Implement grid layout (calculate rows/columns)
   - Implement alignment (center, left, right, top, bottom)
   - Implement distribution (equal spacing between shapes)
2. Calculate positions based on shape dimensions
3. Update each shape position via `updateShape`

**Testing**:
- Unit tests for each layout type
- Test spacing calculations
- Test with different shape sizes
- Test with 2, 3, 5+ shapes

**Acceptance Criteria**:
- ✅ Arrange shapes in horizontal row with spacing
- ✅ Stack shapes vertically with spacing
- ✅ Create grid layouts
- ✅ Align shapes to center/edges
- ✅ Distribute shapes evenly
- ✅ Respects shape dimensions in calculations

**Example Commands to Support**:
- "Arrange in a row"
- "Stack vertically"
- "Create a grid"
- "Align to center"
- "Distribute evenly"

---

### ✅ Task 8: Complex Template Commands
**PR Size**: Medium | **Complexity**: High | **Priority**: P1

**Objective**: Implement multi-step template-based commands.

**Files Created/Modified**:
- `ui/src/composables/useCommandExecutor.js` (modified)

**Implementation**:
1. Implement `executeComplex` function:
   - Extract `templateData` from parameters
   - Calculate base position from viewport center
   - Iterate through template shapes
   - Convert offset coordinates to absolute positions
   - Call `createShape` for each template shape sequentially
   - Use `beginGroup`/`endGroup` for atomic undo
   - Return array of created shapes
2. Support all 3 templates:
   - loginForm (6 shapes: labels, inputs, button)
   - trafficLight (4 shapes: background + 3 circles)
   - navigationBar (4 shapes: bar + 3 text labels)

**Testing**:
- Integration tests for each template
- Verify shape count and arrangement
- Test undo/redo (should undo entire template)
- Test positioning relative to viewport

**Acceptance Criteria**:
- ✅ "Create login form" generates 6 properly arranged shapes
- ✅ "Make a traffic light" generates 4 shapes in correct layout
- ✅ "Create navigation bar" generates 4 shapes with proper spacing
- ✅ All shapes positioned relative to viewport center
- ✅ Undo removes entire template atomically
- ✅ Templates execute in < 1 second

**Example Commands to Support**:
- "Create a login form"
- "Make a traffic light"
- "Create a navigation bar"

---

### ✅ Task 9: Selection, Deletion & Style Commands
**PR Size**: Medium | **Complexity**: Medium | **Priority**: P2

**Objective**: Implement selection management, deletion, and batch styling.

**Files Created/Modified**:
- `ui/src/composables/useCommandExecutor.js` (modified)

**Implementation**:
1. Implement `executeSelection` function:
   - Filter shapes by type
   - Filter shapes by color
   - Filter shapes by region (bounding box)
   - Return array of matching shape IDs
2. Implement `executeDeletion` function:
   - Delete selected shapes via `deleteShapes`
   - Handle "clear canvas" with confirmation
   - Support targeted deletion ("the red circle")
3. Implement `executeStyle` function:
   - Apply property updates to filtered shapes
   - Support batch color changes
   - Support batch stroke/border additions
   - Support batch font size changes (text)

**Testing**:
- Unit tests for selection filters
- Test deletion with/without selection
- Test batch style updates
- Test "clear canvas" confirmation requirement

**Acceptance Criteria**:
- ✅ Select shapes by type ("select all circles")
- ✅ Select shapes by color ("select red shapes")
- ✅ Delete selected shapes
- ✅ Batch update colors ("make all circles blue")
- ✅ Add borders to shapes ("add borders to rectangles")
- ✅ Clear canvas requires confirmation

**Example Commands to Support**:
- "Select all circles"
- "Select red shapes"
- "Delete the red circle"
- "Make all circles blue"
- "Add borders to rectangles"

---

### ✅ Task 10: Utility Commands
**PR Size**: Small | **Complexity**: Low | **Priority**: P2

**Objective**: Implement canvas-level utility commands.

**Files Created/Modified**:
- `ui/src/composables/useCommandExecutor.js` (modified)

**Implementation**:
1. Implement `executeUtility` function:
   - Zoom in/out (return action for CanvasView to handle)
   - Center view (return action)
   - Undo/redo (return action)
   - Clear selection (return action)
2. Return action object for CanvasView to execute

**Testing**:
- Unit tests for utility command routing
- Integration tests with CanvasView

**Acceptance Criteria**:
- ✅ Zoom commands trigger zoom handlers
- ✅ Center view resets canvas position
- ✅ Undo/redo triggers respective handlers
- ✅ Clear selection works

**Example Commands to Support**:
- "Zoom in"
- "Zoom out"
- "Center view"
- "Undo last action"
- "Clear selection"

---

## Phase 3: UI Components (Week 2)

### ✅ Task 11: AICommandPanel Component
**PR Size**: Medium | **Complexity**: Medium | **Priority**: P0

**Objective**: Build the AI command input panel UI component.

**Files Created/Modified**:
- `ui/src/components/AICommandPanel.vue` (new)

**Implementation**:
1. Create Vue component with:
   - Fixed positioning (bottom-right, above properties panel)
   - Text input field
   - Send button
   - Loading spinner (shown during `isProcessing`)
   - Success message (transient, 2s)
   - Error message display (simple text)
   - Command history dropdown (last 10)
2. Disable input during processing
3. Add keyboard shortcut listener (Cmd/Ctrl+J to focus)
4. Style to match existing app theme
5. Emit events for command submission
6. Use `useAICommands` composable

**Styling**:
- Width: ~400px
- Fixed position: `bottom: 20px; right: 320px` (above properties panel)
- Semi-transparent background when not focused
- Z-index above canvas but below modals
- Smooth transitions

**Testing**:
- Component renders correctly
- Input disabled during processing
- Keyboard shortcut focuses input
- History dropdown shows last 10 commands

**Acceptance Criteria**:
- ✅ Panel always visible, fixed bottom-right
- ✅ Input disabled while processing
- ✅ Loading spinner shown during AI call
- ✅ Success/error messages display correctly
- ✅ Command history accessible (last 10)
- ✅ Cmd/Ctrl+J focuses input
- ✅ Matches app design theme

---

### ✅ Task 12: Canvas Integration
**PR Size**: Medium | **Complexity**: Medium | **Priority**: P0

**Objective**: Integrate AICommandPanel into CanvasView and wire up execution.

**Files Created/Modified**:
- `ui/src/views/CanvasView.vue` (modified)

**Implementation**:
1. Import `AICommandPanel` component
2. Add panel to template (below properties panel in z-index)
3. Calculate and pass viewport center:
   ```javascript
   const viewportCenter = computed(() => {
     const centerScreenX = stageSize.width / 2
     const centerScreenY = stageSize.height / 2
     
     // Convert screen to canvas coordinates
     const canvasX = (centerScreenX - stagePosition.x) / zoomLevel.value
     const canvasY = (centerScreenY - stagePosition.y) / zoomLevel.value
     
     return { x: canvasX, y: canvasY }
   })
   ```
4. Create `handleAICommand` handler:
   - Get context (selectedShapeIds, userId, canvasId, userName, viewportCenter)
   - Call `executeCommand` from useAICommands
   - Call `execute` from useCommandExecutor
   - Handle utility actions (zoom, undo, etc.)
   - Show success/error feedback
5. Pass props to AICommandPanel:
   - Context
   - Loading state
   - Error state
6. Wire up event handlers

**Testing**:
- Integration test: type command → shapes created
- Test viewport center calculation with pan/zoom
- Test with multiple selected shapes
- Test error handling
- Test utility commands trigger correct handlers

**Acceptance Criteria**:
- ✅ Panel renders in correct position
- ✅ Commands execute and create shapes
- ✅ Viewport center calculated correctly
- ✅ Selected shapes passed to commands
- ✅ Utility commands trigger canvas actions
- ✅ Errors displayed in panel
- ✅ Success feedback shown
- ✅ Multi-user sync works (shapes appear for others)

---

## Phase 4: Testing & Polish (Week 3)

### ✅ Task 13: Unit Tests
**PR Size**: Large | **Complexity**: Medium | **Priority**: P1

**Objective**: Comprehensive unit test coverage for all command types.

**Files Created/Modified**:
- `ui/src/composables/__tests__/useCommandExecutor.spec.js` (new)
- `ui/src/composables/__tests__/useAICommands.spec.js` (new)
- `ui/src/services/__tests__/aiService.spec.js` (new)

**Implementation**:
1. **aiService tests** (20 cases):
   - Successful command parsing
   - Auth error handling
   - Network error handling
   - Timeout handling
   - Response format validation

2. **useAICommands tests** (30 cases):
   - Command execution flow
   - Concurrent command prevention
   - History management (max 10)
   - Error state management
   - Processing state management

3. **useCommandExecutor tests** (50 cases):
   - Creation: all 4 shape types
   - Manipulation: scale, move, color, rotate
   - Layout: row, stack, grid, align, distribute
   - Complex: all 3 templates
   - Selection: by type, color, region
   - Deletion: selected, targeted, clear canvas
   - Style: batch updates
   - Utility: zoom, center, undo

**Testing**:
- All tests pass
- Coverage > 80%

**Acceptance Criteria**:
- ✅ 100 test cases implemented
- ✅ All tests passing
- ✅ Mock useShapes and useUndoRedo
- ✅ Edge cases covered
- ✅ Error handling tested

---

### ✅ Task 14: Integration & Regression Tests
**PR Size**: Large | **Complexity**: High | **Priority**: P1

**Objective**: End-to-end Playwright tests for AI command flow.

**Files Created/Modified**:
- `ui/tests/ai-command-creation.spec.js` (new)
- `ui/tests/ai-command-manipulation.spec.js` (new)
- `ui/tests/ai-command-layout.spec.js` (new)
- `ui/tests/ai-command-complex.spec.js` (new)
- `ui/tests/ai-command-multiuser.spec.js` (new)

**Implementation**:
1. **Creation tests** (5 test cases):
   - Create red circle
   - Create blue rectangle
   - Create line
   - Create text with content
   - Verify positioning at viewport center

2. **Manipulation tests** (4 test cases):
   - Scale selected shape
   - Change color
   - Move shape
   - Rotate shape

3. **Layout tests** (3 test cases):
   - Arrange in row (3 shapes)
   - Stack vertically (3 shapes)
   - Verify spacing

4. **Complex tests** (3 test cases):
   - Login form (6 shapes, proper arrangement)
   - Traffic light (4 shapes, proper layout)
   - Navigation bar (4 shapes, spacing)

5. **Multi-user tests** (2 test cases):
   - User A creates shape via AI → User B sees it
   - Both users use AI simultaneously

**Testing**:
- Run with Playwright
- All tests pass
- Visual regression checks

**Acceptance Criteria**:
- ✅ 17 Playwright tests implemented
- ✅ All tests passing
- ✅ Login form creates 3+ properly arranged shapes
- ✅ Multi-user sync works
- ✅ Can run headless in CI

---

### ✅ Task 15: Performance Optimization
**PR Size**: Medium | **Complexity**: High | **Priority**: P1

**Objective**: Optimize for sub-2 second response times.

**Files Created/Modified**:
- `ui/src/composables/useAICommands.js` (modified)
- `ui/src/composables/useCommandExecutor.js` (modified)
- `functions/ai/parseCommand.js` (modified)

**Implementation**:
1. **Backend optimizations**:
   - Use GPT-4-turbo (faster than GPT-4)
   - Set timeout to 5s
   - Optimize prompt length
   - Cache OpenAI model instance

2. **Frontend optimizations**:
   - Debounce AI calls if typing quickly (500ms)
   - Cache viewport context (recompute only on pan/zoom)
   - Parallel shape creation where possible
   - Optimize template execution (batch operations)

3. **Performance monitoring**:
   - Log AI parsing time
   - Log execution time
   - Track total latency
   - Add performance marks

**Testing**:
- Performance benchmarks with 100 random commands
- 90%+ under 2 seconds
- Average latency logged

**Acceptance Criteria**:
- ✅ 90% of commands complete in < 2s
- ✅ AI parsing < 1s (average)
- ✅ Execution < 500ms (average)
- ✅ Complex templates < 1.5s total
- ✅ Performance logs available
- ✅ No blocking UI during execution

---

### ✅ Task 16: Error Handling & UX Polish
**PR Size**: Small | **Complexity**: Low | **Priority**: P2

**Objective**: Comprehensive error handling and polished user experience.

**Files Created/Modified**:
- `ui/src/components/AICommandPanel.vue` (modified)
- `ui/src/composables/useCommandExecutor.js` (modified)
- `ui/src/composables/useAICommands.js` (modified)

**Implementation**:
1. **Error messages** (simple, user-friendly):
   - "I couldn't understand that command" (parse error)
   - "You must be logged in to use AI commands" (auth error)
   - "No shapes selected" (manipulation without selection)
   - "Failed to execute command" (execution error)
   - "Command timed out, please try again" (timeout)

2. **UX improvements**:
   - Smooth transitions for loading state
   - Success animation (green checkmark, 2s)
   - Error shake animation
   - Clear button to reset input
   - Placeholder text with example commands
   - Tooltip on keyboard shortcut hint

3. **Input validation**:
   - Max 500 characters
   - Trim whitespace
   - Prevent empty submissions
   - Show character count near limit

4. **Accessibility**:
   - Proper ARIA labels
   - Keyboard navigation
   - Screen reader friendly
   - Focus management

**Testing**:
- Manual UX testing
- Accessibility audit
- Error scenario testing

**Acceptance Criteria**:
- ✅ All error messages are simple and clear
- ✅ Success feedback is visible and pleasant
- ✅ Input validation prevents bad submissions
- ✅ Character limit enforced (500 chars)
- ✅ Placeholder shows example commands
- ✅ Smooth animations and transitions
- ✅ Accessible to keyboard and screen readers

---

## Phase 5: Documentation & Regression Test Suite (Week 4)

### ✅ Task 17: Regression Test Suite
**PR Size**: Medium | **Complexity**: Medium | **Priority**: P2

**Objective**: Create regression test suite for future bug prevention.

**Files Created/Modified**:
- `ui/tests/ai-regression/` (new directory)
- `ui/tests/ai-regression/README.md` (new)
- `ui/tests/ai-regression/command-accuracy.spec.js` (new)

**Implementation**:
1. Create test suite with 50+ command variations
2. Test accuracy (should execute correctly)
3. Test ambiguity handling
4. Test edge cases:
   - Very long commands
   - Misspellings
   - Ambiguous references
   - Invalid commands
5. Document expected behavior for each test

**Testing**:
- Run full regression suite
- Track accuracy rate (target 90%+)

**Acceptance Criteria**:
- ✅ 50+ test cases covering all command types
- ✅ 90%+ accuracy rate
- ✅ Edge cases documented
- ✅ Can run in CI pipeline
- ✅ README explains how to add new tests

---

## Summary

**Total PRs**: 17
**Total Estimated Time**: 3-4 weeks
**Priority Breakdown**:
- P0 (Must Have): 8 tasks
- P1 (Should Have): 7 tasks  
- P2 (Nice to Have): 2 tasks

**Dependencies**:
- Tasks 1-4 can be done in parallel
- Task 5 blocks tasks 6-10
- Task 11 depends on tasks 3-4
- Task 12 depends on tasks 5-11
- Tasks 13-17 can be done in parallel after task 12

**Success Metrics**:
- ✅ All 8 command categories working
- ✅ Sub-2 second response time (90%)
- ✅ 90%+ accuracy on test suite
- ✅ Multi-user support functional
- ✅ 100+ test cases passing
- ✅ Firebase Cloud Function deployed

