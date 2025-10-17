# Firebase Realtime Database Schema

This document describes the schema and data structure for Firebase Realtime Database used in CollabCanvas v8.

## Architecture Overview

Firebase Realtime Database is used for **ultra-low-latency ephemeral data** (<50ms sync), while Firestore continues to handle **persistent data** (source of truth). This hybrid approach provides:

- **Cursor sync**: <50ms (vs. 100-300ms with Firestore)
- **Object sync**: <100ms (vs. 100-500ms with Firestore)
- **Presence updates**: Real-time with automatic disconnect detection
- **Operation log**: Foundation for Operational Transform (OT)

## Schema Structure

```
/canvases/{canvasId}/
├── cursors/
│   └── {userId}/
│       ├── x: number
│       ├── y: number
│       ├── userName: string
│       └── timestamp: number
│
├── presence/
│   └── {userId}/
│       ├── userId: string
│       ├── userName: string
│       ├── cursorColor: string
│       ├── online: boolean
│       ├── lastSeen: number (server timestamp)
│       └── joinedAt: number (server timestamp)
│
├── operationLog/
│   └── {clientSequence}/  (e.g., "user123_42")
│       ├── type: 'create' | 'update' | 'delete'
│       ├── shapeId: string
│       ├── userId: string
│       ├── sequenceNumber: number
│       ├── clientSequence: string
│       ├── timestamp: number (server timestamp)
│       ├── delta: object (only changed fields)
│       └── baseState: object (state before change, for rollback)
│
├── ephemeralShapes/
│   └── {shapeId}/
│       ├── [shape properties]
│       ├── lastModifiedBy: string (userId)
│       └── lastModified: number (server timestamp)
│
├── activeEdits/
│   └── {shapeId}/
│       ├── userId: string (who has the lock)
│       └── acquiredAt: number (server timestamp)
│
└── metadata/
    ├── createdAt: number
    ├── lastActivity: number
    └── activeUsers: number
```

## Data Structures

### Cursors

**Path**: `/canvases/{canvasId}/cursors/{userId}`

Real-time cursor positions for all users on a canvas.

```javascript
{
  x: 450,              // Cursor X position (rounded to integer)
  y: 320,              // Cursor Y position (rounded to integer)
  userName: "Alice",   // User's display name
  timestamp: 1697654321000  // Server timestamp
}
```

**Lifecycle**:
- Written on every cursor move (throttled to 16ms for 60 FPS)
- Auto-removed on disconnect via `.onDisconnect()`
- Backup cleanup: Cursors older than 30 seconds removed by client

**Optimization**:
- Coordinates rounded to integers (reduces payload size)
- Throttled updates (16ms active, 50ms idle)
- Suppressed for movements <5px

### Presence

**Path**: `/canvases/{canvasId}/presence/{userId}`

User online/offline status and metadata.

```javascript
{
  userId: "user123",
  userName: "Alice",
  cursorColor: "#ff5733",
  online: true,
  lastSeen: 1697654321000,  // Server timestamp
  joinedAt: 1697654300000   // Server timestamp
}
```

**Lifecycle**:
- Set to `online: true` when user joins canvas
- Heartbeat every 30 seconds updates `lastSeen`
- Auto-removed on disconnect via `.onDisconnect()`
- Stale entries (lastSeen > 60s) cleaned up by clients

**Use Cases**:
- Show active users in navbar
- Display user avatars
- Determine who's currently editing

### Operation Log

**Path**: `/canvases/{canvasId}/operationLog/{clientSequence}`

Sequence of all operations for Operational Transform.

```javascript
{
  type: "update",               // 'create', 'update', 'delete'
  shapeId: "rect_12345",
  userId: "user123",
  sequenceNumber: 42,
  clientSequence: "user123_42", // Unique key: {userId}_{seqNum}
  timestamp: 1697654321000,     // Server timestamp
  
  // Delta: Only changed fields (85% bandwidth reduction)
  delta: {
    x: 150,
    y: 200
  },
  
  // Base state: For rollback on conflict
  baseState: {
    x: 100,
    y: 200
  }
}
```

**Key**: `clientSequence` (format: `{userId}_{sequenceNumber}`)
- Ensures uniqueness across clients
- Enables deterministic ordering
- Prevents duplicate operations

**Lifecycle**:
- Append-only (operations never modified)
- Pruned after 1 hour or 1000 operations (rolling window)
- Cleanup runs every 5 minutes

**Purpose**:
- Foundation for Operational Transform
- Conflict detection and resolution
- Operation acknowledgment
- Debugging and audit trail

