/**
 * Rotation utilities for maintaining rectangle position during rotation
 * 
 * Rectangles are stored with top-left corner coordinates (x, y) but rotate around their center.
 * When a rectangle rotates, the visual center stays in place, but the top-left corner moves
 * to a new position. These utilities calculate the new top-left position after rotation.
 */

/**
 * Calculate new top-left position after rotating a rectangle
 * Maintains the visual center position while rotating
 * 
 * @param {number} x - Current top-left x coordinate
 * @param {number} y - Current top-left y coordinate
 * @param {number} width - Rectangle width
 * @param {number} height - Rectangle height
 * @param {number} rotation - Target rotation in degrees (0-360)
 * @returns {{ x: number, y: number }} New top-left position
 * 
 * @example
 * // Rectangle at (100, 100) with size 100x100, rotated 45 degrees
 * const newPos = calculateRectPositionAfterRotation(100, 100, 100, 100, 45)
 * // Returns new top-left position that maintains visual center at (150, 150)
 */
export function calculateRectPositionAfterRotation(x, y, width, height, rotation) {
  // Calculate current center (this should remain fixed visually)
  const centerX = x + width / 2
  const centerY = y + height / 2
  
  // Convert rotation from degrees to radians
  const radians = (rotation * Math.PI) / 180
  
  // Calculate where the top-left corner is after rotation around center
  // Using 2D rotation matrix: 
  // newPoint = center + rotationMatrix * (oldPoint - center)
  // For top-left: oldPoint - center = (-width/2, -height/2)
  const newX = centerX - (width / 2) * Math.cos(radians) + (height / 2) * Math.sin(radians)
  const newY = centerY - (width / 2) * Math.sin(radians) - (height / 2) * Math.cos(radians)
  
  return { x: newX, y: newY }
}

/**
 * Update rectangle object with new rotation, adjusting position to maintain visual center
 * 
 * @param {Object} rectangle - Rectangle object with x, y, width, height, rotation properties
 * @param {number} newRotation - New rotation value in degrees
 * @returns {Object} Updated rectangle object with corrected x, y, and rotation
 * 
 * @example
 * const rect = { x: 100, y: 100, width: 100, height: 100, rotation: 0 }
 * const rotated = applyRotationToRectangle(rect, 45)
 * // Returns new rectangle with updated x, y to maintain visual position
 */
export function applyRotationToRectangle(rectangle, newRotation) {
  const oldRotation = rectangle.rotation || 0
  
  // No change needed if rotation is the same
  if (oldRotation === newRotation) {
    return rectangle
  }
  
  // Calculate position adjustment needed to maintain center
  const { x: newX, y: newY } = calculateRectPositionAfterRotation(
    rectangle.x,
    rectangle.y,
    rectangle.width,
    rectangle.height,
    newRotation
  )
  
  return {
    ...rectangle,
    x: newX,
    y: newY,
    rotation: newRotation
  }
}

/**
 * Calculate the visual center point of a rectangle
 * 
 * @param {number} x - Top-left x coordinate
 * @param {number} y - Top-left y coordinate
 * @param {number} width - Rectangle width
 * @param {number} height - Rectangle height
 * @returns {{ x: number, y: number }} Center point coordinates
 */
export function getRectangleCenter(x, y, width, height) {
  return {
    x: x + width / 2,
    y: y + height / 2
  }
}

