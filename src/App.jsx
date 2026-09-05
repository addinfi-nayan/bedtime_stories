import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './hooks/useAuth'
import { spendCredits, refundCredits } from './services/supabaseApi'
import LandingPage from './components/Landing/LandingPage'
import StoryForm from './components/StoryForm/StoryForm'
import StoryOutput from './components/StoryOutput/StoryOutput'
import StoryHistory from './components/StoryHistory/StoryHistory'
import CreditDisplay from './components/CreditDisplay/CreditDisplay'
import OutOfCreditsModal from './components/Modals/OutOfCreditsModal'
import LoginRequiredModal from './components/Modals/LoginRequiredModal'
import GoogleAuth from './components/Auth/GoogleAuth'
import PrivacyPolicy from './components/Legal/PrivacyPolicy'
import TermsOfService from './components/Legal/TermsOfService'
import RefundPolicy from './components/Legal/RefundPolicy'
import AdminDashboard from './components/Admin/AdminDashboard'

// Pages: 'landing' | 'create' | 'history' | 'privacy' | 'terms' | 'refund' | 'admin'
export default function App() {
  const { session, user, credits, isAdmin, refreshProfile, setLocalCredits, signOut } = useAuth()
  const [page, setPage]               = useState('landing')
  const [showNoCredits, setShowNoCredits]         = useState(false)
  const [showLoginRequired, setShowLoginRequired] = useState(false)
  const [activeStory, setActiveStory] = useState(null)
  const [generating, setGenerating]   = useState(false)
  const [installPrompt, setInstallPrompt] = useState(null)
  const [installed, setInstalled]     = useState(false)
  const [menuOpen, setMenuOpen]             = useState(false)

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => { setInstalled(true); setInstallPrompt(null) })
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function handleSignedIn() {
    setShowLoginRequired(false)
  }

  async function handleSignOut() {
    await signOut()
    goHome()
  }

  const refreshCredits = useCallback(() => {
    refreshProfile()
  }, [refreshProfile])

  // Optimistic local update, reconciled against the server's authoritative balance.
  const deductCredits = useCallback(async (amount) => {
    if (!user) return
    const optimistic = Math.max(0, credits - amount)
    setLocalCredits(optimistic)
    try {
      const type = amount >= 2 ? 'voice_deduct' : 'story_deduct'
      const newBalance = await spendCredits(amount, type)
      setLocalCredits(newBalance)
    } catch {
      refreshProfile() // roll back to server truth (e.g. insufficient credits / race)
    }
  }, [user, credits, setLocalCredits, refreshProfile])

  const addCredits = useCallback(async (amount) => {
    if (!user) return
    setLocalCredits(credits + amount)
    try {
      const newBalance = await refundCredits(amount)
      setLocalCredits(newBalance)
    } catch {
      refreshProfile()
    }
  }, [user, credits, setLocalCredits, refreshProfile])

  async function handleInstall() {
    if (!installPrompt) return
    await installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setInstallPrompt(null)
  }

  async function handleMobileSignOut() {
    await handleSignOut()
    setMenuOpen(false)
  }

  function goHome() { setPage('landing'); setActiveStory(null) }
  function goCreate() { setPage('create'); setActiveStory(null) }

  return (
    <div className="app">

      {/* ── Header ── */}
      <header className="app-header">
        <div className="header-inner">
          <button className="logo-btn" onClick={goHome} aria-label="Go to home">
            <span className="logo-moon">🌙</span>
            <span className="logo-text">Bedtime Stories</span>
          </button>

          <nav className="header-nav">
            {user ? (
              <>
                <div className="nav-desktop">
                  {installPrompt && !installed && (
                    <button className="btn-install" onClick={handleInstall}>⬇ Install App</button>
                  )}
                  <button
                    className={`nav-btn${page === 'create' ? ' active' : ''}`}
                    onClick={goCreate}
                  >
                    Create Story
                  </button>
                  <button
                    className={`nav-btn${page === 'history' ? ' active' : ''}`}
                    onClick={() => { setPage('history'); setMenuOpen(false) }}
                  >
                    History
                  </button>
                  {isAdmin && (
                    <button
                      className={`nav-btn${page === 'admin' ? ' active' : ''}`}
                      onClick={() => { setPage('admin'); setMenuOpen(false) }}
                    >
                      Admin
                    </button>
                  )}
                </div>

                <div className="credits-desktop">
                  <CreditDisplay credits={credits} onBuyCredits={() => setShowNoCredits(true)} />
                </div>
                <GoogleAuth user={user} onSignedIn={handleSignedIn} onSignOut={handleSignOut} />

                <button
                  className="hamburger"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-label="Menu"
                  aria-expanded={menuOpen}
                >
                  <span className={`ham-line${menuOpen ? ' open' : ''}`} />
                  <span className={`ham-line${menuOpen ? ' open' : ''}`} />
                  <span className={`ham-line${menuOpen ? ' open' : ''}`} />
                </button>
              </>
            ) : (
              <>
                <div className="nav-desktop">
                  <button className="nav-btn" onClick={goCreate}>Create Story</button>
                </div>
                <GoogleAuth user={user} onSignedIn={handleSignedIn} onSignOut={handleSignOut} />
              </>
            )}
          </nav>

          {user && menuOpen && (
            <div className="mobile-menu">
              <button
                className={`mobile-menu-credits${credits < 1 ? ' empty' : ''}`}
                onClick={() => { setShowNoCredits(true); setMenuOpen(false) }}
              >
                <span>{credits < 1 ? '⭐ Out of credits' : `⭐ ${credits} ${credits === 1 ? 'credit' : 'credits'}`}</span>
                <span className="mobile-credits-chevron">＋</span>
              </button>
              {installPrompt && !installed && (
                <button className="mobile-menu-item" onClick={() => { handleInstall(); setMenuOpen(false) }}>
                  ⬇ Install App
                </button>
              )}
              <button className="mobile-menu-item" onClick={() => { goCreate(); setMenuOpen(false) }}>
                Create Story
              </button>
              <button
                className={`mobile-menu-item${page === 'history' ? ' active' : ''}`}
                onClick={() => { setPage('history'); setMenuOpen(false) }}
              >
                History
              </button>
              {isAdmin && (
                <button
                  className={`mobile-menu-item${page === 'admin' ? ' active' : ''}`}
                  onClick={() => { setPage('admin'); setMenuOpen(false) }}
                >
                  Admin
                </button>
              )}
              <button className="mobile-menu-item mobile-menu-signout" onClick={handleMobileSignOut}>
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── Main ── */}
      <main className="app-main">
        {page === 'privacy' ? (
          <PrivacyPolicy onBack={goHome} />
        ) : page === 'terms' ? (
          <TermsOfService onBack={goHome} />
        ) : page === 'refund' ? (
          <RefundPolicy onBack={goHome} />
        ) : page === 'landing' && !activeStory ? (
          <LandingPage
            user={user}
            onCreateStory={goCreate}
            onSignIn={handleSignedIn}
          />
        ) : page === 'history' ? (
          <StoryHistory
            onReadStory={(story) => { setActiveStory({ ...story, fromHistory: true }); setPage('create') }}
            onHome={goHome}
          />
        ) : page === 'admin' ? (
          isAdmin ? <AdminDashboard currentAdminId={session?.user?.id} /> : (
            <div className="history-empty">
              <div className="history-empty-icon">🔒</div>
              <h2>Not authorized</h2>
              <p>This page is only available to admins.</p>
              <button className="btn-create-story" onClick={goHome}>Go home</button>
            </div>
          )
        ) : activeStory ? (
          <StoryOutput
            story={activeStory}
            user={user}
            credits={credits}
            onCreditsChange={refreshCredits}
            onDeductCredits={deductCredits}
            onAddCredits={addCredits}
            onNewStory={() => { setActiveStory(null); setPage('create') }}
            onOutOfCredits={() => setShowNoCredits(true)}
          />
        ) : (
          <StoryForm
            user={user}
            credits={credits}
            onStoryReady={(story) => { setActiveStory(story); refreshCredits() }}
            onDeductCredits={deductCredits}
            onCreditsChange={refreshCredits}
            onOutOfCredits={() => setShowNoCredits(true)}
            onLoginRequired={() => setShowLoginRequired(true)}
            generating={generating}
            setGenerating={setGenerating}
          />
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="app-footer">
        <span>© {new Date().getFullYear()} Bedtime Stories. All rights reserved.</span>
        <span className="footer-divider">·</span>
        <button className="footer-link" onClick={() => setPage('privacy')}>Privacy Policy</button>
        <span className="footer-divider">·</span>
        <button className="footer-link" onClick={() => setPage('terms')}>Terms</button>
        <span className="footer-divider">·</span>
        <button className="footer-link" onClick={() => setPage('refund')}>Refund Policy</button>
        <span className="footer-divider">·</span>
        <span>Powered by <a href="https://addinfi.com" target="_blank" rel="noopener noreferrer">Addinfi</a></span>
      </footer>

      {showNoCredits && (
        <OutOfCreditsModal
          session={session}
          onClose={() => setShowNoCredits(false)}
          onRefill={(newBalance) => { setLocalCredits(newBalance); refreshCredits() }}
        />
      )}
      {showLoginRequired && (
        <LoginRequiredModal onClose={() => setShowLoginRequired(false)} onSignIn={handleSignedIn} />
      )}
    </div>
  )
}
