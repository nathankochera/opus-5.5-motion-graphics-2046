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
