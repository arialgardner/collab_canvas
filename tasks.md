CollabCanvas MVP - Task List & PR Breakdown
Goal: Working multiplayer canvas with rectangles, cursors, and real-time sync

Updated Requirements from PRD v1.1:
- Single default canvas (ID: "default") for MVP with future multi-canvas support via URL parameters
- Both email/password and Google sign-in authentication
- Click-to-create rectangles with random colors, constrained within 3000x3000px bounds
- Independent pan/zoom per user, starting at 100% zoom centered on canvas
- Cursors visible only when hovering over canvas area, online users list in top bar
- Desktop web application for modern browsers only
- New Firebase project for this demo

PR #1: Project Setup & Initial Configuration
Purpose: Bootstrap project with all necessary dependencies and configuration
Tasks:

 Initialize Vue 3 project with Vite

 Run npm create vite@latest collabcanvas -- --template vue
 Install and configure Vue 3 with Composition API


 Install core dependencies

 npm install firebase (Firestore, Auth, Hosting)
 npm install konva vue-konva (Canvas rendering)
 npm install vue-router (Routing for auth/canvas views)
 Optional: Choose between Firestore or Realtime Database for cursor tracking based on optimization needs


 Install development dependencies

 npm install -D @vitejs/plugin-vue
 npm install -D vitest @vue/test-utils (Testing)
 npm install -D eslint prettier (Code quality)


 Create Firebase project

 Set up NEW Firebase project in console specifically for this demo
 Enable Firestore Database
 Enable Firebase Authentication (Email/Password AND Google sign-in)
 Enable Firebase Hosting
 Download Firebase config and add to project


 Configure Firebase in project

 Create src/firebase/config.js with Firebase initialization
 Create src/firebase/firestore.js for Firestore helpers
 Create src/firebase/auth.js for Auth helpers


 Set up project structure

  src/
  ├── components/
  ├── composables/
  ├── firebase/
  ├── views/
  ├── utils/
  └── App.vue

 Create .env.local for Firebase config
 Add .gitignore (include .env.local, node_modules, dist)
 Create basic README.md with setup instructions
 Configure Vite for development

 Set up dev server port
 Configure build options



Tests:

 Verify Firebase connection works

 Test Firebase config loads without errors
 Test Firestore connection (simple read/write test)


 Verify project builds successfully (npm run build)
 Verify dev server starts (npm run dev)

Deliverable:
✅ Working project with Firebase connected, builds successfully, ready for development

PR #2: Authentication System
Purpose: Implement user authentication and session management
Tasks:

 Create authentication composable

 Create src/composables/useAuth.js
 Implement signUp(email, password, displayName) for email/password registration
 Implement signUpWithGoogle() for Google sign-in registration
 Implement signIn(email, password)
 Implement signInWithGoogle()
 Implement signOut()
 Implement onAuthStateChanged listener
 Store current user in reactive ref


 Create Login/Signup view

 Create src/views/AuthView.vue
 Build login form (email, password, submit)
 Build signup form (email, password, DISPLAY NAME field, submit)
 Add Google sign-in buttons for both login and signup
 Add toggle between login/signup modes
 Add form validation (email format, password length, display name required)
 Add error handling and display error messages
 Add loading states during auth operations
 Handle Google profile name extraction for display name


 Create user profile in Firestore on signup

 Generate random cursor color on signup and persist it
 Store user document at /users/{userId}
 Include: name (display name or Google profile name), email, cursorColor, createdAt
 Handle both email/password and Google sign-in user creation


 Set up routing and auth guards

 Create src/router/index.js
 Define routes: / (auth), /canvas (canvas view)
 Implement navigation guard: redirect to / if not authenticated
 Redirect to /canvas after successful login


 Create navigation component

 Create src/components/NavBar.vue
 Display current user name
 Add logout button
 Show user's cursor color indicator
 Include online users list in TOP BAR (not sidebar)
 Show active user count and list of online users
 No automatic logout - users stay logged in until manual logout



