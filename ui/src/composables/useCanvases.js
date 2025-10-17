import { ref } from 'vue'
import { 
  collection, 
  doc, 
  getDoc,
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore'
import { db } from '../firebase/config'

// Singleton state - shared across all component instances
const canvases = ref(new Map())
const currentCanvas = ref(null)
const isLoading = ref(false)
const error = ref(null)
let unsubscribeCanvas = null

export function useCanvases() {

  // Canvas CRUD operations
  const createCanvas = async (userId, userName, options = {}) => {
    try {
      isLoading.value = true
      error.value = null

      const canvasData = {
        name: options.name || `Canvas ${new Date().toLocaleDateString()}`,
        width: options.width || 3000,
        height: options.height || 3000,
        owner: userId,
        ownerName: userName,
        createdAt: serverTimestamp(),
        lastModified: serverTimestamp(),
        permissions: {
          [userId]: 'owner'
        }
      }

      const docRef = await addDoc(collection(db, 'canvases'), canvasData)
      
      return {
        id: docRef.id,
        ...canvasData,
        createdAt: new Date(),
        lastModified: new Date()
      }
    } catch (err) {
      console.error('Error creating canvas:', err)
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const getCanvas = async (canvasId) => {
    try {
      isLoading.value = true
      error.value = null

      const docRef = doc(db, 'canvases', canvasId)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        currentCanvas.value = {
          id: docSnap.id,
          ...docSnap.data()
        }
        return currentCanvas.value
      } else {
        throw new Error('Canvas not found')
      }
    } catch (err) {
      console.error('Error getting canvas:', err)
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const getUserCanvases = async (userId) => {
    try {
      isLoading.value = true
      error.value = null

      // Query canvases where user has permissions
      const q = query(
        collection(db, 'canvases'),
        orderBy('lastModified', 'desc')
      )
      
      const querySnapshot = await getDocs(q)
      const userCanvases = []

      querySnapshot.forEach((doc) => {
        const data = doc.data()
        // Check if user has any permission on this canvas
        if (data.permissions && data.permissions[userId]) {
          userCanvases.push({
            id: doc.id,
            ...data
          })
        }
      })

      // Update canvases map
      canvases.value.clear()
      userCanvases.forEach(canvas => {
        canvases.value.set(canvas.id, canvas)
      })

      return userCanvases
    } catch (err) {
      console.error('Error getting user canvases:', err)
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const updateCanvas = async (canvasId, updates) => {
    try {
      const docRef = doc(db, 'canvases', canvasId)
      await updateDoc(docRef, {
        ...updates,
        lastModified: serverTimestamp()
      })

      // Update local state
      if (currentCanvas.value && currentCanvas.value.id === canvasId) {
        currentCanvas.value = {
          ...currentCanvas.value,
          ...updates,
          lastModified: new Date()
        }
      }

      const canvasInMap = canvases.value.get(canvasId)
      if (canvasInMap) {
        canvases.value.set(canvasId, {
          ...canvasInMap,
          ...updates,
          lastModified: new Date()
        })
      }
    } catch (err) {
      console.error('Error updating canvas:', err)
      error.value = err.message
      throw err
    }
  }

  const deleteCanvas = async (canvasId) => {
    try {
      isLoading.value = true
      error.value = null

      // Delete all shapes in canvas
      const shapesQuery = query(collection(db, 'canvases', canvasId, 'shapes'))
      const shapesSnapshot = await getDocs(shapesQuery)
      
      const deletePromises = []
      shapesSnapshot.forEach((doc) => {
        deletePromises.push(deleteDoc(doc.ref))
      })
      await Promise.all(deletePromises)

      // Delete canvas document
      await deleteDoc(doc(db, 'canvases', canvasId))

      // Update local state
      canvases.value.delete(canvasId)
      if (currentCanvas.value && currentCanvas.value.id === canvasId) {
        currentCanvas.value = null
      }
    } catch (err) {
      console.error('Error deleting canvas:', err)
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Permission management
  const updatePermissions = async (canvasId, userId, role) => {
    try {
      const docRef = doc(db, 'canvases', canvasId)
      await updateDoc(docRef, {
        [`permissions.${userId}`]: role,
        lastModified: serverTimestamp()
      })
    } catch (err) {
      console.error('Error updating permissions:', err)
      error.value = err.message
      throw err
    }
  }

  const removePermissions = async (canvasId, userId) => {
    try {
      const canvas = await getCanvas(canvasId)
      const newPermissions = { ...canvas.permissions }
      delete newPermissions[userId]

      const docRef = doc(db, 'canvases', canvasId)
      await updateDoc(docRef, {
        permissions: newPermissions,
        lastModified: serverTimestamp()
      })
    } catch (err) {
      console.error('Error removing permissions:', err)
      error.value = err.message
      throw err
    }
  }

  const getUserRole = (canvas, userId) => {
    if (!canvas || !canvas.permissions) return null
    return canvas.permissions[userId] || null
  }

  const canEdit = (canvas, userId) => {
    const role = getUserRole(canvas, userId)
    return role === 'owner' || role === 'editor'
  }

  const canManagePermissions = (canvas, userId) => {
    const role = getUserRole(canvas, userId)
    return role === 'owner'
  }

  const canDelete = (canvas, userId) => {
    const role = getUserRole(canvas, userId)
    return role === 'owner'
  }

  // Grant access from shared link
  const grantAccessFromLink = async (canvasId, userId) => {
    try {
      // console.log(`🔗 Granting editor access to user ${userId} for canvas ${canvasId}`)
      await updatePermissions(canvasId, userId, 'editor')
      
      // Reload canvas to get updated permissions
      const updatedCanvas = await getCanvas(canvasId)
      return updatedCanvas
    } catch (err) {
      console.error('Error granting access from link:', err)
      error.value = err.message
      throw err
    }
  }

  // Real-time canvas subscription
  const subscribeToCanvas = (canvasId, callback) => {
    try {
      const docRef = doc(db, 'canvases', canvasId)
      
      unsubscribeCanvas = onSnapshot(docRef, (doc) => {
        if (doc.exists()) {
          const canvas = {
            id: doc.id,
            ...doc.data()
          }
          currentCanvas.value = canvas
          if (callback) callback(canvas)
        }
      }, (err) => {
        console.error('Error subscribing to canvas:', err)
        error.value = err.message
      })

      return unsubscribeCanvas
    } catch (err) {
      console.error('Error setting up canvas subscription:', err)
      error.value = err.message
    }
  }

  const unsubscribeFromCanvas = () => {
    if (unsubscribeCanvas) {
      unsubscribeCanvas()
      unsubscribeCanvas = null
    }
  }

  return {
    // State
    canvases,
    currentCanvas,
    isLoading,
    error,

    // Canvas CRUD
    createCanvas,
    getCanvas,
    getUserCanvases,
    updateCanvas,
    deleteCanvas,

    // Permissions
    updatePermissions,
    removePermissions,
    getUserRole,
    canEdit,
    canManagePermissions,
    canDelete,
    grantAccessFromLink,

    // Real-time
    subscribeToCanvas,
    unsubscribeFromCanvas
  }
}

