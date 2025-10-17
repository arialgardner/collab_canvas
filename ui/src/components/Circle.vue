<template>
  <v-circle
    :config="circleConfig"
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
  name: 'Circle',
  props: {
    circle: {
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
    // Configure Konva circle
    const circleConfig = computed(() => ({
      id: props.circle.id,
      x: props.circle.x,
      y: props.circle.y,
      radius: props.circle.radius,
      fill: props.circle.fill,
      stroke: props.circle.stroke || undefined,
      strokeWidth: props.circle.strokeWidth || 0,
      rotation: props.circle.rotation || 0,
      draggable: !props.disableDrag,
      // Transformer needs width/height for proper resize
      width: props.circle.radius * 2,
      height: props.circle.radius * 2,
      // Offset so transformer treats circle like a rectangle (top-left origin)
      offsetX: props.circle.radius,
      offsetY: props.circle.radius,
      // Visual feedback for selection / remote edit highlight
      shadowBlur: (props.isSelected || (props.circle.__highlightUntil && Date.now() < props.circle.__highlightUntil)) ? 10 : 0,
      shadowColor: (props.circle.__highlightUntil && Date.now() < props.circle.__highlightUntil) ? '#f59e0b' : (props.isSelected ? '#000000' : 'transparent'),
      shadowOpacity: (props.isSelected || (props.circle.__highlightUntil && Date.now() < props.circle.__highlightUntil)) ? 0.6 : 0,
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
      emit('select', props.circle.id, e.evt)
    }

    const handleDragStart = (e) => {
      emit('select', props.circle.id, e.evt)
      
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
        id: props.circle.id,
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
        id: props.circle.id,
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
      circleConfig,
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

