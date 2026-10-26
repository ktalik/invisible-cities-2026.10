import * as THREE from 'three';
import { B, TAU, V, VIEW, clamp, smooth } from '../engine/kit';
import type { Gen } from './types';
import { animatedPoints, crowd, rock } from './util';

// ---------------------------------------------------------------- Valdrada
// A city of verandas on the shore of a lake, and its upside down twin in the water.
const valdrada: Gen = (b, ctx) => {
  ctx.below = 9;
  const shore = (s: B) => {
    // the shore terrace on the north side
    const land = new THREE.CircleGeometry(11.6, 48, Math.PI * 0.08, Math.PI * 0.84).rotateX(-Math.PI / 2);
    s.add(land, new THREE.Matrix4().makeTranslation(0, 0.02, 0), '#b8a888');
    s.box(0, 0, -1.6, 22, 0.3, 0.5, '#d8ccb0');
    // houses all verandas, one above another, terraced up the shore
    for (let row = 0; row < 4; row++) {
      const z = -2.6 - row * 1.9;
      const half = Math.sqrt(Math.max(0, 11.2 * 11.2 - z * z)) - 0.8;
      for (let x = -half; x < half; x += 1.5 + s.r(0.3)) {
        const h = 1.1 + row * 0.9 + s.r(0.8);
        const wall = s.jit(['#f0e0c8', '#e8c8a8', '#f4ecd8', '#d8b898'][row % 4]);
        s.box(x, 0, z, 1.3, h, 1.3, wall);
        // stacked verandas
        for (let f = 0.9; f < h; f += 0.9) {
          s.box(x, f, z + 0.72, 1.3, 0.06, 0.4, '#f8f4ec');
          s.box(x, f + 0.25, z + 0.9, 1.3, 0.04, 0.04, '#7a5a3a');
          for (let p = -0.6; p <= 0.6; p += 0.3) s.box(x + p, f, z + 0.9, 0.03, 0.25, 0.03, '#7a5a3a');
          if (s.chance(0.5)) s.box(x + s.r(-0.4, 0.4), f + 0.1, z + 0.58, 0.18, 0.28, 0.03, '#ffd896', { kind: 'glow', i: 1.6 });
        }
        s.prism(x, h, z, 1.4, 0.55, 1.4, '#a8603a');
      }
    }
    // balustrades along the water
    for (let x = -10; x <= 10; x += 0.5) s.box(x, 0.3, -1.36, 0.06, 0.4, 0.06, '#f4ecd8');
    s.box(0, 0.68, -1.36, 20.4, 0.06, 0.1, '#f4ecd8');
    // a campanile
    s.box(3.2, 0, -6.8, 0.9, 6.5, 0.9, '#e8dcc4');
    s.pyramid(3.2, 6.5, -6.8, 1.0, 1.4, 1.0, '#a8603a');
  };
  shore(b);
  // the reflected city
  const mirror = b.sub();
  mirror.group.scale.y = -1;
  mirror.tint = (c) => {
    c.lerp(new THREE.Color('#5a7aa0'), 0.35);
    c.multiplyScalar(0.8);
  };
  shore(mirror);
  // the lake surface, a thin pane between the two cities
  const lake = new THREE.CircleGeometry(11.6, 48, Math.PI * 0.92, Math.PI * 1.16).rotateX(-Math.PI / 2);
  b.add(lake, new THREE.Matrix4().makeTranslation(0, 0.0, 0), '#9ac8e8', 'glass');
  // the people and their twins
  const N = 10;
  const up = crowd(b, N, (i) => ['#c03a3a', '#3a5ac0', '#e0c040', '#2a2a2a'][i % 4]);
  const down = crowd(mirror, N, (i) => ['#c03a3a', '#3a5ac0', '#e0c040', '#2a2a2a'][i % 4]);
  b.on((t) => {
    for (let i = 0; i < N; i++) {
      const x = ((t * 0.25 * (i % 2 ? 1 : -1) + i * 2.1) % 20 + 20) % 20 - 10;
      up.set(i, x, 0.3, -1.9, 1, 0);
      down.set(i, x, 0.3, -1.9, 1, 0);
    }
    up.commit();
    down.commit();
  });
  ctx.view.yaw = 0;
  ctx.view.elev = 0.3;
  ctx.view.ty = 0.5;
  ctx.view.dist = 25;
};