Tests:

 Unit test: useAuth composable

 Test signup creates user and Firestore document
 Test login authenticates user
 Test logout clears user state
 Test auth state persistence


 Integration test: Auth flow

 Test signup → auto login → redirect to canvas
 Test login → redirect to canvas
 Test logout → redirect to auth page


 E2E test: Full auth flow

 Create account, logout, login again



Deliverable:
✅ Users can sign up, log in, log out. User data stored in Firestore with cursor color. Protected routes working.

PR #3: Basic Canvas Setup & Pan/Zoom
Purpose: Create the canvas workspace with navigation controls
Tasks:

 Create Canvas view component

 Create src/views/CanvasView.vue
 Add Konva Stage (3000x3000 virtual canvas with boundary constraints)
 Add Konva Layer for shapes
 Set initial viewport (100% zoom, centered on canvas center)
 Rectangles constrained within canvas boundaries (cannot be created or moved outside)


 Implement pan functionality

 Enable Stage dragging (draggable: true)
 Add cursor style change on pan (grab/grabbing)
 Independent pan per user (viewport not synchronized between users)
 Constrain pan boundaries (optional)
 Smooth pan performance


 Implement zoom functionality

 Listen to mouse wheel events
 Calculate zoom factor (1.05 per scroll)
 Zoom centered on mouse cursor position
 Independent zoom per user (viewport not synchronized between users)
 Clamp zoom levels (min: 0.25, max: 3)
 Update Stage scale on zoom


 Add zoom controls UI

 Create src/components/ZoomControls.vue
 Add "Zoom In" button (+)
 Add "Zoom Out" button (-)
 Add "Reset Zoom" button (100%)
 Display current zoom percentage
 Position controls in corner of screen


 Style canvas area

 Set background color (light gray)
 Add grid pattern (optional, visual aid)
 Full viewport height/width



Tests:

 Unit test: Zoom calculations

 Test zoom factor calculation
 Test zoom clamping (min/max)
 Test zoom center point calculation


 Integration test: Canvas interactions

 Test pan moves Stage position
 Test wheel zoom changes scale
 Test zoom controls update scale
 Test reset zoom returns to 100%


 Visual test: Render canvas

 Verify Stage renders at correct size
 Verify zoom controls appear correctly



Deliverable:
✅ Canvas workspace with smooth pan and zoom. Users can navigate large canvas area.

PR #4: Rectangle Creation & Local Manipulation
Purpose: Add ability to create and move rectangles locally (no sync yet)
Tasks:

 Create rectangle data model

 Define Rectangle interface in src/types/shapes.js
 Include: id, x, y, width, height, fill, createdBy, createdAt, lastModified


 Create rectangle composable

 Create src/composables/useRectangles.js
 Store rectangles in reactive Map (key: id, value: Rectangle)
 Implement createRectangle(x, y) - generates ID, default size/color
 Implement updateRectangle(id, updates) - updates position
 Implement getRectangle(id) - retrieves rectangle


 Create Rectangle component

 Create src/components/Rectangle.vue
 Render Konva Rect with props (x, y, width, height, fill)
 Enable dragging (draggable: true)
 Listen to dragmove event
 Listen to dragend event
 Update rectangle position on drag


 Implement rectangle creation UI

 Add CLICK-TO-CREATE functionality (no separate create button needed)
 Click on canvas creates rectangle with top-left corner at clicked position
 Generate random color from palette for each rectangle
 Constrain rectangle creation within 3000x3000px canvas bounds
 Add rectangle to local state
 Render rectangle on canvas


 Implement rectangle dragging

 Handle dragmove - update local state optimistically
 Handle dragend - finalize position
 Constrain rectangle movement within 3000x3000px canvas bounds
 Visual feedback during drag (slight opacity change)


 Add visual feedback

 Hover effect on rectangles (border highlight)
 Cursor changes to "move" on hover



