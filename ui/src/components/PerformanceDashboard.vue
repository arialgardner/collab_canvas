<template>
  <div v-if="isVisible" class="performance-dashboard">
    <div class="dashboard-header">
      <h3>Performance Dashboard</h3>
      <button @click="toggleExpanded" class="expand-btn">
        {{ isExpanded ? '▼' : '▲' }}
      </button>
      <button @click="close" class="close-btn">✕</button>
    </div>
    
    <div v-if="isExpanded" class="dashboard-content">
      <!-- Session Info -->
      <section class="metrics-section">
        <h4>Session</h4>
        <div class="metrics-grid">
          <div class="metric">
            <span class="metric-label">Uptime</span>
            <span class="metric-value">{{ report.session.uptime }}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Operations/min</span>
            <span class="metric-value">{{ report.session.operationsPerMinute }}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Peak Ops/min</span>
            <span class="metric-value">{{ report.session.peakOperationsPerMinute }}</span>
          </div>
        </div>
      </section>
      
      <!-- Latency Metrics -->
      <section class="metrics-section">
        <h4>Latency</h4>
        <div class="metrics-grid">
          <div class="metric" :class="getLatencyClass('average')">
            <span class="metric-label">Average</span>
            <span class="metric-value">{{ report.latency.average }}</span>
          </div>
          <div class="metric" :class="getLatencyClass('p50')">
            <span class="metric-label">P50</span>
            <span class="metric-value">{{ report.latency.p50 }}</span>
          </div>
          <div class="metric" :class="getLatencyClass('p95')">
            <span class="metric-label">P95</span>
            <span class="metric-value">{{ report.latency.p95 }}</span>
          </div>
          <div class="metric" :class="getLatencyClass('p99')">
            <span class="metric-label">P99</span>
            <span class="metric-value">{{ report.latency.p99 }}</span>
          </div>
        </div>
        <div class="metric-note">
          {{ report.latency.samplesCount }} samples
        </div>
      </section>
      
      <!-- Bandwidth Metrics -->
      <section class="metrics-section">
        <h4>Bandwidth</h4>
        <div class="metrics-grid">
          <div class="metric">
            <span class="metric-label">Total Sent</span>
            <span class="metric-value">{{ report.bandwidth.totalSent }}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Total Received</span>
            <span class="metric-value">{{ report.bandwidth.totalReceived }}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Sent/sec</span>
            <span class="metric-value">{{ report.bandwidth.sentPerSecond }}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Received/sec</span>
            <span class="metric-value">{{ report.bandwidth.receivedPerSecond }}</span>
          </div>
        </div>
      </section>
      
      <!-- Prediction Metrics -->
      <section class="metrics-section" v-if="report.prediction.total > 0">
        <h4>Client-Side Prediction</h4>
        <div class="metrics-grid">
          <div class="metric" :class="getPredictionClass()">
            <span class="metric-label">Accuracy</span>
            <span class="metric-value">{{ report.prediction.accuracy }}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Correct</span>
            <span class="metric-value">{{ report.prediction.correct }}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Rollbacks</span>
            <span class="metric-value">{{ report.prediction.rolledBack }}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Total</span>
            <span class="metric-value">{{ report.prediction.total }}</span>
          </div>
        </div>
      </section>
      
      <!-- OT Metrics -->
      <section class="metrics-section" v-if="report.ot.totalTransforms > 0">
        <h4>Operational Transform</h4>
        <div class="metrics-grid">
          <div class="metric">
            <span class="metric-label">Transforms</span>
            <span class="metric-value">{{ report.ot.totalTransforms }}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Conflicts</span>
            <span class="metric-value">{{ report.ot.conflictsDetected }}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Resolved</span>
            <span class="metric-value">{{ report.ot.conflictsResolved }}</span>
          </div>
          <div class="metric" :class="getConflictRateClass()">
            <span class="metric-label">Conflict Rate</span>
            <span class="metric-value">{{ report.ot.conflictRate }}</span>
          </div>
        </div>
        <div class="transforms-breakdown">
          <div class="metric-label">Transform Types:</div>
          <div class="transforms-list">
            <span>Position: {{ report.ot.transformsByType.position }}</span>
            <span>Size: {{ report.ot.transformsByType.size }}</span>
            <span>Rotation: {{ report.ot.transformsByType.rotation }}</span>
            <span>Style: {{ report.ot.transformsByType.style }}</span>
            <span>Composite: {{ report.ot.transformsByType.composite }}</span>
          </div>
        </div>
      </section>
      
      <!-- Performance Metrics -->
      <section class="metrics-section">
        <h4>Performance</h4>
        <div class="metrics-grid">
          <div class="metric" :class="getFPSClass()">
            <span class="metric-label">Average FPS</span>
            <span class="metric-value">{{ report.performance.averageFPS }}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Frame Drops</span>
            <span class="metric-value">{{ report.performance.frameDrops }}</span>
          </div>
        </div>
      </section>
      
      <!-- Actions -->
      <div class="dashboard-actions">
        <button @click="logReport" class="action-btn">Log to Console</button>
        <button @click="resetMetrics" class="action-btn">Reset Metrics</button>
      </div>
      
      <!-- Alerts -->
      <div v-if="alerts.length > 0" class="alerts-section">
        <h4>Alerts</h4>
        <div v-for="alert in alerts" :key="alert.id" class="alert" :class="alert.severity">
          <span class="alert-icon">⚠️</span>
          <span class="alert-message">{{ alert.message }}</span>
          <button @click="dismissAlert(alert.id)" class="dismiss-btn">✕</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { performanceMetrics } from '../composables/usePerformanceMetrics'

