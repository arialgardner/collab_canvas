<template>
  <div 
    class="user-cursor" 
    :style="cursorStyle"
  >
    <!-- Cursor Icon (SVG Arrow) -->
    <svg 
      class="cursor-icon" 
      viewBox="0 0 24 24" 
      :style="{ fill: cursor.cursorColor }"
    >
      <path d="M12 2l3.09 6.26L22 9l-5.91 4.74L18 22l-6-3.27L6 22l1.91-8.26L2 9l6.91-.74L12 2z"/>
    </svg>
    
    <!-- User Name Label -->
    <div 
      class="cursor-label"
      :style="{ backgroundColor: cursor.cursorColor }"
    >
      {{ cursor.userName }}
    </div>
  </div>
</template>

<script>
import { computed, ref, watch } from 'vue'

export default {
  name: 'UserCursor',
  props: {
    cursor: {
      type: Object,
      required: true
    },
    stageAttrs: {
      type: Object,
      default: () => ({})
    }
  },
  setup(props) {
    const cursorElement = ref(null)
    
    // Convert canvas coordinates to screen coordinates for positioning
    const screenPosition = computed(() => {
      const canvasX = props.cursor.x || 0
      const canvasY = props.cursor.y || 0
      
      const scaleX = props.stageAttrs.scaleX || 1
      const scaleY = props.stageAttrs.scaleY || 1
      const offsetX = props.stageAttrs.x || 0
      const offsetY = props.stageAttrs.y || 0
      
      const screenX = canvasX * scaleX + offsetX
      const screenY = canvasY * scaleY + offsetY
      
      return { x: screenX, y: screenY }
    })
    
    // Cursor positioning style
    const cursorStyle = computed(() => ({
      position: 'fixed',
      left: `${screenPosition.value.x}px`,
      top: `${screenPosition.value.y}px`,
      pointerEvents: 'none',
      zIndex: 1000,
      transform: 'translate(-2px, -2px)', // Slight offset for better positioning
      transition: 'left 0.1s ease-out, top 0.1s ease-out' // Smooth movement
    }))
    
    return {
      cursorStyle,
      cursorElement
    }
  }
}
</script>

<style scoped>
.user-cursor {
  position: fixed;
  pointer-events: none;
  user-select: none;
}

.cursor-icon {
  width: 20px;
  height: 20px;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
}

.cursor-label {
  position: absolute;
  top: 22px;
  left: 8px;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  min-width: 0;
}

/* Ensure cursor is visible on all backgrounds */
.cursor-label::before {
  content: '';
  position: absolute;
  top: -4px;
  left: 8px;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-bottom: 4px solid currentColor;
  opacity: 0.8;
}

/* Animation for cursor appearance */
.user-cursor {
  animation: cursorAppear 0.2s ease-out;
}

@keyframes cursorAppear {
  from {
    opacity: 0;
    transform: translate(-2px, -2px) scale(0.8);
  }
  to {
    opacity: 1;
    transform: translate(-2px, -2px) scale(1);
  }
}

/* Hide cursor when too close to edges */
.user-cursor.near-edge {
  opacity: 0.7;
}
</style>
