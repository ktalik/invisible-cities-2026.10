import * as THREE from 'three';
import { B, TAU, V, clamp, smooth } from '../engine/kit';
import type { Gen } from './types';
import { animatedPoints, crowd, ladder, rock, walkway } from './util';

// ---------------------------------------------------------------- Isaura
// A thousand wells over a hidden lake; its gods live in the depths, or in the buckets.
const isaura: Gen = (b, ctx) => {
  const R = 11.4;
  const H = 4.6;
  const t0 = Math.PI * 0.25;
  const tl = Math.PI * 1.5;
  // the earth, cut open on the side facing the visitor
  const strata = ['#6a4a32', '#7c5a3c', '#8e6a48', '#6e5440', '#9a7a56', '#5e4634'];
  const layers = strata.length;
  for (let k = 0; k < layers; k++) {
    const y0 = (k / layers) * H;
    const g = new THREE.CylinderGeometry(R, R, H / layers, 48, 1, false, t0, tl).translate(0, y0 + H / layers / 2, 0);
    b.add(g, new THREE.Matrix4(), strata[k]);
  }
  // cut faces: two walls of strata
  for (const th of [t0, t0 + tl]) {
    const dx = Math.sin(th);
    const dz = Math.cos(th);
    for (let k = 0; k < layers; k++) {
      b.box((dx * R) / 2, (k / layers) * H, (dz * R) / 2, R, H / layers, 0.06, strata[(k + 2) % layers], { ry: th - Math.PI / 2 });
    }
  }
  // grass and paving on top
  // CircleGeometry measures from +x, the cylinder from +z
  const top = new THREE.CircleGeometry(R, 48, t0 - Math.PI / 2, tl).rotateX(-Math.PI / 2);
  b.add(top, new THREE.Matrix4().makeTranslation(0, H + 0.01, 0), '#a8a07a');
  // the lake under the open quarter, luminous
  b.add(new THREE.CylinderGeometry(R - 0.05, R - 0.05, 0.9, 32, 1, false, -t0, t0 * 2).translate(0, 0.45, 0), new THREE.Matrix4(), '#3aa0d0', 'glow', 0.75);
  // shafts in the cut faces with ropes and moving buckets
  const buckets = b.sub();
  const shafts: { x: number; z: number; ph: number }[] = [];
  for (const th of [t0, t0 + tl]) {
    for (let k = 0; k < 4; k++) {
      const r = 2 + k * 2.3;
      const x = Math.sin(th) * r;
      const z = Math.cos(th) * r;
      b.box(x, 0.9, z, 0.5, H - 0.9, 0.1, '#20160e', { ry: th - Math.PI / 2 });
      b.line(V(x, H + 1.1, z), V(x, 0.9, z), '#c8b890');
      shafts.push({ x, z, ph: b.r(TAU) });
    }
  }
  const bk = crowd(buckets, shafts.length, () => '#ffd27a', { kind: 'glow' });
  buckets.on((t) => {
    shafts.forEach((s, i) => {
      const y = 1.0 + (0.5 + 0.5 * Math.sin(t * 0.5 + s.ph)) * (H - 0.4);
      bk.set(i, s.x, y, s.z, 0.6);
    });
    bk.commit();
  });
  // on the surface: well heads, windlasses, windmills, houses
  const onTop = (a: number, r: number) => V(Math.sin(a) * r, H, Math.cos(a) * r);
  for (let k = 0; k < 26; k++) {
    const a = b.r(t0 + 0.15, t0 + tl - 0.15);
    const p = onTop(a, b.r(2.5, R - 1));
    if (k % 3 === 0) {
      b.cyl(p.x, H, p.z, 0.32, 0.4, '#c8b896', { seg: 10 });
      b.cyl(p.x, H + 0.4, p.z, 0.26, 0.02, '#1a2a3a', { seg: 10 });
      b.box(p.x - 0.3, H + 0.4, p.z, 0.05, 0.6, 0.05, '#5a4030');
      b.box(p.x + 0.3, H + 0.4, p.z, 0.05, 0.6, 0.05, '#5a4030');
      b.cyl(p.x - 0.3, H + 0.95, p.z, 0.07, 0.6, '#7a5a3a', { rz: -Math.PI / 2, seg: 6 });
    } else {
      b.house(p.x, p.z, 0.9 + b.r(0.5), 0.8 + b.r(0.4), 0.8 + b.r(1.2), { y: H, ry: a, wall: b.jit('#e0cfa8'), roof: b.jit('#9a5a3a'), roofType: 'hip', lit: 0.3 });
    }
  }
  for (let k = 0; k < 4; k++) {
    const a = t0 + 0.6 + k * 1.05;
    const p = onTop(a, 7.5);
    b.cyl(p.x, H, p.z, 0.4, 2.4, '#e8dcc0', { rt: 0.65, seg: 8 });
    b.cone(p.x, H + 2.4, p.z, 0.35, 0.5, '#8a4a32', { seg: 8 });
    const vanes = b.sub({ x: p.x, y: H + 2.2, z: p.z });
    vanes.group.rotation.y = a;
    const hub = vanes.sub({ z: 0.42 });
    for (let v = 0; v < 4; v++) {
      const va = (v * TAU) / 4;
      hub.box(Math.sin(va) * 0.8, Math.cos(va) * 0.8 - 0.05, 0, 0.3, 0.1, 0.02, '#efe6d0', { rz: -va + Math.PI / 2, kind: 'cloth' });
    }
    hub.on((t) => (hub.group.rotation.z = t * 0.8 + k));
  }
  ctx.view.yaw = 0;
  ctx.view.elev = 0.38;
  ctx.view.ty = 2.6;
  ctx.view.dist = 30;
};

