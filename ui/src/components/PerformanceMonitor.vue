<template>
  <div class="performance-monitor" v-show="isVisible">
    <div class="monitor-header">
      <h4>🎯 Performance Monitor (v3)</h4>
      <div class="header-actions">
        <button @click="toggleCollapsed" class="toggle-btn">{{ isCollapsed ? '+' : '−' }}</button>
        <button @click="closeMonitor" class="close-btn">×</button>
      </div>
    </div>
    
    <div class="monitor-content" v-if="!isCollapsed">
      <!-- Object Sync Section -->
      <div class="metric-section">
        <h5>📦 Object Sync (Target: &lt;100ms)</h5>
        <div class="metric">
          <span class="label">Average:</span>
          <span :class="['value', `status-${stats.objectSync.status}`]">
            {{ stats.objectSync.avg }}ms
          </span>
        </div>
        <div class="metric">
          <span class="label">Min / Max:</span>
          <span class="value">{{ stats.objectSync.min }}ms / {{ stats.objectSync.max }}ms</span>
        </div>
        <div class="metric">
          <span class="label">Samples:</span>
          <span class="value">{{ stats.objectSync.count }}</span>
        </div>
        <div class="metric" v-if="stats.objectSync.violations > 0">
          <span class="label">Violations:</span>
          <span class="value status-red">{{ stats.objectSync.violations }}</span>
        </div>
      </div>

      <!-- Cursor Sync Section -->
      <div class="metric-section">
        <h5>🖱️ Cursor Sync (Target: &lt;50ms)</h5>
        <div class="metric">
          <span class="label">Average:</span>
          <span :class="['value', `status-${stats.cursorSync.status}`]">
            {{ stats.cursorSync.avg }}ms
          </span>
        </div>
        <div class="metric">
          <span class="label">Min / Max:</span>
          <span class="value">{{ stats.cursorSync.min }}ms / {{ stats.cursorSync.max }}ms</span>
        </div>
        <div class="metric">
          <span class="label">Samples:</span>
          <span class="value">{{ stats.cursorSync.count }}</span>
        </div>
        <div class="metric" v-if="stats.cursorSync.violations > 0">
          <span class="label">Violations:</span>
          <span class="value status-red">{{ stats.cursorSync.violations }}</span>
        </div>
      </div>

      <!-- FPS Section -->
      <div class="metric-section">
        <h5>🖥️ FPS (Target: 60 FPS)</h5>
        <div class="metric">
          <span class="label">Current:</span>
          <span :class="['value', `status-${stats.fps.status}`]">
            {{ stats.fps.current }} FPS
          </span>
        </div>
        <div class="metric">
          <span class="label">Average:</span>
          <span class="value">{{ stats.fps.avg }} FPS</span>
        </div>
        <div class="metric" v-if="stats.fps.violations > 0">
          <span class="label">Drops &lt;30:</span>
          <span class="value status-red">{{ stats.fps.violations }}</span>
        </div>
      </div>

      <!-- Firestore Section -->
      <div class="metric-section">
        <h5>🔥 Firestore Operations</h5>
        <div class="metric">
          <span class="label">Total Ops:</span>
          <span class="value">{{ stats.firestore.operations }}</span>
        </div>
        <div class="metric">
          <span class="label">Reads:</span>
          <span class="value">{{ stats.firestore.reads }}</span>
        </div>
        <div class="metric">
          <span class="label">Writes:</span>
          <span class="value">{{ stats.firestore.writes }}</span>
        </div>
        <div class="metric">
          <span class="label">Deletes:</span>
          <span class="value">{{ stats.firestore.deletes }}</span>
        </div>
        <div class="metric">
          <span class="label">Listeners:</span>
          <span class="value">{{ stats.firestore.listeners }}</span>
        </div>
        <div class="metric" v-if="stats.firestore.errors > 0">
          <span class="label">Errors:</span>
          <span class="value status-red">{{ stats.firestore.errors }}</span>
        </div>
      </div>

      <!-- Shapes Section -->
      <div class="metric-section">
        <h5>📐 Shapes</h5>
        <div class="metric">
          <span class="label">In Memory:</span>
          <span class="value">{{ stats.shapes.inMemory }}</span>
        </div>
        <div class="metric">
          <span class="label">Rendered:</span>
          <span class="value">{{ stats.shapes.rendered }}</span>
        </div>
        <div class="metric">
          <span class="label">Created:</span>
          <span class="value">{{ stats.shapes.created }}</span>
        </div>
        <div class="metric">
          <span class="label">Deleted:</span>
          <span class="value">{{ stats.shapes.deleted }}</span>
        </div>
      </div>

      <!-- Network Section -->
      <div class="metric-section">
        <h5>🌐 Network</h5>
        <div class="metric">
          <span class="label">Est. RTT:</span>
          <span class="value">{{ stats.network.estimatedRTT }}ms</span>
        </div>
        <div class="metric" v-if="stats.network.lastPingTime">
          <span class="label">Last Ping:</span>
          <span class="value">{{ formatTime(stats.network.lastPingTime) }}</span>
        </div>
      </div>

      <!-- Actions -->
      <div class="actions">
        <button @click="logSummary" class="action-btn">📊 Log Summary</button>
        <button @click="handleReset" class="action-btn">🔄 Reset</button>
      </div>
      
      <div class="hint">Press Shift+P to toggle</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { usePerformanceMonitoring } from '../composables/usePerformanceMonitoring'

