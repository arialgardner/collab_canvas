## PRD: AI-Powered Canvas Commands (v6)

### Overview
Add AI assistant functionality to enable natural language commands for canvas operations. Users can type commands like "draw a circle" or "create a login form" to perform actions on the canvas without manual tool selection.

### Goals
- Enable 8+ distinct command types covering creation, manipulation, layout, and complex operations
- Achieve sub-2 second response times with 90%+ accuracy
- Support multiple concurrent users issuing AI commands
- Provide natural UX with clear feedback and error handling
- Integrate seamlessly with existing collaborative canvas state

### Non-Goals
- No voice input in this scope
- No AI-generated custom graphics or images
- No natural language parsing of freeform drawing commands beyond basic shapes
- No AI model training or fine-tuning (use OpenAI API as-is)
- No command history persistence beyond current session (in-memory only)
- No minimizable/draggable AI panel (fixed dock position)

### Users/Stories
- As a user, I can type "create a blue circle at 500,300" to add shapes without using toolbar
- As a user, I can say "make it bigger" to resize the last created object
- As a user, I can request "create a login form" to generate a pre-built component
- As a user, I can type "arrange in a grid" to auto-layout selected shapes
- As a user, I receive clear feedback when AI can't understand my command
- As a collaborative user, I see AI-created shapes from other users in real-time

---

## Technical Architecture

### Components

#### 1. AICommandPanel.vue
**Location**: `ui/src/components/AICommandPanel.vue`

**Props**: 
- `canvasId` (String, required)
- `userId` (String, required) 
- `userName` (String, required)
- `viewportCenter` (Object: {x, y}, required) - Center of visible viewport
- `selectedShapeIds` (Array, optional) - Currently selected shapes
- `zoomLevel` (Number, required)
- `panOffset` (Object: {x, y}, required)

**Emits**:
- `command-executed` - When AI command completes successfully
- `command-failed` - When AI command fails

**UI Structure**:
```
┌─────────────────────────────────────┐
│ AI Assistant                    [i] │
├─────────────────────────────────────┤
│ [Input field: "Type a command..."] │
│                            [Submit] │
├─────────────────────────────────────┤
│ Command History (3 most recent)    │
│ • Created blue circle               │
│ • Arranged in grid                  │
│ • Created login form                │
└─────────────────────────────────────┘
```

**Features**:
- Fixed position: bottom-right corner, 400px width, above zoom controls
- Text input with submit button and Enter key support
- Disable input while processing (show loading spinner)
- Display last 3 commands in history section
- Show status messages (success/error) below input for 3 seconds
- Clear button to reset input

**State Management**:
```javascript
const commandHistory = ref([]) // In-memory only, max 50 items
const isProcessing = ref(false)
const statusMessage = ref(null) // {type: 'success'|'error', text: string}
const currentInput = ref('')
```

#### 2. useAICommands.js Composable
**Location**: `ui/src/composables/useAICommands.js`

**Purpose**: Core AI logic for parsing commands and executing canvas operations

**Key Functions**:
```javascript
// Main function to process natural language command
const executeCommand = async (commandText, context) => {
  // context includes: userId, userName, canvasId, viewportCenter, selectedShapeIds, etc.
}

// Parse command using OpenAI and extract intent/parameters
const parseCommand = async (commandText, context) => {
  // Returns: { intent, parameters, confidence }
}

// Execute specific command types
const executeCreate = async (params) => {}
const executeModify = async (params) => {}
const executeArrange = async (params) => {}
const executeDelete = async (params) => {}
const executeStyle = async (params) => {}
const executeSelect = async (params) => {}
const executeComplex = async (params) => {}
const executeQuery = async (params) => {} // "how many circles?"
```

**Dependencies**:
- `useShapes()` - Create, update, delete shapes
- `useUndoRedo()` - Record AI actions as undoable operations
- OpenAI SDK for command parsing

#### 3. OpenAI Integration Service
**Location**: `ui/src/services/aiService.js`

**Configuration**:
```javascript
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Required for client-side usage
})

// Model: gpt-4-turbo or gpt-3.5-turbo for speed
const MODEL = 'gpt-3.5-turbo'
```

**Core Function**:
```javascript
export const parseNaturalLanguageCommand = async (commandText, contextData) => {
  const systemPrompt = buildSystemPrompt()
  const userPrompt = buildUserPrompt(commandText, contextData)
  
  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.1, // Low temperature for consistency
    response_format: { type: 'json_object' }
  })
  
  return JSON.parse(response.choices[0].message.content)
}
```

---

