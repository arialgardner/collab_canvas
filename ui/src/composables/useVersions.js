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

  const createVersion = async (canvasId, userId, shapesArray, summary = 'auto') => {
    try {
      isLoading.value = true
      error.value = null

      const payload = {
        createdAt: serverTimestamp(),
        createdBy: userId,
        summary,
        shapes: shapesArray
      }
      await addDoc(getVersionsRef(canvasId), payload)

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


