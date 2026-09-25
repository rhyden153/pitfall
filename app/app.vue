<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { atTentDoor, emptyInput, HEIGHT, PitfallEngine, WIDTH, type Input, type Status } from './game/engine'
import { BOARD, JungleRenderer } from './game/renderer'
import type { Mark, Outcome } from './game/tictactoe'
import { JungleAudio } from './game/audio'

useHead({ title: 'Pitfall! — The jungle is calling', meta: [{ name: 'description', content: 'An old-school jungle adventure, reimagined. Swing over pits, outsmart crocodiles, and collect 32 treasures in this free browser recreation of Pitfall!' }] })

const canvas = ref<HTMLCanvasElement | null>(null)
const cabinet = ref<HTMLElement | null>(null)
const dialog = ref<HTMLDialogElement | null>(null)
const game = new PitfallEngine()
const sound = new JungleAudio()
let renderer: JungleRenderer | null = null
let frame = 0
let previousTime = 0
let lastUi = 0
let input = emptyInput()
const keyboard = new Set<string>()
const pointers = new Map<number, keyof Input>()
const status = ref<Status>('ready')
const score = ref(2000)
const best = ref(0)
const remaining = ref(1200)
const lives = ref(3)
const treasures = ref(0)
const scene = ref(0)
const sceneName = ref('Base camp')
const message = ref('Your next great adventure starts here.')
const muted = ref(false)
const modal = ref<'guide' | 'map' | null>(null)
const visited = ref<number[]>([0])
const found = ref<number[]>([])
const fullscreenError = ref('')
const board = ref<(Mark | null)[]>(Array(9).fill(null))
const outcome = ref<Outcome>(null)
const tally = ref({ wins: 0, losses: 0, draws: 0 })
// The tent's board buttons sit exactly over the squares drawn on the canvas.
const boardStyle = { left: `${BOARD.x / WIDTH * 100}%`, top: `${BOARD.y / HEIGHT * 100}%`, width: `${BOARD.cell * 3 / WIDTH * 100}%`, height: `${BOARD.cell * 3 / HEIGHT * 100}%` }
let resumeAfterDialog = false
let returnFocus: HTMLElement | null = null
const clock = computed(() => `${Math.floor(Math.ceil(remaining.value) / 60).toString().padStart(2, '0')}:${(Math.ceil(remaining.value) % 60).toString().padStart(2, '0')}`)
const paused = computed(() => status.value === 'paused')
const inTent = computed(() => status.value === 'tent')
const ended = computed(() => status.value === 'over' || status.value === 'won')
const treasureTypes = [{ kind: 'bag', name: 'Money bag', value: '2,000' }, { kind: 'silver', name: 'Silver bar', value: '3,000' }, { kind: 'gold', name: 'Gold bar', value: '4,000' }, { kind: 'ring', name: 'Diamond ring', value: '5,000' }] as const
const keyActions: Record<string, keyof Input> = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', Space: 'jump', KeyZ: 'jump' }

function sync() {
  status.value = game.status; score.value = game.score; remaining.value = game.remaining
  lives.value = game.lives; treasures.value = game.treasureCount; scene.value = game.roomIndex
  sceneName.value = game.status === 'ready' ? 'Base camp' : game.status === 'tent' ? 'Harry’s tent' : game.room.name
  const t = game.tent
  board.value = [...t.board]; outcome.value = t.outcome; tally.value = { wins: t.wins, losses: t.losses, draws: t.draws }
  message.value = game.status === 'ready' ? 'Your next great adventure starts here.'
    : game.status === 'tent' ? (t.outcome === 'X' ? 'Three in a row! You beat the jungle.' : t.outcome === 'O' ? 'The jungle wins this one.' : t.outcome === 'draw' ? 'A draw. Nobody wins.' : t.turn === 'X' ? 'Your move: pick a square. Esc to leave the tent.' : 'The jungle is thinking…')
    : game.messageTime > 0 ? game.message : atTentDoor(game.roomIndex, game.player) ? 'Press ↑ to step inside the tent.' : game.player.layer === 'tunnel' ? 'Underground passages take you three scenes at a time.' : game.room.vine ? 'Jump toward the vine to grab it. Jump or ↓ to release.' : 'Keep exploring. Fortune favors the adventurous.'
  if (game.score > best.value && game.status !== 'ready') {
    best.value = game.score
    try { localStorage.setItem('pitfall-best', String(best.value)) } catch { /* Storage is optional. */ }
  }
}

