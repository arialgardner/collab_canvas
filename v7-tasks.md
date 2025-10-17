CollabCanvas v6 - AI Commands Task List & PR Breakdown
Goal: Add AI-powered natural language commands to enable users to create and manipulate canvas shapes via text input

Requirements from PRD v6:
- 8+ distinct command types covering creation, manipulation, layout, and complex operations
- Sub-2 second response times with 90%+ accuracy
- Fixed AI panel (bottom-right, 400px width, non-minimizable)
- OpenAI API integration (gpt-3.5-turbo)
- Support multiple concurrent users issuing AI commands
- Predefined templates (login form, button, card)
- In-memory command history (no persistence)
- Integration with existing undo/redo system
- Smart defaults (viewport center positioning)
- Clear error handling and user feedback

---

PR #1: OpenAI Integration & Foundation (PRD v6)
Purpose: Set up OpenAI SDK and create base service layer for AI command parsing
Tasks:

 Install OpenAI SDK
 
 Add openai@^4.20.0 to ui/package.json
 Run npm install in ui directory
 
 
 Configure environment variables
 
 Add VITE_OPENAI_API_KEY to ui/.env.local
 Add VITE_AI_MODEL=gpt-3.5-turbo (optional)
 Add VITE_AI_TEMPERATURE=0.1 (optional)
 Add VITE_AI_MAX_TOKENS=500 (optional)
 Add VITE_AI_TIMEOUT=5000 (optional)
 Create ui/.env.example with placeholder values
 Add .env.local to .gitignore if not present
 
 
 Create AI service module
 
 Create ui/src/services/aiService.js
 Initialize OpenAI client with API key from env
 Set dangerouslyAllowBrowser: true for client-side usage
 Implement parseNaturalLanguageCommand(commandText, contextData)
 Configure model, temperature, and response format (JSON)
 Add error handling for API failures and timeouts
 Add request/response logging for debugging
 
 
 Build system prompt
 
 Define comprehensive system prompt for canvas command parsing
 List all supported intents (11 types)
 Specify available shape types and templates
 Define JSON response format with intent, parameters, confidence, reasoning
 Handle UNKNOWN intent for low-confidence responses (<0.7)
 
 
 Build user prompt template
 
 Create buildUserPrompt(commandText, context) function
 Include viewport center, selected shapes, last created shape
 Include total shapes and canvas dimensions
 Format context data clearly for AI parsing
 
 
 Add response handling
 
 Parse JSON response from OpenAI
 Validate confidence threshold (>0.7)
 Handle UNKNOWN intent gracefully
 Return structured command object
 
 
 Create error message mapping
 
 Define user-friendly error messages for common issues
 Map API errors to readable messages
 Handle timeout scenarios
 Handle rate limit errors
 

Tests:

 Unit test: aiService.js
 
 Test OpenAI client initializes correctly
 Test parseNaturalLanguageCommand with mock responses
 Test error handling for API failures
 Test timeout handling (>5 seconds)
 Test confidence threshold validation
 Test JSON parsing and response structure
 
 
 Integration test: OpenAI API connection
 
 Test real API call with simple command ("draw a circle")
 Verify response format matches expected structure
 Verify confidence scoring works
 Test rate limiting (if implemented)
 
 
 Manual test: API key validation
 
 Test with valid API key → success
 Test with invalid API key → clear error message
 Test with missing API key → graceful failure
 

Deliverable:
✅ OpenAI SDK integrated and working. AI service can parse natural language and return structured commands with 90%+ accuracy on simple test cases.

---

PR #2: AI Command Panel UI Component (PRD v6)
Purpose: Create the AI panel interface with input, history, and status display
Tasks:

 Create AICommandPanel component
 
 Create ui/src/components/AICommandPanel.vue
 Fixed position: bottom-right corner, 400px width
 Z-index above canvas but below modals
 Position 20px from bottom and right edges
 Ensure it doesn't overlap zoom controls (adjust as needed)
 
 
 Build panel structure
 
 Header with "AI Assistant" title and info icon
 Text input field with placeholder "Type a command..."
 Submit button with icon (send arrow)
 Command history section showing last 3 commands
 Status message area for success/error feedback
 Clear button to reset input
 
 
 Style the panel
 
 Modern card design with shadow and border
 White background with subtle border
 Rounded corners (8px)
 Input styling consistent with existing UI
 Submit button with primary color
 Loading spinner during processing
 
 
 Implement input handling
 
 V-model binding for text input
 Enter key triggers submit
 Disable input while processing
 Show loading spinner in input area during processing
 Clear input after successful submission
 Focus management (auto-focus after submit)
 
 
 Implement command history display
 
 Show last 3 commands in chronological order (newest first)
 Display timestamp for each command (e.g., "2 minutes ago")
 Truncate long commands with ellipsis
 Optional: Click command to re-run
 Scroll if more than 3 commands
 
 
 Implement status messages
 
 Success message: green background, checkmark icon, 3-second auto-dismiss
 Error message: red background, error icon, 5-second auto-dismiss
 Display message text clearly
 Smooth fade-in/out animations
 
 
 Add component props
 
 canvasId (String, required)
 userId (String, required)
 userName (String, required)
 viewportCenter (Object: {x, y}, required)
 selectedShapeIds (Array, optional, default: [])
 zoomLevel (Number, required)
 panOffset (Object: {x, y}, required)
 
 
 Add component events
 
 @command-executed - emitted when AI command completes successfully
 @command-failed - emitted when AI command fails
 Include command text and result data in event payload
 
 
 Add accessibility
 
 Aria labels for input and buttons
 Keyboard navigation support
 Focus visible states
 Screen reader friendly status messages
 

Tests:

 Unit test: AICommandPanel.vue
 
 Test component renders with required props
 Test input binding and clearing
 Test submit button enables/disables correctly
 Test Enter key triggers submit
 Test command history displays correctly
 Test status messages appear and auto-dismiss
 
 
 Integration test: Panel interactions
 
 Test typing and submitting command
 Test loading state during processing
 Test history updates after command execution
 Test error message display
 Test success message display
 
 
 Visual test: Panel positioning
 
 Verify panel appears in bottom-right corner
 Verify panel doesn't overlap zoom controls
 Verify panel stays fixed during canvas pan/zoom
 Test responsive behavior (min width 400px)
 

Deliverable:
✅ AI Command Panel renders in bottom-right corner with working input, history display, and status messages. Ready for command processing integration.

---