Tests:

 Unit test: Rectangle composable

 Test createRectangle generates valid rectangle with ID
 Test updateRectangle updates position
 Test rectangles stored in Map correctly


 Unit test: Rectangle component

 Test renders with correct props
 Test drag events update position


 Integration test: Rectangle creation and movement

 Test clicking create button adds rectangle
 Test dragging rectangle updates position
 Test multiple rectangles can exist



Deliverable:
✅ Users can create rectangles and drag them around locally. No sync yet, but mechanics work.

PR #5: Firestore Integration & State Persistence
Purpose: Save rectangles to Firestore and load on connect
Tasks:

 Set up Firestore collections

 Create collection structure: /canvases/{canvasId}/rectangles/{rectangleId}
 For MVP, use single canvas ID: "default" (not "default-canvas")
 Prepare architecture for future multi-canvas support via URL parameters


 Create Firestore composable

 Create src/composables/useFirestore.js
 Implement saveRectangle(canvasId, rectangle) - uses setDoc with serverTimestamp()
 Implement updateRectanglePosition(canvasId, rectangleId, x, y) - uses updateDoc
 Implement loadRectangles(canvasId) - fetches all rectangles once
 Implement subscribeToRectangles(canvasId, callback) - sets up onSnapshot listener


 Integrate Firestore with rectangle creation

 On createRectangle, save to Firestore immediately
 Add lastModified: serverTimestamp() field
 Handle Firestore errors (network issues)


 Integrate Firestore with rectangle movement

 On dragend, update Firestore with new position
 Use optimistic update (local first, then sync)
 Add lastModified: serverTimestamp() on update


 Load rectangles on canvas mount

 Call loadRectangles when CanvasView mounts
 Populate local state with Firestore data
 Show loading spinner during initial load


 Handle initial load edge cases

 Empty canvas (no rectangles)
 Network error on load (show error message)



Tests:

 Unit test: Firestore operations

 Test saveRectangle writes to Firestore
 Test updateRectanglePosition updates document
 Test loadRectangles fetches all documents


 Integration test: Persistence

 Test creating rectangle saves to Firestore
 Test moving rectangle updates Firestore
 Test refresh loads rectangles from Firestore


 E2E test: Data persistence

 Create rectangles, refresh page, verify they're still there



Deliverable:
✅ Rectangles persist to Firestore. Reload page and rectangles are still there. No real-time sync yet.

