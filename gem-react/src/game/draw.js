// 보석 그리기 (PRD F-02, F-50)
import { COLORS } from './constants';

function shapePath(ctx, t, R) {
  ctx.beginPath();
  const poly = (n, rot, rr = R) => {
    for (let i = 0; i < n; i++) {
      const a = rot + (i * 2 * Math.PI) / n;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
  };
  switch (t) {
    case 0: { // 둥근 사각형
      const s = R * 0.82, k = R * 0.28;
      if (ctx.roundRect) ctx.roundRect(-s, -s, s * 2, s * 2, k); else ctx.rect(-s, -s, s * 2, s * 2);
      break;
    }
    case 1: poly(6, 0); break; // 육각형
    case 2: // 별
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? R * 0.48 : R * 1.05;
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      break;
    case 3: ctx.arc(0, 0, R * 0.9, 0, Math.PI * 2); break; // 원
    case 4: // 마름모
      ctx.moveTo(0, -R); ctx.lineTo(R * 0.75, 0); ctx.lineTo(0, R); ctx.lineTo(-R * 0.75, 0); ctx.closePath();
      break;
    case 5: poly(3, -Math.PI / 2, R * 1.05); break; // 삼각형
    case 6: // 하트
      ctx.moveTo(0, R * 0.9);
      ctx.bezierCurveTo(-R * 1.3, -R * 0.1, -R * 0.6, -R * 1.1, 0, -R * 0.4);
      ctx.bezierCurveTo(R * 0.6, -R * 1.1, R * 1.3, -R * 0.1, 0, R * 0.9);
      ctx.closePath();
      break;
  }
}

/**
 * @param {object} opts { cs: 칸 크기(px), selected, hinted, now }
 */
export function drawGem(ctx, g, { cs, selected, hinted, now }) {
  const [light, dark] = COLORS[g.t];
  const cx = (g.x + 0.5) * cs, cy = (g.y + 0.5) * cs;
  let s = g.s;
  if (g.pop > 0) s *= 1 + Math.sin(g.pop * Math.PI) * 0.25;
  if (hinted) s *= 1 + Math.sin(now / 120) * 0.08;
  const R = cs * 0.4 * s;
  if (R <= 0) return;

  ctx.save();
  ctx.translate(cx, cy);
  if (selected && !g.dying) ctx.rotate(Math.sin(now / 150) * 0.15);
  shapePath(ctx, g.t, R);
  const gr = ctx.createRadialGradient(-R * 0.35, -R * 0.4, R * 0.1, 0, 0, R * 1.2);
  gr.addColorStop(0, '#fff');
  gr.addColorStop(0.25, light);
  gr.addColorStop(1, dark);
  ctx.fillStyle = gr;
  ctx.shadowColor = '#0007';
  ctx.shadowBlur = cs * 0.08;
  ctx.shadowOffsetY = cs * 0.04;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = cs * 0.03;
  ctx.strokeStyle = dark;
  ctx.stroke();
  // 광택
  ctx.beginPath();
  ctx.ellipse(-R * 0.25, -R * 0.35, R * 0.28, R * 0.14, -0.6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.fill();
  ctx.restore();
}
