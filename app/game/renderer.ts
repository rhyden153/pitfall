import { GROUND, HEIGHT, PIT_HALF_WIDTH, PitfallEngine, TUNNEL_TOP, UNDERGROUND, VINE_PIVOT_Y, WIDTH, type Treasure } from './engine'

export type VisualMode = 'modern' | 'classic'
const TAU = Math.PI * 2
const noise = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x) }
// Classic mode snaps every pixel of its low-resolution frame to this palette, so anti-aliased edges
// become solid blocks like the original. It holds the classic scenery and Harry's colours exactly,
// plus a clustered set of the other sprite colours.
// Classic Harry, 8 x 15 blocks of 3 x 3 (one classic pixel each), facing right. Frames are built
// from a head, a torso/arms section, and legs. Lower-case letters are the far arm and leg, drawn a
// shade darker so the swing of each limb reads clearly.
const HARRY_COLORS: Record<string, string> = { H: '#34271d', S: '#e6b36f', s: '#d98a6a', G: '#9dbe56', g: '#799632', B: '#354771', N: '#26335a', D: '#d2af76', d: '#b49348' }
const HARRY_HEAD = ['..HHHH..', '..HHHHH.', '..HSSH..', '..SSSSS.', '...SS...']
const HARRY_ARMS = {
  side: ['..GGGG..', '..GGGG..', '..GGGG..', '..GGGS..', '..BBBB..'],
  // Near arm forward, far arm back.
  forward: ['..GGGG..', '.gGGGGG.', 'ssGGGGSS', '..GGGG..', '..BBBB..'],
  // Near arm back, far arm forward.
  back: ['..GGGG..', '.GGGGGg.', 'SSGGGGss', '..GGGG..', '..BBBB..'],
}
const HARRY_REACH = ['.SHHHHS.', '.GHHHHG.', '.GHSSHG.', '..SSSSS.', '...SS...', '..GGGG..', '..GGGG..', '..GGGG..', '..GGGG..', '..BBBB..']
const HARRY_LEGS = {
  stand: ['...NB...', '...NB...', '...NB...', '...NB...', '...dDD..'],
  // Stride with the near leg reaching forward, then passing with the far foot kicked up behind.
  strideNear: ['..N..B..', '.N....B.', '.N.....B', 'N......B', 'd.....DD'],
  passNear: ['..NNB...', '..N.B...', '.N..B...', 'dd..B...', '....DD..'],
  strideFar: ['..B..N..', '.B....N.', '.B.....N', 'B......N', 'D.....dd'],
  passFar: ['..BBN...', '..B.N...', '.B..N...', 'DD..N...', '....dd..'],
  jump: ['..BBBB..', '.NN.BB..', '.N...B..', '.dd..DD.', '........'],
  hang: ['...NB...', '...NB...', '....NB..', '....NB..', '....dDD.'],
  climbA: ['..N..B..', '..N..B..', '..d..B..', '.....B..', '.....D..'],
  climbB: ['..N..B..', '..N..B..', '..N..d..', '..N.....', '..D.....'],
}
// One run cycle: stride, pass, stride on the other leg, pass. Arms swing opposite the legs.
const HARRY_RUN = [
  [...HARRY_HEAD, ...HARRY_ARMS.back, ...HARRY_LEGS.strideNear],
  [...HARRY_HEAD, ...HARRY_ARMS.side, ...HARRY_LEGS.passNear],
  [...HARRY_HEAD, ...HARRY_ARMS.forward, ...HARRY_LEGS.strideFar],
  [...HARRY_HEAD, ...HARRY_ARMS.side, ...HARRY_LEGS.passFar],
]

const CLASSIC_PALETTE = [
  0x849d38, 0x476523, 0x254c24, 0x65502b, 0xa9af47, 0xb49348, 0xd1b05a, 0x252a22, 0x5c5137, 0x98804e,
  0x34271d, 0xe6b36f, 0x9dbe56, 0x354771, 0xd2af76, 0x799632, 0xb5b25f, 0x26335a,
  0x1a140c, 0x493f2d, 0x385e47, 0x8f3a2b, 0x52633d, 0x7a6234, 0x53785a, 0x6e6a5f, 0x697745, 0xb8553a,
  0x6b8a61, 0xd66939, 0xbf882e, 0x96927f, 0x8f9e65, 0xd98a6a, 0xba9e65, 0x8fb894, 0xc2ba79, 0xaabfb5,
  0xf4ae49, 0xcbc4a4, 0xe8c65a, 0xf5d474, 0xc6e5aa, 0xeed791, 0xdbe0cb, 0xffeaaf, 0xffffff,
].map(c => [c >> 16, (c >> 8) & 255, c & 255] as const)

