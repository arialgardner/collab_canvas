<template>
  <v-line
    :config="lineConfig"
    @click="handleClick"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @dragstart="handleDragStart"
    @dragmove="handleDragMove"
    @dragend="handleDragEnd"
  />
</template>

<script>
import { computed } from 'vue'

export default {
  name: 'Line',
  props: {
    line: {
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
  emits: ['update', 'select'],
  setup(props, { emit }) {
    // Configure Konva line
    const lineConfig = computed(() => ({
      id: props.line.id,
      points: props.line.points, // [x1, y1, x2, y2]
      stroke: props.line.stroke,
      strokeWidth: props.line.strokeWidth,
      rotation: props.line.rotation || 0,
      draggable: !props.disableDrag,
      // Line specific properties
      lineCap: 'round',
      lineJoin: 'round',
      // Visual feedback for selection
      shadowBlur: props.isSelected ? 10 : 0,
      shadowColor: props.isSelected ? '#000000' : 'transparent',
      shadowOpacity: props.isSelected ? 0.5 : 0,
      // Performance optimization
      listening: true,
      perfectDrawEnabled: false,
      // Hit area for easier selection
      hitStrokeWidth: Math.max(props.line.strokeWidth + 10, 15)
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
      emit('select', props.line.id, e.evt)
    }

    const handleDragStart = (e) => {
      emit('select', props.line.id, e.evt)
      
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
        id: props.line.id,
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
        id: props.line.id,
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

    return {
      lineConfig,
      handleMouseEnter,
      handleMouseLeave,
      handleClick,
      handleDragStart,
      handleDragMove,
      handleDragEnd
    }
  }
}
</script>

<style scoped>
/* No styles needed for Konva shapes */
</style>

