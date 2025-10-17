<template>
  <div class="ai-command-panel" :class="{ 'is-focused': isFocused }" data-testid="ai-panel">
    <!-- Beta badge -->
    <div class="beta-badge">
      <span class="beta-text">AI Assistant</span>
      <span class="beta-label">BETA</span>
    </div>
    
    <!-- Main input area -->
    <div class="input-area">
      <input
        ref="commandInput"
        v-model="userInput"
        @focus="handleFocus"
        @blur="handleBlur"
        @keydown.enter="handleSendCommand"
        @keydown.up="navigateHistory(-1)"
        @keydown.down="navigateHistory(1)"
        :placeholder="isProcessing ? 'Processing...' : 'Type AI command (Cmd/Ctrl+J)'"
        :disabled="isProcessing"
        class="command-input"
        autocomplete="off"
        data-testid="ai-command-input"
      />
      <button
        @click="handleSendCommand"
        :disabled="isProcessing || !userInput.trim()"
        class="send-button"
        :title="isProcessing ? 'Processing...' : 'Send command'"
        data-testid="ai-submit-button"
      >
        <span v-if="!isProcessing">Send</span>
        <span v-else class="spinner"></span>
      </button>
    </div>

    <!-- Feedback message (success/error) -->
    <transition name="fade">
      <div v-if="currentMessage" class="feedback-message" :class="currentMessage.type" data-testid="ai-status">
        {{ currentMessage.text }}
      </div>
    </transition>

    <!-- Suggested commands (when focused and input is empty) -->
    <transition name="slide-down">
      <div
        v-if="isFocused && !userInput.trim() && !isProcessing"
        class="suggested-commands"
      >
        <div class="suggestions-header">💡 Example Commands</div>
        <div
          v-for="(suggestion, index) in suggestedCommands"
          :key="index"
          @click="selectSuggestion(suggestion.text)"
          class="suggestion-item"
        >
          <span class="suggestion-icon">{{ suggestion.icon }}</span>
          <span class="suggestion-text">{{ suggestion.text }}</span>
        </div>
      </div>
    </transition>

    <!-- Command history dropdown (when focused and has input or history) -->
    <transition name="slide-down">
      <div
        v-if="isFocused && commandHistory.length > 0 && userInput.trim() && !isProcessing"
        class="command-history"
      >
        <div class="history-header">Recent Commands</div>
        <div
          v-for="(cmd, index) in commandHistory.slice(0, 10)"
          :key="index"
          @click="selectHistoryCommand(cmd.input)"
          class="history-item"
          :class="{ 'history-item-error': !cmd.success }"
        >
          <span class="history-icon" :class="cmd.success ? 'success' : 'error'">
            {{ cmd.success ? '✓' : '✗' }}
          </span>
          <span class="history-text">{{ cmd.input }}</span>
          <span class="history-time">{{ formatTime(cmd.timestamp) }}</span>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, defineProps, defineEmits } from 'vue'
import { useAICommands } from '../composables/useAICommands'
import { useCommandExecutor } from '../composables/useCommandExecutor'

