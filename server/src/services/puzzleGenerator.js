// F6 (Farin): puzzle generation, move validation, hints and solution checks.
// Pure functions (no database), unit tested. Three puzzle types: sudoku, wordsearch, crossword.

const DIFFICULTY = {
  easy: { givens: 40, wsSize: 8, wsWords: 6, maxHints: 5, base: 100 },
  medium: { givens: 32, wsSize: 10, wsWords: 8, maxHints: 3, base: 200 },
  hard: { givens: 26, wsSize: 12, wsWords: 10, maxHints: 2, base: 300 },
};
const HINT_PENALTY = 25;

const WORDS = [
  ['NODE', 'JavaScript runtime that runs the BrainBattle server'],
  ['REACT', 'Library used for the BrainBattle views'],
  ['MODEL', 'The M in MVC'],
  ['VIEW', 'The V in MVC'],
  ['ROUTE', 'A URL path handled by Express'],
  ['ARRAY', 'Ordered list of values in JavaScript'],
  ['CLASS', 'Blueprint for objects in OOP'],
  ['LOOP', 'for or while'],
  ['QUIZ', 'A short test of knowledge'],
  ['PUZZLE', 'Sudoku is one'],
  ['BRAIN', 'What BrainBattle trains'],
  ['SCORE', 'Points earned in a game'],
  ['TIMER', 'Counts down the seconds'],
  ['MATCH', 'One battle between players'],
  ['LOGIC', 'Reasoning, as in a ___ puzzle'],
  ['DHAKA', 'Capital of Bangladesh'],
  ['TIGER', 'Royal Bengal ___'],
  ['RIVER', 'The Padma is one'],
  ['TAKA', 'Currency of Bangladesh'],
  ['SHAPLA', 'National flower of Bangladesh'],
  ['ORBIT', 'Path of a planet around the sun'],
  ['ATOM', 'Smallest unit of an element'],
  ['PRIME', '7 is a ___ number'],
  ['EARTH', 'Our planet'],
  ['OCEAN', 'The Pacific is the largest one'],
  ['NILE', 'Longest river in Africa'],
  ['MARS', 'The Red Planet'],
  ['GRID', 'Rows and columns'],
  ['SOLVE', 'Find the answer'],
  ['CODE', 'What programmers write'],
];

function shuffle(list, rand = Math.random) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const clone = (grid) => grid.map((row) => [...row]);

/* ----------------------------- Sudoku ----------------------------- */

function sudokuCanPlace(grid, r, c, n) {
  for (let i = 0; i < 9; i += 1) {
    if (grid[r][i] === n || grid[i][c] === n) return false;
  }
  const br = r - (r % 3);
  const bc = c - (c % 3);
  for (let i = 0; i < 3; i += 1) for (let j = 0; j < 3; j += 1) if (grid[br + i][bc + j] === n) return false;
  return true;
}

function sudokuFill(grid, rand) {
  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      if (grid[r][c] === 0) {
        for (const n of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rand)) {
          if (sudokuCanPlace(grid, r, c, n)) {
            grid[r][c] = n;
            if (sudokuFill(grid, rand)) return true;
            grid[r][c] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

function generateSudoku(difficulty = 'medium', rand = Math.random) {
  const solution = Array.from({ length: 9 }, () => Array(9).fill(0));
  sudokuFill(solution, rand);
  const givens = clone(solution);
  const cells = shuffle([...Array(81).keys()], rand);
  const toRemove = 81 - DIFFICULTY[difficulty].givens;
  for (let k = 0; k < toRemove; k += 1) {
    const idx = cells[k];
    givens[Math.floor(idx / 9)][idx % 9] = 0;
  }
  return { data: { givens }, solution: { grid: solution }, initialState: { grid: clone(givens) } };
}

// Cells that break a sudoku rule with the value at (r, c).
function sudokuConflicts(grid, r, c) {
  const v = grid[r][c];
  if (!v) return [];
  const out = [];
  for (let i = 0; i < 9; i += 1) {
    if (i !== c && grid[r][i] === v) out.push([r, i]);
    if (i !== r && grid[i][c] === v) out.push([i, c]);
  }
  const br = r - (r % 3);
  const bc = c - (c % 3);
  for (let i = 0; i < 3; i += 1) {
    for (let j = 0; j < 3; j += 1) {
      const rr = br + i;
      const cc = bc + j;
      if ((rr !== r || cc !== c) && rr !== r && cc !== c && grid[rr][cc] === v) out.push([rr, cc]);
    }
  }
  return out;
}

function sudokuIsSolved(grid, givens) {
  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      if (!grid[r][c]) return false;
      if (givens[r][c] && givens[r][c] !== grid[r][c]) return false;
      if (sudokuConflicts(grid, r, c).length) return false;
    }
  }
  return true;
}

/* ---------------------------- Word search ---------------------------- */

const DIRS = {
  easy: [[0, 1], [1, 0]],
  medium: [[0, 1], [1, 0], [1, 1], [-1, 1]],
  hard: [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]],
};

