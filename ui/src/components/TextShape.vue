<template>
  <v-text
    :config="textConfig"
    @click="handleClick"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @dragstart="handleDragStart"
    @dragmove="handleDragMove"
    @dragend="handleDragEnd"
    @dblclick="handleDoubleClick"
  />
</template>

<script>
import { computed } from 'vue'

export default {
  name: 'TextShape',
  props: {
    text: {
      type: Object,
      required: true
    },
    isSelected: {
      type: Boolean,
      default: false
    },
    disableDrag: {
      type: Boolean,
      default: false
    },
    activeTool: {
      type: String,
      default: 'select'
    }
  },
  emits: ['update', 'select', 'edit'],
  setup(props, { emit }) {
    // Configure Konva text
    const textConfig = computed(() => ({
      id: props.text.id,
      x: props.text.x,
      y: props.text.y,
      text: props.text.text,
      fontSize: props.text.fontSize,
      fontFamily: props.text.fontFamily,
      fill: props.text.fill,
      fontStyle: props.text.fontStyle,
      align: props.text.align,
      width: props.text.width || undefined,
      rotation: props.text.rotation || 0,
      draggable: !props.disableDrag,
      // Visual feedback for selection
      shadowBlur: props.isSelected ? 10 : 0,
      shadowColor: props.isSelected ? '#000000' : 'transparent',
      shadowOpacity: props.isSelected ? 0.5 : 0,
      // Performance optimization
      listening: true,
      perfectDrawEnabled: false
    }))

    const handleMouseEnter = (e) => {
      // Only change cursor to move if select tool is active
      if (props.activeTool === 'select') {
        const stage = e.target.getStage()
        if (stage) {
          stage.container().style.cursor = 'move'
        }
      }
    }

    const handleMouseLeave = (e) => {
      const stage = e.target.getStage()
      if (stage) {
        // Reset cursor based on active tool
        if (props.activeTool === 'pan') {
          stage.container().style.cursor = 'grab'
        } else {
          stage.container().style.cursor = 'default'
        }
      }
    }

    const handleClick = (e) => {
      emit('select', props.text.id, e.evt)
    }

    const handleDragStart = (e) => {
      emit('select', props.text.id, e.evt)
      
      // Update cursor to grabbing during drag
      const stage = e.target.getStage()
      if (stage) {
        stage.container().style.cursor = 'grabbing'
      }
    }

    const handleDragMove = (e) => {
      const node = e.target
      const newX = node.x()
      const newY = node.y()

      // Emit update with new position
      emit('update', {
        id: props.text.id,
        x: newX,
        y: newY
      })
    }

    const handleDragEnd = (e) => {
      const node = e.target
      const finalX = node.x()
      const finalY = node.y()

      // Emit update with save flag
      emit('update', {
        id: props.text.id,
        x: finalX,
        y: finalY,
        saveToFirestore: true
      })
      
      // Reset cursor after drag
      const stage = e.target.getStage()
      if (stage) {
        if (props.activeTool === 'pan') {
          stage.container().style.cursor = 'grab'
        } else if (props.activeTool === 'select') {
          stage.container().style.cursor = 'move'
        } else {
          stage.container().style.cursor = 'default'
        }
      }
    }

    const handleDoubleClick = () => {
      // Emit edit event to open text editor
      emit('edit', props.text.id)
    }

    return {
      textConfig,
      handleMouseEnter,
      handleMouseLeave,
      handleClick,
      handleDragStart,
      handleDragMove,
      handleDragEnd,
      handleDoubleClick
    }
  }
}
</script>

<style scoped>
/* No styles needed for Konva shapes */
</style>

