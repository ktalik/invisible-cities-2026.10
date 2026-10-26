import * as THREE from 'three';
import { B, TAU, V, clamp, smooth } from '../engine/kit';
import type { Gen } from './types';
import { animatedPoints, crowd } from './util';

// ---------------------------------------------------------------- Dorothea
// Four aluminium towers, seven gates with spring drawbridges, a moat feeding four green canals,
// nine quarters of houses and chimneys.
const dorothea: Gen = (b, ctx) => {
  b.ground(11.6, '#8a8f70');
  b.ring(0, 0.01, 0, 9.7, 11.3, '#2c5a50', { kind: 'water' });
  b.ground(9.7, '#c0b08c', 0.02, 0.1);
  // the wall
  const RW = 9.2;
  b.cyl(0, 0, 0, RW + 0.35, 2.2, '#cbbd9c', { seg: 56, open: true });
  b.cyl(0, 0, 0, RW - 0.15, 2.2, '#bfb090', { seg: 56, open: true });
  b.ring(0, 2.2, 0, RW - 0.15, RW + 0.35, '#b8a888', { seg: 56 });
  // four green canals dividing the city into nine quarters
  const C = 2.6;
  for (const s of [-1, 1]) {
    b.box(s * C, 0.02, 0, 0.9, 0.06, RW * 2 - 0.2, '#3f8a5a', { kind: 'water' });
    b.box(0, 0.025, s * C, RW * 2 - 0.2, 0.06, 0.9, '#3f8a5a', { kind: 'water' });
  }
  // nine quarters of houses with chimneys
  const smokeSrc: THREE.Vector3[] = [];
  for (let qi = -1; qi <= 1; qi++)
    for (let qj = -1; qj <= 1; qj++) {
      const cx = qi * C * 2;
      const cz = qj * C * 2;
      for (let k = 0; k < 16; k++) {
        const x = cx + b.r(-1.9, 1.9);
        const z = cz + b.r(-1.9, 1.9);
        if (Math.hypot(x, z) > RW - 1) continue;
        if (Math.abs(Math.abs(x) - C) < 0.75 || Math.abs(Math.abs(z) - C) < 0.75) continue;
        const h = 0.6 + b.r(0.9);
        const w = 0.55 + b.r(0.35);
        b.house(x, z, w, w * 0.9, h, { wall: b.jit('#e2d3b2'), roof: b.jit('#a4553a'), roofType: 'hip', roofH: 0.3, lit: 0.25 });
        // chimneys, seven hundred of them, more or less
        for (let c = 0; c < 2; c++) {
          const ox = x + b.r(-w / 3, w / 3);
          const oz = z + b.r(-w / 3, w / 3);
          b.box(ox, h, oz, 0.08, 0.5, 0.08, '#6e5a4a');
          if (b.chance(0.25)) smokeSrc.push(V(ox, h + 0.55, oz));
        }
      }
    }
  // smoke
  const smoke: THREE.Vector3[] = [];
  const seeds: number[] = [];
  smokeSrc.forEach((p) => {
    for (let k = 0; k < 4; k++) {
      smoke.push(p.clone());
      seeds.push(b.r(1));
    }
  });
  const sm = animatedPoints(b, smoke, () => '#c8c0d0', 0.45, () => 0.12);
  sm.on((t) => {
    const pos = sm.points?.geometry.attributes.position as THREE.BufferAttribute;
    if (!pos) return;
    for (let k = 0; k < smoke.length; k++) {
      const src = smokeSrc[Math.floor(k / 4)];
      const u = (t * 0.12 + seeds[k]) % 1;
      pos.setXYZ(k, src.x + u * 0.8, src.y + u * 2.2, src.z + u * 0.3 + Math.sin(u * 6 + k) * 0.1);
    }
    pos.needsUpdate = true;
  });
  // four aluminium towers
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * TAU + TAU / 8;
    b.tower(Math.cos(a) * RW, Math.sin(a) * RW, 0.8, 5.6, '#cfd6de', { cap: 'cone', kind: 'metal', capColor: '#e4e9ef', win: true });
  }
  // seven gates and their drawbridges, which spring open and shut
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * TAU + 0.2;
    const x = Math.cos(a) * RW;
    const z = Math.sin(a) * RW;
    const ry = -a + Math.PI / 2;
    b.box(x, 0, z, 1.6, 2.7, 0.9, '#d8ccb0', { ry });
    b.box(x, 0, z, 0.9, 1.4, 1.0, '#2a2420', { ry });
    const bridge = b.sub({ x: Math.cos(a) * (RW + 0.5), y: 0.12, z: Math.sin(a) * (RW + 0.5) });
    bridge.group.rotation.y = ry;
    bridge.box(0, 0, 0.8, 0.85, 0.08, 1.6, '#7a5a3a');
    bridge.box(0, 0, 0.8, 0.95, 0.12, 0.1, '#5a4030');
    const ph = k * 0.9;
    bridge.on((t) => {
      const c = (t * 0.1 + ph / 7) % 1;
      const up = c < 0.5 ? smooth(clamp((c - 0.1) * 8, 0, 1)) : 1 - smooth(clamp((c - 0.6) * 8, 0, 1));
      // springs: a little overshoot
      const bounce = Math.sin(c * 60) * 0.05 * (1 - Math.abs(up - 0.5) * 2);
      bridge.group.rotation.x = -up * 1.35 + bounce;
    });
  }
  ctx.view.elev = 0.68;
};