function generateWordSearch(difficulty = 'medium', rand = Math.random) {
  const { wsSize: size, wsWords: count } = DIFFICULTY[difficulty];
  const grid = Array.from({ length: size }, () => Array(size).fill(''));
  const placements = [];
  const candidates = shuffle(WORDS.map(([word]) => word).filter((x) => x.length <= size), rand);

  for (const word of candidates) {
    if (placements.length >= count) break;
    let placed = false;
    for (let attempt = 0; attempt < 150 && !placed; attempt += 1) {
      const [dr, dc] = DIRS[difficulty][Math.floor(rand() * DIRS[difficulty].length)];
      const r0 = Math.floor(rand() * size);
      const c0 = Math.floor(rand() * size);
      const cells = [];
      let ok = true;
      for (let i = 0; i < word.length; i += 1) {
        const r = r0 + dr * i;
        const c = c0 + dc * i;
        if (r < 0 || c < 0 || r >= size || c >= size || (grid[r][c] && grid[r][c] !== word[i])) {
          ok = false;
          break;
        }
        cells.push([r, c]);
      }
      if (!ok) continue;
      cells.forEach(([r, c], i) => {
        grid[r][c] = word[i];
      });
      placements.push({ word, cells });
      placed = true;
    }
  }

  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let r = 0; r < size; r += 1) for (let c = 0; c < size; c += 1) if (!grid[r][c]) grid[r][c] = letters[Math.floor(rand() * 26)];

  return {
    data: { grid, words: placements.map((p) => p.word).sort() },
    solution: { placements },
    initialState: { found: [] },
  };
}

// The player selected `cells` (start..end). Returns the matching word or null.
function wordSearchMatch(placements, cells) {
  const key = (list) => list.map(([r, c]) => `${r},${c}`).join('|');
  const picked = key(cells);
  const reversed = key([...cells].reverse());
  const hit = placements.find((p) => key(p.cells) === picked || key(p.cells) === reversed);
  return hit ? hit.word : null;
}

/* ----------------------------- Crossword ----------------------------- */

