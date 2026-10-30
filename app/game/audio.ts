import type { GameEvent } from './engine'

export type Track = 'jungle' | 'cavern'
type Playhead = { gain: GainNode; step: number; next: number }

// Each track's level: the music sits about 6 dB under the sound effects, the caverns a little lower still.
const MUSIC_LEVELS: Record<Track, number> = { jungle: 0.18, cavern: 0.14 }
// Music is written a bar at a time, sixteen steps to the bar: notes such as 'G5' or 'F#4', or '.' for a
// rest. Rhythm parts use a character a step: 'x' for a hit, 'o' for a softer one.
const midi = (note: string) => {
  const [, name, accidental, octave] = /^([A-G])([#b]?)(\d)$/.exec(note)!
  return 12 * (Number(octave) + 1) + 'C D EF G A B'.indexOf(name!) + (accidental === '#' ? 1 : accidental === 'b' ? -1 : 0)
}
const hz = (note: number) => 440 * 2 ** ((note - 69) / 12)
const pitches = (...names: string[]) => names.map(name => hz(midi(name)))
const bars = (...lines: string[]) => lines.map(line => line.split(' ').map(n => n === '.' ? 0 : hz(midi(n))))
const chord = (bass: string, ...tones: string[]) => ({ bass: midi(bass), tones: pitches(...tones) })

// The jungle: a bouncy marimba tune in G over congas, a shaker and a plucked bass. After eight bars it
// eases into a calmer stretch where a kalimba picks out the chords and birds call to each other.
const CHORDS = {
  G: chord('G2', 'D4', 'G4', 'B4', 'D5'), C: chord('C3', 'C4', 'E4', 'G4', 'C5'), D: chord('D3', 'D4', 'F#4', 'A4', 'D5'),
  Em: chord('E2', 'E4', 'G4', 'B4', 'E5'), Am: chord('A2', 'C4', 'E4', 'A4', 'C5'),
}
const JUNGLE = {
  tempo: 112,
  chords: ['G', 'C', 'G', 'D', 'Em', 'C', 'Am', 'D', 'Em', 'Em', 'C', 'C', 'G', 'G', 'D', 'D'] as const,
  melody: bars(
    'D5 . . G5 . . G5 . A5 . B5 . A5 . G5 .', 'E5 . . G5 . . E5 . C5 . . . . . D5 .',
    'D5 . . G5 . . G5 . A5 . B5 . D6 . B5 .', 'A5 . . F#5 . . D5 . E5 . F#5 . A5 . . .',
    'B5 . . G5 . . E5 . G5 . B5 . A5 . G5 .', 'E5 . . G5 . . C6 . B5 . A5 . G5 . E5 .',
    'A5 . . C6 . . A5 . E5 . G5 . A5 . . .', 'F#5 . G5 . A5 . . D5 . . F#5 . A5 . D6 .',
    'E5 . . . G5 . . . B5 . . . . . . .', 'A5 . . . G5 . . . E5 . . . D5 . . .',
    'E5 . . . G5 . . . C6 . . . . . . .', 'B5 . . . A5 . . . G5 . . . E5 . . .',
    'D5 . . . G5 . . . B5 . . . D6 . . .', 'E6 . . . D6 . . . B5 . . . G5 . . .',
    'A5 . . . . . F#5 . . . A5 . . . . .', 'D6 . . . C6 . . . A5 . . . F#5 . . .',
  ),
  // The bass plays the chord's root (R), fifth (5) or octave (8); the kalimba chops offbeat chords in the
  // tune and picks out chord tones (by number) in the calm stretch. The last bar of each half has a fill.
  tune: { low: 'x.....x.....x...', high: '....x.....x...xx', shaker: 'o.x.o.x.o.x.o.x.', bass: 'R.....5.R...8.5.', chop: '..x...x...x...x.', pick: '................' },
  calm: { low: 'x.......x.......', high: '..........o.....', shaker: 'o...x...o...x...', bass: 'R.......5.......', chop: '................', pick: '0.1.2.3.2.1.2.1.' },
  fill: '........x.x.xxxx',
}
const BASS_STEPS: Record<string, number> = { R: 0, 5: 7, 8: 12 }

// The caverns: a slow, cold drone sliding between D and E flat, a music box picking out a broken
// lullaby that echoes off the walls, a faint heartbeat, water dripping, and wind moaning through the rock.
const CAVERN = {
  tempo: 64,
  // [first bar, bars held, notes]
  drones: [[0, 2, pitches('D2', 'A2', 'D3')], [2, 2, pitches('Eb2', 'Bb2', 'Eb3')], [4, 2, pitches('D2', 'A2', 'D3')], [6, 1, pitches('Bb1', 'F2', 'D3')], [7, 1, pitches('A1', 'E2', 'C#3')]] as const,
  bells: bars(
    'D5 . . . F5 . . . A5 . . . . . . .', 'G#5 . . . . . . . A5 . . . . . . .',
    'G5 . . . Eb5 . . . . . . . Bb4 . . .', '. . . . . . . . D5 . . . Eb5 . . .',
    'F5 . . . . . . . E5 . . . D5 . . .', 'A4 . . . . . . . . . . . . . . .',
    'D5 . . . F5 . . . Bb5 . . . A5 . . .', 'G#5 . . . . . . . E5 . . . C#5 . . .',
  ),
  heart: 'xo......xo......',
  drips: ['......x.........', '...........x....', '...x.........x..', '................', '.........x......', '..x....x........', '..............x.', '.....x..........'],
}

export class JungleAudio {
  context: AudioContext | null = null
  enabled = true
  // Background music: a bus under the sound effects, a fading playhead for each track, the caverns' echo,
  // and a buffer of white noise for the shaker and the wind.
  bus: GainNode | null = null
  tracks: Record<Track, Playhead> | null = null
  track: Track | null = null
  echo: DelayNode | null = null
  noise: AudioBuffer | null = null

  unlock() {
    if (!this.enabled) return
    try {
      this.context ??= new AudioContext()
      if (this.context.state === 'suspended') void this.context.resume().catch(() => {})
    } catch { /* The expedition also works without browser audio. */ }
  }

  play(event: GameEvent) {
    if (!this.enabled || !this.context || this.context.state !== 'running') return
    if (event === 'hurt' || event === 'win') this.duck(event === 'hurt' ? 1.4 : 0.8)
    if (event === 'log') return this.logThud()
    if (event === 'hurt') return this.deathTune()
    if (event === 'swing') return this.jungleYell()
    if (event === 'splash') return this.splash()
    if (event === 'zap') return this.zap()
    if (event === 'screech') return this.screech()
    if (event === 'squeak') return this.squeak()
    const notes: Record<Exclude<GameEvent, 'log' | 'hurt' | 'swing' | 'splash' | 'zap' | 'screech' | 'squeak'>, number[]> = {
      jump: [220, 440], treasure: [523, 659, 784, 1047],
      fall: [330, 165], tent: [392, 523], air: [988, 740, 988, 740], win: [523, 659, 784, 1047, 784, 1047],
    }
    notes[event].forEach((frequency, i) => this.tone(frequency, i * 0.075, 0.12, 0.035, 'square'))
  }

  tone(frequency: number, delay: number, length: number, volume: number, type: OscillatorType, endFrequency = frequency) {
    const ctx = this.context!
    this.voice(type, frequency, ctx.currentTime + delay, 0.005, length, volume, ctx.destination, endFrequency)
  }

  // One oscillator note at a set time: a quick attack, then an exponential fade, with an optional glide
  // in pitch. Returns the note's gain, so it can feed an echo too.
  voice(type: OscillatorType, frequency: number, at: number, attack: number, length: number, volume: number, out: AudioNode, endFrequency = frequency, glide = length) {
    const ctx = this.context!
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, at)
    if (endFrequency !== frequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, at + glide)
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(volume, at + attack)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + length)
    oscillator.connect(gain); gain.connect(out)
    oscillator.start(at); oscillator.stop(at + length + 0.01)
    return gain
  }

  // Plays the given track (or none), called every frame. Switching fades one track out and the other in
  // from its first bar; a few tenths of a second of notes are always scheduled ahead.
  music(track: Track | null) {
    const ctx = this.context
    if (!ctx || ctx.state !== 'running') return
    if (!this.tracks) this.setupMusic(ctx)
    const want = this.enabled ? track : null
    if (want !== this.track) this.switchTrack(want, ctx.currentTime)
    this.schedule(ctx.currentTime, ctx.currentTime + 0.3)
  }

  setupMusic(ctx: BaseAudioContext) {
    this.bus = ctx.createGain(); this.bus.connect(ctx.destination)
    const playhead = () => { const gain = ctx.createGain(); gain.gain.value = 0; gain.connect(this.bus!); return { gain, step: 0, next: 0 } }
    this.tracks = { jungle: playhead(), cavern: playhead() }
    // The caverns' echo: a delay fed back into itself through a dulling filter, like sound off rock walls.
    const delay = ctx.createDelay(1), feedback = ctx.createGain(), dull = ctx.createBiquadFilter()
    delay.delayTime.value = 0.47; feedback.gain.value = 0.42; dull.type = 'lowpass'; dull.frequency.value = 1800
    delay.connect(dull); dull.connect(feedback); feedback.connect(delay); dull.connect(this.tracks.cavern.gain)
    this.echo = delay
  }

  switchTrack(track: Track | null, now: number) {
    for (const name of ['jungle', 'cavern'] as const) {
      const playhead = this.tracks![name], level = playhead.gain.gain, on = name === track
      level.cancelScheduledValues(now); level.setValueAtTime(level.value, now)
      level.linearRampToValueAtTime(on ? MUSIC_LEVELS[name] : 0, now + (on ? 1.5 : 1.2))
      if (on) { playhead.step = 0; playhead.next = now + 0.1 }
    }
    this.track = track
  }

  // Plays every step of the current track due before `until`. Steps that fell before `from` while a
  // frame stalled are skipped, keeping the beat.
  schedule(from: number, until: number) {
    if (!this.track) return
    const playhead = this.tracks![this.track], song = this.track === 'jungle' ? JUNGLE : CAVERN
    const step = 15 / song.tempo, length = (this.track === 'jungle' ? JUNGLE.melody : CAVERN.bells).length * 16
    for (; playhead.next < until; playhead.next += step, playhead.step = (playhead.step + 1) % length) {
      if (playhead.next < from) continue
      const bar = Math.floor(playhead.step / 16)
      if (this.track === 'jungle') this.jungleStep(bar, playhead.step % 16, playhead.next)
      else this.cavernStep(bar, playhead.step % 16, playhead.next)
    }
  }

  jungleStep(bar: number, step: number, at: number) {
    const out = this.tracks!.jungle.gain, part = bar < 8 ? JUNGLE.tune : JUNGLE.calm, { bass, tones } = CHORDS[JUNGLE.chords[bar]!]
    const note = JUNGLE.melody[bar]![step]!
    if (note) this.marimba(note, at, bar < 8 ? 0.08 : 0.065, out)
    const root = part.bass[step]!
    if (root !== '.') this.pluck(hz(bass + BASS_STEPS[root]!), at, out)
    if (part.chop[step] === 'x') for (const tone of tones.slice(1, 3)) this.kalimba(tone, at, 0.025, out)
    const pick = Number(part.pick[step])
    if (!Number.isNaN(pick)) this.kalimba(tones[pick]!, at, 0.06, out)
    const low = part.low[step], high = (bar % 8 === 7 ? JUNGLE.fill : part.high)[step], shake = part.shaker[step]
    if (low !== '.') this.conga(170, at, low === 'x' ? 0.11 : 0.075, out)
    if (high !== '.') this.conga(300, at, high === 'x' ? 0.065 : 0.04, out)
    if (shake !== '.') this.shaker(at, shake === 'x' ? 0.07 : 0.035, out)
    if ((bar === 9 || bar === 13) && step === 8) this.birdCall(at, out)
  }

  cavernStep(bar: number, step: number, at: number) {
    const out = this.tracks!.cavern.gain, beat = 15 / CAVERN.tempo
    if (step === 0) for (const [first, held, notes] of CAVERN.drones) if (first === bar) this.drone(notes, at, held * 16 * beat, out)
    const bell = CAVERN.bells[bar]![step]!
    if (bell) this.bell(bell, at, 0.05, out)
    const heart = CAVERN.heart[step]
    if (heart !== '.') this.voice('sine', 90, at, 0.005, 0.3, heart === 'x' ? 0.13 : 0.08, out, 40, 0.15)
    if (CAVERN.drips[bar]![step] === 'x') {
      const pitch = 1700 + ((bar * 7 + step * 3) % 9) * 120
      this.voice('sine', pitch, at, 0.002, 0.08, 0.03, out, pitch * 1.8, 0.05).connect(this.echo!)
    }
    if (step === 0 && bar % 4 === 0) this.wind(at, 48 * beat, out)
    if (step === 0 && bar === 6) this.groan(at, out)
  }

  // Music dips while the death tune or the victory fanfare plays.
  duck(seconds: number) {
    const ctx = this.context, level = this.bus?.gain
    if (!ctx || !level) return
    const now = ctx.currentTime
    level.cancelScheduledValues(now); level.setValueAtTime(level.value, now)
    level.linearRampToValueAtTime(0.2, now + 0.08); level.setValueAtTime(0.2, now + seconds)
    level.linearRampToValueAtTime(1, now + seconds + 1)
  }

  noiseBuffer() {
    const ctx = this.context!
    if (!this.noise) {
      this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
      const data = this.noise.getChannelData(0)
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    }
    return this.noise
  }

  // A wooden bar struck with a mallet: a ringing tone with a quick, bright overtone two octaves up.
  marimba(frequency: number, at: number, volume: number, out: AudioNode) {
    this.voice('sine', frequency, at, 0.003, 0.7, volume, out)
    this.voice('sine', frequency * 4, at, 0.002, 0.08, volume * 0.35, out)
  }

  // A thumb piano's plucked tine, with a faint metallic ping.
  kalimba(frequency: number, at: number, volume: number, out: AudioNode) {
    this.voice('triangle', frequency, at, 0.002, 0.5, volume, out)
    this.voice('sine', frequency * 5.9, at, 0.001, 0.04, volume * 0.25, out)
  }

  // A round plucked bass, with an octave above it so it carries on small speakers.
  pluck(frequency: number, at: number, out: AudioNode) {
    this.voice('triangle', frequency, at, 0.008, 0.38, 0.11, out)
    this.voice('sine', frequency * 2, at, 0.004, 0.1, 0.035, out)
  }

  // A hand drum: the skin's pitch drops just after the hit.
  conga(frequency: number, at: number, volume: number, out: AudioNode) {
    this.voice('sine', frequency * 1.6, at, 0.002, 0.24, volume, out, frequency, 0.03)
  }

  shaker(at: number, volume: number, out: AudioNode) {
    const ctx = this.context!, source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain()
    source.buffer = this.noiseBuffer(); filter.type = 'highpass'; filter.frequency.value = 6500
    gain.gain.setValueAtTime(0.0001, at); gain.gain.exponentialRampToValueAtTime(volume, at + 0.008); gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.07)
    source.connect(filter); filter.connect(gain); gain.connect(out)
    source.start(at, (at * 7.3) % 0.9, 0.09)
  }

  // Two birds calling to each other across the canopy.
  birdCall(at: number, out: AudioNode) {
    this.voice('sine', 2300, at, 0.01, 0.11, 0.05, out, 3100)
    this.voice('sine', 2700, at + 0.15, 0.01, 0.14, 0.045, out, 2100)
    this.voice('sine', 3000, at + 0.55, 0.01, 0.1, 0.035, out, 3400)
  }

  // Low, slightly detuned saws through a dark filter that slowly opens and closes, swelling in and out.
  drone(frequencies: readonly number[], at: number, length: number, out: AudioNode) {
    const ctx = this.context!, filter = ctx.createBiquadFilter(), gain = ctx.createGain(), end = at + length + 2
    filter.type = 'lowpass'; filter.Q.value = 2
    filter.frequency.setValueAtTime(220, at); filter.frequency.linearRampToValueAtTime(480, at + length / 2); filter.frequency.linearRampToValueAtTime(220, end)
    gain.gain.setValueAtTime(0.0001, at); gain.gain.linearRampToValueAtTime(0.016, at + 1.8); gain.gain.setValueAtTime(0.016, at + length); gain.gain.linearRampToValueAtTime(0.0001, end)
    filter.connect(gain); gain.connect(out)
    for (const frequency of frequencies) {
      for (const detune of [-7, 7]) {
        const oscillator = ctx.createOscillator(); oscillator.type = 'sawtooth'; oscillator.frequency.value = frequency; oscillator.detune.value = detune
        oscillator.connect(filter); oscillator.start(at); oscillator.stop(end)
      }
    }
  }

  // A music box's bell: a long tone with clanging, out-of-tune overtones, echoing off the cave walls.
  bell(frequency: number, at: number, volume: number, out: AudioNode) {
    for (const [ratio, level, length] of [[1, 1, 3], [2.76, 0.35, 1.4], [5.4, 0.12, 0.6]] as const) {
      this.voice('sine', frequency * ratio, at, 0.003, length, volume * level, out).connect(this.echo!)
    }
  }

  // Wind moaning through the rock: noise through a narrow filter that rises and falls.
  wind(at: number, length: number, out: AudioNode) {
    const ctx = this.context!, source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain()
    source.buffer = this.noiseBuffer(); source.loop = true
    filter.type = 'bandpass'; filter.Q.value = 5
    filter.frequency.setValueAtTime(260, at); filter.frequency.exponentialRampToValueAtTime(720, at + length * 0.45); filter.frequency.exponentialRampToValueAtTime(300, at + length)
    gain.gain.setValueAtTime(0.0001, at); gain.gain.linearRampToValueAtTime(0.22, at + length * 0.45); gain.gain.linearRampToValueAtTime(0.0001, at + length)
    source.connect(filter); filter.connect(gain); gain.connect(out)
    source.start(at); source.stop(at + length)
  }

  // Something big, far off in the dark: two low saws groaning downward against each other.
  groan(at: number, out: AudioNode) {
    const ctx = this.context!, filter = ctx.createBiquadFilter(), gain = ctx.createGain()
    filter.type = 'lowpass'; filter.frequency.value = 240
    gain.gain.setValueAtTime(0.0001, at); gain.gain.linearRampToValueAtTime(0.04, at + 1.2); gain.gain.linearRampToValueAtTime(0.0001, at + 3.6)
    filter.connect(gain); gain.connect(out)
    for (const frequency of [55, 58]) {
      const oscillator = ctx.createOscillator(); oscillator.type = 'sawtooth'
      oscillator.frequency.setValueAtTime(frequency, at); oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.82, at + 3.6)
      oscillator.connect(filter); oscillator.start(at); oscillator.stop(at + 3.7)
    }
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

  // A bat's shriek as it strikes: three thin chirps, each sliding down.
  screech() {
    for (let i = 0; i < 3; i++) this.tone(3200 - i * 300, i * 0.05, 0.05, 0.03, 'sawtooth', 2100 - i * 200)
  }

  // A cave rat's bite: two quick rising squeaks.
  squeak() {
    for (let i = 0; i < 2; i++) this.tone(1500, i * 0.08, 0.06, 0.035, 'square', 2300)
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

  destroy() {
    void this.context?.close().catch(() => {})
    this.context = null; this.bus = null; this.tracks = null; this.track = null; this.echo = null; this.noise = null
  }
}