## Command Types and Categories

### Category 1: Creation Commands (3 types)

#### 1.1 Create Single Shape
**Examples**:
- "draw a circle"
- "create a blue rectangle at 500,300"
- "add a red circle with radius 80"
- "make a green square"

**Intent**: `CREATE_SHAPE`

**Parameters**:
```javascript
{
  intent: "CREATE_SHAPE",
  shapeType: "circle" | "rectangle" | "line" | "text",
  position: { x: number, y: number } | null, // null = viewport center
  properties: {
    fill: string,         // Color
    width: number,        // For rectangles
    height: number,       // For rectangles
    radius: number,       // For circles
    points: number[],     // For lines
    text: string,         // For text
    fontSize: number      // For text
  }
}
```

**Positioning Logic**:
- If coordinates specified: use exact position
- If "center" mentioned: use viewport center
- If no position: default to viewport center
- Convert viewport center to canvas coordinates: `canvasX = viewportCenterX - panOffset.x`

#### 1.2 Create Multiple Shapes
**Examples**:
- "create 5 circles"
- "draw 10 blue rectangles"
- "make 3 red squares in a row"

**Intent**: `CREATE_MULTIPLE_SHAPES`

**Parameters**:
```javascript
{
  intent: "CREATE_MULTIPLE_SHAPES",
  shapeType: string,
  count: number,
  arrangement: "grid" | "horizontal" | "vertical" | "scattered" | null,
  properties: { fill, size, etc. }
}
```

**Execution**:
- Default arrangement: horizontal line with 120px spacing
- Grid arrangement: Auto-calculate rows/columns (prefer square-ish grids)
- Start position: viewport center, expand right/down

#### 1.3 Create Text
**Examples**:
- "add text saying 'Hello World'"
- "create a title that says 'My Canvas'"
- "write 'Welcome' in large blue text"

**Intent**: `CREATE_TEXT`

**Parameters**:
```javascript
{
  intent: "CREATE_TEXT",
  text: string,
  position: { x, y } | null,
  properties: {
    fontSize: number,
    fill: string,
    fontFamily: string,
    fontStyle: "normal" | "bold" | "italic"
  }
}
```

### Category 2: Manipulation Commands (3 types)

#### 2.1 Move/Position
**Examples**:
- "move it to 600,400"
- "move the selected shape up 50 pixels"
- "center the circle"
- "move it to the right"

**Intent**: `MOVE_SHAPE`

**Parameters**:
```javascript
{
  intent: "MOVE_SHAPE",
  targetShapes: "selected" | "last_created" | shapeId[],
  position: { x, y } | null,
  direction: "up" | "down" | "left" | "right" | null,
  distance: number | null
}
```

**Target Resolution**:
- "it" or "this" → last created shape or first selected
- "selected" → all currently selected shapes
- "the circle" → find most recent circle

#### 2.2 Resize
**Examples**:
- "make it bigger"
- "resize the rectangle to 200x150"
- "double the size"
- "make it smaller"

**Intent**: `RESIZE_SHAPE`

**Parameters**:
```javascript
{
  intent: "RESIZE_SHAPE",
  targetShapes: "selected" | "last_created" | shapeId[],
  dimensions: { width, height } | { radius } | null,
  scaleMultiplier: number | null // e.g., 2 for "double", 0.5 for "half"
}
```

#### 2.3 Style Changes
**Examples**:
- "make it blue"
- "change the color to red"
- "set opacity to 50%"
- "add a black border"

**Intent**: `CHANGE_STYLE`

**Parameters**:
```javascript
{
  intent: "CHANGE_STYLE",
  targetShapes: "selected" | "last_created" | shapeId[],
  properties: {
    fill: string,
    stroke: string,
    strokeWidth: number,
    opacity: number
  }
}
```

### Category 3: Layout Commands (2 types)

#### 3.1 Arrange Shapes
**Examples**:
- "arrange in a grid"
- "line them up horizontally"
- "distribute evenly"
- "align to the left"

**Intent**: `ARRANGE_SHAPES`

**Parameters**:
```javascript
{
  intent: "ARRANGE_SHAPES",
  targetShapes: "selected" | "all",
  arrangement: "grid" | "horizontal" | "vertical",
  alignment: "left" | "center" | "right" | "top" | "middle" | "bottom" | null,
  spacing: number | null // Default 100px
}
```

**Execution**:
- Grid: Calculate rows/columns based on count (prefer square)
- Horizontal: Single row with even spacing
- Vertical: Single column with even spacing
- Alignment: Align shapes along specified edge while maintaining arrangement

