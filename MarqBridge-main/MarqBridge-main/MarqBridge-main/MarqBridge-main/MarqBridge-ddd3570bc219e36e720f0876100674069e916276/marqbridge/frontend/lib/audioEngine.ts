'use client'

let audioCtx: AudioContext | null = null

function canUseAudio(): boolean {
  if (typeof window === 'undefined') return false
  return Boolean(window.AudioContext || (window as any).webkitAudioContext)
}

function getCtx(): AudioContext | null {
  if (!canUseAudio()) return null
  if (!audioCtx) {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext
    audioCtx = new Ctor()
  }
  return audioCtx
}

function isSoundEnabled(key: string): boolean {
  if (typeof window === 'undefined') return true
  try {
    const prefs = JSON.parse(localStorage.getItem('marq_sounds') || '{}')
    return prefs[key] !== false
  } catch {
    return true
  }
}

function playTone(
  frequency: number,
  duration: number,
  gain: number,
  type: OscillatorType = 'sine',
  fadeOut = true,
) {
  const ctx = getCtx()
  if (!ctx) return

  const osc = ctx.createOscillator()
  const vol = ctx.createGain()

  osc.connect(vol)
  vol.connect(ctx.destination)

  osc.type = type
  osc.frequency.setValueAtTime(frequency, ctx.currentTime)
  vol.gain.setValueAtTime(gain, ctx.currentTime)

  if (fadeOut) {
    vol.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
  }

  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + duration)
}

function playSequence(notes: { f: number; d: number; delay: number }[], gain = 0.3) {
  notes.forEach(({ f, d, delay }) => {
    setTimeout(() => playTone(f, d, gain), delay)
  })
}

export const AudioEngine = {
  tap() {
    if (!isSoundEnabled('tap')) return
    try {
      playTone(800, 0.05, 0.08, 'square', true)
    } catch {}
  },

  notify() {
    if (!isSoundEnabled('gate')) return
    try {
      playSequence([
        { f: 880, d: 0.12, delay: 0 },
        { f: 1100, d: 0.12, delay: 120 },
      ], 0.15)
    } catch {}
  },

  gateApproved() {
    if (!isSoundEnabled('gate')) return
    try {
      playSequence([
        { f: 660, d: 0.1, delay: 0 },
        { f: 880, d: 0.1, delay: 100 },
        { f: 1100, d: 0.15, delay: 200 },
      ], 0.2)
    } catch {}
  },

  gateBlocked() {
    if (!isSoundEnabled('gate')) return
    try {
      playSequence([
        { f: 440, d: 0.15, delay: 0 },
        { f: 330, d: 0.2, delay: 150 },
      ], 0.25)
    } catch {}
  },

  marginWarning() {
    if (!isSoundEnabled('liq_watch')) return
    try {
      playTone(520, 0.3, 0.3, 'sine')
    } catch {}
  },

  liquidationAlert() {
    if (!isSoundEnabled('liq_watch')) return
    try {
      playSequence([
        { f: 660, d: 0.2, delay: 0 },
        { f: 660, d: 0.2, delay: 280 },
      ], 0.4)
    } catch {}
  },

  liquidationDanger() {
    if (!isSoundEnabled('liq_danger')) return
    try {
      playSequence([
        { f: 880, d: 0.15, delay: 0 },
        { f: 880, d: 0.15, delay: 200 },
        { f: 880, d: 0.15, delay: 400 },
      ], 0.5)
    } catch {}
  },

  liquidationImminent() {
    if (!isSoundEnabled('liq_danger')) return
    try {
      [0, 200, 400, 600, 800].forEach(delay => {
        setTimeout(() => playTone(1100, 0.18, 0.6, 'sawtooth'), delay)
      })
    } catch {}
  },

  circuitBreaker() {
    if (!isSoundEnabled('circuit')) return
    try {
      playTone(120, 0.5, 0.5, 'sawtooth')
      setTimeout(() => playTone(80, 0.4, 0.3, 'sawtooth'), 200)
    } catch {}
  },

  connected() {
    if (!isSoundEnabled('gate')) return
    try {
      playSequence([
        { f: 523, d: 0.1, delay: 0 },
        { f: 659, d: 0.1, delay: 100 },
        { f: 784, d: 0.2, delay: 200 },
      ], 0.25)
    } catch {}
  },
}

export function unlockAudio() {
  const ctx = getCtx()
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {})
  }
}
