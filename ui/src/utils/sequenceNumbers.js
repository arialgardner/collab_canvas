/**
 * Sequence Number System
 * 
 * Generates unique, monotonically increasing sequence numbers for operations.
 * Used as foundation for Operational Transform to order operations correctly.
 * 
 * Format: {clientId}_{sequenceNumber}
 * Example: "user123_42"
 * 
 * Sequence numbers are:
 * - Per-client (each client has its own counter)
 * - Persistent (stored in localStorage)
 * - Monotonically increasing
 * - Unique within a client session
 */

/**
 * Get the current client ID
 * @returns {string} Client ID (user ID)
 */
function getClientId() {
  // Try to get user ID from various sources
  // 1. From localStorage (if user is logged in)
  const userData = localStorage.getItem('user')
  if (userData) {
    try {
      const user = JSON.parse(userData)
      return user.uid || user.id || generateClientId()
    } catch (e) {
      // Fall through to generate
    }
  }
  
  // 2. Generate a persistent client ID if none exists
  return generateClientId()
}

/**
 * Generate a unique client ID
 * @returns {string} Generated client ID
 */
function generateClientId() {
  let clientId = localStorage.getItem('clientId')
  
  if (!clientId) {
    // Generate a random client ID
    clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem('clientId', clientId)
  }
  
  return clientId
}

/**
 * Get the current sequence number for this client
 * @returns {number} Current sequence number
 */
function getCurrentSequenceNumber() {
  const key = 'sequenceNumber'
  const stored = localStorage.getItem(key)
  
  if (stored) {
    const num = parseInt(stored, 10)
    return isNaN(num) ? 0 : num
  }
  
  return 0
}

/**
 * Increment and return the next sequence number
 * @returns {number} Next sequence number
 */
function getNextSequenceNumber() {
  const current = getCurrentSequenceNumber()
  const next = current + 1
  localStorage.setItem('sequenceNumber', next.toString())
  return next
}

/**
 * Generate a unique operation ID (client sequence)
 * Format: {clientId}_{sequenceNumber}
 * @returns {string} Unique operation ID
 */
export function generateOperationId() {
  const clientId = getClientId()
  const sequenceNumber = getNextSequenceNumber()
  return `${clientId}_${sequenceNumber}`
}

/**
 * Parse an operation ID into its components
 * @param {string} operationId - Operation ID to parse
 * @returns {Object} { clientId, sequenceNumber }
 */
export function parseOperationId(operationId) {
  const parts = operationId.split('_')
  
  if (parts.length < 2) {
    return { clientId: 'unknown', sequenceNumber: 0 }
  }
  
  // Last part is sequence number, everything else is client ID
  const sequenceNumber = parseInt(parts[parts.length - 1], 10)
  const clientId = parts.slice(0, -1).join('_')
  
  return {
    clientId,
    sequenceNumber: isNaN(sequenceNumber) ? 0 : sequenceNumber
  }
}

/**
 * Reset sequence number (for testing or new session)
 */
export function resetSequenceNumber() {
  localStorage.setItem('sequenceNumber', '0')
  // console.log('[SequenceNumbers] Reset to 0')
}

/**
 * Get current sequence state for debugging
 * @returns {Object} { clientId, currentSequence }
 */
export function getSequenceState() {
  return {
    clientId: getClientId(),
    currentSequence: getCurrentSequenceNumber()
  }
}

/**
 * Compare two operation IDs to determine order
 * @param {string} opId1 - First operation ID
 * @param {string} opId2 - Second operation ID
 * @returns {number} -1 if opId1 < opId2, 0 if equal, 1 if opId1 > opId2
 */
export function compareOperationIds(opId1, opId2) {
  const op1 = parseOperationId(opId1)
  const op2 = parseOperationId(opId2)
  
  // Compare by client ID first (for tie-breaking)
  if (op1.clientId < op2.clientId) return -1
  if (op1.clientId > op2.clientId) return 1
  
  // Same client, compare by sequence number
  if (op1.sequenceNumber < op2.sequenceNumber) return -1
  if (op1.sequenceNumber > op2.sequenceNumber) return 1
  
  return 0 // Equal (shouldn't happen)
}

/**
 * Check if operation ID is from current client
 * @param {string} operationId - Operation ID to check
 * @returns {boolean} True if from current client
 */
export function isLocalOperation(operationId) {
  const { clientId } = parseOperationId(operationId)
  return clientId === getClientId()
}

// Expose to window for debugging
if (typeof window !== 'undefined') {
  window.sequenceNumbers = {
    generate: generateOperationId,
    parse: parseOperationId,
    reset: resetSequenceNumber,
    getState: getSequenceState,
    compare: compareOperationIds,
    isLocal: isLocalOperation
  }
}

