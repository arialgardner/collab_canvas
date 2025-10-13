CollabCanvas MVP
Product Requirements Document
Document Version: 1.1

Last Updated: October 13, 2025

Executive Summary
CollabCanvas MVP is a real-time collaborative canvas application that enables multiple users to simultaneously create and move shapes while seeing each other's cursors and edits in real-time. The MVP focuses on proving the collaborative infrastructure is solid rather than feature completeness.

Target Platform: Desktop web application (modern browsers only)

Core Focus: Bulletproof multiplayer synchronization and real-time collaboration

Shape Support: Rectangle only (single shape type for MVP)

User Personas
Primary User: Designer/Creator
Needs to create and manipulate visual elements on a shared canvas
Expects responsive interactions without lag
Wants to see collaborators' activity in real-time
Requires persistent work (canvas state saved across sessions)
User Flows
Flow 1: First-Time User Onboarding & Canvas Access
User arrives at application URL
User sees authentication screen
User creates account or logs in with name/credentials
User is redirected to canvas workspace
User sees presence indicator (who else is online)
Flow 2: Creating and Moving Rectangles (Single User)
User is on canvas workspace
User clicks on canvas to create rectangle (click-to-create method)
Rectangle appears with top-left corner at clicked position (default size: 100x100px)
User clicks and drags rectangle to move it
Rectangle follows cursor smoothly
Rectangle position updates are saved to backend
Flow 3: Real-Time Collaborative Editing (Multi-User)
This is the PRIMARY flow and most critical for MVP success
User A is editing canvas with several rectangles present
User B logs in and joins the same canvas
User A sees:
User B's cursor appear with name label
User B listed in presence indicator
User B sees:
All existing rectangles on canvas (loaded from persistence layer)
User A's cursor with name label
User A listed in presence indicator
User B creates a new rectangle
Rectangle appears on User B's canvas immediately
Within <100ms, rectangle appears on User A's canvas
User A simultaneously moves a rectangle
Rectangle moves smoothly on User A's canvas
Within <100ms, User B sees rectangle move
Both users continue editing:
All cursor movements visible to other user (<50ms latency)
All object creation/movement synced (<100ms latency)
No conflicts or race conditions
Smooth, responsive experience
Flow 4: Conflict Resolution (Simultaneous Edits)
User A and User B both grab the same rectangle simultaneously
Both users begin dragging the rectangle
System uses last write wins with server timestamp
Rectangle position converges to consistent state for both users
Both users see the same final position
No errors or broken sync state
Conflict Resolution Strategy: Last write wins with server timestamp

Server assigns timestamp to each update
Later timestamp always wins
Clients accept server's version as source of truth
Prevents split-brain scenarios
Flow 5: Disconnect and Reconnect
User A is editing canvas with multiple rectangles
User A's network connection drops or browser refreshes
User B sees User A's cursor disappear
User B continues editing without interruption
User A reconnects/refreshes browser
User A sees:
All original rectangles still present
Any new rectangles User B created during disconnect
User B's current cursor position
Canvas state is fully synchronized
Both users continue editing normally
Flow 6: Canvas Navigation
User clicks and drags background to pan canvas
Canvas moves smoothly
User uses scroll wheel or zoom controls to zoom in/out
Zoom centers on cursor position
Other users see the same canvas but with independent pan/zoom
Object positions are synchronized regardless of viewport differences
Key Features for MVP
Must-Have (Hard Gate Requirements)
1. Canvas Workspace
Pan: Click and drag background to move viewport
Zoom: Scroll or button controls to zoom in/out
Size: Large workspace (minimum 3000x3000px virtual canvas)
Performance: Smooth interactions, no major lag
2. Rectangle Creation & Manipulation
Single shape type: Rectangle ONLY
Create: Click canvas to place rectangle (click-to-create)
Default properties: 100x100px, random color (assigned at creation)
Move: Click and drag to reposition
Visual feedback: Rectangle follows cursor during drag
Smooth movement: No jittery updates
3. Real-Time Synchronization
Object sync: Changes appear on all clients within <100ms
Delta broadcasting: Only changes are sent, not full canvas state
Conflict resolution: Last write wins with server timestamp
Performance: Supports 5+ concurrent users without major degradation
Scalability: Architecture supports scaling to 10+ users
Load handling: Handles 100+ rectangles without significant performance issues
4. Multiplayer Cursors
Cursor position: All users see each other's cursors in real-time
Name labels: Each cursor displays the user's name
Latency target: Cursor updates within <50ms (best effort)
Distinct colors: Each user has a unique cursor color
5. Presence Awareness
Online users list: Shows who is currently on the canvas
Join/leave indicators: Updates when users connect/disconnect
Real-time updates: Presence list updates within 1-2 seconds
User count: Display total number of active users
6. User Authentication
Account system: Users must have accounts/names
Login/signup: Email/password and Google sign-in options
Identity: Each user has a unique identifier and display name
Session management: Users stay logged in until they log out (no automatic logout)
7. State Persistence
Canvas saved: All rectangles and positions saved to backend
Survives disconnect: Canvas state persists if all users leave
Recovery: Users can return later and see their work
No data loss: Refreshing browser doesn't lose progress
Automatic save: Changes saved immediately (no manual save button needed)
8. Deployment
Public URL: Application is deployed and accessible
No local setup required: Users can access directly via URL
Stable hosting: Supports concurrent users
Technical Architecture
Architecture Overview
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Frontend 1    │◄────────┤   Firebase       │────────►│   Frontend 2    │
│  (Browser A)    │         │                  │         │  (Browser B)    │
│   Vue + Konva   │         │  - Firestore     │         │   Vue + Konva   │
│                 │         │  - Auth          │         │                 │
│  - Canvas       │         │  - Realtime DB   │         │  - Canvas       │
│  - Local State  │         │  - Timestamps    │         │  - Local State  │
│  - Listeners    │◄────────┤  - Broadcasting  │────────►│  - Listeners    │
└─────────────────┘         └──────────────────┘         └─────────────────┘
        │                            │                            │
        │                            │                            │
        └────────────────────────────┴────────────────────────────┘
                        Real-time sync (<100ms)
