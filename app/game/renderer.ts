import { BREATH, CAVERN_FLOOR, CAVERN_TOP, CAVERN_VIEW, CAVERN_WALL, CHAMBER_DEPTH, GROUND, HEIGHT, HOLES, LOST_CAVERNS, LOW_BREATH, PIT_HALF_WIDTH, PitfallEngine, RIVER_BED, TUNNEL_PIT_HALF, TUNNEL_TOP, UNDERGROUND, VINE_PIVOT_Y, WALL, WATER_SURFACE, WIDTH, type Chamber, type Loot } from './engine'

// The tic-tac-toe board on the tent's table, in canvas coordinates (the page overlays its buttons here).
export const BOARD = { x: 330, y: 90, cell: 100 } as const
const TAU = Math.PI * 2
const noise = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x) }

// Treasure sprites, centred on (x, y). The field notes draw their treasure icons with this too.
export function drawTreasure(ctx: CanvasRenderingContext2D, kind: Loot, x: number, y: number) {
  ctx.save(); ctx.translate(x, y)
  if (kind === 'idol') {
    // A squat golden idol on a stepped base, with gem eyes and a crested headdress.
    ctx.fillStyle = '#8f6420'; ctx.fillRect(-14, 12, 28, 5); ctx.fillStyle = '#a8792b'; ctx.fillRect(-11, 8, 22, 5)
    ctx.fillStyle = '#c89436'; ctx.beginPath(); ctx.ellipse(0, 2, 10, 8, 0, 0, TAU); ctx.fill()
    ctx.fillStyle = '#e5ad43'; ctx.beginPath(); ctx.ellipse(-8, 3, 3, 5, 0.3, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(8, 3, 3, 5, -0.3, 0, TAU); ctx.fill()
    ctx.fillStyle = '#efcc68'; ctx.beginPath(); ctx.roundRect(-10, -18, 20, 16, 5); ctx.fill()
    ctx.fillStyle = '#bf882e'; ctx.beginPath(); ctx.moveTo(-12, -16); ctx.lineTo(-7, -25); ctx.lineTo(0, -19); ctx.lineTo(7, -25); ctx.lineTo(12, -16); ctx.closePath(); ctx.fill()
    ctx.fillStyle = '#4fc3a8'; ctx.fillRect(-6, -13, 4, 3); ctx.fillRect(2, -13, 4, 3)
    ctx.fillStyle = '#8f6420'; ctx.fillRect(-4, -7, 8, 2)
    ctx.fillStyle = '#fff0b0'; ctx.fillRect(-8, -16, 3, 6)
  } else if (kind === 'emerald') {
    // A cut emerald: a faceted crown and a pavilion tapering to a point, with a bright table.
    const facet = (color: string, points: number[]) => { ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(points[0]!, points[1]!); for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i]!, points[i + 1]!); ctx.closePath(); ctx.fill() }
    facet('#0f3d28', [-18, -4, -10, -15, 10, -15, 18, -4, 0, 17])
    facet('#48c27f', [-16, -4, -5, -4, 0, 14]); facet('#239058', [16, -4, 5, -4, 0, 14]); facet('#2f9a63', [-5, -4, 5, -4, 0, 14])
    facet('#7fe0a8', [-16, -4, -9, -13, -5, -4]); facet('#2f9a63', [16, -4, 9, -13, 5, -4]); facet('#5fd193', [-9, -13, 9, -13, 5, -4, -5, -4])
    ctx.fillStyle = '#e6fff0'; ctx.fillRect(-6, -11, 5, 2); ctx.fillRect(-11, -4, 3, 6)
  } else if (kind === 'mask') {
    // A jade mask: a broad face with inlaid eyes, a carved nose and mouth, gold ear spools and a brow band.
    for (const side of [-1, 1]) {
      ctx.fillStyle = '#8f6420'; ctx.beginPath(); ctx.arc(side * 16, 0, 5.5, 0, TAU); ctx.fill()
      ctx.fillStyle = '#e5ad43'; ctx.beginPath(); ctx.arc(side * 16, -0.5, 4.2, 0, TAU); ctx.fill()
      ctx.fillStyle = '#5a3d14'; ctx.beginPath(); ctx.arc(side * 16, -0.5, 1.6, 0, TAU); ctx.fill()
    }
    ctx.fillStyle = '#1f4f3e'; ctx.beginPath(); ctx.moveTo(-14, -15); ctx.lineTo(14, -15); ctx.quadraticCurveTo(15, 10, 0, 18); ctx.quadraticCurveTo(-15, 10, -14, -15); ctx.fill()
    ctx.fillStyle = '#3f9a7a'; ctx.beginPath(); ctx.moveTo(-12.5, -13.5); ctx.lineTo(12.5, -13.5); ctx.quadraticCurveTo(13.5, 9, 0, 16.5); ctx.quadraticCurveTo(-13.5, 9, -12.5, -13.5); ctx.fill()
    ctx.fillStyle = '#5cb895'; ctx.fillRect(-12.5, -13.5, 25, 5); ctx.fillStyle = '#8fdcbb'; ctx.fillRect(-10, -12.5, 7, 2)
    for (const side of [-1, 1]) {
      ctx.fillStyle = '#eef6e6'; ctx.beginPath(); ctx.ellipse(side * 5.5, -4, 3.6, 2.2, 0, 0, TAU); ctx.fill()
      ctx.fillStyle = '#13261f'; ctx.beginPath(); ctx.arc(side * 5.5, -4, 1.4, 0, TAU); ctx.fill()
    }
    ctx.fillStyle = '#2b7259'; ctx.beginPath(); ctx.moveTo(-1.5, -3); ctx.lineTo(1.5, -3); ctx.lineTo(3.5, 4); ctx.lineTo(-3.5, 4); ctx.fill()
    ctx.fillStyle = '#13261f'; ctx.beginPath(); ctx.ellipse(0, 9, 5, 2, 0, 0, TAU); ctx.fill()
    ctx.fillStyle = '#eef6e6'; for (const dx of [-3, -1, 1]) ctx.fillRect(dx, 7.6, 1.4, 1.4)
  } else if (kind === 'skull') {
    // The crystal skull: clear quartz with a cold blue light inside and facets catching the glow.
    ctx.fillStyle = '#7fb2c899'; ctx.beginPath(); ctx.ellipse(0, -5, 14, 13, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.roundRect(-10, 1, 20, 14, 5); ctx.fill()
    ctx.fillStyle = '#d4eef7dd'; ctx.beginPath(); ctx.ellipse(0, -5, 12.5, 11.5, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.roundRect(-8.5, 2, 17, 12, 4); ctx.fill()
    ctx.fillStyle = '#3f6f8a'; ctx.beginPath(); ctx.ellipse(-5, -2, 4.2, 3.8, 0.2, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(5, -2, 4.2, 3.8, -0.2, 0, TAU); ctx.fill()
    ctx.fillStyle = '#9fe6ff'; ctx.beginPath(); ctx.arc(-5, -2, 1.5, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(5, -2, 1.5, 0, TAU); ctx.fill()
    ctx.fillStyle = '#5d8ea6'; ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(-2, 6); ctx.lineTo(2, 6); ctx.fill()
    ctx.strokeStyle = '#6f9fb6'; ctx.lineWidth = 1; ctx.beginPath()
    for (const dx of [-6, -3, 0, 3, 6]) { ctx.moveTo(dx, 9); ctx.lineTo(dx, 13) }
    ctx.moveTo(-8, 9); ctx.lineTo(8, 9); ctx.stroke()
    ctx.strokeStyle = '#ffffffaa'; ctx.beginPath(); ctx.moveTo(-9, -12); ctx.quadraticCurveTo(-3, -16, 3, -15); ctx.moveTo(8, -9); ctx.lineTo(11, -4); ctx.stroke()
  } else if (kind === 'gold' || kind === 'silver') {
    ctx.fillStyle = kind === 'gold' ? '#bf882e' : '#82928d'; ctx.beginPath(); ctx.moveTo(-23, 10); ctx.lineTo(-16, -7); ctx.lineTo(16, -7); ctx.lineTo(23, 10); ctx.fill()
    ctx.fillStyle = kind === 'gold' ? '#efcc68' : '#dbe0cb'; ctx.beginPath(); ctx.moveTo(-16, -7); ctx.lineTo(16, -7); ctx.lineTo(13, 0); ctx.lineTo(-19, 0); ctx.fill()
    ctx.fillStyle = kind === 'gold' ? '#e5ad43' : '#aabfb5'; ctx.fillRect(-19, 1, 34, 9)
  } else if (kind === 'bag') {
    ctx.fillStyle = '#d5b373'; ctx.beginPath(); ctx.moveTo(-9, -17); ctx.lineTo(9, -17); ctx.lineTo(5, -6); ctx.bezierCurveTo(29, 18, -28, 18, -5, -6); ctx.fill()
    ctx.strokeStyle = '#765637'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-7, -5); ctx.lineTo(8, -5); ctx.stroke()
    ctx.fillStyle = '#806435'; ctx.font = 'bold 15px serif'; ctx.textAlign = 'center'; ctx.fillText('$', 0, 9)
  } else {
    ctx.strokeStyle = '#e6b54d'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(0, 3, 11, 12, 0, 0, TAU); ctx.stroke()
    ctx.fillStyle = '#d8f2df'; ctx.beginPath(); ctx.moveTo(-13, -13); ctx.lineTo(-7, -21); ctx.lineTo(7, -21); ctx.lineTo(13, -13); ctx.lineTo(0, -2); ctx.fill()
    ctx.strokeStyle = '#8db5a1'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-13, -13); ctx.lineTo(13, -13); ctx.moveTo(-7, -21); ctx.lineTo(0, -2); ctx.lineTo(7, -21); ctx.stroke()
  }
  ctx.restore()
}

export class JungleRenderer {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  backdrop: HTMLCanvasElement
  backdropSeed = -1
  reducedMotion = false
  // How far the view is scrolled down, easing toward the engine's viewY().
  camera = 0
  lastClock = 0

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.backdrop = document.createElement('canvas')
    this.resize()
  }

  resize() {
    const scale = Math.min(window.devicePixelRatio || 1, 2)
    this.canvas.width = WIDTH * scale; this.canvas.height = HEIGHT * scale
    this.backdrop.width = this.canvas.width; this.backdrop.height = this.canvas.height
    this.backdropSeed = -1
  }

  draw(game: PitfallEngine, clock: number) {
    const ctx = this.ctx
    const scale = this.canvas.width / WIDTH
    ctx.setTransform(scale, 0, 0, scale, 0, 0)
    ctx.clearRect(0, 0, WIDTH, HEIGHT)
    const time = this.reducedMotion ? 0 : clock
    // The view glides down into a cavern and back up; reduced motion jumps straight there, and so does a
    // jump of more than a screen, such as a new expedition starting from deep in the caverns.
    const target = game.status === 'tent' ? 0 : game.viewY()
    const ease = 1 - Math.exp(-Math.max(0, Math.min(0.1, clock - this.lastClock)) * 8)
    this.camera = this.reducedMotion || Math.abs(target - this.camera) < 0.5 || Math.abs(target - this.camera) > HEIGHT ? target : this.camera + (target - this.camera) * ease
    this.lastClock = clock
    if (game.status === 'tent') { this.tableTop(ctx, game, time); return }
    ctx.setTransform(scale, 0, 0, scale, 0, -Math.round(this.camera * scale))
    // The jungle scene reaches down to its deep cavern; each level of the lost caverns is a screen lower.
    // Harry's own level goes last, so he stays in sight on a ladder down into the level below.
    const levels = Array.from({ length: game.room.cavern ? LOST_CAVERNS.length + 1 : 1 }, (_, depth) => depth)
      .filter(depth => this.camera < CAVERN_VIEW + HEIGHT + depth * CHAMBER_DEPTH && (!depth || this.camera + HEIGHT > CAVERN_VIEW + depth * CHAMBER_DEPTH))
      .sort((a, b) => Number(a === game.depth) - Number(b === game.depth))
    for (const depth of levels) {
      if (!depth) { this.jungle(ctx, game, time); continue }
      ctx.save(); ctx.translate(0, depth * CHAMBER_DEPTH); this.chamber(ctx, game, game.cavern(depth)!, time); ctx.restore()
    }
    ctx.setTransform(scale, 0, 0, scale, 0, 0)
    this.vignette(ctx)
  }

  jungle(ctx: CanvasRenderingContext2D, game: PitfallEngine, time: number) {
    if (this.backdropSeed !== game.room.seed) {
      const scale = this.canvas.width / WIDTH
      const backdropContext = this.backdrop.getContext('2d')!
      backdropContext.setTransform(scale, 0, 0, scale, 0, 0)
      this.background(backdropContext, game)
      this.backdropSeed = game.room.seed
    }
    ctx.drawImage(this.backdrop, 0, 0, WIDTH, HEIGHT)
    this.motes(ctx, time)
    this.terrain(ctx, game, time)
    const cave = game.cavern(0)
    if (cave) this.chamberBack(ctx, game, cave, time)
    else if (this.camera > 0) { ctx.fillStyle = '#4a4232'; ctx.fillRect(0, HEIGHT, WIDTH, CAVERN_VIEW) }
    if (game.room.vine) {
      const end = game.vine()
      // The pivot is far above the screen; start drawing where the vine emerges from the canopy.
      const topY = 40, topX = 480 + (end.x - 480) * (topY - VINE_PIVOT_Y) / (end.y - VINE_PIVOT_Y)
      ctx.lineCap = 'round'; ctx.strokeStyle = '#41522b'; ctx.lineWidth = 6
      ctx.beginPath(); ctx.moveTo(topX, topY); ctx.lineTo(end.x, end.y); ctx.stroke()
      ctx.strokeStyle = '#b5b25f'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(topX - 1, topY); ctx.lineTo(end.x - 1, end.y); ctx.stroke()
      for (let i = 0; i < 5; i++) {
        const f = 0.18 + i * 0.14
        this.leaf(ctx, topX + (end.x - topX) * f, topY + (end.y - topY) * f, i % 2 ? 0.5 : 2.8, 10, '#84964a')
      }
    }
    if (game.roomIndex === 0) this.camp(ctx, time)
    for (const x of game.logs()) this.log(ctx, x, GROUND - 13, game.elapsed)
    if (game.room.hazard === 'fire') this.fire(ctx, game.room.hazardX, GROUND, time)
    if (game.room.hazard === 'snake') this.snake(ctx, game.room.hazardX, GROUND, time, -1)
    if (game.room.treasure && !game.collected.has(game.roomIndex)) {
      const bob = Math.sin(time * 3) * 3
      const glow = ctx.createRadialGradient(480, GROUND - 26, 0, 480, GROUND - 26, 56)
      glow.addColorStop(0, '#f5d47455'); glow.addColorStop(1, '#f5d47400')
      ctx.fillStyle = glow; ctx.fillRect(420, GROUND - 88, 120, 88)
      drawTreasure(ctx, game.room.treasure, 480, GROUND - 21 + bob)
      this.sparkle(ctx, 450, GROUND - 36 + bob, 4, '#ffeaaf')
      this.sparkle(ctx, 506, GROUND - 52 - bob, 3, '#ffeaaf')
    }
    if (!game.room.ladder) this.scorpion(ctx, game.scorpionX(), UNDERGROUND, time, game.scorpionFacing())
    if (!game.depth) this.harry(ctx, game)
    if (cave) this.chamberFront(ctx, game, cave, time)
    if (game.room.tunnelPit !== null) {
      const x = game.room.tunnelPit, dark = ctx.createLinearGradient(0, UNDERGROUND, 0, HEIGHT)
      dark.addColorStop(0, '#0b0f0c00'); dark.addColorStop(0.6, '#0b0f0c'); ctx.fillStyle = dark
      ctx.fillRect(x - TUNNEL_PIT_HALF, UNDERGROUND, TUNNEL_PIT_HALF * 2, HEIGHT - UNDERGROUND)
    }
    if (!game.depth) this.particles(ctx, game)
    this.foreground(ctx, time)
  }

  // A level of the lost caverns, with Harry in it when he's down there.
  chamber(ctx: CanvasRenderingContext2D, game: PitfallEngine, c: Chamber, time: number) {
    const here = game.depth === c.depth
    this.chamberBack(ctx, game, c, time)
    if (here) this.harry(ctx, game)
    this.chamberFront(ctx, game, c, time)
    if (here) this.particles(ctx, game)
  }

  // Harry blinks while a lost life plays out.
  harry(ctx: CanvasRenderingContext2D, game: PitfallEngine) {
    if (game.deathTimer <= 0 || Math.floor(game.deathTimer * 12) % 2 === 0) this.player(ctx, game)
  }

  particles(ctx: CanvasRenderingContext2D, game: PitfallEngine) {
    for (const p of game.particles) {
      ctx.globalAlpha = Math.min(1, p.life * 2); ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, 5, 5)
    }
    ctx.globalAlpha = 1
  }

  // Inside the tent, looking down on a camp table: canvas floor, a lantern, a map and a mug around
  // a tic-tac-toe board cut into the tabletop. Harry's marks are red Xs; the jungle's are stones.
  tableTop(ctx: CanvasRenderingContext2D, game: PitfallEngine, time: number) {
    const t = game.tent, { x: bx, y: by, cell } = BOARD, size = cell * 3
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    ctx.fillStyle = '#9d8a5c'; ctx.fillRect(0, 0, WIDTH, HEIGHT)
    ctx.strokeStyle = '#85744c'; ctx.lineWidth = 2
    for (let x = 40; x < WIDTH; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, HEIGHT); ctx.stroke() }
    // Table: shadow, planks with grain, and a darker rim.
    ctx.fillStyle = '#1f201440'; ctx.fillRect(196, 36, 588, 428)
    ctx.fillStyle = '#7d5d34'; ctx.fillRect(180, 20, 600, 430)
    for (let i = 0; i < 6; i++) {
      const y = 28 + i * 70
      ctx.fillStyle = i % 2 ? '#98804e' : '#a0854f'; ctx.fillRect(188, y, 584, 66)
      ctx.strokeStyle = '#7d5d3455'; ctx.lineWidth = 1.5
      for (let j = 0; j < 3; j++) { const gy = y + 14 + j * 18 + noise(i * 7 + j) * 6; ctx.beginPath(); ctx.moveTo(188, gy); ctx.bezierCurveTo(360, gy - 5, 560, gy + 6, 772, gy - 2); ctx.stroke() }
    }
    // Lantern from above: a warm pool of light, brass ring and glass chimney.
    const flicker = Math.sin(time * 9) * 0.03
    const glow = ctx.createRadialGradient(250, 90, 0, 250, 90, 190)
    glow.addColorStop(0, `rgba(255, 205, 120, ${0.38 + flicker})`); glow.addColorStop(1, 'rgba(255, 205, 120, 0)')
    ctx.fillStyle = glow; ctx.fillRect(60, 0, 380, 290)
    ctx.fillStyle = '#6e6a5f'; ctx.beginPath(); ctx.arc(250, 90, 30, 0, TAU); ctx.fill()
    ctx.fillStyle = '#bf882e'; ctx.beginPath(); ctx.arc(250, 90, 24, 0, TAU); ctx.fill()
    ctx.fillStyle = '#f5d474'; ctx.beginPath(); ctx.arc(250, 90, 14, 0, TAU); ctx.fill()
    ctx.fillStyle = '#ffeaaf'; ctx.beginPath(); ctx.arc(250, 90, 6 + flicker * 40, 0, TAU); ctx.fill()
    // Folded trail map, then a compass.
    ctx.save(); ctx.translate(705, 130); ctx.rotate(0.18)
    ctx.fillStyle = '#e8dcb0'; ctx.fillRect(-52, -70, 104, 140)
    ctx.strokeStyle = '#b3a476'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, -70); ctx.lineTo(0, 70); ctx.moveTo(-52, 0); ctx.lineTo(52, 0); ctx.stroke()
    ctx.strokeStyle = '#8f3a2b'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(-38, 52); ctx.bezierCurveTo(-10, 20, 30, 30, 20, -20); ctx.lineTo(34, -50); ctx.stroke(); ctx.setLineDash([])
    ctx.strokeStyle = '#b8553a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(28, -56); ctx.lineTo(40, -44); ctx.moveTo(40, -56); ctx.lineTo(28, -44); ctx.stroke()
    ctx.restore()
    ctx.fillStyle = '#5b4527'; ctx.beginPath(); ctx.arc(700, 360, 26, 0, TAU); ctx.fill()
    ctx.fillStyle = '#dbe0cb'; ctx.beginPath(); ctx.arc(700, 360, 20, 0, TAU); ctx.fill()
    ctx.fillStyle = '#b8553a'; ctx.beginPath(); ctx.moveTo(700, 343); ctx.lineTo(705, 360); ctx.lineTo(695, 360); ctx.fill()
    ctx.fillStyle = '#34271d'; ctx.beginPath(); ctx.moveTo(700, 377); ctx.lineTo(705, 360); ctx.lineTo(695, 360); ctx.fill()
    // Tin mug of coffee.
    ctx.fillStyle = '#96927f'; ctx.fillRect(268, 372, 14, 8)
    ctx.fillStyle = '#cbc4a4'; ctx.beginPath(); ctx.arc(250, 376, 22, 0, TAU); ctx.fill()
    ctx.fillStyle = '#493f2d'; ctx.beginPath(); ctx.arc(250, 376, 16, 0, TAU); ctx.fill()
    // The board: an inset panel and grooves, then the cursor, marks and winning line.
    ctx.fillStyle = '#5a4124'; ctx.fillRect(bx - 18, by - 18, size + 36, size + 36)
    ctx.fillStyle = '#d1b05a'; ctx.fillRect(bx - 12, by - 12, size + 24, size + 24)
    ctx.strokeStyle = '#65502b'; ctx.lineWidth = 8
    for (let i = 1; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(bx + i * cell, by + 8); ctx.lineTo(bx + i * cell, by + size - 8)
      ctx.moveTo(bx + 8, by + i * cell); ctx.lineTo(bx + size - 8, by + i * cell); ctx.stroke()
    }
    const centre = (i: number) => [bx + (i % 3) * cell + cell / 2, by + Math.floor(i / 3) * cell + cell / 2] as const
    if (!t.over && t.turn === 'X') {
      const [cx, cy] = centre(t.cursor)
      ctx.strokeStyle = '#fffaf0'; ctx.lineWidth = 4; ctx.setLineDash([12, 8]); ctx.lineDashOffset = -time * 20
      ctx.strokeRect(cx - cell / 2 + 12, cy - cell / 2 + 12, cell - 24, cell - 24); ctx.setLineDash([])
    }
    t.board.forEach((mark, i) => {
      const [cx, cy] = centre(i)
      if (mark === 'X') {
        for (const [color, width] of [['#8f3a2b', 13], ['#b8553a', 7]] as const) {
          ctx.strokeStyle = color; ctx.lineWidth = width
          ctx.beginPath(); ctx.moveTo(cx - 26, cy - 26); ctx.lineTo(cx + 26, cy + 26); ctx.moveTo(cx + 26, cy - 26); ctx.lineTo(cx - 26, cy + 26); ctx.stroke()
        }
      } else if (mark === 'O') {
        ctx.fillStyle = '#1f201440'; ctx.beginPath(); ctx.arc(cx + 4, cy + 5, 30, 0, TAU); ctx.fill()
        ctx.fillStyle = '#6e6a5f'; ctx.beginPath(); ctx.arc(cx, cy, 30, 0, TAU); ctx.fill()
        ctx.fillStyle = '#96927f'; ctx.beginPath(); ctx.arc(cx - 3, cy - 3, 24, 0, TAU); ctx.fill()
        ctx.fillStyle = '#cbc4a4'; ctx.beginPath(); ctx.ellipse(cx - 10, cy - 11, 8, 5, -0.6, 0, TAU); ctx.fill()
      }
    })
    if (t.line) {
      const [x1, y1] = centre(t.line[0]!), [x2, y2] = centre(t.line[2]!)
      const ex = (x2 - x1) * 0.18, ey = (y2 - y1) * 0.18
      ctx.strokeStyle = t.outcome === 'X' ? '#f5d474' : '#34271d'; ctx.lineWidth = 9
      ctx.beginPath(); ctx.moveTo(x1 - ex, y1 - ey); ctx.lineTo(x2 + ex, y2 + ey); ctx.stroke()
    }
    ctx.restore()
  }

  background(ctx: CanvasRenderingContext2D, game: PitfallEngine) {
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND)
    sky.addColorStop(0, '#385e47'); sky.addColorStop(0.55, '#8f9e65'); sky.addColorStop(1, '#c2ba79')
    ctx.fillStyle = sky; ctx.fillRect(0, 0, WIDTH, GROUND)
    // Distant trunks, hanging lianas, and a hazy forest floor.
    for (let i = 0; i < 22; i++) {
      const x = i * 49 + noise(i + game.room.seed) * 40
      const w = 8 + noise(i) * 17
      ctx.fillStyle = i % 2 ? '#53785a55' : '#335f5055'
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + w, 0); ctx.lineTo(x + w - 4, 270); ctx.lineTo(x - 15, 294); ctx.lineTo(x + 2, 238); ctx.fill()
      ctx.strokeStyle = '#6b8a6166'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(x + 32, 0); ctx.bezierCurveTo(x + 20, 100, x + 67, 74, x + 39, 206); ctx.stroke()
    }
    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    for (const x of [250, 390, 710]) {
      const light = ctx.createLinearGradient(x, 20, x - 80, 300)
      light.addColorStop(0, '#eed79100'); light.addColorStop(0.5, '#eed79118'); light.addColorStop(1, '#eed79100')
      ctx.fillStyle = light
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 35, 0); ctx.lineTo(x - 90, GROUND); ctx.lineTo(x - 220, GROUND); ctx.fill()
    }
    ctx.restore()
    for (let i = 0; i < 34; i++) {
      const x = i * 30
      this.fern(ctx, x, 298 + noise(i) * 10, 20 + noise(i + 4) * 24, '#57764a66')
    }
    this.tree(ctx, 70, 46, '#304c36', '#52633d')
    this.tree(ctx, 866, 48, '#293f2e', '#485735')
    this.tree(ctx, 211, 20, '#4e6440', '#637647')
    this.tree(ctx, 744, 25, '#4a603d', '#697745')
    // An interlocking canopy creates a frame without hiding jump hazards.
    for (let i = 0; i < 29; i++) {
      const x = i * 36 - 20
      ctx.fillStyle = i % 3 ? '#294e35' : '#345b3b'
      ctx.beginPath(); ctx.ellipse(x, 16 + noise(i + 8) * 15, 67, 42 + noise(i + 22) * 35, 0, 0, TAU); ctx.fill()
      for (let j = 0; j < 4; j++) this.leaf(ctx, x + j * 15, 55 + noise(i * 4 + j) * 14, 0.6 + j * 0.7, 15, j % 2 ? '#426b40' : '#385d38')
    }
    ctx.fillStyle = '#223f2e'; ctx.fillRect(0, 0, WIDTH, 11)
    ctx.fillStyle = '#a4a466'; ctx.fillRect(0, GROUND - 12, WIDTH, 12)
    for (let i = 0; i < 125; i++) {
      ctx.fillStyle = i % 2 ? '#647b42' : '#82914a'
      const x = i * 8
      ctx.beginPath(); ctx.moveTo(x, GROUND - 9); ctx.lineTo(x - 2, GROUND - 16 - noise(i) * 6); ctx.lineTo(x + 4, GROUND - 10); ctx.fill()
    }
  }

  motes(ctx: CanvasRenderingContext2D, time: number) {
    for (let i = 0; i < 16; i++) {
      const x = noise(i + 4) * WIDTH + Math.sin(time * 0.4 + i) * 12
      const y = 108 + noise(i + 30) * 180 + Math.sin(time * 0.8 + i) * 7
      ctx.globalAlpha = 0.2 + (Math.sin(time + i) + 1) * 0.18
      ctx.fillStyle = i % 3 ? '#f4e6aa' : '#c6e5aa'; ctx.beginPath(); ctx.arc(x, y, i % 3 ? 1.2 : 2, 0, TAU); ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  terrain(ctx: CanvasRenderingContext2D, game: PitfallEngine, time: number) {
    ctx.fillStyle = '#aa8750'; ctx.fillRect(0, GROUND, WIDTH, TUNNEL_TOP - GROUND)
    ctx.fillStyle = '#d0b47a'; ctx.fillRect(0, GROUND, WIDTH, 7)
    ctx.fillStyle = '#292d24'; ctx.fillRect(0, TUNNEL_TOP, WIDTH, UNDERGROUND - TUNNEL_TOP)
    ctx.fillStyle = '#5c5137'; ctx.fillRect(0, UNDERGROUND, WIDTH, HEIGHT - UNDERGROUND)
    ctx.fillStyle = '#98804e'; ctx.fillRect(0, UNDERGROUND, WIDTH, 5)
    for (let i = 0; i < 90; i++) {
      const x = noise(i) * WIDTH
      const y = GROUND + 10 + noise(i + 11) * (TUNNEL_TOP - GROUND - 14)
      ctx.fillStyle = i % 2 ? '#755d3966' : '#d4b87c66'; ctx.fillRect(x, y, 4 + noise(i + 55) * 13, 2)
    }
    ctx.fillStyle = '#55472d'
    for (let i = 0; i < 34; i++) {
      const x = i * 31
      ctx.beginPath(); ctx.moveTo(x, TUNNEL_TOP - 1); ctx.lineTo(x + 9, TUNNEL_TOP + 3 + noise(i) * 7); ctx.lineTo(x + 16, TUNNEL_TOP - 1); ctx.fill()
    }
    const cave = ctx.createLinearGradient(0, TUNNEL_TOP, 0, UNDERGROUND)
    cave.addColorStop(0, '#121d1988'); cave.addColorStop(1, '#172b1a00'); ctx.fillStyle = cave; ctx.fillRect(0, TUNNEL_TOP, WIDTH, UNDERGROUND - TUNNEL_TOP)
    for (let i = 0; i < 45; i++) {
      ctx.fillStyle = i % 2 ? '#756140' : '#493f2d'; ctx.fillRect(noise(i + 1) * WIDTH, UNDERGROUND + 8 + noise(i) * (HEIGHT - UNDERGROUND - 11), 7, 3)
    }
    if (game.room.ladder) {
      ctx.fillStyle = '#242c20'; ctx.fillRect(456, GROUND, 48, TUNNEL_TOP - GROUND + 7)
      ctx.strokeStyle = '#ba9e65'; ctx.lineWidth = 5
      ctx.beginPath(); ctx.moveTo(462, GROUND + 4); ctx.lineTo(462, UNDERGROUND); ctx.moveTo(498, GROUND + 4); ctx.lineTo(498, UNDERGROUND)
      for (let y = GROUND + 13; y < UNDERGROUND; y += 16) { ctx.moveTo(462, y); ctx.lineTo(498, y) }
      ctx.stroke()
      if (game.room.holes) {
        for (const [x, right] of HOLES) { ctx.fillStyle = '#222b20'; ctx.fillRect(x, GROUND, right - x, TUNNEL_TOP - GROUND + 4); ctx.fillStyle = '#6f5b37'; ctx.fillRect(x - 3, GROUND, 5, TUNNEL_TOP - GROUND - 5) }
      }
    }
    if (game.room.wall) this.brickWall(ctx)
    if (game.room.tunnelPit !== null) {
      // A black gap in the tunnel floor with crumbled lips; tunnelPitFront darkens Harry as he falls.
      const x = game.room.tunnelPit, w = TUNNEL_PIT_HALF
      ctx.fillStyle = '#0b0f0c'; ctx.fillRect(x - w, UNDERGROUND, w * 2, HEIGHT - UNDERGROUND)
      ctx.fillStyle = '#6f5b37'; ctx.fillRect(x - w - 3, UNDERGROUND, 6, 9); ctx.fillRect(x + w - 3, UNDERGROUND, 6, 9)
      ctx.fillStyle = '#98804e'; ctx.fillRect(x - w - 6, UNDERGROUND, 5, 3); ctx.fillRect(x + w + 1, UNDERGROUND, 5, 3)
    }
    const pit = game.pitBounds()
    if (pit) {
      const water = game.room.pit === 'water'
      const sand = game.room.pit === 'sand'
      this.pit(ctx, pit.left, pit.right, water ? 'water' : sand ? 'sand' : 'tar', time, game.room.seed)
      if (water) for (const croc of game.crocodiles()) this.crocodile(ctx, croc.x, GROUND, croc.open)
    }
    // The tunnel's caption fades as the view scrolls down, clear of the scene stamp.
    ctx.globalAlpha = Math.max(0, 1 - this.camera / 60)
    ctx.fillStyle = '#cbc4a477'; ctx.font = '10px monospace'; ctx.textAlign = 'left'
    ctx.fillText('UNDERGROUND  /  1 PASSAGE = 3 SCENES', 24, TUNNEL_TOP + 44)
    ctx.globalAlpha = 1
    if (game.room.ladder) { ctx.textAlign = 'center'; ctx.fillStyle = '#ddd0a488'; ctx.fillText('↓', 480, 299) }
  }

  // A wall of red brick in light mortar, floor to roof across the tunnel, laid in a running bond: each
  // course is offset by half a brick from the one below. Every brick's shade varies a little, and has a
  // lit top edge and a shadowed bottom one.
  brickWall(ctx: CanvasRenderingContext2D) {
    const { left, right } = WALL, top = TUNNEL_TOP - 1, length = 12, course = 9
    ctx.fillStyle = '#00000040'; ctx.fillRect(left - 3, UNDERGROUND, right - left + 6, 3)
    ctx.fillStyle = '#d6ccb1'; ctx.fillRect(left, top, right - left, UNDERGROUND - top)
    for (let y = top + 1, row = 0; y < UNDERGROUND; y += course, row++) {
      const height = Math.min(course - 2, UNDERGROUND - y)
      for (let x = left + 1 - (row % 2) * (length + 2) / 2, i = 0; x < right - 1; x += length + 2, i++) {
        const from = Math.max(x, left + 1), to = Math.min(x + length, right - 1)
        ctx.fillStyle = ['#a3422c', '#b04d34', '#94392a', '#ab4630'][Math.floor(noise(row * 7 + i) * 4)]!; ctx.fillRect(from, y, to - from, height)
        ctx.fillStyle = '#c8674b'; ctx.fillRect(from, y, to - from, 1)
        ctx.fillStyle = '#73291b'; ctx.fillRect(from, y + height - 1, to - from, 1)
      }
    }
  }

  // A rounded opening in the ground seen at a slight angle. The basin itself stays hidden underground,
  // so the ground in front of the opening is plain dirt.
  pit(ctx: CanvasRenderingContext2D, left: number, right: number, kind: 'water' | 'sand' | 'tar', time: number, seed = 0) {
    const palette = {
      water: { wall: '#5f5034', near: '#5d8a6c', far: '#2f5140', ripple: '#8fb89455' },
      sand: { wall: '#7a6234', near: '#b89a5a', far: '#846a3c', ripple: '#f0d38a55' },
      tar: { wall: '#4a4130', near: '#484d3f', far: '#20241c', ripple: '#8a8a6e44' },
    }[kind]
    const cx = (left + right) / 2, rx = (right - left) / 2
    if (rx < 2) return
    const ry = Math.min(11, rx * 0.35), cy = GROUND + 4
    // Darkened, trampled earth around the back of the opening.
    ctx.fillStyle = '#3b2e1a2b'; ctx.beginPath(); ctx.ellipse(cx, cy - 1, rx + 7, ry + 3, 0, Math.PI, TAU); ctx.fill()
    // The far inner wall in shadow, with the surface filling the rest of the opening.
    ctx.fillStyle = palette.wall; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU); ctx.fill()
    const surface = ctx.createLinearGradient(0, cy - ry, 0, cy + ry)
    surface.addColorStop(0, palette.far); surface.addColorStop(1, palette.near)
    ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU); ctx.clip()
    ctx.beginPath(); ctx.ellipse(cx, cy + ry * 0.35, rx * 1.02, ry, 0, 0, TAU); ctx.fillStyle = surface; ctx.fill()
    for (let i = 0; i < 8; i++) {
      const x = left + noise(i + 3) * (right - left) + Math.sin(time * 0.8 + i) * 8
      ctx.strokeStyle = palette.ripple; ctx.lineWidth = 1
      ctx.beginPath(); ctx.ellipse(x, cy + ry * 0.2 + (noise(i + 17) - 0.3) * ry, 6 + noise(i + 5) * 12, 1.2, 0, 0, TAU); ctx.stroke()
    }
    if (kind !== 'sand') { ctx.fillStyle = '#ffffff1c'; ctx.beginPath(); ctx.ellipse(cx - rx * 0.3, cy + ry * 0.2, rx * 0.25, ry * 0.18, 0, 0, TAU); ctx.fill() }
    ctx.restore()
    // Only the far rim catches a shadow line; the near edge simply meets the dirt.
    ctx.strokeStyle = '#2d2414aa'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, Math.PI + 0.08, TAU - 0.08); ctx.stroke()
    // Bones go on last so they stand in front of the far rim.
    if (kind !== 'water' && rx > 30) this.bones(ctx, cx, cy + ry * 0.35, Math.min(1, rx / PIT_HALF_WIDTH), palette.far, seed)
  }

  // Remains of less fortunate explorers poking out of tar or quicksand. Each scene's seed picks
  // three or four pieces, their spots near the middle, and which way each one leans, so no two
  // pits look alike. Everything is clipped at the surface line so it looks like it is sinking in,
  // and it shrinks with a shifting pit.
  bones(ctx: CanvasRenderingContext2D, cx: number, surface: number, s: number, sink: string, seed = 0) {
    const bone = '#e6dcc0', edge = '#7a6e55', hollow = '#2a2418', shine = '#fff6df'
    const pick = (k: number) => noise(seed * 13.7 + k)
    const kinds = ['ribs', 'skull', 'femur', 'small', 'hand', 'horns', 'jaw', 'pelvis'] as const
    const order = kinds.map((kind, i) => ({ kind, r: pick(i) })).sort((a, b) => a.r - b.r).map(o => o.kind)
    const count = pick(20) > 0.5 ? 4 : 3
    const slots = [-66, -30, 6, 40, 72].map((x, i) => ({ x, r: pick(30 + i) })).sort((a, b) => a.r - b.r).slice(0, count).map(o => o.x).sort((a, b) => a - b)
    const base = surface + 1
    ctx.save(); ctx.beginPath(); ctx.rect(cx - 200, surface - 60, 400, 61); ctx.clip()
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    const stroke = (draw: () => void, width: number) => {
      ctx.strokeStyle = edge; ctx.lineWidth = width + 2; ctx.beginPath(); draw(); ctx.stroke()
      ctx.strokeStyle = bone; ctx.lineWidth = width; ctx.beginPath(); draw(); ctx.stroke()
    }
    const blob = (x: number, y: number, rx: number, ry: number, rotation = 0) => {
      ctx.fillStyle = edge; ctx.beginPath(); ctx.ellipse(x, y, rx + 1, ry + 1, rotation, 0, TAU); ctx.fill()
      ctx.fillStyle = bone; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rotation, 0, TAU); ctx.fill()
    }
    const hole = (x: number, y: number, rx: number, ry: number) => { ctx.fillStyle = hollow; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill() }
    const knob = (x: number, y: number, r: number) => {
      ctx.fillStyle = edge; ctx.beginPath(); ctx.arc(x, y, r + 0.9 * s, 0, TAU); ctx.fill()
      ctx.fillStyle = bone; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill()
    }
    const rings: [number, number][] = []
    slots.forEach((slot, i) => {
      const x = cx + slot * s, f = pick(40 + i) > 0.5 ? 1 : -1
      switch (order[i]) {
        case 'ribs': // A spine with curved ribs arching out of the surface.
          stroke(() => { ctx.moveTo(x - 15 * s, base); ctx.quadraticCurveTo(x, surface - 6 * s, x + 15 * s, base) }, 2.5 * s)
          for (let j = 0; j < 4; j++) {
            const rx = x + (-11 + j * 7) * s, h = (13 - Math.abs(j - 1.5) * 2.5) * s
            stroke(() => { ctx.moveTo(rx, base); ctx.quadraticCurveTo(rx - 4 * f * s, surface - h, rx + 4 * f * s, surface - h - 2 * s) }, 2 * s)
          }
          rings.push([x, 18]); break
        case 'skull': { // A human skull, half sunk and tilted.
          const y = surface - 3 * s
          blob(x, y, 9 * s, 8 * s, -0.2 * f)
          ctx.fillStyle = shine; ctx.beginPath(); ctx.ellipse(x - 3 * f * s, y - 4 * s, 3.5 * s, 2 * s, -0.4 * f, 0, TAU); ctx.fill()
          hole(x - 3.5 * s, y + 1 * s, 2.4 * s, 2.8 * s); hole(x + 3.5 * s, y + 0.5 * s, 2.4 * s, 2.8 * s)
          ctx.beginPath(); ctx.moveTo(x, y + 3 * s); ctx.lineTo(x - 1.2 * s, y + 5.5 * s); ctx.lineTo(x + 1.2 * s, y + 5.5 * s); ctx.fill()
          rings.push([x, 11]); break
        }
        case 'femur': { // A thigh bone jutting up at an angle, knobbed at the top.
          const tx = x + 5 * f * s, ty = surface - 24 * s
          stroke(() => { ctx.moveTo(x - 4 * f * s, base); ctx.lineTo(tx, ty) }, 3.5 * s)
          knob(tx - 2.6 * f * s, ty - 0.6 * s, 2.4 * s); knob(tx + 1.6 * f * s, ty - 2.4 * s, 2.4 * s)
          rings.push([x - 3 * f * s, 6]); break
        }
        case 'small': // A short bone leaning over.
          stroke(() => { ctx.moveTo(x + 3 * f * s, base); ctx.lineTo(x - 4 * f * s, surface - 10 * s) }, 2.5 * s)
          knob(x - 4.5 * f * s, surface - 11 * s, 1.8 * s)
          rings.push([x + 2 * f * s, 5]); break
        case 'hand': { // A skeletal hand reaching up out of the muck.
          const px = x + 1 * f * s, py = surface - 8 * s
          stroke(() => { ctx.moveTo(x, base); ctx.lineTo(px, py) }, 3.2 * s)
          for (let j = 0; j < 4; j++) {
            const tipX = x + (-5 + j * 3.4) * s, tipY = surface - (15 + (j === 1 || j === 2 ? 3 : 0)) * s
            stroke(() => { ctx.moveTo(px + (-2 + j * 1.3) * s, py); ctx.lineTo((px + tipX) / 2 + 0.6 * s, (py + tipY) / 2); ctx.lineTo(tipX, tipY) }, 1.3 * s)
          }
          stroke(() => { ctx.moveTo(px + 2 * f * s, py + 3 * s); ctx.lineTo(x + 7 * f * s, surface - 11 * s) }, 1.4 * s)
          rings.push([x, 6]); break
        }
        case 'horns': { // A horned animal skull with its snout pointing to one side.
          const y = surface - 4 * s
          stroke(() => { ctx.moveTo(x - 4 * s, y - 3 * s); ctx.quadraticCurveTo(x - 15 * s, y - 5 * s, x - 12 * s, y - 16 * s) }, 2.2 * s)
          stroke(() => { ctx.moveTo(x + 4 * s, y - 3 * s); ctx.quadraticCurveTo(x + 15 * s, y - 5 * s, x + 12 * s, y - 16 * s) }, 2.2 * s)
          blob(x + 6 * f * s, y + 2 * s, 4 * s, 3 * s)
          blob(x, y, 7.5 * s, 5 * s)
          hole(x - 3 * s, y - 0.5 * s, 1.8 * s, 1.6 * s); hole(x + 3 * s, y - 0.5 * s, 1.8 * s, 1.6 * s)
          hole(x + 8 * f * s, y + 2 * s, 0.8 * s, 0.8 * s)
          rings.push([x + 2 * f * s, 12]); break
        }
        case 'jaw': { // A jawbone with a row of teeth.
          const lift = 5 * s
          stroke(() => { ctx.moveTo(x - 10 * s, surface - lift - 4 * f * s); ctx.quadraticCurveTo(x, surface + 5 * s, x + 10 * s, surface - lift + 4 * f * s) }, 3 * s)
          for (let j = 1; j < 6; j++) {
            const t = j / 6, qx = (1 - t) ** 2 * (x - 10 * s) + 2 * (1 - t) * t * x + t ** 2 * (x + 10 * s)
            const qy = (1 - t) ** 2 * (surface - lift - 4 * f * s) + 2 * (1 - t) * t * (surface + 5 * s) + t ** 2 * (surface - lift + 4 * f * s)
            ctx.fillStyle = shine; ctx.fillRect(qx - 0.9 * s, qy - 3.4 * s, 1.8 * s, 2.2 * s)
          }
          rings.push([x, 11]); break
        }
        case 'pelvis': // A pelvis, its two wings spread above the surface.
          blob(x - 7 * s, surface - 6 * s, 6.5 * s, 4 * s, -0.75)
          blob(x + 7 * s, surface - 6 * s, 6.5 * s, 4 * s, 0.75)
          blob(x, surface - 3 * s, 3 * s, 5 * s)
          hole(x - 4.5 * s, surface - 1 * s, 1.6 * s, 1.1 * s); hole(x + 4.5 * s, surface - 1 * s, 1.6 * s, 1.1 * s)
          rings.push([x, 12]); break
      }
    })
    ctx.restore()
    // A ring of disturbed surface where each piece goes under.
    ctx.strokeStyle = sink; ctx.lineWidth = 1
    for (const [x, w] of rings) { ctx.beginPath(); ctx.ellipse(x, surface + 1, w * s, 1.6, 0, 0, TAU); ctx.stroke() }
  }

  // Base camp in scene 001: pennant, tent, supplies, and a cooking fire, left of Harry's start.
  camp(ctx: CanvasRenderingContext2D, time: number) {
    const g = GROUND
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    // Warm firelight pooled on the ground.
    const glow = ctx.createRadialGradient(200, g - 8, 0, 200, g - 8, 90)
    glow.addColorStop(0, `rgba(255, 190, 90, ${0.28 + Math.sin(time * 9) * 0.04})`); glow.addColorStop(1, 'rgba(255, 190, 90, 0)')
    ctx.fillStyle = glow; ctx.fillRect(110, g - 98, 180, 110)
    // Pennant on a pole.
    ctx.strokeStyle = '#5b4527'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(16, g); ctx.lineTo(16, g - 74); ctx.stroke()
    const wave = Math.sin(time * 3) * 3
    ctx.fillStyle = '#b8553a'; ctx.beginPath(); ctx.moveTo(17, g - 73); ctx.quadraticCurveTo(30, g - 70 + wave, 42, g - 64 + wave); ctx.quadraticCurveTo(30, g - 60 - wave * 0.5, 17, g - 57); ctx.fill()
    ctx.fillStyle = '#e8c874'; ctx.beginPath(); ctx.arc(26, g - 65 + wave * 0.5, 2.5, 0, TAU); ctx.fill()
    // Tent: ground shadow, guy ropes, shaded side panel, and a lit front with an open flap.
    ctx.fillStyle = '#1f201433'; ctx.beginPath(); ctx.ellipse(82, g + 1, 62, 5, 0, 0, TAU); ctx.fill()
    ctx.strokeStyle = '#d8cfae99'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(58, g - 52); ctx.lineTo(24, g); ctx.moveTo(104, g - 56); ctx.lineTo(146, g); ctx.stroke()
    ctx.fillStyle = '#6a5433'; for (const x of [24, 146]) ctx.fillRect(x - 1.5, g - 5, 3, 6)
    ctx.fillStyle = '#9d8a5c'; ctx.beginPath(); ctx.moveTo(58, g - 52); ctx.lineTo(104, g - 56); ctx.lineTo(72, g); ctx.lineTo(30, g); ctx.closePath(); ctx.fill()
    ctx.strokeStyle = '#85744c'; ctx.lineWidth = 1
    for (let i = 1; i < 4; i++) { const f = i / 4; ctx.beginPath(); ctx.moveTo(58 + 46 * f, g - 52 - 4 * f); ctx.lineTo(30 + 42 * f, g); ctx.stroke() }
    ctx.fillStyle = '#d6c595'; ctx.beginPath(); ctx.moveTo(104, g - 56); ctx.lineTo(138, g); ctx.lineTo(72, g); ctx.closePath(); ctx.fill()
    ctx.fillStyle = '#2e2819'; ctx.beginPath(); ctx.moveTo(104, g - 38); ctx.lineTo(117, g); ctx.lineTo(93, g); ctx.closePath(); ctx.fill()
    ctx.fillStyle = '#4a3f2a'; ctx.fillRect(97, g - 7, 12, 4)
    ctx.fillStyle = '#e8dcb0'; ctx.beginPath(); ctx.moveTo(104, g - 38); ctx.lineTo(117, g); ctx.lineTo(126, g - 9); ctx.closePath(); ctx.fill()
    ctx.strokeStyle = '#b3a476'; ctx.beginPath(); ctx.moveTo(104, g - 38); ctx.lineTo(126, g - 9); ctx.stroke()
    ctx.strokeStyle = '#5b4527'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(56, g - 55); ctx.lineTo(107, g - 59); ctx.stroke()
    // Supply crate with a backpack and rolled bedroll.
    ctx.fillStyle = '#7d5d34'; ctx.fillRect(150, g - 18, 24, 18)
    ctx.strokeStyle = '#5a4124'; ctx.lineWidth = 1.5; ctx.strokeRect(150.5, g - 17.5, 23, 17)
    ctx.beginPath(); ctx.moveTo(150, g - 9); ctx.lineTo(174, g - 9); ctx.moveTo(151, g - 17); ctx.lineTo(173, g - 1); ctx.stroke()
    ctx.fillStyle = '#b54a36'; ctx.beginPath(); ctx.ellipse(146, g - 4, 5, 4, 0, 0, TAU); ctx.fill()
    ctx.fillStyle = '#8f3a2b'; ctx.fillRect(135, g - 8, 11, 8); ctx.fillStyle = '#d98a6a'; ctx.beginPath(); ctx.ellipse(135, g - 4, 2.5, 4, 0, 0, TAU); ctx.fill()
    ctx.fillStyle = '#5f6e3c'; ctx.beginPath(); ctx.moveTo(154, g - 18); ctx.lineTo(155, g - 33); ctx.quadraticCurveTo(162, g - 38, 169, g - 33); ctx.lineTo(170, g - 18); ctx.closePath(); ctx.fill()
    ctx.fillStyle = '#4b5830'; ctx.fillRect(156, g - 27, 12, 6)
    ctx.strokeStyle = '#3a4424'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(158, g - 33); ctx.lineTo(158, g - 18); ctx.moveTo(166, g - 33); ctx.lineTo(166, g - 18); ctx.stroke()
    // Cooking tripod and pot, then the fire ring beneath it.
    ctx.strokeStyle = '#4e3b22'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(184, g); ctx.lineTo(200, g - 42); ctx.lineTo(216, g); ctx.moveTo(200, g - 42); ctx.lineTo(203, g - 2); ctx.stroke()
    ctx.strokeStyle = '#3a3a34'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(200, g - 42); ctx.lineTo(200, g - 28); ctx.stroke()
    ctx.fillStyle = '#2f302b'; ctx.beginPath(); ctx.moveTo(191, g - 27); ctx.lineTo(209, g - 27); ctx.quadraticCurveTo(210, g - 15, 200, g - 15); ctx.quadraticCurveTo(190, g - 15, 191, g - 27); ctx.fill()
    ctx.strokeStyle = '#55564d'; ctx.beginPath(); ctx.arc(200, g - 27, 7, Math.PI, TAU); ctx.stroke()
    ctx.fillStyle = '#6e6a5f'; ctx.fillRect(190, g - 28, 20, 2)
    ctx.fillStyle = '#40331f'; ctx.save(); ctx.translate(200, g - 3)
    ctx.rotate(0.25); ctx.fillRect(-11, -2, 22, 4); ctx.rotate(-0.5); ctx.fillRect(-11, -2, 22, 4); ctx.restore()
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = ['#d66939', '#f4ae49', '#ffe09a'][i]!
      const w = 8 - i * 2.5, top = -18 + i * 4 + Math.sin(time * 13 + i * 2) * 3
      ctx.beginPath(); ctx.moveTo(200 - w, g - 3); ctx.quadraticCurveTo(200 - w - 1, g - 10, 200 + Math.sin(time * 7 + i) * 2, g + top); ctx.quadraticCurveTo(200 + w * 0.3, g - 10, 200 + w, g - 3); ctx.fill()
    }
    for (let i = 0; i < 7; i++) {
      const a = Math.PI + (i / 6) * Math.PI
      ctx.fillStyle = i % 2 ? '#7c7a6c' : '#96927f'; ctx.beginPath(); ctx.ellipse(200 + Math.cos(a) * 13, g - 1 + Math.sin(a) * -1.5 + 1, 4, 3, 0, 0, TAU); ctx.fill()
    }
    // Smoke drifting up past the pot.
    for (let i = 0; i < 4; i++) {
      const life = (time * 0.35 + i / 4) % 1
      ctx.fillStyle = `rgba(215, 214, 200, ${0.22 * (1 - life)})`
      ctx.beginPath(); ctx.arc(203 + life * 14 + Math.sin(time + i) * 3, g - 34 - life * 60, 4 + life * 9, 0, TAU); ctx.fill()
    }
    ctx.restore()
  }

  // A cavern chamber: rock, glowing fungi, rivers with their eels, the ledges, ladders, rats and the
  // relic. Drawn behind Harry; chamberFront adds the water, bats and darkness in front of him.
  chamberBack(ctx: CanvasRenderingContext2D, game: PitfallEngine, c: Chamber, time: number) {
    const seed = c.seed, bottom = CAVERN_VIEW + HEIGHT
    // Rock above the chamber: below the tunnel floor for a deep cavern, or the level above in the lost caverns.
    const roof = c.depth ? CAVERN_VIEW : UNDERGROUND + 5
    ctx.fillStyle = '#4a4232'; ctx.fillRect(0, roof, WIDTH, CAVERN_TOP - roof)
    for (let i = 0; i < (CAVERN_TOP - roof) * 1.2; i++) { ctx.fillStyle = i % 2 ? '#3a3427' : '#5d5440'; ctx.fillRect(noise(i + seed) * WIDTH, roof + 4 + noise(i + 70) * (CAVERN_TOP - roof - 7), 5 + noise(i + 3) * 10, 2) }
    // Cave air that darkens with depth, and faint columns on the far wall.
    const air = ctx.createLinearGradient(0, CAVERN_TOP, 0, bottom)
    air.addColorStop(0, '#1f2c28'); air.addColorStop(1, '#0b1210')
    ctx.fillStyle = air; ctx.fillRect(0, CAVERN_TOP, WIDTH, bottom - CAVERN_TOP)
    for (let i = 0; i < 9; i++) {
      const x = 50 + i * 105 + noise(i + seed) * 40, w = 22 + noise(i + 9) * 26, top = CAVERN_TOP + 40 + noise(i + 19) * 90
      ctx.fillStyle = '#243430'; ctx.beginPath(); ctx.moveTo(x - w, bottom); ctx.lineTo(x - w * 0.3, top + 20); ctx.lineTo(x, top); ctx.lineTo(x + w * 0.35, top + 24); ctx.lineTo(x + w, bottom); ctx.fill()
    }
    // Stalactites along the ceiling, lit on one side.
    for (let i = 0; i < 26; i++) {
      const x = i * 38 + noise(i + seed * 3) * 20, length = 10 + noise(i + 40) * 34, w = 6 + noise(i + 60) * 8
      ctx.fillStyle = '#3a3427'; ctx.beginPath(); ctx.moveTo(x - w, CAVERN_TOP - 1); ctx.lineTo(x, CAVERN_TOP + length); ctx.lineTo(x + w, CAVERN_TOP - 1); ctx.fill()
      ctx.fillStyle = '#5d5440'; ctx.beginPath(); ctx.moveTo(x - w, CAVERN_TOP - 1); ctx.lineTo(x, CAVERN_TOP + length); ctx.lineTo(x - w * 0.4, CAVERN_TOP - 1); ctx.fill()
    }
    // The caption; in the lost caverns it sits to the west, clear of the ladders.
    ctx.fillStyle = '#cbc4a455'; ctx.font = '10px monospace'; ctx.textAlign = c.depth ? 'left' : 'center'
    ctx.fillText(c.depth ? `LOST CAVERNS, LEVEL ${c.depth}  /  ${c.name.toUpperCase()}` : 'DEEP CAVERN  /  ONE GOLDEN IDOL', c.depth ? 40 : 480, CAVERN_TOP + 64)
    // River water over a pebbled bed; the ledges below cover its sides.
    c.rivers.forEach((river, r) => {
      const riverWidth = river.right - river.left
      ctx.fillStyle = '#2f2c22'; ctx.fillRect(river.left, RIVER_BED, riverWidth, bottom - RIVER_BED)
      const water = ctx.createLinearGradient(0, WATER_SURFACE, 0, RIVER_BED)
      water.addColorStop(0, '#24605f'); water.addColorStop(1, '#10302f')
      ctx.fillStyle = water; ctx.fillRect(river.left, WATER_SURFACE, riverWidth, RIVER_BED - WATER_SURFACE)
      for (let i = 0; i < riverWidth / 16; i++) {
        ctx.fillStyle = i % 2 ? '#4f4a3a' : '#6b6450'
        ctx.beginPath(); ctx.ellipse(river.left + 8 + noise(i + seed + r * 40) * (riverWidth - 16), RIVER_BED + 1, 4 + noise(i + 5) * 6, 3, 0, Math.PI, TAU); ctx.fill()
      }
    })
    // Everything that isn't river or chasm is solid rock, from the ledge tops down. The lost caverns run
    // on past both ends.
    const gaps = [...c.rivers, ...c.chasms].sort((a, b) => a.left - b.left), wall = c.walls ? CAVERN_WALL : 0
    let from = wall
    for (const edge of [...gaps, { left: WIDTH - wall, right: WIDTH }]) {
      const w = edge.left - from
      ctx.fillStyle = '#4b4535'; ctx.fillRect(from, CAVERN_FLOOR, w, bottom - CAVERN_FLOOR)
      ctx.fillStyle = '#3a3427'; for (const y of [24, 50, 84]) ctx.fillRect(from, CAVERN_FLOOR + y + noise(from + y) * 6, w, 2)
      ctx.fillStyle = '#00000038'; if (edge.left < WIDTH) ctx.fillRect(from + w - 4, CAVERN_FLOOR + 5, 4, bottom - CAVERN_FLOOR)
      ctx.fillStyle = '#ffffff10'; if (from > 0) ctx.fillRect(from, CAVERN_FLOOR + 5, 3, bottom - CAVERN_FLOOR)
      ctx.fillStyle = '#7c7058'; ctx.fillRect(from, CAVERN_FLOOR, w, 5)
      for (let i = 0; i < w / 14; i++) { ctx.fillStyle = '#5f5642'; ctx.fillRect(from + noise(i + from) * (w - 6), CAVERN_FLOOR + 8 + noise(i + from + 9) * 80, 6, 2) }
      from = edge.right
    }
    if (c.walls) { ctx.fillStyle = '#2f2a20'; ctx.fillRect(0, CAVERN_TOP, CAVERN_WALL, bottom - CAVERN_TOP); ctx.fillRect(WIDTH - CAVERN_WALL, CAVERN_TOP, CAVERN_WALL, bottom - CAVERN_TOP) }
    const solid = (x: number, margin: number) => gaps.every(g => x + margin <= g.left || x - margin >= g.right)
    this.decor(ctx, c, time, solid)
    // Glowing fungi by each ladder, the only light down here, on whichever side has floor for them.
    for (const x of [...c.ladders, ...c.down]) {
      const toward = x < 480 ? 46 : -46, fx = [x + toward, x - toward].find(f => solid(f, 16))
      if (fx === undefined) continue
      const pulse = 0.2 + Math.sin(time * 1.5 + x) * 0.05
      const glow = ctx.createRadialGradient(fx, CAVERN_FLOOR - 6, 0, fx, CAVERN_FLOOR - 6, 70)
      glow.addColorStop(0, `rgba(127, 224, 200, ${pulse})`); glow.addColorStop(1, 'rgba(127, 224, 200, 0)')
      ctx.fillStyle = glow; ctx.fillRect(fx - 70, CAVERN_FLOOR - 76, 140, 82)
      for (const [dx, h, r] of [[-7, 9, 5], [2, 13, 6.5], [9, 7, 4]] as const) {
        ctx.fillStyle = '#cfe9dc'; ctx.fillRect(fx + dx - 1, CAVERN_FLOOR - h, 2, h)
        ctx.fillStyle = '#8fe8cf'; ctx.beginPath(); ctx.ellipse(fx + dx, CAVERN_FLOOR - h, r, r * 0.55, 0, Math.PI, TAU); ctx.fill()
      }
    }
    // Ladders up to the tunnel from a deep cavern, or to the level above; ladders down through the floor.
    for (const x of c.ladders) c.depth ? this.caveLadder(ctx, x, CAVERN_VIEW, CAVERN_FLOOR, CAVERN_VIEW, CAVERN_TOP + 2, false) : this.caveLadder(ctx, x, UNDERGROUND, CAVERN_FLOOR, UNDERGROUND, CAVERN_TOP + 2)
    for (const x of c.down) this.caveLadder(ctx, x, CAVERN_FLOOR, bottom, CAVERN_FLOOR, bottom)
    for (const eel of game.eels(game.elapsed, c)) this.eel(ctx, eel.x, eel.y, time, eel.facing)
    for (const rat of game.rats(game.elapsed - game.roomEnteredAt, c)) this.rat(ctx, rat.x, CAVERN_FLOOR, time, rat.facing)
    if (!game.relics.has(c.id)) {
      // A relic on the floor bobs gently; one on a riverbed rests there.
      const { kind, x } = c.relic, bob = c.relic.y === CAVERN_FLOOR ? Math.sin(time * 3) * 2 : 0
      const y = c.relic.y - 17 + bob
      const glow = ctx.createRadialGradient(x, y, 0, x, y, 50)
      glow.addColorStop(0, kind === 'skull' ? '#a9e6ff60' : kind === 'emerald' || kind === 'mask' ? '#9be8c050' : '#f5d47450'); glow.addColorStop(1, '#f5d47400')
      ctx.fillStyle = glow; ctx.fillRect(x - 50, y - 50, 100, 100)
      drawTreasure(ctx, kind, x, y)
      this.sparkle(ctx, x - 20, y - 18, 4, '#ffeaaf'); this.sparkle(ctx, x + 22, y - 4 - bob, 3, '#ffeaaf')
    }
  }

  // In front of Harry: the water, so he looks submerged, bubbles while he dives, and the darkness
  // that swallows anything falling into the chasm.
  chamberFront(ctx: CanvasRenderingContext2D, game: PitfallEngine, c: Chamber, time: number) {
    const p = game.player, bottom = CAVERN_VIEW + HEIGHT, here = game.depth === c.depth
    for (const river of c.rivers) {
      const riverWidth = river.right - river.left
      ctx.fillStyle = '#4aa8a133'; ctx.fillRect(river.left, WATER_SURFACE, riverWidth, RIVER_BED - WATER_SURFACE)
      ctx.strokeStyle = '#8fd3c833'; ctx.lineWidth = 1.5
      for (let i = 0; i < Math.round(riverWidth / 41); i++) {
        const x = river.left + ((noise(i) * riverWidth + time * 26) % riverWidth), y = WATER_SURFACE + 16 + noise(i + 3) * 72
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(Math.min(river.right, x + 18), y); ctx.stroke()
      }
      ctx.strokeStyle = '#a6e3d6bb'; ctx.lineWidth = 2; ctx.beginPath()
      for (let x = river.left; x <= river.right; x += 8) ctx.lineTo(x, WATER_SURFACE + Math.sin(time * 2 + x * 0.05) * 1.2)
      ctx.stroke()
    }
    if (c.kind === 'falls') this.splash(ctx, c, time)
    if (here && p.swimming && p.y > WATER_SURFACE + 14) {
      ctx.strokeStyle = '#cdeee6aa'; ctx.lineWidth = 1
      const rise = p.y - WATER_SURFACE - 8
      for (let i = 0; i < 3; i++) {
        const y = p.y - 8 - ((time * 36 + i * 14) % rise)
        ctx.beginPath(); ctx.arc(p.x + p.facing * 20 + Math.sin(time * 4 + i) * 2, y, 1.5 + i * 0.4, 0, TAU); ctx.stroke()
      }
    }
    // Harry's air: one bubble per second above him, turning red and blinking when it runs low.
    if (here && p.swimming && p.breath < BREATH) {
      const low = p.breath <= LOW_BREATH
      for (let i = 0; i < BREATH; i++) {
        const x = p.x + (i - (BREATH - 1) / 2) * 8
        ctx.beginPath(); ctx.arc(x, p.y - 26, 2.8, 0, TAU)
        if (p.breath > i && !(low && Math.floor(time * 6) % 2)) { ctx.fillStyle = low ? '#f2a58b' : '#dff6ef'; ctx.fill() }
        else { ctx.strokeStyle = '#dff6ef66'; ctx.lineWidth = 1; ctx.stroke() }
      }
    }
    const darkness = (left: number, right: number, from: number) => {
      const dark = ctx.createLinearGradient(0, from, 0, bottom)
      dark.addColorStop(0, '#05080700'); dark.addColorStop(0.4, '#050807cc'); dark.addColorStop(1, '#050807')
      ctx.fillStyle = dark; ctx.fillRect(left, from, right - left, bottom - from)
    }
    for (const g of c.chasms) {
      darkness(g.left, g.right, CAVERN_FLOOR + 4)
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = '#9fb3a812'
        ctx.beginPath(); ctx.ellipse(g.left + (g.right - g.left) * (0.3 + i * 0.25) + Math.sin(time * 0.5 + i) * 10, CAVERN_FLOOR + 50 + i * 16, 34, 7, 0, 0, TAU); ctx.fill()
      }
    }
    // A stone between two chasms is a pillar rising out of the dark.
    const gaps = [...c.rivers, ...c.chasms].sort((a, b) => a.left - b.left)
    gaps.slice(1).forEach((g, i) => { if (c.chasms.includes(g) && c.chasms.includes(gaps[i]!)) darkness(gaps[i]!.right, g.left, CAVERN_FLOOR + 40) })
    for (const bat of game.bats(game.elapsed, c)) this.bat(ctx, bat.x, bat.y, time, bat.facing)
  }

  // A ladder down a shaft through the rock from one floor to the next. Where it leaves a floor, its rails
  // poke up above it with an arrow so it shows from there. Rungs line up from one cavern level to the next.
  caveLadder(ctx: CanvasRenderingContext2D, x: number, top: number, bottom: number, shaftTop: number, shaftBottom: number, poke = true) {
    ctx.fillStyle = '#1c211b'; ctx.fillRect(x - 24, shaftTop, 48, shaftBottom - shaftTop)
    const from = poke ? top - 12 : top, rung = poke ? top - 4 : bottom - 4
    ctx.strokeStyle = '#ba9e65'; ctx.lineWidth = 5; ctx.beginPath()
    ctx.moveTo(x - 18, from); ctx.lineTo(x - 18, bottom); ctx.moveTo(x + 18, from); ctx.lineTo(x + 18, bottom)
    for (let y = rung - Math.floor((rung - from) / 16) * 16; y < bottom; y += 16) { ctx.moveTo(x - 18, y); ctx.lineTo(x + 18, y) }
    ctx.stroke()
    if (poke) { ctx.fillStyle = '#ddd0a488'; ctx.font = '10px monospace'; ctx.textAlign = 'center'; ctx.fillText('↓', x, top - 18) }
  }

  // Scenery that sets each kind of chamber apart, drawn over the far wall and the ledges.
  decor(ctx: CanvasRenderingContext2D, c: Chamber, time: number, solid: (x: number, margin: number) => boolean) {
    const seed = c.seed, near = (x: number, gap: number) => [...c.ladders, ...c.down, c.relic.x].some(l => Math.abs(l - x) < gap)
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    if (c.kind === 'roost') {
      // Sleeping bats hanging in rows from the roof, and pale droppings heaped on the ledges below.
      for (let i = 0; i < 14; i++) {
        const x = 40 + noise(i * 3 + seed) * 880, y = CAVERN_TOP + 3, sway = Math.sin(time * 1.3 + i) * 0.08
        ctx.save(); ctx.translate(x, y); ctx.rotate(sway)
        ctx.strokeStyle = '#2a2026'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-1.5, -3); ctx.lineTo(-1.5, 1); ctx.moveTo(1.5, -3); ctx.lineTo(1.5, 1); ctx.stroke()
        ctx.fillStyle = '#3b2a35'; ctx.beginPath(); ctx.moveTo(-5, 1); ctx.quadraticCurveTo(-6, 11, 0, 15); ctx.quadraticCurveTo(6, 11, 5, 1); ctx.closePath(); ctx.fill()
        ctx.fillStyle = '#54404d'; ctx.beginPath(); ctx.ellipse(0, 15, 3, 3, 0, 0, TAU); ctx.fill()
        ctx.beginPath(); ctx.moveTo(-2.5, 16); ctx.lineTo(-2, 20); ctx.lineTo(-0.5, 17); ctx.moveTo(2.5, 16); ctx.lineTo(2, 20); ctx.lineTo(0.5, 17); ctx.fill()
        ctx.restore()
      }
      for (let i = 0; i < 9; i++) {
        const x = 50 + noise(i + seed * 5) * 860
        if (!solid(x, 14) || near(x, 40)) continue
        ctx.fillStyle = '#8d8672'; ctx.beginPath(); ctx.ellipse(x, CAVERN_FLOOR, 12, 5, 0, Math.PI, TAU); ctx.fill()
        ctx.fillStyle = '#b3ac94'; ctx.beginPath(); ctx.ellipse(x - 2, CAVERN_FLOOR - 1, 6, 3, 0, Math.PI, TAU); ctx.fill()
      }
    } else if (c.kind === 'lake') {
      // Rippling light thrown up on the far wall, and drips falling from the roof into the water.
      for (const river of c.rivers) {
        ctx.strokeStyle = '#8fd3c816'; ctx.lineWidth = 3
        for (let j = 0; j < 6; j++) {
          const y = WATER_SURFACE - 30 - j * 22; ctx.beginPath()
          for (let x = river.left + 10; x <= river.right - 10; x += 12) ctx.lineTo(x, y + Math.sin(time * 1.6 + x * 0.04 + j) * 4)
          ctx.stroke()
        }
        for (let i = 0; i < 3; i++) {
          const x = river.left + (river.right - river.left) * (0.2 + i * 0.3), fall = (time * 0.6 + noise(i + seed)) % 1
          const y = CAVERN_TOP + 20 + fall * fall * (WATER_SURFACE - CAVERN_TOP - 20)
          ctx.fillStyle = '#bfe9e0aa'; ctx.beginPath(); ctx.ellipse(x, y, 1.6, 3, 0, 0, TAU); ctx.fill()
          const ring = (time * 0.6 + noise(i + seed)) % 1
          if (ring < 0.35) { ctx.strokeStyle = `rgba(191, 233, 224, ${0.5 - ring})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, WATER_SURFACE, 4 + ring * 40, 1.5 + ring * 4, 0, 0, TAU); ctx.stroke() }
        }
      }
    } else if (c.kind === 'stones') {
      // What's left of a rope bridge: a post at each lip of every chasm, its rope snapped and hanging into the dark.
      for (const g of c.chasms) {
        for (const [post, side] of [[g.left - 7, 1], [g.right + 7, -1]] as const) {
          ctx.fillStyle = '#5b4527'; ctx.fillRect(post - 3, CAVERN_FLOOR - 26, 6, 27); ctx.fillStyle = '#7d5d34'; ctx.fillRect(post - 3, CAVERN_FLOOR - 26, 2, 27)
          const swing = Math.sin(time * 1.1 + post) * 3, endX = post + side * 16 + swing, endY = CAVERN_FLOOR + 70
          ctx.strokeStyle = '#8f7b50'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(post, CAVERN_FLOOR - 22); ctx.quadraticCurveTo(post + side * 10, CAVERN_FLOOR + 20, endX, endY); ctx.stroke()
          ctx.save(); ctx.translate(endX, endY); ctx.rotate(side * 0.4 + swing * 0.05); ctx.fillStyle = '#6a5433'; ctx.fillRect(-9, -2, 18, 5); ctx.restore()
        }
      }
    } else if (c.kind === 'rats') {
      // Burrows along the foot of the far wall, and gnawed bones lying about.
      for (let i = 0; i < 7; i++) {
        const x = 70 + noise(i + seed * 2) * 820
        ctx.fillStyle = '#141814'; ctx.beginPath(); ctx.ellipse(x, CAVERN_FLOOR - 6, 9, 7, 0, Math.PI, TAU); ctx.fill()
        ctx.fillStyle = '#3a3427'; ctx.fillRect(x - 11, CAVERN_FLOOR - 6, 22, 2)
      }
      for (let i = 0; i < 8; i++) {
        const x = 60 + noise(i * 7 + seed) * 840, a = noise(i + 11) * Math.PI
        if (!solid(x, 12) || near(x, 30)) continue
        ctx.strokeStyle = '#d8ccae'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * 7, CAVERN_FLOOR - 1 - Math.sin(a) * 2); ctx.lineTo(x + Math.cos(a) * 7, CAVERN_FLOOR - 1 + Math.sin(a) * 2); ctx.stroke()
        ctx.fillStyle = '#e6dcc0'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(x + s * Math.cos(a) * 8, CAVERN_FLOOR - 1 + s * Math.sin(a) * 2, 2, 0, TAU); ctx.fill() }
      }
    } else if (c.kind === 'falls') {
      // A waterfall pouring through a crack in the roof into the river.
      const river = c.rivers[0]!, x = river.left + (river.right - river.left) * 0.6, w = 30, top = CAVERN_TOP
      ctx.fillStyle = '#141a16'; ctx.beginPath(); ctx.ellipse(x, top + 2, w / 2 + 8, 6, 0, 0, TAU); ctx.fill()
      const sheet = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0)
      sheet.addColorStop(0, '#4f9a9444'); sheet.addColorStop(0.5, '#a9e2da99'); sheet.addColorStop(1, '#4f9a9444')
      ctx.fillStyle = sheet; ctx.fillRect(x - w / 2, top, w, WATER_SURFACE - top)
      ctx.save(); ctx.beginPath(); ctx.rect(x - w / 2, top, w, WATER_SURFACE - top); ctx.clip()
      ctx.strokeStyle = '#e4fbf6aa'; ctx.lineWidth = 1.5
      for (let i = 0; i < 7; i++) {
        const sx = x - w / 2 + 3 + i * (w - 6) / 6, y = top + ((time * 240 + noise(i + seed) * 300) % (WATER_SURFACE - top + 40)) - 40
        ctx.beginPath(); ctx.moveTo(sx, y); ctx.lineTo(sx, y + 30); ctx.stroke()
      }
      ctx.restore()
    } else if (c.kind === 'grotto') {
      // Crystals growing from the roof and the ledges, glowing softly.
      const cluster = (x: number, y: number, size: number, down: boolean, hue: number) => {
        const pulse = 0.18 + Math.sin(time * 1.2 + x) * 0.05, color = hue ? '178, 146, 232' : '120, 220, 225'
        const glow = ctx.createRadialGradient(x, y, 0, x, y, size * 3.2)
        glow.addColorStop(0, `rgba(${color}, ${pulse})`); glow.addColorStop(1, `rgba(${color}, 0)`)
        ctx.fillStyle = glow; ctx.fillRect(x - size * 3.2, y - size * 3.2, size * 6.4, size * 6.4)
        for (const [dx, tilt, length] of [[-5, -0.45, 0.8], [0, 0, 1.2], [5, 0.4, 0.9], [-2, -0.15, 0.6]] as const) {
          ctx.save(); ctx.translate(x + dx * size / 10, y); ctx.rotate(down ? Math.PI - tilt : tilt); const h = size * 2 * length, w = size * 0.35
          ctx.fillStyle = `rgba(${color}, 0.75)`; ctx.beginPath(); ctx.moveTo(-w, 0); ctx.lineTo(-w, -h * 0.75); ctx.lineTo(0, -h); ctx.lineTo(w, -h * 0.75); ctx.lineTo(w, 0); ctx.fill()
          ctx.fillStyle = '#ffffff55'; ctx.beginPath(); ctx.moveTo(-w * 0.6, -2); ctx.lineTo(-w * 0.6, -h * 0.72); ctx.lineTo(0, -h * 0.9); ctx.lineTo(0, -2); ctx.fill()
          ctx.restore()
        }
      }
      for (let i = 0; i < 6; i++) cluster(70 + noise(i + seed * 4) * 820, CAVERN_TOP + 2, 9 + noise(i + 2) * 5, true, i % 2)
      for (let i = 0; i < 10; i++) {
        const x = 40 + noise(i * 5 + seed) * 880
        if (solid(x, 16) && !near(x, 36)) cluster(x, CAVERN_FLOOR, 7 + noise(i + 6) * 5, false, i % 2)
      }
    } else if (c.kind === 'temple') {
      // A temple sunk into the rock: a wall of fitted blocks between two columns, a carved sun face above
      // the pillar where the skull rests, and fire bowls burning on the ledges.
      const left = 340, right = 750, top = CAVERN_TOP + 96
      for (let y = top, row = 0; y < CAVERN_FLOOR; y += 20, row++) {
        for (let x = left - (row % 2) * 22; x < right; x += 44) {
          const x0 = Math.max(left, x), x1 = Math.min(right, x + 42)
          ctx.fillStyle = noise(x * 0.1 + row) > 0.5 ? '#3a3a30' : '#34352b'; ctx.fillRect(x0, y, x1 - x0, 18)
        }
      }
      for (const x of [left, right]) {
        ctx.fillStyle = '#4d4b3d'; ctx.fillRect(x - 14, top - 14, 28, CAVERN_FLOOR - top + 14); ctx.fillStyle = '#5f5c4a'; ctx.fillRect(x - 14, top - 14, 6, CAVERN_FLOOR - top + 14)
        ctx.fillStyle = '#625e4b'; ctx.fillRect(x - 20, top - 22, 40, 10)
      }
      ctx.fillStyle = '#4d4b3d'; ctx.fillRect(left - 20, top - 30, right - left + 40, 10)
      const fx = c.relic.x, fy = top + 50
      ctx.strokeStyle = '#8f7b50'; ctx.lineWidth = 3
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; ctx.beginPath(); ctx.moveTo(fx + Math.cos(a) * 30, fy + Math.sin(a) * 30); ctx.lineTo(fx + Math.cos(a) * 42, fy + Math.sin(a) * 42); ctx.stroke() }
      ctx.fillStyle = '#5f5c4a'; ctx.beginPath(); ctx.arc(fx, fy, 28, 0, TAU); ctx.fill()
      ctx.fillStyle = '#2a2a22'; ctx.fillRect(fx - 15, fy - 8, 10, 6); ctx.fillRect(fx + 5, fy - 8, 10, 6); ctx.fillRect(fx - 10, fy + 8, 20, 5)
      ctx.fillStyle = '#c89436'; ctx.fillRect(fx - 11, fy - 7, 3, 3); ctx.fillRect(fx + 9, fy - 7, 3, 3)
      for (let i = 0; i < 4; i++) { ctx.fillStyle = '#2a2a22'; ctx.fillRect(fx - 7 + i * 4, fy + 8, 2, 7) }
      for (const x of [700, 790]) {
        if (!solid(x, 12)) continue
        ctx.fillStyle = '#5b4527'; ctx.fillRect(x - 2, CAVERN_FLOOR - 20, 4, 20); ctx.fillStyle = '#6e6a5f'; ctx.beginPath(); ctx.ellipse(x, CAVERN_FLOOR - 20, 10, 4, 0, 0, Math.PI); ctx.fill()
        const glow = ctx.createRadialGradient(x, CAVERN_FLOOR - 30, 0, x, CAVERN_FLOOR - 30, 80)
        glow.addColorStop(0, `rgba(255, 180, 90, ${0.25 + Math.sin(time * 9 + x) * 0.04})`); glow.addColorStop(1, 'rgba(255, 180, 90, 0)')
        ctx.fillStyle = glow; ctx.fillRect(x - 80, CAVERN_FLOOR - 110, 160, 110)
        for (let i = 0; i < 3; i++) {
          ctx.fillStyle = ['#d66939', '#f4ae49', '#ffe09a'][i]!
          const w = 8 - i * 2.5, flame = -18 + i * 4 + Math.sin(time * 13 + i * 2 + x) * 3
          ctx.beginPath(); ctx.moveTo(x - w, CAVERN_FLOOR - 21); ctx.quadraticCurveTo(x - w, CAVERN_FLOOR - 28, x + Math.sin(time * 7 + i) * 2, CAVERN_FLOOR - 21 + flame); ctx.quadraticCurveTo(x + w * 0.3, CAVERN_FLOOR - 28, x + w, CAVERN_FLOOR - 21); ctx.fill()
        }
      }
    }
    ctx.restore()
  }

  // Foam and spray where a waterfall meets the river, in front of Harry.
  splash(ctx: CanvasRenderingContext2D, c: Chamber, time: number) {
    const river = c.rivers[0]!, x = river.left + (river.right - river.left) * 0.6
    for (let i = 0; i < 10; i++) {
      const life = (time * 1.4 + noise(i + c.seed)) % 1, dx = (noise(i + 3) - 0.5) * 50
      ctx.fillStyle = `rgba(228, 251, 246, ${0.45 * (1 - life)})`
      ctx.beginPath(); ctx.ellipse(x + dx * (0.4 + life), WATER_SURFACE - life * 14, 5 + life * 7, 2.5 + life * 2, 0, 0, TAU); ctx.fill()
    }
    const mist = ctx.createRadialGradient(x, WATER_SURFACE, 0, x, WATER_SURFACE, 70)
    mist.addColorStop(0, '#d8f2ec30'); mist.addColorStop(1, '#d8f2ec00')
    ctx.fillStyle = mist; ctx.fillRect(x - 70, WATER_SURFACE - 70, 140, 100)
  }

  // A cave bat on the wing, seen from the front with its wings beating, tilted the way it flies.
  bat(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, facing: number) {
    const beat = Math.sin(time * 24 + x * 0.02)
    ctx.save(); ctx.translate(x, y); ctx.scale(facing, 1); ctx.rotate(0.12)
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    for (const side of [-1, 1]) {
      const tip = -10 * beat, mid = -4 * beat
      const edge = () => { ctx.moveTo(side * 3, -3); ctx.quadraticCurveTo(side * 10, -9 + mid, side * 21, tip - 2) }
      ctx.fillStyle = '#5a4352'; ctx.beginPath(); edge()
      ctx.quadraticCurveTo(side * 18, tip + 4, side * 15, mid + 4); ctx.quadraticCurveTo(side * 12, mid + 1, side * 9, mid + 5); ctx.quadraticCurveTo(side * 6, 2, side * 3, 4)
      ctx.closePath(); ctx.fill()
      ctx.strokeStyle = '#9a7c8f'; ctx.lineWidth = 1.4; ctx.beginPath(); edge(); ctx.stroke()
    }
    ctx.fillStyle = '#6b5265'; ctx.beginPath(); ctx.ellipse(0, 1, 4.5, 6, 0, 0, TAU); ctx.fill()
    ctx.beginPath(); ctx.arc(0.5, -5, 4, 0, TAU); ctx.fill()
    ctx.fillStyle = '#c9939f'; ctx.beginPath(); ctx.moveTo(-3.5, -7); ctx.lineTo(-2.5, -12.5); ctx.lineTo(-0.6, -8.5); ctx.moveTo(4.5, -7); ctx.lineTo(3.5, -12.5); ctx.lineTo(1.6, -8.5); ctx.fill()
    ctx.fillStyle = '#ffb46b'; ctx.fillRect(-2, -6.3, 1.5, 1.5); ctx.fillRect(1.5, -6.3, 1.5, 1.5)
    ctx.fillStyle = '#f2ead8'; ctx.fillRect(-0.9, -2.6, 0.9, 1.6); ctx.fillRect(1, -2.6, 0.9, 1.6)
    ctx.restore()
  }

  // A cave rat scurrying along on quick little legs, drawn facing right and mirrored to face the way it runs.
  rat(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, facing: number) {
    const run = Math.sin(time * 28 + x * 0.1)
    ctx.save(); ctx.translate(x, y); ctx.scale(facing, 1)
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    ctx.fillStyle = '#1a140c55'; ctx.beginPath(); ctx.ellipse(0, 0, 15, 2.5, 0, 0, TAU); ctx.fill()
    ctx.strokeStyle = '#c99a8a'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(-10, -5); ctx.quadraticCurveTo(-20, -2 + run * 2, -28, -7 + run * 3); ctx.stroke()
    ctx.strokeStyle = '#4e463d'; ctx.lineWidth = 2
    for (const [hip, phase] of [[-6, 0], [-3, Math.PI], [4, Math.PI / 2], [7, Math.PI * 1.5]] as const) {
      const step = Math.sin(time * 28 + x * 0.1 + phase) * 3
      ctx.beginPath(); ctx.moveTo(hip, -4); ctx.lineTo(hip + step, -0.5); ctx.stroke()
    }
    ctx.fillStyle = '#3a332c'; ctx.beginPath(); ctx.ellipse(-1, -7, 11, 6.5, 0, 0, TAU); ctx.fill()
    ctx.fillStyle = '#7d7266'; ctx.beginPath(); ctx.ellipse(-1, -7.5, 10, 5.5, 0, 0, TAU); ctx.fill()
    ctx.fillStyle = '#a39686'; ctx.beginPath(); ctx.ellipse(-2, -10, 7, 2.2, -0.1, 0, TAU); ctx.fill()
    ctx.fillStyle = '#7d7266'; ctx.beginPath(); ctx.moveTo(6, -12); ctx.quadraticCurveTo(14, -11, 17, -6); ctx.quadraticCurveTo(12, -3, 5, -3); ctx.fill()
    ctx.fillStyle = '#e3a3a0'; ctx.beginPath(); ctx.arc(17, -6, 1.6, 0, TAU); ctx.fill()
    ctx.beginPath(); ctx.ellipse(6, -12.5, 2.8, 3.2, -0.3, 0, TAU); ctx.fill()
    ctx.fillStyle = '#1b130b'; ctx.beginPath(); ctx.arc(10.5, -9, 1.3, 0, TAU); ctx.fill()
    ctx.fillStyle = '#ff9b7a'; ctx.fillRect(10.6, -9.6, 0.7, 0.7)
    ctx.strokeStyle = '#d8ccae88'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(15, -6); ctx.lineTo(21, -8); ctx.moveTo(15, -5.5); ctx.lineTo(21, -4); ctx.stroke()
    ctx.restore()
  }

  // An electric eel, drawn facing right and mirrored to face the way it swims. Sparks crackle along it.
  eel(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, facing: number) {
    ctx.save(); ctx.translate(x, y); ctx.scale(facing, 1)
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    const points = Array.from({ length: 13 }, (_, i) => [22 - i / 12 * 56, Math.sin(time * 8 - i / 12 * 5) * 4 * i / 12] as const)
    const body = (color: string, width: number, offset = 0) => {
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath()
      for (const [px, py] of points) ctx.lineTo(px, py + offset)
      ctx.stroke()
    }
    body(`rgba(225, 245, 120, ${0.22 + Math.max(0, Math.sin(time * 5 + x * 0.01)) * 0.25})`, 17)
    body('#141a10', 11); body('#3f4c2c', 8); body('#c9b25a', 2, 2.5)
    ctx.fillStyle = '#141a10'; ctx.beginPath(); ctx.ellipse(24, 0, 8, 5.5, 0, 0, TAU); ctx.fill()
    ctx.fillStyle = '#4b5a33'; ctx.beginPath(); ctx.ellipse(24, -0.5, 7, 4.5, 0, 0, TAU); ctx.fill()
    ctx.fillStyle = '#f2e27a'; ctx.beginPath(); ctx.arc(27, -1.5, 1.6, 0, TAU); ctx.fill()
    ctx.fillStyle = '#141a10'; ctx.fillRect(27, -2.3, 0.9, 1.8)
    // Short zigzag sparks that flicker on and off along the body.
    const flicker = Math.floor(time * 14)
    ctx.strokeStyle = '#f4f9b0'; ctx.lineWidth = 1.2
    for (let i = 0; i < 3; i++) {
      if (noise(flicker * 3 + i + facing) < 0.45) continue
      const [sx, sy] = points[2 + i * 4]!, d = noise(flicker + i * 7) > 0.5 ? 1 : -1
      ctx.beginPath(); ctx.moveTo(sx, sy - 5 * d); ctx.lineTo(sx + 3, sy - 9 * d); ctx.lineTo(sx - 2, sy - 12 * d); ctx.lineTo(sx + 2, sy - 16 * d); ctx.stroke()
    }
    ctx.restore()
  }

  tree(ctx: CanvasRenderingContext2D, x: number, width: number, dark: string, light: string) {
    ctx.fillStyle = dark
    ctx.beginPath(); ctx.moveTo(x - width / 2, 42); ctx.lineTo(x + width / 2, 40); ctx.lineTo(x + width / 2 - 6, 252); ctx.quadraticCurveTo(x + width / 2, 283, x + width, 306); ctx.quadraticCurveTo(x + 7, 296, x, 290); ctx.lineTo(x - width, 307); ctx.quadraticCurveTo(x - width / 2 + 3, 260, x - width / 2, 42); ctx.fill()
    ctx.strokeStyle = light; ctx.lineWidth = width / 6
    ctx.beginPath(); ctx.moveTo(x - width / 7, 55); ctx.quadraticCurveTo(x + 5, 187, x - 5, 284); ctx.stroke()
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 10, 87); ctx.quadraticCurveTo(x + 3, 172, x + 9, 225); ctx.stroke()
    this.fern(ctx, x - width / 2, 308, width * 0.6, '#3e6138')
  }

  leaf(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, length: number, color: string) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.fillStyle = color
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(length / 3, -length / 2, length, 0); ctx.quadraticCurveTo(length / 3, length / 3, 0, 0); ctx.fill(); ctx.restore()
  }

  fern(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
    for (let i = 0; i < 7; i++) this.leaf(ctx, x, y, -2.9 + i * 0.44, size * (0.7 + Math.sin(i / 6 * Math.PI) * 0.4), color)
  }

  foreground(ctx: CanvasRenderingContext2D, time: number) {
    this.fern(ctx, 6, 328, 53, '#264730'); this.fern(ctx, 951, 329, 49, '#23442f')
    for (const x of [28, 923]) {
      ctx.strokeStyle = '#254b32'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, 0); ctx.quadraticCurveTo(x + 15, 82, x, 167); ctx.stroke()
      for (let i = 0; i < 8; i++) this.leaf(ctx, x + Math.sin(i * 0.4) * 5, 35 + i * 15, (i % 2 ? -0.4 : 3.5) + Math.sin(time + i) * 0.04, 19, '#315c38')
    }
  }

  // Darkened edges, in screen space so they stay put when the view scrolls.
  vignette(ctx: CanvasRenderingContext2D) {
    const vignette = ctx.createLinearGradient(0, 0, WIDTH, 0)
    vignette.addColorStop(0, '#152a2444'); vignette.addColorStop(0.15, '#152a2400'); vignette.addColorStop(0.85, '#152a2400'); vignette.addColorStop(1, '#152a2444')
    ctx.fillStyle = vignette; ctx.fillRect(0, 0, WIDTH, HEIGHT)
  }

  player(ctx: CanvasRenderingContext2D, game: PitfallEngine) {
    const p = game.player
    if (p.invulnerable > 0 && game.status === 'playing' && Math.floor(game.elapsed * 12) % 2) return
    const running = p.grounded && Math.abs(p.vx) > 1
    const stride = running ? Math.sin(game.elapsed * 19) : 0
    ctx.save()
    if (p.swimming) {
      // Swimming, Harry's figure is turned on its side: face down, head toward the way he swims.
      ctx.translate(Math.round(p.x), Math.round(p.y + Math.sin(game.elapsed * 3) * 1.2)); ctx.scale(p.facing, 1)
      ctx.translate(-22, 0); ctx.rotate(Math.PI / 2)
    } else { ctx.translate(Math.round(p.x), Math.round(p.y)); ctx.scale(p.facing, 1) }
    if (p.grounded) { ctx.fillStyle = '#202c283a'; ctx.beginPath(); ctx.ellipse(0, 1, 19, 4, 0, 0, TAU); ctx.fill() }
    // Harry: jointed arms and legs (far side darker, behind the body), a shaded shirt with a
    // pack, belt and collar, a face with ear, brow and nose, and a banded pith helmet. Drawn facing
    // right; feet at y = 0 and the hat brim at about y = -45.
    const t = game.elapsed
    const outline = '#2a2216', skin = '#dbb485', skinShade = '#b8905f'
    const shirt = '#7e9656', shirtShade = '#5f7440', shirtLight = '#a3b56f'
    const pantsNear = '#7a6440', pantsFar = '#5a4a31', boot = '#3d3021', sole = '#231a10'
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    const line = (color: string, width: number, points: number[], edge = true) => {
      const path = () => { ctx.beginPath(); ctx.moveTo(points[0]!, points[1]!); for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i]!, points[i + 1]!) }
      if (edge) { ctx.strokeStyle = outline; ctx.lineWidth = width + 2; path(); ctx.stroke() }
      ctx.strokeStyle = color; ctx.lineWidth = width; path(); ctx.stroke()
    }
    // Angles are measured from straight down; positive swings toward the way Harry faces.
    const joint = (x: number, y: number, angle: number, length: number) => [x + Math.sin(angle) * length, y + Math.cos(angle) * length] as const
    // Two-bone reach for hands that hold something (vine, ladder rungs). The elbow bends outward,
    // or down below the hand when `under` is set.
    const reach = (sx: number, sy: number, hx: number, hy: number, a: number, b: number, under = false) => {
      const dx = hx - sx, dy = hy - sy, d = Math.min(Math.hypot(dx, dy), a + b - 0.01)
      const base = Math.atan2(dy, dx), bend = Math.acos(Math.max(-1, Math.min(1, (a * a + d * d - b * b) / (2 * a * d)))) * (under ? -1 : 1)
      return [sx + Math.cos(base - bend) * a, sy + Math.sin(base - bend) * a, sx + Math.cos(base) * d, sy + Math.sin(base) * d] as const
    }
    let legs: [number, number, number, number], arms: [number, number, number, number] | null = null
    let hands: [number, number, number, number] | null = null
    if (p.swinging) { legs = [0.45, 0.6, 0.15, 0.75]; hands = [1, -47, 4, -48] }
    // Climbing: the cycle follows height (one stroke per two rungs), so Harry holds still when he stops.
    // Hands grip out in front at shoulder height with the elbows tucked down at mid-torso.
    else if (p.climbing) { const c = Math.sin(p.y * TAU / 32); legs = [0.45 + 0.35 * c, 1, 0.45 - 0.35 * c, 1]; hands = [11, -33 - 2.5 * c, 9, -33 + 2.5 * c] }
    else if (p.swimming) { const kick = Math.sin(t * 10) * 0.3, stroke = Math.sin(t * 5) * 1.3; legs = [0.2 + kick, 0.25, 0.2 - kick, 0.25]; arms = [Math.PI / 2 + stroke, 0.3, Math.PI / 2 - stroke, 0.3] }
    else if (!p.grounded) { legs = [1, 1.4, -0.25, 1]; arms = [2.4, 0.35, -0.7, 0.5] }
    else if (stride) { legs = [stride * 0.7, 0.25 + Math.max(0, -stride) * 1.1, -stride * 0.7, 0.25 + Math.max(0, stride) * 1.1]; arms = [-stride * 0.8, 0.9, stride * 0.8, 0.9] }
    else { const breathe = Math.sin(t * 2.2) * 0.04; legs = [0.06, 0.1, -0.1, 0.12]; arms = [0.12 + breathe, 0.35, -0.12 - breathe, 0.3] }
    const hipY = -20, shoulder = [1, -31] as const
    const drawLeg = (thigh: number, bend: number, pants: string, far: boolean) => {
      const knee = joint(far ? -1 : 1, hipY, thigh, 10.5)
      const ankle = joint(knee[0], knee[1], thigh - bend, 10)
      line(pants, 6, [far ? -1 : 1, hipY, knee[0], knee[1]]); line(pants, 5, [knee[0], knee[1], ankle[0], ankle[1]])
      // Boot: a rounded toe pointing forward with a darker sole.
      ctx.save(); ctx.translate(ankle[0], ankle[1]); ctx.rotate(Math.max(-0.6, Math.min(0.6, (thigh - bend) * 0.6)))
      ctx.fillStyle = outline; ctx.beginPath(); ctx.ellipse(2, -1.5, 5.5, 3.5, 0, 0, TAU); ctx.fill()
      ctx.fillStyle = far ? '#2f2519' : boot; ctx.beginPath(); ctx.ellipse(2, -1.8, 4.5, 2.7, 0, 0, TAU); ctx.fill()
      ctx.fillStyle = sole; ctx.fillRect(-2.5, 0, 9, 1.4)
      ctx.restore()
    }
    const drawArm = (shoulderX: number, upper: number, bend: number, sleeve: string, hand: string, target?: readonly [number, number]) => {
      let elbow: readonly [number, number], wrist: readonly [number, number]
      if (target) { const r = reach(shoulderX, shoulder[1], target[0], target[1], 8, 8, p.climbing); elbow = [r[0], r[1]]; wrist = [r[2], r[3]] }
      else { elbow = joint(shoulderX, shoulder[1], upper, 8); wrist = joint(elbow[0], elbow[1], upper + bend, 7.5) }
      line(sleeve, 5, [shoulderX, shoulder[1], elbow[0], elbow[1]])
      line(hand, 3.6, [elbow[0], elbow[1], wrist[0], wrist[1]])
      ctx.fillStyle = outline; ctx.beginPath(); ctx.arc(wrist[0], wrist[1], 2.6, 0, TAU); ctx.fill()
      ctx.fillStyle = hand; ctx.beginPath(); ctx.arc(wrist[0], wrist[1], 1.9, 0, TAU); ctx.fill()
      // Rolled sleeve cuff at the elbow.
      ctx.fillStyle = shirtLight; ctx.beginPath(); ctx.arc(elbow[0], elbow[1], 2.2, 0, TAU); ctx.fill()
    }
    // Far side: arm and leg behind the body.
    drawArm(-1, arms ? arms[2] : 0, arms ? arms[3] : 0, shirtShade, skinShade, hands ? [hands[2], hands[3]] : undefined)
    drawLeg(legs[2], legs[3], pantsFar, true)
    drawLeg(legs[0], legs[1], pantsNear, false)
    // Seat of the trousers joining the legs.
    ctx.fillStyle = outline; ctx.beginPath(); ctx.ellipse(0, hipY + 1, 6.5, 4, 0, 0, TAU); ctx.fill()
    ctx.fillStyle = pantsNear; ctx.beginPath(); ctx.ellipse(0, hipY + 1, 5.5, 3.2, 0, 0, TAU); ctx.fill()
    // Pack on the back, with a flap and a strap.
    ctx.fillStyle = outline; ctx.beginPath(); ctx.roundRect(-11.5, -33.5, 8, 14, 2.5); ctx.fill()
    ctx.fillStyle = '#756745'; ctx.beginPath(); ctx.roundRect(-10.8, -32.8, 6.6, 12.6, 2); ctx.fill()
    ctx.fillStyle = '#5d5235'; ctx.fillRect(-10.8, -32.8, 6.6, 4); ctx.fillStyle = '#c9a85e'; ctx.fillRect(-8.2, -29.4, 1.6, 1.6)
    // Shirt: a tapered torso, shaded on the back, lit on the chest, with a pocket and collar.
    ctx.fillStyle = outline; ctx.beginPath(); ctx.moveTo(-6.2, -33); ctx.quadraticCurveTo(1, -35.5, 7.2, -33); ctx.lineTo(6.2, -19); ctx.lineTo(-5.8, -19); ctx.closePath(); ctx.fill()
    const torso = ctx.createLinearGradient(-5, 0, 6, 0); torso.addColorStop(0, shirtShade); torso.addColorStop(0.55, shirt); torso.addColorStop(1, shirtLight)
    ctx.fillStyle = torso; ctx.beginPath(); ctx.moveTo(-5.2, -32.2); ctx.quadraticCurveTo(1, -34.5, 6.2, -32.2); ctx.lineTo(5.3, -19.8); ctx.lineTo(-4.9, -19.8); ctx.closePath(); ctx.fill()
    ctx.strokeStyle = shirtShade; ctx.lineWidth = 0.8; ctx.strokeRect(1.5, -29.5, 3.2, 3.2); ctx.beginPath(); ctx.moveTo(0.6, -32.5); ctx.lineTo(0.6, -21); ctx.stroke()
    ctx.fillStyle = skin; ctx.beginPath(); ctx.moveTo(0.5, -33.6); ctx.lineTo(4.4, -33.6); ctx.lineTo(2.5, -30.5); ctx.closePath(); ctx.fill()
    ctx.strokeStyle = '#5a4a30'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-4.5, -32.5); ctx.lineTo(5, -21.5); ctx.stroke()
    // Belt with a brass buckle.
    ctx.fillStyle = '#4a3b26'; ctx.fillRect(-5.4, -21.4, 11, 2.8); ctx.fillStyle = '#d0ac62'; ctx.fillRect(2.4, -21.8, 3.2, 3.6); ctx.fillStyle = '#4a3b26'; ctx.fillRect(3.3, -20.9, 1.4, 1.8)
    // Head: neck, face, ear, sideburn, brow, eye, nose, and mouth.
    ctx.fillStyle = skinShade; ctx.fillRect(0.5, -36, 4, 3.5)
    ctx.fillStyle = outline; ctx.beginPath(); ctx.ellipse(3, -39.5, 6.3, 6.3, 0, 0, TAU); ctx.fill()
    ctx.fillStyle = skin; ctx.beginPath(); ctx.ellipse(3, -39.5, 5.4, 5.5, 0, 0, TAU); ctx.fill()
    ctx.fillStyle = skin; ctx.beginPath(); ctx.moveTo(7.8, -41); ctx.lineTo(10.2, -38.4); ctx.lineTo(7.8, -37.6); ctx.closePath(); ctx.fill()
    ctx.fillStyle = skinShade; ctx.beginPath(); ctx.ellipse(3.8, -35.6, 3.6, 1.4, 0, 0, TAU); ctx.fill()
    ctx.fillStyle = '#4d3e28'; ctx.beginPath(); ctx.ellipse(-1.2, -40.5, 2.2, 3.6, 0, 0, TAU); ctx.fill()
    ctx.fillStyle = skinShade; ctx.beginPath(); ctx.ellipse(0.8, -39.2, 1.5, 2.1, 0, 0, TAU); ctx.fill()
    ctx.fillStyle = '#1f1810'; ctx.fillRect(5.6, -41, 1.6, 1.9)
    ctx.strokeStyle = '#4d3e28'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(4.6, -42.6); ctx.lineTo(7.8, -42.2); ctx.stroke()
    ctx.strokeStyle = '#8f6a45'; ctx.beginPath(); ctx.moveTo(5.5, -36.8); ctx.lineTo(7.6, -37); ctx.stroke()
    // Pith helmet: domed crown, band, and a wide brim that shades the eyes.
    ctx.fillStyle = outline; ctx.beginPath(); ctx.ellipse(2.5, -44.3, 11.5, 2.8, 0, 0, TAU); ctx.fill()
    ctx.beginPath(); ctx.ellipse(2.5, -46, 7.3, 5.3, 0, Math.PI, TAU); ctx.fill()
    ctx.fillStyle = '#c2ad7c'; ctx.beginPath(); ctx.ellipse(2.5, -46, 6.4, 4.5, 0, Math.PI, TAU); ctx.fill()
    ctx.fillStyle = '#ddc995'; ctx.beginPath(); ctx.ellipse(4.2, -48.4, 2.6, 1.3, -0.2, 0, TAU); ctx.fill()
    ctx.fillStyle = '#5a4a30'; ctx.fillRect(-3.9, -46.6, 12.8, 1.8)
    ctx.fillStyle = '#b39d6b'; ctx.beginPath(); ctx.ellipse(2.5, -44.4, 10.6, 2, 0, 0, TAU); ctx.fill()
    ctx.fillStyle = '#8f7b50'; ctx.beginPath(); ctx.ellipse(2.5, -43.8, 10, 1, 0, 0, Math.PI); ctx.fill()
    // Near arm in front of the body.
    drawArm(2.5, arms ? arms[0] : 0, arms ? arms[1] : 0, shirt, skin, hands ? [hands[0], hands[1]] : undefined)
    ctx.restore()
  }

  log(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
    ctx.fillStyle = '#44351e'; ctx.beginPath(); ctx.ellipse(x, y + 13, 23, 4, 0, 0, TAU); ctx.fill()
    // Bark body: the far end is rounded with the same curve as the cut face on the right.
    ctx.save(); ctx.beginPath(); ctx.moveTo(x + 12, y - 13); ctx.lineTo(x + 12, y + 13); ctx.lineTo(x - 12, y + 13)
    ctx.ellipse(x - 12, y, 8, 13, 0, Math.PI / 2, Math.PI * 1.5); ctx.closePath()
    ctx.fillStyle = '#765230'; ctx.fill(); ctx.clip()
    ctx.fillStyle = '#a47943'; ctx.fillRect(x - 20, y - 9, 34, 4)
    ctx.fillStyle = '#503c26'; ctx.fillRect(x - 20, y + 6, 34, 3)
    ctx.restore()
    ctx.fillStyle = '#c69c5c'; ctx.beginPath(); ctx.ellipse(x + 12, y, 8, 13, 0, 0, TAU); ctx.fill()
    ctx.strokeStyle = '#795a33'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.ellipse(x + 12, y, 4, 8, 0, 0, TAU); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(x + 12, y); ctx.lineTo(x + 12 + Math.cos(-time * 7) * 6, y + Math.sin(-time * 7) * 10); ctx.stroke()
  }

  crocodile(ctx: CanvasRenderingContext2D, x: number, y: number, open: boolean) {
    // Only the head breaks the surface. Drawn jaws-right, then mirrored so the jaws face left.
    ctx.save(); ctx.translate(x, y); ctx.scale(-1, 1)
    ctx.fillStyle = '#37512e'; ctx.beginPath(); ctx.moveTo(-17, 3); ctx.quadraticCurveTo(-17, -11, -6, -11); ctx.lineTo(4, -9); ctx.lineTo(4, 3); ctx.fill()
    ctx.fillStyle = '#6f894b'; ctx.fillRect(-14, -11, 16, 5)
    ctx.fillStyle = '#37512e'; ctx.fillRect(2, -2, 24, 5)
    if (open) { ctx.fillStyle = '#efdfa9'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(4 + i * 6, -2); ctx.lineTo(6 + i * 6, -6); ctx.lineTo(8 + i * 6, -2); ctx.fill() } }
    ctx.save(); ctx.translate(2, -4); if (open) ctx.rotate(-0.65)
    ctx.fillStyle = '#6f894b'; ctx.fillRect(0, -5, 24, 6); ctx.fillRect(20, -7, 4, 2)
    ctx.fillStyle = '#efdfa9'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(2 + i * 6, 1); ctx.lineTo(4 + i * 6, 5); ctx.lineTo(6 + i * 6, 1); ctx.fill() }
    ctx.restore()
    ctx.fillStyle = '#9caa64'; ctx.beginPath(); ctx.ellipse(-7, -12, 5, 4, 0, 0, TAU); ctx.fill()
    ctx.fillStyle = '#dbc667'; ctx.fillRect(-10, -15, 6, 5); ctx.fillStyle = '#172b23'; ctx.fillRect(-8, -14, 2, 4)
    ctx.strokeStyle = '#73977799'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(4, 3, 24, 2, 0, 0, TAU); ctx.stroke()
    ctx.restore()
  }

  // A coiled cobra with its hood raised, drawn facing right; every cobra in the jungle is mirrored to face left.
  snake(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, facing: number) {
    const outline = '#1f2a15', body = '#55723a', light = '#7f9a4f', band = '#2f4320', belly = '#d3c77f', hood = '#6c8943'
    const sway = Math.sin(time * 4) * 2.5, bob = Math.sin(time * 2) * 1
    ctx.save(); ctx.translate(x, y); ctx.scale(facing, 1)
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    ctx.fillStyle = '#1a140c55'; ctx.beginPath(); ctx.ellipse(-2, 0, 22, 3, 0, 0, TAU); ctx.fill()
    // Coils resting on the ground: the tail tucks around the back, then the body loops forward.
    const coil = new Path2D()
    coil.moveTo(-21, -2); coil.bezierCurveTo(-14, -1, -2, 0, 10, -3)
    coil.bezierCurveTo(18, -6, 12, -12, 0, -10)
    coil.bezierCurveTo(-12, -9, -16, -5, -8, -5)
    coil.bezierCurveTo(0, -5, 4, -9, 2, -14)
    const neck = new Path2D()
    neck.moveTo(2, -14); neck.bezierCurveTo(-2, -20, -4 + sway * 0.4, -24 + bob, sway, -30 + bob)
    const stroke = (path: Path2D, color: string, width: number, dash: number[] = []) => { ctx.setLineDash(dash); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke(path) }
    for (const path of [coil, neck]) { stroke(path, outline, 9); stroke(path, body, 7) }
    stroke(coil, band, 7, [2.5, 6]); stroke(neck, band, 7, [2.5, 6])
    stroke(coil, light, 2, [5, 3.5]); ctx.setLineDash([])
    // Spread hood with a pale belly and the cobra's spectacle marking.
    const hx = sway + 1, hy = -31 + bob
    ctx.fillStyle = outline; ctx.beginPath(); ctx.ellipse(hx, hy, 7.5, 11, 0, 0, TAU); ctx.fill()
    ctx.fillStyle = hood; ctx.beginPath(); ctx.ellipse(hx, hy, 6.5, 10, 0, 0, TAU); ctx.fill()
    ctx.fillStyle = belly; ctx.beginPath(); ctx.ellipse(hx + 2.5, hy + 2, 3, 7.5, 0, 0, TAU); ctx.fill()
    ctx.strokeStyle = '#a79c5e'; ctx.lineWidth = 0.8
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(hx + 0.5, hy - 3 + i * 2.6); ctx.lineTo(hx + 5, hy - 3 + i * 2.6); ctx.stroke() }
    ctx.strokeStyle = '#e3d58e'; ctx.lineWidth = 1.2
    ctx.beginPath(); ctx.arc(hx - 2.8, hy - 3, 1.8, 0, TAU); ctx.moveTo(hx - 1, hy - 3); ctx.lineTo(hx + 0.5, hy - 3); ctx.stroke()
    // Head angled forward with a glinting eye, slit pupil, and nostril.
    ctx.save(); ctx.translate(hx + 3, hy - 9); ctx.rotate(0.15)
    ctx.fillStyle = outline; ctx.beginPath(); ctx.ellipse(2, 0, 7.5, 4.8, 0, 0, TAU); ctx.fill()
    ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(2, -0.2, 6.5, 3.9, 0, 0, TAU); ctx.fill()
    ctx.fillStyle = light; ctx.beginPath(); ctx.ellipse(1, -2, 4.5, 1.3, 0, 0, TAU); ctx.fill()
    ctx.fillStyle = belly; ctx.beginPath(); ctx.ellipse(3, 2.4, 4.5, 1.2, 0, 0, TAU); ctx.fill()
    ctx.fillStyle = '#e8c65a'; ctx.beginPath(); ctx.arc(4, -1, 1.7, 0, TAU); ctx.fill()
    ctx.fillStyle = '#16100a'; ctx.fillRect(3.7, -2.4, 0.8, 2.8); ctx.fillRect(8, -0.8, 1, 1)
    // A forked tongue that flicks out every so often.
    if (Math.sin(time * 5) > 0.4) {
      const flick = Math.sin(time * 40) * 1.2
      ctx.strokeStyle = '#c2413a'; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(9, 1); ctx.lineTo(14, 1.5); ctx.lineTo(17, 0 + flick); ctx.moveTo(14, 1.5); ctx.lineTo(17, 3 + flick); ctx.stroke()
    }
    ctx.restore()
    ctx.restore()
  }

  fire(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
    ctx.strokeStyle = '#65482d'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x - 17, y - 2); ctx.lineTo(x + 16, y - 7); ctx.moveTo(x - 15, y - 8); ctx.lineTo(x + 17, y - 2); ctx.stroke()
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = ['#d66939', '#f4ae49', '#ffe09a'][i]!
      const w = 17 - i * 5; const top = -40 + i * 8 + Math.sin(time * 12 + i) * 5
      ctx.beginPath(); ctx.moveTo(x - w, y - 7); ctx.quadraticCurveTo(x - w - 2, y - 22, x + 4, y + top); ctx.quadraticCurveTo(x, y - 22, x + w, y - 7); ctx.fill()
    }
  }

  // Drawn facing right (claws toward +x), then mirrored so it always faces the way it walks.
  scorpion(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, facing: number) {
    const outline = '#4a3622', dark = '#7a5a38', mid = '#a8845a', light = '#d2b384', shine = '#ecd6a6'
    ctx.save(); ctx.translate(x, y); ctx.scale(facing, 1)
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    ctx.fillStyle = '#1a140c55'; ctx.beginPath(); ctx.ellipse(0, 0, 24, 3, 0, 0, TAU); ctx.fill()
    // Four jointed legs per side, far side darker and behind the body; alternating gait.
    const legs = (color: string, width: number, phase: number, lift: number) => {
      ctx.strokeStyle = color; ctx.lineWidth = width
      for (let i = 0; i < 4; i++) {
        const step = Math.sin(time * 14 + i * 1.7 + phase) * 3
        const hip = 6 - i * 5, knee = hip + 3 - i * 2.5 + step * 0.5, foot = hip + 5 - i * 4.5 + step
        ctx.beginPath(); ctx.moveTo(hip, -10 - lift); ctx.lineTo(knee, -17 - lift - i * 0.5); ctx.lineTo(foot, -1); ctx.stroke()
      }
    }
    legs(dark, 2, Math.PI, 1.5)
    // Tail: five segments arching back and over, ending in a bulb and a forward-pointing barb.
    const sway = Math.sin(time * 3) * 1.5
    const tail = [[-15, -12], [-22, -17], [-26, -25], [-24, -33], [-17, -39], [-9 + sway, -40]]
    tail.forEach(([tx, ty], i) => {
      const r = 3 + i * 0.25
      ctx.fillStyle = outline; ctx.beginPath(); ctx.arc(tx!, ty!, r + 1, 0, TAU); ctx.fill()
      ctx.fillStyle = i % 2 ? mid : light; ctx.beginPath(); ctx.arc(tx!, ty!, r, 0, TAU); ctx.fill()
      ctx.fillStyle = shine; ctx.beginPath(); ctx.arc(tx! - 0.8, ty! - 1.2, r * 0.35, 0, TAU); ctx.fill()
    })
    const [sx, sy] = [-3 + sway, -37]
    ctx.fillStyle = outline; ctx.beginPath(); ctx.ellipse(sx, sy, 5, 4, 0.5, 0, TAU); ctx.fill()
    ctx.fillStyle = '#c0703e'; ctx.beginPath(); ctx.ellipse(sx, sy, 4, 3, 0.5, 0, TAU); ctx.fill()
    ctx.strokeStyle = '#2b1e12'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(sx + 3, sy + 1); ctx.quadraticCurveTo(sx + 7, sy + 3, sx + 5, sy + 8); ctx.stroke()
    // Segmented abdomen and a carapace with eyes.
    const body = ctx.createLinearGradient(0, -18, 0, -5)
    body.addColorStop(0, light); body.addColorStop(0.6, mid); body.addColorStop(1, dark)
    ctx.fillStyle = outline; ctx.beginPath(); ctx.ellipse(-3, -11, 15, 6.5, 0, 0, TAU); ctx.fill()
    ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(-3, -11, 14, 5.5, 0, 0, TAU); ctx.fill()
    ctx.strokeStyle = '#5e452b'; ctx.lineWidth = 1
    for (let i = 0; i < 5; i++) { const sxg = -13 + i * 4; ctx.beginPath(); ctx.moveTo(sxg, -16); ctx.quadraticCurveTo(sxg + 1.5, -11, sxg, -6); ctx.stroke() }
    ctx.fillStyle = outline; ctx.beginPath(); ctx.ellipse(9, -11, 7, 5.5, 0, 0, TAU); ctx.fill()
    ctx.fillStyle = mid; ctx.beginPath(); ctx.ellipse(9, -11.5, 6, 4.5, 0, 0, TAU); ctx.fill()
    ctx.fillStyle = shine; ctx.beginPath(); ctx.ellipse(8, -14, 3.5, 1.3, 0, 0, TAU); ctx.fill()
    ctx.fillStyle = '#1b130b'; ctx.fillRect(11, -15, 1.6, 1.6); ctx.fillRect(13.5, -14, 1.4, 1.4)
    legs(mid, 2.4, 0, 0)
    // Pedipalps: an elbowed arm and a pincer on each side that slowly opens and snaps shut.
    const claw = (color: string, lift: number, phase: number) => {
      const open = 0.25 + Math.max(0, Math.sin(time * 2.5 + phase)) * 0.35
      ctx.strokeStyle = outline; ctx.lineWidth = 3.6; ctx.beginPath(); ctx.moveTo(13, -11 - lift); ctx.lineTo(19, -17 - lift); ctx.lineTo(25, -14 - lift); ctx.stroke()
      ctx.strokeStyle = color; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(13, -11 - lift); ctx.lineTo(19, -17 - lift); ctx.lineTo(25, -14 - lift); ctx.stroke()
      ctx.save(); ctx.translate(28, -14 - lift)
      ctx.fillStyle = outline; ctx.beginPath(); ctx.ellipse(0, 0, 5, 3.6, 0, 0, TAU); ctx.fill()
      ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(0, 0, 4, 2.7, 0, 0, TAU); ctx.fill()
      ctx.strokeStyle = outline; ctx.lineWidth = 2
      ctx.save(); ctx.translate(3.5, -1); ctx.rotate(-open); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(4, -1, 6, 1); ctx.stroke(); ctx.restore()
      ctx.save(); ctx.translate(3.5, 1); ctx.rotate(open * 0.6); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(4, 1, 6, -1); ctx.stroke(); ctx.restore()
      ctx.restore()
    }
    claw(dark, 3, 1.3)
    claw(light, 0, 0)
    ctx.restore()
  }

  sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + 1, y - 1); ctx.lineTo(x + r, y); ctx.lineTo(x + 1, y + 1); ctx.lineTo(x, y + r); ctx.lineTo(x - 1, y + 1); ctx.lineTo(x - r, y); ctx.lineTo(x - 1, y - 1); ctx.fill()
  }
}