#### 3.2 Layer Management
**Examples**:
- "bring it to front"
- "send to back"
- "move forward"
- "move backward"

**Intent**: `CHANGE_LAYER`

**Parameters**:
```javascript
{
  intent: "CHANGE_LAYER",
  targetShapes: "selected" | "last_created",
  action: "bring_to_front" | "send_to_back" | "bring_forward" | "send_backward"
}
```

### Category 4: Complex Commands (1 type)

#### 4.1 Create Template/Component
**Examples**:
- "create a login form"
- "make a button"
- "add a card layout"

**Intent**: `CREATE_TEMPLATE`

**Predefined Templates**:

**Login Form Template**:
```javascript
{
  name: "login_form",
  elements: [
    // Background card
    { 
      type: "rectangle", 
      x: centerX - 150, y: centerY - 100,
      width: 300, height: 250,
      fill: "#ffffff", stroke: "#e0e0e0", strokeWidth: 2,
      cornerRadius: 8
    },
    // Title
    {
      type: "text",
      text: "Login",
      x: centerX - 30, y: centerY - 80,
      fontSize: 24, fontFamily: "Arial", fontStyle: "bold"
    },
    // Username field
    {
      type: "rectangle",
      x: centerX - 125, y: centerY - 40,
      width: 250, height: 40,
      fill: "#f5f5f5", stroke: "#cccccc", strokeWidth: 1,
      cornerRadius: 4
    },
    // Username label
    {
      type: "text",
      text: "Username",
      x: centerX - 120, y: centerY - 32,
      fontSize: 14, fill: "#666666"
    },
    // Password field
    {
      type: "rectangle",
      x: centerX - 125, y: centerY + 10,
      width: 250, height: 40,
      fill: "#f5f5f5", stroke: "#cccccc", strokeWidth: 1,
      cornerRadius: 4
    },
    // Password label
    {
      type: "text",
      text: "Password",
      x: centerX - 120, y: centerY + 18,
      fontSize: 14, fill: "#666666"
    },
    // Submit button
    {
      type: "rectangle",
      x: centerX - 75, y: centerY + 70,
      width: 150, height: 45,
      fill: "#4f46e5", stroke: "transparent",
      cornerRadius: 6
    },
    // Button text
    {
      type: "text",
      text: "Sign In",
      x: centerX - 30, y: centerY + 84,
      fontSize: 16, fill: "#ffffff", fontStyle: "bold"
    }
  ]
}
```

**Button Template**:
```javascript
{
  name: "button",
  elements: [
    {
      type: "rectangle",
      x: centerX - 60, y: centerY - 20,
      width: 120, height: 40,
      fill: "#3b82f6", cornerRadius: 4
    },
    {
      type: "text",
      text: "Button",
      x: centerX - 25, y: centerY - 5,
      fontSize: 16, fill: "#ffffff"
    }
  ]
}
```

**Card Template**:
```javascript
{
  name: "card",
  elements: [
    // Card background
    {
      type: "rectangle",
      x: centerX - 150, y: centerY - 100,
      width: 300, height: 200,
      fill: "#ffffff", stroke: "#e5e7eb", strokeWidth: 2,
      cornerRadius: 8
    },
    // Header
    {
      type: "text",
      text: "Card Title",
      x: centerX - 140, y: centerY - 80,
      fontSize: 20, fontStyle: "bold"
    },
    // Body text
    {
      type: "text",
      text: "Card content goes here",
      x: centerX - 140, y: centerY - 40,
      fontSize: 14, fill: "#6b7280"
    }
  ]
}
```

**Parameters**:
```javascript
{
  intent: "CREATE_TEMPLATE",
  templateName: "login_form" | "button" | "card",
  position: { x, y } | null
}
```

**Execution**:
- Look up template from predefined templates object
- Calculate relative positions based on viewport center
- Create all shapes in sequence with 50ms delay between each for visibility
- Group shapes logically (optional: add metadata for "template_group_id")

### Category 5: Utility Commands (2 types)

#### 5.1 Delete
**Examples**:
- "delete this"
- "remove the selected shapes"
- "clear the canvas"

**Intent**: `DELETE_SHAPE`

**Parameters**:
```javascript
{
  intent: "DELETE_SHAPE",
  targetShapes: "selected" | "last_created" | "all"
}
```

#### 5.2 Query
**Examples**:
- "how many shapes are there?"
- "how many circles?"
- "what's selected?"

**Intent**: `QUERY_INFO`

