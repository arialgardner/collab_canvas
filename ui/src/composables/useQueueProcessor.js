import { ref } from 'vue'
import { listOperations, updateOperation, deleteOperation } from '../utils/indexedDB'
import { useConnectionState, CONNECTION_STATUS } from './useConnectionState'
import { useFirestore } from './useFirestore'
import { getBackoffDelay } from '../utils/reconnection'

let singleton = null

export const useQueueProcessor = () => {
  if (singleton) return singleton

  const isProcessing = ref(false)
  const processedCount = ref(0)
  const failedCount = ref(0)

  const { state, setStatus } = useConnectionState()
  const { processQueuedOperation } = useFirestore()

  const processQueue = async () => {
    if (isProcessing.value) return
    isProcessing.value = true
    setStatus(CONNECTION_STATUS.SYNCING)
    processedCount.value = 0
    failedCount.value = 0

    try {
      const ops = await listOperations()
      // Oldest first
      ops.sort((a, b) => a.timestamp - b.timestamp)

      for (const op of ops) {
        try {
          await updateOperation({ ...op, status: 'processing' })
          await processQueuedOperation(op)
          await deleteOperation(op.id)
          processedCount.value++
        } catch (err) {
          failedCount.value++
          const retry = (op.retryCount || 0) + 1
          await updateOperation({ ...op, status: 'failed', retryCount: retry, error: String(err) })
        }
      }
    } finally {
      isProcessing.value = false
      setStatus(CONNECTION_STATUS.CONNECTED)
    }
  }

  // Public API
  singleton = {
    isProcessing,
    processedCount,
    failedCount,
    processQueue
  }

  return singleton
}


