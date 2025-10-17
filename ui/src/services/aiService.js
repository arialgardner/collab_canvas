/**
 * AI Service - OpenAI Integration
 * 
 * Handles direct communication with OpenAI API for natural language command parsing.
 * Uses gpt-3.5-turbo for speed and cost efficiency.
 * 
 * PRD v6 Implementation
 */

import OpenAI from 'openai'

/**
 * OpenAI Configuration
 */
const OPENAI_CONFIG = {
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Required for client-side usage
}

const MODEL = import.meta.env.VITE_AI_MODEL || 'gpt-3.5-turbo'
const TEMPERATURE = parseFloat(import.meta.env.VITE_AI_TEMPERATURE) || 0.1
const MAX_TOKENS = parseInt(import.meta.env.VITE_AI_MAX_TOKENS) || 500
const TIMEOUT = parseInt(import.meta.env.VITE_AI_TIMEOUT) || 5000

/**
 * System prompt for AI command parsing
 * Defines capabilities, intents, and response format
 */
const SYSTEM_PROMPT = `You are an AI assistant for a collaborative canvas application. Your job is to parse natural language commands and convert them to structured JSON commands.

The canvas supports these shape types: rectangle, circle, text (NOTE: lines are NOT supported)

Available command intents:
- CREATE_SHAPE: Create a single shape (MUST include "type" or "shapeType" parameter: "rectangle", "circle", or "text" - lines NOT supported)
- CREATE_MULTIPLE_SHAPES: Create multiple shapes (MUST include "type" or "shapeType" parameter)
- CREATE_TEXT: Create text element (automatically sets type to "text")
- MOVE_SHAPE: Move/position shapes (supports moving selected shapes to viewport center)
- RESIZE_SHAPE: Resize shapes (use "sizeMultiplier" for relative sizing: 2.0 = twice as big, 0.5 = half size, etc.)
- CHANGE_STYLE: Modify visual properties
- ARRANGE_SHAPES: Layout shapes in patterns
- CHANGE_LAYER: Modify z-index
- CREATE_TEMPLATE: Create predefined components
- DELETE_SHAPE: Remove shapes
- QUERY_INFO: Answer questions about canvas

Available templates: login_form, button, card

When parsing commands:
1. Identify the primary intent
2. Extract all relevant parameters
3. Handle ambiguous references (e.g., "it" = last created or selected shape)
4. Use sensible defaults for missing parameters
5. Return valid JSON only

CRITICAL: For CREATE_SHAPE intent, always include the "type" parameter with the exact shape name.

Examples:
- "create a circle" → {"intent": "CREATE_SHAPE", "parameters": {"type": "circle"}}
- "draw a rectangle" → {"intent": "CREATE_SHAPE", "parameters": {"type": "rectangle"}}
- "make a red circle" → {"intent": "CREATE_SHAPE", "parameters": {"type": "circle", "fill": "#FF0000"}}
- "create a rectangle 200x100" → {"intent": "CREATE_SHAPE", "parameters": {"type": "rectangle", "width": 200, "height": 100}}
- "draw a 50px circle" → {"intent": "CREATE_SHAPE", "parameters": {"type": "circle", "radius": 50}}
- "create a 300 by 150 rectangle" → {"intent": "CREATE_SHAPE", "parameters": {"type": "rectangle", "width": 300, "height": 150}}
- "create 3 circles" → {"intent": "CREATE_MULTIPLE_SHAPES", "parameters": {"type": "circle", "count": 3}}
- "create a 3x3 grid of squares" → {"intent": "CREATE_MULTIPLE_SHAPES", "parameters": {"type": "rectangle", "gridRows": 3, "gridCols": 3}}
- "make a 5 by 5 grid of rectangles" → {"intent": "CREATE_MULTIPLE_SHAPES", "parameters": {"type": "rectangle", "gridRows": 5, "gridCols": 5}}
- "create a 4x6 grid of circles" → {"intent": "CREATE_MULTIPLE_SHAPES", "parameters": {"type": "circle", "gridRows": 4, "gridCols": 6}}
- "create a circle made of squares" → {"intent": "CREATE_MULTIPLE_SHAPES", "parameters": {"type": "rectangle", "pattern": "circle"}}
- "make a star made of circles" → {"intent": "CREATE_MULTIPLE_SHAPES", "parameters": {"type": "circle", "pattern": "star"}}
- "draw a square made of rectangles" → {"intent": "CREATE_MULTIPLE_SHAPES", "parameters": {"type": "rectangle", "pattern": "square"}}
- "create a triangle made of circles" → {"intent": "CREATE_MULTIPLE_SHAPES", "parameters": {"type": "circle", "pattern": "triangle"}}
- "move selected to center" → {"intent": "MOVE_SHAPE", "parameters": {"target": "selected", "moveTo": "center"}}
- "center the selected rectangle" → {"intent": "MOVE_SHAPE", "parameters": {"target": "selected", "moveTo": "center"}}
- "move it to the middle of the screen" → {"intent": "MOVE_SHAPE", "parameters": {"target": "selected", "moveTo": "center"}}
- "make selected twice as big" → {"intent": "RESIZE_SHAPE", "parameters": {"target": "selected", "sizeMultiplier": 2.0}}
- "resize to 50% larger" → {"intent": "RESIZE_SHAPE", "parameters": {"target": "selected", "sizePercent": 150}}
- "make it half the size" → {"intent": "RESIZE_SHAPE", "parameters": {"target": "selected", "sizeMultiplier": 0.5}}
- "double the size" → {"intent": "RESIZE_SHAPE", "parameters": {"target": "selected", "sizeMultiplier": 2.0}}

Grid creation rules:
- For grid commands with specific dimensions (e.g., "3x3", "5 by 5", "4x6"), use CREATE_MULTIPLE_SHAPES with gridRows and gridCols
- "NxM grid" → gridRows: N, gridCols: M (N rows, M columns)
- "N by M grid" → gridRows: N, gridCols: M
- "square grid" without dimensions → use a reasonable default like 3x3
- Grids will be centered in the viewport with automatic spacing
- Maximum grid size is 15x15 (225 shapes)
- "squares" → use type "rectangle" (not a separate type)

Pattern creation rules (shapes made of shapes):
- For "X made of Y" or "Y forming X" commands, use CREATE_MULTIPLE_SHAPES with pattern parameter
- Pattern is the TARGET SHAPE to draw (circle, square, star, triangle, heart, diamond)
- Type is the BUILDING BLOCK shape (rectangle, circle, text)
- Examples: "circle made of squares" → type: "rectangle", pattern: "circle"
- Examples: "star made of circles" → type: "circle", pattern: "star"
- Supported patterns: circle, square, star, triangle, heart, diamond, line
- Building blocks will be arranged to form the outline/shape of the pattern
- "squares" → always use type "rectangle"

IMPORTANT: If user requests to create a "line", return an error response explaining that lines are not supported.
Only rectangles, circles, and text can be created.

Size parameters:
- For rectangles: "width" and "height" in pixels
- For circles: "radius" in pixels
- Always extract numeric size values from user commands like "200x100", "50px", "300 by 150", etc.

Response format:
{
  "intent": "INTENT_NAME",
  "parameters": { ... },
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}

If you cannot parse the command with >70% confidence, return:
{
  "intent": "UNKNOWN",
  "confidence": 0.0,
  "reasoning": "explanation of what wasn't understood"
}

Important positioning rules:
- Shapes should be positioned within the current viewport (visible screen area)
- If no position specified: shapes will be placed within the viewport bounds
- "at center" or "in the center": use viewport center
- "at X,Y" coordinates: use exact position
- Viewport center and bounds will be provided in context
- Ensure shapes fit within the viewport dimensions considering their size
- For MOVE_SHAPE intent with selected shapes: "moveTo": "center" moves shapes to viewport center
- Commands like "move to center", "center it", "move to middle" should use moveTo parameter

Color handling:
- Support color names (red, blue, green, etc.)
- Support hex values (#FF0000)
- Default colors: circle = blue, rectangle = gray, text = black

Size handling:
- "bigger" = 1.5x current size
- "smaller" = 0.5x current size
- "double" = 2x current size
- Default rectangle: 100x100
- Default circle radius: 50

Target resolution for ambiguous references:
- "it" or "this" → last created shape OR first selected shape
- "selected" → all currently selected shapes
- "the circle" → most recently created circle
- No target specified for modifications → use selected shapes or last created
- "move it to center" with selected shapes → move selected shapes to viewport center
- "center the rectangle" with selected shapes → move selected shapes to viewport center

Selected shape awareness:
- When exactly 1 shape is selected, you will receive its full details (type, position, size, color, etc.)
- Use this information to make context-aware decisions
- For relative commands like "move it right 100px", use the current position as reference
- For size changes like "make it twice as big", use the current dimensions
- For positioning like "move to 500,500", you know where it currently is
- For color changes, you can reference the current color
- IMPORTANT: DO NOT include shape IDs in your response parameters - the system handles targeting automatically
- Always use "target": "selected" for operations on the selected shape
- Examples:
  * Current: rectangle at (100, 200), 50x50 → "move right 100" → new position (200, 200)
  * Current: circle with radius 30 → "double the size" → sizeMultiplier: 2.0, target: "selected"
  * Current: shape at (100, 100) → "move to 500, 500" → new position (500, 500), target: "selected"

Always return pure JSON with no markdown formatting or explanations outside the JSON structure.`