// ---------------------------------------------------------------- Zemrude
// Its form depends on the mood of the beholder: from below, sills and curtains; from above, gutters and scales.
const zemrude: Gen = (b, ctx) => {
  b.ground(11.6, '#7a7068');
  // tall narrow houses along curving streets
  const houses: { x: number; z: number; h: number; ry: number }[] = [];
  for (let k = 0; k < 34; k++) {
    const a = (k / 34) * TAU;
    const r = k % 2 ? 9 : 5.2;
    const x = Math.cos(a) * r + b.r(-0.3, 0.3);
    const z = Math.sin(a) * r + b.r(-0.3, 0.3);
    const h = 2.6 + b.r(2.8);
    const ry = -a + Math.PI / 2;
    b.house(x, z, 1.2, 1.2, h, { ry, wall: b.jit('#d8c8b0', 0.03, 0.1, 0.1), roof: b.jit('#8a5a42'), roofType: 'gable', win: false });
    houses.push({ x, z, h, ry });
  }
  // the upper city: sills with flowers, curtains, fountains, birds on the cornices
  const upper = b.sub({ unique: true });
  for (const hs of houses) {
    const nx = Math.sin(hs.ry);
    const nz = Math.cos(hs.ry);
    for (let f = 1.4; f < hs.h; f += 1.1) {
      for (const side of [-1, 1]) {
        const px = hs.x + nx * 0.62 + Math.cos(hs.ry) * side * 0.3;
        const pz = hs.z + nz * 0.62 - Math.sin(hs.ry) * side * 0.3;
        upper.box(px, f, pz, 0.36, 0.06, 0.16, '#f4ecdc', { ry: hs.ry });
        upper.box(px, f + 0.07, pz, 0.3, 0.12, 0.12, upper.pick(['#e0405a', '#f070a0', '#f0c040', '#e86a3a']), { ry: hs.ry });
        upper.box(px - nx * 0.04, f + 0.2, pz - nz * 0.04, 0.28, 0.42, 0.02, '#ffe0a0', { ry: hs.ry, kind: 'glow', i: 1.3 });
        if (upper.chance(0.4)) upper.box(px + nx * 0.03, f + 0.2, pz + nz * 0.03, 0.32, 0.48, 0.02, upper.pick(['#f8f0e8', '#e0b0c0', '#b0c8e8']), { ry: hs.ry, kind: 'cloth' });
      }
    }
  }
  // fountains with rising jets
  const jets: THREE.Vector3[] = [];
  for (const [fx, fz] of [[0, 0], [7.1, 0], [-7.1, 0]]) {
    upper.cyl(fx, 0, fz, 0.9, 0.35, '#e8dcc8', { seg: 16 });
    upper.cyl(fx, 0.35, fz, 0.15, 0.9, '#e8dcc8', { seg: 8 });
    for (let k = 0; k < 30; k++) {
      const a = (k / 30) * TAU;
      const u = (k % 6) / 5;
      jets.push(V(fx + Math.cos(a) * u * 0.7, 1.3 + Math.sin(u * Math.PI) * 0.8, fz + Math.sin(a) * u * 0.7));
    }
  }
  const jp = animatedPoints(upper, jets, () => '#d0f0ff', 0.2, (i, t) => 0.8 + 0.4 * Math.sin(t * 5 + i));
  // the lower city: gutters, manhole covers, fish scales, wastepaper
  const lower = b.sub({ unique: true });
  for (let k = 0; k < 34; k++) {
    const a = (k / 34) * TAU;
    lower.box(Math.cos(a) * 7.1, 0.01, Math.sin(a) * 7.1, 0.25, 0.02, 1.4, '#1a1a1e', { ry: -a });
  }
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * TAU + 0.2;
    lower.cyl(Math.cos(a) * 7.1, 0.0, Math.sin(a) * 7.1, 0.32, 0.04, '#3a3a40', { kind: 'metal', seg: 14 });
  }
  for (let k = 0; k < 60; k++) {
    const a = lower.r(TAU);
    const r = lower.r(1, 10);
    lower.plane(Math.cos(a) * r, 0.02, Math.sin(a) * r, 0.2, 0.26, '#f0ece0', { ry: lower.r(TAU), kind: 'cloth' });
  }
  const scales: THREE.Vector3[] = [];
  for (let k = 0; k < 160; k++) {
    const a = b.r(TAU);
    const r = b.r(0.5, 10.5);
    scales.push(V(Math.cos(a) * r, 0.04, Math.sin(a) * r));
  }
  const sc = animatedPoints(lower, scales, () => '#c8e0f0', 0.12, (i, t) => 0.4 + 0.6 * Math.max(0, Math.sin(t * 2 + i * 1.7)));
  // a cat, a dog nosing the refuse
  lower.sphere(2, 0.18, 1, 0.18, '#3a2a1a', { sz: 1.8, seg: 6 });
  // the mood is the beholder's: compute the viewing elevation
  const wp = new THREE.Vector3();
  let mood = 0.5;
  b.on((_t, dt) => {
    b.group.getWorldPosition(wp);
    const d = VIEW.cam.clone().sub(wp);
    const elev = Math.atan2(d.y, Math.hypot(d.x, d.z));
    // low and looking up: cheerful; high and looking down: gloomy
    const target = clamp((elev - 0.35) / 0.5, 0, 1);
    mood += (target - mood) * Math.min(1, dt * 2);
    const up = 1 - mood;
    upper.mats.glow.color.setScalar(0.25 + up * 1.1);
    upper.mats.solid.color.setScalar(0.45 + up * 0.55);
    upper.mats.cloth.color.setScalar(0.4 + up * 0.6);
    (jp.points?.material as THREE.PointsMaterial | undefined)?.color.setScalar(0.2 + up);
    lower.mats.solid.color.setScalar(0.3 + mood * 0.9);
    lower.mats.cloth.color.setScalar(0.25 + mood * 0.9);
    lower.mats.metal.color.setScalar(0.3 + mood * 0.9);
    (sc.points?.material as THREE.PointsMaterial | undefined)?.color.setScalar(0.1 + mood * 1.4);
  });
  ctx.view.elev = 0.3;
  ctx.view.ty = 2.5;
};

