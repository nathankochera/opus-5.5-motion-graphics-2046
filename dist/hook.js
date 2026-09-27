/* 2046 Reels hook */
(function(){
'use strict';
/* ============================================================
   2046: A DESIGN BRIEF — core
   Everything is a pure function of time t (seconds, 0..30).
   ============================================================ */
const W = 1920, H = 1080, DUR = 30;
const PI = Math.PI, TAU = PI * 2;

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const cl01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const lerp = (a, b, t) => a + (b - a) * t;
const prog = (t, a, b) => cl01((t - a) / (b - a));
// envelope: fades in over fi after a, fades out over fo before b
const env = (t, a, b, fi, fo) => Math.min(prog(t, a, a + fi), 1 - prog(t, b - fo, b));

const E = {
  lin: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outQuart: (t) => 1 - Math.pow(1 - t, 4),
  inOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),
  outQuint: (t) => 1 - Math.pow(1 - t, 5),
  inOutQuint: (t) => (t < 0.5 ? 16 * Math.pow(t, 5) : 1 - Math.pow(-2 * t + 2, 5) / 2),
  inExpo: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOutExpo: (t) =>
    t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
  outBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  inBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return c3 * t * t * t - c1 * t * t; },
  inOutSine: (t) => -(Math.cos(PI * t) - 1) / 2,
  outSine: (t) => Math.sin((t * PI) / 2),
};

/* ---------- deterministic randomness ---------- */
function RNG(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash1(n) {
  let x = (n | 0) ^ 0x27d4eb2d;
  x = Math.imul(x ^ (x >>> 15), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}
function hash2(a, b) { return hash1(Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)); }
function vnoise(x, s) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  const a = hash2(i, s || 0), b = hash2(i + 1, s || 0);
  return a + (b - a) * u;
}

