<template>
  <div class="toasts">
    <div v-for="t in toasts" :key="t.id" :class="['toast', t.type]">
      <span class="msg">{{ t.message }}</span>
      <button class="close" @click="remove(t.id)">×</button>
    </div>
  </div>
</template>

<script setup>
import { useNotifications } from '../composables/useNotifications'
const { toasts, remove } = useNotifications()
</script>

<style scoped>
.toasts {
  position: fixed;
  right: 20px;
  bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 9999;
}
.toast {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 6px;
  color: white;
  min-width: 240px;
}
.toast.info { background: #3b82f6; }
.toast.success { background: #16a34a; }
.toast.warning { background: #f59e0b; }
.toast.error { background: #ef4444; }
.close { background: none; border: none; color: white; cursor: pointer; font-size: 16px; }
</style>


