import { TicTacToe } from './tictactoe.ts'

export const WIDTH = 960
export const HEIGHT = 480
export const GROUND = 316
// The surface dirt band is TUNNEL_TOP - GROUND deep; the tunnel leaves room to jump a scorpion.
export const TUNNEL_TOP = GROUND + 30
export const UNDERGROUND = 454
export const PLAYER_HEIGHT = 44
export const RUN_SPEED = 220
export const PIT_HALF_WIDTH = 145
// Harry starts (and respawns in scene 001) just to the right of base camp.
export const CAMP_START_X = 250
// Base camp is where the expedition begins: Harry can wander the camp as far as the red pennant,
// but can't walk past it (or the tunnel's end beneath it) and wrap around to scene 255.
export const CAMP_EDGE_X = 30
export const CAMP_TUNNEL_EDGE_X = 12
// Standing in the tent's open flap and pressing up takes Harry inside to the games table.
export const TENT_DOOR_X = 105
export const TENT_DOOR_REACH = 16
// Vine geometry: the hand end sits 75px above the ground at the bottom of the swing and
// reaches 184px either side of centre, rising only ~30px at the ends.
export const VINE_LENGTH = 579
export const VINE_PIVOT_Y = GROUND - 75 - VINE_LENGTH
export const VINE_SWING = Math.asin(184 / VINE_LENGTH)
// Width of the strip of bank between a pit's edge and a cobra guarding the far side.
export const LANDING_WIDTH = 44
export const HAZARD_REACH = 27
export const TREASURE_VALUES = { bag: 2000, silver: 3000, gold: 4000, ring: 5000 } as const
// Deep caverns lie beneath some tunnel scenes. A ladder shaft in the tunnel floor drops to rock ledges
// around an underground river, where electric eels patrol, and a bottomless chasm with one stone
// pillar in it. The layout below has the river on the left; some caverns are mirrored.
export const CAVERN_TOP = 492
export const CAVERN_FLOOR = 700
export const WATER_SURFACE = 712
export const RIVER_BED = 806
// How far the view scrolls down while Harry is in a cavern; the tunnel stays in sight above it.
export const CAVERN_VIEW = 350
export const CAVERN_WALL = 24
export const CAVERN_LADDERS = [120, 880] as const
export const RIVER = [232, 520] as const
export const CHASMS = [[600, 700], [744, 844]] as const
export const SWIM_SPEED = 115
// Left alone in the water, Harry drifts slowly up toward the surface.
export const SWIM_FLOAT = 18
export const SWIM_MARGIN = 22
// Seconds of air underwater. It runs down below the surface, refills three times as fast at it,
// and a warning sounds when two seconds are left.
export const BREATH = 9
export const LOW_BREATH = 2
// "Hidden passages" scenes have two holes in the ground, either side of the ladder, that drop into the tunnel.
export const HOLES = [[248, 304], [656, 712]] as const
// Some ladder scenes have a brick wall across the tunnel. It stands flush beneath the east edge of the
// eastern hole, east of every way down from the surface, so a fall through a hole always lands west of it.
export const WALL = { left: 712, right: 740 } as const
// Some ladder scenes have a narrow, bottomless pit in the tunnel floor, centred here, to jump.
export const TUNNEL_PIT_HALF = 30
export const TUNNEL_PIT_SPOTS = [170, 810] as const
export const EEL_LANES = [WATER_SURFACE + 16, RIVER_BED - 22] as const
export const EEL_REACH = { x: 30, y: 13 } as const
// The lost caverns lie below the deep caverns: more levels of chambers, each level a screen below the
// last. A ladder on each deep cavern's middle ledge leads down to them.
export const CHAMBER_DEPTH = HEIGHT
export const DEEPER_LADDER = 560
// Cavern relics are sparse bonus loot outside the 32 treasures needed to win.
export const RELIC_VALUES = { emerald: 3000, mask: 5000, idol: 6000, skull: 10000 } as const
export const IDOL_VALUE = RELIC_VALUES.idol
// Bats swing to and fro like pendulums: up near the roof at both ends of their flight, swooping down to
// Harry's height through the middle of it.
export const BAT_HIGH = 160
export const BAT_LOW = 35
export const BAT_REACH = { x: 22, y: 7 } as const
// Cave rats scurry back and forth along the floor, low enough to jump.
export const RAT_REACH = 20
export const RAT_HEIGHT = 16

