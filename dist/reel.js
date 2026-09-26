/* 2046: A Design Brief - a showreel designed, animated and scored in code by Claude */
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

/* ============================================================
   01 — CITIES: isometric grid, autonomous platoons as light,
   parking lots flip over and bloom into parks.
   ============================================================ */
const CITIES = (() => {
  const N = 9, CEN = 36;
  // parking blocks (i, j) in the order they transform
  const PARK = [[6, 1], [7, 4], [4, 2], [8, 6], [2, 1], [5, 6], [6, 8]];
  const boxes = [], lots = [], cars = [], items = [];
  let cphi = 1, sphi = 0, K = 14, OX = 1150, OY = 480;
  const TOP = [38, 43, 54], SIDE_D = [12, 14, 19], SIDE_L = [30, 35, 45], GROOF = [18, 66, 48];
  let L1, L2;

  function setCam(t) {
    const p = prog(t, 3.8, 8.35);
    const phi = lerp(-0.15, 0.09, E.inOutSine(p));
    cphi = Math.cos(phi); sphi = Math.sin(phi);
    K = lerp(15.6, 13.9, E.outCubic(p));
    OX = lerp(1135, 1165, p); OY = lerp(452, 488, E.inOutSine(p));
  }
  function P(x, y, z, o) {
    const dx = x - CEN, dy = y - CEN;
    const rx = cphi * dx - sphi * dy, ry = sphi * dx + cphi * dy;
    o[0] = OX + (rx - ry) * 0.866 * K;
    o[1] = OY + (rx + ry) * 0.5 * K - z * K * 0.92;
    o[2] = rx + ry;
    return o;
  }
  const depthOf = (x, y) => { const dx = x - CEN, dy = y - CEN; return (cphi * dx - sphi * dy) + (sphi * dx + cphi * dy); };

  function mkBox(x0, y0, x1, y1, h, r) {
    const wins = [];
    const nw = Math.floor(h * 2.6 + 3);
    for (let k = 0; k < nw; k++) wins.push({ f: Math.floor(r() * 4), u: 0.15 + r() * 0.7, z: 0.5 + r() * Math.max(0.2, h - 0.9), ph: r() * 100, warm: r() < 0.7 });
    const gx = (x0 + x1) / 2;
    return { kind: 0, x0, y0, x1, y1, h, wins, green: r() < 0.2 && h < 8, tg: 5.9 + 1.1 * (gx / 72) + r() * 0.15 };
  }
  function mkLot(i, j, idx, r) {
    const x0 = 8 * i + 1, y0 = 8 * j + 1;
    const stalls = [], parked = [], trees = [];
    for (let k = 0; k <= 9; k++) {
      const x = x0 + 0.3 + k * 0.6;
      stalls.push([x, y0 + 0.25, x, y0 + 1.95], [x, y0 + 6 - 1.95, x, y0 + 6 - 0.25]);
      if (k < 9) {
        if (r() < 0.68) parked.push([x + 0.09, y0 + 0.45, x + 0.51, y0 + 1.75, r()]);
        if (r() < 0.68) parked.push([x + 0.09, y0 + 4.25, x + 0.51, y0 + 5.55, r()]);
      }
    }
    // park: path is a gentle S curve; trees avoid it
    const path = [[x0 + 0.2, y0 + 1.4], [x0 + 2.4, y0 + 2.2], [x0 + 3.6, y0 + 3.9], [x0 + 5.8, y0 + 4.7]];
    let tries = 0;
    while (trees.length < 17 && tries++ < 400) {
      const tx = x0 + 0.5 + r() * 5, ty = y0 + 0.5 + r() * 5, tr = 0.32 + r() * 0.36;
      const nearPath = Math.abs((ty - y0) - (1.4 + (tx - x0) * 0.57)) < 0.75;
      if (nearPath) continue;
      if (trees.some((q) => Math.hypot(q.x - tx, q.y - ty) < q.r + tr + 0.05)) continue;
      trees.push({ x: tx, y: ty, r: tr, sh: r(), k: trees.length });
    }
    return { kind: 1, i, j, x0, y0, x1: x0 + 6, y1: y0 + 6, ts: 4.9 + idx * 0.125, stalls, parked, trees, path, walk: [r(), r(), r()] };
  }

  function init(ctx) {
    const r = RNG(4242);
    const pk = new Map(PARK.map((p, i) => [p[0] + ',' + p[1], i]));
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const key = i + ',' + j;
      if (pk.has(key)) { lots.push(mkLot(i, j, pk.get(key), r)); continue; }
      const bx = 8 * i + 1, by = 8 * j + 1;
      const d = Math.hypot(bx + 3 - CEN, by + 3 - CEN);
      const core = Math.exp(-Math.pow(d / 19, 2));
      if (r() < 0.15) boxes.push(mkBox(bx + 0.35, by + 0.35, bx + 5.65, by + 5.65, 1.1 + core * 4 * (0.5 + r()), r));
      else for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) {
        const x0 = bx + a * 3.3, y0 = by + b * 3.3;
        let h = 0.9 + core * 10.5 * (0.25 + r()) + r() * 1.4;
        if (r() < 0.08 * core + 0.015) h += 5 + r() * 6;
        boxes.push(mkBox(x0, y0, x0 + 2.7, y0 + 2.7, h, r));
      }
    }
    // autonomous platoons: tight, evenly spaced, same speed
    for (let m = 0; m <= N; m++) for (const axis of [0, 1]) for (const lane of [-1, 1]) {
      const v = 8.5 + r() * 5;
      for (let pl = 0; pl < 3; pl++) {
        const u0 = pl * 28 + r() * 20, nC = 3 + Math.floor(r() * 3);
        for (let c = 0; c < nC; c++) cars.push({ axis, s: 8 * m + lane * 0.46, dir: lane, u0: u0 - c * 2.1, v, tl: 1.7, w: r() });
      }
    }
    for (const b of boxes) items.push(b);
    for (const l of lots) items.push(l);
    for (const c of cars) items.push(c);
    L1 = mkLine(ctx, [{ s: 'Streets,', f: 'disp', px: 132, col: C.paper, ls: -0.035 }]);
    L2 = mkLine(ctx, [{ s: 'given back.', f: 'ser', px: 138, col: C.mint, ls: -0.01 }]);
  }

  const q = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const o1 = [0, 0, 0], o2 = [0, 0, 0], o3 = [0, 0, 0];

  function drawBox(ctx, b, t) {
    const X = [b.x0, b.x1, b.x1, b.x0], Y = [b.y0, b.y0, b.y1, b.y1];
    for (let k = 0; k < 4; k++) { P(X[k], Y[k], 0, q[k]); P(X[k], Y[k], b.h, q[k + 4]); }
    const NX = [0, 1, 0, -1], NY = [-1, 0, 1, 0];
    for (let e = 0; e < 4; e++) {
      const nx = cphi * NX[e] - sphi * NY[e], ny = sphi * NX[e] + cphi * NY[e];
      if (nx + ny <= 0.001) continue;
      const a = e, bI = (e + 1) % 4;
      const lum = cl01(0.5 + 0.62 * (nx - ny));
      ctx.fillStyle = rgba(mix(SIDE_D, SIDE_L, lum), 1);
      ctx.beginPath();
      ctx.moveTo(q[a][0], q[a][1]); ctx.lineTo(q[bI][0], q[bI][1]);
      ctx.lineTo(q[bI + 4][0], q[bI + 4][1]); ctx.lineTo(q[a + 4][0], q[a + 4][1]);
      ctx.closePath(); ctx.fill();
      // floor lines
      if (b.h > 1.6) {
        ctx.beginPath();
        for (let z = 1.1; z < b.h - 0.3; z += 1.1) {
          const f = z / b.h;
          ctx.moveTo(lerp(q[a][0], q[a + 4][0], f), lerp(q[a][1], q[a + 4][1], f));
          ctx.lineTo(lerp(q[bI][0], q[bI + 4][0], f), lerp(q[bI][1], q[bI + 4][1], f));
        }
        ctx.strokeStyle = 'rgba(237,232,223,0.05)'; ctx.lineWidth = 1; ctx.stroke();
      }
      // lit windows
      ctx.beginPath();
      let any = false;
      for (const w of b.wins) {
        if (w.f !== e) continue;
        if (vnoise(t * 0.7 + w.ph, 7) < 0.3) continue;
        const f = w.z / b.h;
        const x = lerp(lerp(q[a][0], q[bI][0], w.u), lerp(q[a + 4][0], q[bI + 4][0], w.u), f);
        const y = lerp(lerp(q[a][1], q[bI][1], w.u), lerp(q[a + 4][1], q[bI + 4][1], w.u), f);
        ctx.rect(x - 1.1, y - 1.1, 2.3, 2.3); any = true;
      }
      if (any) { ctx.fillStyle = 'rgba(255,232,196,0.72)'; ctx.fill(); }
    }
    // roof
    const g = b.green ? E.outCubic(prog(t, b.tg, b.tg + 0.5)) : 0;
    ctx.fillStyle = rgba(mix(TOP, GROOF, g), 1);
    ctx.beginPath();
    ctx.moveTo(q[4][0], q[4][1]); ctx.lineTo(q[5][0], q[5][1]); ctx.lineTo(q[6][0], q[6][1]); ctx.lineTo(q[7][0], q[7][1]);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = g > 0 ? rgba(mix([237, 232, 223], rgb(C.mint), g), 0.28 + 0.3 * g) : 'rgba(237,232,223,0.3)';
    ctx.lineWidth = 1; ctx.stroke();
    // front vertical edge catches a little light
    let fe = 0, best = -Infinity;
    for (let k = 0; k < 4; k++) { const d = depthOf(X[k], Y[k]); if (d > best) { best = d; fe = k; } }
    ctx.strokeStyle = 'rgba(237,232,223,0.16)';
    ctx.beginPath(); ctx.moveTo(q[fe][0], q[fe][1]); ctx.lineTo(q[fe + 4][0], q[fe + 4][1]); ctx.stroke();
  }

  function drawLot(ctx, L, t) {
    const ts = L.ts;
    const fp = E.inOutCubic(prog(t, ts + 0.1, ts + 0.62));
    const th = fp * PI, lift = Math.sin(th) * 3.3;
    const cx = (L.x0 + L.x1) / 2, hw = 3, ca = Math.cos(th), sa = Math.sin(th);
    const xa = cx - hw * ca, za = lift - hw * sa, xb = cx + hw * ca, zb = lift + hw * sa;
    const back = th > PI / 2;
    P(xa, L.y0, Math.max(za, 0.02), q[0]); P(xb, L.y0, Math.max(zb, 0.02), q[1]);
    P(xb, L.y1, Math.max(zb, 0.02), q[2]); P(xa, L.y1, Math.max(za, 0.02), q[3]);
    const edge = Math.abs(ca);
    const base = back ? mix([8, 30, 22], [14, 46, 34], edge) : mix([12, 14, 18], [20, 23, 28], edge);
    ctx.fillStyle = rgba(base, 1);
    ctx.beginPath(); ctx.moveTo(q[0][0], q[0][1]); ctx.lineTo(q[1][0], q[1][1]); ctx.lineTo(q[2][0], q[2][1]); ctx.lineTo(q[3][0], q[3][1]); ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = back ? rgba(C.mint, 0.55) : 'rgba(237,232,223,0.22)';
    ctx.lineWidth = back ? 1.4 : 1; ctx.stroke();

    if (fp <= 0) {
      // stall lines retract, parked cars drive off
      const sl = 1 - E.inCubic(prog(t, ts - 0.22, ts + 0.06));
      if (sl > 0) {
        ctx.beginPath();
        for (const s of L.stalls) {
          const my = (s[1] + s[3]) / 2, hl = (s[3] - s[1]) / 2 * sl;
          P(s[0], my - hl, 0.03, o1); P(s[2], my + hl, 0.03, o2);
          ctx.moveTo(o1[0], o1[1]); ctx.lineTo(o2[0], o2[1]);
        }
        ctx.strokeStyle = 'rgba(237,232,223,0.3)'; ctx.lineWidth = 1; ctx.stroke();
      }
      for (const c of L.parked) {
        const k = 1 - E.inBack(prog(t, ts - 0.3 + c[4] * 0.12, ts - 0.05 + c[4] * 0.12));
        if (k <= 0.01) continue;
        const mx = (c[0] + c[2]) / 2, my = (c[1] + c[3]) / 2, hx = (c[2] - c[0]) / 2 * k, hy = (c[3] - c[1]) / 2 * k;
        drawMini(ctx, mx - hx, my - hy, mx + hx, my + hy, 0.34 * k);
      }
      return;
    }
    if (fp < 1) return;
    // park life
    const pp = E.outCubic(prog(t, ts + 0.6, ts + 1.1));
    if (pp > 0) {
      ctx.beginPath();
      const n = 18;
      for (let k = 0; k <= Math.round(n * pp); k++) {
        const u = k / n, pt = bez(L.path, u);
        P(pt[0], pt[1], 0.04, o1);
        if (k === 0) ctx.moveTo(o1[0], o1[1]); else ctx.lineTo(o1[0], o1[1]);
      }
      ctx.strokeStyle = 'rgba(237,232,223,0.42)'; ctx.lineWidth = 1.5; ctx.stroke();
      // walkers
      ctx.fillStyle = 'rgba(255,248,235,0.9)';
      for (let k = 0; k < 3; k++) {
        const u = ((L.walk[k] + t * 0.09 * (k % 2 ? -1 : 1)) % 1 + 1) % 1;
        const pt = bez(L.path, u); P(pt[0], pt[1], 0.12, o1);
        ctx.fillRect(o1[0] - 1, o1[1] - 1.5, 2, 2.4);
      }
    }
    const tr = L.trees.slice().sort((a, b) => depthOf(a.x, a.y) - depthOf(b.x, b.y));
    for (const tre of tr) {
      const s = E.outBack(prog(t, ts + 0.52 + tre.k * 0.028, ts + 0.9 + tre.k * 0.028));
      if (s <= 0) continue;
      const rr = tre.r * K * s;
      P(tre.x + 0.12, tre.y + 0.12, 0, o1);
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath(); ctx.ellipse(o1[0], o1[1], rr * 1.05, rr * 0.55, 0, 0, TAU); ctx.fill();
      P(tre.x, tre.y, tre.r * 1.25 * s, o2);
      ctx.fillStyle = rgba(mix([22, 112, 80], rgb(C.mint), 0.35 + 0.65 * tre.sh), 1);
      ctx.beginPath(); ctx.arc(o2[0], o2[1], rr, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(210,255,236,0.35)';
      ctx.beginPath(); ctx.arc(o2[0] - rr * 0.3, o2[1] - rr * 0.32, rr * 0.42, 0, TAU); ctx.fill();
    }
  }
  function bez(p, u) {
    const a = 1 - u;
    return [a * a * a * p[0][0] + 3 * a * a * u * p[1][0] + 3 * a * u * u * p[2][0] + u * u * u * p[3][0],
      a * a * a * p[0][1] + 3 * a * a * u * p[1][1] + 3 * a * u * u * p[2][1] + u * u * u * p[3][1]];
  }
  function drawMini(ctx, x0, y0, x1, y1, h) {
    const X = [x0, x1, x1, x0], Y = [y0, y0, y1, y1];
    for (let k = 0; k < 4; k++) { P(X[k], Y[k], 0.03, q[k]); P(X[k], Y[k], h, q[k + 4]); }
    ctx.fillStyle = '#1B1F26';
    ctx.beginPath();
    // hull of box: draw sides quickly as one polygon (top + two front faces)
    ctx.moveTo(q[4][0], q[4][1]); ctx.lineTo(q[5][0], q[5][1]); ctx.lineTo(q[6][0], q[6][1]); ctx.lineTo(q[7][0], q[7][1]); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#2C323B';
    ctx.beginPath(); ctx.moveTo(q[1][0], q[1][1]); ctx.lineTo(q[2][0], q[2][1]); ctx.lineTo(q[6][0], q[6][1]); ctx.lineTo(q[5][0], q[5][1]); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(q[2][0], q[2][1]); ctx.lineTo(q[3][0], q[3][1]); ctx.lineTo(q[7][0], q[7][1]); ctx.lineTo(q[6][0], q[6][1]); ctx.closePath(); ctx.fill();
  }

  function carHead(c, t) {
    const u = (((c.u0 + c.v * t) % 84) + 84) % 84 - 6;
    return c.dir > 0 ? u : 72 - u;
  }
  function drawCar(ctx, c, t) {
    const a1 = carHead(c, t);
    if (a1 < -3 || a1 > 75) return;
    const a0 = a1 - c.dir * c.tl;
    if (c.axis === 0) { P(a1, c.s, 0.22, o1); P(a0, c.s, 0.22, o2); } else { P(c.s, a1, 0.22, o1); P(c.s, a0, 0.22, o2); }
    ctx.lineCap = 'round';
    ctx.strokeStyle = c.w < 0.78 ? 'rgba(65,230,164,0.8)' : 'rgba(255,208,160,0.75)';
    ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(o2[0], o2[1]); ctx.lineTo(o1[0], o1[1]); ctx.stroke();
    ctx.strokeStyle = 'rgba(248,255,252,1)'; ctx.lineWidth = 2.8;
    ctx.beginPath(); ctx.moveTo(lerp(o2[0], o1[0], 0.6), lerp(o2[1], o1[1], 0.6)); ctx.lineTo(o1[0], o1[1]); ctx.stroke();
    ctx.lineCap = 'butt';
  }

  function itemDepth(it, t) {
    if (it.kind === 0) return depthOf((it.x0 + it.x1) / 2, (it.y0 + it.y1) / 2);
    if (it.kind === 1) return depthOf(it.x0 + 3, it.y0 + 3) - 0.2;
    const a = carHead(it, t);
    return it.axis === 0 ? depthOf(a, it.s) : depthOf(it.s, a);
  }

  function world(ctx, t) {
    setCam(t);
    // ground plate
    ctx.save();
    P(-1, -1, 0, q[0]); P(73, -1, 0, q[1]); P(73, 73, 0, q[2]); P(-1, 73, 0, q[3]);
    ctx.fillStyle = '#0A0C10';
    ctx.beginPath(); ctx.moveTo(q[0][0], q[0][1]); ctx.lineTo(q[1][0], q[1][1]); ctx.lineTo(q[2][0], q[2][1]); ctx.lineTo(q[3][0], q[3][1]); ctx.closePath(); ctx.fill();
    // curbs
    ctx.beginPath();
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const x0 = 8 * i + 1, y0 = 8 * j + 1;
      P(x0, y0, 0, q[0]); P(x0 + 6, y0, 0, q[1]); P(x0 + 6, y0 + 6, 0, q[2]); P(x0, y0 + 6, 0, q[3]);
      ctx.moveTo(q[0][0], q[0][1]); ctx.lineTo(q[1][0], q[1][1]); ctx.lineTo(q[2][0], q[2][1]); ctx.lineTo(q[3][0], q[3][1]); ctx.closePath();
    }
    ctx.strokeStyle = 'rgba(237,232,223,0.07)'; ctx.lineWidth = 1; ctx.stroke();
    // sorted scene
    const arr = items.map((it) => [itemDepth(it, t), it]);
    arr.sort((a, b) => a[0] - b[0]);
    for (const [, it] of arr) {
      if (it.kind === 0) drawBox(ctx, it, t);
      else if (it.kind === 1) drawLot(ctx, it, t);
      else drawCar(ctx, it, t);
    }
    // scrim for type
    const g = ctx.createRadialGradient(170, 930, 0, 170, 930, 1050);
    g.addColorStop(0, 'rgba(7,8,11,0.94)'); g.addColorStop(0.55, 'rgba(7,8,11,0.72)'); g.addColorStop(1, 'rgba(7,8,11,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const g2 = ctx.createLinearGradient(0, 0, 0, 220);
    g2.addColorStop(0, 'rgba(7,8,11,0.85)'); g2.addColorStop(1, 'rgba(7,8,11,0)');
    ctx.fillStyle = g2; ctx.fillRect(0, 0, W, 220);
    ctx.restore();
  }

  function type(ctx, t) {
    setCam(t);
    drawEyebrow(ctx, 120, 668, '01 / CITIES', C.mint, t, 4.2, 7.9, 101);
    drawLine(ctx, L1, 120, 792, t, 4.3, 7.52);
    drawLine(ctx, L2, 120, 918, t, 4.46, 7.58);
    // callouts
    P(40, 64, 0.2, o3);
    drawCallout(ctx, o3[0], o3[1], 58, 64, 16, 'NO SIGNALS. NO STOPS.', C.paper, t, 5.0, 7.72, 111);
    const L0 = lots[0];
    P(L0.x0 + 3, L0.y0 + 3, 0.5, o3);
    drawCallout(ctx, o3[0], o3[1], 56, -72, 16, 'PARKING, RECLAIMED', C.mint, t, 5.95, 7.72, 112);
  }

  return { id: 'cities', t0: 3.86, t1: 8.3, init, world, type, lots };
})();

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

