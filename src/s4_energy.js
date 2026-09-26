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
