<template>
  <div class="toolbar">
    <div class="toolbar-group">
      <button
        v-for="tool in tools"
        :key="tool.name"
        :class="['tool-button', { active: activeTool === tool.name }]"
        :title="`${tool.label} (${tool.shortcut})`"
        @click="selectTool(tool.name)"
      >
        <span class="tool-icon">{{ tool.icon }}</span>
        <span class="tool-label">{{ tool.label }}</span>
        <span class="tool-shortcut">{{ tool.shortcut }}</span>
      </button>
    </div>
    <div class="toolbar-group">
      <button
        class="tool-button"
        :disabled="!canUndo"
        title="Undo (Cmd/Ctrl+Z)"
        @click="$emit('undo')"
      >
        <span class="tool-icon">↶</span>
        <span class="tool-label">Undo</span>
        <span class="tool-shortcut">⌘Z</span>
      </button>
      <button
        class="tool-button"
        :disabled="!canRedo"
        title="Redo (Cmd/Ctrl+Shift+Z)"
        @click="$emit('redo')"
      >
        <span class="tool-icon">↷</span>
        <span class="tool-label">Redo</span>
        <span class="tool-shortcut">⇧⌘Z</span>
      </button>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue'

export default {
  name: 'Toolbar',
  props: {
    canUndo: { type: Boolean, default: false },
    canRedo: { type: Boolean, default: false }
  },
  emits: ['tool-selected', 'undo', 'redo'],
  setup(props, { emit }) {
    const activeTool = ref('select')
    
    const tools = [
      { name: 'select', label: 'Select', icon: '↖', shortcut: 'V' },
      { name: 'rectangle', label: 'Rectangle', icon: '▭', shortcut: 'R' },
      { name: 'circle', label: 'Circle', icon: '○', shortcut: 'C' },
      { name: 'line', label: 'Line', icon: '╱', shortcut: 'L' },
      { name: 'text', label: 'Text', icon: 'T', shortcut: 'T' }
    ]

    const selectTool = (toolName) => {
      activeTool.value = toolName
      emit('tool-selected', toolName)
    }

    const handleKeyPress = (event) => {
      // Ignore if user is typing in an input field
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return
      }

      const key = event.key.toUpperCase()
      
      // ESC key resets to select tool
      if (key === 'ESCAPE') {
        selectTool('select')
        return
      }

      // Tool shortcuts
      const toolMap = {
        'V': 'select',
        'R': 'rectangle',
        'C': 'circle',
        'L': 'line',
        'T': 'text'
      }

      if (toolMap[key]) {
        selectTool(toolMap[key])
      }
    }

    onMounted(() => {
      window.addEventListener('keydown', handleKeyPress)
    })

    onUnmounted(() => {
      window.removeEventListener('keydown', handleKeyPress)
    })

    return {
      activeTool,
      tools,
      selectTool
    }
  }
}
</script>

<style scoped>
.toolbar {
  position: fixed;
  top: 90px; /* Position below navbar (70px) + 20px margin */
  left: 50%;
  transform: translateX(-50%);
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  padding: 8px;
  display: flex;
  gap: 8px;
  z-index: 100; /* Above canvas but below navbar */
}

.toolbar-group {
  display: flex;
  gap: 4px;
}

.tool-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 12px;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 70px;
}

.tool-button:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.tool-button.active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

.tool-icon {
  font-size: 20px;
  line-height: 1;
}

.tool-label {
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.tool-shortcut {
  font-size: 9px;
  opacity: 0.6;
  font-weight: 600;
}

.tool-button.active .tool-shortcut {
  opacity: 0.8;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .toolbar {
    top: 70px;
    padding: 6px;
  }

  .tool-button {
    min-width: 60px;
    padding: 6px 10px;
  }

  .tool-icon {
    font-size: 18px;
  }

  .tool-label {
    font-size: 10px;
  }

  .tool-shortcut {
    font-size: 8px;
  }
}
</style>