/* ============================================================
   03 — ROBOTICS: a technical elevation drawing. Two arms
   assemble a building, one module per eighth note.
   ============================================================ */
const ROBO = (() => {
  const GY = 900, MW = 160, MH = 112, X0 = 740;
  const LA = 350, LB = 320, WRIST = 44;
  const ARMS = {
    L: { sx: 392, sy: 800, dir: 1, px: 583 },
    R: { sx: 1728, sy: 800, dir: -1, px: 1537 },
  };
  function camPush(ctx, t) { const k = lerp(1.0, 1.06, E.inOutSine(prog(t, 11.8, 16.3))); ctx.translate(1060, 900); ctx.scale(k, k); ctx.translate(-1060, -900); }
  const ORDER = [];
  for (let r = 0; r < 3; r++) ORDER.push([r, 0, 'L'], [r, 3, 'R'], [r, 1, 'L'], [r, 2, 'R']);
  const LOCKS = ORDER.map((o, k) => 12.5 + 0.25 * k);
  const DONE = 15.32;
  let H1, H2;

  const slotRect = (r, c) => [X0 + c * MW, GY - (r + 1) * MH, MW, MH];
  function wristAtSlot(k) { const [x, y] = slotRect(ORDER[k][0], ORDER[k][1]); return [x + MW / 2, y - WRIST]; }
  function wristAtPick(A) { return [A.px, GY - MH - WRIST]; }
  function bez(p0, p1, p2, p3, s) {
    const a = 1 - s;
    return [a * a * a * p0[0] + 3 * a * a * s * p1[0] + 3 * a * s * s * p2[0] + s * s * s * p3[0],
      a * a * a * p0[1] + 3 * a * a * s * p1[1] + 3 * a * s * s * p2[1] + s * s * s * p3[1]];
  }
  // wrist position + held module index for an arm at time t
  function armWrist(id, t) {
    const A = ARMS[id], P = wristAtPick(A);
    const ks = []; ORDER.forEach((o, k) => { if (o[2] === id) ks.push(k); });
    const rest = [A.sx + A.dir * 210, 585];
    for (let m = 0; m < ks.length; m++) {
      const k = ks[m], T = LOCKS[k], Q = wristAtSlot(k);
      if (t < T - 0.27) {
        // idle at pickup; the module arrives and is gripped just before the lift
        const g = t >= T - 0.29;
        return { w: P, hold: g ? k : -1, grip: g ? 1 : 0 };
      }
      if (t < T - 0.02) {
        const s = E.inOutCubic(prog(t, T - 0.27, T - 0.02));
        return { w: bez(P, [P[0], P[1] - 150], [Q[0], Q[1] - 130], Q, s), hold: k, grip: 1 };
      }
      if (t < T + 0.03) return { w: [Q[0], Q[1] + 3 * Math.sin(PI * prog(t, T - 0.02, T + 0.03))], hold: t < T ? k : -1, grip: t < T ? 1 : 0 };
      const last = m === ks.length - 1;
      if (!last && t < T + 0.21) {
        const s = E.inOutCubic(prog(t, T + 0.03, T + 0.21));
        return { w: bez(Q, [Q[0], Q[1] - 100], [P[0], P[1] - 110], P, s), hold: -1, grip: 0 };
      }
      if (last) {
        const s = E.inOutCubic(prog(t, T + 0.05, T + 0.55));
        return { w: bez(Q, [Q[0], Q[1] - 140], [rest[0], rest[1] - 80], rest, s), hold: -1, grip: 0 };
      }
    }
    return { w: P, hold: -1, grip: 0 };
  }
  function ik(A, tx, ty) {
    let dx = tx - A.sx, dy = ty - A.sy; let d = Math.hypot(dx, dy);
    const maxD = LA + LB - 2, minD = Math.abs(LA - LB) + 2;
    if (d > maxD) { dx *= maxD / d; dy *= maxD / d; d = maxD; }
    if (d < minD) { dx *= minD / d; dy *= minD / d; d = minD; }
    const a = Math.atan2(dy, dx);
    const b = Math.acos(clamp((LA * LA + d * d - LB * LB) / (2 * LA * d), -1, 1));
    const th = A.dir > 0 ? a - b : a + b;
    const ex = A.sx + LA * Math.cos(th), ey = A.sy + LA * Math.sin(th);
    const elbow = Math.acos(clamp((LA * LA + LB * LB - d * d) / (2 * LA * LB), -1, 1));
    const deg = th * 180 / PI;
    return { ex, ey, wx: A.sx + dx, wy: A.sy + dy, j1: A.dir > 0 ? -deg : 180 + deg, j2: elbow * 180 / PI, th };
  }

  function init(ctx) {
    H1 = mkLine(ctx, [{ s: 'Robots take the', f: 'disp', px: 100, col: C.paper, ls: -0.035 }, { s: ' dull,', f: 'ser', px: 106, col: C.orange, ls: -0.01 }]);
    H2 = mkLine(ctx, [{ s: 'dirty, dangerous', f: 'ser', px: 106, col: C.orange, ls: -0.01 }, { s: ' work.', f: 'disp', px: 100, col: C.paper, ls: -0.035 }]);
  }

  function capsule(ctx, x1, y1, x2, y2, r) {
    const a = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath();
    ctx.arc(x1, y1, r, a + PI / 2, a + 3 * PI / 2);
    ctx.arc(x2, y2, r, a - PI / 2, a + PI / 2);
    ctx.closePath();
  }
  function drawModule(ctx, x, y, k, t, placedAt, lit) {
    ctx.fillStyle = C.ink2;
    ctx.fillRect(x, y, MW, MH);
    if (placedAt != null) {
      const f = Math.exp(-(t - placedAt) / 0.18);
      if (f > 0.01) { ctx.fillStyle = rgba(C.orange, 0.85 * f); ctx.fillRect(x, y, MW, MH); }
    }
    // windows
    for (const wx of [22, 88]) {
      if (lit > 0) {
        ctx.fillStyle = rgba([255, 178, 107], 0.9 * lit);
        ctx.fillRect(x + wx, y + 26, 50, 58);
      }
      ctx.strokeStyle = 'rgba(237,232,223,0.5)'; ctx.lineWidth = 1;
      ctx.strokeRect(x + wx + 0.5, y + 26.5, 50, 58);
      ctx.beginPath(); ctx.moveTo(x + wx + 25.5, y + 26); ctx.lineTo(x + wx + 25.5, y + 84); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(237,232,223,0.9)'; ctx.lineWidth = 1.6;
    ctx.strokeRect(x + 0.8, y + 0.8, MW - 1.6, MH - 1.6);
  }

  function drawArm(ctx, id, t, st) {
    const A = ARMS[id];
    const s = ik(A, st.w[0], st.w[1]);
    // echo trails
    ctx.lineCap = 'round';
    for (let e = 3; e >= 1; e--) {
      const pe = ik(A, ...armWrist(id, t - e * 0.028).w);
      ctx.strokeStyle = rgba(C.orange, 0.16 / e);
      ctx.lineWidth = 10 - e * 2;
      ctx.beginPath(); ctx.moveTo(A.sx, A.sy); ctx.lineTo(pe.ex, pe.ey); ctx.lineTo(pe.wx, pe.wy); ctx.stroke();
    }
    ctx.lineCap = 'butt';
    // pedestal
    ctx.fillStyle = C.ink2; ctx.strokeStyle = 'rgba(237,232,223,0.85)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(A.sx - 50, GY); ctx.lineTo(A.sx + 50, GY); ctx.lineTo(A.sx + 26, A.sy + 16); ctx.lineTo(A.sx - 26, A.sy + 16); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.save(); ctx.clip();
    ctx.strokeStyle = 'rgba(237,232,223,0.18)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let h = -100; h < 140; h += 11) { ctx.moveTo(A.sx - 60 + h, GY); ctx.lineTo(A.sx - 5 + h, A.sy); }
    ctx.stroke(); ctx.restore();
    // links
    ctx.fillStyle = C.ink2; ctx.strokeStyle = 'rgba(237,232,223,0.92)'; ctx.lineWidth = 1.6;
    capsule(ctx, A.sx, A.sy, s.ex, s.ey, 17); ctx.fill(); ctx.stroke();
    capsule(ctx, s.ex, s.ey, s.wx, s.wy, 12); ctx.fill(); ctx.stroke();
    ctx.setLineDash([10, 5, 2, 5]); ctx.strokeStyle = 'rgba(237,232,223,0.3)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(A.sx, A.sy); ctx.lineTo(s.ex, s.ey); ctx.lineTo(s.wx, s.wy); ctx.stroke();
    ctx.setLineDash([]);
    // wrist + gripper
    ctx.strokeStyle = 'rgba(237,232,223,0.92)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(s.wx, s.wy); ctx.lineTo(s.wx, s.wy + WRIST - 8); ctx.stroke();
    const gw = st.grip ? 30 : 40;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(s.wx - gw, s.wy + WRIST + 4); ctx.lineTo(s.wx - gw, s.wy + WRIST - 8); ctx.lineTo(s.wx + gw, s.wy + WRIST - 8); ctx.lineTo(s.wx + gw, s.wy + WRIST + 4);
    ctx.stroke();
    // joints
    for (const [x, y, r] of [[A.sx, A.sy, 17], [s.ex, s.ey, 13], [s.wx, s.wy, 9]]) {
      ctx.fillStyle = C.ink2; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      ctx.strokeStyle = C.orange; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = C.orange; ctx.beginPath(); ctx.arc(x, y, 3, 0, TAU); ctx.fill();
    }
    // joint angle arc
    ctx.strokeStyle = rgba(C.orange, 0.7); ctx.lineWidth = 1.2; ctx.setLineDash([3, 4]);
    ctx.beginPath();
    if (A.dir > 0) ctx.arc(A.sx, A.sy, 62, s.th, 0); else ctx.arc(A.sx, A.sy, 62, PI, s.th);
    ctx.stroke(); ctx.setLineDash([]);
    return s;
  }

  function world(ctx, t) {
    ctx.save();
    camPush(ctx, t);
    // blueprint grid
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(237,232,223,0.035)'; ctx.beginPath();
    for (let x = 0; x <= W; x += 40) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); }
    for (let y = 20; y <= H; y += 40) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(237,232,223,0.065)'; ctx.beginPath();
    for (let x = 0; x <= W; x += 200) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); }
    for (let y = 100; y <= H; y += 200) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); }
    ctx.stroke();
    // ground
    ctx.fillStyle = C.ink; ctx.fillRect(0, GY, W, 60);
    ctx.strokeStyle = 'rgba(237,232,223,0.75)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, GY + 0.5); ctx.lineTo(W, GY + 0.5); ctx.stroke();
    ctx.strokeStyle = 'rgba(237,232,223,0.14)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = -20; x < W; x += 16) { ctx.moveTo(x, GY + 16); ctx.lineTo(x + 14, GY + 2); }
    ctx.stroke();
    // lift shafts (hidden lines) where modules arrive from below grade
    for (const A of [ARMS.L, ARMS.R]) {
      ctx.fillStyle = C.ink; ctx.fillRect(A.px - MW / 2 - 6, GY - 1, MW + 12, 3);
      ctx.setLineDash([6, 5]); ctx.strokeStyle = 'rgba(237,232,223,0.4)'; ctx.lineWidth = 1;
      ctx.strokeRect(A.px - MW / 2 - 6.5, GY + 0.5, MW + 13, 46);
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(237,232,223,0.8)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(A.px - MW / 2 - 14, GY - 6); ctx.lineTo(A.px - MW / 2 - 6, GY); ctx.moveTo(A.px + MW / 2 + 14, GY - 6); ctx.lineTo(A.px + MW / 2 + 6, GY); ctx.stroke();
    }
    // placed modules
    for (let k = 0; k < ORDER.length; k++) {
      if (t < LOCKS[k]) continue;
      const [x, y] = slotRect(ORDER[k][0], ORDER[k][1]);
      const idx = ORDER[k][0] * 4 + ORDER[k][1];
      const lit = E.outCubic(prog(t, DONE + idx * 0.035, DONE + idx * 0.035 + 0.18));
      drawModule(ctx, x, y, k, t, LOCKS[k], lit);
      const ring = prog(t, LOCKS[k], LOCKS[k] + 0.4);
      if (ring < 1) {
        const g = 18 * E.outCubic(ring);
        ctx.strokeStyle = rgba(C.orange, 1 - ring); ctx.lineWidth = 1.5;
        ctx.strokeRect(x - g, y - g, MW + 2 * g, MH + 2 * g);
      }
    }
    // roof line after completion
    const rf = E.outCubic(prog(t, DONE + 0.3, DONE + 0.6));
    if (rf > 0) {
      const y = GY - 3 * MH;
      ctx.strokeStyle = rgba(C.orange, 0.95); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(X0 + 2 * MW - 2 * MW * rf - 12 * rf, y - 1); ctx.lineTo(X0 + 2 * MW + 2 * MW * rf + 12 * rf, y - 1); ctx.stroke();
    }
    // conveyor + held modules, then arms
    const held = {};
    for (const id of ['L', 'R']) held[id] = armWrist(id, t);
    for (let k = 0; k < ORDER.length; k++) {
      const A = ARMS[ORDER[k][2]], G = LOCKS[k] - 0.29;
      if (t >= G || t < G - 0.34) continue;
      const y = lerp(GY, GY - MH, E.outCubic(prog(t, G - 0.34, G - 0.02)));
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, GY); ctx.clip();
      drawModule(ctx, A.px - MW / 2, y, k, t, null, 0);
      ctx.restore();
    }
    for (const id of ['L', 'R']) {
      const st = held[id];
      if (st.hold >= 0) drawModule(ctx, st.w[0] - MW / 2, st.w[1] + WRIST, st.hold, t, null, 0);
    }
    const sL = drawArm(ctx, 'L', t, held.L), sR = drawArm(ctx, 'R', t, held.R);
    ROBO._s = { L: sL, R: sR };
    // height dimension
    let rows = 0; for (let r = 0; r < 3; r++) if (t >= LOCKS[r * 4 + 3]) rows = r + 1;
    const hy = GY - rows * MH;
    if (rows > 0) {
      const dx = X0 + 4 * MW + 38;
      ctx.strokeStyle = 'rgba(237,232,223,0.6)'; ctx.fillStyle = 'rgba(237,232,223,0.6)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(dx, GY); ctx.lineTo(dx, hy); ctx.moveTo(dx - 10, hy); ctx.lineTo(X0 + 4 * MW + 8, hy); ctx.stroke();
      for (const [ay, s] of [[hy, 1], [GY, -1]]) { ctx.beginPath(); ctx.moveTo(dx, ay); ctx.lineTo(dx - 4, ay + 10 * s); ctx.lineTo(dx + 4, ay + 10 * s); ctx.closePath(); ctx.fill(); }
    }
    ctx.restore();
  }

  function type(ctx, t) {
    const s = ROBO._s;
    ctx.save();
    camPush(ctx, t);
    font(ctx, fMono(11, 500), 1.2);
    ctx.textBaseline = 'middle';
    if (s) {
      const va = env(t, 12.0, 16.2, 0.3, 0.2);
      ctx.fillStyle = rgba(C.orange, 0.95 * va);
      ctx.textAlign = 'left';
      ctx.fillText('J1 ' + s.L.j1.toFixed(1) + '°', ARMS.L.sx + 78, ARMS.L.sy - 30);
      ctx.fillText('J2 ' + s.L.j2.toFixed(1) + '°', s.L.ex + 22, s.L.ey - 18);
      ctx.textAlign = 'right';
      ctx.fillText('J1 ' + s.R.j1.toFixed(1) + '°', ARMS.R.sx - 78, ARMS.R.sy - 30);
      ctx.fillText('J2 ' + s.R.j2.toFixed(1) + '°', s.R.ex - 22, s.R.ey - 18);
    }
    // module ids
    ctx.fillStyle = 'rgba(237,232,223,0.5)'; ctx.textAlign = 'left'; font(ctx, fMono(10, 500), 1);
    for (let k = 0; k < ORDER.length; k++) {
      if (t < LOCKS[k]) continue;
      const [x, y] = slotRect(ORDER[k][0], ORDER[k][1]);
      ctx.fillText('M' + String(k + 1).padStart(2, '0'), x + 8, y + 14);
    }
    // height label
    let rows = 0; for (let r = 0; r < 3; r++) if (t >= LOCKS[r * 4 + 3]) rows = r + 1;
    if (rows > 0) {
      ctx.save();
      ctx.translate(X0 + 4 * MW + 56, GY - rows * MH / 2); ctx.rotate(-PI / 2);
      ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(237,232,223,0.75)'; font(ctx, fMono(11, 500), 1.6);
      ctx.fillText('H ' + (rows * 3.4).toFixed(1) + ' M', 0, 0);
      ctx.restore();
    }
    // counters along the ground
    const ca = env(t, 12.2, 16.1, 0.25, 0.2);
    if (ca > 0) {
      let placed = 0; while (placed < LOCKS.length && LOCKS[placed] <= t) placed++;
      font(ctx, fMono(12, 500), 2.2);
      ctx.textAlign = 'left'; ctx.fillStyle = rgba(C.paper, 0.8 * ca);
      ctx.fillText(scramble('MODULE ' + String(placed).padStart(2, '0') + ' / 12', t, 12.2, 0.3, 301), X0, 948);
      ctx.textAlign = 'right';
      ctx.fillText(scramble('CREW: 2 ROBOTS · 0 INJURIES', t, 12.9, 0.5, 302), X0 + 4 * MW, 948);
    }
    drawCallout(ctx, X0 + 4 * MW - 4, GY - 3 * MH, 46, -60, 16, 'STRUCTURE COMPLETE', C.orange, t, DONE + 0.25, 16.25, 303);
    ctx.restore();
    drawEyebrow(ctx, 120, 150, '03 / ROBOTICS', C.orange, t, 12.2, 15.9, 103);
    drawLine(ctx, H1, 120, 268, t, 12.3, 15.5);
    drawLine(ctx, H2, 120, 382, t, 12.46, 15.56);
  }

  return { id: 'robotics', t0: 11.8, t1: 16.3, init, world, type, LOCKS, DONE };
})();

