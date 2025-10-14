<template>
  <div 
    v-if="isVisible" 
    class="text-format-toolbar"
    :style="toolbarStyle"
    @mousedown.stop
  >
    <!-- Font Size -->
    <select 
      v-model="localFormat.fontSize" 
      class="toolbar-select"
      @change="emitChange"
    >
      <option :value="12">12</option>
      <option :value="14">14</option>
      <option :value="16">16</option>
      <option :value="18">18</option>
      <option :value="24">24</option>
      <option :value="32">32</option>
      <option :value="48">48</option>
    </select>

    <!-- Font Family -->
    <select 
      v-model="localFormat.fontFamily" 
      class="toolbar-select"
      @change="emitChange"
    >
      <option value="Arial">Arial</option>
      <option value="Helvetica">Helvetica</option>
      <option value="Times New Roman">Times New Roman</option>
      <option value="Courier">Courier</option>
      <option value="Georgia">Georgia</option>
    </select>

    <div class="toolbar-divider"></div>

    <!-- Bold -->
    <button
      :class="['toolbar-button', { active: isBold }]"
      @click="toggleBold"
      title="Bold"
    >
      <strong>B</strong>
    </button>

    <!-- Italic -->
    <button
      :class="['toolbar-button', { active: isItalic }]"
      @click="toggleItalic"
      title="Italic"
    >
      <em>I</em>
    </button>

    <div class="toolbar-divider"></div>

    <!-- Text Alignment -->
    <button
      :class="['toolbar-button', { active: localFormat.align === 'left' }]"
      @click="setAlign('left')"
      title="Align Left"
    >
      ⬅
    </button>
    <button
      :class="['toolbar-button', { active: localFormat.align === 'center' }]"
      @click="setAlign('center')"
      title="Align Center"
    >
      ↔
    </button>
    <button
      :class="['toolbar-button', { active: localFormat.align === 'right' }]"
      @click="setAlign('right')"
      title="Align Right"
    >
      ➡
    </button>

    <div class="toolbar-divider"></div>

    <!-- Color Picker -->
    <input
      type="color"
      v-model="localFormat.fill"
      class="toolbar-color"
      @input="emitChange"
      title="Text Color"
    />
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue'

export default {
  name: 'TextFormatToolbar',
  props: {
    isVisible: {
      type: Boolean,
      default: false
    },
    textShape: {
      type: Object,
      default: null
    },
    stagePosition: {
      type: Object,
      default: () => ({ x: 0, y: 0 })
    },
    stageScale: {
      type: Number,
      default: 1
    }
  },
  emits: ['format-change'],
  setup(props, { emit }) {
    const localFormat = ref({
      fontSize: 16,
      fontFamily: 'Arial',
      fontStyle: 'normal',
      align: 'left',
      fill: '#000000'
    })

    // Calculate toolbar position (below text shape)
    const toolbarStyle = computed(() => {
      if (!props.textShape) return {}
      
      const x = props.textShape.x * props.stageScale + props.stagePosition.x
      const y = (props.textShape.y + 40) * props.stageScale + props.stagePosition.y
      
      return {
        left: `${x}px`,
        top: `${y}px`
      }
    })

    // Computed properties for style toggles
    const isBold = computed(() => localFormat.value.fontStyle.includes('bold'))
    const isItalic = computed(() => localFormat.value.fontStyle.includes('italic'))

    // Watch for text shape changes
    watch(() => props.textShape, (newShape) => {
      if (newShape) {
        localFormat.value = {
          fontSize: newShape.fontSize,
          fontFamily: newShape.fontFamily,
          fontStyle: newShape.fontStyle,
          align: newShape.align,
          fill: newShape.fill
        }
      }
    }, { immediate: true })

    const toggleBold = () => {
      const styles = localFormat.value.fontStyle.split(' ')
      if (styles.includes('bold')) {
        localFormat.value.fontStyle = styles.filter(s => s !== 'bold').join(' ').trim() || 'normal'
      } else {
        localFormat.value.fontStyle = [...styles.filter(s => s !== 'normal'), 'bold'].join(' ')
      }
      emitChange()
    }

    const toggleItalic = () => {
      const styles = localFormat.value.fontStyle.split(' ')
      if (styles.includes('italic')) {
        localFormat.value.fontStyle = styles.filter(s => s !== 'italic').join(' ').trim() || 'normal'
      } else {
        localFormat.value.fontStyle = [...styles.filter(s => s !== 'normal'), 'italic'].join(' ')
      }
      emitChange()
    }

    const setAlign = (align) => {
      localFormat.value.align = align
      emitChange()
    }

    const emitChange = () => {
      emit('format-change', { ...localFormat.value })
    }

    return {
      localFormat,
      toolbarStyle,
      isBold,
      isItalic,
      toggleBold,
      toggleItalic,
      setAlign,
      emitChange
    }
  }
}
</script>

<style scoped>
.text-format-toolbar {
  position: fixed;
  z-index: 2001;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  background: white;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border: 1px solid #e5e7eb;
}

.toolbar-select {
  padding: 4px 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: white;
  font-size: 13px;
  cursor: pointer;
}

.toolbar-select:hover {
  border-color: #9ca3af;
}

.toolbar-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.15s;
}

.toolbar-button:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.toolbar-button.active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

.toolbar-divider {
  width: 1px;
  height: 20px;
  background: #d1d5db;
  margin: 0 4px;
}

.toolbar-color {
  width: 32px;
  height: 28px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  cursor: pointer;
  padding: 2px;
}

.toolbar-color:hover {
  border-color: #9ca3af;
}
</style>

