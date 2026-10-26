import * as THREE from 'three';
import { B, TAU, V, clamp, smooth } from '../engine/kit';
import type { Gen } from './types';
import { animatedPoints, canvasTexture, crowd, postcardTexture } from './util';

// ---------------------------------------------------------------- Diomira
// Sixty silver domes, bronze gods, lead streets, a crystal theatre, a golden rooster;
// and the lamps of the fry shops kindling on a September evening.
const diomira: Gen = (b, ctx) => {
  b.ground(11.6, '#b9a98a');
  // lead streets: a cross and a ring
  b.box(0, 0, 0, 22, 0.03, 1.6, '#6d7177', { kind: 'metal' });
  b.box(0, 0, 0, 1.6, 0.03, 22, '#6d7177', { kind: 'metal' });
  b.ring(0, 0.035, 0, 5.2, 6.4, '#6d7177', { kind: 'metal' });

  // silver domes on drums, sixty of them
  let placed = 0;
  const spots: [number, number, number][] = [];
  for (let ring = 0; ring < 4; ring++) {
    const R = 3.4 + ring * 2.2;
    const n = [8, 14, 18, 20][ring];
    for (let k = 0; k < n; k++) {
      const a = (k / n) * TAU + ring * 0.3;
      const x = Math.cos(a) * R;
      const z = Math.sin(a) * R;
      if (Math.abs(x) < 1.2 || Math.abs(z) < 1.2) continue;
      if (Math.abs(Math.hypot(x, z) - 5.8) < 0.8) continue;
      spots.push([x, z, ring]);
    }
  }
  for (const [x, z, ring] of spots) {
    if (placed >= 60) break;
    const s = 0.55 + b.r(0.35) - ring * 0.04;
    const h = 0.8 + b.r(1.3) + (3 - ring) * 0.3;
    const wall = b.jit('#e9dcc2', 0.02, 0.05, 0.05);
    b.box(x, 0, z, s * 2, h, s * 2, wall, { ry: Math.atan2(x, z) });
    b.cyl(x, h, z, s * 0.85, 0.3, wall, { seg: 12 });
    b.dome(x, h + 0.3, z, s * 0.85, '#dfe5ee', { kind: 'metal', seg: 14 });
    b.cone(x, h + 0.3 + s * 0.8, z, 0.05, 0.4, '#dfe5ee', { kind: 'metal', seg: 4 });
    placed++;
  }
  // bronze statues of the gods at the crossings
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * TAU + TAU / 16;
    const x = Math.cos(a) * 5.8;
    const z = Math.sin(a) * 5.8;
    b.box(x, 0, z, 0.5, 0.5, 0.5, '#d8ccb0');
    b.figure(x, 0.5, z, 1.4, '#9a6a35', { kind: 'metal', head: '#9a6a35' });
  }
  // crystal theatre: a glass hemicycle
  const tx = 0;
  const tz = -2.6;
  for (let r = 0; r < 5; r++) {
    b.torus(tx, 0.18 + r * 0.22, tz, 1.1 + r * 0.32, 0.12, '#cfeaff', { kind: 'glass', arc: Math.PI, rx: Math.PI / 2, seg: 16, tube: 3 });
  }
  b.box(tx, 0, tz + 0.2, 2.2, 0.12, 0.9, '#e8f6ff', { kind: 'glass' });

  // the tower and its golden rooster
  b.box(2.4, 0, 2.4, 1.1, 7.5, 1.1, '#e6d6b8');
  b.box(2.4, 7.5, 2.4, 1.3, 0.25, 1.3, '#cdbd9f');
  for (let k = 0; k < 4; k++) b.arch(2.4 + Math.sin((k * TAU) / 4) * 0.5, 6.4, 2.4 + Math.cos((k * TAU) / 4) * 0.5, 0.6, 0.6, 0.12, '#cdbd9f', { ry: (k * TAU) / 4 });
  b.pyramid(2.4, 7.75, 2.4, 1.3, 1.4, 1.3, '#dfe5ee', { kind: 'metal' });
  const cock = b.sub({ x: 2.4, y: 9.15, z: 2.4 });
  cock.cyl(0, 0, 0, 0.03, 0.4, '#d9a441', { kind: 'gold', seg: 4 });
  cock.sphere(0, 0.55, 0, 0.18, '#e2b04a', { kind: 'gold', sy: 0.8, seg: 8 });
  cock.sphere(0.16, 0.72, 0, 0.09, '#e2b04a', { kind: 'gold', seg: 8 });
  cock.cone(0.25, 0.7, 0, 0.03, 0.08, '#d9a441', { kind: 'gold', rz: -Math.PI / 2, seg: 4 });
  cock.box(0.16, 0.8, 0, 0.1, 0.08, 0.02, '#c43a2a');
  cock.cone(-0.2, 0.5, 0, 0.13, 0.42, '#e2b04a', { kind: 'gold', rz: 0.9, seg: 6 });
  cock.on((t) => {
    cock.group.rotation.y = Math.sin(t * 0.3) * 0.8 + Math.sin(t * 1.3) * 0.1;
  });

  // fry shops with lamps over their doors that light up one by one at dusk
  const lamps: THREE.Vector3[] = [];
  const colors = ['#ff6a5a', '#ffd25a', '#7ad0ff', '#9aff8a', '#ff9ad8', '#ffb35a'];
  for (let k = 0; k < 26; k++) {
    const a = b.r(TAU);
    const R = b.r(2.2, 10.6);
    const x = Math.cos(a) * R;
    const z = Math.sin(a) * R;
    if (Math.abs(x) < 0.9 && Math.abs(z) < 0.9) continue;
    lamps.push(V(x, 0.9 + b.r(0.3), z));
  }
  animatedPoints(b, lamps, (i) => colors[i % colors.length], 0.9, (i, t, c) => {
    const cycle = (t * 0.06 + 0.3) % 1;
    const on = smooth(clamp((cycle - (0.05 + (i / lamps.length) * 0.5)) * 12, 0, 1));
    const fade = 1 - smooth(clamp((cycle - 0.88) * 10, 0, 1));
    const flick = 0.85 + 0.15 * Math.sin(t * 9 + i * 3);
    return on * fade * flick * 2.2;
  });
  ctx.view.elev = 0.55;
};

