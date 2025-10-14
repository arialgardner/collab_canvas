<template>
  <v-rect
    :config="rectConfig"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @dragstart="handleDragStart"
    @dragmove="handleDragMove"
    @dragend="handleDragEnd"
  />
</template>

<script>
import { computed, ref } from 'vue'

export default {
  name: 'Rectangle',
  props: {
    rectangle: {
      type: Object,
      required: true
    },
    onUpdate: {
      type: Function,
      default: () => {}
    }
  },
  emits: ['update'],
  setup(props, { emit }) {
    const isHovered = ref(false)
    const isDragging = ref(false)

    // Konva rectangle configuration
    const rectConfig = computed(() => ({
      id: props.rectangle.id,
      x: props.rectangle.x,
      y: props.rectangle.y,
      width: props.rectangle.width,
      height: props.rectangle.height,
      fill: props.rectangle.fill,
      draggable: true,
      
      // Visual feedback
      opacity: isDragging.value ? 0.8 : 1,
      stroke: isHovered.value ? '#333' : 'transparent',
      strokeWidth: isHovered.value ? 2 : 0,
      
      // Performance optimizations
      listening: true, // Keep listening for interactions
      perfectDrawEnabled: false, // Faster drawing
      shadowForStrokeEnabled: false, // Disable expensive shadows
      hitStrokeWidth: 0, // No hit area expansion
      transformsEnabled: 'position' // Only position transforms
    }))

    // Event handlers
    const handleMouseEnter = (e) => {
      isHovered.value = true
      // Change cursor to move
      const stage = e.target.getStage()
      stage.container().style.cursor = 'move'
    }

    const handleMouseLeave = (e) => {
      if (!isDragging.value) {
        isHovered.value = false
        // Reset cursor
        const stage = e.target.getStage()
        stage.container().style.cursor = 'grab'
      }
    }

    const handleDragStart = (e) => {
      isDragging.value = true
      
      // Bring to front during drag
      e.target.moveToTop()
      
      // Update cursor
      const stage = e.target.getStage()
      stage.container().style.cursor = 'grabbing'
    }

    const handleDragMove = (e) => {
      // Optimistic update - update position locally immediately
      const newPos = {
        x: e.target.x(),
        y: e.target.y()
      }
      
      // Emit update for parent to handle
      emit('update', props.rectangle.id, newPos)
    }

    const handleDragEnd = (e) => {
      isDragging.value = false
      isHovered.value = false
      
      // Final position update
      const finalPos = {
        x: e.target.x(),
        y: e.target.y()
      }
      
      // Emit final update
      emit('update', props.rectangle.id, finalPos, true) // true indicates drag end
      
      // Reset cursor
      const stage = e.target.getStage()
      stage.container().style.cursor = 'grab'
    }

    return {
      rectConfig,
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
/* No styles needed - all styling handled by Konva */
</style>