function generateCrossword(difficulty = 'medium', rand = Math.random) {
  const target = { easy: 5, medium: 7, hard: 9 }[difficulty];
  const SIZE = 15;
  let best = null;

  for (let tries = 0; tries < 25; tries += 1) {
    const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(''));
    const placed = [];
    const words = shuffle(WORDS, rand);

    const fits = (word, r, c, dir) => {
      const [dr, dc] = dir === 'across' ? [0, 1] : [1, 0];
      const endR = r + dr * (word.length - 1);
      const endC = c + dc * (word.length - 1);
      if (r < 0 || c < 0 || endR >= SIZE || endC >= SIZE) return -1;
      const before = [r - dr, c - dc];
      const after = [endR + dr, endC + dc];
      for (const [rr, cc] of [before, after]) {
        if (rr >= 0 && cc >= 0 && rr < SIZE && cc < SIZE && grid[rr][cc]) return -1;
      }
      let crossings = 0;
      for (let i = 0; i < word.length; i += 1) {
        const rr = r + dr * i;
        const cc = c + dc * i;
        const cell = grid[rr][cc];
        if (cell) {
          if (cell !== word[i]) return -1;
          crossings += 1;
        } else {
          // new letters must not touch other words side by side
          const side = dir === 'across' ? [[rr - 1, cc], [rr + 1, cc]] : [[rr, cc - 1], [rr, cc + 1]];
          for (const [sr, sc] of side) if (sr >= 0 && sc >= 0 && sr < SIZE && sc < SIZE && grid[sr][sc]) return -1;
        }
      }
      return crossings;
    };

    const put = (entry, word, r, c, dir) => {
      const [dr, dc] = dir === 'across' ? [0, 1] : [1, 0];
      for (let i = 0; i < word.length; i += 1) grid[r + dr * i][c + dc * i] = word[i];
      placed.push({ word, clue: entry[1], row: r, col: c, dir });
    };

    const [first, ...rest] = words;
    put(first, first[0], Math.floor(SIZE / 2), Math.floor((SIZE - first[0].length) / 2), 'across');

    for (const entry of rest) {
      if (placed.length >= target) break;
      const word = entry[0];
      let done = false;
      for (const p of shuffle(placed, rand)) {
        if (done) break;
        for (let i = 0; i < p.word.length && !done; i += 1) {
          for (let j = 0; j < word.length && !done; j += 1) {
            if (p.word[i] !== word[j]) continue;
            const dir = p.dir === 'across' ? 'down' : 'across';
            const r = p.dir === 'across' ? p.row - j : p.row + i;
            const c = p.dir === 'across' ? p.col + i : p.col - j;
            if (fits(word, r, c, dir) > 0) {
              put(entry, word, r, c, dir);
              done = true;
            }
          }
        }
      }
    }
    if (!best || placed.length > best.placed.length) best = { grid, placed };
    if (placed.length >= target) break;
  }

  // Crop to the used area and number the clues.
  const { grid, placed } = best;
  let minR = SIZE;
  let minC = SIZE;
  let maxR = 0;
  let maxC = 0;
  grid.forEach((row, r) => row.forEach((v, c) => {
    if (v) {
      minR = Math.min(minR, r);
      minC = Math.min(minC, c);
      maxR = Math.max(maxR, r);
      maxC = Math.max(maxC, c);
    }
  }));
  const rows = maxR - minR + 1;
  const cols = maxC - minC + 1;
  const solutionGrid = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (__, c) => grid[r + minR][c + minC] || null));

  const starts = placed
    .map((p) => ({ ...p, row: p.row - minR, col: p.col - minC }))
    .sort((a, b) => a.row - b.row || a.col - b.col);
  const numbers = new Map();
  let n = 0;
  for (const p of starts) {
    const k = `${p.row},${p.col}`;
    if (!numbers.has(k)) numbers.set(k, (n += 1));
    p.number = numbers.get(k);
  }

  const layout = solutionGrid.map((row, r) => row.map((v, c) => (v === null ? null : { number: numbers.get(`${r},${c}`) || null })));
  const clue = (p) => ({ number: p.number, row: p.row, col: p.col, length: p.word.length, clue: p.clue });

  return {
    data: {
      rows,
      cols,
      layout,
      clues: {
        across: starts.filter((p) => p.dir === 'across').map(clue),
        down: starts.filter((p) => p.dir === 'down').map(clue),
      },
    },
    solution: { grid: solutionGrid },
    initialState: { grid: solutionGrid.map((row) => row.map((v) => (v === null ? null : ''))) },
  };
}

/* ------------------------------ Common ------------------------------ */

function generatePuzzle(type, difficulty = 'medium', rand = Math.random) {
  if (!DIFFICULTY[difficulty]) throw new Error('Unknown difficulty');
  if (type === 'sudoku') return generateSudoku(difficulty, rand);
  if (type === 'wordsearch') return generateWordSearch(difficulty, rand);
  if (type === 'crossword') return generateCrossword(difficulty, rand);
  throw new Error('Unknown puzzle type');
}

function isSolved(type, data, solution, state) {
  if (type === 'sudoku') return sudokuIsSolved(state.grid, data.givens);
  if (type === 'wordsearch') return data.words.every((wd) => state.found.includes(wd));
  if (type === 'crossword') {
    return solution.grid.every((row, r) => row.every((v, c) => v === null || (state.grid[r][c] || '').toUpperCase() === v));
  }
  return false;
}

function scoreFor(difficulty, hintsUsed, seconds) {
  const { base } = DIFFICULTY[difficulty];
  const timeBonus = Math.max(0, 100 - Math.floor(seconds / 15));
  return Math.max(10, base - hintsUsed * HINT_PENALTY + timeBonus);
}

module.exports = {
  DIFFICULTY,
  HINT_PENALTY,
  WORDS,
  generatePuzzle,
  generateSudoku,
  generateWordSearch,
  generateCrossword,
  sudokuConflicts,
  sudokuIsSolved,
  wordSearchMatch,
  isSolved,
  scoreFor,
};
