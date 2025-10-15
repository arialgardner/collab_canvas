import { ref } from 'vue'
import { useFirestore } from './useFirestore'

// State Reconciliation composable (v3)
// Compares Firestore authoritative state with local shapes Map and reconciles differences

let singleton = null

export const useStateReconciliation = () => {
  if (singleton) return singleton

  const isReconciling = ref(false)
  const lastResult = ref({ added: 0, removed: 0, updated: 0 })
  const lastRunAt = ref(0)
  let timer = null

  const { loadShapes } = useFirestore()

  // Reconcile local Map against Firestore
  // localShapes: reactive Map from useShapes()
  // options: { skipIds?: Set<string> }
  const reconcile = async (canvasId = 'default', localShapes, options = {}) => {
    if (isReconciling.value) return lastResult.value
    isReconciling.value = true

    const skipIds = options.skipIds || new Set()
    let added = 0
    let removed = 0
    let updated = 0

    try {
      const remoteShapesArray = await loadShapes(canvasId)
      const remoteMap = new Map(remoteShapesArray.map(s => [s.id, s]))

      // Add or update from remote
      for (const [id, remote] of remoteMap.entries()) {
        if (skipIds.has(id)) continue
        const local = localShapes.get(id)
        if (!local) {
          localShapes.set(id, remote)
          added++
        } else {
          const rt = Number(remote.lastModified || 0)
          const lt = Number(local.lastModified || 0)
          if (rt > lt) {
            localShapes.set(id, remote)
            updated++
          }
        }
      }

      // Remove locals that no longer exist remotely
      for (const [id, local] of localShapes.entries()) {
        if (skipIds.has(id)) continue
        if (!remoteMap.has(id)) {
          localShapes.delete(id)
          removed++
        }
      }

      lastResult.value = { added, removed, updated }
      lastRunAt.value = Date.now()
      return lastResult.value
    } catch (err) {
      // Swallow errors but expose zeroed result
      lastResult.value = { added: 0, removed: 0, updated: 0 }
      return lastResult.value
    } finally {
      isReconciling.value = false
    }
  }

  const startPeriodic = (canvasId, localShapes, getSkipIdsFn, intervalMs = 60000) => {
    if (timer) return
    timer = setInterval(() => {
      const skip = typeof getSkipIdsFn === 'function' ? new Set(getSkipIdsFn()) : new Set()
      reconcile(canvasId, localShapes, { skipIds: skip })
    }, intervalMs)
  }

  const stopPeriodic = () => {
    if (timer) clearInterval(timer)
    timer = null
  }

  const triggerOnVisibilityChange = (canvasId, localShapes, getSkipIdsFn) => {
    const handler = () => {
      if (document.visibilityState === 'visible') {
        const skip = typeof getSkipIdsFn === 'function' ? new Set(getSkipIdsFn()) : new Set()
        reconcile(canvasId, localShapes, { skipIds: skip })
      }
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }

  singleton = {
    isReconciling,
    lastResult,
    lastRunAt,
    reconcile,
    startPeriodic,
    stopPeriodic,
    triggerOnVisibilityChange
  }

  return singleton
}


