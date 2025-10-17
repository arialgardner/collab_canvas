/**
 * Operational Transform (OT) Utility
 * 
 * Implements basic OT for merging concurrent shape operations.
 * 
 * OT Rules:
 * - Position changes: Additive (both movements applied)
 * - Delete > Update > Create (operation priority)
 * - Same-type conflicts use last-write-wins
 * 
 * Example:
 * User A moves shape right 100px
 * User B moves shape down 100px (concurrent)
 * Result: Shape moved right 100px AND down 100px (both applied)
 */

/**
 * Transform position operation against another position operation
 * Both movements are applied (additive)
 * @param {Object} opA - First operation
 * @param {Object} opB - Second operation
 * @returns {Object} Transformed operation
 */
export function transformPosition(opA, opB) {
  if (!opA || !opB) return opA
  
  // If both operations change position, apply both deltas (additive)
  const transformedDelta = { ...opA.delta }
  
  // Add B's position changes to A's
  if ('x' in opB.delta && 'x' in opA.delta) {
    const deltaAx = opA.delta.x - (opA.baseState?.x || 0)
    const deltaBx = opB.delta.x - (opB.baseState?.x || 0)
    transformedDelta.x = (opA.baseState?.x || 0) + deltaAx + deltaBx
  } else if ('x' in opB.delta) {
    transformedDelta.x = opB.delta.x
  }
  
  if ('y' in opB.delta && 'y' in opA.delta) {
    const deltaAy = opA.delta.y - (opA.baseState?.y || 0)
    const deltaBy = opB.delta.y - (opB.baseState?.y || 0)
    transformedDelta.y = (opA.baseState?.y || 0) + deltaAy + deltaBy
  } else if ('y' in opB.delta) {
    transformedDelta.y = opB.delta.y
  }
  
  return {
    ...opA,
    delta: transformedDelta
  }
}

/**
 * Transform size operation against another size operation
 * Size changes are multiplicative (combine scale factors)
 * @param {Object} opA - First operation
 * @param {Object} opB - Second operation
 * @returns {Object} Transformed operation
 */
export function transformSize(opA, opB) {
  if (!opA || !opB) return opA
  
  const transformedDelta = { ...opA.delta }
  
  // Width transformation (multiplicative)
  if ('width' in opA.delta && 'width' in opB.delta && opA.baseState?.width) {
    const scaleA = opA.delta.width / opA.baseState.width
    const scaleB = opB.delta.width / opB.baseState.width
    transformedDelta.width = opA.baseState.width * scaleA * scaleB
  }
  
  // Height transformation (multiplicative)
  if ('height' in opA.delta && 'height' in opB.delta && opA.baseState?.height) {
    const scaleA = opA.delta.height / opA.baseState.height
    const scaleB = opB.delta.height / opB.baseState.height
    transformedDelta.height = opA.baseState.height * scaleA * scaleB
  }
  
  // Radius transformation (multiplicative)
  if ('radius' in opA.delta && 'radius' in opB.delta && opA.baseState?.radius) {
    const scaleA = opA.delta.radius / opA.baseState.radius
    const scaleB = opB.delta.radius / opB.baseState.radius
    transformedDelta.radius = opA.baseState.radius * scaleA * scaleB
  }
  
  return {
    ...opA,
    delta: transformedDelta
  }
}

/**
 * Transform rotation operation against another rotation operation
 * Rotations are additive (degrees)
 * @param {Object} opA - First operation
 * @param {Object} opB - Second operation
 * @returns {Object} Transformed operation
 */
export function transformRotation(opA, opB) {
  if (!opA || !opB) return opA
  
  const transformedDelta = { ...opA.delta }
  
  // Rotation transformation (additive, wrapped to 0-360)
  if ('rotation' in opA.delta && 'rotation' in opB.delta) {
    const deltaA = opA.delta.rotation - (opA.baseState?.rotation || 0)
    const deltaB = opB.delta.rotation - (opB.baseState?.rotation || 0)
    const combined = (opA.baseState?.rotation || 0) + deltaA + deltaB
    
    // Wrap to 0-360 degrees
    transformedDelta.rotation = ((combined % 360) + 360) % 360
  }
  
  return {
    ...opA,
    delta: transformedDelta
  }
}

