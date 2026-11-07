import { describe, it, expect } from 'vitest';
import { N } from './constants';
import {
  createGem, createBoard, findMatches, findMove, matchAt, typesOf,
  collapse, reshuffle, runScore, stepScore, levelFor,
} from './board';

// 매치가 전혀 없는 기본 무늬: 0101… / 2323… (줄 3개, 2×2 모두 없음)
function baseTypes() {
  return Array.from({ length: N }, (_, r) => Array.from({ length: N }, (_, c) => (c % 2) + 2 * (r % 2)));
}
function gridFrom(tt) {
  return tt.map((row, r) => row.map((t, c) => createGem(t, r, c)));
}
function set(tt, cells, t) {
  for (const [r, c] of cells) tt[r][c] = t;
  return tt;
}

describe('새 판 (F-03)', () => {
  it('처음부터 맞춰진 보석이 없고 맞출 수 있는 수가 있다', () => {
    for (let i = 0; i < 200; i++) {
      const grid = createBoard();
      expect(findMatches(grid).set.size).toBe(0);
      expect(findMove(grid)).not.toBeNull();
    }
  });
});

describe('매치 규칙', () => {
  it('기본 무늬에는 매치가 없다', () => {
    expect(findMatches(gridFrom(baseTypes())).set.size).toBe(0);
  });

  it('가로 3개를 찾는다 (F-20)', () => {
    const m = findMatches(gridFrom(set(baseTypes(), [[2, 1], [2, 2], [2, 3]], 4)));
    expect(m.set.size).toBe(3);
    expect(m.runs.map(r => r.length)).toEqual([3]);
  });

  it('세로 5개를 찾는다 (F-20)', () => {
    const m = findMatches(gridFrom(set(baseTypes(), [[1, 6], [2, 6], [3, 6], [4, 6], [5, 6]], 5)));
    expect(m.runs.map(r => r.length)).toEqual([5]);
  });

  it('2×2 사각형을 찾는다 (F-21)', () => {
    const m = findMatches(gridFrom(set(baseTypes(), [[4, 4], [4, 5], [5, 4], [5, 5]], 6)));
    expect(m.set.size).toBe(4);
    expect(m.runs.map(r => r.length)).toEqual([4]);
  });

  it('줄과 사각형이 겹치면 보석은 한 번만 터진다 (F-22)', () => {
    // 가로 3개 + 그 아래 2칸으로 사각형
    const m = findMatches(gridFrom(set(baseTypes(), [[3, 2], [3, 3], [3, 4], [4, 2], [4, 3]], 4)));
    expect(m.set.size).toBe(5);
    expect(m.runs.length).toBe(2);
  });

  it('matchAt은 사각형 완성도 매치로 본다 (힌트·섞기 판단)', () => {
    const tt = set(baseTypes(), [[0, 0], [0, 1], [1, 0], [1, 1]], 6);
    expect(matchAt(tt, 1, 1)).toBe(true);
  });
});

describe('떨어뜨리기 (F-23)', () => {
  it('빈 칸을 위 보석으로 채우고 새 보석은 판 위에서 시작한다', () => {
    const grid = gridFrom(baseTypes());
    const above = grid[2][3];
    grid[5][3] = null;
    grid[6][3] = null;
    collapse(grid);
    expect(grid.flat().every(Boolean)).toBe(true);
    expect(grid[4][3]).toBe(above);
    expect(above.r).toBe(4);
    expect(grid[0][3].y).toBeLessThan(0);
    expect(grid[1][3].y).toBeLessThan(0);
  });
});

describe('섞기 (F-41)', () => {
  it('섞은 뒤에는 매치가 없고 맞출 수 있는 수가 있다', () => {
    const grid = gridFrom(baseTypes());
    reshuffle(grid);
    expect(findMatches(grid).set.size).toBe(0);
    expect(findMove(grid)).not.toBeNull();
    expect(typesOf(grid).flat().length).toBe(N * N);
  });
});

describe('점수와 레벨 (F-30 ~ F-32)', () => {
  it('매치 크기별 점수', () => {
    expect(runScore(3)).toBe(30);
    expect(runScore(4)).toBe(70);
    expect(runScore(5)).toBe(110);
  });

  it('연쇄 단계만큼 배수가 붙는다', () => {
    const runs = [[1, 2, 3], [1, 2, 3, 4]];
    expect(stepScore(runs, 1)).toBe(100);
    expect(stepScore(runs, 3)).toBe(300);
  });

  it('1,500점마다 레벨이 오른다', () => {
    expect(levelFor(0)).toBe(1);
    expect(levelFor(1499)).toBe(1);
    expect(levelFor(1500)).toBe(2);
    expect(levelFor(4600)).toBe(4);
  });
});
