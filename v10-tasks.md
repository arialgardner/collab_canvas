CollabCanvas v10 - AI Agent Enhancement
Goal: Enhanced AI agent with manipulation commands on selected elements, relative sizing, specific grid layouts, and parameterized complex templates

PR #1: Core Command Processing & Relative Sizing
Purpose: Enhance AI parsing and add support for manipulation commands on selected elements and relative sizing
Tasks:

✅ Update AI prompt for enhanced command parsing (functions/ai/parseCommand.js)
  ✅ Add instructions for relative sizing commands (lines 169-210)
    - "twice as big" → sizeMultiplier: 2.0
    - "50% larger" → sizePercent: 150
    - "half the size" → sizeMultiplier: 0.5
  ✅ Add instructions for selected element manipulation
    - "move selected to center" → works on context.selectedShapes
    - "resize selected to be twice as big" → applies to selected only
  ✅ Add instructions for specific grid dimensions
    - "create a 3x3 grid of squares" → gridRows: 3, gridCols: 3, shapeType: "rectangle"
    - "make a 2x5 grid of circles" → gridRows: 2, gridCols: 5, shapeType: "circle"

✅ Implement relative sizing in manipulation executor (ui/src/composables/useCommandExecutor.js)
  ✅ Add sizeMultiplier support (after line 224)
    - Multiply existing width/height/radius by multiplier
    - Apply to all selected shapes
    - Enforce minimum sizes (width/height: 10px, radius: 5px)
    - Round to whole numbers
  ✅ Add sizePercent support
    - Convert percentage to multiplier (150% → 1.5x)
    - Use same logic as sizeMultiplier
  ✅ Handle edge cases
    - Shape has no width/height (text shapes)
    - Very small shapes (ensure minimum size)
    - Very large multipliers (cap at reasonable max)

✅ Update suggested commands in AI panel
  ✅ Updated suggestedCommands array (lines 110-119)
    - Added "move selected to center"
    - Added "make selected twice as big"
    - Added "create a 3x3 grid of squares"

Deliverable:
✅ AI agent can manipulate selected elements with relative sizing commands. "Move selected to center" and "resize selected to be twice as big" work correctly.

PR #2: Specific Grid Creation & Parameterized Templates
Purpose: Support creating grids with specific dimensions (MxN grids) and add dynamic templates
Tasks:

✅ Enhance grid creation logic (ui/src/composables/useCommandExecutor.js)
  ✅ Add gridRows and gridCols support in executeCreateMultiple (after line 329)
    - Calculate total count from rows × cols
    - Calculate grid total dimensions
    - Center grid at viewport center
    - Use consistent spacing (default 20px)
  ✅ Implement row-by-row creation loop
    - Outer loop: rows (0 to gridRows)
    - Inner loop: cols (0 to gridCols)
    - Calculate x, y for each cell
    - Account for shape type (circle centers vs rectangle corners)
  ✅ Handle shape positioning by type
    - Circles: center at cell center
    - Rectangles: top-left at cell top-left
    - Text: anchor point at cell top-left
  ✅ Apply consistent sizing
    - Use provided width/height or defaults
    - Maintain uniform grid appearance
  ✅ Handle edge cases
    - Very large grids (e.g., 20x20 = 400 shapes)
    - Add reasonable limit (max 15x15 = 225 shapes)
    - Show warning if exceeded
    - Grids that exceed viewport

✅ Update AI prompt for grid commands (functions/ai/parseCommand.js)
  ✅ Add grid dimension examples (lines 190-200)
    - "3x3 grid of squares" → gridRows: 3, gridCols: 3
    - "2x5 grid of circles" → gridRows: 2, gridCols: 5
    - "4x4 grid" → gridRows: 4, gridCols: 4, shapeType: "rectangle"

✅ Create navigation bar generator function (functions/ai/templates.js)
  ✅ Add generateNavigationBar(itemCount) function (after line 159)
    - Accept itemCount parameter (1-10 max)
    - Validate and cap item count at 10
    - Create background rectangle (800×60px, #222222)
    - Calculate even spacing for items
    - Use preset item labels: Home, About, Services, Contact, Blog, Shop, Team, Portfolio, Careers, Support
    - Return template object with shapes array
  ✅ Handle dynamic text positioning
    - Distribute items evenly across bar width
    - Center text vertically in bar
    - Use consistent styling (16px, #ffffff, Arial)

✅ Create card layout template (functions/ai/templates.js)
  ✅ Add cardLayout template (after signupForm, line 237)
    - Card container: 300×420px white rectangle with border
    - Image placeholder: 300×200px grey rectangle with "IMAGE" text
    - Card title: "Card Title" (20px, bold, black)
    - Description: 2 lines of text (14px, grey)
    - CTA button: Black rectangle with "Learn More" text (white)
    - All grayscale colors only
  ✅ Proper element layering
    - Container first, then image, then text overlays
    - Button at bottom with proper spacing

✅ Update template handling in parseCommand (functions/ai/parseCommand.js)
  ✅ Import generateNavigationBar function (line 10)
    - Update require statement: const { TEMPLATES, generateNavigationBar } = require('./templates')
  ✅ Add parameterized template logic (lines 259-269)
    - Check if template is "navigationBar" and itemCount provided
    - Call generateNavigationBar(itemCount) instead of using static template
    - Handle other templates normally via TEMPLATES object
  ✅ Export generator from templates.js (line 337)
    - Add generateNavigationBar to module.exports

✅ Update AI prompt with new templates (functions/ai/parseCommand.js)
  ✅ Update available templates list (line 178)
    - Added "cardLayout" to list
  ✅ Add template command examples (lines 194-198)
    - "card layout" → template: "cardLayout"
    - "navigation bar with 4 items" → template: "navigationBar", itemCount: 4
    - "nav bar with 7 menu items" → template: "navigationBar", itemCount: 7

✅ Update suggested commands in AI panel (ui/src/components/AICommandPanel.vue)
  ✅ Update suggestedCommands array (lines 110-119)
    - Add "navigation bar with 5 items"
    - Add "create a card layout"

✅ Update documentation
  □ Update API documentation (API_DOCUMENTATION.md)
    - Document new AI command categories
    - Manipulation with relative sizing
    - Grid creation with dimensions
    - Parameterized templates
    - Add command examples and parameter formats
  ✅ Create changelog entry (CHANGELOG_v10.md)
    - List all new features
    - Document breaking changes (if any)
    - Add migration notes
    - Include example commands

Deliverable:
✅ AI agent can create specific MxN grids, supports parameterized templates. "Create a 3x3 grid of squares" produces properly arranged 9 rectangles. "Navigation bar with 4 menu items" creates bar with exactly 4 items. "Create a card layout" produces complete card design. All templates use grayscale only.

v10 Completion Checklist

New Features
✅ Manipulation commands on selected elements
✅ Relative sizing (multipliers and percentages)
✅ Specific grid dimensions (MxN grids)
✅ Parameterized navigation bar template (1-10 items)
✅ Card layout template
✅ All templates use grayscale colors only

Documentation
□ API documentation updated (optional - changelog covers key info)
✅ Changelog created
✅ Suggested commands updated

Success Criteria
✅ "Move selected to center" works correctly
✅ "Resize selected to be twice as big" works correctly
✅ "Create a 3x3 grid of squares" produces proper grid
✅ "Navigation bar with 4 menu items" creates 4 items
✅ "Create a card layout" produces complete card
✅ All commands maintain grayscale-only color scheme

