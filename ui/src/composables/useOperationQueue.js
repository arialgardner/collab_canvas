import { ref } from 'vue'
import { addOperation, listOperations, deleteOperation, updateOperation, clearAllOperations } from '../utils/indexedDB'
import { getOperationQueue } from '../utils/operationQueue'

// In-memory + IndexedDB backed operation queue for offline support

let singleton = null

export const useOperationQueue = () => {
  if (singleton) return singleton

  const isPersisting = ref(false)
  const lastPersistError = ref('')

  // Persist an operation to IndexedDB
  const persistOperation = async (op) => {
    try {
      isPersisting.value = true
      await addOperation(op)
    } catch (err) {
      lastPersistError.value = err?.message || String(err)
      console.error('Persist operation failed:', err)
    } finally {
      isPersisting.value = false
    }
  }

  const loadQueuedOperations = async () => {
    return await listOperations()
  }

  const markCompleted = async (opId) => {
    try { await deleteOperation(opId) } catch {}
  }

  const markFailed = async (op, error) => {
    try {
      const retryCount = (op.retryCount || 0) + 1
      await updateOperation({ ...op, retryCount, status: 'failed', error })
    } catch {}
  }

  const clearQueue = async () => {
    await clearAllOperations()
  }

  // Bridge: whenever we enqueue to the in-memory priority queue, also persist (for offline)
  const bridgeEnqueue = async (operation, priority = 'high') => {
    const queued = {
      id: `${operation.shapeId}-${operation.timestamp}-${operation.type}`,
      status: 'pending',
      retryCount: 0,
      ...operation
    }
    await persistOperation(queued)
    // Pass the full queued operation (including ID) to in-memory queue for cleanup
    getOperationQueue().enqueue(queued, priority)
  }

  singleton = {
    isPersisting,
    lastPersistError,
    persistOperation,
    loadQueuedOperations,
    markCompleted,
    markFailed,
    clearQueue,
    bridgeEnqueue
  }

  return singleton
}


