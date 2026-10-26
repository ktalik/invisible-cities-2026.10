import * as THREE from 'three';
import { B, TAU, V, clamp, smooth } from '../engine/kit';
import type { Gen } from './types';
import { animatedPoints, crowd, dynamicLines } from './util';

// ---------------------------------------------------------------- Melania
// In the square the same dialogue goes on forever; the actors die and are replaced, the roles remain.
const melania: Gen = (b, ctx) => {
  b.ground(11.6, '#a8987a');
  // a comic stage set: houses with doors and balconies opening on the square
  b.box(0, 0, 0, 12, 0.06, 9, '#d8ccb4');
  for (let i = -5; i <= 5; i++) for (let j = -4; j <= 4; j++) if ((i + j) % 2 === 0) b.box(i * 1.05, 0.061, j * 1.0, 1.0, 0.005, 0.95, '#c8bca2');
  const facades: [number, number, number][] = [];
  for (let k = 0; k < 7; k++) facades.push([-6 + k * 2, -6.2, 0]);
  for (let k = 0; k < 4; k++) facades.push([-8.2, -3 + k * 2, Math.PI / 2]);
  for (let k = 0; k < 4; k++) facades.push([8.2, -3 + k * 2, -Math.PI / 2]);
  facades.forEach(([x, z, ry], k) => {
    const h = 2.6 + (k % 3) * 0.7;
    b.house(x, z, 1.9, 1.6, h, { ry, wall: b.jit(['#e8c8a0', '#f0dcc0', '#d8a888'][k % 3]), roof: '#9a4a32', roofType: 'gable', win: false });
    const nx = Math.sin(ry);
    const nz = Math.cos(ry);
    b.box(x + nx * 0.81, 0, z + nz * 0.81, 0.55, 1.1, 0.04, '#5a3a22', { ry });
    b.box(x + nx * 0.95, 1.6, z + nz * 0.95, 1.2, 0.08, 0.35, '#7a5a3a', { ry });
    b.box(x + nx * 0.82, 1.75, z + nz * 0.82, 0.5, 0.6, 0.03, '#ffd896', { ry, kind: 'glow', i: 1.4 });
  });
  // a little proscenium of lanterns
  for (let k = 0; k < 9; k++) b.sphere(-6 + k * 1.5, 0.15, 4.8, 0.12, '#ffcf7a', { kind: 'glow', i: 2, seg: 6 });
  // the roles: soldier, parasite, young son, courtesan, miser father, lovelorn daughter, servant
  const roles = [
    { c: '#c0392b', p: V(-2.4, 0, -1.2) },
    { c: '#7a7a3a', p: V(-1.4, 0, -1.6) },
    { c: '#3a6ab0', p: V(1.8, 0, -1.0) },
    { c: '#e070a0', p: V(2.6, 0, -0.2) },
    { c: '#2a2a2a', p: V(-1.5, 0, 2.0) },
    { c: '#f0e0f0', p: V(-0.5, 0, 2.6) },
    { c: '#8a6a3a', p: V(3.4, 0, 2.2) },
  ];
  const actors = crowd(b, roles.length, (i) => roles[i].c);
  const talk = dynamicLines(b, 12, 0.9);
  const pairs = [
    [0, 1],
    [2, 3],
    [0, 3],
    [4, 5],
    [6, 2],
  ];
  const col = new THREE.Color(ctx.accent).multiplyScalar(1.5);
  const tmp = new THREE.Color();
  b.on((t) => {
    roles.forEach((r, i) => {
      // each actor plays for a while, dies and is replaced by another in the same role
      const life = (t * 0.06 + i * 0.37) % 1;
      const s = life < 0.08 ? smooth(life / 0.08) : life > 0.92 ? 1 - smooth((life - 0.92) / 0.08) : 1;
      const gen = Math.floor(t * 0.06 + i * 0.37);
      tmp.set(r.c).offsetHSL(0, 0, Math.sin(gen * 2.3) * 0.08);
      actors.mesh.setColorAt(i, tmp);
      actors.set(i, r.p.x + Math.sin(t * 0.8 + i) * 0.2, 0.06 - (1 - s) * 0.6, r.p.z + Math.cos(t * 0.6 + i) * 0.2, 1.6 * Math.max(s, 0.01), Math.sin(t * 0.5 + i));
    });
    actors.mesh.instanceColor!.needsUpdate = true;
    actors.commit();
    talk.begin();
    pairs.forEach(([a, c], k) => {
      const on = Math.max(0, Math.sin(t * 0.9 + k * 1.3));
      if (on < 0.2) return;
      const A = roles[a].p;
      const C = roles[c].p;
      // a speech arc
      const m = A.clone().lerp(C, 0.5);
      m.y = 1.9 + A.distanceTo(C) * 0.2;
      const k2 = on * on;
      talk.seg(A.x, 1.15, A.z, m.x, m.y, m.z, col.r * k2, col.g * k2, col.b * k2);
      talk.seg(m.x, m.y, m.z, C.x, 1.15, C.z, col.r * k2, col.g * k2, col.b * k2);
    });
    talk.end();
  });
  ctx.view.elev = 0.45;
  ctx.view.ty = 1.2;
  ctx.view.dist = 24;
  ctx.view.yaw = 0;
};