/* ============================================================
   04 — ENERGY: sunrise over a solar field; the field curls
   into a planet wrapped in a lattice of light.
   ============================================================ */
const ENERGY = (() => {
  const R = 10, NU = 56, NV = 28;
  const U0 = -PI * R, V0 = -PI * R / 2, DU = (2 * PI * R) / NU, DV = (PI * R) / NV;
  const T_CURL0 = 17.15, T_CURL1 = 18.7, T_ROLL0 = 18.0, T_ROLL1 = 19.35, T_CAM0 = 17.05, T_CAM1 = 19.35;
  const T_ZOOM0 = 19.52, T_ZOOM1 = 20.1;
  const AZ = 0.38;
  const nodes = [], arcs = [];
  let zoomNode = null, H1, H2;
  const GOLD = rgb(C.gold);

  function state(t) {
    const kap = E.inOutCubic(prog(t, T_CURL0, T_CURL1)) / R;
    const beta = -PI / 2 * E.inOutCubic(prog(t, T_ROLL0, T_ROLL1));
    const psi = 0.16 * Math.max(0, t - T_CURL1);
    const s = E.inOutCubic(prog(t, T_CAM0, T_CAM1));
    const drift = prog(t, 15.8, 17.1) * 0.8;
    const p0 = [0, 1.25, -13 + drift], p1 = [16.5, -10, -41];
    const q0 = [0, 0.35, 20], q1 = [16.5, -10, 0];
    const pos = [lerp(p0[0], p1[0], s), lerp(p0[1], p1[1], s) + 6.5 * Math.sin(PI * s), lerp(p0[2], p1[2], s)];
    const tgt = [lerp(q0[0], q1[0], s), lerp(q0[1], q1[1], E.inQuad(s)), lerp(q0[2], q1[2], s)];
    const cam = lookAt(pos, tgt, 1100, W / 2, H / 2);
    const e = lerp(-0.15, 0.2, E.outCubic(prog(t, 15.95, 17.05))) - 0.072 * E.inOutCubic(prog(t, 17.25, 19.4));
    const S = [-Math.sin(AZ) * Math.cos(e), Math.sin(e), Math.cos(AZ) * Math.cos(e)];
    return { kap, beta, psi, s, cam, S, e };
  }
  function surf(u, v, st, o, n) {
    const kap = st.kap;
    let x, y, z, nx, ny, nz;
    if (kap < 1e-6) { x = u; y = 0; z = v; nx = 0; ny = 1; nz = 0; }
    else {
      const th = u * kap + st.psi, ph = v * kap, cp = Math.cos(ph), sth = Math.sin(th), cth = Math.cos(th), sph = Math.sin(ph);
      nx = sth * cp; ny = cth * cp; nz = sph;
      x = nx / kap; y = (ny - 1) / kap; z = nz / kap;
    }
    if (st.beta !== 0) {
      const cb = Math.cos(st.beta), sb = Math.sin(st.beta);
      const yy = y + R, y2 = yy * cb - z * sb, z2 = yy * sb + z * cb; y = y2 - R; z = z2;
      const ny2 = ny * cb - nz * sb, nz2 = ny * sb + nz * cb; ny = ny2; nz = nz2;
    }
    o[0] = x; o[1] = y; o[2] = z;
    if (n) { n[0] = nx; n[1] = ny; n[2] = nz; }
    return o;
  }

  function init(ctx) {
    const r = RNG(2046);
    for (let k = 0; k < 110; k++) {
      const i = Math.floor(r() * NU), j = 3 + Math.floor(r() * (NV - 6));
      nodes.push({ i, j, u: U0 + i * DU, v: V0 + j * DV, ph: r(), sz: 0.6 + r() * 0.8 });
    }
    let guard = 0;
    while (arcs.length < 18 && guard++ < 2000) {
      const a = nodes[Math.floor(r() * nodes.length)], b = nodes[Math.floor(r() * nodes.length)];
      let du = b.u - a.u; if (du > PI * R) du -= 2 * PI * R; if (du < -PI * R) du += 2 * PI * R;
      const d = Math.hypot(du, b.v - a.v) / R;
      if (d < 0.45 || d > 1.5) continue;
      arcs.push({ a, du, dv: b.v - a.v, t0: 18.75 + r() * 0.7, dur: 0.45 + r() * 0.3, ph: r() });
    }
    // which node do we dive into? the one closest to the globe's centre at T_ZOOM0
    const st = state(T_ZOOM0), o = [0, 0, 0], n = [0, 0, 0], c = proj(st.cam, 0, -R, 0, [0, 0, 0]);
    let best = 1e9;
    for (const nd of nodes) {
      surf(nd.u, nd.v, st, o, n);
      const vx = st.cam.pos[0] - o[0], vy = st.cam.pos[1] - o[1], vz = st.cam.pos[2] - o[2];
      if (n[0] * vx + n[1] * vy + n[2] * vz <= 0) continue;
      const p = proj(st.cam, o[0], o[1], o[2], [0, 0, 0]);
      const d = Math.hypot(p[0] - c[0] - 40, p[1] - c[1] - 30);
      if (d < best) { best = d; zoomNode = nd; }
    }
    H1 = mkLine(ctx, [{ s: 'Clean power,', f: 'disp', px: 104, col: C.paper, ls: -0.035 }]);
    H2 = mkLine(ctx, [{ s: 'abundant and cheap.', f: 'ser', px: 108, col: C.gold, ls: -0.01 }]);
  }

  // node screen position without zoom (used as the dive-in centre and for the match cut)
  function zoomXY(t) {
    const st = state(t), o = [0, 0, 0];
    surf(zoomNode.u, zoomNode.v, st, o);
    return proj(st.cam, o[0], o[1], o[2], [0, 0, 0]);
  }
  function applyZoom(st, t) {
    const z = E.inExpo(prog(t, T_ZOOM0, T_ZOOM1));
    if (z > 0) { const p = zoomXY(t); st.cam.zx = p[0]; st.cam.zy = p[1]; st.cam.zs = Math.exp(Math.log(18) * z); }
    return z;
  }

  const V = (NU + 1) * (NV + 1);
  const PX = new Float32Array(V), PY = new Float32Array(V), PZ = new Float32Array(V);
  function world(ctx, t) {
    const st = state(t), cam = st.cam;
    const zf = applyZoom(st, t);
    const zs = cam.zs;
    const o = [0, 0, 0], n = [0, 0, 0], p = [0, 0, 0];
    ctx.save();
    // --- sky ---
    const sun = proj(cam, cam.pos[0] + st.S[0] * 1e4, cam.pos[1] + st.S[1] * 1e4, cam.pos[2] + st.S[2] * 1e4, [0, 0, 0]);
    const hor = proj(cam, cam.pos[0], 0, cam.pos[2] + 1e4, [0, 0, 0]);
    const phase1 = 1 - cl01(st.s * 6);
    const sunUp = sun[2] > 0;
    if (sunUp) {
      const gl = ctx.createRadialGradient(sun[0], sun[1], 0, sun[0], sun[1], 900 * zs);
      gl.addColorStop(0, rgba(C.gold, 0.28)); gl.addColorStop(0.35, rgba(C.orange, 0.08)); gl.addColorStop(1, rgba(C.orange, 0));
      ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);
    }
    // horizon band
    if (phase1 > 0) {
      const hb = ctx.createLinearGradient(0, hor[1] - 160, 0, hor[1] + 10);
      hb.addColorStop(0, rgba(C.orange, 0)); hb.addColorStop(1, rgba(C.orange, 0.16 * phase1));
      ctx.fillStyle = hb; ctx.fillRect(0, hor[1] - 160, W, 170);
    }
    // --- sun ---
    if (sunUp) {
      ctx.save();
      if (phase1 > 0) { ctx.beginPath(); ctx.rect(0, 0, W, hor[1] + (1 - phase1) * 1400); ctx.clip(); }
      const sr = 185 * zs;
      ctx.lineWidth = 1;
      for (const [rr, a] of [[1.28, 0.16], [1.6, 0.09], [2.05, 0.05]]) {
        ctx.strokeStyle = rgba(C.gold, a); ctx.beginPath(); ctx.arc(sun[0], sun[1], sr * rr, 0, TAU); ctx.stroke();
      }
      const halo = ctx.createRadialGradient(sun[0], sun[1], sr * 0.9, sun[0], sun[1], sr * 1.6);
      halo.addColorStop(0, rgba('#FFE7A0', 0.45)); halo.addColorStop(1, rgba(C.gold, 0));
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(sun[0], sun[1], sr * 1.6, 0, TAU); ctx.fill();
      const sg = ctx.createRadialGradient(sun[0], sun[1], 0, sun[0], sun[1], sr);
      sg.addColorStop(0, '#FFFDF3'); sg.addColorStop(0.5, '#FFF1C2'); sg.addColorStop(0.86, '#FFD877'); sg.addColorStop(1, '#FFC24D');
      ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sun[0], sun[1], sr, 0, TAU); ctx.fill();
      ctx.restore();
      // anamorphic streak
      const sl = ctx.createLinearGradient(sun[0] - 820, 0, sun[0] + 820, 0);
      sl.addColorStop(0, rgba(C.gold, 0)); sl.addColorStop(0.5, rgba('#FFF4D0', 0.5)); sl.addColorStop(1, rgba(C.gold, 0));
      ctx.fillStyle = sl; ctx.fillRect(sun[0] - 820, sun[1] - 1.5, 1640, 3);
      ctx.globalAlpha = 0.3; ctx.fillRect(sun[0] - 820, sun[1] - 7, 1640, 14); ctx.globalAlpha = 1;
    }
    // ground beyond the field (phase 1 only)
    if (phase1 > 0) {
      ctx.fillStyle = rgba([9, 10, 14], phase1);
      ctx.fillRect(0, hor[1], W, H - hor[1] + 2);
      ctx.strokeStyle = rgba(C.gold, 0.35 * phase1); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, hor[1] + 0.5); ctx.lineTo(W, hor[1] + 0.5); ctx.stroke();
    }
    // --- surface vertices ---
    for (let j = 0; j <= NV; j++) for (let i = 0; i <= NU; i++) {
      surf(U0 + i * DU, V0 + j * DV, st, o);
      proj(cam, o[0], o[1], o[2], p);
      const k = j * (NU + 1) + i; PX[k] = p[0]; PY[k] = p[1]; PZ[k] = p[2];
    }
    const closure = cl01((st.kap * R - 0.9) / 0.1);
    // globe occluder + rim light
    const gc = proj(cam, 0, -R, 0, [0, 0, 0]);
    const dC = Math.hypot(cam.pos[0], cam.pos[1] + R, cam.pos[2]);
    const gr = cam.f * R / Math.sqrt(Math.max(1, dC * dC - R * R)) * zs;
    if (closure > 0) {
      ctx.fillStyle = rgba([6, 7, 10], closure);
      ctx.beginPath(); ctx.arc(gc[0], gc[1], gr * 1.003, 0, TAU); ctx.fill();
    }
    // --- panels ---
    const lattice = E.inOutCubic(prog(t, 18.55, 19.25));
    const panels = [];
    const wave = -34 + ((t - 15.8) * 26) % 80;
    for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) {
      const k0 = j * (NU + 1) + i, k1 = k0 + 1, k2 = k0 + NU + 2, k3 = k0 + NU + 1;
      if (PZ[k0] < 0.1 && PZ[k1] < 0.1 && PZ[k2] < 0.1 && PZ[k3] < 0.1) continue;
      const minx = Math.min(PX[k0], PX[k1], PX[k2], PX[k3]), maxx = Math.max(PX[k0], PX[k1], PX[k2], PX[k3]);
      const miny = Math.min(PY[k0], PY[k1], PY[k2], PY[k3]), maxy = Math.max(PY[k0], PY[k1], PY[k2], PY[k3]);
      if (maxx < -20 || minx > W + 20 || maxy < -20 || miny > H + 20) continue;
      if (PZ[k0] < 0.1 || PZ[k1] < 0.1 || PZ[k2] < 0.1 || PZ[k3] < 0.1) continue;
      const uc = U0 + (i + 0.5) * DU, vc = V0 + (j + 0.5) * DV;
      surf(uc, vc, st, o, n);
      let vx = cam.pos[0] - o[0], vy = cam.pos[1] - o[1], vz = cam.pos[2] - o[2];
      const vl = Math.hypot(vx, vy, vz); vx /= vl; vy /= vl; vz /= vl;
      const facing = n[0] * vx + n[1] * vy + n[2] * vz;
      if (facing < 0 && closure > 0.2) continue;
      panels.push([(PZ[k0] + PZ[k2]) / 2, k0, k1, k2, k3, n[0], n[1], n[2], vx, vy, vz, facing, uc, i, j]);
    }
    panels.sort((a, b) => b[0] - a[0]);
    const S = st.S;
    const edgeA = lerp(0.2, 0.75, lattice);
    const cells = new Path2D();
    const aisle = lerp(0.2, 0.06, cl01(st.kap * R * 1.4));
    const bl = (k0, k1, k2, k3, a, b, o) => {
      o[0] = (1 - a) * (1 - b) * PX[k0] + a * (1 - b) * PX[k1] + a * b * PX[k2] + (1 - a) * b * PX[k3];
      o[1] = (1 - a) * (1 - b) * PY[k0] + a * (1 - b) * PY[k1] + a * b * PY[k2] + (1 - a) * b * PY[k3];
      return o;
    };
    const c0 = [0, 0], c1 = [0, 0], c2 = [0, 0], c3 = [0, 0];
    for (const q of panels) {
      const [, k0, k1, k2, k3, nx, ny, nz, vx, vy, vz, facing, uc] = q;
      const dn = vx * nx + vy * ny + vz * nz;
      const rx = -vx + 2 * dn * nx, ry = -vy + 2 * dn * ny, rz = -vz + 2 * dn * nz;
      const rs = Math.max(0, rx * S[0] + ry * S[1] + rz * S[2]);
      const spec = Math.pow(rs, 70), broad = Math.pow(rs, 7);
      const diff = Math.max(0, nx * S[0] + ny * S[1] + nz * S[2]);
      let wv = uc - wave; wv = Math.exp(-(wv * wv) / 5);
      const back = facing < 0 ? 0.35 : 1;
      const li = (spec * 1.5 + broad * 0.28 + diff * 0.1 + wv * 0.22) * back;
      const fillA = lerp(1, 0.2, lattice);
      const c = [14 + GOLD[0] * li + 255 * spec * 0.5, 24 + GOLD[1] * li + 245 * spec * 0.5, 52 + GOLD[2] * li + 200 * spec * 0.4];
      // a panel: 94% of the cell across, rows separated by aisles
      bl(k0, k1, k2, k3, 0.03, aisle, c0); bl(k0, k1, k2, k3, 0.97, aisle, c1);
      bl(k0, k1, k2, k3, 0.97, 1 - aisle, c2); bl(k0, k1, k2, k3, 0.03, 1 - aisle, c3);
      ctx.beginPath();
      ctx.moveTo(c0[0], c0[1]); ctx.lineTo(c1[0], c1[1]); ctx.lineTo(c2[0], c2[1]); ctx.lineTo(c3[0], c3[1]);
      ctx.closePath();
      // photovoltaic cell lines when the panel is big enough to read
      if (Math.abs(c1[0] - c0[0]) + Math.abs(c1[1] - c0[1]) > 26 && lattice < 1) {
        for (const a of [0.26, 0.5, 0.74]) { const u0 = bl(k0, k1, k2, k3, a, aisle, [0, 0]), u1 = bl(k0, k1, k2, k3, a, 1 - aisle, [0, 0]); cells.moveTo(u0[0], u0[1]); cells.lineTo(u1[0], u1[1]); }
        const m0 = bl(k0, k1, k2, k3, 0.03, 0.5, [0, 0]), m1 = bl(k0, k1, k2, k3, 0.97, 0.5, [0, 0]); cells.moveTo(m0[0], m0[1]); cells.lineTo(m1[0], m1[1]);
      }
      ctx.fillStyle = rgba(c, fillA); ctx.fill();
      ctx.strokeStyle = rgba(C.gold, edgeA * back * (0.6 + 0.4 * wv)); ctx.lineWidth = lattice > 0 ? 1.2 : 1; ctx.stroke();
    }
    ctx.strokeStyle = rgba([150, 175, 230], 0.13 * (1 - lattice)); ctx.lineWidth = 1; ctx.stroke(cells);
    // rim light on the globe (sun behind)
    if (closure > 0 && sunUp) {
      const ang = Math.atan2(sun[1] - gc[1], sun[0] - gc[0]);
      const rg = ctx.createLinearGradient(gc[0] - Math.cos(ang) * gr, gc[1] - Math.sin(ang) * gr, gc[0] + Math.cos(ang) * gr, gc[1] + Math.sin(ang) * gr);
      rg.addColorStop(0, rgba(C.gold, 0)); rg.addColorStop(0.62, rgba(C.gold, 0)); rg.addColorStop(1, rgba('#FFF3C0', 0.95 * closure));
      ctx.strokeStyle = rg; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.arc(gc[0], gc[1], gr, 0, TAU); ctx.stroke();
    }
    // --- nodes ---
    const na = cl01(prog(t, 18.4, 18.9));
    if (na > 0) {
      for (const nd of nodes) {
        surf(nd.u, nd.v, st, o, n);
        const vx = cam.pos[0] - o[0], vy = cam.pos[1] - o[1], vz = cam.pos[2] - o[2];
        if (n[0] * vx + n[1] * vy + n[2] * vz <= 0) continue;
        proj(cam, o[0], o[1], o[2], p);
        const pulse = 0.55 + 0.45 * Math.sin(TAU * (t * 1.2 + nd.ph));
        const rr = (1.6 + nd.sz * 1.4) * Math.sqrt(zs) * (nd === zoomNode ? 1.4 + 2.5 * zf : 1);
        ctx.fillStyle = rgba('#FFF4CF', na * (0.6 + 0.4 * pulse));
        ctx.beginPath(); ctx.arc(p[0], p[1], rr, 0, TAU); ctx.fill();
      }
    }
    // --- arcs ---
    for (const a of arcs) {
      const pa = prog(t, a.t0, a.t0 + a.dur);
      if (pa <= 0) continue;
      const SEG = 26, nDraw = Math.max(1, Math.round(SEG * E.outCubic(pa)));
      const pts = [];
      for (let m = 0; m <= nDraw; m++) {
        const s = m / SEG, hgt = Math.sin(PI * s) * 2.2;
        surf(a.a.u + a.du * s, a.a.v + a.dv * s, st, o, n);
        o[0] += n[0] * hgt; o[1] += n[1] * hgt; o[2] += n[2] * hgt;
        const vis = n[0] * (cam.pos[0] - o[0]) + n[1] * (cam.pos[1] - o[1]) + n[2] * (cam.pos[2] - o[2]);
        const q = proj(cam, o[0], o[1], o[2], [0, 0, 0]);
        pts.push([q[0], q[1], vis > -4]);
      }
      ctx.lineWidth = 1.6; ctx.strokeStyle = rgba(C.gold, 0.8);
      ctx.beginPath();
      let pen = false;
      for (const q of pts) { if (!q[2]) { pen = false; continue; } if (!pen) { ctx.moveTo(q[0], q[1]); pen = true; } else ctx.lineTo(q[0], q[1]); }
      ctx.stroke();
      // travelling pulse
      const tp = ((t - a.t0) * 1.3 + a.ph) % 1;
      const qi = Math.min(pts.length - 1, Math.floor(tp * SEG));
      if (pa >= 1 && pts[qi] && pts[qi][2]) {
        ctx.fillStyle = '#FFFBEA'; ctx.beginPath(); ctx.arc(pts[qi][0], pts[qi][1], 2.8, 0, TAU); ctx.fill();
      }
    }
    // dive-in bloom around the node we zoom into
    if (zf > 0) {
      const zp = zoomXY(t);
      const g = ctx.createRadialGradient(zp[0], zp[1], 0, zp[0], zp[1], 260 * (0.4 + zf));
      g.addColorStop(0, rgba('#FFFFFF', 0.9 * zf)); g.addColorStop(0.3, rgba(C.blue, 0.4 * zf)); g.addColorStop(1, rgba(C.blue, 0));
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  }

  function type(ctx, t) {
    drawEyebrow(ctx, 120, 150, '04 / ENERGY', C.gold, t, 16.2, 19.3, 104);
    drawLine(ctx, H1, 120, 262, t, 16.3, 18.9);
    drawLine(ctx, H2, 120, 372, t, 16.46, 18.96);
    const a = env(t, 18.95, 19.9, 0.25, 0.25);
    if (a > 0) {
      const st = state(t); applyZoom(st, t);
      const gc = proj(st.cam, 0, -R, 0, [0, 0, 0]);
      ctx.save();
      font(ctx, fMono(12, 500), 2);
      ctx.fillStyle = rgba(C.gold, a); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(scramble('ONE GRID. EVERY TIME ZONE.', t, 18.95, 0.5, 401), gc[0], gc[1] + 340);
      ctx.restore();
    }
  }

  return { id: 'energy', t0: 15.8, t1: 20.1, init, world, type, zoomXY, T_ZOOM0 };
})();

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

