# Technical Context: CollabCanvas

## Technology Stack

### Frontend
- **Vue 3.5.22** - Progressive JavaScript framework using Composition API
- **TypeScript 5.9.3** - Type safety and better developer experience
- **Konva.js + VueKonva** - HTML5 Canvas library for shape rendering
- **Vue Router 4.5.1** - Client-side routing
- **Vite 7.1.7** - Fast build tool and dev server

### Backend & Services
- **Firebase** - Backend-as-a-Service platform
  - **Firestore** - NoSQL real-time database for shapes, presence, and metadata
  - **Authentication** - Email/Password + Google OAuth
  - **Hosting** - Static site hosting and deployment
- **Firebase SDK** - Client-side integration with Firebase services

### Development Tools
- **ESLint + Prettier** - Code quality and formatting
- **Vue DevTools** - Browser extension for Vue debugging
- **Node.js** - Development environment
- **npm** - Package management

## Project Structure

```
collab_canvas/
├── ui/                          # Frontend application
│   ├── src/
│   │   ├── components/          # Reusable Vue components
│   │   │   ├── Rectangle.vue    # Rectangle shape component
│   │   │   ├── ZoomControls.vue # Zoom UI controls
│   │   │   ├── SyncStatus.vue   # Connection status indicator
│   │   │   ├── UserCursor.vue   # Remote user cursor
│   │   │   └── ...
│   │   ├── composables/         # Vue composables (business logic)
│   │   │   ├── useShapes.js     # Shape state management (renamed from useRectangles.js)
│   │   │   ├── useFirestore.js  # Firestore operations
│   │   │   ├── useAuth.js       # Authentication
│   │   │   ├── useCursors.js    # Cursor tracking
│   │   │   ├── usePresence.js   # User presence
│   │   │   └── usePerformance.js# Performance monitoring
│   │   ├── views/               # Page-level components
│   │   │   ├── AuthView.vue     # Login/signup page
│   │   │   └── CanvasView.vue   # Main canvas workspace
│   │   ├── firebase/            # Firebase configuration
│   │   │   ├── config.js        # Firebase initialization
│   │   │   ├── auth.js          # Auth helpers
│   │   │   └── firestore.js     # Firestore helpers
│   │   ├── types/               # TypeScript interfaces
│   │   │   └── shapes.ts        # Shape data models
│   │   ├── utils/               # Utility functions
│   │   ├── router/              # Vue Router configuration
│   │   │   └── index.ts         # Route definitions & guards
│   │   ├── App.vue              # Root component
│   │   ├── main.ts              # Application entry point
│   │   └── style.css            # Global styles
│   ├── public/                  # Static assets
│   ├── dist/                    # Production build output
│   ├── package.json             # Frontend dependencies
│   ├── tsconfig.json            # TypeScript configuration
│   └── vite.config.ts           # Vite configuration
├── memory-bank/                 # Project documentation
│   ├── projectbrief.md          # Project overview
│   ├── productContext.md        # Product goals and UX
│   ├── systemPatterns.md        # Architecture patterns
│   ├── techContext.md           # This file
│   ├── activeContext.md         # Current work focus
│   └── progress.md              # Status tracking
├── phase-2.md                   # Phase 2 PRD
├── phase-2-tasks.md             # Phase 2 task breakdown
├── prd.md                       # MVP PRD
├── tasks.md                     # MVP task breakdown
├── README.md                    # Setup instructions
├── firestore.rules              # Firestore security rules
├── firestore.indexes.json       # Firestore index configuration
└── firebase.json                # Firebase project configuration
```

## Development Setup

### Prerequisites
- **Node.js**: v18+ recommended
- **npm**: v9+ (comes with Node.js)
- **Firebase Account**: For backend services
- **Modern Browser**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

### Environment Variables
Create `ui/.env.local`:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### Installation
```bash
# Clone repository
cd /Users/ary/Desktop/gauntlet/P1\ COLLAB_CANVAS/collab_canvas

# Install dependencies
cd ui
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Firebase Setup
```bash
# Install Firebase CLI (optional)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize project (if needed)
firebase init

# Deploy to Firebase Hosting
firebase deploy --only hosting

# Deploy Firestore rules
firebase deploy --only firestore:rules
```

## Database Schema

### Firestore Structure
```
/canvases/{canvasId}
  - name: string
  - width: number (default: 3000, max: 10000)
  - height: number (default: 3000, max: 10000)
  - owner: userId
  - createdAt: timestamp
  - lastModified: timestamp
  - permissions: map<userId, role> (Owner|Editor|Viewer)