function rebuildInput() {
  input = emptyInput()
  for (const code of keyboard) if (keyActions[code]) input[keyActions[code]!] = true
  for (const action of pointers.values()) input[action] = true
}
function clearInput() { keyboard.clear(); pointers.clear(); input = emptyInput() }
function start() { clearInput(); sound.unlock(); game.start(); previousTime = 0; sync(); canvas.value?.focus({ preventScroll: true }) }
function playSquare(square: number) {
  game.tent.cursor = square
  if (game.tent.play(square)) sound.play('jump')
  sync()
}
function playAgain() { game.tent.reset(); sync(); focusGame() }
function leaveTent() { game.leaveTent(); clearInput(); previousTime = 0; sync(); focusGame() }
// In the tent the arrows move the board cursor, Space/Enter marks a square and Escape steps outside.
function tentKey(event: KeyboardEvent) {
  const t = game.tent
  const moves: Record<string, [number, number]> = { ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0], ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1] }
  const move = moves[event.code]
  if (move) { event.preventDefault(); t.moveCursor(...move) }
  else if (event.code === 'Space' || event.code === 'Enter' || event.code === 'KeyZ') { event.preventDefault(); if (event.repeat) return; if (t.over) playAgain(); else playSquare(t.cursor) }
  else if (event.code === 'Escape' && !event.repeat) { event.preventDefault(); leaveTent() }
  else if (event.code === 'KeyM' && !event.repeat) toggleSound()
  sync()
}
function togglePause() {
  if (modal.value) return
  if (game.status === 'playing') game.pause()
  else if (game.status === 'paused') { sound.unlock(); game.resume(); previousTime = 0; canvas.value?.focus({ preventScroll: true }) }
  clearInput(); sync()
}
function savePreferences() {
  try { localStorage.setItem('pitfall-preferences', JSON.stringify({ muted: muted.value })) } catch { /* Storage is optional. */ }
}
// Hand focus back to the game so Space/Enter don't re-trigger the toolbar button.
function focusGame() { canvas.value?.focus({ preventScroll: true }) }
function toggleSound() { muted.value = !muted.value; sound.enabled = !muted.value; sound.unlock(); savePreferences(); focusGame() }
async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen()
    else if (cabinet.value?.requestFullscreen) await cabinet.value.requestFullscreen()
    else fullscreenError.value = 'Fullscreen is unavailable in this browser.'
  } catch { fullscreenError.value = 'Fullscreen is unavailable in this browser.' }
  focusGame()
}
async function openModal(type: 'guide' | 'map') {
  returnFocus = document.activeElement as HTMLElement
  resumeAfterDialog = game.status === 'playing'
  game.pause(); clearInput(); sync()
  visited.value = [...game.visited]; found.value = [...game.collected]
  modal.value = type
  await nextTick(); dialog.value?.showModal()
}
function closeModal() { dialog.value?.close() }
function onDialogClosed() {
  modal.value = null
  if (resumeAfterDialog) { game.resume(); previousTime = 0 }
  clearInput(); sync(); returnFocus?.focus({ preventScroll: true })
}
function keydown(event: KeyboardEvent) {
  if (modal.value || event.ctrlKey || event.altKey || event.metaKey) return
  const target = event.target as HTMLElement
  if (target.closest('button, a, input, select, textarea') && (event.code === 'Space' || event.code === 'Enter')) return
  if (game.status === 'tent') { tentKey(event); return }
  if (keyActions[event.code]) {
    event.preventDefault()
    if (game.status === 'ready' && (event.code === 'Space' || event.code === 'KeyZ')) { start(); return }
    // Enter the tent on the keypress itself, so a tap quicker than a frame still counts.
    if (!event.repeat && (event.code === 'ArrowUp' || event.code === 'KeyW') && game.deathTimer <= 0 && atTentDoor(game.roomIndex, game.player)) { game.enterTent(); clearInput(); sync(); return }
    keyboard.add(event.code); rebuildInput(); sound.unlock()
  }
  if (!event.repeat && (event.code === 'KeyP' || event.code === 'Escape')) { event.preventDefault(); togglePause() }
  if (!event.repeat && event.code === 'KeyM') toggleSound()
  if (!event.repeat && event.code === 'Enter' && (game.status === 'ready' || ended.value)) start()
}
function keyup(event: KeyboardEvent) { keyboard.delete(event.code); rebuildInput() }
function touchDown(event: PointerEvent, action: keyof Input) {
  event.preventDefault(); sound.unlock()
  const target = event.currentTarget as HTMLElement
  target.setPointerCapture(event.pointerId); pointers.set(event.pointerId, action); rebuildInput()
}
function touchUp(event: PointerEvent) { pointers.delete(event.pointerId); rebuildInput() }
function blur() { clearInput(); game.pause(); sync() }
function visibility() { if (document.hidden) blur() }
function resize() { renderer?.resize() }
function animate(timestamp: number) {
  const delta = previousTime ? (timestamp - previousTime) / 1000 : 0
  previousTime = timestamp
  game.update(delta, input)
  for (const event of game.events.splice(0)) sound.play(event)
  renderer?.draw(game, timestamp / 1000)
  if (timestamp - lastUi > 80 || status.value !== game.status) { sync(); lastUi = timestamp }
  frame = requestAnimationFrame(animate)
}