/* ============================================================
   Compositor: transitions, bloom, HUD, grain, vignette.
   ============================================================ */
const SCENES = [INTRO, CITIES, DISC, ROBO, ENERGY, ACCESS, FINALE];
const OPTS = { grain: 1, grainRate: 30 };
let S = 1, main, off, offT, b1, b2, b3, b4, vig;
const grain = [];

function mkLayer(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return { cv: c, ctx: c.getContext('2d'), w, h };
}
function begin(ctx) {
  ctx.setTransform(S, 0, 0, S, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  ctx.letterSpacing = '0px';
}

const TR = {
  cities: { kind: 'mask', a: 3.86, b: 4.32,
    path(ctx, t) { const hh = 700 * E.inOutExpo(prog(t, this.a, this.b)); ctx.rect(0, INTRO.HY - hh, W, 2 * hh); },
    edge(ctx, t) {
      const p = prog(t, this.a, this.b); if (p <= 0 || p >= 1) return;
      const hh = 700 * E.inOutExpo(p), a = 1 - E.inCubic(p);
      for (const [lw, al, col] of [[10, 0.18, C.mint], [2, 1, '#E8FFF5']]) {
        ctx.strokeStyle = rgba(col, al * a); ctx.lineWidth = lw;
        ctx.beginPath(); ctx.moveTo(0, INTRO.HY - hh); ctx.lineTo(W, INTRO.HY - hh); ctx.moveTo(0, INTRO.HY + hh); ctx.lineTo(W, INTRO.HY + hh); ctx.stroke();
      }
    } },
  discovery: { kind: 'mask', a: 7.8, b: 8.3, n: 12,
    strip(t, i) { return E.inOutCubic(prog(t, this.a + i * 0.018, this.a + i * 0.018 + 0.28)); },
    path(ctx, t) {
      const sw = W / this.n;
      for (let i = 0; i < this.n; i++) {
        const h = H * this.strip(t, i); if (h <= 0) continue;
        if (i % 2 === 0) ctx.rect(i * sw, 0, sw + 0.6, h); else ctx.rect(i * sw, H - h, sw + 0.6, h);
      }
    },
    edge(ctx, t) {
      const sw = W / this.n;
      for (let i = 0; i < this.n; i++) {
        const p = this.strip(t, i); if (p <= 0 || p >= 1) continue;
        const y = i % 2 === 0 ? H * p : H - H * p;
        ctx.fillStyle = rgba('#E9E0FF', 0.95 * (1 - p * 0.5)); ctx.fillRect(i * sw, y - 1.5, sw, 3);
        ctx.fillStyle = rgba(C.violet, 0.25); ctx.fillRect(i * sw, y - 8, sw, 16);
      }
    } },
  robotics: { kind: 'mask', a: 11.8, b: 12.26, k: Math.tan(0.34),
    X(t) { return lerp(W + H * this.k / 2 + 40, -H * this.k / 2 - 40, E.inOutExpo(prog(t, this.a, this.b))); },
    path(ctx, t) { const X = this.X(t), k = this.k; ctx.moveTo(X - H / 2 * k, 0); ctx.lineTo(W + 20, 0); ctx.lineTo(W + 20, H); ctx.lineTo(X + H / 2 * k, H); ctx.closePath(); },
    edge(ctx, t) {
      const p = prog(t, this.a, this.b); if (p <= 0 || p >= 1) return;
      const X = this.X(t), k = this.k;
      for (const [lw, al, col, dx] of [[14, 0.2, C.orange, 0], [2.5, 1, '#FFE2CC', 0], [1, 0.5, C.orange, 26], [1, 0.3, C.orange, 52]]) {
        ctx.strokeStyle = rgba(col, al); ctx.lineWidth = lw;
        ctx.beginPath(); ctx.moveTo(X - H / 2 * k + dx, 0); ctx.lineTo(X + H / 2 * k + dx, H); ctx.stroke();
      }
    } },
  energy: { kind: 'mask', a: 15.8, b: 16.3, cx: 1400, cy: 560,
    r(t) { return 2300 * E.inOutExpo(prog(t, this.a, this.b)); },
    path(ctx, t) { const r = this.r(t); ctx.moveTo(this.cx + r, this.cy); ctx.arc(this.cx, this.cy, r, 0, TAU); },
    edge(ctx, t) {
      const p = prog(t, this.a, this.b); if (p <= 0 || p >= 1) return;
      const r = this.r(t);
      for (const [lw, al, col] of [[18, 0.2, C.gold], [3, 1, '#FFF3C0']]) {
        ctx.strokeStyle = rgba(col, al); ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(this.cx, this.cy, r, 0, TAU); ctx.stroke();
      }
    } },
  access: { kind: 'fade', alpha(t) { return E.inOutCubic(prog(t, 19.86, 20.08)); },
    edge(ctx, t) {
      const f = Math.exp(-Math.pow((t - 19.98) / 0.07, 2));
      if (f < 0.01) return;
      const p = ENERGY.zoomXY(19.98);
      const g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], 700);
      g.addColorStop(0, rgba('#FFFFFF', 0.9 * f)); g.addColorStop(0.25, rgba(C.blue, 0.35 * f)); g.addColorStop(1, rgba(C.blue, 0));
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    } },
  finale: { kind: 'fade', alpha(t) { return E.inOutCubic(prog(t, 23.86, 24.06)); } },
};