/**
 * Build user prompt with command and context
 */
const buildUserPrompt = (commandText, context) => {
  const { 
    viewportCenter, 
    viewportWidth = 1920,
    viewportHeight = 1080,
    viewportBounds,
    selectedShapeIds = [],
    selectedShape = null,
    lastCreatedShape, 
    totalShapes = 0 
  } = context

  const boundsStr = viewportBounds 
    ? `left: ${Math.round(viewportBounds.left)}, right: ${Math.round(viewportBounds.right)}, top: ${Math.round(viewportBounds.top)}, bottom: ${Math.round(viewportBounds.bottom)}`
    : 'not available'

  // Build selected shape details string
  let selectedShapeStr = `${selectedShapeIds.length} shape(s) selected`
  if (selectedShape) {
    const shapeDetails = []
    shapeDetails.push(`Type: ${selectedShape.type}`)
    shapeDetails.push(`Position: (${Math.round(selectedShape.x)}, ${Math.round(selectedShape.y)})`)
    
    if (selectedShape.type === 'rectangle') {
      shapeDetails.push(`Size: ${selectedShape.width}x${selectedShape.height}`)
    } else if (selectedShape.type === 'circle') {
      shapeDetails.push(`Radius: ${selectedShape.radius}`)
    } else if (selectedShape.type === 'text') {
      shapeDetails.push(`Text: "${selectedShape.text}"`)
      if (selectedShape.fontSize) shapeDetails.push(`Font size: ${selectedShape.fontSize}`)
    }
    
    if (selectedShape.fill) shapeDetails.push(`Fill: ${selectedShape.fill}`)
    if (selectedShape.stroke) shapeDetails.push(`Stroke: ${selectedShape.stroke}`)
    if (selectedShape.rotation) shapeDetails.push(`Rotation: ${Math.round(selectedShape.rotation)}°`)
    if (selectedShape.opacity !== undefined && selectedShape.opacity !== 1) {
      shapeDetails.push(`Opacity: ${selectedShape.opacity}`)
    }
    
    selectedShapeStr = `1 shape selected:\n  - ${shapeDetails.join('\n  - ')}`
  }

  return `Command: "${commandText}"

Current Context:
- Viewport center: (${Math.round(viewportCenter?.x || 0)}, ${Math.round(viewportCenter?.y || 0)})
- Viewport size: ${Math.round(viewportWidth)}x${Math.round(viewportHeight)} pixels
- Viewport bounds: ${boundsStr}
- Selected shapes: ${selectedShapeStr}
- Last created shape: ${lastCreatedShape ? `${lastCreatedShape.type} (ID: ${lastCreatedShape.id})` : 'none'}
- Total shapes on canvas: ${totalShapes}
- Canvas dimensions: 3000x3000 (bounded area)

Parse this command and return structured JSON.`
}