// ---------------------------------------------------------------- Zenobia
// On high pilings over dry ground: bamboo and zinc, ladders, hanging walkways, belvederes, tanks, vanes.
const zenobia: Gen = (b, ctx) => {
  b.ground(11.6, '#c8a878');
  for (let k = 0; k < 20; k++) rock(b, b.r(-10, 10), 0, b.r(-10, 10), b.r(0.2, 0.5), b.r(0.1, 0.3), b.r(0.2, 0.5), '#a88a64', 0);
  const bamboo = '#c8b070';
  const zinc = '#a8b0b8';
  const plats: THREE.Vector3[] = [];
  let tries = 0;
  while (plats.length < 15 && tries++ < 300) {
    const a = b.r(TAU);
    const r = Math.sqrt(b.r(1)) * 8.6;
    const p = V(Math.cos(a) * r, 2.2 + b.r(5.5), Math.sin(a) * r);
    if (plats.some((q) => Math.hypot(q.x - p.x, q.z - p.z) < 2.6)) continue;
    plats.push(p);
  }
  const vanes: B[] = [];
  plats.forEach((p, i) => {
    const w = 1.6 + b.r(1);
    const d = 1.4 + b.r(1);
    // pilings, slightly crooked
    for (const [sx, sz] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ]) {
      const bx = p.x + (sx * w) / 2.3;
      const bz = p.z + (sz * d) / 2.3;
      b.beam(V(bx + b.r(-0.15, 0.15), 0, bz + b.r(-0.15, 0.15)), V(bx, p.y, bz), 0.06, bamboo);
    }
    // cross bracing
    b.line(V(p.x - w / 2.3, 0.3, p.z - d / 2.3), V(p.x + w / 2.3, p.y * 0.6, p.z - d / 2.3), '#6a5030');
    b.line(V(p.x + w / 2.3, 0.3, p.z + d / 2.3), V(p.x - w / 2.3, p.y * 0.6, p.z + d / 2.3), '#6a5030');
    b.box(p.x, p.y, p.z, w, 0.1, d, '#9a7a4a');
    // shack of zinc or bamboo
    const sw = w * 0.65;
    const sh = 0.8 + b.r(0.6);
    const isZinc = i % 2 === 0;
    b.house(p.x - w * 0.12, p.z, sw, d * 0.7, sh, { y: p.y + 0.1, wall: isZinc ? zinc : bamboo, roof: isZinc ? '#8a949c' : '#7a6a3a', roofType: i % 3 === 0 ? 'cone' : 'gable', kind: isZinc ? 'metal' : 'solid', lit: 0.5 });
    // a balcony railing
    b.line(V(p.x - w / 2, p.y + 0.4, p.z + d / 2), V(p.x + w / 2, p.y + 0.4, p.z + d / 2), '#5a4030');
    // water tank on legs
    if (i % 3 === 1) {
      const tx = p.x + w * 0.32;
      b.cyl(tx, p.y + 0.6, p.z, 0.28, 0.6, '#7a6a5a', { seg: 10 });
      for (const o of [-0.2, 0.2]) b.beam(V(tx + o, p.y + 0.1, p.z), V(tx + o, p.y + 0.6, p.z), 0.03, '#5a4030');
    }
    // belvedere with conical roof
    if (i % 4 === 2) {
      const bx = p.x + w * 0.3;
      for (const [ox, oz] of [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]]) b.beam(V(bx + ox, p.y + 0.1, p.z + oz), V(bx + ox, p.y + 1.3, p.z + oz), 0.025, bamboo);
      b.cone(bx, p.y + 1.3, p.z, 0.5, 0.6, '#b04a32', { seg: 8 });
    }
    // weather vane
    if (i % 2 === 1) {
      const v = b.sub({ x: p.x - w * 0.12, y: p.y + 0.1 + sh + 0.7, z: p.z });
      v.cyl(0, 0, 0, 0.015, 0.6, '#3a3a3a', { seg: 4 });
      v.box(0.15, 0.5, 0, 0.35, 0.12, 0.01, '#c03a2a');
      vanes.push(v);
    }
    // jutting crane with pulley and a fishing pole
    if (i % 3 === 0) {
      const a = b.r(TAU);
      const end = V(p.x + Math.cos(a) * (w * 0.5 + 1.2), p.y + 1.2, p.z + Math.sin(a) * (d * 0.5 + 1.2));
      b.beam(V(p.x, p.y + 0.1, p.z), end, 0.04, '#7a5a3a');
      b.line(end, V(end.x, end.y - 1.6, end.z), '#d8d0c0');
      b.cyl(end.x, end.y - 1.85, end.z, 0.12, 0.25, '#6a5a4a', { seg: 6 });
    }
  });
  // ladders down to the ground and walkways between platforms
  plats.forEach((p, i) => {
    if (i % 2 === 0) ladder(b, V(p.x + 0.9, 0, p.z + 0.9), V(p.x + 0.6, p.y, p.z + 0.6), 0.3, '#6a5030');
    let best = -1;
    let bd = 1e9;
    plats.forEach((q, j) => {
      if (j <= i) return;
      const d = Math.hypot(q.x - p.x, q.z - p.z);
      if (d < bd) {
        bd = d;
        best = j;
      }
    });
    if (best >= 0 && bd < 5.5) {
      const q = plats[best];
      walkway(b, V(p.x, p.y + 0.1, p.z), V(q.x, q.y + 0.1, q.z), 0.35, 0.4, '#b89a62');
    }
  });
  b.on((t) => vanes.forEach((v, k) => (v.group.rotation.y = Math.sin(t * 0.4 + k) * 1.2 + t * 0.05)));
  // inhabitants high up
  for (let k = 0; k < 10; k++) {
    const p = plats[k % plats.length];
    b.figure(p.x + b.r(-0.5, 0.5), p.y + 0.1, p.z + b.r(-0.4, 0.4) + 0.3, 0.75, b.jit('#5a4a6a', 0.2, 0.3, 0.2));
  }
  ctx.view.elev = 0.34;
  ctx.view.ty = 4;
};

