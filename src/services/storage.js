// ─── Storage keys ────────────────────────────────────────────────────────────
export const KEYS = {
  SETTINGS: 'bs_settings',
  AUDIO:    'bs_audio_v1',
}

// ─── Settings (last-used form draft) ───────────────────────────────────────────

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

// ─── Local audio cache ──────────────────────────────────────────────────────
// Recorded/downloaded audio stays device-local (keyed by story id) rather than
// syncing to the backend — it's a large blob and not needed for the CRM.

function getAudioMap() {
  try {
    const raw = localStorage.getItem(KEYS.AUDIO)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function attachAudioToStory(id, audioBase64, mimeType) {
  const map = getAudioMap()
  map[id] = { audioBase64, audioMimeType: mimeType }
  localStorage.setItem(KEYS.AUDIO, JSON.stringify(map))
}

export function getStoryAudio(id) {
  return getAudioMap()[id] || null
}
