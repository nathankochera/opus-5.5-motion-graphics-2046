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
