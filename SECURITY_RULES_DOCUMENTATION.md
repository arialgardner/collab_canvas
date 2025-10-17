# Firebase Realtime Database Security Rules Documentation

**Version**: 1.0 (Production)  
**Last Updated**: 2025-10-17  
**Status**: PR #9 Complete

## Overview

This document explains the security rules for Firebase Realtime Database used in CollabCanvas v8.

## Security Principles

1. **Authentication Required**: All reads and writes require authentication
2. **User Ownership**: Users can only modify their own data (cursors, presence)
3. **Append-Only Logs**: Operation log is append-only (no modifications/deletions)
4. **Canvas Access Control**: Users must have access to canvas to read/write
5. **Data Validation**: All writes validated for type, size, and content
6. **Timestamp Validation**: Prevent future timestamps (±1 minute tolerance)

## Rules by Path

### `/canvases/{canvasId}`

**Read Access**:
- User must be authenticated
- User must have access to canvas (in users list) OR canvas is public

```javascript
".read": "auth != null && (
  root.child('canvases').child($canvasId).child('users').child(auth.uid).exists() ||
  root.child('canvases').child($canvasId).child('isPublic').val() === true
)"
```

### `/canvases/{canvasId}/cursors/{userId}`

**Purpose**: Real-time cursor positions

**Read**: Any authenticated user with canvas access
**Write**: Only the user can write their own cursor

**Validation**:
- Required fields: `x`, `y`, `userName`, `timestamp`
- `x` and `y` must be numbers
- Coordinate bounds: -10000 to 20000 (allows off-canvas movement)
- `userName` max length: 100 characters
- `timestamp` cannot be more than 1 minute in future

**Rate Limiting**: Client-side throttle (16-50ms)

### `/canvases/{canvasId}/presence/{userId}`

**Purpose**: User online/offline status

**Read**: Any authenticated user with canvas access
**Write**: Only the user can write their own presence

**Validation**:
- Required fields: `userId`, `userName`, `online`, `lastSeen`
- `userId` must match path parameter
- `userName` max length: 100 characters
- `online` must be boolean
- `lastSeen` must be number (timestamp)

**Cleanup**: Automatic removal via `onDisconnect()`

### `/canvases/{canvasId}/operationLog/{operationId}`

**Purpose**: Append-only operation log for OT

**Read**: Any authenticated user with canvas access
**Write**: Authenticated users, only for new operations

**Restrictions**:
- **Append-only**: `!data.exists()` (no modifications to existing operations)
- User can only create operations with their own `userId`
- `operationId` in data must match path parameter

**Validation**:
- Required fields: `operationId`, `type`, `shapeId`, `userId`, `sequenceNumber`, `timestamp`
- `type` must be: 'create', 'update', or 'delete'
- `shapeId` max length: 100 characters
- `userId` must match authenticated user
- `sequenceNumber` must be number
- `timestamp` cannot be more than 1 minute in future
- `delta` (if exists) must be string (JSON)

**Size Limit**: 1KB per operation (enforced client-side)

### `/canvases/{canvasId}/ephemeralShapes/{shapeId}`

**Purpose**: Rapid shape updates during editing

**Read**: Any authenticated user with canvas access
**Write**: Authenticated users, only for new shapes or shapes they last modified

**Restrictions**:
- Can create new shape
- Can only update if you were last modifier

**Validation**:
- `lastModified` cannot be more than 1 minute in future
- `lastModifiedBy` (if exists) must match authenticated user

### `/canvases/{canvasId}/activeEdits/{shapeId}`

**Purpose**: Edit locks to prevent concurrent modifications

**Read**: Any authenticated user with canvas access
**Write**: Authenticated users, with conditions

**Restrictions**:
- Can acquire lock if no lock exists
- Can release own lock
- Can override stale locks (>30 seconds old)

**Validation**:
- Required fields: `userId`, `acquiredAt`
- `userId` must match authenticated user
- `acquiredAt` cannot be more than 1 minute in future

### `/canvases/{canvasId}/acks/{operationId}`

**Purpose**: Operation acknowledgments

**Read**: Any authenticated user with canvas access
**Write**: Any authenticated user (server writes acknowledgments)

**Validation**:
- Required fields: `operationId`, `acknowledgedAt`
- `acknowledgedAt` cannot be more than 1 minute in future

### `/canvases/{canvasId}/metadata`

**Purpose**: Canvas-level metadata (analytics)

**Read**: Any authenticated user with canvas access
**Write**: Any authenticated user with canvas access

**Validation**:
- `createdAt` (if exists) must be number
- `lastActivity` (if exists) must be number
- `activeUsers` (if exists) must be number

## Data Validation

### Coordinate Bounds

```
x: -10,000 to 20,000
y: -10,000 to 20,000
```

Allows shapes to move off-canvas for better UX.

### String Length Limits

```
userName: 100 characters
shapeId: 100 characters
```

### Timestamp Tolerance

```
timestamp: now ± 60 seconds
```

Allows for clock skew between client and server.

### Boolean Validation

```javascript
newData.child('online').isBoolean()
```

Ensures type safety.

## Rate Limiting

**Client-Side** (enforced in code):
- Cursor updates: Max 60/second (16ms throttle)
- Operation log: Max 50/second
- Presence updates: Max 2/minute (30s heartbeat)

**Server-Side** (future enhancement):
- Firebase automatically throttles excessive writes
- Consider Cloud Functions for additional rate limiting if needed

## Size Limits

**Client-Side** (enforced in code):
- Operation delta: 1KB max
- Batch operations: 500 shapes max
- Cursor data: ~100 bytes
- Presence data: ~200 bytes

## Access Control Integration

**Canvas Permissions** (stored in Firestore):
```
/canvases/{canvasId}/users/{userId}
{
  role: 'owner' | 'editor' | 'viewer',
  addedAt: timestamp
}
```

**Role Capabilities**:
- **Owner**: Full access (managed in Firestore)
- **Editor**: Can create/update/delete shapes
- **Viewer**: Can only read (no writes to operation log)

**Note**: Realtime DB rules check if user exists in canvas, but detailed role checking happens in Firestore.

## Security Best Practices

1. **Never trust client data**: All writes validated server-side
2. **Principle of least privilege**: Users can only modify their own data
3. **Append-only logs**: Prevents tampering with operation history
4. **Auto-cleanup on disconnect**: Prevents stale data accumulation
5. **Timestamp validation**: Prevents replay attacks
6. **Size limits**: Prevents abuse and excessive bandwidth

## Testing Security Rules

Use Firebase Emulator to test rules:

```bash
firebase emulators:start --only database
```

Test cases should cover:
- ✅ Authenticated users can read/write own data
- ✅ Users cannot modify other users' data
- ❌ Unauthenticated users are rejected
- ❌ Invalid data types are rejected
- ❌ Oversized data is rejected
- ❌ Modifications to operation log are rejected

## Migration from Test Mode

**Test Mode** (PR #1):
```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
```

**Production Mode** (PR #9):
```json
{
  "rules": {
    "canvases": {
      "$canvasId": {
        // Granular rules per path...
      }
    }
  }
}
```

## Monitoring

Monitor security rule denials in Firebase Console:
- Go to Realtime Database → Usage
- Check "Security Rules Denied" metric
- Investigate spikes (may indicate attack or bug)

## Future Enhancements

1. **Rate limiting via Cloud Functions**
2. **IP-based rate limiting**
3. **Abuse detection (repeated rule violations)**
4. **Canvas-level quotas (max operations/hour)**
5. **Role-based operation restrictions**

---

**Document Version**: 1.0  
**Production Ready**: Yes  
**Status**: Complete

