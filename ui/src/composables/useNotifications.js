import { reactive } from 'vue'

let singleton = null

export const useNotifications = () => {
  if (singleton) return singleton

  const toasts = reactive([])

  const push = (type, message, duration = 3000, groupKey) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    // Grouping: if groupKey provided, merge with recent same-key toast
    if (groupKey) {
      const existing = [...toasts].reverse().find(t => t.groupKey === groupKey)
      if (existing) {
        existing.count = (existing.count || 1) + 1
        existing.message = `${message} (${existing.count})`
        return existing.id
      }
    }
    const toast = { id, type, message, groupKey, count: 1 }
    toasts.push(toast)
    if (duration > 0) {
      setTimeout(() => {
        const idx = toasts.findIndex(t => t.id === id)
        if (idx !== -1) toasts.splice(idx, 1)
      }, duration)
    }
  }

  const info = (msg, ms = 2000, key) => push('info', msg, ms, key)
  const success = (msg, ms = 2000, key) => push('success', msg, ms, key)
  const warning = (msg, ms = 4000, key) => push('warning', msg, ms, key)
  const error = (msg, ms = 0, key) => push('error', msg, ms, key)

  const remove = (id) => {
    const idx = toasts.findIndex(t => t.id === id)
    if (idx !== -1) toasts.splice(idx, 1)
  }

  singleton = {
    toasts,
    info,
    success,
    warning,
    error,
    remove
  }

  return singleton
}