// ---------------------------------------------------------------- Adelma
// A harbor at dusk where every face is the face of someone who has died.
const adelma: Gen = (b, ctx) => {
  // sea to the south, town to the north
  const sea = new THREE.CircleGeometry(11.6, 48, Math.PI, Math.PI).rotateX(-Math.PI / 2);
  b.add(sea, new THREE.Matrix4().makeTranslation(0, 0.01, 0), '#2a4a62', 'water');
  const land = new THREE.CircleGeometry(11.6, 48, 0, Math.PI).rotateX(-Math.PI / 2);
  b.add(land, new THREE.Matrix4().makeTranslation(0, 0.4, 0), '#9a8a70');
  b.cyl(0, -0.3, 0, 11.6, 0.3, '#5a5048', { seg: 48 });
  // the quay with bollards and steps
  b.box(0, 0, -0.4, 22.6, 0.4, 0.8, '#b8aa90');
  for (let x = -9; x <= 9; x += 2.2) {
    b.cyl(x, 0.4, -0.6, 0.12, 0.35, '#3a3632', { seg: 8 });
  }
  // the town at dusk
  for (let row = 0; row < 3; row++) {
    const z = -2.4 - row * 2.6;
    const half = Math.sqrt(Math.max(0, 11 * 11 - z * z)) - 0.7;
    for (let x = -half; x < half; x += 1.6 + b.r(0.5)) {
      b.house(x, z, 1.4, 1.6, 1.4 + b.r(1.4) + row * 0.4, { y: 0.4, wall: b.jit('#c8b49a', 0.02, 0.08, 0.1), roof: b.jit('#7a4a3a'), roofType: 'gable', lit: 0.35 });
    }
  }
  // fish market stalls with baskets
  for (let k = 0; k < 5; k++) {
    const x = -6 + k * 3;
    b.box(x, 0.4, -1.4, 1.4, 0.5, 0.6, '#7a5a3a');
    for (let f = 0; f < 3; f++) b.cyl(x - 0.4 + f * 0.4, 0.9, -1.4, 0.16, 0.12, '#c8a870', { seg: 8 });
    for (let f = 0; f < 6; f++) b.sphere(x - 0.5 + f * 0.2, 1.04, -1.4, 0.05, '#c8d8e0', { sx: 2, seg: 5, kind: 'metal' });
  }
  // boats moored, one coming in
  for (let k = 0; k < 4; k++) {
    const x = -7 + k * 4.2;
    b.sphere(x, 0.05, 1.4, 0.45, '#4a3020', { sx: 2.6, sy: 0.5, seg: 10 });
    b.cyl(x, 0.2, 1.4, 0.04, 2.2, '#3a2a1a', { seg: 4 });
    b.line(V(x, 0.3, 1.4), V(x + 0.3, 0.6, -0.5), '#c8b890');
  }
  const boat = b.sub();
  boat.sphere(0, 0.05, 0, 0.5, '#3a2818', { sx: 2.8, sy: 0.5, seg: 10 });
  boat.cyl(0, 0.2, 0, 0.04, 2.6, '#3a2a1a', { seg: 4 });
  boat.box(0.1, 0.9, 0, 0.02, 1.4, 1.2, '#d8c8b0', { kind: 'cloth', ry: Math.PI / 2 });
  boat.on((t) => {
    const u = (t * 0.02) % 1;
    boat.group.position.set(-9 + u * 12, Math.sin(t) * 0.04, 6.5 - u * 3);
    boat.group.rotation.z = Math.sin(t * 0.9) * 0.04;
  });
  // the faces: pale, recognized, the dead
  const N = 18;
  const ghosts = crowd(b, N, () => '#d8e4f0', { kind: 'glow' });
  const spots = Array.from({ length: N }, (_, i) => ({ x: -9 + (i / N) * 18 + b.r(-0.3, 0.3), z: -0.7 - b.r(0, 1.8), ph: b.r(TAU) }));
  b.on((t) => {
    spots.forEach((s, i) => ghosts.set(i, s.x + Math.sin(t * 0.2 + s.ph) * 0.3, 0.4, s.z + Math.cos(t * 0.15 + s.ph) * 0.15, 1.05, s.ph));
    ghosts.commit();
    const m = ghosts.mesh.material as THREE.MeshBasicMaterial;
    m.color.setScalar(0.85 + 0.25 * Math.sin(t * 0.7));
  });
  // lanterns along the quay
  for (let x = -8; x <= 8; x += 4) {
    b.cyl(x, 0.4, -0.15, 0.04, 1.5, '#2a2622', { seg: 4 });
    b.sphere(x, 2.0, -0.15, 0.16, '#ffcf8a', { kind: 'glow', i: 2.2, seg: 8 });
  }
  ctx.view.yaw = -0.15;
  ctx.view.elev = 0.32;
  ctx.view.ty = 1;
  ctx.view.dist = 24;
};

