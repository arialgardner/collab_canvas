<template>
  <div class="properties-panel" v-if="isVisible">
    <!-- No Selection - Canvas Info -->
    <div v-if="!hasSelection" class="panel-section">
      <h3 class="panel-title">Canvas</h3>
      <div class="property-group">
        <label class="property-label">Size</label>
        <div class="property-row">
          <div class="property-input-group">
            <label class="property-sublabel">Width</label>
            <input
              type="number"
              :value="canvasWidth"
              min="100"
              max="10000"
              readonly
              class="property-input readonly-arrows"
            />
          </div>
          <div class="property-input-group">
            <label class="property-sublabel">Height</label>
            <input
              type="number"
              :value="canvasHeight"
              min="100"
              max="10000"
              readonly
              class="property-input readonly-arrows"
            />
          </div>
        </div>
      </div>
      <div class="property-group">
        <div class="info-row">
          <span class="info-label">Total Shapes</span>
          <span class="info-value">{{ totalShapes }}</span>
        </div>
      </div>
    </div>

    <!-- Single Shape Selection -->
    <div v-else-if="selectedShapes.length === 1" class="panel-section">
      <h3 class="panel-title">{{ shapeTypeLabel }}</h3>
      <div class="property-group">
        <div class="info-row">
          <span class="info-label">Last Edited By</span>
          <span class="info-value">{{ lastEditedBy }}</span>
        </div>
      </div>
      
      <!-- Rectangle Properties -->
      <template v-if="selectedShapes[0].type === 'rectangle'">
        <div class="property-group">
          <label class="property-label">Position</label>
          <div class="property-row">
            <div class="property-input-group">
              <label class="property-sublabel">X</label>
              <input
                type="number"
                :value="Math.round(selectedShapes[0].x)"
                @input="handlePropertyChange('x', parseFloat($event.target.value))"
                min="0"
                :max="canvasWidth"
                readonly
                class="property-input readonly-arrows"
              />
            </div>
            <div class="property-input-group">
              <label class="property-sublabel">Y</label>
              <input
                type="number"
                :value="Math.round(selectedShapes[0].y)"
                @input="handlePropertyChange('y', parseFloat($event.target.value))"
                min="0"
                :max="canvasHeight"
                readonly
                class="property-input readonly-arrows"
              />
            </div>
          </div>
        </div>

        <div class="property-group">
          <label class="property-label">Size</label>
          <div class="property-row">
            <div class="property-input-group">
              <label class="property-sublabel">Width</label>
              <input
                type="number"
                :value="Math.round(selectedShapes[0].width)"
                @input="handlePropertyChange('width', parseFloat($event.target.value))"
                min="10"
                readonly
                class="property-input readonly-arrows"
              />
            </div>
            <div class="property-input-group">
              <label class="property-sublabel">Height</label>
              <input
                type="number"
                :value="Math.round(selectedShapes[0].height)"
                @input="handlePropertyChange('height', parseFloat($event.target.value))"
                min="10"
                readonly
                class="property-input readonly-arrows"
              />
            </div>
          </div>
        </div>

        <div class="property-group">
          <label class="property-label">Fill Color</label>
          <div class="property-row" style="grid-template-columns: 1fr; gap: 8px;">
            <GrayscaleColorPicker
              :modelValue="selectedShapes[0].fill"
              @input="onFillInput"
              @change="onFillChange"
            />
            <div v-if="mruFill.length" class="mru-section">
              <label class="mru-label">Recently Used</label>
              <div class="mru-row">
                <button v-for="c in mruFill" :key="'fill-'+c" class="mru-swatch" :style="{ backgroundColor: c }" :title="c" @click="applyFill(c)"></button>
              </div>
            </div>
          </div>
        </div>

        <div class="property-group">
          <label class="property-label">Rotation</label>
          <input
            type="number"
            :value="Math.round(selectedShapes[0].rotation || 0)"
            @input="handlePropertyChange('rotation', parseFloat($event.target.value) % 360)"
            min="0"
            max="360"
            class="property-input"
          />
          <span class="property-unit">degrees</span>
        </div>

        <div class="property-group">
          <label class="property-label">Z-Index</label>
          <input
            type="number"
            :value="selectedShapes[0].zIndex"
            readonly
            class="property-input readonly"
          />
        </div>
      </template>

      <!-- Circle Properties -->
      <template v-else-if="selectedShapes[0].type === 'circle'">
        <div class="property-group">
          <label class="property-label">Position (Center)</label>
          <div class="property-row">
            <div class="property-input-group">
              <label class="property-sublabel">X</label>
              <input
                type="number"
                :value="Math.round(selectedShapes[0].x)"
                @input="handlePropertyChange('x', parseFloat($event.target.value))"
                min="0"
                :max="canvasWidth"
                readonly
                class="property-input readonly-arrows"
              />
            </div>
            <div class="property-input-group">
              <label class="property-sublabel">Y</label>
              <input
                type="number"
                :value="Math.round(selectedShapes[0].y)"
                @input="handlePropertyChange('y', parseFloat($event.target.value))"
                min="0"
                :max="canvasHeight"
                readonly
                class="property-input readonly-arrows"
              />
            </div>
          </div>
        </div>

        <div class="property-group">
          <label class="property-label">Radius</label>
          <input
            type="number"
            :value="Math.round(selectedShapes[0].radius)"
            @input="handlePropertyChange('radius', parseFloat($event.target.value))"
            min="5"
            readonly
            class="property-input readonly-arrows"
          />
          <span class="property-unit">px</span>
        </div>

        <div class="property-group">
          <label class="property-label">Fill Color</label>
          <div class="property-row" style="grid-template-columns: 1fr; gap: 8px;">
            <GrayscaleColorPicker
              :modelValue="selectedShapes[0].fill"
              @input="onFillInput"
              @change="onFillChange"
            />
            <div v-if="mruFill.length" class="mru-section">
              <label class="mru-label">Recently Used</label>
              <div class="mru-row">
                <button v-for="c in mruFill" :key="'text-fill-'+c" class="mru-swatch" :style="{ backgroundColor: c }" :title="c" @click="applyFill(c)"></button>
              </div>
            </div>
          </div>
        </div>

        <div class="property-group">
          <label class="property-label">Z-Index</label>
          <input
            type="number"
            :value="selectedShapes[0].zIndex"
            readonly
            class="property-input readonly"
          />
        </div>
      </template>

      <!-- Line Properties -->
      <template v-else-if="selectedShapes[0].type === 'line'">
        <div class="property-group">
          <label class="property-label">Start Point</label>
          <div class="property-row">
            <div class="property-input-group">
              <label class="property-sublabel">X1</label>
              <input
                type="number"
                :value="Math.round(selectedShapes[0].points[0])"
                @input="handleLinePointChange(0, parseFloat($event.target.value))"
                min="0"
                :max="canvasWidth"
                readonly
                class="property-input readonly-arrows"
              />
            </div>
            <div class="property-input-group">
              <label class="property-sublabel">Y1</label>
              <input
                type="number"
                :value="Math.round(selectedShapes[0].points[1])"
                @input="handleLinePointChange(1, parseFloat($event.target.value))"
                min="0"
                :max="canvasHeight"
                readonly
                class="property-input readonly-arrows"
              />
            </div>
          </div>
        </div>

        <div class="property-group">
          <label class="property-label">End Point</label>
          <div class="property-row">
            <div class="property-input-group">
              <label class="property-sublabel">X2</label>
              <input
                type="number"
                :value="Math.round(selectedShapes[0].points[2])"
                @input="handleLinePointChange(2, parseFloat($event.target.value))"
                min="0"
                :max="canvasWidth"
                readonly
                class="property-input readonly-arrows"
              />
            </div>
            <div class="property-input-group">
              <label class="property-sublabel">Y2</label>
              <input
                type="number"
                :value="Math.round(selectedShapes[0].points[3])"
                @input="handleLinePointChange(3, parseFloat($event.target.value))"
                min="0"
                :max="canvasHeight"
                readonly
                class="property-input readonly-arrows"
              />
            </div>
          </div>
        </div>

        <div class="property-group">
          <label class="property-label">Stroke Color</label>
          <div class="property-row" style="grid-template-columns: 1fr; gap: 8px;">
            <GrayscaleColorPicker
              :modelValue="selectedShapes[0].stroke"
              @input="onStrokeInput"
              @change="onStrokeChange"
            />
            <div v-if="mruStroke.length" class="mru-section">
              <label class="mru-label">Recently Used</label>
              <div class="mru-row">
                <button v-for="c in mruStroke" :key="'line-stroke-'+c" class="mru-swatch" :style="{ backgroundColor: c }" :title="c" @click="applyStroke(c)"></button>
              </div>
            </div>
          </div>
        </div>

        <div class="property-group">
          <label class="property-label">Stroke Width</label>
          <input
            type="number"
            :value="selectedShapes[0].strokeWidth"
            @input="handlePropertyChange('strokeWidth', parseFloat($event.target.value))"
            @keydown="preventTyping"
            min="1"
            max="10"
            step="1"
            class="property-input readonly-arrows"
          />
          <span class="property-unit">px</span>
        </div>

        <div class="property-group">
          <label class="property-label">Rotation</label>
          <input
            type="number"
            :value="Math.round(selectedShapes[0].rotation || 0)"
            @input="handlePropertyChange('rotation', parseFloat($event.target.value) % 360)"
            min="0"
            max="360"
            class="property-input"
          />
          <span class="property-unit">degrees</span>
        </div>

        <div class="property-group">
          <label class="property-label">Z-Index</label>
          <input
            type="number"
            :value="selectedShapes[0].zIndex"
            readonly
            class="property-input readonly"
          />
        </div>
      </template>

      <!-- Text Properties -->
      <template v-else-if="selectedShapes[0].type === 'text'">
        <div class="property-group">
          <label class="property-label">Position</label>
          <div class="property-row">
            <div class="property-input-group">
              <label class="property-sublabel">X</label>
              <input
                type="number"
                :value="Math.round(selectedShapes[0].x)"
                @input="handlePropertyChange('x', parseFloat($event.target.value))"
                min="0"
                :max="canvasWidth"
                readonly
                class="property-input readonly-arrows"
              />
            </div>
            <div class="property-input-group">
              <label class="property-sublabel">Y</label>
              <input
                type="number"
                :value="Math.round(selectedShapes[0].y)"
                @input="handlePropertyChange('y', parseFloat($event.target.value))"
                min="0"
                :max="canvasHeight"
                readonly
                class="property-input readonly-arrows"
              />
            </div>
          </div>
        </div>

        <div class="property-group">
          <label class="property-label">Text Content</label>
          <textarea
            :value="selectedShapes[0].text"
            @input="handlePropertyChange('text', $event.target.value.slice(0, 300))"
            maxlength="300"
            rows="3"
            class="property-textarea"
          ></textarea>
          <span class="character-count">{{ selectedShapes[0].text.length }} / 300</span>
        </div>

        <div class="property-group">
          <label class="property-label">Font Size</label>
          <select
            :value="selectedShapes[0].fontSize"
            @change="handlePropertyChange('fontSize', parseInt($event.target.value))"
            class="property-select"
          >
            <option :value="12">12px</option>
            <option :value="14">14px</option>
            <option :value="16">16px</option>
            <option :value="18">18px</option>
            <option :value="24">24px</option>
            <option :value="32">32px</option>
            <option :value="48">48px</option>
          </select>
        </div>

        <div class="property-group">
          <label class="property-label">Font Family</label>
          <select
            :value="selectedShapes[0].fontFamily"
            @change="handlePropertyChange('fontFamily', $event.target.value)"
            class="property-select"
          >
            <option value="Arial">Arial</option>
            <option value="Helvetica">Helvetica</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Courier">Courier</option>
            <option value="Georgia">Georgia</option>
          </select>
        </div>

        <div class="property-group">
          <label class="property-label">Font Style</label>
          <div class="button-group">
            <button
              @click="handlePropertyChange('fontStyle', selectedShapes[0].fontStyle === 'bold' ? 'normal' : 'bold')"
              :class="{ active: selectedShapes[0].fontStyle === 'bold' }"
              class="style-button"
              title="Bold"
            >
              <strong>B</strong>
            </button>
            <button
              @click="handlePropertyChange('fontStyle', selectedShapes[0].fontStyle === 'italic' ? 'normal' : 'italic')"
              :class="{ active: selectedShapes[0].fontStyle === 'italic' }"
              class="style-button"
              title="Italic"
            >
              <em>I</em>
            </button>
          </div>
        </div>

        <div class="property-group">
          <label class="property-label">Text Alignment</label>
          <div class="button-group">
            <button
              @click="handlePropertyChange('align', 'left')"
              :class="{ active: selectedShapes[0].align === 'left' }"
              class="style-button"
              title="Left"
            >
              ⬅
            </button>
            <button
              @click="handlePropertyChange('align', 'center')"
              :class="{ active: selectedShapes[0].align === 'center' }"
              class="style-button"
              title="Center"
            >
              ↔
            </button>
            <button
              @click="handlePropertyChange('align', 'right')"
              :class="{ active: selectedShapes[0].align === 'right' }"
              class="style-button"
              title="Right"
            >
              ➡
            </button>
          </div>
        </div>

        <div class="property-group">
          <label class="property-label">Fill Color</label>
          <div class="property-row" style="grid-template-columns: 1fr; gap: 8px;">
            <GrayscaleColorPicker
              :modelValue="selectedShapes[0].fill"
              @input="onFillInput"
              @change="onFillChange"
            />
            <div v-if="mruFill.length" class="mru-section">
              <label class="mru-label">Recently Used</label>
              <div class="mru-row">
                <button v-for="c in mruFill" :key="'text-fill-'+c" class="mru-swatch" :style="{ backgroundColor: c }" :title="c" @click="applyFill(c)"></button>
              </div>
            </div>
          </div>
        </div>

        <div class="property-group">
          <label class="property-label">Rotation</label>
          <input
            type="number"
            :value="Math.round(selectedShapes[0].rotation || 0)"
            @input="handlePropertyChange('rotation', parseFloat($event.target.value) % 360)"
            min="0"
            max="360"
            class="property-input"
          />
          <span class="property-unit">degrees</span>
        </div>

        <div class="property-group" v-if="selectedShapes[0].width">
          <label class="property-label">Width (Optional)</label>
          <input
            type="number"
            :value="Math.round(selectedShapes[0].width)"
            @input="handlePropertyChange('width', parseFloat($event.target.value) || null)"
            min="20"
            readonly
            class="property-input readonly-arrows"
          />
          <span class="property-unit">px</span>
        </div>

        <div class="property-group">
          <label class="property-label">Z-Index</label>
          <input
            type="number"
            :value="selectedShapes[0].zIndex"
            readonly
            class="property-input readonly"
          />
        </div>
      </template>
    </div>

    <!-- Multi-Selection -->
    <div v-else class="panel-section">
      <h3 class="panel-title">{{ selectedShapes.length }} Shapes Selected</h3>
      
      <div class="property-group">
        <p class="multi-selection-hint">
          Common properties across all selected shapes can be edited here.
        </p>
      </div>

      <!-- Only show properties that are common to all selected shapes -->
      <div v-if="hasCommonProperty('fill')" class="property-group">
        <label class="property-label">Fill Color</label>
        <div class="property-row" style="grid-template-columns: 1fr; gap: 8px;">
          <GrayscaleColorPicker
            :modelValue="getCommonValue('fill')"
            @input="onBulkFillInput"
            @change="onBulkFillChange"
          />
          <div v-if="mruFill.length" class="mru-section">
            <label class="mru-label">Recently Used</label>
            <div class="mru-row">
              <button v-for="c in mruFill" :key="'bulk-fill-'+c" class="mru-swatch" :style="{ backgroundColor: c }" :title="c" @click="applyBulkFill(c)"></button>
            </div>
          </div>
        </div>
        <span v-if="!isValueConsistent('fill')" class="mixed-label">Mixed</span>
      </div>

      <div v-if="hasCommonProperty('stroke')" class="property-group">
        <label class="property-label">Stroke Color</label>
        <div class="property-row" style="grid-template-columns: 1fr; gap: 8px;">
          <GrayscaleColorPicker
            :modelValue="getCommonValue('stroke')"
            @input="onBulkStrokeInput"
            @change="onBulkStrokeChange"
          />
          <div v-if="mruStroke.length" class="mru-section">
            <label class="mru-label">Recently Used</label>
            <div class="mru-row">
              <button v-for="c in mruStroke" :key="'bulk-stroke-'+c" class="mru-swatch" :style="{ backgroundColor: c }" :title="c" @click="applyBulkStroke(c)"></button>
            </div>
          </div>
        </div>
        <span v-if="!isValueConsistent('stroke')" class="mixed-label">Mixed</span>
      </div>

      <div v-if="hasCommonProperty('strokeWidth') && areAllLines" class="property-group">
        <label class="property-label">Stroke Width</label>
        <input
          type="number"
          :value="getCommonValue('strokeWidth')"
          @input="handleBulkPropertyChange('strokeWidth', parseFloat($event.target.value))"
          @keydown="preventTyping"
          :class="{ 'property-input': true, 'readonly-arrows': true, mixed: !isValueConsistent('strokeWidth') }"
          min="1"
          max="10"
          step="1"
        />
        <span class="property-unit">px</span>
        <span v-if="!isValueConsistent('strokeWidth')" class="mixed-label">Mixed</span>
      </div>

      <div class="property-group">
        <div class="info-row">
          <span class="info-label">Shape Types</span>
          <span class="info-value">{{ uniqueShapeTypes }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue';
import { mruColors } from '../utils/mruColors'
import { calculateRectPositionAfterRotation } from '../utils/rotationUtils'
import GrayscaleColorPicker from './GrayscaleColorPicker.vue'

const props = defineProps({
  selectedShapes: {
    type: Array,
    required: true
  },
  canvasWidth: {
    type: Number,
    required: true
  },
  canvasHeight: {
    type: Number,
    required: true
  },
  totalShapes: {
    type: Number,
    required: true
  }
});

const emit = defineEmits(['update-property', 'bulk-update']);
// MRU state
const mruFill = ref([])
const mruStroke = ref([])

onMounted(() => {
  mruFill.value = mruColors.getFill()
  mruStroke.value = mruColors.getStroke()
})

const onFillInput = (value) => {
  // Live preview - update the shape immediately with debounce
  handlePropertyChange('fill', value)
}

const onFillChange = (value) => {
  // Only add to MRU when user finishes selecting (clicks away from picker)
  mruFill.value = mruColors.addFill(value)
}

const applyFill = (color) => {
  handlePropertyChange('fill', color)
  // Immediate MRU update when clicking a swatch
  mruFill.value = mruColors.addFill(color)
}

const onStrokeInput = (value) => {
  // Live preview - update the shape immediately with debounce
  handlePropertyChange('stroke', value)
}

const onStrokeChange = (value) => {
  // Only add to MRU when user finishes selecting (clicks away from picker)
  mruStroke.value = mruColors.addStroke(value)
}

const applyStroke = (color) => {
  handlePropertyChange('stroke', color)
  // Immediate MRU update when clicking a swatch
  mruStroke.value = mruColors.addStroke(color)
}

const onBulkFillInput = (value) => {
  // Live preview - update the shapes immediately with debounce
  handleBulkPropertyChange('fill', value)
}

const onBulkFillChange = (value) => {
  // Only add to MRU when user finishes selecting (clicks away from picker)
  mruFill.value = mruColors.addFill(value)
}

const applyBulkFill = (color) => {
  handleBulkPropertyChange('fill', color)
  // Immediate MRU update when clicking a swatch
  mruFill.value = mruColors.addFill(color)
}

const onBulkStrokeInput = (value) => {
  // Live preview - update the shapes immediately with debounce
  handleBulkPropertyChange('stroke', value)
}

const onBulkStrokeChange = (value) => {
  // Only add to MRU when user finishes selecting (clicks away from picker)
  mruStroke.value = mruColors.addStroke(value)
}

const applyBulkStroke = (color) => {
  handleBulkPropertyChange('stroke', color)
  // Immediate MRU update when clicking a swatch
  mruStroke.value = mruColors.addStroke(color)
}

const isVisible = computed(() => true); // Always visible for now

const hasSelection = computed(() => props.selectedShapes.length > 0);

const shapeTypeLabel = computed(() => {
  if (props.selectedShapes.length === 0) return '';
  const type = props.selectedShapes[0].type;
  return type.charAt(0).toUpperCase() + type.slice(1);
});

const lastEditedBy = computed(() => {
  if (props.selectedShapes.length !== 1) return ''
  const s = props.selectedShapes[0]
  if (!s.lastModifiedByName && !s.lastModifiedBy) return 'Unknown'
  return s.lastModifiedByName || s.lastModifiedBy || 'Unknown'
})

const uniqueShapeTypes = computed(() => {
  const types = [...new Set(props.selectedShapes.map(s => s.type))];
  return types.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(', ');
});

const areAllLines = computed(() => {
  return props.selectedShapes.length > 0 && props.selectedShapes.every(s => s.type === 'line');
});

// Debounce timers
let debounceTimer = null;
let mruDebounceTimer = null;

const handlePropertyChange = (property, value) => {
  if (props.selectedShapes.length === 0) return;
  
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    // Special handling for rectangle rotation - need to update x,y to maintain visual position
    if (property === 'rotation' && props.selectedShapes[0].type === 'rectangle') {
      const rect = props.selectedShapes[0]
      const { x: newX, y: newY } = calculateRectPositionAfterRotation(
        rect.x,
        rect.y,
        rect.width,
        rect.height,
        value
      )
      
      emit('update-property', {
        shapeId: rect.id,
        property,
        value,
        additionalUpdates: { x: newX, y: newY }
      });
    } else {
      emit('update-property', {
        shapeId: props.selectedShapes[0].id,
        property,
        value
      });
    }
  }, 300); // 300ms debounce for text inputs
};