/* ---------- color ---------- */
const C = {
  ink: '#07080B', ink2: '#0C0E13', paper: '#EDE8DF', white: '#FFFFFF',
  mint: '#41E6A4', violet: '#A68BFF', orange: '#FF7A2F', gold: '#FFD24A', blue: '#4EA8FF',
  pink: '#FF7EC8', cyan: '#6EE7F2',
};
const _rgb = {};
function rgb(h) {
  let r = _rgb[h];
  if (!r) { const n = parseInt(h.slice(1), 16); r = _rgb[h] = [n >> 16, (n >> 8) & 255, n & 255]; }
  return r;
}
function rgba(h, a) {
  const r = typeof h === 'string' ? rgb(h) : h;
  a = a < 0 ? 0 : a > 1 ? 1 : a;
  return 'rgba(' + (r[0] | 0) + ',' + (r[1] | 0) + ',' + (r[2] | 0) + ',' + a.toFixed(4) + ')';
}
function mix(a, b, t) {
  a = typeof a === 'string' ? rgb(a) : a; b = typeof b === 'string' ? rgb(b) : b;
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
function scaleRGB(c, k) { return [c[0] * k, c[1] * k, c[2] * k]; }
const SPECTRUM = [C.mint, C.blue, C.violet, C.orange, C.gold];
function spectrumAt(x) {
  const n = SPECTRUM.length - 1, f = cl01(x) * n, i = Math.min(n - 1, Math.floor(f));
  return mix(SPECTRUM[i], SPECTRUM[i + 1], f - i);
}
function spectrumGrad(ctx, x0, x1) {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  SPECTRUM.forEach((c, i) => g.addColorStop(i / (SPECTRUM.length - 1), c));
  return g;
}

const CHAPTERS = [
  { n: '01', name: 'CITIES', col: C.mint, t0: 4, t1: 8 },
  { n: '02', name: 'DISCOVERY', col: C.violet, t0: 8, t1: 12 },
  { n: '03', name: 'ROBOTICS', col: C.orange, t0: 12, t1: 16 },
  { n: '04', name: 'ENERGY', col: C.gold, t0: 16, t1: 20 },
  { n: '05', name: 'ACCESS', col: C.blue, t0: 20, t1: 24 },
];

/* ---------- type ---------- */
const FF = {
  disp: '"Schibsted Grotesk","Helvetica Neue",Arial,sans-serif',
  ser: '"Bodoni Moda",Didot,"Bodoni 72",Georgia,serif',
  mono: '"Martian Mono",ui-monospace,Menlo,monospace',
};
const fDisp = (px, w) => (w || 800) + ' ' + px + 'px ' + FF.disp;
const fSer = (px) => 'italic 500 ' + px + 'px ' + FF.ser;
const fMono = (px, w) => (w || 400) + ' ' + px + 'px ' + FF.mono;
function font(ctx, f, ls) { ctx.font = f; ctx.letterSpacing = (ls || 0) + 'px'; }
function fontOf(run) {
  return run.f === 'ser' ? fSer(run.px) : run.f === 'mono' ? fMono(run.px, run.w) : fDisp(run.px, run.w);
}

const GLY = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#/+<>=';
// decode-style reveal for mono labels (length-stable)
function scramble(str, t, t0, dur, seed) {
  if (t < t0) return '';
  const n = str.length, fr = Math.floor(t * 30);
  let out = '';
  for (let i = 0; i < n; i++) {
    const ch = str[i];
    const ti = t0 + dur * ((i + 1) / n);
    const ta = t0 + dur * (i / n) * 0.55;
    if (t >= ti || ch === ' ') out += ch;
    else if (t >= ta) out += GLY[Math.floor(hash2(seed * 131 + i, fr) * GLY.length)];
    else out += ' ';
  }
  return out;
}

/* Rich line: runs of {s, f:'disp'|'ser'|'mono', px, col, ls(em), grad} measured once. */
function mkLine(ctx, runs) {
  const words = [];
  let x = 0, maxPx = 0;
  for (const r of runs) {
    maxPx = Math.max(maxPx, r.px);
    const fnt = fontOf(r), ls = (r.ls || 0) * r.px;
    font(ctx, fnt, ls);
    const rx0 = x, first = words.length;
    for (const p of r.s.split(/( )/)) {
      if (p === '') continue;
      const w = ctx.measureText(p).width;
      if (p !== ' ') {
        const offs = [];
        for (let i = 0; i <= p.length; i++) offs.push(ctx.measureText(p.slice(0, i)).width);
        words.push({ s: p, x, w, fnt, ls, col: r.col, px: r.px, f: r.f, grad: r.grad, offs, rx0 });
      }
      x += w;
    }
    for (let i = first; i < words.length; i++) words[i].rx1 = x;
  }
  return { words, width: x, maxPx };
}

/* Masked kinetic reveal: words rise from a baseline mask; italic words write on per character. */
function drawLine(ctx, L, x, y, t, tIn, tOut, o) {
  o = o || {};
  const stag = o.stag != null ? o.stag : 0.075, dur = o.dur != null ? o.dur : 0.95;
  const outStag = o.outStag != null ? o.outStag : 0.03, outDur = o.outDur != null ? o.outDur : 0.42;
  const alpha = o.alpha != null ? o.alpha : 1;
  const ox = o.align === 'center' ? x - L.width / 2 : x;
  const top = y - L.maxPx * 1.05, bot = y + L.maxPx * 0.36, lh = bot - top;
  ctx.save();
  ctx.beginPath(); ctx.rect(ox - 60, top, L.width + 140, bot - top); ctx.clip();
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  for (let i = 0; i < L.words.length; i++) {
    const wd = L.words[i];
    const s0 = tIn + i * stag;
    if (t < s0) continue;
    const po = tOut != null ? E.inExpo(prog(t, tOut + i * outStag, tOut + i * outStag + outDur)) : 0;
    if (po >= 1) continue;
    font(ctx, wd.fnt, wd.ls);
    ctx.fillStyle = wd.grad ? wd.grad(ctx, ox + wd.rx0, ox + wd.rx1) : wd.col;
    if (wd.f === 'ser' && o.chars !== false) {
      for (let c = 0; c < wd.s.length; c++) {
        const pc = E.outExpo(prog(t, s0 + c * 0.024, s0 + c * 0.024 + dur));
        if (pc <= 0) continue;
        ctx.globalAlpha = alpha * Math.min(1, pc * 1.6);
        ctx.fillText(wd.s[c], ox + wd.x + wd.offs[c], y + (1 - pc) * lh * 0.92 - po * lh);
      }
    } else {
      const p = E.outExpo(prog(t, s0, s0 + dur));
      ctx.globalAlpha = alpha;
      ctx.fillText(wd.s, ox + wd.x, y + (1 - p) * lh * 0.92 - po * lh);
    }
  }
  ctx.restore();
}

/* Chapter eyebrow: short rule + mono label */
function drawEyebrow(ctx, x, y, label, col, t, t0, t1, seed) {
  const a = env(t, t0, t1, 0.2, 0.3);
  if (a <= 0) return;
  ctx.save();
  const p = E.outExpo(prog(t, t0, t0 + 0.6));
  ctx.globalAlpha = a;
  ctx.fillStyle = col;
  ctx.fillRect(x, y - 5, 34 * p, 2);
  font(ctx, fMono(13, 500), 2.4);
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  ctx.fillText(scramble(label, t, t0 + 0.1, 0.45, seed), x + 48, y - 3);
  ctx.restore();
}

/* Callout with leader line, drawn in screen space */
function drawCallout(ctx, x, y, dx, dy, len, label, col, t, t0, t1, seed) {
  const a = env(t, t0, t1, 0.15, 0.3);
  if (a <= 0) return;
  const p1 = E.outCubic(prog(t, t0, t0 + 0.28)), p2 = E.outCubic(prog(t, t0 + 0.2, t0 + 0.5));
  ctx.save();
  ctx.globalAlpha = a;
  ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.arc(x, y, 3.2, 0, TAU); ctx.fill();
  const ring = prog(t, t0, t0 + 0.7);
  if (ring < 1) {
    ctx.globalAlpha = a * (1 - ring);
    ctx.beginPath(); ctx.arc(x, y, 3 + 16 * E.outCubic(ring), 0, TAU); ctx.stroke();
    ctx.globalAlpha = a;
  }
  const ex = x + dx * p1, ey = y + dy * p1;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey);
  if (p1 >= 1) ctx.lineTo(ex + len * p2, ey);
  ctx.stroke();
  font(ctx, fMono(12, 500), 2);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = len >= 0 ? 'left' : 'right';
  ctx.fillText(scramble(label, t, t0 + 0.22, 0.45, seed), x + dx + (len >= 0 ? 2 : -2), y + dy - 10);
  ctx.restore();
}

