<template>
  <v-circle
    :config="circleConfig"
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
      draggable: true,
      // Visual feedback for selection
      shadowBlur: props.isSelected ? 10 : 0,
      shadowColor: props.isSelected ? '#3b82f6' : 'transparent',
      shadowOpacity: props.isSelected ? 0.5 : 0,
      // Performance optimization
      listening: true,
      perfectDrawEnabled: false
    }))

    const handleMouseEnter = (e) => {
      const stage = e.target.getStage()
      if (stage) {
        stage.container().style.cursor = 'move'
      }
    }

    const handleMouseLeave = (e) => {
      const stage = e.target.getStage()
      if (stage) {
        stage.container().style.cursor = 'default'
      }
    }

    const handleDragStart = () => {
      emit('select', props.circle.id)
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
    }

    return {
      circleConfig,
      handleMouseEnter,
      handleMouseLeave,
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

