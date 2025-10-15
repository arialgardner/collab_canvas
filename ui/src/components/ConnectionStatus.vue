<template>
  <div class="connection-status" @click="toggleExpanded" :title="tooltip">
    <span :class="['dot', statusClass]"></span>
    <span class="text">{{ label }}</span>
    <svg class="chevron" viewBox="0 0 20 20" :class="{ rotated: expanded }">
      <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/>
    </svg>

    <div v-if="expanded" class="panel">
      <div class="row">
        <span class="k">Queue</span>
        <span class="v">{{ state.queueLength }} ops</span>
      </div>
      <div class="row">
        <span class="k">Object Sync</span>
        <span class="v">avg {{ state.latency.object.avg }}ms</span>
      </div>
      <div class="row">
        <span class="k">Cursor Sync</span>
        <span class="v">avg {{ state.latency.cursor.avg }}ms</span>
      </div>
      <div class="row" v-if="state.lastSyncTime">
        <span class="k">Last Sync</span>
        <span class="v">{{ formatTime(state.lastSyncTime) }}</span>
      </div>
      <div class="row actions">
        <button class="btn" @click.stop="syncNow">Sync Now</button>
        <button class="btn" @click.stop="retryConnection">Retry</button>
        <button class="btn" @click.stop="toggleQueue">View Queue</button>
      </div>
      <div v-if="state.error" class="error">{{ state.error }}</div>
      <QueueViewer :is-visible="showQueue" @close="showQueue = false" />
    </div>
  </div>
</template>

<script>
import { computed, ref } from 'vue'
import { useConnectionState, CONNECTION_STATUS } from '../composables/useConnectionState'
import QueueViewer from './QueueViewer.vue'

export default {
  name: 'ConnectionStatus',
  setup() {
    const { state, syncNow, retryConnection } = useConnectionState()
    const expanded = ref(false)
    const showQueue = ref(false)

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
      showQueue
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
  min-width: 260px;
  padding: 10px;
  z-index: 1001;
}
.row {
  display: flex;
  justify-content: space-between;
  padding: 6px 4px;
  font-size: 12px;
}
.row.actions { gap: 6px; }
.btn {
  background: #edf2f7;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  padding: 6px 8px;
  font-size: 12px;
  cursor: pointer;
}
.btn:hover { background: #e2e8f0; }
.error { color: #ef4444; font-size: 12px; padding: 6px 4px; }
</style>


