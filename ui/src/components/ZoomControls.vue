<template>
  <div class="zoom-controls">
    <div class="zoom-display">
      {{ Math.round(zoom * 100) }}%
    </div>
    
    <button 
      @click="$emit('zoom-in')"
      class="zoom-button"
      title="Zoom In"
    >
      <svg class="zoom-icon" viewBox="0 0 24 24">
        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
      </svg>
    </button>
    
    <button 
      @click="$emit('zoom-out')"
      class="zoom-button"
      title="Zoom Out"
    >
      <svg class="zoom-icon" viewBox="0 0 24 24">
        <path d="M19 13H5v-2h14v2z"/>
      </svg>
    </button>
    
    <button 
      @click="$emit('zoom-reset')"
      class="zoom-button reset"
      title="Reset Zoom (100%)"
    >
      <svg class="zoom-icon" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
      </svg>
    </button>
  </div>
</template>

<script>
export default {
  name: 'ZoomControls',
  props: {
    zoom: {
      type: Number,
      required: true
    }
  },
  emits: ['zoom-in', 'zoom-out', 'zoom-reset']
}
</script>

<style scoped>
.zoom-controls {
  position: fixed;
  bottom: 2rem;
  left: 2rem; /* Move to bottom-left to avoid AI panel on right */
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  z-index: 1000;
  background: white;
  border-radius: 8px;
  padding: 0.75rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border: 1px solid #e2e8f0;
}

.zoom-display {
  text-align: center;
  font-size: 0.9rem;
  font-weight: 600;
  color: #4a5568;
  padding: 0.25rem 0;
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 0.25rem;
}

.zoom-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 6px;
  background: #f7fafc;
  color: #4a5568;
  cursor: pointer;
  transition: all 0.2s;
  padding: 0;
}

.zoom-button:hover {
  background: #667eea;
  color: white;
}

.zoom-button.reset:hover {
  background: #48bb78;
}

.zoom-button:active {
  transform: translateY(1px);
}

.zoom-icon {
  width: 20px;
  height: 20px;
  fill: currentColor;
}

/* Responsive adjustments - keep small and in corner */
@media (max-width: 1200px) {
  .zoom-controls {
    padding: 0.5rem;
    gap: 0.375rem;
  }
  
  .zoom-display {
    font-size: 0.75rem;
    padding: 0.2rem 0;
  }
  
  .zoom-button {
    width: 32px;
    height: 32px;
  }
  
  .zoom-icon {
    width: 18px;
    height: 18px;
  }
}

@media (max-width: 768px) {
  .zoom-controls {
    bottom: 1rem;
    left: 1rem;
    padding: 0.4rem;
    gap: 0.3rem;
    border-radius: 6px;
  }
  
  .zoom-display {
    font-size: 0.7rem;
    padding: 0.15rem 0;
    margin-bottom: 0.15rem;
  }
  
  .zoom-button {
    width: 28px;
    height: 28px;
  }
  
  .zoom-icon {
    width: 16px;
    height: 16px;
  }
}

/* Very small screens - even more compact */
@media (max-width: 480px) {
  .zoom-controls {
    bottom: 0.75rem;
    left: 0.75rem;
    padding: 0.3rem;
    gap: 0.25rem;
  }
  
  .zoom-display {
    font-size: 0.65rem;
    padding: 0.1rem 0;
  }
  
  .zoom-button {
    width: 26px;
    height: 26px;
  }
  
  .zoom-icon {
    width: 14px;
    height: 14px;
  }
}
</style>
