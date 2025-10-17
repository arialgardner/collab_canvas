import { ref, reactive } from 'vue'

export const useMVPTesting = () => {
  const testResults = reactive({
    scenario1: { status: 'pending', issues: [], passed: false },
    scenario2: { status: 'pending', issues: [], passed: false },
    scenario3: { status: 'pending', issues: [], passed: false },
    scenario4: { status: 'pending', issues: [], passed: false },
    scenario5: { status: 'pending', issues: [], passed: false },
    scenario6: { status: 'pending', issues: [], passed: false }
  })

  const currentTest = ref(null)
  const testStartTime = ref(null)

  // Test Scenario 1: Two-User Simultaneous Editing
  const runScenario1 = () => {
    // console.log('🧪 Starting Scenario 1: Two-User Simultaneous Editing')
    
    const instructions = `
📋 SCENARIO 1: Two-User Simultaneous Editing

🎯 OBJECTIVE: Test real-time collaboration with 2 users

📝 STEPS:
1. Open two browsers (or incognito + regular)
2. Sign in as different users in each browser
3. Both users create 3-5 rectangles rapidly
4. Both users move existing rectangles
5. Observe cursor movements in real-time

✅ SUCCESS CRITERIA:
- All rectangles sync within 100ms
- Cursors visible with correct names/colors
- Smooth, responsive interaction
- No console errors
- Rectangle count matches on both clients

⏱️ EXPECTED TIME: 2-3 minutes
    `
    
    // console.log(instructions)
    testResults.scenario1.status = 'running'
    currentTest.value = 'scenario1'
    testStartTime.value = Date.now()
    
    return {
      instructions,
      checklist: [
        'Open second browser/tab',
        'Sign in as different user',
        'Create 3-5 rectangles in each browser',
        'Move rectangles simultaneously',
        'Verify cursors are visible',
        'Check rectangle sync timing',
        'Verify no console errors'
      ]
    }
  }

  // Test Scenario 2: Mid-Edit Refresh
  const runScenario2 = () => {
    // console.log('🧪 Starting Scenario 2: Mid-Edit Refresh')
    
    const instructions = `
📋 SCENARIO 2: Mid-Edit Refresh

🎯 OBJECTIVE: Test data persistence during refresh

📝 STEPS:
1. User A creates 5-10 rectangles
2. User B joins, creates 5 more rectangles
3. User A refreshes browser while User B is actively dragging
4. Verify all rectangles persist after refresh
5. Verify collaboration continues seamlessly

✅ SUCCESS CRITERIA:
- All rectangles persist after refresh
- No data loss occurs
- User B can continue editing during/after User A's refresh
- Presence updates correctly
- No sync issues

⏱️ EXPECTED TIME: 2-3 minutes
    `
    
    // console.log(instructions)
    testResults.scenario2.status = 'running'
    currentTest.value = 'scenario2'
    testStartTime.value = Date.now()
    
    return {
      instructions,
      checklist: [
        'User A: Create 5-10 rectangles',
        'User B: Join and create 5 rectangles',
        'User B: Start dragging a rectangle',
        'User A: Refresh browser during drag',
        'Verify all rectangles still present',
        'Verify User B can continue editing',
        'Check presence updates correctly'
      ]
    }
  }

  // Test Scenario 3: Rapid Rectangle Creation
  const runScenario3 = () => {
    // console.log('🧪 Starting Scenario 3: Rapid Rectangle Creation')
    
    const instructions = `
📋 SCENARIO 3: Rapid Rectangle Creation

🎯 OBJECTIVE: Test system under rapid creation load

📝 STEPS:
1. Two users create 20-30 rectangles rapidly (click quickly)
2. Both users move multiple rectangles quickly
3. Count total rectangles on both clients
4. Check for duplicates or missing rectangles

✅ SUCCESS CRITERIA:
- All rectangles sync correctly
- No duplicate rectangles
- No race conditions
- Final count matches on both clients
- System remains responsive

⏱️ EXPECTED TIME: 3-4 minutes
    `
    
    // console.log(instructions)
    testResults.scenario3.status = 'running'
    currentTest.value = 'scenario3'
    testStartTime.value = Date.now()
    
    return {
      instructions,
      checklist: [
        'User A: Rapidly create 15 rectangles',
        'User B: Rapidly create 15 rectangles',
        'Both: Move rectangles quickly',
        'Count rectangles on both clients',
        'Check for duplicates',
        'Verify system responsiveness',
        'Check console for errors'
      ]
    }
  }

  // Test Scenario 4: Conflict Resolution
  const runScenario4 = () => {
    // console.log('🧪 Starting Scenario 4: Conflict Resolution')
    
    const instructions = `
📋 SCENARIO 4: Conflict Resolution

🎯 OBJECTIVE: Test simultaneous editing of same rectangle

📝 STEPS:
1. Create a rectangle
2. Both users grab the SAME rectangle simultaneously
3. Drag in different directions for 3-5 seconds
4. Release and observe final position
5. Check for visual artifacts

✅ SUCCESS CRITERIA:
- Rectangle converges to single position (last write wins)
- No errors in console
- No jumping or flickering
- Smooth conflict resolution
- Both users see same final position

⏱️ EXPECTED TIME: 2 minutes
    `
    
    // console.log(instructions)
    testResults.scenario4.status = 'running'
    currentTest.value = 'scenario4'
    testStartTime.value = Date.now()
    
    return {
      instructions,
      checklist: [
        'Create a test rectangle',
        'Both users grab same rectangle',
        'Drag in opposite directions',
        'Hold for 3-5 seconds',
        'Release simultaneously',
        'Verify final position matches',
        'Check for visual glitches'
      ]
    }
  }

  // Test Scenario 5: Disconnect/Reconnect
  const runScenario5 = () => {
    // console.log('🧪 Starting Scenario 5: Disconnect/Reconnect')
    
    const instructions = `
📋 SCENARIO 5: Disconnect/Reconnect

🎯 OBJECTIVE: Test offline/online synchronization

📝 STEPS:
1. Both users create 5+ rectangles
2. User A disconnects (close browser/tab)
3. User B creates 3 new rectangles, moves 2 existing
4. User A reconnects after 10-30 seconds
5. Verify synchronization

✅ SUCCESS CRITERIA:
- User A sees all User B's changes after reconnect
- Full synchronization occurs
- Presence updates correctly (User A disappears/reappears)
- No data corruption
- Smooth reconnection

⏱️ EXPECTED TIME: 3-4 minutes
    `
    
    // console.log(instructions)
    testResults.scenario5.status = 'running'
    currentTest.value = 'scenario5'
    testStartTime.value = Date.now()
    
    return {
      instructions,
      checklist: [
        'Both: Create 5+ rectangles',
        'User A: Close browser/tab',
        'User B: Create 3 new rectangles',
        'User B: Move 2 existing rectangles',
        'Wait 10-30 seconds',
        'User A: Reconnect/reopen',
        'Verify User A sees all changes',
        'Check presence updates'
      ]
    }
  }

  // Test Scenario 6: Multi-User Scaling
  const runScenario6 = () => {
    // console.log('🧪 Starting Scenario 6: Multi-User Scaling')
    
    const instructions = `
📋 SCENARIO 6: Multi-User Scaling

🎯 OBJECTIVE: Test system with 3-5 concurrent users

📝 STEPS:
1. Open 3-5 browsers (different users)
2. All users create rectangles simultaneously
3. All users move existing rectangles
4. Observe cursors and presence
5. Monitor performance

✅ SUCCESS CRITERIA:
- All cursors visible with correct colors/names
- All rectangles sync across all clients
- Presence list shows all users
- System remains stable and responsive
- No significant performance degradation

⏱️ EXPECTED TIME: 5-6 minutes
    `
    
    // console.log(instructions)
    testResults.scenario6.status = 'running'
    currentTest.value = 'scenario6'
    testStartTime.value = Date.now()
    
    return {
      instructions,
      checklist: [
        'Open 3-5 browsers',
        'Sign in as different users',
        'All: Create rectangles simultaneously',
        'All: Move rectangles',
        'Verify all cursors visible',
        'Check presence list accuracy',
        'Monitor performance',
        'Verify cross-client sync'
      ]
    }
  }

  // Record test results
  const recordResult = (scenario, passed, issues = []) => {
    const duration = testStartTime.value ? Date.now() - testStartTime.value : 0
    
    testResults[scenario].status = 'completed'
    testResults[scenario].passed = passed
    testResults[scenario].issues = issues
    testResults[scenario].duration = duration
    
    // console.log(`✅ Scenario ${scenario} completed in ${duration}ms`)
    // console.log(`Result: ${passed ? 'PASSED' : 'FAILED'}`)
    if (issues.length > 0) {
      // console.log('Issues found:', issues)
    }
  }

  // Generate test report
  const generateTestReport = () => {
    const totalTests = Object.keys(testResults).length
    const passedTests = Object.values(testResults).filter(r => r.passed).length
    const failedTests = totalTests - passedTests
    
    const report = {
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        passRate: Math.round((passedTests / totalTests) * 100)
      },
      scenarios: testResults,
      timestamp: new Date().toISOString()
    }
    
    // console.log('📊 MVP TEST REPORT')
    // console.log('==================')
    // console.log(`Total Tests: ${totalTests}`)
    // console.log(`Passed: ${passedTests}`)
    // console.log(`Failed: ${failedTests}`)
    // console.log(`Pass Rate: ${report.summary.passRate}%`)
    // console.log('\nDetailed Results:')
    
    Object.entries(testResults).forEach(([scenario, result]) => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL'
      // console.log(`${scenario}: ${status} (${result.duration}ms)`)
      if (result.issues.length > 0) {
        // issues intentionally not logged in production
      }
    })
    
    return report
  }

  // Quick automated checks
  const runAutomatedChecks = () => {
    // console.log('🤖 Running Automated Checks...')
    
    const checks = {
      rectangleCount: 0,
      cursorCount: 0,
      consoleErrors: [],
      performanceMetrics: {}
    }
    
    // Count rectangles on canvas
    const rectangles = document.querySelectorAll('[data-testid="rectangle"]')
    checks.rectangleCount = rectangles.length
    
    // Count visible cursors
    const cursors = document.querySelectorAll('[data-testid="user-cursor"]')
    checks.cursorCount = cursors.length
    
    // Check for console errors (simplified)
    const originalError = console.error
    const errors = []
    console.error = (...args) => {
      errors.push(args.join(' '))
      originalError(...args)
    }
    setTimeout(() => {
      console.error = originalError
      checks.consoleErrors = errors
    }, 1000)
    
    // console.log('Automated Checks Results:', checks)
    return checks
  }

  return {
    // Test scenarios
    runScenario1,
    runScenario2,
    runScenario3,
    runScenario4,
    runScenario5,
    runScenario6,
    
    // Results management
    recordResult,
    generateTestReport,
    runAutomatedChecks,
    
    // State
    testResults,
    currentTest
  }
}
