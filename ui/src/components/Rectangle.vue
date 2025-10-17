<template>
      <v-rect
        ref="rectNode"
        :config="rectConfig"
        @click="handleClick"
        @mouseenter="handleMouseEnter"
        @mouseleave="handleMouseLeave"
        @dragstart="handleDragStart"
        @dragmove="handleDragMove"
        @dragend="handleDragEnd"
        :data-testid="`rectangle`"
        :data-rectangle-id="rectangle.id"
      />
</template>

<script>
import { computed, ref, watch } from 'vue'
import { calculateRectPositionAfterRotation } from '../utils/rotationUtils'

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
    const isHovered = ref(false)
    const isDragging = ref(false)
    const rectNode = ref(null)

    // Watch for rotation changes and apply them directly to the node
    // Also recalculate position to maintain visual center
    watch(() => props.rectangle.rotation, (newRotation, oldRotation) => {
      if (rectNode.value && newRotation !== undefined && newRotation !== oldRotation) {
        const node = rectNode.value.getNode()
        if (node) {
          // Calculate corrected position to maintain visual center
          const { x: newX, y: newY } = calculateRectPositionAfterRotation(
            props.rectangle.x,
            props.rectangle.y,
            props.rectangle.width,
            props.rectangle.height,
            newRotation
          )
          
          // Update node position and rotation (using center coordinates for Konva)
          node.x(newX + props.rectangle.width / 2)
          node.y(newY + props.rectangle.height / 2)
          node.rotation(newRotation)
          node.getLayer()?.batchDraw()
        }
      }
    })

    // Konva rectangle configuration
    const rectConfig = computed(() => ({
      id: props.rectangle.id,
      // Adjust position so offset keeps top-left at x,y (center is at x + width/2, y + height/2)
      x: props.rectangle.x + props.rectangle.width / 2,
      y: props.rectangle.y + props.rectangle.height / 2,
      width: props.rectangle.width,
      height: props.rectangle.height,
      fill: props.rectangle.fill,
      rotation: props.rectangle.rotation || 0,
      draggable: !props.disableDrag,
      // Rotate around center point
      offsetX: props.rectangle.width / 2,
      offsetY: props.rectangle.height / 2,
      
      // Visual feedback
      opacity: isDragging.value ? 0.8 : 1,
      stroke: (props.rectangle.__highlightUntil && Date.now() < props.rectangle.__highlightUntil)
        ? '#f59e0b'
        : (isHovered.value ? '#333' : 'transparent'),
      strokeWidth: (props.rectangle.__highlightUntil && Date.now() < props.rectangle.__highlightUntil) ? 3 : (isHovered.value ? 2 : 0),
      
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
      // Only change cursor to move if select tool is active
      if (props.activeTool === 'select') {
        const stage = e.target.getStage()
        stage.container().style.cursor = 'move'
      }
    }

    const handleMouseLeave = (e) => {
      if (!isDragging.value) {
        isHovered.value = false
        // Reset cursor based on active tool
        const stage = e.target.getStage()
        if (props.activeTool === 'pan') {
          stage.container().style.cursor = 'grab'
        } else {
          stage.container().style.cursor = 'default'
        }
      }
    }

    const handleClick = (e) => {
      // Emit select event on click (pass native event for shift key detection)
      emit('select', props.rectangle.id, e.evt)
    }
    
    const handleDragStart = (e) => {
      isDragging.value = true
      
      // Emit select event (pass native event for shift key detection)
      emit('select', props.rectangle.id, e.evt)
      
      // Bring to front during drag
      e.target.moveToTop()
      
      // Update cursor
      const stage = e.target.getStage()
      stage.container().style.cursor = 'grabbing'
    }

    const handleDragMove = (e) => {
      const node = e.target
      // Convert center position back to top-left (accounting for offset)
      const newX = node.x() - props.rectangle.width / 2
      const newY = node.y() - props.rectangle.height / 2

      // Emit update with new position (new format)
      emit('update', {
        id: props.rectangle.id,
        x: newX,
        y: newY
      })
    }

    const handleDragEnd = (e) => {
      isDragging.value = false
      isHovered.value = false
      
      const node = e.target
      // Convert center position back to top-left (accounting for offset)
      const finalX = node.x() - props.rectangle.width / 2
      const finalY = node.y() - props.rectangle.height / 2

      // Emit update with save flag (new format)
      emit('update', {
        id: props.rectangle.id,
        x: finalX,
        y: finalY,
        saveToFirestore: true
      })
      
      // Reset cursor
      const stage = e.target.getStage()
      stage.container().style.cursor = 'grab'
    }

    return {
      rectNode,
      rectConfig,
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
/* No styles needed - all styling handled by Konva */
</style>