// ---------------------------------------------------------------- Isidora
// Spiral staircases studded with seashells, telescopes, violins; old men on the wall.
const isidora: Gen = (b) => {
  b.ground(11.6, '#c9b38f');
  // the square
  b.box(0, 0, 0.8, 7.5, 0.04, 6.5, '#e1d2b4');
  // the wall where the old men sit
  b.box(0, 0, -2.2, 6.8, 0.65, 0.55, '#bfa47c');
  for (let k = 0; k < 9; k++) {
    const x = -3 + k * 0.75 + b.r(-0.08, 0.08);
    b.cyl(x, 0.65, -2.2, 0.15, 0.32, b.jit('#5c5550', 0.02, 0.1, 0.1), { seg: 6, rt: 0.7 });
    b.sphere(x, 1.08, -2.2, 0.11, '#e8e4dc', { seg: 6 });
    b.box(x, 0.42, -1.92, 0.08, 0.26, 0.1, '#3a3430');
    b.cyl(x + 0.18, 0.0, -1.95, 0.02, 0.9, '#5a4231', { seg: 4, rz: 0.15 });
  }
  // houses with exterior spiral stairs and shells
  const shell = (x: number, y: number, z: number, s: number) => {
    for (let i = 0; i < 4; i++) b.sphere(x + Math.cos(i * 1.6) * s * (0.6 - i * 0.12), y + i * s * 0.25, z + Math.sin(i * 1.6) * s * (0.6 - i * 0.12), s * (0.42 - i * 0.08), '#f1c6b8', { seg: 6 });
  };
  const spiral = (cx: number, cz: number, y0: number, h: number, r: number) => {
    b.cyl(cx, y0, cz, 0.12, h + 0.6, '#d9c6a3', { seg: 8 });
    const steps = Math.floor(h / 0.16);
    for (let k = 0; k < steps; k++) {
      const a = k * 0.42;
      b.box(cx + Math.cos(a) * r * 0.55, y0 + k * 0.16, cz + Math.sin(a) * r * 0.55, r * 0.9, 0.06, 0.26, '#e8dcc2', { ry: -a });
      if (k % 3 === 0) shell(cx + Math.cos(a) * r, y0 + k * 0.16 + 0.32, cz + Math.sin(a) * r, 0.16);
    }
    shell(cx, y0 + h + 0.7, cz, 0.3);
  };
  const houses: [number, number, number, number, number][] = [];
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * TAU;
    const R = 7.2 + (k % 2) * 1.9;
    houses.push([Math.cos(a) * R, Math.sin(a) * R, 1.6 + b.r(0.6), 1.7 + b.r(0.5), 2 + b.r(2.5)]);
  }
  houses.forEach(([x, z, w, d, h], k) => {
    const ry = -Math.atan2(z, x) + Math.PI / 2;
    b.house(x, z, w, d, h, { ry, wall: b.jit('#e3c9a0'), roof: b.jit('#b46a48'), roofType: k % 4 === 0 ? 'flat' : 'hip', lit: 0.4 });
    if (k % 2 === 0) {
      const ox = x - Math.cos(ry) * (w / 2 + 0.6);
      const oz = z + Math.sin(ry) * (w / 2 + 0.6);
      spiral(ox, oz, 0, h, 0.9);
    }
    // telescopes on the roofs
    if (k % 3 === 1) {
      const tube = b.sub({ x, y: h + (k % 4 === 0 ? 0.1 : 0.5), z });
      tube.cyl(0, 0, 0, 0.03, 0.5, '#4a3a2a', { seg: 4 });
      tube.cyl(0, 0.5, 0, 0.08, 1.0, '#c9a44a', { kind: 'gold', seg: 8, rt: 0.6, rx: -0.9 });
      tube.on((t) => (tube.group.rotation.y = Math.sin(t * 0.1 + k) * 1.2));
    }
  });
  // violins hanging in a workshop arcade
  for (let k = 0; k < 6; k++) {
    const x = -2.5 + k;
    b.sphere(x, 1.4, 3.9, 0.14, '#9a4a20', { sy: 1.3, seg: 8 });
    b.sphere(x, 1.65, 3.9, 0.1, '#9a4a20', { sy: 1.2, seg: 8 });
    b.box(x, 1.7, 3.9, 0.04, 0.4, 0.04, '#2a1a10');
  }
  b.box(0, 0, 4.1, 7, 0.1, 0.9, '#cdb995');
  for (let k = 0; k < 8; k++) b.cyl(-3.2 + k * 0.92, 0, 4.45, 0.08, 2.1, '#e6d6b8', { seg: 8 });
  b.box(0, 2.1, 4.1, 7.2, 0.25, 1, '#b46a48');
  // the young walking by
  const W = 9;
  const cols = ['#3a6ab0', '#c0392b', '#e0a030', '#7a3aa0', '#2a9a7a', '#d0603a'];
  const young = crowd(b, W, (k) => cols[k % cols.length]);
    b.on((t) => {
    for (let k = 0; k < W; k++) {
      const a = t * (0.12 + (k % 3) * 0.03) * (k % 2 ? 1 : -1) + k * 0.7;
      young.set(k, Math.cos(a) * 3.1, 0.04, 1.0 + Math.sin(a) * 1.9, 1.1, -a);
    }
    young.commit();
  });
};



