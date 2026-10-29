import type { GameEvent } from './engine'

export class JungleAudio {
  context: AudioContext | null = null
  enabled = true

  unlock() {
    if (!this.enabled) return
    try {
      this.context ??= new AudioContext()
      if (this.context.state === 'suspended') void this.context.resume().catch(() => {})
    } catch { /* The expedition also works without browser audio. */ }
  }

  play(event: GameEvent) {
    if (!this.enabled || !this.context || this.context.state !== 'running') return
    if (event === 'log') return this.logThud()
    if (event === 'hurt') return this.deathTune()
    if (event === 'swing') return this.jungleYell()
    if (event === 'splash') return this.splash()
    if (event === 'zap') return this.zap()
    const notes: Record<Exclude<GameEvent, 'log' | 'hurt' | 'swing' | 'splash' | 'zap'>, number[]> = {
      jump: [220, 440], treasure: [523, 659, 784, 1047],
      fall: [330, 165], tent: [392, 523], air: [988, 740, 988, 740], win: [523, 659, 784, 1047, 784, 1047],
    }
    notes[event].forEach((frequency, i) => this.tone(frequency, i * 0.075, 0.12, 0.035, 'square'))
  }

  tone(frequency: number, delay: number, length: number, volume: number, type: OscillatorType, endFrequency = frequency) {
    const ctx = this.context!
    const start = ctx.currentTime + delay
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, start)
    if (endFrequency !== frequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + length)
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.005)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length)
    oscillator.connect(gain); gain.connect(ctx.destination)
    oscillator.start(start); oscillator.stop(start + length + 0.01)
  }

  // A woody knock that repeats while a log rolls against Harry.
  logThud() {
    this.tone(160, 0, 0.07, 0.06, 'triangle', 55)
    this.tone(90, 0, 0.05, 0.03, 'square', 45)
  }

  // Harry dropping into the underground river: a burst of noise that dulls as it fades.
  splash() {
    const ctx = this.context!, now = ctx.currentTime
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.35), ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 2
    const source = ctx.createBufferSource(); source.buffer = buffer
    const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'
    filter.frequency.setValueAtTime(1800, now); filter.frequency.exponentialRampToValueAtTime(260, now + 0.35)
    const gain = ctx.createGain(); gain.gain.value = 0.16
    source.connect(filter); filter.connect(gain); gain.connect(ctx.destination)
    source.start(now)
  }

  // An electric eel's shock: a buzzing crackle that drops away, just before the death tune.
  zap() {
    this.tone(1400, 0, 0.2, 0.045, 'sawtooth', 180)
    this.tone(70, 0, 0.22, 0.04, 'square', 40)
  }

  // A jungle yodel when Harry grabs a vine: a rising call, a chest/falsetto yodel break, and a long
  // wavering note. A buzzy voice runs through two "ah" vowel formants so it sounds sung rather than beeped.
  yellUntil = 0
  jungleYell() {
    const ctx = this.context!
    const now = ctx.currentTime
    if (now < this.yellUntil) return
    // About two semitones below the original 300/600 Hz pitches.
    const low = 267, high = 534
    // [pitch, seconds to glide there, seconds to hold]
    const phrase: [number, number, number][] = [
      [low * 0.8, 0, 0.02], [low, 0.12, 0.14], [high, 0.05, 0.16],
      [low * 1.25, 0.03, 0.1], [high, 0.03, 0.1], [low * 1.25, 0.03, 0.1], [high, 0.03, 0.1],
      [low * 1.25, 0.03, 0.12], [high * 0.95, 0.04, 0.42], [low * 0.9, 0.22, 0],
    ]
    const voice = ctx.createOscillator(); voice.type = 'sawtooth'
    let t = now
    for (const [pitch, glide, hold] of phrase) {
      if (glide > 0) voice.frequency.exponentialRampToValueAtTime(pitch, t + glide)
      else voice.frequency.setValueAtTime(pitch, t)
      t += glide; voice.frequency.setValueAtTime(pitch, t + hold); t += hold
    }
    const end = t
    // Vibrato that deepens on the final held note.
    const vibrato = ctx.createOscillator(); vibrato.frequency.value = 6.5
    const depth = ctx.createGain(); depth.gain.setValueAtTime(6, now); depth.gain.linearRampToValueAtTime(18, end)
    vibrato.connect(depth); depth.connect(voice.frequency)
    const out = ctx.createGain()
    out.gain.setValueAtTime(0.0001, now)
    out.gain.exponentialRampToValueAtTime(0.14, now + 0.06)
    out.gain.setValueAtTime(0.14, end - 0.3)
    out.gain.exponentialRampToValueAtTime(0.0001, end)
    for (const [frequency, q, level] of [[750, 5, 1], [1150, 7, 0.6]] as const) {
      const formant = ctx.createBiquadFilter(); formant.type = 'bandpass'; formant.frequency.value = frequency; formant.Q.value = q
      const mix = ctx.createGain(); mix.gain.value = level
      voice.connect(formant); formant.connect(mix); mix.connect(out)
    }
    out.connect(ctx.destination)
    voice.start(now); vibrato.start(now); voice.stop(end + 0.05); vibrato.stop(end + 0.05)
    this.yellUntil = end
  }

  // A falling, wobbling phrase that plays once when Harry loses a life.
  deathTune() {
    [392, 349, 311, 262, 233, 196].forEach((frequency, i) => this.tone(frequency, i * 0.13, 0.12, 0.045, 'square', frequency * 0.94))
    this.tone(98, 0.8, 0.45, 0.05, 'sawtooth', 49)
  }

  destroy() { void this.context?.close().catch(() => {}); this.context = null }
}