const { 
  performanceStats, 
  logPerformanceSummary, 
  resetMetrics,
  startFPSTracking,
  stopFPSTracking
} = usePerformanceMonitoring()

const isVisible = ref(false)
const isCollapsed = ref(false)
const stats = computed(() => performanceStats.value)

// Update stats every second
let updateInterval = null

const toggleMonitor = () => {
  isVisible.value = !isVisible.value
}

const toggleCollapsed = () => {
  isCollapsed.value = !isCollapsed.value
}

const closeMonitor = () => {
  isVisible.value = false
}

const logSummary = () => {
  logPerformanceSummary()
}

const handleReset = () => {
  if (confirm('Reset all performance metrics?')) {
    resetMetrics()
  }
}

// Format timestamp
const formatTime = (timestamp) => {
  if (!timestamp) return 'N/A'
  const date = new Date(timestamp)
  return date.toLocaleTimeString()
}

// Check for performance debug mode
const checkDebugMode = () => {
  const urlParams = new URLSearchParams(window.location.search)
  if (urlParams.get('debug') === 'performance') {
    isVisible.value = true
  }
}

// Keyboard shortcut handler
const handleKeyDown = (e) => {
  // Shift+P to toggle monitor
  if (e.shiftKey && e.key === 'P') {
    e.preventDefault()
    toggleMonitor()
  }
}

onMounted(() => {
  checkDebugMode()
  
  // Start FPS tracking
  startFPSTracking()
  
  // Add keyboard listener
  window.addEventListener('keydown', handleKeyDown)
  
  // console.log('💡 Performance Monitor loaded - Press Shift+P to toggle')
})

onUnmounted(() => {
  // Stop FPS tracking
  stopFPSTracking()
  
  // Remove keyboard listener
  window.removeEventListener('keydown', handleKeyDown)
  
  if (updateInterval) {
    clearInterval(updateInterval)
  }
})
</script>

<style scoped>
.performance-monitor {
  position: fixed;
  top: 80px;
  right: 20px;
  background: rgba(0, 0, 0, 0.92);
  color: white;
  padding: 16px;
  border-radius: 8px;
  font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
  font-size: 11px;
  min-width: 320px;
  max-width: 380px;
  max-height: 80vh;
  overflow-y: auto;
  z-index: 9999;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.monitor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 2px solid #333;
}

.monitor-header h4 {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.header-actions {
  display: flex;
  gap: 6px;
}

.toggle-btn, .close-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  transition: all 0.2s;
}

.toggle-btn:hover, .close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
}

.metric-section {
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.metric-section:last-of-type {
  border-bottom: none;
}

.metric-section h5 {
  margin: 0 0 10px 0;
  font-size: 11px;
  color: #bbb;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.metric {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  padding: 2px 0;
}

.label {
  color: #999;
  font-size: 11px;
  flex: 1;
}

.value {
  font-weight: 600;
  font-size: 12px;
  text-align: right;
  font-family: 'Monaco', 'Menlo', monospace;
}

/* Status Colors */
.value.status-green {
  color: #4ade80;
}

.value.status-yellow {
  color: #fbbf24;
}

.value.status-red {
  color: #f87171;
}

.value.status-gray {
  color: #6b7280;
}

.actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.action-btn {
  background: rgba(59, 130, 246, 0.2);
  border: 1px solid rgba(59, 130, 246, 0.4);
  color: #93c5fd;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  flex: 1;
  font-weight: 600;
  transition: all 0.2s;
}

.action-btn:hover {
  background: rgba(59, 130, 246, 0.3);
  border-color: rgba(59, 130, 246, 0.6);
  color: #bfdbfe;
}

.hint {
  text-align: center;
  color: #666;
  font-size: 10px;
  margin-top: 12px;
  font-style: italic;
}

/* Scrollbar Styling */
.performance-monitor::-webkit-scrollbar {
  width: 6px;
}

.performance-monitor::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
}

.performance-monitor::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.performance-monitor::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