// ---------------------------------------------------------------- Anastasia
// Concentric canals and kites; jewels in the ground; the city that enslaves its admirers.
const anastasia: Gen = (b, ctx) => {
  b.ground(11.6, '#b9a07a');
  const rings = [
    [2.6, 3.4],
    [5.6, 6.4],
    [8.6, 9.4],
  ];
  for (const [a, c] of rings) b.ring(0, 0.03, 0, a, c, '#2d6a7a', { kind: 'water', seg: 64 });
  // bridges across the rings
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU + 0.3;
    for (const [r0, r1] of rings) {
      const r = (r0 + r1) / 2;
      b.box(Math.cos(a) * r, 0, Math.sin(a) * r, 0.6, 0.18, r1 - r0 + 0.5, '#d8c8a8', { ry: -a + Math.PI / 2 + Math.PI / 2 });
    }
  }
  // houses on the ring islands
  const band = (r0: number, r1: number, n: number, hmax: number) => {
    for (let k = 0; k < n; k++) {
      const a = (k / n) * TAU + b.r(0.1);
      const r = b.r(r0 + 0.5, r1 - 0.5);
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (Math.abs(((a - 0.3) / (TAU / 6)) % 1) < 0.08) continue;
      b.house(x, z, 0.9 + b.r(0.4), 0.8 + b.r(0.3), 0.7 + b.r(hmax), {
        ry: -a,
        wall: b.jit(b.pick(['#e8c8a0', '#d89a7a', '#e6d6b0', '#c87a5a'])),
        roof: b.jit('#9a4a32'),
        roofType: b.pick(['hip', 'gable', 'dome']),
        lit: 0.35,
      });
    }
  };
  band(3.4, 5.6, 16, 1.6);
  band(6.4, 8.6, 26, 1.1);
  band(9.4, 11.4, 30, 0.6);
  // the jeweled garden in the middle: agate, onyx, chrysoprase
  b.cyl(0, 0, 0, 2.6, 0.1, '#5a8a4a', { seg: 32 });
  b.cyl(0, 0.08, 0, 1.0, 0.06, '#3a7aa0', { seg: 24, kind: 'water' });
  const oct = new THREE.OctahedronGeometry(1, 0);
  const gems = ['#c0603a', '#20202a', '#7ad0a0', '#e0a0c0', '#8a60c0'];
  for (let k = 0; k < 18; k++) {
    const a = b.r(TAU);
    const r = b.r(1.2, 2.4);
    const s = b.r(0.12, 0.3);
    const m = new THREE.Matrix4().compose(V(Math.cos(a) * r, s * 1.2, Math.sin(a) * r), new THREE.Quaternion().setFromEuler(new THREE.Euler(b.r(1), b.r(3), 0)), V(s, s * 1.6, s));
    b.add(oct, m, gems[k % gems.length], k % 3 === 0 ? 'glow' : 'metal', k % 3 === 0 ? 0.9 : 1);
  }
  // pheasants roasting on fires
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * TAU;
    const x = Math.cos(a) * 4.5;
    const z = Math.sin(a) * 4.5;
    b.cone(x, 0, z, 0.25, 0.3, '#ff8a3a', { kind: 'glow', i: 2, seg: 6 });
    b.beam(V(x - 0.4, 0.5, z), V(x + 0.4, 0.5, z), 0.02, '#3a2a1a');
    b.sphere(x, 0.5, z, 0.14, '#8a4a1a', { seg: 6, sy: 0.7 });
  }
  // the slaves of the city, bent over the agate
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * TAU + 0.15;
    const x = Math.cos(a) * 7.5;
    const z = Math.sin(a) * 7.5;
    b.box(x, 0, z, 0.35, 0.3, 0.25, '#7a6a5a', { ry: -a });
    b.cyl(x + Math.cos(a) * 0.3, 0, z + Math.sin(a) * 0.3, 0.1, 0.4, '#5a4a40', { seg: 5, rx: 0.5, ry: -a });
  }
  // kites
  const kiteCols = ['#e04a3a', '#f0c040', '#3a8ae0', '#e0e0e0', '#a04ae0', '#30b080'];
  const dia = new THREE.OctahedronGeometry(1, 0);
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * TAU + b.r(0.4);
    const r = b.r(3, 9);
    const kite = b.sub({ x: Math.cos(a) * r, y: 0, z: Math.sin(a) * r });
    const h = 7 + b.r(4);
    const off = 3 + b.r(2);
    const m = new THREE.Matrix4().compose(V(0, h, off), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.3, 0, 0)), V(0.5, 0.75, 0.03));
    kite.add(dia, m, kiteCols[k % kiteCols.length], 'cloth');
    kite.rope(V(0, 0.3, 0), V(0, h, off), 0.6, '#f4efe6', 0.6);
    // tail
    const tail: THREE.Vector3[] = [];
    for (let s = 0; s < 8; s++) tail.push(V(Math.sin(s) * 0.15, h - 0.75 - s * 0.3, off + s * 0.1));
    kite.polyline(tail, kiteCols[(k + 2) % kiteCols.length], 1.4);
    const ph = b.r(10);
    kite.group.rotation.y = b.r(TAU);
    kite.on((t) => {
      kite.group.rotation.x = Math.sin(t * 0.7 + ph) * 0.06;
      kite.group.rotation.z = Math.sin(t * 0.5 + ph * 2) * 0.08;
    });
  }
  ctx.view.elev = 0.6;
  ctx.view.dist = 34;
};

