import test from 'node:test'
import assert from 'node:assert/strict'
import { CAMP_EDGE_X, CAMP_TUNNEL_EDGE_X, TENT_DOOR_X, createWorld, emptyInput, GROUND, HAZARD_REACH, LANDING_WIDTH, PIT_HALF_WIDTH, TUNNEL_TOP, UNDERGROUND, WIDTH, PitfallEngine, TREASURE_VALUES, CAVERN_FLOOR, CAVERN_VIEW, CAVERN_WALL, EEL_REACH, IDOL_VALUE, RIVER, RIVER_BED, SWIM_MARGIN, WATER_SURFACE, BREATH, LOW_BREATH, TUNNEL_PIT_HALF, CHAMBER_DEPTH, DEEPER_LADDER, RELIC_VALUES, BAT_REACH, PLAYER_HEIGHT, RAT_REACH, HOLES, WALL } from '../app/game/engine.ts'
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
  roomOf(safe, r => r.wall); safe.player.x = WALL.left - 14; advance(safe, 0.3, { right: true }); assert.equal(safe.player.x, WALL.left - 12)
  safe.player.x = WALL.right + 15; advance(safe, 0.3, { left: true }); assert.equal(safe.player.x, WALL.right + 12)
})
test('the tunnel wall stands east of every way down, so a fall through a hole always lands west of it', () => {
  const walled = createWorld().filter(r => r.wall && r.holes)
  assert.ok(walled.length > 0)
  // The holes and the ladder's opening (480 ± 24) all lie west of the wall's face.
  assert.ok(HOLES.every(([, right]) => right <= WALL.left) && 480 + 24 <= WALL.left)
  for (const room of walled) {
    for (const [left, right] of HOLES) {
      // Dropping in anywhere across each hole (bar the very lip, where a step off it lands on the ground).
      for (let x = left + 3; x <= right - 3; x += 2) {
        for (const keys of [{}, { right: true }, { left: true }]) {
          const game = running(); game.roomIndex = room.id
          Object.assign(game.player, { x, y: GROUND - 1, vy: 200, grounded: false })
          advance(game, 0.8, keys)
          assert.equal(game.player.layer, 'tunnel'); assert.equal(game.player.y, UNDERGROUND)
          assert.ok(game.player.x <= WALL.left - 12, `scene ${room.id + 1}: a fall at ${x} landed at ${game.player.x}`)
        }
      }
    }
  }
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

// Deep caverns. Each test drops Harry straight into the cavern of a chosen scene.
function inCavern(predicate, place = {}) {
  const game = running(); roomOf(game, r => r.cavern && predicate(r.cavern))
  Object.assign(game.player, { layer: 'cavern', y: CAVERN_FLOOR, ...place })
  return game
}
const swimmer = (x, y = WATER_SURFACE + 5) => ({ x, y, swimming: true, grounded: false })
test('eight caverns lie under tunnels without a surface ladder, the first one tunnel screen from scene 2', () => {
  const caverns = createWorld().filter(r => r.cavern)
  assert.equal(caverns.length, 8)
  assert.ok(caverns.every(r => !r.ladder))
  assert.deepEqual(caverns.map(r => r.cavern.idol), ['river', 'pillar', 'river', 'pillar', 'river', 'pillar', 'river', 'pillar'])
  assert.ok(caverns.some(r => r.cavern.flip) && caverns.some(r => !r.cavern.flip))
  assert.equal(caverns[0].id, 4); assert.ok(createWorld()[1].ladder)
})
test('every cavern is one tunnel screen west of the ladder three scenes east', () => {
  for (const cave of createWorld().filter(r => r.cavern)) {
    const game = running(); game.roomIndex = (cave.id + 3) % 255
    assert.ok(game.room.ladder, `scene ${cave.id + 4} has a ladder`)
    advance(game, 1, { down: true }); assert.equal(game.player.layer, 'tunnel')
    // Walk west, jumping any pit in the tunnel floor, until Harry reaches the cavern's tunnel screen.
    for (let t = 0; t < 20 && game.roomIndex !== cave.id; t += 1 / 120) {
      const pit = game.room.tunnelPit, ahead = pit === null ? 0 : game.player.x - pit
      advance(game, 1 / 120, { left: true, jump: ahead > 30 && ahead < 50 })
    }
    assert.equal(game.roomIndex, cave.id); assert.equal(game.lives, 3)
    // Then climb down the nearer shaft.
    const shaft = game.cavern().ladders.reduce((a, b) => Math.abs(a - game.player.x) < Math.abs(b - game.player.x) ? a : b)
    for (let t = 0; t < 20 && game.player.layer === 'tunnel'; t += 1 / 120) {
      const dx = shaft - game.player.x
      advance(game, 1 / 120, Math.abs(dx) < 10 ? { down: true } : dx > 0 ? { right: true } : { left: true })
    }
    assert.equal(game.player.layer, 'cavern', `cavern under scene ${cave.id + 1}`)
  }
})
test('mirrored caverns put the river on the right, with the ladders, chasm and idol mirrored too', () => {
  const plain = inCavern(c => !c.flip && c.idol === 'pillar').cavern(), mirrored = inCavern(c => c.flip && c.idol === 'pillar').cavern()
  assert.deepEqual(plain.rivers, [{ left: RIVER[0], right: RIVER[1], eels: 'sb' }])
  assert.deepEqual(mirrored.rivers, [{ left: WIDTH - RIVER[1], right: WIDTH - RIVER[0], eels: 'sb' }])
  assert.deepEqual(mirrored.ladders, plain.ladders.map(x => WIDTH - x))
  assert.deepEqual(mirrored.down, plain.down.map(x => WIDTH - x))
  assert.equal(mirrored.relic.x, WIDTH - plain.relic.x)
})
test('a shaft in the tunnel floor leads down to the cavern and back up, with the view following Harry', () => {
  const game = running(); roomOf(game, r => r.cavern && !r.cavern.flip)
  const [ladder] = game.cavern().ladders
  Object.assign(game.player, { layer: 'tunnel', y: UNDERGROUND, x: ladder + 10 })
  assert.equal(game.viewY(), 0)
  advance(game, 0.8, { down: true }); assert.ok(game.player.climbing); assert.ok(game.viewY() > 0 && game.viewY() < CAVERN_VIEW)
  advance(game, 1.2, { down: true }); assert.equal(game.player.layer, 'cavern'); assert.equal(game.player.y, CAVERN_FLOOR)
  assert.ok(game.player.grounded); assert.equal(game.viewY(), CAVERN_VIEW); assert.ok(game.cavernsFound.has(game.roomIndex))
  advance(game, 2, { up: true }); assert.equal(game.player.layer, 'tunnel'); assert.equal(game.player.y, UNDERGROUND); assert.equal(game.viewY(), 0)
  assert.equal(game.score, 2000); assert.equal(game.lives, 3)
})
test('rock walls close off both ends of a cavern', () => {
  const game = inCavern(c => !c.flip, { x: 60 })
  advance(game, 1, { left: true }); assert.equal(game.player.x, CAVERN_WALL + 12); assert.equal(game.roomIndex, 4)
})
test('Harry swims: he drops in off the bank, dives, floats back up, and climbs out at the far bank', () => {
  const game = inCavern(c => !c.flip, { x: RIVER[0] - 10 }); game.eels = () => []
  const events = []
  advance(game, 0.4, { right: true }); events.push(...game.events.splice(0))
  assert.ok(game.player.swimming); assert.ok(events.includes('splash'))
  advance(game, 1.5, { down: true }); assert.equal(game.player.y, RIVER_BED - 8)
  advance(game, 8); assert.equal(game.player.y, WATER_SURFACE + 5)
  for (let t = 0; t < 4 && game.player.swimming; t += 1 / 120) advance(game, 1 / 120, { right: true })
  assert.equal(game.player.swimming, false); assert.ok(game.player.grounded)
  assert.equal(game.player.y, CAVERN_FLOOR); assert.ok(game.player.x > RIVER[1])
})
test('a jump at the surface kicks Harry clear of the water and onto the nearby bank', () => {
  const game = inCavern(c => !c.flip, swimmer(RIVER[0] + SWIM_MARGIN)); game.eels = () => []
  advance(game, 0.05, { jump: true, left: true }); assert.equal(game.player.swimming, false)
  advance(game, 0.8, { left: true }); assert.ok(game.player.grounded); assert.equal(game.player.y, CAVERN_FLOOR); assert.ok(game.player.x < RIVER[0])
})
test('electric eels are lethal, and Harry starts again at the foot of the ladder he came down', () => {
  const game = inCavern(c => !c.flip); const ladders = game.cavern().ladders; game.cavernEntry = ladders[1]
  const [eel] = game.eels(); Object.assign(game.player, swimmer(eel.x, eel.y))
  advance(game, 1 / 120); assert.ok(game.events.includes('zap')); assert.equal(game.lives, 2)
  advance(game, 1.4); assert.equal(game.player.layer, 'cavern'); assert.equal(game.player.swimming, false)
  assert.equal(game.player.x, ladders[1]); assert.equal(game.player.y, CAVERN_FLOOR); assert.ok(game.player.invulnerable > 0)
})
test('eels stay in their lanes and turn back before the water by either bank, in every river', () => {
  const game = running(), between = (WATER_SURFACE + 5 + RIVER_BED - 8) / 2
  for (const c of game.chambers.filter(c => c.rivers.length)) {
    for (let t = 0; t < 30; t += 0.05) {
      for (const eel of game.eels(t, c)) {
        const river = c.rivers.find(r => eel.x > r.left && eel.x < r.right)
        assert.ok(eel.x - EEL_REACH.x > river.left + SWIM_MARGIN && eel.x + EEL_REACH.x < river.right - SWIM_MARGIN, c.name)
        assert.ok(Math.abs(eel.y - between) >= EEL_REACH.y)
      }
    }
    assert.equal(game.eels(0, c).length, c.rivers.reduce((n, r) => n + r.eels.length, 0))
  }
})
test('the chasm is bottomless, but a jump reaches the pillar and another reaches the far ledge', () => {
  const falling = inCavern(c => !c.flip); const c = falling.cavern(); falling.player.x = c.chasms[0].left - 6
  advance(falling, 0.6, { right: true }); assert.equal(falling.lives, 2); assert.ok(falling.player.inChasm)
  const depth = falling.player.y; advance(falling, 0.3); assert.ok(falling.player.y > depth + 40)
  advance(falling, 1.2); assert.equal(falling.player.layer, 'cavern'); assert.equal(falling.player.y, CAVERN_FLOOR)
  const game = inCavern(r => !r.flip, { x: c.chasms[0].left - 30 })
  advance(game, 0.75, { right: true, jump: true }); advance(game, 0.1)
  assert.ok(game.player.grounded); assert.ok(game.player.x > c.chasms[0].right && game.player.x < c.chasms[1].left)
  advance(game, 0.75, { right: true, jump: true }); advance(game, 0.1)
  assert.ok(game.player.grounded); assert.ok(game.player.x > c.chasms[1].right); assert.equal(game.lives, 3)
})
test('Harry cannot climb back onto a ledge once he has dropped below its top', () => {
  const game = inCavern(c => !c.flip); const c = game.cavern()
  Object.assign(game.player, { x: c.chasms[0].left + 10, y: CAVERN_FLOOR + 10, grounded: false, vy: 0 })
  advance(game, 0.1, { left: true }); assert.ok(game.player.x > c.chasms[0].left + 4); assert.equal(game.player.grounded, false)
})
test('golden idols are bonus loot: worth 6,000 once each, and not among the 32 treasures', () => {
  const diver = inCavern(c => c.idol === 'river'); diver.eels = () => []
  Object.assign(diver.player, swimmer(diver.cavern().relic.x))
  advance(diver, 1.5, { down: true }); assert.equal(diver.score, 2000 + IDOL_VALUE); assert.ok(diver.relics.has(diver.cavern().id))
  advance(diver, 1, { down: true }); assert.equal(diver.score, 2000 + IDOL_VALUE); assert.equal(diver.treasureCount, 0)
  const climber = inCavern(c => c.idol === 'pillar'); climber.player.x = climber.cavern().relic.x
  advance(climber, 0.1); assert.equal(climber.score, 2000 + IDOL_VALUE); assert.equal(climber.status, 'playing')
  climber.depth = 1; climber.chambersFound.add(9)
  climber.start(); assert.equal(climber.relics.size, 0); assert.equal(climber.cavernsFound.size, 0); assert.equal(climber.chambersFound.size, 0); assert.equal(climber.depth, 0)
})
test('Harry has limited air underwater, with a warning before it runs out', () => {
  const game = inCavern(c => !c.flip, swimmer(380, 757)); game.eels = () => []
  const events = []
  advance(game, BREATH - LOW_BREATH + 0.05, { down: true }); events.push(...game.events.splice(0))
  assert.ok(events.includes('air')); assert.equal(game.lives, 3)
  advance(game, LOW_BREATH, { down: true }); assert.equal(game.lives, 2); assert.match(game.message, /air/)
})
test('air refills at the surface, and floating there uses none', () => {
  const game = inCavern(c => !c.flip, swimmer(380, 757)); game.eels = () => []
  advance(game, 4, { down: true }); assert.ok(game.player.breath < BREATH - 3)
  advance(game, 4, { up: true }); assert.equal(game.player.breath, BREATH)
  advance(game, 20); assert.equal(game.player.breath, BREATH); assert.equal(game.lives, 3)
})
test('some ladder tunnels have a bottomless pit: walking in costs a life, a running jump clears it', () => {
  const pits = createWorld().filter(r => r.tunnelPit)
  assert.ok(pits.length >= 8); assert.ok(pits.every(r => r.ladder && !r.wall && r.id > 0))
  assert.ok(pits.some(r => r.tunnelPit < 480) && pits.some(r => r.tunnelPit > 480))
  const game = running(); const { tunnelPit: pit } = roomOf(game, r => r.tunnelPit && r.tunnelPit < 480)
  Object.assign(game.player, { layer: 'tunnel', y: UNDERGROUND, x: pit - TUNNEL_PIT_HALF - 2 })
  advance(game, 0.6, { right: true }); assert.equal(game.lives, 2); assert.ok(game.player.inChasm)
  advance(game, 1.4); assert.equal(game.player.layer, 'surface')
  const jumper = running(); roomOf(jumper, r => r.tunnelPit === pit)
  Object.assign(jumper.player, { layer: 'tunnel', y: UNDERGROUND, x: pit - TUNNEL_PIT_HALF - 16 })
  advance(jumper, 0.47, { right: true, jump: true }); advance(jumper, 0.05)
  assert.ok(jumper.player.grounded); assert.ok(jumper.player.x > pit + TUNNEL_PIT_HALF - 4); assert.equal(jumper.lives, 3)
})

// The lost caverns. Each test drops Harry into the chamber at a chosen depth and column.
function inChamber(depth, column, place = {}) {
  const game = running(); game.roomIndex = game.cavernScenes[column]; game.depth = depth
  Object.assign(game.player, { layer: 'cavern', y: CAVERN_FLOOR, ...place })
  return game
}
const gapsOf = c => [...c.rivers, ...c.chasms].sort((a, b) => a.left - b.left)
const onFloor = (c, x, margin = 0) => gapsOf(c).every(g => x + margin <= g.left || x - margin >= g.right)
test('two levels of lost caverns lie below the deep caverns, eight chambers each, and every chamber holds a relic', () => {
  const { chambers } = new PitfallEngine()
  assert.equal(chambers.length, 24); assert.deepEqual(chambers.map(c => c.id), chambers.map((_, i) => i))
  assert.deepEqual(chambers.map(c => c.depth), [0, 1, 2].flatMap(d => Array(8).fill(d)))
  assert.ok(chambers.every(c => c.walls === (c.depth === 0)))
  const relics = depth => chambers.filter(c => c.depth === depth).map(c => c.relic.kind).sort()
  assert.deepEqual(relics(0), Array(8).fill('idol')); assert.deepEqual(relics(1), Array(8).fill('emerald'))
  assert.deepEqual(relics(2), [...Array(7).fill('mask'), 'skull'])
  assert.equal(chambers.reduce((sum, c) => sum + RELIC_VALUES[c.relic.kind], 0), 117000)
  assert.equal(new Set(chambers.filter(c => c.depth).map(c => c.name)).size, 16)
  for (const c of chambers) {
    const { x, y } = c.relic
    assert.ok(y === RIVER_BED ? c.rivers.some(r => x > r.left + 30 && x < r.right - 30) : onFloor(c, x, 4), `${c.name} relic`)
  }
})
test('every ladder between cavern levels meets one in the chamber below, on solid floor clear of bats and rats', () => {
  const { chambers } = new PitfallEngine()
  let links = 0
  for (const c of chambers) {
    const below = chambers[c.id + 8]
    assert.deepEqual([...c.down].sort(), below ? [...below.ladders].sort() : [], `${c.name} ${c.column}`)
    const ladders = [...c.ladders, ...c.down]
    for (const x of ladders) {
      assert.ok(onFloor(c, x, 30), `${c.name} ladder at ${x}`)
      assert.ok(c.bats.every(b => x < b.left || x > b.right) && c.rats.every(r => x < r.left - RAT_REACH - 12 || x > r.right + RAT_REACH + 12))
      assert.ok(ladders.every(other => other === x || Math.abs(other - x) >= 60))
    }
    links += c.down.length
  }
  assert.equal(links, 12)
})
test('lost cavern chambers open onto solid ground at both ends, and every gap can be crossed', () => {
  for (const c of new PitfallEngine().chambers.filter(c => c.depth)) {
    const gaps = gapsOf(c)
    assert.ok(gaps.every(g => g.left >= 80 && g.right <= WIDTH - 80), `${c.name} ends`)
    for (const g of c.chasms) assert.ok(g.right - g.left <= 100, `${c.name} chasm`)
    for (const r of c.rivers) assert.ok(r.right - r.left >= 150, `${c.name} river`)
    // Stones between chasms are wide enough to land on; banks beside a river leave room to climb out.
    gaps.slice(1).forEach((g, i) => assert.ok(g.left - gaps[i].right >= (c.rivers.includes(g) || c.rivers.includes(gaps[i]) ? 80 : 44), `${c.name} ledge`))
    for (const r of c.rats) {
      assert.ok(gaps.every(g => g.right <= r.left - RAT_REACH || g.left >= r.right + RAT_REACH), `${c.name} rats`)
      assert.ok(r.left - RAT_REACH > CAVERN_WALL + 12 + RAT_REACH && r.right + RAT_REACH < WIDTH - CAVERN_WALL - 12 - RAT_REACH)
    }
  }
})
test('every cavern chamber can be reached from every deep cavern', () => {
  const { chambers } = new PitfallEngine(), seen = new Set([0]), queue = [chambers[0]]
  while (queue.length) {
    const c = queue.shift(), row = c.depth * 8
    const next = [c.down.length && chambers[c.id + 8], c.ladders.length && c.depth && chambers[c.id - 8], !c.walls && chambers[row + (c.column + 1) % 8], !c.walls && chambers[row + (c.column + 7) % 8]]
    for (const n of next) if (n && !seen.has(n.id)) { seen.add(n.id); queue.push(n) }
  }
  assert.equal(seen.size, 24)
})
test('Harry can cross every lost cavern chamber in either direction, jumping chasms and swimming rivers', () => {
  for (const c of new PitfallEngine().chambers.filter(c => c.depth)) {
    for (const east of [true, false]) {
      const game = inChamber(c.depth, c.column, { x: east ? CAVERN_WALL + 12 : WIDTH - CAVERN_WALL - 12 })
      game.eels = () => []; game.bats = () => []; game.rats = () => []
      const gaps = gapsOf(c), edges = [0, ...gaps.flatMap(g => [g.left, g.right]), WIDTH]
      const floors = edges.filter((_, i) => i % 2 === 0).map((left, i) => ({ left, right: edges[i * 2 + 1] }))
      for (let t = 0; t < 30 && game.roomIndex === game.cavernScenes[c.column]; t += 1 / 120) {
        const p = game.player, i = floors.findIndex(f => p.x >= f.left - 4 && p.x <= f.right + 4)
        const gap = gaps[east ? i : i - 1], next = floors[east ? i + 1 : i - 1]
        let jump = false
        // Run at a chasm and jump so as to land in the middle of a stone, or well onto a wide ledge.
        if (p.grounded && gap && c.chasms.includes(gap)) {
          const target = next.right - next.left < 120 ? (next.left + next.right) / 2 : east ? next.left + 40 : next.right - 40
          jump = east ? p.x >= target - 163 : p.x <= target + 163
        }
        advance(game, 1 / 120, { right: east, left: !east, jump })
      }
      assert.equal(game.roomIndex, game.cavernScenes[(c.column + (east ? 1 : 7)) % 8], `${c.name} heading ${east ? 'east' : 'west'}`)
      assert.equal(game.lives, 3); assert.equal(game.depth, c.depth)
    }
  }
})
test('a ladder on the deep cavern’s middle ledge leads down to the lost caverns and back, the view following Harry', () => {
  const game = inCavern(c => !c.flip, { x: DEEPER_LADDER + 10 }); game.bats = () => []
  assert.deepEqual(game.cavern().down, [DEEPER_LADDER])
  advance(game, 0.2, { up: true }); assert.equal(game.player.climbing, false)
  let view = game.viewY(), jolt = 0
  const climb = (seconds, keys) => { for (let t = 0; t < seconds; t += 1 / 120) { advance(game, 1 / 120, keys); jolt = Math.max(jolt, Math.abs(game.viewY() - view)); view = game.viewY() } }
  climb(1, { down: true }); assert.ok(game.player.climbing); assert.equal(game.depth, 0); assert.ok(game.viewY() > CAVERN_VIEW)
  climb(2.5, { down: true }); assert.equal(game.depth, 1); assert.ok(game.player.grounded); assert.equal(game.player.y, CAVERN_FLOOR)
  assert.equal(game.viewY(), CAVERN_VIEW + CHAMBER_DEPTH); assert.equal(game.cavern().name, 'Bat roost')
  assert.ok(game.chambersFound.has(8)); assert.match(game.message, /lost caverns/); assert.equal(game.cavernEntry, DEEPER_LADDER)
  climb(3.5, { up: true }); assert.equal(game.depth, 0); assert.ok(game.player.grounded); assert.equal(game.player.x, DEEPER_LADDER)
  assert.equal(game.viewY(), CAVERN_VIEW); assert.ok(jolt < 3, `the view jumped ${jolt}px`)
  assert.equal(game.lives, 3); assert.equal(game.score, 2000)
})
test('the lost caverns run on east and west beneath the whole jungle, looping around', () => {
  const game = inChamber(1, 0, { x: 60 }); game.bats = () => []
  advance(game, 0.35, { left: true })
  assert.equal(game.roomIndex, game.cavernScenes[7]); assert.equal(game.depth, 1); assert.ok(game.player.x > WIDTH - 20)
  assert.equal(game.cavern().name, 'The narrows'); assert.equal(game.cavernEntry, WIDTH - CAVERN_WALL - 12); assert.ok(game.chambersFound.has(15))
  assert.equal(game.visited.has(game.roomIndex), false); assert.equal(game.viewY(), CAVERN_VIEW + CHAMBER_DEPTH)
  advance(game, 0.5, { right: true }); assert.equal(game.roomIndex, game.cavernScenes[0]); assert.equal(game.cavernEntry, CAVERN_WALL + 12)
})
test('climbing out of the lost caverns under another deep cavern leads up to that scene’s tunnel', () => {
  const game = inChamber(1, 1, { x: 400 }); game.eels = () => []; game.rats = () => []
  advance(game, 3.4, { up: true }); assert.equal(game.depth, 0); assert.equal(game.roomIndex, game.cavernScenes[1]); assert.ok(game.cavernsFound.has(game.roomIndex))
  for (let t = 0; t < 20 && game.player.layer === 'cavern'; t += 1 / 120) advance(game, 1 / 120, game.player.climbing || (game.player.grounded && game.player.x > 830) ? { up: true } : { right: true })
  assert.equal(game.player.layer, 'tunnel'); assert.equal(game.player.y, UNDERGROUND); assert.ok(game.visited.has(game.roomIndex)); assert.equal(game.viewY(), 0)
})
test('bats swoop to Harry’s height through the middle of their flight but fly high over both ends', () => {
  const game = inChamber(1, 0), [span] = game.cavern().bats, middle = (span.left + span.right) / 2, reach = (span.right - span.left) / 2
  let swooped = false
  for (let t = 0; t < 20; t += 0.01) {
    const [bat] = game.bats(t)
    assert.ok(bat.x >= span.left - 1 && bat.x <= span.right + 1)
    if (Math.abs(bat.x - middle) > reach / 2) assert.ok(bat.y + BAT_REACH.y < CAVERN_FLOOR - PLAYER_HEIGHT, `bat low at ${bat.x}`)
    if (bat.y - BAT_REACH.y < CAVERN_FLOOR - PLAYER_HEIGHT / 2) swooped = true
  }
  assert.ok(swooped)
  const safe = inChamber(1, 0, { x: span.left + 15 }); advance(safe, 10); assert.equal(safe.lives, 3)
  let t = 0; while (Math.abs(game.bats(t)[0].x - middle) > 1) t += 0.0005
  game.elapsed = t - 1 / 120; game.player.x = middle; game.cavernEntry = DEEPER_LADDER
  advance(game, 1 / 120); assert.ok(game.events.includes('screech')); assert.equal(game.lives, 2)
  advance(game, 1.4); assert.equal(game.depth, 1); assert.equal(game.player.x, DEEPER_LADDER); assert.ok(game.player.invulnerable > 0)
})
test('cave rats bite, but Harry can jump them', () => {
  const game = inChamber(1, 3); game.player.x = game.rats()[0].x
  advance(game, 1 / 120); assert.ok(game.events.includes('squeak')); assert.equal(game.lives, 2)
  const jumper = inChamber(1, 3, { x: 120 }); jumper.rats = () => [{ x: 220, facing: -1 }]
  for (let i = 0; i < 90; i++) jumper.update(1 / 120, { ...emptyInput(), right: true, jump: jumper.player.x >= 220 - RAT_REACH - 30 })
  assert.equal(jumper.lives, 3); assert.ok(jumper.player.x > 220 + RAT_REACH)
})
test('relics in the lost caverns are worth their value once each; a fall puts Harry back where he came in', () => {
  const game = inChamber(1, 0, { x: 280 }); game.bats = () => []
  advance(game, 0.1); assert.equal(game.score, 2000 + RELIC_VALUES.emerald); assert.ok(game.relics.has(8))
  advance(game, 0.5); assert.equal(game.score, 2000 + RELIC_VALUES.emerald); assert.equal(game.treasureCount, 0)
  const temple = inChamber(2, 4); temple.bats = () => []; temple.player.x = temple.cavern().relic.x
  advance(temple, 0.1); assert.equal(temple.score, 2000 + RELIC_VALUES.skull); assert.match(temple.message, /crystal skull/)
  const stones = inChamber(1, 2, { x: 40 }); stones.cavernEntry = CAVERN_WALL + 12
  advance(stones, 1.5, { right: true }); assert.equal(stones.lives, 2); assert.ok(stones.player.inChasm)
  advance(stones, 1); assert.equal(stones.depth, 1); assert.equal(stones.player.x, CAVERN_WALL + 12); assert.equal(stones.player.y, CAVERN_FLOOR)
})