Scalability Design Considerations
While MVP focuses on 2+ users, the architecture should support future scaling:

Room/Canvas Structure
// Canvas can be identified by unique ID
// Multiple canvases can exist simultaneously
{
  canvasId: string;
  users: Map<userId, UserPresence>;
  rectangles: Map<rectangleId, Rectangle>;
}
Efficient Broadcasting
Use Firestore collection structure for canvas isolation
Each canvas is a separate document path
Users only receive updates for their active canvas
Firestore doesn't broadcast to all users globally, only listeners on specific paths
Data Structure for Scale
Use objects/maps for O(1) lookups (not arrays)
Index rectangles by ID
Index users by ID
Enables efficient updates without full state iteration
Update Strategy
Broadcast deltas only (what changed), not full state
Full state sync only on initial connection
Reduces bandwidth as user count grows
Firebase Backend
Firestore for rectangle persistence

Document structure: /canvases/{canvasId}/rectangles/{rectangleId}
Firestore listeners for real-time updates
Built-in serverTimestamp() for conflict resolution
Automatic scaling to many concurrent users
Realtime Database for cursor positions (optional optimization)

Path: /cursors/{canvasId}/{userId}
Cursors are ephemeral, don't need persistence
Lower latency than Firestore for high-frequency updates
Firebase Authentication for user accounts

Email/password and Google sign-in options
User profiles stored in Firestore: /users/{userId}
Cursor color assigned randomly at first login and persisted
Firebase Hosting for deployment

Integrated with Firebase backend
Automatic HTTPS and CDN
Simple deployment workflow
Preferred hosting platform for Firebase integration
Why This Stack Scales:

Firebase automatically handles multiple concurrent connections
Firestore listeners use WebSocket internally
Can support 10+ users without code changes
Room/channel isolation via Firestore collection structure
No server capacity planning needed
Vue Frontend
Vue 3 for UI components and state management

Composition API for reactive state
Component-based architecture
Simple and efficient reactivity system
Konva.js for canvas rendering

High-level API for rectangles
Built-in drag-and-drop
Good performance for 100+ shapes
Easy pan/zoom with Stage
Vue-Konva bridge library

Seamless integration between Vue and Konva
Reactive canvas updates
Component-based shape management
Data Flow
User action (create/move rectangle)
Update local Vue state immediately (optimistic update)
Show visual feedback instantly
Broadcast to Firebase
Send delta with action type and data
Firestore assigns server timestamp
Firebase processes
Validates update
Saves to Firestore
Assigns authoritative timestamp
Firebase broadcasts to listeners
Sends change to all clients listening to same canvas path
Includes server timestamp
Other clients receive
Firestore listener callback fires
Check timestamp against local state
Apply update if timestamp is newer (conflict resolution)
Update Vue state which triggers Konva re-render
Technical Specifications
Data Models
User
{
  id: string;
  name: string;
  email: string;
  cursorColor: string; // hex color for cursor
  createdAt: timestamp;
}
Rectangle
{
  id: string;
  x: number;           // top-left x position
  y: number;           // top-left y position
  width: number;       // default 100
  height: number;      // default 100
  fill: string;        // hex color
  createdBy: string;   // user id
  createdAt: timestamp;
  lastModified: timestamp; // server timestamp for conflict resolution
  lastModifiedBy: string;  // user id
}
Cursor Position (Ephemeral - not persisted)
{
  userId: string;
  userName: string;
  cursorColor: string;
  x: number;
  y: number;
  timestamp: number;   // client timestamp
}
Presence
{
  userId: string;
  userName: string;
  cursorColor: string;
  online: boolean;
  canvasId: string;    // which canvas they're viewing
  lastSeen: timestamp;
}
Canvas/Room
{
  id: string;
  name: string;        // optional: "Untitled Canvas"
  createdAt: timestamp;
  createdBy: string;   // user id
  activeUsers: number; // count of currently connected users
}
Firestore Structure
/canvases
  /{canvasId}
    /rectangles
      /{rectangleId}
        - id, x, y, width, height, fill
        - createdBy, createdAt, lastModified, lastModifiedBy
    /metadata
      - createdAt, createdBy, activeUsers
      
