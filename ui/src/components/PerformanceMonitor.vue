<template>
  <div class="performance-monitor" v-show="showMonitor">
    <div class="monitor-header">
      <h4>🎯 Performance Monitor</h4>
      <button @click="toggleMonitor" class="toggle-btn">{{ showMonitor ? '−' : '+' }}</button>
    </div>
    
    <div class="monitor-content" v-if="showMonitor">
      <div class="metric-section">
        <h5>Rectangle Sync</h5>
        <div class="metric">
          <span class="label">Average:</span>
          <span :class="['value', stats.rectangleSync.average > stats.rectangleSync.target ? 'warning' : 'good']">
            {{ stats.rectangleSync.average }}ms
          </span>
          <span class="target">(target: {{ stats.rectangleSync.target }}ms)</span>
        </div>
        <div class="metric">
          <span class="label">Latest:</span>
          <span :class="['value', stats.rectangleSync.latest > stats.rectangleSync.target ? 'warning' : 'good']">
            {{ stats.rectangleSync.latest }}ms
          </span>
        </div>
      </div>

      <div class="metric-section">
        <h5>Cursor Sync</h5>
        <div class="metric">
          <span class="label">Average:</span>
          <span :class="['value', stats.cursorSync.average > stats.cursorSync.target ? 'warning' : 'good']">
            {{ stats.cursorSync.average }}ms
          </span>
          <span class="target">(target: {{ stats.cursorSync.target }}ms)</span>
        </div>
        <div class="metric">
          <span class="label">Latest:</span>
          <span :class="['value', stats.cursorSync.latest > stats.cursorSync.target ? 'warning' : 'good']">
            {{ stats.cursorSync.latest }}ms
          </span>
        </div>
      </div>

      <div class="metric-section">
        <h5>Rendering</h5>
        <div class="metric">
          <span class="label">Average:</span>
          <span :class="['value', stats.rendering.average > stats.rendering.target ? 'warning' : 'good']">
            {{ stats.rendering.average }}ms
          </span>
          <span class="target">(target: {{ stats.rendering.target }}ms)</span>
        </div>
      </div>

      <div class="metric-section">
        <h5>System</h5>
        <div class="metric">
          <span class="label">Firestore Ops:</span>
          <span class="value">{{ stats.system.firestoreOperations }}</span>
        </div>
        <div class="metric">
          <span class="label">Listeners:</span>
          <span class="value">{{ stats.system.activeListeners }}</span>
        </div>
      </div>

      <div class="actions">
        <button @click="logSummary" class="action-btn">Log Summary</button>
        <button @click="resetMetrics" class="action-btn">Reset</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { usePerformance } from '../composables/usePerformance'

const { getPerformanceStats, logPerformanceSummary } = usePerformance()

const showMonitor = ref(false)
const stats = ref({
  rectangleSync: { average: 0, latest: 0, target: 100, samples: 0 },
  cursorSync: { average: 0, latest: 0, target: 50, samples: 0 },
  rendering: { average: 0, latest: 0, target: 16, samples: 0 },
  system: { firestoreOperations: 0, activeListeners: 0 }
})

// Update stats every second
let updateInterval = null

const updateStats = () => {
  stats.value = getPerformanceStats()
}

const toggleMonitor = () => {
  showMonitor.value = !showMonitor.value
}

const logSummary = () => {
  logPerformanceSummary()
}

const resetMetrics = () => {
  // This would require adding reset functionality to usePerformance
  console.log('Reset metrics functionality would go here')
}

// Check for performance debug mode
const checkDebugMode = () => {
  // Show monitor if ?debug=performance is in URL
  const urlParams = new URLSearchParams(window.location.search)
  if (urlParams.get('debug') === 'performance') {
    showMonitor.value = true
  }
}

onMounted(() => {
  checkDebugMode()
  updateInterval = setInterval(updateStats, 1000)
  updateStats() // Initial update
})

onUnmounted(() => {
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
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 16px;
  border-radius: 8px;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  min-width: 280px;
  z-index: 1000;
  backdrop-filter: blur(10px);
}

.monitor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.monitor-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.toggle-btn {
  background: none;
  border: 1px solid #333;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.toggle-btn:hover {
  background: #333;
}

.metric-section {
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #333;
}

.metric-section:last-of-type {
  border-bottom: none;
}

.metric-section h5 {
  margin: 0 0 8px 0;
  font-size: 12px;
  color: #ccc;
  font-weight: 500;
}

.metric {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.label {
  color: #aaa;
  min-width: 80px;
}

.value {
  font-weight: 600;
  min-width: 50px;
  text-align: right;
}

.value.good {
  color: #4ade80;
}

.value.warning {
  color: #f97316;
}

.target {
  color: #666;
  font-size: 10px;
  margin-left: 8px;
}

.actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.action-btn {
  background: #333;
  border: 1px solid #555;
  color: white;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  flex: 1;
}

.action-btn:hover {
  background: #444;
}
</style>
