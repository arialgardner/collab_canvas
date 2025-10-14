# Project Brief: CollabCanvas

## Project Overview
CollabCanvas is a real-time collaborative canvas application where multiple users can simultaneously create, manipulate, and interact with shapes. The system prioritizes bulletproof synchronization, smooth performance, and eventual AI integration.

## Core Requirements

### MVP (Completed ✅)
- Real-time collaborative canvas with rectangles
- Click-to-create rectangle functionality  
- Drag-to-move shapes with real-time sync
- Multi-user cursor presence
- Pan and zoom navigation (independent per user)
- User authentication (Email/Password + Google)
- 60 FPS performance with 100+ shapes
- Support for 5+ concurrent users
- Sync latency <100ms for shapes, <50ms for cursors

### Phase 2 (Current - In Progress)
Expand MVP to comprehensive shape system with:
- **Shape Types:** Rectangle, Circle, Line, Text
- **Transformations:** Move, Resize, Rotate (with Konva Transformer)
- **Selection:** Single, multi-selection, marquee selection
- **Layer Management:** Z-index control, bring to front/back operations
- **Essential Operations:** Delete, Duplicate, Copy/Paste, Undo/Redo
- **Canvas Management:** Dashboard, multiple canvases, permissions
- **Performance:** 1000+ shapes at 60 FPS, 10+ concurrent users

### Future (Phase 3)
- AI Canvas Agent integration
- Advanced features building on bulletproof foundation

## Success Criteria

### Performance Targets
- 60 FPS rendering with 1000+ shapes in viewport
- Shape sync latency <100ms across users
- Cursor sync latency <50ms (best effort)
- Support 10+ concurrent users without degradation

### Technical Requirements
- Desktop-focused web application (responsive for desktop sizes)
- Modern browsers: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- Minimum 4GB RAM recommended
- TypeScript for type safety
- Vue 3 Composition API architecture
- Firebase (Firestore, Auth, Hosting)
- Konva.js for canvas rendering

### Quality Standards
- Bulletproof real-time synchronization (top priority)
- Last-write-wins conflict resolution
- Optimistic updates with server reconciliation
- Graceful error handling and recovery
- Clean, maintainable code architecture

## Key Principles
1. **Sync First:** Never compromise real-time collaboration
2. **Performance Matters:** 60 FPS is non-negotiable
3. **Keep It Simple:** KISS principle, add complexity only when needed
4. **Test Continuously:** Multi-user testing at every stage
5. **Design for AI:** Clean APIs for future AI integration

## Project Structure
```
collab_canvas/
├── ui/                      # Frontend Vue application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── composables/     # Vue composables (state management)
│   │   ├── views/           # Page-level components
│   │   ├── firebase/        # Firebase configuration
│   │   ├── types/           # TypeScript interfaces
│   │   └── utils/           # Utility functions
│   └── package.json
├── memory-bank/             # Project documentation and context
├── phase-2.md               # Phase 2 PRD
├── phase-2-tasks.md         # Phase 2 task breakdown
└── README.md                # Project setup and documentation
```

## Current Status
- **MVP:** Complete and deployed
- **Phase 2:** Starting PR #1 (Enhanced Shape System Foundation)
- **Documentation:** Creating Memory Bank structure

## Key Stakeholders
- Primary Developer: Building Phase 2 features
- End Users: Designers, collaborators needing real-time canvas tools
- Future: AI integration for automated canvas manipulation