export default {
  name: 'PerformanceDashboard',
  
  setup() {
    const isVisible = ref(false)
    const isExpanded = ref(true)
    const report = ref({})
    const alerts = ref([])
    let updateInterval = null
    let alertCheckInterval = null
    let alertIdCounter = 0
    
    // Update report every second
    const updateReport = () => {
      report.value = performanceMetrics.getPerformanceReport()
      checkForAlerts()
    }
    
    // Check for performance issues and create alerts
    const checkForAlerts = () => {
      const r = report.value
      
      // Alert if object sync >200ms (2x target of 100ms)
      if (parseInt(r.latency.p95) > 200) {
        addAlert('high', `High latency detected: ${r.latency.p95} (target: <100ms)`)
      }
      
      // Alert if FPS <30
      if (r.performance.averageFPS < 30) {
        addAlert('high', `Low FPS: ${r.performance.averageFPS} (target: 60)`)
      }
      
      // Alert if prediction accuracy <90%
      if (r.prediction.total > 10 && parseInt(r.prediction.accuracy) < 90) {
        addAlert('medium', `Low prediction accuracy: ${r.prediction.accuracy} (target: >90%)`)
      }
      
      // Alert if conflict rate >20%
      if (r.ot.totalTransforms > 10 && parseInt(r.ot.conflictRate) > 20) {
        addAlert('medium', `High conflict rate: ${r.ot.conflictRate}`)
      }
    }
    
    // Add alert (avoid duplicates)
    const addAlert = (severity, message) => {
      const existingAlert = alerts.value.find(a => a.message === message)
      if (existingAlert) return
      
      alerts.value.push({
        id: alertIdCounter++,
        severity,
        message,
        timestamp: Date.now()
      })
      
      // Auto-dismiss after 10 seconds
      setTimeout(() => {
        alerts.value = alerts.value.filter(a => a.message !== message)
      }, 10000)
    }
    
    const dismissAlert = (id) => {
      alerts.value = alerts.value.filter(a => a.id !== id)
    }
    
    const toggleExpanded = () => {
      isExpanded.value = !isExpanded.value
    }
    
    const close = () => {
      isVisible.value = false
    }
    
    const logReport = () => {
      performanceMetrics.logPerformanceReport()
    }
    
    const resetMetrics = () => {
      if (confirm('Reset all performance metrics?')) {
        performanceMetrics.resetMetrics()
        updateReport()
      }
    }
    
    // CSS class helpers
    const getLatencyClass = (metric) => {
      const value = parseInt(report.value.latency[metric])
      if (value > 200) return 'metric-bad'
      if (value > 100) return 'metric-warning'
      return 'metric-good'
    }
    
    const getPredictionClass = () => {
      const accuracy = parseInt(report.value.prediction.accuracy)
      if (accuracy < 80) return 'metric-bad'
      if (accuracy < 90) return 'metric-warning'
      return 'metric-good'
    }
    
    const getConflictRateClass = () => {
      const rate = parseInt(report.value.ot.conflictRate)
      if (rate > 30) return 'metric-bad'
      if (rate > 20) return 'metric-warning'
      return 'metric-good'
    }
    
    const getFPSClass = () => {
      const fps = report.value.performance.averageFPS
      if (fps < 30) return 'metric-bad'
      if (fps < 50) return 'metric-warning'
      return 'metric-good'
    }
    
    onMounted(() => {
      // Update every second
      updateReport()
      updateInterval = setInterval(updateReport, 1000)
      
      // Check for alerts every 5 seconds
      alertCheckInterval = setInterval(checkForAlerts, 5000)
      
      // Expose toggle function globally
      window.togglePerformanceDashboard = () => {
        isVisible.value = !isVisible.value
      }
    })
    
    onUnmounted(() => {
      if (updateInterval) clearInterval(updateInterval)
      if (alertCheckInterval) clearInterval(alertCheckInterval)
    })
    
    return {
      isVisible,
      isExpanded,
      report,
      alerts,
      toggleExpanded,
      close,
      logReport,
      resetMetrics,
      dismissAlert,
      getLatencyClass,
      getPredictionClass,
      getConflictRateClass,
      getFPSClass
    }
  }
}
</script>

