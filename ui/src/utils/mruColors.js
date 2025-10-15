// MRU color lists per device/profile. Separate keys for fill and stroke.

const STORAGE_KEY_FILL = 'collabcanvas_mru_fill'
const STORAGE_KEY_STROKE = 'collabcanvas_mru_stroke'
const MAX_MRU = 5

function readList(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeList(key, list) {
  try {
    localStorage.setItem(key, JSON.stringify(list))
  } catch {
    // ignore storage errors
  }
}

function addColor(key, color) {
  if (!color) return
  const list = readList(key)
  const hex = ('' + color).toLowerCase()
  const filtered = list.filter(c => c !== hex)
  filtered.unshift(hex)
  if (filtered.length > MAX_MRU) filtered.length = MAX_MRU
  writeList(key, filtered)
  return filtered
}

export const mruColors = {
  getFill() { return readList(STORAGE_KEY_FILL) },
  getStroke() { return readList(STORAGE_KEY_STROKE) },
  addFill(color) { return addColor(STORAGE_KEY_FILL, color) },
  addStroke(color) { return addColor(STORAGE_KEY_STROKE, color) }
}