export class JungleRenderer {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  pixelCanvas: HTMLCanvasElement
  pixelCtx: CanvasRenderingContext2D
  paletteCache = new Map<number, number>()
  backdrop: HTMLCanvasElement
  backdropSeed = -1
  mode: VisualMode = 'modern'
  reducedMotion = false

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.pixelCanvas = document.createElement('canvas')
    this.backdrop = document.createElement('canvas')
    this.pixelCanvas.width = 320; this.pixelCanvas.height = 160
    this.pixelCtx = this.pixelCanvas.getContext('2d', { willReadFrequently: true })!
    this.resize()
  }

  resize() {
    const scale = Math.min(window.devicePixelRatio || 1, 2)
    this.canvas.width = WIDTH * scale; this.canvas.height = HEIGHT * scale
    this.backdrop.width = this.canvas.width; this.backdrop.height = this.canvas.height
    this.backdropSeed = -1
  }

  draw(game: PitfallEngine, clock: number) {
    const target = this.ctx
    const classic = this.mode === 'classic'
    const ctx = classic ? this.pixelCtx : target
    const scale = classic ? 1 / 3 : this.canvas.width / WIDTH
    ctx.setTransform(scale, 0, 0, scale, 0, 0)
    ctx.clearRect(0, 0, WIDTH, HEIGHT)
    const time = this.reducedMotion ? 0 : clock
    if (classic) this.background(ctx, game, 0, true)
    else {
      if (this.backdropSeed !== game.room.seed) {
        const backdropContext = this.backdrop.getContext('2d')!
        backdropContext.setTransform(scale, 0, 0, scale, 0, 0)
        this.background(backdropContext, game, 0, false)
        this.backdropSeed = game.room.seed
      }
      ctx.drawImage(this.backdrop, 0, 0, WIDTH, HEIGHT)
      this.motes(ctx, time)
    }
    this.terrain(ctx, game, time, classic)
    if (game.room.vine) {
      const end = game.vine()
      // The pivot is far above the screen; start drawing where the vine emerges from the canopy.
      const topY = 40, topX = 480 + (end.x - 480) * (topY - VINE_PIVOT_Y) / (end.y - VINE_PIVOT_Y)
      ctx.lineCap = 'round'; ctx.strokeStyle = classic ? '#799632' : '#41522b'; ctx.lineWidth = 6
      ctx.beginPath(); ctx.moveTo(topX, topY); ctx.lineTo(end.x, end.y); ctx.stroke()
      ctx.strokeStyle = '#b5b25f'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(topX - 1, topY); ctx.lineTo(end.x - 1, end.y); ctx.stroke()
      for (let i = 0; i < 5; i++) {
        const f = 0.18 + i * 0.14
        this.leaf(ctx, topX + (end.x - topX) * f, topY + (end.y - topY) * f, i % 2 ? 0.5 : 2.8, 10, '#84964a')
      }
    }
    if (game.roomIndex === 0) this.camp(ctx, time, classic)
    for (const x of game.logs()) this.log(ctx, x, GROUND - 13, game.elapsed, classic)
    if (game.room.hazard === 'fire') this.fire(ctx, game.room.hazardX, GROUND, time)
    if (game.room.hazard === 'snake') this.snake(ctx, game.room.hazardX, GROUND, time, game.room.hazardX > 480 ? -1 : 1)
    if (game.room.treasure && !game.collected.has(game.roomIndex)) {
      const bob = Math.sin(time * 3) * 3
      if (!classic) {
        const glow = ctx.createRadialGradient(480, GROUND - 26, 0, 480, GROUND - 26, 56)
        glow.addColorStop(0, '#f5d47455'); glow.addColorStop(1, '#f5d47400')
        ctx.fillStyle = glow; ctx.fillRect(420, GROUND - 88, 120, 88)
      }
      this.treasure(ctx, game.room.treasure, 480, GROUND - 21 + bob)
      this.sparkle(ctx, 450, GROUND - 36 + bob, 4, '#ffeaaf')
      this.sparkle(ctx, 506, GROUND - 52 - bob, 3, '#ffeaaf')
    }
    if (!game.room.ladder) this.scorpion(ctx, game.scorpionX(), UNDERGROUND, time, game.scorpionFacing())
    if (game.deathTimer <= 0 || Math.floor(game.deathTimer * 12) % 2 === 0) this.player(ctx, game, classic)
    for (const p of game.particles) {
      ctx.globalAlpha = Math.min(1, p.life * 2); ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, 5, 5)
    }
    ctx.globalAlpha = 1
    if (!classic) this.foreground(ctx, time)
    if (classic) {
      this.snapToPalette()
      target.setTransform(1, 0, 0, 1, 0, 0)
      target.imageSmoothingEnabled = false
      target.drawImage(this.pixelCanvas, 0, 0, this.canvas.width, this.canvas.height)
    }
  }

  // Replace each pixel of the classic frame with its nearest palette colour (cached per colour).
  snapToPalette() {
    const image = this.pixelCtx.getImageData(0, 0, this.pixelCanvas.width, this.pixelCanvas.height)
    const pixels = new Uint32Array(image.data.buffer)
    const cache = this.paletteCache
    if (cache.size > 65536) cache.clear()
    for (let i = 0; i < pixels.length; i++) {
      const value = pixels[i]!
      let snapped = cache.get(value)
      if (snapped === undefined) {
        const r = value & 255, g = (value >> 8) & 255, b = (value >> 16) & 255
        let best = 0, bestDistance = Infinity
        for (let j = 0; j < CLASSIC_PALETTE.length; j++) {
          const [pr, pg, pb] = CLASSIC_PALETTE[j]!
          const distance = (r - pr) ** 2 * 3 + (g - pg) ** 2 * 4 + (b - pb) ** 2 * 2
          if (distance < bestDistance) { bestDistance = distance; best = j }
        }
        const [pr, pg, pb] = CLASSIC_PALETTE[best]!
        snapped = (0xff000000 | (pb << 16) | (pg << 8) | pr) >>> 0
        cache.set(value, snapped)
      }
      pixels[i] = snapped
    }
    this.pixelCtx.putImageData(image, 0, 0)
  }

  background(ctx: CanvasRenderingContext2D, game: PitfallEngine, time: number, classic: boolean) {
    if (classic) {
      ctx.fillStyle = '#849d38'; ctx.fillRect(0, 0, WIDTH, GROUND)
      ctx.fillStyle = '#476523'; ctx.fillRect(0, 0, WIDTH, 75)
      ctx.fillStyle = '#254c24'
      for (let x = 0; x < WIDTH; x += 70) ctx.fillRect(x, 60, 48, 35)
      ctx.fillStyle = '#65502b'
      for (const x of [100, 265, 680, 840]) ctx.fillRect(x, 60, 20, 237)
      ctx.fillStyle = '#a9af47'; ctx.fillRect(0, 285, WIDTH, GROUND - 285)
      return
    }
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

  terrain(ctx: CanvasRenderingContext2D, game: PitfallEngine, time: number, classic: boolean) {
    ctx.fillStyle = classic ? '#b49348' : '#aa8750'; ctx.fillRect(0, GROUND, WIDTH, TUNNEL_TOP - GROUND)
    ctx.fillStyle = classic ? '#d1b05a' : '#d0b47a'; ctx.fillRect(0, GROUND, WIDTH, 7)
    ctx.fillStyle = classic ? '#252a22' : '#292d24'; ctx.fillRect(0, TUNNEL_TOP, WIDTH, UNDERGROUND - TUNNEL_TOP)
    ctx.fillStyle = '#5c5137'; ctx.fillRect(0, UNDERGROUND, WIDTH, HEIGHT - UNDERGROUND)
    ctx.fillStyle = '#98804e'; ctx.fillRect(0, UNDERGROUND, WIDTH, 5)
    if (!classic) {
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
    }
    if (game.room.ladder) {
      ctx.fillStyle = '#242c20'; ctx.fillRect(456, GROUND, 48, TUNNEL_TOP - GROUND + 7)
      ctx.strokeStyle = classic ? '#c0a65d' : '#ba9e65'; ctx.lineWidth = 5
      ctx.beginPath(); ctx.moveTo(462, GROUND + 4); ctx.lineTo(462, UNDERGROUND); ctx.moveTo(498, GROUND + 4); ctx.lineTo(498, UNDERGROUND)
      for (let y = GROUND + 13; y < UNDERGROUND; y += 16) { ctx.moveTo(462, y); ctx.lineTo(498, y) }
      ctx.stroke()
      if (game.room.holes) {
        for (const x of [248, 656]) { ctx.fillStyle = '#222b20'; ctx.fillRect(x, GROUND, 56, TUNNEL_TOP - GROUND + 4); ctx.fillStyle = '#6f5b37'; ctx.fillRect(x - 3, GROUND, 5, TUNNEL_TOP - GROUND - 5) }
      }
    }
    if (game.room.wall) {
      ctx.fillStyle = '#746549'; ctx.fillRect(690, TUNNEL_TOP - 1, 20, UNDERGROUND - TUNNEL_TOP + 1)
      for (let y = TUNNEL_TOP - 1; y < UNDERGROUND; y += 12) { ctx.fillStyle = '#38392b'; ctx.fillRect(690, y, 20, 2) }
    }
    const pit = game.pitBounds()
    if (pit) {
      const water = game.room.pit === 'water'
      const sand = game.room.pit === 'sand'
      this.pit(ctx, pit.left, pit.right, water ? 'water' : sand ? 'sand' : 'tar', time, classic, game.room.seed)
      if (water) for (const croc of game.crocodiles()) this.crocodile(ctx, croc.x, GROUND, croc.open)
    }
    if (classic) return
    ctx.fillStyle = '#cbc4a477'; ctx.font = '10px monospace'; ctx.textAlign = 'left'
    ctx.fillText('UNDERGROUND  /  1 PASSAGE = 3 SCENES', 24, TUNNEL_TOP + 44)
    if (game.room.ladder) { ctx.textAlign = 'center'; ctx.fillStyle = '#ddd0a488'; ctx.fillText('↓', 480, 299) }
  }

  // A rounded opening in the ground seen at a slight angle. The basin itself stays hidden underground,
  // so the ground in front of the opening is plain dirt.
  pit(ctx: CanvasRenderingContext2D, left: number, right: number, kind: 'water' | 'sand' | 'tar', time: number, classic = false, seed = 0) {
    const palette = {
      water: { wall: '#5f5034', near: '#5d8a6c', far: '#2f5140', ripple: '#8fb89455' },
      sand: { wall: '#7a6234', near: '#b89a5a', far: '#846a3c', ripple: '#f0d38a55' },
      tar: { wall: '#4a4130', near: '#484d3f', far: '#20241c', ripple: '#8a8a6e44' },
    }[kind]
    const cx = (left + right) / 2, rx = (right - left) / 2
    if (rx < 2) return
    const ry = Math.min(11, rx * 0.35), cy = GROUND + 4
    // Classic mode draws a flat, solid opening; shading and ripples would only turn into pixel noise.
    if (classic) {
      ctx.fillStyle = kind === 'sand' ? palette.near : palette.far; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU); ctx.fill()
      if (kind !== 'water' && rx > 30) this.bones(ctx, cx, cy + ry * 0.35, Math.min(1, rx / PIT_HALF_WIDTH), palette.far, true, seed)
      return
    }
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
    if (kind !== 'water' && rx > 30) this.bones(ctx, cx, cy + ry * 0.35, Math.min(1, rx / PIT_HALF_WIDTH), palette.far, false, seed)
    // Only the far rim catches a shadow line; the near edge simply meets the dirt.
    ctx.strokeStyle = '#2d2414aa'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, Math.PI + 0.08, TAU - 0.08); ctx.stroke()
  }

  // Remains of less fortunate explorers poking out of tar or quicksand. Each scene's seed picks
  // three or four pieces, their spots near the middle, and which way each one leans, so no two
  // pits look alike. Everything is clipped at the surface line so it looks like it is sinking in,
  // and it shrinks with a shifting pit.
  bones(ctx: CanvasRenderingContext2D, cx: number, surface: number, s: number, sink: string, classic = false, seed = 0) {
    // Classic mode drops outlines and highlights so each bone stays a clean, solid shape.
    const bone = '#e6dcc0', edge = classic ? bone : '#7a6e55', hollow = '#2a2418', shine = '#fff6df'
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
          if (!classic) { ctx.fillStyle = shine; ctx.beginPath(); ctx.ellipse(x - 3 * f * s, y - 4 * s, 3.5 * s, 2 * s, -0.4 * f, 0, TAU); ctx.fill() }
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
            ctx.fillStyle = classic ? bone : shine; ctx.fillRect(qx - 0.9 * s, qy - 3.4 * s, 1.8 * s, 2.2 * s)
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
    if (classic) return
    // A ring of disturbed surface where each piece goes under.
    ctx.strokeStyle = sink; ctx.lineWidth = 1
    for (const [x, w] of rings) { ctx.beginPath(); ctx.ellipse(x, surface + 1, w * s, 1.6, 0, 0, TAU); ctx.stroke() }
  }

  // Base camp in scene 001: pennant, tent, supplies, and a cooking fire, left of Harry's start.
  camp(ctx: CanvasRenderingContext2D, time: number, classic = false) {
    const g = GROUND
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    // Warm firelight pooled on the ground (modern only; translucent light becomes noise in classic).
    if (!classic) {
      const glow = ctx.createRadialGradient(200, g - 8, 0, 200, g - 8, 90)
      glow.addColorStop(0, `rgba(255, 190, 90, ${0.28 + Math.sin(time * 9) * 0.04})`); glow.addColorStop(1, 'rgba(255, 190, 90, 0)')
      ctx.fillStyle = glow; ctx.fillRect(110, g - 98, 180, 110)
    }
    // Pennant on a pole.
    ctx.strokeStyle = '#5b4527'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(16, g); ctx.lineTo(16, g - 74); ctx.stroke()
    const wave = Math.sin(time * 3) * 3
    ctx.fillStyle = '#b8553a'; ctx.beginPath(); ctx.moveTo(17, g - 73); ctx.quadraticCurveTo(30, g - 70 + wave, 42, g - 64 + wave); ctx.quadraticCurveTo(30, g - 60 - wave * 0.5, 17, g - 57); ctx.fill()
    ctx.fillStyle = '#e8c874'; ctx.beginPath(); ctx.arc(26, g - 65 + wave * 0.5, 2.5, 0, TAU); ctx.fill()
    // Tent: ground shadow, guy ropes, shaded side panel, and a lit front with an open flap.
    ctx.fillStyle = '#1f201433'; ctx.beginPath(); ctx.ellipse(82, g + 1, 62, 5, 0, 0, TAU); ctx.fill()
    ctx.strokeStyle = classic ? '#cbc4a4' : '#d8cfae99'; ctx.lineWidth = classic ? 3 : 1
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
    for (let i = 0; i < (classic ? 0 : 4); i++) {
      const life = (time * 0.35 + i / 4) % 1
      ctx.fillStyle = `rgba(215, 214, 200, ${0.22 * (1 - life)})`
      ctx.beginPath(); ctx.arc(203 + life * 14 + Math.sin(time + i) * 3, g - 34 - life * 60, 4 + life * 9, 0, TAU); ctx.fill()
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
    const vignette = ctx.createLinearGradient(0, 0, WIDTH, 0)
    vignette.addColorStop(0, '#152a2444'); vignette.addColorStop(0.15, '#152a2400'); vignette.addColorStop(0.85, '#152a2400'); vignette.addColorStop(1, '#152a2444')
    ctx.fillStyle = vignette; ctx.fillRect(0, 0, WIDTH, HEIGHT)
  }

  player(ctx: CanvasRenderingContext2D, game: PitfallEngine, classic: boolean) {
    const p = game.player
    if (p.invulnerable > 0 && game.status === 'playing' && Math.floor(game.elapsed * 12) % 2) return
    const running = p.grounded && Math.abs(p.vx) > 1
    const stride = running ? Math.sin(game.elapsed * 19) : 0
    if (classic) {
      // Snap to the 3px classic grid so every block lands on exactly one classic pixel.
      ctx.save(); ctx.translate(Math.round(p.x / 3) * 3, Math.round(p.y / 3) * 3); ctx.scale(p.facing, 1)
      let rows: string[]
      if (p.swinging) rows = [...HARRY_REACH, ...HARRY_LEGS.hang]
      else if (p.climbing) rows = [...HARRY_REACH, ...(Math.sin(game.elapsed * 12) > 0 ? HARRY_LEGS.climbA : HARRY_LEGS.climbB)]
      else if (!p.grounded) rows = [...HARRY_HEAD, ...HARRY_ARMS.forward, ...HARRY_LEGS.jump]
      // Same cadence as the modern stride: one full cycle every 2π/19 seconds.
      else if (running) rows = HARRY_RUN[Math.floor((((game.elapsed * 19) / TAU) % 1) * 4)]!
      else rows = [...HARRY_HEAD, ...HARRY_ARMS.side, ...HARRY_LEGS.stand]
      rows.forEach((row, y) => [...row].forEach((c, x) => { const color = HARRY_COLORS[c]; if (color) { ctx.fillStyle = color; ctx.fillRect(x * 3 - 12, y * 3 - 45, 3, 3) } }))
      ctx.restore(); return
    }
    ctx.save(); ctx.translate(Math.round(p.x), Math.round(p.y)); ctx.scale(p.facing, 1)
    if (p.grounded) { ctx.fillStyle = '#202c283a'; ctx.beginPath(); ctx.ellipse(0, 1, 19, 4, 0, 0, TAU); ctx.fill() }
    // Modern Harry: jointed arms and legs (far side darker, behind the body), a shaded shirt with a
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
    // Two-bone reach for hands that hold something (vine, ladder rungs); the elbow bends outward.
    const reach = (sx: number, sy: number, hx: number, hy: number, a: number, b: number) => {
      const dx = hx - sx, dy = hy - sy, d = Math.min(Math.hypot(dx, dy), a + b - 0.01)
      const base = Math.atan2(dy, dx), bend = Math.acos(Math.max(-1, Math.min(1, (a * a + d * d - b * b) / (2 * a * d))))
      return [sx + Math.cos(base - bend) * a, sy + Math.sin(base - bend) * a, sx + Math.cos(base) * d, sy + Math.sin(base) * d] as const
    }
    let legs: [number, number, number, number], arms: [number, number, number, number] | null = null
    let hands: [number, number, number, number] | null = null
    if (p.swinging) { legs = [0.45, 0.6, 0.15, 0.75]; hands = [1, -47, 4, -48] }
    else if (p.climbing) { const c = Math.sin(t * 12); legs = [0.45 + 0.35 * c, 1, 0.45 - 0.35 * c, 1]; hands = [7, -42 - 5 * c, -2, -42 + 5 * c] }
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
      if (target) { const r = reach(shoulderX, shoulder[1], target[0], target[1], 8, 8); elbow = [r[0], r[1]]; wrist = [r[2], r[3]] }
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

  log(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, classic: boolean) {
    ctx.fillStyle = '#44351e'; ctx.beginPath(); ctx.ellipse(x, y + 13, 23, 4, 0, 0, TAU); ctx.fill()
    ctx.fillStyle = '#765230'; ctx.fillRect(x - 14, y - 12, 29, 25)
    ctx.fillStyle = '#a47943'; ctx.fillRect(x - 12, y - 9, 26, 4)
    ctx.fillStyle = '#503c26'; ctx.fillRect(x - 12, y + 6, 26, 3)
    ctx.fillStyle = '#c69c5c'; ctx.beginPath(); ctx.ellipse(x + 12, y, 8, 13, 0, 0, TAU); ctx.fill()
    ctx.strokeStyle = '#795a33'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.ellipse(x + 12, y, 4, 8, 0, 0, TAU); ctx.stroke()
    if (!classic) { ctx.beginPath(); ctx.moveTo(x + 12, y); ctx.lineTo(x + 12 + Math.cos(-time * 7) * 6, y + Math.sin(-time * 7) * 10); ctx.stroke() }
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

  // A coiled cobra with its hood raised, drawn facing right and mirrored to face the middle of the scene.
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

  treasure(ctx: CanvasRenderingContext2D, kind: Treasure, x: number, y: number) {
    ctx.save(); ctx.translate(x, y)
    if (kind === 'gold' || kind === 'silver') {
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

  sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + 1, y - 1); ctx.lineTo(x + r, y); ctx.lineTo(x + 1, y + 1); ctx.lineTo(x, y + r); ctx.lineTo(x - 1, y + 1); ctx.lineTo(x - r, y); ctx.lineTo(x - 1, y - 1); ctx.fill()
  }
}
