import { useState, useEffect, useRef } from 'react'
import { streamStory, parseStory } from '../../services/api'
import { saveStory } from '../../services/storage'
import AudioPlayer from '../AudioPlayer/AudioPlayer'
import SharePanel from './SharePanel'

export default function StoryOutput({
  story: initialStory,
  credits,
  onCreditsChange,
  onDeductCredits,
  onAddCredits,
  onNewStory,
  onOutOfCredits,
}) {
  const [story, setStory]   = useState(initialStory)
  const [error, setError]   = useState(null)
  const bodyRef             = useRef(null)
  const controllerRef       = useRef(null)

  // ── Start streaming as soon as this component mounts ──
  useEffect(() => {
    // History stories or already-complete stories don't need streaming
    if (!initialStory.prompt) return

    const controller = new AbortController()
    controllerRef.current = controller

    async function run() {
      try {
        await streamStory({
          prompt: initialStory.prompt,
          onToken: (_token, accumulated) => {
            const parsed = parseStory(accumulated)
            setStory((prev) => ({
              ...prev,
              ...parsed,
              fullText: accumulated,
              streaming: true,
            }))
            // Auto-scroll while streaming
            if (bodyRef.current) {
              bodyRef.current.scrollTop = bodyRef.current.scrollHeight
            }
          },
          onDone: (accumulated) => {
            const parsed = parseStory(accumulated)
            const finalStory = {
              id:           initialStory.id,
              ...parsed,
              fullText:     accumulated,
              settings:     initialStory.settings,
              createdAt:    initialStory.createdAt,
              deliveryMode: initialStory.deliveryMode,
              streaming:    false,
            }
            saveStory(finalStory)
            setStory(finalStory)
          },
          signal: controller.signal,
        })
      } catch (err) {
        if (err.name === 'AbortError') return
        // Refund the credit on real API errors
        onAddCredits(1)
        setError(err.message || 'Something went wrong. Please try again.')
        setStory((prev) => ({ ...prev, streaming: false }))
      }
    }

    run()

    return () => controller.abort()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialStory.id])

  const isStreaming = story.streaming === true

  return (
    <div className="story-output">

      {/* ── Header ── */}
      <div className="output-header">
        <button
          className="btn-back"
          onClick={() => {
            controllerRef.current?.abort()
            onNewStory()
          }}
        >
          ← New Story
        </button>
        <div className="output-badges">
          {story.settings?.deliveryMode === 'voice' && (
            <span className="badge badge-voice">🎧 Voice Mode</span>
          )}
          {story.fromHistory && (
            <span className="badge badge-history">📚 From History</span>
          )}
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="error-banner">
          <strong>⚠️ Generation failed:</strong> {error}
          <br /><small>Your credit has been refunded.</small>
        </div>
      )}

      {/* ── Waiting for first token ── */}
      {isStreaming && !story.body && !error && (
        <div className="generating-banner">
          <div className="spinner" />
          <span>Crafting your story...</span>
        </div>
      )}

      {/* ── Story text ── */}
      {(story.title || story.body || isStreaming) && (
        <article className="story-article" ref={bodyRef}>
          {story.title
            ? <h1 className="story-title">{story.title}</h1>
            : isStreaming && <div className="story-title-placeholder shimmer" />
          }

          <div className="story-body">
            {story.body
              ? story.body.split('\n').map((para, i) =>
                  para.trim() ? <p key={i}>{para}</p> : <br key={i} />
                )
              : isStreaming && (
                  <div className="streaming-placeholder">
                    <span className="cursor-blink">▌</span>
                  </div>
                )
            }
            {isStreaming && story.body && (
              <span className="cursor-blink"> ▌</span>
            )}
          </div>
        </article>
      )}

      {/* ── Voice player — shown for all completed stories ── */}
      {!isStreaming && !error && story.body && (
        <AudioPlayer
          story={story}
          credits={credits}
          onDeductCredits={onDeductCredits}
          onOutOfCredits={onOutOfCredits}
        />
      )}

      {/* ── Share panel ── */}
      {!isStreaming && !error && story.body && (
        <SharePanel story={story} />
      )}
    </div>
  )
}
