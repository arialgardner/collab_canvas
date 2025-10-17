/**
 * AI Service Integration Tests
 * 
 * Tests for OpenAI integration and command parsing
 * Run manually with: node --experimental-modules aiService.test.js
 */

import aiService from '../services/aiService.js'
import { useAICommands } from '../composables/useAICommands.js'

// Test context data
const mockContext = {
  viewportCenter: { x: 1500, y: 1500 },
  selectedShapeIds: [],
  lastCreatedShape: null,
  totalShapes: 0
}

/**
 * Test 1: Simple shape creation
 */
async function testSimpleShapeCreation() {
  // console.log('\n📝 Test 1: Simple shape creation - "draw a circle"')
  try {
    const result = await aiService.parseNaturalLanguageCommand('draw a circle', mockContext)
    // console.log('✅ Result:', JSON.stringify(result, null, 2))
    
    if (result.intent !== 'CREATE_SHAPE') {
      console.error('❌ Expected intent CREATE_SHAPE, got:', result.intent)
      return false
    }
    
    if (result.parameters.shapeType !== 'circle') {
      console.error('❌ Expected shapeType circle, got:', result.parameters.shapeType)
      return false
    }
    
    // console.log('✅ Test 1 PASSED')
    return true
  } catch (error) {
    console.error('❌ Test 1 FAILED:', error.message)
    return false
  }
}
/**
 * Test 7: Mapping path and validation
 */
async function testMappingValidation() {
  // console.log('\n📝 Test 7: LLM validation then mapping')
  try {
    const { parseCommand } = useAICommands()
    const mapped = await parseCommand('draw a circle', mockContext)
    if (!mapped || !mapped.category || !mapped.action || !mapped.parameters) {
      console.error('❌ Mapped command missing required fields')
      return false
    }
    // console.log('✅ Test 7 PASSED')
    return true
  } catch (error) {
    console.error('❌ Test 7 FAILED:', error.message)
    return false
  }
}

/**
 * Test 2: Shape with color and position
 */
async function testShapeWithProperties() {
  // console.log('\n📝 Test 2: Shape with properties - "create a blue rectangle at 500,300"')
  try {
    const result = await aiService.parseNaturalLanguageCommand(
      'create a blue rectangle at 500,300',
      mockContext
    )
    // console.log('✅ Result:', JSON.stringify(result, null, 2))
    
    if (result.intent !== 'CREATE_SHAPE') {
      console.error('❌ Expected intent CREATE_SHAPE, got:', result.intent)
      return false
    }
    
    if (result.parameters.shapeType !== 'rectangle') {
      console.error('❌ Expected shapeType rectangle, got:', result.parameters.shapeType)
      return false
    }
    
    // console.log('✅ Test 2 PASSED')
    return true
  } catch (error) {
    console.error('❌ Test 2 FAILED:', error.message)
    return false
  }
}

/**
 * Test 3: Text creation
 */
async function testTextCreation() {
  // console.log('\n📝 Test 3: Text creation - "add text saying Hello World"')
  try {
    const result = await aiService.parseNaturalLanguageCommand(
      'add text saying Hello World',
      mockContext
    )
    // console.log('✅ Result:', JSON.stringify(result, null, 2))
    
    if (result.intent !== 'CREATE_TEXT') {
      console.error('❌ Expected intent CREATE_TEXT, got:', result.intent)
      return false
    }
    
    // console.log('✅ Test 3 PASSED')
    return true
  } catch (error) {
    console.error('❌ Test 3 FAILED:', error.message)
    return false
  }
}

/**
 * Test 4: Invalid command
 */
async function testInvalidCommand() {
  // console.log('\n📝 Test 4: Invalid command - "xyzabc nonsense"')
  try {
    const result = await aiService.parseNaturalLanguageCommand(
      'xyzabc nonsense',
      mockContext
    )
    console.error('❌ Test 4 FAILED: Should have thrown an error')
    return false
  } catch (error) {
    // console.log('✅ Correctly rejected invalid command:', error.message)
    // console.log('✅ Test 4 PASSED')
    return true
  }
}

/**
 * Test 5: Empty command validation
 */
async function testEmptyCommand() {
  // console.log('\n📝 Test 5: Empty command validation')
  try {
    const result = await aiService.parseNaturalLanguageCommand('', mockContext)
    console.error('❌ Test 5 FAILED: Should have thrown an error')
    return false
  } catch (error) {
    // console.log('✅ Correctly rejected empty command:', error.message)
    // console.log('✅ Test 5 PASSED')
    return true
  }
}

/**
 * Test 6: Command validation
 */
function testCommandValidation() {
  // console.log('\n📝 Test 6: Command validation')
  
  const validCommand = {
    intent: 'CREATE_SHAPE',
    parameters: { shapeType: 'circle' }
  }
  
  const invalidCommand1 = {
    intent: 'INVALID_INTENT',
    parameters: {}
  }
  
  const invalidCommand2 = {
    intent: 'CREATE_SHAPE'
    // Missing parameters
  }
  
  if (!aiService.validateCommand(validCommand)) {
    console.error('❌ Valid command rejected')
    return false
  }
  
  if (aiService.validateCommand(invalidCommand1)) {
    console.error('❌ Invalid command accepted (bad intent)')
    return false
  }
  
  if (aiService.validateCommand(invalidCommand2)) {
    console.error('❌ Invalid command accepted (missing parameters)')
    return false
  }
  
  // console.log('✅ Test 6 PASSED')
  return true
}

/**
 * Run all tests
 */
async function runTests() {
  // console.log('🚀 Starting AI Service Integration Tests')
  // console.log('=' .repeat(60))
  
  // Check if API key is configured
  if (!import.meta.env.VITE_OPENAI_API_KEY) {
    console.error('\n❌ VITE_OPENAI_API_KEY not configured')
    console.error('Please add your OpenAI API key to .env.local:')
    console.error('VITE_OPENAI_API_KEY=sk-...')
    return
  }
  
  const results = []
  
  // Run async tests
  results.push(await testSimpleShapeCreation())
  results.push(await testShapeWithProperties())
  results.push(await testTextCreation())
  results.push(await testInvalidCommand())
  results.push(await testEmptyCommand())
  
  // Run sync tests
  results.push(testCommandValidation())
  results.push(await testMappingValidation())
  
  // Summary
  // console.log('\n' + '='.repeat(60))
  const passed = results.filter(r => r).length
  const total = results.length
  const percentage = Math.round((passed / total) * 100)
  
  // console.log(`\n📊 Test Results: ${passed}/${total} passed (${percentage}%)`)
  
  if (passed === total) {
    // console.log('✅ All tests PASSED!')
  } else {
    // console.log(`❌ ${total - passed} test(s) FAILED`)
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error)
}

export { runTests }

