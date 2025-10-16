/**
 * Command Executor Composable
 *
 * Executes parsed AI commands using existing canvas functionality.
 * Integrates with useShapes, useUndoRedo, and other composables.
 */

import { useShapes } from './useShapes'
import { useUndoRedo } from './useUndoRedo'
import { useNotifications } from './useNotifications'

export function useCommandExecutor() {
  const {
    createShape,
    updateShape,
    deleteShapes,
    getAllShapes,
    bringToFront,
    sendToBack,
    bringForward,
    sendBackward,
    duplicateShapes,
  } = useShapes()

  const { beginGroup, endGroup } = useUndoRedo()
  const { info, error: notifyError } = useNotifications()

  /**
   * Execute a parsed AI command
   *
   * @param {Object} command - Parsed command from AI
   * @param {Object} context - Canvas context (userId, canvasId, userName, etc.)
   * @returns {Promise<Object>} Execution result
   */
  const executeCommand = async (command, context) => {
    const { category, action, parameters } = command
    const { userId, canvasId, userName, viewportCenter, selectedShapeIds } = context

    try {
      beginGroup() // Group all actions for undo/redo

      let result = null

      switch (category) {
        case 'creation':
          if (action === 'create-multiple') {
            result = await executeCreateMultiple(parameters, userId, canvasId, userName, viewportCenter)
            info(`Created ${parameters.count || 0} ${parameters.shapeType || 'shapes'}`)
          } else {
            result = await executeCreation(parameters, userId, canvasId, userName, viewportCenter)
            info(`Created ${parameters.shapeType || 'shape'}`)
          }
          break

        case 'manipulation':
          result = await executeManipulation(parameters, selectedShapeIds, userId, canvasId, userName)
          info(`Updated ${result.updatedIds?.length || 0} shape(s)`)
          break

        case 'layout':
          result = await executeLayout(parameters, selectedShapeIds, userId, canvasId, userName)
          info(`Applied layout: ${parameters.arrangement || parameters.alignment || 'arrange'}`)
          break

        case 'complex':
          result = await executeComplex(parameters, userId, canvasId, userName, viewportCenter)
          info(`Created ${parameters.template || 'layout'}`)
          break

        case 'selection':
          result = await executeSelection(parameters, selectedShapeIds)
          info(`Selected ${result.selectedIds?.length || 0} shape(s)`)
          break

        case 'deletion':
          result = await executeDeletion(parameters, selectedShapeIds, canvasId)
          info(`Deleted ${result.deletedIds?.length || 0} shape(s)`)
          break

        case 'style':
          result = await executeStyle(parameters, selectedShapeIds, userId, canvasId, userName)
          info(`Styled ${result.updatedIds?.length || 0} shape(s)`)
          break

        case 'utility':
          result = await executeUtility(action, parameters)
          info(`Executed: ${action}`)
          break

        default:
          throw new Error(`Unknown command category: ${category}`)
      }

      endGroup()
      return { success: true, ...result }
    } catch (err) {
      endGroup() // End group even on error to clean up
      console.error('Command execution failed:', err)
      notifyError(err.message || 'Failed to execute command')
      throw err
    }
  }

  /**
   * Execute creation command
   */
  const executeCreation = async (params, userId, canvasId, userName, viewportCenter) => {
    const { shapeType, color, size, position, text, fontSize, fontFamily, fontStyle } = params

    // Use viewport center (visible screen area) as default position
    const properties = {
      x: position?.x ?? viewportCenter.x,
      y: position?.y ?? viewportCenter.y,
    }

    // Add color if specified
    if (color) {
      properties.fill = color
    }

    // Add size properties
    if (size) {
      if (size.width !== undefined) properties.width = size.width
      if (size.height !== undefined) properties.height = size.height
      if (size.radius !== undefined) properties.radius = size.radius
    }

    // Add text properties
    if (text) properties.text = text
    if (fontSize) properties.fontSize = fontSize
    if (fontFamily) properties.fontFamily = fontFamily
    if (fontStyle) properties.fontStyle = fontStyle

    const shape = await createShape(shapeType || 'rectangle', properties, userId, canvasId, userName)
    return { createdShapes: [shape] }
  }

  /**
   * Execute manipulation command
   */
  const executeManipulation = async (params, selectedIds, userId, canvasId, userName) => {
    if (!selectedIds || selectedIds.length === 0) {
      throw new Error('No shapes selected for manipulation')
    }

    const updates = {}

    // Color changes
    if (params.color) updates.fill = params.color

    // Size changes
    if (params.size) {
      if (params.size.width !== undefined) updates.width = params.size.width
      if (params.size.height !== undefined) updates.height = params.size.height
      if (params.size.radius !== undefined) updates.radius = params.size.radius
    }

    // Position changes
    if (params.position) {
      if (params.position.x !== undefined) updates.x = params.position.x
      if (params.position.y !== undefined) updates.y = params.position.y
    }

    // Delta changes (relative)
    if (params.delta) {
      const allShapes = getAllShapes()
      for (const id of selectedIds) {
        const shape = allShapes.find((s) => s.id === id)
        if (!shape) continue

        const deltaUpdates = {}
        if (params.delta.x !== undefined) deltaUpdates.x = shape.x + params.delta.x
        if (params.delta.y !== undefined) deltaUpdates.y = shape.y + params.delta.y
        if (params.delta.width !== undefined && shape.width) {
          deltaUpdates.width = Math.max(10, shape.width + params.delta.width)
        }
        if (params.delta.height !== undefined && shape.height) {
          deltaUpdates.height = Math.max(10, shape.height + params.delta.height)
        }
        // Circle radius scaling support
        if (shape.radius !== undefined) {
          const deltaForRadius = (params.delta.width ?? params.delta.height ?? 0)
          if (deltaForRadius) {
            const newRadius = Math.max(5, shape.radius + Math.round(deltaForRadius / 2))
            deltaUpdates.radius = newRadius
          }
        }
        if (params.delta.rotation !== undefined) {
          deltaUpdates.rotation = (shape.rotation || 0) + params.delta.rotation
        }

        await updateShape(id, deltaUpdates, userId, canvasId, true, true, userName)
      }
      return { updatedIds: selectedIds }
    }

    // Rotation
    if (params.rotation !== undefined) {
      updates.rotation = params.rotation
    }

    // Apply updates to all selected shapes
    const updatePromises = selectedIds.map((id) =>
      updateShape(id, updates, userId, canvasId, true, true, userName)
    )
    await Promise.all(updatePromises)

    return { updatedIds: selectedIds }
  }

  /**
   * Execute multiple creations with arrangements
   */
  const executeCreateMultiple = async (params, userId, canvasId, userName, viewportCenter) => {
    const {
      shapeType = 'rectangle',
      count = 1,
      arrangement = 'horizontal',
      color,
      size,
    } = params

    const createdShapes = []
    const spacing = 120

    const baseX = viewportCenter.x
    const baseY = viewportCenter.y

    // Layout helpers
    const positions = []

    if (arrangement === 'horizontal') {
      const startX = baseX - Math.floor(count / 2) * spacing
      for (let i = 0; i < count; i++) {
        positions.push({ x: startX + i * spacing, y: baseY })
      }
    } else if (arrangement === 'vertical') {
      const startY = baseY - Math.floor(count / 2) * spacing
      for (let i = 0; i < count; i++) {
        positions.push({ x: baseX, y: startY + i * spacing })
      }
    } else if (arrangement === 'grid') {
      const cols = Math.ceil(Math.sqrt(count))
      const rows = Math.ceil(count / cols)
      const startX = baseX - Math.floor(cols / 2) * spacing
      const startY = baseY - Math.floor(rows / 2) * spacing
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (positions.length >= count) break
          positions.push({ x: startX + c * spacing, y: startY + r * spacing })
        }
      }
    } else if (arrangement === 'scattered') {
      for (let i = 0; i < count; i++) {
        positions.push({
          x: baseX + (Math.random() * 400 - 200),
          y: baseY + (Math.random() * 400 - 200)
        })
      }
    } else {
      // default to horizontal
      const startX = baseX - Math.floor(count / 2) * spacing
      for (let i = 0; i < count; i++) {
        positions.push({ x: startX + i * spacing, y: baseY })
      }
    }

    for (const pos of positions) {
      const properties = { x: pos.x, y: pos.y }
      if (color) properties.fill = color
      if (size) {
        if (size.width !== undefined) properties.width = size.width
        if (size.height !== undefined) properties.height = size.height
        if (size.radius !== undefined) properties.radius = size.radius
      }
      const shape = await createShape(shapeType, properties, userId, canvasId, userName)
      createdShapes.push(shape)
    }

    return { createdShapes }
  }

  /**
   * Execute layout command
   */
  const executeLayout = async (params, selectedIds, userId, canvasId, userName) => {
    if (!selectedIds || selectedIds.length < 2) {
      throw new Error('Select at least two shapes for layout commands')
    }

    const allShapes = getAllShapes()
    const shapesToLayout = selectedIds
      .map((id) => allShapes.find((s) => s.id === id))
      .filter(Boolean)

    if (shapesToLayout.length === 0) {
      throw new Error('No valid shapes found for layout')
    }

    const spacing = params.spacing || 20

    // Horizontal arrangement
    if (params.arrangement === 'horizontal') {
      let currentX = shapesToLayout[0].x
      for (const shape of shapesToLayout) {
        await updateShape(shape.id, { x: currentX }, userId, canvasId, true, true, userName)
        const shapeWidth = shape.width || shape.radius * 2 || 100
        currentX += shapeWidth + spacing
      }
    }

    // Vertical arrangement
    else if (params.arrangement === 'vertical') {
      let currentY = shapesToLayout[0].y
      for (const shape of shapesToLayout) {
        await updateShape(shape.id, { y: currentY }, userId, canvasId, true, true, userName)
        const shapeHeight = shape.height || shape.radius * 2 || 100
        currentY += shapeHeight + spacing
      }
    }

    // Grid arrangement
    else if (params.arrangement === 'grid') {
      const cols = Math.ceil(Math.sqrt(shapesToLayout.length))
      let col = 0
      let row = 0
      const maxWidth = Math.max(
        ...shapesToLayout.map((s) => s.width || s.radius * 2 || 100)
      )
      const maxHeight = Math.max(
        ...shapesToLayout.map((s) => s.height || s.radius * 2 || 100)
      )

      for (const shape of shapesToLayout) {
        const x = shapesToLayout[0].x + col * (maxWidth + spacing)
        const y = shapesToLayout[0].y + row * (maxHeight + spacing)
        await updateShape(shape.id, { x, y }, userId, canvasId, true, true, userName)

        col++
        if (col >= cols) {
          col = 0
          row++
        }
      }
    }

    // Alignment
    else if (params.alignment) {
      const bounds = getShapesBounds(shapesToLayout)

      for (const shape of shapesToLayout) {
        const updates = {}

        switch (params.alignment) {
          case 'left':
            updates.x = bounds.minX
            break
          case 'center':
            const shapeWidth = shape.width || shape.radius * 2 || 100
            updates.x = bounds.centerX - shapeWidth / 2
            break
          case 'right':
            const shapeW = shape.width || shape.radius * 2 || 100
            updates.x = bounds.maxX - shapeW
            break
          case 'top':
            updates.y = bounds.minY
            break
          case 'middle':
            const shapeHeight = shape.height || shape.radius * 2 || 100
            updates.y = bounds.centerY - shapeHeight / 2
            break
          case 'bottom':
            const shapeH = shape.height || shape.radius * 2 || 100
            updates.y = bounds.maxY - shapeH
            break
        }

        if (Object.keys(updates).length > 0) {
          await updateShape(shape.id, updates, userId, canvasId, true, true, userName)
        }
      }
    }

    // Distribution
    else if (params.distribution) {
      const bounds = getShapesBounds(shapesToLayout)
      const sorted = [...shapesToLayout].sort((a, b) => {
        return params.distribution === 'horizontal' ? a.x - b.x : a.y - b.y
      })

      if (sorted.length > 2) {
        const totalSpace =
          params.distribution === 'horizontal'
            ? bounds.maxX - bounds.minX
            : bounds.maxY - bounds.minY
        const spacing = totalSpace / (sorted.length - 1)

        for (let i = 1; i < sorted.length - 1; i++) {
          const updates = {}
          if (params.distribution === 'horizontal') {
            updates.x = bounds.minX + spacing * i
          } else {
            updates.y = bounds.minY + spacing * i
          }
          await updateShape(sorted[i].id, updates, userId, canvasId, true, true, userName)
        }
      }
    }

    return { updatedIds: selectedIds }
  }

  /**
   * Execute complex template command
   */
  const executeComplex = async (params, userId, canvasId, userName, viewportCenter) => {
    const { templateData } = params

    if (!templateData || !templateData.shapes) {
      throw new Error('No template data provided for complex command')
    }

    const createdShapes = []

    // Calculate base position (center the template at viewport center)
    const templateBounds = getTemplateBounds(templateData.shapes)
    const baseX = viewportCenter.x - templateBounds.width / 2
    const baseY = viewportCenter.y - templateBounds.height / 2

    // Create all shapes from template
    for (const templateShape of templateData.shapes) {
      const properties = {
        x: baseX + templateShape.offsetX,
        y: baseY + templateShape.offsetY,
        ...templateShape,
      }

      // Remove offset properties as they're converted to absolute
      delete properties.offsetX
      delete properties.offsetY

      const shape = await createShape(templateShape.type, properties, userId, canvasId, userName)
      createdShapes.push(shape)
    }

    return { createdShapes }
  }

  /**
   * Execute selection command
   */
  const executeSelection = async (params) => {
    const allShapes = getAllShapes()
    let newSelectedIds = []

    if (params.criteria === 'all') {
      newSelectedIds = allShapes.map((s) => s.id)
    } else if (params.criteria === 'type' && params.shapeType) {
      newSelectedIds = allShapes.filter((s) => s.type === params.shapeType).map((s) => s.id)
    } else if (params.criteria === 'color' && params.color) {
      newSelectedIds = allShapes.filter((s) => s.fill === params.color).map((s) => s.id)
    } else if (params.criteria === 'region' && params.region) {
      const { x, y, width, height } = params.region
      newSelectedIds = allShapes
        .filter((s) => {
          const shapeX = s.x || 0
          const shapeY = s.y || 0
          return shapeX >= x && shapeX <= x + width && shapeY >= y && shapeY <= y + height
        })
        .map((s) => s.id)
    }

    return { type: 'selection', selectedIds: newSelectedIds }
  }

  /**
   * Execute deletion command
   */
  const executeDeletion = async (params, selectedIds, canvasId) => {
    let idsToDelete = []

    if (params.target === 'selected' && selectedIds && selectedIds.length > 0) {
      idsToDelete = selectedIds
    } else if (params.target === 'all') {
      const allShapes = getAllShapes()
      idsToDelete = allShapes.map((s) => s.id)
    } else if (params.target === 'type' && params.shapeType) {
      const allShapes = getAllShapes()
      idsToDelete = allShapes.filter((s) => s.type === params.shapeType).map((s) => s.id)
    } else {
      throw new Error('No valid deletion target specified')
    }

    if (idsToDelete.length === 0) {
      throw new Error('No shapes to delete')
    }

    await deleteShapes(idsToDelete, canvasId)
    return { deletedIds: idsToDelete }
  }

  /**
   * Execute style command
   */
  const executeStyle = async (params, selectedIds, userId, canvasId, userName) => {
    if (!selectedIds || selectedIds.length === 0) {
      throw new Error('No shapes selected for styling')
    }

    const updates = {}

    if (params.fill) updates.fill = params.fill
    if (params.stroke) updates.stroke = params.stroke
    if (params.strokeWidth !== undefined) updates.strokeWidth = params.strokeWidth
    if (params.fontSize) updates.fontSize = params.fontSize
    if (params.fontStyle) updates.fontStyle = params.fontStyle
    if (params.fontFamily) updates.fontFamily = params.fontFamily
    if (params.align) updates.align = params.align

    const updatePromises = selectedIds.map((id) =>
      updateShape(id, updates, userId, canvasId, true, true, userName)
    )
    await Promise.all(updatePromises)

    return { updatedIds: selectedIds }
  }

  /**
   * Execute utility command
   */
  const executeUtility = async (action, params) => {
    // Utility actions are handled by CanvasView directly via events
    // This function just returns the action to be emitted
    return {
      type: 'utility',
      action: params.action || action,
      amount: params.amount,
    }
  }

  /**
   * Helper: Get bounds of multiple shapes
   */
  const getShapesBounds = (shapes) => {
    if (shapes.length === 0) return null

    const xs = shapes.map((s) => s.x || 0)
    const ys = shapes.map((s) => s.y || 0)

    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)

    return {
      minX,
      maxX,
      minY,
      maxY,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2,
      width: maxX - minX,
      height: maxY - minY,
    }
  }

  /**
   * Helper: Get bounds of template shapes
   */
  const getTemplateBounds = (templateShapes) => {
    if (templateShapes.length === 0) return { width: 0, height: 0 }

    const xs = templateShapes.map((s) => s.offsetX || 0)
    const ys = templateShapes.map((s) => s.offsetY || 0)
    const widths = templateShapes.map((s) => s.width || s.radius * 2 || 0)
    const heights = templateShapes.map((s) => s.height || s.radius * 2 || 0)

    const minX = Math.min(...xs)
    const maxX = Math.max(...xs.map((x, i) => x + widths[i]))
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys.map((y, i) => y + heights[i]))

    return {
      width: maxX - minX,
      height: maxY - minY,
    }
  }

  return {
    executeCommand,
  }
}