/users
  /{userId}
    - name, email, cursorColor, currentCanvas

/presence
  /{canvasId}
    /{userId}
      - online, lastSeen, userName, cursorColor
Event Types (Firestore Listeners)
Vue Component Listens To:
// Rectangle operations
onSnapshot(rectanglesCollection) → handles:
  - added: new rectangle created by another user
  - modified: rectangle moved by another user
  - removed: rectangle deleted (future feature)

// Presence operations
onSnapshot(presenceCollection) → handles:
  - user joined/left
  - presence updates
Vue Component Writes:
// Rectangle operations
setDoc(rectangleDoc, { ...data, lastModified: serverTimestamp() })
updateDoc(rectangleDoc, { x, y, lastModified: serverTimestamp() })

// Presence operations
setDoc(presenceDoc, { online: true, lastSeen: serverTimestamp() })
updateDoc(presenceDoc, { online: false, lastSeen: serverTimestamp() })
Conflict Resolution Strategy
Last Write Wins with Server Timestamp
How it works:
Client makes update (move rectangle)
Client applies update locally (optimistic)
Client sends update to Firestore
Firestore assigns authoritative timestamp via serverTimestamp()
Firestore triggers listener callback for all clients
Each client checks: "Is server timestamp > my local timestamp for this object?"
If yes: Accept server's update (may overwrite local optimistic update)
If no: Ignore (shouldn't happen with proper implementation)
Benefits:
Simple to implement
No complex CRDT or OT algorithms needed
Firestore is source of truth
Predictable behavior
Works well for MVP timeline
Trade-offs:
User with slower connection might see their changes overwritten
For MVP this is acceptable and documented behavior
In production, could add visual indicators (e.g., "User B moved this")
Implementation in Vue:
// Firestore listener callback
onSnapshot(rectanglesRef, (snapshot) => {
  snapshot.docChanges().forEach((change) => {
    const rect = change.doc.data();
    
    if (change.type === 'added') {
      // New rectangle from another user
      localRectangles.value[rect.id] = rect;
    }
    
    if (change.type === 'modified') {
      const localRect = localRectangles.value[rect.id];
      
      // If server timestamp is newer, accept update
      if (!localRect || rect.lastModified > localRect.lastModified) {
        localRectangles.value[rect.id] = rect;
      }
      // Otherwise, ignore (our optimistic update is newer)
    }
  });
});
Performance Requirements
Response Time Targets
Cursor sync: <50ms (best effort, not hard requirement)
Object sync: <100ms from edit to display on other clients
Presence updates: <2 seconds for join/leave notifications
Initial load: <3 seconds to load canvas with 100 rectangles
Scalability Targets
100+ rectangles: Canvas remains usable without significant lag
5+ concurrent users: System handles without major degradation
10+ users: Architecture supports (even if not tested in MVP)
Acceptable Performance
Canvas interactions feel smooth and responsive
No multi-second delays in sync
Cursor updates feel "real-time" (sub-second)
Creating/moving rectangles has immediate visual feedback
Testing Scenarios (MVP Validation)
Test 1: Two-User Simultaneous Editing
Open application in two different browsers
Log in as two different users
Both users create and move rectangles rapidly (10-15 actions each)
Success criteria:

Both users see each other's cursors with names and colors
All rectangle creations appear on both canvases within 100ms
All rectangle moves sync within 100ms
No visual glitches or sync errors
Smooth, responsive interaction
Test 2: Mid-Edit Refresh
User A creates 5-10 rectangles on canvas
User B joins and creates additional 5 rectangles
User A refreshes browser mid-edit (while User B is actively moving a rectangle)
Success criteria:

All rectangles persist after refresh
User A rejoins and sees all rectangles (theirs + User B's)
No data loss
Collaboration continues seamlessly
User B's ongoing edit is visible after User A reconnects
Test 3: Rapid Rectangle Creation
Two users simultaneously create rectangles as fast as possible
Create 20-30 rectangles in quick succession (10-15 each)
Move multiple rectangles rapidly
Success criteria:

All rectangles sync correctly to both clients
No race conditions or duplicates
Canvas remains responsive
No rectangles get "lost" in sync
Final count matches on both clients
Test 4: Conflict Resolution
Two users grab the same rectangle simultaneously
Both attempt to move it in different directions for 3-5 seconds
Both users release
Success criteria:

Rectangle converges to single final position
Both users see the exact same position within 1 second
No errors thrown in console
No "jumping" or flickering after convergence
Sync remains stable for subsequent edits
Test 5: Disconnect/Reconnect
User A and B both editing (5+ rectangles on canvas)
User A disconnects (close browser or kill network)
User B creates 3 new rectangles and moves 2 existing ones
User A reconnects after 10-30 seconds
Success criteria:

User A's cursor disappears for User B during disconnect
User B can continue working without interruption
User A sees all of User B's changes upon reconnect
Canvas state is fully synchronized
No duplicate or missing rectangles
User A's presence reappears for User B
Test 6: Multi-User Scaling (3+ Users)
Open application in 3-5 different browsers
All users create rectangles simultaneously
All users move existing rectangles
Success criteria:

All cursors visible with correct names/colors
All rectangles sync across all clients
No significant performance degradation
Presence list shows all users correctly
System remains stable
Success Metrics
MVP Pass Criteria (Hard Gate)
✅ Basic canvas with pan/zoom working
✅ Rectangle creation and movement functional
✅ Real-time sync between 2+ users confirmed
✅ Multiplayer cursors with name labels visible
✅ Presence awareness showing online users
✅ User authentication implemented
✅ Deployed and publicly accessible
✅ All 6 testing scenarios pass (including 3+ user test)
✅ Sync latency targets met (<100ms for rectangles, <50ms for cursors best effort)
✅ Conflict resolution working correctly
✅ State persistence across disconnects
Quality Indicators
Zero sync errors during testing
Smooth, responsive user experience
No data loss scenarios
Clean, documented codebase
Stable deployment under concurrent load
Architecture can scale to 10+ users (proven by code structure, not necessarily tested)
Architecture for Future Scaling
While MVP focuses on 2-5 users, the architecture should support 10+ users:

Firestore Listeners
// Only listen to current canvas
const canvasRef = doc(db, 'canvases', canvasId);
const rectanglesRef = collection(canvasRef, 'rectangles');

// Efficient: only subscribes to one canvas
onSnapshot(rectanglesRef, (snapshot) => {
  snapshot.docChanges().forEach((change) => {
    // Handle added, modified, removed
  });
});
Scaling Considerations
Each canvas is isolated (separate Firestore collection path)
Users only receive updates for their active canvas
Firestore handles fan-out to all listeners automatically
Can support many canvases and users concurrently
No server-side code changes needed to scale
MVP Implementation Clarifications

Canvas Access & Scaling:
- MVP uses single default canvas (ID: "default")
- Future support for multiple canvases via URL parameters (e.g., /canvas/{canvasId})
- No canvas selection interface in MVP

Initial Canvas View:
- Users start at 100% zoom focused on canvas center
- Independent pan/zoom per user (viewport not synchronized)
- 3000x3000px virtual canvas size

User Interface:
- Rectangle creation: Click-to-create method only
- Rectangle positioning: Top-left corner at click point
- Rectangle colors: Random assignment at creation
- Rectangle boundaries: Constrained within 3000x3000px canvas bounds
- Cursor colors: Random assignment at first login and persisted
- Cursor visibility: Only when hovering over canvas area
- Online users list: Displayed in top bar

User Account Setup:
- Email/password signup: Separate display name field required
- Google sign-in: Use full name from Google profile as display name

Error Handling:
- Firebase connection failures: Display "connection lost" message
- No offline editing support in MVP
- Simple error states and notifications

Platform Support:
- Desktop web application only
- Modern browsers support required
- No mobile/touch device support in MVP

Database Strategy:
- Flexible choice between Firestore/Realtime Database based on implementation optimization
- Firestore for persistence, optional Realtime Database for high-frequency cursor updates
- New Firebase project will be created for this demo

Definition of Done
MVP is complete when:

✅ Application is deployed at a public URL
✅ Two users in different browsers can edit simultaneously
✅ All 6 testing scenarios pass (including 3+ user test)
✅ Sync latency targets met (<100ms rectangles, <50ms cursors best effort)
✅ State persists across disconnects
✅ Conflict resolution working (last write wins with timestamp)
✅ No critical bugs or sync errors
✅ Architecture supports scaling to 10+ users
✅ README includes setup instructions and architecture explanation
✅ Deployed app is stable under concurrent user load
Remember: A simple canvas with perfect rectangle sync and multiplayer cursors beats any feature-rich app with broken collaboration.