// ---------------------------------------------------------------- Baucis
// On stilts so slender and high they vanish into the clouds; its people seldom touch the earth.
const baucis: Gen = (b, ctx) => {
  b.ground(11.6, '#3e5a34');
  // the forest
  for (let k = 0; k < 120; k++) {
    const a = b.r(TAU);
    const r = Math.sqrt(b.r(1)) * 11;
    b.tree(Math.cos(a) * r, Math.sin(a) * r, 0.9 + b.r(0.8), b.pick(['#2f5a32', '#3a6a3a', '#4a7a3a', '#2a4a2a']), { type: b.chance(0.5) ? 'cone' : 'round' });
  }
  const Y = 15;
  // stilts
  const stilts: [number, number][] = [];
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * TAU + b.r(0.3);
    const r = 3 + b.r(5.5);
    stilts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  for (const [x, z] of stilts) b.beam(V(x, 0, z), V(x * 0.55, Y, z * 0.55), 0.035, '#d8d0c0', { seg: 4 });
  // a ladder going up, a few climbers
  b.line(V(1.2, 0, 1.2), V(0.7, Y, 0.7), '#c8b890');
  b.line(V(1.5, 0, 1.0), V(1.0, Y, 0.5), '#c8b890');
  // the clouds
  const cloud = b.sub({ unique: true });
  for (let k = 0; k < 46; k++) {
    const a = b.r(TAU);
    const r = b.r(0, 9);
    cloud.sphere(Math.cos(a) * r, Y - 2.2 + b.r(-0.6, 0.8), Math.sin(a) * r, b.r(1.2, 2.4), '#f4eef4', { sy: 0.45, seg: 10 });
  }
  cloud.mats.solid.transparent = true;
  cloud.mats.solid.opacity = 0.82;
  cloud.mats.solid.emissive = new THREE.Color('#4a3a50');
  cloud.on((t) => {
    cloud.group.rotation.y = t * 0.01;
  });
  // the city above
  const top = b.sub({ y: Y });
  top.cyl(0, 0, 0, 5.4, 0.25, '#b8a888', { seg: 24 });
  for (let k = 0; k < 18; k++) {
    const a = (k / 18) * TAU;
    const r = k % 3 === 0 ? 1.6 : 3.8;
    top.house(Math.cos(a) * r, Math.sin(a) * r, 0.9, 0.9, 0.7 + b.r(1.1), { y: 0.25, ry: -a, wall: b.jit('#f0e4cc'), roof: b.jit('#9a5a3a'), roofType: 'hip', lit: 0.5 });
  }
  top.tower(0, 0, 0.35, 2.6, '#f0e4cc', { y: 0.25, cap: 'dome', capColor: '#c8a050', capKind: 'gold' });
  // telescopes looking down at the earth, leaf by leaf
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU + 0.2;
    const x = Math.cos(a) * 5.0;
    const z = Math.sin(a) * 5.0;
    top.cyl(x, 0.25, z, 0.03, 0.5, '#4a3a2a', { seg: 4 });
    top.cyl(x, 0.65, z, 0.07, 0.8, '#c9a44a', { kind: 'gold', seg: 8, rt: 0.6, rx: Math.cos(a) * 1.8, rz: -Math.sin(a) * 1.8 });
    top.figure(x * 0.9, 0.25, z * 0.9, 0.8, '#5a4a6a');
  }
  ctx.view.elev = 0.18;
  ctx.view.ty = 9;
  ctx.view.dist = 44;
};