**Parameters**:
```javascript
{
  intent: "QUERY_INFO",
  queryType: "count_total" | "count_by_type" | "selection_info",
  shapeType: string | null
}
```

**Response**: Display text response in status message area

---

## OpenAI Integration Details

### System Prompt
```
You are an AI assistant for a collaborative canvas application. Your job is to parse natural language commands and convert them to structured JSON commands.

The canvas supports these shape types: rectangle, circle, line, text

Available command intents:
- CREATE_SHAPE: Create a single shape
- CREATE_MULTIPLE_SHAPES: Create multiple shapes
- CREATE_TEXT: Create text element
- MOVE_SHAPE: Move/position shapes
- RESIZE_SHAPE: Resize shapes
- CHANGE_STYLE: Modify visual properties
- ARRANGE_SHAPES: Layout shapes in patterns
- CHANGE_LAYER: Modify z-index
- CREATE_TEMPLATE: Create predefined components
- DELETE_SHAPE: Remove shapes
- QUERY_INFO: Answer questions about canvas

Available templates: login_form, button, card

When parsing commands:
1. Identify the primary intent
2. Extract all relevant parameters
3. Handle ambiguous references (e.g., "it" = last created or selected shape)
4. Use sensible defaults for missing parameters
5. Return valid JSON only

Response format:
{
  "intent": "INTENT_NAME",
  "parameters": { ... },
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}

If you cannot parse the command with >70% confidence, return:
{
  "intent": "UNKNOWN",
  "confidence": 0.0,
  "reasoning": "explanation of what wasn't understood"
}
```

### User Prompt Template
```javascript
const buildUserPrompt = (commandText, context) => {
  return `
Command: "${commandText}"

Current Context:
- Viewport center: (${context.viewportCenter.x}, ${context.viewportCenter.y})
- Selected shapes: ${context.selectedShapeIds.length} shape(s) selected
- Last created shape: ${context.lastCreatedShape ? context.lastCreatedShape.type : 'none'}
- Total shapes on canvas: ${context.totalShapes}
- Canvas dimensions: 3000x3000 (bounded area)

Parse this command and return structured JSON.
`
}
```

### Response Handling
```javascript
const handleAIResponse = (response) => {
  const parsed = JSON.parse(response.choices[0].message.content)
  
  if (parsed.confidence < 0.7) {
    throw new Error(`Could not understand command: ${parsed.reasoning}`)
  }
  
  if (parsed.intent === "UNKNOWN") {
    throw new Error(`Unknown command: ${parsed.reasoning}`)
  }
  
  return parsed
}
```

### Error Messages
Predefined user-friendly error messages:
- "I couldn't understand that command. Try being more specific."
- "I'm not sure how to create that. Try commands like 'draw a circle' or 'create a rectangle'."
- "No shapes are selected. Select shapes first or specify which shape to modify."
- "That command requires a position. Try adding coordinates like 'at 500,300'."
- "I can only create rectangles, circles, lines, and text shapes."

---

## Implementation Plan

### Phase 1: Foundation (Week 1)
**Tasks**:
1. Set up OpenAI SDK integration
   - Add `openai` npm package to ui/package.json
   - Create `aiService.js` with basic API client
   - Add `VITE_OPENAI_API_KEY` to environment variables
   - Test basic API connection

2. Create AICommandPanel component
   - Build UI structure (input, history, status)
   - Implement fixed positioning (bottom-right, 400px width)
   - Add loading states and disabled input during processing
   - Wire up basic event handlers

3. Create useAICommands composable skeleton
   - Set up function signatures
   - Implement command history management (in-memory)
   - Add context gathering from canvas state

**Acceptance Criteria**:
- AI panel renders in correct position
- Input accepts text and shows loading state
- OpenAI API responds to test prompts
- Command history displays last 3 commands

### Phase 2: Basic Commands (Week 2)
**Tasks**:
1. Implement CREATE_SHAPE intent
   - Parse single shape creation commands
   - Handle position defaults (viewport center)
   - Support color/size parameters
   - Test with rectangles and circles

2. Implement CREATE_TEXT intent
   - Parse text content from command
   - Apply text styling properties
   - Position at viewport center by default

3. Implement MOVE_SHAPE intent
   - Resolve target shape references ("it", "selected")
   - Calculate position changes
   - Update shape positions via useShapes

4. Basic error handling
   - Display error messages for unknown commands
   - Handle API failures gracefully
   - Show timeout errors (>5 seconds)

**Acceptance Criteria**:
- Can create circles and rectangles via AI
- Can create text with custom content
- Can move shapes with directional commands
- Errors display clearly to users

