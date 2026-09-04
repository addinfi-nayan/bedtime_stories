import { useState, useTransition } from 'react'
import { buildPrompt } from '../../utils/promptBuilder'
import { saveSettings, getSettings } from '../../services/storage'
import ChipGroup from './ChipGroup'

const DEFAULT_FORM = {
  ageGroup:       '4–6',
  language:       'English',
  childNames:     '',
  genres:         '',
  settings:       [],
  morals:         [],
  mainCharacter:  'Child',
  storyLength:    'short',
  tone:           'Soothing',
  deliveryMode:   'read',
  endWithSleep:   true,
  includeRhyme:   false,
  includeFunFact: false,
  includeRiddle:  false,
  catchphrase:    false,
  cliffhanger:    false,
  readingLevel:   'auto',
  pov:            'third',
  villain:        'none',
  timeOfStory:    'none',
  culturalFlavour:'none',
  customTitle:    '',
  specialObject:  '',
  extraDetails:   '',
}

const AGE_GROUPS    = ['2–4', '4–6', '6–8', '8–10', '10–12']
const LANGUAGES     = ['English','Hindi','Marathi','Spanish','French','German','Arabic','Japanese','Portuguese','Tamil','Urdu','Custom']
const GENRES        = ['Fantasy','Adventure','Fairy Tale','Animal','Space','Superhero','Friendship','Mystery','Funny','Ocean','Dinosaurs','Magic School','Bedtime Calm','Mythology','Princess & Knights']
const SETTINGS_LIST = ['Magical Forest','Space','Underwater','Village','City','Castle','Mountains','School','Desert','Cloud Kingdom']
const MORALS        = ['Kindness','Bravery','Friendship','Honesty','Hard Work','Sharing','Perseverance','Confidence','Empathy']
const CHARACTERS    = ['Child','Princess','Prince','Superhero','Talking Animal','Wizard','Fairy','Robot','Dragon','Astronaut','Chef','Pirate']
const LENGTHS       = [
  { value: 'tiny',   label: 'Tiny',   sub: '~2 min' },
  { value: 'short',  label: 'Short',  sub: '~4 min' },
  { value: 'medium', label: 'Medium', sub: '~7 min' },
  { value: 'long',   label: 'Long',   sub: '~12 min' },
]
const TONES = ['Soothing','Exciting','Silly','Mysterious','Educational','Inspiring']

