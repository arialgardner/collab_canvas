import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { db } from '../firebase/config'
import { collection, query, limit, getDocs } from 'firebase/firestore'
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
    const stats = getOperationQueue().getStats()
    state.queueLength = stats.total
  }

  const updateLatencyFromPerformance = () => {
    const stats = performanceStats.value
    state.latency.object = { avg: stats.objectSync.avg, min: stats.objectSync.min, max: stats.objectSync.max }
    state.latency.cursor = { avg: stats.cursorSync.avg, min: stats.cursorSync.min, max: stats.cursorSync.max }
  }

  const heartbeatPing = async () => {
    try {
      // Lightweight read to verify connectivity
      const q = query(collection(db, 'canvases', 'default', 'shapes'), limit(1))
      await getDocs(q)
      setStatus(CONNECTION_STATUS.CONNECTED)
      updateQueueLength()
      updateLatencyFromPerformance()
      return true
    } catch (err) {
      setStatus(CONNECTION_STATUS.ERROR, 'Connection issue detected')
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
      if (typeof syncHandler === 'function') {
        await syncHandler()
      }
      state.lastSyncTime = Date.now()
      setStatus(CONNECTION_STATUS.CONNECTED)
    } catch (err) {
      setStatus(CONNECTION_STATUS.ERROR, 'Sync failed')
    }
  }

  const retryConnection = async () => {
    await heartbeatPing()
  }

  const markOffline = () => setStatus(CONNECTION_STATUS.OFFLINE)
  const markOnline = () => setStatus(CONNECTION_STATUS.CONNECTED)

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

  onMounted(() => {
    removeNetworkListeners = setupBrowserNetworkListeners()
    startHeartbeat()
    heartbeatPing()
  })

  onUnmounted(() => {
    stopHeartbeat()
    if (removeNetworkListeners) removeNetworkListeners()
  })

  singleton = {
    state,
    setStatus,
    syncNow,
    retryConnection,
    setSyncHandler
  }

  return singleton
}


