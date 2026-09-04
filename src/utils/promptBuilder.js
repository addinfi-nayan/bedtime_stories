/**
 * Converts the story form state into a Claude prompt.
 * The model must respond with: title on line 1, blank line, then story body.
 */


const LENGTH_MAP = {
  tiny:   { label: 'Tiny (~2 min read)',   words: '200-300'   },
  short:  { label: 'Short (~4 min read)',  words: '400-550'   },
  medium: { label: 'Medium (~7 min read)', words: '750-950'   },
  long:   { label: 'Long (~12 min read)',  words: '1300-1600' },
}

export function buildPrompt(form) {
  const {
    ageGroup,
    language,
    childNames,
    genres,
    settings: storySettings,
    morals,
    mainCharacter,
    storyLength,
    tone,
    endWithSleep,
    includeRhyme,
    includeFunFact,
    includeRiddle,
    catchphrase,
    cliffhanger,
    readingLevel,
    pov,
    villain,
    timeOfStory,
    culturalFlavour,
    customTitle,
    specialObject,
    extraDetails,
  } = form

  const wordTarget = LENGTH_MAP[storyLength]?.words || '400-550'

  const langNote = language !== 'English'
    ? `Write the ENTIRE story in ${language}. The title must also be in ${language}.`
    : 'Write in English.'

  const characterNote = childNames?.trim()
    ? `The main character is named ${childNames.trim()}. Use this name throughout.`
    : mainCharacter
      ? `The main character is a ${mainCharacter}.`
      : 'Choose an interesting main character.'

  const genreNote    = genres?.trim()         ? `Genre: ${genres}.`                                          : ''
  const settingNote  = storySettings?.length ? `Setting(s): ${storySettings.join(', ')}.`                     : ''
  const moralNote    = morals?.length        ? `Weave in these lesson(s) naturally: ${morals.join(', ')}.`    : ''

  const toggles = []
  if (endWithSleep)   toggles.push('Gently wind the story down so the child feels sleepy by the end — the final paragraphs should become calm and soothing.')
  if (includeRhyme)   toggles.push('Include one short rhyming section or poem woven naturally into the story.')
  if (includeFunFact) toggles.push('Embed one real, interesting fun fact appropriate for the age group.')
  if (includeRiddle)  toggles.push('Include a simple, fun riddle or puzzle for the child.')
  if (catchphrase)    toggles.push('Include a fun repetitive catchphrase that appears 2–3 times throughout the story.')
  if (cliffhanger)    toggles.push('End the story with a cliffhanger and the words "To be continued..." — leave the reader excited for more.')

  const advanced = []
  if (readingLevel && readingLevel !== 'auto')
    advanced.push(`Reading level: ${readingLevel}.`)
  if (pov && pov !== 'third')
    advanced.push(`Tell the story in ${pov === 'second' ? 'second person (you/your)' : 'first person (I/me)'}.`)
  if (villain && villain !== 'none')
    advanced.push(`Villain/obstacle type: ${villain}.`)
  if (timeOfStory && timeOfStory !== 'none')
    advanced.push(`Time of story: ${timeOfStory}.`)
  if (culturalFlavour && culturalFlavour !== 'none')
    advanced.push(`Cultural flavour: ${culturalFlavour}.`)

  const freeText = []
  if (customTitle?.trim())   freeText.push(`Use this as the story title: "${customTitle.trim()}"`)
  if (specialObject?.trim()) freeText.push(`Feature this special object or place: ${specialObject.trim()}`)
  if (extraDetails?.trim())  freeText.push(`Additional details to incorporate: ${extraDetails.trim()}`)

  const seed = Math.random().toString(36).slice(2, 9)

  return `Write a completely original children's bedtime story. [id:${seed}]

RESPONSE FORMAT (strictly follow):
- Line 1: Story title only (no "Title:" label, no quotes, no asterisks)
- Line 2: Blank line
- Line 3+: Story body in paragraphs

STORY REQUIREMENTS:
- Age group: ${ageGroup || '4–6'} years old
- ${langNote}
- Length: ${wordTarget} words
- Tone: ${tone || 'Soothing'}
- ${characterNote}
${genreNote   ? `- ${genreNote}`   : ''}
${settingNote ? `- ${settingNote}` : ''}
${moralNote   ? `- ${moralNote}`   : ''}

QUALITY RULES:
- Every story must feel completely fresh — invent new character names, place names, and plot events every time
- Match the tone and genre strictly to what is specified above; do not default to fantasy or magic unless the genre calls for it
- Include natural, gentle humour appropriate for the age group
- Keep the story warm, safe, and soothing throughout — no scary moments, no adult themes
- End on a positive, heartwarming note that leaves the child feeling happy and calm
${toggles.length ? '\nSPECIAL INSTRUCTIONS:\n' + toggles.map(t => `- ${t}`).join('\n') : ''}
${advanced.length ? '\nADVANCED OPTIONS:\n' + advanced.map(a => `- ${a}`).join('\n') : ''}
${freeText.length ? '\nCUSTOM DETAILS:\n' + freeText.map(f => `- ${f}`).join('\n') : ''}

Begin directly with the story title on the very first line.`
}

export { LENGTH_MAP }
