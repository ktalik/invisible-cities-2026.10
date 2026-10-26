// THEODORA - Hidden Cities 4.
// A spotless white city that waged war on every creature that shared it, until
// not a fly was left: clipped hedges, empty squares, swept avenues, and at the
// centre the great domed library. In its cellars, between the pages of old
// bestiaries, the other fauna slept. Eyes blink behind the cellar grates; loose
// pages drift. Toggle: the beasts return. Out of the glowing cellar gate come two
// sphinxes, a griffon pair, a chimera, a unicorn, a basilisk, harpies and a dragon,
// coloured like an illuminated manuscript, to take back the empty city.

import * as THREE from 'three';
import * as K from '../kit';
import type { CityBuilder } from '../core/types';

type B = K.Batch;
const A0 = Math.PI / 4; // the cellar gate faces this way
const POD_R = 4.8, POD_H = 1.7;

// ---------------------------------------------------------------- beast workshop
const ell = (r: number, x: number, y: number, z: number, s: [number, number, number]) => K.at(K.sphere(r, 16, 12), x, y, z, { s });
const eyes = (b: B, x: number, y: number, z: number, sep: number, col = '#ffe08a') => {
  for (const sx of [-1, 1]) b.add(K.at(K.sphere(0.035, 6, 5), x + sx * sep, y, z), col, 'glow', 4);
};
function lionBody(b: B, col: string, dark: string) {
  b.add(ell(0.5, 0, 0.62, -0.05, [0.62, 0.56, 1.15]), col, 'ceramic');
  b.add(ell(0.3, 0, 0.72, 0.4, [1, 1, 1]), col, 'ceramic');
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add(K.at(K.cyl(0.07, 0.06, 0.5, 8), sx * 0.17, 0, sz * 0.38 + 0.03), col, 'ceramic');
  b.add(K.tube([[0, 0.7, -0.6], [0, 0.6, -0.85], [0, 0.9, -1.05], [0, 1.1, -0.95]], 0.03, 12, 5), col, 'ceramic');
  b.add(K.at(K.sphere(0.07, 8, 6), 0, 1.12, -0.93), dark, 'ceramic');
}
function wingGeo(span: number, chord: number, bat: boolean) {
  const s = new THREE.Shape();
  s.moveTo(0, chord * 0.3);
  s.lineTo(span * 0.5, chord * 0.55);
  s.lineTo(span, chord * 0.35);
  if (bat) {
    for (let i = 0; i < 4; i++) s.quadraticCurveTo(span * (0.88 - i * 0.22), -chord * 0.1, span * (0.78 - i * 0.22), -chord * 0.5 + i * 0.05);
  } else {
    for (let i = 0; i < 6; i++) s.lineTo(span * (0.92 - i * 0.15), -chord * (0.45 - i * 0.04) + (i % 2) * chord * 0.12);
  }
  s.lineTo(0, -chord * 0.3);
  return new THREE.ShapeGeometry(s, 4).rotateX(Math.PI / 2);
}
interface Beast { g: THREE.Group; wings: THREE.Object3D[]; scale: number }
function assemble(body: (b: B) => void, wing?: { geo: () => THREE.BufferGeometry; col: string; at: [number, number, number] }): Beast {
  const g = new THREE.Group();
  const b = new K.Batch();
  body(b);
  g.add(b.build({ name: 'beast' }));
  const wings: THREE.Object3D[] = [];
  if (wing) {
    for (const sx of [-1, 1]) {
      const wb = new K.Batch();
      const geo = wing.geo();
      if (sx < 0) geo.scale(-1, 1, 1);
      wb.add(geo, wing.col, 'cloth');
      const pivot = new THREE.Group();
      pivot.position.set(sx * wing.at[0], wing.at[1], wing.at[2]);
      pivot.add(wb.build({ name: 'wing' }));
      pivot.userData.side = sx;
      g.add(pivot);
      wings.push(pivot);
    }
  }
  return { g, wings, scale: 1 };
}
const sphinx = () => assemble((b) => {
  const c = '#d9a24a';
  b.add(ell(0.5, 0, 0.32, -0.15, [0.66, 0.6, 1.4]), c, 'ceramic');
  for (const sx of [-1, 1]) b.add(K.at(K.box(0.16, 0.14, 0.7), sx * 0.17, 0, 0.45), c, 'ceramic');
  b.add(ell(0.3, 0, 0.62, 0.35, [1, 1.1, 0.9]), c, 'ceramic');
  b.add(K.at(K.sphere(0.17, 14, 10), 0, 1.02, 0.45), '#e6b98a', 'ceramic');
  b.add(K.at(K.pyramid(0.55, 0.4, 0.6), 0, 0.72, 0.27), '#2c4f9a', 'ceramic');
  b.add(K.at(K.torus(0.17, 0.025, 6, 20), 0, 1.08, 0.45), '#e2b553', 'gold');
  for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) b.add(K.at(K.box(0.12, 0.07, 0.1), sx * 0.2, 0.68 + i * 0.08, 0.5), i % 2 ? '#e2b553' : '#2c4f9a', i % 2 ? 'gold' : 'ceramic');
  b.add(K.at(K.cone(0.06, 0.12, 6), 0, 1.18, 0.55), '#e2b553', 'gold');
  eyes(b, 0, 1.05, 0.6, 0.06, '#7fd6ff');
  b.add(K.tube([[0, 0.3, -0.85], [0.25, 0.1, -1.1], [0.5, 0.05, -0.95]], 0.03, 10, 5), c, 'ceramic');
});
const griffon = () => assemble((b) => {
  lionBody(b, '#c98a3a', '#7a4a20');
  b.add(ell(0.26, 0, 1.12, 0.52, [1, 1.05, 1]), '#f4efe6', 'ceramic');
  b.add(K.at(K.cone(0.08, 0.24, 8), 0, 1.06, 0.8, { rx: Math.PI / 2 + 0.35 }), '#e9b83a', 'gold');
  for (const sx of [-1, 1]) b.add(K.at(K.cone(0.04, 0.16, 5), sx * 0.12, 1.33, 0.48, { rz: -sx * 0.4 }), '#f4efe6', 'ceramic');
  eyes(b, 0, 1.18, 0.74, 0.1);
}, { geo: () => wingGeo(1.5, 0.7, false), col: '#b9772f', at: [0.15, 0.95, 0.15] });
const chimera = () => assemble((b) => {
  lionBody(b, '#c4552f', '#7a2a18');
  b.add(K.at(K.sphere(0.36, 14, 10), 0, 1.02, 0.5, { s: [1, 1, 0.8] }), '#a83a1f', 'cloth');
  b.add(K.at(K.sphere(0.2, 12, 9), 0, 1.0, 0.72), '#d86a3e', 'ceramic');
  eyes(b, 0, 1.06, 0.88, 0.08);
  // the goat rising from the back
  b.add(K.strut([0, 0.85, -0.1], [0, 1.25, 0.0], 0.08, 8), '#e8e0cc', 'ceramic');
  b.add(K.at(K.sphere(0.13, 10, 8), 0, 1.3, 0.05, { s: [0.8, 0.9, 1.3] }), '#e8e0cc', 'ceramic');
  for (const sx of [-1, 1]) b.add(K.tube([[sx * 0.05, 1.4, 0], [sx * 0.15, 1.6, -0.12], [sx * 0.12, 1.55, -0.3]], 0.025, 8, 5), '#6b5a3a', 'ceramic');
  // the serpent tail
  b.add(K.tube([[0, 0.7, -0.6], [0, 0.4, -1.0], [0.3, 0.5, -1.35], [0.3, 0.85, -1.4]], 0.06, 16, 6), '#3e7a3a', 'ceramic');
  b.add(K.at(K.sphere(0.09, 10, 8), 0.3, 0.92, -1.36, { s: [0.8, 0.7, 1.4] }), '#3e7a3a', 'ceramic');
});
const unicorn = () => assemble((b) => {
  b.add(K.quadruped({ len: 1.05, h: 1.0, longNeck: true, tail: 0.35, ears: true, color: '#f8f5ee' }), null, 'ceramic');
  b.add(K.at(K.cone(0.04, 0.42, 8), 0, 1.3, 0.82, { rx: 0.9 }), '#f0c860', 'gold');
  for (let i = 0; i < 6; i++) b.add(K.at(K.box(0.05, 0.12, 0.08), 0, 0.85 + i * 0.07, 0.4 + i * 0.045), i % 2 ? '#c9a6e0' : '#f0c860', 'cloth');
  eyes(b, 0, 1.24, 0.82, 0.07, '#9fd0ff');
});
const basilisk = () => assemble((b) => {
  const pts: [number, number, number][] = [];
  for (let i = 0; i <= 24; i++) {
    const a = i * 0.5, r = 0.65 - i * 0.018;
    pts.push([Math.cos(a) * r, 0.1 + i * 0.022, Math.sin(a) * r]);
  }
  pts.push([0.1, 0.9, 0.15], [0.05, 1.2, 0.2]);
  b.add(K.tube(pts, 0.11, 80, 7), '#5f8f3a', 'ceramic');
  b.add(K.at(K.sphere(0.17, 12, 9), 0.05, 1.28, 0.24), '#e8c25a', 'gold');
  for (let i = 0; i < 4; i++) b.add(K.at(K.box(0.03, 0.12 + (i % 2) * 0.05, 0.06), 0.05, 1.42, 0.12 + i * 0.07), '#d93a2a', 'ceramic');
  b.add(K.at(K.cone(0.05, 0.14, 6), 0.05, 1.26, 0.44, { rx: Math.PI / 2 }), '#f0d070', 'gold');
  b.add(K.at(K.sphere(0.05, 8, 6), 0.05, 1.14, 0.36), '#d93a2a', 'ceramic');
  eyes(b, 0.05, 1.32, 0.37, 0.08, '#ff7a5a');
});
const harpy = () => assemble((b) => {
  b.add(ell(0.3, 0, 0, 0, [0.7, 0.7, 1.3]), '#5a3f80', 'ceramic');
  b.add(K.at(K.sphere(0.14, 12, 9), 0, 0.22, 0.38), '#e6b98a', 'ceramic');
  b.add(K.at(K.sphere(0.15, 12, 9), 0, 0.26, 0.33, { s: [1.05, 1, 1] }), '#2a1f1a', 'cloth');
  b.add(K.at(K.cone(0.22, 0.4, 7), 0, 0, -0.4, { rx: -Math.PI / 2, s: [1, 1, 0.3] }), '#c9a240', 'gold');
  eyes(b, 0, 0.24, 0.5, 0.05);
}, { geo: () => wingGeo(1.1, 0.55, false), col: '#7b5aa8', at: [0.12, 0.08, 0.05] });
const dragon = () => assemble((b) => {
  const curve: [number, number, number][] = [[0, 0.1, 1.5], [0, 0, 0.9], [0, -0.05, 0.2], [0, 0.05, -0.6], [0, -0.1, -1.4], [0, 0.15, -2.2], [0, 0.0, -2.9]];
  b.add(K.tube(curve, 0.22, 60, 10), '#2f8a64', 'ceramic');
  b.add(K.at(K.cone(0.18, 0.6, 8), 0, 0.0, -3.1, { rx: -Math.PI / 2 }), '#2f8a64', 'ceramic');
  b.add(K.at(K.box(0.3, 0.24, 0.6), 0, 0.02, 1.75), '#2f8a64', 'ceramic');
  b.add(K.at(K.box(0.24, 0.08, 0.5), 0, -0.14, 1.85), '#d8b04a', 'gold');
  for (const sx of [-1, 1]) b.add(K.at(K.cone(0.04, 0.35, 6), sx * 0.1, 0.2, 1.55, { rx: -1.0 }), '#e8d8a0', 'ceramic');
  for (let i = 0; i < 9; i++) b.add(K.at(K.cone(0.06, 0.22, 4), 0, 0.2 - (i % 3) * 0.02, 1.0 - i * 0.42), '#d8b04a', 'gold');
  eyes(b, 0, 0.16, 1.95, 0.12, '#ffcc3a');
}, { geo: () => wingGeo(2.6, 1.4, true), col: '#1f6a52', at: [0.15, 0.1, 0.4] });