function runScene(ctx, fn, t, clipFn, even, bg) {
  ctx.save(); begin(ctx);
  if (clipFn) { ctx.beginPath(); if (even) ctx.rect(0, 0, W, H); clipFn(ctx, t); ctx.clip(even ? 'evenodd' : 'nonzero'); }
  if (bg) { ctx.fillStyle = C.ink; ctx.fillRect(0, 0, W, H); }
  fn(ctx, t);
  ctx.restore();
}
function composite(ctx, t, A, B, layer) {
  const tr = TR[B.id], fa = A[layer], fb = B[layer];
  if (tr.kind === 'mask') {
    const p = (c, tt) => tr.path(c, tt);
    if (fa) runScene(ctx, fa, t, layer === 'type' ? p : null, true, false);
    if (fb) runScene(ctx, fb, t, p, false, layer === 'world');
    if (layer === 'world' && tr.edge) { ctx.save(); begin(ctx); tr.edge(ctx, t); ctx.restore(); }
  } else {
    const a = tr.alpha(t);
    if (layer === 'world') {
      if (fa) runScene(ctx, fa, t, null, false, false);
      if (fb && a > 0) {
        const o = off.ctx; o.setTransform(1, 0, 0, 1, 0, 0); o.globalAlpha = 1; o.fillStyle = C.ink; o.fillRect(0, 0, off.w, off.h);
        runScene(o, fb, t, null, false, false);
        ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = a; ctx.drawImage(off.cv, 0, 0); ctx.restore();
      }
      if (tr.edge) { ctx.save(); begin(ctx); tr.edge(ctx, t); ctx.restore(); }
    } else {
      for (const [fn, al] of [[fa, 1 - a], [fb, a]]) {
        if (!fn || al <= 0) continue;
        const o = offT.ctx; o.setTransform(1, 0, 0, 1, 0, 0); o.clearRect(0, 0, offT.w, offT.h);
        runScene(o, fn, t, null, false, false);
        ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = al; ctx.drawImage(offT.cv, 0, 0); ctx.restore();
      }
    }
  }
}