export type Treasure = keyof typeof TREASURE_VALUES
export type Relic = keyof typeof RELIC_VALUES
export type Loot = Treasure | Relic
export type Status = 'ready' | 'playing' | 'paused' | 'over' | 'won' | 'tent'
export type Input = { left: boolean; right: boolean; up: boolean; down: boolean; jump: boolean }
export const emptyInput = (): Input => ({ left: false, right: false, up: false, down: false, jump: false })
export type Cavern = { flip: boolean; idol: 'river' | 'pillar' }
export type Room = {
  id: number; seed: number; kind: number; name: string; ladder: boolean
  holes: boolean; pit: 'tar' | 'water' | 'sand' | null; shifting: boolean
  vine: boolean; logs: number; hazard: 'fire' | 'snake' | null; hazardX: number
  treasure: Treasure | null; wall: boolean; cavern: Cavern | null; tunnelPit: number | null
}
export type Layer = 'surface' | 'tunnel' | 'cavern'
export type Player = {
  x: number; y: number; vx: number; vy: number; facing: number
  grounded: boolean; layer: Layer; climbing: boolean
  swinging: boolean; invulnerable: number; grabCooldown: number
  // While swimming, y is the line of Harry's body rather than his feet.
  swimming: boolean; inChasm: boolean; breath: number
}
export type Ladder = { x: number; top: number; bottom: number; upper: Layer; lower: Layer }
export type Span = { left: number; right: number }
// The lanes of a river that have an eel in them: 's' just under the surface, 'b' along the bed.
export type River = Span & { eels: string }
export type ChamberKind = 'cavern' | 'roost' | 'lake' | 'stones' | 'rats' | 'falls' | 'grotto' | 'temple'
export type Chamber = {
  id: number; depth: number; column: number; seed: number; name: string; kind: ChamberKind
  // Deep caverns are walled at both ends; the lost caverns open into the next chamber east and west.
  walls: boolean
  // Ladders lead up out of the chamber, and down from its floor into the chamber below.
  rivers: River[]; chasms: Span[]; ladders: number[]; down: number[]
  bats: Span[]; rats: Span[]; relic: { kind: Relic; x: number; y: number } | null
}
// A chamber's layout: its rivers (with their eel lanes), bottomless chasms, ladders, the spans bats and
// rats patrol, and where its relic lies, on the floor or a riverbed.
type Pair = readonly [number, number]
export type ChamberPlan = {
  name: string; kind: ChamberKind; up?: readonly number[]; down?: readonly number[]
  rivers?: readonly (readonly [number, number, string])[]; chasms?: readonly Pair[]
  bats?: readonly Pair[]; rats?: readonly Pair[]; relic: readonly [Relic, number]
}
export type GameEvent = 'jump' | 'swing' | 'treasure' | 'hurt' | 'fall' | 'log' | 'win' | 'tent' | 'splash' | 'zap' | 'air' | 'screech' | 'squeak'
export type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string }
export const atTentDoor = (roomIndex: number, p: Player) => roomIndex === 0 && p.layer === 'surface' && p.grounded && !p.climbing && Math.abs(p.x - TENT_DOOR_X) < TENT_DOOR_REACH
export const wrap = (n: number, max: number) => ((n % max) + max) % max

// The deep caverns, west to east: the scene each lies under (by index), and whether it's mirrored with
// the river on the right. Each scene has no surface ladder and is three scenes west of one that does, and
// the caverns are spread around the jungle 26 to 40 scenes apart, counting the gap past base camp.
export const DEEP_CAVERNS = [[4, false], [42, true], [70, false], [96, true], [125, true], [161, false], [189, false], [220, true]] as const

// A maximal eight-bit feedback sequence makes a stable, circular 255-scene jungle.
// The layout is a new arrangement; no cartridge code or assets are used.
export function createWorld(): Room[] {
  let seed = 1
  let treasureIndex = 0
  const kinds = ['Jungle trail', 'Hidden passages', 'Tar pit', 'Crocodile crossing', 'Shifting sands', 'Lost treasure', 'Sinking ground', 'Vine valley']
  const treasures: Treasure[] = ['gold', 'bag', 'silver', 'ring']
  return Array.from({ length: 255 }, (_, id) => {
    const kind = (seed >> 3) & 7, deep = DEEP_CAVERNS.findIndex(([scene]) => scene === id)
    const room: Room = {
      id, seed, kind, name: kinds[kind]!, ladder: kind < 2, holes: kind === 1,
      pit: kind === 2 ? 'tar' : kind === 3 ? 'water' : kind === 4 || kind === 7 ? 'sand' : kind === 6 ? 'tar' : null,
      shifting: kind === 4 || kind === 6,
      vine: kind === 2 || kind === 7 || (kind === 3 && (seed & 1) === 1),
      logs: kind < 2 ? 1 + ((seed >> 6) % 3) : 0,
      hazard: null, hazardX: 720,
      treasure: kind === 5 ? treasures[treasureIndex++ % 4]! : null,
      wall: kind < 2 && (seed & 3) === 0,
      // Eight tunnels have a deep cavern below; the idol alternates between the riverbed and the pillar
      // in the chasm.
      cavern: deep >= 0 ? { flip: DEEP_CAVERNS[deep]![1], idol: deep % 2 ? 'pillar' : 'river' } : null,
      // Ladder scenes have no scorpions, so a pit is the tunnel's one hazard; never under base camp
      // or in a tunnel with a wall.
      tunnelPit: kind < 2 && id > 0 && (seed & 3) === 2 ? TUNNEL_PIT_SPOTS[(seed >> 2) & 1]! : null,
    }
    // Treasure rooms are mostly guarded by cobras. Some fixed pits also hide a cobra on one bank,
    // leaving a narrow strip to land on between the pit's edge and the snake.
    if (kind === 5) room.hazard = (seed & 3) === 0 ? 'fire' : 'snake'
    else if ((kind === 2 || kind === 3 || kind === 7) && (seed >> 1) & 1) {
      const offset = PIT_HALF_WIDTH + 4 + LANDING_WIDTH + HAZARD_REACH
      room.hazard = 'snake'; room.hazardX = (seed >> 2) & 1 ? 480 - offset : 480 + offset
    }
    seed = ((seed << 1) | (((seed >> 7) ^ (seed >> 5) ^ (seed >> 4) ^ (seed >> 3)) & 1)) & 255
    return room
  })
}

