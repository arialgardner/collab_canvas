/**
 * AI Commands Composable
 *
 * Manages AI command processing state, history, and orchestration.
 * Integrates with OpenAI-based AI service for natural language command parsing.
 * 
 * PRD v6 Implementation
 */

import { ref, readonly } from 'vue'
import aiService from '../services/aiService'

// Shared state across all instances (singleton pattern)
const isProcessing = ref(false)
const lastCommand = ref(null)
const error = ref(null)
const commandHistory = ref([]) // In-memory only, max 50 items

/**
 * Composable for AI command functionality
 */
export function useAICommands() {
  /**
   * Gather current canvas context for AI parsing
   * 
   * @param {Object} canvasState - Current canvas state
   * @returns {Object} Context object for AI
   */
  const gatherContext = (canvasState) => {
    const {
      viewportCenter = { x: 1500, y: 1500 },
      viewportWidth = 1920,
      viewportHeight = 1080,
      panOffset = { x: 0, y: 0 },
      zoomLevel = 1,
      selectedShapeIds = [],
      selectedShape = null,
      shapes = new Map(),
      lastCreatedShape = null
    } = canvasState

    // Calculate viewport bounds in canvas coordinates
    const viewportBounds = {
      left: viewportCenter.x - viewportWidth / 2,
      right: viewportCenter.x + viewportWidth / 2,
      top: viewportCenter.y - viewportHeight / 2,
      bottom: viewportCenter.y + viewportHeight / 2
    }

    return {
      viewportCenter,
      viewportWidth,
      viewportHeight,
      viewportBounds,
      panOffset,
      zoomLevel,
      selectedShapeIds,
      selectedShape,
      lastCreatedShape,
      totalShapes: shapes.size,
      canvasSize: {
        width: 3000,
        height: 3000
      }
    }
  }

  /**
   * Parse a natural language command using AI
   * 
   * @param {string} commandText - Natural language command
   * @param {Object} canvasState - Current canvas state
   * @returns {Promise<Object>} Parsed command object
   */
  const parseCommand = async (commandText, canvasState) => {
    const context = gatherContext(canvasState)
    
    try {
      // 1) Get raw LLM response
      const llm = await aiService.parseNaturalLanguageCommand(commandText, context)
      // 2) Validate LLM response format (intent/parameters)
      if (!aiService.validateCommand(llm)) {
        throw new Error('AI returned invalid command format')
      }
      // 3) Map LLM intent → canonical command for executor
      const mapped = mapIntentToCommand(llm)
      return mapped
    } catch (err) {
      throw err
    }
  }

  /**
   * Execute a natural language command
   * 
   * @param {string} userInput - The natural language command
   * @param {Object} canvasState - Current canvas state
   * @returns {Promise<Object>} Parsed command object
   */
  const executeCommand = async (userInput, canvasState) => {
    // Prevent concurrent commands - input disabled while processing
    if (isProcessing.value) {
      throw new Error('Another command is already processing')
    }

    if (!userInput || typeof userInput !== 'string' || !userInput.trim()) {
      throw new Error('Command cannot be empty')
    }

    isProcessing.value = true
    error.value = null

    const startTime = Date.now()

    try {
      // Parse command with AI service (OpenAI API)
      const command = await parseCommand(userInput, canvasState)

      // Calculate parse time for performance monitoring
      const parseTime = Date.now() - startTime
      console.log(`✅ AI parsing completed in ${parseTime}ms`, command)

      // Warn if parsing is slow (> 2s target)
      if (parseTime > 2000) {
        console.warn(`⚠️ AI parsing took ${parseTime}ms (target: <2000ms)`)
      }

      // Add to in-memory history (max 50 commands)
      commandHistory.value.unshift({
        input: userInput,
        command,
        timestamp: Date.now(),
        success: true,
        parseTime
      })

      // Keep only last 50 commands (PRD v6 requirement)
      if (commandHistory.value.length > 50) {
        commandHistory.value = commandHistory.value.slice(0, 50)
      }

      lastCommand.value = command

      return command
    } catch (err) {
      console.error('❌ AI command parsing failed:', err)

      error.value = aiService.getErrorMessage(err)

      // Add failed command to history
      commandHistory.value.unshift({
        input: userInput,
        command: null,
        timestamp: Date.now(),
        success: false,
        error: err.message,
      })

      // Keep only last 50 commands
      if (commandHistory.value.length > 50) {
        commandHistory.value = commandHistory.value.slice(0, 50)
      }

      throw err
    } finally {
      isProcessing.value = false
    }
  }

  /**
   * Map LLM intent result to canonical executor command shape
   * { intent, parameters } → { category, action, parameters }
   */
  const mapIntentToCommand = (llm) => {
    console.log('🔍 AI raw response (llm):', JSON.stringify(llm, null, 2))
    const intent = llm.intent
    const p = llm.parameters || {}
    console.log('🔍 Intent:', intent, 'Parameters:', p)

    // Helpers
    const toPosition = () => {
      if (!p.position) return undefined
      const pos = p.position
      if (typeof pos.x === 'number' || typeof pos.y === 'number') {
        return { x: pos.x ?? undefined, y: pos.y ?? undefined }
      }
      return undefined
    }

    const toSize = () => {
      console.log('🔍 toSize() called with p.width:', p.width, 'p.height:', p.height, 'p.radius:', p.radius)
      console.log('🔍 Type check - p.width type:', typeof p.width, 'p.height type:', typeof p.height, 'p.radius type:', typeof p.radius)
      
      const size = {}
      
      // Try to parse string numbers as well
      const parseNum = (val) => {
        if (typeof val === 'number') return val
        if (typeof val === 'string') {
          const parsed = parseInt(val, 10)
          if (!isNaN(parsed)) return parsed
        }
        return undefined
      }
      
      const width = parseNum(p.width)
      const height = parseNum(p.height)
      const radius = parseNum(p.radius)
      
      if (width !== undefined || height !== undefined || radius !== undefined) {
        if (width !== undefined) size.width = width
        if (height !== undefined) size.height = height
        if (radius !== undefined) size.radius = radius
        console.log('🔍 toSize() returning:', size)
        return size
      }
      
      if (p.size && (p.size.width || p.size.height || p.size.radius)) {
        console.log('🔍 toSize() returning p.size:', p.size)
        return p.size
      }
      console.log('🔍 toSize() returning undefined')
      return undefined
    }

    const toDeltaFromDirection = () => {
      if (!p.direction) return undefined
      const distance = typeof p.distance === 'number' ? p.distance : 50
      switch (p.direction) {
        case 'up': return { x: 0, y: -distance }
        case 'down': return { x: 0, y: distance }
        case 'left': return { x: -distance, y: 0 }
        case 'right': return { x: distance, y: 0 }
        default: return undefined
      }
    }

    const toDeltaFromScale = () => {
      if (typeof p.scaleMultiplier === 'number') {
        // Executor expects absolute or delta width/height; provide delta
        // Use positive multiplier to scale approximately assuming 100 baseline when unknown
        const m = p.scaleMultiplier
        return { width: Math.round(100 * (m - 1)), height: Math.round(100 * (m - 1)) }
      }
      return undefined
    }

    // Defaults
    let command = { category: 'utility', action: 'noop', parameters: {} }

    switch (intent) {
      case 'CREATE_SHAPE': {
        command = {
          category: 'creation',
          action: 'create',
          parameters: {
            shapeType: p.shapeType || p.type,
            color: p.fill || p.color,
            size: toSize(),
            position: toPosition(),
            text: p.text
          }
        }
        break
      }
      case 'CREATE_MULTIPLE_SHAPES': {
        command = {
          category: 'creation',
          action: 'create-multiple',
          parameters: {
            shapeType: p.shapeType || p.type,
            count: p.count,
            arrangement: p.arrangement,
            color: p.fill || p.color,
            gridRows: p.gridRows,
            gridCols: p.gridCols,
            spacing: p.spacing,
            pattern: p.pattern, // Pattern type: circle, square, star, triangle, etc.
          }
        }
        break
      }
      case 'CREATE_TEXT': {
        command = {
          category: 'creation',
          action: 'create-text',
          parameters: {
            shapeType: 'text',
            text: p.text,
            position: toPosition(),
            size: p.fontSize ? { width: undefined, height: undefined } : undefined,
            color: p.fill || p.color,
            fontSize: p.fontSize,
            fontFamily: p.fontFamily,
            fontStyle: p.fontStyle,
          }
        }
        break
      }
      case 'MOVE_SHAPE': {
        command = {
          category: 'manipulation',
          action: 'move',
          parameters: {
            position: toPosition(),
            delta: toDeltaFromDirection(),
            moveTo: p.moveTo, // Support "center" value for moving to viewport center
          }
        }
        break
      }
      case 'RESIZE_SHAPE': {
        // Handle legacy 'factor' parameter by mapping to sizeMultiplier
        if (p.factor && !p.sizeMultiplier) {
          console.log('🔄 Mapping legacy factor parameter to sizeMultiplier:', p.factor)
          p.sizeMultiplier = p.factor
        }
        command = {
          category: 'manipulation',
          action: 'resize',
          parameters: {
            dimensions: toSize(),
            delta: toDeltaFromScale(),
            sizeMultiplier: p.sizeMultiplier,
          }
        }
        break
      }
      case 'CHANGE_STYLE': {
        command = {
          category: 'style',
          action: 'style',
          parameters: {
            fill: p.fill || p.color,
            stroke: p.stroke,
            strokeWidth: p.strokeWidth,
            opacity: p.opacity,
            fontSize: p.fontSize,
            fontFamily: p.fontFamily,
            fontStyle: p.fontStyle,
          }
        }
        break
      }
      case 'ARRANGE_SHAPES': {
        command = {
          category: 'layout',
          action: 'arrange',
          parameters: {
            arrangement: p.arrangement,
            alignment: p.alignment,
            spacing: p.spacing,
          }
        }
        break
      }
      case 'CHANGE_LAYER': {
        command = {
          category: 'layout',
          action: p.action, // bring_to_front, send_to_back, etc. (handled later PR)
          parameters: {}
        }
        break
      }
      case 'CREATE_TEMPLATE': {
        command = {
          category: 'complex',
          action: 'template',
          parameters: {
            template: p.templateName || p.template,
            templateData: null // Will be populated in PR #8
          }
        }
        break
      }
      case 'DELETE_SHAPE': {
        command = {
          category: 'deletion',
          action: 'delete',
          parameters: {
            target: p.target || 'selected'
          }
        }
        break
      }
      case 'QUERY_INFO': {
        command = {
          category: 'utility',
          action: 'query',
          parameters: {
            queryType: p.queryType,
            shapeType: p.shapeType
          }
        }
        break
      }
      default: {
        throw new Error('Unsupported command type returned by AI')
      }
    }

    return command
  }

  /**
   * Clear error state
   */
  const clearError = () => {
    error.value = null
  }

  /**
   * Clear command history
   */
  const clearHistory = () => {
    commandHistory.value = []
  }

  /**
   * Get command from history by index
   *
   * @param {number} index - History index (0 = most recent)
   * @returns {Object|null} History entry or null
   */
  const getHistoryItem = (index) => {
    if (index < 0 || index >= commandHistory.value.length) {
      return null
    }
    return commandHistory.value[index]
  }

  /**
   * Get last N commands from history
   * 
   * @param {number} count - Number of commands to return (default 3)
   * @returns {Array} Recent command history entries
   */
  const getRecentHistory = (count = 3) => {
    return commandHistory.value.slice(0, count)
  }

  /**
   * Get successful commands from history
   *
   * @returns {Array} Successful command history entries
   */
  const getSuccessfulHistory = () => {
    return commandHistory.value.filter((entry) => entry.success)
  }

  /**
   * Get failed commands from history
   *
   * @returns {Array} Failed command history entries
   */
  const getFailedHistory = () => {
    return commandHistory.value.filter((entry) => !entry.success)
  }

  /**
   * Get average parse time from successful commands
   * 
   * @returns {number} Average parse time in milliseconds
   */
  const getAverageParseTime = () => {
    const successful = getSuccessfulHistory()
    if (successful.length === 0) return 0
    
    const total = successful.reduce((sum, entry) => sum + (entry.parseTime || 0), 0)
    return Math.round(total / successful.length)
  }

  /**
   * Get success rate percentage
   * 
   * @returns {number} Success rate (0-100)
   */
  const getSuccessRate = () => {
    if (commandHistory.value.length === 0) return 100
    
    const successful = commandHistory.value.filter(entry => entry.success).length
    return Math.round((successful / commandHistory.value.length) * 100)
  }

  return {
    // State (readonly to prevent external mutation)
    isProcessing: readonly(isProcessing),
    lastCommand: readonly(lastCommand),
    error: readonly(error),
    commandHistory: readonly(commandHistory),

    // Methods
    executeCommand,
    parseCommand,
    gatherContext,
    clearError,
    clearHistory,
    getHistoryItem,
    getRecentHistory,
    getSuccessfulHistory,
    getFailedHistory,
    getAverageParseTime,
    getSuccessRate,
  }
}
