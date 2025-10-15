import { ref, computed } from 'vue'

const MAX_STACK_SIZE = 50

export const useUndoRedo = () => {
  const undoStack = ref([])
  const redoStack = ref([])
  let isUndoRedoAction = false // Flag to prevent tracking undo/redo actions themselves
  let currentGroup = null // When active, actions are buffered here

  const canUndo = computed(() => undoStack.value.length > 0)
  const canRedo = computed(() => redoStack.value.length > 0)

  // Add an action to the undo stack or current group
  // Action format: { type, data } or grouped: { type: 'group', actions: Action[] }
  // Types: 'create', 'delete', 'update', 'property_change'
  const addAction = (action) => {
    if (isUndoRedoAction) return // Don't track undo/redo actions
    if (currentGroup) {
      currentGroup.push(action)
      return
    }
    
    undoStack.value.push(action)
    
    // Limit stack size
    if (undoStack.value.length > MAX_STACK_SIZE) {
      undoStack.value.shift()
    }
    
    // Clear redo stack when new action is performed
    redoStack.value = []
  }

  // Undo last action
  const undo = () => {
    if (undoStack.value.length === 0) return null
    
    const action = undoStack.value.pop()
    redoStack.value.push(action)
    
    return action
  }

  // Redo last undone action
  const redo = () => {
    if (redoStack.value.length === 0) return null
    
    const action = redoStack.value.pop()
    undoStack.value.push(action)
    
    return action
  }

  // Set flag to prevent tracking during undo/redo operations
  const setUndoRedoFlag = (value) => {
    isUndoRedoAction = value
  }

  // Grouping API
  const beginGroup = () => {
    if (!currentGroup) currentGroup = []
  }
  const endGroup = () => {
    if (!currentGroup) return
    const buffered = currentGroup
    currentGroup = null
    if (buffered.length === 0) return
    if (buffered.length === 1) {
      addAction(buffered[0])
      return
    }
    // Push grouped action
    undoStack.value.push({ type: 'group', actions: buffered })
    if (undoStack.value.length > MAX_STACK_SIZE) {
      undoStack.value.shift()
    }
    redoStack.value = []
  }

  // Clear all stacks
  const clear = () => {
    undoStack.value = []
    redoStack.value = []
  }

  return {
    // State
    canUndo,
    canRedo,
    
    // Methods
    addAction,
    undo,
    redo,
    setUndoRedoFlag,
    clear,
    beginGroup,
    endGroup
  }
}

