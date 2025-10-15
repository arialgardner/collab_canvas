<template>
  <div class="sync-status" :class="statusClass">
    <div class="status-indicator">
      <div class="status-dot" :class="dotClass"></div>
      <span class="status-text">{{ statusText }}</span>
    </div>
    
    <!-- Show user count when connected -->
    <div v-if="isConnected && userCount > 0" class="user-count">
      {{ userCount }} user{{ userCount === 1 ? '' : 's' }} online
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'

export default {
  name: 'SyncStatus',
  props: {
    isConnected: {
      type: Boolean,
      default: true
    },
    isSyncing: {
      type: Boolean,
      default: false
    },
    hasError: {
      type: Boolean,
      default: false
    },
    userCount: {
      type: Number,
      default: 0
    }
  },
  setup(props) {
    // Computed status properties
    const statusText = computed(() => {
      if (props.hasError) return 'Connection Error'
      if (props.isSyncing) return 'Syncing...'
      if (props.isConnected) return 'Connected'
      return 'Offline'
    })
    
    const statusClass = computed(() => {
      if (props.hasError) return 'error'
      if (props.isSyncing) return 'syncing'
      if (props.isConnected) return 'connected'
      return 'offline'
    })
    
    const dotClass = computed(() => {
      if (props.hasError) return 'error'
      if (props.isSyncing) return 'syncing'
      if (props.isConnected) return 'connected'
      return 'offline'
    })
    
    return {
      statusText,
      statusClass,
      dotClass
    }
  }
}
</script>

<style scoped>
.sync-status {
  position: fixed;
  top: 90px;
  left: 1rem;
  background: white;
  border-radius: 8px;
  padding: 0.75rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  border: 1px solid #e2e8f0;
  z-index: 900;
  min-width: 120px;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  transition: all 0.2s;
}

.status-dot.connected {
  background: #48bb78;
  box-shadow: 0 0 0 2px rgba(72, 187, 120, 0.2);
}

.status-dot.syncing {
  background: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
  animation: pulse 1.5s ease-in-out infinite;
}

.status-dot.offline {
  background: #a0aec0;
}

.status-dot.error {
  background: #f56565;
  box-shadow: 0 0 0 2px rgba(245, 101, 101, 0.2);
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.8;
  }
}

.status-text {
  font-size: 0.9rem;
  font-weight: 500;
  color: #4a5568;
}

.sync-status.connected .status-text {
  color: #2d5016;
}

.sync-status.syncing .status-text {
  color: #3c366b;
}

.sync-status.error .status-text {
  color: #c53030;
}

.sync-status.offline .status-text {
  color: #718096;
}

.user-count {
  font-size: 0.8rem;
  color: #718096;
  margin-top: 0.25rem;
  text-align: center;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .sync-status {
    top: 80px;
    left: 0.5rem;
    padding: 0.5rem;
  }
  
  .status-text {
    font-size: 0.8rem;
  }
  
  .user-count {
    font-size: 0.75rem;
  }
}
</style>
