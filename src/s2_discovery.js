/* ============================================================
   02 — DISCOVERY: a 1536-well plate runs in waves while a
   protein chain folds itself into a four-helix bundle.
   ============================================================ */
const DISC = (() => {
  const COLS = 48, ROWS = 32, WR = 0.33;
  const WAVES = [8.02, 9.22, 10.42], WDUR = 1.1;
  const MAXPOS = (COLS - 1) + (ROWS - 1) * 0.55;
  const wells = [], HITS = [];
  const ROWLBL = []; // A..Z, AA..AF
  for (let j = 0; j < ROWS; j++) ROWLBL.push(j < 26 ? String.fromCharCode(65 + j) : 'A' + String.fromCharCode(65 + j - 26));

  // ---- protein ----
  const NRES = 90;
  const FOLD = [], UNF = [], WF = [], KIND = [], SWIRL = [], SEQ = [];
  const AA = 'ACDEFGHIKLMNPQRSTVWY';
  const CHAIN = [C.violet, C.pink, C.cyan, C.violet];
  let L1, L2;

  function norm(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }

  function buildProtein() {
    const A = [[-5.3, -5.3], [5.3, -5.3], [5.3, 5.3], [-5.3, 5.3]];
    const hel = [];
    for (let k = 0; k < 4; k++) {
      const up = k % 2 === 0, pts = [];
      for (let n = 0; n < 16; n++) {
        const a = k * 1.3 + n * 1.745;
        const y = up ? -11.25 + n * 1.5 : 11.25 - n * 1.5;
        const rad = [Math.cos(a), 0, Math.sin(a)];
        const tan = norm([-2.3 * Math.sin(a) * 1.745, up ? 1.5 : -1.5, 2.3 * Math.cos(a) * 1.745]);
        pts.push({ p: [A[k][0] + 2.3 * rad[0], y, A[k][1] + 2.3 * rad[2]], w: norm(cross(rad, tan)) });
      }
      hel.push(pts);
    }
    const push = (p, w, kind) => { FOLD.push(p); WF.push(w || [0, 1, 0]); KIND.push(kind); };
    const s0 = hel[0][0].p;
    for (let m = 4; m >= 1; m--) push([s0[0] - 1.0 * m, s0[1] - 1.15 * m, s0[2] - 0.7 * m], null, 0);
    for (let k = 0; k < 4; k++) {
      for (const h of hel[k]) push(h.p, h.w, 1);
      if (k < 3) {
        const e = hel[k][15].p, s = hel[k + 1][0].p, dy = k % 2 === 0 ? 1 : -1;
        const mx = (e[0] + s[0]) / 2, mz = (e[2] + s[2]) / 2;
        const out = norm([mx, 0, mz]);
        const c1 = [e[0] + out[0] * 2, e[1] + 4.6 * dy, e[2] + out[2] * 2], c2 = [s[0] + out[0] * 2, s[1] + 4.6 * dy, s[2] + out[2] * 2];
        for (let m = 1; m <= 6; m++) {
          const u = m / 7, a = 1 - u;
          push([0, 1, 2].map((i) => a * a * a * e[i] + 3 * a * a * u * c1[i] + 3 * a * u * u * c2[i] + u * u * u * s[i]), null, 0);
        }
      }
    }
    const e3 = hel[3][15].p;
    for (let m = 1; m <= 4; m++) push([e3[0] + 0.9 * m, e3[1] - 1.1 * m, e3[2] + 0.8 * m], null, 0);
    // center
    const c = [0, 0, 0];
    for (const p of FOLD) { c[0] += p[0]; c[1] += p[1]; c[2] += p[2]; }
    for (const p of FOLD) { p[0] -= c[0] / NRES; p[1] -= c[1] / NRES; p[2] -= c[2] / NRES; }
    const r = RNG(99);
    for (let n = 0; n < NRES; n++) {
      UNF.push([(n - 44.5) * 1.32, 2.4 * Math.sin(n * 0.33) + 1.1 * Math.sin(n * 0.121 + 1), 2.0 * Math.cos(n * 0.29)]);
      SWIRL.push([5.5 * Math.sin(n * 0.21 + 1), 4.8 * Math.cos(n * 0.17), 5.5 * Math.sin(n * 0.13 + 2)]);
      SEQ.push(AA[Math.floor(r() * 20)]);
    }
  }
  function chainCol(u) {
    const f = cl01(u) * 3, i = Math.min(2, Math.floor(f));
    return mix(CHAIN[i], CHAIN[i + 1], f - i);
  }

  function init(ctx) {
    const r = RNG(777);
    for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) {
      const w = { x: (i - (COLS - 1) / 2), z: (j - (ROWS - 1) / 2), i, j, s: [], r: [] };
      for (let k = 0; k < WAVES.length; k++) {
        const pos = k % 2 ? (COLS - 1 - i) + j * 0.55 : i + j * 0.55;
        const s = WAVES[k] + WDUR * pos / MAXPOS + (r() - 0.5) * 0.03;
        const v = r();
        w.s.push(s); w.r.push(v);
        if (v > 0.985) HITS.push(+s.toFixed(4));
      }
      wells.push(w);
    }
    HITS.sort((a, b) => a - b);
    buildProtein();
    L1 = mkLine(ctx, [{ s: 'Science at', f: 'disp', px: 132, col: C.paper, ls: -0.035 }]);
    L2 = mkLine(ctx, [{ s: 'the speed of software.', f: 'ser', px: 124, col: C.violet, ls: -0.01 }]);
  }

  function cam(t) {
    const u = t - 8;
    const c = lookAt([3.5 + 2.5 * Math.sin(u * 0.35), 23.5 - u * 0.5, -27.5 + u * 0.6], [0.5, 0, 1.5], 1120, W / 2, H / 2);
    return c;
  }

  const o = [0, 0, 0], o2 = [0, 0, 0];
  function drawPlate(ctx, t) {
    const cm = cam(t);
    // plate outline
    const cs = [[-24.6, -16.6], [24.6, -16.6], [24.6, 16.6], [-24.6, 16.6]];
    ctx.beginPath();
    cs.forEach((c, k) => { proj(cm, c[0], 0, c[1], o); k ? ctx.lineTo(o[0], o[1]) : ctx.moveTo(o[0], o[1]); });
    ctx.closePath();
    ctx.fillStyle = '#0B0C12'; ctx.fill();
    ctx.strokeStyle = 'rgba(237,232,223,0.16)'; ctx.lineWidth = 1.2; ctx.stroke();

    const ring = new Path2D();
    const fills = [new Path2D(), new Path2D(), new Path2D(), new Path2D(), new Path2D()];
    const flashes = [new Path2D(), new Path2D(), new Path2D()];
    const hits = [];
    const pulse = 0.5 + 0.5 * Math.cos(TAU * ((t - 8) / 0.5));
    for (const w of wells) {
      proj(cm, w.x, 0, w.z, o);
      if (o[0] < -30 || o[0] > W + 30 || o[1] < -30 || o[1] > H + 30) continue;
      const rx = cm.f * WR / o[2];
      const vy = (cm.pos[1]) / Math.hypot(cm.pos[0] - w.x, cm.pos[1], cm.pos[2] - w.z);
      const ry = rx * vy;
      ring.moveTo(o[0] + rx, o[1]); ring.ellipse(o[0], o[1], rx, ry, 0, 0, TAU);
      let k = -1;
      for (let m = WAVES.length - 1; m >= 0; m--) if (t >= w.s[m]) { k = m; break; }
      if (k < 0) continue;
      const dt = t - w.s[k], fl = Math.exp(-dt / 0.16);
      const rv = w.r[k];
      if (rv > 0.985) hits.push([o[0], o[1], rx, ry, dt]);
      else {
        const qv = Math.pow(rv, 5);
        const b = Math.min(4, Math.floor(qv * 5));
        fills[b].moveTo(o[0] + rx * 0.8, o[1]); fills[b].ellipse(o[0], o[1], rx * 0.8, ry * 0.8, 0, 0, TAU);
      }
      if (fl > 0.06) {
        const b = fl > 0.6 ? 2 : fl > 0.25 ? 1 : 0;
        flashes[b].moveTo(o[0] + rx, o[1]); flashes[b].ellipse(o[0], o[1], rx, ry, 0, 0, TAU);
      }
    }
    ctx.strokeStyle = rgba(C.violet, 0.2 + 0.05 * pulse); ctx.lineWidth = 1; ctx.stroke(ring);
    const FA = [0.07, 0.14, 0.24, 0.38, 0.56];
    for (let b = 0; b < 5; b++) { ctx.fillStyle = rgba(C.violet, FA[b]); ctx.fill(fills[b]); }
    const FL = [[C.violet, 0.4], [C.violet, 0.75], ['#E9E0FF', 0.95]];
    for (let b = 0; b < 3; b++) { ctx.fillStyle = rgba(FL[b][0], FL[b][1]); ctx.fill(flashes[b]); }
    for (const h of hits) {
      ctx.fillStyle = rgba(C.pink, 0.95);
      ctx.beginPath(); ctx.ellipse(h[0], h[1], h[2] * 0.95, h[3] * 0.95, 0, 0, TAU); ctx.fill();
      if (h[4] < 0.8) {
        const p = E.outCubic(h[4] / 0.8);
        ctx.strokeStyle = rgba(C.pink, 0.9 * (1 - p)); ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.ellipse(h[0], h[1], h[2] * (1 + 3.2 * p), h[3] * (1 + 3.2 * p), 0, 0, TAU); ctx.stroke();
      }
    }
    // scanning gantry
    for (let k = 0; k < WAVES.length; k++) {
      const p = (t - WAVES[k]) / WDUR;
      if (p < -0.02 || p > 1.02) continue;
      const pos = p * MAXPOS;
      const a = Math.sin(PI * cl01(p));
      const pts = [];
      for (const jj of [-0.8, ROWS - 0.2]) {
        let ii = pos - jj * 0.55;
        if (k % 2) ii = COLS - 1 - ii;
        pts.push(proj(cm, ii - (COLS - 1) / 2, 0.05, jj - (ROWS - 1) / 2, [0, 0, 0]));
      }
      ctx.strokeStyle = rgba('#E9E0FF', 0.9 * a); ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); ctx.lineTo(pts[1][0], pts[1][1]); ctx.stroke();
      ctx.strokeStyle = rgba(C.violet, 0.25 * a); ctx.lineWidth = 10;
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); ctx.lineTo(pts[1][0], pts[1][1]); ctx.stroke();
    }
    // plate coordinates (rows A–AF, columns 1–48)
    ctx.fillStyle = 'rgba(237,232,223,0.32)';
    font(ctx, fMono(10, 500), 0.5);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = 0; i < COLS; i += 4) { proj(cm, i - (COLS - 1) / 2, 0, 17.6, o); ctx.fillText(String(i + 1), o[0], o[1]); }
    for (let j = 0; j < ROWS; j += 4) { proj(cm, -25.6, 0, j - (ROWS - 1) / 2, o); ctx.fillText(ROWLBL[j], o[0], o[1]); }
  }

  // ---- protein render ----
  const NS = 6;
  function drawProtein(ctx, t) {
    const PX = 1320, PY = 452;
    const vis = env(t, 7.8, 12.3, 0.3, 0.2);
    // halo to lift it off the plate
    const hg = ctx.createRadialGradient(PX, PY, 40, PX, PY, 560);
    hg.addColorStop(0, 'rgba(7,8,11,0.86)'); hg.addColorStop(0.6, 'rgba(7,8,11,0.55)'); hg.addColorStop(1, 'rgba(7,8,11,0)');
    ctx.fillStyle = hg; ctx.fillRect(PX - 600, PY - 600, 1200, 1200);

    const pos = [], wv = [], wid = [], fp = [];
    for (let n = 0; n < NRES; n++) {
      const p = E.inOutCubic(prog(t, 8.3 + 0.0045 * n, 9.95 + 0.0045 * n));
      fp.push(p);
      const sw = Math.sin(PI * p);
      pos.push([lerp(UNF[n][0], FOLD[n][0], p) + sw * SWIRL[n][0], lerp(UNF[n][1], FOLD[n][1], p) + sw * SWIRL[n][1], lerp(UNF[n][2], FOLD[n][2], p) + sw * SWIRL[n][2]]);
      wv.push(norm([lerp(0, WF[n][0], p), lerp(1, WF[n][1], p), lerp(0, WF[n][2], p)]));
      wid.push(KIND[n] ? lerp(0.9, 2.15, p) : lerp(0.9, 0.55, p));
    }
    const rotY = -0.35 + 0.28 * (t - 8) + 1.25 * E.inOutCubic(prog(t, 8.3, 10.6));
    const rotX = 0.32 + 0.08 * Math.sin((t - 8) * 0.8);
    const cy = Math.cos(rotY), sy = Math.sin(rotY), cx = Math.cos(rotX), sx = Math.sin(rotX);
    const rot = (v) => { const x1 = cy * v[0] + sy * v[2], z1 = -sy * v[0] + cy * v[2]; return [x1, cx * v[1] - sx * z1, sx * v[1] + cx * z1]; };
    const scale = lerp(12.5, 18.5, E.inOutCubic(prog(t, 8.3, 10.1)));
    const D = 70;
    const pj = (v) => { const k = D / (D + v[2]); return [PX + v[0] * scale * k, PY - v[1] * scale * k, v[2]]; };
    // Catmull-Rom samples
    const S = [], SW = [], SWD = [], SC = [];
    for (let n = 0; n < NRES - 1; n++) {
      const p0 = pos[Math.max(0, n - 1)], p1 = pos[n], p2 = pos[n + 1], p3 = pos[Math.min(NRES - 1, n + 2)];
      for (let s = 0; s < NS; s++) {
        const u = s / NS, u2 = u * u, u3 = u2 * u;
        const pt = [0, 1, 2].map((i) => 0.5 * ((2 * p1[i]) + (-p0[i] + p2[i]) * u + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * u2 + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * u3));
        S.push(pt);
        SW.push(norm([lerp(wv[n][0], wv[n + 1][0], u), lerp(wv[n][1], wv[n + 1][1], u), lerp(wv[n][2], wv[n + 1][2], u)]));
        SWD.push(lerp(wid[n], wid[n + 1], u));
        SC.push((n + u) / (NRES - 1));
      }
    }
    S.push(pos[NRES - 1]); SW.push(wv[NRES - 1]); SWD.push(wid[NRES - 1]); SC.push(1);
    const M = S.length;
    const Lv = norm([-0.4, 0.62, -0.68]), Hv = norm([Lv[0], Lv[1], Lv[2] - 1]);
    const edgesL = [], edgesR = [], nrm = [];
    for (let k = 0; k < M; k++) {
      const a = S[Math.max(0, k - 1)], b = S[Math.min(M - 1, k + 1)];
      const T = norm([b[0] - a[0], b[1] - a[1], b[2] - a[2]]);
      let w = SW[k]; const d = dot(w, T);
      w = norm([w[0] - d * T[0], w[1] - d * T[1], w[2] - d * T[2]]);
      const hw = SWD[k] / 2;
      const pl = rot([S[k][0] - w[0] * hw, S[k][1] - w[1] * hw, S[k][2] - w[2] * hw]);
      const pr = rot([S[k][0] + w[0] * hw, S[k][1] + w[1] * hw, S[k][2] + w[2] * hw]);
      edgesL.push(pj(pl)); edgesR.push(pj(pr));
      nrm.push(norm(rot(cross(T, w))));
    }
    const quads = [];
    for (let k = 0; k < M - 1; k++) quads.push([(edgesL[k][2] + edgesR[k][2] + edgesL[k + 1][2] + edgesR[k + 1][2]) / 4, k]);
    quads.sort((a, b) => b[0] - a[0]);
    ctx.save();
    ctx.globalAlpha = vis;
    ctx.lineJoin = 'round';
    for (const [z, k] of quads) {
      const n = nrm[k];
      const lam = Math.abs(dot(n, Lv)), spec = Math.pow(Math.abs(dot(n, Hv)), 22);
      const fog = lerp(1.0, 0.5, cl01((z + 12) / 26));
      const base = chainCol(SC[k]);
      const sh = (0.26 + 0.74 * lam) * fog;
      const c = [base[0] * sh + 255 * spec * 0.55, base[1] * sh + 255 * spec * 0.55, base[2] * sh + 255 * spec * 0.55];
      const col = rgba(c, 1);
      ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(edgesL[k][0], edgesL[k][1]); ctx.lineTo(edgesR[k][0], edgesR[k][1]);
      ctx.lineTo(edgesR[k + 1][0], edgesR[k + 1][1]); ctx.lineTo(edgesL[k + 1][0], edgesL[k + 1][1]);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
    return { pos, fp, rot, pj };
  }

  let lastProt = null;
  function world(ctx, t) {
    ctx.save();
    drawPlate(ctx, t);
    // bottom-left scrim for type
    const g = ctx.createRadialGradient(200, 900, 0, 200, 900, 1100);
    g.addColorStop(0, 'rgba(7,8,11,0.93)'); g.addColorStop(0.5, 'rgba(7,8,11,0.7)'); g.addColorStop(1, 'rgba(7,8,11,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const g2 = ctx.createLinearGradient(0, 0, 0, 260);
    g2.addColorStop(0, 'rgba(7,8,11,0.9)'); g2.addColorStop(1, 'rgba(7,8,11,0)');
    ctx.fillStyle = g2; ctx.fillRect(0, 0, W, 260);
    lastProt = drawProtein(ctx, t);
    ctx.restore();
  }

  function type(ctx, t) {
    // sequence letters ride the unfolded chain
    const pr = lastProt;
    if (pr && t < 9.6) {
      ctx.save();
      font(ctx, fMono(11, 500), 0);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let n = 0; n < NRES; n++) {
        const a = (1 - cl01(pr.fp[n] * 4)) * prog(t, 7.9, 8.3) * 0.7;
        if (a <= 0.01) continue;
        const v = pr.pj(pr.rot(pr.pos[n]));
        ctx.fillStyle = rgba(C.paper, a);
        ctx.fillText(SEQ[n], v[0], v[1] - 24);
      }
      ctx.restore();
    }
    // counters
    const a = env(t, 8.15, 11.7, 0.2, 0.3);
    if (a > 0) {
      ctx.save();
      ctx.globalAlpha = a;
      font(ctx, fMono(12, 500), 2.2);
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = rgba(C.violet, 1);
      ctx.fillText(scramble('TRIALS', t, 8.15, 0.3, 201), 120, 162);
      ctx.fillText(scramble('HITS', t, 8.25, 0.3, 202), 470, 162);
      font(ctx, fMono(28, 500), 1);
      ctx.fillStyle = C.paper;
      const trials = 1048576 * E.inOutQuad(prog(t, 8.05, 11.55));
      let hits = 0; while (hits < HITS.length && HITS[hits] <= t) hits++;
      ctx.fillText(fmtInt(trials), 120, 204);
      ctx.fillText(String(hits).padStart(3, '0'), 470, 204);
      ctx.restore();
    }
    drawEyebrow(ctx, 120, 668, '02 / DISCOVERY', C.violet, t, 8.22, 11.9, 102);
    drawLine(ctx, L1, 120, 792, t, 8.3, 11.52);
    drawLine(ctx, L2, 120, 918, t, 8.46, 11.58);
  }

  return { id: 'discovery', t0: 7.8, t1: 12.26, init, world, type, HITS, WAVES, WDUR };
})();