const handleLinePointChange = (index, value) => {
  if (props.selectedShapes.length === 0 || props.selectedShapes[0].type !== 'line') return;
  
  const newPoints = [...props.selectedShapes[0].points];
  newPoints[index] = value;
  
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    emit('update-property', {
      shapeId: props.selectedShapes[0].id,
      property: 'points',
      value: newPoints
    });
  }, 300);
};

// Multi-selection helpers
const hasCommonProperty = (property) => {
  if (props.selectedShapes.length === 0) return false;
  return props.selectedShapes.every(shape => property in shape);
};

const getCommonValue = (property) => {
  if (props.selectedShapes.length === 0) return '';
  return props.selectedShapes[0][property];
};

const isValueConsistent = (property) => {
  if (props.selectedShapes.length <= 1) return true;
  const firstValue = props.selectedShapes[0][property];
  return props.selectedShapes.every(shape => shape[property] === firstValue);
};

const handleBulkPropertyChange = (property, value) => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    emit('bulk-update', {
      shapeIds: props.selectedShapes.map(s => s.id),
      property,
      value
    });
  }, 300);
};

const preventTyping = (event) => {
  // Allow: arrow keys, tab, backspace, delete
  const allowedKeys = ['ArrowUp', 'ArrowDown', 'Tab', 'Backspace', 'Delete'];
  
  if (allowedKeys.includes(event.key)) {
    return; // Allow these keys
  }
  
  // Prevent all other keys (typing numbers, letters, etc.)
  event.preventDefault();
};
</script>