### Phase 3: Advanced Commands (Week 3)
**Tasks**:
1. Implement manipulation commands
   - RESIZE_SHAPE with scale multipliers
   - CHANGE_STYLE for colors and properties
   - Support batch operations on selected shapes

2. Implement layout commands
   - ARRANGE_SHAPES with grid/horizontal/vertical
   - Calculate spacing and positioning
   - CHANGE_LAYER for z-index management

3. Implement CREATE_MULTIPLE_SHAPES
   - Parse count and arrangement
   - Create shapes with proper spacing
   - Support different arrangements

4. Implement DELETE_SHAPE
   - Parse target identification
   - Confirm deletions via existing modal
   - Integrate with undo/redo

**Acceptance Criteria**:
- Can resize and restyle shapes via commands
- Can arrange multiple shapes in grids
- Can create multiple shapes at once
- Deletions work with confirmations

### Phase 4: Complex Templates (Week 4)
**Tasks**:
1. Define template data structures
   - Create templates object with login_form, button, card
   - Define relative positioning logic
   - Calculate bounding boxes

2. Implement CREATE_TEMPLATE intent
   - Look up template by name
   - Calculate positions relative to viewport center
   - Create all template elements sequentially
   - Add visual feedback during creation

3. Implement QUERY_INFO intent
   - Count shapes by type
   - Report selection status
   - Display responses in status area

4. Prompt engineering optimization
   - Refine system prompt based on test results
   - Add example commands to improve accuracy
   - Tune temperature and parameters

**Acceptance Criteria**:
- "create a login form" produces 8 properly positioned elements
- Templates adapt to viewport center
- Query commands return accurate information
- Command accuracy >90% on test suite

### Phase 5: Multi-User & Performance (Week 5)
**Tasks**:
1. Multi-user testing
   - Test concurrent AI command execution
   - Verify real-time sync works with AI-created shapes
   - Test presence and cursor updates during AI operations

2. Performance optimization
   - Cache viewport center calculations
   - Batch shape creation operations
   - Optimize OpenAI API calls (token reduction)
   - Add request debouncing

3. Rate limiting
   - Implement per-user rate limits (10 commands/minute)
   - Queue commands if rate limit exceeded
   - Display rate limit messages

4. Undo/redo integration
   - Record AI commands as single undo steps
   - Support undoing complex multi-shape operations
   - Test redo functionality

**Acceptance Criteria**:
- Multiple users can issue AI commands simultaneously
- AI-created shapes sync correctly across clients
- Response time <2 seconds for 95% of commands
- AI operations appear in undo/redo stack

### Phase 6: Testing & Polish (Week 6)
**Tasks**:
1. Comprehensive testing
   - Test all 8+ command types
   - Test ambiguity handling
   - Test error scenarios
   - Test with 100+ shapes on canvas

2. UX improvements
   - Add command suggestions/autocomplete
   - Improve error messages based on user testing
   - Add success animations
   - Polish loading states

3. Documentation
   - Create user guide for AI commands
   - Document supported command patterns
   - Add help tooltip to AI panel

4. Playwright E2E tests
   - Test basic command execution
   - Test template creation
   - Test error handling
   - Test multi-user scenarios

**Acceptance Criteria**:
- All 8 command types tested and working
- Playwright tests pass with >90% accuracy
- User documentation complete
- Sub-2 second response for 95% of commands

---

## File Structure

### New Files to Create

```
ui/src/
├── components/
│   └── AICommandPanel.vue          # Main AI panel component
├── composables/
│   └── useAICommands.js           # Core AI command logic
├── services/
│   ├── aiService.js               # OpenAI API integration
│   └── aiTemplates.js             # Predefined templates
├── utils/
│   └── aiCommandParser.js         # Helper functions for parsing
└── tests/
    └── ai-commands.spec.js        # Playwright tests

ui/.env (add):
VITE_OPENAI_API_KEY=sk-...
```

### Modified Files

```
ui/src/views/CanvasView.vue
- Import and add <AICommandPanel> component
- Pass required props (canvasId, userId, viewportCenter, etc.)
- Handle command-executed and command-failed events

ui/package.json
- Add "openai": "^4.20.0"

ui/src/composables/useShapes.js
- Expose lastCreatedShape ref for AI reference
- Add batch creation helper if not present
```

---

## API Usage & Cost Estimates

### OpenAI Model Selection
- **Primary**: `gpt-3.5-turbo` for speed and cost efficiency
- **Fallback**: `gpt-4-turbo` if accuracy issues arise

