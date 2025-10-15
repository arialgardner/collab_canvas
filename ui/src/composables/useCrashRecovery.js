import { ref, onMounted, onUnmounted } from 'vue'

export function useCrashRecovery(canvasId) {
  const hasRecoverableData = ref(false)
  const recoveryData = ref(null)
  const isRecovering = ref(false)
  
  let autoSaveInterval = null
  const AUTOSAVE_KEY_PREFIX = 'collab_canvas_autosave_'
  const AUTOSAVE_INTERVAL = 30000 // 30 seconds

  // Get storage key for this canvas
  const getStorageKey = () => {
    return `${AUTOSAVE_KEY_PREFIX}${canvasId}`
  }

  // Save current canvas state to localStorage
  const saveToLocalStorage = (canvasState) => {
    try {
      const data = {
        canvasId,
        timestamp: Date.now(),
        state: canvasState,
        version: '1.0'
      }
      
      localStorage.setItem(getStorageKey(), JSON.stringify(data))
      console.log('💾 Canvas state auto-saved to localStorage')
    } catch (error) {
      console.error('Failed to save to localStorage:', error)
      // Handle quota exceeded error
      if (error.name === 'QuotaExceededError') {
        console.warn('LocalStorage quota exceeded - clearing old data')
        clearOldAutoSaves()
      }
    }
  }

  // Load recovery data from localStorage
  const loadFromLocalStorage = () => {
    try {
      const data = localStorage.getItem(getStorageKey())
      if (data) {
        const parsed = JSON.parse(data)
        
        // Check if data is recent (within last 1 hour)
        const age = Date.now() - parsed.timestamp
        if (age < 3600000) { // 1 hour
          recoveryData.value = parsed
          hasRecoverableData.value = true
          console.log('📋 Found recoverable data from', new Date(parsed.timestamp).toLocaleString())
          return parsed
        } else {
          console.log('⏰ Recovery data too old, discarding')
          clearRecoveryData()
        }
      }
    } catch (error) {
      console.error('Failed to load from localStorage:', error)
    }
    return null
  }

  // Clear recovery data for this canvas
  const clearRecoveryData = () => {
    try {
      localStorage.removeItem(getStorageKey())
      hasRecoverableData.value = false
      recoveryData.value = null
      console.log('🗑️ Recovery data cleared')
    } catch (error) {
      console.error('Failed to clear recovery data:', error)
    }
  }

  // Clear old autosaves (for other canvases or old sessions)
  const clearOldAutoSaves = () => {
    try {
      const keys = Object.keys(localStorage)
      const autoSaveKeys = keys.filter(key => key.startsWith(AUTOSAVE_KEY_PREFIX))
      
      autoSaveKeys.forEach(key => {
        try {
          const data = JSON.parse(localStorage.getItem(key))
          const age = Date.now() - data.timestamp
          
          // Remove data older than 24 hours
          if (age > 86400000) {
            localStorage.removeItem(key)
            console.log('🗑️ Removed old autosave:', key)
          }
        } catch (e) {
          // Invalid data, remove it
          localStorage.removeItem(key)
        }
      })
    } catch (error) {
      console.error('Failed to clear old autosaves:', error)
    }
  }

  // Start auto-save interval
  const startAutoSave = (getCanvasStateFn) => {
    stopAutoSave() // Clear any existing interval
    
    autoSaveInterval = setInterval(() => {
      try {
        const state = getCanvasStateFn()
        if (state) {
          saveToLocalStorage(state)
        }
      } catch (error) {
        console.error('Auto-save error:', error)
      }
    }, AUTOSAVE_INTERVAL)
    
    console.log('⏰ Auto-save started (every 30 seconds)')
  }

  // Stop auto-save interval
  const stopAutoSave = () => {
    if (autoSaveInterval) {
      clearInterval(autoSaveInterval)
      autoSaveInterval = null
      console.log('⏸️ Auto-save stopped')
    }
  }

  // Apply recovery data
  const applyRecovery = (applyStateFn) => {
    if (!recoveryData.value) {
      console.warn('No recovery data to apply')
      return false
    }
    
    try {
      isRecovering.value = true
      console.log('🔄 Applying recovery data...')
      
      const success = applyStateFn(recoveryData.value.state)
      
      if (success) {
        console.log('✅ Recovery successful')
        clearRecoveryData()
        return true
      } else {
        console.error('❌ Recovery failed')
        return false
      }
    } catch (error) {
      console.error('Recovery error:', error)
      return false
    } finally {
      isRecovering.value = false
    }
  }

  // Calculate recovery data age in human-readable format
  const getRecoveryAge = () => {
    if (!recoveryData.value) return ''
    
    const age = Date.now() - recoveryData.value.timestamp
    const minutes = Math.floor(age / 60000)
    
    if (minutes < 1) return 'just now'
    if (minutes === 1) return '1 minute ago'
    if (minutes < 60) return `${minutes} minutes ago'`
    
    const hours = Math.floor(minutes / 60)
    if (hours === 1) return '1 hour ago'
    return `${hours} hours ago`
  }

  // Initialize on mount
  onMounted(() => {
    loadFromLocalStorage()
    clearOldAutoSaves()
    console.log('💾 Crash recovery initialized')
  })

  // Cleanup on unmount
  onUnmounted(() => {
    stopAutoSave()
  })

  return {
    // State
    hasRecoverableData,
    recoveryData,
    isRecovering,
    
    // Methods
    saveToLocalStorage,
    loadFromLocalStorage,
    clearRecoveryData,
    startAutoSave,
    stopAutoSave,
    applyRecovery,
    getRecoveryAge,
    clearOldAutoSaves
  }
}