function bloom(ctx, amt) {
  const c1 = b1.ctx, c2 = b2.ctx, c3 = b3.ctx, c4 = b4.ctx;
  for (const c of [c1, c2, c3, c4]) { c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'copy'; c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high'; }
  c1.filter = 'brightness(0.62) contrast(3.2) blur(1px)'; c1.drawImage(main.cv, 0, 0, b1.w, b1.h); c1.filter = 'none';
  c2.filter = 'blur(1.5px)'; c2.drawImage(b1.cv, 0, 0, b2.w, b2.h); c2.filter = 'none';
  c3.filter = 'blur(1.5px)'; c3.drawImage(b2.cv, 0, 0, b3.w, b3.h); c3.filter = 'none';
  c4.filter = 'blur(1.5px)'; c4.drawImage(b3.cv, 0, 0, b4.w, b4.h); c4.filter = 'none';
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'lighter'; ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.globalAlpha = 0.42 * amt; ctx.drawImage(b1.cv, 0, 0, main.w, main.h);
  ctx.globalAlpha = 0.55 * amt; ctx.drawImage(b2.cv, 0, 0, main.w, main.h);
  ctx.globalAlpha = 0.65 * amt; ctx.drawImage(b3.cv, 0, 0, main.w, main.h);
  ctx.globalAlpha = 0.75 * amt; ctx.drawImage(b4.cv, 0, 0, main.w, main.h);
  ctx.restore();
}

function hud(ctx, t) {
  const a = E.outCubic(prog(t, 0.85, 1.45)) * (1 - E.inCubic(prog(t, 29.2, 29.7)));
  if (a <= 0.001) return;
  ctx.save();
  const m = 44, arm = 26 * E.outExpo(prog(t, 0.85, 1.4));
  ctx.strokeStyle = rgba(C.paper, 0.55 * a); ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(m, m + arm); ctx.lineTo(m, m); ctx.lineTo(m + arm, m);
  ctx.moveTo(W - m - arm, m); ctx.lineTo(W - m, m); ctx.lineTo(W - m, m + arm);
  ctx.moveTo(m, H - m - arm); ctx.lineTo(m, H - m); ctx.lineTo(m + arm, H - m);
  ctx.moveTo(W - m - arm, H - m); ctx.lineTo(W - m, H - m); ctx.lineTo(W - m, H - m - arm);
  ctx.stroke();
  font(ctx, fMono(12, 500), 2);
  ctx.textBaseline = 'middle';
  ctx.fillStyle = rgba(C.paper, 0.82 * a);
  ctx.textAlign = 'left';
  ctx.fillText(scramble('2046 — A DESIGN BRIEF', t, 3.3, 0.3, 11), 84, 80);
  ctx.textAlign = 'right';
  ctx.fillText(scramble('SHOWREEL · CLAUDE', t, 1.1, 0.5, 12), W - 84, 80);
  const fr = Math.floor(t * 60 + 1e-6), ss = Math.floor(fr / 60), ff = fr % 60;
  ctx.fillStyle = rgba(C.paper, 0.6 * a);
  ctx.fillText(scramble('TC 00:00:' + String(ss).padStart(2, '0') + ':' + String(ff).padStart(2, '0'), t, 1.0, 0.4, 13), W - 84, H - 80);
  // chapter index
  const ci = prog(t, 3.9, 4.3);
  if (ci > 0) {
    let x = 84;
    for (let i = 0; i < 5; i++) {
      const ch = CHAPTERS[i], s = ch.n + ' ' + ch.name;
      const w = ctx.measureText(s).width;
      const active = t >= ch.t0 && t < ch.t1, past = t >= ch.t1;
      let col = C.paper, al = past ? 0.5 : 0.28;
      if (active) { col = ch.col; al = 1; }
      if (t >= 24) { const fp = E.outCubic(prog(t, 24 + i * 0.07, 24.35 + i * 0.07)); col = mix(C.paper, ch.col, fp); al = lerp(0.5, 1, fp); }
      ctx.fillStyle = rgba(col, al * a);
      ctx.textAlign = 'left';
      ctx.fillText(scramble(s, t, 3.9 + i * 0.07, 0.4, 20 + i), x, H - 80);
      if (active) {
        const p = prog(t, ch.t0, ch.t1);
        ctx.fillStyle = rgba(C.paper, 0.14 * a); ctx.fillRect(x, H - 64, w, 2);
        ctx.fillStyle = rgba(ch.col, a); ctx.fillRect(x, H - 64, w * p, 2);
      }
      x += w + 34;
    }
  }
  ctx.restore();
}

function post(ctx, t) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(vig.cv, 0, 0);
  const gf = Math.floor(t * OPTS.grainRate);
  const pat = grain[gf % grain.length];
  if (OPTS.grain <= 0) { ctx.restore(); return postFade(ctx, t); }
  ctx.globalAlpha = OPTS.grain;
  const ox = Math.floor(hash1(gf * 7 + 1) * 256), oy = Math.floor(hash1(gf * 7 + 2) * 256);
  ctx.translate(-ox, -oy);
  ctx.fillStyle = pat; ctx.fillRect(ox, oy, main.w, main.h);
  ctx.restore();
  postFade(ctx, t);
}
function postFade(ctx, t) {
  // fade out the last few frames to pure black
  const fo = prog(t, 29.9, 30.0);
  if (fo > 0) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = rgba('#000000', fo); ctx.fillRect(0, 0, main.w, main.h); ctx.restore(); }
}