### Token Usage Per Request
- System prompt: ~400 tokens
- User prompt + context: ~150 tokens
- Response: ~200 tokens
- **Total per command**: ~750 tokens

### Cost Estimates (gpt-3.5-turbo)
- Input: $0.50 / 1M tokens
- Output: $1.50 / 1M tokens
- **Cost per command**: ~$0.0005 (5/100th of a cent)
- **100 commands**: ~$0.05
- **1000 commands**: ~$0.50

### Rate Limiting Strategy
- Client-side: 10 commands per user per minute
- Monitor API usage via OpenAI dashboard
- Implement usage alerts at $10, $50, $100 monthly spend
- Consider implementing token caching for repeated contexts

---

## Performance Requirements

### Response Time Targets
- Simple commands (create, move, delete): <1 second
- Complex commands (templates, arrangements): <2 seconds
- Query commands: <1 second
- 95th percentile: <2 seconds
- Timeout threshold: 5 seconds

### Accuracy Targets
- Command recognition: >90% accuracy
- Parameter extraction: >85% accuracy
- Position calculation: 100% accuracy (deterministic)
- Template creation: 100% success rate

### Scalability
- Support 10+ concurrent users issuing commands
- Handle canvases with 500+ shapes without degradation
- Maintain <100ms UI response time during processing
- No impact on existing canvas performance

---

## Security & Privacy

### API Key Management
- Store OpenAI API key in environment variables only
- Never commit keys to git (add to .gitignore)
- Use `dangerouslyAllowBrowser: true` for client-side OpenAI SDK
- Consider backend proxy in future for production (post-MVP)

### Data Handling
- Only send necessary context to OpenAI (no user emails, sensitive data)
- Command text is sent to OpenAI API (inform users in privacy policy)
- No command history persistence on server
- Commands are not logged in Firestore

### Rate Limiting
- Per-user rate limiting to prevent abuse
- Implement exponential backoff for API failures
- Monitor for suspicious patterns (automated bots)

---

## Testing Strategy

### Unit Tests
Test each command intent handler:
- `executeCreate()` with various parameters
- `executeMove()` with target resolution
- `executeResize()` with scale multipliers
- `executeTemplate()` with all templates
- Error handling for invalid inputs

### Integration Tests
- OpenAI API integration (mock responses)
- Command execution with real useShapes composable
- Undo/redo integration
- Multi-shape operations

### E2E Tests (Playwright)

#### Test Suite 1: Basic Commands
```javascript
test('AI creates circle at center', async ({ page }) => {
  await page.goto('/canvas/test-canvas-id')
  await page.fill('[data-testid="ai-command-input"]', 'draw a circle')
  await page.click('[data-testid="ai-submit-button"]')
  await expect(page.locator('canvas')).toContainText('circle')
  // Verify circle exists in canvas
})

test('AI creates text with content', async ({ page }) => {
  await page.goto('/canvas/test-canvas-id')
  await page.fill('[data-testid="ai-command-input"]', 'add text saying Hello World')
  await page.click('[data-testid="ai-submit-button"]')
  // Verify text shape exists with correct content
})

test('AI moves selected shape', async ({ page }) => {
  // Create and select a shape first
  await page.fill('[data-testid="ai-command-input"]', 'move it to 500,300')
  await page.click('[data-testid="ai-submit-button"]')
  // Verify shape moved to correct position
})
```

#### Test Suite 2: Complex Templates
```javascript
test('AI creates login form template', async ({ page }) => {
  await page.goto('/canvas/test-canvas-id')
  await page.fill('[data-testid="ai-command-input"]', 'create a login form')
  await page.click('[data-testid="ai-submit-button"]')
  await page.waitForTimeout(2000) // Allow template creation
  
  // Verify 8+ shapes created
  const shapeCount = await page.evaluate(() => {
    return window.__shapes__.size // Access shapes via test hook
  })
  expect(shapeCount).toBeGreaterThanOrEqual(8)
})

test('Login form elements are properly arranged', async ({ page }) => {
  await page.goto('/canvas/test-canvas-id')
  await page.fill('[data-testid="ai-command-input"]', 'create a login form')
  await page.click('[data-testid="ai-submit-button"]')
  await page.waitForTimeout(2000)
  
  // Verify relative positions (title above fields, button at bottom)
  const elements = await page.evaluate(() => {
    return Array.from(window.__shapes__.values())
  })
  
  const title = elements.find(e => e.text === 'Login')
  const button = elements.find(e => e.text === 'Sign In')
  
  expect(title.y).toBeLessThan(button.y)
})
```

