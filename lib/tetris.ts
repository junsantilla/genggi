// Pure, framework-free Tetris engine. No React, DOM, or DB access — every
// function transforms plain values so the logic is unit-testable and the
// React component just wires it to input and rendering.

export const TETRIS_COLS = 10;
export const TETRIS_ROWS = 20;
export const TETRIS_SPAWN_COLS = 3; // matched to every 3-wide piece

export type TetrominoType = "I" | "O" | "T" | "S" | "Z" | "J" | "L";

export type TetrisCell = TetrominoType | null;
// [row][col]; row 0 is the top of the well.
export type TetrisBoard = TetrisCell[][];

export interface TetrisPiece {
  type: TetrominoType;
  // Binary matrix of the piece's current rotation.
  shape: number[][];
  x: number; // column of the shape's left edge
  y: number; // row of the shape's top edge
}

export interface TetrisState {
  board: TetrisBoard;
  active: TetrisPiece | null;
  next: TetrominoType | null;
  score: number;
  lines: number;
  level: number;
  over: boolean;
}

export const TETROMINO_SHAPES: Record<TetrominoType, number[][]> = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
};

export const TETROMINO_TYPES: TetrominoType[] = [
  "I",
  "O",
  "T",
  "S",
  "Z",
  "J",
  "L",
];

export function createEmptyBoard(): TetrisBoard {
  return Array.from({ length: TETRIS_ROWS }, () =>
    Array<TetrisCell>(TETRIS_COLS).fill(null),
  );
}

// Rotates a binary shape 90 degrees clockwise.
export function rotateCW(shape: number[][]): number[][] {
  const rows = shape.length;
  const cols = shape[0].length;
  const rotated = Array.from({ length: cols }, () =>
    Array<number>(rows).fill(0),
  );
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      rotated[c][rows - 1 - r] = shape[r][c];
    }
  }
  return rotated;
}

export function spawnPiece(type: TetrominoType): TetrisPiece {
  const shape = TETROMINO_SHAPES[type].map((row) => [...row]);
  return {
    type,
    shape,
    x: Math.floor((TETRIS_COLS - shape[0].length) / 2),
    y: 0,
  };
}

// Absolute board coordinates of every filled cell in a piece.
export function pieceCells(
  piece: TetrisPiece,
): { x: number; y: number }[] {
  const cells: { x: number; y: number }[] = [];
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (piece.shape[r][c]) cells.push({ x: piece.x + c, y: piece.y + r });
    }
  }
  return cells;
}

// True when a shape at (x, y) overlaps a filled cell or leaves the well.
// Rows above the top of the board are allowed so pieces spawn gradually.
export function collides(
  board: TetrisBoard,
  shape: number[][],
  x: number,
  y: number,
): boolean {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const col = x + c;
      const row = y + r;
      if (col < 0 || col >= TETRIS_COLS || row >= TETRIS_ROWS) return true;
      if (row >= 0 && board[row][col]) return true;
    }
  }
  return false;
}

export function mergePiece(state: TetrisState): TetrisState {
  const board = state.board.map((row) => [...row]);
  if (state.active) {
    for (const { x, y } of pieceCells(state.active)) {
      if (y >= 0 && y < TETRIS_ROWS && x >= 0 && x < TETRIS_COLS) {
        board[y][x] = state.active.type;
      }
    }
  }
  return { ...state, board, active: null };
}

export function clearFullLines(
  board: TetrisBoard,
): { board: TetrisBoard; cleared: number } {
  const remaining = board.filter((row) => row.some((cell) => cell === null));
  const cleared = TETRIS_ROWS - remaining.length;
  const fresh = createEmptyBoard();
  for (let i = 0; i < remaining.length; i++) {
    fresh[TETRIS_ROWS - remaining.length + i] = remaining[i];
  }
  return { board: fresh, cleared };
}

// Classic scoring: 100/300/500/800 × current level for 1/2/3/4 lines.
export function scoreForLines(cleared: number, level: number): number {
  const base = [0, 100, 300, 500, 800];
  const idx = Math.min(Math.max(cleared, 0), 4);
  return base[idx] * Math.max(level, 1);
}

export function levelForLines(lines: number): number {
  return Math.floor(Math.max(lines, 0) / 10) + 1;
}

// Milliseconds between gravity steps for a level. The client calls this.
export function gravityMs(level: number): number {
  return Math.max(100, 800 - (level - 1) * 70);
}

// Locks the active piece, clears full lines, scores them, and spawns the next
// piece. `sample` draws the piece that follows the current `next`; passing it
// in keeps the engine deterministic and testable.
export function lockPiece(
  state: TetrisState,
  sample: () => TetrominoType,
): TetrisState {
  const merged = mergePiece(state);
  const { board, cleared } = clearFullLines(merged.board);
  const lines = merged.lines + cleared;
  const level = levelForLines(lines);
  const score = merged.score + scoreForLines(cleared, merged.level);

  const active = spawnPiece(state.next ?? sample());
  const next = sample();
  const over = collides(board, active.shape, active.x, active.y);

  return { board, active, next, score, lines, level, over };
}

export function createInitialState(sample: () => TetrominoType): TetrisState {
  const board = createEmptyBoard();
  const active = spawnPiece(sample());
  const next = sample();
  const over = collides(board, active.shape, active.x, active.y);
  return { board, active, next, score: 0, lines: 0, level: 1, over };
}

export function movePiece(
  state: TetrisState,
  dx: number,
  dy: number,
): TetrisState {
  if (!state.active || state.over) return state;
  const x = state.active.x + dx;
  const y = state.active.y + dy;
  if (collides(state.board, state.active.shape, x, y)) return state;
  return { ...state, active: { ...state.active, x, y } };
}

// Rotates clockwise with a simple wall kick (try in place, then 1 column left,
// then 1 column right).
export function rotatePiece(state: TetrisState): TetrisState {
  if (!state.active || state.over) return state;
  const shape = rotateCW(state.active.shape);
  for (const kick of [0, -1, 1]) {
    const x = state.active.x + kick;
    if (!collides(state.board, shape, x, state.active.y)) {
      return { ...state, active: { ...state.active, shape, x } };
    }
  }
  return state;
}

export function hardDrop(
  state: TetrisState,
  sample: () => TetrominoType,
): TetrisState {
  if (!state.active || state.over) return state;
  let y = state.active.y;
  while (!collides(state.board, state.active.shape, state.active.x, y + 1)) {
    y++;
  }
  return lockPiece({ ...state, active: { ...state.active, y } }, sample);
}

// Advances gravity by one row; locks when the piece cannot drop further.
export function stepGame(
  state: TetrisState,
  sample: () => TetrominoType,
): TetrisState {
  if (!state.active || state.over) return state;
  const moved = { ...state, active: { ...state.active, y: state.active.y + 1 } };
  if (!collides(state.board, moved.active.shape, moved.active.x, moved.active.y)) {
    return moved;
  }
  return lockPiece(state, sample);
}

export function randomTetrominoType(rand: () => number): TetrominoType {
  return TETROMINO_TYPES[Math.floor(rand() * TETROMINO_TYPES.length)];
}

// Board as it should be rendered: static cells plus the falling piece. Strictly
// pure, so the component can call it during render.
export function resolveBoard(state: TetrisState): TetrisBoard {
  const board = state.board.map((row) => [...row]);
  if (state.active) {
    for (const { x, y } of pieceCells(state.active)) {
      if (y >= 0 && y < TETRIS_ROWS && x >= 0 && x < TETRIS_COLS) {
        board[y][x] = state.active.type;
      }
    }
  }
  return board;
}