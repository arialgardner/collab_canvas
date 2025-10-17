<template>
  <div class="dashboard-container">
    <!-- Header -->
    <div class="dashboard-header">
      <div class="header-content">
        <h1 class="dashboard-title">My Canvases</h1>
        <div class="header-actions">
          <button @click="showCreateModal = true" class="create-button">
            <span class="plus-icon">+</span>
            Create New Canvas
          </button>
          <div class="user-menu">
            <div class="user-info">
              <span class="user-name">{{ user?.displayName || user?.email }}</span>
            </div>
            <button @click="handleSignOut" class="sign-out-button" title="Sign out">
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <LoadingSpinner
      v-if="isLoading && canvasesList.length === 0"
      title="Loading Canvases..."
      message="Fetching your collaborative workspaces"
    />

    <!-- Empty State -->
    <EmptyState
      v-else-if="!isLoading && canvasesList.length === 0"
      type="dashboard"
      title="No Canvases Yet"
      message="Create your first canvas to start collaborating"
      class="dashboard-empty-state"
    >
      <button @click="showCreateModal = true" class="empty-state-button">
        Create Canvas
      </button>
    </EmptyState>

    <!-- Canvas Grid -->
    <div v-else class="canvas-grid">
      <div
        v-for="canvas in canvasesList"
        :key="canvas.id"
        class="canvas-card"
        @click="openCanvas(canvas.id)"
      >
        <!-- Thumbnail -->
        <div class="canvas-thumbnail">
          <div class="thumbnail-placeholder">
            <span class="canvas-icon">🎨</span>
          </div>
        </div>

        <!-- Canvas Info -->
        <div class="canvas-info">
          <div class="canvas-name-row">
            <h3 class="canvas-name">{{ canvas.name }}</h3>
            <span
              v-if="canvas.owner === user.uid"
              class="owner-badge"
              title="You own this canvas"
            >
              Owner
            </span>
            <span
              v-else-if="getUserRole(canvas, user.uid) === 'editor'"
              class="editor-badge"
              title="You can edit this canvas"
            >
              Editor
            </span>
            <span
              v-else-if="getUserRole(canvas, user.uid) === 'viewer'"
              class="viewer-badge"
              title="You can view this canvas"
            >
              Viewer
            </span>
          </div>

          <div class="canvas-meta">
            <span class="meta-item">{{ canvas.width }} × {{ canvas.height }}px</span>
            <span class="meta-separator">•</span>
            <span class="meta-item">{{ formatDate(canvas.lastModified) }}</span>
          </div>

          <div class="canvas-actions" @click.stop>
            <button
              v-if="canvas.owner === user.uid"
              @click="startRename(canvas)"
              class="action-button"
              title="Rename canvas"
            >
              ✏️
            </button>
            <button
              v-if="canvas.owner === user.uid"
              @click="confirmDelete(canvas)"
              class="action-button delete"
              title="Delete canvas"
            >
              🗑️
            </button>
            <button
              @click="shareCanvas(canvas)"
              class="action-button"
              title="Share canvas"
            >
              📤
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Canvas Modal -->
    <div v-if="showCreateModal" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Create New Canvas</h2>
          <button @click="showCreateModal = false" class="close-button">×</button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label for="canvas-name">Canvas Name</label>
            <input
              id="canvas-name"
              v-model="newCanvasName"
              type="text"
              placeholder="Enter canvas name"
              class="form-input"
              @keyup.enter="handleCreateCanvas"
            />
          </div>
        </div>

        <div class="modal-footer">
          <button @click="showCreateModal = false" class="button-secondary">
            Cancel
          </button>
          <button
            @click="handleCreateCanvas"
            :disabled="!newCanvasName || isCreating"
            class="button-primary"
          >
            {{ isCreating ? 'Creating...' : 'Create Canvas' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Rename Canvas Modal -->
    <div v-if="renameCanvas" class="modal-overlay" @click="renameCanvas = null">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>Rename Canvas</h2>
          <button @click="renameCanvas = null" class="close-button">×</button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label for="rename-input">Canvas Name</label>
            <input
              id="rename-input"
              v-model="renameCanvasName"
              type="text"
              class="form-input"
              @keyup.enter="handleRename"
            />
          </div>
        </div>

        <div class="modal-footer">
          <button @click="renameCanvas = null" class="button-secondary">
            Cancel
          </button>
          <button
            @click="handleRename"
            :disabled="!renameCanvasName"
            class="button-primary"
          >
            Rename
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="deleteCanvas" class="modal-overlay" @click="deleteCanvas = null">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>Delete Canvas</h2>
          <button @click="deleteCanvas = null" class="close-button">×</button>
        </div>

        <div class="modal-body">
          <p class="warning-text">
            Are you sure you want to delete "<strong>{{ deleteCanvas.name }}</strong>"?
          </p>
          <p class="warning-subtext">
            This action cannot be undone. All shapes and data will be permanently deleted.
          </p>
        </div>

        <div class="modal-footer">
          <button @click="deleteCanvas = null" class="button-secondary">
            Cancel
          </button>
          <button
            @click="handleDelete"
            :disabled="isDeleting"
            class="button-danger"
          >
            {{ isDeleting ? 'Deleting...' : 'Delete Canvas' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Share Canvas Modal -->
    <div v-if="shareCanvasData" class="modal-overlay" @click="shareCanvasData = null">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>Share Canvas</h2>
          <button @click="shareCanvasData = null" class="close-button">×</button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label>Shareable Link</label>
            <div class="share-link-row">
              <input
                :value="getShareableLink(shareCanvasData.id)"
                readonly
                class="form-input share-link"
                ref="shareLinkInput"
              />
              <button @click="copyShareLink" class="button-primary">
                {{ linkCopied ? 'Copied!' : 'Copy' }}
              </button>
            </div>
          </div>

          <div class="share-info">
            <p class="info-text">
              Anyone with this link and an account can access this canvas with Editor permissions by default.
            </p>
          </div>
        </div>

        <div class="modal-footer">
          <button @click="shareCanvasData = null" class="button-primary">
            Done
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCanvases } from '../composables/useCanvases'
import { useAuth } from '../composables/useAuth'
import { useInactivityLogout } from '../composables/useInactivityLogout'
import LoadingSpinner from '../components/LoadingSpinner.vue'
import EmptyState from '../components/EmptyState.vue'

const router = useRouter()
const { user, signOut } = useAuth()
const {
  canvases,
  isLoading,
  getUserCanvases,
  createCanvas,
  updateCanvas,
  deleteCanvas: deleteCanvasFromDb,
  getUserRole
} = useCanvases()

// Inactivity tracking - auto logout after 10 minutes
useInactivityLogout('dashboard')

// Canvas list
const canvasesList = computed(() => {
  return Array.from(canvases.value.values()).sort((a, b) => {
    return (b.lastModified?.toMillis?.() || 0) - (a.lastModified?.toMillis?.() || 0)
  })
})

// Create modal
const showCreateModal = ref(false)
const newCanvasName = ref('')
const isCreating = ref(false)

// Rename modal
const renameCanvas = ref(null)
const renameCanvasName = ref('')

// Delete modal
const deleteCanvas = ref(null)
const isDeleting = ref(false)

// Share modal
const shareCanvasData = ref(null)
const linkCopied = ref(false)
const shareLinkInput = ref(null)

// Load canvases on mount
onMounted(async () => {
  // Wait for auth to be ready
  if (!user.value) {
    // Wait a bit for auth to initialize
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  if (user.value) {
    // console.log('Loading canvases for user:', user.value.uid)
    await getUserCanvases(user.value.uid)
    // console.log('Loaded canvases:', canvases.value.size)
  } else {
    console.error('User not loaded after waiting')
  }
})

// Navigation
const openCanvas = (canvasId) => {
  // console.log('[Dashboard] Opening canvas:', canvasId)
  try {
    router.push({ name: 'Canvas', params: { canvasId } })
  } catch (error) {
    console.error('[Dashboard] Error navigating to canvas:', error)
    alert('Failed to open canvas. Please try again.')
  }
}

// Create canvas
const handleCreateCanvas = async () => {
  if (!newCanvasName.value || isCreating.value) return

  try {
    isCreating.value = true
    const canvas = await createCanvas(user.value.uid, user.value.displayName || user.value.email, {
      name: newCanvasName.value
    })

    // Reset form
    showCreateModal.value = false
    newCanvasName.value = ''

    // Navigate to new canvas
    openCanvas(canvas.id)
  } catch (error) {
    console.error('Error creating canvas:', error)
    alert('Failed to create canvas. Please try again.')
  } finally {
    isCreating.value = false
  }
}

// Rename canvas
const startRename = (canvas) => {
  renameCanvas.value = canvas
  renameCanvasName.value = canvas.name
}

const handleRename = async () => {
  if (!renameCanvasName.value || !renameCanvas.value) return

  try {
    await updateCanvas(renameCanvas.value.id, { name: renameCanvasName.value })
    renameCanvas.value = null
    renameCanvasName.value = ''
  } catch (error) {
    console.error('Error renaming canvas:', error)
    alert('Failed to rename canvas. Please try again.')
  }
}

// Delete canvas
const confirmDelete = (canvas) => {
  deleteCanvas.value = canvas
}

const handleDelete = async () => {
  if (!deleteCanvas.value || isDeleting.value) return

  try {
    isDeleting.value = true
    await deleteCanvasFromDb(deleteCanvas.value.id)
    deleteCanvas.value = null
  } catch (error) {
    console.error('Error deleting canvas:', error)
    alert('Failed to delete canvas. Please try again.')
  } finally {
    isDeleting.value = false
  }
}

// Share canvas
const shareCanvas = (canvas) => {
  shareCanvasData.value = canvas
  linkCopied.value = false
}

const getShareableLink = (canvasId) => {
  return `${window.location.origin}/canvas/${canvasId}`
}

const copyShareLink = async () => {
  if (!shareCanvasData.value) return

  try {
    const link = getShareableLink(shareCanvasData.value.id)
    await navigator.clipboard.writeText(link)
    linkCopied.value = true
    setTimeout(() => {
      linkCopied.value = false
    }, 2000)
  } catch (error) {
    console.error('Error copying link:', error)
  }
}

// Sign out
const handleSignOut = async () => {
  try {
    await signOut()
    router.push({ name: 'Auth' })
  } catch (error) {
    console.error('Error signing out:', error)
    alert('Failed to sign out. Please try again.')
  }
}

// Format date
const formatDate = (timestamp) => {
  if (!timestamp) return 'Unknown'
  
  try {
    let date
    if (timestamp.toDate) {
      date = timestamp.toDate()
    } else if (timestamp instanceof Date) {
      date = timestamp
    } else {
      return 'Unknown'
    }

    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    
    return date.toLocaleDateString()
  } catch (error) {
    return 'Unknown'
  }
}
</script>

<style scoped>
.dashboard-container {
  min-height: 100vh;
  height: 100vh;
  background: #f9fafb;
  padding: 20px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.dashboard-header {
  width: 100%;
  flex-shrink: 0;
  margin-bottom: 24px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0;
  gap: 20px;
  flex-wrap: wrap;
}

.dashboard-title {
  font-size: 32px;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

@media (max-width: 768px) {
  .dashboard-title {
    font-size: 24px;
  }
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.user-menu {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

@media (max-width: 640px) {
  .user-menu {
    width: 100%;
    justify-content: flex-end;
  }
  
  .create-button {
    width: 100%;
    justify-content: center;
  }
}

.user-info {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  background: #f3f4f6;
  border-radius: 8px;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.sign-out-button {
  padding: 10px 20px;
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.sign-out-button:hover {
  background: #f9fafb;
  border-color: #9ca3af;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.create-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #2d2d2d 0%, #000000 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.create-button:hover {
  background: linear-gradient(135deg, #1a1a1a 0%, #000000 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.plus-icon {
  font-size: 20px;
  font-weight: 700;
}

.canvas-grid {
  width: 100%;
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  align-content: start;
  padding-bottom: 20px;
}

@media (min-width: 768px) {
  .canvas-grid {
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 24px;
  }
}

@media (min-width: 1200px) {
  .canvas-grid {
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  }
}

@media (min-width: 1600px) {
  .canvas-grid {
    grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  }
}

.canvas-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.2s;
}

.canvas-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.canvas-thumbnail {
  width: 100%;
  height: 200px;
  background: linear-gradient(135deg, #2d2d2d 0%, #000000 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.thumbnail-placeholder {
  text-align: center;
}

.canvas-icon {
  font-size: 64px;
}

.canvas-info {
  padding: 16px;
}

.canvas-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.canvas-name {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.owner-badge,
.editor-badge,
.viewer-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 4px;
  text-transform: uppercase;
}

.owner-badge {
  background: #e5e7eb;
  color: #374151;
}

.editor-badge {
  background: #d1fae5;
  color: #065f46;
}

.viewer-badge {
  background: #fef3c7;
  color: #92400e;
}

.canvas-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 12px;
}

.meta-separator {
  color: #d1d5db;
}

.canvas-actions {
  display: flex;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid #f3f4f6;
}

.action-button {
  padding: 6px 12px;
  background: #f3f4f6;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.action-button:hover {
  background: #e5e7eb;
}

.action-button.delete:hover {
  background: #fee2e2;
}

.dashboard-empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.empty-state-button {
  margin-top: 20px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #2d2d2d 0%, #000000 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.empty-state-button:hover {
  background: linear-gradient(135deg, #1a1a1a 0%, #000000 100%);
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 24px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  font-size: 20px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.close-button {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  font-size: 24px;
  color: #6b7280;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
  padding: 0;
  flex-shrink: 0;
}

.close-button:hover {
  background: #f3f4f6;
  color: #111827;
}

.modal-body {
  padding: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #2d2d2d;
  box-shadow: 0 0 0 3px rgba(45, 45, 45, 0.1);
}

.size-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.size-input-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.size-input-group label {
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
}

.size-separator {
  font-size: 18px;
  color: #9ca3af;
  margin-top: 20px;
}

.form-info {
  margin-top: 8px;
}

.info-text {
  font-size: 13px;
  color: #6b7280;
}

.share-link-row {
  display: flex;
  gap: 8px;
}

.share-link {
  flex: 1;
  background: #f9fafb;
}

.share-info {
  margin-top: 12px;
  padding: 12px;
  background: #eff6ff;
  border-radius: 6px;
}

.warning-text {
  font-size: 15px;
  color: #111827;
  margin: 0 0 12px;
}

.warning-subtext {
  font-size: 13px;
  color: #6b7280;
  margin: 0;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #e5e7eb;
}

.button-primary,
.button-secondary,
.button-danger {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.button-primary {
  background: linear-gradient(135deg, #2d2d2d 0%, #000000 100%);
  color: white;
}

.button-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #1a1a1a 0%, #000000 100%);
}

.button-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.button-secondary {
  background: #f3f4f6;
  color: #374151;
}

.button-secondary:hover {
  background: #e5e7eb;
}

.button-danger {
  background: #ef4444;
  color: white;
}

.button-danger:hover:not(:disabled) {
  background: #dc2626;
}

.button-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