// The lost caverns, one level per row, with a chamber below each deep cavern in jungle order. Each
// level runs on east and west and loops around like the jungle above. The ladders up from the first
// level meet the middle ledges of the (sometimes mirrored) deep caverns above; ladders down meet the
// chamber below. The layouts are new arrangements.
export const LOST_CAVERNS: readonly (readonly ChamberPlan[])[] = [[
  { name: 'Bat roost', kind: 'roost', up: [560], bats: [[90, 470], [630, 900]], relic: ['emerald', 280] },
  { name: 'Flooded gallery', kind: 'lake', up: [400], rivers: [[480, 860, 'sb']], rats: [[170, 340]], relic: ['emerald', 670] },
  { name: 'Stepping stones', kind: 'stones', up: [560], down: [890], chasms: [[130, 220], [270, 360], [720, 810]], relic: ['emerald', 245] },
  { name: 'Rat run', kind: 'rats', up: [400], rats: [[170, 340], [470, 800]], relic: ['emerald', 670] },
  { name: 'Waterfall', kind: 'falls', up: [400], down: [860], rivers: [[560, 800, 'b']], chasms: [[140, 240]], relic: ['emerald', 680] },
  { name: 'Crystal grotto', kind: 'grotto', up: [560], bats: [[100, 460]], chasms: [[640, 740], [790, 876]], relic: ['emerald', 765] },
  { name: 'Twin pools', kind: 'lake', up: [560], down: [440], rivers: [[110, 330, 'b'], [680, 860, 's']], relic: ['emerald', 220] },
  { name: 'The narrows', kind: 'stones', up: [400], down: [860], bats: [[80, 330]], chasms: [[500, 600], [644, 744]], relic: ['emerald', 622] },
], [
  { name: 'Bat cathedral', kind: 'roost', bats: [[80, 330], [360, 620], [650, 900]], relic: ['mask', 490] },
  { name: 'Eel lake', kind: 'lake', rivers: [[120, 840, 'sb']], relic: ['mask', 480] },
  { name: 'Hidden spring', kind: 'falls', up: [890], rivers: [[330, 600, 'sb']], chasms: [[120, 210]], rats: [[630, 800]], relic: ['mask', 465] },
  { name: 'Crystal hall', kind: 'grotto', bats: [[100, 380], [750, 910]], chasms: [[480, 580], [628, 728]], relic: ['mask', 604] },
  { name: 'Sunken temple', kind: 'temple', up: [860], rivers: [[100, 330, 'sb']], chasms: [[420, 520], [570, 670]], bats: [[400, 690]], relic: ['skull', 545] },
  { name: 'Rat warren', kind: 'rats', rats: [[170, 340], [380, 590], [630, 800]], relic: ['mask', 470] },
  { name: 'Broken bridge', kind: 'stones', up: [440], chasms: [[500, 590], [640, 730], [780, 860]], rats: [[170, 380]], relic: ['mask', 755] },
  { name: 'The cascade', kind: 'falls', up: [860], rivers: [[200, 520, 'sb']], chasms: [[600, 700]], relic: ['mask', 360] },
]]

// Every cavern chamber in screen coordinates, level by level: first the deep caverns under the jungle's
// tunnels (west to east), then each level of the lost caverns below them. A chamber's id is its index.
export function createCaverns(rooms: Room[]): Chamber[] {
  const entries = rooms.filter(r => r.cavern)
  const chamber = (depth: number, column: number, seed: number, plan: ChamberPlan, flip = false): Chamber => {
    const at = (x: number) => flip ? WIDTH - x : x
    const span = ([a, b]: Pair) => flip ? { left: WIDTH - b, right: WIDTH - a } : { left: a, right: b }
    const rivers = (plan.rivers ?? []).map(([a, b, eels]) => ({ ...span([a, b]), eels }))
    const kind = plan.relic[0], x = at(plan.relic[1])
    return {
      id: depth * entries.length + column, depth, column, seed, name: plan.name, kind: plan.kind, walls: depth === 0,
      rivers, chasms: (plan.chasms ?? []).map(span), ladders: (plan.up ?? []).map(at), down: (plan.down ?? []).map(at),
      bats: (plan.bats ?? []).map(span), rats: (plan.rats ?? []).map(span),
      relic: { kind, x, y: rivers.some(r => x > r.left && x < r.right) ? RIVER_BED : CAVERN_FLOOR },
    }
  }
  // The deep cavern layout has the river on the left; some are mirrored. The idol lies on the riverbed
  // or on the stone pillar in the chasm.
  const deep = entries.map((room, column) => chamber(0, column, room.seed, {
    name: 'Deep cavern', kind: 'cavern', up: CAVERN_LADDERS, down: [DEEPER_LADDER], rivers: [[...RIVER, 'sb']], chasms: CHASMS,
    relic: ['idol', room.cavern!.idol === 'river' ? (RIVER[0] + RIVER[1]) / 2 : (CHASMS[0][1] + CHASMS[1][0]) / 2],
  }, room.cavern!.flip))
  const chambers = [...deep, ...LOST_CAVERNS.flatMap((level, i) => level.map((plan, column) => chamber(i + 1, column, 31 * (i + 1) + 7 * column, plan)))]
  // Surface treasure appears in 32 of 255 scenes (about one in eight). Keep one
  // relic per eight-chamber level: a river idol, an emerald, and the temple skull.
  const rewardColumns = [0, 0, 4]
  for (const c of chambers) if (c.column !== rewardColumns[c.depth]) c.relic = null
  return chambers
}

