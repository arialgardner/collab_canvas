<template>
  <div class="empty-state">
    <div class="empty-icon">
      <slot name="icon">
        {{ defaultIcon }}
      </slot>
    </div>
    <h3 class="empty-title">{{ title }}</h3>
    <p class="empty-message">{{ message }}</p>
    <div v-if="actionText" class="empty-action">
      <button @click="$emit('action')" class="action-button">
        {{ actionText }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  type: {
    type: String,
    default: 'default' // 'canvas', 'users', 'rectangles', 'default'
  },
  title: {
    type: String,
    default: ''
  },
  message: {
    type: String,
    default: ''
  },
  actionText: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['action'])

const defaultIcon = computed(() => {
  switch (props.type) {
    case 'canvas':
      return '🎨'
    case 'users':
      return '👥'
    case 'rectangles':
      return '📦'
    case 'offline':
      return '📡'
    default:
      return '📄'
  }
})

const defaultTitle = computed(() => {
  if (props.title) return props.title
  
  switch (props.type) {
    case 'canvas':
      return 'Empty Canvas'
    case 'users':
      return 'No Other Users'
    case 'rectangles':
      return 'No Rectangles Yet'
    case 'offline':
      return 'You\'re Offline'
    default:
      return 'Nothing Here'
  }
})

const defaultMessage = computed(() => {
  if (props.message) return props.message
  
  switch (props.type) {
    case 'canvas':
      return 'Click anywhere on the canvas to create your first rectangle'
    case 'users':
      return 'You\'re the only one here right now. Share the link to collaborate!'
    case 'rectangles':
      return 'Start creating rectangles by clicking on the canvas'
    case 'offline':
      return 'Some features may not work properly while offline'
    default:
      return 'There\'s nothing to show here yet'
  }
})
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 60px 20px;
  max-width: 400px;
  margin: 0 auto;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 24px;
  opacity: 0.6;
}

.empty-title {
  margin: 0 0 12px 0;
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
}

.empty-message {
  margin: 0 0 32px 0;
  font-size: 16px;
  color: #6b7280;
  line-height: 1.5;
  max-width: 300px;
}

.empty-action {
  margin-top: 8px;
}

.action-button {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-button:hover {
  background: #2563eb;
  transform: translateY(-1px);
}

.action-button:active {
  transform: translateY(0);
}

/* Responsive */
@media (max-width: 480px) {
  .empty-state {
    padding: 40px 16px;
  }
  
  .empty-icon {
    font-size: 40px;
    margin-bottom: 20px;
  }
  
  .empty-title {
    font-size: 18px;
  }
  
  .empty-message {
    font-size: 14px;
  }
}
</style>