// ---------------------------------------------------------------- Armilla
// Nothing but pipes, rising where the walls should be, ending in taps, showers and tubs; nymphs bathe there.
const armilla: Gen = (b, ctx) => {
  b.ground(11.6, '#9c9488');
  // traces of foundations
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * TAU + 0.2;
    const r = 5 + (k % 3) * 1.6;
    b.box(Math.cos(a) * r, 0, Math.sin(a) * r, 2.4, 0.15, 2.0, '#b8b0a2', { ry: -a });
  }
  const copper = '#c88a5a';
  const lead = '#8a9098';
  const sprayFrom: THREE.Vector3[] = [];
  const porcelain = '#f6f4f0';
  const tub = (x: number, y: number, z: number, ry: number) => {
    b.box(x, y, z, 1.0, 0.42, 0.5, porcelain, { ry });
    b.box(x, y + 0.12, z, 0.85, 0.32, 0.36, '#6ab0d0', { ry, kind: 'water' });
    for (const [ox, oz] of [[-0.4, -0.18], [0.4, -0.18], [-0.4, 0.18], [0.4, 0.18]]) {
      const c = Math.cos(ry);
      const s = Math.sin(ry);
      b.sphere(x + c * ox + s * oz, y - 0.04, z - s * ox + c * oz, 0.06, '#d9a441', { kind: 'gold', seg: 5 });
    }
  };
  const basin = (x: number, y: number, z: number) => {
    b.lathe([[0, 0], [0.22, 0.02], [0.3, 0.18], [0.28, 0.2], [0.18, 0.06], [0, 0.05]], x, y, z, porcelain, { seg: 14 });
  };
  const shower = (x: number, y: number, z: number) => {
    b.cone(x, y - 0.18, z, 0.16, 0.2, '#c8ccd0', { kind: 'metal', seg: 10 });
    sprayFrom.push(V(x, y - 0.2, z));
  };
  for (let k = 0; k < 16; k++) {
    const a = b.r(TAU);
    const r = Math.sqrt(b.r(0.05, 1)) * 9.5;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const h = 2.5 + b.r(6);
    const mat = b.chance(0.5) ? copper : lead;
    b.cyl(x, 0, z, 0.08, h, mat, { kind: 'metal', seg: 8 });
    // branches at floor levels
    for (let f = 1.4; f < h; f += 1.5 + b.r(0.6)) {
      const ba = b.r(TAU);
      const len = 0.8 + b.r(1.2);
      const ex = x + Math.cos(ba) * len;
      const ez = z + Math.sin(ba) * len;
      b.beam(V(x, f, z), V(ex, f, ez), 0.06, mat, { kind: 'metal', seg: 6 });
      b.sphere(x, f, z, 0.1, mat, { kind: 'metal', seg: 6 });
      const kind = b.ri(0, 3);
      if (kind === 0) {
        b.beam(V(ex, f, ez), V(ex, f + 0.6, ez), 0.05, mat, { kind: 'metal' });
        shower(ex, f + 0.6, ez);
      } else if (kind === 1) {
        tub(ex, f - 0.42, ez, ba);
        b.box(ex, f - 0.62, ez, 0.08, 0.2, 0.08, mat, { kind: 'metal' });
      } else if (kind === 2) {
        basin(ex, f - 0.25, ez);
        b.box(ex, f - 0.12, ez, 0.04, 0.12, 0.04, '#d0d4d8', { kind: 'metal' });
      } else {
        b.box(ex, f - 0.1, ez, 0.05, 0.12, 0.05, '#d0d4d8', { kind: 'metal' });
        b.box(ex, f, ez + 0.06, 0.16, 0.03, 0.03, '#d9a441', { kind: 'gold' });
        sprayFrom.push(V(ex, f - 0.12, ez));
      }
    }
    // a valve wheel and a gauge
    b.torus(x, 0.9, z + 0.1, 0.14, 0.02, '#c03a2a', { seg: 10, tube: 4 });
  }
  // some tubs on the ground with nymphs
  const nymphs: THREE.Vector3[] = [];
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU + 0.4;
    const x = Math.cos(a) * 3.5;
    const z = Math.sin(a) * 3.5;
    tub(x, 0.05, z, -a);
    b.beam(V(x, 0, z + 0.4), V(x, 2.2, z + 0.4), 0.05, copper, { kind: 'metal' });
    b.beam(V(x, 2.2, z + 0.4), V(x, 2.2, z), 0.05, copper, { kind: 'metal' });
    shower(x, 2.2, z);
    nymphs.push(V(x, 0.22, z));
  }
  const ny = crowd(b, nymphs.length, () => '#f8e8f0', { kind: 'glow' });
  b.on((t) => {
    nymphs.forEach((p, i) => ny.set(i, p.x + Math.sin(t * 0.6 + i) * 0.15, p.y + Math.sin(t * 1.2 + i * 2) * 0.03, p.z, 0.75, t * 0.2 + i));
    ny.commit();
  });
  // water spray glittering
  const N = sprayFrom.length * 10;
  const pts: THREE.Vector3[] = Array.from({ length: N }, () => V(0, 0, 0));
  const seeds = Array.from({ length: N }, () => [b.r(1), b.r(-1, 1), b.r(-1, 1)]);
  const sp = animatedPoints(b, pts, () => '#bfe8ff', 0.16, () => 1.2);
  sp.on((t) => {
    const pos = sp.points?.geometry.attributes.position as THREE.BufferAttribute;
    if (!pos) return;
    for (let k = 0; k < N; k++) {
      const s = sprayFrom[k % sprayFrom.length];
      const [ph, dx, dz] = seeds[k];
      const u = (t * 0.9 + ph) % 1;
      pos.setXYZ(k, s.x + dx * u * 0.25, s.y - u * u * 2.0, s.z + dz * u * 0.25);
    }
    pos.needsUpdate = true;
  });
  ctx.view.elev = 0.35;
  ctx.view.ty = 3;
};