### Ephemeral Shapes

**Path**: `/canvases/{canvasId}/ephemeralShapes/{shapeId}`

Rapid shape updates during editing (drag, resize, rotate).

```javascript
{
  // Only changed properties (delta sync)
  x: 150,
  y: 200,
  
  // Metadata
  lastModifiedBy: "user123",
  lastModified: 1697654321000  // Server timestamp
}
```

**Lifecycle**:
- Written during active editing (drag, resize, rotate)
- Updated with delta (only changed fields)
- Removed when edit completes (dragend, transformend)
- Full shape persisted to Firestore on edit completion

**Purpose**:
- Ultra-low-latency updates during editing
- Reduces Firestore writes (only persist final state)
- Enables smooth real-time collaboration

**Sync Flow**:
1. User starts dragging → Create ephemeral shape with delta
2. During drag → Update ephemeral shape with new delta
3. Drag ends → Persist full shape to Firestore, remove ephemeral

### Active Edits

**Path**: `/canvases/{canvasId}/activeEdits/{shapeId}`

Edit locks to prevent concurrent modifications.

```javascript
{
  userId: "user123",
  acquiredAt: 1697654321000  // Server timestamp
}
```

**Lifecycle**:
- Created when user starts editing shape
- Auto-removed on disconnect via `.onDisconnect()`
- Removed when edit completes
- Timeout after 30 seconds (stale lock cleanup)

**Purpose**:
- Prevent simultaneous edits (before OT is fully implemented)
- Visual feedback (show who's editing)
- Graceful handling of abandoned edits

### Metadata

**Path**: `/canvases/{canvasId}/metadata`

Canvas-level metadata for analytics and monitoring.

```javascript
{
  createdAt: 1697654300000,
  lastActivity: 1697654321000,
  activeUsers: 3
}
```

## Design Decisions

### Why Hybrid Architecture?

**Realtime DB for Ephemeral Data**:
- WebSocket-based (persistent connection)
- <50ms latency for small updates
- Automatic conflict resolution
- Built-in presence and disconnect detection

**Firestore for Persistent Data**:
- Better querying capabilities
- Document model (easier to work with)
- Reliable persistence
- Existing architecture (gradual migration)

### Why Not Firestore Only?

Firestore limitations:
- 100-500ms latency for updates (too slow for cursors)
- No built-in presence/disconnect handling
- More expensive for high-frequency updates
- Request/response model (vs. WebSocket streaming)

### Why Not Realtime DB Only?

Realtime DB limitations:
- No complex queries (Firestore has better query support)
- JSON tree structure (less flexible than documents)
- Migration complexity (existing app uses Firestore)

## Security Rules

**Current (PR #1 - Test Mode)**:
```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
```

**Future (PR #9 - Production)**:
- Granular rules per path
- Canvas access control
- Rate limiting (100 cursor updates/sec, 50 operations/sec)
- Data validation (coordinates, types, required fields)
- Edit lock enforcement

## Performance Targets

| Metric | Target | Current (Firestore) |
|--------|--------|---------------------|
| Cursor sync (p95) | <50ms | 100-300ms |
| Object sync (p95) | <100ms | 100-500ms |
| Presence updates | <50ms | 200-500ms |
| Operation log | <100ms | N/A |

## Migration Strategy

**Phase 1** (PR #2-3): Cursors and Presence
- Dual-write to both Firestore and Realtime DB
- Feature flag controls which is read
- Gradual rollout (10% → 50% → 100%)

**Phase 2** (PR #4-5): Operation Log and Differential Sync
- Add operation log for OT foundation
- Implement delta encoding

**Phase 3** (PR #6-8): Operational Transform
- Implement OT for conflict resolution
- Client-side prediction

**Phase 4** (PR #11): Full Migration
- Remove Firestore cursor/presence collections
- Remove dual-write code
- Realtime DB becomes primary for ephemeral data

## Monitoring

Track these metrics (see `useRealtimeDBMonitoring.js`):

- **Connection state**: connected/disconnected
- **Operation count**: Total operations processed
- **Bandwidth**: Bytes sent/received
- **Latency**: p50, p95, p99 for cursors, objects, operations
- **Error rate**: Failed operations / total operations

## References

- [Firebase Realtime Database Docs](https://firebase.google.com/docs/database)
- [Realtime DB Structure Best Practices](https://firebase.google.com/docs/database/web/structure-data)
- [Operational Transform](https://en.wikipedia.org/wiki/Operational_transformation)

---

**Document Version**: 1.0  
**Last Updated**: 2025-10-17  
**Status**: PR #1 Complete

