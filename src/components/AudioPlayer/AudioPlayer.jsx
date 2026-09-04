import { useState, useEffect, useRef } from 'react'
import { attachAudioToStory } from '../../services/storage'

const SPEEDS = [0.75, 1, 1.25, 1.5, 2]

export default function AudioPlayer({ story, credits, onDeductCredits, onOutOfCredits }) {
  const [voices, setVoices]             = useState([])
  const [selectedVoice, setSelectedVoice] = useState(null)
  const [speed, setSpeed]               = useState(1)
  const [playing, setPlaying]           = useState(false)
  const [unlocked, setUnlocked]         = useState(false)
  const [progress, setProgress]         = useState(0)
  const [elapsed, setElapsed]           = useState(0)
  const [totalTime, setTotalTime]       = useState(0)
  const [highlightIdx, setHighlightIdx] = useState(-1)
  const [recording, setRecording]       = useState(false)
  const [locked, setLocked]             = useState(false)
  const [tapCount, setTapCount]         = useState(0)
  const [audioLoading, setAudioLoading] = useState(false)
  const [lockTime, setLockTime]         = useState('')

  const wakeLockRef    = useRef(null)
  const lockTimerRef   = useRef(null)

  // refs that don't need re-renders
  const words            = useRef(
    `${story.title || ''}. ${story.body || ''}`.split(/\s+/).filter(Boolean)
  )
  const wordIdxRef       = useRef(0)
  const playingRef       = useRef(false)   // mirrors `playing` state for use inside closures
  const speedRef         = useRef(1)
  const selectedVoiceRef = useRef(null)
  const voicesRef        = useRef([])      // always-current voices list for use in closures
  const timerRef         = useRef(null)
  const watchdogRef      = useRef(null)
  const startTimeRef     = useRef(0)
  const pausedElapsedRef = useRef(0)
  const tapResetRef      = useRef(null)

  // Silent AudioContext — keeps audio session alive on lock screen
  const silentCtxRef  = useRef(null)
  const silentNodeRef = useRef(null)

  // Keep refs in sync with state
  useEffect(() => { playingRef.current = playing }, [playing])
  useEffect(() => { speedRef.current = speed }, [speed])
  useEffect(() => { selectedVoiceRef.current = selectedVoice }, [selectedVoice])

  // ── Load voices ──
  useEffect(() => {
    function load() {
      const v = window.speechSynthesis.getVoices()
      if (v.length) {
        setVoices(v)
        voicesRef.current = v   // keep ref in sync for closures
      }
    }
    load()
    window.speechSynthesis.addEventListener('voiceschanged', load)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load)
  }, [])

  // Auto-select matching voice
  useEffect(() => {
    if (voices.length && !selectedVoice) {
      const lang = story.settings?.language || 'English'
      let match = voices.find((v) => v.lang.startsWith('en'))
      if (lang !== 'English') {
        const code = LANG_CODES[lang]
        if (code) match = voices.find((v) => v.lang.startsWith(code)) || match
      }
      setSelectedVoice(match || voices[0])
    }
  }, [voices, story.settings?.language])

  // Estimate total time
  useEffect(() => {
    const wps = 2.5 * speed
    const wc  = (story.body || '').split(/\s+/).filter(Boolean).length
    setTotalTime(Math.round(wc / wps))
  }, [story.body, speed])

  // Keep words array in sync as story streams in
  useEffect(() => {
    words.current = `${story.title || ''}. ${story.body || ''}`.split(/\s+/).filter(Boolean)
  }, [story.title, story.body])

  // ── Core speak — cancel old utterance, start fresh from word index ──
  function speak(fromIdx = 0) {
    const ss = window.speechSynthesis
    if (!ss) return

    // Track if something was already speaking so we know whether to delay
    const wasSpeaking = ss.speaking || ss.pending
    ss.cancel()
    clearInterval(timerRef.current)
    clearInterval(watchdogRef.current)

    wordIdxRef.current = fromIdx
    const text = words.current.slice(fromIdx).join(' ')
    if (!text.trim()) return

    const utter = new SpeechSynthesisUtterance(text)
    utter.rate  = speedRef.current

    // Always set a voice — leaving it unset causes silent failure on many mobile browsers.
    // Priority: user-selected → first available → browser default (null)
    const voice = selectedVoiceRef.current || voicesRef.current[0] || null
    if (voice) utter.voice = voice

    utter.onstart = () => {
      setAudioLoading(false)
      setPlaying(true)
      playingRef.current = true
      startTimeRef.current = Date.now()
      startTimer()
      startSilentAudio()
      updateMediaSession(true)
      startWatchdog()
    }

    utter.onboundary = (e) => {
      if (e.name !== 'word') return
      const spokenWords = text.slice(0, e.charIndex).split(/\s+/).filter(Boolean).length
      const idx = fromIdx + spokenWords
      wordIdxRef.current = idx
      setHighlightIdx(idx)
      setProgress(idx / Math.max(1, words.current.length))
    }

    utter.onend = () => {
      setPlaying(false)
      playingRef.current = false
      setHighlightIdx(-1)
      setProgress(1)
      clearInterval(timerRef.current)
      clearInterval(watchdogRef.current)
      stopSilentAudio()
      updateMediaSession(false)
    }

    utter.onerror = (e) => {
      setAudioLoading(false)
      if (e.error === 'interrupted' || e.error === 'canceled') return
      setPlaying(false)
      playingRef.current = false
      clearInterval(timerRef.current)
      clearInterval(watchdogRef.current)
    }

    function doSpeak() {
      // resume() clears Chrome's "paused" state before adding a new utterance
      ss.resume()
      ss.speak(utter)
    }

    if (wasSpeaking) {
      // Chrome needs ~50ms to finish processing cancel() before a new speak() works.
      // This delay is safe for iOS too because by the time a user pauses/restarts,
      // the TTS engine is already unlocked from the first user-gesture play.
      setTimeout(doSpeak, 50)
    } else {
      // Nothing was playing — call synchronously to preserve iOS user-gesture context.
      doSpeak()
    }
  }

  // ── Watchdog: Chrome Android stops speech after ~15s in background ──
  // Every second, if we think we're playing but speechSynthesis isn't speaking, restart.
  // 200ms grace timeout lets onend fire first for natural story completion.
  function startWatchdog() {
    clearInterval(watchdogRef.current)
    watchdogRef.current = setInterval(() => {
      if (!playingRef.current) { clearInterval(watchdogRef.current); return }
      const ss = window.speechSynthesis
      if (!ss.speaking && !ss.pending) {
        // Give onend 200ms to fire — if it does, playingRef.current becomes false
        // and we won't restart. If it doesn't, speech was killed mid-story.
        setTimeout(() => {
          if (!playingRef.current) return   // onend already fired — natural end
          if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
            speak(wordIdxRef.current)
          }
        }, 200)
      }
    }, 1000)
  }

  // ── Silent AudioContext (oscillator at gain=0 keeps audio session alive on lock screen) ──
  function startSilentAudio() {
    try {
      if (silentCtxRef.current) return
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      silentCtxRef.current = ctx

      const oscillator = ctx.createOscillator()
      const gainNode   = ctx.createGain()
      gainNode.gain.value = 0        // completely silent but session stays alive
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)
      oscillator.start()
      silentNodeRef.current = oscillator

      // If browser suspends the context (e.g. after lock), resume it
      ctx.addEventListener('statechange', () => {
        if (ctx.state === 'suspended') ctx.resume().catch(() => {})
      })
    } catch (_) {}
  }

  function stopSilentAudio() {
    try { silentNodeRef.current?.stop() } catch (_) {}
    try { silentCtxRef.current?.close() } catch (_) {}
    silentCtxRef.current  = null
    silentNodeRef.current = null
  }

  // ── MediaSession (OS lock screen controls) ──
  function updateMediaSession(isPlaying) {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.metadata = new MediaMetadata({
      title: story.title || 'Bedtime Story',
      artist: 'Bedtime Stories App',
    })
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'
    // Use speak() not resume() — resume() is broken in Chrome
    navigator.mediaSession.setActionHandler('play', () => {
      speak(wordIdxRef.current)
    })
    navigator.mediaSession.setActionHandler('pause', () => {
      window.speechSynthesis.cancel()
      clearInterval(timerRef.current)
      clearInterval(watchdogRef.current)
      stopSilentAudio()
      const totalElapsed = pausedElapsedRef.current + (Date.now() - startTimeRef.current) / 1000
      pausedElapsedRef.current = totalElapsed
      const wps = 2.5 * speedRef.current
      const timeEstimate = Math.round(wps * totalElapsed)
      wordIdxRef.current = Math.min(
        Math.max(wordIdxRef.current, timeEstimate),
        Math.max(0, words.current.length - 1)
      )
      setPlaying(false)
      playingRef.current = false
      updateMediaSession(false)
    })
  }

  function startTimer() {
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      const secs = pausedElapsedRef.current + (Date.now() - startTimeRef.current) / 1000
      setElapsed(Math.min(secs, totalTime))
    }, 500)
  }

  // ── Visibility: re-speak when returning from background / lock screen ──
  useEffect(() => {
    function onVisible() {
      if (document.hidden || !playingRef.current) return

      // Resume suspended AudioContext immediately
      if (silentCtxRef.current?.state === 'suspended') {
        silentCtxRef.current.resume().catch(() => {})
      }

      // Retry up to 4 times — some devices need a moment after unlock
      const delays = [300, 800, 1500, 3000]
      delays.forEach((ms) => {
        setTimeout(() => {
          if (!playingRef.current) return
          if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
            speak(wordIdxRef.current)
          } else if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume()
          }
        }, ms)
      })
    }

    // pageshow fires when page is restored from bfcache (back/forward navigation)
    function onPageShow(e) {
      if (e.persisted && playingRef.current) speak(wordIdxRef.current)
    }

    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('pageshow', onPageShow)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('pageshow', onPageShow)
    }
  }, []) // no deps — uses refs only

  // ── Controls ──
  function handlePlayPress() {
    if (!story.fromHistory && !unlocked) {
      if (credits < 2) { onOutOfCredits(); return }
      onDeductCredits(2)
      setUnlocked(true)
    }
    if (playing) {
      // PAUSE: stop speech and save position
      window.speechSynthesis.cancel()
      clearInterval(timerRef.current)
      clearInterval(watchdogRef.current)
      stopSilentAudio()

      // Save elapsed time
      const totalElapsed = pausedElapsedRef.current + (Date.now() - startTimeRef.current) / 1000
      pausedElapsedRef.current = totalElapsed

      // onboundary is unreliable on mobile — also estimate position from time.
      // Use whichever is further (onboundary may have advanced wordIdxRef precisely).
      const wps = 2.5 * speedRef.current
      const timeEstimate = Math.round(wps * totalElapsed)
      wordIdxRef.current = Math.min(
        Math.max(wordIdxRef.current, timeEstimate),
        Math.max(0, words.current.length - 1)
      )

      setPlaying(false)
      playingRef.current = false
      updateMediaSession(false)
    } else {
      // PLAY / RESUME from saved position
      setAudioLoading(true)
      speak(wordIdxRef.current)
    }
  }

  function handleRestart() {
    wordIdxRef.current       = 0
    pausedElapsedRef.current = 0
    setProgress(0)
    setElapsed(0)
    setHighlightIdx(-1)
    setPlaying(false)
    playingRef.current = false
    stopSilentAudio()
    speak(0)   // speak() handles cancel + delay internally
  }

  function handleSpeedChange(s) {
    setSpeed(s)
    speedRef.current = s
    if (playingRef.current) {
      speak(wordIdxRef.current)   // speak() handles cancel + delay internally
    }
  }

  // Seek to a 0-1 fraction — called while dragging (visual only) or on release (speak)
  function handleSeekChange(frac) {
    const clamped = Math.max(0, Math.min(1, frac))
    const idx = Math.floor(clamped * words.current.length)
    wordIdxRef.current        = idx
    pausedElapsedRef.current  = clamped * totalTime
    setProgress(clamped)
    setElapsed(clamped * totalTime)
  }

  function handleSeekCommit(frac) {
    handleSeekChange(frac)
    // Only seek if already unlocked/fromHistory; don't auto-unlock via scrub
    if (unlocked || story.fromHistory) {
      speak(Math.floor(Math.max(0, Math.min(1, frac)) * words.current.length))
    }
  }

  function getTime() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  async function handleLock() {
    setLocked(true)
    setTapCount(0)
    clearTimeout(tapResetRef.current)
    setLockTime(getTime())

    // Live clock
    lockTimerRef.current = setInterval(() => setLockTime(getTime()), 10000)

    // Fullscreen
    try {
      await document.documentElement.requestFullscreen?.()
    } catch (_) {}

    // Screen Wake Lock — prevent screen from sleeping
    try {
      wakeLockRef.current = await navigator.wakeLock?.request('screen')
    } catch (_) {}

    // Orientation lock — portrait only
    try {
      await screen.orientation?.lock?.('portrait')
    } catch (_) {}

    // Re-enter fullscreen if user exits via hardware back/home
    document.addEventListener('fullscreenchange', handleFullscreenChange)
  }

  function handleFullscreenChange() {
    if (!document.fullscreenElement && locked) {
      // Re-request after short delay
      setTimeout(() => {
        document.documentElement.requestFullscreen?.().catch(() => {})
      }, 300)
    }
  }

  async function handleUnlock() {
    setLocked(false)
    setTapCount(0)
    clearTimeout(tapResetRef.current)
    clearInterval(lockTimerRef.current)

    document.removeEventListener('fullscreenchange', handleFullscreenChange)

    // Exit fullscreen
    try { await document.exitFullscreen?.() } catch (_) {}

    // Release wake lock
    try { await wakeLockRef.current?.release(); wakeLockRef.current = null } catch (_) {}

    // Release orientation lock
    try { screen.orientation?.unlock?.() } catch (_) {}
  }

  function handleLockTap() {
    clearTimeout(tapResetRef.current)
    setTapCount((prev) => {
      const next = prev + 1
      if (next >= 3) { handleUnlock(); return 0 }
      tapResetRef.current = setTimeout(() => setTapCount(0), 1500)
      return next
    })
  }

  // ── Audio download ──
  async function handleDownloadAudio() {
    try {
      setRecording(true)
      const stream   = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks   = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' })
        const reader = new FileReader()
        reader.onload = () => attachAudioToStory(story.id, reader.result, 'audio/webm')
        reader.readAsDataURL(blob)
        downloadBlob(blob, `${story.title}.webm`)
        stream.getTracks().forEach((t) => t.stop())
        setRecording(false)
      }
      recorder.start()
      const utter = new SpeechSynthesisUtterance(`${story.title}. ${story.body || ''}`)
      utter.rate  = speedRef.current
      utter.voice = selectedVoiceRef.current
      utter.onend   = () => recorder.stop()
      utter.onerror = () => { recorder.stop(); setRecording(false) }
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(utter)
    } catch {
      setRecording(false)
      alert('Microphone access needed for audio download. Saving as text instead.')
      downloadBlob(new Blob([`${story.title}\n\n${story.body}`], { type: 'text/plain' }), `${story.title}.txt`)
    }
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob)
    const a   = document.createElement('a')
    a.href    = url
    a.download = filename.replace(/[^a-z0-9.\-_]/gi, '_')
    a.click()
    URL.revokeObjectURL(url)
  }

  // Cleanup
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel()
      clearInterval(timerRef.current)
      clearInterval(watchdogRef.current)
      clearInterval(lockTimerRef.current)
      stopSilentAudio()
      document.exitFullscreen?.().catch(() => {})
      wakeLockRef.current?.release().catch(() => {})
      screen.orientation?.unlock?.()
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  const storyTitle     = story.title || ''
  const titleWordCount = storyTitle.split(/\s+/).filter(Boolean).length

  return (
    <div className="audio-player">
      <h3 className="player-heading">🎧 Voice Playback</h3>

      {!unlocked && !story.fromHistory && (
        <div className="voice-cost-notice">
          <span>Listening costs <strong>2 credits</strong> (you have {credits})</span>
        </div>
      )}

      {audioLoading && (
        <div className="audio-loading">
          <div className="audio-loading-dots">
            <span>🌙</span>
            <span>⭐</span>
            <span>✨</span>
          </div>
          <p className="audio-loading-text">Preparing your story's voice…</p>
        </div>
      )}

      <div className="player-controls">
        <button
          className={`btn-play${playing ? ' playing' : ''}`}
          onClick={handlePlayPress}
          disabled={recording}
        >
          {playing ? '⏸ Pause' : (unlocked || story.fromHistory) ? '▶ Play' : '▶ Play — 2 credits'}
        </button>
        <button className="btn-restart" onClick={handleRestart} title="Restart from beginning">
          ↩ Restart
        </button>
        {(unlocked || story.fromHistory) && playing && (
          <button className="btn-lock" onClick={handleLock} title="Lock screen">
            🔒 Lock
          </button>
        )}
      </div>

      <div className="progress-wrap">
        <input
          type="range"
          className="progress-range"
          min={0}
          max={1000}
          value={Math.round(progress * 1000)}
          style={{ '--progress': Math.round(progress * 100) }}
          onChange={(e) => handleSeekChange(e.target.value / 1000)}
          onMouseUp={(e)   => handleSeekCommit(e.target.value / 1000)}
          onTouchEnd={(e)  => handleSeekCommit(e.target.value / 1000)}
          onKeyUp={(e)     => handleSeekCommit(e.target.value / 1000)}
          aria-label="Seek"
        />
        <div className="progress-time">
          <span>{fmt(elapsed)}</span>
          <span>{fmt(totalTime)}</span>
        </div>
      </div>

      <div className="speed-controls">
        <span className="speed-label">Speed:</span>
        {SPEEDS.map((s) => (
          <button key={s} className={`btn-speed${speed === s ? ' active' : ''}`} onClick={() => handleSpeedChange(s)}>
            {s}x
          </button>
        ))}
      </div>

      {voices.length > 0 && (
        <div className="voice-selector">
          <label className="voice-label">Voice:</label>
          <select
            className="voice-select"
            value={selectedVoice?.name || ''}
            onChange={(e) => {
              const v = voicesRef.current.find((v) => v.name === e.target.value)
              setSelectedVoice(v)
              selectedVoiceRef.current = v  // sync immediately
              if (playingRef.current) speak(wordIdxRef.current)
            }}
          >
            {voices.map((v) => (
              <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
            ))}
          </select>
        </div>
      )}

      {(unlocked || story.fromHistory) && (
        <div className="highlighted-story">
          <p className="hl-title">
            {storyTitle.split(/\s+/).filter(Boolean).map((w, i) => (
              <span key={i} className={highlightIdx === i ? 'word-highlight' : ''}>{w}{' '}</span>
            ))}
          </p>
          {(() => {
            let bodyWordOffset = 0
            return (story.body || '').split('\n').map((para, pi) => {
              if (!para.trim()) return <br key={pi} />
              const paraWords = para.split(/\s+/).filter(Boolean)
              const startOffset = bodyWordOffset
              bodyWordOffset += paraWords.length
              return (
                <p key={pi}>
                  {paraWords.map((w, wi) => {
                    const globalIdx = titleWordCount + startOffset + wi
                    return (
                      <span key={wi} className={highlightIdx === globalIdx ? 'word-highlight' : ''}>{w}{' '}</span>
                    )
                  })}
                </p>
              )
            })
          })()}
        </div>
      )}

      <div className="download-row">
        <button className="btn-download-audio" onClick={handleDownloadAudio} disabled={recording}>
          {recording ? '⏺ Recording...' : '⬇ Download Audio'}
        </button>
        {recording && <span className="recording-hint">Capturing audio... wait for TTS to finish.</span>}
      </div>

      {locked && (
        <div className="lock-overlay" onClick={handleLockTap}>
          <div className="lock-stars" aria-hidden="true">
            {['✦','✧','✦','✧','✦','✧','✦','✧'].map((s, i) => (
              <span key={i} className="lock-star" style={{ '--i': i }}>{s}</span>
            ))}
          </div>
          <div className="lock-inner">
            <p className="lock-clock">{lockTime}</p>
            <div className="lock-icon">🌙</div>
            <h2 className="lock-title">{story.title || 'Bedtime Story'}</h2>
            <p className="lock-playing">♪ Playing…</p>
            <p className="lock-hint">Tap 3× to unlock</p>
            <div className="lock-dots">
              {[0, 1, 2].map((i) => (
                <span key={i} className={`lock-dot${tapCount > i ? ' filled' : ''}`} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function fmt(secs) {
  const s = Math.floor(secs)
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

const LANG_CODES = {
  Hindi: 'hi', Marathi: 'mr', Spanish: 'es', French: 'fr',
  German: 'de', Arabic: 'ar', Japanese: 'ja', Portuguese: 'pt',
  Tamil: 'ta', Urdu: 'ur',
}
