/* ============================================================
   05 — ACCESS: one person, their tutor, doctor and collaborator.
   Pull back: everyone has the same.
   ============================================================ */
const ACCESS = (() => {
  const N = 4200, CC = 240, SR = 64, YOU_R = 170;
  const RMAX = CC * Math.sqrt(N - 1);
  const ZF = 400 / RMAX;
  const END = [1360, 455];
  const X = new Float32Array(N), Y = new Float32Array(N), A0 = new Float32Array(N), TA = new Float32Array(N);
  const collab = [];
  const SAT = [
    { ang: -150, label: 'TUTOR', glyph: 0, t: 20.14 },
    { ang: -30, label: 'DOCTOR', glyph: 1, t: 20.26 },
    { ang: 90, label: 'COLLABORATOR', glyph: 2, t: 20.38 },
  ];
  let H1, H2, startXY = null;

  function init(ctx) {
    const r = RNG(8008);
    for (let k = 0; k < N; k++) {
      const rad = CC * Math.sqrt(k), th = k * 2.399963;
      X[k] = rad * Math.cos(th); Y[k] = rad * Math.sin(th);
      A0[k] = r() * TAU;
      TA[k] = 21.45 + 1.5 * Math.log(1 + rad / 300) / Math.log(1 + RMAX / 300) + r() * 0.06;
    }
    while (collab.length < 40) {
      const a = 1 + Math.floor(r() * (N - 1)), b = 1 + Math.floor(r() * (N - 1));
      const d = Math.hypot(X[a] - X[b], Y[a] - Y[b]);
      if (d < RMAX * 0.35 || d > RMAX * 1.3) continue;
      collab.push({ a, b, t0: 22.7 + r() * 0.6, bend: (r() - 0.5) * 0.7, ph: r() });
    }
    H1 = mkLine(ctx, [{ s: 'Expertise for', f: 'disp', px: 132, col: C.paper, ls: -0.035 }]);
    H2 = mkLine(ctx, [{ s: 'everyone, not the few.', f: 'ser', px: 114, col: C.blue, ls: -0.01 }]);
  }

  function view(t) {
    if (!startXY) startXY = ENERGY.zoomXY(20.0);
    const zp = E.inOutCubic(prog(t, 21.35, 23.05));
    const Z = Math.exp(Math.log(ZF) * zp);
    const c0 = E.inOutCubic(prog(t, 19.9, 20.45)), c1 = E.inOutCubic(prog(t, 21.4, 23.05));
    const cx = lerp(lerp(startXY[0], 960, c0), END[0], c1), cy = lerp(lerp(startXY[1], 540, c0), END[1], c1);
    const w = 0.11 * Math.max(0, t - 21.4);
    const col = E.inOutCubic(prog(t, 23.45, 24.02));
    return { Z, cx, cy, cw: Math.cos(w), sw: Math.sin(w), col, zp };
  }
  function toScreen(v, x, y, o) {
    let sx = v.cx + (x * v.cw - y * v.sw) * v.Z, sy = v.cy + (x * v.sw + y * v.cw) * v.Z;
    if (v.col > 0) { sx = lerp(sx, 960 + (sx - v.cx) * 2.7, v.col); sy = lerp(sy, 690, v.col); }
    o[0] = sx; o[1] = sy; return o;
  }

  const o = [0, 0], o2 = [0, 0];
  function world(ctx, t) {
    const v = view(t);
    ctx.save();
    const others = prog(t, 20.55, 21.4);
    const linkLen = SR * v.Z;
    const fadeCol = 1 - v.col;
    const links = new Path2D(), sats = new Path2D(), dim = new Path2D(), lit = new Path2D();
    const ns = Math.max(1.3, 5.5 * v.Z), ss = Math.max(0.9, 3 * v.Z);
    const hot = new Path2D(), tw = Math.floor(t * 7);
    if (v.zp > 0.2 && fadeCol > 0) {
      const R0 = RMAX * v.Z * 1.15;
      const g = ctx.createRadialGradient(v.cx, v.cy, 0, v.cx, v.cy, R0);
      g.addColorStop(0, rgba(C.blue, 0.16 * v.zp * fadeCol)); g.addColorStop(0.6, rgba(C.blue, 0.05 * v.zp * fadeCol)); g.addColorStop(1, rgba(C.blue, 0));
      ctx.fillStyle = g; ctx.fillRect(v.cx - R0, v.cy - R0, 2 * R0, 2 * R0);
    }
    if (others > 0) {
      for (let k = 1; k < N; k++) {
        toScreen(v, X[k], Y[k], o);
        const m = linkLen + 8;
        if (o[0] < -m || o[0] > W + m || o[1] < -m || o[1] > H + m) continue;
        const pa = E.outCubic(prog(t, TA[k], TA[k] + 0.3));
        if (pa > 0 && linkLen > 1.2 && fadeCol > 0) {
          for (let s = 0; s < 3; s++) {
            const a = A0[k] + s * TAU / 3;
            const ex = o[0] + Math.cos(a) * linkLen * pa, ey = o[1] + Math.sin(a) * linkLen * pa;
            links.moveTo(o[0], o[1]); links.lineTo(ex, ey);
            sats.rect(ex - ss / 2, ey - ss / 2, ss, ss);
          }
        }
        const P = pa > 0 && hash2(k, tw) > 0.88 ? hot : pa > 0 ? lit : dim;
        const sz = P === hot ? ns * 1.8 : ns;
        if (sz > 3) { P.moveTo(o[0] + sz / 2, o[1]); P.arc(o[0], o[1], sz / 2, 0, TAU); } else P.rect(o[0] - sz / 2, o[1] - sz / 2, sz, sz);
      }
      ctx.lineWidth = 1;
      ctx.strokeStyle = rgba(C.blue, 0.6 * others * fadeCol); ctx.stroke(links);
      ctx.fillStyle = rgba('#9FD0FF', 0.9 * others * fadeCol); ctx.fill(sats);
      ctx.fillStyle = rgba(C.blue, (0.2 + 0.25 * prog(t, 21.3, 21.8)) * others); ctx.fill(dim);
      if (v.col > 0) {
        // colours converge: re-tint lit nodes by their x on the coming horizon
        ctx.save(); ctx.clip(lit);
        const g = spectrumGrad(ctx, 0, W); ctx.fillStyle = g; ctx.globalAlpha = v.col; ctx.fillRect(0, 0, W, H);
        ctx.restore();
        ctx.fillStyle = rgba('#EAF4FF', others * (1 - v.col)); ctx.fill(lit);
      } else { ctx.fillStyle = rgba('#EAF4FF', others); ctx.fill(lit); }
      ctx.fillStyle = rgba('#FFFFFF', others * (1 - v.col)); ctx.fill(hot);
    }
    // collaboration arcs
    for (const c of collab) {
      const p = prog(t, c.t0, c.t0 + 0.5);
      if (p <= 0 || fadeCol <= 0) continue;
      toScreen(v, X[c.a], Y[c.a], o); toScreen(v, X[c.b], Y[c.b], o2);
      const mx = (o[0] + o2[0]) / 2 - (o2[1] - o[1]) * c.bend, my = (o[1] + o2[1]) / 2 + (o2[0] - o[0]) * c.bend;
      const n = 24, e = Math.round(n * E.outCubic(p));
      ctx.beginPath();
      for (let i = 0; i <= e; i++) {
        const s = i / n, a = 1 - s;
        const x = a * a * o[0] + 2 * a * s * mx + s * s * o2[0], y = a * a * o[1] + 2 * a * s * my + s * s * o2[1];
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.strokeStyle = rgba(C.blue, 0.55 * fadeCol); ctx.lineWidth = 1.2; ctx.stroke();
      const tp = ((t - c.t0) * 0.9 + c.ph) % 1, a = 1 - tp;
      if (p >= 1) {
        ctx.fillStyle = rgba('#DDEEFF', 0.9 * fadeCol);
        ctx.beginPath(); ctx.arc(a * a * o[0] + 2 * a * tp * mx + tp * tp * o2[0], a * a * o[1] + 2 * a * tp * my + tp * tp * o2[1], 2, 0, TAU); ctx.fill();
      }
    }
    // YOU + three satellites
    toScreen(v, 0, 0, o);
    const you = Math.max(0.35, 1 - v.zp * 1.4);
    const rY = YOU_R * v.Z;
    for (const s of SAT) {
      const p = E.outCubic(prog(t, s.t, s.t + 0.34));
      if (p <= 0) continue;
      const a = s.ang * PI / 180;
      const ex = o[0] + Math.cos(a) * rY * p, ey = o[1] + Math.sin(a) * rY * p;
      ctx.strokeStyle = rgba(C.blue, 0.85 * fadeCol); ctx.lineWidth = Math.max(1, 1.6 * you);
      ctx.beginPath(); ctx.moveTo(o[0], o[1]); ctx.lineTo(ex, ey); ctx.stroke();
      if (p >= 1 && rY > 12) {
        const gs = Math.min(1, v.Z) * 11;
        ctx.strokeStyle = rgba('#CFE6FF', fadeCol); ctx.fillStyle = rgba('#CFE6FF', fadeCol); ctx.lineWidth = 1.6;
        ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(ex, ey, gs + 5, 0, TAU); ctx.fill();
        ctx.fillStyle = rgba('#CFE6FF', fadeCol);
        if (s.glyph === 0) { ctx.beginPath(); ctx.arc(ex, ey, gs, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(ex, ey, gs * 0.32, 0, TAU); ctx.fill(); }
        else if (s.glyph === 1) { ctx.fillRect(ex - gs, ey - gs * 0.28, gs * 2, gs * 0.56); ctx.fillRect(ex - gs * 0.28, ey - gs, gs * 0.56, gs * 2); }
        else { ctx.beginPath(); ctx.arc(ex - gs * 0.42, ey, gs * 0.62, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(ex + gs * 0.42, ey, gs * 0.62, 0, TAU); ctx.stroke(); }
      }
    }
    const pulse = 0.5 + 0.5 * Math.sin(TAU * (t - 20) * 2);
    ctx.fillStyle = rgba('#FFFFFF', fadeCol);
    ctx.beginPath(); ctx.arc(o[0], o[1], 7 * you + 1, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba(C.blue, (0.4 + 0.4 * pulse) * you * fadeCol); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(o[0], o[1], (16 + 5 * pulse) * you, 0, TAU); ctx.stroke();
    ctx.restore();
  }

  function type(ctx, t) {
    const v = view(t);
    const la = 1 - prog(t, 21.4, 21.65);
    if (la > 0) {
      toScreen(v, 0, 0, o);
      ctx.save();
      font(ctx, fMono(14, 500), 2.6); ctx.textBaseline = 'middle';
      ctx.fillStyle = rgba(C.blue, la); ctx.textAlign = 'center';
      ctx.fillText(scramble('YOU', t, 20.05, 0.25, 501), o[0], o[1] + 40);
      for (const s of SAT) {
        const a = s.ang * PI / 180, rY = YOU_R * v.Z;
        const lx = o[0] + Math.cos(a) * (rY + 34), ly = o[1] + Math.sin(a) * (rY + 34);
        ctx.fillStyle = rgba(C.paper, la);
        ctx.textAlign = Math.cos(a) < -0.2 ? 'right' : Math.cos(a) > 0.2 ? 'left' : 'center';
        ctx.fillText(scramble(s.label, t, s.t + 0.14, 0.3, 510 + s.glyph), lx, ly + (Math.abs(Math.cos(a)) < 0.2 ? 8 : 0));
      }
      ctx.restore();
    }
    // counter
    const ca = env(t, 22.15, 23.6, 0.25, 0.3);
    if (ca > 0) {
      ctx.save();
      ctx.globalAlpha = ca;
      font(ctx, fMono(13, 500), 2.6); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = C.blue;
      ctx.fillText(scramble('ONE EACH, FOR', t, 22.15, 0.35, 520), 120, 166);
      const n = Math.round(Math.pow(8e9, E.outCubic(prog(t, 22.2, 23.15))));
      font(ctx, fDisp(76), -1.5); ctx.fillStyle = C.paper;
      ctx.fillText(fmtInt(n), 116, 248);
      ctx.restore();
    }
    drawEyebrow(ctx, 120, 668, '05 / ACCESS', C.blue, t, 21.5, 23.6, 105);
    drawLine(ctx, H1, 120, 792, t, 21.55, 23.3);
    drawLine(ctx, H2, 120, 918, t, 21.7, 23.36);
  }

  return { id: 'access', t0: 19.86, t1: 24.06, init, world, type };
})();