// ---------------------------------------------------------------- Eusapia
// Beneath the city of the living, an identical copy where the dead go on with their work.
const eusapia: Gen = (b, ctx) => {
  ctx.below = 9;
  const D = -6.2;
  const build = (s: B, dead: boolean) => {
    const rng = s.rng;
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * TAU + 0.1;
      const r = k % 2 ? 8.2 : 5.4;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      s.house(x, z, 1.4, 1.2, 1.1 + ((k * 37) % 5) * 0.3, { ry: -a, wall: dead ? '#a8a49c' : ['#e8c8a0', '#f0dcc0', '#d8a888'][k % 3], roof: dead ? '#6a6660' : '#a04a32', roofType: 'gable', lit: dead ? 0.3 : 0.55, win: dead ? '#9ad8ff' : '#ffcf7a' });
    }
    s.cyl(0, 0, 0, 2.2, 0.08, dead ? '#8a8680' : '#e0d4bc', { seg: 24 });
    s.cyl(0, 0.08, 0, 0.6, 1.4, dead ? '#9a968e' : '#e8dcc4', { seg: 10 });
    // the beloved pastimes: a table with players, a fiddler, a woman at a window, lovers
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * TAU + 0.5;
      const x = Math.cos(a) * 3.4;
      const z = Math.sin(a) * 3.4;
      s.cyl(x, 0, z, 0.4, 0.5, dead ? '#7a7670' : '#8a6a42', { seg: 10 });
      for (let p = 0; p < 3; p++) {
        const pa = (p / 3) * TAU;
        s.figure(x + Math.cos(pa) * 0.6, 0, z + Math.sin(pa) * 0.6, 1, dead ? '#f0ece4' : ['#3a5a8a', '#8a3a3a', '#5a7a3a'][p], { head: dead ? '#f8f4ec' : '#e2c4a6' });
      }
    }
    void rng;
  };
  // the living city: on a translucent crust of earth
  b.ground(11.6, '#8a7a5a', 0, 0.15, 'glass');
  build(b, false);
  // stairs going down
  for (let k = 0; k < 14; k++) b.box(9.5 - k * 0.25, -k * 0.44, 2, 0.8, 0.12, 0.6, '#8a7a62', { ry: Math.PI / 2 });
  // the city below: the same, bone-white, with candles
  const below = b.sub({ y: D });
  below.tint = (c) => c.lerp(new THREE.Color('#c8d0e0'), 0.35);
  below.ground(11.6, '#2a2630', 0, 0.2);
  build(below, true);
  const candles: THREE.Vector3[] = [];
  for (let k = 0; k < 40; k++) {
    const a = b.r(TAU);
    const r = b.r(1, 10);
    candles.push(V(Math.cos(a) * r, D + 0.25, Math.sin(a) * r));
  }
  animatedPoints(b, candles, () => '#ffc870', 0.35, (i, t) => 1.0 + 0.4 * Math.sin(t * 7 + i * 3));
  // the hooded brotherhood, going between the two cities
  const N = 6;
  const hoods = crowd(b, N, () => '#1a1420');
  b.on((t) => {
    for (let i = 0; i < N; i++) {
      const u = (t * 0.03 + i / N) % 1;
      const down = u < 0.5;
      const v = down ? u * 2 : (1 - u) * 2;
      // walk along the stair and then out under the ground
      const y = -v * 6.1;
      const x = 9.5 - v * 3.5 - (down ? 0 : 0.4);
      hoods.set(i, x, y, 2 + (i % 2) * 0.3, 1.1, Math.PI / 2);
    }
    hoods.commit();
  });
  ctx.view.elev = 0.62;
  ctx.view.ty = -2.5;
  ctx.view.dist = 30;
  ctx.view.yaw = 0.25;
};

