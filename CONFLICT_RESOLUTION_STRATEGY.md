# Conflict Resolution Strategy

Comprehensive guide to how CollabCanvas v8 resolves conflicts during real-time collaboration.

## Table of Contents

1. [Overview](#overview)
2. [Conflict Types](#conflict-types)
3. [Resolution Decision Tree](#resolution-decision-tree)
4. [Strategy Details](#strategy-details)
5. [Priority System](#priority-system)
6. [Examples](#examples)
7. [Trade-offs](#trade-offs)

---

## Overview

When multiple users edit the same shape simultaneously, **conflicts** occur. CollabCanvas v8 uses a hybrid approach combining **Operational Transform (OT)** and **Last-Write-Wins (LWW)** to resolve conflicts intelligently.

**Goal**: Preserve as many user intentions as possible while maintaining consistency.

**Approach**:
- **OT** for geometric properties (position, size, rotation) - merge both changes
- **LWW** for non-mergeable properties (colors, text) - use timestamp
- **Priority** for operation types (delete > update > create)

---

## Conflict Types

### 1. Position Conflict

**Scenario**: Two users drag the same shape in different directions

**Resolution**: **Additive (OT)**

**Strategy**: Apply both movements

```
User A: Move right 50px
User B: Move down 50px

Result: Move right 50px AND down 50px
Both movements preserved ✅
```

**Why**: Position changes are independent and composable.

---

### 2. Size Conflict

**Scenario**: Two users resize the same shape simultaneously

**Resolution**: **Multiplicative (OT)**

**Strategy**: Multiply scale factors

```
User A: Scale width 1.5x (100px → 150px)
User B: Scale width 1.2x (100px → 120px)

Result: 100px * 1.5 * 1.2 = 180px
Both resizes applied ✅
```

**Why**: Size changes are relative (scale factors) and composable.

---

### 3. Rotation Conflict

**Scenario**: Two users rotate the same shape simultaneously

**Resolution**: **Additive (OT)**

**Strategy**: Add rotation deltas, wrap to 0-360°

```
User A: Rotate 45°
User B: Rotate 30°

Result: 45° + 30° = 75°
Both rotations applied ✅
```

**Why**: Rotations are additive and composable.

---

### 4. Style Conflict

**Scenario**: Two users change color/stroke of same shape simultaneously

**Resolution**: **Last-Write-Wins (LWW)**

**Strategy**: Use server timestamp to determine winner

```
User A: Change fill to red (timestamp: 1000)
User B: Change fill to blue (timestamp: 1001)

Result: Blue (B's timestamp is later)
Only later change preserved ⚠️
```

**Why**: Colors cannot be meaningfully merged.

---

### 5. Mixed Property Conflict

**Scenario**: Two users change different properties of same shape

**Resolution**: **Merge (No Conflict)**

**Strategy**: Apply both changes (no overlap)

```
User A: Move shape to (200, 100)
User B: Change fill to blue

Result: Shape at (200, 100) with blue fill
Both changes applied ✅
```

**Why**: Different properties don't conflict.

---

### 6. Delete Conflict

**Scenario**: One user deletes while another edits

**Resolution**: **Delete Priority**

**Strategy**: Delete always wins

```
User A: Change fill to red
User B: Delete shape

Result: Shape deleted
Update discarded ❌
```

**Why**: Can't update a deleted shape.

---

### 7. Composite Conflict

**Scenario**: Users change multiple overlapping properties

**Resolution**: **Hybrid (OT + LWW)**

**Strategy**: Apply appropriate resolution per property type

```
User A: Move to (200, 100), resize to 150px, fill red
User B: Move to (100, 200), resize to 120px, fill blue

Result:
- Position: (200, 200) - Both movements applied (OT)
- Size: 180px - Both resizes applied (OT)
- Fill: blue - Later timestamp wins (LWW)

Partially merged ⚠️
```

**Why**: Different property types require different strategies.

---

## Resolution Decision Tree

```
┌─────────────────────────────────┐
│  Two operations target shape    │
└───────────┬─────────────────────┘
            │
            ▼
┌─────────────────────────────────┐
│  Are they concurrent?           │
│  (timestamps within 1 second)   │
└───────────┬─────────────────────┘
            │
    ┌───────┴───────┐
    │               │
    NO              YES
    │               │
    ▼               ▼
┌────────┐    ┌─────────────────┐
│ Apply  │    │ Check operation │
│ second │    │ type priority   │
│ op     │    └────────┬────────┘
└────────┘             │
                       ▼
            ┌──────────────────────┐
            │ Delete > Update >     │
            │ Create                │
            └──────────┬────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
   ┌────────┐    ┌─────────┐   ┌──────────┐
   │ DELETE │    │ UPDATE  │   │ CREATE   │
   │ WINS   │    │ vs      │   │ vs       │
   └────────┘    │ UPDATE  │   │ CREATE   │
                 └────┬────┘   └────┬─────┘
                      │             │
                      ▼             ▼
            ┌──────────────┐  ┌──────────┐
            │ Check which  │  │ Use      │
            │ properties   │  │ timestamp│
            │ changed      │  │ to pick  │
            └──────┬───────┘  └──────────┘
                   │
        ┌──────────┼──────────┐
        │          │          │
        ▼          ▼          ▼
   ┌────────┐ ┌──────┐  ┌────────┐
   │Position│ │ Size │  │ Style  │
   │  (OT)  │ │ (OT) │  │ (LWW)  │
   └────────┘ └──────┘  └────────┘
```

---

## Strategy Details

### Strategy 1: Operational Transform (OT)

**Used For**:
- Position (x, y)
- Size (width, height, radius)
- Rotation (rotation)

**How It Works**:
1. Detect concurrent operations on same shape
2. Calculate deltas for each operation
3. Transform deltas based on property type:
   - **Position/Rotation**: Additive (sum deltas)
   - **Size**: Multiplicative (multiply scale factors)
4. Apply transformed operation
5. Both changes preserved

**Advantages**:
- ✅ Preserves both users' intentions
- ✅ No data loss from overwriting
- ✅ Consistent convergence across clients

**Disadvantages**:
- ⚠️ May produce unexpected results if users have opposing intents
- ⚠️ Complexity in implementation

**Code**: `ui/src/utils/operationalTransform.js`

---

### Strategy 2: Last-Write-Wins (LWW)

**Used For**:
- Fill color
- Stroke color
- Stroke width
- Opacity
- Text content (until text OT implemented)

**How It Works**:
1. Compare server timestamps of both operations
2. Operation with later timestamp wins
3. Earlier operation discarded

**Advantages**:
- ✅ Simple and predictable
- ✅ No complex merge logic needed
- ✅ Fast resolution

**Disadvantages**:
- ❌ One user's change is lost
- ❌ Overwrite problem (what v8 aims to reduce)

**Code**: `ui/src/utils/operationalTransform.js` (`transformStyle()`)

---

### Strategy 3: Priority-Based

**Used For**:
- Delete vs. Update
- Delete vs. Create
- Create vs. Create (same ID)

**Priority Order**:
```
Delete (highest priority)
  ▲
  │
Update
  ▲
  │
Create (lowest priority)
```

**How It Works**:
1. Compare operation types
2. Higher priority operation wins
3. Lower priority operation discarded or modified

**Examples**:

**Delete vs. Update**:
```javascript
// Delete wins
if (opA.type === 'delete' && opB.type === 'update') {
  return opA  // Discard update
}
```

**Delete vs. Create** (race condition):
```javascript
// Create wins (user is creating new shape)
if (opA.type === 'delete' && opB.type === 'create') {
  return opB  // Keep creation
}
```

**Create vs. Create** (duplicate ID):
```javascript
// Use timestamp
if (opA.type === 'create' && opB.type === 'create') {
  return opA.timestamp > opB.timestamp ? opA : opB
}
```

**Code**: `ui/src/utils/operationalTransform.js` (`getOperationPriority()`)

---

## Priority System

### Operation Type Priority

| Operation | Priority | Description |
|-----------|----------|-------------|
| **Delete** | 3 (Highest) | Always wins - can't operate on deleted shape |
| **Update** | 2 | Modifies existing shape |
| **Create** | 1 (Lowest) | Creates new shape |

### Property Type Priority

When resolving update conflicts:

| Property Type | Resolution | Priority |
|--------------|------------|----------|
| **Position** | OT (Additive) | Merged |
| **Size** | OT (Multiplicative) | Merged |
| **Rotation** | OT (Additive) | Merged |
| **Style** | LWW (Timestamp) | Later wins |
| **Text** | LWW (Timestamp) | Later wins |
| **Metadata** | LWW (Timestamp) | Later wins |

### Conflict Resolution Matrix

|         | Create | Update (Position) | Update (Style) | Delete |
|---------|--------|-------------------|----------------|--------|
| **Create** | Timestamp | N/A | N/A | Create wins |
| **Update (Position)** | N/A | OT (Merge) | Merge both | Delete wins |
| **Update (Style)** | N/A | Merge both | LWW | Delete wins |
| **Delete** | Create wins | Delete wins | Delete wins | First delete wins |

---

## Examples

### Example 1: Position Conflict (OT Merge)

```javascript
// Initial state
rect = { id: 'rect1', x: 100, y: 100 }

// Timeline
Time 0: Rectangle at (100, 100)
Time 1: User A drags right → (200, 100)
Time 1: User B drags down → (100, 200)  [concurrent]
Time 2: Server receives A's op
Time 3: Server receives B's op

// Resolution
Detect: Concurrent updates on same shape
Strategy: OT (Position is additive)

Delta A: x: +100, y: 0
Delta B: x: 0, y: +100

Merged result: x: +100, y: +100
Final state: (200, 200)

Outcome: Both movements preserved ✅
```

---

### Example 2: Style Conflict (LWW)

```javascript
// Initial state
rect = { id: 'rect1', fill: 'white' }

// Timeline
Time 0: Rectangle with white fill
Time 1000: User A changes to red
Time 1001: User B changes to blue  [concurrent, 1ms later]
Time 2: Server receives A's op (timestamp: 1000)
Time 3: Server receives B's op (timestamp: 1001)

// Resolution
Detect: Concurrent style updates
Strategy: LWW (Colors can't merge)

Compare timestamps:
- Op A: 1000
- Op B: 1001 (later)

Result: Op B wins
Final state: fill = 'blue'

Outcome: A's change lost ❌
```

---

### Example 3: Delete Priority

```javascript
// Initial state
rect = { id: 'rect1', x: 100, y: 100, fill: 'white' }

// Timeline
Time 0: Rectangle exists
Time 1: User A changes fill to red
Time 1: User B deletes rectangle  [concurrent]
Time 2: Server receives A's update
Time 3: Server receives B's delete

// Resolution
Detect: Update vs. Delete conflict
Strategy: Priority (Delete > Update)

Op A: update (priority 2)
Op B: delete (priority 3)

Result: Delete wins
Final state: Rectangle deleted

Outcome: Update discarded ❌
```

---

### Example 4: Mixed Properties (Partial Merge)

```javascript
// Initial state
rect = { id: 'rect1', x: 100, y: 100, width: 100, fill: 'white' }

// Timeline
Time 0: Rectangle at (100, 100), size 100x100, white fill
Time 1000: User A → move to (200, 100), resize to 150x100, fill red
Time 1001: User B → move to (100, 200), resize to 120x100, fill blue

// Resolution
Detect: Composite conflict (position + size + style)

Position:
- Delta A: x: +100, y: 0
- Delta B: x: 0, y: +100
- Strategy: OT (Additive)
- Result: x: 200, y: 200 ✅

Size:
- Scale A: 1.5x (100 → 150)
- Scale B: 1.2x (100 → 120)
- Strategy: OT (Multiplicative)
- Result: 100 * 1.5 * 1.2 = 180 ✅

Fill:
- Op A: red (timestamp 1000)
- Op B: blue (timestamp 1001)
- Strategy: LWW
- Result: blue (B wins) ❌

Final state:
- Position: (200, 200) - Both merged
- Size: 180x100 - Both merged
- Fill: blue - B wins

Outcome: Geometric properties merged, style uses LWW ⚠️
```

---

### Example 5: Three-Way Conflict

```javascript
// Initial state
rect = { id: 'rect1', x: 100, y: 100 }

// Timeline
Time 0: Rectangle at (100, 100)
Time 1: User A → (150, 100)  [+50 x]
Time 1: User B → (100, 150)  [+50 y]
Time 1: User C → (120, 120)  [+20 x, +20 y]

// Resolution (sequential transformation)
Step 1: Transform A vs B
- Delta A: x: +50
- Delta B: y: +50
- Result: (150, 150)

Step 2: Transform (A+B) vs C
- Current delta: x: +50, y: +50
- Delta C: x: +20, y: +20
- Result: (170, 170)

Final state: (170, 170)

Outcome: All movements applied (sum of all deltas) ✅
```

---

## Trade-offs

### OT Advantages

✅ **Preserves User Intent**: Both users see their changes applied  
✅ **No Overwrites**: Reduces data loss from concurrent edits  
✅ **Better UX**: Users don't see their changes "disappear"  
✅ **Consistent State**: All clients converge to same state  

### OT Disadvantages

❌ **Unexpected Results**: Combining two changes may not match either user's original intent  
❌ **Complex Implementation**: Requires transform functions for each property type  
❌ **Limited Applicability**: Can't merge semantic changes (colors, text)  
❌ **Three-Way Conflicts**: Order matters, not always commutative  

### LWW Advantages

✅ **Simple**: Easy to implement and understand  
✅ **Fast**: No complex merge logic  
✅ **Predictable**: Latest timestamp always wins  
✅ **No Unexpected Results**: Result matches one user's intent exactly  

### LWW Disadvantages

❌ **Data Loss**: Earlier change is completely overwritten  
❌ **Poor UX**: Users see their changes "disappear"  
❌ **Not Fair**: Network latency affects who wins  

### When to Use Each

| Scenario | Strategy | Reason |
|----------|----------|--------|
| Position changes | OT (Additive) | Composable, preserves both intentions |
| Size changes | OT (Multiplicative) | Relative scaling is composable |
| Rotation changes | OT (Additive) | Rotations are composable |
| Color changes | LWW | Colors can't be meaningfully merged |
| Text content | LWW | Full text OT is complex (planned v9+) |
| Metadata | LWW | Not critical, simpler is better |
| Delete operations | Priority | Can't operate on deleted shape |

---

## Best Practices

### 1. Provide Immediate Feedback

```javascript
// ✅ Good: Show prediction immediately
applyLocalUpdate(shapeId, delta)
predict(shapeId, delta, baseState)
sendToServer(operation)

// ❌ Bad: Wait for server
sendToServer(operation)
// User sees no feedback until server responds
```

### 2. Visual Indicators

```javascript
// Show which user last modified
if (shape.lastModifiedBy !== currentUserId) {
  // Show indicator: "Modified by Alice"
}
```

### 3. Log Conflicts

```javascript
if (hasConflict(opA, opB)) {
  // console.log(`[Conflict] ${getConflictType(opA, opB)} on shape ${opA.shapeId}`)
  // console.log(`- User A: ${opA.userId}`)
  // console.log(`- User B: ${opB.userId}`)
  // console.log(`- Resolution: ${getResolutionStrategy(opA, opB)}`)
}
```

### 4. Notify Users

```javascript
// Optional: Notify when change is overwritten
if (wasOverwritten(operation)) {
  showNotification({
    type: 'info',
    message: 'Your color change was overwritten by another user',
    duration: 3000
  })
}
```

---

## Future Improvements

### Planned for v9+

1. **Text OT**: Implement full operational transform for text editing
   - Character-level OT
   - Handles insertions, deletions, formatting
   - Preserves both users' text changes

2. **Semantic Conflict Resolution**: Detect when combined result doesn't match any user's intent
   - Prompt user to choose
   - Show "conflict resolution" UI

3. **Undo/Redo with OT**: Allow users to undo their changes even after merge
   - Track operation history per user
   - Revert user's operations without affecting others

4. **Better Three-Way Merge**: Improve order-independence for multi-user conflicts
   - Use vector clocks instead of timestamps
   - Deterministic merge regardless of receive order

---

## References

- [Operational Transform Documentation](./OPERATIONAL_TRANSFORM.md)
- [Realtime DB Schema](./REALTIME_DB_SCHEMA.md)
- Implementation: `ui/src/utils/operationalTransform.js`
- Conflict Detection: `ui/src/composables/useConflictDetection.js`
- Prediction System: `ui/src/composables/usePrediction.js`

---

**Document Version**: 1.0  
**Last Updated**: 2025-10-17  
**Status**: PR #12 Complete