/* ---------- 3D camera ---------- */
function lookAt(pos, target, f, cx, cy) {
  let fx = target[0] - pos[0], fy = target[1] - pos[1], fz = target[2] - pos[2];
  const fl = Math.hypot(fx, fy, fz) || 1; fx /= fl; fy /= fl; fz /= fl;
  let rx = -fz, rz = fx; const rl = Math.hypot(rx, rz);
  if (rl < 1e-6) { rx = 1; rz = 0; } else { rx /= rl; rz /= rl; }
  const ry = 0;
  const ux = ry * fz - rz * fy, uy = rz * fx - rx * fz, uz = rx * fy - ry * fx;
  return { pos, f, cx, cy, r: [rx, ry, rz], u: [ux, uy, uz], w: [fx, fy, fz], zx: 0, zy: 0, zs: 1 };
}
function proj(cam, x, y, z, o) {
  const dx = x - cam.pos[0], dy = y - cam.pos[1], dz = z - cam.pos[2];
  const zc = dx * cam.w[0] + dy * cam.w[1] + dz * cam.w[2];
  const xc = dx * cam.r[0] + dy * cam.r[1] + dz * cam.r[2];
  const yc = dx * cam.u[0] + dy * cam.u[1] + dz * cam.u[2];
  const s = cam.f / (zc > 0.05 ? zc : 0.05);
  let sx = cam.cx + xc * s, sy = cam.cy - yc * s;
  if (cam.zs !== 1) { sx = cam.zx + (sx - cam.zx) * cam.zs; sy = cam.zy + (sy - cam.zy) * cam.zs; }
  o[0] = sx; o[1] = sy; o[2] = zc;
  return o;
}