// ---------------------------------------------------------------- Despina
// Desert on one side, sea on the other. To the camel driver a ship; to the sailor a camel.
const despina: Gen = (b, ctx) => {
  // the sea half
  const sea = new THREE.CircleGeometry(11.6, 48, Math.PI / 2, Math.PI).rotateX(-Math.PI / 2);
  b.add(sea, new THREE.Matrix4().makeTranslation(0, 0.01, 0), '#245a78', 'water');
  // the desert half with dunes
  const desert = new THREE.CircleGeometry(11.6, 48, -Math.PI / 2, Math.PI).rotateX(-Math.PI / 2);
  b.add(desert, new THREE.Matrix4().makeTranslation(0, 0.01, 0), '#d8b07a');
  for (let k = 0; k < 14; k++) {
    const a = b.r(-Math.PI / 2 + 0.2, Math.PI / 2 - 0.2);
    const r = b.r(5, 10.5);
    b.sphere(Math.cos(a) * r, -0.2, -Math.sin(a) * r * 0 + Math.sin(a) * r, b.r(0.8, 1.6), b.jit('#dcb47e'), { sy: 0.35, seg: 10 });
  }
  // the city on the shoreline: a hull-shaped quay
  const hull = new THREE.Shape();
  hull.moveTo(-1.6, -4.5);
  hull.quadraticCurveTo(-2.4, 0, -1.6, 4.5);
  hull.lineTo(1.6, 4.5);
  hull.quadraticCurveTo(2.4, 0, 1.6, -4.5);
  hull.quadraticCurveTo(0, -6.2, -1.6, -4.5);
  b.extrude(hull, 0.9, new THREE.Matrix4().makeRotationX(-Math.PI / 2).premultiply(new THREE.Matrix4().makeTranslation(0, 0, 0)), '#c9a87a');
  // towers as masts with yards and rigging (seen from the desert)
  const masts: [number, number][] = [
    [0, -3.2],
    [0, -0.6],
    [0, 2.2],
  ];
  for (const [mx, mz] of masts) {
    const h = 7.5 - Math.abs(mz) * 0.5;
    b.cyl(mx, 0.9, mz, 0.12, h, '#e6dcc6', { seg: 6 });
    for (let y = 3; y < h; y += 1.6) b.box(mx, 0.9 + y, mz, 2.8 - y * 0.18, 0.08, 0.08, '#e6dcc6');
    b.cone(mx, 0.9 + h, mz, 0.1, 0.8, '#e6dcc6', { seg: 4 });
    // radar dish
    b.dome(mx + 0.3, 0.9 + h - 0.8, mz, 0.3, '#f0f0f0', { rz: -Math.PI / 2, kind: 'metal' });
    b.rope(V(mx, 0.9 + h, mz), V(-1.5, 0.9, mz - 2), 0.1, '#d8d0c0', 0.7);
    b.rope(V(mx, 0.9 + h, mz), V(1.5, 0.9, mz + 2), 0.1, '#d8d0c0', 0.7);
  }
  // windsocks
  for (const [x, z, h] of [
    [1.0, 4.0, 3.2],
    [-1.0, -4.4, 2.8],
  ] as [number, number, number][]) {
    b.cyl(x, 0.9, z, 0.04, h, '#ddd', { seg: 4 });
    const sock = b.sub({ x, y: 0.9 + h, z });
    sock.cone(0.6, 0, 0, 0.15, 1.1, '#ff6a3a', { rz: Math.PI / 2, kind: 'cloth', seg: 8 });
    sock.on((t) => (sock.group.rotation.y = Math.sin(t * 0.6 + x) * 0.5));
  }
  // domes as camel humps (seen from the sea)
  b.house(0.6, -1.9, 2.2, 1.6, 1.6, { y: 0.9, wall: '#e8d4b0', roofType: 'dome', roof: '#c88a4a', lit: 0.4 });
  b.house(0.6, 0.8, 2.2, 1.6, 1.4, { y: 0.9, wall: '#e8d4b0', roofType: 'dome', roof: '#c88a4a', lit: 0.4 });
  b.house(-0.7, 3.4, 1.4, 1.2, 1.0, { y: 0.9, wall: '#e6ceac', roofType: 'flat', roof: '#a87a4a', lit: 0.5 });
  b.house(-0.6, -0.6, 1.2, 1.4, 2.2, { y: 0.9, wall: '#e6ceac', roofType: 'flat', roof: '#a87a4a', lit: 0.5 });
  // saddle fringes: a striped awning
  for (let k = 0; k < 8; k++) b.box(1.7, 1.9, -3 + k * 0.5, 0.6, 0.04, 0.5, k % 2 ? '#c0392b' : '#f0c040', { rz: -0.4, kind: 'cloth' });

  // the caravan approaching over the dunes
  const camel = (s: B, x: number, z: number) => {
    s.sphere(x, 1.0, z, 0.45, '#b8865a', { sy: 0.6, seg: 8 });
    s.sphere(x, 1.35, z, 0.25, '#b8865a', { seg: 8 });
    s.beam(V(x + 0.35, 1.0, z), V(x + 0.6, 1.6, z), 0.08, '#b8865a');
    s.sphere(x + 0.7, 1.65, z, 0.12, '#b8865a', { sy: 0.8, seg: 6 });
    for (const [lx, lz] of [
      [0.25, 0.15],
      [0.25, -0.15],
      [-0.25, 0.15],
      [-0.25, -0.15],
    ])
      s.cyl(x + lx, 0, z + lz, 0.05, 0.85, '#a8764a', { seg: 4 });
  };
  const caravan = b.sub({ x: 6, z: 0 });
  for (let k = 0; k < 4; k++) camel(caravan, k * 1.3, k * 0.2);
  caravan.figure(-0.8, 0, 0.3, 1, '#f0e6d6');
  caravan.on((t) => {
    const u = (t * 0.03) % 1;
    caravan.group.position.set(9.5 - u * 4.5, 0, Math.sin(u * 3) * 1.2);
    caravan.group.rotation.y = Math.PI;
  });
  // the ship approaching from the sea
  const ship = b.sub({ x: -7, z: 3 });
  const shipHull = new THREE.Shape();
  shipHull.moveTo(-1.2, 0);
  shipHull.lineTo(1.4, 0);
  shipHull.lineTo(1.0, -0.5);
  shipHull.lineTo(-1.0, -0.5);
  shipHull.closePath();
  ship.extrude(shipHull, 0.8, new THREE.Matrix4().makeTranslation(0, 0.4, -0.4), '#6a4a30');
  ship.cyl(0, 0.4, 0, 0.05, 2.2, '#4a3a2a', { seg: 4 });
  ship.box(0.1, 1.0, 0, 0.04, 1.2, 1.3, '#f4efe6', { kind: 'cloth', ry: Math.PI / 2 });
  ship.on((t) => {
    ship.group.position.set(-8 + Math.sin(t * 0.05) * 1.5, Math.sin(t * 1.1) * 0.06, 3 + Math.cos(t * 0.05) * 2);
    ship.group.rotation.z = Math.sin(t * 0.9) * 0.05;
    ship.group.rotation.y = Math.PI / 2 + Math.sin(t * 0.05) * 0.3;
  });
  ctx.view.yaw = 0.9;
  ctx.view.elev = 0.38;
};