// ---------------------------------------------------------------- Phyllis
// A catalogue of bridges and windows, which the inhabitants no longer see.
const phyllis: Gen = (b, ctx) => {
  b.ground(11.6, '#c8b898');
  const city = b.sub({ unique: true });
  // two canals crossing
  city.box(0, 0.01, -1.2, 23, 0.04, 2.2, '#3a7088', { kind: 'water' });
  city.box(1.6, 0.012, 0, 2.2, 0.04, 23, '#3a7088', { kind: 'water' });
  // bridges, each different
  const bridges: ((x: number, z: number, ry: number) => void)[] = [
    // cambered
    (x, z, ry) => city.torus(x, 0, z, 1.25, 0.14, '#e0d4bc', { arc: Math.PI, ry, seg: 14, tube: 4 }),
    // covered
    (x, z, ry) => {
      city.box(x, 0.35, z, 0.9, 0.1, 2.8, '#c8b898', { ry });
      city.box(x, 0.45, z, 0.95, 0.8, 2.6, '#e8d8b8', { ry });
      city.prism(x, 1.25, z, 1.1, 0.45, 2.8, '#9a4a32', { ry });
    },
    // on pillars
    (x, z, ry) => {
      city.box(x, 0.6, z, 1.0, 0.12, 2.8, '#d8ccb4', { ry });
      for (const o of [-0.8, 0, 0.8]) city.cyl(x + Math.sin(ry) * o, -0.1, z + Math.cos(ry) * o, 0.12, 0.7, '#c8bca4', { seg: 8 });
    },
    // on barges
    (x, z, ry) => {
      for (const o of [-0.7, 0, 0.7]) city.sphere(x + Math.sin(ry) * o, 0.05, z + Math.cos(ry) * o, 0.35, '#5a3a22', { sy: 0.4, sx: 1.4, seg: 8 });
      city.box(x, 0.15, z, 0.9, 0.08, 2.8, '#8a6a42', { ry });
    },
    // suspended
    (x, z, ry) => {
      const s = Math.sin(ry);
      const c = Math.cos(ry);
      for (const o of [-1.4, 1.4]) for (const w of [-0.45, 0.45]) city.beam(V(x + s * o + c * w, 0, z + c * o - s * w), V(x + s * o + c * w, 1.6, z + c * o - s * w), 0.04, '#5a5a5a');
      for (const w of [-0.45, 0.45]) {
        city.rope(V(x - s * 1.4 + c * w, 1.6, z - c * 1.4 - s * w), V(x + s * 1.4 + c * w, 1.6, z + c * 1.4 - s * w), 1.2, '#3a3a3a', 1, 10);
      }
      city.box(x, 0.35, z, 0.9, 0.06, 2.8, '#8a6a42', { ry });
    },
    // with tracery balustrades
    (x, z, ry) => {
      city.box(x, 0.4, z, 1.0, 0.12, 2.8, '#e8dcc4', { ry });
      for (let o = -1.3; o <= 1.3; o += 0.26)
        for (const w of [-0.45, 0.45]) city.torus(x + Math.sin(ry) * o + Math.cos(ry) * w, 0.66, z + Math.cos(ry) * o - Math.sin(ry) * w, 0.1, 0.02, '#f4ecdc', { ry: ry + Math.PI / 2, seg: 8, tube: 3 });
    },
  ];
  // bridges across the east-west canal (running along x): bridge axis along z
  [-8, -5, -2.2, 4.4, 7.2].forEach((x, i) => bridges[i % bridges.length](x, -1.2, 0));
  // across the north-south canal: axis along x
  [-8, -4.6, 3.4, 7].forEach((z, i) => bridges[(i + 3) % bridges.length](1.6, z, Math.PI / 2));
  // houses with every kind of window
  const placed: [number, number][] = [];
  for (let k = 0; k < 160 && placed.length < 26; k++) {
    const x = b.r(-10, 10);
    const z = b.r(-10, 10);
    if (Math.hypot(x, z) > 10.2 || Math.abs(z + 1.2) < 1.9 || Math.abs(x - 1.6) < 1.9) continue;
    if (placed.some(([px, pz]) => Math.abs(px - x) < 1.9 && Math.abs(pz - z) < 1.6)) continue;
    placed.push([x, z]);
    const h = 1.8 + b.r(2.2);
    const w = 1.3 + b.r(0.6);
    city.house(x, z, w, 1.2, h, { wall: b.jit(b.pick(['#e8c8a0', '#d8a888', '#f0e0c0', '#c89878'])), roof: '#9a4a32', roofType: 'hip', win: false });
    const style = k % 5;
    for (let f = 0.7; f < h - 0.3; f += 0.9)
      for (let c = -1; c <= 1; c++) {
        const wx = x + c * (w / 3.2);
        const wz = z + 0.61;
        if (style === 0) {
          // mullioned
          city.box(wx, f, wz, 0.24, 0.42, 0.03, '#ffd896', { kind: 'glow', i: 1.4 });
          city.box(wx, f, wz + 0.01, 0.03, 0.42, 0.03, '#5a4030');
        } else if (style === 1) {
          // moorish
          city.box(wx, f, wz, 0.24, 0.34, 0.03, '#ffc87a', { kind: 'glow', i: 1.4 });
          city.cyl(wx, f + 0.34, wz, 0.12, 0.03, '#ffc87a', { kind: 'glow', i: 1.4, rx: Math.PI / 2, seg: 10 });
        } else if (style === 2) {
          // lancet
          city.box(wx, f, wz, 0.16, 0.4, 0.03, '#ffe0a0', { kind: 'glow', i: 1.4 });
          city.cone(wx, f + 0.4, wz, 0.08, 0.18, '#ffe0a0', { kind: 'glow', i: 1.4, seg: 3 });
        } else if (style === 3 && c === 0) {
          // rose window
          city.cyl(wx, f + 0.2, wz, 0.25, 0.03, '#ff9a7a', { kind: 'glow', i: 1.2, rx: Math.PI / 2, seg: 12 });
          city.torus(wx, f + 0.2, wz + 0.02, 0.25, 0.03, '#5a4030', { seg: 12, tube: 3 });
        } else if (style === 4) {
          // surmounted by lunettes
          city.box(wx, f, wz, 0.22, 0.3, 0.03, '#ffd896', { kind: 'glow', i: 1.4 });
          city.torus(wx, f + 0.42, wz, 0.1, 0.03, '#ffd896', { arc: Math.PI, kind: 'glow', i: 1.4, seg: 8, tube: 3 });
        }
      }
  }
  // habit: the marvels fade to a blank page, then something makes the eye look up again
  city.on((t) => {
    const c = (t * 0.04) % 1;
    const blank = c < 0.45 ? 0 : c < 0.65 ? smooth((c - 0.45) / 0.2) : c < 0.85 ? 1 : 1 - smooth((c - 0.85) / 0.15);
    const e = blank * 0.55;
    city.mats.solid.emissive.setRGB(e * 0.95, e * 0.92, e * 0.86);
    city.mats.glow.color.setScalar(1 - blank * 0.6);
  });
  ctx.view.elev = 0.48;
};