<style scoped>
.properties-panel {
  position: fixed;
  right: 0;
  top: 70px; /* Below navbar */
  bottom: 0;
  width: 300px;
  background: #fff;
  border-left: 1px solid #e5e7eb;
  overflow-y: auto;
  padding: 20px;
  z-index: 99; /* Below navbar to avoid covering it */
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.05);
}

/* Responsive width for smaller screens */
@media (max-width: 1200px) {
  .properties-panel {
    width: 250px;
  }
}

/* Hide on very small screens or convert to overlay */
@media (max-width: 768px) {
  .properties-panel {
    display: none; /* Hide on mobile - could be toggled via button later */
  }
}

.panel-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.panel-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 8px 0;
  padding-bottom: 12px;
  border-bottom: 2px solid #000000;
}

.property-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.property-label {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.property-sublabel {
  font-size: 10px;
  font-weight: 500;
  color: #9ca3af;
  text-transform: uppercase;
}

.property-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.property-input-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.property-input {
  width: 100%;
  padding: 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.2s;
  color: #000000;
  background: #ffffff;
}

.property-input:focus {
  outline: none;
  border-color: #000000;
  box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.1);
}

.property-input.readonly {
  background: #f3f4f6;
  cursor: not-allowed;
  color: #000000;
}

.property-input.readonly-arrows {
  background: #f9fafb;
  cursor: default;
  color: #000000;
}