/**
 * Error message mapping for user-friendly display
 */
const ERROR_MESSAGES = {
  NO_API_KEY: 'AI service not configured. Please add VITE_OPENAI_API_KEY to environment variables.',
  TIMEOUT: 'AI request timed out. Please try again.',
  RATE_LIMIT: 'Too many requests. Please wait a moment and try again.',
  NETWORK: 'Network error. Please check your connection.',
  PARSE_ERROR: 'Could not understand the response from AI. Please try again.',
  LOW_CONFIDENCE: 'I couldn\'t understand that command. Try being more specific.',
  UNKNOWN_INTENT: 'I\'m not sure how to do that. Try commands like "draw a circle" or "create a rectangle".',
  INVALID_INPUT: 'Command cannot be empty.',
  TOO_LONG: 'Command too long (max 500 characters).',
  API_ERROR: 'AI service error. Please try again.',
}

/**
 * AI Service Class
 */
class AIService {
  constructor() {
    this.openai = null
    this.initialized = false
    this.initPromise = null
  }

  /**
   * Initialize OpenAI client (lazy initialization)
   */
  async initialize() {
    if (this.initialized) {
      return
    }

    if (this.initPromise) {
      return this.initPromise
    }

    this.initPromise = (async () => {
      try {
        if (!OPENAI_CONFIG.apiKey) {
          throw new Error(ERROR_MESSAGES.NO_API_KEY)
        }

        this.openai = new OpenAI(OPENAI_CONFIG)
        this.initialized = true
        console.log('✅ OpenAI client initialized')
      } catch (error) {
        console.error('❌ Failed to initialize OpenAI client:', error)
        throw error
      }
    })()

    return this.initPromise
  }

