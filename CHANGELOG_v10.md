# CollabCanvas v10 - Changelog

## AI Agent Enhancement Release

**Release Date:** TBD

### 🎉 New Features

#### Manipulation Commands on Selected Elements
- **Relative Sizing**: AI can now resize selected shapes using natural language
  - "make selected twice as big" - doubles dimensions
  - "resize selected to be 50% larger" - increases by 50%
  - "make selected half the size" - reduces by 50%
  - Works with rectangles (width/height) and circles (radius)
  - Minimum size enforcement: 10px for width/height, 5px for radius

- **Selected Element Commands**: All manipulation commands now work on pre-selected shapes
  - "move selected to center" - centers selected shapes at viewport
  - "resize selected" - applies sizing to only selected shapes
  - Supports both single and multiple shape selections
  - Group centering maintains relative positions

#### Specific Grid Creation
- **MxN Grid Support**: Create grids with specific dimensions
  - "create a 3x3 grid of squares" - creates 9 rectangles in 3×3 layout
  - "make a 2x5 grid of circles" - creates 10 circles in 2×5 layout
  - "create a 4x4 grid" - default to rectangles
  - Supports any grid up to 15×15 (225 shapes max)
  - Grids automatically centered at viewport
  - Consistent 20px spacing between shapes
  - Works with rectangles, circles, and text

#### Parameterized Templates
- **Dynamic Navigation Bar**: 
  - "navigation bar with 4 items" - creates nav bar with exactly 4 menu items
  - "nav bar with 7 menu items" - creates nav bar with 7 items
  - Supports 1-10 items (capped at 10)
  - Items evenly distributed across 800px bar
  - Preset labels: Home, About, Services, Contact, Blog, Shop, Team, Portfolio, Careers, Support
  - All grayscale styling (#222222 background, #ffffff text)

- **Card Layout Template**:
  - "create a card layout" - generates complete card design
  - Includes: container, image placeholder, title, description, CTA button
  - 300×420px card with proper element layering
  - All grayscale colors maintained
  - Perfect for mockups and layout demonstrations

### 🔧 Technical Improvements

#### AI Parsing Enhancements (`functions/ai/parseCommand.js`)
- Enhanced prompt with specific instructions for:
  - Relative sizing multipliers and percentages
  - Selected element manipulation
  - Grid dimension parsing
  - Parameterized template handling
- Added `generateNavigationBar` function import
- Updated template list to include `cardLayout`

#### Command Executor Updates (`ui/src/composables/useCommandExecutor.js`)
- Added `sizeMultiplier` support in `executeManipulation`
- Added `sizePercent` support with automatic conversion to multiplier
- Implemented specific grid creation with `gridRows` and `gridCols`
- Grid size validation (max 15×15 = 225 shapes)
- Proper shape positioning for different types (circles vs rectangles)

#### Template System (`functions/ai/templates.js`)
- New `cardLayout` template with 8 shapes
- New `generateNavigationBar(itemCount)` function for dynamic nav bars
- Exported generator function for parameterized templates

#### UI Updates (`ui/src/components/AICommandPanel.vue`)
- Updated suggested commands to showcase new features:
  - "move selected to center"
  - "make selected twice as big"
  - "create a 3x3 grid of squares"
  - "navigation bar with 5 items"
  - "create a card layout"

### 📝 Example Commands

#### Manipulation
```
move selected to center
make selected twice as big
resize selected to be 50% larger
make selected half the size
```

#### Grid Creation
```
create a 3x3 grid of squares
make a 2x5 grid of circles
create a 4x4 grid of rectangles
```

#### Complex Templates
```
navigation bar with 4 items
nav bar with 7 menu items
create a card layout
create a login form
```

### 🎨 Design Consistency
- All new templates maintain grayscale-only color scheme
- Consistent spacing (20px default) across grid layouts
- Proper element layering in complex templates
- Centered positioning at viewport for all generated layouts

### ⚙️ Configuration
No configuration changes required. All features work out of the box.

### 🚀 Migration Notes
- No breaking changes
- Existing AI commands continue to work as before
- New commands are additive and don't affect existing functionality
- No database schema changes

### 🐛 Bug Fixes
- None (new feature release)

### 📚 Documentation Updates
- Updated `v10-tasks.md` with complete implementation checklist
- Added this changelog
- AI prompt documentation enhanced with new examples

### 🔮 Future Enhancements
Potential future additions:
- More parameterized templates (forms with N fields, dashboards with N cards)
- Custom grid spacing via AI commands
- Template customization parameters (colors, sizes)
- Save and reuse custom templates

---

## Success Criteria Met ✅

- ✅ "Move selected to center" works correctly
- ✅ "Resize selected to be twice as big" works correctly
- ✅ "Create a 3x3 grid of squares" produces proper grid
- ✅ "Navigation bar with 4 menu items" creates 4 items
- ✅ "Create a card layout" produces complete card
- ✅ All commands maintain grayscale-only color scheme