export class PitfallEngine {
  // The tent's games table; the running tally lasts for the whole expedition.
  tent = new TicTacToe()
  rooms = createWorld()
  // Scenes with a deep cavern beneath them, west to east. Each heads a column of cavern chambers.
  cavernScenes = this.rooms.filter(r => r.cavern).map(r => r.id)
  chambers = createCaverns(this.rooms)
  status: Status = 'ready'
  roomIndex = 0
  score = 2000
  lives = 3
  remaining = 1200
  elapsed = 0
  // When Harry entered the current scene; logs roll from their starting spots from then on.
  roomEnteredAt = 0
  collected = new Set<number>()
  visited = new Set<number>([0])
  cavernsFound = new Set<number>()
  // Cavern chambers found and relics taken, by chamber id.
  chambersFound = new Set<number>()
  relics = new Set<number>()
  // How many levels below the deep caverns Harry is; while he's down there, the current scene is the
  // one above his column of chambers.
  depth = 0
  // Where Harry came into the current cavern chamber, at the foot of a ladder or the end he walked in
  // from; he gets another go from there after a fall.
  cavernEntry = 0
  player: Player = this.newPlayer(CAMP_START_X)
  deathTimer = 0
  lastJump = false
  lastUp = false
  logContact = 0
  particles: Particle[] = []
  events: GameEvent[] = []
  message = 'A whole jungle of adventure awaits.'
  messageTime = 0

  get room() { return this.rooms[this.roomIndex]! }
  get treasureCount() { return this.collected.size }

  newPlayer(x = 108, invulnerable = 0): Player {
    return { x, y: GROUND, vx: 0, vy: 0, facing: 1, grounded: true, layer: 'surface', climbing: false, swinging: false, invulnerable, grabCooldown: 0, swimming: false, inChasm: false, breath: BREATH }
  }

  start() {
    this.status = 'playing'
    this.roomIndex = 0
    this.score = 2000
    this.lives = 3
    this.remaining = 1200
    this.elapsed = 0
    this.roomEnteredAt = 0
    this.collected.clear()
    this.visited = new Set([0])
    this.cavernsFound = new Set()
    this.chambersFound = new Set()
    this.relics = new Set()
    this.depth = 0
    this.cavernEntry = 0
    this.player = this.newPlayer(CAMP_START_X)
    this.deathTimer = 0
    this.lastJump = false
    this.lastUp = false
    this.tent = new TicTacToe()
    this.logContact = 0
    this.particles = []
    this.events = []
    this.announce('Find the treasure. Watch your step.', 5)
  }

  pause() { if (this.status === 'playing') this.status = 'paused' }
  resume() { if (this.status === 'paused') this.status = 'playing' }
  // The expedition clock stops while Harry is inside; the jungle waits for him.
  enterTent() {
    if (this.status !== 'playing' || !atTentDoor(this.roomIndex, this.player)) return
    this.status = 'tent'; this.player.vx = 0
    if (this.tent.over) this.tent.reset()
    this.events.push('tent')
  }
  leaveTent() {
    if (this.status !== 'tent') return
    // Harry steps back out facing the jungle; up must be released before he can go back in.
    this.status = 'playing'; this.player.facing = 1; this.lastUp = true; this.lastJump = true
    this.announce('Back to the expedition.', 2)
  }
  announce(message: string, duration = 3) { this.message = message; this.messageTime = duration }

  // The vine hangs from a pivot far above the canopy, so its long, shallow arc keeps Harry
  // about 40px above the pit at the bottom of the swing while still reaching both banks.
  vine(time = this.elapsed) {
    const speed = Math.PI * 2 / 4.8
    const angle = Math.sin(time * speed - 0.95) * VINE_SWING
    const velocity = Math.cos(time * speed - 0.95) * speed * VINE_SWING
    return { x: 480 + Math.sin(angle) * VINE_LENGTH, y: VINE_PIVOT_Y + Math.cos(angle) * VINE_LENGTH, vx: Math.cos(angle) * VINE_LENGTH * velocity, vy: -Math.sin(angle) * VINE_LENGTH * velocity }
  }

  pitBounds() {
    if (!this.room.pit) return null
    const amount = this.room.shifting ? Math.max(0, Math.min(1, (Math.sin(this.elapsed * 1.2 + this.room.seed) + 0.3) * 2.5)) : 1
    return amount > 0 ? { left: 480 - PIT_HALF_WIDTH * amount, right: 480 + PIT_HALF_WIDTH * amount } : null
  }

  logs() {
    return Array.from({ length: this.room.logs }, (_, i) => wrap(735 + i * 100 - (this.elapsed - this.roomEnteredAt) * 112, WIDTH + 90) - 45)
  }

  crocodiles() {
    const open = Math.sin(this.elapsed * 1.8 + this.room.seed) > 0.25
    return [382, 480, 578].map(x => ({ x, open }))
  }

  scorpionX() { return 480 + Math.sin(this.elapsed * 0.8 + this.room.seed) * 175 }
  // 1 when the scorpion is walking right, -1 when walking left (the sign of scorpionX's velocity).
  scorpionFacing() { return Math.cos(this.elapsed * 0.8 + this.room.seed) >= 0 ? 1 : -1 }

  // The cavern chamber at a depth below the current scene (by default the one Harry is in), or null
  // where the scene has no cavern.
  cavern(depth = this.depth): Chamber | null {
    const column = this.cavernScenes.indexOf(this.roomIndex)
    return column < 0 ? null : this.chambers[depth * this.cavernScenes.length + column] ?? null
  }

