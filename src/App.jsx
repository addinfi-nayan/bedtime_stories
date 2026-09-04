import { useState, useEffect, useCallback } from 'react'
import {
  runMigrations, getUser, clearUser,
  initDeviceCredits, getDeviceCredits, deductDeviceCredits, addDeviceCredits,
} from './services/storage'
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

// Pages: 'landing' | 'create' | 'history' | 'privacy' | 'terms' | 'refund'
export default function App() {
  const [page, setPage]               = useState('landing')
  const [credits, setCredits]         = useState(0)
  const [showNoCredits, setShowNoCredits]         = useState(false)
  const [showLoginRequired, setShowLoginRequired] = useState(false)
  const [activeStory, setActiveStory] = useState(null)
  const [generating, setGenerating]   = useState(false)
  const [installPrompt, setInstallPrompt] = useState(null)
  const [installed, setInstalled]     = useState(false)
  const [menuOpen, setMenuOpen]             = useState(false)
  const [user, setUser]               = useState(() => getUser())

  useEffect(() => {
    runMigrations()
    if (getUser()) setCredits(getDeviceCredits())

    const handler = (e) => { e.preventDefault(); setInstallPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => { setInstalled(true); setInstallPrompt(null) })
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function handleUserChange(newUser) {
    setUser(newUser)
    if (newUser) {
      setCredits(initDeviceCredits())
      setShowLoginRequired(false)
    } else {
      setCredits(0)
    }
  }

  const refreshCredits = useCallback(() => {
    if (user) setCredits(getDeviceCredits())
  }, [user])

  const deductCredits = useCallback((amount) => {
    if (!user) return
    setCredits(deductDeviceCredits(amount))
  }, [user])

  const addCredits = useCallback((amount) => {
    if (!user) return
    setCredits(addDeviceCredits(amount))
  }, [user])

  async function handleInstall() {
    if (!installPrompt) return
    await installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setInstallPrompt(null)
  }

  function handleMobileSignOut() {
    if (window.google) window.google.accounts.id.disableAutoSelect()
    clearUser()
    handleUserChange(null)
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
                </div>

                <div className="credits-desktop">
                  <CreditDisplay credits={credits} onBuyCredits={() => setShowNoCredits(true)} />
                </div>
                <GoogleAuth user={user} onUserChange={handleUserChange} />

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
                <GoogleAuth user={user} onUserChange={handleUserChange} />
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
            onSignIn={handleUserChange}
          />
        ) : page === 'history' ? (
          <StoryHistory
            onReadStory={(story) => { setActiveStory({ ...story, fromHistory: true }); setPage('create') }}
            onHome={goHome}
          />
        ) : activeStory ? (
          <StoryOutput
            story={activeStory}
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
        <OutOfCreditsModal onClose={() => setShowNoCredits(false)} onRefill={(n) => addCredits(n)} />
      )}
      {showLoginRequired && (
        <LoginRequiredModal onClose={() => setShowLoginRequired(false)} onSignIn={handleUserChange} />
      )}
    </div>
  )
}