#### Test Suite 3: Error Handling
```javascript
test('AI shows error for unknown command', async ({ page }) => {
  await page.goto('/canvas/test-canvas-id')
  await page.fill('[data-testid="ai-command-input"]', 'xyzabc nonsense')
  await page.click('[data-testid="ai-submit-button"]')
  
  await expect(page.locator('[data-testid="ai-status"]')).toContainText('couldn\'t understand')
})

test('Input disabled while processing', async ({ page }) => {
  await page.goto('/canvas/test-canvas-id')
  await page.fill('[data-testid="ai-command-input"]', 'create a login form')
  await page.click('[data-testid="ai-submit-button"]')
  
  // Verify input is disabled immediately
  const isDisabled = await page.isDisabled('[data-testid="ai-command-input"]')
  expect(isDisabled).toBe(true)
})
```

#### Test Suite 4: Multi-User
```javascript
test('Multiple users can issue AI commands simultaneously', async ({ browser }) => {
  const context1 = await browser.newContext()
  const context2 = await browser.newContext()
  const page1 = await context1.newPage()
  const page2 = await context2.newPage()
  
  await page1.goto('/canvas/test-canvas-id')
  await page2.goto('/canvas/test-canvas-id')
  
  // Issue commands simultaneously
  await Promise.all([
    page1.fill('[data-testid="ai-command-input"]', 'draw a red circle'),
    page2.fill('[data-testid="ai-command-input"]', 'draw a blue rectangle')
  ])
  
  await Promise.all([
    page1.click('[data-testid="ai-submit-button"]'),
    page2.click('[data-testid="ai-submit-button"]')
  ])
  
  await page1.waitForTimeout(2000)
  
  // Verify both shapes exist on both clients
  const shapes1 = await page1.evaluate(() => window.__shapes__.size)
  const shapes2 = await page2.evaluate(() => window.__shapes__.size)
  
  expect(shapes1).toBe(2)
  expect(shapes2).toBe(2)
})
```

### Accuracy Testing
Create test suite of 50+ diverse commands:
- 10 creation commands
- 10 manipulation commands
- 10 layout commands
- 5 complex template commands
- 10 utility commands
- 5 ambiguous commands

Target: >90% accuracy on full test suite

---

## Success Metrics

### Functional Requirements
- ✅ 8+ distinct command types implemented
- ✅ All 4 categories covered (creation, manipulation, layout, complex)
- ✅ "Create login form" produces 8 properly arranged elements
- ✅ Complex layouts execute multi-step plans correctly
- ✅ Smart positioning (viewport center defaults)
- ✅ Handles ambiguity (target resolution)

### Performance Requirements
- ✅ Sub-2 second responses for 95% of commands
- ✅ 90%+ accuracy on test suite
- ✅ No impact on existing canvas performance

### UX Requirements
- ✅ Natural command input with feedback
- ✅ Clear error messages
- ✅ Disabled input while processing
- ✅ Command history visible

### Multi-User Requirements
- ✅ Shared state works flawlessly
- ✅ Multiple users can use AI simultaneously
- ✅ AI-created shapes sync in real-time

---

## User Documentation

### AI Command Guide

#### Getting Started
The AI Assistant panel appears in the bottom-right corner of the canvas. Type natural language commands and press Enter or click Submit.

#### Supported Commands

**Creating Shapes**:
- `draw a circle`
- `create a blue rectangle at 500,300`
- `add a red square`
- `make 5 circles in a row`

**Adding Text**:
- `add text saying 'Hello World'`
- `create a title that says 'My Canvas'`
- `write 'Welcome' in large blue text`

**Moving Shapes**:
- `move it to 600,400`
- `move the circle up 50 pixels`
- `center the selected shape`

**Resizing**:
- `make it bigger`
- `resize to 200x150`
- `double the size`

**Styling**:
- `make it blue`
- `change the color to red`
- `add a black border`

**Arranging**:
- `arrange in a grid`
- `line them up horizontally`
- `distribute evenly`

**Templates**:
- `create a login form`
- `make a button`
- `add a card layout`

**Other Actions**:
- `delete this`
- `bring to front`
- `how many shapes are there?`

#### Tips
- If no position is specified, shapes are created at the center of your view
- Use "it" or "this" to refer to the last created or selected shape
- Select shapes first before using modification commands
- Complex templates like "login form" create multiple elements automatically

#### Limitations
- AI commands are processed one at a time
- Only basic shapes supported (rectangles, circles, lines, text)
- Custom graphics or freeform drawings not supported
- Command history clears on page refresh

