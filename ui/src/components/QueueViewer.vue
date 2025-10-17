<template>
  <div v-if="isVisible">
    <!-- Backdrop overlay -->
    <div class="queue-overlay"></div>
    
    <!-- Centered modal -->
    <div class="queue-viewer">
      <div class="header">
        <h4>Operation Queue</h4>
        <button class="close" @click="$emit('close')">×</button>
      </div>
      <div class="content">
        <div v-if="ops.length === 0" class="empty">No queued operations</div>
        <div v-else class="list">
          <div v-for="op in ops" :key="op.id" class="item">
            <div class="left">
              <span class="type" :class="op.type">{{ op.type }}</span>
              <span class="shape">{{ op.shapeId }}</span>
            </div>
            <div class="right">
              <span class="status">{{ op.status || 'pending' }}</span>
              <button class="btn" @click="retry(op)">Retry</button>
              <button class="btn danger" @click="remove(op)">Remove</button>
            </div>
          </div>
        </div>
      </div>
      <div class="footer">
        <button class="btn" @click="refresh">Refresh</button>
        <button class="btn danger" @click="clearAll" :disabled="ops.length === 0">Clear All</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, watch, onMounted } from 'vue'
import { useOperationQueue } from '../composables/useOperationQueue'

export default {
  name: 'QueueViewer',
  props: { isVisible: { type: Boolean, default: false } },
  emits: ['close'],
  setup(props) {
    const { loadQueuedOperations, markCompleted, markFailed, clearQueue } = useOperationQueue()
    const ops = ref([])

    const refresh = async () => {
      ops.value = await loadQueuedOperations()
    }

    const retry = async (op) => {
      // Mark pending again; actual processing handled by reconnect flow in PR #6
      op.status = 'pending'
      await markFailed(op, null)
      await refresh()
    }

    const remove = async (op) => {
      await markCompleted(op.id)
      await refresh()
    }

    const clearAll = async () => {
      await clearQueue()
      await refresh()
    }

    watch(() => props.isVisible, (v) => { if (v) refresh() })
    onMounted(refresh)

    return { ops, refresh, retry, remove, clearAll }
  }
}
</script>

<style scoped>
.queue-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 2000;
}
.queue-viewer {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90%;
  max-width: 500px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.25);
  z-index: 2001;
  display: flex;
  flex-direction: column;
  max-height: 80vh;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid #e2e8f0;
}
.header h4 { margin: 0; font-size: 14px; color: #2d3748; }
.close { 
  background: none; 
  border: none; 
  font-size: 20px; 
  cursor: pointer; 
  color: #2d3748;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  flex-shrink: 0;
}
.close:hover { 
  color: #000000; 
}
.content { flex: 1; overflow: auto; min-height: 0; }
.empty { padding: 16px; color: #718096; font-size: 13px; text-align: center; }
.list { display: flex; flex-direction: column; }
.item { display: flex; justify-content: space-between; padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
.left { display: flex; gap: 8px; align-items: center; }
.type { text-transform: uppercase; font-size: 11px; padding: 2px 6px; border-radius: 4px; background: #edf2f7; color: #4a5568; }
.type.update { background: #e0f2fe; color: #0369a1; }
.type.create { background: #dcfce7; color: #065f46; }
.type.delete { background: #fee2e2; color: #991b1b; }
.shape { font-size: 12px; color: #334155; }
.right { display: flex; gap: 6px; align-items: center; }
.status { font-size: 12px; color: #64748b; margin-right: 4px; }
.btn { background: #ffffff; border: 1px solid #d1d5db; border-radius: 4px; padding: 6px 8px; font-size: 12px; cursor: pointer; color: #000000; transition: all 0.15s ease; }
.btn:hover { background: #f3f4f6; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn:disabled:hover { background: #ffffff; }
.btn.danger { background: #000000; border-color: #000000; color: #ffffff; }
.btn.danger:hover { background: #1a1a1a; border-color: #1a1a1a; transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2); }
.btn.danger:disabled { background: #000000; border-color: #000000; }
.btn.danger:disabled:hover { background: #000000; transform: none; box-shadow: none; }
.footer { display: flex; gap: 8px; padding: 10px 12px; border-top: 1px solid #e2e8f0; }
</style>