PR #3: AI Commands Composable & Basic Command Execution (PRD v6)
Purpose: Create useAICommands composable with command parsing and execution logic
Tasks:

 Create useAICommands composable
 
 Create ui/src/composables/useAICommands.js
 Import aiService for OpenAI integration
 Import useShapes for shape operations
 Import useUndoRedo for undo integration
 Set up reactive state management
 
 
 Implement core state
 
 commandHistory ref (array, max 50 items)
 isProcessing ref (boolean)
 lastCreatedShape ref (track for "it" references)
 Add function to gather canvas context
 
 
 Implement executeCommand function
 
 Main entry point: executeCommand(commandText, context)
 Validate input (non-empty, reasonable length)
 Set isProcessing = true
 Call parseCommand to get intent and parameters
 Route to specific execution functions based on intent
 Update command history
 Set isProcessing = false
 Return success/error result
 
 
 Implement parseCommand function
 
 Call aiService.parseNaturalLanguageCommand
 Gather full context (viewport, selection, shapes, etc.)
 Pass to OpenAI API
 Parse response and extract intent/parameters
 Validate confidence threshold
 Handle UNKNOWN intent
 Return structured command object
 
 
 Implement context gathering
 
 getCurrentContext() function
 Include viewportCenter, panOffset, zoomLevel
 Include selectedShapeIds and count
 Include lastCreatedShape data
 Include total shape count
 Include canvas bounds (3000x3000)
 
 
 Implement target shape resolution
 
 resolveTargetShapes(targetSpec, context) function
 Handle "selected" → return selected shape IDs
 Handle "last_created" → return last created shape ID
 Handle "it" / "this" → return last created or first selected
 Handle "all" → return all shape IDs
 Handle shape type filters ("the circle" → find most recent circle)
 Return array of shape IDs to operate on
 
 
 Add command history management
 
 addToHistory(command, result) function
 Store command text, timestamp, success/failure, result summary
 Maintain max 50 items (FIFO)
 Format for display in UI
 
 
 Add rate limiting (optional for PR #3)
 
 Track commands per user per minute
 Limit to 10 commands/minute
 Return rate limit error if exceeded
 Reset counter after 1 minute
 

Tests:

 Unit test: useAICommands composable
 
 Test executeCommand validation
 Test context gathering includes all required data
 Test target shape resolution logic
 Test command history management (add, cap at 50)
 Test isProcessing state changes
 
 
 Unit test: Target resolution
 
 Test "selected" with 0, 1, 3 shapes selected
 Test "last_created" when shapes exist/don't exist
 Test "it" with various contexts
 Test "all" returns all shape IDs
 Test type-based resolution ("the circle")
 
 
 Integration test: Command flow
 
 Test full command execution flow (mock AI service)
 Test successful command updates history
 Test failed command updates history
 Test processing state during execution
 

Deliverable:
✅ useAICommands composable ready with command routing, context gathering, and target resolution. Foundation for specific command implementations.

---

PR #4: Creation Commands - Single Shapes & Text (PRD v6)
Purpose: Implement CREATE_SHAPE and CREATE_TEXT intents
Tasks:

 Implement executeCreate function
 
 Handle CREATE_SHAPE intent in useAICommands.js
 Extract shape type, position, and properties from parameters
 Calculate position: use specified coords or default to viewport center
 Convert viewport center to canvas coordinates (account for pan offset)
 Validate shape type (rectangle, circle, line)
 Generate shape properties with defaults
 Call useShapes.createShape()
 Record in undo/redo stack
 Return success result
 
 
 Handle positioning logic
 
 If parameters.position exists → use exact coordinates
 If "center" mentioned → use viewport center
 If no position → default to viewport center
 Convert viewport to canvas: canvasX = viewportCenter.x - panOffset.x
 Ensure position is within canvas bounds (0-3000)
 
 
 Handle shape properties
 
 Extract fill color from parameters (or use default)
 Extract size properties (width/height for rectangle, radius for circle)
 Apply DEFAULT_SHAPE_PROPERTIES as fallback
 Support color names ("blue" → hex conversion)
 Support basic size modifiers ("large", "small")
 
 
 Implement executeCreateText function
 
 Handle CREATE_TEXT intent
 Extract text content from parameters
 Extract position (default to viewport center)
 Extract text properties (fontSize, fill, fontStyle, fontFamily)
 Validate text is not empty
 Call useShapes.createShape('text', ...)
 Record in undo/redo stack
 Return success result with text content
 
 
 Update lastCreatedShape tracking
 
 After any shape creation, update lastCreatedShape ref
 Store shape ID, type, and basic properties
 Use for "it" reference in subsequent commands
 
 
 Add basic color parsing
 
 Create parseColor(colorString) utility function
 Map common color names to hex values
 Handle hex colors (#RRGGBB)
 Handle rgb/rgba strings (optional)
 Return valid color or default
 
 
 Integrate with existing shape system
 
 Use existing useShapes.createShape() function
 Ensure userId and userName are passed correctly
 Verify real-time sync works for AI-created shapes
 Verify shapes appear immediately on canvas
 

Tests:

 Unit test: executeCreate
 
 Test creates rectangle with default position (viewport center)
 Test creates circle at specified coordinates
 Test handles color names and hex values
 Test applies default properties correctly
 Test validates shape type
 Test position calculation with different pan offsets
 
 
 Unit test: executeCreateText
 
 Test creates text with specified content
 Test applies font properties
 Test handles empty text gracefully
 Test position defaults work
 
 
 Integration test: Shape creation via AI
 
 Test "draw a circle" creates circle at viewport center
 Test "create a blue rectangle at 500,300" creates at exact position
 Test "add text saying Hello" creates text with correct content
 Test lastCreatedShape updates after creation
 Test shapes sync to Firestore correctly
 
 
 E2E test: AI shape creation
 
 Test typing command in AI panel
 Test shape appears on canvas
 Test shape syncs to other users
 Test undo works for AI-created shapes
 

Deliverable:
✅ Users can create single shapes (rectangle, circle) and text via AI commands. Smart positioning works. Shapes integrate with existing system.

---

PR #5: Creation Commands - Multiple Shapes (PRD v6)
Purpose: Implement CREATE_MULTIPLE_SHAPES intent with arrangements
Tasks:

 Implement executeCreateMultiple function
 
 Handle CREATE_MULTIPLE_SHAPES intent
 Extract shape type, count, and arrangement from parameters
 Validate count (1-50 reasonable limit)
 Calculate starting position (viewport center)
 Determine arrangement pattern (grid, horizontal, vertical, scattered)
 Create shapes in loop with appropriate spacing
 
 
 Implement horizontal arrangement
 
 Create shapes in single row
 Default spacing: 120px between centers
 Calculate positions: [startX + (i * spacing), startY]
 Ensure shapes stay within canvas bounds
 
 
 Implement vertical arrangement
 
 Create shapes in single column
 Default spacing: 120px between centers
 Calculate positions: [startX, startY + (i * spacing)]
 Ensure shapes stay within canvas bounds
 
 
 Implement grid arrangement
 
 Calculate rows and columns (prefer square-ish grids)
 For N shapes: cols = ceil(sqrt(N)), rows = ceil(N / cols)
 Default spacing: 120px horizontal, 120px vertical
 Calculate position: [startX + (col * spacingX), startY + (row * spacingY)]
 Grid expands right and down from viewport center
 
 
 Implement scattered arrangement
 
 Generate random positions within visible viewport
 Ensure minimum distance between shapes (80px)
 Ensure all shapes within canvas bounds
 Use random offset from viewport center (±200px range)
 
 
 Add visual feedback during creation
 
 Create shapes with 50ms delay between each
 Optional: Show progress indicator for large counts (>10)
 Update lastCreatedShape to last shape in batch
 
 
 Batch operation optimization
 
 Group all creations into single undo step
 Use useUndoRedo grouping (begin/end)
 Batch Firestore writes where possible
 Update canvas in batches for performance
 
 
 Add arrangement calculation helpers
 
 calculateGridLayout(count, spacing) function
 calculateLinearLayout(count, spacing, direction) function
 ensureWithinBounds(position, shapeSize, canvasBounds) function
 
 
 Handle edge cases
 
 Count = 1: create single shape at center
 Count > 50: return error "too many shapes"
 Shapes exceeding canvas bounds: stop at boundary or wrap
 No arrangement specified: default to horizontal
 

Tests:

 Unit test: Arrangement calculations
 
 Test calculateGridLayout for various counts (5, 10, 20, 30)
 Test horizontal layout spacing
 Test vertical layout spacing
 Test scattered layout randomness and bounds
 
 
 Unit test: executeCreateMultiple
 
 Test creates correct number of shapes
 Test applies correct arrangement
 Test respects spacing parameters
 Test shapes stay within canvas bounds
 Test groups into single undo operation
 
 
 Integration test: Multiple shape creation
 
 Test "create 5 circles" creates 5 circles in horizontal line
 Test "create 10 rectangles in a grid" creates 3x4 grid
 Test shapes sync correctly to Firestore
 Test undo removes all shapes at once
 
 
 E2E test: AI multiple shapes
 
 Test command creates correct count
 Test arrangement is visually correct
 Test all shapes visible on canvas
 Test shapes sync to other users
 

Deliverable:
✅ Users can create multiple shapes with various arrangements via AI. Grid, horizontal, vertical, and scattered layouts work correctly.

---

PR #6: Manipulation Commands - Move, Resize, Style (PRD v6)
Purpose: Implement MOVE_SHAPE, RESIZE_SHAPE, and CHANGE_STYLE intents
Tasks:

 Implement executeMove function
 
 Handle MOVE_SHAPE intent
 Resolve target shapes using resolveTargetShapes()
 Extract position or direction/distance from parameters
 Calculate new position for each target shape
 Handle absolute positioning (x, y coordinates)
 Handle relative positioning (up/down/left/right + distance)
 Update shapes via useShapes.updateShape()
 Group into single undo operation
 
 
 Handle directional movement
 
 Parse direction: "up", "down", "left", "right"
 Extract distance (default to 50px if not specified)
 Calculate delta: up/down affects y, left/right affects x
 Apply delta to current shape position
 Ensure shapes stay within canvas bounds
 
 
 Handle absolute positioning
 
 Extract x, y coordinates from parameters
 Handle "center" command → move to viewport center
 For multiple shapes: maintain relative positions or move all to same spot
 Update all target shapes to new positions
 
 
 Implement executeResize function
 
 Handle RESIZE_SHAPE intent
 Resolve target shapes
 Extract dimensions or scale multiplier from parameters
 Calculate new size based on shape type
 For rectangles: update width and height
 For circles: update radius
 For text: update fontSize
 Ensure minimum sizes (width/height >= 10, radius >= 5)
 Update shapes and record in undo
 
 
 Handle resize modes
 
 Absolute dimensions: {width: 200, height: 150}
 Scale multiplier: "bigger" = 1.5x, "smaller" = 0.5x, "double" = 2x
 Percentage: "50% bigger" = 1.5x
 Apply to all selected shapes proportionally
 
 
 Implement executeChangeStyle function
 
 Handle CHANGE_STYLE intent
 Resolve target shapes
 Extract style properties from parameters (fill, stroke, strokeWidth, opacity)
 Parse color values (names to hex)
 Validate property values
 Update shapes via useShapes.updateShape()
 Group into single undo operation
 
 
 Handle style properties
 
 Fill color: support names and hex values
 Stroke color and width: validate width 0-20
 Opacity: convert percentage to 0-1 range
 Multiple properties in one command: apply all
 Apply to all target shapes
 
 
 Add size calculation helpers
 
 calculateScaledSize(currentSize, multiplier) function
 parseScaleModifier(text) → multiplier (e.g., "bigger" → 1.5)
 clampSize(size, min, max) function
 
 
 Add error handling
 
 No shapes selected when required → clear error
 Invalid dimensions → error message
 No target shape found → error message
 Shapes would move outside bounds → clamp or error
 

Tests:

 Unit test: executeMove
 
 Test absolute positioning moves shape correctly
 Test directional movement with various distances
 Test "center" command moves to viewport center
 Test multiple shape movement maintains relative positions
 Test shapes clamp to canvas bounds
 
 
 Unit test: executeResize
 
 Test absolute dimensions resize correctly
 Test scale multipliers work (1.5x, 2x, 0.5x)
 Test minimum size enforcement
 Test different shape types (rectangle vs circle)
 
 
 Unit test: executeChangeStyle
 
 Test fill color change
 Test stroke color and width change
 Test opacity change
 Test multiple properties at once
 Test color name parsing
 
 
 Integration test: Manipulation commands
 
 Test "move it to 500,300" updates shape position
 Test "make it bigger" resizes shape
 Test "change color to blue" updates fill
 Test operations on multiple selected shapes
 Test undo works for each operation
 
 
 E2E test: AI manipulation
 
 Test moving shape via AI command
 Test resizing shape via AI command
 Test styling shape via AI command
 Test changes sync to other users
 

Deliverable:
✅ Users can move, resize, and style shapes via AI commands. Target resolution works for "it", "selected", etc. All changes are undoable.

---

PR #7: Layout Commands - Arrange & Layer Management (PRD v6)
Purpose: Implement ARRANGE_SHAPES and CHANGE_LAYER intents
Tasks:

 Implement executeArrange function
 
 Handle ARRANGE_SHAPES intent
 Resolve target shapes (default to selected shapes)
 Extract arrangement type (grid, horizontal, vertical)
 Extract alignment (left, center, right, top, middle, bottom)
 Extract spacing (default 100px)
 Calculate new positions for all shapes
 Update shapes in batch
 Group into single undo operation
 
 
 Implement grid arrangement
 
 Calculate grid dimensions (rows/cols) from shape count
 Calculate starting position (top-left of bounding box or viewport center)
 Position shapes in grid with specified spacing
 Maintain shape order (left-to-right, top-to-bottom)
 
 
 Implement horizontal arrangement
 
 Calculate bounding box of selected shapes
 Position shapes in single row with even spacing
 Maintain vertical alignment (top, middle, bottom)
 Sort shapes by current x position (maintain left-to-right order)
 
 
 Implement vertical arrangement
 
 Calculate bounding box of selected shapes
 Position shapes in single column with even spacing
 Maintain horizontal alignment (left, center, right)
 Sort shapes by current y position (maintain top-to-bottom order)
 
 
 Handle alignment
 
 Align shapes along specified edge without changing arrangement
 Left align: all shapes same x (leftmost)
 Right align: all shapes same x (rightmost)
 Top align: all shapes same y (topmost)
 Bottom align: all shapes same y (bottommost)
 Center align: center all shapes on same x or y
 
 
 Implement executeChangeLayer function
 
 Handle CHANGE_LAYER intent
 Resolve target shapes
 Extract action (bring_to_front, send_to_back, bring_forward, send_backward)
 Call existing z-index management functions
 Use useShapes z-index helpers
 Maintain relative order for multi-selection
 Record in undo/redo
 
 
 Integrate with existing z-index system
 
 Use getMaxZIndex, getMinZIndex from shapes.ts
 Call existing z-index update functions
 Trigger normalization if needed (gaps >1000)
 Ensure changes persist to Firestore
 
 
 Add layout calculation helpers
 
 calculateBoundingBox(shapes) → {minX, minY, maxX, maxY}
 distributeShapes(shapes, spacing, direction) → new positions
 alignShapes(shapes, alignment) → new positions
 
 
 Handle edge cases
 
 No shapes selected for arrange → error
 Single shape selected → no-op or error
 Arrangement would exceed canvas bounds → scale down or clamp
 

Tests:

 Unit test: Layout calculations
 
 Test grid calculation for various counts
 Test horizontal distribution spacing
 Test vertical distribution spacing
 Test alignment calculations (left, center, right, top, middle, bottom)
 Test bounding box calculation
 
 
 Unit test: executeArrange
 
 Test grid arrangement positions shapes correctly
 Test horizontal arrangement maintains spacing
 Test vertical arrangement maintains spacing
 Test alignment works independently
 Test groups into single undo operation
 
 
 Unit test: executeChangeLayer
 
 Test bring to front sets max z-index
 Test send to back sets min z-index
 Test forward/backward increments/decrements correctly
 Test maintains relative order for multi-selection
 
 
 Integration test: Layout commands
 
 Test "arrange in a grid" repositions selected shapes
 Test "line them up horizontally" creates horizontal line
 Test "align to left" aligns all shapes
 Test "bring to front" changes z-index
 Test undo works for layout operations
 
 
 E2E test: AI layout
 
 Test arranging multiple shapes via AI
 Test alignment commands
 Test layer management commands
 Test changes sync to other users
 

Deliverable:
✅ Users can arrange shapes in grids/lines and manage layers via AI. Layout calculations work correctly. Z-index integration works.

---

PR #8: Complex Templates - Login Form, Button, Card (PRD v6)
Purpose: Implement CREATE_TEMPLATE intent with predefined multi-element templates
Tasks:

 Create templates data structure
 
 Create ui/src/services/aiTemplates.js
 Define templates object with login_form, button, card
 Each template has name, description, and elements array
 Elements include type, relative position, size, and properties
 Export getTemplate(name) function
 
 
 Define login form template
 
 8 elements: background card, title, 2 input fields, 2 labels, button, button text
 Use relative positioning (offset from center)
 Coordinated styling (colors, borders, spacing)
 Dimensions: 300x250px card
 Background: white with border
 Title: "Login" in bold 24px
 Input fields: light gray background
 Button: primary color (blue)
 
 
 Define button template
 
 2 elements: rectangle + text
 Dimensions: 120x40px
 Primary color background
 White text, centered
 Rounded corners
 
 
 Define card template
 
 3 elements: background, title, body text
 Dimensions: 300x200px
 White background with border
 Title in bold 20px
 Body text in gray 14px
 Proper spacing between elements
 
 
 Implement executeTemplate function
 
 Handle CREATE_TEMPLATE intent in useAICommands.js
 Extract template name from parameters
 Look up template via getTemplate(name)
 Calculate base position (viewport center)
 Create all template elements sequentially
 Use 50ms delay between elements for visibility
 Update lastCreatedShape to last element
 Group all creations into single undo operation
 
 
 Handle template positioning
 
 Calculate center point from viewport
 Apply relative offsets from template definition
 Ensure entire template fits within canvas bounds
 If template exceeds bounds, scale down or shift
 
 
 Sequential element creation
 
 Create elements in order defined in template
 Use setTimeout or async/await with delay
 Show visual feedback during creation (optional progress)
 Ensure all elements created before resolving
 
 
 Add template metadata (optional)
 
 Add template_group_id to all elements in template
 Allows future group selection/manipulation
 Store in shape properties
 
 
 Add template validation
 
 Validate template name exists
 Validate template structure
 Handle missing or invalid templates gracefully
 Return clear error for unknown templates
 

Tests:

 Unit test: Template definitions
 
 Test login_form template has 8 elements
 Test button template has 2 elements
 Test card template has 3 elements
 Test relative positioning calculations
 Test getTemplate returns correct template
 
 
 Unit test: executeTemplate
 
 Test looks up template correctly
 Test calculates positions relative to center
 Test creates all elements
 Test groups into single undo operation
 Test handles invalid template name
 
 
 Integration test: Template creation
 
 Test "create a login form" creates 8 shapes
 Test elements are positioned correctly relative to each other
 Test all elements have correct properties
 Test undo removes entire template
 Test lastCreatedShape points to last element
 
 
 E2E test: AI templates
 
 Test typing "create a login form" in AI panel
 Test all 8 elements appear on canvas
 Test visual layout matches design (title above fields, button at bottom)
 Test template syncs to other users
 Test undo removes all elements at once
 
 
 Visual test: Template layouts
 
 Manually verify login form looks correct
 Verify button template looks correct
 Verify card template looks correct
 Test at different viewport positions
 

Deliverable:
✅ Users can create complex templates via AI. Login form produces 8 properly arranged elements. Templates are visually correct and properly grouped.

---

PR #9: Utility Commands - Delete & Query (PRD v6)
Purpose: Implement DELETE_SHAPE and QUERY_INFO intents
Tasks:

 Implement executeDelete function
 
 Handle DELETE_SHAPE intent in useAICommands.js
 Resolve target shapes
 Handle special case: "all" → confirm before deleting all shapes
 Call existing delete confirmation logic if >5 shapes
 Delete shapes via useShapes.deleteShape()
 Record in undo/redo stack
 Return success result with count deleted
 
 
 Handle delete confirmations
 
 If targetShapes === "all" → show confirmation modal
 If shape count > 5 → use existing ConfirmModal
 If shape count <= 5 → delete immediately
 Wait for user confirmation before proceeding
 Cancel delete if user declines
 
 
 Implement executeQuery function
 
 Handle QUERY_INFO intent
 Extract query type from parameters
 Gather relevant data from canvas state
 Format response as readable text
 Return text response for display in status message
 
 
 Handle query types
 
 count_total: "There are 47 shapes on the canvas"
 count_by_type: "There are 12 circles on the canvas"
 selection_info: "You have 3 shapes selected" + types breakdown
 shape_types: List all shape types and counts
 canvas_info: Canvas size, zoom level, position
 
 
 Format query responses
 
 Use natural language phrasing
 Include relevant numbers and details
 Keep responses concise (1-2 sentences)
 Handle zero cases gracefully ("No shapes on canvas")
 
 
 Add query result display
 
 Show query result in AI panel status area
 Use info styling (blue background)
 Longer display duration (10 seconds for queries)
 Make dismissible
 
 
 Handle edge cases for delete
 
 No shapes to delete → return error or info message
 Shape already deleted (race condition) → handle gracefully
 Multi-user deletion conflict → last-write-wins
 
 
 Handle edge cases for query
 
 Empty canvas → "No shapes on the canvas"
 No selection → "No shapes selected"
 Unknown query type → default to count_total
 

Tests:

 Unit test: executeDelete
 
 Test resolves target shapes correctly
 Test deletes correct number of shapes
 Test confirmation logic for >5 shapes
 Test "delete all" requires confirmation
 Test records in undo stack
 
 
 Unit test: executeQuery
 
 Test count_total returns correct count
 Test count_by_type filters correctly
 Test selection_info formats correctly
 Test response formatting for various scenarios
 
 
 Integration test: Delete commands
 
 Test "delete this" removes last created shape
 Test "delete selected" removes selected shapes
 Test "clear canvas" shows confirmation
 Test undo restores deleted shapes
 Test deletion syncs to other users
 
 
 Integration test: Query commands
 
 Test "how many shapes?" returns count
 Test "how many circles?" returns filtered count
 Test "what's selected?" returns selection info
 Test query response displays in AI panel
 
 
 E2E test: AI utilities
 
 Test delete via AI command
 Test query via AI command
 Test confirmation modals work
 Test query responses display correctly
 

Deliverable:
✅ Users can delete shapes and query canvas state via AI. Confirmations work for bulk deletes. Query responses are clear and accurate.

---

PR #10: Multi-User Support & Performance (PRD v6)
Purpose: Ensure AI commands work correctly with multiple concurrent users
Tasks:

 Test concurrent AI command execution
 
 Two users issue commands simultaneously
 Verify no race conditions or conflicts
 Verify both commands execute successfully
 Verify shapes sync correctly
 Test with different command types
 
 
 Test AI-created shape synchronization
 
 User A creates shape via AI
 Verify User B sees shape immediately
 Verify shape properties sync correctly
 Test with templates (multiple shapes)
 Verify z-index coordination
 
 
 Optimize AI command performance
 
 Measure command execution time (parsing + creation)
 Optimize shape creation batching
 Optimize Firestore write batching
 Cache viewport calculations
 Reduce redundant context gathering
 
 
 Implement request optimization
 
 Debounce rapid successive commands (500ms)
 Cancel in-flight requests if new command issued
 Cache similar command parsing results (optional)
 Reduce token usage in prompts where possible
 
 
 Add per-user command tracking
 
 Track last command time per user
 Track command success/failure rates
 Optional: Log command types for analytics
 
 
 Implement rate limiting
 
 Limit to 10 commands per user per minute
 Store rate limit state per user
 Display clear message when rate limited
 Reset counter after 1 minute window
 
 
 Test performance targets
 
 Measure end-to-end command time (input → shape appears)
 Target <1 second for simple commands
 Target <2 seconds for complex commands/templates
 Measure at 95th percentile
 Test with 3-5 concurrent users
 
 
 Optimize canvas updates
 
 Batch canvas redraws during multi-shape operations
 Use Konva batchDraw() for templates
 Minimize re-renders during AI processing
 
 
 Test with large canvases
 
 Test AI commands with 100+ existing shapes
 Verify no performance degradation
 Verify query commands remain fast
 Test arrangement commands with many shapes
 

Tests:

 Integration test: Concurrent commands
 
 Two users issue "draw a circle" simultaneously
 Verify both circles created
 Verify no conflicts or errors
 Test with various command combinations
 
 
 Integration test: Template sync
 
 User A creates login form via AI
 Verify User B sees all 8 elements appear
 Verify proper sequencing and timing
 Test with multiple templates from different users
 
 
 Performance test: Command latency
 
 Measure time from submit to shape appearance
 Test simple commands (create shape)
 Test complex commands (templates)
 Verify <2 second target for 95% of commands
 
 
 Performance test: Multi-user load
 
 3 users issuing commands simultaneously
 Measure latency for each user
 Verify no degradation
 Test over 2-minute period
 
 
 Load test: Large canvas
 
 Canvas with 200 shapes
 Issue AI commands
 Measure performance impact
 Verify queries remain fast
 
 
 Unit test: Rate limiting
 
 Issue 15 commands rapidly
 Verify rate limit kicks in at 10
 Verify clear error message
 Verify reset after 1 minute
 

Deliverable:
✅ Multiple users can use AI simultaneously without conflicts. Performance targets met (<2s for 95%). Rate limiting prevents abuse. No impact on canvas performance.

---

PR #11: Undo/Redo Integration & Error Handling (PRD v6)
Purpose: Integrate AI commands with undo/redo system and polish error handling
Tasks:

 Integrate AI commands with undo/redo
 
 Use useUndoRedo begin/endGroup for multi-shape operations
 Record each AI command as single undo step
 Include command text in undo metadata
 Test undo for all command types
 Test redo for all command types
 
 
 Group operations properly
 
 Single shape creation: single undo step
 Multiple shapes: grouped into one undo step
 Template creation: grouped into one undo step
 Style changes to multiple shapes: grouped
 Arrangement operations: grouped
 
 
 Add undo metadata
 
 Store original command text
 Store command type/intent
 Store affected shape IDs
 Display in undo/redo UI (optional)
 
 
 Test undo/redo scenarios
 
 Undo "draw a circle" removes circle
 Undo "create 5 shapes" removes all 5
 Undo "create login form" removes all 8 elements
 Redo restores correctly for all cases
 Test undo during active AI processing (should be disabled)
 
 
 Improve error messages
 
 Categorize errors (parse error, execution error, validation error)
 Provide specific, actionable feedback
 Suggest corrections where possible
 Examples:
   - "I couldn't find a shape to move. Try selecting one first."
   - "The position 5000,5000 is outside the canvas. Try a smaller number."
   - "I can only create shapes like circle, rectangle, or text."
 
 
 Handle API errors gracefully
 
 Network timeout → "Request timed out. Please try again."
 Rate limit error → "Too many requests. Please wait a moment."
 Invalid API key → "AI service not configured correctly."
 Parse error → "I couldn't understand that command. Try being more specific."
 Low confidence → "I'm not sure what you mean. Could you rephrase?"
 
 
 Add error recovery
 
 Retry failed API calls (1 retry with exponential backoff)
 Clear error state after new command
 Log errors to console for debugging
 Track error rates for monitoring
 
 
 Add input validation
 
 Maximum command length (500 characters)
 Minimum command length (3 characters)
 Sanitize input (trim whitespace, remove special chars)
 Reject empty or whitespace-only commands
 
 
 Add loading states and feedback
 
 Show "Processing..." message during API call
 Show "Creating shapes..." during multi-shape operations
 Show progress for templates (e.g., "Creating 3 of 8...")
 Disable input during processing
 Show spinner in submit button
 
 
 Handle edge cases
 
 Command while another in progress → queue or reject
 Canvas state changes during processing → validate before execution
 Shape deleted before AI command completes → handle gracefully
 User disconnects during processing → clean up state
 

Tests:

 Unit test: Undo/redo integration
 
 Test single shape creation undo/redo
 Test multi-shape creation undo/redo
 Test template creation undo/redo
 Test manipulation command undo/redo
 Test metadata storage
 
 
 Integration test: Error handling
 
 Test API timeout handling
 Test invalid command handling
 Test validation errors
 Test retry logic
 Test error message display
 
 
 Integration test: Input validation
 
 Test empty command rejected
 Test very long command handling
 Test special characters handled
 Test whitespace-only command rejected
 
 
 E2E test: Complete error scenarios
 
 Test command with invalid shape type
 Test command with out-of-bounds position
 Test command with no selection when required
 Test command parsing failure
 Verify clear error messages in all cases
 
 
 E2E test: Undo/redo workflow
 
 Issue multiple AI commands
 Undo each in reverse order
 Redo each in forward order
 Verify canvas state correct at each step
 Test with mixed manual and AI operations
 

Deliverable:
✅ All AI commands integrate with undo/redo. Error handling is robust with clear messages. Input validation prevents bad commands. Loading states provide feedback.

---

PR #12: Testing & Accuracy Validation (PRD v6)
Purpose: Comprehensive testing and accuracy validation of all command types
Tasks:

 Create test command suite
 
 Create test file with 50+ diverse commands
 10 creation commands (various shapes, positions, properties)
 10 manipulation commands (move, resize, style)
 10 layout commands (arrange, align, layer)
 5 complex commands (templates)
 10 utility commands (delete, query)
 5 ambiguous commands (test resolution)
 Include edge cases and variations
 
 
 Implement accuracy testing
 
 Run each test command through AI system
 Measure success rate (command executed as intended)
 Track parsing accuracy (intent correctly identified)
 Track parameter extraction accuracy
 Track execution success rate
 Calculate overall accuracy percentage
 
 
 Test all command categories
 
 Creation: Test all shape types, positions, colors
 Manipulation: Test move, resize, style with variations
 Layout: Test arrange, align, layer with different counts
 Complex: Test all templates, verify element count and positions
 Utility: Test delete and queries
 
 
 Test ambiguity handling
 
 "make it bigger" - resolves to last created or selected
 "move it to the right" - calculates relative movement
 "change the color" - applies to correct target
 "create a form" - matches to login_form template
 "delete it" - resolves to correct shape
 Verify resolution works correctly in each case
 
 
 Test smart positioning
 
 Commands without position → uses viewport center
 "at the center" → uses viewport center
 "at 500,300" → uses exact coordinates
 Account for pan offset correctly
 Verify shapes stay within bounds
 
 
 Test template creation
 
 "create a login form" → 8 elements, properly arranged
 Verify title above fields
 Verify button at bottom
 Verify input fields aligned
 Verify consistent styling
 Test button and card templates similarly
 
 
 Measure performance metrics
 
 Record command execution time for each test
 Calculate average, median, 95th percentile
 Verify <2 second target met
 Identify slow commands for optimization
 
 
 Playwright E2E test suite
 
 Create ui/tests/ai-commands.spec.js
 Test basic command execution (10 tests)
 Test template creation (3 tests)
 Test error handling (5 tests)
 Test multi-user scenarios (3 tests)
 Test undo/redo (3 tests)
 Total: 24 E2E tests
 
 
 Write Playwright tests for each category
 
 ai-basic-commands.spec.js:
   - Test "draw a circle"
   - Test "create a blue rectangle at 500,300"
   - Test "add text saying Hello"
   - Test "move it to 600,400"
   - Test "make it bigger"
   - Test "change color to red"
 
 ai-templates.spec.js:
   - Test "create a login form"
   - Test "create a button"
   - Test "create a card"
   - Verify element counts and layouts
 
 ai-errors.spec.js:
   - Test unknown command
   - Test invalid position
   - Test no selection when required
   - Test rate limiting
   - Test API timeout (mock)
 
 ai-multi-user.spec.js:
   - Test concurrent command execution
   - Test shape sync across users
   - Test template sync
 
 ai-undo-redo.spec.js:
   - Test undo after shape creation
   - Test undo after template creation
   - Test redo after undo
 
 
 Document test results
 
 Create test report with accuracy percentages
 Document failing test cases
 Document performance metrics
 Document edge cases and limitations
 

Tests:

 Accuracy test: 50+ command test suite
 
 Run all test commands
 Measure success rate
 Target: >90% accuracy overall
 Identify failure patterns
 
 
 Performance test: Command latency
 
 Measure all test commands
 Calculate 95th percentile
 Verify <2 second target
 Document slow commands
 
 
 E2E test: Playwright suite
 
 Run all 24 E2E tests
 Verify >95% pass rate
 Document failures
 Run in CI environment
 
 
 Visual test: Template layouts
 
 Manually verify login form layout
 Verify button template
 Verify card template
 Check at different viewport positions
 Verify on different screen sizes
 

Deliverable:
✅ Comprehensive test suite with >90% accuracy. All 8+ command types working. Playwright tests pass. Performance targets met. Test report documents results.

---

PR #13: Documentation & User Guide (PRD v6)
Purpose: Create user documentation and developer documentation for AI features
Tasks:

 Create user guide
 
 Add AI Commands section to README.md
 Getting Started with AI Assistant
 List all supported command types with examples
 Tips for effective commands
 Limitations and known issues
 Troubleshooting common problems
 
 
 Document command patterns
 
 Creation commands with examples
 Manipulation commands with examples
 Layout commands with examples
 Complex templates with examples
 Utility commands with examples
 Show before/after examples where helpful
 
 
 Create AI Commands reference
 
 Create ui/AI_COMMANDS.md
 Comprehensive list of all supported commands
 Syntax and parameter explanations
 Tips for ambiguous references
 Template details (what each includes)
 Smart defaults explanation
 
 
 Add developer documentation
 
 Update API_DOCUMENTATION.md with AI service
 Document aiService.js API
 Document useAICommands composable
 Document template structure
 Document extending with new commands
 Document prompt engineering notes
 
 
 Add code comments
 
 JSDoc comments for all public functions
 Explain complex logic (target resolution, arrangement calculations)
 Document prompt templates
 Document template definitions
 
 
 Create examples and demos
 
 Add example commands to AI panel placeholder
 Optional: Example command suggestions UI
 Optional: Interactive tutorial/walkthrough
 Document in README how to try AI features
 
 
 Add troubleshooting guide
 
 "Command not understood" → suggestions for clearer phrasing
 "Shape not found" → explain target resolution
 "Out of bounds" → explain canvas limits
 API errors → check API key configuration
 Rate limiting → explain limits
 
 
 Update environment setup docs
 
 Document VITE_OPENAI_API_KEY requirement
 Document where to get OpenAI API key
 Document optional environment variables
 Document cost considerations
 Add API key to .env.example
 
 
 Add inline help to UI
 
 Info icon in AI panel header
 Tooltip with quick command examples
 Link to full documentation
 Keyboard shortcut to focus AI input (optional)
 

Tests:

 Documentation review
 
 Verify all commands documented
 Verify examples are accurate
 Test example commands work as documented
 Check for typos and clarity
 
 
 User testing
 
 Have users try commands from documentation
 Verify examples are clear and helpful
 Gather feedback on confusing areas
 Update based on feedback
 

Deliverable:
✅ Comprehensive user and developer documentation. AI Commands reference guide. Inline help in UI. Examples and troubleshooting guide. Setup instructions clear.

---

PR #14: Polish, Optimization & Production Readiness (PRD v6)
Purpose: Final polish, optimization, and prepare AI features for production
Tasks:

 UI/UX polish
 
 Smooth animations for AI panel status messages
 Visual feedback during processing
 Polish loading states and spinners
 Improve error message styling
 Add success animations (checkmark, etc.)
 Polish command history styling
 
 
 Command suggestions (optional enhancement)
 
 Show suggested commands on panel open
 Suggest based on current selection
 Suggest based on recent commands
 Clickable suggestions to populate input
 
 
 Optimize prompt engineering
 
 Refine system prompt based on test results
 Add few-shot examples to improve accuracy
 Reduce token usage where possible
 Tune temperature for consistency
 Test different prompt variations
 
 
 Optimize performance
 
 Profile command execution pipeline
 Optimize slow operations
 Reduce unnecessary re-renders
 Optimize Firestore batch operations
 Cache frequently used calculations
 
 
 Add analytics/telemetry (optional)
 
 Track command usage by type
 Track success/failure rates
 Track average execution time
 Track most common commands
 Privacy-conscious: no user data, command text
 
 
 Security review
 
 Verify API key not exposed in client code
 Verify no sensitive data sent to OpenAI
 Review rate limiting implementation
 Test for injection attacks
 Verify Firestore rules still apply
 
 
 Add monitoring and alerting
 
 Monitor API usage and costs
 Set up alerts for high error rates
 Set up alerts for high API costs
 Log critical errors for debugging
 Track command success rates
 
 
 Accessibility improvements
 
 Verify keyboard navigation works
 Test with screen readers
 Ensure proper ARIA labels
 Verify focus management
 Test high contrast mode
 
 
 Cross-browser testing
 
 Test on Chrome, Firefox, Safari (desktop)
 Verify AI panel renders correctly
 Verify commands execute correctly
 Test error handling
 Document any browser-specific issues
 
 
 Load testing
 
 Test with 500+ shapes on canvas
 Test with 10+ concurrent users
 Test rapid command execution
 Verify performance remains acceptable
 Document performance characteristics
 
 
 Final bug fixes
 
 Fix all known bugs from testing
 Address edge cases
 Fix race conditions
 Improve error recovery
 Polish rough edges
 
 
 Prepare deployment
 
 Update Firebase environment variables
 Verify API key configured in production
 Test in production-like environment
 Update deployment documentation
 Create rollback plan
 

Tests:

 Regression test: Full test suite
 
 Run all unit tests
 Run all integration tests
 Run all E2E tests
 Verify accuracy targets still met
 Verify performance targets still met
 
 
 Load test: Production simulation
 
 Simulate 10+ concurrent users
 Each user issues commands for 5 minutes
 Monitor performance and errors
 Verify stability
 
 
 Cross-browser E2E tests
 
 Run Playwright tests on Chrome, Firefox, Safari
 Verify >95% pass rate on all browsers
 Document browser-specific issues
 
 
 Accessibility audit
 
 Run automated accessibility tests
 Manual screen reader testing
 Verify WCAG 2.1 Level AA compliance (best effort)
 
 
 Security audit
 
 Review all code for security issues
 Test rate limiting
 Verify API key security
 Test input validation
 

Deliverable:
✅ AI features polished and production-ready. Performance optimized. Security reviewed. Cross-browser tested. Monitoring in place. Ready for deployment.

---

## V6 Completion Checklist

### Core Features (PRD v6 Requirements)
 ✅ AI Command Panel renders in bottom-right corner (fixed, 400px width)
 ✅ OpenAI API integration (gpt-3.5-turbo)
 ✅ 8+ distinct command types implemented
 ✅ Creation commands: single shapes, multiple shapes, text
 ✅ Manipulation commands: move, resize, style
 ✅ Layout commands: arrange, align, layer management
 ✅ Complex commands: templates (login form, button, card)
 ✅ Utility commands: delete, query
 ✅ Smart positioning (viewport center defaults)
 ✅ Target resolution (it, selected, last created)
 ✅ Predefined templates with 3+ properly arranged elements
 ✅ In-memory command history (last 50 commands)
 ✅ Error handling and user feedback
 ✅ Input disabled while processing

### Performance & Accuracy (PRD v6 Targets)
 ✅ Sub-2 second responses for 95% of commands
 ✅ 90%+ accuracy on test suite
 ✅ No impact on existing canvas performance
 ✅ Works with 500+ shapes on canvas
 ✅ Supports 10+ concurrent users

### Multi-User Support (PRD v6 Requirements)
 ✅ Multiple users can use AI simultaneously
 ✅ AI-created shapes sync in real-time
 ✅ No conflicts or race conditions
 ✅ Shared state works flawlessly

### Integration (PRD v6 Requirements)
 ✅ Undo/redo integration (all commands undoable)
 ✅ Works with existing shape system
 ✅ Works with existing Firestore sync
 ✅ Works with existing viewport system
 ✅ Works with existing selection system

### Templates (PRD v6 Requirements)
 ✅ "Create login form" produces 8 properly arranged elements
 ✅ Login form: card, title, 2 inputs, 2 labels, button, button text
 ✅ Button template: rectangle + text
 ✅ Card template: background + title + body
 ✅ Complex layouts execute multi-step plans correctly

### UX & Feedback (PRD v6 Requirements)
 ✅ Natural command input
 ✅ Clear status messages (success/error)
 ✅ Loading states during processing
 ✅ Command history visible (last 3)
 ✅ Handles ambiguity well
 ✅ Error messages are specific and actionable

### Testing (PRD v6 Requirements)
 ✅ 50+ command test suite with >90% accuracy
 ✅ Unit tests for all command handlers
 ✅ Integration tests for command execution
 ✅ E2E tests for user workflows
 ✅ Multi-user tests
 ✅ Performance tests
 ✅ Template layout tests

### Documentation (PRD v6 Requirements)
 ✅ User guide with command examples
 ✅ Developer documentation
 ✅ API documentation
 ✅ Setup instructions
 ✅ Troubleshooting guide

### Deployment (PRD v6 Requirements)
 ✅ Environment variables configured
 ✅ API key security reviewed
 ✅ Production testing complete
 ✅ Monitoring and alerting set up
 ✅ Cross-browser tested
 ✅ Performance verified in production
 ✅ Deployed to Firebase Hosting

---

## Command Type Reference

### Category 1: Creation (3 types)
1. CREATE_SHAPE - Single shape creation
2. CREATE_MULTIPLE_SHAPES - Multiple shapes with arrangements
3. CREATE_TEXT - Text element creation

### Category 2: Manipulation (3 types)
4. MOVE_SHAPE - Position changes (absolute and relative)
5. RESIZE_SHAPE - Size changes (absolute and scaled)
6. CHANGE_STYLE - Visual property changes

### Category 3: Layout (2 types)
7. ARRANGE_SHAPES - Grid/horizontal/vertical arrangements
8. CHANGE_LAYER - Z-index management

### Category 4: Complex (1 type)
9. CREATE_TEMPLATE - Multi-element templates (login form, button, card)

### Category 5: Utility (2 types)
10. DELETE_SHAPE - Remove shapes
11. QUERY_INFO - Answer questions about canvas state

**Total: 11 distinct command types** (exceeds 8+ requirement ✅)

---

## Development Timeline Estimate

- PR #1: OpenAI Integration - 2 days
- PR #2: AI Panel UI - 2 days
- PR #3: Commands Composable - 2 days
- PR #4: Creation Commands - 2 days
- PR #5: Multiple Shapes - 2 days
- PR #6: Manipulation - 3 days
- PR #7: Layout Commands - 2 days
- PR #8: Templates - 3 days
- PR #9: Utilities - 2 days
- PR #10: Multi-User - 2 days
- PR #11: Undo/Errors - 2 days
- PR #12: Testing - 3 days
- PR #13: Documentation - 2 days
- PR #14: Polish & Deploy - 3 days

**Total: ~32 days (~6-7 weeks)**

Matches PRD v6 6-week implementation timeline ✅

---

## Success Metrics Tracking

### Functional Metrics
- [ ] All 11 command types implemented and tested
- [ ] Templates produce correct element counts
- [ ] Smart positioning works in all scenarios
- [ ] Target resolution accuracy >95%

### Performance Metrics
- [ ] Average command latency: ___ms
- [ ] 95th percentile latency: ___ms
- [ ] Command accuracy: ___%
- [ ] Success rate: ___%

### Quality Metrics
- [ ] Unit test coverage: ___%
- [ ] E2E test pass rate: ___%
- [ ] Bug count: ___
- [ ] User feedback score: ___/10

---

*End of v7-tasks.md*