function fmtInt(n) { return Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

const CODE = ["   04 \u2014 ENERGY: sunrise over a solar field; the field curls", "   into a planet wrapped in a lattice of light.", "const ENERGY = (() => {", "  const R = 10, NU = 56, NV = 28;", "  const U0 = -PI * R, V0 = -PI * R / 2, DU = (2 * PI * R) / NU, DV = (PI * R", "  const T_CURL0 = 17.15, T_CURL1 = 18.7, T_ROLL0 = 18.0, T_ROLL1 = 19.35, T_", "  const T_ZOOM0 = 19.52, T_ZOOM1 = 20.1;", "  const AZ = 0.38;", "  const nodes = [], arcs = [];", "  let zoomNode = null, H1, H2;", "  const GOLD = rgb(C.gold);", "", "  function state(t) {", "    const kap = E.inOutCubic(prog(t, T_CURL0, T_CURL1)) / R;", "    const beta = -PI / 2 * E.inOutCubic(prog(t, T_ROLL0, T_ROLL1));", "    const psi = 0.16 * Math.max(0, t - T_CURL1);", "    const s = E.inOutCubic(prog(t, T_CAM0, T_CAM1));", "    const drift = prog(t, 15.8, 17.1) * 0.8;", "    const p0 = [0, 1.25, -13 + drift], p1 = [16.5, -10, -41];", "    const q0 = [0, 0.35, 20], q1 = [16.5, -10, 0];", "    const pos = [lerp(p0[0], p1[0], s), lerp(p0[1], p1[1], s) + 6.5 * Math.s", "    const tgt = [lerp(q0[0], q1[0], s), lerp(q0[1], q1[1], E.inQuad(s)), ler", "    const cam = lookAt(pos, tgt, 1100, W / 2, H / 2);", "    const e = lerp(-0.15, 0.2, E.outCubic(prog(t, 15.95, 17.05))) - 0.072 * ", "    const S = [-Math.sin(AZ) * Math.cos(e), Math.sin(e), Math.cos(AZ) * Math", "    return { kap, beta, psi, s, cam, S, e };", "  }", "  function surf(u, v, st, o, n) {", "    const kap = st.kap;", "    let x, y, z, nx, ny, nz;", "    if (kap < 1e-6) { x = u; y = 0; z = v; nx = 0; ny = 1; nz = 0; }", "    else {", "      const th = u * kap + st.psi, ph = v * kap, cp = Math.cos(ph), sth = Ma", "      nx = sth * cp; ny = cth * cp; nz = sph;", "      x = nx / kap; y = (ny - 1) / kap; z = nz / kap;", "    }", "    if (st.beta !== 0) {", "      const cb = Math.cos(st.beta), sb = Math.sin(st.beta);", "      const yy = y + R, y2 = yy * cb - z * sb, z2 = yy * sb + z * cb; y = y2", "      const ny2 = ny * cb - nz * sb, nz2 = ny * sb + nz * cb; ny = ny2; nz =", "    }", "    o[0] = x; o[1] = y; o[2] = z;", "    if (n) { n[0] = nx; n[1] = ny; n[2] = nz; }", "    return o;", "  }", "", "  function init(ctx) {", "    const r = RNG(2046);", "    for (let k = 0; k < 110; k++) {", "      const i = Math.floor(r() * NU), j = 3 + Math.floor(r() * (NV - 6));", "      nodes.push({ i, j, u: U0 + i * DU, v: V0 + j * DV, ph: r(), sz: 0.6 + ", "    }", "    let guard = 0;", "    while (arcs.length < 18 && guard++ < 2000) {", "      const a = nodes[Math.floor(r() * nodes.length)], b = nodes[Math.floor(", "      let du = b.u - a.u; if (du > PI * R) du -= 2 * PI * R; if (du < -PI * ", "      const d = Math.hypot(du, b.v - a.v) / R;", "      if (d < 0.45 || d > 1.5) continue;", "      arcs.push({ a, du, dv: b.v - a.v, t0: 18.75 + r() * 0.7, dur: 0.45 + r", "    }", "    // which node do we dive into? the one closest to the globe's centre at ", "    const st = state(T_ZOOM0), o = [0, 0, 0], n = [0, 0, 0], c = proj(st.cam", "    let best = 1e9;", "    for (const nd of nodes) {", "      surf(nd.u, nd.v, st, o, n);", "      const vx = st.cam.pos[0] - o[0], vy = st.cam.pos[1] - o[1], vz = st.ca", "      if (n[0] * vx + n[1] * vy + n[2] * vz <= 0) continue;", "      const p = proj(st.cam, o[0], o[1], o[2], [0, 0, 0]);", "      const d = Math.hypot(p[0] - c[0] - 40, p[1] - c[1] - 30);", "      if (d < best) { best = d; zoomNode = nd; }", "    }", "    H1 = mkLine(ctx, [{ s: 'Clean power,', f: 'disp', px: 104, col: C.paper,", "    H2 = mkLine(ctx, [{ s: 'abundant and cheap.', f: 'ser', px: 108, col: C.", "  }", "", "  // node screen position without zoom (used as the dive-in centre and for t", "  function zoomXY(t) {", "    const st = state(t), o = [0, 0, 0];", "    surf(zoomNode.u, zoomNode.v, st, o);", "    return proj(st.cam, o[0], o[1], o[2], [0, 0, 0]);", "  }", "  function applyZoom(st, t) {", "    const z = E.inExpo(prog(t, T_ZOOM0, T_ZOOM1));", "    if (z > 0) { const p = zoomXY(t); st.cam.zx = p[0]; st.cam.zy = p[1]; st", "    return z;", "  }", "", "  const V = (NU + 1) * (NV + 1);", "  const PX = new Float32Array(V), PY = new Float32Array(V), PZ = new Float32", "  function world(ctx, t) {", "    const st = state(t), cam = st.cam;", "    const zf = applyZoom(st, t);", "    const zs = cam.zs;", "    const o = [0, 0, 0], n = [0, 0, 0], p = [0, 0, 0];", "    ctx.save();", "    // --- sky ---", "    const sun = proj(cam, cam.pos[0] + st.S[0] * 1e4, cam.pos[1] + st.S[1] *", "    const hor = proj(cam, cam.pos[0], 0, cam.pos[2] + 1e4, [0, 0, 0]);", "    const phase1 = 1 - cl01(st.s * 6);", "    const sunUp = sun[2] > 0;", "    if (sunUp) {", "      const gl = ctx.createRadialGradient(sun[0], sun[1], 0, sun[0], sun[1],", "      gl.addColorStop(0, rgba(C.gold, 0.28)); gl.addColorStop(0.35, rgba(C.o", "      ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);", "    }", "    // horizon band", "    if (phase1 > 0) {", "      const hb = ctx.createLinearGradient(0, hor[1] - 160, 0, hor[1] + 10);", "      hb.addColorStop(0, rgba(C.orange, 0)); hb.addColorStop(1, rgba(C.orang", "      ctx.fillStyle = hb; ctx.fillRect(0, hor[1] - 160, W, 170);", "    }", "    // --- sun ---", "    if (sunUp) {", "      ctx.save();", "      if (phase1 > 0) { ctx.beginPath(); ctx.rect(0, 0, W, hor[1] + (1 - pha", "      const sr = 185 * zs;", "      ctx.lineWidth = 1;", "      for (const [rr, a] of [[1.28, 0.16], [1.6, 0.09], [2.05, 0.05]]) {", "        ctx.strokeStyle = rgba(C.gold, a); ctx.beginPath(); ctx.arc(sun[0], ", "      }", "      const halo = ctx.createRadialGradient(sun[0], sun[1], sr * 0.9, sun[0]", "      halo.addColorStop(0, rgba('#FFE7A0', 0.45)); halo.addColorStop(1, rgba", "      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(sun[0], sun[1], sr * 1.", "      const sg = ctx.createRadialGradient(sun[0], sun[1], 0, sun[0], sun[1],", "      sg.addColorStop(0, '#FFFDF3'); sg.addColorStop(0.5, '#FFF1C2'); sg.add", "      ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sun[0], sun[1], sr, 0, TA", "      ctx.restore();", "      // anamorphic streak", "      const sl = ctx.createLinearGradient(sun[0] - 820, 0, sun[0] + 820, 0);", "      sl.addColorStop(0, rgba(C.gold, 0)); sl.addColorStop(0.5, rgba('#FFF4D", "      ctx.fillStyle = sl; ctx.fillRect(sun[0] - 820, sun[1] - 1.5, 1640, 3);", "      ctx.globalAlpha = 0.3; ctx.fillRect(sun[0] - 820, sun[1] - 7, 1640, 14", "    }", "    // ground beyond the field (phase 1 only)", "    if (phase1 > 0) {", "      ctx.fillStyle = rgba([9, 10, 14], phase1);", "      ctx.fillRect(0, hor[1], W, H - hor[1] + 2);", "      ctx.strokeStyle = rgba(C.gold, 0.35 * phase1); ctx.lineWidth = 1;", "      ctx.beginPath(); ctx.moveTo(0, hor[1] + 0.5); ctx.lineTo(W, hor[1] + 0", "    }", "    // --- surface vertices ---", "    for (let j = 0; j <= NV; j++) for (let i = 0; i <= NU; i++) {", "      surf(U0 + i * DU, V0 + j * DV, st, o);", "      proj(cam, o[0], o[1], o[2], p);", "      const k = j * (NU + 1) + i; PX[k] = p[0]; PY[k] = p[1]; PZ[k] = p[2];", "    }", "    const closure = cl01((st.kap * R - 0.9) / 0.1);", "    // globe occluder + rim light", "    const gc = proj(cam, 0, -R, 0, [0, 0, 0]);", "    const dC = Math.hypot(cam.pos[0], cam.pos[1] + R, cam.pos[2]);", "    const gr = cam.f * R / Math.sqrt(Math.max(1, dC * dC - R * R)) * zs;", "    if (closure > 0) {", "      ctx.fillStyle = rgba([6, 7, 10], closure);", "      ctx.beginPath(); ctx.arc(gc[0], gc[1], gr * 1.003, 0, TAU); ctx.fill()", "    }", "    // --- panels ---", "    const lattice = E.inOutCubic(prog(t, 18.55, 19.25));", "    const panels = [];", "    const wave = -34 + ((t - 15.8) * 26) % 80;", "    for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) {", "      const k0 = j * (NU + 1) + i, k1 = k0 + 1, k2 = k0 + NU + 2, k3 = k0 + ", "      if (PZ[k0] < 0.1 && PZ[k1] < 0.1 && PZ[k2] < 0.1 && PZ[k3] < 0.1) cont", "      const minx = Math.min(PX[k0], PX[k1], PX[k2], PX[k3]), maxx = Math.max", "      const miny = Math.min(PY[k0], PY[k1], PY[k2], PY[k3]), maxy = Math.max", "      if (maxx < -20 || minx > W + 20 || maxy < -20 || miny > H + 20) contin", "      if (PZ[k0] < 0.1 || PZ[k1] < 0.1 || PZ[k2] < 0.1 || PZ[k3] < 0.1) cont", "      const uc = U0 + (i + 0.5) * DU, vc = V0 + (j + 0.5) * DV;", "      surf(uc, vc, st, o, n);", "      let vx = cam.pos[0] - o[0], vy = cam.pos[1] - o[1], vz = cam.pos[2] - ", "      const vl = Math.hypot(vx, vy, vz); vx /= vl; vy /= vl; vz /= vl;", "      const facing = n[0] * vx + n[1] * vy + n[2] * vz;", "      if (facing < 0 && closure > 0.2) continue;", "      panels.push([(PZ[k0] + PZ[k2]) / 2, k0, k1, k2, k3, n[0], n[1], n[2], ", "    }", "    panels.sort((a, b) => b[0] - a[0]);", "    const S = st.S;", "    const edgeA = lerp(0.2, 0.75, lattice);", "    const cells = new Path2D();", "    const aisle = lerp(0.2, 0.06, cl01(st.kap * R * 1.4));", "    const bl = (k0, k1, k2, k3, a, b, o) => {", "      o[0] = (1 - a) * (1 - b) * PX[k0] + a * (1 - b) * PX[k1] + a * b * PX[", "      o[1] = (1 - a) * (1 - b) * PY[k0] + a * (1 - b) * PY[k1] + a * b * PY[", "      return o;", "    };", "    const c0 = [0, 0], c1 = [0, 0], c2 = [0, 0], c3 = [0, 0];", "    for (const q of panels) {", "      const [, k0, k1, k2, k3, nx, ny, nz, vx, vy, vz, facing, uc] = q;", "      const dn = vx * nx + vy * ny + vz * nz;", "      const rx = -vx + 2 * dn * nx, ry = -vy + 2 * dn * ny, rz = -vz + 2 * d", "      const rs = Math.max(0, rx * S[0] + ry * S[1] + rz * S[2]);", "      const spec = Math.pow(rs, 70), broad = Math.pow(rs, 7);", "      const diff = Math.max(0, nx * S[0] + ny * S[1] + nz * S[2]);", "      let wv = uc - wave; wv = Math.exp(-(wv * wv) / 5);", "      const back = facing < 0 ? 0.35 : 1;", "      const li = (spec * 1.5 + broad * 0.28 + diff * 0.1 + wv * 0.22) * back", "      const fillA = lerp(1, 0.2, lattice);", "      const c = [14 + GOLD[0] * li + 255 * spec * 0.5, 24 + GOLD[1] * li + 2", "      // a panel: 94% of the cell across, rows separated by aisles", "      bl(k0, k1, k2, k3, 0.03, aisle, c0); bl(k0, k1, k2, k3, 0.97, aisle, c", "      bl(k0, k1, k2, k3, 0.97, 1 - aisle, c2); bl(k0, k1, k2, k3, 0.03, 1 - ", "      ctx.beginPath();", "      ctx.moveTo(c0[0], c0[1]); ctx.lineTo(c1[0], c1[1]); ctx.lineTo(c2[0], ", "      ctx.closePath();", "      // photovoltaic cell lines when the panel is big enough to read", "      if (Math.abs(c1[0] - c0[0]) + Math.abs(c1[1] - c0[1]) > 26 && lattice ", "        for (const a of [0.26, 0.5, 0.74]) { const u0 = bl(k0, k1, k2, k3, a", "        const m0 = bl(k0, k1, k2, k3, 0.03, 0.5, [0, 0]), m1 = bl(k0, k1, k2", "      }", "      ctx.fillStyle = rgba(c, fillA); ctx.fill();", "      ctx.strokeStyle = rgba(C.gold, edgeA * back * (0.6 + 0.4 * wv)); ctx.l", "    }", "    ctx.strokeStyle = rgba([150, 175, 230], 0.13 * (1 - lattice)); ctx.lineW", "    // rim light on the globe (sun behind)", "    if (closure > 0 && sunUp) {", "      const ang = Math.atan2(sun[1] - gc[1], sun[0] - gc[0]);", "      const rg = ctx.createLinearGradient(gc[0] - Math.cos(ang) * gr, gc[1] ", "      rg.addColorStop(0, rgba(C.gold, 0)); rg.addColorStop(0.62, rgba(C.gold", "      ctx.strokeStyle = rg; ctx.lineWidth = 3.5;", "      ctx.beginPath(); ctx.arc(gc[0], gc[1], gr, 0, TAU); ctx.stroke();", "    }", "    // --- nodes ---", "    const na = cl01(prog(t, 18.4, 18.9));", "    if (na > 0) {", "      for (const nd of nodes) {", "        surf(nd.u, nd.v, st, o, n);", "        const vx = cam.pos[0] - o[0], vy = cam.pos[1] - o[1], vz = cam.pos[2", "        if (n[0] * vx + n[1] * vy + n[2] * vz <= 0) continue;", "        proj(cam, o[0], o[1], o[2], p);", "        const pulse = 0.55 + 0.45 * Math.sin(TAU * (t * 1.2 + nd.ph));", "        const rr = (1.6 + nd.sz * 1.4) * Math.sqrt(zs) * (nd === zoomNode ? ", "        ctx.fillStyle = rgba('#FFF4CF', na * (0.6 + 0.4 * pulse));", "        ctx.beginPath(); ctx.arc(p[0], p[1], rr, 0, TAU); ctx.fill();", "      }", "    }", "    // --- arcs ---", "    for (const a of arcs) {", "      const pa = prog(t, a.t0, a.t0 + a.dur);", "      if (pa <= 0) continue;", "      const SEG = 26, nDraw = Math.max(1, Math.round(SEG * E.outCubic(pa)));", "      const pts = [];"];
/* ============================================================
   REELS HOOK: a 4-second 1080x1920 intro in the reel's own type
   system. It ends by closing letterbox bars around a single point
   of light, which is exactly where the reel's opening spark appears.
   Uses core.js (easing, palette, kinetic type) from the reel.
   ============================================================ */
const VW = 1080, VH = 1920, HOOK_DUR = 4.0;
const BAND_Y = 656, BAND_H = 608, BAND_S = VW / 1920;             // the reel, letterboxed
const SPARK_X = VW / 2, SPARK_Y = BAND_Y + 640 * BAND_H / 1080;   // the reel's horizon in this frame
const LX = 84;
const HITS = [0.0, 0.5, 1.0, 1.5];
// the reel's HUD crop marks mapped into the band (hud() in main.js), and the hook's own
const REEL_MARK = { x0: 44 * BAND_S, y0: BAND_Y + 44 * BAND_H / 1080, x1: VW - 44 * BAND_S, y1: BAND_Y + BAND_H - 44 * BAND_H / 1080, arm: 26 * BAND_S, lw: 1.5 * BAND_S, a: 0.55 };
const HOOK_MARK = { x0: 56, y0: 292, x1: VW - 56, y1: 1252, arm: 34, lw: 2, a: 0.5 };
const FOOT = 'CLAUDE OPUS 5.5 · ONE PROMPT · MADE IN 72 MIN';

let hpx = 100, footPx = 22, LINES = [], Y = {}, vig = null;

function hookInit(ctx) {
  const NEG = ['No After Effects.', 'No video model.', 'No stock music.'];
  font(ctx, fDisp(100), -3.5);
  const wMax = Math.max(...NEG.concat(['written by Claude.']).map((s) => ctx.measureText(s).width));
  hpx = Math.min(108, Math.floor(100 * 872 / wMax));
  const run = (s) => [{ s, f: 'disp', px: hpx, col: C.paper, ls: -0.035 }];
  LINES = NEG.map((s) => mkLine(ctx, run(s)));
  LINES.push(mkLine(ctx, [{ s: 'Just code,', f: 'ser', px: Math.round(hpx * 1.1), ls: -0.01, grad: (c, x0, x1) => spectrumGrad(c, x0 + 6, x1 - 4) }]));
  LINES.push(mkLine(ctx, run('written by Claude.')));
  Y.l5 = SPARK_Y - 70; Y.l4 = Y.l5 - hpx * 1.08; Y.l3 = Y.l4 - hpx * 1.24;
  Y.l2 = Y.l3 - hpx; Y.l1 = Y.l2 - hpx; Y.eb = Y.l1 - hpx * 1.12;
  footPx = 22; font(ctx, fMono(footPx, 500), footPx * 0.14);
  while (ctx.measureText(FOOT).width > 900 && footPx > 16) { footPx--; font(ctx, fMono(footPx, 500), footPx * 0.14); }
  vig = document.createElement('canvas'); vig.width = VW; vig.height = VH;
  const v = vig.getContext('2d'), g = v.createRadialGradient(VW / 2, VH * 0.48, VH * 0.34, VW / 2, VH * 0.48, VH * 0.78);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.6)');
  v.fillStyle = g; v.fillRect(0, 0, VW, VH);
}

