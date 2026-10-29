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
// Some ladder scenes have a narrow, bottomless pit in the tunnel floor, centred here, to jump.
export const TUNNEL_PIT_HALF = 30
export const TUNNEL_PIT_SPOTS = [170, 810] as const
export const EEL_LANES = [WATER_SURFACE + 16, RIVER_BED - 22] as const
export const EEL_REACH = { x: 30, y: 13 } as const
// Each cavern hides a golden idol: bonus loot on top of the 32 treasures needed to win.
export const IDOL_VALUE = 6000

export type Treasure = keyof typeof TREASURE_VALUES
export type Loot = Treasure | 'idol'
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
export type GameEvent = 'jump' | 'swing' | 'treasure' | 'hurt' | 'fall' | 'log' | 'win' | 'tent' | 'splash' | 'zap' | 'air'
export type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string }
export const atTentDoor = (roomIndex: number, p: Player) => roomIndex === 0 && p.layer === 'surface' && p.grounded && !p.climbing && Math.abs(p.x - TENT_DOOR_X) < TENT_DOOR_REACH
export const wrap = (n: number, max: number) => ((n % max) + max) % max

// A maximal eight-bit feedback sequence makes a stable, circular 255-scene jungle.
// The layout is a new arrangement; no cartridge code or assets are used.
export function createWorld(): Room[] {
  let seed = 1
  let treasureIndex = 0
  let cavernIndex = 0
  const kinds = ['Jungle trail', 'Hidden passages', 'Tar pit', 'Crocodile crossing', 'Shifting sands', 'Lost treasure', 'Sinking ground', 'Vine valley']
  const treasures: Treasure[] = ['gold', 'bag', 'silver', 'ring']
  return Array.from({ length: 255 }, (_, id) => {
    const kind = (seed >> 3) & 7
    const room: Room = {
      id, seed, kind, name: kinds[kind]!, ladder: kind < 2, holes: kind === 1,
      pit: kind === 2 ? 'tar' : kind === 3 ? 'water' : kind === 4 || kind === 7 ? 'sand' : kind === 6 ? 'tar' : null,
      shifting: kind === 4 || kind === 6,
      vine: kind === 2 || kind === 7 || (kind === 3 && (seed & 1) === 1),
      logs: kind < 2 ? 1 + ((seed >> 6) % 3) : 0,
      hazard: null, hazardX: 720,
      treasure: kind === 5 ? treasures[treasureIndex++ % 4]! : null,
      wall: kind < 2 && (seed & 3) === 0,
      // Eight tunnels without a surface ladder have a cavern below; the idol alternates between
      // the riverbed and the pillar in the chasm.
      cavern: kind >= 2 && (seed & 31) === 17 ? { flip: ((seed >> 5) & 1) === 1, idol: cavernIndex++ % 2 ? 'pillar' : 'river' } : null,
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

export class PitfallEngine {
  // The tent's games table; the running tally lasts for the whole expedition.
  tent = new TicTacToe()
  rooms = createWorld()
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
  idols = new Set<number>()
  // The cavern ladder Harry last climbed down; he gets another go from there after a fall.
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
    this.idols = new Set()
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

  // The current scene's cavern in screen coordinates, mirrored when the scene calls for it.
  cavern() {
    const c = this.room.cavern
    if (!c) return null
    const span = ([a, b]: readonly [number, number]) => c.flip ? { left: WIDTH - b, right: WIDTH - a } : { left: a, right: b }
    const river = span(RIVER), pillar = span([CHASMS[0][1], CHASMS[1][0]])
    return {
      ladders: CAVERN_LADDERS.map(x => c.flip ? WIDTH - x : x), river, chasms: CHASMS.map(span), pillar,
      idol: c.idol === 'river' ? { x: (river.left + river.right) / 2, y: RIVER_BED } : { x: (pillar.left + pillar.right) / 2, y: CAVERN_FLOOR },
    }
  }

  ladders(): Ladder[] {
    const list: Ladder[] = this.room.ladder ? [{ x: 480, top: GROUND, bottom: UNDERGROUND, upper: 'surface', lower: 'tunnel' }] : []
    for (const x of this.cavern()?.ladders ?? []) list.push({ x, top: UNDERGROUND, bottom: CAVERN_FLOOR, upper: 'tunnel', lower: 'cavern' })
    return list
  }

  // Two eels sweep back and forth across the river: one just under the surface and one along the
  // bed, guarding a riverbed idol. Between their lanes is a narrow band of safe water. They turn back
  // before the water by either bank, so Harry can always slip in and climb out there.
  eels(time = this.elapsed) {
    const c = this.cavern()
    if (!c) return []
    const middle = (c.river.left + c.river.right) / 2, reach = (c.river.right - c.river.left) / 2 - 54
    const pace = 1 + ((this.room.seed >> 2) & 3) * 0.08
    return [[0.8, EEL_LANES[0], 0], [1.1, EEL_LANES[1], 2.1]].map(([speed, lane, phase], i) => {
      const a = time * speed! * pace + phase! + this.room.seed
      return { x: middle + Math.sin(a) * reach, y: lane! + Math.sin(time * 1.7 + i * 2 + this.room.seed) * 4, facing: Math.cos(a) >= 0 ? 1 : -1 }
    })
  }

  // How far the view scrolls down: 0 shows the jungle and tunnel, CAVERN_VIEW shows the cavern.
  // On a cavern ladder the view follows Harry down the shaft.
  viewY() {
    const p = this.player
    if (!this.room.cavern) return 0
    if (p.climbing && p.y > UNDERGROUND) return Math.min(CAVERN_VIEW, Math.max(0, p.y - 420))
    return p.layer === 'cavern' ? CAVERN_VIEW : 0
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
          // Back on the ledge at the foot of the ladder Harry came down.
          const ladders = this.cavern()!.ladders
          this.player = this.newPlayer(ladders.includes(this.cavernEntry) ? this.cavernEntry : ladders[0]!, 1.5)
          this.player.layer = 'cavern'; this.player.y = CAVERN_FLOOR
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
    const grab = !p.climbing && p.grounded ? ladders.find(l => Math.abs(p.x - l.x) < 24 && ((input.down && p.layer === l.upper) || (input.up && p.layer === l.lower))) : undefined
    if (grab) { p.climbing = true; p.x = grab.x; p.vx = 0; p.vy = 0; p.grounded = false }
    const ladder = p.climbing ? ladders.find(l => l.x === p.x) : undefined
    if (ladder) {
      p.y += (Number(input.down) - Number(input.up)) * 150 * dt
      if (p.y <= ladder.top) { p.y = ladder.top; p.layer = ladder.upper; p.climbing = false; p.grounded = true }
      if (p.y >= ladder.bottom) {
        p.y = ladder.bottom; p.layer = ladder.lower; p.climbing = false; p.grounded = true
        if (ladder.lower === 'cavern') this.reachCavern(ladder.x)
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
    if (p.layer === 'tunnel' && this.room.wall && p.x > 678 && p.x < 720) p.x = oldX < 699 ? 678 : 720

    if (this.roomIndex === 0) p.x = Math.max(p.x, p.layer === 'surface' ? CAMP_EDGE_X : CAMP_TUNNEL_EDGE_X)
    // Rock walls close off both ends of a cavern; the ladders are the only ways out.
    if (p.layer === 'cavern') p.x = Math.max(CAVERN_WALL + 12, Math.min(WIDTH - CAVERN_WALL - 12, p.x))

    if (p.x > WIDTH + 10 || p.x < -10) {
      const step = p.layer === 'tunnel' ? 3 : 1
      this.roomIndex = wrap(this.roomIndex + (p.x > WIDTH ? step : -step), 255)
      this.roomEnteredAt = this.elapsed; this.logContact = 0
      p.x = p.x > WIDTH ? 4 : WIDTH - 4
      this.visited.add(this.roomIndex)
      this.particles = []
      this.announce(this.room.name, 2)
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
      const hole = this.room.holes && ((p.x > 248 && p.x < 304) || (p.x > 656 && p.x < 712))
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
      const gap = (x: number) => x > c.river.left + 4 && x < c.river.right - 4 ? 'river' : c.chasms.some(g => x > g.left + 4 && x < g.right - 4) ? 'chasm' : null
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
      if (this.room.cavern!.idol === 'pillar' && Math.abs(p.x - c.idol.x) < 24 && p.y > CAVERN_FLOOR - 64) this.takeIdol(c.idol.x, CAVERN_FLOOR - 22)
    }
  }

  reachCavern(x: number) {
    this.cavernEntry = x
    if (this.cavernsFound.has(this.roomIndex)) return
    this.cavernsFound.add(this.roomIndex)
    this.announce('A hidden cavern! Somewhere down here lies a golden idol.', 4)
  }

  // In the river: arrows (or holding jump) swim, Harry floats up when left alone, and a jump at the
  // surface kicks him clear of the water. Swimming into a bank at the surface climbs out.
  swim(dt: number, input: Input, jump: boolean, direction: number) {
    const p = this.player, c = this.cavern()!
    // Harry's body is about 44px long, so his middle stays half that from either bank.
    const top = WATER_SURFACE + 5, bottom = RIVER_BED - 8, left = c.river.left + SWIM_MARGIN, right = c.river.right - SWIM_MARGIN
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
      p.x = direction < 0 ? c.river.left - 2 : c.river.right + 2
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
    if (this.room.cavern!.idol === 'river' && Math.abs(p.x - c.idol.x) < 24 && p.y > RIVER_BED - 26) this.takeIdol(c.idol.x, RIVER_BED - 14)
  }

  takeIdol(x: number, y: number) {
    if (this.idols.has(this.roomIndex)) return
    this.idols.add(this.roomIndex)
    this.score += IDOL_VALUE; this.events.push('treasure'); this.announce(`A golden idol! +${IDOL_VALUE.toLocaleString()} points`, 4)
    for (let i = 0; i < 22; i++) this.particles.push({ x, y, vx: Math.cos(i * 2.4) * (60 + i * 4), vy: -90 - (i % 6) * 30, life: 0.6 + (i % 4) * 0.2, color: i % 2 ? '#ffe69c' : '#f3b84c' })
  }

  die(reason: string) {
    if (this.deathTimer > 0 || this.player.invulnerable > 0) return
    this.lives--; this.deathTimer = 1.25
    this.player.swinging = false; this.player.vx = 0
    this.events.push('hurt'); this.announce(reason, 4)
  }
}
