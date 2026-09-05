import { useState, useEffect } from 'react'
import {
  adminListTransactions, adminListStories, adminListPurchases,
  adminAdjustCredits, adminSetTier, adminUpdateNotesTags,
} from '../../services/supabaseApi'

const TIERS = ['free', 'starter', 'popular', 'power', 'unlimited']

export default function AdminUserDrawer({ profile, currentAdminId, onClose, onChanged }) {
  const [creditDelta, setCreditDelta] = useState('')
  const [creditNote, setCreditNote]   = useState('')
  const [tier, setTier]               = useState(profile.tier)
  const [notes, setNotes]             = useState(profile.notes || '')
  const [tagsText, setTagsText]       = useState((profile.tags || []).join(', '))
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState(null)
  const [timeline, setTimeline]       = useState([])
  const [loadingTimeline, setLoadingTimeline] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoadingTimeline(true)
      try {
        const [tx, stories, purchases] = await Promise.all([
          adminListTransactions(profile.id),
          adminListStories(profile.id),
          adminListPurchases(profile.id),
        ])
        const merged = [
          ...tx.map((t) => ({ kind: 'transaction', at: t.created_at, ...t })),
          ...stories.map((s) => ({ kind: 'story', at: s.created_at, ...s })),
          ...purchases.map((p) => ({ kind: 'purchase', at: p.created_at, ...p })),
        ].sort((a, b) => new Date(b.at) - new Date(a.at))
        if (!cancelled) setTimeline(merged)
      } finally {
        if (!cancelled) setLoadingTimeline(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [profile.id])

  async function handleAdjustCredits(sign) {
    const amount = parseInt(creditDelta, 10)
    if (!amount || amount <= 0) { setError('Enter a positive number of credits.'); return }
    setSaving(true)
    setError(null)
    try {
      await adminAdjustCredits(profile.id, sign * amount, creditNote || null)
      setCreditDelta('')
      setCreditNote('')
      onChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveTier() {
    setSaving(true)
    setError(null)
    try {
      await adminSetTier(profile.id, tier)
      onChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveNotesTags() {
    setSaving(true)
    setError(null)
    try {
      const tags = tagsText.split(',').map((t) => t.trim()).filter(Boolean)
      await adminUpdateNotesTags(profile.id, notes, tags)
      onChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal admin-drawer" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">×</button>

        <div className="admin-drawer-header">
          {profile.picture
            ? <img src={profile.picture} alt="" className="admin-drawer-avatar" referrerPolicy="no-referrer" />
            : <span className="admin-avatar-fallback large">{(profile.name || profile.email)?.[0]?.toUpperCase()}</span>}
          <div>
            <h2 className="admin-drawer-name">{profile.name || 'Unnamed'}</h2>
            <p className="admin-drawer-email">{profile.email}</p>
          </div>
        </div>

        {error && <p className="payment-error">{error}</p>}

        <section className="admin-drawer-section">
          <label className="section-label">Credits — currently {profile.credits}</label>
          <div className="admin-credit-row">
            <input
              type="number"
              min="1"
              className="text-input admin-credit-input"
              placeholder="Amount"
              value={creditDelta}
              onChange={(e) => setCreditDelta(e.target.value)}
            />
            <input
              className="text-input"
              placeholder="Note (optional)"
              value={creditNote}
              onChange={(e) => setCreditNote(e.target.value)}
            />
            <button className="btn-secondary" disabled={saving} onClick={() => handleAdjustCredits(1)}>+ Add</button>
            <button className="btn-secondary" disabled={saving} onClick={() => handleAdjustCredits(-1)}>− Remove</button>
          </div>
        </section>

        <section className="admin-drawer-section">
          <label className="section-label">Tier</label>
          <div className="admin-credit-row">
            <select className="adv-select" value={tier} onChange={(e) => setTier(e.target.value)}>
              {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <button className="btn-secondary" disabled={saving || tier === profile.tier} onClick={handleSaveTier}>Save</button>
          </div>
        </section>

        <section className="admin-drawer-section">
          <label className="section-label">Tags <span className="optional">(comma-separated)</span></label>
          <input className="text-input" value={tagsText} onChange={(e) => setTagsText(e.target.value)} />
          <label className="section-label mt-sm">Notes</label>
          <textarea className="text-input textarea" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          <button className="btn-secondary mt-sm" disabled={saving} onClick={handleSaveNotesTags}>Save Notes & Tags</button>
        </section>

        <section className="admin-drawer-section">
          <label className="section-label">Activity Timeline</label>
          {loadingTimeline ? (
            <p className="admin-timeline-empty">Loading…</p>
          ) : timeline.length === 0 ? (
            <p className="admin-timeline-empty">No activity yet.</p>
          ) : (
            <ul className="admin-timeline">
              {timeline.map((item, i) => (
                <li key={`${item.kind}-${item.id ?? i}`} className="admin-timeline-item">
                  <span className="admin-timeline-date">{new Date(item.at).toLocaleString()}</span>
                  {item.kind === 'transaction' && (
                    <span>
                      {item.amount > 0 ? '+' : ''}{item.amount} credits — {item.type}
                      {item.note ? ` (${item.note})` : ''}
                      {item.created_by === currentAdminId ? ' [by you]' : ''}
                    </span>
                  )}
                  {item.kind === 'story' && (
                    <span>📖 Story: {item.title || 'Untitled'} {item.delivery_mode === 'voice' ? '🎧' : ''}</span>
                  )}
                  {item.kind === 'purchase' && (
                    <span>💳 Purchase: {item.credits} credits — ₹{item.amount_inr ?? '—'} ({item.status})</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
