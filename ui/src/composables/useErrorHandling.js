import { ref, computed } from 'vue'

// Singleton state - shared across all component instances
const errors = ref([])
const isOnline = ref(navigator.onLine)
const connectionRetries = ref(0)

export const useErrorHandling = () => {
  
  // Error types
  const ERROR_TYPES = {
    NETWORK: 'network',
    AUTH: 'auth',
    FIRESTORE: 'firestore',
    VALIDATION: 'validation',
    PERMISSION: 'permission'
  }

  // Add error with automatic timeout
  const addError = (message, type = ERROR_TYPES.NETWORK, duration = 5000, retryable = false) => {
    const error = {
      id: Date.now() + Math.random(),
      message,
      type,
      timestamp: Date.now(),
      retryable
    }
    
    errors.value.push(error)
    
    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        removeError(error.id)
      }, duration)
    }
    
    // Log to console for debugging
    console.error(`[${type.toUpperCase()}] ${message}`)
    
    return error.id
  }

  // Remove specific error
  const removeError = (errorId) => {
    const index = errors.value.findIndex(error => error.id === errorId)
    if (index > -1) {
      errors.value.splice(index, 1)
    }
  }

  // Clear all errors
  const clearErrors = () => {
    errors.value = []
  }

  // Clear errors of specific type
  const clearErrorsByType = (type) => {
    errors.value = errors.value.filter(error => error.type !== type)
  }

  // Handle Firebase/Firestore errors
  const handleFirebaseError = (error, operation = 'operation') => {
    let message = `Failed to ${operation}`
    let retryable = true
    
    if (error.code) {
      switch (error.code) {
        case 'permission-denied':
          message = 'Permission denied. Please check your access rights.'
          retryable = false
          return addError(message, ERROR_TYPES.PERMISSION, 8000, retryable)
          
        case 'unavailable':
        case 'deadline-exceeded':
          message = 'Service temporarily unavailable. Retrying...'
          return addError(message, ERROR_TYPES.FIRESTORE, 4000, retryable)
          
        case 'failed-precondition':
          message = 'Operation failed due to system state. Please try again.'
          return addError(message, ERROR_TYPES.FIRESTORE, 6000, retryable)
          
        case 'resource-exhausted':
          message = 'Service limit reached. Please try again later.'
          retryable = false
          return addError(message, ERROR_TYPES.FIRESTORE, 10000, retryable)
          
        case 'unauthenticated':
          message = 'Authentication required. Please sign in again.'
          retryable = false
          return addError(message, ERROR_TYPES.AUTH, 8000, retryable)
          
        default:
          message = `${operation} failed: ${error.message || 'Unknown error'}`
      }
    }
    
    return addError(message, ERROR_TYPES.FIRESTORE, 5000, retryable)
  }

  // Handle authentication errors
  const handleAuthError = (error, operation = 'authenticate') => {
    let message = 'Authentication failed'
    
    if (error.code) {
      switch (error.code) {
        case 'auth/user-not-found':
          message = 'No account found with this email address.'
          break
        case 'auth/wrong-password':
          message = 'Incorrect password. Please try again.'
          break
        case 'auth/email-already-in-use':
          message = 'An account with this email already exists.'
          break
        case 'auth/weak-password':
          message = 'Password should be at least 6 characters.'
          break
        case 'auth/invalid-email':
          message = 'Please enter a valid email address.'
          break
        case 'auth/too-many-requests':
          message = 'Too many failed attempts. Please try again later.'
          break
        case 'auth/network-request-failed':
          message = 'Network error. Please check your connection.'
          break
        case 'auth/popup-closed-by-user':
          message = 'Sign-in was cancelled.'
          break
        case 'auth/popup-blocked':
          message = 'Popup was blocked. Please allow popups and try again.'
          break
        case 'auth/cancelled-popup-request':
          message = 'Sign-in was cancelled.'
          break
        default:
          message = error.message || 'Authentication failed'
      }
    }
    
    return addError(message, ERROR_TYPES.AUTH, 6000, false)
  }

  // Handle network errors
  const handleNetworkError = (operation = 'connect') => {
    const message = isOnline.value 
      ? `Network error during ${operation}. Retrying...`
      : 'You are offline. Please check your connection.'
      
    return addError(message, ERROR_TYPES.NETWORK, 4000, isOnline.value)
  }

  // Retry mechanism with exponential backoff
  const retry = async (operation, maxRetries = 3, baseDelay = 1000) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation()
        connectionRetries.value = 0 // Reset on success
        return result
      } catch (error) {
        console.warn(`Attempt ${attempt}/${maxRetries} failed:`, error.message)
        
        if (attempt === maxRetries) {
          connectionRetries.value = maxRetries
          throw error
        }
        
        // Exponential backoff: 1s, 2s, 4s...
        const delay = baseDelay * Math.pow(2, attempt - 1)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  // Monitor online/offline status
  const setupNetworkMonitoring = () => {
    const handleOnline = () => {
      isOnline.value = true
      clearErrorsByType(ERROR_TYPES.NETWORK)
      addError('Connection restored', ERROR_TYPES.NETWORK, 2000, false)
      // console.log('🟢 Connection restored')
    }
    
    const handleOffline = () => {
      isOnline.value = false
      addError('Connection lost. Some features may not work.', ERROR_TYPES.NETWORK, 0, false)
      // console.log('🔴 Connection lost')
    }
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    // Return cleanup function
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }

  // Validate input data
  const validateRectangleData = (rectangle) => {
    const errors = []
    
    if (!rectangle.x || typeof rectangle.x !== 'number') {
      errors.push('Invalid X coordinate')
    }
    if (!rectangle.y || typeof rectangle.y !== 'number') {
      errors.push('Invalid Y coordinate')
    }
    if (!rectangle.width || rectangle.width <= 0) {
      errors.push('Width must be positive')
    }
    if (!rectangle.height || rectangle.height <= 0) {
      errors.push('Height must be positive')
    }
    if (!rectangle.fill || typeof rectangle.fill !== 'string') {
      errors.push('Invalid color')
    }
    
    return errors
  }

  // Computed properties
  const hasErrors = computed(() => errors.value.length > 0)
  const networkErrors = computed(() => errors.value.filter(e => e.type === ERROR_TYPES.NETWORK))
  const authErrors = computed(() => errors.value.filter(e => e.type === ERROR_TYPES.AUTH))
  const firestoreErrors = computed(() => errors.value.filter(e => e.type === ERROR_TYPES.FIRESTORE))
  const retryableErrors = computed(() => errors.value.filter(e => e.retryable))

  return {
    // State
    errors,
    isOnline,
    connectionRetries,
    
    // Constants
    ERROR_TYPES,
    
    // Methods
    addError,
    removeError,
    clearErrors,
    clearErrorsByType,
    handleFirebaseError,
    handleAuthError,
    handleNetworkError,
    retry,
    setupNetworkMonitoring,
    validateRectangleData,
    
    // Computed
    hasErrors,
    networkErrors,
    authErrors,
    firestoreErrors,
    retryableErrors
  }
}