// ---------------------------------------------------------------- Moriana
// Two faces, like a sheet of paper: alabaster and coral on one side, rust and soot on the other.
const moriana: Gen = (b, ctx) => {
  b.ground(11.6, '#9a9488');
  const sheet = b.sub();
  // the sheet itself: a thin wall the city is printed on
  sheet.box(0, 0, 0, 18, 7.2, 0.12, '#d8d0c4');
  // FRONT (+z): glory
  for (let k = 0; k < 5; k++) {
    const x = -7 + k * 3.5;
    // alabaster gate
    sheet.box(x - 0.9, 0, 0.5, 0.35, 3.2, 0.5, '#fbf6ee');
    sheet.box(x + 0.9, 0, 0.5, 0.35, 3.2, 0.5, '#fbf6ee');
    sheet.torus(x, 3.2, 0.5, 0.9, 0.18, '#fbf8f4', { arc: Math.PI, seg: 14, tube: 5 });
    // coral columns
    for (const o of [-1.6, 1.6]) {
      sheet.cyl(x + o, 0, 0.9, 0.14, 4.2, '#e0705a', { seg: 8 });
      sheet.sphere(x + o, 4.3, 0.9, 0.22, '#f08a6a', { seg: 8 });
    }
  }
  // an alabaster skyline along the top edge of the sheet
  for (let k = 0; k < 9; k++) {
    const x = -8 + k * 2;
    if (k % 2 === 0) sheet.dome(x, 7.2, 0.0, 0.8, '#f6f0ea', { seg: 14 });
    else sheet.cone(x, 7.2, 0.0, 0.3, 1.8, '#f6f0ea', { seg: 8 });
    sheet.sphere(x, k % 2 ? 9.1 : 8.05, 0, 0.1, '#ffd8a0', { kind: 'glow', i: 2, seg: 6 });
  }
  // mother of pearl facing on the front
  for (let k = 0; k < 7; k++) sheet.box(-8.2 + k * 2.73, 0, 0.08, 2.5, 7.0, 0.04, b.jit('#f0e6ea', 0.03, 0.08, 0.04));
  for (let k = 0; k < 5; k++) sheet.box(-7 + k * 3.5, 3.2, 0.12, 0.9, 0.9, 0.03, '#ffd8b0', { kind: 'glow', i: 1.1 });
  // glass villas like aquariums, with silver dancers swimming
  const tanks: THREE.Vector3[] = [];
  for (let k = 0; k < 4; k++) {
    const x = -5.3 + k * 3.5;
    sheet.box(x, 4.2, 0.8, 2.2, 2.2, 1.4, '#a8e0f0', { kind: 'glass' });
    sheet.box(x, 4.2, 0.8, 2.2, 0.08, 1.4, '#f0ece4');
    sheet.box(x, 6.4, 0.8, 2.3, 0.15, 1.5, '#f8f4ec');
    tanks.push(V(x, 5.3, 0.8));
  }
  const fish = crowd(sheet, 12, () => '#e8f0ff', { kind: 'glow' });
  sheet.on((t) => {
    for (let i = 0; i < 12; i++) {
      const tk = tanks[i % 4];
      const a = t * (0.6 + (i % 3) * 0.2) + i;
      fish.set(i, tk.x + Math.cos(a) * 0.7, tk.y - 0.7 + Math.sin(a * 1.3) * 0.25, tk.z + Math.sin(a) * 0.4, 0.9, -a);
    }
    fish.commit();
  });
  // BACK (-z): the other face, rust, sackcloth, nails, soot
  for (let k = 0; k < 30; k++) {
    const x = b.r(-8.6, 8.6);
    const y = b.r(0, 6.4);
    sheet.box(x, y, -0.25, b.r(0.8, 2.2), b.r(0.6, 1.6), 0.06, b.jit(b.pick(['#7a4a2a', '#8a5a32', '#5a3a22', '#6a6a5a']), 0.03, 0.1, 0.1), { kind: 'metal', rz: b.r(-0.15, 0.15) });
  }
  for (let k = 0; k < 12; k++) sheet.box(b.r(-8, 8), b.r(0.5, 6), -0.36, b.r(0.8, 1.4), b.r(0.8, 1.6), 0.04, '#a08a5a', { kind: 'cloth', rz: b.r(-0.2, 0.2) });
  for (let k = 0; k < 8; k++) {
    const x = -7.5 + k * 2.1;
    sheet.cyl(x, 0, -0.7, 0.16, 5 + b.r(2), '#1e1a1a', { seg: 8 });
    sheet.beam(V(x, 3, -0.7), V(x + 1.2, 3.5, -0.7), 0.1, '#2a2222');
  }
  for (let k = 0; k < 40; k++) sheet.cyl(b.r(-8, 8), 0, b.r(-2.5, -0.8), 0.12, 0.22, b.pick(['#8a8a8a', '#a87a4a', '#6a6a6a']), { kind: 'metal', seg: 6, rx: b.chance(0.5) ? Math.PI / 2 : 0 });
  for (let k = 0; k < 40; k++) sheet.box(b.r(-8.5, 8.5), b.r(0.2, 6.5), -0.3, 0.015, 0.015, 0.2, '#3a3a3a', { kind: 'metal' });
  // slowly the sheet turns so both faces may be seen, though never at once
  sheet.on((t) => {
    sheet.group.rotation.y = Math.sin(t * 0.08) * 1.45;
  });
  ctx.view.elev = 0.28;
  ctx.view.ty = 3.5;
  ctx.view.yaw = 0;
};

export const eyes: Record<string, Gen> = { valdrada, zemrude, baucis, phyllis, moriana };

void rock;
