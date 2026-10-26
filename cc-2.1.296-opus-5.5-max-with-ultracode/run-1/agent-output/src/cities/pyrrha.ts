// PYRRHA - Cities & Names 3.
// The Pyrrha Marco found: a low dusty plain, a dune hiding the sea, long straight
// streets, clumps of low houses between lumber yards and sawmills, windpumps whirling
// in yellow dust. Its gilt name plaque stands at the head of the main street. High
// over the hidden sea floats the other Pyrrha, the one he imagined before arriving:
// a small lapis cup-city of towers around a well-deep square, now nameless, with four
// fainter name-glints around it. Toggle: rewind the journey, the plain rises round a
// bay, the cup-city descends to full size and the name moves back onto its gate.

import * as THREE from 'three';
import * as K from '../kit';
import type { CityBuilder } from '../core/types';

const TAU = Math.PI * 2;
const R = 22;
const STREETS = [-9, -4, 1, 6, 11];
const CROSS = [-7, 8];

function hReal(x: number, z: number): number {
  let h = 0.25 + 0.3 * K.fbm2(x * 0.07 + 3, z * 0.07, 3);
  h += 2.2 * Math.exp(-(((z + 16.8) / 1.5) ** 2)) * (1 + 0.06 * Math.sin(x * 2.1 + z * 0.7));
  h = K.lerp(h, -0.6, K.smoothstep(-18.9, -19.9, z));
  return h;
}
function hImag(x: number, z: number): number {
  const d = Math.hypot(x, z - 3);
  let h: number;
  if (d > 6.5) h = 0.3 + 6.2 * Math.exp(-(((d - 6.5) / 4.2) ** 2)) + 0.25 * K.fbm2(x * 0.1, z * 0.1, 3);
  else if (d > 1.75) h = 4.0 + 2.5 * K.smoothstep(1.75, 6.5, d);
  else h = K.lerp(0.95, 4.0, K.smoothstep(1.45, 1.75, d));
  const bd = Math.hypot(x * 0.9, z + 16);
  return K.lerp(h, -1.8, K.smoothstep(9.5, 6.5, bd) * (d > 6.5 ? 1 : 0));
}