function init(canvas, scale) {
  S = scale || 1;
  const w = Math.round(W * S), h = Math.round(H * S);
  canvas.width = w; canvas.height = h;
  main = { cv: canvas, ctx: canvas.getContext('2d', { alpha: false }), w, h };
  off = mkLayer(w, h); offT = mkLayer(w, h);
  b1 = mkLayer(Math.round(w / 4), Math.round(h / 4)); b2 = mkLayer(Math.round(w / 8), Math.round(h / 8));
  b3 = mkLayer(Math.round(w / 16), Math.round(h / 16)); b4 = mkLayer(Math.round(w / 32), Math.round(h / 32));
  grain.length = 0;
  for (let k = 0; k < 6; k++) {
    const L = mkLayer(256, 256), id = L.ctx.createImageData(256, 256), d = id.data, r = RNG(900 + k);
    for (let i = 0; i < d.length; i += 4) { const v = r(); const g = v > 0.5 ? 255 : 0; d[i] = d[i + 1] = d[i + 2] = g; d[i + 3] = Math.abs(v - 0.5) * 2 * 20; }
    L.ctx.putImageData(id, 0, 0);
    grain.push(main.ctx.createPattern(L.cv, 'repeat'));
  }
  vig = mkLayer(w, h);
  const g = vig.ctx.createRadialGradient(w / 2, h / 2, h * 0.38, w / 2, h / 2, h * 1.08);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.62)');
  vig.ctx.fillStyle = g; vig.ctx.fillRect(0, 0, w, h);
  const m = mkLayer(8, 8).ctx;
  for (const s of SCENES) if (s.init && !s._inited) { s.init(m); s._inited = true; }
}