export default function StoryForm({ user, credits, onStoryReady, onDeductCredits, onCreditsChange, onOutOfCredits, onLoginRequired, generating, setGenerating }) {
  const [form, setForm]               = useState(() => getSettings() || DEFAULT_FORM)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [customLang, setCustomLang]   = useState('')
  const [, startTransition]           = useTransition()

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function toggleChip(key, value) {
    setForm((f) => {
      const arr = f[key] || []
      return { ...f, [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value] }
    })
  }

  async function handleGenerate() {
    if (!user) { onLoginRequired(); return }
    if (credits < 1) { onOutOfCredits(); return }   // logged in but no credits

    // Deduct immediately so credit badge updates before page transition
    onDeductCredits(1)
    setGenerating(true)

    const effectiveLang = form.language === 'Custom' ? customLang || 'English' : form.language
    const formToUse = { ...form, language: effectiveLang }
    saveSettings(formToUse)

    const prompt = buildPrompt(formToUse)
    const storyId = `story_${Date.now()}`

    // Navigate to output — deferred so credit badge paints first
    // StoryOutput will own the stream; it reads initialStory.prompt on mount
    startTransition(() => {
      onStoryReady({
        title: '', body: '', fullText: '', streaming: true,
        id: storyId, settings: formToUse,
        createdAt: new Date().toISOString(),
        deliveryMode: form.deliveryMode,
        prompt,
      })
    })

    setGenerating(false)
  }

  function handleCancel() {
    setGenerating(false)
  }

  // Button is always clickable — login check and credit check happen inside handleGenerate
  const canGenerate = !generating

  return (
    <div className="story-form">
      <div className="form-hero">
        <h1 className="form-title">Create a Magical Story ✨</h1>
      </div>

      {/* ── Delivery mode ── */}
      <section className="form-section">
        <label className="section-label">Delivery Mode</label>
        <div className="mode-toggle">
          {['read','voice'].map((mode) => (
            <button
              key={mode}
              className={`mode-btn${form.deliveryMode === mode ? ' selected' : ''}`}
              onClick={() => set('deliveryMode', mode)}
            >
              {mode === 'read' ? '📖 Read' : '🎧 Voice'}
              <span className="mode-cost">{mode === 'read' ? '1 credit' : '1 + 2 credits'}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Core row: Age + Language ── */}
      <section className="form-section">
        <div className="core-row">
          <div className="core-field">
            <label className="section-label">Age Group</label>
            <select
              className="adv-select core-select"
              value={form.ageGroup}
              onChange={(e) => set('ageGroup', e.target.value)}
            >
              {AGE_GROUPS.map((a) => (
                <option key={a} value={a}>{a} years</option>
              ))}
            </select>
          </div>
          <div className="core-field">
            <label className="section-label">Language</label>
            <select
              className="adv-select core-select"
              value={form.language}
              onChange={(e) => set('language', e.target.value)}
            >
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
        </div>
        {form.language === 'Custom' && (
          <input
            className="text-input mt-sm"
            placeholder="Type language name (e.g. Bengali, Swahili)"
            value={customLang}
            onChange={(e) => setCustomLang(e.target.value)}
          />
        )}
      </section>

      {/* ── Child name ── */}
      <section className="form-section">
        <input
          className="text-input"
          placeholder="Child's name(s) — optional"
          value={form.childNames}
          onChange={(e) => set('childNames', e.target.value)}
        />
      </section>

      {/* ── Genre ── */}
      <section className="form-section">
        <label className="section-label">Genre <span className="optional">(pick any)</span></label>
        <ChipGroup
          options={GENRES}
          selected={form.genres ? [form.genres] : []}
          onSelect={(v) => set('genres', v)}
          single
        />
      </section>

      {/* ── Story length ── */}
      <section className="form-section">
        <label className="section-label">Story Length</label>
        <div className="length-grid">
          {LENGTHS.map((l) => (
            <button
              key={l.value}
              className={`length-btn${form.storyLength === l.value ? ' selected' : ''}`}
              onClick={() => set('storyLength', l.value)}
            >
              <span className="length-label">{l.label}</span>
              <span className="length-sub">{l.sub}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Advanced options (collapsed by default) ── */}
      <section className="form-section">
        <button
          className="advanced-toggle"
          onClick={() => setShowAdvanced((v) => !v)}
          aria-expanded={showAdvanced}
        >
          {showAdvanced ? '▲ Hide' : '▼ Show'} Advanced Options
        </button>

        {showAdvanced && (
          <div className="advanced-panel">

            {/* Setting */}
            <div className="adv-group">
              <label className="adv-group-label">Setting <span className="optional">(pick any)</span></label>
              <ChipGroup
                options={SETTINGS_LIST}
                selected={form.settings}
                onSelect={(v) => toggleChip('settings', v)}
              />
            </div>

            {/* Moral */}
            <div className="adv-group">
              <label className="adv-group-label">Moral / Lesson <span className="optional">(pick any)</span></label>
              <ChipGroup
                options={MORALS}
                selected={form.morals}
                onSelect={(v) => toggleChip('morals', v)}
              />
            </div>

            {/* Main character */}
            <div className="adv-group">
              <label className="adv-group-label">Main Character</label>
              <ChipGroup
                options={CHARACTERS}
                selected={[form.mainCharacter]}
                onSelect={(v) => set('mainCharacter', v)}
                single
              />
            </div>

            {/* Tone */}
            <div className="adv-group">
              <label className="adv-group-label">Tone</label>
              <ChipGroup
                options={TONES}
                selected={[form.tone]}
                onSelect={(v) => set('tone', v)}
                single
              />
            </div>

            {/* Story feature toggles */}
            <div className="adv-group">
              <label className="adv-group-label">Story Features</label>
              <div className="toggle-grid">
                {[
                  { key: 'endWithSleep',   label: '😴 End with child falling asleep' },
                  { key: 'includeRhyme',   label: '🎵 Include a rhyming section' },
                  { key: 'includeFunFact', label: '💡 Include a fun fact' },
                  { key: 'includeRiddle',  label: '🧩 Include a riddle or puzzle' },
                  { key: 'catchphrase',    label: '🗣️ Repetitive catchphrase' },
                  { key: 'cliffhanger',    label: '⏭️ Cliffhanger / series mode' },
                ].map(({ key, label }) => (
                  <label key={key} className="toggle-item">
                    <input
                      type="checkbox"
                      checked={!!form[key]}
                      onChange={(e) => set(key, e.target.checked)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Dropdowns */}
            <div className="adv-group">
              <label className="adv-group-label">Story Settings</label>
              <div className="adv-selects-grid">
                <div className="adv-row">
                  <label className="adv-label">Reading Level</label>
                  <select className="adv-select" value={form.readingLevel} onChange={(e) => set('readingLevel', e.target.value)}>
                    <option value="auto">Auto (match age)</option>
                    <option value="very simple">Very Simple</option>
                    <option value="simple">Simple</option>
                    <option value="standard">Standard</option>
                    <option value="advanced">Advanced for age</option>
                  </select>
                </div>
                <div className="adv-row">
                  <label className="adv-label">Point of View</label>
                  <select className="adv-select" value={form.pov} onChange={(e) => set('pov', e.target.value)}>
                    <option value="third">Third person (he/she/they)</option>
                    <option value="second">Second person (you)</option>
                    <option value="first">First person (I)</option>
                  </select>
                </div>
                <div className="adv-row">
                  <label className="adv-label">Villain / Obstacle</label>
                  <select className="adv-select" value={form.villain} onChange={(e) => set('villain', e.target.value)}>
                    <option value="none">None</option>
                    <option value="friendly mischief-maker">Friendly mischief-maker</option>
                    <option value="misunderstood creature">Misunderstood creature</option>
                    <option value="puzzle">Puzzle / challenge</option>
                    <option value="classic villain">Classic villain</option>
                  </select>
                </div>
                <div className="adv-row">
                  <label className="adv-label">Time of Story</label>
                  <select className="adv-select" value={form.timeOfStory} onChange={(e) => set('timeOfStory', e.target.value)}>
                    <option value="none">Any</option>
                    <option value="Night/Bedtime">Night / Bedtime</option>
                    <option value="Morning">Morning</option>
                    <option value="Magical timeless day">Magical timeless day</option>
                    <option value="Winter evening">Winter evening</option>
                    <option value="Rainy afternoon">Rainy afternoon</option>
                  </select>
                </div>
                <div className="adv-row">
                  <label className="adv-label">Cultural Flavour</label>
                  <select className="adv-select" value={form.culturalFlavour} onChange={(e) => set('culturalFlavour', e.target.value)}>
                    <option value="none">None</option>
                    <option value="Indian">Indian</option>
                    <option value="Japanese">Japanese</option>
                    <option value="African">African</option>
                    <option value="Arabic">Arabic</option>
                    <option value="Nordic">Nordic</option>
                    <option value="Latin American">Latin American</option>
                    <option value="European">European</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Free text */}
            <div className="adv-group">
              <label className="adv-group-label">Custom Details <span className="optional">(optional)</span></label>
              <input
                className="text-input"
                placeholder="Story title (or leave blank for auto)"
                value={form.customTitle}
                onChange={(e) => set('customTitle', e.target.value)}
              />
              <input
                className="text-input mt-sm"
                placeholder="Special object or place (e.g. a golden key, a treehouse)"
                value={form.specialObject}
                onChange={(e) => set('specialObject', e.target.value)}
              />
              <textarea
                className="text-input textarea mt-sm"
                placeholder="Extra details — interests, pet names, specific scenarios..."
                value={form.extraDetails}
                onChange={(e) => set('extraDetails', e.target.value)}
                rows={3}
              />
            </div>

          </div>
        )}
      </section>

      {/* ── Generate button ── */}
      <div className="form-actions">
        {generating ? (
          <button className="btn-cancel" onClick={handleCancel}>✕ Cancel</button>
        ) : (
          <button className="btn-generate" onClick={handleGenerate} disabled={!canGenerate}>
            {!user
              ? '✨ Create Story — Sign in for 3 free credits'
              : credits < 1
                ? '⭐ No credits — tap to refill'
                : '✨ Generate Story — 1 credit'}
          </button>
        )}
        {user && credits < 1 && (
          <p className="no-credits-hint">You've used all your credits. Click the credits badge to add more.</p>
        )}
      </div>
    </div>
  )
}
