// Tic-tac-toe on the table in Harry's tent. Harry plays X and always moves first; the computer
// answers with a random open square after a short "thinking" pause.
export type Mark = 'X' | 'O'
export type Outcome = Mark | 'draw' | null
export const COMPUTER_DELAY = 0.6
const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]]

export class TicTacToe {
  board: (Mark | null)[] = Array(9).fill(null)
  turn: Mark = 'X'
  outcome: Outcome = null
  line: number[] | null = null
  cursor = 4
  thinking = 0
  wins = 0
  losses = 0
  draws = 0
  random: () => number

  constructor(random = Math.random) { this.random = random }

  get open() { return this.board.flatMap((mark, i) => mark ? [] : [i]) }
  get over() { return this.outcome !== null }

  reset() {
    this.board = Array(9).fill(null)
    this.turn = 'X'; this.outcome = null; this.line = null; this.thinking = 0; this.cursor = 4
  }

  // Harry's move. Returns false when the square is taken or it isn't his turn.
  play(square: number) {
    if (this.over || this.turn !== 'X' || this.board[square] !== null) return false
    this.place(square, 'X')
    if (!this.over) { this.turn = 'O'; this.thinking = COMPUTER_DELAY }
    return true
  }

  moveCursor(dx: number, dy: number) {
    this.cursor = ((this.cursor % 3 + dx + 3) % 3) + ((Math.floor(this.cursor / 3) + dy + 3) % 3) * 3
  }

  update(dt: number) {
    if (this.over || this.turn !== 'O') return
    this.thinking -= dt
    if (this.thinking > 0) return
    const open = this.open
    this.place(open[Math.floor(this.random() * open.length)]!, 'O')
    if (!this.over) this.turn = 'X'
  }

  private place(square: number, mark: Mark) {
    this.board[square] = mark
    this.line = LINES.find(line => line.every(i => this.board[i] === mark)) ?? null
    if (this.line) { this.outcome = mark; if (mark === 'X') this.wins++; else this.losses++ }
    else if (this.open.length === 0) { this.outcome = 'draw'; this.draws++ }
  }
}