PR #6: Real-Time Rectangle Synchronization
Purpose: Implement real-time sync of rectangles across users
Tasks:

 Implement Firestore listener for rectangles

 Set up onSnapshot listener in useFirestore.js
 Listen to /canvases/{canvasId}/rectangles collection
 Handle docChanges() with types: added, modified, removed


 Handle incoming rectangle updates

 On added: Add rectangle to local state if not exists
 On modified: Check server timestamp vs local timestamp
 If server timestamp newer, update local state
 If local timestamp newer, ignore (shouldn't happen)
 On removed: Remove from local state (future feature)


 Implement conflict resolution

 Compare lastModified timestamps
 Accept server's version if newer (last write wins)
 Log conflicts for debugging


 Optimize listener setup

 Set up listener once on canvas mount
 Clean up listener on unmount
 Handle listener errors (network loss)


 Handle edge cases

 User creates rectangle while offline → sync when back online
 Two users create rectangles simultaneously → both appear
 Two users move same rectangle → last write wins


 Add sync status indicator

 Create src/components/SyncStatus.vue
 Show "Connected" / "Syncing..." / "Offline" status
 Position in corner of canvas



Tests:

 Unit test: Conflict resolution logic

 Test newer timestamp wins
 Test older timestamp ignored
 Test equal timestamps (shouldn't happen, but handle)


 Integration test: Real-time sync

 Test User A creates rectangle → appears for User B
 Test User A moves rectangle → updates for User B
 Test simultaneous creation by two users


 E2E test: Multi-user sync

 Open two browsers, create/move rectangles, verify sync
 Test conflict: both users move same rectangle



Deliverable:
✅ Rectangles sync in real-time across all users. Last write wins conflict resolution working.

PR #7: Multiplayer Cursors
Purpose: Show each user's cursor position and name in real-time
Tasks:

 Set up cursor position tracking

 Choose between Firebase Realtime Database or Firestore for cursor updates based on optimization
 Realtime Database path: /cursors/{canvasId}/{userId} (if chosen for lower latency)
 Firestore collection: /cursors/{canvasId}/{userId} (if chosen for consistency)
 Cursor data: { userId, userName, cursorColor, x, y, timestamp }


 Create cursor composable

 Create src/composables/useCursors.js
 Implement updateCursorPosition(canvasId, userId, x, y)
 Implement subscribeToCursors(canvasId, callback)
 Store cursors in reactive Map (key: userId, value: Cursor)
 Throttle updates to ~60Hz (16ms)


 Track local cursor position

 Listen to mousemove on Stage
 ONLY track cursor when hovering over canvas area (not entire application)
 Convert screen coords to canvas coords (account for pan/zoom)
 Broadcast position to chosen database (Firestore or Realtime Database)
 Don't broadcast own cursor (render locally only)


 Create Cursor component

 Create src/components/UserCursor.vue
 Render SVG cursor icon (arrow or dot)
 Display user name label next to cursor
 Use user's cursor color
 Smooth interpolation between position updates


 Render remote cursors

 Subscribe to cursor updates on canvas mount
 Render Cursor component for each remote user
 Update cursor positions reactively
 Remove cursor when user disconnects


 Optimize cursor rendering

 Use CSS transforms for smooth movement
 Throttle position updates (every 50ms max)
 Don't render cursors outside viewport



Tests:

 Unit test: Cursor composable

 Test updateCursorPosition writes to Realtime DB
 Test coordinate conversion (screen to canvas)
 Test throttling (not every mousemove is sent)


 Integration test: Cursor sync

 Test local cursor position updates
 Test remote cursor appears and moves
 Test cursor disappears on user disconnect


 E2E test: Multi-user cursors

 Open two browsers, move mouse, verify both cursors visible
 Test cursor names and colors are correct



Deliverable:
✅ All users see each other's cursors with names in real-time. Smooth, low-latency updates.

PR #8: Presence Awareness System
Purpose: Show who's currently online and manage user presence
Tasks:

 Set up presence in Firestore

 Create collection: /presence/{canvasId}/{userId}
 Presence data: { userId, userName, cursorColor, online, lastSeen }


 Create presence composable

 Create src/composables/usePresence.js
 Implement setUserOnline(canvasId, userId, userName, cursorColor)
 Implement setUserOffline(canvasId, userId)
 Implement subscribeToPresence(canvasId, callback)
 Store active users in reactive array


 Update presence on connect/disconnect

 Set user online when canvas mounts
 Set user offline on:

 Browser close/tab close (beforeunload event)
 User logs out
 Component unmount


 Use Firebase onDisconnect() hook for cleanup


 Create presence UI component

 Create src/components/PresenceList.vue
 Display in TOP BAR as specified in PRD (not sidebar or corner)
 Display list of online users with names and colored dots (cursor colors)
 Show total count: "3 users online"
 Highlight current user in list
 Integrate with NavBar component


 Add presence to NavBar

 Show active user count in navigation
 Dropdown/popover to see full user list


 Handle presence edge cases

 User disconnects ungracefully (network loss) → marked offline after timeout
 User reconnects → marked online again



Tests:

 Unit test: Presence composable

 Test setUserOnline writes presence document
 Test setUserOffline updates document
 Test presence subscription receives updates


 Integration test: Presence updates

 Test user join updates presence list
 Test user leave removes from presence list
 Test presence persists across refresh


 E2E test: Multi-user presence

 Open two browsers, verify both appear in presence list
 Close one browser, verify it disappears from list



Deliverable:
✅ Users can see who else is online. Presence updates in real-time. Offline detection works.

PR #9: Performance Optimization & Testing
Purpose: Optimize performance and ensure sync quality
Tasks:

 Optimize rectangle rendering

 Use Konva's listening: false for non-interactive shapes
 Implement shape culling (don't render off-screen rectangles)
 Batch Konva updates with batchDraw()
 Use FastLayer if needed for cursor layer


 Optimize Firestore operations

 Ensure indexes are set up properly
 Use Firestore offline persistence
 Implement local cache for rectangles
 Debounce rapid rectangle moves (only send final position)


 Optimize cursor updates

 Throttle cursor position broadcasts to 50ms
 Use Realtime DB's disconnect cleanup
 Interpolate cursor movement for smoothness


 Add performance monitoring

 Log sync latency (create → appear time)
 Log cursor update frequency
 Console warnings if performance targets missed


 Stress testing

 Test with 100+ rectangles on canvas
 Test with 5+ concurrent users
 Test rapid rectangle creation (20-30 in 10 seconds)
 Test simultaneous dragging by multiple users


 Performance targets verification

 Measure rectangle sync latency (<100ms)
 Measure cursor sync latency (<50ms)
 Verify canvas stays responsive with 100+ rectangles
 Verify 5+ users don't degrade performance



Tests:

 Performance test: Rectangle sync latency

 Create rectangle, measure time until visible on other client
 Target: <100ms average


 Performance test: Cursor sync latency

 Move cursor, measure time until position updates on other client
 Target: <50ms average


 Load test: Many rectangles

 Create 100 rectangles, measure render performance
 Verify canvas remains responsive


 Load test: Many users

 Simulate 5+ users with automated script
 Verify sync stability and performance



Deliverable:
✅ Performance optimized. All latency targets met. Stress tests pass.

PR #10: Error Handling & Edge Cases
Purpose: Handle errors gracefully and cover edge cases
Tasks:

 Add error handling for Firebase operations

 Catch and display network errors
 Show simple "connection lost" message for Firebase connection failures
 No offline editing support in MVP (as specified in PRD)
 Retry failed writes (exponential backoff)
 Show user-friendly error messages
 Log errors to console for debugging


 Add error handling for authentication

 Handle invalid credentials for both email/password and Google sign-in
 Handle duplicate email on signup
 Handle network errors during auth
 Handle Google sign-in cancellation/errors
 Show specific error messages to user


 Handle offline/online transitions

 Detect when user goes offline (simple detection only for MVP)
 Show "connection lost" message (no complex offline queuing)
 Basic sync resume when back online
 Simple offline banner


 Handle disconnection scenarios

 User closes browser → clean up presence
 User loses network → mark offline after timeout
 User reconnects → resume sync seamlessly


 Add loading states

 Loading spinner during auth operations
 Loading spinner during initial canvas load
 Skeleton loaders for presence list


 Add empty states

 Empty canvas message: "Click to create a rectangle"
 No other users online: "You're the only one here"


 Add user feedback

 Toast notifications for key actions
 Success: "Rectangle created"
 Error: "Failed to sync. Retrying..."
 Info: "User joined"



Tests:

 Unit test: Error handlers

 Test retry logic on Firestore failures
 Test error message formatting


 Integration test: Offline handling

 Test operations queue when offline
 Test sync resumes when online


 E2E test: Network interruption

 Simulate network loss mid-operation
 Verify graceful degradation
 Verify recovery on reconnect



Deliverable:
✅ All error cases handled gracefully. User always knows what's happening. No crashes.

PR #11: Final MVP Testing & Bug Fixes
Purpose: Complete all 6 test scenarios from PRD and fix bugs
Tasks:

 Run Test Scenario 1: Two-User Simultaneous Editing

 Open two browsers, different users
 Both create and move rectangles rapidly
 Verify cursors visible with names/colors
 Verify all rectangles sync within 100ms
 Verify smooth, responsive interaction
 Document any issues


 Run Test Scenario 2: Mid-Edit Refresh

 User A creates 5-10 rectangles
 User B joins, creates 5 more
 User A refreshes while User B is dragging
 Verify all rectangles persist
 Verify no data loss
 Verify collaboration continues seamlessly


 Run Test Scenario 3: Rapid Rectangle Creation

 Two users create 20-30 rectangles rapidly
 Move multiple rectangles quickly
 Verify all sync correctly
 Verify no duplicates or race conditions
 Verify final count matches on both clients


 Run Test Scenario 4: Conflict Resolution

 Two users grab same rectangle simultaneously
 Both drag in different directions for 3-5 seconds
 Verify rectangle converges to single position
 Verify no errors in console
 Verify no jumping or flickering


 Run Test Scenario 5: Disconnect/Reconnect

 User A and B editing (5+ rectangles)
 User A disconnects (close browser)
 User B creates 3 new, moves 2 existing
 User A reconnects after 10-30 seconds
 Verify User A sees all User B's changes
 Verify full synchronization
 Verify presence updates correctly


 Run Test Scenario 6: Multi-User Scaling

 Open 3-5 browsers
 All create rectangles simultaneously
 All move existing rectangles
 Verify all cursors visible
 Verify all rectangles sync across all clients
 Verify presence list shows all users
 Verify system remains stable


 Fix all identified bugs

 Priority 1: Sync failures
 Priority 2: Performance issues
 Priority 3: UI/UX issues


 Polish UI/UX

 Ensure consistent styling
 Smooth animations
 Clear visual feedback
 Responsive layout



Tests:

 All 6 test scenarios pass completely
 No console errors during any test
 Performance targets met in all scenarios
 Stress test: 10+ rectangles created rapidly by 3 users

Deliverable:
✅ All 6 MVP test scenarios pass. All bugs fixed. MVP is feature-complete and stable.

PR #12: Deployment & Documentation
Purpose: Deploy to production and finalize documentation
Tasks:

 Prepare for deployment

 Update Firebase config for production
 Set up Firebase Hosting
 Configure build command in firebase.json
 Test production build locally


 Deploy to Firebase Hosting

 Run firebase deploy --only hosting
 Verify deployment successful
 Test deployed app with multiple users
 Verify all features work in production


 Update README.md

 Add project description
 Add live demo URL
 Add features list
 Add setup instructions:

 Clone repo
 Install dependencies
 Configure Firebase
 Run development server


 Add deployment instructions
 Add technology stack
 Add architecture overview
 Add testing instructions


 Create architecture documentation

 Document Firestore structure
 Document data flow
 Document conflict resolution strategy
 Document sync implementation
 Add architecture diagram


 Add code comments

 Comment complex functions
 Document composables
 Add JSDoc comments for key functions


 Final production testing

 Test on different browsers (Chrome, Firefox, Safari) - desktop only
 No mobile testing required (desktop web application only)
 Test with 5+ concurrent users on deployed app
 Verify all 6 test scenarios pass in production



Tests:

 Production smoke test: Basic functionality works
 Production load test: 5+ users editing simultaneously  
 Cross-browser test: Works on Chrome, Firefox, Safari (desktop only)
 Final verification: All MVP criteria met per PRD v1.1

Deliverable:
✅ App deployed publicly. README complete. All documentation finished. MVP COMPLETE.

MVP Completion Checklist
Core Features (Updated from PRD v1.1)

 ✅ Canvas with pan/zoom (independent per user, 100% zoom center start)
 ✅ Rectangle creation and movement (click-to-create, constrained within bounds)
 ✅ Real-time sync between 2+ users
 ✅ Multiplayer cursors with name labels (visible only when hovering canvas)
 ✅ Presence awareness (online users list in top bar)
 ✅ User authentication (both email/password and Google sign-in)
 ✅ State persistence
 ✅ Deployed and publicly accessible

Testing

 ✅ All 6 test scenarios pass
 ✅ Sync latency <100ms for rectangles
 ✅ Cursor latency <50ms (best effort)
 ✅ Conflict resolution working
 ✅ No critical bugs or sync errors

Performance

 ✅ Canvas responsive with 100+ rectangles
 ✅ 5+ concurrent users supported
 ✅ Architecture scales to 10+ users

Documentation

 ✅ README with setup instructions
 ✅ Architecture explanation
 ✅ Code is documented