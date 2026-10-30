<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { atTentDoor, CAVERN_VIEW, emptyInput, HEIGHT, PitfallEngine, WIDTH, type Chamber, type Input, type Status } from './game/engine'
import { BOARD, JungleRenderer } from './game/renderer'
import type { Mark, Outcome } from './game/tictactoe'
import { JungleAudio, type Track } from './game/audio'

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
const modal = ref<'guide' | 'map' | 'scores' | null>(null)
const visited = ref<number[]>([0])
const found = ref<number[]>([])
const caverns = ref<number[]>([])
const idolsFound = ref<number[]>([])
const chambersSeen = ref<number[]>([])
const relicsTaken = ref<number[]>([])
const currentChamber = ref(-1)
const relics = ref(0)
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
const treasureTypes = [{ kind: 'bag', name: 'Money bag', value: '2,000' }, { kind: 'silver', name: 'Silver bar', value: '3,000' }, { kind: 'gold', name: 'Gold bar', value: '4,000' }, { kind: 'ring', name: 'Diamond ring', value: '5,000' }, { kind: 'emerald', name: 'Emerald', value: '3,000' }, { kind: 'mask', name: 'Jade mask', value: '5,000' }, { kind: 'idol', name: 'Golden idol', value: '6,000' }, { kind: 'skull', name: 'Crystal skull', value: '10,000' }] as const
// Relics are bonus loot from the cavern chambers, one in each, listed after the 32 treasures.
const relicTotal = game.chambers.length
const relicText = (count: number) => count ? ` · ${count} cavern ${count === 1 ? 'relic' : 'relics'}` : ''
const relicNames = { idol: 'a golden idol', emerald: 'an emerald', mask: 'a jade mask', skull: 'the crystal skull' } as const
// What to look out for in a cavern chamber, and the ways on from it.
function cavernHint(c: Chamber, x: number) {
  const taken = game.relics.has(c.id)
  if (c.down.some(l => Math.abs(x - l) < 40)) return c.depth ? 'This ladder goes deeper still. Press ↓ to climb down.' : 'A ladder leads down into the lost caverns. Press ↓ to climb down.'
  if (!c.depth) return taken ? 'The idol is yours. Climb ↑ to the tunnel, or take the ladder on the middle ledge down.' : 'Find the golden idol. Mind the electric eels and the bottomless chasm.'
  if (c.ladders.some(l => Math.abs(x - l) < 40)) return 'This ladder climbs back toward the surface. Press ↑ to climb up.'
  const watch = c.bats.length ? 'Bats swoop low mid-flight: run under one as it swings away.' : c.rats.length ? 'Jump the cave rats as they scurry past.' : c.rivers.some(r => r.eels) ? 'Dive under the eels, and watch your air.' : 'Jump from stone to stone; the gaps have no bottom.'
  return taken ? `The relic is yours; the caverns run on east and west. ${watch}` : `Somewhere here lies ${relicNames[c.relic.kind]}. ${watch}`
}
const keyActions: Record<string, keyof Input> = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', Space: 'jump', KeyZ: 'jump' }

