<template>
  <div v-if="isVisible" class="vh-overlay">
    <div class="vh-panel">
      <div class="vh-header">
        <h3>Version History</h3>
        <button class="vh-close" @click="$emit('close')">×</button>
      </div>
      <div class="vh-content">
        <div v-if="isLoading" class="vh-empty">Loading…</div>
        <div v-else-if="versions.length === 0" class="vh-empty">No versions yet</div>
        <div v-else class="vh-list">
          <div class="vh-item" v-for="ver in versions" :key="ver.id">
            <div class="vh-meta">
              <div class="vh-title">{{ formatWhen(ver.createdAt) }}</div>
              <div class="vh-sub">by {{ ver.createdByName || ver.createdBy || 'unknown' }} • {{ (ver.shapes || []).length }} shapes • {{ ver.summary || 'auto' }}</div>
            </div>
            <div class="vh-actions">
              <button class="vh-btn" :disabled="!canRestore" @click="$emit('restore', ver)">Restore</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  
</template>

<script>
export default {
  name: 'VersionHistory',
  props: {
    isVisible: { type: Boolean, default: false },
    versions: { type: Array, default: () => [] },
    isLoading: { type: Boolean, default: false },
    canRestore: { type: Boolean, default: false }
  },
  emits: ['close', 'restore'],
  setup() {
    const formatWhen = (ts) => {
      try {
        if (!ts) return 'Unknown time'
        // Firestore Timestamp or millis or Date
        const d = ts.toDate ? ts.toDate() : (typeof ts === 'number' ? new Date(ts) : new Date(ts))
        return d.toLocaleString()
      } catch {
        return 'Unknown time'
      }
    }
    return { formatWhen }
  }
}
</script>

<style scoped>
.vh-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.25);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 100px;
  z-index: 2000;
}
.vh-panel {
  width: 560px;
  max-width: calc(100% - 40px);
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
  overflow: hidden;
}
.vh-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #f1f5f9;
}
.vh-close {
  background: none;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  width: 28px;
  height: 28px;
  cursor: pointer;
  color: #6b7280;
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  line-height: 1;
}
.vh-content { max-height: 60vh; overflow: auto; }
.vh-empty { padding: 16px; color: #64748b; text-align: center; font-size: 14px; }
.vh-list { display: flex; flex-direction: column; }
.vh-item { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #f1f5f9; }
.vh-meta { display: flex; flex-direction: column; gap: 2px; }
.vh-title { font-weight: 600; color: #111827; }
.vh-sub { font-size: 12px; color: #6b7280; }
.vh-actions { display: flex; gap: 8px; }
.vh-btn { 
  background: #000000; 
  border: 1px solid #000000; 
  color: #ffffff; 
  padding: 6px 10px; 
  border-radius: 6px; 
  cursor: pointer;
  transition: all 0.15s ease;
}
.vh-btn:hover:not(:disabled) {
  background: #1a1a1a;
  border-color: #1a1a1a;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}
.vh-btn:disabled { opacity: 0.6; cursor: not-allowed; }
</style>