// ---------------------------------------------------------------- Fedora
// A gray stone metropolis around a metal museum; in each room a crystal globe holding a Fedora that might have been.
const fedora: Gen = (b, ctx) => {
  b.ground(11.6, '#7e7c7a');
  // the gray city
  for (let k = 0; k < 60; k++) {
    const a = b.r(TAU);
    const r = b.r(5.2, 11);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const w = 0.8 + b.r(0.9);
    const h = 0.8 + b.r(2.6);
    b.house(x, z, w, w * (0.7 + b.r(0.5)), h, { ry: -a, wall: b.jit('#9a9692', 0.01, 0.03, 0.1), roof: b.jit('#5e5c5a'), roofType: b.pick(['flat', 'hip', 'gable']), lit: 0.25 });
  }
  // the metal museum: an open frame of rooms
  const S = 1.6;
  const floors = 3;
  const cols = 3;
  const half = (cols * S) / 2;
  b.box(0, 0, 0, cols * S + 0.6, 0.3, cols * S + 0.6, '#5a5e66', { kind: 'metal' });
  for (let f = 0; f <= floors; f++) b.box(0, 0.3 + f * S, 0, cols * S + 0.2, 0.08, cols * S + 0.2, '#8a929c', { kind: 'metal' });
  for (let i = 0; i <= cols; i++)
    for (let j = 0; j <= cols; j++) b.box(-half + i * S, 0.3, -half + j * S, 0.08, floors * S, 0.08, '#8a929c', { kind: 'metal' });
  b.pyramid(0, 0.38 + floors * S, 0, cols * S + 0.2, 1.4, cols * S + 0.2, '#b8c2cc', { kind: 'metal' });
  // the globes and their small blue cities
  const mini = (cx: number, cy: number, cz: number, r: number, seed: number) => {
    const n = 5 + (seed % 6);
    for (let k = 0; k < n; k++) {
      const a = (k / n) * TAU + seed;
      const rr = (k % 2 ? 0.35 : 0.15) * r;
      const h = (0.2 + ((seed * 7 + k * 3) % 5) * 0.1) * r;
      const style = seed % 4;
      if (style === 0) b.box(cx + Math.cos(a) * rr, cy - r * 0.45, cz + Math.sin(a) * rr, 0.16 * r, h, 0.16 * r, '#3a7af0', { kind: 'glow', i: 0.9 });
      else if (style === 1) b.cone(cx + Math.cos(a) * rr, cy - r * 0.45, cz + Math.sin(a) * rr, 0.1 * r, h * 1.5, '#5a9aff', { kind: 'glow', i: 0.9, seg: 5 });
      else if (style === 2) b.dome(cx + Math.cos(a) * rr, cy - r * 0.45, cz + Math.sin(a) * rr, 0.12 * r, '#4a8aff', { kind: 'glow', i: 0.9, seg: 6 });
      else b.cyl(cx + Math.cos(a) * rr, cy - r * 0.45, cz + Math.sin(a) * rr, 0.06 * r, h * 1.8, '#6ab0ff', { kind: 'glow', i: 0.9, seg: 5 });
    }
    b.cyl(cx, cy - r * 0.5, cz, r * 0.7, 0.05 * r, '#2a4a9a', { kind: 'glow', i: 0.5, seg: 12 });
    b.sphere(cx, cy, cz, r, '#d8ecff', { kind: 'glass', seg: 16 });
    b.cyl(cx, cy - r - 0.12, cz, r * 0.35, 0.14, '#8a929c', { kind: 'metal', seg: 10 });
  };
  let seed = 1;
  for (let f = 0; f < floors; f++)
    for (let i = 0; i < cols; i++)
      for (let j = 0; j < cols; j++) {
        if (f > 0 && i === 1 && j === 1) continue;
        mini(-half + (i + 0.5) * S, 0.38 + f * S + 0.75, -half + (j + 0.5) * S, 0.5, seed++);
      }
  // a few more globes in the square outside
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU;
    mini(Math.cos(a) * 4.2, 0.9, Math.sin(a) * 4.2, 0.65, seed++);
  }
  // visitors
  for (let k = 0; k < 12; k++) {
    const a = b.r(TAU);
    b.figure(Math.cos(a) * b.r(3.4, 4.8), 0, Math.sin(a) * b.r(3.4, 4.8), 0.9, b.jit('#4a4a5a', 0.1, 0.2, 0.2));
  }
  ctx.view.elev = 0.45;
  ctx.view.dist = 26;
  ctx.view.ty = 3;
};

