<template>
  <div 
    class="user-avatar"
    :style="avatarStyle"
    :title="`${userName} ${isActive ? '(active)' : ''}`"
  >
    {{ initials }}
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  userName: {
    type: String,
    required: true
  },
  cursorColor: {
    type: String,
    default: '#667eea'
  },
  size: {
    type: Number,
    default: 32
  },
  isActive: {
    type: Boolean,
    default: false
  }
})

// Generate initials from user name
const initials = computed(() => {
  if (!props.userName) return '?'
  
  const name = props.userName.trim()
  const parts = name.split(/\s+/)
  
  if (parts.length >= 2) {
    // First letter of first and last name
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  } else if (name.length >= 2) {
    // First two letters
    return name.substring(0, 2).toUpperCase()
  } else {
    return name[0]?.toUpperCase() || '?'
  }
})

const avatarStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  backgroundColor: props.cursorColor,
  fontSize: `${props.size * 0.4}px`,
  opacity: props.isActive ? 1 : 0.7
}))
</script>

<style scoped>
.user-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: white;
  font-weight: 600;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.user-avatar:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}
</style>

