/**
 * Operation Queue Manager for v3
 * Handles operation prioritization and batching for optimized Firestore writes
 */

class OperationQueue {
  constructor() {
    this.highPriorityQueue = []
    this.lowPriorityQueue = []
    this.processing = false
    this.batchTimeout = null
    this.BATCH_DELAY = 100 // ms - delay before processing low priority batch
    this.sequenceNumber = 0
  }

  /**
   * Generate next sequence number for operation ordering
   */
  getNextSequenceNumber() {
    return ++this.sequenceNumber
  }

  /**
   * Add operation to queue
   * @param {Object} operation - Operation to queue
   * @param {String} operation.type - 'create', 'update', 'delete'
   * @param {String} operation.shapeId - Shape ID
   * @param {Object} operation.data - Operation data
   * @param {String} priority - 'high' or 'low'
   */
  enqueue(operation, priority = 'high') {
    const queuedOp = {
      ...operation,
      sequenceNumber: this.getNextSequenceNumber(),
      timestamp: Date.now(),
      priority
    }

    if (priority === 'high') {
      this.highPriorityQueue.push(queuedOp)
      // Process high priority immediately
      this.processHighPriority()
    } else {
      this.lowPriorityQueue.push(queuedOp)
      // Batch low priority operations
      this.scheduleBatchProcessing()
    }
  }

  /**
   * Process high priority operations immediately
   */
  async processHighPriority() {
    if (this.processing || this.highPriorityQueue.length === 0) return

    this.processing = true

    try {
      // Process all high priority operations
      while (this.highPriorityQueue.length > 0) {
        const operation = this.highPriorityQueue.shift()
        await this.executeOperation(operation)
      }
    } catch (error) {
      console.error('Error processing high priority operations:', error)
    } finally {
      this.processing = false
    }
  }

  /**
   * Schedule batch processing for low priority operations
   */
  scheduleBatchProcessing() {
    // Clear existing timeout
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout)
    }

    // Schedule new batch
    this.batchTimeout = setTimeout(() => {
      this.processBatch()
    }, this.BATCH_DELAY)
  }

  /**
   * Process batched low priority operations
   */
  async processBatch() {
    if (this.lowPriorityQueue.length === 0) return

    const batch = [...this.lowPriorityQueue]
    this.lowPriorityQueue = []

    try {
      // Group operations by shape for optimization
      const groupedOps = this.groupOperationsByShape(batch)

      // Process each group (only keep latest update per shape)
      for (const [shapeId, operations] of Object.entries(groupedOps)) {
        const latestOp = operations[operations.length - 1]
        await this.executeOperation(latestOp)
      }
    } catch (error) {
      console.error('Error processing batch operations:', error)
    }
  }

  /**
   * Group operations by shape ID, keeping only the latest for each shape
   */
  groupOperationsByShape(operations) {
    const grouped = {}

    for (const op of operations) {
      if (!grouped[op.shapeId]) {
        grouped[op.shapeId] = []
      }
      grouped[op.shapeId].push(op)
    }

    return grouped
  }

  /**
   * Execute a single operation (to be overridden by consumer)
   */
  async executeOperation(operation) {
    // This will be set by the consumer
    if (this.onExecute) {
      await this.onExecute(operation)
    }
  }

  /**
   * Set operation executor function
   */
  setExecutor(executorFn) {
    this.onExecute = executorFn
  }

  /**
   * Clear all queues
   */
  clear() {
    this.highPriorityQueue = []
    this.lowPriorityQueue = []
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout)
      this.batchTimeout = null
    }
  }

  /**
   * Get queue statistics
   */
  getStats() {
    return {
      highPriority: this.highPriorityQueue.length,
      lowPriority: this.lowPriorityQueue.length,
      total: this.highPriorityQueue.length + this.lowPriorityQueue.length,
      processing: this.processing,
      sequenceNumber: this.sequenceNumber
    }
  }
}

// Singleton instance
let queueInstance = null

export const getOperationQueue = () => {
  if (!queueInstance) {
    queueInstance = new OperationQueue()
  }
  return queueInstance
}

export const resetOperationQueue = () => {
  if (queueInstance) {
    queueInstance.clear()
  }
  queueInstance = null
}

