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
