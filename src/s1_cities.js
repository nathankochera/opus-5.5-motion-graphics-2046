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