// ---------------------------------------------------------------- the city
const build: CityBuilder = (ctx) => {
  const rng = ctx.rng;
  const root = new THREE.Group();
  const isl = K.island({ radius: 17, flat: 15.6, depth: 10, top: '#c9c1ad', edge: '#cfc6b2', cliff: '#bfb39b', under: '#5d574e', strata: '#d6cab0', seed: 44 });
  root.add(isl.mesh);
  root.add(K.cloudSea({ y: -8, color: '#f4f1ea', shadow: '#a9b5c8', opacity: 0.7, coverage: 0.5 }));

  const b = new K.Batch();
  const ux = Math.cos(A0), uz = Math.sin(A0);
  const marble = K.paintBy(new THREE.CircleGeometry(7, 96, 0, Math.PI * 2).rotateX(-Math.PI / 2), (x, _y, z, out) => {
    const r = Math.hypot(x, z), a = Math.atan2(z, x);
    out.set(((Math.floor(r / 0.7) + Math.floor((a / Math.PI) * 16)) & 1) ? '#ddd5c4' : '#c9bfab');
  });
  b.add(K.at(marble, 0, 0.012, 0), null, 'stone');
  // avenues
  for (let k = 0; k < 8; k++) {
    const a = A0 + (k / 8) * Math.PI * 2;
    b.add(K.at(K.box(1.3, 0.02, 8.6), Math.cos(a) * 11.2, 0, Math.sin(a) * 11.2, { ry: -a + Math.PI / 2 }), '#e6e0d2', 'stone');
  }
  // the podium with its cellar gate
  b.add(K.cyl(POD_R, POD_R + 0.15, POD_H, 64), '#ebe4d4', 'stone');
  b.add(K.at(K.cyl(POD_R + 0.25, POD_R + 0.25, 0.12, 64), 0, POD_H - 0.12, 0), '#f3eee2', 'stone');
  const GX = ux * (POD_R + 0.05), GZ = uz * (POD_R + 0.05), gry = Math.atan2(ux, uz);
  b.add(K.at(K.archWall(2.2, POD_H, 0.5, 1.5, 1.35), GX, 0, GZ, { ry: gry }), '#e1d8c4', 'stone');
  b.add(K.at(K.wallPlane(1.5, 1.35), GX - ux * 0.2, 0, GZ - uz * 0.2, { ry: gry }), '#ffb04a', 'glow', 2.2);
  // cellar grates around the podium
  const grates: THREE.Vector3[] = [];
  for (let k = 1; k < 10; k++) {
    const a = A0 + (k / 10) * Math.PI * 2;
    const x = Math.cos(a) * (POD_R + 0.17), z = Math.sin(a) * (POD_R + 0.17);
    b.add(K.at(K.wallPlane(0.6, 0.35), x, 0.35, z, { ry: Math.atan2(Math.cos(a), Math.sin(a)) }), '#2a2018', 'matte');
    for (let i = -2; i <= 2; i++) b.add(K.at(K.box(0.03, 0.35, 0.03), x + Math.cos(a + Math.PI / 2) * i * 0.12, 0.35, z + Math.sin(a + Math.PI / 2) * i * 0.12), '#3a3632', 'metal');
    grates.push(new THREE.Vector3(x + Math.cos(a) * 0.05 - 0.06 * Math.sin(a), 0.52, z + Math.sin(a) * 0.05 + 0.06 * Math.cos(a)));
    grates.push(new THREE.Vector3(x + Math.cos(a) * 0.05 + 0.06 * Math.sin(a), 0.52, z + Math.sin(a) * 0.05 - 0.06 * Math.cos(a)));
  }
  // stairs up to the library at the back
  b.add(K.at(K.stairs(8, 2.2, POD_H / 8, 0.32), -ux * (POD_R + 2.5), 0, -uz * (POD_R + 2.5), { ry: gry }), '#efe9dc', 'stone');
  // the library rotunda
  const LY = POD_H;
  b.add(K.at(K.cyl(3.0, 3.0, 3.2, 48), 0, LY, 0), '#e8e0d0', 'plaster');
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    K.column(b, { x: Math.cos(a) * 3.85, y: LY, z: Math.sin(a) * 3.85, h: 3.0, r: 0.16, color: '#f6f1e6', sides: 12 });
    if (i % 2 === 0) b.add(K.at(K.wallPlane(0.5, 1.2), Math.cos(a) * 3.01, LY + 1.0, Math.sin(a) * 3.01, { ry: Math.atan2(Math.cos(a), Math.sin(a)) }), '#ffd59a', 'glow', 1.4);
  }
  b.add(K.at(K.cyl(4.15, 4.15, 0.35, 48), 0, LY + 3.0, 0), '#efe8da', 'stone');
  b.add(K.at(K.cyl(3.2, 3.2, 0.7, 48), 0, LY + 3.2, 0), '#f2ece0', 'plaster');
  b.add(K.at(K.dome(3.2, 40, 1, 0.85), 0, LY + 3.9, 0), '#7f95b0', 'metal');
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    b.add(K.at(K.torus(3.21, 0.03, 4, 24, Math.PI / 2).rotateX(-Math.PI / 2), 0, LY + 3.9, 0, { ry: -a, s: [1, 0.85, 1] }), '#d8b04a', 'gold');
  }
  b.add(K.at(K.cyl(0.45, 0.45, 0.7, 16), 0, LY + 6.55, 0), '#f2ece0', 'plaster');
  b.add(K.at(K.cone(0.5, 0.8, 16), 0, LY + 7.25, 0), '#d8b04a', 'gold');

  // ---- the orderly houses: identical, white, clean
  const plazaU = { x: Math.cos(A0 - 0.6) * 10.4, z: Math.sin(A0 - 0.6) * 10.4 };
  const plazaB = { x: Math.cos(A0 + 0.6) * 10.4, z: Math.sin(A0 + 0.6) * 10.4 };
  const towers = [A0 + Math.PI / 2, A0 - Math.PI / 2, A0 + Math.PI].map((a) => ({ x: Math.cos(a + 0.2) * 11.6, z: Math.sin(a + 0.2) * 11.6 }));
  const busy = (x: number, z: number) =>
    (Math.hypot(x, z) < 10.6 && Math.abs(((Math.atan2(z, x) - A0 + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < 0.42) ||
    Math.hypot(x - plazaU.x, z - plazaU.z) < 2.3 || Math.hypot(x - plazaB.x, z - plazaB.z) < 2.1 || towers.some((t) => Math.hypot(x - t.x, z - t.z) < 1.3);
  for (const r of [8.0, 9.4, 10.8, 12.2, 13.6, 14.9]) {
    const n = Math.floor((Math.PI * 2 * r) / 1.45);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + 0.02;
      let gap = false;
      for (let k = 0; k < 8; k++) {
        const d = Math.abs(((a - (A0 + (k / 8) * Math.PI * 2) + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        if (d * r < 0.95) gap = true;
      }
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (gap || busy(x, z)) continue;
      K.house(b, { x, z, ry: -a + Math.PI / 2, w: 1.05, d: 1.0, h: r < 9 ? 1.9 : 1.5, roof: 'hip', roofH: 0.45, wall: '#e6dfd1', roofColor: '#5f7590', roofFinish: 'ceramic', lit: 0, rng, cornice: false });
    }
  }
  for (const t of towers) K.tower(b, { x: t.x, z: t.z, r: 0.6, h: 4.6, sides: 8, top: 'flat', color: '#f1ece2', topColor: '#d8cfbd', bands: 1.5, rng, lit: 0 });
  K.fountain(b, { x: plazaB.x, z: plazaB.z, r: 1.0, color: '#e8e1d2' });
  b.add(K.at(K.disc(2.2, 40), plazaU.x, 0.02, plazaU.z), '#e4ddcc', 'stone');
  b.add(K.at(K.disc(2.0, 40), plazaB.x, 0.02, plazaB.z), '#e4ddcc', 'stone');
  // clipped cypresses in ranks along the avenues
  for (let k = 0; k < 8; k++) {
    const a = A0 + (k / 8) * Math.PI * 2;
    for (let j = 0; j < 7; j++) {
      const r = 7.6 + j * 1.15;
      for (const s of [-0.55, 0.55]) K.tree(b, { x: Math.cos(a) * r - Math.sin(a) * s, z: Math.sin(a) * r + Math.cos(a) * s, kind: 'cypress', h: 1.4, rng, color: '#3d5c45' });
    }
  }
  root.add(b.build({ name: 'theodora' }));
  const water = K.waterDisc(0.85, 0.32, { color: '#8fc4d8' });
  water.position.set(plazaB.x, 0, plazaB.z);
  root.add(water);

  // ---- eyes behind the grates, loose pages, the few tidy citizens
  const eyePts = K.glowPoints(grates, '#ffcf6a', 0.35, 0.9);
  root.add(eyePts);
  root.add(K.particles({ count: 90, center: [ux * 6.5, 0, uz * 6.5], radius: 2.6, y0: 0.2, y1: 4, color: '#f3e6c8', colors: ['#efe0bf'], size: 0.1, opacity: 0.9, swirl: 0.9, velocity: [0.05, 0.12, -0.05], rng: rng.fork('pages') }));
  const ringPath = (r: number) => Array.from({ length: 65 }, (_, i) => new THREE.Vector3(Math.cos((i / 64) * Math.PI * 2) * r, 0.02, Math.sin((i / 64) * Math.PI * 2) * r));
  const walkers = new K.Walkers({ paths: [ringPath(6.9), ringPath(7.15)], closed: true, count: 34, rng: rng.fork('walk'), speed: [0.2, 0.32], colors: ['#f2efe8', '#c9d4e2', '#8aa0bd', '#e6dccb'] });
  root.add(walkers.mesh);

  // ---- the beasts and their destinations
  const D = new THREE.Vector3(ux * (POD_R + 1.4), 0, uz * (POD_R + 1.4));
  const S = new THREE.Vector3(ux * (POD_R - 1.2), 0, uz * (POD_R - 1.2));
  const px = -uz, pz = ux;
  type Mode = 'walk' | 'fly';
  const beasts: (Beast & { mode: Mode; dest: (t: number) => [number, number, number, number]; delay: number })[] = [];
  const add = (bst: Beast, scale: number, mode: Mode, delay: number, dest: (t: number) => [number, number, number, number]) => {
    bst.g.scale.setScalar(scale * 1.45);
    bst.scale = scale * 1.45;
    bst.g.visible = false;
    root.add(bst.g);
    beasts.push({ ...bst, mode, dest, delay });
  };
  const fixed = (x: number, y: number, z: number, ry: number) => () => [x, y, z, ry] as [number, number, number, number];
  const orbit = (R: number, y: number, w: number, ph: number) => (t: number) => {
    const a = ph + t * w;
    return [Math.cos(a) * R, y + Math.sin(t * 0.8 + ph) * 0.5, Math.sin(a) * R, Math.atan2(-Math.sin(a) * Math.sign(w), Math.cos(a) * Math.sign(w))] as [number, number, number, number];
  };
  add(sphinx(), 1.1, 'walk', 0.0, fixed(D.x + px * 2.0 - ux * 0.3, 0, D.z + pz * 2.0 - uz * 0.3, gry));
  add(sphinx(), 1.1, 'walk', 0.05, fixed(D.x - px * 2.0 - ux * 0.3, 0, D.z - pz * 2.0 - uz * 0.3, gry));
  add(unicorn(), 1.0, 'walk', 0.12, (t) => {
    const a = t * 0.45;
    return [plazaU.x + Math.cos(a) * 1.3, Math.abs(Math.sin(t * 4)) * 0.05, plazaU.z + Math.sin(a) * 1.3, Math.atan2(-Math.sin(a), Math.cos(a))];
  });
  add(basilisk(), 0.9, 'walk', 0.2, fixed(plazaB.x + 0.9, 0.42, plazaB.z - 0.6, gry + 1.2));
  add(chimera(), 1.05, 'walk', 0.28, fixed(Math.cos(A0 + 0.5) * 4.45, POD_H, Math.sin(A0 + 0.5) * 4.45, gry + 0.4));
  add(griffon(), 0.95, 'walk', 0.34, fixed(towers[0].x, 4.72, towers[0].z, gry + 0.8));
  add(griffon(), 0.95, 'walk', 0.38, fixed(towers[1].x, 4.72, towers[1].z, gry - 0.8));
  add(harpy(), 1.0, 'fly', 0.42, orbit(11, 6.5, 0.32, 0.5));
  add(harpy(), 1.0, 'fly', 0.46, orbit(9.5, 5.4, -0.36, 2.5));
  add(dragon(), 1.15, 'fly', 0.5, orbit(7.8, 9.8, 0.24, 1.2));
  const gateGlow = K.glowSprite('#ffb85a', 3.5, 0.5);
  gateGlow.position.set(GX + ux * 0.4, 0.8, GZ + uz * 0.4);
  root.add(gateGlow);

  const tog = new K.Toggle(0.28);
  const tmp = new THREE.Vector3();
  return {
    root,
    env: {
      skyTop: '#6f9fd6',
      skyHorizon: '#e9eef2',
      skyBottom: '#b9c2cc',
      skyCurve: 0.55,
      fog: '#e4e9ee',
      fogNear: 80,
      fogFar: 260,
      sunDir: [0.45, 0.7, 0.55],
      sunColor: '#fff3df',
      sunIntensity: 2.0,
      sunDisc: 0.8,
      sunGlow: 0.8,
      hemiSky: '#d6e4f4',
      hemiGround: '#a89c88',
      hemiIntensity: 0.5,
      envIntensity: 0.55,
      clouds: 0.25,
      cloudColor: '#ffffff',
      bloomStrength: 0.45,
      bloomThreshold: 0.95,
      bloomRadius: 0.5,
      tiltShift: 0.45,
      shadowRadius: 19,
      vignette: 0.35,
      exposure: 0.85,
      contrast: 1.08,
      saturation: 1.05,
    },
    camera: {
      position: [20, 15, 21],
      target: [1, 2, 1],
      minDistance: 5,
      maxDistance: 70,
      autoRotate: 0.25,
      views: [
        { position: [ux * 13.5, 3.6, uz * 13.5], target: [ux * 4.5, 1.6, uz * 4.5] },
        { position: [-6, 22, 16], target: [0, 2, 0] },
      ],
    },
    interaction: {
      label: 'The beasts return',
      activeLabel: 'Back into the books',
      hint: 'From the library cellars the fabulous fauna reclaims the empty city.',
      set: (on) => tog.set(on),
    },
    update(t, dt) {
      tog.update(dt);
      const s = tog.raw;
      (eyePts.material as THREE.PointsMaterial).opacity = (0.35 + 0.6 * Math.max(0, Math.sin(t * 1.7) * Math.sin(t * 0.43 + 1))) * (1 - s);
      (gateGlow.material as THREE.SpriteMaterial).opacity = 0.45 + 0.35 * s + 0.08 * Math.sin(t * 2);
      for (const bst of beasts) {
        const p = K.clamp((s - bst.delay) * 2.0);
        bst.g.visible = p > 0.001;
        if (!bst.g.visible) continue;
        const [dx, dy, dz, dry] = bst.dest(t);
        let ry = dry;
        if (p < 0.3) {
          const k = p / 0.3;
          tmp.lerpVectors(S, D, k);
          ry = gry;
        } else {
          const k = K.easeInOut((p - 0.3) / 0.7);
          tmp.set(K.lerp(D.x, dx, k), K.lerp(0, dy, k) + Math.sin(k * Math.PI) * (bst.mode === 'fly' ? 3 : 0.8 + dy * 0.3), K.lerp(D.z, dz, k));
          const head = Math.atan2(dx - D.x, dz - D.z);
          ry = k < 0.85 ? head : K.lerp(head, dry, (k - 0.85) / 0.15);
        }
        bst.g.position.copy(tmp);
        bst.g.rotation.y = ry;
        bst.g.scale.setScalar(bst.scale * (0.35 + 0.65 * K.smoothstep(0, 0.35, p)));
        const flying = bst.mode === 'fly' && p > 0.3;
        for (const w of bst.wings) {
          const side = w.userData.side as number;
          const flap = flying ? Math.sin(t * 5 + bst.delay * 9) * 0.55 : 0.5 + Math.sin(t * 0.9 + bst.delay * 9) * 0.12;
          w.rotation.z = side * flap;
        }
        bst.g.rotation.z = flying ? 0.2 * K.smoothstep(0.3, 0.6, p) : 0;
        if (!flying) bst.g.position.y += Math.sin(t * 1.4 + bst.delay * 20) * 0.015;
      }
      walkers.update(t);
    },
  };
};

export default build;
