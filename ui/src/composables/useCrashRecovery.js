import { ref } from 'vue'

const STORAGE_PREFIX = 'collabcanvas_recovery_'

export const useCrashRecovery = () => {
  const isSaving = ref(false)
  const lastSavedAt = ref(0)

  const getKey = (canvasId) => `${STORAGE_PREFIX}${canvasId}`

  const saveSnapshot = async (canvasId, shapesMap, viewportState, selectionState, queueOps) => {
    try {
      isSaving.value = true
      const shapes = Array.from(shapesMap.values()).map(s => ({
        id: s.id,
        type: s.type,
        x: s.x, y: s.y,
        width: s.width, height: s.height,
        radius: s.radius,
        points: s.points,
        rotation: s.rotation,
        zIndex: s.zIndex,
        fill: s.fill,
        lastModified: s.lastModified,
        lastModifiedBy: s.lastModifiedBy
      }))
      const payload = {
        canvasId,
        timestamp: Date.now(),
        shapes,
        viewportState,
        selectionState,
        queueOps: queueOps || []
      }
      localStorage.setItem(getKey(canvasId), JSON.stringify(payload))
      lastSavedAt.value = payload.timestamp
    } finally {
      isSaving.value = false
    }
  }

  const loadSnapshot = (canvasId) => {
    try {
      const raw = localStorage.getItem(getKey(canvasId))
      if (!raw) return null
      return JSON.parse(raw)
    } catch {
      return null
    }
  }

  const clearSnapshot = (canvasId) => {
    localStorage.removeItem(getKey(canvasId))
  }

  return {
    isSaving,
    lastSavedAt,
    saveSnapshot,
    loadSnapshot,
    clearSnapshot
  }
}

