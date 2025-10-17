import { ref, computed, watch } from 'vue'

export function useViewportCulling(stage) {
  const visibleShapeIds = ref(new Set())
  const viewportMargin = ref(500) // px margin around viewport
  
  // Calculate visible bounds based on current stage view
  const getVisibleBounds = () => {
    if (!stage.value) return null
    
    const stageNode = stage.value.getNode()
    const scale = stageNode.scaleX()
    const position = stageNode.position()
    
    // Calculate viewport bounds in canvas coordinates
    const viewportWidth = stageNode.width() / scale
    const viewportHeight = stageNode.height() / scale
    const viewportX = -position.x / scale
    const viewportY = -position.y / scale
    
    // Add margin for smoother rendering
    const margin = viewportMargin.value / scale
    
    return {
      left: viewportX - margin,
      right: viewportX + viewportWidth + margin,
      top: viewportY - margin,
      bottom: viewportY + viewportHeight + margin
    }
  }
  
  // Check if shape is within visible bounds
  const isShapeVisible = (shape, bounds) => {
    if (!bounds) return true // Default to visible if no bounds
    
    let shapeLeft, shapeRight, shapeTop, shapeBottom
    
    switch (shape.type) {
      case 'rectangle':
        shapeLeft = shape.x
        shapeRight = shape.x + shape.width
        shapeTop = shape.y
        shapeBottom = shape.y + shape.height
        break
        
      case 'circle':
        shapeLeft = shape.x - shape.radius
        shapeRight = shape.x + shape.radius
        shapeTop = shape.y - shape.radius
        shapeBottom = shape.y + shape.radius
        break
        
      case 'line':
        const xs = [shape.points[0], shape.points[2]]
        const ys = [shape.points[1], shape.points[3]]
        shapeLeft = Math.min(...xs)
        shapeRight = Math.max(...xs)
        shapeTop = Math.min(...ys)
        shapeBottom = Math.max(...ys)
        break
        
      case 'text':
        shapeLeft = shape.x
        shapeRight = shape.x + (shape.width || 200) // Estimate if not set
        shapeTop = shape.y
        shapeBottom = shape.y + (shape.fontSize * 1.5 || 30) // Estimate height
        break
        
      default:
        return true // Unknown type, keep visible
    }
    
    // Check intersection with viewport
    return !(
      shapeRight < bounds.left ||
      shapeLeft > bounds.right ||
      shapeBottom < bounds.top ||
      shapeTop > bounds.bottom
    )
  }
  
  // Update visible shapes based on current viewport
  const updateVisibleShapes = (shapes) => {
    const bounds = getVisibleBounds()
    if (!bounds) {
      // No bounds, all shapes visible
      visibleShapeIds.value = new Set(shapes.map(s => s.id))
      return
    }
    
    const newVisible = new Set()
    
    shapes.forEach(shape => {
      if (isShapeVisible(shape, bounds)) {
        newVisible.add(shape.id)
      }
    })
    
    visibleShapeIds.value = newVisible
    
    // Log culling stats
    const culled = shapes.length - newVisible.size
    if (culled > 0) {
      // console.log(`🔍 Viewport culling: ${newVisible.size}/${shapes.length} visible (${culled} culled)`)
    }
  }
  
  // Check if specific shape ID is visible
  const isVisible = (shapeId) => {
    return visibleShapeIds.value.has(shapeId)
  }
  
  // Get visibility percentage (for monitoring)
  const getVisibilityRatio = (totalShapes) => {
    if (totalShapes === 0) return 1
    return visibleShapeIds.value.size / totalShapes
  }
  
  return {
    visibleShapeIds,
    viewportMargin,
    updateVisibleShapes,
    isVisible,
    getVisibleBounds,
    getVisibilityRatio
  }
}