// ---------------------------------------------------------------- Zobeide
// A white city of streets wound like a skein, built to trap a woman seen in a dream.
const zobeide: Gen = (b, ctx) => {
  b.ground(11.6, '#d8dce6');
  // maze on a square grid clipped to a circle
  const N = 11;
  const cs = 1.85;
  const half = (N * cs) / 2;
  const inside = (i: number, j: number) => Math.hypot((i + 0.5) * cs - half, (j + 0.5) * cs - half) < 10.2;
  const visited = new Set<string>();
  const key = (i: number, j: number) => `${i},${j}`;
  // walls[i][j] = [east, south]
  const east: boolean[][] = Array.from({ length: N }, () => Array(N).fill(true));
  const south: boolean[][] = Array.from({ length: N }, () => Array(N).fill(true));
  const stack: [number, number][] = [[5, 5]];
  visited.add(key(5, 5));
  const path: [number, number][] = [[5, 5]];
  while (stack.length) {
    const [i, j] = stack[stack.length - 1];
    const nb = (
      [
        [i + 1, j],
        [i - 1, j],
        [i, j + 1],
        [i, j - 1],
      ] as [number, number][]
    ).filter(([a, c]) => a >= 0 && c >= 0 && a < N && c < N && inside(a, c) && !visited.has(key(a, c)));
    if (!nb.length) {
      stack.pop();
      if (stack.length) path.push(stack[stack.length - 1]);
      continue;
    }
    const [a, c] = nb[Math.floor(b.rng() * nb.length)];
    if (a > i) east[i][j] = false;
    if (a < i) east[a][c] = false;
    if (c > j) south[i][j] = false;
    if (c < j) south[a][c] = false;
    visited.add(key(a, c));
    stack.push([a, c]);
    path.push([a, c]);
  }
  const wallH = 1.3;
  for (let i = 0; i < N; i++)
    for (let j = 0; j < N; j++) {
      if (!inside(i, j)) continue;
      const x = (i + 0.5) * cs - half;
      const z = (j + 0.5) * cs - half;
      const white = b.jit('#f2f2f6', 0.01, 0.02, 0.03);
      if (east[i][j] && (i === N - 1 || inside(i + 1, j) || true)) b.box(x + cs / 2, 0, z, 0.32, wallH + (b.chance(0.25) ? 1.0 : 0), cs + 0.32, white);
      if (south[i][j]) b.box(x, 0, z + cs / 2, cs + 0.32, wallH + (b.chance(0.25) ? 1.0 : 0), 0.32, white);
      if (b.chance(0.12)) b.dome(x + cs / 2, wallH, z + cs / 2, 0.45, '#f8f8fb', { seg: 10 });
      if (b.chance(0.08)) b.box(x + cs / 2 - 0.1, wallH, z + cs / 2 - 0.1, 0.12, 0.6, 0.12, '#ffe2a8', { kind: 'glow', i: 1.2 });
    }
  // outer white wall
  b.cyl(0, 0, 0, 10.8, 1.6, '#eef0f4', { seg: 64, open: true });
  b.cyl(0, 0, 0, 10.5, 1.6, '#e4e6ec', { seg: 64, open: true });
  // a minaret or two, and the moonlit domes
  b.tower(-0.4, -0.4, 0.4, 5, '#f4f4f8', { cap: 'spire' });
  b.dome(3.7, 0, 3.7, 1.3, '#fafafe', { seg: 18 });
  // men who came with the same dream wait at the corners
  for (let k = 0; k < 14; k++) {
    const [i, j] = path[Math.floor(b.r(path.length))];
    b.figure((i + 0.5) * cs - half + 0.4, 0, (j + 0.5) * cs - half + 0.4, 0.9, '#2a2a3a');
  }
  // the woman of the dream, running, always escaping
  const runner = crowd(b, 6, () => '#fff4e0', { kind: 'glow' });
  const pts = path.map(([i, j]) => V((i + 0.5) * cs - half, 0.05, (j + 0.5) * cs - half));
  b.on((t) => {
    for (let k = 0; k < 6; k++) {
      const u = (t * 0.9 - k * 0.18) % pts.length;
      const uu = u < 0 ? u + pts.length : u;
      const i0 = Math.floor(uu);
      const f = uu - i0;
      const p = pts[i0];
      const q = pts[(i0 + 1) % pts.length];
      runner.set(k, p.x + (q.x - p.x) * f, 0.05, p.z + (q.z - p.z) * f, k === 0 ? 1.8 : 1.5 - k * 0.22);
    }
    runner.commit();
  });
  // the trail she leaves fades
  ctx.view.elev = 0.85;
  ctx.view.dist = 30;
};

export const desire: Record<string, Gen> = { dorothea, anastasia, despina, fedora, zobeide };
