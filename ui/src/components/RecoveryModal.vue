<template>
  <div v-if="isVisible" class="modal-overlay">
    <div class="modal-content recovery-modal">
      <div class="modal-icon">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      
      <h2 class="modal-title">Restore Unsaved Changes?</h2>
      
      <p class="modal-message">
        We found unsaved changes from {{ recoveryAge }}. Would you like to restore them?
      </p>
      
      <div class="recovery-info">
        <div class="info-item">
          <span class="info-label">Last saved:</span>
          <span class="info-value">{{ formattedTime }}</span>
        </div>
      </div>
      
      <div class="modal-actions">
        <button 
          @click="$emit('discard')" 
          class="button-secondary"
          :disabled="isRestoring"
        >
          Discard
        </button>
        <button 
          @click="$emit('restore')" 
          class="button-primary"
          :disabled="isRestoring"
        >
          {{ isRestoring ? 'Restoring...' : 'Restore Changes' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  isVisible: {
    type: Boolean,
    default: false
  },
  recoveryAge: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Number,
    default: 0
  },
  isRestoring: {
    type: Boolean,
    default: false
  }
})

defineEmits(['restore', 'discard'])

const formattedTime = computed(() => {
  if (!props.timestamp) return ''
  return new Date(props.timestamp).toLocaleString()
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-content {
  background: white;
  border-radius: 16px;
  max-width: 480px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.recovery-modal {
  text-align: center;
  padding: 32px;
}

.modal-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 20px;
  background: #fef3c7;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #f59e0b;
}

.modal-icon svg {
  width: 36px;
  height: 36px;
}

.modal-title {
  font-size: 24px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 12px;
}

.modal-message {
  font-size: 15px;
  color: #6b7280;
  margin: 0 0 24px;
  line-height: 1.6;
}

.recovery-info {
  background: #f9fafb;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-label {
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
}

.info-value {
  font-size: 13px;
  color: #111827;
  font-weight: 600;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.button-primary,
.button-secondary {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 120px;
}

.button-primary {
  background: #3b82f6;
  color: white;
}

.button-primary:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.button-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.button-secondary {
  background: #ffffff;
  color: #000000;
  border: 1px solid #d1d5db;
}

.button-secondary:hover:not(:disabled) {
  background: #e5e7eb;
}

.button-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>