// ---------------------------------------------------------------- Argia
// Earth instead of air: streets filled with dirt, rooms packed with clay, stairs cast in negative.
const argia: Gen = (b, ctx) => {
  ctx.below = 9;
  const D = -7.6;
  // the buried city, dim and earth-stained
  const city = b.sub({ y: D });
  city.tint = (c) => c.lerp(new THREE.Color('#5a4030'), 0.45);
  city.ground(11.6, '#4a3a2a', 0, 0.2);
  for (let k = 0; k < 26; k++) {
    const a = b.r(TAU);
    const r = Math.sqrt(b.r(0.04, 1)) * 9.5;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const h = 1.2 + b.r(2.6);
    city.house(x, z, 1.2 + b.r(0.6), 1.1 + b.r(0.5), h, { ry: b.r(TAU), wall: '#c8b8a0', roof: '#8a5a42', roofType: b.pick(['gable', 'hip']), win: '#1a120c', lit: 0.6 });
    // stairs in negative: a second stair inverted over each stair
    if (k % 4 === 0) {
      for (let s = 0; s < 6; s++) {
        city.box(x + 1.0, s * 0.25, z + s * 0.25, 0.6, 0.25, 0.25, '#b8a890');
        city.box(x + 1.0, 1.6 - s * 0.25, z + s * 0.25, 0.6, 0.25, 0.25, '#7a6248');
      }
    }
  }
  // layers of rocky ground hanging over the roofs like clouds in a sky
  for (let k = 0; k < 14; k++) {
    const a = b.r(TAU);
    const r = b.r(0, 9);
    city.sphere(Math.cos(a) * r, 4.6 + b.r(1.4), Math.sin(a) * r, b.r(1, 2.2), '#5a4632', { sy: 0.35, seg: 8 });
  }
  // the earth that fills everything: translucent strata
  const earth = b.sub({ unique: true });
  for (let k = 0; k < 3; k++) {
    const y0 = D + 0.2 + k * 2.42;
    earth.cyl(0, y0, 0, 12.3, 2.4, ['#8a5a2a', '#9a6a38', '#7e5230'][k], { seg: 48, kind: 'glass' });
  }
  earth.ground(11.6, '#9a7a50', 0, 0.12, 'glass');
  earth.mats.glass.opacity = 0.16;
  earth.mats.glass.roughness = 0.9;
  earth.mats.glass.metalness = 0;
  // dust in suspension
  const dust: THREE.Vector3[] = [];
  for (let k = 0; k < 300; k++) {
    const a = b.r(TAU);
    const r = Math.sqrt(b.r(1)) * 11.5;
    dust.push(V(Math.cos(a) * r, b.r(D, -0.3), Math.sin(a) * r));
  }
  animatedPoints(b, dust, () => '#c8a070', 0.14, (i, t) => 0.25 + 0.15 * Math.sin(t + i));
  // the surface: deserted, a few dry stalks; someone listening with an ear to the ground
  for (let k = 0; k < 30; k++) {
    const a = b.r(TAU);
    const r = b.r(1, 11);
    b.cone(Math.cos(a) * r, 0, Math.sin(a) * r, 0.04, 0.4 + b.r(0.4), '#8a7a4a', { seg: 3 });
  }
  b.figure(1.5, 0.05, 3, 1.2, '#3a3a4a');
  b.box(1.2, 0.0, 3, 0.6, 0.18, 0.3, '#3a3a4a');
  // at night, a door slams somewhere below
  const door = b.sub({ unique: true, y: D });
  door.box(-2.4, 0, 1.6, 0.5, 0.9, 0.06, '#ffcf8a', { kind: 'glow', i: 1.8 });
  door.on((t) => {
    const c = (t * 0.12) % 1;
    door.mats.glow.color.setScalar(c < 0.04 ? 1 : Math.max(0, 1 - (c - 0.04) * 8));
  });
  ctx.view.elev = 0.55;
  ctx.view.ty = -3;
  ctx.view.dist = 30;
};

