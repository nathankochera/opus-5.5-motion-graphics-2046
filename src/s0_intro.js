/* ============================================================
   00 — COLD OPEN: a point becomes a horizon; the horizon is a timeline.
   ============================================================ */
const INTRO = (() => {
  const HY = 640, CX = 960, PXY = 150, R0 = 1.35, R1 = 3.3;
  const yearAt = (t) => 2026 + 20 * E.inOutCubic(prog(t, R0, R1));
  const TICKS = [];
  for (let i = 1; i <= 20; i++) {
    let lo = R0, hi = R1;
    for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2; if (yearAt(m) < 2026 + i - 1e-9) lo = m; else hi = m; }
    TICKS.push(+hi.toFixed(4));
  }
  const NUMPX = 300, NUMLS = -9;
  let cellW = 0;
  const lineCol = [255, 247, 232];

  function init(ctx) {
    font(ctx, fDisp(NUMPX), NUMLS);
    for (let d = 0; d < 10; d++) cellW = Math.max(cellW, ctx.measureText(String(d)).width);
    cellW = Math.round(cellW * 0.97);
  }

  function lineProgress(t) { return E.inOutExpo(prog(t, 0.36, 1.22)); }
  function flashAt(t) { return t > R1 ? Math.exp(-(t - R1) / 0.22) : 0; }

  function world(ctx, t) {
    const la = lineProgress(t), fl = flashAt(t);
    // atmosphere
    if (la > 0) {
      ctx.save();
      ctx.translate(CX, HY); ctx.scale(1, 0.26);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 980);
      g.addColorStop(0, rgba(C.paper, 0.085 * la + 0.1 * fl));
      g.addColorStop(0.5, rgba(C.paper, 0.025 * la));
      g.addColorStop(1, rgba(C.paper, 0));
      ctx.fillStyle = g; ctx.fillRect(-980, -980, 1960, 1960);
      ctx.restore();
    }
    // spark
    const sp = prog(t, 0.12, 0.45);
    if (sp > 0 && t < 1.4) {
      const k = E.outBack(sp) * (1 - prog(t, 0.9, 1.4));
      ctx.save();
      ctx.fillStyle = rgba(lineCol, 1);
      ctx.beginPath(); ctx.arc(CX, HY, 4.5 * k, 0, TAU); ctx.fill();
      const fl2 = 70 * k;
      let g = ctx.createLinearGradient(CX, HY - fl2, CX, HY + fl2);
      g.addColorStop(0, rgba(lineCol, 0)); g.addColorStop(0.5, rgba(lineCol, 0.9)); g.addColorStop(1, rgba(lineCol, 0));
      ctx.fillStyle = g; ctx.fillRect(CX - 0.75, HY - fl2, 1.5, fl2 * 2);
      const ring = prog(t, 0.12, 0.8);
      ctx.strokeStyle = rgba(lineCol, 0.6 * (1 - ring)); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(CX, HY, 6 + 60 * E.outCubic(ring), 0, TAU); ctx.stroke();
      ctx.restore();
    }
    // the line
    const L = 1100 * la;
    if (L > 2) {
      ctx.save();
      const g = ctx.createLinearGradient(CX - L, 0, CX + L, 0);
      g.addColorStop(0, rgba(lineCol, 0)); g.addColorStop(0.16, rgba(lineCol, 1));
      g.addColorStop(0.84, rgba(lineCol, 1)); g.addColorStop(1, rgba(lineCol, 0));
      ctx.strokeStyle = g; ctx.lineWidth = 2 + fl * 1.6;
      ctx.beginPath(); ctx.moveTo(CX - L, HY); ctx.lineTo(CX + L, HY); ctx.stroke();
      ctx.globalAlpha = 0.08 + 0.1 * fl; ctx.lineWidth = 14;
      ctx.beginPath(); ctx.moveTo(CX - L, HY); ctx.lineTo(CX + L, HY); ctx.stroke();
      ctx.restore();
    }
    // ruler
    const ra = E.outCubic(prog(t, 0.95, 1.55));
    if (ra > 0) {
      const Y = yearAt(t);
      ctx.save();
      ctx.lineWidth = 1.2;
      const q0 = Math.floor((Y - 7) * 4), q1 = Math.ceil((Y + 7) * 4);
      for (let q = q0; q <= q1; q++) {
        const yy = q / 4, x = CX + (yy - Y) * PXY;
        if (x < -4 || x > W + 4) continue;
        const e = Math.max(0, 1 - Math.pow(Math.abs(x - CX) / 990, 2.4));
        const major = q % 4 === 0;
        const near = major ? Math.max(0, 1 - Math.abs(yy - Y) * 1.6) : 0;
        const len = (major ? 20 + 10 * near : 8) * ra;
        ctx.strokeStyle = rgba(C.paper, ((major ? 0.5 : 0.24) + near * 0.5) * e * ra);
        ctx.beginPath(); ctx.moveTo(x, HY + 9); ctx.lineTo(x, HY + 9 + len); ctx.stroke();
      }
      // playhead
      ctx.fillStyle = rgba(C.paper, 0.95 * ra);
      ctx.beginPath(); ctx.moveTo(CX - 7, HY - 22); ctx.lineTo(CX + 7, HY - 22); ctx.lineTo(CX, HY - 12); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }

  function type(ctx, t) {
    const out = 1 - E.inCubic(prog(t, 3.62, 3.98));
    // label
    ctx.save();
    font(ctx, fMono(13, 500), 3.4);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = rgba(C.paper, 0.78 * out);
    ctx.fillText(scramble('AI + ROBOTICS, TWENTY YEARS OUT', t, 1.5, 0.7, 3), CX, 292);
    ctx.restore();

    // ruler year labels
    const ra = E.outCubic(prog(t, 1.05, 1.6));
    if (ra > 0) {
      const Y = yearAt(t);
      ctx.save();
      font(ctx, fMono(12, 500), 1.2);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let yr = Math.floor(Y - 7); yr <= Math.ceil(Y + 7); yr++) {
        const x = CX + (yr - Y) * PXY;
        if (x < -40 || x > W + 40) continue;
        const e = Math.max(0, 1 - Math.pow(Math.abs(x - CX) / 990, 2.4));
        const near = Math.max(0, 1 - Math.abs(yr - Y) * 1.6);
        ctx.fillStyle = rgba(C.paper, (0.34 + near * 0.66) * e * ra * out);
        ctx.fillText(String(yr), x, HY + 58);
      }
      ctx.restore();
    }

    // big odometer year
    if (t < 0.95) return;
    const Y = yearAt(t);
    const dY = (yearAt(t + 0.004) - yearAt(t - 0.004)) / 0.008; // years / s
    const n = Math.floor(Y + 1e-9), f = Y - n;
    const roll = n >= 2046 ? 0 : E.inOutCubic(cl01((f - 0.3) / 0.7));
    const ones = n % 10, tens = Math.floor(n / 10) % 10;
    const rollT = ones === 9 ? roll : 0;
    const yb = HY - 68, x0 = CX - cellW * 2;
    const land = prog(t, R1, R1 + 0.5);
    const bump = t > R1 ? Math.sin(PI * prog(t, R1, R1 + 0.3)) * 0.028 : 0;
    const rollH = 300;
    const exitY = E.inExpo(prog(t, 3.64, 3.98)) * 262;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, yb - 238, W, HY - 5 - (yb - 238)); ctx.clip();
    ctx.translate(CX, yb - 108); ctx.scale(1 + bump, 1 + bump); ctx.translate(-CX, -(yb - 108) - exitY);
    font(ctx, fDisp(NUMPX), NUMLS);
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    // landing highlight sweep
    let fill = C.paper;
    if (land > 0 && land < 1) {
      const sx = lerp(x0 - 300, x0 + cellW * 4 + 300, E.inOutCubic(land));
      const g = ctx.createLinearGradient(sx - 260, 0, sx + 260, 0);
      g.addColorStop(0, C.paper); g.addColorStop(0.5, '#FFFFFF'); g.addColorStop(1, C.paper);
      fill = g;
    }
    ctx.fillStyle = fill;
    const cols = [[2, 0], [0, 0], [tens, rollT], [ones, roll]];
    const blur = cl01((Math.abs(dY) - 4) / 22);
    for (let i = 0; i < 4; i++) {
      const pin = E.outExpo(prog(t, 0.95 + i * 0.06, 1.8 + i * 0.06));
      const dy = (1 - pin) * 330;
      const cx = x0 + cellW * (i + 0.5);
      const [d, r] = cols[i];
      const drawDigit = (off, a) => {
        ctx.globalAlpha = a;
        ctx.fillText(String(d % 10), cx, yb + dy - off * rollH);
        if (off > 0.001) ctx.fillText(String((d + 1) % 10), cx, yb + dy + (1 - off) * rollH);
      };
      if (i >= 2 && blur > 0 && r > 0) {
        for (const k of [-0.16, -0.08, 0.08, 0.16]) drawDigit(cl01(r + k * blur), 0.22 * blur);
        drawDigit(r, 1 - 0.35 * blur);
      } else drawDigit(r, 1);
    }
    ctx.restore();
  }

  return { id: 'intro', t0: 0, t1: 4.34, HY, TICKS, init, world, type, yearAt };
})();
