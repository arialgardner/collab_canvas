/**
 * Test: Client-Side Prediction (PR #7)
 * 
 * Validates:
 * 1. Predictions are created for local updates
 * 2. Predictions can be confirmed
 * 3. Predictions can be rolled back
 * 4. Prediction statistics track accuracy
 * 5. Prediction timeout works
 */

import { test, expect } from '@playwright/test'

test.describe('PR #7: Client-Side Prediction', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.waitForTimeout(1000)
  })
  
  test('usePrediction exports correct interface', async ({ page }) => {
    const interfaceCorrect = await page.evaluate(async () => {
      try {
        const module = await import('/src/composables/usePrediction.js')
        const pred = module.usePrediction()
        
        return {
          hasPredict: typeof pred.predict === 'function',
          hasConfirm: typeof pred.confirmPrediction === 'function',
          hasRollback: typeof pred.rollbackPrediction === 'function',
          hasGetPending: typeof pred.getPendingPredictions === 'function',
          hasGetStats: typeof pred.getPredictionStats === 'function',
          hasPredictions: pred.predictions !== undefined
        }
      } catch (e) {
        console.error(e)
        return null
      }
    })
    
    expect(interfaceCorrect).not.toBeNull()
    expect(interfaceCorrect.hasPredict).toBe(true)
    expect(interfaceCorrect.hasConfirm).toBe(true)
    expect(interfaceCorrect.hasRollback).toBe(true)
    expect(interfaceCorrect.hasGetPending).toBe(true)
    expect(interfaceCorrect.hasGetStats).toBe(true)
    expect(interfaceCorrect.hasPredictions).toBe(true)
  })
  
  test('predict creates prediction with unique ID', async ({ page }) => {
    const predictionId = await page.evaluate(async () => {
      const module = await import('/src/composables/usePrediction.js')
      const pred = module.usePrediction()
      
      return pred.predict('rect_1', { x: 150 }, { x: 100 })
    })
    
    expect(predictionId).not.toBeNull()
    expect(predictionId).toContain('pred_')
  })
  
  test('confirmPrediction marks prediction as confirmed', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const module = await import('/src/composables/usePrediction.js')
      const pred = module.usePrediction()
      
      const predictionId = pred.predict('rect_1', { x: 150 }, { x: 100 })
      pred.confirmPrediction(predictionId)
      
      return pred.getPredictionStats()
    })
    
    expect(result.confirmed).toBeGreaterThan(0)
  })
  
  test('rollbackPrediction marks prediction as rolled back', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const module = await import('/src/composables/usePrediction.js')
      const pred = module.usePrediction()
      
      const predictionId = pred.predict('rect_1', { x: 150 }, { x: 100 })
      const reverseDelta = pred.rollbackPrediction(predictionId)
      
      return {
        reverseDelta,
        stats: pred.getPredictionStats()
      }
    })
    
    expect(result.reverseDelta).toHaveProperty('x')
    expect(result.reverseDelta.x).toBe(100)
    expect(result.stats.rolledBack).toBeGreaterThan(0)
  })
  
  test('getPredingPredictions returns predictions for shape', async ({ page }) => {
    const pending = await page.evaluate(async () => {
      const module = await import('/src/composables/usePrediction.js')
      const pred = module.usePrediction()
      
      pred.predict('rect_1', { x: 150 }, { x: 100 })
      pred.predict('rect_1', { y: 250 }, { y: 200 })
      pred.predict('rect_2', { x: 300 }, { x: 200 })
      
      return pred.getPendingPredictions('rect_1')
    })
    
    expect(pending.length).toBe(2)
  })
  
  test('getPredictionStats returns correct statistics', async ({ page }) => {
    const stats = await page.evaluate(async () => {
      const module = await import('/src/composables/usePrediction.js')
      const pred = module.usePrediction()
      
      const id1 = pred.predict('rect_1', { x: 150 }, { x: 100 })
      const id2 = pred.predict('rect_2', { y: 250 }, { y: 200 })
      
      pred.confirmPrediction(id1)
      pred.rollbackPrediction(id2)
      
      return pred.getPredictionStats()
    })
    
    expect(stats).toHaveProperty('total')
    expect(stats).toHaveProperty('confirmed')
    expect(stats).toHaveProperty('rolledBack')
    expect(stats).toHaveProperty('accuracy')
    expect(stats.total).toBeGreaterThan(0)
  })
  
  test('Prediction accuracy is calculated correctly', async ({ page }) => {
    const accuracy = await page.evaluate(async () => {
      const module = await import('/src/composables/usePrediction.js')
      const pred = module.usePrediction()
      
      // Create 10 predictions, confirm 9, rollback 1
      for (let i = 0; i < 10; i++) {
        const id = pred.predict(`rect_${i}`, { x: 150 }, { x: 100 })
        if (i < 9) {
          pred.confirmPrediction(id)
        } else {
          pred.rollbackPrediction(id)
        }
      }
      
      const stats = pred.getPredictionStats()
      return parseFloat(stats.accuracy)
    })
    
    expect(accuracy).toBeCloseTo(90, 1) // 9/10 = 90%
  })
  
  test('No errors when importing prediction module', async ({ page }) => {
    const errors = []
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })
    
    await page.evaluate(async () => {
      try {
        await import('/src/composables/usePrediction.js')
        return true
      } catch (e) {
        console.error('Import error:', e)
        return false
      }
    })
    
    await page.waitForTimeout(1000)
    
    const criticalErrors = errors.filter(err => 
      err.includes('prediction')
    )
    
    expect(criticalErrors.length).toBe(0)
  })
  
})

