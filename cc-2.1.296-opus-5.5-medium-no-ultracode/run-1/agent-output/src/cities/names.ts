import * as THREE from 'three';
import { B, TAU, V, clamp, smooth } from '../engine/kit';
import type { Gen } from './types';
import { animatedPoints, crowd, rock, wordSprite } from './util';

// ---------------------------------------------------------------- Aglaura
// The city that is spoken of has everything needed to exist; the city that stands there has less.
const aglaura: Gen = (b, ctx) => {
  b.ground(11.6, '#9a9078');
  // the actual town: modest, uncertain
  for (let k = 0; k < 26; k++) {
    const a = b.r(TAU);
    const r = Math.sqrt(b.r(1)) * 5.5;
    b.house(Math.cos(a) * r, Math.sin(a) * r, 0.7 + b.r(0.4), 0.7 + b.r(0.4), 0.5 + b.r(0.7), { ry: b.r(TAU), wall: b.jit('#b8ac98', 0.02, 0.05, 0.06), roof: b.jit('#7a6a5a'), roofType: 'gable', lit: 0.25 });
  }
  b.tower(0.4, 0.3, 0.25, 1.6, '#b8ac98', { cap: 'cone', capColor: '#7a6a5a' });
  // the city that is spoken of: grand, luminous, made of reputation
  const legend = b.sub({ unique: true });
  const gc = new THREE.Color(ctx.accent);
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * TAU;
    const r = 8.2;
    legend.tower(Math.cos(a) * r, Math.sin(a) * r, 0.7, 6 + (k % 3) * 2, gc, { cap: k % 2 ? 'spire' : 'dome', kind: 'ghost', capKind: 'ghost' });
  }
  legend.cyl(0, 0, 0, 8.2, 3.2, gc, { seg: 40, open: true, kind: 'ghost' });
  legend.dome(0, 4, 0, 4.5, gc, { kind: 'ghost', seg: 24 });
  legend.cyl(0, 0, 0, 4.4, 4, gc, { seg: 24, open: true, kind: 'ghost' });
  legend.cone(0, 8.4, 0, 0.5, 3.5, gc, { kind: 'ghost', seg: 8 });
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * TAU;
    legend.arch(Math.cos(a) * 6.3, 0, Math.sin(a) * 6.3, 1.2, 2.2, 0.3, gc, { ry: -a + Math.PI / 2, kind: 'ghost' });
  }
  legend.mats.ghost.opacity = 0.14;
  legend.on((t) => {
    legend.mats.ghost.opacity = 0.075 + 0.05 * Math.sin(t * 0.35);
  });
  // proverbial virtues and proverbial faults, repeated for centuries
  const words = ['proud', 'thrifty', 'devout', 'quarrelsome', 'hospitable', 'idle', 'just', 'envious', 'learned', 'superstitious'];
  const sprites = words.map((w, i) => {
    const s = wordSprite(w, i % 2 ? '#d8c8ff' : '#fff0d0', 0.95);
    b.group.add(s);
    s.userData.a = (i / words.length) * TAU;
    return s;
  });
  b.on((t) => {
    sprites.forEach((s, i) => {
      const a = s.userData.a + t * 0.05;
      s.position.set(Math.cos(a) * 9.6, 4.5 + Math.sin(t * 0.4 + i) * 0.6 + (i % 3) * 0.9, Math.sin(a) * 9.6);
    });
  });
  ctx.view.elev = 0.38;
  ctx.view.ty = 3;
};

