// Bug Fix Utilities for CollabCanvas MVP
// These utilities help identify and fix common issues

export const useBugFixes = () => {
  
  // Fix 1: Rectangle Sync Issues
  const fixRectangleSync = () => {
    // console.log('🔧 Applying Rectangle Sync Fixes...')
    
    // Check for duplicate rectangles
    const rectangleElements = document.querySelectorAll('[data-testid="rectangle"]')
    const rectangleIds = new Set()
    const duplicates = []
    
    rectangleElements.forEach(el => {
      const id = el.getAttribute('data-rectangle-id')
      if (rectangleIds.has(id)) {
        duplicates.push(id)
      } else {
        rectangleIds.add(id)
      }
    })
    
    if (duplicates.length > 0) {
      console.warn('⚠️ Duplicate rectangles found:', duplicates)
      return { issue: 'duplicates', count: duplicates.length }
    }
    
    // console.log('✅ No rectangle sync issues detected')
    return { issue: null }
  }

  // Fix 2: Cursor Cleanup
  const fixCursorCleanup = () => {
    // console.log('🔧 Cleaning up stale cursors...')
    
    // This would call the actual cleanup function from useCursors
    if (window.cleanupStaleCursors) {
      window.cleanupStaleCursors()
      // console.log('✅ Cursor cleanup completed')
      return { fixed: true }
    }
    
    console.warn('⚠️ Cursor cleanup function not available')
    return { fixed: false }
  }

  // Fix 3: Performance Issues
  const fixPerformanceIssues = () => {
    // console.log('🔧 Optimizing performance...')
    
    const fixes = []
    
    // Check rectangle count
    const rectangleCount = document.querySelectorAll('[data-testid="rectangle"]').length
    if (rectangleCount > 100) {
      console.warn('⚠️ High rectangle count detected:', rectangleCount)
      fixes.push('Consider implementing viewport culling for better performance')
    }
    
    // Check for memory leaks (simplified)
    if (performance.memory && performance.memory.usedJSHeapSize > 50 * 1024 * 1024) {
      console.warn('⚠️ High memory usage detected')
      fixes.push('Consider clearing unused objects and listeners')
    }
    
    // Check listener count (if available)
    if (window.getEventListeners) {
      const listenerCount = Object.keys(window.getEventListeners(document)).length
      if (listenerCount > 50) {
        console.warn('⚠️ High listener count detected:', listenerCount)
        fixes.push('Review event listener cleanup')
      }
    }
    
    return { fixes, count: fixes.length }
  }

  // Fix 4: Presence Issues
  const fixPresenceIssues = () => {
    // console.log('🔧 Fixing presence issues...')
    
    // Check presence list accuracy
    const presenceElements = document.querySelectorAll('[data-testid="presence-user"]')
    const cursorElements = document.querySelectorAll('[data-testid="user-cursor"]')
    
    if (presenceElements.length !== cursorElements.length) {
      console.warn('⚠️ Presence/cursor count mismatch:', {
        presence: presenceElements.length,
        cursors: cursorElements.length
      })
      return { issue: 'mismatch', presenceCount: presenceElements.length, cursorCount: cursorElements.length }
    }
    
    // console.log('✅ Presence system appears healthy')
    return { issue: null }
  }

  // Fix 5: Connection Issues
  const fixConnectionIssues = () => {
    // console.log('🔧 Diagnosing connection issues...')
    
    const diagnostics = {
      online: navigator.onLine,
      firebaseConnected: true, // Would check actual Firebase connection
      websocketConnected: true, // Would check WebSocket if used
      lastSync: Date.now() // Would get actual last sync time
    }
    
    const issues = []
    
    if (!diagnostics.online) {
      issues.push('Device is offline')
    }
    
    if (!diagnostics.firebaseConnected) {
      issues.push('Firebase connection lost')
    }
    
    if (Date.now() - diagnostics.lastSync > 30000) {
      issues.push('No sync activity in 30+ seconds')
    }
    
    return { diagnostics, issues }
  }

  // Comprehensive Health Check
  const runHealthCheck = () => {
    // console.log('🏥 Running Comprehensive Health Check...')
    
    const results = {
      rectangleSync: fixRectangleSync(),
      cursorCleanup: fixCursorCleanup(),
      performance: fixPerformanceIssues(),
      presence: fixPresenceIssues(),
      connection: fixConnectionIssues(),
      timestamp: new Date().toISOString()
    }
    
    const totalIssues = [
      results.rectangleSync.issue ? 1 : 0,
      results.performance.count || 0,
      results.presence.issue ? 1 : 0,
      results.connection.issues.length
    ].reduce((a, b) => a + b, 0)
    
    // console.log('📊 Health Check Results:')
    // console.log(`Total Issues Found: ${totalIssues}`)
    // console.log('Detailed Results:', results)
    
    if (totalIssues === 0) {
      // console.log('✅ System appears healthy!')
    } else {
      // console.log('⚠️ Issues detected. Review the detailed results above.')
    }
    
    return results
  }

  // Auto-fix common issues
  const autoFix = () => {
    // console.log('🤖 Running Auto-Fix...')
    
    const fixes = []
    
    // Auto-cleanup cursors
    const cursorFix = fixCursorCleanup()
    if (cursorFix.fixed) {
      fixes.push('Cleaned up stale cursors')
    }
    
    // Force garbage collection if available
    if (window.gc) {
      window.gc()
      fixes.push('Triggered garbage collection')
    }
    
    // Clear console (optional)
    if (fixes.length > 0) {
      console.clear()
      // console.log('🤖 Auto-fix completed:', fixes)
    }
    
    return { fixes, count: fixes.length }
  }

  // Performance monitoring
  const startPerformanceMonitoring = (duration = 60000) => {
    // console.log(`📊 Starting performance monitoring for ${duration/1000}s...`)
    
    const startTime = Date.now()
    const measurements = []
    
    const measure = () => {
      const measurement = {
        timestamp: Date.now(),
        rectangles: document.querySelectorAll('[data-testid="rectangle"]').length,
        cursors: document.querySelectorAll('[data-testid="user-cursor"]').length,
        memory: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) : null
      }
      
      measurements.push(measurement)
      // console.log('📊 Measurement:', measurement)
    }
    
    const interval = setInterval(measure, 5000) // Every 5 seconds
    
    setTimeout(() => {
      clearInterval(interval)
      // console.log('📊 Performance monitoring complete')
      // console.log('📈 Summary:', {
      //   duration: duration / 1000,
      //   measurements: measurements.length,
      //   avgRectangles: measurements.reduce((sum, m) => sum + m.rectangles, 0) / measurements.length,
      //   avgCursors: measurements.reduce((sum, m) => sum + m.cursors, 0) / measurements.length,
      //   peakMemory: Math.max(...measurements.filter(m => m.memory).map(m => m.memory))
      // })
    }, duration)
    
    // Initial measurement
    measure()
    
    return measurements
  }

  return {
    // Individual fixes
    fixRectangleSync,
    fixCursorCleanup,
    fixPerformanceIssues,
    fixPresenceIssues,
    fixConnectionIssues,
    
    // Comprehensive tools
    runHealthCheck,
    autoFix,
    startPerformanceMonitoring
  }
}

// Make available globally for debugging
if (typeof window !== 'undefined') {
  window.bugFixes = useBugFixes()
  
  // console.log(`
// 🔧 Bug Fix Utilities Available:

// // Individual Fixes:
// window.bugFixes.fixRectangleSync()
// window.bugFixes.fixCursorCleanup()
// window.bugFixes.fixPerformanceIssues()
// window.bugFixes.fixPresenceIssues()
// window.bugFixes.fixConnectionIssues()

// // Comprehensive Tools:
// window.bugFixes.runHealthCheck()
// window.bugFixes.autoFix()
// window.bugFixes.startPerformanceMonitoring(60000)

// Use these in the browser console to diagnose and fix issues!
//   `)
}
