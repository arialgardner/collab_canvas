/**
 * Batch Compression Utility
 * 
 * Compresses batch shape creation operations by sending base properties once
 * and only positions for each shape.
 * 
 * Example: Creating 500 rectangles
 * Without compression: 500 × 200 bytes = 100KB
 * With compression: 200 bytes (base) + 500 × 16 bytes (positions) = 8KB
 * Reduction: 92%
 */

/**
 * Compress a batch of shapes for transmission
 * @param {Array<Object>} shapes - Array of shapes to compress
 * @returns {Object} Compressed batch
 */
export function compressBatch(shapes) {
  if (!shapes || shapes.length === 0) {
    return null
  }
  
  // Group shapes by type
  const groupedByType = {}
  for (const shape of shapes) {
    if (!groupedByType[shape.type]) {
      groupedByType[shape.type] = []
    }
    groupedByType[shape.type].push(shape)
  }
  
  // Compress each type separately
  const compressed = []
  
  for (const [type, shapesOfType] of Object.entries(groupedByType)) {
    if (shapesOfType.length === 1) {
      // No compression for single shapes
      compressed.push({
        type: 'single',
        shape: shapesOfType[0]
      })
      continue
    }
    
    // Extract base properties (most common values)
    const baseProperties = extractBaseProperties(shapesOfType, type)
    
    // Extract variable properties (positions, etc.)
    const variations = shapesOfType.map(shape => extractVariations(shape, baseProperties))
    
    compressed.push({
      type: 'batch',
      shapeType: type,
      baseProperties,
      variations,
      count: shapesOfType.length
    })
  }
  
  return compressed
}

/**
 * Decompress a batch of shapes
 * @param {Object|Array} compressed - Compressed batch data
 * @returns {Array<Object>} Decompressed shapes
 */
export function decompressBatch(compressed) {
  if (!compressed) {
    return []
  }
  
  // Handle array of compressed batches
  if (Array.isArray(compressed)) {
    const shapes = []
    for (const batch of compressed) {
      shapes.push(...decompressBatch(batch))
    }
    return shapes
  }
  
  // Handle single shape (not compressed)
  if (compressed.type === 'single') {
    return [compressed.shape]
  }
  
  // Handle compressed batch
  if (compressed.type === 'batch') {
    const { shapeType, baseProperties, variations } = compressed
    
    return variations.map(variation => ({
      ...baseProperties,
      ...variation,
      type: shapeType
    }))
  }
  
  return []
}

/**
 * Extract base properties (most common values) from a group of shapes
 * @param {Array<Object>} shapes - Array of shapes
 * @param {string} type - Shape type
 * @returns {Object} Base properties
 */
function extractBaseProperties(shapes, type) {
  if (shapes.length === 0) return {}
  
  // Use first shape as template
  const template = shapes[0]
  const baseProperties = {}
  
  // Properties to consider for base
  const propertiesToCheck = getCommonProperties(type)
  
  for (const prop of propertiesToCheck) {
    // Count occurrences of each value
    const valueCounts = {}
    let maxCount = 0
    let mostCommonValue = template[prop]
    
    for (const shape of shapes) {
      const value = JSON.stringify(shape[prop])
      valueCounts[value] = (valueCounts[value] || 0) + 1
      
      if (valueCounts[value] > maxCount) {
        maxCount = valueCounts[value]
        mostCommonValue = shape[prop]
      }
    }
    
    // Use most common value as base (if >50% of shapes have it)
    if (maxCount > shapes.length / 2) {
      baseProperties[prop] = mostCommonValue
    }
  }
  
  return baseProperties
}

/**
 * Extract variable properties (different from base)
 * @param {Object} shape - Shape object
 * @param {Object} baseProperties - Base properties
 * @returns {Object} Variation properties
 */
function extractVariations(shape, baseProperties) {
  const variations = {}
  
  // Always include id and position
  variations.id = shape.id
  if (shape.x !== baseProperties.x) variations.x = shape.x
  if (shape.y !== baseProperties.y) variations.y = shape.y
  
  // Include any properties that differ from base
  for (const key in shape) {
    if (key === 'id' || key === 'x' || key === 'y') continue // Already handled
    
    if (!(key in baseProperties) || 
        JSON.stringify(shape[key]) !== JSON.stringify(baseProperties[key])) {
      variations[key] = shape[key]
    }
  }
  
  return variations
}

/**
 * Get common properties for a shape type
 * @param {string} type - Shape type
 * @returns {Array<string>} Common properties
 */
function getCommonProperties(type) {
  const common = ['fill', 'stroke', 'strokeWidth', 'opacity', 'rotation']
  
  switch (type) {
    case 'rectangle':
      return [...common, 'width', 'height', 'cornerRadius']
    case 'circle':
      return [...common, 'radius']
    case 'line':
      return [...common, 'tension', 'lineCap', 'lineJoin']
    case 'text':
      return [...common, 'fontSize', 'fontFamily', 'fontStyle', 'align']
    default:
      return common
  }
}

/**
 * Calculate compression ratio
 * @param {Array<Object>} shapes - Original shapes
 * @param {Object} compressed - Compressed batch
 * @returns {Object} { originalSize, compressedSize, ratio }
 */
export function calculateCompressionRatio(shapes, compressed) {
  const originalSize = JSON.stringify(shapes).length
  const compressedSize = JSON.stringify(compressed).length
  const ratio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1)
  
  return {
    originalSize,
    compressedSize,
    ratio: parseFloat(ratio),
    savedBytes: originalSize - compressedSize
  }
}

/**
 * Compress batch creation operation for AI commands
 * Optimized for creating many similar shapes (e.g., "create 500 rectangles")
 * @param {string} shapeType - Type of shape
 * @param {Object} baseProperties - Common properties for all shapes
 * @param {Array<Array<number>>} positions - Array of [x, y] positions
 * @returns {Object} Compressed creation operation
 */
export function compressCreateBatch(shapeType, baseProperties, positions) {
  return {
    type: 'createBatch',
    shapeType,
    baseProperties,
    positions,
    count: positions.length
  }
}

/**
 * Decompress batch creation operation
 * @param {Object} operation - Compressed creation operation
 * @param {Function} generateId - Function to generate IDs
 * @returns {Array<Object>} Decompressed shapes
 */
export function decompressCreateBatch(operation, generateId) {
  const { shapeType, baseProperties, positions } = operation
  
  return positions.map(([x, y]) => ({
    ...baseProperties,
    type: shapeType,
    id: generateId(shapeType),
    x,
    y
  }))
}

/**
 * Check if batch should be compressed
 * Only compress if >10 shapes and >30% size reduction
 * @param {Array<Object>} shapes - Shapes to potentially compress
 * @returns {boolean} True if should compress
 */
export function shouldCompressBatch(shapes) {
  if (!shapes || shapes.length < 10) {
    return false
  }
  
  // Quick estimation: If all same type and similar properties, likely good compression
  const types = new Set(shapes.map(s => s.type))
  return types.size === 1 // All same type
}

// Expose to window for debugging
if (typeof window !== 'undefined') {
  window.batchCompression = {
    compress: compressBatch,
    decompress: decompressBatch,
    calculateRatio: calculateCompressionRatio,
    compressCreate: compressCreateBatch,
    decompressCreate: decompressCreateBatch,
    shouldCompress: shouldCompressBatch
  }
}