onMounted(() => {
  try {
    best.value = Math.max(0, Number(localStorage.getItem('pitfall-best')) || 0)
    const prefs = JSON.parse(localStorage.getItem('pitfall-preferences') || '{}')
    muted.value = prefs.muted === true
  } catch { /* Defaults work when browser storage is disabled. */ }
  sound.enabled = !muted.value
  renderer = new JungleRenderer(canvas.value!)
  renderer.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
  window.addEventListener('keydown', keydown); window.addEventListener('keyup', keyup)
  window.addEventListener('blur', blur); window.addEventListener('resize', resize)
  document.addEventListener('visibilitychange', visibility)
  frame = requestAnimationFrame(animate)
})
onBeforeUnmount(() => {
  cancelAnimationFrame(frame); sound.destroy()
  window.removeEventListener('keydown', keydown); window.removeEventListener('keyup', keyup)
  window.removeEventListener('blur', blur); window.removeEventListener('resize', resize)
  document.removeEventListener('visibilitychange', visibility)
})
</script>

<template>
  <div class="site-shell">
    <header class="site-header">
      <a class="arcade-brand" href="/" aria-label="Pitfall home"><span class="brand-mark"><ArcadeIcon name="compass" :size="24" /></span> FIELDWORK <span class="brand-arcade">ARCADE</span></a>
      <div class="header-caption"><span class="status-dot" /> OLD SCHOOL. NEW ADVENTURE.</div>
      <button class="guide-link" @click="openModal('guide')"><ArcadeIcon name="book" :size="17" /> Field guide <span>↗</span></button>
    </header>

    <main>
      <section class="hero" aria-labelledby="page-title">
        <div class="hero-title">
          <div class="eyebrow"><span class="edition-line" /> EST. 1982 <span class="eyebrow-slash">/</span> REIMAGINED</div>
          <h1 id="page-title">PITFALL<span>!</span><svg class="title-leaf" viewBox="0 0 58 60" fill="none" aria-hidden="true"><path d="M9 54C20 36 25 15 50 6 56 34 41 49 20 45" fill="#71804c" /><path d="M9 55 44 16M24 39l-2-16m11 5 13-1" stroke="#f3f0e7" stroke-width="2" /></svg></h1>
          <p class="hero-subtitle">The jungle is calling.</p>
        </div>
        <div class="hero-description"><p>A little courage. A well-timed leap.<br />A whole jungle of possibility.</p><div class="expedition-tag"><ArcadeIcon name="flag" :size="15" /> 32 TREASURES <span>·</span> 20 MINUTES <span>·</span> 3 LIVES</div></div>
      </section>

      <section ref="cabinet" class="game-cabinet" aria-label="Pitfall jungle adventure">
        <div class="game-toolbar">
          <div class="expedition-label"><span class="status-dot" /><span>THE EXPEDITION</span><span class="session-label">{{ status === 'ready' ? 'READY WHEN YOU ARE' : paused ? 'TAKING A BREATHER' : inTent ? 'RESTING IN CAMP' : ended ? 'EXPEDITION COMPLETE' : 'IN PROGRESS' }}</span></div>
          <div class="toolbar-actions">
            <button class="icon-button" :aria-label="muted ? 'Enable sound' : 'Mute sound'" :aria-pressed="muted" :title="muted ? 'Enable sound (M)' : 'Mute sound (M)'" @click="toggleSound"><ArcadeIcon :name="muted ? 'mute' : 'sound'" :size="18" /></button>
            <button class="icon-button fullscreen-button" aria-label="Toggle fullscreen" title="Fullscreen" @click="toggleFullscreen"><ArcadeIcon name="expand" :size="18" /></button>
          </div>
        </div>

        <div class="scoreboard">
          <div class="score-item main-score"><span class="score-label">SCORE</span><strong>{{ score.toString().padStart(6, '0') }}</strong></div>
          <div class="score-item best-score"><span class="score-label">PERSONAL BEST</span><strong>{{ best.toString().padStart(6, '0') }}</strong></div>
          <div class="score-item time-score" :class="{ urgent: remaining < 60 }"><span class="score-label"><ArcadeIcon name="clock" :size="11" /> TIME LEFT</span><strong>{{ clock }}</strong></div>
          <div class="score-item treasure-score"><span class="score-label">TREASURES</span><strong>{{ treasures.toString().padStart(2, '0') }} <small>/ 32</small></strong></div>
          <div class="score-item lives-score"><span class="score-label">LIVES</span><span class="hearts"><ArcadeIcon v-for="n in 3" :key="n" name="heart" :size="18" :class="{ lost: n > lives }" /></span></div>
        </div>

        <div class="canvas-stage">
          <canvas ref="canvas" width="960" height="480" tabindex="0" aria-label="Pitfall game. Move with arrow keys or WASD. Space to jump, up and down to climb. P to pause." />
          <div class="scene-stamp"><span class="scene-number">{{ status === 'ready' ? '001' : (scene + 1).toString().padStart(3, '0') }}</span><span>{{ sceneName }}</span></div>
          <div v-if="status === 'ready'" class="start-overlay">
            <div class="start-card"><div class="start-eyebrow"><span /> INTO THE WILD <span /></div><h2>Fortune favors<br />the adventurous.</h2><p>Leap. Swing. Explore.<br />Your 20-minute adventure starts now.</p><button class="start-button" @click="start">Start expedition <ArcadeIcon name="arrow" :size="19" /></button><div class="start-shortcut">or press <kbd>SPACE</kbd> to begin</div></div>
          </div>
          <div v-else-if="paused && !modal" class="pause-overlay"><div class="pause-card"><ArcadeIcon name="compass" :size="36" /><span class="eyebrow">TAKE A BREATHER</span><h2>Even explorers<br />need a moment.</h2><p>Your adventure will be right here.</p><button class="start-button" @click="togglePause">Keep exploring <ArcadeIcon name="play" :size="16" /></button><button class="quiet-button" @click="start">Start a new expedition</button></div></div>
          <div v-else-if="inTent" class="tent-overlay">
            <div class="tent-tally" aria-label="Tic-tac-toe record"><span>HARRY <strong>{{ tally.wins }}</strong></span><span>JUNGLE <strong>{{ tally.losses }}</strong></span><span>DRAWS <strong>{{ tally.draws }}</strong></span></div>
            <div class="tent-board" :style="boardStyle" role="grid" aria-label="Tic-tac-toe board. You are X.">
              <button v-for="(mark, i) in board" :key="i" :disabled="!!mark || !!outcome" :aria-label="`Row ${Math.floor(i / 3) + 1}, column ${i % 3 + 1}: ${mark ?? 'empty'}`" @click="playSquare(i)" />
            </div>
            <div class="tent-actions"><button v-if="outcome" class="start-button" @click="playAgain">Play again <ArcadeIcon name="restart" :size="15" /></button><button class="start-button leave-button" @click="leaveTent">Back to the jungle <ArcadeIcon name="arrow" :size="15" /></button></div>
          </div>
          <div v-else-if="ended" class="pause-overlay"><div class="pause-card"><ArcadeIcon :name="status === 'won' ? 'flag' : 'compass'" :size="35" /><span class="eyebrow">{{ status === 'won' ? 'EVERY TREASURE. ONE LEGEND.' : 'UNTIL THE NEXT ADVENTURE' }}</span><h2>{{ status === 'won' ? 'A jungle legend.' : 'What a journey.' }}</h2><p>{{ treasures }} of 32 treasures found · {{ score.toLocaleString() }} points</p><button class="start-button" @click="start">Explore again <ArcadeIcon name="restart" :size="17" /></button></div></div>
        </div>

        <div class="game-status"><div class="location-label"><ArcadeIcon name="compass" :size="15" /><span>{{ message }}</span></div><div class="status-actions"><button @click="openModal('map')"><ArcadeIcon name="map" :size="15" /><span>Trail map</span></button><button :disabled="status === 'ready' || ended || inTent" :aria-label="paused ? 'Resume expedition' : 'Pause expedition'" @click="togglePause"><ArcadeIcon :name="paused ? 'play' : 'pause'" :size="15" /><span>{{ paused ? 'Resume' : 'Pause' }}</span><kbd>P</kbd></button></div></div>
        <div class="touch-controls" aria-label="Touch game controls">
          <div class="touch-directions"><button aria-label="Move left" @pointerdown="touchDown($event, 'left')" @pointerup="touchUp" @pointercancel="touchUp" @lostpointercapture="touchUp">←</button><div class="touch-vertical"><button aria-label="Climb up" @pointerdown="touchDown($event, 'up')" @pointerup="touchUp" @pointercancel="touchUp" @lostpointercapture="touchUp">↑</button><button aria-label="Climb down or release vine" @pointerdown="touchDown($event, 'down')" @pointerup="touchUp" @pointercancel="touchUp" @lostpointercapture="touchUp">↓</button></div><button aria-label="Move right" @pointerdown="touchDown($event, 'right')" @pointerup="touchUp" @pointercancel="touchUp" @lostpointercapture="touchUp">→</button></div>
          <button class="touch-jump" aria-label="Jump or release vine" @pointerdown="touchDown($event, 'jump')" @pointerup="touchUp" @pointercancel="touchUp" @lostpointercapture="touchUp">JUMP <span>↗</span></button>
        </div>
        <p v-if="fullscreenError" class="fullscreen-error" role="status">{{ fullscreenError }}</p>
      </section>

      <section class="field-notes" aria-label="How to play">
        <article class="controls-note"><div class="note-heading"><span class="note-number">01</span><h2>Know your moves.</h2></div><div class="control-row"><span class="key-group"><kbd>←</kbd><kbd>→</kbd><span class="or">/</span><kbd>A</kbd><kbd>D</kbd></span><span>Move</span></div><div class="control-row"><span class="key-group"><kbd class="wide-key">SPACE</kbd></span><span>Jump & grab a vine</span></div><div class="control-row"><span class="key-group"><kbd>↑</kbd><kbd>↓</kbd><span class="or">/</span><kbd>W</kbd><kbd>S</kbd></span><span>Climb · ↓ releases vine</span></div></article>
        <article class="treasure-note"><div class="note-heading"><span class="note-number">02</span><h2>Make it worth the trip.</h2></div><div class="treasure-list"><div v-for="item in treasureTypes" :key="item.kind" class="treasure-item"><TreasureIcon :kind="item.kind" /><span>{{ item.name }}</span><strong>{{ item.value }} <small>PTS</small></strong></div></div></article>
        <article class="tip-note"><div class="note-heading"><span class="note-number">03</span><h2>A word to the wise.</h2></div><p>Watch the jaws. Time the swing.<br />And remember: the quickest way<br class="desktop-break" /> through is sometimes underneath.</p><button class="text-link" @click="openModal('guide')">Read the field guide <span>↗</span></button></article>
      </section>
      <footer class="site-footer"><span><ArcadeIcon name="leaf" :size="14" /> Made for the love of the adventure.</span><span>A tribute to David Crane’s 1982 classic. <span class="footer-divider">/</span> Unofficial fan recreation.</span></footer>
    </main>

    <dialog ref="dialog" class="field-dialog" @close="onDialogClosed" @click="(event) => { if (event.target === dialog) closeModal() }">
      <div v-if="modal" class="dialog-inner"><button class="dialog-close icon-button" aria-label="Close dialog" autofocus @click="closeModal"><ArcadeIcon name="close" /></button><div class="eyebrow">THE EXPLORER’S COMPANION</div><h2>{{ modal === 'guide' ? 'Your field guide.' : 'Leave a trail.' }}</h2>
        <template v-if="modal === 'guide'"><p class="dialog-intro">Find all 32 treasures before your 20 minutes or three lives run out. Each expedition begins with 2,000 points.</p><div class="guide-grid"><article><h3>Leap before you look down.</h3><p>Move with ← → or A / D. Press Space or Z to jump. Jump close to the end of a vine to grab it, then press jump again or ↓ to let go near the far bank.</p></article><article><h3>Take the low road.</h3><p>Use ↑ / ↓ or W / S at a ladder. Underground, every screen takes you three scenes along the surface. Watch for scorpions and dead-end walls.</p></article><article><h3>Respect the residents.</h3><p>Cross on crocodiles’ heads, behind the jaws, or on closed mouths. Snakes, fire, scorpions, swamps, and pits cost a life. Some pits open and close: patience pays.</p></article><article><h3>Protect your fortune.</h3><p>Logs drain points while touching you. Falling through a hole costs 100 points. Walk into treasure to collect it. There are eight of each kind, with 114,000 points for a perfect run.</p></article></div><div class="guide-footnote"><kbd>P</kbd> pause <span>·</span><kbd>M</kbd> sound <span>·</span> Switching tabs pauses the adventure.</div><p class="source-note">Inspired by the <a href="https://www.atariage.com/2600/manuals_old/pitfall.html" target="_blank" rel="noopener noreferrer">original instruction manual ↗</a>. A newly arranged 255-scene jungle with original artwork and sound.</p></template>
        <template v-else><p class="dialog-intro">{{ visited.length }} of 255 scenes explored. Follow the surface one scene at a time, or cover three through an underground passage.</p><div class="map-legend"><span><i class="map-current" /> You are here</span><span><i class="map-visited" /> Explored</span><span><i class="map-treasure" /> Treasure collected</span></div><div class="trail-map"><div v-for="room in game.rooms" :key="room.id" :class="{ explored: visited.includes(room.id), current: room.id === scene, collected: found.includes(room.id) }" :title="`Scene ${room.id + 1}${visited.includes(room.id) ? `: ${room.name}` : ': Unexplored'}${found.includes(room.id) ? ' — treasure collected' : ''}`">{{ room.id + 1 }}</div></div><p class="source-note">The jungle loops back on itself. Your trail resets with each expedition.</p></template>
      </div>
    </dialog>
  </div>
</template>
