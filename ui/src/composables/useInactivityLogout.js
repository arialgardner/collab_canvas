import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from './useAuth'
import { usePresence } from './usePresence'
import { useCursors } from './useCursors'

// Inactivity timeout: 10 minutes (600,000 ms)
const INACTIVITY_TIMEOUT = 10 * 60 * 1000

export function useInactivityLogout(canvasId = 'default') {
  const router = useRouter()
  const { user, signOut } = useAuth()
  const { setUserOffline } = usePresence()
  const { removeCursor } = useCursors()
  
  const lastActivityTime = ref(Date.now())
  let inactivityTimer = null
  let checkInterval = null
  
  // Update last activity time
  const updateActivity = () => {
    lastActivityTime.value = Date.now()
  }
  
  // Check if user has been inactive for too long
  const checkInactivity = async () => {
    const now = Date.now()
    const inactiveTime = now - lastActivityTime.value
    
    if (inactiveTime >= INACTIVITY_TIMEOUT) {
      // console.log('⏰ User inactive for 10 minutes - logging out')
      await handleAutoLogout()
    }
  }
  
  // Handle automatic logout
  const handleAutoLogout = async () => {
    try {
      const userId = user.value?.uid
      
      if (userId) {
        // console.log('🔐 Auto-logout: Cleaning up presence and cursor')
        
        // Clean up presence and cursor before signing out
        // This ensures other users see the user go offline
        await Promise.all([
          setUserOffline(canvasId, userId),
          removeCursor(canvasId, userId)
        ])
      }
      
      // Sign out the user
      await signOut()
      
      // Redirect to auth page
      router.push({ name: 'Auth' })
      
      // Show notification
      alert('You have been logged out due to inactivity.')
    } catch (error) {
      console.error('Error during auto-logout:', error)
    }
  }
  
  // Activity event handlers
  const activityEvents = [
    'mousedown',
    'mousemove',
    'keydown',
    'scroll',
    'touchstart',
    'click'
  ]
  
  // Start tracking inactivity
  const startTracking = () => {
    // console.log('👀 Started inactivity tracking (10 minute timeout)')
    
    // Add event listeners for user activity
    activityEvents.forEach(event => {
      window.addEventListener(event, updateActivity, { passive: true })
    })
    
    // Check inactivity every 30 seconds
    checkInterval = setInterval(checkInactivity, 30000)
    
    // Set initial activity time
    updateActivity()
  }
  
  // Stop tracking inactivity
  const stopTracking = () => {
    // console.log('🛑 Stopped inactivity tracking')
    
    // Remove event listeners
    activityEvents.forEach(event => {
      window.removeEventListener(event, updateActivity)
    })
    
    // Clear intervals
    if (checkInterval) {
      clearInterval(checkInterval)
      checkInterval = null
    }
    
    if (inactivityTimer) {
      clearTimeout(inactivityTimer)
      inactivityTimer = null
    }
  }
  
  // Auto-start tracking on mount
  onMounted(() => {
    if (user.value) {
      startTracking()
    }
  })
  
  // Clean up on unmount
  onUnmounted(() => {
    stopTracking()
  })
  
  return {
    lastActivityTime,
    updateActivity,
    startTracking,
    stopTracking
  }
}

