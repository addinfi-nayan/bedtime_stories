import { useState, useEffect } from 'react'
import { getHistory, deleteStory, clearHistory } from '../../services/storage'

export default function StoryHistory({ onReadStory, onHome }) {
  const [history, setHistory] = useState([])
  const [confirmClear, setConfirmClear] = useState(false)

  useEffect(() => {
    setHistory(getHistory())
  }, [])

  function handleDelete(id) {
    const updated = deleteStory(id)
    setHistory(updated)
  }

  function handleClearAll() {
    clearHistory()
    setHistory([])
    setConfirmClear(false)
  }

  if (history.length === 0) {
    return (
      <div className="history-empty">
        <div className="history-empty-icon">📚</div>
        <h2>No stories yet</h2>
        <p>Generate your first story and it will appear here — free to re-read anytime!</p>
        <button className="btn-create-story" onClick={onHome}>✨ Create a Story</button>
      </div>
    )
  }

  return (
    <div className="story-history">
      <div className="history-header">
        <div className="history-header-left">
          <button className="btn-back" onClick={onHome}>← Create Story</button>
          <h2 className="history-title">Story History</h2>
        </div>
        <div className="history-header-actions">
          <span className="history-count">{history.length} {history.length === 1 ? 'story' : 'stories'}</span>
          {!confirmClear ? (
            <button className="btn-clear" onClick={() => setConfirmClear(true)}>Clear all</button>
          ) : (
            <span className="confirm-clear">
              Are you sure?{' '}
              <button className="btn-confirm-yes" onClick={handleClearAll}>Yes, delete all</button>
              {' '}
              <button className="btn-confirm-no" onClick={() => setConfirmClear(false)}>Cancel</button>
            </span>
          )}
        </div>
      </div>

      <div className="history-list">
        {history.map((story) => (
          <div key={story.id} className="history-card">
            <div className="history-card-main">
              <h3 className="history-card-title">{story.title || 'Untitled Story'}</h3>
              <div className="history-card-meta">
                <span>{new Date(story.createdAt).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                {story.settings?.ageGroup && <span>Age {story.settings.ageGroup}</span>}
                {story.settings?.language && story.settings.language !== 'English' && (
                  <span>{story.settings.language}</span>
                )}
                {story.settings?.tone && <span>{story.settings.tone}</span>}
                {story.settings?.deliveryMode === 'voice' && <span>🎧 Voice</span>}
              </div>
              <p className="history-card-preview">
                {story.body?.slice(0, 120).trim()}...
              </p>
            </div>
            <div className="history-card-actions">
              <button
                className="btn-reread"
                onClick={() => onReadStory(story)}
              >
                {story.settings?.deliveryMode === 'voice' ? '🎧 Re-play' : '📖 Re-read'}
              </button>
              <button
                className="btn-delete"
                onClick={() => handleDelete(story.id)}
                aria-label="Delete story"
              >
                🗑
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
