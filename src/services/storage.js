// ─── Storage keys ────────────────────────────────────────────────────────────
export const KEYS = {
  CREDITS:  'bs_credits',
  HISTORY:  'bs_history_v1',
  SETTINGS: 'bs_settings',
  USER:     'bs_user',
}

// ─── Device-level credits ─────────────────────────────────────────────────────
// Credits are bound to the device (localStorage), not to an account.
// First login on any device → 3 free credits, once ever.
// Same account on a different device → that device also gets 3 fresh credits.
// Switching accounts on the same device → no bonus (device already initialised).

const DEVICE_INIT_KEY    = 'bs_device_init'
const DEVICE_CREDITS_KEY = 'bs_device_credits'
const FREE_CREDITS       = 3

export function initDeviceCredits() {
  if (!localStorage.getItem(DEVICE_INIT_KEY)) {
    localStorage.setItem(DEVICE_INIT_KEY, '1')
    localStorage.setItem(DEVICE_CREDITS_KEY, String(FREE_CREDITS))
    return FREE_CREDITS
  }
  const raw = localStorage.getItem(DEVICE_CREDITS_KEY)
  return raw !== null ? parseInt(raw, 10) : 0
}

export function getDeviceCredits() {
  const raw = localStorage.getItem(DEVICE_CREDITS_KEY)
  return raw !== null ? parseInt(raw, 10) : 0
}

export function setDeviceCredits(amount) {
  localStorage.setItem(DEVICE_CREDITS_KEY, String(Math.max(0, amount)))
}

export function deductDeviceCredits(amount) {
  const next = Math.max(0, getDeviceCredits() - amount)
  setDeviceCredits(next)
  return next
}

export function addDeviceCredits(amount) {
  const next = getDeviceCredits() + amount
  setDeviceCredits(next)
  return next
}

// ─── User / Auth ──────────────────────────────────────────────────────────────

export function getUser() {
  try {
    const raw = localStorage.getItem(KEYS.USER)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function saveUser(user) {
  localStorage.setItem(KEYS.USER, JSON.stringify(user))
}

export function clearUser() {
  localStorage.removeItem(KEYS.USER)
}


// ─── History ─────────────────────────────────────────────────────────────────

export function getHistory() {
  try {
    const raw = localStorage.getItem(KEYS.HISTORY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveStory(story) {
  // story shape: { id, title, body, fullText, settings, createdAt, audioBlob? }
  const history = getHistory()
  // prepend newest first
  const updated = [story, ...history]
  localStorage.setItem(KEYS.HISTORY, JSON.stringify(updated))
  return updated
}

export function deleteStory(id) {
  const history = getHistory()
  const updated = history.filter((s) => s.id !== id)
  localStorage.setItem(KEYS.HISTORY, JSON.stringify(updated))
  return updated
}

export function clearHistory() {
  localStorage.removeItem(KEYS.HISTORY)
}

// Attach audio blob (base64) to an existing story entry
export function attachAudioToStory(id, audioBase64, mimeType) {
  const history = getHistory()
  const updated = history.map((s) =>
    s.id === id ? { ...s, audioBase64, audioMimeType: mimeType } : s
  )
  localStorage.setItem(KEYS.HISTORY, JSON.stringify(updated))
  return updated
}

// ─── Settings ────────────────────────────────────────────────────────────────

export function getSettings() {
  try {
    const raw = localStorage.getItem(KEYS.SETTINGS)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveSettings(settings) {
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings))
}

// ─── Migration ───────────────────────────────────────────────────────────────
// If we ever increment the history key (bs_history_v2 etc.) run migration here.
export function runMigrations() {
  // v1 → current: nothing to migrate yet, key is already bs_history_v1
  // Credits: never reset on app updates — just read the existing value.
}
