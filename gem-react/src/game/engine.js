// 캔버스 게임 엔진 — 애니메이션 루프, 입력, 연쇄 처리 (PRD 4.2 ~ 4.6)
// React 바깥에서 매 프레임 그리고, 점수·레벨이 바뀔 때만 onStats로 React에 알린다.
import { N, HINT_COST, COLORS } from './constants';
import {
  createBoard, findMatches, findMove, swapCells, collapse, reshuffle, stepScore, levelFor,
} from './board';
import { drawGem } from './draw';
import { createSound } from './sound';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const adjacent = (a, b) => Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;

export class GemEngine {
  constructor(canvas, { onStats } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onStats = onStats || (() => {});
    this.sound = createSound();
    this.alive = true;
    this.particles = [];
    this.floats = [];
    this.waiters = [];
    this.banner = null;
    this.sel = null;
    this.hint = null;
    this.down = null;
    this.busy = false;
    this.W = 0;
    this.cs = 0;

    this.frame = this.frame.bind(this);
    this.resize = this.resize.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);

    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    this.ro = new ResizeObserver(this.resize);
    this.ro.observe(canvas);

    this.resize();
    this.reset();
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  destroy() {
    this.alive = false;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.sound.close();
  }

  // ---------- 외부에서 부르는 동작 ----------
  reset() {
    this.score = 0;
    this.level = 1;
    this.sel = this.hint = null;
    this.grid = createBoard();
    this.emit();
  }

  newGame() {
    if (!this.busy) this.reset();
  }

  showHint() {
    if (this.busy) return;
    this.hint = findMove(this.grid);
    this.score = Math.max(0, this.score - HINT_COST);
    this.emit();
  }

  setSound(on) {
    this.sound.setEnabled(on);
  }

  emit() {
    if (this.alive) this.onStats({ score: this.score, level: this.level });
  }

  // ---------- 게임 흐름 ----------
  settle() {
    return new Promise(res => this.waiters.push(res));
  }

  async trySwap(a, b) {
    this.busy = true;
    this.sel = this.hint = null;
    swapCells(this.grid, a, b);
    this.sound.beep(330, 0.05);
    await this.settle();
    const m = findMatches(this.grid);
    if (!m.set.size) {
      swapCells(this.grid, a, b);
      this.sound.beep(160, 0.08);
      await this.settle();
    } else {
      await this.resolve(m);
    }
    this.busy = false;
  }

  async resolve(m) {
    let combo = 0;
    while (m.set.size && this.alive) {
      combo++;
      const pts = stepScore(m.runs, combo);
      this.addScore(pts);
      let sx = 0, sy = 0;
      for (const g of m.set) { g.dying = true; sx += g.c; sy += g.r; this.burst(g); }
      this.floats.push({
        x: sx / m.set.size + 0.5, y: sy / m.set.size + 0.5,
        text: '+' + pts + (combo > 1 ? '  x' + combo : ''), life: 1,
      });
      this.sound.beep(400 + combo * 90, 0.12);
      await sleep(230);
      for (const g of m.set) this.grid[g.r][g.c] = null;
      collapse(this.grid);
      await this.settle();
      m = findMatches(this.grid);
    }
    if (this.alive && !findMove(this.grid)) {
      this.banner = { text: '움직일 수 없어요! 섞는 중…', life: 1.6 };
      await sleep(700);
      reshuffle(this.grid);
      await sleep(400);
    }
  }

  addScore(pts) {
    this.score += pts;
    // 힌트로 점수가 줄어도 이미 오른 레벨은 유지 (PRD 8)
    const lv = Math.max(this.level, levelFor(this.score));
    if (lv > this.level) {
      this.level = lv;
      this.banner = { text: '레벨 ' + lv + '!', life: 1.6 };
      this.sound.beep(880, 0.25);
    }
    this.emit();
  }

