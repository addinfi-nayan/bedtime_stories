import { useEffect, useRef, useState } from 'react'
import { saveUser, clearUser } from '../../services/storage'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

function parseJwt(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(base64))
  } catch { return null }
}

function initGoogle(callback) {
  if (!CLIENT_ID) {
    console.warn('[GoogleAuth] VITE_GOOGLE_CLIENT_ID is not set in .env')
    return
  }
  window.google.accounts.id.initialize({
    client_id: CLIENT_ID,
    callback,
    auto_select: false,
    cancel_on_tap_outside: true,
  })
}

export default function GoogleAuth({ user, onUserChange }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef      = useRef(null)
  const btnDivRef    = useRef(null)   // div where Google renders its button
  const googleReady  = useRef(false)

  function handleCredential(response) {
    const payload = parseJwt(response.credential)
    if (!payload) return
    const userData = {
      id:      payload.sub,
      name:    payload.name,
      email:   payload.email,
      picture: payload.picture,
    }
    saveUser(userData)
    onUserChange(userData)
  }

  // Render Google's button once GSI script is loaded and the div is in the DOM
  function renderGoogleButton() {
    if (!CLIENT_ID || !window.google || !btnDivRef.current) return
    if (googleReady.current) return
    googleReady.current = true

    initGoogle(handleCredential)

    window.google.accounts.id.renderButton(btnDivRef.current, {
      type:  'standard',
      theme: 'outline',
      size:  'medium',
      text:  'signin_with',
      shape: 'rectangular',
      logo_alignment: 'left',
    })
  }

  // Wait for GSI script to load (it's async in index.html)
  useEffect(() => {
    if (user) return   // already signed in — no button needed
    if (window.google) {
      renderGoogleButton()
      return
    }
    const interval = setInterval(() => {
      if (window.google) {
        clearInterval(interval)
        renderGoogleButton()
      }
    }, 150)
    return () => clearInterval(interval)
  }, [user])

  // Close dropdown on outside click
  useEffect(() => {
    if (!menuOpen) return
    function handler(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  function handleSignOut() {
    if (window.google) window.google.accounts.id.disableAutoSelect()
    googleReady.current = false
    clearUser()
    onUserChange(null)
    setMenuOpen(false)
  }

  // ── Not signed in — let Google render its own button ──
  if (!user) {
    return (
      <div className="google-btn-wrapper">
        {!CLIENT_ID && (
          <span className="no-client-id-hint">Set VITE_GOOGLE_CLIENT_ID in .env</span>
        )}
        {/* Google renders its button inside this div */}
        <div ref={btnDivRef} id="google-signin-btn" />
      </div>
    )
  }

  // ── Signed in — avatar + dropdown ──
  return (
    <div className="user-menu" ref={menuRef}>
      <button
        className="user-avatar-btn"
        onClick={() => setMenuOpen((v) => !v)}
        aria-label="Account menu"
        aria-expanded={menuOpen}
      >
        <span className="user-avatar-circle">
          {user.picture
            ? <img className="user-avatar" src={user.picture} alt={user.name} referrerPolicy="no-referrer" />
            : <span className="user-avatar-fallback">{user.name?.[0]?.toUpperCase()}</span>
          }
        </span>
        <span className="avatar-chevron">{menuOpen ? '▲' : '▼'}</span>
      </button>

      {menuOpen && (
        <div className="user-dropdown">
          <div className="user-dropdown-info">
            {user.picture
              ? <img className="user-dropdown-avatar" src={user.picture} alt={user.name} referrerPolicy="no-referrer" />
              : <span className="user-avatar-fallback large">{user.name?.[0]?.toUpperCase()}</span>
            }
            <div className="user-dropdown-text">
              <p className="user-dropdown-name">{user.name}</p>
              <p className="user-dropdown-email">{user.email}</p>
            </div>
          </div>
          <button className="user-signout-btn" onClick={handleSignOut}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