<style scoped>
.performance-dashboard {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 400px;
  max-height: 80vh;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #ccc;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-family: monospace;
  font-size: 12px;
  z-index: 10000;
  overflow: hidden;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #333;
  color: white;
  border-radius: 8px 8px 0 0;
}

.dashboard-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.expand-btn,
.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 16px;
  cursor: pointer;
  padding: 4px 8px;
}

.expand-btn:hover,
.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.dashboard-content {
  padding: 12px;
  max-height: calc(80vh - 50px);
  overflow-y: auto;
}

.metrics-section {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #eee;
}

.metrics-section h4 {
  margin: 0 0 8px 0;
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.metric {
  display: flex;
  flex-direction: column;
  padding: 8px;
  background: #f5f5f5;
  border-radius: 4px;
}

.metric-label {
  font-size: 10px;
  color: #666;
  margin-bottom: 4px;
}

.metric-value {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.metric-note {
  margin-top: 4px;
  font-size: 10px;
  color: #999;
  text-align: right;
}

.metric-good {
  background: #d4edda !important;
  border-left: 3px solid #28a745;
}

.metric-warning {
  background: #fff3cd !important;
  border-left: 3px solid #ffc107;
}

.metric-bad {
  background: #f8d7da !important;
  border-left: 3px solid #dc3545;
}

.transforms-breakdown {
  margin-top: 8px;
  padding: 8px;
  background: #f5f5f5;
  border-radius: 4px;
}

.transforms-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}

.transforms-list span {
  font-size: 11px;
  padding: 2px 6px;
  background: white;
  border-radius: 3px;
}

.dashboard-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.action-btn {
  flex: 1;
  padding: 8px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  font-weight: 600;
}

.action-btn:hover {
  background: #0056b3;
}

.alerts-section {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 2px solid #ddd;
}

.alert {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  margin-bottom: 8px;
  border-radius: 4px;
  font-size: 11px;
}

.alert.high {
  background: #f8d7da;
  border-left: 3px solid #dc3545;
  color: #721c24;
}

.alert.medium {
  background: #fff3cd;
  border-left: 3px solid #ffc107;
  color: #856404;
}

.alert-icon {
  font-size: 14px;
}

.alert-message {
  flex: 1;
}

.dismiss-btn {
  background: none;
  border: none;
  font-size: 14px;
  cursor: pointer;
  padding: 2px 6px;
  opacity: 0.6;
}

.dismiss-btn:hover {
  opacity: 1;
}
</style>

