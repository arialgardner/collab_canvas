import { ref } from 'vue'
import { 
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  deleteDoc,
  doc,
  serverTimestamp
} from 'firebase/firestore'
import { db } from '../firebase/config'

const VERSIONS_MAX = 50

export function useVersions() {
  const isLoading = ref(false)
  const error = ref(null)
  const versions = ref([])

  const getVersionsRef = (canvasId) => collection(db, 'canvases', canvasId, 'versions')

  const createVersion = async (canvasId, userId, userName, shapesArray, summary = 'auto') => {
    try {
      isLoading.value = true
      error.value = null

      // v5: Compress shapes for storage efficiency
      const { compressShapes } = await import('../utils/compression.js')
      const compressed = compressShapes(shapesArray)

      const payload = {
        createdAt: serverTimestamp(),
        createdBy: userId,
        createdByName: userName,
        summary,
        shapeCount: shapesArray.length, // v5: Track count
        compressed: compressed, // v5: Compressed shapes
        shapes: shapesArray // Keep for backward compatibility (can remove in v6)
      }
      await addDoc(getVersionsRef(canvasId), payload)

      // v5: Also update canvas snapshot for fast restore
      try {
        const { updateCanvasSnapshot } = await import('./useFirestore.js')
        const { updateCanvasSnapshot: updateSnapshot } = updateCanvasSnapshot()
        await updateSnapshot(canvasId, shapesArray)
      } catch (snapshotError) {
        console.warn('Failed to update canvas snapshot:', snapshotError)
        // Continue - snapshot is optional
      }

      // Retention: prune oldest beyond max
      await pruneOld(canvasId)
    } catch (e) {
      error.value = e?.message || 'Failed to create version'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  const listVersions = async (canvasId) => {
    try {
      isLoading.value = true
      error.value = null
      const q = query(getVersionsRef(canvasId), orderBy('createdAt', 'desc'), limit(VERSIONS_MAX))
      const snap = await getDocs(q)
      const result = []
      snap.forEach(d => {
        const data = d.data()
        result.push({ id: d.id, ...data })
      })
      versions.value = result
      return result
    } catch (e) {
      error.value = e?.message || 'Failed to load versions'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  const pruneOld = async (canvasId) => {
    const q = query(getVersionsRef(canvasId), orderBy('createdAt', 'desc'))
    const snap = await getDocs(q)
    const docs = []
    snap.forEach(d => docs.push(d))
    if (docs.length <= VERSIONS_MAX) return
    const toDelete = docs.slice(VERSIONS_MAX)
    await Promise.all(toDelete.map(d => deleteDoc(doc(db, 'canvases', canvasId, 'versions', d.id))))
  }

  return {
    isLoading,
    error,
    versions,
    createVersion,
    listVersions
  }
}


