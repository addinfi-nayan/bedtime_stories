import { useState, useEffect, useMemo, useCallback } from 'react'
import { adminListProfiles, adminListAllPurchases, adminStats } from '../../services/supabaseApi'
import AdminUserDrawer from './AdminUserDrawer'

const TIERS = ['all', 'free', 'starter', 'popular', 'power', 'unlimited']

export default function AdminDashboard({ currentAdminId }) {
  const [profiles, setProfiles]   = useState([])
  const [stats, setStats]         = useState(null)
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [tierFilter, setTierFilter] = useState('all')
  const [selected, setSelected]   = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [p, pur] = await Promise.all([adminListProfiles(), adminListAllPurchases()])
      setProfiles(p)
      setStats(await adminStats(p, pur))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return profiles.filter((p) => {
      if (tierFilter !== 'all' && p.tier !== tierFilter) return false
      if (!term) return true
      return (
        p.email?.toLowerCase().includes(term) ||
        p.name?.toLowerCase().includes(term) ||
        p.tags?.some((t) => t.toLowerCase().includes(term))
      )
    })
  }, [profiles, search, tierFilter])

  function handleExportCsv() {
    const header = ['id', 'name', 'email', 'credits', 'tier', 'tags', 'notes', 'created_at', 'last_login_at']
    const rows = filtered.map((p) => header.map((k) => {
      const v = Array.isArray(p[k]) ? p[k].join('|') : (p[k] ?? '')
      return `"${String(v).replace(/"/g, '""')}"`
    }).join(','))
    const csv = [header.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `users_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return <div className="admin-loading">Loading admin dashboard…</div>
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1 className="admin-title">Admin — User CRM</h1>
        <button className="btn-secondary" onClick={load}>↻ Refresh</button>
      </div>

      <div className="admin-stats">
        <div className="admin-stat-tile">
          <span className="admin-stat-value">{stats?.totalUsers ?? 0}</span>
          <span className="admin-stat-label">Total Users</span>
        </div>
        <div className="admin-stat-tile">
          <span className="admin-stat-value">{stats?.creditsOutstanding ?? 0}</span>
          <span className="admin-stat-label">Credits Outstanding</span>
        </div>
        <div className="admin-stat-tile">
          <span className="admin-stat-value">₹{stats?.revenue ?? 0}</span>
          <span className="admin-stat-label">Revenue (verified)</span>
        </div>
        <div className="admin-stat-tile">
          <span className="admin-stat-value">{stats?.signupsThisWeek ?? 0}</span>
          <span className="admin-stat-label">Signups (7d)</span>
        </div>
      </div>

      <div className="admin-toolbar">
        <input
          className="text-input admin-search"
          placeholder="Search by name, email, or tag…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="adv-select" value={tierFilter} onChange={(e) => setTierFilter(e.target.value)}>
          {TIERS.map((t) => <option key={t} value={t}>{t === 'all' ? 'All tiers' : t}</option>)}
        </select>
        <button className="btn-secondary" onClick={handleExportCsv}>⬇ Export CSV</button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Credits</th>
              <th>Tier</th>
              <th>Tags</th>
              <th>Joined</th>
              <th>Last login</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} onClick={() => setSelected(p)} className="admin-row">
                <td>
                  <div className="admin-user-cell">
                    {p.picture
                      ? <img src={p.picture} alt="" className="admin-avatar" referrerPolicy="no-referrer" />
                      : <span className="admin-avatar-fallback">{(p.name || p.email)?.[0]?.toUpperCase()}</span>}
                    <div>
                      <div className="admin-user-name">{p.name || 'Unnamed'} {p.is_admin && <span className="admin-badge">admin</span>}</div>
                      <div className="admin-user-email">{p.email}</div>
                    </div>
                  </div>
                </td>
                <td>{p.credits}</td>
                <td>{p.tier}</td>
                <td>{p.tags?.join(', ')}</td>
                <td>{new Date(p.created_at).toLocaleDateString()}</td>
                <td>{p.last_login_at ? new Date(p.last_login_at).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="admin-empty-row">No users match.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <AdminUserDrawer
          profile={selected}
          currentAdminId={currentAdminId}
          onClose={() => setSelected(null)}
          onChanged={load}
        />
      )}
    </div>
  )
}
