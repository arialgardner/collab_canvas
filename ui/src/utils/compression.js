/**
 * Compression utilities for canvas snapshots (v5)
 * Uses LZString for efficient compression of shape data
 */

import LZString from 'lz-string'

/**
 * Compress an array of shapes into a compressed string
 * @param {Array} shapes - Array of shape objects
 * @returns {string} - Compressed string
 */
export const compressShapes = (shapes) => {
  try {
    const json = JSON.stringify(shapes)
    const compressed = LZString.compressToUTF16(json)
    
    // Log compression ratio
    const originalSize = new Blob([json]).size
    const compressedSize = new Blob([compressed]).size
    const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1)
    
    // console.log(`📦 Compressed ${shapes.length} shapes: ${originalSize} → ${compressedSize} bytes (${ratio}% reduction)`)
    
    return compressed
  } catch (error) {
    console.error('Error compressing shapes:', error)
    throw new Error('Failed to compress shapes')
  }
}

/**
 * Decompress a compressed string back into an array of shapes
 * @param {string} compressed - Compressed string
 * @returns {Array} - Array of shape objects
 */
export const decompressShapes = (compressed) => {
  try {
    if (!compressed || typeof compressed !== 'string') {
      throw new Error('Invalid compressed data')
    }
    
    const json = LZString.decompressFromUTF16(compressed)
    
    if (!json) {
      throw new Error('Decompression failed - corrupt data')
    }
    
    const shapes = JSON.parse(json)
    
    if (!Array.isArray(shapes)) {
      throw new Error('Decompressed data is not an array')
    }
    
    // console.log(`📦 Decompressed ${shapes.length} shapes`)
    
    return shapes
  } catch (error) {
    console.error('Error decompressing shapes:', error)
    throw new Error('Failed to decompress shapes: ' + error.message)
  }
}

/**
 * Estimate the compressed size of shapes
 * @param {Array} shapes - Array of shape objects
 * @returns {number} - Estimated compressed size in bytes
 */
export const estimateCompressedSize = (shapes) => {
  try {
    const compressed = compressShapes(shapes)
    const size = new Blob([compressed]).size
    
    return size
  } catch (error) {
    console.error('Error estimating compressed size:', error)
    return 0
  }
}

/**
 * Check if shapes will fit within Firestore 1MB document limit when compressed
 * @param {Array} shapes - Array of shape objects
 * @returns {boolean} - True if within limit
 */
export const canFitInSnapshot = (shapes) => {
  const FIRESTORE_LIMIT = 1048576 // 1MB in bytes
  const size = estimateCompressedSize(shapes)
  
  if (size > FIRESTORE_LIMIT) {
    console.warn(`⚠️ Compressed shapes (${size} bytes) exceed Firestore limit (${FIRESTORE_LIMIT} bytes)`)
    return false
  }
  
  return true
}

/**
 * Get compression statistics for shapes
 * @param {Array} shapes - Array of shape objects
 * @returns {Object} - Compression statistics
 */
export const getCompressionStats = (shapes) => {
  const json = JSON.stringify(shapes)
  const compressed = compressShapes(shapes)
  
  const originalSize = new Blob([json]).size
  const compressedSize = new Blob([compressed]).size
  const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1)
  
  return {
    shapeCount: shapes.length,
    originalSize,
    compressedSize,
    ratio: parseFloat(ratio),
    withinLimit: compressedSize < 1048576
  }
}

