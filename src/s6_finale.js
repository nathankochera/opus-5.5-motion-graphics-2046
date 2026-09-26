/* ============================================================
   06 — FINALE: every chapter's colour returns to the horizon.
   ============================================================ */
const FINALE = (() => {
  const HY = 690, CX = 960;
  const streaks = [];
  const QX = [CX - 430, CX, CX + 430];
  const QS = ['WHO BENEFITS?', 'WHO DECIDES?', 'WHAT STAYS HUMAN?'];
  const QT = [27.7, 27.95, 28.2];
  let L1, L2;

  const motes = [];
  function init(ctx) {
    const r = RNG(1234);
    // each chapter's colour flows into its own segment of the spectrum line
    const streams = [
      { col: C.mint, ox: 120, oy: -160, x0: 90, x1: 470 },
      { col: C.blue, ox: 420, oy: H + 160, x0: 470, x1: 820 },
      { col: C.violet, ox: 900, oy: -200, x0: 820, x1: 1110 },
      { col: C.orange, ox: 1500, oy: H + 180, x0: 1110, x1: 1460 },
      { col: C.gold, ox: 1880, oy: -170, x0: 1460, x1: 1840 },
    ];
    streams.forEach((st, c) => {
      for (let k = 0; k < 30; k++) {
        const sx = st.ox + (r() - 0.5) * 520, sy = st.oy + (r() - 0.5) * 160;
        const lx = lerp(st.x0, st.x1, r());
        const dir = lx > sx ? 1 : -1;
        streaks.push({ col: rgb(st.col), sx, sy, lx, t0: 23.93 + c * 0.05 + Math.pow(r(), 1.3) * 0.7, dur: 0.55 + r() * 0.35,
          cx: lx - dir * (120 + r() * 260), cy: HY + (sy - HY) * 0.06 });
      }
    });
    for (let k = 0; k < 70; k++) motes.push({ x: 90 + r() * (W - 180), t0: 24.6 + r() * 4.2, dur: 2.4 + r() * 2.2, h: 90 + r() * 200, sway: (r() - 0.5) * 40 });
    L1 = mkLine(ctx, [{ s: '2046 isn’t a prediction.', f: 'disp', px: 92, col: C.paper, ls: -0.03 }]);
    L2 = mkLine(ctx, [
      { s: 'It’s a', f: 'disp', px: 92, col: C.paper, ls: -0.03 },
      { s: ' design brief.', f: 'ser', px: 102, ls: -0.01, grad: (c, x0, x1) => spectrumGrad(c, x0 + 20, x1 - 10) },
    ]);
  }

  function lineHalf(t) {
    const grow = E.outExpo(prog(t, 23.9, 24.25));
    const shrink = E.inExpo(prog(t, 29.36, 29.84));
    return 1100 * grow * (1 - shrink);
  }

  function world(ctx, t) {
    ctx.save();
    const fl = t > 24.0 ? Math.exp(-(t - 24.0) / 0.35) : 0;
    const L = lineHalf(t);
    // atmosphere
    const at = env(t, 23.9, 29.8, 0.4, 0.5);
    if (at > 0) {
      ctx.save(); ctx.translate(CX, HY); ctx.scale(1, 0.3);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1000);
      g.addColorStop(0, rgba(C.paper, 0.06 * at + 0.1 * fl)); g.addColorStop(1, rgba(C.paper, 0));
      ctx.fillStyle = g; ctx.fillRect(-1000, -1000, 2000, 2000); ctx.restore();
    }
    // streams of chapter colour converge on the line
    ctx.lineCap = 'round';
    for (const s of streaks) {
      const p = prog(t, s.t0, s.t0 + s.dur);
      if (p <= 0) continue;
      if (p >= 1) {
        const q = prog(t, s.t0 + s.dur, s.t0 + s.dur + 0.45);
        if (q < 1) {
          ctx.strokeStyle = rgba(s.col, 0.9 * (1 - q)); ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(s.lx, HY - 14 * (1 - q)); ctx.lineTo(s.lx, HY + 14 * (1 - q)); ctx.stroke();
        }
        continue;
      }
      const bz = (u) => { const a = 1 - u; return [a * a * s.sx + 2 * a * u * s.cx + u * u * s.lx, a * a * s.sy + 2 * a * u * s.cy + u * u * HY]; };
      const e = E.inOutCubic(p);
      let prev = bz(Math.max(0, e - 0.2));
      for (let k = 1; k <= 5; k++) {
        const cur = bz(Math.max(0, e - 0.2 + 0.04 * k));
        ctx.strokeStyle = rgba(s.col, 0.16 * k); ctx.lineWidth = 0.6 + 0.3 * k;
        ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(cur[0], cur[1]); ctx.stroke();
        prev = cur;
      }
      ctx.fillStyle = rgba(mix(s.col, [255, 255, 255], 0.6), 1); ctx.beginPath(); ctx.arc(prev[0], prev[1], 1.8, 0, TAU); ctx.fill();
    }
    ctx.lineCap = 'butt';
    // motes drift up off the line
    for (const m of motes) {
      const p = prog(t, m.t0, m.t0 + m.dur);
      if (p <= 0 || p >= 1) continue;
      const a = Math.sin(PI * p) * 0.55 * (1 - prog(t, 29.2, 29.5));
      const c = spectrumAt((m.x - 60) / (W - 120));
      ctx.fillStyle = rgba(c, a);
      ctx.beginPath(); ctx.arc(m.x + Math.sin(p * 3) * m.sway, HY - 6 - m.h * E.outSine(p), 1.4, 0, TAU); ctx.fill();
    }
    // the horizon, now in every colour
    if (L > 1) {
      const g = ctx.createLinearGradient(CX - L, 0, CX + L, 0);
      const n = SPECTRUM.length;
      g.addColorStop(0, rgba(C.mint, 0));
      for (let i = 0; i < n; i++) g.addColorStop(0.1 + 0.8 * i / (n - 1), SPECTRUM[i]);
      g.addColorStop(1, rgba(C.gold, 0));
      ctx.strokeStyle = g; ctx.lineWidth = 2.6 + 1.6 * fl;
      ctx.beginPath(); ctx.moveTo(CX - L, HY); ctx.lineTo(CX + L, HY); ctx.stroke();
      ctx.globalAlpha = 0.1 + 0.15 * fl; ctx.lineWidth = 16;
      ctx.beginPath(); ctx.moveTo(CX - L, HY); ctx.lineTo(CX + L, HY); ctx.stroke();
      ctx.globalAlpha = 1;
      // white core
      ctx.strokeStyle = rgba('#FFFFFF', 0.55 + 0.45 * fl); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(CX - L * 0.8, HY); ctx.lineTo(CX + L * 0.8, HY); ctx.stroke();
      // a slow shimmer travels the line
      const sx = -300 + (((t - 24.4) / 2.6) % 1) * (W + 600);
      if (t > 24.4 && Math.abs(sx - CX) < L) {
        const sg = ctx.createLinearGradient(sx - 160, 0, sx + 160, 0);
        sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.85)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = sg; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.moveTo(sx - 160, HY); ctx.lineTo(sx + 160, HY); ctx.stroke();
      }
    }
    // question leaders hang from the horizon
    for (let i = 0; i < 3; i++) {
      const p = E.outCubic(prog(t, QT[i] - 0.12, QT[i] + 0.25)) * (1 - prog(t, 29.2, 29.45));
      if (p <= 0) continue;
      ctx.strokeStyle = rgba(C.paper, 0.5 * p); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(QX[i], HY + 8); ctx.lineTo(QX[i], HY + 8 + 38 * p); ctx.stroke();
      ctx.fillStyle = rgba('#FFFFFF', p);
      ctx.beginPath(); ctx.arc(QX[i], HY, 3, 0, TAU); ctx.fill();
    }
    // final point
    const fp = prog(t, 29.8, 29.97);
    if (fp > 0 && fp < 1) {
      const r = 5 * Math.sin(PI * fp) + 1;
      ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(CX, HY, r, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  function type(ctx, t) {
    drawLine(ctx, L1, CX, 520, t, 25.0, 29.22, { align: 'center', alpha: 0.94 });
    drawLine(ctx, L2, CX, 636, t, 26.3, 29.28, { align: 'center' });
    ctx.save();
    const out = 1 - prog(t, 29.2, 29.45);
    font(ctx, fMono(14, 500), 2.8); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = rgba(C.paper, 0.92 * out);
      ctx.fillText(scramble(QS[i], t, QT[i], 0.45, 600 + i), QX[i], HY + 82);
    }
    font(ctx, fMono(12, 500), 3.2);
    ctx.fillStyle = rgba(C.paper, 0.6 * (1 - prog(t, 29.3, 29.55)));
    ctx.fillText(scramble('DESIGNED, ANIMATED & SCORED IN CODE BY CLAUDE', t, 26.95, 0.8, 610), CX, 930);
    ctx.restore();
  }

  return { id: 'finale', t0: 23.86, t1: 30.01, init, world, type, streaks, QT };
})();