  burst(g) {
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2, sp = 1.5 + Math.random() * 3;
      this.particles.push({ x: g.c + 0.5, y: g.r + 0.5, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, g });
    }
  }

  // ---------- 입력 ----------
  cellAt(e) {
    const rc = this.canvas.getBoundingClientRect();
    const c = Math.floor(((e.clientX - rc.left) / rc.width) * N);
    const r = Math.floor(((e.clientY - rc.top) / rc.height) * N);
    return r >= 0 && r < N && c >= 0 && c < N ? { r, c } : null;
  }

  onPointerDown(e) {
    if (this.busy) return;
    const p = this.cellAt(e);
    if (!p) return;
    this.down = { ...p, x: e.clientX, y: e.clientY };
    this.canvas.setPointerCapture?.(e.pointerId);
  }

  onPointerMove(e) {
    const d = this.down;
    if (!d || this.busy) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    const th = (this.canvas.getBoundingClientRect().width / N) * 0.35;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < th) return;
    const to = Math.abs(dx) > Math.abs(dy)
      ? { r: d.r, c: d.c + Math.sign(dx) }
      : { r: d.r + Math.sign(dy), c: d.c };
    this.down = null;
    if (to.r >= 0 && to.r < N && to.c >= 0 && to.c < N) this.trySwap({ r: d.r, c: d.c }, to);
  }

  onPointerUp() {
    const d = this.down;
    this.down = null;
    if (!d || this.busy) return;
    const p = { r: d.r, c: d.c };
    if (this.sel && adjacent(this.sel, p)) this.trySwap(this.sel, p);
    else if (this.sel && this.sel.r === p.r && this.sel.c === p.c) this.sel = null;
    else { this.sel = p; this.sound.beep(520, 0.04); }
  }

  // ---------- 그리기 ----------
  resize() {
    const dpr = window.devicePixelRatio || 1;
    const size = this.canvas.getBoundingClientRect().width;
    this.canvas.width = this.canvas.height = Math.max(1, Math.round(size * dpr));
    this.W = this.canvas.width;
    this.cs = this.W / N;
  }

  update(dt) {
    let moving = false;
    for (const row of this.grid) {
      for (const g of row) {
        if (!g) continue;
        if (g.y < g.r) {
          g.v = Math.min(g.v + 60 * dt, 22);
          g.y = Math.min(g.r, g.y + g.v * dt);
          if (g.y === g.r) { g.v = 0; g.pop = 0.5; }
        } else if (g.y > g.r) {
          g.y = Math.max(g.r, g.y - 9 * dt);
        }
        if (g.x !== g.c) g.x += Math.sign(g.c - g.x) * Math.min(Math.abs(g.c - g.x), 9 * dt);
        if (g.dying) g.s = Math.max(0, g.s - dt * 5);
        if (g.pop > 0) g.pop = Math.max(0, g.pop - dt * 4);
        if (g.x !== g.c || g.y !== g.r) moving = true;
      }
    }
    if (!moving && this.waiters.length) {
      const w = this.waiters;
      this.waiters = [];
      w.forEach(f => f());
    }
  }

  frame(now) {
    if (!this.alive) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.update(dt);
    this.draw(now, dt);
    this.raf = requestAnimationFrame(this.frame);
  }

  draw(now, dt) {
    const { ctx, W, cs, sel, hint } = this;

    // 바둑판 배경
    ctx.clearRect(0, 0, W, W);
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        ctx.fillStyle = (r + c) % 2 ? '#2a2152' : '#332863';
        ctx.fillRect(c * cs, r * cs, cs, cs);
      }
    }
    if (sel) {
      ctx.strokeStyle = '#ffd84d';
      ctx.lineWidth = cs * 0.05;
      ctx.strokeRect(sel.c * cs + cs * 0.05, sel.r * cs + cs * 0.05, cs * 0.9, cs * 0.9);
    }

    // 보석
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, W);
    ctx.clip();
    for (const row of this.grid) {
      for (const g of row) {
        if (!g) continue;
        drawGem(ctx, g, {
          cs, now,
          selected: !!sel && sel.r === g.r && sel.c === g.c,
          hinted: !!hint && hint.some(h => h.r === g.r && h.c === g.c),
        });
      }
    }
    ctx.restore();

    // 파티클
    this.particles = this.particles.filter(p => p.life > 0);
    for (const p of this.particles) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 6 * dt; p.life -= dt * 1.6;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = COLORS[p.g.t][0];
      ctx.beginPath();
      ctx.arc(p.x * cs, p.y * cs, cs * 0.07 * Math.max(0, p.life) + 1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 점수 팝업
    this.floats = this.floats.filter(f => f.life > 0);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const f of this.floats) {
      f.life -= dt * 0.9;
      f.y -= dt * 0.8;
      ctx.globalAlpha = Math.max(0, f.life);
      ctx.font = `bold ${cs * 0.4}px "Segoe UI",sans-serif`;
      ctx.lineWidth = cs * 0.08;
      ctx.strokeStyle = '#000a';
      ctx.strokeText(f.text, f.x * cs, f.y * cs);
      ctx.fillStyle = '#fff';
      ctx.fillText(f.text, f.x * cs, f.y * cs);
    }
    ctx.globalAlpha = 1;

    // 안내 배너 (레벨 업, 섞기)
    if (this.banner) {
      this.banner.life -= dt;
      if (this.banner.life <= 0) {
        this.banner = null;
      } else {
        ctx.globalAlpha = Math.min(1, this.banner.life * 2);
        ctx.fillStyle = '#000a';
        ctx.fillRect(0, W / 2 - cs * 0.7, W, cs * 1.4);
        ctx.font = `bold ${cs * 0.55}px "Malgun Gothic",sans-serif`;
        ctx.fillStyle = '#ffd84d';
        ctx.fillText(this.banner.text, W / 2, W / 2);
        ctx.globalAlpha = 1;
      }
    }
  }
}