.property-input.mixed {
  border-color: #f59e0b;
  background: #fffbeb;
}

.property-color {
  width: 100%;
  height: 40px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  cursor: pointer;
  transition: border-color 0.2s;
}

.property-color:hover {
  border-color: #000000;
}

.mru-section {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #e5e7eb;
}

.mru-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: #6b7280;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}

.mru-row {
  display: flex;
  gap: 6px;
}

.mru-swatch {
  width: 24px;
  height: 24px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  cursor: pointer;
}

.property-select {
  width: 100%;
  padding: 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
  background: white;
  cursor: pointer;
  transition: border-color 0.2s;
  color: #000000;
}

.property-select:focus {
  outline: none;
  border-color: #000000;
  box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.1);
}

.property-textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  min-height: 60px;
  transition: border-color 0.2s;
  color: #000000;
}

.property-textarea:focus {
  outline: none;
  border-color: #000000;
  box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.1);
}

.property-unit {
  font-size: 12px;
  color: #6b7280;
  margin-left: 4px;
}

.character-count {
  font-size: 11px;
  color: #9ca3af;
  text-align: right;
}

.button-group {
  display: flex;
  gap: 8px;
}

.style-button {
  flex: 1;
  padding: 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  color: #000000;
}

.style-button:hover {
  border-color: #000000;
  background: #f3f4f6;
}

.style-button.active {
  border-color: #000000;
  background: #000000;
  color: white;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f3f4f6;
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
}

.info-value {
  font-size: 13px;
  color: #111827;
  font-weight: 600;
}

.multi-selection-hint {
  font-size: 13px;
  color: #6b7280;
  margin: 0;
  font-style: italic;
}

.mixed-label {
  font-size: 11px;
  color: #f59e0b;
  font-weight: 600;
  margin-top: 4px;
}

/* Scrollbar styling */
.properties-panel::-webkit-scrollbar {
  width: 8px;
}

.properties-panel::-webkit-scrollbar-track {
  background: #f3f4f6;
}

.properties-panel::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 4px;
}

.properties-panel::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

/* Responsive */
@media (max-width: 1200px) {
  .properties-panel {
    width: 250px;
  }
}

@media (max-width: 768px) {
  .properties-panel {
    width: 250px;
    padding-top: 90px; /* Adjusted for mobile navbar height */
  }
}
</style>

