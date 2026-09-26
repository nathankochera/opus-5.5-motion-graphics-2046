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
