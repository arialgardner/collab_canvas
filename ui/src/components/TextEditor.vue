<template>
  <div 
    v-if="isVisible" 
    class="text-editor-overlay"
    :style="editorStyle"
  >
    <textarea
      ref="textInput"
      v-model="localText"
      class="text-input"
      :style="textStyle"
      :maxlength="maxLength"
      @keydown.esc="handleCancel"
      @blur="handleBlur"
      @input="handleInput"
    />
    <div class="char-count">
      {{ localText.length }} / {{ maxLength }}
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'

export default {
  name: 'TextEditor',
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
    },
    maxLength: {
      type: Number,
      default: 300
    }
  },
  emits: ['save', 'cancel'],
  setup(props, { emit }) {
    const textInput = ref(null)
    const localText = ref('')

    // Calculate editor position based on shape position and stage transform
    // Position 20px below the text's y position
    const editorStyle = computed(() => {
      if (!props.textShape) return {}
      
      const x = props.textShape.x * props.stageScale + props.stagePosition.x
      const y = props.textShape.y * props.stageScale + props.stagePosition.y + 20
      
      return {
        left: `${x}px`,
        top: `${y}px`,
        transform: `scale(${props.stageScale})`
      }
    })

    // Match text style to shape
    const textStyle = computed(() => {
      if (!props.textShape) return {}
      
      return {
        fontSize: `${props.textShape.fontSize}px`,
        fontFamily: props.textShape.fontFamily,
        color: props.textShape.fill,
        fontWeight: props.textShape.fontStyle.includes('bold') ? 'bold' : 'normal',
        fontStyle: props.textShape.fontStyle.includes('italic') ? 'italic' : 'normal',
        textAlign: props.textShape.align,
        width: props.textShape.width ? `${props.textShape.width}px` : 'auto',
        minWidth: '100px'
      }
    })

    // Watch for visibility changes to focus input
    watch(() => props.isVisible, (newVal) => {
      if (newVal && props.textShape) {
        localText.value = props.textShape.text
        nextTick(() => {
          if (textInput.value) {
            textInput.value.focus()
            textInput.value.select()
          }
        })
      }
    })

    const handleInput = () => {
      // Enforce max length
      if (localText.value.length > props.maxLength) {
        localText.value = localText.value.substring(0, props.maxLength)
      }
    }

    const handleBlur = (e) => {
      // Add a small delay to check if focus is moving to the toolbar
      setTimeout(() => {
        // Check if the new focused element is part of the toolbar
        const activeElement = document.activeElement
        const isToolbarElement = activeElement?.closest('.text-format-toolbar')
        
        // Only save/close if not clicking on toolbar
        if (!isToolbarElement) {
          if (props.isVisible && localText.value.trim()) {
            emit('save', localText.value)
          } else if (props.isVisible) {
            emit('cancel')
          }
        }
      }, 100)
    }

    const handleCancel = () => {
      emit('cancel')
    }

    // Global click handler to close editor when clicking outside
    const handleGlobalClick = (e) => {
      if (!props.isVisible) return
      
      // Check if click is outside text editor and toolbar
      const isEditorClick = e.target.closest('.text-editor-overlay')
      const isToolbarClick = e.target.closest('.text-format-toolbar')
      
      if (!isEditorClick && !isToolbarClick) {
        // Save text if it has content, otherwise cancel
        if (localText.value.trim()) {
          emit('save', localText.value)
        } else {
          emit('cancel')
        }
      }
    }

    onMounted(() => {
      // Add click listener with capture phase to catch clicks before they bubble
      document.addEventListener('click', handleGlobalClick, true)
    })

    onUnmounted(() => {
      document.removeEventListener('click', handleGlobalClick, true)
    })

    return {
      textInput,
      localText,
      editorStyle,
      textStyle,
      handleInput,
      handleBlur,
      handleCancel
    }
  }
}
</script>

<style scoped>
.text-editor-overlay {
  position: fixed;
  z-index: 2000;
  transform-origin: top left;
  pointer-events: auto;
}

.text-input {
  display: block;
  padding: 4px 8px;
  border: 2px solid #3b82f6;
  border-radius: 4px;
  background: white;
  outline: none;
  resize: both;
  min-height: 30px;
  max-width: 600px;
  line-height: 1.2;
  overflow: auto;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.text-input:focus {
  border-color: #2563eb;
}

.char-count {
  position: absolute;
  bottom: -20px;
  right: 0;
  font-size: 11px;
  color: #6b7280;
  background: white;
  padding: 2px 6px;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
</style>

