<template>
  <div v-if="isVisible" class="fps-monitor" :class="{ expanded: isExpanded }">
    <!-- Toggle Button -->
    <button @click="toggleExpanded" class="fps-toggle" :title="isExpanded ? 'Collapse' : 'Expand'">
      <span class="fps-value" :class="fpsClass">{{ currentFPS }} FPS</span>
      <span class="toggle-icon">{{ isExpanded ? '−' : '+' }}</span>
    </button>
    
    <!-- Expanded Details -->
    <div v-if="isExpanded" class="fps-details">
      <div class="fps-graph">
        <canvas ref="graphCanvas" width="200" height="60"></canvas>
      </div>
      
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-label">Avg FPS</span>
          <span class="stat-value">{{ avgFPS }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Min FPS</span>
          <span class="stat-value" :class="minFpsClass">{{ minFPS }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Frame Time</span>
          <span class="stat-value">{{ frameTime }}ms</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Shapes</span>
          <span class="stat-value">{{ shapeCount }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Visible</span>
          <span class="stat-value">{{ visibleCount }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Memory</span>
          <span class="stat-value">{{ memoryUsage }}MB</span>
        </div>
      </div>
      
      <div v-if="showWarning" class="performance-warning">
        ⚠️ Performance degraded - Consider reducing shape count
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'

const props = defineProps({
  shapeCount: {
    type: Number,
    default: 0
  },
  visibleCount: {
    type: Number,
    default: 0
  }
})

const isVisible = ref(false)
const isExpanded = ref(false)
const currentFPS = ref(60)
const avgFPS = ref(60)
const minFPS = ref(60)
const frameTime = ref(16)
const memoryUsage = ref(0)
const showWarning = ref(false)

const fpsHistory = ref([])
const MAX_HISTORY = 100

let lastFrameTime = performance.now()
let frameCount = 0
let fpsUpdateInterval = null
let rafId = null
let lowFpsTimer = null
const graphCanvas = ref(null)

// FPS color classes
const fpsClass = computed(() => {
  if (currentFPS.value >= 55) return 'fps-good'
  if (currentFPS.value >= 30) return 'fps-medium'
  return 'fps-poor'
})

const minFpsClass = computed(() => {
  if (minFPS.value >= 55) return 'fps-good'
  if (minFPS.value >= 30) return 'fps-medium'
  return 'fps-poor'
})

// Calculate FPS
const measureFPS = (timestamp) => {
  frameCount++
  const delta = timestamp - lastFrameTime
  
  if (delta >= 1000) {
    // Update FPS
    const fps = Math.round((frameCount * 1000) / delta)
    currentFPS.value = fps
    frameTime.value = Math.round(delta / frameCount)
    
    // Update history
    fpsHistory.value.push(fps)
    if (fpsHistory.value.length > MAX_HISTORY) {
      fpsHistory.value.shift()
    }
    
    // Calculate average
    const sum = fpsHistory.value.reduce((a, b) => a + b, 0)
    avgFPS.value = Math.round(sum / fpsHistory.value.length)
    
    // Track minimum
    minFPS.value = Math.min(...fpsHistory.value)
    
    // Check for performance issues
    if (fps < 30) {
      if (!lowFpsTimer) {
        lowFpsTimer = setTimeout(() => {
          showWarning.value = true
          console.warn('⚠️ Performance warning: FPS below 30 for extended period')
        }, 5000)
      }
    } else {
      if (lowFpsTimer) {
        clearTimeout(lowFpsTimer)
        lowFpsTimer = null
      }
      showWarning.value = false
    }
    
    // Update graph
    if (isExpanded.value) {
      drawGraph()
    }
    
    // Reset counters
    frameCount = 0
    lastFrameTime = timestamp
  }
  
  rafId = requestAnimationFrame(measureFPS)
}

// Update memory usage
const updateMemory = () => {
  if (performance.memory) {
    memoryUsage.value = Math.round(performance.memory.usedJSHeapSize / 1048576)
  }
}

// Draw FPS graph
const drawGraph = () => {
  if (!graphCanvas.value) return
  
  const canvas = graphCanvas.value
  const ctx = canvas.getContext('2d')
  const width = canvas.width
  const height = canvas.height
  
  // Clear canvas
  ctx.clearRect(0, 0, width, height)
  
  // Draw background
  ctx.fillStyle = '#1f2937'
  ctx.fillRect(0, 0, width, height)
  
  // Draw grid lines
  ctx.strokeStyle = '#374151'
  ctx.lineWidth = 1
  
  // Horizontal lines (FPS markers)
  const fpsMarkers = [60, 30, 15]
  fpsMarkers.forEach(fps => {
    const y = height - (fps / 60 * height)
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  })
  
  // Draw FPS line
  if (fpsHistory.value.length > 1) {
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 2
    ctx.beginPath()
    
    const step = width / MAX_HISTORY
    fpsHistory.value.forEach((fps, i) => {
      const x = i * step
      const y = height - (Math.min(fps, 60) / 60 * height)
      
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    
    ctx.stroke()
  }
  
  // Draw 60 FPS target line
  ctx.strokeStyle = '#10b981'
  ctx.lineWidth = 1
  ctx.setLineDash([5, 5])
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(width, 0)
  ctx.stroke()
  ctx.setLineDash([])
}

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
  if (isExpanded.value) {
    nextTick(() => {
      drawGraph()
    })
  }
}

// Keyboard shortcut: Shift+P to toggle
const handleKeyDown = (e) => {
  if (e.shiftKey && e.key === 'P') {
    isVisible.value = !isVisible.value
    if (!isVisible.value) {
      isExpanded.value = false
    }
  }
}

onMounted(() => {
  // Start FPS measurement
  rafId = requestAnimationFrame(measureFPS)
  
  // Update memory every 2 seconds
  fpsUpdateInterval = setInterval(updateMemory, 2000)
  
  // Keyboard shortcut
  window.addEventListener('keydown', handleKeyDown)
  
  // console.log('📊 FPS Monitor initialized (press Shift+P to toggle)')
})

onUnmounted(() => {
  if (rafId) {
    cancelAnimationFrame(rafId)
  }
  if (fpsUpdateInterval) {
    clearInterval(fpsUpdateInterval)
  }
  if (lowFpsTimer) {
    clearTimeout(lowFpsTimer)
  }
  window.removeEventListener('keydown', handleKeyDown)
})

// Redraw graph when expanded
watch(isExpanded, (expanded) => {
  if (expanded) {
    nextTick(() => {
      drawGraph()
    })
  }
})
</script>

<style scoped>
.fps-monitor {
  position: fixed;
  top: 80px;
  right: 20px;
  z-index: 9999;
  font-family: 'Monaco', 'Courier New', monospace;
  user-select: none;
}

.fps-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(17, 24, 39, 0.95);
  border: 1px solid #374151;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  color: white;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.fps-toggle:hover {
  background: rgba(31, 41, 55, 0.98);
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
}

.fps-value {
  font-size: 16px;
  font-weight: 700;
}

.fps-good { color: #10b981; }
.fps-medium { color: #f59e0b; }
.fps-poor { color: #ef4444; }

.toggle-icon {
  font-size: 18px;
  color: #9ca3af;
}

.fps-details {
  margin-top: 8px;
  padding: 16px;
  background: rgba(17, 24, 39, 0.95);
  border: 1px solid #374151;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  min-width: 240px;
}

.fps-graph {
  margin-bottom: 12px;
  border-radius: 4px;
  overflow: hidden;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 11px;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 16px;
  font-weight: 700;
  color: #f3f4f6;
}

.performance-warning {
  margin-top: 12px;
  padding: 8px 12px;
  background: #7c2d12;
  border: 1px solid #ea580c;
  border-radius: 6px;
  color: #fed7aa;
  font-size: 12px;
  text-align: center;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
</style>