function hookBg(ctx, t) {
  ctx.fillStyle = C.ink; ctx.fillRect(0, 0, VW, VH);
  const ra = E.outCubic(prog(t, 1.4, 1.9)) * (1 - E.inCubic(prog(t, 3.5, 3.85)));
  if (ra > 0) {
    ctx.save(); ctx.translate(SPARK_X, SPARK_Y); ctx.scale(1, 0.34);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 760);
    g.addColorStop(0, rgba(C.paper, 0.07 * ra)); g.addColorStop(1, rgba(C.paper, 0));
    ctx.fillStyle = g; ctx.fillRect(-760, -760, 1520, 1520); ctx.restore();
  }
}

/* The reel's own source code floods out from the horizon on "Just code," */
function hookCode(ctx, t) {
  const a = E.outCubic(prog(t, 1.5, 1.8)) * (1 - E.inCubic(prog(t, 3.1, 3.42)));
  if (a <= 0 || !CODE.length) return;
  const reach = 1250 * E.outExpo(prog(t, 1.5, 2.0));
  ctx.save();
  ctx.beginPath(); ctx.rect(0, SPARK_Y - reach, VW, reach * 2); ctx.clip();
  const g = ctx.createLinearGradient(0, 120, 0, VH - 120);
  SPECTRUM.forEach((c, i) => g.addColorStop(i / (SPECTRUM.length - 1), c));
  ctx.fillStyle = g; ctx.globalAlpha = 0.14 * a;
  font(ctx, fMono(17, 400), 0); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  const lh = 28, scroll = (t - 1.5) * 260, n = CODE.length, k0 = Math.floor(scroll / lh);
  for (let k = k0; k <= k0 + Math.ceil(VH / lh) + 1; k++) {
    const s = CODE[((k % n) + n) % n];
    if (s) ctx.fillText(s, 44, k * lh - scroll + lh);
  }
  ctx.restore();
  // keep the headline calm: a soft scrim behind the type, and fades at the frame edges
  ctx.save();
  let s = ctx.createRadialGradient(440, 760, 60, 440, 760, 760);
  s.addColorStop(0, rgba(C.ink, 0.74)); s.addColorStop(1, rgba(C.ink, 0));
  ctx.fillStyle = s; ctx.fillRect(0, 0, VW, VH);
  s = ctx.createLinearGradient(0, 0, 0, 300); s.addColorStop(0, C.ink); s.addColorStop(1, rgba(C.ink, 0));
  ctx.fillStyle = s; ctx.fillRect(0, 0, VW, 300);
  s = ctx.createLinearGradient(0, VH - 420, 0, VH); s.addColorStop(0, rgba(C.ink, 0)); s.addColorStop(1, C.ink);
  ctx.fillStyle = s; ctx.fillRect(0, VH - 420, VW, 420);
  ctx.restore();
}

