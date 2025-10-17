import { ref } from 'vue'

/**
 * Simple grid-based spatial index for fast collision detection
 * Divides canvas into grid cells and tracks which shapes are in each cell
 */
export function useSpatialIndex(gridSize = 200) {
  const grid = ref(new Map()) // Map<cellKey, Set<shapeId>>
  const shapeLocations = ref(new Map()) // Map<shapeId, Set<cellKey>>
  
  // Convert coordinates to grid cell key
  const getCellKey = (x, y) => {
    const cellX = Math.floor(x / gridSize)
    const cellY = Math.floor(y / gridSize)
    return `${cellX},${cellY}`
  }
  
  // Get all cells that a shape occupies
  const getShapeCells = (shape) => {
    const cells = new Set()
    
    let minX, maxX, minY, maxY
    
    switch (shape.type) {
      case 'rectangle':
        minX = shape.x
        maxX = shape.x + shape.width
        minY = shape.y
        maxY = shape.y + shape.height
        break
        
      case 'circle':
        minX = shape.x - shape.radius
        maxX = shape.x + shape.radius
        minY = shape.y - shape.radius
        maxY = shape.y + shape.radius
        break
        
      case 'line':
        const xs = [shape.points[0], shape.points[2]]
        const ys = [shape.points[1], shape.points[3]]
        minX = Math.min(...xs)
        maxX = Math.max(...xs)
        minY = Math.min(...ys)
        maxY = Math.max(...ys)
        break
        
      case 'text':
        minX = shape.x
        maxX = shape.x + (shape.width || 200)
        minY = shape.y
        maxY = shape.y + (shape.fontSize * 1.5 || 30)
        break
        
      default:
        return cells
    }
    
    // Add all cells that intersect the shape's bounding box
    const startCellX = Math.floor(minX / gridSize)
    const endCellX = Math.floor(maxX / gridSize)
    const startCellY = Math.floor(minY / gridSize)
    const endCellY = Math.floor(maxY / gridSize)
    
    for (let cx = startCellX; cx <= endCellX; cx++) {
      for (let cy = startCellY; cy <= endCellY; cy++) {
        cells.add(`${cx},${cy}`)
      }
    }
    
    return cells
  }
  
  // Add shape to spatial index
  const addShape = (shape) => {
    const cells = getShapeCells(shape)
    
    // Add to each cell
    cells.forEach(cellKey => {
      if (!grid.value.has(cellKey)) {
        grid.value.set(cellKey, new Set())
      }
      grid.value.get(cellKey).add(shape.id)
    })
    
    // Track which cells this shape is in
    shapeLocations.value.set(shape.id, cells)
  }
  
  // Remove shape from spatial index
  const removeShape = (shapeId) => {
    const cells = shapeLocations.value.get(shapeId)
    if (!cells) return
    
    // Remove from each cell
    cells.forEach(cellKey => {
      const cellShapes = grid.value.get(cellKey)
      if (cellShapes) {
        cellShapes.delete(shapeId)
        if (cellShapes.size === 0) {
          grid.value.delete(cellKey)
        }
      }
    })
    
    shapeLocations.value.delete(shapeId)
  }
  
  // Update shape position in index
  const updateShape = (shape) => {
    removeShape(shape.id)
    addShape(shape)
  }
  
  // Get all shapes near a point
  const getShapesNearPoint = (x, y) => {
    const cellKey = getCellKey(x, y)
    const cellShapes = grid.value.get(cellKey)
    return cellShapes ? Array.from(cellShapes) : []
  }
  
  // Get all shapes in a rectangular area
  const getShapesInRect = (x, y, width, height) => {
    const nearbyShapes = new Set()
    
    const startCellX = Math.floor(x / gridSize)
    const endCellX = Math.floor((x + width) / gridSize)
    const startCellY = Math.floor(y / gridSize)
    const endCellY = Math.floor((y + height) / gridSize)
    
    for (let cx = startCellX; cx <= endCellX; cx++) {
      for (let cy = startCellY; cy <= endCellY; cy++) {
        const cellKey = `${cx},${cy}`
        const cellShapes = grid.value.get(cellKey)
        if (cellShapes) {
          cellShapes.forEach(shapeId => nearbyShapes.add(shapeId))
        }
      }
    }
    
    return Array.from(nearbyShapes)
  }
  
  // Rebuild entire index
  const rebuild = (shapes) => {
    clear()
    shapes.forEach(shape => addShape(shape))
    // console.log(`🔍 Spatial index rebuilt: ${shapes.length} shapes, ${grid.value.size} cells`)
  }
  
  // Clear entire index
  const clear = () => {
    grid.value.clear()
    shapeLocations.value.clear()
  }
  
  // Get statistics
  const getStats = () => {
    const totalCells = grid.value.size
    const totalShapes = shapeLocations.value.size
    const avgShapesPerCell = totalCells > 0 
      ? Array.from(grid.value.values()).reduce((sum, set) => sum + set.size, 0) / totalCells 
      : 0
    
    return {
      gridSize,
      totalCells,
      totalShapes,
      avgShapesPerCell: avgShapesPerCell.toFixed(2)
    }
  }
  
  return {
    addShape,
    removeShape,
    updateShape,
    getShapesNearPoint,
    getShapesInRect,
    rebuild,
    clear,
    getStats
  }
}

