<template>
  <div class="error-container">
    <!-- Network Status Banner -->
    <transition name="banner">
      <div v-if="showOfflineBanner" class="error-banner network-error">
        <div class="banner-content">
          <span class="error-icon">📡</span>
          <span class="error-text">You are offline. Some features may not work.</span>
        </div>
      </div>
    </transition>

    <!-- Error Toast Notifications -->
    <transition-group name="toast" tag="div" class="toast-container">
      <div
        v-for="error in errors"
        :key="error.id"
        :class="['toast', `toast-${error.type}`]"
        @click="removeError(error.id)"
      >
        <div class="toast-content">
          <span class="toast-icon">{{ getErrorIcon(error.type) }}</span>
          <span class="toast-message">{{ error.message }}</span>
          <button v-if="error.retryable" class="retry-btn" @click.stop="$emit('retry', error)">
            Retry
          </button>
        </div>
        <div class="toast-progress" :class="{ 'animate': !error.retryable }"></div>
      </div>
    </transition-group>
  </div>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue'
import { useErrorHandling } from '../composables/useErrorHandling'
import { useAuth } from '../composables/useAuth'

const emit = defineEmits(['retry'])

const { 
  errors, 
  isOnline, 
  removeError, 
  ERROR_TYPES 
} = useErrorHandling()

const { user } = useAuth()

const showOfflineBanner = ref(false)
let hideTimeout = null

// Watch for offline status changes
watch(isOnline, (newValue, oldValue) => {
  // Clear any existing timeout
  if (hideTimeout) {
    clearTimeout(hideTimeout)
    hideTimeout = null
  }
  
  // Only show banner if user is logged in
  if (!user.value) {
    showOfflineBanner.value = false
    return
  }
  
  // When going offline, show banner and auto-hide after 4 seconds
  if (!newValue) {
    showOfflineBanner.value = true
    hideTimeout = setTimeout(() => {
      showOfflineBanner.value = false
      hideTimeout = null
    }, 4000)
  } else {
    // When coming back online, hide immediately
    showOfflineBanner.value = false
  }
}, { immediate: true })

// Clean up timeout on unmount
onUnmounted(() => {
  if (hideTimeout) {
    clearTimeout(hideTimeout)
  }
})

const getErrorIcon = (type) => {
  switch (type) {
    case ERROR_TYPES.NETWORK: return '🌐'
    case ERROR_TYPES.AUTH: return '🔐'
    case ERROR_TYPES.FIRESTORE: return '💾'
    case ERROR_TYPES.PERMISSION: return '🚫'
    case ERROR_TYPES.VALIDATION: return '⚠️'
    default: return '❗'
  }
}
</script>

<style scoped>
.error-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  pointer-events: none;
}

/* Network Status Banner */
.error-banner {
  width: 100%;
  padding: 12px 20px;
  pointer-events: auto;
  animation: slideDown 0.3s ease-out;
}

.network-error {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
  box-shadow: 0 2px 10px rgba(245, 158, 11, 0.3);
}

.banner-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 500;
}

.error-icon {
  font-size: 16px;
}

.error-text {
  font-size: 14px;
}

/* Toast Notifications */
.toast-container {
  position: fixed;
  top: 80px;
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 400px;
  pointer-events: none;
}

.toast {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  cursor: pointer;
  pointer-events: auto;
  position: relative;
  border-left: 4px solid #6b7280;
}

.toast-network {
  border-left-color: #f59e0b;
}

.toast-auth {
  border-left-color: #ef4444;
}

.toast-firestore {
  border-left-color: #3b82f6;
}

.toast-permission {
  border-left-color: #dc2626;
}

.toast-validation {
  border-left-color: #f59e0b;
}

.toast-content {
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.toast-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.toast-message {
  flex: 1;
  font-size: 14px;
  color: #374151;
  line-height: 1.4;
}

.retry-btn {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.retry-btn:hover {
  background: #2563eb;
}

.toast-progress {
  height: 3px;
  background: rgba(107, 114, 128, 0.2);
  position: relative;
  overflow: hidden;
}

.toast-progress.animate::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: currentColor;
  animation: progress 5s linear forwards;
}

.toast-network .toast-progress.animate::after {
  background: #f59e0b;
}

.toast-auth .toast-progress.animate::after {
  background: #ef4444;
}

.toast-firestore .toast-progress.animate::after {
  background: #3b82f6;
}

.toast-permission .toast-progress.animate::after {
  background: #dc2626;
}

.toast-validation .toast-progress.animate::after {
  background: #f59e0b;
}

/* Animations */
@keyframes slideDown {
  from {
    transform: translateY(-100%);
  }
  to {
    transform: translateY(0);
  }
}

/* Banner Transitions */
.banner-enter-active {
  transition: all 0.3s ease-out;
}

.banner-leave-active {
  transition: all 0.3s ease-in;
}

.banner-enter-from {
  transform: translateY(-100%);
  opacity: 0;
}

.banner-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}

@keyframes progress {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}

/* Toast Transitions */
.toast-enter-active {
  transition: all 0.3s ease-out;
}

.toast-leave-active {
  transition: all 0.3s ease-in;
}

.toast-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.toast-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

.toast-move {
  transition: transform 0.3s ease;
}

/* Responsive */
@media (max-width: 480px) {
  .toast-container {
    right: 10px;
    left: 10px;
    max-width: none;
  }
  
  .toast-content {
    padding: 12px;
  }
  
  .toast-message {
    font-size: 13px;
  }
  
  .banner-content {
    font-size: 13px;
  }
}
</style>