// ---------------------------------------------------------------- Zaira
// High bastions; a city made of the relations between its measures and its past.
const zaira: Gen = (b, ctx) => {
  b.ground(11.6, '#a99b80');
  // star fort: walls with arrow-head bastions
  const n = 6;
  const R = 9.2;
  const pts: THREE.Vector3[] = [];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * TAU;
    const a2 = ((k + 0.5) / n) * TAU;
    pts.push(V(Math.cos(a) * R, 0, Math.sin(a) * R));
    pts.push(V(Math.cos(a2) * (R + 2), 0, Math.sin(a2) * (R + 2)));
  }
  for (let k = 0; k < pts.length; k++) {
    const p = pts[k];
    const q = pts[(k + 1) % pts.length];
    const mid = p.clone().add(q).multiplyScalar(0.5);
    const len = p.distanceTo(q);
    const ang = Math.atan2(q.x - p.x, q.z - p.z);
    b.box(mid.x, 0, mid.z, 0.9, 3.4, len + 0.6, '#c4b291', { ry: ang });
    b.box(mid.x, 3.4, mid.z, 1.05, 0.2, len + 0.6, '#b09d7c', { ry: ang });
  }
  // inner city: houses on a grid with steps, railings and lampposts
  for (let i = -3; i <= 3; i++)
    for (let j = -3; j <= 3; j++) {
      if (Math.hypot(i, j) > 3.4 || (i === 0 && j === 0)) continue;
      if (b.chance(0.2)) continue;
      const x = i * 2.1 + b.r(-0.2, 0.2);
      const z = j * 2.1 + b.r(-0.2, 0.2);
      b.house(x, z, 1.3 + b.r(0.4), 1.3 + b.r(0.4), 1.4 + b.r(2.6), { wall: b.jit('#d9c7a5'), roof: b.jit('#7c8a90'), roofType: b.pick(['hip', 'gable', 'flat']), lit: 0.35 });
    }
  // central square with the gallows lamppost
  b.box(0, 0, 0, 3.2, 0.05, 3.2, '#d8cdb5');
  b.cyl(0.6, 0, 0.4, 0.06, 3.2, '#2b2b2e', { seg: 6, kind: 'metal' });
  b.box(0.35, 3.1, 0.4, 0.6, 0.06, 0.06, '#2b2b2e', { kind: 'metal' });
  b.sphere(0.6, 3.35, 0.4, 0.2, '#ffd890', { kind: 'glow', i: 2 });
  b.line(V(0.1, 3.1, 0.4), V(0.1, 2.3, 0.4), '#1a1a1a');
  b.cyl(0.1, 1.4, 0.4, 0.09, 0.6, '#2a2020', { seg: 6 });
  b.sphere(0.1, 2.1, 0.4, 0.08, '#2a2020', { seg: 6 });

  // memory threads: the measures of space tied to events
  const threads = b.sub({ unique: true });
  const gold = new THREE.Color(ctx.accent).multiplyScalar(1.4);
  const anchors: THREE.Vector3[] = [];
  for (let k = 0; k < 40; k++) {
    const a = b.r(TAU);
    const r = b.r(1, 10);
    anchors.push(V(Math.cos(a) * r, b.r(0.2, 4.5), Math.sin(a) * r));
  }
  for (let k = 0; k < anchors.length; k++) {
    const a = anchors[k];
    const c = anchors[(k * 7 + 3) % anchors.length];
    threads.line(a, c, gold, 1.2);
    // vertical measure from the ground with notches
    threads.line(V(a.x, 0, a.z), a, gold, 0.8);
    for (let y = 0.5; y < a.y; y += 0.5) threads.line(V(a.x - 0.12, y, a.z), V(a.x + 0.12, y, a.z), gold, 0.8);
  }
  threads.on((t) => {
    if (threads.lines) (threads.lines.material as THREE.LineBasicMaterial).opacity = 0.35 + 0.3 * Math.sin(t * 0.8);
  });
  ctx.view.elev = 0.62;
};

