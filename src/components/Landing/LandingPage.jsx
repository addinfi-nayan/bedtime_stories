export default function LandingPage({ onCreateStory, onSignIn, user }) {
  return (
    <div className="landing">

      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-left">
            <div className="hero-badge">AI-Powered · Free to Try</div>
            <h1 className="hero-title">
              Magical Bedtime Stories,<br />
              <span className="hero-title-accent">Made for Your Child</span>
            </h1>
            <div className="hero-cta">
              <button className="btn-hero-primary" onClick={onCreateStory}>
                Create a Story Free
              </button>
              <p className="hero-cta-note">No credit card · 3 free stories on sign-in</p>
            </div>

            <div className="hero-stats">
              {STATS.map((s) => (
                <div className="hero-stat" key={s.label}>
                  <span className="hero-stat-num">{s.num}</span>
                  <span className="hero-stat-label">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="hero-right">
            <div className="hero-cards">
              {PREVIEW_STORIES.map((s, i) => (
                <div className={`hero-card${i % 2 === 1 ? ' hero-card-offset' : ''}`} key={s.title}>
                  <span className="hero-card-icon">{s.icon}</span>
                  <p className="hero-card-title">"{s.title}"</p>
                  <p className="hero-card-meta">{s.meta}</p>
                  <div className="hero-card-tags">
                    {s.tags.map((t) => <span className="hero-card-tag" key={t}>{t}</span>)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="features-section">
        <div className="section-inner">
          <div className="section-label-pill">Features</div>
          <h2 className="section-heading">Everything a bedtime story should be</h2>
          <div className="features-grid">
            {FEATURES.map((f) => (
              <div className="feature-card" key={f.title}>
                <div className="feature-icon-wrap">{f.icon}</div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="how-section">
        <div className="section-inner">
          <div className="section-label-pill">How it works</div>
          <h2 className="section-heading">Ready in under a minute</h2>
          <div className="steps-row">
            {STEPS.map((s, i) => (
              <div className="step" key={s.title}>
                <div className="step-num">{i + 1}</div>
                {i < STEPS.length - 1 && <div className="step-connector" />}
                <h3 className="step-title">{s.title}</h3>
                <p className="step-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="testimonials-section">
        <div className="section-inner">
          <div className="section-label-pill">Loved by parents</div>
          <h2 className="section-heading">What families are saying</h2>
          <div className="testimonials-grid">
            {TESTIMONIALS.map((t) => (
              <div className="testimonial-card" key={t.name}>
                <p className="testimonial-stars">{'★'.repeat(5)}</p>
                <p className="testimonial-text">"{t.text}"</p>
                <div className="testimonial-author">
                  <div className="testimonial-avatar">{t.name[0]}</div>
                  <div>
                    <p className="testimonial-name">{t.name}</p>
                    <p className="testimonial-role">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Ages section ── */}
      <section className="ages-section">
        <div className="section-inner">
          <div className="section-label-pill">Age groups</div>
          <h2 className="section-heading">Perfect for every age</h2>
          <div className="ages-row">
            {AGES.map((a) => (
              <div className="age-chip" key={a.range}>
                <span className="age-emoji">{a.emoji}</span>
                <span className="age-range">{a.range}</span>
                <span className="age-label">{a.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="bottom-cta">
        <div className="bottom-cta-inner">
          <p className="bottom-cta-eyebrow">Start tonight</p>
          <h2 className="bottom-cta-title">Your child's favourite story<br />is one tap away</h2>
          <p className="bottom-cta-sub">Free for every new device. No subscription required to try.</p>
          <button className="btn-hero-primary btn-cta-white" onClick={onCreateStory}>
            Create a Story — It's Free
          </button>
        </div>
      </section>

    </div>
  )
}

/* ── Data ── */

const STATS = [
  { num: '12+',   label: 'Languages' },
  { num: '15+',   label: 'Genres' },
  { num: '100%',  label: 'Child-safe' },
]

const PREVIEW_STORIES = [
  {
    icon: '🌙',
    title: 'The Dragon Who Was Afraid of the Dark',
    meta: 'Fantasy · 4–6 yrs',
    tags: ['Soothing', '~4 min'],
  },
  {
    icon: '🚀',
    title: "Arya's Adventure on Planet Zoomie",
    meta: 'Space · 6–8 yrs',
    tags: ['Exciting', '~7 min'],
  },
  {
    icon: '🧚',
    title: 'The Fairy Who Forgot to Fly',
    meta: 'Fairy Tale · 4–6 yrs',
    tags: ['Inspiring', '~5 min'],
  },
]

const FEATURES = [
  {
    icon: '🎯',
    title: 'Fully Personalised',
    desc: "Add your child's name, favourite characters, a moral lesson — every story is uniquely theirs.",
  },
  {
    icon: '🎧',
    title: 'Voice Narration',
    desc: 'Listen hands-free with text-to-speech narration. Great for car rides or lights-out time.',
  },
  {
    icon: '🌍',
    title: '12+ Languages',
    desc: 'Generate stories in English, Hindi, Spanish, French, Marathi, Arabic and more.',
  },
  {
    icon: '📚',
    title: 'Story History',
    desc: 'Every story is saved. Re-read or re-play any story from your library anytime.',
  },
  {
    icon: '🛡️',
    title: 'Child-Safe Always',
    desc: 'Built-in AI guardrails ensure every story is age-appropriate, gentle, and safe.',
  },
  {
    icon: '📱',
    title: 'Works Offline',
    desc: 'Install as an app on any phone or desktop. Stories play even without internet.',
  },
]

const STEPS = [
  {
    title: 'Sign in with Google',
    desc: 'One tap, no passwords. Get 3 free stories instantly on your device.',
  },
  {
    title: 'Customise your story',
    desc: 'Pick age, genre, characters, language, length — or let the defaults do the magic.',
  },
  {
    title: 'Generate & enjoy',
    desc: 'Your personalised story streams in real-time. Read it or listen with voice mode.',
  },
]

const TESTIMONIALS = [
  {
    text: 'My daughter asks for a new story every single night now. The personalisation is incredible — she loves hearing her own name in the adventure.',
    name: 'Priya S.',
    role: 'Parent of a 5-year-old',
  },
  {
    text: 'We use it for our twins, who have totally different interests. It handles both perfectly. The voice mode is a game-changer at bedtime.',
    name: 'Marcus T.',
    role: 'Father of twins, age 7',
  },
  {
    text: 'I was sceptical about AI-generated stories but the quality blew me away. The moral lessons are woven in so naturally.',
    name: 'Anika R.',
    role: 'Parent of a 6-year-old',
  },
]

const AGES = [
  { emoji: '🧸', range: '2–4 yrs', label: 'Toddlers' },
  { emoji: '🧚', range: '4–6 yrs', label: 'Pre-school' },
  { emoji: '🦄', range: '6–8 yrs', label: 'Early readers' },
  { emoji: '🚀', range: '8–10 yrs', label: 'Adventurers' },
  { emoji: '📖', range: '10–12 yrs', label: 'Young readers' },
]
