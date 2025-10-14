# CollabCanvas MVP - Complete Testing Guide

## 🎯 Testing Overview

This guide covers all 6 test scenarios from the PRD plus additional testing utilities for the CollabCanvas MVP.

## 🚀 Quick Start Testing

### 1. Enable Testing Mode
Add `?testing=true` to your URL to show the Testing Dashboard:
```
http://localhost:5173/canvas?testing=true
```

### 2. Enable Performance Monitoring
Add `?debug=performance` to show performance metrics:
```
http://localhost:5173/canvas?debug=performance&testing=true
```

## 📋 Test Scenarios

### Scenario 1: Two-User Simultaneous Editing
**Objective:** Test real-time collaboration with 2 users

**Steps:**
1. Open two browsers (or incognito + regular)
2. Sign in as different users in each browser
3. Both users create 3-5 rectangles rapidly
4. Both users move existing rectangles
5. Observe cursor movements in real-time

**Success Criteria:**
- ✅ All rectangles sync within 100ms
- ✅ Cursors visible with correct names/colors
- ✅ Smooth, responsive interaction
- ✅ No console errors
- ✅ Rectangle count matches on both clients

---

### Scenario 2: Mid-Edit Refresh
**Objective:** Test data persistence during refresh

**Steps:**
1. User A creates 5-10 rectangles
2. User B joins, creates 5 more rectangles
3. User A refreshes browser while User B is actively dragging
4. Verify all rectangles persist after refresh
5. Verify collaboration continues seamlessly

**Success Criteria:**
- ✅ All rectangles persist after refresh
- ✅ No data loss occurs
- ✅ User B can continue editing during/after User A's refresh
- ✅ Presence updates correctly
- ✅ No sync issues

---

### Scenario 3: Rapid Rectangle Creation
**Objective:** Test system under rapid creation load

**Steps:**
1. Two users create 20-30 rectangles rapidly (click quickly)
2. Both users move multiple rectangles quickly
3. Count total rectangles on both clients
4. Check for duplicates or missing rectangles

**Success Criteria:**
- ✅ All rectangles sync correctly
- ✅ No duplicate rectangles
- ✅ No race conditions
- ✅ Final count matches on both clients
- ✅ System remains responsive

---

### Scenario 4: Conflict Resolution
**Objective:** Test simultaneous editing of same rectangle

**Steps:**
1. Create a rectangle
2. Both users grab the SAME rectangle simultaneously
3. Drag in different directions for 3-5 seconds
4. Release and observe final position
5. Check for visual artifacts

**Success Criteria:**
- ✅ Rectangle converges to single position (last write wins)
- ✅ No errors in console
- ✅ No jumping or flickering
- ✅ Smooth conflict resolution
- ✅ Both users see same final position

---

### Scenario 5: Disconnect/Reconnect
**Objective:** Test offline/online synchronization

**Steps:**
1. Both users create 5+ rectangles
2. User A disconnects (close browser/tab)
3. User B creates 3 new rectangles, moves 2 existing
4. User A reconnects after 10-30 seconds
5. Verify synchronization

**Success Criteria:**
- ✅ User A sees all User B's changes after reconnect
- ✅ Full synchronization occurs
- ✅ Presence updates correctly (User A disappears/reappears)
- ✅ No data corruption
- ✅ Smooth reconnection

---

### Scenario 6: Multi-User Scaling
**Objective:** Test system with 3-5 concurrent users

**Steps:**
1. Open 3-5 browsers (different users)
2. All users create rectangles simultaneously
3. All users move existing rectangles
4. Observe cursors and presence
5. Monitor performance

**Success Criteria:**
- ✅ All cursors visible with correct colors/names
- ✅ All rectangles sync across all clients
- ✅ Presence list shows all users
- ✅ System remains stable and responsive
- ✅ No significant performance degradation

## 🛠️ Testing Tools & Utilities

### Browser Console Commands