const props = defineProps({
  context: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['command-executed', 'utility-action'])

// Component state
const userInput = ref('')
const isFocused = ref(false)
const commandInput = ref(null)
const currentMessage = ref(null) // { type: 'success' | 'error', text: '...' }
const historyIndex = ref(-1)

// Suggested commands for users to learn the format
const suggestedCommands = [
  { icon: '▪', text: "add a text layer that says 'collab canvas'" },
  { icon: '▬', text: 'make a 200x300 rectangle' },
  { icon: '✕', text: 'delete all selected shapes' },
  { icon: '○', text: 'make the selected shape white' },
  { icon: '●', text: 'resize the circle to be twice as big' },
  { icon: '▲', text: 'move the selected shape up 40px' },
  { icon: '◼', text: 'create a grid of 3x3 squares' },
  { icon: '★', text: 'create a star made of circles' },
  { icon: '○', text: 'create a circle made of squares' },
]

// Composables
const { isProcessing, error: aiError, commandHistory, executeCommand: parseAICommand } = useAICommands()
const { executeCommand: executeCanvasCommand } = useCommandExecutor()

// Watch for AI parsing errors
watch(aiError, (newError) => {
  if (newError) {
    showMessage('error', newError, 5000)
  }
})

/**
 * Handle focus event
 */
const handleFocus = () => {
  isFocused.value = true
  historyIndex.value = -1
}

/**
 * Handle blur event (with small delay to allow clicks on history)
 */
const handleBlur = () => {
  setTimeout(() => {
    isFocused.value = false
  }, 200)
}

/**
 * Handle send command
 */
const handleSendCommand = async () => {
  if (!userInput.value.trim() || isProcessing.value) return

  const commandText = userInput.value.trim()
  userInput.value = '' // Clear input immediately
  historyIndex.value = -1

  try {
    // 1. Parse command using AI service (calls Cloud Function)
    const parsedCommand = await parseAICommand(commandText, props.context)

    // 2. Execute command on canvas
    const executionResult = await executeCanvasCommand(parsedCommand, props.context)

    // 3. Handle specific results
    if (parsedCommand.category === 'selection' && executionResult?.selectedIds) {
      emit('command-executed', {
        type: 'selection',
        selectedIds: executionResult.selectedIds,
      })
    } else if (parsedCommand.category === 'utility' && executionResult?.action) {
      emit('utility-action', executionResult.action, executionResult.amount)
    } else {
      emit('command-executed', {
        type: parsedCommand.category,
        result: executionResult,
      })
    }

    showMessage('success', `✓ ${commandText}`, 2000)
  } catch (err) {
    console.error('AI Command execution failed:', err)
    showMessage('error', err.message || 'Failed to execute command', 5000)
  }
}

/**
 * Show feedback message
 */
const showMessage = (type, text, duration) => {
  currentMessage.value = { type, text }
  if (duration) {
    setTimeout(() => {
      if (currentMessage.value?.text === text) {
        currentMessage.value = null
      }
    }, duration)
  }
}

/**
 * Select command from history
 */
const selectHistoryCommand = (command) => {
  userInput.value = command
  commandInput.value?.focus()
  isFocused.value = true
}

/**
 * Select a suggested command
 */
const selectSuggestion = (command) => {
  userInput.value = command
  commandInput.value?.focus()
  isFocused.value = true
}

/**
 * Navigate through command history with arrow keys
 */
const navigateHistory = (direction) => {
  if (commandHistory.value.length === 0) return

  const newIndex = historyIndex.value + direction

  if (newIndex < -1) {
    historyIndex.value = -1
    userInput.value = ''
  } else if (newIndex >= commandHistory.value.length) {
    historyIndex.value = commandHistory.value.length - 1
  } else {
    historyIndex.value = newIndex
    if (newIndex === -1) {
      userInput.value = ''
    } else {
      userInput.value = commandHistory.value[newIndex].input
    }
  }
}

/**
 * Format timestamp for display
 */
const formatTime = (timestamp) => {
  const diff = Date.now() - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return `${seconds}s ago`
}

/**
 * Handle keyboard shortcut (Cmd/Ctrl+J)
 */
const handleKeyDown = (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
    e.preventDefault()
    commandInput.value?.focus()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<style scoped>
.ai-command-panel {
  position: fixed;
  bottom: 20px;
  right: 320px; /* Above properties panel */
  width: 400px;
  background-color: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 100;
  transition: all 0.2s ease-in-out;
  border: 1px solid #e2e8f0;
}

/* Responsive positioning - stay on right side */
@media (max-width: 1200px) {
  .ai-command-panel {
    right: 270px; /* Adjust for narrower properties panel */
    width: 350px;
  }
}

@media (max-width: 768px) {
  .ai-command-panel {
    right: 1rem; /* Properties panel hidden, move to right edge */
    width: 280px;
    padding: 10px;
    bottom: 1rem;
  }
}

@media (max-width: 480px) {
  .ai-command-panel {
    right: 0.75rem;
    left: 0.75rem; /* Full width on very small screens */
    width: auto;
    bottom: 0.75rem;
    padding: 8px;
  }
}

.ai-command-panel.is-focused {
  background-color: rgba(255, 255, 255, 1);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  border-color: #2d2d2d;
}

.beta-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e2e8f0;
}

.beta-text {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}

.beta-label {
  display: inline-block;
  padding: 2px 6px;
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  color: #ffffff;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
  border-radius: 4px;
  text-transform: uppercase;
  box-shadow: 0 1px 3px rgba(245, 158, 11, 0.3);
}

.input-area {
  display: flex;
  gap: 8px;
}

.command-input {
  flex-grow: 1;
  padding: 10px 14px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: all 0.2s ease;
  background-color: #ffffff;
  color: #000000; /* Ensure typed text is black */
}

.command-input:focus {
  border-color: #2d2d2d;
  box-shadow: 0 0 0 3px rgba(45, 45, 45, 0.1);
}

.command-input::placeholder {
  color: #9ca3af;
}

.command-input:disabled {
  background-color: #f3f4f6;
  cursor: not-allowed;
  color: #6b7280;
}

.send-button {
  background: linear-gradient(135deg, #2d2d2d 0%, #000000 100%);
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 80px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.send-button:hover:not(:disabled) {
  background: linear-gradient(135deg, #1a1a1a 0%, #000000 100%);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  transform: translateY(-1px);
}

.send-button:active:not(:disabled) {
  transform: translateY(0);
}

.send-button:disabled {
  background: linear-gradient(135deg, #9ca3af 0%, #6b7280 100%);
  cursor: not-allowed;
  box-shadow: none;
}

/* Responsive input and button sizing */
@media (max-width: 768px) {
  .command-input {
    padding: 8px 12px;
    font-size: 13px;
  }
  
  .send-button {
    padding: 8px 16px;
    font-size: 13px;
    min-width: 70px;
  }
}

@media (max-width: 480px) {
  .command-input {
    padding: 7px 10px;
    font-size: 12px;
  }
  
  .send-button {
    padding: 7px 14px;
    font-size: 12px;
    min-width: 60px;
  }
  
  .beta-text {
    font-size: 12px;
  }
  
  .beta-label {
    font-size: 9px;
    padding: 1px 5px;
  }
}

.spinner {
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid #fff;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.feedback-message {
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
  animation: slideIn 0.2s ease-out;
}

.feedback-message.success {
  background-color: #d1fae5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}

.feedback-message.error {
  background-color: #fee2e2;
  color: #991b1b;
  border: 1px solid #fca5a5;
}

/* Responsive feedback message */
@media (max-width: 480px) {
  .feedback-message {
    padding: 8px 12px;
    font-size: 12px;
    gap: 6px;
  }
}

.suggested-commands {
  border-top: 1px solid #e2e8f0;
  padding-top: 10px;
  margin-top: 4px;
}

.suggestions-header {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: #6b7280;
  padding: 4px 8px;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.suggestion-item {
  padding: 10px 12px;
  cursor: pointer;
  font-size: 13px;
  color: #374151;
  border-radius: 6px;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 2px;
}

.suggestion-item:hover {
  background-color: #f9fafb;
  transform: translateX(2px);
}

.suggestion-icon {
  font-size: 16px;
  flex-shrink: 0;
  width: 20px;
  text-align: center;
}

.suggestion-text {
  flex: 1;
  color: #4b5563;
  font-style: italic;
}

/* Responsive suggestions */
@media (max-width: 480px) {
  .suggestion-item {
    padding: 8px 10px;
    font-size: 12px;
    gap: 8px;
  }
  
  .suggestion-icon {
    font-size: 14px;
    width: 18px;
  }
  
  .suggestions-header {
    font-size: 10px;
    padding: 3px 6px;
  }
}

.command-history {
  border-top: 1px solid #e2e8f0;
  padding-top: 10px;
  margin-top: 4px;
}

.history-header {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: #6b7280;
  padding: 4px 8px;
  letter-spacing: 0.5px;
}

.history-item {
  padding: 8px 10px;
  cursor: pointer;
  font-size: 13px;
  color: #374151;
  border-radius: 6px;
  transition: background-color 0.15s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.history-item:hover {
  background-color: #f3f4f6;
}

.history-item-error {
  opacity: 0.6;
}

.history-icon {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  flex-shrink: 0;
}

/* Responsive history */
@media (max-width: 480px) {
  .history-item {
    padding: 7px 8px;
    font-size: 12px;
    gap: 6px;
  }
  
  .history-icon {
    width: 16px;
    height: 16px;
    font-size: 11px;
  }
  
  .history-header {
    font-size: 10px;
    padding: 3px 6px;
  }
}

.history-icon.success {
  background-color: #d1fae5;
  color: #059669;
}

.history-icon.error {
  background-color: #fee2e2;
  color: #dc2626;
}

.history-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-time {
  font-size: 11px;
  color: #9ca3af;
  flex-shrink: 0;
}


/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.2s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