// ---------------------------------------------------------------- Leandra
// Two species of tiny gods: one follows the families, the other stays with the houses.
const leandra: Gen = (b, ctx) => {
  b.ground(11.6, '#a89a7a');
  const homes: THREE.Vector3[] = [];
  for (let k = 0; k < 18; k++) {
    const a = (k / 18) * TAU + b.r(0.15);
    const r = k % 2 ? 7.8 : 4.4;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    b.house(x, z, 1.4, 1.2, 1.2 + b.r(0.6), { ry: -a, wall: b.jit('#e6d4b4'), roof: b.jit('#a05a3a'), roofType: 'gable', lit: 0.6 });
    b.box(x + 0.3, 1.6, z, 0.18, 0.7, 0.18, '#7a5a4a');
    homes.push(V(x, 0, z));
  }
  b.cyl(0, 0, 0, 1.8, 0.1, '#d8ccb0', { seg: 20 });
  b.cyl(0, 0.1, 0, 0.5, 0.8, '#d8ccb0', { seg: 10 });
  // Lares: the gods of the houses, who stay in the kitchens and chimney flues, flickering blue
  const lares: THREE.Vector3[] = [];
  homes.forEach((h) => {
    for (let k = 0; k < 7; k++) lares.push(V(h.x + b.r(-0.9, 0.9), 0.3 + b.r(1.9), h.z + b.r(-0.9, 0.9)));
  });
  animatedPoints(b, lares, () => '#7ad8ff', 0.5, (i, t) => 0.8 + 0.7 * Math.sin(t * 3 + i * 2.1));
  // Penates: the gods of the families, who follow them when they move; and the families moving
  const FAM = 5;
  const fam = crowd(b, FAM * 3, (i) => ['#6a3a3a', '#3a4a6a', '#4a6a3a'][i % 3]);
  const pen: THREE.Vector3[] = Array.from({ length: FAM * 6 }, () => V(0, 0, 0));
  const penates = animatedPoints(b, pen, () => '#ffc860', 0.55, (i, t) => 1.2 + 0.4 * Math.sin(t * 5 + i));
  const routes = Array.from({ length: FAM }, (_, f) => [homes[(f * 7) % homes.length], homes[(f * 7 + 5) % homes.length]]);
  b.on((t) => {
    const pos = penates.points?.geometry.attributes.position as THREE.BufferAttribute;
    for (let f = 0; f < FAM; f++) {
      const [a, c] = routes[f];
      const cyc = (t * 0.05 + f * 0.2) % 2;
      const u = smooth(clamp(cyc < 1 ? cyc * 1.4 - 0.2 : (2 - cyc) * 1.4 - 0.2, 0, 1));
      const x = a.x + (c.x - a.x) * u;
      const z = a.z + (c.z - a.z) * u;
      for (let m = 0; m < 3; m++) fam.set(f * 3 + m, x + (m - 1) * 0.3, 0.02, z + Math.sin(m) * 0.3, m === 2 ? 0.7 : 1);
      if (pos) for (let g = 0; g < 6; g++) pos.setXYZ(f * 6 + g, x + Math.sin(t * 2 + g * 1.1) * 0.5, 0.8 + Math.sin(t * 3 + g) * 0.3, z + Math.cos(t * 2 + g * 1.1) * 0.5);
    }
    fam.commit();
    if (pos) pos.needsUpdate = true;
  });
  ctx.view.elev = 0.5;
};

// ---------------------------------------------------------------- Pyrrha
// For years a fortress on a hill above a bay; in fact a low town on a plain. The real one has erased the dream.
const pyrrha: Gen = (b, ctx) => {
  b.ground(11.6, '#b0a07c');
  // the real Pyrrha: a low sprawl, windows on alleys, walls without towers
  for (let k = 0; k < 70; k++) {
    const x = b.r(-10, 10);
    const z = b.r(-10, 10);
    if (Math.hypot(x, z) > 10.4) continue;
    b.house(x, z, 0.7 + b.r(0.6), 0.7 + b.r(0.6), 0.4 + b.r(0.5), { ry: Math.round(b.r(4)) * (Math.PI / 2), wall: b.jit('#d8c4a0', 0.02, 0.06, 0.06), roof: b.jit('#b8783a'), roofType: 'flat', lit: 0.3 });
  }
  b.cyl(0, 0, 0, 10.9, 0.6, '#c8b490', { seg: 48, open: true });
  // the imagined Pyrrha: a goblet-shaped fortress on a hill above a bay, fading
  const dream = b.sub({ unique: true });
  const gc = new THREE.Color(ctx.accent);
  dream.lathe([[0, 0], [5.4, 0], [4.4, 1.5], [3.0, 3.4], [2.6, 4.2], [0, 4.2]], 0, 0, 0, gc, { seg: 24, kind: 'ghost' });
  dream.cyl(0, 4.2, 0, 2.8, 1.6, gc, { seg: 24, open: true, kind: 'ghost' });
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * TAU;
    dream.tower(Math.cos(a) * 2.8, Math.sin(a) * 2.8, 0.35, 2.6, gc, { y: 4.2, cap: 'crenel', kind: 'ghost', capKind: 'ghost' });
  }
  dream.tower(0, 0, 0.5, 4, gc, { y: 4.2, cap: 'cone', kind: 'ghost', capKind: 'ghost' });
  // the bay that was never there
  dream.disc(-6, 0.05, 5, 3.5, '#4a8ac0', { kind: 'ghost', seg: 24 });
  dream.on((t) => {
    const c = (t * 0.05) % 1;
    dream.mats.ghost.opacity = 0.22 * (0.5 + 0.5 * Math.cos(c * TAU));
  });
  ctx.view.elev = 0.4;
  ctx.view.ty = 2.5;
};

