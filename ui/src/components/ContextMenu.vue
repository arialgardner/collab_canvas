<template>
  <div 
    v-if="isVisible"
    class="context-menu"
    :style="{
      top: `${position.y}px`,
      left: `${position.x}px`
    }"
    @click.stop
  >
    <template v-if="hasSelection">
      <!-- Layer Operations -->
      <div class="menu-section">
        <div class="menu-item" @click="handleBringToFront">
          <span class="menu-icon">⬆️</span>
          <span class="menu-label">Bring to Front</span>
          <span class="menu-shortcut">⌘]</span>
        </div>
        <div class="menu-item" @click="handleBringForward">
          <span class="menu-icon">↑</span>
          <span class="menu-label">Bring Forward</span>
          <span class="menu-shortcut">⌘⇧]</span>
        </div>
        <div class="menu-item" @click="handleSendBackward">
          <span class="menu-icon">↓</span>
          <span class="menu-label">Send Backward</span>
          <span class="menu-shortcut">⌘⇧[</span>
        </div>
        <div class="menu-item" @click="handleSendToBack">
          <span class="menu-icon">⬇️</span>
          <span class="menu-label">Send to Back</span>
          <span class="menu-shortcut">⌘[</span>
        </div>
      </div>
      
      <div class="menu-divider"></div>
      
      <!-- Object Operations -->
      <div class="menu-section">
        <div class="menu-item" @click="handleDuplicate">
          <span class="menu-icon">📋</span>
          <span class="menu-label">Duplicate</span>
          <span class="menu-shortcut">⌘D</span>
        </div>
        <div class="menu-item" @click="handleCopy">
          <span class="menu-icon">📄</span>
          <span class="menu-label">Copy</span>
          <span class="menu-shortcut">⌘C</span>
        </div>
        <div class="menu-item" @click="handleDelete">
          <span class="menu-icon">🗑️</span>
          <span class="menu-label">Delete</span>
          <span class="menu-shortcut">⌫</span>
        </div>
      </div>
    </template>
    
    <template v-else>
      <!-- Empty Canvas Operations -->
      <div class="menu-section">
        <div class="menu-item" @click="handlePaste" :class="{ disabled: !hasClipboard }">
          <span class="menu-icon">📋</span>
          <span class="menu-label">Paste</span>
          <span class="menu-shortcut">⌘V</span>
        </div>
        <div class="menu-item" @click="handleSelectAll">
          <span class="menu-icon">☑️</span>
          <span class="menu-label">Select All</span>
          <span class="menu-shortcut">⌘A</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
export default {
  name: 'ContextMenu',
  props: {
    isVisible: {
      type: Boolean,
      default: false
    },
    position: {
      type: Object,
      default: () => ({ x: 0, y: 0 })
    },
    hasSelection: {
      type: Boolean,
      default: false
    },
    hasClipboard: {
      type: Boolean,
      default: false
    }
  },
  emits: [
    'bring-to-front',
    'bring-forward',
    'send-backward',
    'send-to-back',
    'duplicate',
    'copy',
    'paste',
    'delete',
    'select-all',
    'close'
  ],
  methods: {
    handleBringToFront() {
      this.$emit('bring-to-front')
      this.$emit('close')
    },
    handleBringForward() {
      this.$emit('bring-forward')
      this.$emit('close')
    },
    handleSendBackward() {
      this.$emit('send-backward')
      this.$emit('close')
    },
    handleSendToBack() {
      this.$emit('send-to-back')
      this.$emit('close')
    },
    handleDuplicate() {
      this.$emit('duplicate')
      this.$emit('close')
    },
    handleCopy() {
      this.$emit('copy')
      this.$emit('close')
    },
    handlePaste() {
      if (this.hasClipboard) {
        this.$emit('paste')
        this.$emit('close')
      }
    },
    handleDelete() {
      this.$emit('delete')
      this.$emit('close')
    },
    handleSelectAll() {
      this.$emit('select-all')
      this.$emit('close')
    }
  }
}
</script>

<style scoped>
.context-menu {
  position: fixed;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  min-width: 220px;
  padding: 6px;
  z-index: 10000;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
}

.menu-section {
  padding: 2px 0;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.15s;
  user-select: none;
}

.menu-item:hover {
  background-color: #f3f4f6;
}

.menu-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.menu-icon {
  font-size: 16px;
  width: 20px;
  text-align: center;
}

.menu-label {
  flex: 1;
  color: #1f2937;
}

.menu-shortcut {
  color: #9ca3af;
  font-size: 12px;
  font-family: monospace;
}

.menu-divider {
  height: 1px;
  background-color: #e5e7eb;
  margin: 4px 0;
}
</style>

