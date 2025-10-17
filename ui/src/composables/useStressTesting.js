// Performance Testing Utilities
export const useStressTesting = () => {
  
  // Create multiple rectangles for load testing
  const createMultipleRectangles = async (count = 100, canvasId = 'default') => {
    // console.log(`🧪 Stress Test: Creating ${count} rectangles...`)
    
    const startTime = Date.now()
    const promises = []
    
    for (let i = 0; i < count; i++) {
      const x = Math.random() * 2800 + 100 // Random position within canvas
      const y = Math.random() * 2800 + 100
      
      promises.push(
        // Simulate concurrent creation (in real app this would be createRectangle)
        new Promise(resolve => {
          setTimeout(() => {
            resolve({
              id: `stress_test_${Date.now()}_${i}`,
              x, y,
              width: 100, height: 100,
              fill: `hsl(${Math.random() * 360}, 70%, 60%)`,
              createdAt: Date.now()
            })
          }, Math.random() * 100) // Stagger creation
        })
      )
    }
    
    const rectangles = await Promise.all(promises)
    const duration = Date.now() - startTime
    
    // console.log(`✅ Created ${count} rectangles in ${duration}ms`)
    // console.log(`📊 Average: ${(duration / count).toFixed(2)}ms per rectangle`)
    
    return rectangles
  }

  // Simulate multiple users with cursor movement
  const simulateMultipleUsers = (userCount = 5, duration = 30000) => {
    // console.log(`👥 Simulating ${userCount} users for ${duration/1000}s...`)
    
    const intervals = []
    
    for (let i = 0; i < userCount; i++) {
      const userId = `test_user_${i}`
      
      // Each user moves their cursor every 100ms
      const interval = setInterval(() => {
        const x = Math.random() * 1000
        const y = Math.random() * 1000
        
        // Simulate cursor update (would call updateCursorPosition in real app)
        console.debug(`User ${userId} cursor: (${x.toFixed(0)}, ${y.toFixed(0)})`)
      }, 50 + Math.random() * 50) // 50-100ms intervals
      
      intervals.push(interval)
    }
    
    // Clean up after duration
    setTimeout(() => {
      intervals.forEach(interval => clearInterval(interval))
      // console.log(`🛑 Stopped simulating ${userCount} users`)
    }, duration)
    
    return intervals
  }

  // Rapid rectangle creation test
  const rapidCreationTest = async (count = 30, timeWindow = 10000) => {
    // console.log(`⚡ Rapid Creation Test: ${count} rectangles in ${timeWindow/1000}s`)
    
    const startTime = Date.now()
    const interval = timeWindow / count
    let created = 0
    
    const createNext = () => {
      if (created >= count) {
        const duration = Date.now() - startTime
        // console.log(`⚡ Rapid test complete: ${created} rectangles in ${duration}ms`)
        return
      }
      
      created++
      const x = Math.random() * 2800 + 100
      const y = Math.random() * 2800 + 100
      
      console.debug(`Rapid create #${created} at (${x.toFixed(0)}, ${y.toFixed(0)})`)
      
      setTimeout(createNext, interval)
    }
    
    createNext()
  }

  // Test drag performance with multiple rectangles
  const dragPerformanceTest = () => {
    // console.log(`🖱️ Drag Performance Test: Simulating rapid drags...`)
    
    let dragCount = 0
    const startTime = Date.now()
    
    const simulateDrag = () => {
      if (dragCount >= 100) {
        const duration = Date.now() - startTime
        // console.log(`🖱️ Drag test complete: ${dragCount} drags in ${duration}ms`)
        // console.log(`📊 Average: ${(duration / dragCount).toFixed(2)}ms per drag`)
        return
      }
      
      dragCount++
      const x = Math.random() * 500
      const y = Math.random() * 500
      
      console.debug(`Drag #${dragCount} to (${x.toFixed(0)}, ${y.toFixed(0)})`)
      
      setTimeout(simulateDrag, 50) // 50ms between drags
    }
    
    simulateDrag()
  }

  // Memory usage monitor
  const monitorMemory = (duration = 60000, interval = 5000) => {
    // console.log(`💾 Memory Monitor: Tracking for ${duration/1000}s...`)
    
    const measurements = []
    
    const measure = () => {
      if (performance.memory) {
        const memory = {
          used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
          limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024),
          timestamp: Date.now()
        }
        
        measurements.push(memory)
        // console.log(`💾 Memory: ${memory.used}MB used / ${memory.total}MB total`)
        
        // Warning if memory usage is high
        if (memory.used > memory.limit * 0.8) {
          console.warn(`⚠️ High memory usage: ${memory.used}MB (${((memory.used/memory.limit)*100).toFixed(1)}%)`)
        }
      }
    }
    
    const monitorInterval = setInterval(measure, interval)
    
    setTimeout(() => {
      clearInterval(monitorInterval)
      // console.log(`💾 Memory monitoring complete. Collected ${measurements.length} measurements.`)
      
      if (measurements.length > 0) {
        const maxMemory = Math.max(...measurements.map(m => m.used))
        const avgMemory = measurements.reduce((sum, m) => sum + m.used, 0) / measurements.length
        // console.log(`💾 Peak memory: ${maxMemory}MB, Average: ${avgMemory.toFixed(1)}MB`)
      }
    }, duration)
    
    // Initial measurement
    measure()
    
    return measurements
  }

  return {
    createMultipleRectangles,
    simulateMultipleUsers,
    rapidCreationTest,
    dragPerformanceTest,
    monitorMemory
  }
}