  ladders(): Ladder[] {
    const list: Ladder[] = this.room.ladder ? [{ x: 480, top: GROUND, bottom: UNDERGROUND, upper: 'surface', lower: 'tunnel' }] : []
    const c = this.cavern()
    if (!c) return list
    // From a deep cavern, ladders lead up to the tunnel; in the lost caverns, to the chamber above.
    const top = c.depth ? CAVERN_FLOOR - CHAMBER_DEPTH : UNDERGROUND, upper: Layer = c.depth ? 'cavern' : 'tunnel'
    for (const x of c.ladders) list.push({ x, top, bottom: CAVERN_FLOOR, upper, lower: 'cavern' })
    for (const x of c.down) list.push({ x, top: CAVERN_FLOOR, bottom: CAVERN_FLOOR + CHAMBER_DEPTH, upper: 'cavern', lower: 'cavern' })
    return list
  }

  // Eels sweep back and forth across a river: one just under the surface and one along the bed, in
  // whichever lanes the river has them. Between the lanes is a narrow band of safe water. They turn back
  // before the water by either bank, so Harry can always slip in and climb out there.
  eels(time = this.elapsed, c = this.cavern()) {
    if (!c) return []
    const pace = 1 + ((c.seed >> 2) & 3) * 0.08
    return c.rivers.flatMap((river, r) => {
      const middle = (river.left + river.right) / 2, reach = (river.right - river.left) / 2 - 54
      return [...river.eels].map(lane => {
        const i = lane === 's' ? 0 : 1, a = time * [0.8, 1.1][i]! * pace + [0, 2.1][i]! + r * 1.3 + c.seed
        return { x: middle + Math.sin(a) * reach, y: EEL_LANES[i]! + Math.sin(time * 1.7 + i * 2 + c.seed) * 4, facing: Math.cos(a) >= 0 ? 1 : -1 }
      })
    })
  }

  // Each bat swings across its span like a pendulum: high at either end and swooping low through the
  // middle, with a quick flutter.
  bats(time = this.elapsed, c = this.cavern()) {
    if (!c) return []
    const pace = 1.3 + ((c.seed >> 1) & 3) * 0.08
    return c.bats.map((span, i) => {
      const a = time * pace + c.seed + i * 2.4
      const y = CAVERN_FLOOR - BAT_HIGH + (BAT_HIGH - BAT_LOW) * Math.cos(a) ** 2 + Math.sin(time * 9 + i) * 3
      return { x: (span.left + span.right) / 2 + Math.sin(a) * (span.right - span.left) / 2, y, facing: Math.cos(a) >= 0 ? 1 : -1 }
    })
  }

  // Rats scurry back and forth along their spans of floor, each at its own pace. Their run starts afresh
  // whenever Harry comes into the chamber (or starts again there), from the middle of each span and
  // heading away from the end he came in at; `time` counts from then.
  rats(time = this.elapsed - this.roomEnteredAt, c = this.cavern()) {
    if (!c) return []
    const away = this.cavernEntry > WIDTH / 2 ? Math.PI : 0
    return c.rats.map((span, i) => {
      const a = time * (1.5 + i * 0.35) + away
      return { x: (span.left + span.right) / 2 + Math.sin(a) * (span.right - span.left) / 2, facing: Math.cos(a) >= 0 ? 1 : -1 }
    })
  }

  // How far the view scrolls down: 0 shows the jungle and tunnel, CAVERN_VIEW shows the deep cavern,
  // and each level of the lost caverns is another screen down. On a cavern ladder the view follows Harry
  // down the shaft.
  viewY() {
    const p = this.player
    if (!this.room.cavern) return 0
    const ladder = p.climbing ? this.ladders().find(l => l.x === p.x) : undefined
    if (ladder?.upper === 'tunnel') return Math.min(CAVERN_VIEW, Math.max(0, p.y - 420))
    const rest = CAVERN_VIEW + this.depth * CHAMBER_DEPTH
    return ladder ? rest + p.y - CAVERN_FLOOR : p.layer === 'cavern' ? rest : 0
  }

  update(seconds: number, input: Input) {
    if (this.status === 'tent') this.tent.update(Math.max(0, Math.min(seconds, 0.1)))
    if (this.status !== 'playing') { this.lastJump = input.jump; this.lastUp = input.up; return }
    const pressedUp = input.up && !this.lastUp
    this.lastUp = input.up
    if (pressedUp && this.deathTimer <= 0 && atTentDoor(this.roomIndex, this.player)) { this.enterTent(); this.lastJump = input.jump; return }
    // Keep the expedition clock accurate when a frame stalls, while bounding physics.
    this.remaining = Math.max(0, this.remaining - Math.max(0, seconds))
    if (this.remaining <= 0) { this.status = 'over'; this.announce('The sun has set on this expedition.'); return }
    let left = Math.max(0, Math.min(seconds, 0.1))
    let pressedJump = input.jump && !this.lastJump
    this.lastJump = input.jump
    while (left > 0 && this.status === 'playing') {
      const dt = Math.min(left, 1 / 120)
      this.step(dt, input, pressedJump)
      pressedJump = false
      left -= dt
    }
  }