// ---------------------------------------------------------------- Zora
// A city learned by heart, cell by cell, which crumbled because it was not allowed to change.
const zora: Gen = (b, ctx) => {
  b.ground(11.6, '#bfb3a0');
  const cell = 5.6;
  const items: ((x: number, z: number) => void)[] = [
    // copper clock tower
    (x, z) => {
      b.box(x, 0, z, 1.2, 4.2, 1.2, '#c9b08a');
      b.cyl(x, 3.4, z + 0.62, 0.45, 0.06, '#c27a3a', { kind: 'metal', rx: Math.PI / 2, seg: 16 });
      b.box(x, 3.4, z + 0.66, 0.04, 0.35, 0.02, '#2a1a10');
      b.box(x + 0.1, 3.4, z + 0.66, 0.25, 0.04, 0.02, '#2a1a10');
      b.pyramid(x, 4.2, z, 1.4, 1, 1.4, '#c27a3a', { kind: 'metal' });
    },
    // barber's striped awning
    (x, z) => {
      b.house(x, z - 0.6, 2.4, 1.6, 1.8, { wall: '#e0d4be', roofType: 'flat', roof: '#a99' });
      for (let k = 0; k < 6; k++) b.box(x - 1 + k * 0.4, 1.35, z + 0.45, 0.4, 0.06, 0.9, k % 2 ? '#c0392b' : '#f4efe6', { rx: 0.35, kind: 'cloth' });
      b.cyl(x + 1.4, 0, z + 0.6, 0.08, 1.4, '#f4efe6', { seg: 8 });
      b.torus(x + 1.4, 0.7, z + 0.6, 0.09, 0.03, '#c0392b', { seg: 8 });
    },
    // fountain with nine jets
    (x, z) => {
      b.cyl(x, 0, z, 1.6, 0.4, '#d8ccb6', { seg: 20 });
      b.cyl(x, 0.3, z, 1.4, 0.12, '#2a5070', { seg: 20, kind: 'water' });
      const jets: THREE.Vector3[] = [];
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * TAU;
        for (let s = 0; s < 8; s++) {
          const u = s / 7;
          jets.push(V(x + Math.cos(a) * (0.2 + u * 1.0), 0.45 + Math.sin(u * Math.PI) * 1.1, z + Math.sin(a) * (0.2 + u * 1.0)));
        }
      }
      animatedPoints(b, jets, () => '#bfe6ff', 0.3, (i, t) => 0.6 + 0.4 * Math.sin(t * 6 - (i % 8)));
    },
    // the astronomer's glass tower
    (x, z) => {
      b.cyl(x, 0, z, 0.7, 4.6, '#cfe6ff', { kind: 'glass', seg: 8 });
      for (let y = 0.5; y < 4.6; y += 0.6) b.torus(x, y, z, 0.7, 0.03, '#8aa0b0', { rx: Math.PI / 2, kind: 'metal', seg: 8, tube: 3 });
      b.dome(x, 4.6, z, 0.75, '#cfe6ff', { kind: 'glass' });
      b.cyl(x, 4.4, z, 0.06, 1.1, '#c9a44a', { kind: 'gold', rx: -0.7, seg: 6 });
    },
    // melon seller's kiosk
    (x, z) => {
      b.box(x, 0, z, 1.6, 0.7, 1, '#8a6a42');
      for (let k = 0; k < 10; k++) b.sphere(x - 0.6 + (k % 5) * 0.3, 0.82, z - 0.2 + Math.floor(k / 5) * 0.35, 0.15, k % 3 ? '#9ab84a' : '#e8c060', { seg: 7, sy: 0.85 });
      for (const sx of [-0.75, 0.75]) b.cyl(x + sx, 0, z - 0.45, 0.04, 1.8, '#5a4231', { seg: 4 });
      b.prism(x, 1.8, z, 1.8, 0.4, 1.3, '#e8c890', { ry: Math.PI / 2, kind: 'cloth' });
    },
    // statue of the hermit and the lion
    (x, z) => {
      b.box(x, 0, z, 1.4, 0.8, 1, '#d8ccb6');
      b.figure(x - 0.3, 0.8, z, 1.8, '#cfc6b2', { head: '#cfc6b2' });
      b.sphere(x + 0.35, 1.05, z, 0.28, '#cfc6b2', { sy: 0.7, seg: 8 });
      b.sphere(x + 0.62, 1.2, z, 0.17, '#cfc6b2', { seg: 8 });
    },
    // the Turkish bath
    (x, z) => {
      b.box(x, 0, z, 2.6, 1.1, 2.2, '#efe6d6');
      b.dome(x, 1.1, z, 0.95, '#efe6d6', { seg: 14 });
      for (let k = 0; k < 7; k++) b.sphere(x + b.r(-0.6, 0.6), 1.6 + b.r(0.3), z + b.r(-0.6, 0.6), 0.05, '#fff2c0', { kind: 'glow', i: 1.5, seg: 4 });
    },
    // the cafe at the corner
    (x, z) => {
      b.house(x - 0.4, z - 0.7, 2, 1.4, 2.2, { wall: '#d6b98a', roofType: 'gable', roof: '#8a4a32' });
      for (let k = 0; k < 3; k++) {
        const tx = x - 1 + k * 0.9;
        b.cyl(tx, 0, z + 0.7, 0.25, 0.55, '#f4efe6', { seg: 10, rt: 1 });
        b.cyl(tx, 0, z + 0.7, 0.04, 0.55, '#2a2a2a', { seg: 4 });
        b.figure(tx + 0.35, 0, z + 0.7, 0.8, '#4a4a6a');
      }
    },
    // the lane down to the harbor
    (x, z) => {
      b.box(x, 0, z, 0.9, 0.06, 4.6, '#cfc2a6');
      for (let k = 0; k < 6; k++) {
        b.house(x - 1.1, z - 2 + k * 0.8, 0.9, 0.7, 1 + b.r(1.2), { wall: b.jit('#e3d2b0'), roof: '#9a5a3a', roofType: 'gable', win: false });
        b.house(x + 1.1, z - 2 + k * 0.8, 0.9, 0.7, 1 + b.r(1.2), { wall: b.jit('#e3d2b0'), roof: '#9a5a3a', roofType: 'gable', win: false });
      }
      b.box(x, 0, z + 2.6, 1.8, 0.05, 0.8, '#2a5070', { kind: 'water' });
    },
  ];
  // the grid of the memory palace
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) {
      const x = (i - 1) * cell;
      const z = (j - 1) * cell;
      b.box(x, 0, z, cell - 0.3, 0.06, cell - 0.3, (i + j) % 2 ? '#d8ceb8' : '#cdbfa4');
      // thin walls marking each cell
      b.box(x, 0, z - cell / 2 + 0.08, cell - 0.3, 0.35, 0.12, '#a89a80');
      b.box(x - cell / 2 + 0.08, 0, z, 0.12, 0.35, cell - 0.3, '#a89a80');
      items[i * 3 + j](x, z);
      // floating numeral of the order of remembrance
      b.box(x + cell / 2 - 0.5, 0.36, z - cell / 2 + 0.5, 0.25, 0.04, 0.25, ctx.accent, { kind: 'glow', i: 1.5 });
    }
  // the dust of a city that was not allowed to change
  const dust: THREE.Vector3[] = [];
  const seeds: [number, number, number][] = [];
  for (let k = 0; k < 260; k++) {
    seeds.push([b.r(-8, 8), b.r(-8, 8), b.r(1)]);
    dust.push(V(0, 0, 0));
  }
  const pts = animatedPoints(b, dust, () => '#e8dcc4', 0.18, () => 0.55);
  pts.on((t) => {
    const p = pts.points?.geometry.attributes.position as THREE.BufferAttribute;
    if (!p) return;
    for (let k = 0; k < seeds.length; k++) {
      const [x, z, ph] = seeds[k];
      const u = (t * 0.05 + ph) % 1;
      p.setXYZ(k, x + u * 4, u * 9, z - u * 2 + Math.sin(u * 8 + k) * 0.4);
    }
    p.needsUpdate = true;
  });
};

