import { ref, reactive } from 'vue'
import { 
  generateId, 
  generateRandomColor, 
  DEFAULT_RECT_SIZE, 
  constrainToBounds 
} from '../types/shapes'

export const useRectangles = () => {
  // Store rectangles in a reactive Map for O(1) lookups
  const rectangles = reactive(new Map())

  // Create a new rectangle at specified position
  const createRectangle = (x, y, userId = 'anonymous') => {
    // Constrain position within canvas bounds
    const constrainedPos = constrainToBounds(x, y)
    
    const rectangle = {
      id: generateId(),
      x: constrainedPos.x,
      y: constrainedPos.y,
      width: DEFAULT_RECT_SIZE.width,
      height: DEFAULT_RECT_SIZE.height,
      fill: generateRandomColor(),
      createdBy: userId,
      createdAt: Date.now(),
      lastModified: Date.now(),
      lastModifiedBy: userId
    }

    rectangles.set(rectangle.id, rectangle)
    return rectangle
  }

  // Update rectangle properties
  const updateRectangle = (id, updates, userId = 'anonymous') => {
    const rectangle = rectangles.get(id)
    if (!rectangle) {
      console.warn(`Rectangle with id ${id} not found`)
      return null
    }

    // If updating position, constrain to bounds
    if (updates.x !== undefined || updates.y !== undefined) {
      const newX = updates.x !== undefined ? updates.x : rectangle.x
      const newY = updates.y !== undefined ? updates.y : rectangle.y
      const constrainedPos = constrainToBounds(newX, newY, rectangle.width, rectangle.height)
      updates.x = constrainedPos.x
      updates.y = constrainedPos.y
    }

    // Update rectangle with new properties
    const updatedRectangle = {
      ...rectangle,
      ...updates,
      lastModified: Date.now(),
      lastModifiedBy: userId
    }

    rectangles.set(id, updatedRectangle)
    return updatedRectangle
  }

  // Get rectangle by ID
  const getRectangle = (id) => {
    return rectangles.get(id)
  }

  // Get all rectangles as array
  const getAllRectangles = () => {
    return Array.from(rectangles.values())
  }

  // Remove rectangle
  const removeRectangle = (id) => {
    return rectangles.delete(id)
  }

  // Clear all rectangles
  const clearRectangles = () => {
    rectangles.clear()
  }

  // Get rectangle count
  const getRectangleCount = () => {
    return rectangles.size
  }

  return {
    // State
    rectangles,

    // Methods
    createRectangle,
    updateRectangle,
    getRectangle,
    getAllRectangles,
    removeRectangle,
    clearRectangles,
    getRectangleCount
  }
}
