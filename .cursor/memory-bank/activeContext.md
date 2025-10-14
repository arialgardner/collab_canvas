# Active Context: CollabCanvas

## Current Focus
**Phase 2, PR #1: Enhanced Shape System Foundation**

Starting implementation of multi-shape support, migrating from MVP's rectangle-only system to support Rectangle, Circle, Line, and Text shapes.

## Recent Changes
- ✅ Completed MVP with rectangle-only canvas collaboration
- ✅ Created Phase 2 PRD (phase-2.md) with comprehensive shape system requirements
- ✅ Created Phase 2 task breakdown (phase-2-tasks.md) with 12 PRs
- ✅ Clarified all implementation details for Phase 2
- ✅ Reviewed existing MVP codebase thoroughly
- ✅ Created Memory Bank structure for project context

## Current State

### What Works (MVP ✅)
- User authentication (Email/Password + Google)
- Canvas with pan and zoom (independent per user)
- Click-to-create rectangles
- Drag to move rectangles
- Real-time sync across multiple users
- Cursor presence with user names
- Online user tracking
- 60 FPS performance with 100+ shapes
- Support for 5+ concurrent users

### What's Next

#### Immediate: PR #1 Tasks
1. **Migration Strategy:**
   - User will manually clear existing rectangles from Firestore
   - Rename `/rectangles` collection to `/shapes` in code
   - Add type discriminator field to support multiple shape types
   - Add zIndex field for layer management (Phase 2 requirement)
   - Add rotation field for transform support

2. **Data Model Updates:**
   - Extend `types/shapes.ts` with:
     - BaseShape interface (common properties)
     - Rectangle interface (extends BaseShape)
     - Circle interface (center x/y, radius)
     - Line interface (points array)
     - Text interface (text content, font properties)
   - Add shape factory functions
   - Add z-index utility functions (getMaxZIndex, getMinZIndex)
   - Add z-index normalization function

3. **Composable Refactoring:**
   - Rename `useRectangles.js` → `useShapes.js`
   - Update to support multiple shape types
   - Maintain existing API for backward compatibility initially
   - Add shape-specific creation functions
   - Add z-index management methods

4. **Firestore Integration:**
   - Update `useFirestore.js` references:
     - `getCanvasRectanglesRef` → `getCanvasShapesRef`
     - `getRectangleDocRef` → `getShapeDocRef`
     - `saveRectangle` → `saveShape`
     - `updateRectanglePosition` → `updateShape` (generalized)
   - Maintain existing patterns (optimistic updates, retry logic, etc.)

5. **Component Updates:**
   - Keep `Rectangle.vue` as-is (template for other shapes)
   - Update `CanvasView.vue` to use `useShapes` instead of `useRectangles`
   - Ensure all existing rectangle functionality still works

#### After PR #1
- **PR #2:** Implement Circle and Line shapes
- **PR #3:** Implement Text layer system
- **PR #4:** Object transformation system (resize, rotate)
- **Remaining PRs:** See phase-2-tasks.md

## Key Decisions Made

### Migration Approach
- **Option C selected:** Fresh start acceptable - manually clear existing rectangles
- Breaking changes acceptable at this stage
- Focus on clean implementation over backward compatibility

### Implementation Patterns
- Keep composables-based architecture (Vue Composition API)
- Maintain reactive Map pattern for O(1) lookups
- Continue optimistic updates with server reconciliation
- Separate component per shape type (Rectangle.vue, Circle.vue, etc.)

### Technical Choices
- TypeScript already configured - use it throughout
- Z-index normalization: periodic renumbering to 0-N range when gap >1000
- Shape factory: composable-based, not separate factory class
- Undo/redo: local per-user stack, tracks individual property changes, 50 action limit

### Text Editing
- Lock system: `lockedBy`/`lockedAt` fields on text shape document
- Lock expires: 30 seconds or on user disconnect
- Simple implementation for Phase 2

### Performance
- Canvas thumbnails: client-side generation when dashboard loads
- Viewport culling: custom implementation with margin around viewport
- Performance warnings: show notification if FPS <30 for >5 seconds
- No mobile optimization yet (desktop focus)

### Permissions
- Enforced via Firestore security rules (server-side)
- Viewer mode: UI disabled/grayed out (for UX, not security)

## Active Considerations

### Before Starting PR #1
1. **Firestore Cleanup Required:**
   - User needs to clear existing `/canvases/default/rectangles` collection
   - Options provided:
     - Firebase Console (recommended)
     - Firebase CLI command
     - Node script (scripts/clear-rectangles.js)

2. **Code Familiarity:**
   - ✅ Reviewed all existing MVP code
   - ✅ Understand composables pattern
   - ✅ Understand Firestore integration
   - ✅ Understand Konva integration
   - ✅ Understand real-time sync flow

3. **Implementation Strategy:**
   - Follow existing patterns closely
   - Don't introduce new architectures or patterns
   - Keep changes minimal and focused
   - Maintain backward compatibility where possible

### During PR #1
- Test that existing rectangle functionality still works
- Verify Firestore collection renamed successfully
- Ensure real-time sync still functions
- Maintain performance targets

## Questions & Blockers

### Resolved ✅
- ✅ Migration strategy decided (fresh start)
- ✅ TypeScript configuration (already set up)
- ✅ Breaking changes acceptable (confirmed)
- ✅ Shape factory architecture (composable-based)
- ✅ All Phase 2 implementation details clarified
- ✅ Memory Bank structure created

### Outstanding
- None currently - ready to begin PR #1

## Context for Next Session

When resuming work:
1. Read all Memory Bank files (especially this one)
2. Check progress.md for implementation status
3. Refer to phase-2-tasks.md for detailed PR #1 tasks
4. Refer to systemPatterns.md for architecture patterns to follow
5. Review .cursor/rules/ for any project-specific rules

## Files to Modify in PR #1

### Primary Changes
- `ui/src/types/shapes.ts` - Extend with all shape interfaces
- `ui/src/composables/useRectangles.js` → `useShapes.js` - Rename and extend
- `ui/src/composables/useFirestore.js` - Update collection references
- `ui/src/views/CanvasView.vue` - Import and use useShapes

### Testing After PR #1
- Rectangle creation still works
- Rectangle dragging still works  
- Real-time sync still functions
- Multiple users can still collaborate
- No console errors
- Performance maintained

## Success Criteria for PR #1

**Deliverable:** Shape system foundation supports multiple types. Rectangles still work. Ready for new shape implementations in PR #2.

**Technical Requirements:**
- [ ] BaseShape interface defined
- [ ] All shape type interfaces defined (Rectangle, Circle, Line, Text)
- [ ] useShapes.js created with multi-shape support
- [ ] Firestore references updated (rectangles → shapes)
- [ ] Z-index management functions implemented
- [ ] Z-index normalization function implemented
- [ ] CanvasView using useShapes
- [ ] Existing rectangle functionality preserved
- [ ] Real-time sync still working
- [ ] No breaking changes to user experience