// ---------------------------------------------------------------- Maurilia
// The modern metropolis, and above it the postcards of the provincial town it replaced.
const maurilia: Gen = (b, ctx) => {
  b.ground(11.6, '#8d8f8e');
  // overpass and roads
  b.box(0, 0, 0, 23, 0.03, 2, '#3c3d42');
  b.box(0, 0, 0, 2, 0.03, 23, '#3c3d42');
  for (let k = -10; k <= 10; k += 1.2) b.box(k, 0.035, 0, 0.5, 0.01, 0.08, '#e8e0c0');
  const ov: THREE.Vector3[] = [];
  for (let k = 0; k <= 20; k++) {
    const u = k / 20;
    ov.push(V(-10 + u * 20, 1.8 + Math.sin(u * Math.PI) * 0.6, -5 + Math.sin(u * Math.PI * 1.2) * 2));
  }
  for (let k = 0; k < ov.length - 1; k++) {
    const p = ov[k];
    const q = ov[k + 1];
    const mid = p.clone().add(q).multiplyScalar(0.5);
    const ang = Math.atan2(q.x - p.x, q.z - p.z);
    b.box(mid.x, mid.y, mid.z, 1.6, 0.25, p.distanceTo(q) + 0.05, '#b8b4ac', { ry: ang, rx: -Math.atan2(q.y - p.y, Math.hypot(q.x - p.x, q.z - p.z)) });
    if (k % 3 === 0) b.box(p.x, 0, p.z, 0.3, p.y, 0.3, '#a8a49c');
  }
  // towers and blocks
  for (let k = 0; k < 34; k++) {
    const a = b.r(TAU);
    const r = b.r(2.2, 10.4);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (Math.abs(x) < 1.6 || Math.abs(z) < 1.6) continue;
    const h = 1.2 + b.r(5) * (1.2 - r / 12);
    const w = 0.9 + b.r(0.8);
    const tone = b.jit('#9aa3ad', 0.02, 0.06, 0.12);
    b.box(x, 0, z, w, h, w * (0.8 + b.r(0.4)), tone, { ry: b.chance(0.5) ? 0 : 0.1 });
    b.windows(x, 0, z, w, w * 0.9, h, 0, '#bfe3ff', 0.55, 0.12);
  }
  // the bus station where the hen once stood
  b.box(3.2, 0, 3.2, 2.6, 0.08, 1.6, '#c8c8c8');
  b.box(3.2, 1.3, 3.2, 3, 0.1, 1.9, '#d8d8d8', { kind: 'metal' });
  for (let k = 0; k < 4; k++) b.cyl(2 + k * 0.8, 0, 3.9, 0.05, 1.3, '#666', { seg: 4 });
  b.box(3, 0, 2.6, 2.2, 0.8, 0.7, '#d0a030');

  // the postcards
  const cards = b.sub();
  const N = 5;
  for (let k = 0; k < N; k++) {
    const tex = postcardTexture(k, b.rng);
    const m = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, transparent: true, opacity: 0.94, toneMapped: true, fog: true });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.4), m);
    const a = (k / N) * TAU;
    mesh.position.set(Math.cos(a) * 6.5, 8.5 + (k % 2) * 1.6, Math.sin(a) * 6.5);
    mesh.lookAt(0, 9, 0);
    mesh.rotateY(Math.PI);
    mesh.userData.base = mesh.position.y;
    mesh.userData.ph = k * 1.3;
    cards.group.add(mesh);
  }
  cards.on((t) => {
    cards.group.rotation.y = t * 0.03;
    for (const m of cards.group.children) m.position.y = m.userData.base + Math.sin(t * 0.5 + m.userData.ph) * 0.3;
  });
  // the ghost of the old town, faint and sepia, layered on the new
  for (let k = 0; k < 22; k++) {
    const a = b.r(TAU);
    const r = b.r(1, 9.5);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    b.box(x, 0, z, 1, 0.9, 0.8, '#7a5a30', { kind: 'ghost', ry: b.r(TAU) });
    b.prism(x, 0.9, z, 0.9, 0.5, 1.1, '#7a5a30', { kind: 'ghost', ry: b.r(TAU) });
  }
  b.dome(-1.6, 0, -1.6, 1.4, '#8a6a3a', { kind: 'ghost' });
  ctx.view.elev = 0.42;
  ctx.view.ty = 4.5;
  void canvasTexture;
};

export const memory: Record<string, Gen> = { diomira, isidora, zaira, zora, maurilia };