/**
 * Transform style operation using last-write-wins
 * Styles cannot be meaningfully merged (colors, etc.)
 * @param {Object} opA - First operation
 * @param {Object} opB - Second operation
 * @returns {Object} Operation with later timestamp
 */
export function transformStyle(opA, opB) {
  // Last-write-wins for styles (can't merge colors meaningfully)
  return lastWriteWins(opA, opB)
}

/**
 * Determine operation priority
 * Delete > Update > Create
 * @param {Object} opA - First operation
 * @param {Object} opB - Second operation
 * @returns {number} -1 if A has priority, 1 if B has priority, 0 if equal
 */
export function getOperationPriority(opA, opB) {
  const priorities = { delete: 3, update: 2, create: 1 }
  
  const priorityA = priorities[opA.type] || 0
  const priorityB = priorities[opB.type] || 0
  
  if (priorityA > priorityB) return -1
  if (priorityA < priorityB) return 1
  
  // Same type - use timestamp
  if (opA.timestamp < opB.timestamp) return -1
  if (opA.timestamp > opB.timestamp) return 1
  
  return 0
}

/**
 * Check if two operations are concurrent (overlapping)
 * @param {Object} opA - First operation
 * @param {Object} opB - Second operation
 * @returns {boolean} True if concurrent
 */
export function areConcurrent(opA, opB) {
  if (!opA || !opB) return false
  
  // Operations on different shapes are not concurrent
  if (opA.shapeId !== opB.shapeId) return false
  
  // Check timestamp overlap (within 1 second = likely concurrent)
  const timeDiff = Math.abs(opA.timestamp - opB.timestamp)
  return timeDiff < 1000 // 1 second threshold
}

/**
 * Transform operation A against operation B
 * Main OT function
 * @param {Object} opA - Operation to transform
 * @param {Object} opB - Operation to transform against
 * @returns {Object} Transformed operation or null if should be discarded
 */
export function transform(opA, opB) {
  if (!opA || !opB) return opA
  
  // Not concurrent - no transformation needed
  if (!areConcurrent(opA, opB)) {
    return opA
  }
  
  // Check priority (Delete > Update > Create)
  const priority = getOperationPriority(opA, opB)
  
  // If B has higher priority, A may need to be discarded or modified
  if (priority > 0) {
    // B has priority
    
    // If B is delete and A is update, discard A
    if (opB.type === 'delete' && opA.type === 'update') {
      // console.log('[OT] Discarding update - shape deleted')
      return null
    }
    
    // If B is delete and A is create, keep A (race condition - A wins)
    if (opB.type === 'delete' && opA.type === 'create') {
      // console.log('[OT] Create wins over delete (race condition)')
      return opA
    }
  }
  
  // If A is delete, it always wins (highest priority)
  if (opA.type === 'delete') {
    return opA
  }
  
  // If both are updates, transform based on what changed
  if (opA.type === 'update' && opB.type === 'update') {
    return transformUpdate(opA, opB)
  }
  
  // Default: return opA unchanged
  return opA
}

/**
 * Transform update operation against another update
 * Uses appropriate transform based on property types
 * @param {Object} opA - First update operation
 * @param {Object} opB - Second update operation
 * @returns {Object} Transformed operation
 */
