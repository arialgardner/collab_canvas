// Rectangle data model for shapes
export interface Rectangle {
  id: string
  x: number
  y: number
  width: number
  height: number
  fill: string
  createdBy: string
  createdAt: number
  lastModified: number
  lastModifiedBy: string
}

// Generate a unique ID for rectangles
export const generateId = (): string => {
  return `rect_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

// Generate random color from predefined palette
export const generateRandomColor = (): string => {
  const colors = [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#45B7D1', // Blue
    '#96CEB4', // Green
    '#FFEAA7', // Yellow
    '#DDA0DD', // Plum
    '#98D8C8', // Mint
    '#F7DC6F', // Light Yellow
    '#BB8FCE', // Light Purple
    '#85C1E9', // Light Blue
    '#F8C471', // Orange
    '#82E0AA', // Light Green
    '#F1948A', // Pink
    '#AED6F1', // Sky Blue
    '#D2B4DE'  // Lavender
  ]
  return colors[Math.floor(Math.random() * colors.length)]!
}

// Default rectangle properties
export const DEFAULT_RECT_SIZE = {
  width: 100,
  height: 100
}

// Canvas constraints
export const CANVAS_BOUNDS = {
  width: 3000,
  height: 3000
}

// Constrain position within canvas bounds
export const constrainToBounds = (
  x: number, 
  y: number, 
  width: number = DEFAULT_RECT_SIZE.width, 
  height: number = DEFAULT_RECT_SIZE.height
) => {
  return {
    x: Math.max(0, Math.min(x, CANVAS_BOUNDS.width - width)),
    y: Math.max(0, Math.min(y, CANVAS_BOUNDS.height - height))
  }
}