  step(dt: number, input: Input, jump: boolean) {
    this.elapsed += dt
    this.messageTime = Math.max(0, this.messageTime - dt)
    this.particles = this.particles.filter(p => p.life > 0)
    for (const particle of this.particles) {
      particle.x += particle.vx * dt; particle.y += particle.vy * dt
      particle.vy += 200 * dt; particle.life -= dt
    }
    if (this.deathTimer > 0) {
      this.deathTimer -= dt
      const fallen = this.player
      // A fall into the chasm keeps going while the life is lost.
      if (fallen.inChasm) { fallen.vy += 1450 * dt; fallen.y += fallen.vy * dt }
      if (this.deathTimer <= 0) {
        if (this.lives <= 0) this.status = 'over'
        else if (fallen.layer === 'cavern') {
          // Back where Harry came into this chamber: at the foot of a ladder, or the end he walked in from.
          const c = this.cavern()!
          this.player = this.newPlayer(this.cavernEntry || c.ladders[0] || CAVERN_WALL + 12, 1.5)
          this.player.layer = 'cavern'; this.player.y = CAVERN_FLOOR; this.roomEnteredAt = this.elapsed
        } else { this.player = this.newPlayer(this.roomIndex === 0 ? CAMP_START_X : 108, 1.5); this.player.y = 90; this.player.grounded = false }
      }
      return
    }
    const p = this.player
    p.invulnerable = Math.max(0, p.invulnerable - dt)
    p.grabCooldown = Math.max(0, p.grabCooldown - dt)
    const direction = Number(input.right) - Number(input.left)
    if (direction) p.facing = direction

    if (p.swinging) {
      const end = this.vine()
      p.x = end.x; p.y = end.y + 35
      p.vx = end.vx; p.vy = end.vy
      if ((jump || input.down) && p.grabCooldown <= 0) {
        p.swinging = false; p.grabCooldown = 0.55
        p.vx = end.vx + direction * 75; p.vy = Math.min(-160, end.vy - 110)
        this.events.push('jump')
      } else return
    }

    const ladders = this.ladders()
    const grab = !p.climbing && p.grounded ? ladders.find(l => Math.abs(p.x - l.x) < 24 && ((input.down && p.layer === l.upper && p.y === l.top) || (input.up && p.layer === l.lower && p.y === l.bottom))) : undefined
    if (grab) { p.climbing = true; p.x = grab.x; p.vx = 0; p.vy = 0; p.grounded = false }
    const ladder = p.climbing ? ladders.find(l => l.x === p.x) : undefined
    if (ladder) {
      p.y += (Number(input.down) - Number(input.up)) * 150 * dt
      // Halfway along a ladder between cavern levels, Harry passes into the chamber below or above.
      const level = ladder.upper !== 'cavern' ? 0 : p.y > CAVERN_FLOOR + CHAMBER_DEPTH / 2 ? 1 : p.y < CAVERN_FLOOR - CHAMBER_DEPTH / 2 ? -1 : 0
      if (level) { this.depth += level; p.y -= level * CHAMBER_DEPTH; this.cavernEntry = p.x; this.enterChamber(); return }
      if (p.y <= ladder.top) {
        p.y = ladder.top; p.layer = ladder.upper; p.climbing = false; p.grounded = true
        if (ladder.upper === 'cavern') this.cavernEntry = ladder.x
        else if (ladder.upper === 'tunnel') this.visited.add(this.roomIndex)
      }
      if (p.y >= ladder.bottom) {
        p.y = ladder.bottom; p.layer = ladder.lower; p.climbing = false; p.grounded = true
        // Coming down from the tunnel, Harry has reached a deep cavern; between levels of the lost caverns,
        // he came into this chamber halfway down.
        if (ladder.lower === 'cavern') this.cavernEntry = ladder.x
        if (ladder.upper === 'tunnel') this.enterChamber()
      }
      return
    }
    p.climbing = false
    if (p.swimming) { this.swim(dt, input, jump, direction); return }
    p.breath = BREATH

    if (jump && p.grounded) {
      p.vy = -535; p.grounded = false; this.events.push('jump')
    }
    // Briefly preserve a vine's momentum; ordinary jumps keep predictable joystick control.
    if (p.grabCooldown <= 0.35 || p.grounded) p.vx = direction * RUN_SPEED
    const oldX = p.x
    const oldY = p.y
    p.x += p.vx * dt
    p.vy += 1450 * dt
    p.y += p.vy * dt
    if (p.layer === 'tunnel' && this.room.wall && p.x > WALL.left - 12 && p.x < WALL.right + 12) p.x = oldX < (WALL.left + WALL.right) / 2 ? WALL.left - 12 : WALL.right + 12

    if (this.roomIndex === 0) p.x = Math.max(p.x, p.layer === 'surface' ? CAMP_EDGE_X : CAMP_TUNNEL_EDGE_X)
    // Rock walls close off both ends of a deep cavern; the ladders are the only ways out.
    if (p.layer === 'cavern' && this.cavern()!.walls) p.x = Math.max(CAVERN_WALL + 12, Math.min(WIDTH - CAVERN_WALL - 12, p.x))

    if (p.x > WIDTH + 10 || p.x < -10) {
      const east = p.x > WIDTH
      if (p.layer === 'cavern') {
        // The lost caverns lead on to the chamber under the next deep cavern, east or west.
        const columns = this.cavernScenes.length
        this.roomIndex = this.cavernScenes[wrap(this.cavernScenes.indexOf(this.roomIndex) + (east ? 1 : -1), columns)]!
      } else {
        const step = p.layer === 'tunnel' ? 3 : 1
        this.roomIndex = wrap(this.roomIndex + (east ? step : -step), 255)
        this.visited.add(this.roomIndex)
      }
      this.roomEnteredAt = this.elapsed; this.logContact = 0
      p.x = east ? 4 : WIDTH - 4
      this.particles = []
      if (p.layer === 'cavern') { this.cavernEntry = east ? CAVERN_WALL + 12 : WIDTH - CAVERN_WALL - 12; this.enterChamber() }
      else this.announce(this.room.name, 2)
    }

    if (p.layer === 'surface' && this.room.vine && !p.grounded && p.grabCooldown <= 0 && !input.down) {
      const end = this.vine()
      if (Math.hypot(p.x - end.x, p.y - 35 - end.y) < 34) {
        p.swinging = true; p.grabCooldown = 0.2; this.events.push('swing')
        this.announce('Swing to the bank. Press jump or down to let go.', 4)
        return
      }
    }

    if (p.layer === 'surface') {
      const hole = this.room.holes && HOLES.some(([left, right]) => p.x > left && p.x < right)
      const pit = this.pitBounds()
      const overPit = pit && p.x > pit.left + 4 && p.x < pit.right - 4
      let crocSupport = false
      if (this.room.pit === 'water') {
        for (const croc of this.crocodiles()) {
          // Only the head surfaces: jaws point left, with a small safe skull behind them.
          if (p.x > croc.x - 26 && p.x < croc.x + 16 && p.y >= GROUND - 5 && oldY <= GROUND + 8 && p.vy >= 0) {
            if (croc.open && p.x < croc.x - 2) { this.die('Watch those snapping jaws!'); return }
            crocSupport = true
          }
        }
      }
      if (p.y >= GROUND && p.vy >= 0) {
        if (hole) {
          p.layer = 'tunnel'; p.grounded = false; this.score = Math.max(0, this.score - 100)
          this.events.push('fall'); this.announce('A rough landing. −100 points.')
        } else if (overPit && !crocSupport) {
          if (p.y > GROUND + 12) { this.die(this.room.pit === 'water' ? 'The swamp claims another explorer.' : 'Caught in the pit. Try the vine!'); return }
          p.grounded = false
        } else {
          p.y = GROUND; p.vy = 0; p.grounded = true
        }
      }
      const log = p.y > GROUND - 20 ? this.logs().find(x => Math.abs(p.x - x) < 28) : undefined
      if (log !== undefined) {
        // A rolling log blocks the way: Harry can back off or jump, but not push through it.
        if ((p.x - oldX) * (log - oldX) > 0) p.x = oldX
        this.logContact += dt
        if (this.logContact >= 0.08) {
          this.score = Math.max(0, this.score - 5); this.logContact = 0; this.events.push('log')
        }
        p.x -= 50 * dt
      } else this.logContact = 0
      if (this.room.hazard && p.y > GROUND - 31 && Math.abs(p.x - this.room.hazardX) < HAZARD_REACH) {
        this.die(this.room.hazard === 'snake' ? (this.room.treasure ? 'A cobra was guarding that treasure.' : 'A cobra was waiting on the far bank.') : 'A little too close to the fire.'); return
      }
      if (this.room.treasure && !this.collected.has(this.roomIndex) && Math.abs(p.x - 480) < 30 && p.y > GROUND - 64) {
        this.collected.add(this.roomIndex)
        const value = TREASURE_VALUES[this.room.treasure]
        this.score += value; this.events.push('treasure'); this.announce(`Treasure found! +${value.toLocaleString()} points`, 4)
        for (let i = 0; i < 22; i++) this.particles.push({ x: 480, y: GROUND - 22, vx: Math.cos(i * 2.4) * (60 + i * 4), vy: -90 - (i % 6) * 30, life: 0.6 + (i % 4) * 0.2, color: i % 2 ? '#ffe69c' : '#f3b84c' })
        if (this.collected.size === 32) { this.status = 'won'; this.events.push('win') }
      }
    } else if (p.layer === 'tunnel') {
      if (p.y < TUNNEL_TOP + PLAYER_HEIGHT && p.vy < 0) { p.y = TUNNEL_TOP + PLAYER_HEIGHT; p.vy = 0 }
      const pit = this.room.tunnelPit, overPit = (x: number) => pit !== null && Math.abs(x - pit) < TUNNEL_PIT_HALF - 4
      // As in the cavern chasm, once Harry has dropped below the floor he can't step back onto it.
      if (p.y > UNDERGROUND + 6 && overPit(oldX) && !overPit(p.x)) p.x = oldX
      if (p.y >= UNDERGROUND && overPit(p.x)) {
        p.grounded = false
        if (p.y > UNDERGROUND + 30) { p.inChasm = true; this.die('That pit in the tunnel floor has no bottom.') }
      } else if (p.y >= UNDERGROUND) { p.y = UNDERGROUND; p.vy = 0; p.grounded = true }
      if (!this.room.ladder && p.y > UNDERGROUND - 23 && Math.abs(p.x - this.scorpionX()) < 26) this.die('Mind the scorpions in the tunnels.')
    } else {
      const c = this.cavern()!
      const inside = (g: Span) => (x: number) => x > g.left + 4 && x < g.right - 4
      const gap = (x: number) => c.rivers.some(r => inside(r)(x)) ? 'river' : c.chasms.some(g => inside(g)(x)) ? 'chasm' : null
      // Once Harry drops below the ledge tops, the cliff faces stop him climbing back onto them.
      if (p.y > CAVERN_FLOOR + 6 && gap(oldX) && !gap(p.x)) p.x = oldX
      const under = gap(p.x)
      if (p.y >= CAVERN_FLOOR && p.vy >= 0) {
        if (!under) { p.y = CAVERN_FLOOR; p.vy = 0; p.grounded = true }
        else {
          p.grounded = false
          if (under === 'river' && p.y >= WATER_SURFACE) {
            p.swimming = true; p.y = Math.max(p.y, WATER_SURFACE + 5); p.vy *= 0.3; p.vx *= 0.5
            this.events.push('splash')
          } else if (under === 'chasm' && p.y > CAVERN_FLOOR + 36) { p.inChasm = true; this.die('The chasm has no bottom.') }
        }
      }
      if (this.deathTimer > 0) return
      if (p.invulnerable <= 0 && this.bats().some(b => Math.abs(p.x - b.x) < BAT_REACH.x && b.y + BAT_REACH.y > p.y - PLAYER_HEIGHT && b.y - BAT_REACH.y < p.y)) {
        this.events.push('screech'); this.die('A bat swooped out of the dark. They fly high at the ends of their swing.')
        return
      }
      if (p.invulnerable <= 0 && p.y > CAVERN_FLOOR - RAT_HEIGHT && p.y <= CAVERN_FLOOR && this.rats().some(r => Math.abs(p.x - r.x) < RAT_REACH)) {
        this.events.push('squeak'); this.die('Bitten! Jump the cave rats as they scurry past.')
        return
      }
      if (c.relic && c.relic.y === CAVERN_FLOOR && Math.abs(p.x - c.relic.x) < 24 && p.y > CAVERN_FLOOR - 64) this.takeRelic(c)
    }
  }

