import test from 'node:test'
import assert from 'node:assert/strict'
import { CAMP_EDGE_X, CAMP_TUNNEL_EDGE_X, TENT_DOOR_X, createWorld, emptyInput, GROUND, HAZARD_REACH, LANDING_WIDTH, PIT_HALF_WIDTH, TUNNEL_TOP, UNDERGROUND, WIDTH, PitfallEngine, TREASURE_VALUES } from '../app/game/engine.ts'
import { COMPUTER_DELAY, TicTacToe } from '../app/game/tictactoe.ts'

function running() { const game = new PitfallEngine(); game.start(); game.player.invulnerable = 0; return game }
function advance(game, seconds, keys = {}) {
  const input = { ...emptyInput(), ...keys }
  for (let t = 0; t < seconds - 0.000001; t += 1 / 120) game.update(Math.min(1 / 120, seconds - t), input)
}
function roomOf(game, predicate) { game.roomIndex = game.rooms.findIndex(predicate); return game.room }

test('world is deterministic, circular, and has 255 unique nonzero seeds', () => {
  const rooms = createWorld()
  assert.equal(rooms.length, 255)
  assert.equal(new Set(rooms.map(r => r.seed)).size, 255)
  assert.ok(rooms.every(r => r.seed > 0))
  assert.deepEqual(rooms, createWorld())
})
test('exactly eight of each treasure total 112,000 bonus points', () => {
  const treasures = createWorld().filter(r => r.treasure)
  assert.equal(treasures.length, 32)
  for (const type of Object.keys(TREASURE_VALUES)) assert.equal(treasures.filter(r => r.treasure === type).length, 8)
  assert.equal(treasures.reduce((sum, room) => sum + TREASURE_VALUES[room.treasure], 0), 112000)
})
test('starts with original score, time and lives; ready and pause do not run the clock', () => {
  const game = new PitfallEngine()
  advance(game, 1, { right: true }); assert.equal(game.elapsed, 0)
  game.start(); assert.equal(game.score, 2000); assert.equal(game.lives, 3); assert.equal(game.remaining, 1200)
  advance(game, 1); assert.ok(Math.abs(game.remaining - 1199) < 1e-8)
  game.pause(); const x = game.player.x
  advance(game, 1, { right: true }); assert.equal(game.player.x, x); assert.ok(Math.abs(game.remaining - 1199) < 1e-8)
  game.resume(); advance(game, 1); assert.ok(Math.abs(game.remaining - 1198) < 1e-8)
})
test('surface screen transitions move one scene and wrap in either direction', () => {
  const game = running(); game.player.x = WIDTH + 9
  advance(game, 0.02, { right: true }); assert.equal(game.roomIndex, 1)
  game.player.x = -9; advance(game, 0.02, { left: true }); assert.equal(game.roomIndex, 0)
  game.roomIndex = 254; game.player.x = WIDTH + 9; advance(game, 0.02, { right: true })
  assert.equal(game.roomIndex, 0); assert.ok(game.player.x >= CAMP_EDGE_X && game.player.x < CAMP_EDGE_X + 5)
})
test('Harry cannot walk left past base camp into scene 255, above or below ground', () => {
  const game = running(); advance(game, 2, { left: true })
  assert.equal(game.roomIndex, 0); assert.equal(game.player.x, CAMP_EDGE_X)
  game.player.layer = 'tunnel'; game.player.y = UNDERGROUND; advance(game, 2, { left: true })
  assert.equal(game.roomIndex, 0); assert.equal(game.player.x, CAMP_TUNNEL_EDGE_X)
})
test('underground travel skips exactly three scenes and wraps', () => {
  const game = running(); game.player.layer = 'tunnel'; game.player.y = UNDERGROUND; game.player.x = WIDTH + 9
  advance(game, 0.02, { right: true }); assert.equal(game.roomIndex, 3)
  game.roomIndex = 2; game.player.x = -9
  advance(game, 0.02, { left: true }); assert.equal(game.roomIndex, 254)
})
test('a jump has an arc, clears obstacles, lands, and never auto-repeats', () => {
  const game = running()
  advance(game, 0.3, { jump: true }); assert.ok(game.player.y < GROUND - 85)
  advance(game, 0.65, { jump: true }); assert.equal(game.player.y, GROUND); assert.ok(game.player.grounded)
  advance(game, 0.1); advance(game, 0.1, { jump: true }); assert.ok(game.player.y < GROUND)
})
test('ladder descent and ascent are safe and do not cost points', () => {
  const game = running(); game.player.x = 480
  advance(game, 1, { down: true }); assert.equal(game.player.layer, 'tunnel'); assert.equal(game.player.y, UNDERGROUND)
  advance(game, 1, { up: true }); assert.equal(game.player.layer, 'surface'); assert.equal(game.player.y, GROUND)
  assert.equal(game.score, 2000)
})
test('falling through a hole loses 100 points once and lands in the tunnel', () => {
  const game = running(); roomOf(game, r => r.holes); game.player.x = 270
  advance(game, 0.75); assert.equal(game.score, 1900); assert.equal(game.player.layer, 'tunnel'); assert.equal(game.player.y, UNDERGROUND); assert.equal(game.lives, 3)
})
test('logs drain score without killing Harry; jumping over a log is safe', () => {
  const game = running(); game.player.x = game.logs()[0]
  advance(game, 0.15); assert.ok(game.score < 2000); assert.equal(game.lives, 3)
  const jumping = running(); jumping.player.x = jumping.logs()[0] - 70
  advance(jumping, 0.35, { right: true, jump: true }); assert.equal(jumping.score, 2000)
})
test('a rolling log blocks Harry from walking through it but lets him back away', () => {
  const game = running(); const log = game.logs()[0]; game.player.x = log - 20
  const events = []
  for (let i = 0; i < 12; i++) { const x = game.player.x; advance(game, 1 / 120, { right: true }); assert.ok(game.player.x <= x); events.push(...game.events.splice(0)) }
  assert.ok(events.includes('log'))
  const backing = running(); backing.player.x = backing.logs()[0] - 20
  const start = backing.player.x; advance(backing, 0.05, { left: true }); assert.ok(backing.player.x < start - 5)
})
test('logs restart from their starting spots in each new scene', () => {
  const game = running(); roomOf(game, r => r.logs > 0 && game.rooms[(r.id + 1) % 255].logs > 0)
  const fresh = running(); fresh.roomIndex = game.roomIndex + 1; const start = fresh.logs()
  advance(game, 1.3); assert.notDeepEqual(game.logs().slice(0, start.length), start)
  game.player.x = WIDTH + 9; advance(game, 1 / 120, { right: true })
  assert.equal(game.roomIndex, fresh.roomIndex); assert.deepEqual(game.logs(), start)
})
test('scorpions face the direction they are walking', () => {
  const game = running(); roomOf(game, r => !r.ladder)
  for (let t = 0; t < 8; t += 0.1) {
    game.elapsed = t; const x = game.scorpionX(); const facing = game.scorpionFacing()
    game.elapsed = t + 0.01; const moved = game.scorpionX() - x
    if (Math.abs(moved) > 0.05) assert.equal(Math.sign(moved), facing)
  }
})
test('fire and snakes cost a life but never deduct treasure points', () => {
  for (const hazard of ['fire', 'snake']) {
    const game = running(); roomOf(game, r => r.hazard === hazard); game.player.x = game.room.hazardX
    advance(game, 0.05); assert.equal(game.lives, 2); assert.equal(game.score, 2000)
    advance(game, 1.4); assert.equal(game.lives, 2); assert.ok(game.player.x < 200); assert.ok(game.player.invulnerable > 0)
  }
})
test('a fatal pit starts exactly one death, and the third death ends play', () => {
  const game = running(); roomOf(game, r => r.pit === 'tar' && !r.shifting); game.player.x = 480
  advance(game, 0.3); assert.equal(game.lives, 2)
  advance(game, 0.4); assert.equal(game.lives, 2)
  game.deathTimer = 0; game.lives = 1; game.player.invulnerable = 0
  game.die('last life'); advance(game, 1.4); assert.equal(game.status, 'over')
})
test('treasure is collectible exactly once, including on revisits', () => {
  const game = running(); const room = roomOf(game, r => r.treasure === 'gold'); game.player.x = 480
  advance(game, 0.1); assert.equal(game.score, 6000); assert.equal(game.treasureCount, 1)
  advance(game, 0.1); game.roomIndex = 0; game.roomIndex = room.id; advance(game, 0.1)
  assert.equal(game.score, 6000); assert.equal(game.treasureCount, 1)
})
test('collecting all treasures ends a perfect run at 114,000 points', () => {
  const game = running()
  for (const room of game.rooms.filter(r => r.treasure)) {
    game.roomIndex = room.id; game.player.x = 480; advance(game, 0.01)
  }
  assert.equal(game.score, 114000); assert.equal(game.treasureCount, 32); assert.equal(game.status, 'won')
})
test('vine grabs at the hand position and releases with momentum and cooldown', () => {
  const game = running(); roomOf(game, r => r.vine)
  const vine = game.vine(); game.player.x = vine.x; game.player.y = vine.y + 35
  game.player.grounded = false; game.player.vy = -10
  advance(game, 0.01); assert.equal(game.player.swinging, true)
  advance(game, 0.25); advance(game, 0.01, { down: true, right: true })
  assert.equal(game.player.swinging, false); assert.ok(game.player.grabCooldown > 0); assert.ok(game.player.vy < 0)
})
test('closed crocodile mouths support Harry; open jaws kill but the head behind them stays safe', () => {
  const game = running(); roomOf(game, r => r.pit === 'water')
  for (let t = 0; t < 5; t += 0.01) { game.elapsed = t; if (!game.crocodiles()[0].open) break }
  game.player.x = 369; advance(game, 0.01); assert.equal(game.lives, 3); assert.ok(game.player.grounded)
  for (let t = 0; t < 5; t += 0.01) { game.elapsed = t; if (Math.sin(t * 1.8 + game.room.seed) > 0.9) break }
  game.player.x = 390; advance(game, 0.01); assert.equal(game.lives, 3)
  game.player.x = 369; advance(game, 0.01); assert.equal(game.lives, 2)
})
test('the vine swing stays nearly level and keeps Harry well above the pit', () => {
  const game = running(); roomOf(game, r => r.vine)
  let lowest = -Infinity, highest = Infinity, left = Infinity, right = -Infinity
  for (let t = 0; t < 4.8; t += 0.01) {
    const end = game.vine(t); const feet = end.y + 35
    lowest = Math.max(lowest, feet); highest = Math.min(highest, feet); left = Math.min(left, end.x); right = Math.max(right, end.x)
  }
  assert.ok(lowest <= GROUND - 38, `feet dip to ${lowest}`)
  assert.ok(lowest - highest <= 32, `arc rises ${lowest - highest}px`)
  assert.ok(left < 480 - PIT_HALF_WIDTH && right > 480 + PIT_HALF_WIDTH)
})
test('shifting pits fully close and reopen', () => {
  const game = running(); roomOf(game, r => r.shifting)
  const widths = []
  for (let t = 0; t < 7; t += 0.1) { game.elapsed = t; const pit = game.pitBounds(); widths.push(pit ? pit.right - pit.left : 0) }
  assert.ok(widths.includes(0)); assert.ok(widths.includes(290))
})
test('tunnel scorpions are lethal, jumps respect the ceiling, walls block both directions', () => {
  const game = running(); roomOf(game, r => !r.ladder)
  game.player.layer = 'tunnel'; game.player.y = UNDERGROUND; game.player.x = game.scorpionX()
  advance(game, 0.01); assert.equal(game.lives, 2)
  const safe = running(); safe.player.layer = 'tunnel'; safe.player.y = UNDERGROUND
  advance(safe, 0.06, { jump: true }); assert.ok(safe.player.y >= TUNNEL_TOP + 44)
  roomOf(safe, r => r.wall); safe.player.x = 676; advance(safe, 0.3, { right: true }); assert.equal(safe.player.x, 678)
  safe.player.x = 723; advance(safe, 0.3, { left: true }); assert.equal(safe.player.x, 720)
})
test('the tunnel is tall enough to jump clean over a scorpion', () => {
  const game = running(); roomOf(game, r => !r.ladder)
  game.scorpionX = () => 480
  game.player.layer = 'tunnel'; game.player.y = UNDERGROUND; game.player.x = 400
  for (let i = 0; i < 120; i++) game.update(1 / 120, { ...emptyInput(), right: true, jump: game.player.x >= 480 - 26 - 12 })
  assert.equal(game.lives, 3); assert.ok(game.player.x > 480 + 26)
})
test('snakes guard many more scenes, some leaving a narrow strip to land on past a pit', () => {
  const world = createWorld()
  assert.ok(world.filter(r => r.hazard === 'snake').length >= 60)
  const guarded = world.filter(r => r.pit && r.hazard === 'snake')
  assert.ok(guarded.some(r => r.hazardX > 480) && guarded.some(r => r.hazardX < 480))
  for (const r of guarded) {
    assert.ok(!r.shifting)
    const gap = Math.abs(r.hazardX - 480) - HAZARD_REACH - PIT_HALF_WIDTH
    assert.ok(gap > 20 && gap <= LANDING_WIDTH + 4, `scene ${r.id} strip is ${gap}px`)
  }
  const game = running(); roomOf(game, r => r.pit && r.hazard === 'snake' && r.hazardX > 480)
  game.player.x = 480 + PIT_HALF_WIDTH + 4 + LANDING_WIDTH / 2
  advance(game, 0.1); assert.equal(game.lives, 3); assert.ok(game.player.grounded)
  advance(game, 0.8, { right: true, jump: true }); assert.equal(game.lives, 3); assert.ok(game.player.x > game.room.hazardX + HAZARD_REACH)
})
test('time expiration ends the run and restart resets all expedition state', () => {
  const game = running(); game.remaining = 0.01; advance(game, 0.02); assert.equal(game.status, 'over')
  game.collected.add(18); game.visited.add(18); game.lives = 1; game.roomIndex = 18
  game.start(); assert.equal(game.remaining, 1200); assert.equal(game.lives, 3); assert.equal(game.score, 2000); assert.equal(game.treasureCount, 0); assert.equal(game.roomIndex, 0); assert.deepEqual([...game.visited], [0])
})
test('movement is consistent across update rates', () => {
  const slow = running(), fast = running()
  for (let i = 0; i < 30; i++) slow.update(1 / 30, { ...emptyInput(), right: true })
  for (let i = 0; i < 120; i++) fast.update(1 / 120, { ...emptyInput(), right: true })
  assert.ok(Math.abs(slow.player.x - fast.player.x) < 0.01)
  assert.ok(Math.abs(slow.remaining - fast.remaining) < 1e-8)
})
test('the twenty-minute clock keeps real time even when a frame stalls', () => {
  const game = running(); game.update(3, emptyInput())
  assert.equal(game.remaining, 1197)
  assert.ok(game.elapsed <= 0.101)
})
test('a running jump can grab, swing and land across a tar pit in either direction', () => {
  for (const direction of [-1, 1]) {
    const game = running(); roomOf(game, r => r.pit === 'tar' && !r.shifting)
    game.player.x = direction > 0 ? 310 : 650
    let caught = false, released = false, landed = false
    for (let i = 0; i < 900; i++) {
      const vine = game.vine()
      const release = caught && !released && (direction > 0 ? vine.x > 617 && vine.vx > 0 : vine.x < 343 && vine.vx < 0)
      if (release) released = true
      game.update(1 / 120, { ...emptyInput(), right: direction > 0, left: direction < 0, jump: i === 0 || release })
      if (game.player.swinging) caught = true
      if (released && game.player.grounded && (direction > 0 ? game.player.x > 640 : game.player.x < 320)) { landed = true; break }
    }
    assert.equal(caught, true); assert.equal(released, true); assert.equal(landed, true); assert.equal(game.lives, 3)
  }
})
test('Harry can walk through camp to the pennant, step into the tent with up, and back out', () => {
  const game = running(); advance(game, 3, { left: true }); assert.equal(game.player.x, CAMP_EDGE_X)
  game.player.x = TENT_DOOR_X; advance(game, 0.05, { up: true })
  assert.equal(game.status, 'tent'); assert.ok(game.events.includes('tent'))
  // The expedition clock and the jungle stand still while Harry is inside.
  const remaining = game.remaining, elapsed = game.elapsed
  advance(game, 2, { up: true, left: true }); assert.equal(game.remaining, remaining); assert.equal(game.elapsed, elapsed)
  game.leaveTent(); assert.equal(game.status, 'playing')
  // Still holding up doesn't send him straight back in; a fresh press does.
  advance(game, 0.05, { up: true }); assert.equal(game.status, 'playing')
  advance(game, 0.02); advance(game, 0.02, { up: true }); assert.equal(game.status, 'tent')
})
test('the tent is only entered from its doorway in base camp', () => {
  const game = running(); game.player.x = TENT_DOOR_X + 40; advance(game, 0.05, { up: true }); assert.equal(game.status, 'playing')
  game.roomIndex = 1; game.player.x = TENT_DOOR_X; advance(game, 0.02); advance(game, 0.05, { up: true }); assert.equal(game.status, 'playing')
})
test('tic-tac-toe: Harry moves first, the computer takes a random open square, and wins are tallied', () => {
  const ttt = new TicTacToe(() => 0)
  assert.equal(ttt.turn, 'X'); assert.ok(ttt.play(4)); assert.equal(ttt.play(0), false)
  ttt.update(COMPUTER_DELAY / 2); assert.equal(ttt.board.filter(Boolean).length, 1)
  ttt.update(COMPUTER_DELAY); assert.equal(ttt.board[0], 'O'); assert.equal(ttt.turn, 'X')
  assert.equal(ttt.play(0), false)
  ttt.play(3); ttt.update(1) // O takes 1, the lowest open square
  ttt.play(5); assert.equal(ttt.outcome, 'X'); assert.deepEqual(ttt.line, [3, 4, 5]); assert.equal(ttt.wins, 1)
  assert.equal(ttt.play(8), false); ttt.update(1); assert.equal(ttt.board[8], null)
  ttt.reset(); assert.deepEqual(ttt.board, Array(9).fill(null)); assert.equal(ttt.wins, 1)
})
test('tic-tac-toe: computer wins and draws are recognised, and the cursor wraps', () => {
  const ttt = new TicTacToe(() => 0)
  for (const square of [8, 7, 5]) { ttt.play(square); ttt.update(1) } // O fills 0, 1, 2
  assert.equal(ttt.outcome, 'O'); assert.equal(ttt.losses, 1)
  const picks = [0, 0.2, 0, 0], draw = new TicTacToe(() => picks.shift())
  for (const square of [0, 2, 3, 7, 8]) { draw.play(square); draw.update(1) } // O: 1, 4, 5, 6
  assert.equal(draw.outcome, 'draw'); assert.equal(draw.draws, 1)
  draw.cursor = 0; draw.moveCursor(-1, -1); assert.equal(draw.cursor, 8); draw.moveCursor(1, 0); assert.equal(draw.cursor, 6)
})
