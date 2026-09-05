import { useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

export default function LoginRequiredModal({ onClose, onSignIn }) {
  const btnRef = useRef(null)

  useEffect(() => {
    function render() {
      if (!CLIENT_ID || !window.google || !btnRef.current) return
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: async (response) => {
          const { error } = await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: response.credential,
          })
          if (!error) onSignIn()
        },
        auto_select: false,
      })
      window.google.accounts.id.renderButton(btnRef.current, {
        type:  'standard',
        theme: 'filled_black',
        size:  'large',
        text:  'signin_with',
        shape: 'rectangular',
        width: '280',
      })
    }

    if (window.google) { render(); return }
    const t = setInterval(() => { if (window.google) { clearInterval(t); render() } }, 150)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal login-modal" onClick={(e) => e.stopPropagation()}>
        <div className="login-modal-icon">🌙</div>
        <h2 className="login-modal-title">Sign in to Create Stories</h2>
        <p className="login-modal-desc">
          Every new account gets <strong>3 free credits</strong> to generate
          personalized bedtime stories.
        </p>

        {/* Google renders its button here */}
        <div ref={btnRef} className="google-btn-center" />

        {!CLIENT_ID && (
          <p style={{ color: 'red', fontSize: '0.75rem', marginTop: '0.5rem' }}>
            VITE_GOOGLE_CLIENT_ID not set in .env
          </p>
        )}

        <button className="modal-close-link" onClick={onClose}>Maybe later</button>
        <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
      </div>
    </div>
  )
}