---

## Future Enhancements (Post-V6)

### Potential v7 Features
- **Voice Input**: Speech-to-text for hands-free commands
- **Custom Templates**: Users can save their own template groups
- **Command Macros**: Record sequences of commands and replay
- **Contextual Suggestions**: AI suggests next logical commands
- **Natural Language Queries**: "Show me all red circles" with visual highlighting
- **Collaborative AI**: "Show me what User X just created"
- **Backend Proxy**: Move OpenAI calls to backend for better security
- **Command History Persistence**: Save command history in Firestore
- **Minimizable Panel**: Drag and dock AI panel anywhere
- **Smart Defaults**: Learn user preferences (favorite colors, sizes)

### Technical Improvements
- Fine-tuned model for canvas-specific commands
- Token caching for repeated contexts
- WebSocket-based streaming responses
- Command validation before execution
- A/B testing different prompts
- Telemetry for command usage analytics

---

## Appendix A: Command Reference Matrix

| Command Example | Intent | Targets | Parameters | Complexity |
|----------------|---------|---------|------------|------------|
| "draw a circle" | CREATE_SHAPE | None | type, position | Simple |
| "create 5 circles" | CREATE_MULTIPLE_SHAPES | None | type, count, arrangement | Medium |
| "add text saying 'Hi'" | CREATE_TEXT | None | text, position, style | Simple |
| "move it to 500,300" | MOVE_SHAPE | Last/Selected | position | Simple |
| "make it bigger" | RESIZE_SHAPE | Last/Selected | scale | Simple |
| "change color to blue" | CHANGE_STYLE | Last/Selected | fill | Simple |
| "arrange in a grid" | ARRANGE_SHAPES | Selected | arrangement, spacing | Medium |
| "bring to front" | CHANGE_LAYER | Last/Selected | action | Simple |
| "create a login form" | CREATE_TEMPLATE | None | templateName | Complex |
| "delete this" | DELETE_SHAPE | Last/Selected | None | Simple |
| "how many circles?" | QUERY_INFO | All | queryType, shapeType | Simple |

**Total: 11 distinct command types** (exceeds 8+ requirement)

---

## Appendix B: Environment Variables

Add to `ui/.env.local`:

```bash
# OpenAI Configuration
VITE_OPENAI_API_KEY=sk-proj-...your-key-here...

# Optional: AI Configuration
VITE_AI_MODEL=gpt-3.5-turbo
VITE_AI_TEMPERATURE=0.1
VITE_AI_MAX_TOKENS=500
VITE_AI_TIMEOUT=5000
VITE_AI_RATE_LIMIT=10
```

Add to `ui/.env.example`:

```bash
# OpenAI Configuration (required for AI commands)
VITE_OPENAI_API_KEY=your-openai-api-key

# Optional: AI Configuration
VITE_AI_MODEL=gpt-3.5-turbo
VITE_AI_TEMPERATURE=0.1
VITE_AI_MAX_TOKENS=500
VITE_AI_TIMEOUT=5000
VITE_AI_RATE_LIMIT=10
```

---

## Appendix C: Regression Test Cases

As bugs are discovered and fixed, add test cases here:

### Test Case Template
```javascript
test('[Bug ID] - [Description]', async ({ page }) => {
  // Steps to reproduce
  // Expected behavior
  // Actual behavior (before fix)
  // Verification (after fix)
})
```

*To be populated during implementation and testing phases.*

---

## Questions & Decisions Log

### Q: Should AI commands be rate-limited per user or per canvas?
**A**: Per user globally across all canvases to prevent abuse.

### Q: How to handle long-running template creation?
**A**: Show progress indicator and create shapes with 50ms delays for visibility.

### Q: Should AI commands be visible in command history to other users?
**A**: No, command history is local to each user. Only resulting shapes are shared.

### Q: What if OpenAI API is down?
**A**: Display error message and suggest manual creation. No fallback parsing.

### Q: Backend vs. frontend OpenAI calls?
**A**: Frontend for MVP (faster iteration). Backend in future for security.

### Q: Should we support undo for AI commands?
**A**: Yes, treat entire AI command as single undo step.

---

## Approval & Sign-off

**PRD Version**: 1.0  
**Created**: [Date]  
**Author**: AI Assistant  
**Status**: Draft → Ready for Implementation

**Approved by**:
- [ ] Product Owner
- [ ] Engineering Lead
- [ ] UX Designer

**Implementation Start Date**: TBD  
**Target Completion**: 6 weeks from start

---

*End of PRD v6*