function hookText(ctx, t) {
  let b = 0;
  for (const h of HITS) if (t >= h) b += 0.012 * Math.exp(-(t - h) / 0.09);   // a small bump on every hit
  ctx.save();
  ctx.translate(LX, Y.l3); ctx.scale(1 + b, 1 + b); ctx.translate(-LX, -Y.l3);
  const ea = 1 - E.inCubic(prog(t, 3.06, 3.28)), ep = E.outExpo(prog(t, 0.0, 0.45));
  ctx.fillStyle = rgba(C.paper, 0.85 * ea);
  ctx.fillRect(LX, Y.eb - 1.5, 46 * ep, 3);
  font(ctx, fMono(24, 500), 4.2); ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  ctx.fillText(scramble('THE NEXT 30 SECONDS', t, 0.04, 0.44, 71), LX + 70, Y.eb);
  const dim = 1 - 0.56 * E.inOutCubic(prog(t, 1.5, 1.78));
  const o = (alpha) => ({ stag: 0.07, dur: 0.6, outStag: 0.03, outDur: 0.32, alpha });
  drawLine(ctx, LINES[0], LX, Y.l1, t, 0.0, 3.08, o(dim));
  drawLine(ctx, LINES[1], LX, Y.l2, t, 0.5, 3.11, o(dim));
  drawLine(ctx, LINES[2], LX, Y.l3, t, 1.0, 3.14, o(dim));
  drawLine(ctx, LINES[3], LX, Y.l4, t, 1.5, 3.17, { stag: 0.06, dur: 0.75, outStag: 0.03, outDur: 0.32 });
  drawLine(ctx, LINES[4], LX, Y.l5, t, 1.74, 3.2, { stag: 0.075, dur: 0.7, outStag: 0.03, outDur: 0.32 });
  ctx.restore();
  const fa = E.outCubic(prog(t, 2.2, 2.4)) * (1 - E.inCubic(prog(t, 3.06, 3.26)));
  if (fa > 0) {
    font(ctx, fMono(footPx, 500), footPx * 0.14);
    ctx.fillStyle = rgba(C.paper, 0.72 * fa); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    ctx.fillText(scramble(FOOT, t, 2.2, 0.55, 72), LX, SPARK_Y + 64);
  }
}