const build: CityBuilder = (ctx) => {
  const rng = ctx.rng;
  const root = new THREE.Group();

  // =============================================================== terrain that remembers two shapes
  const tg = new THREE.RingGeometry(0.001, R, 150, 64).rotateX(-Math.PI / 2);
  tg.deleteAttribute('uv');
  const tp = tg.attributes.position as THREE.BufferAttribute;
  const nV = tp.count;
  const HR = new Float32Array(nV), HI = new Float32Array(nV), CR = new Float32Array(nV * 3), CI = new Float32Array(nV * 3);
  const c = new THREE.Color();
  for (let i = 0; i < nV; i++) {
    const x = tp.getX(i), z = tp.getZ(i), r = Math.hypot(x, z);
    const edge = r > R - 0.05;
    HR[i] = edge ? -0.5 : hReal(x, z);
    HI[i] = edge ? -0.5 : hImag(x, z);
    // real colours: straw ground, pale dust streets, sand dune, wet shore
    c.copy(K.mix('#c9ab6d', '#b48f55', K.smoothstep(-0.4, 0.6, K.fbm2(x * 0.25, z * 0.25, 3))));
    c.lerp(K.col('#e8d196').multiplyScalar(0.94 + 0.06 * Math.sin(x * 3 + z * 9)), K.smoothstep(-13.2, -15.2, z));
    c.lerp(K.col('#9c875a'), K.smoothstep(-18.6, -19.4, z));
    CR.set([c.r, c.g, c.b], i * 3);
    // imagined colours: olive slopes, rock, shore, paved city, dark pit
    const hi = HI[i], d = Math.hypot(x, z - 3);
    c.copy(K.mix('#7d8a58', '#9b917a', K.smoothstep(2.5, 5.5, hi) * 0.7 + 0.3 * K.fbm2(x * 0.3, z * 0.3, 2)));
    c.lerp(K.col('#cbb98e'), K.smoothstep(0.12, -0.25, hi));
    c.lerp(K.col('#5d6f78'), K.smoothstep(-0.1, -0.8, hi));
    c.lerp(K.col('#b9ae94'), K.smoothstep(6.9, 6.3, d));
    c.lerp(K.col('#4b4740'), K.smoothstep(1.95, 1.7, d));
    CI.set([c.r, c.g, c.b], i * 3);
  }
  tg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(CR), 3));
  const terrainMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
  const terrain = new THREE.Mesh(tg, terrainMat);
  terrain.receiveShadow = true;
  root.add(terrain);
  const applyMorph = (v: number) => {
    const col = tg.attributes.color as THREE.BufferAttribute;
    for (let i = 0; i < nV; i++) {
      tp.setY(i, HR[i] + (HI[i] - HR[i]) * v);
      col.setXYZ(i, CR[i * 3] + (CI[i * 3] - CR[i * 3]) * v, CR[i * 3 + 1] + (CI[i * 3 + 1] - CR[i * 3 + 1]) * v, CR[i * 3 + 2] + (CI[i * 3 + 2] - CR[i * 3 + 2]) * v);
    }
    tp.needsUpdate = true; col.needsUpdate = true;
    tg.computeVertexNormals();
  };
  applyMorph(0);
  // rocky underside
  const under = K.lathe([[0.01, -11], [6, -8.5], [13, -5], [19, -2.4], [21.6, -1.0], [R, -0.5]], 72);
  K.paintBy(under, (x, y, z, out) => out.copy(K.mix('#5e4b38', '#a68a5e', K.clamp(1 + y / 6))).multiplyScalar(0.85 + 0.15 * Math.sin(y * 4 + K.noise2(x * 0.3, z * 0.3) * 3)));
  const ub = new K.Batch();
  ub.add(K.wobble(under, 0.6, 0.3, 2), null, 'stone');
  root.add(ub.build({ castShadow: false }));
  root.add(K.waterDisc(R - 0.3, -0.05, { color: '#3e64a7', amp: 0.25, scale: 0.5 }));
  root.add(K.cloudSea({ y: -8, color: '#ecd9a6', shadow: '#9b8a6a', opacity: 0.6, coverage: 0.5 }));

  // =============================================================== the real Pyrrha
  const real = new THREE.Group();
  root.add(real);
  const b = new K.Batch();
  const clumps: [number, number][] = [[-13, -6.5], [1.5, -6.5], [-3, -1.5], [12, -1.5], [-12, 3.5], [4, 3.5], [-4, 8.5], [14, 8.5]];
  for (const [cx, cz] of clumps) {
    const n = rng.int(6, 10);
    for (let i = 0; i < n; i++) {
      const x = cx + rng.float(-2.2, 2.2), z = cz + rng.float(-1.4, 1.4);
      const two = rng.chance(0.3);
      K.house(b, {
        x, z, y: hReal(x, z) - 0.06, ry: rng.chance(0.5) ? 0 : Math.PI / 2, w: rng.float(0.8, 1.4), d: rng.float(0.7, 1.1),
        h: two ? rng.float(1.05, 1.3) : rng.float(0.7, 0.9), roof: 'hip', roofH: 0.22,
        wall: K.jitter('#f0e6d0', rng, 0.01, 0.05, 0.04), roofColor: K.jitter('#c98e4d', rng, 0.02, 0.08, 0.08), windowColor: '#4a3b2c', rng,
      });
    }
  }
  // lumber lots
  for (const [lx, lz] of [[-1, -11.5], [9.5, -6.5], [-17, 8.5], [17, 3.5], [-9, 13.5], [9.5, 13.5]] as const) {
    for (let s = 0; s < 4; s++) {
      const x = lx + rng.float(-1.4, 1.4), z = lz + rng.float(-0.9, 0.9), y = hReal(x, z) - 0.03, ry = rng.float(-0.1, 0.1) + (rng.chance(0.5) ? Math.PI / 2 : 0);
      if (rng.chance(0.55)) {
        const rows = rng.int(5, 10);
        for (let k = 0; k < rows; k++) for (let j = 0; j < 4; j++) {
          b.add(K.at(K.box(1.3, 0.07, 0.14), x + (k % 2) * 0.03, y + k * 0.085, z, { ry }), K.jitter('#c7a06a', rng, 0.02, 0.06, 0.08), 'wood');
        }
        b.add(K.at(K.box(1.3, rows * 0.085, 0.62), x, y, z, { ry }), '#b88f58', 'wood');
      } else {
        for (let k = 0; k < 3; k++) for (let j = 0; j < 3 - k; j++) {
          const off = (j - (2 - k) / 2) * 0.24;
          b.add(K.at(K.cyl(0.11, 0.11, 1.5, 8), x + Math.cos(ry) * off, y + 0.11 + k * 0.2, z - Math.sin(ry) * off, { rx: Math.PI / 2, ry }), K.jitter('#8a6440', rng), 'wood');
        }
      }
    }
  }
  // sawmill sheds with spinning blades, log carriages and sawdust cones
  const mills: [number, number][] = [[-17, -6.5], [-4.5, 3.5], [17, -6.5], [1.5, 13.5]];
  const bladePos: THREE.Vector3[] = [];
  for (const [mx, mz] of mills) {
    const y = hReal(mx, mz) - 0.05;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add(K.at(K.box(0.1, 1.4, 0.1), mx + sx * 1.45, y, mz + sz * 0.95), '#6b4c32', 'wood');
    b.add(K.at(K.shedRoof(3.2, 2.2, 0.0, 0.35), mx, y + 1.4, mz), '#8f8a80', 'metal');
    b.add(K.at(K.box(2.6, 0.35, 0.5), mx, y, mz), '#5a4230', 'wood');
    b.add(K.at(K.cyl(0.16, 0.16, 1.6, 10), mx - 0.5, y + 0.5, mz, { rz: Math.PI / 2 }), '#8a6440', 'wood');
    b.add(K.at(K.cone(0.6, 0.55, 12), mx + 1.9, y, mz + 0.4), '#e8cf8a', 'matte');
    bladePos.push(new THREE.Vector3(mx + 0.5, y + 0.55, mz));
  }
  // windpump towers (rotors and vanes animate)
  const pumps: THREE.Vector3[] = [];
  for (let i = 0; i < 12; i++) {
    const s = STREETS[i % 5];
    let x = -15.5 + i * 2.75 + rng.float(-0.6, 0.6);
    const z = s + (i % 2 ? 1.1 : -1.1);
    if (Math.hypot(x, z) > 18.5) x *= 0.8;
    const y = hReal(x, z) - 0.05, H = rng.float(3.2, 4);
    const legs: [number, number][] = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (const [a, bq] of legs) b.add(K.strut([x + a * 0.45, y, z + bq * 0.45], [x + a * 0.12, y + H, z + bq * 0.12], 0.03, 4), '#6a5a4a', 'metal');
    for (let lv = 0; lv < 3; lv++) {
      const y0 = y + (lv / 3) * H, y1 = y + ((lv + 1) / 3) * H, w0 = 0.45 - (0.33 * lv) / 3, w1 = 0.45 - (0.33 * (lv + 1)) / 3;
      for (let f = 0; f < 4; f++) {
        const [a0, b0] = legs[f], [a1, b1] = legs[(f + 1) % 4];
        b.add(K.strut([x + a0 * w0, y0, z + b0 * w0], [x + a1 * w1, y1, z + b1 * w1], 0.012, 3), '#7a6a58', 'metal');
        b.add(K.strut([x + a1 * w0, y0, z + b1 * w0], [x + a0 * w1, y1, z + b0 * w1], 0.012, 3), '#7a6a58', 'metal');
      }
    }
    b.add(K.at(K.box(0.36, 0.05, 0.36), x, y + H, z), '#5a4a3a', 'wood');
    b.add(K.at(K.cyl(0.38, 0.38, 0.42, 14), x + 0.75, y, z + 0.3), '#7d8a8c', 'metal');
    b.add(K.at(K.box(0.9, 0.18, 0.3), x - 0.7, y, z - 0.4), '#6b4c32', 'wood');
    pumps.push(new THREE.Vector3(x, y + H + 0.1, z));
  }
  // the gilt plaque's posts at the west end of the main street
  const PL = new THREE.Vector3(-17.6, hReal(-17.6, 1), 1);
  for (const s of [-1, 1]) b.add(K.at(K.cyl(0.05, 0.05, 1.6, 6), PL.x, PL.y, PL.z + s * 0.75), '#5a4230', 'wood');
  // long straight streets draped over the plain
  for (const zs of STREETS) {
    const half = Math.sqrt(R * R - zs * zs) - 0.4;
    const g = K.plane(2 * half, 1.1, 90, 1);
    const pp = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pp.count; i++) pp.setY(i, hReal(pp.getX(i), pp.getZ(i) + zs) + 0.06);
    g.computeVertexNormals();
    b.add(K.at(g, 0, 0, zs), '#e6d3a2', 'matte');
  }
  for (const xs of CROSS) {
    const z1 = Math.sqrt(R * R - xs * xs) - 0.4, z0 = -14;
    const g = K.plane(1.0, z1 - z0, 1, 60);
    const pp = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pp.count; i++) pp.setY(i, hReal(pp.getX(i) + xs, pp.getZ(i) + (z0 + z1) / 2) + 0.065);
    g.computeVertexNormals();
    b.add(K.at(g, xs, 0, (z0 + z1) / 2), '#e6d3a2', 'matte');
  }
  real.add(b.build({ name: 'real' }));

  // rotors and heads
  const headGeo = K.merge([
    K.paint(K.at(K.box(0.14, 0.14, 0.32), 0, 0, 0), '#4a4038'),
    K.paint(K.at(K.box(0.02, 0.02, 0.9), 0, 0.06, -0.55), '#4a4038'),
    K.paint(K.at(K.box(0.02, 0.4, 0.5), 0, -0.05, -1.05), '#d8cfbf'),
  ]);
  const rotorParts: THREE.BufferGeometry[] = [K.paint(K.at(K.torus(0.62, 0.012, 3, 36), 0, 0, 0, { rx: Math.PI / 2 }), '#5a4a3a')];
  for (let k = 0; k < 18; k++) rotorParts.push(K.paint(K.at(K.at(K.boxC(0.11, 0.55, 0.012), 0, 0.37, 0, { ry: 0.45 }), 0, 0, 0, { rz: (k / 18) * TAU }), k % 2 ? '#e6dccb' : '#cfc3ae'));
  const pumpMat = K.std('#ffffff', { vertexColors: true, roughness: 0.75, metalness: 0.2 });
  const heads = K.instanced(headGeo, pumpMat, pumps.length, undefined, { colors: false });
  const rotors = K.instanced(K.merge(rotorParts), pumpMat, pumps.length, undefined, { colors: false });
  const bladeGeo = K.merge([K.paint(K.at(K.cyl(0.3, 0.3, 0.015, 24), 0, -0.0075, 0, { rx: Math.PI / 2 }), '#c9ccd0'), K.paint(K.at(K.boxC(0.56, 0.06, 0.03), 0, 0, 0), '#3a3530'), K.paint(K.at(K.boxC(0.06, 0.56, 0.03), 0, 0, 0), '#8a8580')]);
  const blades = K.instanced(bladeGeo, K.std('#ffffff', { vertexColors: true, metalness: 0.8, roughness: 0.3 }), bladePos.length, undefined, { colors: false });
  real.add(heads, rotors, blades);
  const setH = K.instanceSetter(heads), setR = K.instanceSetter(rotors), setB = K.instanceSetter(blades);
  real.add(K.smoke({ sources: bladePos.map((p) => [p.x + 0.3, p.y, p.z] as [number, number, number]), perSource: 18, height: 1.5, color: '#efd894', opacity: 0.4, size: [0.15, 0.5], life: 2.5, wind: [0.8, 0.1], rng: rng.fork('saw') }));

  // people on the long streets, mule carts
  const streetPaths = STREETS.map((s) => {
    const half = Math.sqrt(R * R - s * s) - 2;
    return Array.from({ length: 40 }, (_, i) => { const x = -half + (2 * half * i) / 39; return new THREE.Vector3(x, hReal(x, s + 0.2), s + 0.2); });
  });
  const walkers = new K.Walkers({ paths: streetPaths, count: 25, rng: rng.fork('walk'), speed: [0.15, 0.32], colors: ['#f0e6d0', '#8a5a3a', '#5a4a3a', '#c9a35a', '#6a7a8a'] });
  const cartGeo = K.merge([
    K.at(K.quadruped({ len: 0.34, h: 0.28, color: '#6a5444', ears: true, tail: 0.08 }), 0, 0, 0.35),
    K.paint(K.at(K.box(0.3, 0.16, 0.45), 0, 0.12, -0.05), '#7a5a3a'),
    K.paint(K.at(K.box(0.26, 0.12, 0.38), 0, 0.28, -0.05), '#c7a06a'),
    K.paint(K.at(K.torus(0.1, 0.02, 4, 12), 0.17, 0.1, -0.05, { ry: Math.PI / 2 }), '#3a2a20'),
    K.paint(K.at(K.torus(0.1, 0.02, 4, 12), -0.17, 0.1, -0.05, { ry: Math.PI / 2 }), '#3a2a20'),
  ]);
  const carts = new K.Walkers({ paths: streetPaths, count: 3, rng: rng.fork('carts'), speed: [0.25, 0.35], geometry: cartGeo, material: K.std('#ffffff', { vertexColors: true, roughness: 0.85 }) });
  real.add(walkers.mesh, carts.mesh);
  const dust = K.particles({ count: 4000, radius: 20, y0: 0.05, y1: 3.5, color: '#e9c877', colors: ['#f2d89a', '#d9b46a'], size: 0.05, opacity: 0.55, velocity: [1.4, 0, 0.12], swirl: 0.12, twinkle: 0.7, disc: true, rng: rng.fork('dust') });
  const haze = K.particles({ count: 160, radius: 19, y0: 0.2, y1: 3, color: '#efd9a0', size: 1.4, opacity: 0.07, velocity: [0.6, 0, 0.05], swirl: 0.4, disc: true, rng: rng.fork('haze') });
  root.add(dust, haze);

  // =============================================================== the imagined Pyrrha (a cup above a bay)
  const cup = new THREE.Group();
  root.add(cup);
  const cb = new K.Batch();
  const hL = (x: number, z: number) => hImag(x, z + 3); // local coords centred on the hilltop
  const GATE = Math.atan2(Math.cos(0.61), Math.sin(0.61));
  K.cityWall(cb, { y: 6.35, r: 6.5, h: 1.3, thick: 0.45, seg: 72, color: '#6f86b8', finish: 'stone', gates: [GATE], gateWidth: 1.1 });
  const winPos: THREE.Vector3[] = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU + GATE + TAU / 24;
    const x = Math.cos(a) * 6.5, z = Math.sin(a) * 6.5, H = 4 + (i % 3) * 0.45;
    K.tower(cb, { x, z, y: 6.2, r: 0.5, h: H, sides: 12, top: 'cone', topH: 1.1, color: '#5f78ad', topColor: '#d8b25a', topFinish: 'gold', windows: false });
    for (let k = 0; k < 4; k++) {
      const wa = (k / 4) * TAU + a;
      const g = K.at(K.wallPlane(0.09, 0.42), 0, 6.2 + H - 0.85, 0.505);
      cb.add(K.at(g, x, 0, z, { ry: Math.PI / 2 - wa }), '#ffcf7a', 'glow', 3);
      winPos.push(new THREE.Vector3(x + Math.cos(wa) * 0.55, 6.2 + H - 0.62, z + Math.sin(wa) * 0.55));
    }
  }
  for (const [d, n] of [[5.6, 40], [4.7, 34], [3.8, 27], [2.85, 20]] as const) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + d;
      if (Math.abs(((a - GATE + Math.PI * 3) % TAU) - Math.PI) * d < 0.6) continue;
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      K.house(cb, { x, z, y: hL(x, z) - 0.15, ry: Math.PI / 2 - a, w: 0.55, d: 0.62, h: rng.float(0.65, 1.05) + (6 - d) * 0.12, roof: rng.pick(['hip', 'flat', 'dome'] as const), roofH: 0.3, wall: K.jitter('#7f95c4', rng, 0.02, 0.08, 0.08), roofColor: '#d0a858', roofFinish: 'gold', windowColor: '#1d2440', lit: 0.45, glow: 2.6, litColor: '#ffcf7a', rng });
    }
  }
  K.cityWall(cb, { y: 0.95, r: 1.62, h: 3.15, thick: 0.25, seg: 28, crenels: false, color: '#4c5f8e' });
  cb.add(K.at(K.torus(1.62, 0.16, 6, 40), 0, 4.1, 0), '#8aa0cf', 'stone');
  cb.add(K.at(K.disc(1.5, 28), 0, 0.97, 0), '#3d4766', 'stone');
  K.well(cb, { x: 0, y: 0.97, z: 0, r: 0.35, color: '#9fb2d9', roofColor: '#d0a858' });
  // blank plaque at the gate
  const gx = Math.cos(GATE) * 6.85, gz = Math.sin(GATE) * 6.85;
  cb.add(K.at(K.box(1.7, 0.6, 0.06), gx, 7.75, gz, { ry: Math.PI / 2 - GATE }), '#d8b25a', 'gold');
  // a goblet-like base so the remnant can float on its own
  const baseProf: [number, number][] = [[0.01, -3.5], [3.5, -1.2], [6.5, 2.8], [8.6, 4.4]];
  for (const d of [8.6, 7.5, 6.6]) baseProf.push([d - 0.001, hL(d, 0) - 0.05]);
  const baseMat = new THREE.MeshStandardMaterial({ color: '#7a8fbf', roughness: 0.6, transparent: true, side: THREE.DoubleSide });
  const cupBase = new THREE.Mesh(K.lathe(baseProf, 48), baseMat);
  const cupDisc = new THREE.Mesh(K.at(K.lathe([[6.6, hL(6.6, 0) - 0.05], [1.7, 3.9], [1.62, 0.9], [0.01, 0.9]].reverse() as [number, number][], 48), 0, 0, 0), baseMat);
  cup.add(cupBase, cupDisc);
  const cupMeshes = cb.build({ name: 'imagined' });
  const cupMats: THREE.Material[] = [];
  cupMeshes.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const mat = (m.material as THREE.Material).clone();
    mat.transparent = true;
    m.material = mat;
    cupMats.push(mat);
  });
  cup.add(cupMeshes);
  const candles = K.glowPoints(winPos, '#ffcf7a', 0.6, 0.7);
  cup.add(candles);

  // the name plaque that moves between the two cities
  const plaque = new THREE.Group();
  const plate = K.textPlane('PYRRHA', 0.48, { color: '#3b2610', background: '#d6ad55', px: 96, tracking: 10, weight: 600 });
  plaque.add(plate);
  const plateBack = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.62, 0.05), new THREE.MeshStandardMaterial({ color: '#c9a24c', metalness: 0.8, roughness: 0.3 }));
  plateBack.position.z = -0.03;
  plaque.add(plateBack);
  root.add(plaque);
  const plaqueReal = { p: new THREE.Vector3(PL.x, PL.y + 1.3, PL.z), ry: Math.PI / 2 };
  const plaqueImag = { p: new THREE.Vector3(Math.cos(GATE) * 6.9, 7.75 + 0.3, 3 + Math.sin(GATE) * 6.9), ry: Math.PI / 2 - GATE };

  // four name-glints: cities known only by name, each a figure, a fragment, a spark
  const REM = new THREE.Vector3(0, 9.5, -21);
  const glints: { s: THREE.Sprite; phase: number }[] = [];
  const gb = new K.Batch();
  const names = ['Euphrasia', 'Odile', 'Margara', 'Getullia'];
  const glintGroup = new THREE.Group();
  root.add(glintGroup);
  names.forEach((nm, i) => {
    const a = Math.PI * 0.15 + i * (Math.PI * 0.23) + (i > 1 ? Math.PI * 0.25 : 0);
    const p = new THREE.Vector3(REM.x + Math.cos(a) * 5.2 * (i % 2 ? 1.1 : 0.9), REM.y + [0.8, -0.6, 1.4, -0.2][i], REM.z - Math.sin(a) * 1.2);
    if (i === 0) gb.add(K.at(K.ngon(0.06, 0.45, 6), p.x, p.y - 0.25, p.z), '#cfe0ff', 'glass');
    if (i === 1) gb.add(K.at(K.archBand(0.5, 0.05, 0.06, 10), p.x, p.y - 0.25, p.z), '#cfe0ff', 'glass');
    if (i === 3) gb.add(K.at(K.dome(0.2, 10), p.x, p.y - 0.2, p.z), '#cfe0ff', 'glass');
    const s = K.glowSprite('#ffe9b0', 0.9, 0.6);
    s.position.copy(p);
    glintGroup.add(s);
    glints.push({ s, phase: i * 1.7 });
    const label = K.textSprite(nm, 0.32, { color: '#f1d79a', italic: true, px: 64 });
    label.position.set(p.x, p.y + 0.42, p.z);
    glintGroup.add(label);
  });
  glintGroup.add(gb.build({ castShadow: false }));

  // the clear blue hour of the dream (a sky shell that fades in)
  const dreamSky = new THREE.Mesh(new THREE.SphereGeometry(150, 32, 16), new THREE.ShaderMaterial({
    uniforms: { uO: { value: 0 } }, side: THREE.BackSide, transparent: true, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform float uO; varying vec3 vP; void main(){ float k = smoothstep(-0.1, 0.6, vP.y); vec3 c = mix(vec3(0.55,0.66,0.84), vec3(0.12,0.2,0.45), k); gl_FragColor = vec4(c, uO); }',
  }));
  dreamSky.renderOrder = -10;
  root.add(dreamSky);
  const dreamLight = new THREE.DirectionalLight('#a9c4ff', 0);
  dreamLight.position.set(10, 20, 14);
  root.add(dreamLight);

  // =============================================================== animation
  const imagine = new K.Toggle(0.22);
  let lastV = -1, spin = 0, saw = 0;
  const dustU = (dust.material as THREE.ShaderMaterial).uniforms, hazeU = (haze.material as THREE.ShaderMaterial).uniforms;
  const camImag = { position: [21.5, 21.5, 31] as [number, number, number], target: [0, 3.5, -2] as [number, number, number] };

  return {
    root,
    env: {
      skyTop: '#a4b3b1', skyHorizon: '#e9d49b', skyBottom: '#c9ab6d', skyCurve: 0.55,
      fog: '#dec88f', fogNear: 55, fogFar: 170,
      sunDir: [-0.75, 0.33, 0.35], sunColor: '#ffd28a', sunIntensity: 2.3, sunDisc: 0.8, sunGlow: 1.4,
      hemiSky: '#e3dcc2', hemiGround: '#9a7f50', hemiIntensity: 0.75, envIntensity: 0.8,
      clouds: 0.3, cloudColor: '#f2e2b8',
      bloomStrength: 0.55, bloomThreshold: 0.85, bloomRadius: 0.5,
      shadowRadius: 25, vignette: 0.4, saturation: 1.05, tiltShift: 0.4, grain: 0.03,
    },
    camera: {
      position: [20, 17, 26.5], target: [0, 1.5, -2], fov: 42,
      minDistance: 10, maxDistance: 80, maxPolar: 1.42, autoRotate: 0.25,
      views: [
        { position: [-26, 24, 18], target: [0, 1, -3] },
        { position: [-6, 2.6, 8.5], target: [6, 1.4, -2] },
      ],
    },
    interaction: {
      label: 'Pyrrha imagined',
      activeLabel: 'Arrive',
      hint: 'Before the journey: towers, tall windows, a square as deep as a well.',
      set: (on) => imagine.set(on),
      camera: camImag,
    },
    update(t, dt) {
      imagine.update(dt);
      const v = imagine.value;
      if (Math.abs(v - lastV) > 1e-4) { applyMorph(v); lastV = v; }
      // the real town sinks and settles
      real.visible = v < 0.995;
      real.scale.y = Math.max(0.001, 1 - v);
      real.position.y = -v * 1.5;
      dustU.uOpacity.value = 0.55 * (1 - v);
      hazeU.uOpacity.value = 0.07 * (1 - v);
      (dreamSky.material as THREE.ShaderMaterial).uniforms.uO.value = v * 0.97;
      dreamLight.intensity = v * 1.4;
      // the cup-city: small and translucent over the hidden sea, or full size above its bay
      const s = K.lerp(0.25, 1, v);
      cup.scale.setScalar(s);
      cup.position.set(0, K.lerp(REM.y - 0.25 * 6 + Math.sin(t * 0.6) * 0.2, 0, v), K.lerp(REM.z, 3, v));
      cup.rotation.y = (1 - v) * (t * 0.06);
      const op = K.lerp(0.78, 1, v);
      for (const m of cupMats) m.opacity = op;
      baseMat.opacity = op * (1 - K.smoothstep(0.85, 1, v));
      cupBase.visible = cupDisc.visible = v < 0.999;
      (candles.material as THREE.PointsMaterial).opacity = 0.55 + 0.25 * Math.sin(t * 7.1) * Math.sin(t * 3.3);
      glintGroup.visible = v < 0.99;
      glints.forEach((g, i) => ((g.s.material as THREE.SpriteMaterial).opacity = (0.25 + 0.75 * Math.max(0, Math.sin(t * 0.8 - g.phase))) * (1 - v) * (i === 2 ? 1.3 : 1)));
      // the name glides between the two
      plaque.position.lerpVectors(plaqueReal.p, plaqueImag.p, v);
      plaque.position.y += Math.sin(v * Math.PI) * 4;
      plaque.rotation.y = K.lerp(plaqueReal.ry, plaqueImag.ry, v);
      // wind: rotors whirl with gusts, vanes swing when the wind veers
      const gust = 1 + 0.35 * Math.sin(t * 0.9) * Math.sin(t * 0.37);
      spin += dt * 5.5 * gust;
      saw += dt * 22;
      const yaw = -Math.PI / 2 + 0.5 * Math.tanh(3 * Math.sin((t * TAU) / 50 + 0.4));
      pumps.forEach((p, i) => {
        setH(i, p.x, p.y, p.z, yaw);
        setR(i, p.x + Math.sin(yaw) * 0.2, p.y, p.z + Math.cos(yaw) * 0.2, yaw, 1, 0, spin + i);
      });
      setH.done(); setR.done();
      bladePos.forEach((p, i) => setB(i, p.x, p.y, p.z, 0, 1, 0, saw + i));
      setB.done();
      walkers.update(t);
      carts.update(t);
    },
  };
};

export default build;