// ---------------------------------------------------------------- Laudomia
// The city of the living, the city of the dead, and the city of the unborn, side by side.
const laudomia: Gen = (b, ctx) => {
  b.ground(11.6, '#8a8468');
  const sector = (k: number) => [(k / 3) * TAU - Math.PI / 2 - TAU / 6, ((k + 1) / 3) * TAU - Math.PI / 2 - TAU / 6];
  const inSector = (k: number, rmin: number, rmax: number): [number, number] => {
    const [a0, a1] = sector(k);
    const a = b.r(a0 + 0.12, a1 - 0.12);
    const r = b.r(rmin, rmax);
    return [Math.cos(a) * r, Math.sin(a) * r];
  };
  // boundary paths between the three cities
  for (let k = 0; k < 3; k++) {
    const a = sector(k)[0];
    b.box(Math.cos(a) * 5.6, 0.01, Math.sin(a) * 5.6, 0.5, 0.02, 11, '#c8b896', { ry: Math.PI / 2 - a });
  }
  // the living: warm, lit, crowded
  for (let k = 0; k < 30; k++) {
    const [x, z] = inSector(0, 1.5, 10.5);
    b.house(x, z, 0.8 + b.r(0.4), 0.8 + b.r(0.4), 0.8 + b.r(1.4), { ry: b.r(TAU), wall: b.jit('#e8c8a0'), roof: b.jit('#a04a32'), roofType: 'gable', lit: 0.7 });
  }
  // the dead: stones, cypresses, mausoleums
  for (let k = 0; k < 70; k++) {
    const [x, z] = inSector(1, 1.5, 10.5);
    b.box(x, 0, z, 0.3, 0.45, 0.08, b.jit('#b8b4ac', 0.01, 0.03, 0.08), { ry: -Math.atan2(z, x) });
  }
  for (let k = 0; k < 12; k++) {
    const [x, z] = inSector(1, 2, 10.5);
    b.tree(x, z, 1.4, '#2a3a2a', { type: 'cypress' });
  }
  for (let k = 0; k < 4; k++) {
    const [x, z] = inSector(1, 3, 9);
    b.box(x, 0, z, 1.0, 1.0, 1.2, '#c8c4bc');
    b.prism(x, 1.0, z, 1.1, 0.5, 1.3, '#a8a49c');
  }
  // the unborn: translucent, endless, smaller and more numerous
  const unborn = b.sub({ unique: true });
  for (let k = 0; k < 90; k++) {
    const [x, z] = inSector(2, 1.5, 10.8);
    unborn.box(x, 0, z, 0.35, 0.3 + b.r(0.7), 0.35, '#a8c8ff', { kind: 'ghost' });
  }
  unborn.on((t) => (unborn.mats.ghost.opacity = 0.22 + 0.1 * Math.sin(t * 0.6)));
  const motes: THREE.Vector3[] = [];
  for (let k = 0; k < 240; k++) {
    const [x, z] = inSector(2, 1, 11);
    motes.push(V(x, b.r(0.2, 4), z));
  }
  animatedPoints(b, motes, () => '#b8d8ff', 0.22, (i, t) => 0.6 + 0.6 * Math.sin(t * 1.5 + i * 1.3));
  // the living go to visit the other two cities, to question them about themselves
  const N = 8;
  const visitors = crowd(b, N, () => '#3a3a4a');
  b.on((t) => {
    for (let i = 0; i < N; i++) {
      const target = i % 2 ? sector(1) : sector(2);
      const mid = (target[0] + target[1]) / 2;
      const from = (sector(0)[0] + sector(0)[1]) / 2;
      const u = 0.5 - 0.5 * Math.cos(t * 0.1 + i);
      const a = from + (mid - from) * u;
      const r = 3 + (i % 3) * 1.6;
      visitors.set(i, Math.cos(a) * r, 0.02, Math.sin(a) * r, 1);
    }
    visitors.commit();
  });
  ctx.view.elev = 0.62;
};

export const dead: Record<string, Gen> = { melania, adelma, eusapia, argia, laudomia };
