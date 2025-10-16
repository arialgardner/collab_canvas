<template>
  <div class="toolbar">
    <div class="toolbar-group">
      <button
        v-for="tool in tools"
        :key="tool.name"
        :class="['tool-button', { active: activeTool === tool.name }]"
        :title="`${tool.label}`"
        @click="selectTool(tool.name)"
      >
        <span class="tool-icon">{{ tool.icon }}</span>
        <span class="tool-label">{{ tool.label }}</span>
      </button>
    </div>
    <div class="toolbar-group">
      <button
        class="tool-button"
        :disabled="!canUndo"
        title="Undo"
        @click="$emit('undo')"
      >
        <span class="tool-icon">↶</span>
        <span class="tool-label">Undo</span>
      </button>
      <button
        class="tool-button"
        :disabled="!canRedo"
        title="Redo"
        @click="$emit('redo')"
      >
        <span class="tool-icon">↷</span>
        <span class="tool-label">Redo</span>
      </button>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'

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
      { name: 'select', label: 'Select', icon: '↖' },
      { name: 'rectangle', label: 'Rectangle', icon: '▭' },
      { name: 'circle', label: 'Circle', icon: '○' },
      { name: 'line', label: 'Line', icon: '╱' },
      { name: 'text', label: 'Text', icon: 'T' }
    ]

    const selectTool = (toolName) => {
      activeTool.value = toolName
      emit('tool-selected', toolName)
    }

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
  background: #d1d5db;
  border: 2px solid #9ca3af;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 70px;
}

.tool-button:hover {
  background: #9ca3af;
  border-color: #6b7280;
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
}
</style>

