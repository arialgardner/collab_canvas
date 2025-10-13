graph TD

%% App Overview
A[User] -->|Login: Email/Password OR Google| B[Firebase Auth]
B -->|Session No Auto-Logout| C[Canvas Workspace Default ID]

%% Canvas System - Desktop Only
C --> D[Vue 3 + Konva Frontend Desktop]
D --> E[Local State: Rectangles, Cursors, Presence]
D -->|100% Zoom Center Start| I[Independent Pan/Zoom Per User]

%% Sync Layer - Flexible Database Choice
E -->|Sync <100ms| F[Firestore: Rectangles Bounded 3000x3000]
E -->|Sync <50ms Hover Only| G[Firestore OR Realtime DB: Cursors]
E -->|Presence Updates| H[Firestore: Presence Top Bar]

%% Data Flow
D -->|Click-to-Create Rectangle Random Color| F
F -->|Broadcast via onSnapshot| D2[Other Clients]
G -->|Cursor Canvas Hover Only| D3[Other Clients]
H -->|Presence Online/Offline| D4[Top Bar Presence List]

%% Features Updated from PRD v1.1
subgraph Core_Features
Z1[Pan/Zoom Independent Per User]
Z2[Rectangle Click-Create Bounded Movement]
Z3[Real-Time Sync Last-Write-Wins]
Z4[Multiplayer Cursors Canvas Hover Only]
Z5[Presence Awareness Top Bar]
Z6[Auth Email/Password + Google]
Z7[Error Handling Connection Lost Only]
end

C --> Z1
C --> Z2
F --> Z3
G --> Z4
H --> Z5
B --> Z6
E --> Z7

%% Testing and Deployment Updated from PRD v1.1
subgraph Finalization
T1[Test Scenarios 1-6 Desktop Browsers Only]
T2[Performance Optimization 100+ Rectangles 5+ Users]
T3[Bug Fixes No Mobile Support]
T4[Firebase Hosting Deployment New Project]
end

Z7 --> T1
T1 --> T2
T2 --> T3
T3 --> T4
