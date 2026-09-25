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

export type Treasure = keyof typeof TREASURE_VALUES
export type Status = 'ready' | 'playing' | 'paused' | 'over' | 'won' | 'tent'
export type Input = { left: boolean; right: boolean; up: boolean; down: boolean; jump: boolean }
export const emptyInput = (): Input => ({ left: false, right: false, up: false, down: false, jump: false })
export type Room = {
  id: number; seed: number; kind: number; name: string; ladder: boolean
  holes: boolean; pit: 'tar' | 'water' | 'sand' | null; shifting: boolean
  vine: boolean; logs: number; hazard: 'fire' | 'snake' | null; hazardX: number
  treasure: Treasure | null; wall: boolean
}
export type Player = {
  x: number; y: number; vx: number; vy: number; facing: number
  grounded: boolean; layer: 'surface' | 'tunnel'; climbing: boolean
  swinging: boolean; invulnerable: number; grabCooldown: number
}
export type GameEvent = 'jump' | 'swing' | 'treasure' | 'hurt' | 'fall' | 'log' | 'win' | 'tent'
export type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string }
export const atTentDoor = (roomIndex: number, p: Player) => roomIndex === 0 && p.layer === 'surface' && p.grounded && !p.climbing && Math.abs(p.x - TENT_DOOR_X) < TENT_DOOR_REACH
export const wrap = (n: number, max: number) => ((n % max) + max) % max

// A maximal eight-bit feedback sequence makes a stable, circular 255-scene jungle.
// The layout is a new arrangement; no cartridge code or assets are used.
export function createWorld(): Room[] {
  let seed = 1
  let treasureIndex = 0
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
    return { x, y: GROUND, vx: 0, vy: 0, facing: 1, grounded: true, layer: 'surface', climbing: false, swinging: false, invulnerable, grabCooldown: 0 }
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
      if (this.deathTimer <= 0) {
        if (this.lives <= 0) this.status = 'over'
        else { this.player = this.newPlayer(this.roomIndex === 0 ? CAMP_START_X : 108, 1.5); this.player.y = 90; this.player.grounded = false }
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

    if (this.room.ladder && Math.abs(p.x - 480) < 24 && !p.climbing && p.grounded && ((input.down && p.layer === 'surface') || (input.up && p.layer === 'tunnel'))) {
      p.climbing = true; p.x = 480; p.vx = 0; p.vy = 0; p.grounded = false
    }
    if (p.climbing) {
      p.y += (Number(input.down) - Number(input.up)) * 150 * dt
      if (p.y <= GROUND) { p.y = GROUND; p.layer = 'surface'; p.climbing = false; p.grounded = true }
      if (p.y >= UNDERGROUND) { p.y = UNDERGROUND; p.layer = 'tunnel'; p.climbing = false; p.grounded = true }
      return
    }

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
    } else {
      if (p.y < TUNNEL_TOP + PLAYER_HEIGHT && p.vy < 0) { p.y = TUNNEL_TOP + PLAYER_HEIGHT; p.vy = 0 }
      if (p.y >= UNDERGROUND) { p.y = UNDERGROUND; p.vy = 0; p.grounded = true }
      if (!this.room.ladder && p.y > UNDERGROUND - 23 && Math.abs(p.x - this.scorpionX()) < 26) this.die('Mind the scorpions in the tunnels.')
    }
  }

  die(reason: string) {
    if (this.deathTimer > 0 || this.player.invulnerable > 0) return
    this.lives--; this.deathTimer = 1.25
    this.player.swinging = false; this.player.vx = 0
    this.events.push('hurt'); this.announce(reason, 4)
  }
}
