import { useState } from 'react'

export default function SharePanel({ story }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    const text = `${story.title}\n\n${story.body}`
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleDownloadTxt() {
    const settings = story.settings || {}
    const meta = [
      `Title: ${story.title}`,
      `Date: ${new Date(story.createdAt).toLocaleString()}`,
      `Age Group: ${settings.ageGroup || ''}`,
      `Language: ${settings.language || ''}`,
      `Tone: ${settings.tone || ''}`,
      `Length: ${settings.storyLength || ''}`,
      '',
      '─'.repeat(40),
      '',
    ].join('\n')

    const content = meta + `${story.title}\n\n${story.body}`
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${story.title.replace(/[^a-z0-9]/gi, '_')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleNativeShare() {
    if (navigator.share) {
      navigator.share({
        title: story.title,
        text: `${story.title}\n\n${story.body.slice(0, 200)}...`,
      })
    } else {
      handleCopy()
    }
  }

  return (
    <div className="share-panel">
      <h3 className="share-title">Share this story</h3>
      <div className="share-buttons">
        <button className="btn-share" onClick={handleCopy}>
          {copied ? '✓ Copied!' : '📋 Copy Text'}
        </button>
        <button className="btn-share" onClick={handleDownloadTxt}>
          📄 Download .txt
        </button>
        {'share' in navigator && (
          <button className="btn-share" onClick={handleNativeShare}>
            📤 Share
          </button>
        )}
      </div>
    </div>
  )
}