// ---------------------------------------------------------------- Sophronia
// Two half cities: the fair is permanent; the banks and schools are carted away each season.
const sophronia: Gen = (b, ctx) => {
  b.ground(11.6, '#9a9070');
  b.box(0, 0.01, 0, 0.2, 0.02, 22.6, '#e8d8b0');
  // ---- the permanent half: the fair (x < 0)
  // Ferris wheel
  const wx = -5.6;
  const wz = -3.2;
  const WR = 3.1;
  for (const o of [-0.5, 0.5]) {
    b.beam(V(wx - 1.6, 0, wz + o), V(wx, WR + 0.6, wz + o), 0.07, '#d0d4d8', { kind: 'metal' });
    b.beam(V(wx + 1.6, 0, wz + o), V(wx, WR + 0.6, wz + o), 0.07, '#d0d4d8', { kind: 'metal' });
  }
  const wheel = b.sub({ x: wx, y: WR + 0.6, z: wz });
  for (const o of [-0.35, 0.35]) wheel.torus(0, 0, o, WR, 0.05, '#e8e0d0', { seg: 40, tube: 4, kind: 'metal' });
  const cars = 12;
  for (let k = 0; k < cars; k++) {
    const a = (k / cars) * TAU;
    wheel.beam(V(0, 0, -0.35), V(Math.cos(a) * WR, Math.sin(a) * WR, -0.35), 0.025, '#e8e0d0', { kind: 'metal' });
    wheel.beam(V(0, 0, 0.35), V(Math.cos(a) * WR, Math.sin(a) * WR, 0.35), 0.025, '#e8e0d0', { kind: 'metal' });
    wheel.sphere(Math.cos(a) * WR, Math.sin(a) * WR, 0.36, 0.08, '#ffd27a', { kind: 'glow', i: 2, seg: 5 });
  }
  const cages = crowd(b, cars, (k) => ['#e04a3a', '#3a8ae0', '#f0c040', '#40b080'][k % 4]);
  wheel.on((t) => {
    const rot = t * 0.15;
    wheel.group.rotation.z = rot;
    for (let k = 0; k < cars; k++) {
      const a = (k / cars) * TAU + rot;
      cages.set(k, wx + Math.cos(a) * WR, WR + 0.6 + Math.sin(a) * WR - 0.75, wz, 1.4);
    }
    cages.commit();
  });
  // roller coaster: a closed loop of humps
  const track: THREE.Vector3[] = [];
  for (let k = 0; k < 60; k++) {
    const u = (k / 60) * TAU;
    const x = -5 + Math.cos(u) * 4.2;
    const z = 3.6 + Math.sin(u) * 2.6 + Math.sin(u * 3) * 0.5;
    const y = 1.2 + Math.max(0, Math.sin(u * 3)) * 2.6 + Math.sin(u) * 0.4;
    track.push(V(x, y, z));
  }
  b.tube(track, 0.07, '#e04a3a', { closed: true, seg: 180, kind: 'metal' });
  track.forEach((p, k) => {
    if (k % 3 === 0) b.beam(V(p.x, 0, p.z), p, 0.04, '#e8e0d0');
  });
  const coaster = crowd(b, 4, () => '#f0c040');
  const curve = new THREE.CatmullRomCurve3(track, true);
  b.on((t) => {
    for (let k = 0; k < 4; k++) {
      const u = (t * 0.07 - k * 0.012 + 10) % 1;
      const p = curve.getPoint(u);
      coaster.set(k, p.x, p.y + 0.06, p.z, 1.1);
    }
    coaster.commit();
  });
  // carousel
  const carousel = b.sub({ x: -1.9, z: -0.4 });
  carousel.cyl(0, 0, 0, 1.3, 0.2, '#e8d8b0', { seg: 16 });
  carousel.cyl(0, 0.2, 0, 0.12, 1.6, '#d9a441', { kind: 'gold', seg: 8 });
  carousel.cone(0, 1.8, 0, 1.45, 0.7, '#c03a4a', { seg: 16 });
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * TAU;
    carousel.beam(V(Math.cos(a) * 1.05, 0.2, Math.sin(a) * 1.05), V(Math.cos(a) * 1.05, 1.8, Math.sin(a) * 1.05), 0.02, '#d9a441', { kind: 'gold' });
    carousel.sphere(Math.cos(a) * 1.05, 0.7, Math.sin(a) * 1.05, 0.14, '#f4efe6', { sy: 0.7, sz: 1.6, ry: -a, seg: 6 });
    carousel.sphere(Math.cos(a) * 1.45, 1.75, Math.sin(a) * 1.45, 0.05, '#ffd27a', { kind: 'glow', i: 2, seg: 4 });
  }
  carousel.on((t) => (carousel.group.rotation.y = t * 0.6));
  // the globe of death with its crouching motorcyclist
  b.sphere(-8.6, 1.4, 0.8, 1.2, '#c8d0d8', { kind: 'glass', seg: 14 });
  b.cyl(-8.6, 0, 0.8, 0.6, 0.3, '#5a5a5a', { seg: 12 });
  const rider = b.sub({ x: -8.6, y: 1.4, z: 0.8 });
  rider.sphere(1.05, 0, 0, 0.12, '#ff5a2a', { kind: 'glow', i: 2, seg: 6 });
  rider.on((t) => {
    rider.group.rotation.y = t * 3.1;
    rider.group.rotation.z = Math.sin(t * 1.3) * 1.2;
  });
  // ---- the temporary half: banks, school, factories, slaughterhouse (x > 0), lifted away
  const lifted: B[] = [];
  const places: [number, number, number, number, number, string][] = [
    [3.2, -4.5, 2.2, 1.6, 2.2, 'bank'],
    [6.6, -3.0, 2.0, 1.8, 1.6, 'school'],
    [3.0, 0.4, 2.4, 1.8, 1.4, 'factory'],
    [7.0, 1.4, 2.0, 1.6, 2.6, 'palace'],
    [3.6, 4.6, 2.0, 1.6, 1.5, 'slaughterhouse'],
    [7.2, 5.4, 1.6, 1.4, 1.8, 'office'],
    [9.6, -1.0, 1.2, 1.4, 1.6, 'office'],
  ];
  places.forEach(([x, z, w, d, h, kind], i) => {
    b.box(x, 0, z, w + 0.4, 0.08, d + 0.4, '#7a7468');
    const s = b.sub({ x, z });
    s.box(0, 0, 0, w, h, d, kind === 'factory' ? '#8a7a6a' : '#d8d0c0');
    if (kind === 'bank' || kind === 'palace') {
      for (let c = 0; c < 5; c++) s.cyl(-w / 2 + 0.2 + c * ((w - 0.4) / 4), 0, d / 2 + 0.15, 0.08, h * 0.85, '#f0ebe0', { seg: 8 });
      s.prism(0, h, d / 2 * 0, w + 0.2, 0.5, d + 0.3, '#e8e0d0', { ry: Math.PI / 2 });
    } else if (kind === 'factory') {
      s.cyl(w / 3, h, 0, 0.15, 1.6, '#6a5a4a', { seg: 6 });
      for (let c = 0; c < 3; c++) s.prism(-w / 3 + c * (w / 3), h, 0, w / 3, 0.4, d, '#6a5a4a');
    } else s.box(0, h, 0, w + 0.1, 0.1, d + 0.1, '#a89a88');
    s.windows(0, 0, 0, w, d, h, 0, '#ffe2a0', 0.5);
    // crane cables
    s.line(V(-w / 2, h + 0.2, 0), V(0, h + 3.4, 0), '#3a3a3a');
    s.line(V(w / 2, h + 0.2, 0), V(0, h + 3.4, 0), '#3a3a3a');
    s.line(V(0, h + 3.4, 0), V(0, 14, 0), '#3a3a3a');
    s.group.userData.ph = i * 0.14;
    lifted.push(s);
  });
  // the crane arms
  for (const [x, z] of [[5.2, -1.5], [5.5, 3.5]]) {
    b.box(x, 0, z, 0.3, 9, 0.3, '#e0a030');
    b.box(x, 9, z, 6, 0.25, 0.3, '#e0a030');
  }
  b.on((t) => {
    for (const s of lifted) {
      const c = (t * 0.035 + s.group.userData.ph) % 1;
      const up = c < 0.15 ? 0 : c < 0.45 ? smooth((c - 0.15) / 0.3) : c < 0.7 ? 1 : 1 - smooth((c - 0.7) / 0.3);
      s.group.position.y = up * 6;
      s.group.rotation.y = Math.sin(t * 0.5 + s.group.userData.ph * 10) * 0.08 * up;
    }
  });
  ctx.view.yaw = 0.2;
  ctx.view.elev = 0.42;
  ctx.view.ty = 3;
};