/canvases/{canvasId}/shapes/{shapeId}
  - type: 'rectangle' | 'circle' | 'line' | 'text'
  - zIndex: number
  - rotation: number (0-360 degrees)
  - createdBy: userId
  - createdAt: timestamp
  - lastModified: timestamp
  - lastModifiedBy: userId
  
  # Type-specific fields:
  # Rectangle
  - x: number (top-left corner)
  - y: number
  - width: number
  - height: number
  - fill: string (hex color)
  
  # Circle
  - x: number (center)
  - y: number
  - radius: number
  - fill: string
  - stroke?: string (optional)
  - strokeWidth?: number
  
  # Line
  - points: number[] ([x1, y1, x2, y2])
  - stroke: string
  - strokeWidth: number
  
  # Text
  - x: number (top-left)
  - y: number
  - text: string (max 300 chars)
  - fontSize: number
  - fontFamily: string
  - fill: string
  - fontStyle: 'normal' | 'bold' | 'italic' | 'bold italic'
  - align: 'left' | 'center' | 'right'
  - width?: number (text box width, optional)
  - lockedBy?: userId (text editing lock)
  - lockedAt?: timestamp

/users/{userId}
  - name: string
  - email: string
  - cursorColor: string
  - createdAt: timestamp

/presence/{canvasId}/{userId}
  - userId: string
  - userName: string
  - cursorColor: string
  - online: boolean
  - lastSeen: timestamp
```

### Firestore Indexes
Required composite indexes:
- Collection: `shapes`, Fields: `createdAt ASC`, `zIndex ASC`
- Collection: `shapes`, Fields: `lastModified DESC`

### Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Authentication required for all operations
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // Users can read/write their own user document
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
    
    // Canvas shapes: Role-based access
    match /canvases/{canvasId}/shapes/{shapeId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null 
        && request.resource.data.createdBy == request.auth.uid;
      allow update: if request.auth != null
        && request.resource.data.lastModifiedBy == request.auth.uid;
      allow delete: if request.auth != null;
    }
    
    // Presence: Users can read/write their own presence
    match /presence/{canvasId}/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Technical Constraints

### Performance Targets
- **60 FPS rendering** with 1000+ shapes in viewport
- **<100ms sync latency** for shape operations
- **<50ms sync latency** for cursor updates (best effort)
- **10+ concurrent users** supported without degradation

### Browser Requirements
- Modern browsers only (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- Desktop-focused (responsive for desktop sizes)
- Minimum 4GB RAM recommended
- JavaScript enabled
- Cookies enabled (for Firebase Auth)

### Network Requirements
- Persistent internet connection for real-time sync
- WebSocket support (for Firestore real-time listeners)
- Graceful degradation on poor connections

### Canvas Constraints
- Canvas size: Configurable per canvas (default: 3000x3000px, max: 10000x10000px)
- Coordinates: Positive values only (0 to canvas dimensions)
- Z-index: Periodic normalization when gap exceeds 1000
- Text: Maximum 300 characters
- Shape count: Optimized for 1000+ shapes

## Dependencies

### Production Dependencies (ui/package.json)
```json
{
  "dependencies": {
    "vue": "^3.5.22",
    "vue-router": "^4.5.1",
    "vue-konva": "[version]",
    "konva": "[version]",
    "firebase": "[version]"
  }
}
```

### Development Dependencies
```json
{
  "devDependencies": {
    "@types/node": "^24.6.0",
    "@vitejs/plugin-vue": "^6.0.1",
    "@vue/tsconfig": "^0.8.1",
    "typescript": "~5.9.3",
    "vite": "^7.1.7",
    "vue-tsc": "^3.1.0"
  }
}
```

## Build Configuration

### Vite Configuration (vite.config.ts)
- Vue plugin enabled
- TypeScript support
- Development server port configuration
- Production build optimizations
- Asset handling

### TypeScript Configuration (tsconfig.json)
- Target: ES2020+
- Module: ESNext
- Strict mode enabled
- Vue support via vue-tsc
- Path aliases configured

## Deployment

### Firebase Hosting
- Build command: `npm run build`
- Output directory: `ui/dist`
- Rewrites configured for SPA routing
- Caching headers for assets

### Continuous Deployment
- Manual deploy: `firebase deploy --only hosting`
- Automated: Can integrate with GitHub Actions

## Development Workflow

### Local Development
1. Start dev server: `npm run dev`
2. Access at: `http://localhost:5173` (or configured port)
3. Hot module replacement enabled
4. Vue DevTools for debugging

### Testing (Future)
- Unit tests: Vue Test Utils + Vitest
- E2E tests: Playwright or Cypress
- Performance tests: Lighthouse CI

### Code Quality
- ESLint for code linting
- Prettier for code formatting
- TypeScript for type checking
- Vue-tsc for Vue component type checking

## Known Technical Limitations

1. **Offline Support:** Limited (optimistic updates only, full offline mode not implemented)
2. **Browser Compatibility:** Modern browsers only (no IE support)
3. **Mobile Support:** Desktop-focused (mobile not optimized yet)
4. **File Export:** Not implemented (future feature)
5. **Version History:** Not implemented (future feature)
6. **Shape Complexity:** Limited to basic shapes (no custom SVG paths yet)

## Future Technical Considerations

1. **AI Integration:** Clean API design for programmatic canvas manipulation
2. **WebGL Rendering:** For extremely large canvases (10,000+ shapes)
3. **Operational Transforms:** More sophisticated conflict resolution
4. **CRDT Implementation:** Alternative to last-write-wins for specific features
5. **Service Workers:** Better offline support
6. **WebRTC:** Direct peer-to-peer for cursor updates (lower latency)