```javascript
// Health check
window.bugFixes.runHealthCheck()

// Auto-fix common issues
window.bugFixes.autoFix()

// Performance monitoring (60 seconds)
window.bugFixes.startPerformanceMonitoring(60000)

// Individual fixes
window.bugFixes.fixRectangleSync()
window.bugFixes.fixCursorCleanup()
window.bugFixes.fixPerformanceIssues()

// Performance summary
window.logPerformanceSummary()

// Clean up stale cursors
window.cleanupStaleCursors()
```

### Error Testing

```javascript
// Test error handling
window.testErrorHandling()

// Simulate offline
window.dispatchEvent(new Event('offline'))

// Simulate online
window.dispatchEvent(new Event('online'))
```

## 🔍 Manual Testing Checklist

### Before Each Test Session
- [ ] Clear browser cache and localStorage
- [ ] Check Firebase Console for clean state
- [ ] Verify network connectivity
- [ ] Open browser developer tools

### During Testing
- [ ] Monitor browser console for errors
- [ ] Watch network tab for failed requests
- [ ] Observe performance metrics
- [ ] Take screenshots of issues
- [ ] Note exact steps to reproduce bugs

### After Each Test
- [ ] Record results in Testing Dashboard
- [ ] Document any issues found
- [ ] Run health check
- [ ] Clean up test data if needed

## 🐛 Common Issues & Fixes

### Rectangle Sync Issues
**Symptoms:** Rectangles don't appear on other clients, duplicates, position mismatches
**Fix:** `window.bugFixes.fixRectangleSync()`

### Cursor Problems
**Symptoms:** Stale cursors, cursors not disappearing when users leave
**Fix:** `window.bugFixes.fixCursorCleanup()`

### Performance Issues
**Symptoms:** Slow rendering, high memory usage, laggy interactions
**Fix:** `window.bugFixes.fixPerformanceIssues()`

### Presence Issues
**Symptoms:** User count mismatch, users not appearing/disappearing
**Fix:** `window.bugFixes.fixPresenceIssues()`

### Connection Issues
**Symptoms:** No sync, offline errors, Firebase connection lost
**Fix:** `window.bugFixes.fixConnectionIssues()`

## 📊 Performance Targets

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Rectangle Sync | <100ms | Performance Monitor |
| Cursor Sync | <50ms | Performance Monitor |
| Render Time | <16ms (60fps) | Performance Monitor |
| Memory Usage | <100MB | Browser DevTools |
| Max Rectangles | 100+ | Stress test |
| Max Users | 5+ | Multi-user test |

## 🎯 Test Data Management

### Creating Test Data
```javascript
// Create multiple rectangles for testing
for(let i = 0; i < 10; i++) {
  // Click on canvas to create rectangles
}
```

### Cleaning Up Test Data
```javascript
// Clear all rectangles (would need to implement)
window.clearAllRectangles?.()

// Reset user presence
window.resetPresence?.()
```

## 📈 Reporting Issues

When reporting issues, include:
1. **Test Scenario:** Which scenario was being run
2. **Steps to Reproduce:** Exact steps that led to the issue
3. **Expected Behavior:** What should have happened
4. **Actual Behavior:** What actually happened
5. **Browser/OS:** Chrome 120 on macOS, etc.
6. **Console Errors:** Any error messages
7. **Screenshots:** Visual evidence of the issue
8. **Performance Data:** If performance-related

## 🏁 Test Completion

A test scenario is considered **PASSED** when:
- All success criteria are met
- No critical issues are found
- Performance targets are achieved
- System remains stable throughout

A test scenario is considered **FAILED** when:
- Any success criteria is not met
- Critical bugs are discovered
- Performance targets are missed
- System crashes or becomes unresponsive

## 🚨 Critical Issues (Immediate Fix Required)

1. **Data Loss:** Any scenario where rectangles disappear permanently
2. **Sync Failure:** Rectangles not syncing between users
3. **Crash:** Application becomes unresponsive or crashes
4. **Security:** Any authentication bypass or data access issues
5. **Performance:** System unusable due to performance issues

## ✅ MVP Acceptance Criteria

The MVP is ready for deployment when:
- [ ] All 6 test scenarios pass
- [ ] No critical issues remain
- [ ] Performance targets are met
- [ ] Error handling works correctly
- [ ] System is stable under load
- [ ] User experience is smooth and intuitive