  // Harry has come into a cavern chamber; it's marked on the map, and its name announced.
  enterChamber() {
    const c = this.cavern()!, first = !this.chambersFound.has(c.id)
    this.roomEnteredAt = this.elapsed
    const lost = c.depth > 0 && ![...this.chambersFound].some(id => this.chambers[id]!.depth > 0)
    this.chambersFound.add(c.id)
    if (!c.depth) {
      if (this.cavernsFound.has(this.roomIndex)) return
      this.cavernsFound.add(this.roomIndex)
      this.announce(c.relic ? 'A hidden cavern! Somewhere down here lies a golden idol.' : 'A hidden cavern! Explore the river and chasm, or take the ladder deeper.', 4)
    } else if (lost) this.announce('The lost caverns! They run on east and west beneath the whole jungle.', 4)
    else this.announce(first ? `${c.name}: a new chamber.` : c.name, 2)
  }

  // In the river: arrows (or holding jump) swim, Harry floats up when left alone, and a jump at the
  // surface kicks him clear of the water. Swimming into a bank at the surface climbs out.
  swim(dt: number, input: Input, jump: boolean, direction: number) {
    const p = this.player, c = this.cavern()!
    const river = c.rivers.find(r => p.x >= r.left && p.x <= r.right) ?? c.rivers[0]!
    // Harry's body is about 44px long, so his middle stays half that from either bank.
    const top = WATER_SURFACE + 5, bottom = RIVER_BED - 8, left = river.left + SWIM_MARGIN, right = river.right - SWIM_MARGIN
    if (jump && p.y < top + 6) {
      p.swimming = false; p.y = WATER_SURFACE - 1; p.vy = -420; this.events.push('jump')
      return
    }
    p.vx += (direction * SWIM_SPEED - p.vx) * Math.min(1, dt * 8)
    p.vy += ((input.up || input.jump ? -SWIM_SPEED : input.down ? SWIM_SPEED : -SWIM_FLOAT) - p.vy) * Math.min(1, dt * 6)
    p.x = Math.max(left, Math.min(right, p.x + p.vx * dt))
    p.y = Math.max(top, Math.min(bottom, p.y + p.vy * dt))
    if (p.y < top + 10 && ((direction < 0 && p.x === left) || (direction > 0 && p.x === right))) {
      p.swimming = false; p.grounded = true; p.y = CAVERN_FLOOR; p.vx = 0; p.vy = 0
      p.x = direction < 0 ? river.left - 2 : river.right + 2
      return
    }
    // Harry's head is above water while he floats at the surface.
    if (p.y > top + 4) {
      const before = p.breath
      p.breath = Math.max(0, p.breath - dt)
      if (before > LOW_BREATH && p.breath <= LOW_BREATH) { this.events.push('air'); this.announce('Running out of air! Swim up ↑', 2) }
      if (p.breath <= 0) { this.die('Out of air. Surface before the bubbles run out.'); return }
    } else p.breath = Math.min(BREATH, p.breath + dt * 3)
    if (p.invulnerable <= 0 && this.eels().some(e => Math.abs(p.x - e.x) < EEL_REACH.x && Math.abs(p.y - e.y) < EEL_REACH.y)) {
      this.events.push('zap'); this.die('Zap! Electric eels guard this river.')
      return
    }
    if (c.relic && c.relic.y === RIVER_BED && Math.abs(p.x - c.relic.x) < 24 && p.y > RIVER_BED - 26) this.takeRelic(c)
  }

  takeRelic(c: Chamber) {
    if (!c.relic || this.relics.has(c.id)) return
    this.relics.add(c.id)
    const { kind, x, y } = c.relic, value = RELIC_VALUES[kind]
    const name = { idol: 'A golden idol', emerald: 'An emerald', mask: 'A jade mask', skull: 'The crystal skull' }[kind]
    this.score += value; this.events.push('treasure'); this.announce(`${name}! +${value.toLocaleString()} points`, 4)
    for (let i = 0; i < 22; i++) this.particles.push({ x, y: y - (y === RIVER_BED ? 14 : 22), vx: Math.cos(i * 2.4) * (60 + i * 4), vy: -90 - (i % 6) * 30, life: 0.6 + (i % 4) * 0.2, color: i % 2 ? '#ffe69c' : '#f3b84c' })
  }

  die(reason: string) {
    if (this.deathTimer > 0 || this.player.invulnerable > 0) return
    this.lives--; this.deathTimer = 1.25
    this.player.swinging = false; this.player.vx = 0
    this.events.push('hurt'); this.announce(reason, 4)
  }
}