// ---------------------------------------------------------------- Octavia
// The spider web city: a net over the abyss between two mountains, with everything hung beneath it.
const octavia: Gen = (b, ctx) => {
  // the abyss: dark, with mist far below
  b.ground(11.6, '#0c0a12', 0, 0.2);
  b.ring(0, 0.01, 0, 0, 7.5, '#05040a', { seg: 48 });
  // two steep mountains
  const cliff = '#7a6a5a';
  for (const s of [-1, 1]) {
    for (let k = 0; k < 7; k++) {
      rock(b, s * (8.6 + b.r(-0.3, 1.0)), b.r(0, 9), b.r(-5, 5), b.r(1.4, 2.2), b.r(2.0, 3.4), b.r(1.6, 2.6), b.jit(cliff, 0.02, 0.05, 0.08), 1, 0.3);
    }
    rock(b, s * 8.8, 10.5, 0, 2.2, 3.2, 3.0, '#8a7a68', 1, 0.3);
    rock(b, s * 8.9, 4, 0, 2.4, 5.5, 4.2, '#6a5c4e', 1, 0.25);
    // a little snow on the crests
    b.cone(s * 8.8, 12.6, 0, 1.0, 1.6, '#f0f0f4', { seg: 6 });
  }
  // the net: ropes and chains between the crests
  const NY = 9;
  const yNet = 9.2;
  const net = b.sub();
  const ropeCol = '#d8ccb0';
  const span = 12.4;
  for (let j = 0; j <= NY; j++) {
    const z = -6 + (j / NY) * 12;
    net.rope(V(-span / 2, yNet + 0.4, z), V(span / 2, yNet + 0.4, z), 1.0, ropeCol, 1.2, 16);
  }
  for (let i = 0; i <= 12; i++) {
    const x = -span / 2 + (i / 12) * span;
    const sag = Math.sin((i / 12) * Math.PI) * 1.0;
    net.line(V(x, yNet + 0.4 - sag, -6), V(x, yNet + 0.4 - sag, 6), ropeCol, 1.2);
  }
  // catwalks
  for (const z of [-2, 2]) walkway(net, V(-span / 2, yNet + 0.4, z), V(span / 2, yNet + 0.4, z), 1.0, 0.45, '#9a7a4a', '#d8ccb0');
  // hanging below: sack houses, hammocks, ladders, swings, gondola terraces, clothes hangers
  const hang = b.sub();
  const sagAt = (x: number) => Math.sin(((x + span / 2) / span) * Math.PI) * 1.0;
  for (let k = 0; k < 26; k++) {
    const x = b.r(-5.2, 5.2);
    const z = b.r(-5.5, 5.5);
    const top = yNet + 0.4 - sagAt(x);
    const kind = k % 6;
    const drop = 0.6 + b.r(2.6);
    hang.line(V(x, top, z), V(x, top - drop, z), '#a89a80');
    const y = top - drop;
    if (kind === 0 || kind === 1) {
      // sack house
      hang.sphere(x, y - 0.6, z, 0.55, b.jit('#c8a878', 0.03, 0.1, 0.1), { sy: 1.5, seg: 10, kind: 'cloth' });
      hang.box(x, y - 0.7, z + 0.5, 0.18, 0.24, 0.04, '#ffd27a', { kind: 'glow', i: 1.8 });
    } else if (kind === 2) {
      // hammock
      hang.line(V(x - 0.6, top, z), V(x - 0.6, y, z), '#a89a80');
      hang.rope(V(x - 0.6, y, z), V(x + 0.6, y, z), 0.25, '#e0c890', 1, 8);
      hang.sphere(x, y - 0.18, z, 0.3, '#e0c890', { sy: 0.3, sx: 2, seg: 8, kind: 'cloth' });
    } else if (kind === 3) {
      // rope ladder
      ladder(hang, V(x, top, z), V(x, top - 4.5, z), 0.3, '#c8b890', 0.25);
    } else if (kind === 4) {
      // gondola terrace
      hang.box(x, y - 0.2, z, 1.2, 0.12, 0.8, '#8a6a42');
      hang.line(V(x - 0.6, y, z - 0.4), V(x, top, z), '#a89a80');
      hang.line(V(x + 0.6, y, z + 0.4), V(x, top, z), '#a89a80');
      hang.figure(x, y - 0.14, z, 0.7, '#4a4a6a');
      hang.cyl(x + 0.4, y - 0.14, z, 0.1, 0.3, '#3a7a3a', { seg: 6 });
    } else {
      // swing / clothes hangers
      hang.box(x, y, z, 0.6, 0.05, 0.12, '#7a5a3a');
      for (let c = 0; c < 4; c++) hang.box(x - 0.24 + c * 0.16, y - 0.3, z, 0.12, 0.3, 0.01, ['#e04a3a', '#f0f0f0', '#3a6ae0', '#f0c040'][c], { kind: 'cloth' });
    }
  }
  hang.on((t) => {
    hang.group.rotation.x = Math.sin(t * 0.4) * 0.012;
    hang.group.position.y = Math.sin(t * 0.6) * 0.06;
    net.group.position.y = Math.sin(t * 0.6) * 0.05;
  });
  // clouds drifting through the abyss below
  const cl: THREE.Vector3[] = [];
  const cs: [number, number, number][] = [];
  for (let k = 0; k < 120; k++) {
    cs.push([b.r(1), b.r(-5, 5), b.r(0.5, 3)]);
    cl.push(V(0, 0, 0));
  }
  const clouds = animatedPoints(b, cl, () => '#e8e0f0', 2.4, () => 0.07);
  clouds.on((t) => {
    const pos = clouds.points?.geometry.attributes.position as THREE.BufferAttribute;
    if (!pos) return;
    for (let k = 0; k < cs.length; k++) {
      const [ph, z, y] = cs[k];
      const u = (t * 0.02 + ph) % 1;
      pos.setXYZ(k, -6 + u * 12, y + Math.sin(u * 6 + k) * 0.3, z + Math.sin(u * 3 + k) * 0.6);
    }
    pos.needsUpdate = true;
  });
  ctx.view.yaw = 0.25;
  ctx.view.elev = 0.22;
  ctx.view.ty = 6;
  ctx.view.dist = 30;
  void clamp;
};

export const thin: Record<string, Gen> = { isaura, zenobia, armilla, sophronia, octavia };