function render(t) {
  t = clamp(t, 0, DUR - 1e-4);
  const ctx = main.ctx;
  begin(ctx);
  ctx.fillStyle = C.ink; ctx.fillRect(0, 0, W, H);
  const act = SCENES.filter((s) => t >= s.t0 && t < s.t1);
  const A = act[0], B = act[1];
  if (!B) { if (A) runScene(ctx, A.world, t, null, false, false); }
  else composite(ctx, t, A, B, 'world');
  bloom(ctx, 1);
  if (!B) { if (A && A.type) runScene(ctx, A.type, t, null, false, false); }
  else composite(ctx, t, A, B, 'type');
  begin(ctx); hud(ctx, t);
  post(ctx, t);
}

// Event times for the score, exported from the same timeline the picture uses.
function events() {
  return {
    ticks: INTRO.TICKS, land: 3.3, cuts: [4, 8, 12, 16, 20, 24],
    parks: CITIES.lots.map((l) => l.ts).sort((a, b) => a - b),
    hits: DISC.HITS, waves: DISC.WAVES, wdur: DISC.WDUR, locks: ROBO.LOCKS, done: ROBO.DONE,
    landings: FINALE.streaks.map((s) => [+(s.t0 + s.dur).toFixed(4), +(s.lx / W).toFixed(3)]).sort((a, b) => a[0] - b[0]),
    questions: FINALE.QT,
  };
}

const REEL = { init, render, events, W, H, DUR, CHAPTERS, OPTS };
if (typeof window !== 'undefined') window.REEL = REEL;

})();
