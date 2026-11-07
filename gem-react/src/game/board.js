// 게임 판 규칙 — 화면과 무관한 순수 로직 (PRD 4.1, 4.3, 4.4)
import { N, T, LEVEL_STEP } from './constants';

export const randomType = (rng = Math.random) => Math.floor(rng() * T);

export function createGem(t, r, c, y) {
  return { t, r, c, x: c, y: y ?? r, v: 0, s: 1, dying: false, pop: 0 };
}

export const typesOf = grid => grid.map(row => row.map(g => g.t));

/** 타입 배열 tt에서 (r, c) 보석이 줄(3개 이상) 또는 2×2 사각형에 속하는지 */
export function matchAt(tt, r, c) {
  const t = tt[r][c];
  let h = 1, v = 1;
  for (let k = c - 1; k >= 0 && tt[r][k] === t; k--) h++;
  for (let k = c + 1; k < N && tt[r][k] === t; k++) h++;
  for (let k = r - 1; k >= 0 && tt[k][c] === t; k--) v++;
  for (let k = r + 1; k < N && tt[k][c] === t; k++) v++;
  if (h >= 3 || v >= 3) return true;
  for (let r0 = r - 1; r0 <= r; r0++) {
    for (let c0 = c - 1; c0 <= c; c0++) {
      if (r0 < 0 || c0 < 0 || r0 + 1 >= N || c0 + 1 >= N) continue;
      if (tt[r0][c0] === t && tt[r0 + 1][c0] === t && tt[r0][c0 + 1] === t && tt[r0 + 1][c0 + 1] === t) return true;
    }
  }
  return false;
}

/** 맞출 수 있는 교환 하나를 찾는다. 없으면 null (PRD F-40, F-41) */
export function findMove(grid) {
  const tt = typesOf(grid);
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      for (const [dr, dc] of [[0, 1], [1, 0]]) {
        const r2 = r + dr, c2 = c + dc;
        if (r2 >= N || c2 >= N) continue;
        [tt[r][c], tt[r2][c2]] = [tt[r2][c2], tt[r][c]];
        const ok = matchAt(tt, r, c) || matchAt(tt, r2, c2);
        [tt[r][c], tt[r2][c2]] = [tt[r2][c2], tt[r][c]];
        if (ok) return [{ r, c }, { r: r2, c: c2 }];
      }
    }
  }
  return null;
}

/**
 * 현재 판의 모든 매치를 찾는다 (PRD F-20 ~ F-22).
 * set: 터질 보석(겹쳐도 한 번만), runs: 매치별 보석 목록(점수 계산용)
 */
export function findMatches(grid) {
  const set = new Set();
  const runs = [];
  const scan = get => {
    for (let a = 0; a < N; a++) {
      let s = 0;
      while (s < N) {
        let e = s + 1;
        while (e < N && get(a, e).t === get(a, s).t) e++;
        if (e - s >= 3) {
          const run = [];
          for (let k = s; k < e; k++) { set.add(get(a, k)); run.push(get(a, k)); }
          runs.push(run);
        }
        s = e;
      }
    }
  };
  scan((a, b) => grid[a][b]);
  scan((a, b) => grid[b][a]);
  for (let r = 0; r < N - 1; r++) {
    for (let c = 0; c < N - 1; c++) {
      const sq = [grid[r][c], grid[r][c + 1], grid[r + 1][c], grid[r + 1][c + 1]];
      if (sq.every(g => g.t === sq[0].t)) { sq.forEach(g => set.add(g)); runs.push(sq); }
    }
  }
  return { set, runs };
}

/** 왼쪽·위쪽이 이미 채워진 상태에서 (r, c)에 t를 놓으면 바로 매치가 생기는지 */
function makesMatch(grid, r, c, t) {
  return (c >= 2 && grid[r][c - 1].t === t && grid[r][c - 2].t === t) ||
         (r >= 2 && grid[r - 1][c].t === t && grid[r - 2][c].t === t) ||
         (r >= 1 && c >= 1 && grid[r - 1][c].t === t && grid[r][c - 1].t === t && grid[r - 1][c - 1].t === t);
}

/** 매치 없는 새 판. 시작 연출을 위해 보석은 판 위에서 떨어진다 (PRD F-03, F-04) */
export function createBoard(rng = Math.random) {
  for (;;) {
    const grid = Array.from({ length: N }, () => Array(N).fill(null));
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        let t;
        do { t = randomType(rng); } while (makesMatch(grid, r, c, t));
        grid[r][c] = createGem(t, r, c, r - N - 1 - (N - r) * 0.3);
      }
    }
    if (findMove(grid)) return grid;
  }
}

/** 보석 객체는 그대로 두고 종류만 다시 섞는다 (PRD F-41) */
export function reshuffle(grid, rng = Math.random) {
  do {
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        let t;
        do { t = randomType(rng); } while (makesMatch(grid, r, c, t));
        grid[r][c].t = t;
        grid[r][c].pop = 1;
      }
    }
  } while (!findMove(grid));
}

export function swapCells(grid, a, b) {
  const g1 = grid[a.r][a.c], g2 = grid[b.r][b.c];
  grid[a.r][a.c] = g2; grid[b.r][b.c] = g1;
  g1.r = b.r; g1.c = b.c; g2.r = a.r; g2.c = a.c;
}

/** 빈 칸(null)을 위 보석으로 채우고, 모자란 만큼 새 보석을 판 위에 만든다 (PRD F-23) */
export function collapse(grid, rng = Math.random) {
  for (let c = 0; c < N; c++) {
    let w = N - 1;
    for (let r = N - 1; r >= 0; r--) {
      const g = grid[r][c];
      if (g) { grid[r][c] = null; grid[w][c] = g; g.r = w; w--; }
    }
    const cnt = w + 1;
    for (let r = w; r >= 0; r--) grid[r][c] = createGem(randomType(rng), r, c, r - cnt - 0.5);
  }
}

/** 매치 하나의 점수 (PRD F-30) */
export const runScore = len => len * 10 + Math.max(0, len - 3) * 30;

/** 한 연쇄 단계의 점수 (PRD F-31) */
export const stepScore = (runs, combo) => runs.reduce((sum, run) => sum + runScore(run.length), 0) * combo;

export const levelFor = score => Math.floor(score / LEVEL_STEP) + 1;