function drawMarks(ctx, M, arm, a) {
  if (a <= 0.001 || arm <= 0.1) return;
  ctx.strokeStyle = rgba(C.paper, a); ctx.lineWidth = M.lw; ctx.beginPath();
  ctx.moveTo(M.x0, M.y0 + arm); ctx.lineTo(M.x0, M.y0); ctx.lineTo(M.x0 + arm, M.y0);
  ctx.moveTo(M.x1 - arm, M.y0); ctx.lineTo(M.x1, M.y0); ctx.lineTo(M.x1, M.y0 + arm);
  ctx.moveTo(M.x0, M.y1 - arm); ctx.lineTo(M.x0, M.y1); ctx.lineTo(M.x0 + arm, M.y1);
  ctx.moveTo(M.x1 - arm, M.y1); ctx.lineTo(M.x1, M.y1); ctx.lineTo(M.x1, M.y1 - arm);
  ctx.stroke();
}

function drawPoint(ctx, a) {
  const g = ctx.createRadialGradient(SPARK_X, SPARK_Y, 0, SPARK_X, SPARK_Y, 34);
  g.addColorStop(0, rgba('#FFFFFF', 0.55 * a)); g.addColorStop(1, rgba('#FFFFFF', 0));
  ctx.fillStyle = g; ctx.fillRect(SPARK_X - 34, SPARK_Y - 34, 68, 68);
  ctx.fillStyle = rgba('#FFFFFF', a);
  ctx.beginPath(); ctx.arc(SPARK_X, SPARK_Y, 3.4, 0, TAU); ctx.fill();
}