function transformUpdate(opA, opB) {
  const deltaA = opA.delta || {}
  const deltaB = opB.delta || {}
  
  // Get property categories
  const positionProps = ['x', 'y']
  const sizeProps = ['width', 'height', 'radius']
  const rotationProps = ['rotation']
  const styleProps = ['fill', 'stroke', 'strokeWidth', 'opacity']
  
  // Check what changed
  const aKeys = Object.keys(deltaA)
  const bKeys = Object.keys(deltaB)
  
  const aPosition = aKeys.some(k => positionProps.includes(k))
  const bPosition = bKeys.some(k => positionProps.includes(k))
  
  const aSize = aKeys.some(k => sizeProps.includes(k))
  const bSize = bKeys.some(k => sizeProps.includes(k))
  
  const aRotation = aKeys.some(k => rotationProps.includes(k))
  const bRotation = bKeys.some(k => rotationProps.includes(k))
  
  const aStyle = aKeys.some(k => styleProps.includes(k))
  const bStyle = bKeys.some(k => styleProps.includes(k))
  
  // Apply composite transform (may have multiple property types)
  let result = { ...opA }
  
  // Transform position
  if (aPosition && bPosition) {
    result = transformPosition(result, opB)
  }
  
  // Transform size
  if (aSize && bSize) {
    result = transformSize(result, opB)
  }
  
  // Transform rotation
  if (aRotation && bRotation) {
    result = transformRotation(result, opB)
  }
  
  // Transform styles (last-write-wins)
  if (aStyle && bStyle) {
    const styleResult = transformStyle(opA, opB)
    // Merge style properties from winner
    for (const key of aKeys) {
      if (styleProps.includes(key)) {
        result.delta[key] = styleResult.delta[key]
      }
    }
  }
  
  // If no overlap or different property types, merge both
  const overlap = aKeys.filter(key => bKeys.includes(key))
  if (overlap.length === 0) {
    result = {
      ...result,
      delta: {
        ...result.delta,
        ...deltaB
      }
    }
  }
  
  return result
}

/**
 * Last-write-wins conflict resolution
 * Used for non-transformable changes (colors, styles, etc.)
 * @param {Object} opA - First operation
 * @param {Object} opB - Second operation
 * @returns {Object} Operation with later timestamp
 */
function lastWriteWins(opA, opB) {
  // Later timestamp wins
  if (opA.timestamp >= opB.timestamp) {
    return opA
  } else {
    return opB
  }
}

/**
 * Apply transformed operation to shape
 * @param {Object} shape - Current shape state
 * @param {Object} operation - Transformed operation
 * @returns {Object} Updated shape
 */
export function applyTransformedOperation(shape, operation) {
  if (!shape || !operation) return shape
  
  switch (operation.type) {
    case 'create':
      // Create already handled
      return shape
      
    case 'update':
      // Apply delta to shape
      return {
        ...shape,
        ...operation.delta,
        lastModified: operation.timestamp,
        lastModifiedBy: operation.userId
      }
      
    case 'delete':
      // Delete will be handled by caller
      return null
      
    default:
      return shape
  }
}

/**
 * Check if operations conflict (need transformation)
 * @param {Object} opA - First operation
 * @param {Object} opB - Second operation
 * @returns {boolean} True if conflict exists
 */
export function hasConflict(opA, opB) {
  if (!areConcurrent(opA, opB)) {
    return false
  }
  
  // Delete conflicts with anything
  if (opA.type === 'delete' || opB.type === 'delete') {
    return true
  }
  
  // Updates conflict if they change same properties
  if (opA.type === 'update' && opB.type === 'update') {
    const keysA = Object.keys(opA.delta || {})
    const keysB = Object.keys(opB.delta || {})
    const overlap = keysA.filter(key => keysB.includes(key))
    return overlap.length > 0
  }
  
  return false
}

/**
 * Get conflict type for logging/debugging
 * @param {Object} opA - First operation
 * @param {Object} opB - Second operation
 * @returns {string} Conflict type
 */
export function getConflictType(opA, opB) {
  if (!hasConflict(opA, opB)) {
    return 'none'
  }
  
  if (opA.type === 'delete' || opB.type === 'delete') {
    return 'delete'
  }
  
  if (opA.type === 'update' && opB.type === 'update') {
    const deltaA = opA.delta || {}
    const deltaB = opB.delta || {}
    
    if (('x' in deltaA || 'y' in deltaA) && ('x' in deltaB || 'y' in deltaB)) {
      return 'position'
    }
    
    return 'property'
  }
  
  if (opA.type === 'create' && opB.type === 'create') {
    return 'duplicate_create'
  }
  
  return 'unknown'
}

// Expose to window for debugging
if (typeof window !== 'undefined') {
  window.operationalTransform = {
    transform,
    transformPosition,
    transformSize,
    transformRotation,
    transformStyle,
    getPriority: getOperationPriority,
    areConcurrent,
    hasConflict,
    getConflictType,
    apply: applyTransformedOperation
  }
}

