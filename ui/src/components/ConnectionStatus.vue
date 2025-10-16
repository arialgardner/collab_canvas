<template>
  <div>
    <div class="connection-status" @click="toggleExpanded" :title="tooltip">
      <span :class="['dot', statusClass]"></span>
      <span class="text">{{ label }}</span>
      <svg class="chevron" viewBox="0 0 20 20" :class="{ rotated: expanded }">
        <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/>
      </svg>

      <div v-if="expanded" class="panel">
        <div class="dropdown-header">Connection</div>
        <div class="row actions">
          <button class="btn" @click.stop="syncNow">Sync Now</button>
          <button class="btn" @click.stop="retryConnection" :disabled="isConnected">Retry</button>
          <button class="btn" @click.stop="toggleQueue">View Queue</button>
        </div>
        <div v-if="state.error" class="error">{{ state.error }}</div>
      </div>
    </div>

    <!-- Click outside to close dropdown -->
    <div 
      v-if="expanded" 
      @click="expanded = false"
      class="dropdown-overlay"
    ></div>

    <!-- Queue Viewer Modal (outside dropdown) -->
    <QueueViewer :is-visible="showQueue" @close="showQueue = false" />
  </div>
</template>

<script>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useConnectionState, CONNECTION_STATUS } from '../composables/useConnectionState'
import QueueViewer from './QueueViewer.vue'

export default {
  name: 'ConnectionStatus',
  components: { QueueViewer },
  setup() {
    const { state, syncNow, retryConnection, init, cleanup } = useConnectionState()
    const expanded = ref(false)
    const showQueue = ref(false)

    onMounted(() => {
      init()
    })

    onUnmounted(() => {
      cleanup()
    })

    const statusClass = computed(() => {
      switch (state.status) {
        case CONNECTION_STATUS.CONNECTED: return 'green'
        case CONNECTION_STATUS.SYNCING: return 'blue'
        case CONNECTION_STATUS.OFFLINE: return 'yellow'
        case CONNECTION_STATUS.ERROR: return 'red'
        default: return 'gray'
      }
    })

    const label = computed(() => {
      switch (state.status) {
        case CONNECTION_STATUS.CONNECTED: return 'Connected'
        case CONNECTION_STATUS.SYNCING: return 'Syncing...'
        case CONNECTION_STATUS.OFFLINE: return 'Offline'
        case CONNECTION_STATUS.ERROR: return 'Connection Error'
        default: return 'Unknown'
      }
    })

    const tooltip = computed(() => {
      switch (state.status) {
        case CONNECTION_STATUS.CONNECTED: return 'Real-time sync active'
        case CONNECTION_STATUS.SYNCING: return `Processing ${state.queueLength} operations...`
        case CONNECTION_STATUS.OFFLINE: return `Changes saved locally • ${state.queueLength} queued`
        case CONNECTION_STATUS.ERROR: return 'Retrying...'
        default: return ''
      }
    })

    const toggleExpanded = () => expanded.value = !expanded.value
    const toggleQueue = () => showQueue.value = !showQueue.value
    const formatTime = (ts) => new Date(ts).toLocaleTimeString()

    const isConnected = computed(() => state.status === CONNECTION_STATUS.CONNECTED)

    return {
      state,
      label,
      statusClass,
      expanded,
      toggleExpanded,
      toggleQueue,
      formatTime,
      syncNow,
      retryConnection,
      tooltip,
      showQueue,
      isConnected
    }
  }
}
</script>

<style scoped>
.connection-status {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 6px 10px;
  background: #f7fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
}
.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.dot.green { background: #10b981; }
.dot.blue { background: #3b82f6; }
.dot.yellow { background: #f59e0b; }
.dot.red { background: #ef4444; }
.dot.gray { background: #9ca3af; }
.text { color: #2d3748; font-size: 0.9rem; }
.chevron { width: 14px; height: 14px; fill: #718096; transition: transform 0.2s; }
.chevron.rotated { transform: rotate(180deg); }
.panel {
  position: absolute;
  top: 110%;
  right: 0;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 0;
  z-index: 1001;
  min-width: 180px;
}
.dropdown-header {
  padding: 0.75rem 1rem 0.5rem 1rem;
  font-weight: 600;
  color: #2d3748;
  border-bottom: 1px solid #e2e8f0;
  font-size: 0.9rem;
}
.row {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.row.actions { 
  gap: 0;
  flex-direction: column;
}
.btn {
  background: white;
  border: none;
  border-radius: 0;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  cursor: pointer;
  color: #2d3748;
  transition: background-color 0.2s;
  text-align: left;
  width: 100%;
}
.btn:hover { background: #f7fafc; }
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  color: #9ca3af;
}
.btn:disabled:hover {
  background: white;
}
.error { 
  color: #ef4444; 
  font-size: 0.9rem; 
  padding: 0.5rem 1rem;
  background: #fef2f2;
  border-top: 1px solid #e2e8f0;
}
.dropdown-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
}
</style>


