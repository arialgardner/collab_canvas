// Simple IndexedDB helper focused on an operationQueue store

const DB_NAME = 'collabcanvas'
const DB_VERSION = 1
const STORE_QUEUE = 'operationQueue'

let dbPromise = null

export const openDB = () => {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = (event) => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        const store = db.createObjectStore(STORE_QUEUE, { keyPath: 'id' })
        store.createIndex('canvasId', 'canvasId', { unique: false })
        store.createIndex('timestamp', 'timestamp', { unique: false })
        store.createIndex('status', 'status', { unique: false })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  return dbPromise
}

const withStore = async (mode, fn) => {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, mode)
    const store = tx.objectStore(STORE_QUEUE)
    const result = fn(store)
    tx.oncomplete = () => resolve(result)
    tx.onerror = () => reject(tx.error)
  })
}

export const addOperation = async (op) => {
  return withStore('readwrite', (store) => store.put(op))
}

export const getOperation = async (id) => {
  return withStore('readonly', (store) => store.get(id))
}

export const deleteOperation = async (id) => {
  return withStore('readwrite', (store) => store.delete(id))
}

export const listOperations = async () => {
  return withStore('readonly', (store) => {
    return new Promise((resolve, reject) => {
      const ops = []
      const req = store.index('timestamp').openCursor()
      req.onsuccess = (e) => {
        const cursor = e.target.result
        if (cursor) {
          ops.push(cursor.value)
          cursor.continue()
        } else {
          resolve(ops)
        }
      }
      req.onerror = () => reject(req.error)
    })
  })
}

export const clearAllOperations = async () => {
  return withStore('readwrite', (store) => store.clear())
}

export const updateOperation = async (op) => {
  return withStore('readwrite', (store) => store.put(op))
}


