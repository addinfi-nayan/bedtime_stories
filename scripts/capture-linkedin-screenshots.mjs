// Captures real, local UI states via a Chrome DevTools session started on port
// 9222. Intended for the LinkedIn launch-kit assets, not application runtime.
import { writeFile } from 'node:fs/promises'

const baseUrl = 'http://127.0.0.1:5173/'
const outDir = new URL('../docs/linkedin-assets/', import.meta.url)

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function getPageSocket() {
  const pages = await fetch('http://127.0.0.1:9222/json/list').then((r) => r.json())
  const page = pages.find((item) => item.type === 'page' && item.url !== 'chrome://newtab/')
  if (!page?.webSocketDebuggerUrl) throw new Error('No debuggable Chrome page found on port 9222.')
  return page.webSocketDebuggerUrl
}

async function connect() {
  const socket = new WebSocket(await getPageSocket())
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true })
    socket.addEventListener('error', reject, { once: true })
  })

  let sequence = 0
  const pending = new Map()
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data)
    const request = pending.get(message.id)
    if (!request) return
    pending.delete(message.id)
    message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result)
  })

  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence
    pending.set(id, { resolve, reject })
    socket.send(JSON.stringify({ id, method, params }))
  })

  return { socket, call }
}

async function waitFor(call, selector) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const { result } = await call('Runtime.evaluate', {
      expression: `Boolean(document.querySelector(${JSON.stringify(selector)}))`,
      returnByValue: true,
    })
    if (result.value) return
    await sleep(125)
  }
  throw new Error(`Timed out waiting for ${selector}`)
}

async function capture(call, filename) {
  const { data } = await call('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
    fromSurface: true,
  })
  await writeFile(new URL(filename, outDir), Buffer.from(data, 'base64'))
}

const { socket, call } = await connect()
try {
  await call('Page.enable')
  await call('Runtime.enable')
  await call('Emulation.setDeviceMetricsOverride', {
    width: 1440, height: 1080, deviceScaleFactor: 1, mobile: false,
  })
  await call('Page.navigate', { url: baseUrl })
  await waitFor(call, '.landing')
  await sleep(400)
  await capture(call, '01-landing-page.png')

  await call('Runtime.evaluate', {
    expression: `[...document.querySelectorAll('button')].find((button) => button.textContent.includes('Create Story'))?.click()`,
  })
  await waitFor(call, '.story-form')
  await sleep(250)
  await capture(call, '02-story-creator.png')

  await call('Emulation.setDeviceMetricsOverride', {
    width: 430, height: 932, deviceScaleFactor: 2, mobile: true,
  })
  await call('Page.navigate', { url: baseUrl })
  await waitFor(call, '.landing')
  await sleep(400)
  await capture(call, '03-mobile-landing.png')
} finally {
  socket.close()
}
