<template>
  <div class="testing-panel" v-show="showPanel">
    <div class="panel-header">
      <h3>🧪 MVP Testing Dashboard</h3>
      <button @click="togglePanel" class="toggle-btn">{{ showPanel ? '−' : '+' }}</button>
    </div>
    
    <div class="panel-content" v-if="showPanel">
      <!-- Test Scenarios -->
      <div class="test-scenarios">
        <h4>Test Scenarios</h4>
        <div class="scenario-grid">
          <div 
            v-for="(scenario, key) in scenarios" 
            :key="key"
            :class="['scenario-card', getStatusClass(testResults[key]?.status)]"
            @click="runScenario(key)"
          >
            <div class="scenario-number">{{ scenario.number }}</div>
            <div class="scenario-info">
              <h5>{{ scenario.title }}</h5>
              <p>{{ scenario.description }}</p>
              <div class="scenario-status">
                <span :class="['status-badge', getStatusClass(testResults[key]?.status)]">
                  {{ getStatusText(testResults[key]?.status) }}
                </span>
                <span v-if="testResults[key]?.duration" class="duration">
                  {{ Math.round(testResults[key].duration / 1000) }}s
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Current Test Instructions -->
      <div v-if="currentInstructions" class="current-test">
        <h4>📋 Current Test: {{ getCurrentTestTitle() }}</h4>
        <div class="instructions">
          <pre>{{ currentInstructions.instructions }}</pre>
        </div>
        
        <div class="checklist">
          <h5>Checklist:</h5>
          <div 
            v-for="(item, index) in currentInstructions.checklist" 
            :key="index"
            class="checklist-item"
          >
            <input 
              type="checkbox" 
              :id="`check-${index}`"
              v-model="checklistState[index]"
            >
            <label :for="`check-${index}`">{{ item }}</label>
          </div>
        </div>

        <div class="test-actions">
          <button @click="markTestPassed" class="pass-btn" :disabled="!allChecked">
            ✅ Mark as Passed
          </button>
          <button @click="markTestFailed" class="fail-btn">
            ❌ Mark as Failed
          </button>
          <button @click="addIssue" class="issue-btn">
            ⚠️ Add Issue
          </button>
        </div>

        <!-- Issue Input -->
        <div v-if="showIssueInput" class="issue-input">
          <input 
            v-model="newIssue" 
            placeholder="Describe the issue..."
            @keyup.enter="saveIssue"
          >
          <button @click="saveIssue">Save</button>
          <button @click="showIssueInput = false">Cancel</button>
        </div>
      </div>

      <!-- Test Results Summary -->
      <div class="test-summary">
        <h4>📊 Test Results</h4>
        <div class="summary-stats">
          <div class="stat">
            <span class="stat-value">{{ passedCount }}</span>
            <span class="stat-label">Passed</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ failedCount }}</span>
            <span class="stat-label">Failed</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ pendingCount }}</span>
            <span class="stat-label">Pending</span>
          </div>
        </div>

        <div class="actions">
          <button @click="runAutomatedChecks" class="action-btn">
            🤖 Run Automated Checks
          </button>
          <button @click="generateReport" class="action-btn">
            📋 Generate Report
          </button>
          <button @click="resetTests" class="action-btn">
            🔄 Reset All Tests
          </button>
        </div>
      </div>

      <!-- Issues List -->
      <div v-if="allIssues.length > 0" class="issues-list">
        <h4>⚠️ Issues Found</h4>
        <div 
          v-for="(issue, index) in allIssues" 
          :key="index"
          class="issue-item"
        >
          <span class="issue-scenario">{{ issue.scenario }}</span>
          <span class="issue-text">{{ issue.text }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { useMVPTesting } from '../composables/useMVPTesting'

const {
  runScenario1,
  runScenario2,
  runScenario3,
  runScenario4,
  runScenario5,
  runScenario6,
  recordResult,
  generateTestReport,
  runAutomatedChecks,
  testResults,
  currentTest
} = useMVPTesting()

const showPanel = ref(false)
const currentInstructions = ref(null)
const checklistState = reactive({})
const showIssueInput = ref(false)
const newIssue = ref('')

const scenarios = {
  scenario1: {
    number: 1,
    title: 'Two-User Simultaneous Editing',
    description: 'Test real-time collaboration with 2 users'
  },
  scenario2: {
    number: 2,
    title: 'Mid-Edit Refresh',
    description: 'Test data persistence during refresh'
  },
  scenario3: {
    number: 3,
    title: 'Rapid Rectangle Creation',
    description: 'Test system under rapid creation load'
  },
  scenario4: {
    number: 4,
    title: 'Conflict Resolution',
    description: 'Test simultaneous editing of same rectangle'
  },
  scenario5: {
    number: 5,
    title: 'Disconnect/Reconnect',
    description: 'Test offline/online synchronization'
  },
  scenario6: {
    number: 6,
    title: 'Multi-User Scaling',
    description: 'Test system with 3-5 concurrent users'
  }
}

// Computed properties
const passedCount = computed(() => 
  Object.values(testResults).filter(r => r.passed).length
)

const failedCount = computed(() => 
  Object.values(testResults).filter(r => r.status === 'completed' && !r.passed).length
)

const pendingCount = computed(() => 
  Object.values(testResults).filter(r => r.status === 'pending').length
)

const allChecked = computed(() => {
  if (!currentInstructions.value?.checklist) return false
  return currentInstructions.value.checklist.every((_, index) => checklistState[index])
})

const allIssues = computed(() => {
  const issues = []
  Object.entries(testResults).forEach(([scenario, result]) => {
    result.issues.forEach(issue => {
      issues.push({ scenario, text: issue })
    })
  })
  return issues
})

// Methods
const togglePanel = () => {
  showPanel.value = !showPanel.value
}

const runScenario = (scenarioKey) => {
  const runners = {
    scenario1: runScenario1,
    scenario2: runScenario2,
    scenario3: runScenario3,
    scenario4: runScenario4,
    scenario5: runScenario5,
    scenario6: runScenario6
  }
  
  currentInstructions.value = runners[scenarioKey]()
  
  // Reset checklist
  Object.keys(checklistState).forEach(key => delete checklistState[key])
  currentInstructions.value.checklist.forEach((_, index) => {
    checklistState[index] = false
  })
}

const getCurrentTestTitle = () => {
  if (!currentTest.value) return ''
  return scenarios[currentTest.value]?.title || ''
}

const markTestPassed = () => {
  if (currentTest.value) {
    recordResult(currentTest.value, true, testResults[currentTest.value].issues)
    currentInstructions.value = null
  }
}

const markTestFailed = () => {
  if (currentTest.value) {
    recordResult(currentTest.value, false, testResults[currentTest.value].issues)
    currentInstructions.value = null
  }
}

const addIssue = () => {
  showIssueInput.value = true
}

const saveIssue = () => {
  if (newIssue.value.trim() && currentTest.value) {
    testResults[currentTest.value].issues.push(newIssue.value.trim())
    newIssue.value = ''
    showIssueInput.value = false
  }
}

const generateReport = () => {
  const report = generateTestReport()
  // Could save to file or display in modal
  // console.log('Report generated:', report)
}

const resetTests = () => {
  Object.keys(testResults).forEach(key => {
    testResults[key].status = 'pending'
    testResults[key].passed = false
    testResults[key].issues = []
    delete testResults[key].duration
  })
  currentInstructions.value = null
}

const getStatusClass = (status) => {
  switch (status) {
    case 'running': return 'running'
    case 'completed': return 'completed'
    default: return 'pending'
  }
}

const getStatusText = (status) => {
  switch (status) {
    case 'running': return 'Running'
    case 'completed': return 'Completed'
    default: return 'Pending'
  }
}

// Check for testing mode
const checkTestingMode = () => {
  const urlParams = new URLSearchParams(window.location.search)
  if (urlParams.get('testing') === 'true') {
    showPanel.value = true
  }
}

// Initialize
checkTestingMode()
</script>

<style scoped>
.testing-panel {
  position: fixed;
  top: 20px;
  left: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
  z-index: 1000;
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
  border-radius: 8px 8px 0 0;
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.toggle-btn {
  background: none;
  border: 1px solid #d1d5db;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
}

.panel-content {
  padding: 20px;
}

.scenario-grid {
  display: grid;
  gap: 12px;
  margin-bottom: 24px;
}

.scenario-card {
  display: flex;
  align-items: center;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.scenario-card:hover {
  border-color: #3b82f6;
  background: #f8fafc;
}

.scenario-card.running {
  border-color: #f59e0b;
  background: #fffbeb;
}

.scenario-card.completed {
  border-color: #10b981;
  background: #f0fdf4;
}

.scenario-number {
  width: 24px;
  height: 24px;
  background: #3b82f6;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  margin-right: 12px;
  flex-shrink: 0;
}

.scenario-info {
  flex: 1;
}

.scenario-info h5 {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 600;
}

.scenario-info p {
  margin: 0 0 8px 0;
  font-size: 12px;
  color: #6b7280;
}

.scenario-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-badge {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}

.status-badge.pending {
  background: #f3f4f6;
  color: #6b7280;
}

.status-badge.running {
  background: #fef3c7;
  color: #d97706;
}

.status-badge.completed {
  background: #dcfce7;
  color: #16a34a;
}

.duration {
  font-size: 11px;
  color: #6b7280;
}

.current-test {
  background: #f8fafc;
  padding: 16px;
  border-radius: 6px;
  margin-bottom: 24px;
}

.instructions {
  background: white;
  padding: 12px;
  border-radius: 4px;
  margin: 12px 0;
  border: 1px solid #e5e7eb;
}

.instructions pre {
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
  white-space: pre-wrap;
  font-family: inherit;
}

.checklist {
  margin: 16px 0;
}

.checklist h5 {
  margin: 0 0 8px 0;
  font-size: 14px;
}

.checklist-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.checklist-item input[type="checkbox"] {
  margin: 0;
}

.checklist-item label {
  font-size: 13px;
  cursor: pointer;
}

.test-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.pass-btn, .fail-btn, .issue-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}

.pass-btn {
  background: #10b981;
  color: white;
}

.pass-btn:disabled {
  background: #d1d5db;
  cursor: not-allowed;
}

.fail-btn {
  background: #ef4444;
  color: white;
}

.issue-btn {
  background: #f59e0b;
  color: white;
}

.issue-input {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.issue-input input {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 12px;
}

.issue-input button {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}

.test-summary {
  margin-bottom: 24px;
}

.summary-stats {
  display: flex;
  gap: 16px;
  margin: 12px 0;
}

.stat {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
}

.stat-label {
  font-size: 12px;
  color: #6b7280;
}

.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.action-btn {
  padding: 8px 12px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}

.issues-list {
  background: #fef2f2;
  padding: 16px;
  border-radius: 6px;
  border: 1px solid #fecaca;
}

.issue-item {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
  font-size: 13px;
}

.issue-scenario {
  font-weight: 600;
  color: #dc2626;
}

.issue-text {
  color: #374151;
}
</style>