const { boards: leaderboards, failed: leaderboardFailed, refresh: refreshLeaderboards, recordGame, submit: submitScore, savedInitials } = useLeaderboard()
const scoreTabs = [
  { id: 'weekly', label: 'This week', about: 'The ten best expeditions since Monday. The board resets every Monday at 00:00 UTC.' },
  { id: 'allTime', label: 'All time', about: 'The ten best expeditions from explorers everywhere.' },
] as const
const scoreTab = ref<LeaderboardName>('weekly')
const globalScores = computed(() => leaderboards.value?.[scoreTab.value] ?? [])
const formatDate = (time: number) => new Date(time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
// Boards the last expedition qualified for, and where it placed once the initials were saved.
const qualified = ref<LeaderboardName[]>([])
const placed = ref<LeaderboardRanks | null>(null)
const initials = ref('')
const initialsInput = ref<HTMLInputElement | null>(null)
const savingScore = ref(false)
const saveError = ref('')
const placedText = computed(() => [placed.value?.weekly && `#${placed.value.weekly} this week`, placed.value?.allTime && `#${placed.value.allTime} all time`].filter(Boolean).join(' · '))
function onInitials(event: Event) {
  const field = event.target as HTMLInputElement
  initials.value = field.value = field.value.replace(/[^a-z]/gi, '').toUpperCase().slice(0, 3)
}
async function saveScore() {
  if (initials.value.length !== 3) { saveError.value = 'Enter three letters.'; return }
  savingScore.value = true; saveError.value = ''
  try {
    placed.value = await submitScore({ initials: initials.value, score: game.score, detail: (game.status === 'won' ? 'All 32 treasures' : `${game.treasureCount} of 32 treasures`) + relicText(game.relics.size) }, qualified.value)
  } catch (error: any) {
    saveError.value = error?.data?.statusMessage || 'Couldn’t reach the leaderboard. Try again.'
  } finally { savingScore.value = false }
}
function skipScore() { qualified.value = []; focusGame() }
function finishExpedition() {
  const finalScore = game.score
  void recordGame(finalScore).then(async (names) => {
    // Ignore the result if a new expedition has already started.
    if (!ended.value || game.score !== finalScore) return
    qualified.value = names
    if (!names.length) return
    initials.value ||= savedInitials()
    await nextTick(); initialsInput.value?.focus({ preventScroll: true })
  })
}

function sync() {
  if ((game.status === 'over' || game.status === 'won') && status.value !== game.status) finishExpedition()
  status.value = game.status; score.value = game.score; remaining.value = game.remaining
  lives.value = game.lives; treasures.value = game.treasureCount; scene.value = game.roomIndex; relics.value = game.relics.size
  const p = game.player, cave = game.cavern()
  sceneName.value = game.status === 'ready' ? 'Base camp' : game.status === 'tent' ? 'Harry’s tent' : p.layer === 'cavern' ? cave!.name : game.room.name
  const t = game.tent
  board.value = [...t.board]; outcome.value = t.outcome; tally.value = { wins: t.wins, losses: t.losses, draws: t.draws }
  message.value = game.status === 'ready' ? 'Your next great adventure starts here.'
    : game.status === 'tent' ? (t.outcome === 'X' ? 'Three in a row! You beat the jungle.' : t.outcome === 'O' ? 'The jungle wins this one.' : t.outcome === 'draw' ? 'A draw. Nobody wins.' : t.turn === 'X' ? 'Your move: pick a square. Esc to leave the tent.' : 'The jungle is thinking…')
    : game.messageTime > 0 ? game.message : atTentDoor(game.roomIndex, p) ? 'Press ↑ to step inside the tent.'
    : p.swimming ? '↑ swims up, ↓ dives. Watch your air, and swim into a bank at the surface to climb out.'
    : p.layer === 'cavern' ? cavernHint(cave!, p.x)
    : p.layer === 'tunnel' && cave?.ladders.some(x => Math.abs(p.x - x) < 40) ? 'A shaft drops into a deep cavern. Press ↓ to climb down.'
    : p.layer === 'tunnel' && game.room.tunnelPit !== null && Math.abs(p.x - game.room.tunnelPit) < 110 ? 'A pit in the tunnel floor, and no bottom to it. Jump across.'
    : p.layer === 'tunnel' ? 'Underground passages take you three scenes at a time.'
    : game.room.cavern && !game.cavernsFound.has(game.roomIndex) ? 'Water echoes far below. Go down the ladder three scenes east, then walk one tunnel screen west.'
    : game.room.vine ? 'Jump toward the vine to grab it. Jump or ↓ to release.' : 'Keep exploring. Fortune favors the adventurous.'
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
function start() { qualified.value = []; placed.value = null; saveError.value = ''; clearInput(); sound.unlock(); game.start(); previousTime = 0; sync(); canvas.value?.focus({ preventScroll: true }) }
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
  else if (event.code === 'KeyF' && !event.repeat) void toggleFullscreen()
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
async function openModal(type: 'guide' | 'map' | 'scores') {
  if (type === 'scores') void refreshLeaderboards()
  returnFocus = document.activeElement as HTMLElement
  resumeAfterDialog = game.status === 'playing'
  game.pause(); clearInput(); sync()
  visited.value = [...game.visited]; found.value = [...game.collected]
  caverns.value = [...game.cavernsFound]; idolsFound.value = game.cavernScenes.filter((_, column) => game.relics.has(column))
  chambersSeen.value = [...game.chambersFound]; relicsTaken.value = [...game.relics]
  currentChamber.value = game.player.layer === 'cavern' ? game.cavern()!.id : -1
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
  // Typing initials shouldn't move Harry or toggle pause and sound.
  if (target.isContentEditable || target.closest('input, select, textarea')) return
  if (target.closest('button, a') && (event.code === 'Space' || event.code === 'Enter')) return
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
  if (!event.repeat && event.code === 'KeyF') void toggleFullscreen()
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
// The jungle tune plays above ground and in the tent; the cavern one once the view is mostly below the
// tunnel floor. Music stops while the expedition is paused, over, or yet to start.
function musicTrack(): Track | null {
  if (game.status === 'tent') return 'jungle'
  if (game.status !== 'playing') return null
  return game.viewY() > CAVERN_VIEW / 2 ? 'cavern' : 'jungle'
}
function animate(timestamp: number) {
  const delta = previousTime ? (timestamp - previousTime) / 1000 : 0
  previousTime = timestamp
  game.update(delta, input)
  for (const event of game.events.splice(0)) sound.play(event)
  sound.music(musicTrack())
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
    <main>
      <section class="hero" aria-labelledby="page-title">
        <div class="hero-title">
          <div class="eyebrow"><span class="edition-line" /> EST. 1982 <span class="eyebrow-slash">/</span> REIMAGINED</div>
          <h1 id="page-title">NEO<span>/</span>PITFALL<svg class="title-leaf" viewBox="0 0 58 60" fill="none" aria-hidden="true"><path d="M9 54C20 36 25 15 50 6 56 34 41 49 20 45" fill="#71804c" /><path d="M9 55 44 16M24 39l-2-16m11 5 13-1" stroke="#f3f0e7" stroke-width="2" /></svg></h1>
          <p class="hero-subtitle">The jungle is calling.</p>
        </div>        
        <nav class="header-links" aria-label="Main navigation"><button class="guide-link" @click="openModal('scores')"><ArcadeIcon name="trophy" :size="17" /> High scores</button><button class="guide-link" @click="openModal('guide')"><ArcadeIcon name="book" :size="17" /> Field guide <span>↗</span></button></nav>
      </section>

      <div class="play-area">
        <section ref="cabinet" class="game-cabinet" aria-label="Pitfall jungle adventure">
          <div class="game-toolbar">
            <div class="expedition-label"><span class="status-dot" /><span>THE EXPEDITION</span><span class="session-label">{{ status === 'ready' ? 'READY WHEN YOU ARE' : paused ? 'TAKING A BREATHER' : inTent ? 'RESTING IN CAMP' : ended ? 'EXPEDITION COMPLETE' : 'IN PROGRESS' }}</span></div>
            <div class="toolbar-actions">
              <button class="icon-button" :aria-label="muted ? 'Enable sound' : 'Mute sound'" :aria-pressed="muted" :title="muted ? 'Enable sound (M)' : 'Mute sound (M)'" @click="toggleSound"><ArcadeIcon :name="muted ? 'mute' : 'sound'" :size="18" /></button>
              <button class="icon-button fullscreen-button" aria-label="Toggle fullscreen" aria-keyshortcuts="F" title="Fullscreen (F)" @click="toggleFullscreen"><ArcadeIcon name="expand" :size="18" /></button>
            </div>
          </div>

          <div class="scoreboard">
            <div class="score-item main-score"><span class="score-label">SCORE</span><strong>{{ score.toString().padStart(6, '0') }}</strong></div>
            <div class="score-item best-score"><span class="score-label">PERSONAL BEST</span><strong>{{ best.toString().padStart(6, '0') }}</strong></div>
            <div class="score-item time-score" :class="{ urgent: remaining < 60 }"><span class="score-label"><ArcadeIcon name="clock" :size="11" /> TIME LEFT</span><strong>{{ clock }}</strong></div>
            <div class="score-item treasure-score"><span class="score-label">TREASURES<span v-if="relics" class="relic-tally" :title="`${relics} cavern ${relics === 1 ? 'relic' : 'relics'}`">+{{ relics }}<span class="relic-word"> {{ relics === 1 ? 'RELIC' : 'RELICS' }}</span></span></span><strong>{{ treasures.toString().padStart(2, '0') }} <small>/ 32</small></strong></div>
            <div class="score-item relic-score"><span class="score-label">RELICS</span><strong>{{ relics }} <small>/ {{ relicTotal }}</small></strong></div>
            <div class="score-item lives-score"><span class="score-label">LIVES</span><span class="hearts"><ArcadeIcon v-for="n in 3" :key="n" name="heart" :size="18" :class="{ lost: n > lives }" /></span></div>
          </div>

          <div class="canvas-stage">
            <canvas ref="canvas" width="960" height="480" tabindex="0" aria-label="Pitfall game. Move with arrow keys or WASD. Space to jump, up and down to climb or swim. P to pause." />
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
            <div v-else-if="ended" class="pause-overlay"><div class="pause-card" :class="{ signing: qualified.length && !placed }"><ArcadeIcon :name="qualified.length ? 'trophy' : status === 'won' ? 'flag' : 'compass'" :size="35" /><span class="eyebrow">{{ qualified.includes('allTime') ? 'ALL-TIME TOP 10' : qualified.length ? 'THIS WEEK’S TOP 10' : status === 'won' ? 'EVERY TREASURE. ONE LEGEND.' : 'UNTIL THE NEXT ADVENTURE' }}</span><h2>{{ qualified.length ? 'You made the board.' : status === 'won' ? 'A jungle legend.' : 'What a journey.' }}</h2><p>{{ treasures }} of 32 treasures found{{ relicText(relics) }} ·{{ score.toLocaleString() }} points</p>
              <form v-if="qualified.length && !placed" class="initials-form" @submit.prevent="saveScore"><label for="initials">Sign the expedition log</label><div class="initials-row"><input id="initials" ref="initialsInput" :value="initials" maxlength="3" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-describedby="initials-hint" @input="onInitials" /><button class="start-button" :disabled="savingScore">{{ savingScore ? 'Saving…' : 'Sign it' }} <ArcadeIcon name="arrow" :size="15" /></button></div><span id="initials-hint" class="initials-hint">Three letters</span><p v-if="saveError" class="initials-error" role="alert">{{ saveError }}</p><button type="button" class="quiet-button" @click="skipScore">Skip</button></form>
              <template v-else><p v-if="placed" class="placed-ranks">{{ placedText || 'Score saved' }}</p><button class="start-button" @click="start">Explore again <ArcadeIcon name="restart" :size="17" /></button></template></div></div>
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
      </div>
      <div class="hero-description"><p>A little courage, a well-timed leap, a whole jungle of possibilities.</p><div class="expedition-tag"><ArcadeIcon name="flag" :size="15" /> 32 TREASURES <span>·</span> 20 MINUTES <span>·</span> 3 LIVES</div></div>
      <NeoGamesBanner class="collection-section" />
      <footer class="site-footer"><span><ArcadeIcon name="leaf" :size="14" /> Made for the love of the adventure.</span><span>A tribute to David Crane’s 1982 classic. <span class="footer-divider">/</span> Unofficial fan recreation.</span></footer>
    </main>

    <dialog ref="dialog" class="field-dialog" @close="onDialogClosed" @click="(event) => { if (event.target === dialog) closeModal() }">
      <div v-if="modal" class="dialog-inner"><button class="dialog-close icon-button" aria-label="Close dialog" autofocus @click="closeModal"><ArcadeIcon name="close" /></button><div class="eyebrow">{{ modal === 'scores' ? 'THE EXPEDITION LOG' : 'THE EXPLORER’S COMPANION' }}</div><h2>{{ modal === 'guide' ? 'Your field guide.' : modal === 'scores' ? 'Legends of the jungle.' : 'Leave a trail.' }}</h2>
        <template v-if="modal === 'scores'"><div class="score-tabs" role="group" aria-label="Leaderboard"><button v-for="tab in scoreTabs" :key="tab.id" :class="{ selected: scoreTab === tab.id }" :aria-pressed="scoreTab === tab.id" @click="scoreTab = tab.id">{{ tab.label }}</button></div><p class="dialog-intro">{{ scoreTabs.find(tab => tab.id === scoreTab)?.about }}</p>
          <div v-if="!leaderboards" class="empty-scores"><ArcadeIcon name="trophy" :size="30" /><h3>{{ leaderboardFailed ? 'Lost in the jungle.' : 'Checking the log…' }}</h3><p>{{ leaderboardFailed ? 'We couldn’t reach the leaderboard. Try again in a moment.' : 'Fetching the latest scores.' }}</p></div>
          <div v-else-if="!globalScores.length" class="empty-scores"><ArcadeIcon name="trophy" :size="30" /><h3>The trail is wide open.</h3><p>Head into the jungle and claim the top spot.</p></div>
          <ol v-else class="score-list"><li v-for="(entry, index) in globalScores" :key="`${entry.at}-${entry.initials}`"><span class="rank">{{ String(index + 1).padStart(2, '0') }}</span><span class="initials">{{ entry.initials }}</span><div><strong>{{ entry.score.toString().padStart(6, '0') }}</strong><small>{{ entry.detail }}</small></div><span class="score-date">{{ formatDate(entry.at) }}</span></li></ol>
          <p class="source-note">Your personal best on this device: <strong>{{ best.toString().padStart(6, '0') }}</strong></p></template>
        <template v-else-if="modal === 'guide'"><p class="dialog-intro">Find all 32 treasures before your 20 minutes or three lives run out. Each expedition begins with 2,000 points.</p><div class="guide-grid"><article><h3>Leap before you look down.</h3><p>Move with ← → or A / D. Press Space or Z to jump. Jump close to the end of a vine to grab it, then press jump again or ↓ to let go near the far bank.</p></article><article><h3>Take the low road.</h3><p>Use ↑ / ↓ or W / S at a ladder. Underground, every screen takes you three scenes along the surface. Watch for scorpions, dead-end walls, and bottomless pits in the floor.</p></article><article><h3>Respect the residents.</h3><p>Cross on crocodiles’ heads, behind the jaws, or on closed mouths. Snakes, fire, scorpions, swamps, and pits cost a life. Some pits open and close: patience pays.</p></article><article><h3>Protect your fortune.</h3><p>Logs drain points while touching you. Falling through a hole costs 100 points. Walk into treasure to collect it. There are eight of each kind, with 114,000 points for a perfect run.</p></article><article class="wide-article"><h3>Go deeper.</h3><p>Some tunnels hide a ladder shaft down to a deep cavern, always one tunnel screen west of a ladder three scenes east, each with a golden idol worth 6,000 bonus points. In the river, ↑ / ↓ swim up and down, and Harry drifts up when left alone. The bubbles above him are his air: surface before they run out. Dive under the electric eels, then swim into a bank at the surface (or jump) to climb out. Jump the bottomless chasm by way of its stone pillar.</p></article><article class="wide-article"><h3>Find the lost caverns.</h3><p>A ladder on each deep cavern’s middle ledge leads further down, to two levels of lost caverns that run east and west beneath the whole jungle, joined by ladders. Bats swoop low through the middle of their flight but fly high at either end; cave rats can be jumped; lakes and pools hide more eels. Every chamber holds a relic: an emerald (3,000) on the first level, a jade mask (5,000) on the second, and somewhere down there, the crystal skull (10,000). After a fall, Harry starts again where he came into the chamber.</p></article></div><div class="guide-footnote"><kbd>P</kbd> pause <span>·</span><kbd>M</kbd> sound and music <span>·</span><kbd>F</kbd> fullscreen <span>·</span> Switching tabs pauses the adventure.</div><p class="source-note">Inspired by the <a href="https://www.atariage.com/2600/manuals_old/pitfall.html" target="_blank" rel="noopener noreferrer">original instruction manual ↗</a>. A newly arranged 255-scene jungle with original artwork and sound.</p></template>
        <template v-else-if="modal === 'map'"><p class="dialog-intro">{{ visited.length }} of 255 scenes explored. Follow the surface one scene at a time, or cover three through an underground passage.</p><div class="map-legend"><span><i class="map-current" /> You are here</span><span><i class="map-visited" /> Explored</span><span><i class="map-treasure" /> Treasure collected</span><span><i class="map-cavern" /> Cavern found</span><span><i class="map-idol" /> Idol taken</span></div><div class="trail-map"><div v-for="room in game.rooms" :key="room.id" :class="{ explored: visited.includes(room.id), current: room.id === scene, collected: found.includes(room.id), cavern: caverns.includes(room.id), idol: idolsFound.includes(room.id) }" :title="`Scene ${room.id + 1}${visited.includes(room.id) ? `: ${room.name}` : ': Unexplored'}${found.includes(room.id) ? ' — treasure collected' : ''}${idolsFound.includes(room.id) ? ' — idol taken' : caverns.includes(room.id) ? ' — cavern found' : ''}`">{{ room.id + 1 }}</div></div>
          <h3 class="map-heading">Below the jungle</h3><p class="dialog-intro">{{ chambersSeen.length }} of {{ game.chambers.length }} cavern chambers found. The deep caverns sit under the tunnels along the top row; the lost caverns lie below them, running east and west.</p><div class="map-legend"><span><i class="map-current" /> You are here</span><span><i class="map-chamber" /> Chamber found</span><span><i class="map-relic" /> Relic taken</span></div><div class="cavern-map"><div v-for="c in game.chambers" :key="c.id" :class="{ explored: chambersSeen.includes(c.id), current: c.id === currentChamber, relic: relicsTaken.includes(c.id) }" :title="chambersSeen.includes(c.id) ? `${c.name}, ${c.depth ? `lost caverns level ${c.depth}` : `below scene ${game.cavernScenes[c.column]! + 1}`}${relicsTaken.includes(c.id) ? ' — relic taken' : ''}` : 'Unexplored'">{{ chambersSeen.includes(c.id) ? c.name : '' }}</div></div>
          <p class="source-note">The jungle loops back on itself, and so do the caverns. Your trail resets with each expedition.</p></template>
      </div>
    </dialog>
  </div>
</template>
