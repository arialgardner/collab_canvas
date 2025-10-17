/**
 * Command Executor Composable
 *
 * Executes parsed AI commands using existing canvas functionality.
 * Integrates with useShapes, useUndoRedo, and other composables.
 */

import { useShapes } from './useShapes'
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
    const { userId, canvasId, userName, viewportCenter, viewportBounds, selectedShapeIds } = context

    try {
      let result = null

      switch (category) {
        case 'creation':
          if (action === 'create-multiple') {
            result = await executeCreateMultiple(parameters, userId, canvasId, userName, viewportCenter, viewportBounds, context)
            info(`Created ${parameters.count || 0} ${parameters.shapeType || 'shapes'}`)
          } else {
            result = await executeCreation(parameters, userId, canvasId, userName, viewportCenter, viewportBounds)
            info(`Created ${parameters.shapeType || 'shape'}`)
          }
          break

        case 'manipulation':
          result = await executeManipulation(parameters, selectedShapeIds, userId, canvasId, userName, viewportCenter)
          info(`Updated ${result.updatedIds?.length || 0} shape(s)`)
          break

        case 'layout':
          result = await executeLayout(parameters, selectedShapeIds, userId, canvasId, userName)
          info(`Applied layout: ${parameters.arrangement || parameters.alignment || 'arrange'}`)
          break

        case 'complex':
          result = await executeComplex(parameters, userId, canvasId, userName, viewportCenter, viewportBounds)
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

      return { success: true, ...result }
    } catch (err) {
      console.error('Command execution failed:', err)
      notifyError(err.message || 'Failed to execute command')
      throw err
    }
  }

  /**
   * Calculate random position within viewport bounds
   */
  const getViewportPosition = (viewportCenter, viewportBounds, shapeSize = { width: 100, height: 100 }) => {
    // If no viewport bounds provided, use center
    if (!viewportBounds) {
      console.log('⚠️ No viewport bounds, using center')
      return { x: viewportCenter.x, y: viewportCenter.y }
    }

    console.log('🎯 Calculating position within bounds:', { viewportBounds, shapeSize })

    // Add padding to keep shapes fully visible (20px margin in canvas coordinates)
    const padding = 20
    const minX = viewportBounds.left + padding + (shapeSize.width / 2)
    const maxX = viewportBounds.right - padding - (shapeSize.width / 2)
    const minY = viewportBounds.top + padding + (shapeSize.height / 2)
    const maxY = viewportBounds.bottom - padding - (shapeSize.height / 2)

    // If shape is too large for viewport, center it
    if (minX >= maxX || minY >= maxY) {
      console.log('⚠️ Shape too large for viewport, centering')
      return { x: viewportCenter.x, y: viewportCenter.y }
    }

    // Generate random position within bounds
    const x = minX + Math.random() * (maxX - minX)
    const y = minY + Math.random() * (maxY - minY)

    const result = { x: Math.round(x), y: Math.round(y) }
    console.log('✅ Position calculated:', result)
    return result
  }

  /**
   * Execute creation command
   */
  const executeCreation = async (params, userId, canvasId, userName, viewportCenter, viewportBounds) => {
    const { shapeType, color, size, position, text, fontSize, fontFamily, fontStyle, points, length, angle } = params

    // Debug logging to trace shapeType
    console.log('🔍 executeCreation params:', params)
    console.log('🔍 shapeType extracted:', shapeType)

    // Validate that lines are not supported
    if (shapeType === 'line') {
      throw new Error('Lines are not supported. Only rectangles, circles, and text can be created.')
    }

    // Determine shape size for positioning
    const shapeSize = {
      width: size?.width || (size?.radius ? size.radius * 2 : 100),
      height: size?.height || (size?.radius ? size.radius * 2 : 100)
    }

    console.log('🔍 viewportBounds received:', viewportBounds)
    console.log('🔍 viewportCenter received:', viewportCenter)

    // Use viewport-aware positioning if no position specified
    let finalPosition
    if (position?.x !== undefined && position?.y !== undefined) {
      finalPosition = position
    } else {
      finalPosition = getViewportPosition(viewportCenter, viewportBounds, shapeSize)
    }

    const properties = {
      x: finalPosition.x,
      y: finalPosition.y,
    }

    // Add color if specified
    if (color) {
      properties.fill = color
    }

    // Add size properties
    console.log('🔍 Size parameter:', size)
    if (size) {
      if (size.width !== undefined) {
        properties.width = size.width
        console.log('🔍 Setting width:', size.width)
      }
      if (size.height !== undefined) {
        properties.height = size.height
        console.log('🔍 Setting height:', size.height)
      }
      if (size.radius !== undefined) {
        properties.radius = size.radius
        console.log('🔍 Setting radius:', size.radius)
      }
    }
    console.log('🔍 Final properties:', properties)

    // Add text properties
    if (text) properties.text = text
    if (fontSize) properties.fontSize = fontSize
    if (fontFamily) properties.fontFamily = fontFamily
    if (fontStyle) properties.fontStyle = fontStyle

    // Ensure we have a valid shapeType, default to rectangle only if truly missing
    const finalShapeType = shapeType || 'rectangle'
    console.log('🔍 Creating shape with type:', finalShapeType)
    
    const shape = await createShape(finalShapeType, properties, userId, canvasId, userName)
    return { createdShapes: [shape] }
  }

  /**
   * Execute manipulation command
   */
  const executeManipulation = async (params, selectedIds, userId, canvasId, userName, viewportCenter) => {
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

    // Handle relative size multipliers (e.g., "twice as big", "half the size")
    if (params.sizeMultiplier !== undefined) {
      const allShapes = getAllShapes()
      for (const id of selectedIds) {
        const shape = allShapes.find(s => s.id === id)
        if (!shape) continue
        
        const updates = {}
        if (shape.width !== undefined) {
          updates.width = Math.max(10, Math.round(shape.width * params.sizeMultiplier))
        }
        if (shape.height !== undefined) {
          updates.height = Math.max(10, Math.round(shape.height * params.sizeMultiplier))
        }
        if (shape.radius !== undefined) {
          updates.radius = Math.max(5, Math.round(shape.radius * params.sizeMultiplier))
        }
        
        await updateShape(id, updates, userId, canvasId, true, true, userName)
      }
      return { updatedIds: selectedIds }
    }

    // Handle percentage-based sizing (e.g., "50% larger" = 150%)
    if (params.sizePercent !== undefined) {
      const multiplier = params.sizePercent / 100
      const allShapes = getAllShapes()
      for (const id of selectedIds) {
        const shape = allShapes.find(s => s.id === id)
        if (!shape) continue
        
        const updates = {}
        if (shape.width !== undefined) {
          updates.width = Math.max(10, Math.round(shape.width * multiplier))
        }
        if (shape.height !== undefined) {
          updates.height = Math.max(10, Math.round(shape.height * multiplier))
        }
        if (shape.radius !== undefined) {
          updates.radius = Math.max(5, Math.round(shape.radius * multiplier))
        }
        
        await updateShape(id, updates, userId, canvasId, true, true, userName)
      }
      return { updatedIds: selectedIds }
    }

    // Handle moveTo: "center" - move shapes to viewport center
    if (params.moveTo === 'center' && viewportCenter) {
      console.log('🎯 Moving selected shapes to viewport center:', viewportCenter)
      
      // For multiple shapes, move them as a group maintaining relative positions
      if (selectedIds.length === 1) {
        // Single shape: just center it at viewport center
        updates.x = viewportCenter.x
        updates.y = viewportCenter.y
      } else {
        // Multiple shapes: center the group and maintain relative positions
        const allShapes = getAllShapes()
        const shapesToMove = selectedIds
          .map((id) => allShapes.find((s) => s.id === id))
          .filter(Boolean)
        
        if (shapesToMove.length > 0) {
          // Calculate center of the group
          const bounds = getShapesBounds(shapesToMove)
          const groupCenterX = bounds.centerX
          const groupCenterY = bounds.centerY
          
          // Calculate offset to move group center to viewport center
          const offsetX = viewportCenter.x - groupCenterX
          const offsetY = viewportCenter.y - groupCenterY
          
          // Move each shape by the offset
          for (const shape of shapesToMove) {
            const shapeUpdates = {
              x: shape.x + offsetX,
              y: shape.y + offsetY
            }
            await updateShape(shape.id, shapeUpdates, userId, canvasId, true, true, userName)
          }
          
          return { updatedIds: selectedIds }
        }
      }
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
   * Generate positions for pattern shapes
   */
  const generatePatternPositions = (pattern, center, shapeWidth, shapeHeight) => {
    const positions = []
    const spacing = Math.max(shapeWidth, shapeHeight) * 0.8 // Space between shapes
    
    switch (pattern) {
      case 'circle': {
        // Arrange shapes in a circular pattern
        const radius = 200 // Pattern radius
        const numShapes = Math.floor((2 * Math.PI * radius) / spacing)
        for (let i = 0; i < numShapes; i++) {
          const angle = (i / numShapes) * 2 * Math.PI
          positions.push({
            x: center.x + radius * Math.cos(angle),
            y: center.y + radius * Math.sin(angle)
          })
        }
        break
      }
      
      case 'square': {
        // Arrange shapes in a square outline
        const sideLength = 400
        const shapesPerSide = Math.floor(sideLength / spacing)
        const halfSide = sideLength / 2
        
        // Top side
        for (let i = 0; i < shapesPerSide; i++) {
          positions.push({
            x: center.x - halfSide + (i * spacing),
            y: center.y - halfSide
          })
        }
        // Right side
        for (let i = 1; i < shapesPerSide; i++) {
          positions.push({
            x: center.x + halfSide,
            y: center.y - halfSide + (i * spacing)
          })
        }
        // Bottom side
        for (let i = 1; i < shapesPerSide; i++) {
          positions.push({
            x: center.x + halfSide - (i * spacing),
            y: center.y + halfSide
          })
        }
        // Left side
        for (let i = 1; i < shapesPerSide - 1; i++) {
          positions.push({
            x: center.x - halfSide,
            y: center.y + halfSide - (i * spacing)
          })
        }
        break
      }
      
      case 'star': {
        // Create 5-pointed star
        const outerRadius = 200
        const innerRadius = 80
        const points = 5
        const shapesPerLine = 8
        
        for (let i = 0; i < points; i++) {
          // Outer point
          const outerAngle = (i / points) * 2 * Math.PI - Math.PI / 2
          const innerAngle = ((i + 0.5) / points) * 2 * Math.PI - Math.PI / 2
          
          const outerX = center.x + outerRadius * Math.cos(outerAngle)
          const outerY = center.y + outerRadius * Math.sin(outerAngle)
          const innerX = center.x + innerRadius * Math.cos(innerAngle)
          const innerY = center.y + innerRadius * Math.sin(innerAngle)
          
          // Line from center to outer point
          for (let j = 0; j < shapesPerLine; j++) {
            const t = j / (shapesPerLine - 1)
            positions.push({
              x: center.x + (outerX - center.x) * t,
              y: center.y + (outerY - center.y) * t
            })
          }
          
          // Line from outer to inner
          for (let j = 1; j < shapesPerLine; j++) {
            const t = j / (shapesPerLine - 1)
            positions.push({
              x: outerX + (innerX - outerX) * t,
              y: outerY + (innerY - outerY) * t
            })
          }
        }
        break
      }
      
      case 'triangle': {
        // Equilateral triangle outline
        const sideLength = 400
        const height = sideLength * Math.sqrt(3) / 2
        const shapesPerSide = Math.floor(sideLength / spacing)
        
        // Bottom left to bottom right
        for (let i = 0; i < shapesPerSide; i++) {
          const t = i / shapesPerSide
          positions.push({
            x: center.x - sideLength / 2 + t * sideLength,
            y: center.y + height / 3
          })
        }
        
        // Bottom right to top
        for (let i = 1; i < shapesPerSide; i++) {
          const t = i / shapesPerSide
          positions.push({
            x: center.x + sideLength / 2 - t * sideLength / 2,
            y: center.y + height / 3 - t * height
          })
        }
        
        // Top to bottom left
        for (let i = 1; i < shapesPerSide; i++) {
          const t = i / shapesPerSide
          positions.push({
            x: center.x - t * sideLength / 2,
            y: center.y - 2 * height / 3 + t * height
          })
        }
        break
      }
      
      case 'heart': {
        // Heart shape using parametric equations
        const size = 150
        const numPoints = 50
        
        for (let i = 0; i < numPoints; i++) {
          const t = (i / numPoints) * 2 * Math.PI
          // Parametric heart equations
          const x = 16 * Math.pow(Math.sin(t), 3)
          const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))
          
          positions.push({
            x: center.x + x * size / 16,
            y: center.y + y * size / 16
          })
        }
        break
      }
      
      case 'diamond': {
        // Diamond (rotated square)
        const size = 300
        const shapesPerSide = Math.floor(size / spacing)
        
        // Top to right
        for (let i = 0; i < shapesPerSide; i++) {
          const t = i / shapesPerSide
          positions.push({
            x: center.x + t * size / 2,
            y: center.y - size / 2 + t * size / 2
          })
        }
        
        // Right to bottom
        for (let i = 1; i < shapesPerSide; i++) {
          const t = i / shapesPerSide
          positions.push({
            x: center.x + size / 2 - t * size / 2,
            y: center.y + t * size / 2
          })
        }
        
        // Bottom to left
        for (let i = 1; i < shapesPerSide; i++) {
          const t = i / shapesPerSide
          positions.push({
            x: center.x - t * size / 2,
            y: center.y + size / 2 - t * size / 2
          })
        }
        
        // Left to top
        for (let i = 1; i < shapesPerSide - 1; i++) {
          const t = i / shapesPerSide
          positions.push({
            x: center.x - size / 2 + t * size / 2,
            y: center.y - t * size / 2
          })
        }
        break
      }
      
      case 'line': {
        // Horizontal line
        const length = 400
        const numShapes = Math.floor(length / spacing)
        for (let i = 0; i < numShapes; i++) {
          positions.push({
            x: center.x - length / 2 + (i * spacing),
            y: center.y
          })
        }
        break
      }
      
      default:
        // Default to circle if pattern not recognized
        const radius = 200
        const numShapes = 20
        for (let i = 0; i < numShapes; i++) {
          const angle = (i / numShapes) * 2 * Math.PI
          positions.push({
            x: center.x + radius * Math.cos(angle),
            y: center.y + radius * Math.sin(angle)
          })
        }
    }
    
    return positions
  }

  /**
   * Execute multiple creations with arrangements
   */
  const executeCreateMultiple = async (params, userId, canvasId, userName, viewportCenter, viewportBounds, context) => {
    const {
      shapeType = 'rectangle',
      count = 1,
      arrangement = 'horizontal',
      color,
      size,
    } = params

    // Validate that lines are not supported
    if (shapeType === 'line') {
      throw new Error('Lines are not supported. Only rectangles, circles, and text can be created.')
    }

    const createdShapes = []
    
    // Determine default shape size
    const shapeWidth = size?.width || (size?.radius ? size.radius * 2 : 100)
    const shapeHeight = size?.height || (size?.radius ? size.radius * 2 : 100)

    // Calculate starting position within viewport (we'll build a grid around this)
    const shapeSize = { width: shapeWidth, height: shapeHeight }
    const startPos = getViewportPosition(viewportCenter, viewportBounds, shapeSize)

    // Handle specific grid dimensions (e.g., "create a 3x3 grid")
    if (params.gridRows && params.gridCols) {
      const gridRows = params.gridRows
      const gridCols = params.gridCols
      const totalCount = gridRows * gridCols
      
      // Enforce maximum grid size (15x15 = 225 shapes)
      if (totalCount > 225) {
        throw new Error('Grid too large. Maximum size is 15x15 (225 shapes).')
      }
      
      const spacing = params.spacing || 20
      
      // Calculate total grid dimensions
      const gridWidth = gridCols * shapeWidth + (gridCols - 1) * spacing
      const gridHeight = gridRows * shapeHeight + (gridRows - 1) * spacing
      
      // Center the grid at viewport center
      const gridStartX = viewportCenter.x - gridWidth / 2
      const gridStartY = viewportCenter.y - gridHeight / 2
      
      console.log('🎯 Creating specific grid layout:', {
        gridRows,
        gridCols,
        totalCount,
        gridWidth,
        gridHeight,
        gridStartX,
        gridStartY,
        spacing
      })
      
      // Create shapes row by row
      for (let row = 0; row < gridRows; row++) {
        for (let col = 0; col < gridCols; col++) {
          const properties = {}
          
          // Calculate cell position
          const cellX = gridStartX + col * (shapeWidth + spacing)
          const cellY = gridStartY + row * (shapeHeight + spacing)
          
          // Position depends on shape type (circles use center, rectangles use top-left)
          if (shapeType === 'circle') {
            properties.x = Math.round(cellX + shapeWidth / 2)
            properties.y = Math.round(cellY + shapeHeight / 2)
          } else {
            properties.x = Math.round(cellX)
            properties.y = Math.round(cellY)
          }
          
          if (color) properties.fill = color
          if (size?.width) properties.width = size.width
          if (size?.height) properties.height = size.height
          if (size?.radius) properties.radius = size.radius
          
          const shape = await createShape(shapeType, properties, userId, canvasId, userName)
          createdShapes.push(shape)
        }
      }
      
      return { createdShapes }
    }

    // Handle pattern creation (shapes forming patterns like circle, star, etc.)
    if (params.pattern) {
      const pattern = params.pattern.toLowerCase()
      const positions = generatePatternPositions(pattern, viewportCenter, shapeWidth, shapeHeight)
      
      console.log('🎨 Creating pattern layout:', {
        pattern,
        shapeType,
        positionCount: positions.length,
        center: viewportCenter
      })
      
      for (const pos of positions) {
        const properties = {
          x: Math.round(pos.x),
          y: Math.round(pos.y)
        }
        
        if (color) properties.fill = color
        if (size?.width) properties.width = size.width
        if (size?.height) properties.height = size.height
        if (size?.radius) properties.radius = size.radius
        
        const shape = await createShape(shapeType, properties, userId, canvasId, userName)
        createdShapes.push(shape)
      }
      
      return { createdShapes }
    }

    // Default grid behavior: 15 per row, with spacing
    const colsPerRow = 15
    const spacingX = 20
    const spacingY = 20

    // Convert start position (center) to top-left origin for the first cell
    const baseTopLeftX = startPos.x - shapeWidth / 2
    const baseTopLeftY = startPos.y - shapeHeight / 2

    console.log('🎯 Creating grid layout:', {
      count,
      startPos,
      colsPerRow,
      spacingX,
      spacingY,
      cellSize: shapeSize
    })

    // Create shapes in rows of 15
    for (let i = 0; i < count; i++) {
      const col = i % colsPerRow
      const row = Math.floor(i / colsPerRow)
      const cellX = baseTopLeftX + col * (shapeWidth + spacingX)
      const cellY = baseTopLeftY + row * (shapeHeight + spacingY)

      const properties = {}
      // Position depends on shape type semantics (rectangles use top-left, circles use center)
      if (shapeType === 'circle') {
        properties.x = Math.round(cellX + shapeWidth / 2)
        properties.y = Math.round(cellY + shapeHeight / 2)
      } else {
        properties.x = Math.round(cellX)
        properties.y = Math.round(cellY)
      }
      
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
  const executeComplex = async (params, userId, canvasId, userName, viewportCenter, viewportBounds) => {
    const { templateData } = params

    if (!templateData || !templateData.shapes) {
      throw new Error('No template data provided for complex command')
    }

    const createdShapes = []

    // Calculate base position (center the template at viewport center)
    // Templates are already designed to fit, so we keep them centered
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
