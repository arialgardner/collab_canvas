<template>
  <div class="grayscale-picker">
    <div class="color-grid">
      <button
        v-for="color in grayscaleColors"
        :key="color.hex"
        :style="{ backgroundColor: color.hex }"
        :class="['color-swatch', { selected: modelValue === color.hex }]"
        :title="color.label"
        @click="selectColor(color.hex)"
      >
        <span v-if="modelValue === color.hex" class="checkmark">✓</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['update:modelValue', 'input', 'change'])

// Define a comprehensive range of grayscale colors
const grayscaleColors = [
  { hex: '#ffffff', label: 'White' },
  { hex: '#f5f5f5', label: 'Off White' },
  { hex: '#eeeeee', label: 'Very Light Gray' },
  { hex: '#e0e0e0', label: 'Light Gray' },
  { hex: '#d4d4d4', label: 'Light Medium Gray' },
  { hex: '#bdbdbd', label: 'Medium Light Gray' },
  { hex: '#9e9e9e', label: 'Medium Gray' },
  { hex: '#808080', label: 'Gray' },
  { hex: '#707070', label: 'Medium Dark Gray' },
  { hex: '#616161', label: 'Dark Medium Gray' },
  { hex: '#4f4f4f', label: 'Dark Gray' },
  { hex: '#3d3d3d', label: 'Very Dark Gray' },
  { hex: '#2b2b2b', label: 'Near Black' },
  { hex: '#1a1a1a', label: 'Almost Black' },
  { hex: '#000000', label: 'Black' },
]

const selectColor = (hex) => {
  emit('update:modelValue', hex)
  emit('input', hex)
  emit('change', hex)
}
</script>

<style scoped>
.grayscale-picker {
  width: 100%;
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
}

.color-swatch {
  width: 100%;
  aspect-ratio: 1;
  border: 2px solid #d1d5db;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.color-swatch:hover {
  border-color: #000000;
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.color-swatch.selected {
  border-color: #000000;
  border-width: 3px;
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.2);
}

.checkmark {
  font-size: 16px;
  font-weight: bold;
  text-shadow: 0 0 2px rgba(255, 255, 255, 0.8), 0 0 4px rgba(0, 0, 0, 0.6);
  color: #000000;
}
</style>