// ---------------------------------------------------------------- Clarice
// Rebuilt many times from its own fragments; capitals become hen coops, tombs become planters.
const clarice: Gen = (b, ctx) => {
  b.ground(11.6, '#b8aa8a');
  // instanced fragments that travel between two arrangements: the glorious and the makeshift
  const drumGeo = new THREE.CylinderGeometry(0.28, 0.3, 1.1, 10).translate(0, 0.55, 0);
  const capGeo = new THREE.BoxGeometry(0.8, 0.32, 0.8).translate(0, 0.16, 0);
  const blockGeo = new THREE.BoxGeometry(1.4, 0.5, 0.7).translate(0, 0.25, 0);
  const marble = new THREE.MeshStandardMaterial({ color: '#efe8dc', roughness: 0.55 });
  const mk = (geo: THREE.BufferGeometry, n: number) => {
    const m = new THREE.InstancedMesh(geo, marble, n);
    m.castShadow = true;
    m.receiveShadow = true;
    b.group.add(m);
    return m;
  };
  const NC = 16;
  const drums = mk(drumGeo, NC * 3);
  const caps = mk(capGeo, NC);
  const blocks = mk(blockGeo, 12);
  type P = { a: THREE.Vector3; ra: number; b: THREE.Vector3; rb: number; rxb: number };
  const dp: P[] = [];
  const cp: P[] = [];
  const bp: P[] = [];
  // arrangement A: a colonnaded temple
  for (let i = 0; i < NC; i++) {
    const side = i < 8 ? -1 : 1;
    const k = i % 8;
    const ax = -4.9 + k * 1.4;
    const az = side * 2.6;
    for (let d = 0; d < 3; d++) {
      const bx = b.r(-9, 9);
      const bz = b.r(-9, 9) * 0.9;
      const lying = b.chance(0.5);
      dp.push({ a: V(ax, 0.5 + d * 1.1, az), ra: 0, b: V(bx, lying ? 0.3 : 0, bz), rb: b.r(TAU), rxb: lying ? Math.PI / 2 : 0 });
    }
    cp.push({ a: V(ax, 0.5 + 3.3, az), ra: 0, b: V(b.r(-8, 8), 0.0, b.r(-8, 8)), rb: b.r(TAU), rxb: 0 });
  }
  for (let i = 0; i < 12; i++) {
    const ax = -4.9 + (i % 6) * 1.96;
    const az = i < 6 ? -2.6 : 2.6;
    bp.push({ a: V(ax, 4.12, az), ra: Math.PI / 2, b: V(b.r(-8, 8), 0, b.r(-8, 8)), rb: b.r(TAU), rxb: 0 });
  }
  // the static parts: a stylobate in the glorious age, hen coops and planters in the makeshift
  const base = b.sub({ unique: true });
  base.box(0, 0, 0, 11.6, 0.5, 6.6, '#e4dccc');
  const coops = b.sub({ unique: true });
  for (let k = 0; k < 6; k++) {
    const x = b.r(-8, 8);
    const z = b.r(-8, 8);
    coops.box(x, 0, z, 1.1, 0.6, 0.8, '#8a6a42');
    coops.prism(x, 0.6, z, 1.2, 0.4, 0.9, '#6a5a3a', { ry: Math.PI / 2 });
    coops.sphere(x + 0.7, 0.18, z, 0.15, '#f4f0e8', { seg: 6 });
  }
  for (let k = 0; k < 5; k++) {
    const x = b.r(-8, 8);
    const z = b.r(-8, 8);
    coops.box(x, 0, z, 1.4, 0.5, 0.6, '#d8d0c0');
    for (let f = 0; f < 4; f++) coops.sphere(x - 0.5 + f * 0.33, 0.6, z, 0.18, b.pick(['#e04a5a', '#f0c040', '#4a8a3a']), { seg: 6 });
  }
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const one = V(1, 1, 1);
  const place = (mesh: THREE.InstancedMesh, list: P[], u: number, stagger: number) => {
    list.forEach((p, i) => {
      const uu = smooth(clamp(u * 1.6 - (i / list.length) * 0.6 * stagger, 0, 1));
      const pos = p.a.clone().lerp(p.b, uu);
      pos.y += Math.sin(uu * Math.PI) * 2.0;
      e.set(p.rxb * uu, p.ra + (p.rb - p.ra) * uu, 0);
      q.setFromEuler(e);
      m4.compose(pos, q, one);
      mesh.setMatrixAt(i, m4);
    });
    mesh.instanceMatrix.needsUpdate = true;
  };
  b.on((t) => {
    // a slow cycle of decline and splendor
    const c = (t * 0.03) % 1;
    const u = c < 0.35 ? 0 : c < 0.5 ? (c - 0.35) / 0.15 : c < 0.85 ? 1 : 1 - (c - 0.85) / 0.15;
    place(drums, dp, u, 1);
    place(caps, cp, u, 1);
    place(blocks, bp, u, 1);
    base.group.scale.y = Math.max(0.01, 1 - u);
    base.group.visible = u < 0.99;
    coops.group.scale.setScalar(Math.max(0.01, u));
    coops.group.visible = u > 0.01;
  });
  ctx.view.elev = 0.45;
  ctx.view.ty = 2;
};

