/**
 * Batch Write Queue (PR #11)
 * 
 * Optimizes Firestore writes by batching multiple operations together.
 * Reduces write costs and improves performance.
 * 
 * Features:
 * - Batches up to 500 operations (Firestore limit)
 * - Automatic flush on batch size or timeout
 * - Priority queue for critical operations
 * - Debouncing for rapid edits
 */

import { writeBatch, doc } from 'firebase/firestore'
import { db } from '../firebase/config'

// Write queue
const writeQueue = []
const priorityQueue = []

// Batching configuration
const MAX_BATCH_SIZE = 500 // Firestore limit
const BATCH_TIMEOUT = 500 // ms - flush after 500ms of inactivity
const PRIORITY_FLUSH_SIZE = 50 // Flush priority queue at this size

// Timers
let batchTimer = null
let priorityTimer = null

// Stats
let totalWrites = 0
let totalBatches = 0
let savedWrites = 0 // Individual writes saved by batching

/**
 * Queue a write operation
 * @param {string} collection - Collection name (e.g., 'shapes')
 * @param {string} docId - Document ID
 * @param {Object} data - Data to write
 * @param {boolean} priority - High priority (flush sooner)
 * @param {boolean} merge - Use merge instead of set
 */
export function queueWrite(collection, docId, data, priority = false, merge = false) {
  const write = {
    collection,
    docId,
    data,
    merge,
    timestamp: Date.now()
  }
  
  if (priority) {
    priorityQueue.push(write)
    schedulePriorityFlush()
  } else {
    writeQueue.push(write)
    scheduleBatchFlush()
  }
  
  totalWrites++
}

/**
 * Schedule batch flush (debounced)
 */
function scheduleBatchFlush() {
  if (batchTimer) {
    clearTimeout(batchTimer)
  }
  
  // Flush immediately if batch is full
  if (writeQueue.length >= MAX_BATCH_SIZE) {
    flushBatch()
    return
  }
  
  // Otherwise, debounce
  batchTimer = setTimeout(() => {
    if (writeQueue.length > 0) {
      flushBatch()
    }
  }, BATCH_TIMEOUT)
}

/**
 * Schedule priority flush (shorter timeout)
 */
function schedulePriorityFlush() {
  if (priorityTimer) {
    clearTimeout(priorityTimer)
  }
  
  // Flush immediately if priority queue is large
  if (priorityQueue.length >= PRIORITY_FLUSH_SIZE) {
    flushPriorityQueue()
    return
  }
  
  // Shorter timeout for priority items
  priorityTimer = setTimeout(() => {
    if (priorityQueue.length > 0) {
      flushPriorityQueue()
    }
  }, 100) // 100ms for priority
}

/**
 * Flush the normal write queue
 */
async function flushBatch() {
  if (writeQueue.length === 0) return
  
  const batch = writeBatch(db)
  const writes = writeQueue.splice(0, MAX_BATCH_SIZE)
  
  writes.forEach(write => {
    const docRef = doc(db, write.collection, write.docId)
    if (write.merge) {
      batch.set(docRef, write.data, { merge: true })
    } else {
      batch.set(docRef, write.data)
    }
  })
  
  try {
    await batch.commit()
    totalBatches++
    savedWrites += writes.length - 1 // Saved (n-1) writes by batching
    // console.log(`[BatchWrite] Flushed ${writes.length} operations (saved ${writes.length - 1} writes)`)
  } catch (error) {
    console.error('[BatchWrite] Batch commit failed:', error)
    // Re-queue failed writes
    writeQueue.unshift(...writes)
  }
  
  // If more writes remain, schedule another flush
  if (writeQueue.length > 0) {
    scheduleBatchFlush()
  }
}

/**
 * Flush the priority queue
 */
async function flushPriorityQueue() {
  if (priorityQueue.length === 0) return
  
  const batch = writeBatch(db)
  const writes = priorityQueue.splice(0, MAX_BATCH_SIZE)
  
  writes.forEach(write => {
    const docRef = doc(db, write.collection, write.docId)
    if (write.merge) {
      batch.set(docRef, write.data, { merge: true })
    } else {
      batch.set(docRef, write.data)
    }
  })
  
  try {
    await batch.commit()
    totalBatches++
    savedWrites += writes.length - 1
    // console.log(`[BatchWrite] Flushed ${writes.length} priority operations`)
  } catch (error) {
    console.error('[BatchWrite] Priority batch commit failed:', error)
    // Re-queue failed writes
    priorityQueue.unshift(...writes)
  }
  
  // If more priority writes remain, schedule another flush
  if (priorityQueue.length > 0) {
    schedulePriorityFlush()
  }
}

/**
 * Flush all queues immediately
 */
export async function flushAll() {
  if (batchTimer) {
    clearTimeout(batchTimer)
    batchTimer = null
  }
  
  if (priorityTimer) {
    clearTimeout(priorityTimer)
    priorityTimer = null
  }
  
  await Promise.all([
    flushPriorityQueue(),
    flushBatch()
  ])
}

/**
 * Get queue stats
 * @returns {Object}
 */
export function getQueueStats() {
  return {
    normalQueueSize: writeQueue.length,
    priorityQueueSize: priorityQueue.length,
    totalWrites,
    totalBatches,
    savedWrites,
    averageBatchSize: totalBatches > 0 ? Math.round(totalWrites / totalBatches) : 0,
    writeSavingsPercent: totalWrites > 0 ? Math.round((savedWrites / totalWrites) * 100) : 0
  }
}

/**
 * Clear all queues (use with caution)
 */
export function clearQueues() {
  writeQueue.length = 0
  priorityQueue.length = 0
  
  if (batchTimer) {
    clearTimeout(batchTimer)
    batchTimer = null
  }
  
  if (priorityTimer) {
    clearTimeout(priorityTimer)
    priorityTimer = null
  }
  
  // console.log('[BatchWrite] Queues cleared')
}

// Expose to window for debugging
if (typeof window !== 'undefined') {
  window.batchWriteQueue = {
    queueWrite,
    flushAll,
    getStats: getQueueStats,
    clearQueues
  }
}