  /**
   * Parse natural language command into structured format
   * 
   * @param {string} commandText - Natural language command from user
   * @param {Object} contextData - Canvas context (viewport, selection, etc.)
   * @returns {Promise<Object>} Parsed command with intent and parameters
   */
  async parseNaturalLanguageCommand(commandText, contextData = {}) {
    // Validate input
    if (!commandText || typeof commandText !== 'string') {
      throw new Error(ERROR_MESSAGES.INVALID_INPUT)
    }

    const trimmed = commandText.trim()
    
    if (trimmed.length === 0) {
      throw new Error(ERROR_MESSAGES.INVALID_INPUT)
    }

    if (trimmed.length > 500) {
      throw new Error(ERROR_MESSAGES.TOO_LONG)
    }

    // Initialize OpenAI client if needed
    await this.initialize()

    const startTime = Date.now()

    try {
      // Build prompts
      const systemPrompt = SYSTEM_PROMPT
      const userPrompt = buildUserPrompt(trimmed, contextData)

      console.log('🤖 Sending command to OpenAI:', trimmed)

      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(ERROR_MESSAGES.TIMEOUT)), TIMEOUT)
      })

      // Call OpenAI API
      const apiPromise = this.openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: TEMPERATURE,
        max_tokens: MAX_TOKENS,
        response_format: { type: 'json_object' }
      })

      // Race between API call and timeout
      const response = await Promise.race([apiPromise, timeoutPromise])

      const duration = Date.now() - startTime
      console.log(`✅ OpenAI response received in ${duration}ms`)

      // Parse response
      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error(ERROR_MESSAGES.PARSE_ERROR)
      }

      let parsed
      try {
        parsed = JSON.parse(content)
      } catch (e) {
        console.error('Failed to parse OpenAI response:', content)
        throw new Error(ERROR_MESSAGES.PARSE_ERROR)
      }

      // Check confidence threshold
      if (parsed.confidence < 0.7) {
        throw new Error(parsed.reasoning || ERROR_MESSAGES.LOW_CONFIDENCE)
      }

      // Check for UNKNOWN intent
      if (parsed.intent === 'UNKNOWN') {
        throw new Error(parsed.reasoning || ERROR_MESSAGES.UNKNOWN_INTENT)
      }

      // Validate structure
      if (!parsed.intent || !parsed.parameters) {
        throw new Error(ERROR_MESSAGES.PARSE_ERROR)
      }

      console.log('✅ Command parsed successfully:', parsed)

      return parsed

    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`❌ AI parsing failed after ${duration}ms:`, error)

      // Handle specific OpenAI errors
      if (error.code === 'insufficient_quota' || error.status === 429) {
        throw new Error(ERROR_MESSAGES.RATE_LIMIT)
      }

      if (error.code === 'invalid_api_key' || error.status === 401) {
        throw new Error(ERROR_MESSAGES.NO_API_KEY)
      }

      if (error.message && error.message.includes('network')) {
        throw new Error(ERROR_MESSAGES.NETWORK)
      }

      // Re-throw formatted errors
      if (error.message && Object.values(ERROR_MESSAGES).includes(error.message)) {
        throw error
      }

      // Generic API error
      throw new Error(error.message || ERROR_MESSAGES.API_ERROR)
    }
  }

  /**
   * Validate command structure (client-side check)
   *
   * @param {Object} command - Parsed command object
   * @returns {boolean} True if valid
   */
  validateCommand(command) {
    if (!command || typeof command !== 'object') {
      return false
    }

    const validIntents = [
      'CREATE_SHAPE',
      'CREATE_MULTIPLE_SHAPES',
      'CREATE_TEXT',
      'MOVE_SHAPE',
      'RESIZE_SHAPE',
      'CHANGE_STYLE',
      'ARRANGE_SHAPES',
      'CHANGE_LAYER',
      'CREATE_TEMPLATE',
      'DELETE_SHAPE',
      'QUERY_INFO'
    ]

    if (!validIntents.includes(command.intent)) {
      return false
    }

    if (!command.parameters || typeof command.parameters !== 'object') {
      return false
    }

    return true
  }

  /**
   * Get error message for display
   * 
   * @param {Error} error - Error object
   * @returns {string} User-friendly error message
   */
  getErrorMessage(error) {
    if (error.message && Object.values(ERROR_MESSAGES).includes(error.message)) {
      return error.message
    }
    return ERROR_MESSAGES.API_ERROR
  }
}

// Export singleton instance
export default new AIService()
