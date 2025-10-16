import { reactive } from 'vue'
import { db } from '../firebase/config'
import { collection, getDocs, query, limit } from 'firebase/firestore'
import { getOperationQueue } from '../utils/operationQueue'
import { usePerformanceMonitoring } from './usePerformanceMonitoring'

// Connection states
export const CONNECTION_STATUS = {
  CONNECTED: 'connected',
  SYNCING: 'syncing',
  OFFLINE: 'offline',
  ERROR: 'error'
}

let singleton = null
let isInitialized = false

export const useConnectionState = () => {
  if (singleton) return singleton

  const { performanceStats } = usePerformanceMonitoring()

  const state = reactive({
    status: CONNECTION_STATUS.CONNECTED,
    lastSyncTime: 0,
    retryAttempts: 0,
    nextRetryTime: null,
    error: '',
    queueLength: 0,
    latency: {
      object: { avg: 0, min: 0, max: 0 },
      cursor: { avg: 0, min: 0, max: 0 }
    }
  })

  let heartbeatTimer = null
  const HEARTBEAT_INTERVAL = 10000

  let syncHandler = null

  const setStatus = (status, errorMessage = '') => {
    state.status = status
    state.error = errorMessage
  }

  const setSyncHandler = (fn) => {
    syncHandler = fn
  }

  const updateQueueLength = () => {
    try {
      const stats = getOperationQueue().getStats()
      state.queueLength = stats.total
    } catch (err) {
      // Queue might not be initialized yet
      state.queueLength = 0
    }
  }

  const updateLatencyFromPerformance = () => {
    try {
      const stats = performanceStats.value
      if (stats) {
        state.latency.object = { avg: stats.objectSync.avg, min: stats.objectSync.min, max: stats.objectSync.max }
        state.latency.cursor = { avg: stats.cursorSync.avg, min: stats.cursorSync.min, max: stats.cursorSync.max }
      }
    } catch (err) {
      // Performance monitoring might not be ready
    }
  }

  const heartbeatPing = async () => {
    // Check browser online status first
    if (!navigator.onLine) {
      setStatus(CONNECTION_STATUS.OFFLINE)
      return false
    }

    try {
      // Simple connectivity check - just list canvases collection
      const canvasesRef = collection(db, 'canvases')
      const q = query(canvasesRef, limit(1))
      await getDocs(q)
      
      // Successfully connected
      setStatus(CONNECTION_STATUS.CONNECTED)
      updateQueueLength()
      updateLatencyFromPerformance()
      return true
    } catch (err) {
      // Only set error if we've been initialized and previously connected
      // This prevents showing errors on initial load
      if (isInitialized) {
        setStatus(CONNECTION_STATUS.ERROR, 'Connection issue detected')
      }
      return false
    }
  }

  const startHeartbeat = () => {
    if (heartbeatTimer) return
    heartbeatTimer = setInterval(heartbeatPing, HEARTBEAT_INTERVAL)
  }

  const stopHeartbeat = () => {
    if (heartbeatTimer) clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }

  const syncNow = async () => {
    setStatus(CONNECTION_STATUS.SYNCING)
    try {
      // First check if we're actually online
      const isConnected = await heartbeatPing()
      
      if (!isConnected) {
        // Don't try to sync if we're not connected
        // heartbeatPing already set the appropriate status (OFFLINE or ERROR)
        return
      }
      
      if (typeof syncHandler === 'function') {
        await syncHandler()
      }
      state.lastSyncTime = Date.now()
      // Only set to CONNECTED if heartbeatPing confirmed we're online
      // (it already set this, but we set it again after successful sync)
      setStatus(CONNECTION_STATUS.CONNECTED)
    } catch (err) {
      setStatus(CONNECTION_STATUS.ERROR, 'Sync failed')
    }
  }

  const retryConnection = async () => {
    await heartbeatPing()
  }

  const markOffline = () => setStatus(CONNECTION_STATUS.OFFLINE)
  const markOnline = () => {
    setStatus(CONNECTION_STATUS.CONNECTED)
    heartbeatPing()
  }

  const setupBrowserNetworkListeners = () => {
    const onOnline = () => markOnline()
    const onOffline = () => markOffline()
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }

  let removeNetworkListeners = null

  const init = () => {
    if (isInitialized) return
    
    // Set up network listeners
    removeNetworkListeners = setupBrowserNetworkListeners()
    
    // Start heartbeat monitoring
    startHeartbeat()
    
    // Do initial ping after a short delay to allow Firebase to initialize
    setTimeout(() => {
      isInitialized = true
      heartbeatPing()
    }, 1000)
  }

  const cleanup = () => {
    stopHeartbeat()
    if (removeNetworkListeners) {
      removeNetworkListeners()
      removeNetworkListeners = null
    }
  }

  singleton = {
    state,
    setStatus,
    syncNow,
    retryConnection,
    setSyncHandler,
    init,
    cleanup
  }

  return singleton
}