// ---------------------------------------------------------------- Irene
// Seen from the edge of the plateau at nightfall: a rose of lights in the valley. Go down, and it is another city.
const irene: Gen = (b, ctx) => {
  b.ground(11.6, '#2a2830');
  // the plateau on the near side: a circular segment of rock rising above the valley
  const z0 = 6.2;
  const seg = new THREE.Shape();
  const a0 = Math.asin(z0 / 11.6);
  seg.moveTo(Math.cos(a0) * 11.6, z0);
  for (let k = 0; k <= 24; k++) {
    const a = a0 + (k / 24) * (Math.PI - 2 * a0);
    seg.lineTo(Math.cos(a) * 11.6, Math.sin(a) * 11.6);
  }
  seg.lineTo(-Math.cos(a0) * 11.6, z0);
  for (let x = -Math.cos(a0) * 11.6; x < Math.cos(a0) * 11.6; x += 0.8) seg.lineTo(x, z0 - 0.3 + Math.sin(x * 1.7) * 0.3);
  seg.closePath();
  b.extrude(seg, 3.6, new THREE.Matrix4().makeTranslation(0, 3.6, 0).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)), '#3e342e');
  b.extrude(seg, 0.12, new THREE.Matrix4().makeTranslation(0, 3.72, 0).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)), '#4a5a3a');
  for (let k = 0; k < 7; k++) rock(b, -7.5 + k * 2.5, 0.8, z0 + 0.3, 1.2, 1.6, 0.8, b.jit('#4a3e38', 0.02, 0.05, 0.05), 1, 0.25);
  // watchers on the edge, looking down
  for (let k = 0; k < 5; k++) b.figure(-3 + k * 1.4, 3.72, 6.6, 1.1, '#1a1a22');
  // the dark valley and the rose of lights
  const pts: THREE.Vector3[] = [];
  const cols: string[] = [];
  const cx = 0;
  const cz = -2;
  for (let k = 0; k < 900; k++) {
    const th = b.r(TAU);
    const petals = 5;
    const edge = b.chance(0.6);
    const rr = Math.abs(Math.cos(petals * th * 0.5)) * 6.6 * (edge ? b.r(0.9, 1) : Math.sqrt(b.r(0.05, 1)));
    pts.push(V(cx + Math.cos(th) * rr, 0.15 + b.r(0.3), cz + Math.sin(th) * rr * 0.92));
    cols.push(b.pick(['#ffd28a', '#ffb860', '#ffe8c0', '#ff9a50']));
  }
  // avenues: radial streams of light
  for (let s = 0; s < 10; s++) {
    const a = (s / 10) * TAU;
    for (let k = 0; k < 30; k++) {
      const r = (k / 30) * 7.2;
      pts.push(V(cx + Math.cos(a) * r, 0.12, cz + Math.sin(a) * r));
      cols.push('#fff0c8');
    }
  }
  animatedPoints(b, pts, (i) => cols[i], 0.22, (i, t) => 1.0 + 0.5 * Math.sin(t * (1 + (i % 7) * 0.3) + i));
  // the dim shapes of houses no one up there can see
  for (let k = 0; k < 40; k++) {
    const a = b.r(TAU);
    const r = b.r(0.5, 7);
    b.box(cx + Math.cos(a) * r, 0, cz + Math.sin(a) * r, 0.5, 0.3 + b.r(0.4), 0.5, '#1e1c24');
  }
  ctx.view.yaw = 0;
  ctx.view.elev = 0.72;
  ctx.view.ty = 1.5;
  ctx.view.dist = 24;
};

export const names: Record<string, Gen> = { aglaura, leandra, pyrrha, clarice, irene };