function horizon(ctx, t) {
  const grow = E.inOutExpo(prog(t, 1.34, 1.62)), shrink = E.inExpo(prog(t, 3.44, 3.8));
  const half = 620 * grow * (1 - shrink), wht = E.inCubic(prog(t, 3.42, 3.76));
  if (half > 0.6) {
    const g = ctx.createLinearGradient(SPARK_X - half, 0, SPARK_X + half, 0), n = SPECTRUM.length;
    g.addColorStop(0, rgba(mix(SPECTRUM[0], '#FFFFFF', wht), 0));
    for (let i = 0; i < n; i++) g.addColorStop(0.12 + 0.76 * i / (n - 1), rgba(mix(SPECTRUM[i], '#FFFFFF', wht), 1));
    g.addColorStop(1, rgba(mix(SPECTRUM[n - 1], '#FFFFFF', wht), 0));
    const seg = (h) => { ctx.beginPath(); ctx.moveTo(SPARK_X - h, SPARK_Y); ctx.lineTo(SPARK_X + h, SPARK_Y); ctx.stroke(); };
    ctx.save();
    ctx.lineCap = 'round'; ctx.strokeStyle = g;
    ctx.globalAlpha = 0.16; ctx.lineWidth = 16; seg(half);
    ctx.globalAlpha = 1; ctx.lineWidth = 3; seg(half);
    ctx.strokeStyle = rgba('#FFFFFF', 0.6); ctx.lineWidth = 1.2; seg(half * 0.8);
    if (t > 1.7 && t < 3.44) {   // a slow shimmer rides the line
      const sx = -200 + ((t - 1.7) / 1.7) * (VW + 400);
      const sg = ctx.createLinearGradient(sx - 150, 0, sx + 150, 0);
      sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.85)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = sg; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(sx - 150, SPARK_Y); ctx.lineTo(sx + 150, SPARK_Y); ctx.stroke();
    }
    ctx.restore();
  }
  const pa = prog(t, 3.66, 3.8);
  if (pa > 0) drawPoint(ctx, pa);
}

/* Foreground: letterbox bars close in, the crop marks travel to the reel's corners,
   and the horizon collapses into the point the reel starts from. */
function hookTop(ctx, t) {
  const p = E.inOutCubic(prog(t, 3.4, 3.82));
  if (p > 0) {
    const hb = VH - BAND_Y - BAND_H;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, VW, BAND_Y * p);
    ctx.fillRect(0, VH - hb * p, VW, hb * p + 1);
  }
  const M = {};
  for (const key in HOOK_MARK) M[key] = lerp(HOOK_MARK[key], REEL_MARK[key], p);
  const k = E.outExpo(prog(t, 0.05, 0.6));
  drawMarks(ctx, M, M.arm * k, M.a * k);
  horizon(ctx, t);
}

/* Over the first frames of the reel: the point fades as the reel's own spark takes over,
   and the crop marks hold until the reel's HUD marks have drawn in. */
function hookAfter(ctx, T) {
  const rt = T - HOOK_DUR;
  const pa = 1 - E.inOutCubic(prog(rt, 0.08, 0.42));
  if (pa > 0) drawPoint(ctx, pa);
  const reelA = E.outCubic(prog(rt, 0.85, 1.45));
  if (reelA < 1) drawMarks(ctx, REEL_MARK, REEL_MARK.arm, REEL_MARK.a * (1 - reelA));
}

window.HOOK = {
  init: hookInit,
  base(ctx, t) { hookBg(ctx, t); hookCode(ctx, t); hookText(ctx, t); ctx.drawImage(vig, 0, 0); },
  top: hookTop, after: hookAfter,
  DUR: HOOK_DUR, VW, VH, BAND_Y, BAND_H,
};

})();
