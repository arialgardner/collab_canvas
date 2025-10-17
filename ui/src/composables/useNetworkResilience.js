import { ref, computed, onMounted, onUnmounted } from 'vue'

export function useNetworkResilience() {
  const isOnline = ref(navigator.onLine)
  const isSyncing = ref(false)
  const lastSyncAttempt = ref(null)
  const failedOperations = ref([])
  const connectionQuality = ref('good') // 'good', 'slow', 'offline'
  
  let syncTimeout = null
  let connectionCheckInterval = null

  // Update online status
  const handleOnline = () => {
    // console.log('📡 Network connection restored')
    isOnline.value = true
    connectionQuality.value = 'good'
    retryFailedOperations()
  }

  const handleOffline = () => {
    console.warn('📡 Network connection lost')
    isOnline.value = false
    connectionQuality.value = 'offline'
  }

  // Retry failed operations when connection is restored
  const retryFailedOperations = async () => {
    if (failedOperations.value.length === 0) return
    
    // console.log(`🔄 Retrying ${failedOperations.value.length} failed operations...`)
    
    const operations = [...failedOperations.value]
    failedOperations.value = []
    
    for (const operation of operations) {
      try {
        await operation.fn()
        // console.log('✅ Retry successful:', operation.name)
      } catch (error) {
        console.error('❌ Retry failed:', operation.name, error)
        // Re-add to failed queue if still failing
        failedOperations.value.push(operation)
      }
    }
  }

  // Add operation to retry queue
  const queueFailedOperation = (name, fn) => {
    failedOperations.value.push({ name, fn, timestamp: Date.now() })
    // console.log(`➕ Queued failed operation: ${name}`)
  }

  // Track sync start
  const startSync = () => {
    isSyncing.value = true
    lastSyncAttempt.value = Date.now()
    
    // Clear existing timeout
    if (syncTimeout) {
      clearTimeout(syncTimeout)
    }
    
    // Set 5 second timeout
    syncTimeout = setTimeout(() => {
      if (isSyncing.value) {
        console.warn('⚠️ Sync timeout - operation took > 5 seconds')
        connectionQuality.value = 'slow'
        endSync(false)
      }
    }, 5000)
  }

  // Track sync end
  const endSync = (success = true) => {
    isSyncing.value = false
    
    if (syncTimeout) {
      clearTimeout(syncTimeout)
      syncTimeout = null
    }
    
    if (success && connectionQuality.value !== 'offline') {
      connectionQuality.value = 'good'
    }
  }

  // Exponential backoff retry helper
  const retryWithBackoff = async (operation, maxRetries = 3, baseDelay = 1000) => {
    let lastError
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        startSync()
        const result = await operation()
        endSync(true)
        return result
      } catch (error) {
        lastError = error
        console.warn(`Attempt ${attempt}/${maxRetries} failed:`, error.message)
        endSync(false)
        
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt - 1)
          // console.log(`⏳ Waiting ${delay}ms before retry...`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
    
    // All retries failed
    throw lastError
  }

  // Check connection quality periodically
  const checkConnectionQuality = () => {
    if (!isOnline.value) {
      connectionQuality.value = 'offline'
      return
    }
    
    // Check if last sync was recent and successful
    const now = Date.now()
    if (lastSyncAttempt.value && (now - lastSyncAttempt.value > 10000)) {
      if (connectionQuality.value === 'good') {
        connectionQuality.value = 'slow'
      }
    }
  }

  // Computed properties
  const hasFailedOperations = computed(() => failedOperations.value.length > 0)
  
  const connectionStatusMessage = computed(() => {
    if (!isOnline.value) return 'Offline - Changes will not be saved'
    if (connectionQuality.value === 'slow') return 'Connection slow - May experience delays'
    if (isSyncing.value) return 'Syncing...'
    if (hasFailedOperations.value) return `${failedOperations.value.length} operations pending`
    return 'Connected'
  })

  const connectionStatusColor = computed(() => {
    if (!isOnline.value) return '#ef4444' // red
    if (connectionQuality.value === 'slow') return '#f59e0b' // orange
    if (isSyncing.value) return '#3b82f6' // blue
    return '#10b981' // green
  })

  // Setup listeners
  onMounted(() => {
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    // Check connection quality every 5 seconds
    connectionCheckInterval = setInterval(checkConnectionQuality, 5000)
    
    // console.log('🌐 Network resilience initialized')
  })

  // Cleanup
  onUnmounted(() => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
    
    if (syncTimeout) {
      clearTimeout(syncTimeout)
    }
    
    if (connectionCheckInterval) {
      clearInterval(connectionCheckInterval)
    }
  })

  return {
    // State
    isOnline,
    isSyncing,
    connectionQuality,
    failedOperations,
    hasFailedOperations,
    connectionStatusMessage,
    connectionStatusColor,
    
    // Methods
    startSync,
    endSync,
    retryWithBackoff,
    queueFailedOperation,
    retryFailedOperations,
    checkConnectionQuality
  }
}

