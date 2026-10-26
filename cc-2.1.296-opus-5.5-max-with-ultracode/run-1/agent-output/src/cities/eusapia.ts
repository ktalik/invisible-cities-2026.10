// EUSAPIA - Cities & the Dead 3.
// A drum of earth cut open like an architectural section: on top the sunlit festival
// city, inside a candlelit cavern holding its exact twin, peopled by the dried dead
// at their banquets, dances, trumpets and favourite trades. Hooded brothers carry the
// dead down spiral shafts and bring back the news; each innovation appears below
// first and is copied above a beat later.
// Toggle: reverse the copy, the upper city is rebuilt from below in the image of the dead.

import * as THREE from 'three';
import * as K from '../kit';
import type { CityBuilder } from '../core/types';

const LOW = -11;      // cavern floor
const CEIL = -2.5;    // cavern ceiling
const R = 19;         // drum radius
const CUT = 55 * Math.PI / 180;
const VZ = 4;         // wedge vertex at (0, VZ)
const cs = Math.cos(CUT), sn = Math.sin(CUT);

const inWedge = (x: number, z: number, m = 0) => x * cs - (z - VZ) * sn < m && -x * cs - (z - VZ) * sn < m;
function cutPhi(r: number) {
  const vd = VZ * cs;
  const s = -vd + Math.sqrt(vd * vd - VZ * VZ + r * r);
  return Math.atan2(s * sn, VZ + s * cs);
}
/** the drum outline minus the wedge, as a ring (r0 > 0) or a pie (r0 = 0) */
function cutShape(r0: number, r1: number) {
  const s = new THREE.Shape();
  const p1 = cutPhi(r1);
  const N = 72;
  if (r0 <= 0) s.moveTo(0, VZ);
  for (let i = 0; i <= N; i++) {
    const a = p1 + ((Math.PI * 2 - 2 * p1) * i) / N;
    if (r0 > 0 && i === 0) s.moveTo(Math.sin(a) * r1, Math.cos(a) * r1);
    else s.lineTo(Math.sin(a) * r1, Math.cos(a) * r1);
  }
  if (r0 > 0) {
    const p0 = cutPhi(r0);
    for (let i = N; i >= 0; i--) {
      const a = p0 + ((Math.PI * 2 - 2 * p0) * i) / N;
      s.lineTo(Math.sin(a) * r0, Math.cos(a) * r0);
    }
  }
  return s;
}
const strata = (y: number, top: string) => (o: THREE.Color) => {
  const n = K.noise2(y * 1.7, 3.1);
  o.set(K.mix(K.mix('#5b3f2a', '#9a7a4a', 0.5 + 0.5 * Math.sin(y * 2.3 + n * 2)), '#6a6660', K.clamp(n * 0.8)));
  if (y > -0.05) o.set(top);
};

interface House { x: number; z: number; w: number; d: number; h: number; ry: number; wall: string; roof: 'gable' | 'hip' | 'flat'; roofC: string; awn: string | null }

const build: CityBuilder = (ctx) => {
  const rng = ctx.rng;
  const root = new THREE.Group();
  const earth = new K.Batch();

  // ---------------------------------------------------------------- the drum and its section
  const slab = (shape: THREE.Shape, y0: number, y1: number, top: string) =>
    K.paintBy(K.at(K.extrudeUp(shape, y1 - y0, 4), 0, y0, 0), (_x, y, _z, o) => strata(y, top)(o));
  earth.add(slab(cutShape(0, R), CEIL, 0, '#cdb48a'), null, 'stone');
  earth.add(slab(cutShape(16.5, R), LOW, CEIL, '#5b3f2a'), null, 'stone');
  earth.add(K.paintBy(slab(cutShape(0, R), LOW - 2, LOW, '#6a5038'), (_x, y, _z, o) => strata(y, '#6e5640')(o)), null, 'stone');
  const under = K.wobble(K.lathe([[0.5, -19], [7, -17.5], [13, -15.5], [18.9, -13.02]], 48), 0.5, 0.5, 2);
  K.paintBy(under, (_x, y, _z, o) => o.set(K.mix('#3a2a20', '#7a5a3a', 0.5 + 0.5 * Math.sin(y * 2.4))));
  earth.add(under, null, 'stone');
  // strata on the clean cut faces
  const sAt = (r: number) => -VZ * cs + Math.sqrt((VZ * cs) ** 2 - VZ * VZ + r * r);
  for (const sg of [-1, 1]) {
    const nx = -cs * sg, nz = sn;
    for (const [s0, s1, y0, y1] of [[0, sAt(R), CEIL, 0], [sAt(16.5), sAt(R), LOW, CEIL], [0, sAt(R), LOW - 2, LOW]] as const) {
      const w = s1 - s0, hgt = y1 - y0, sm = (s0 + s1) / 2;
      const pg = K.plane(w, hgt, Math.ceil(w * 2), Math.ceil(hgt * 6)).rotateX(Math.PI / 2);
      K.paintBy(pg, (px, py, _pz, out) => {
        const yy = y0 + hgt / 2 + py, n = K.fbm2(px * 0.4, yy * 1.5, 3);
        strata(Math.min(-0.1, yy - 0.06 + n * 0.25), '#5b3f2a')(out);
        out.multiplyScalar(0.85 + n * 0.5);
      });
      earth.add(K.at(pg, sg * sn * sm + nx * 0.03, y0 + hgt / 2, VZ + cs * sm + nz * 0.03, { ry: Math.atan2(nx, nz) }), null, 'stone');
    }
  }
  // the cavern ceiling: hanging roots
  const roots: [number, number, number, number][] = [];
  for (let i = 0; i < 160; i++) {
    const [x, z] = rng.inDisc(16);
    if (inWedge(x, z, -0.3)) continue;
    roots.push([x, z, rng.float(0.3, 1.4), rng.float(0.02, 0.05)]);
  }
  for (const [x, z, l, r] of roots) earth.add(K.at(K.cone(r, l, 4), x, CEIL - 0.01, z, { rx: Math.PI }), '#3a2a1e', 'wood');
  root.add(earth.build({ name: 'earth' }));

  // ---------------------------------------------------------------- one city plan, built twice
  const WALLS = ['#ecdcbc', '#f2d6c4', '#e8e0c4', '#d8e2d0', '#f0caa8', '#e4d0e0', '#f4e6c8'];
  const AWN = ['#c8573a', '#3a6a8a', '#d3a53a', '#5a8a5a', '#a04a6a'];
  const reserve: [number, number, number][] = [[0, 0, 4.4], [0, -6.5, 1.4], [-5, -3.6, 1.3], [5, -3.6, 1.3], [-6.5, 1.5, 1.4], [10.2, 0, 2.6]];
  const SHAFTS: [number, number][] = [75, 150, 210, 285].map((d) => [Math.sin(d * Math.PI / 180) * 11, Math.cos(d * Math.PI / 180) * 11]);
  for (const [x, z] of SHAFTS) reserve.push([x, z, 1.8]);
  const streetA = (a: number) => { const k = ((a / (Math.PI / 4)) % 1 + 1) % 1; return Math.abs(k - 0.5) < 0.09; };
  const houses: House[] = [];
  for (let tries = 0; tries < 900 && houses.length < 110; tries++) {
    const r = rng.float(4.8, 14.6), a = rng.angle();
    const x = Math.sin(a) * r, z = Math.cos(a) * r;
    const w = rng.float(1.2, 2.4), d = rng.float(1.2, 1.9);
    const rad = Math.max(w, d) * 0.62;
    if (streetA(a) || inWedge(x, z, rad + 0.2)) continue;
    if (reserve.some(([rx, rz, rr]) => Math.hypot(x - rx, z - rz) < rr + rad)) continue;
    if (houses.some((h) => Math.hypot(x - h.x, z - h.z) < rad + Math.max(h.w, h.d) * 0.62 + 0.15)) continue;
    houses.push({ x, z, w, d, h: rng.float(1.6, 4.6), ry: a + rng.float(-0.05, 0.05), wall: rng.pick(WALLS), roof: rng.pick(['gable', 'hip', 'flat', 'flat'] as const), roofC: rng.pick(['#c4704a', '#b8603e', '#d08a5a']), awn: rng.chance(0.4) ? rng.pick(AWN) : null });
  }
  // twelve buildings that the dead will change (a dome sprouts on a flat roof)
  const mutable = houses.filter((h) => h.roof === 'flat').slice(0, 12);

  const twin = (b: K.Batch, y: number, upper: boolean) => {
    const at = (g: THREE.BufferGeometry, x: number, yy: number, z: number, o: K.AtOpts = {}) => K.at(g, x, y + yy, z, o);
    if (!upper) b.add(at(K.disc(16.3, 64), 0, 0.005, 0), '#6e5640', 'stone');
    b.add(at(K.disc(4, 48), 0, 0.012, 0), '#e6d6b4', 'stone');
    b.add(at(K.cyl(1.6, 1.6, 0.08, 32), 0, 0, 0), '#c9a77a', 'wood');
    for (let i = 0; i < 8; i++) {
      const a = Math.PI / 8 + (i * Math.PI) / 4;
      for (let k = 0; k < 6; k++) {
        const x = Math.sin(a) * (5 + k * 1.8), z = Math.cos(a) * (5 + k * 1.8);
        if (!inWedge(x, z, 0.6)) b.add(at(K.box(1.0, 0.02, 1.85), x, 0.012, z, { ry: a }), '#d8c8a4', 'stone');
      }
    }
    for (const h of houses) {
      K.house(b, { x: h.x, y, z: h.z, ry: h.ry, w: h.w, d: h.d, h: h.h, roof: h.roof, wall: h.wall, roofColor: h.roofC, cornice: true, lit: upper ? 0.05 : 0.35, glow: 2.4, litColor: '#ffb24f', rng });
      if (h.awn) {
        const off = h.d / 2 + 0.22;
        b.add(at(K.shedRoof(h.w * 0.8, 0.45, 0.02, 0.18), h.x + Math.sin(h.ry) * off, 0.95, h.z + Math.cos(h.ry) * off, { ry: h.ry + Math.PI }), h.awn, 'cloth');
      }
      if (h.roof === 'flat' && !mutable.includes(h)) b.add(at(K.box(0.5, 0.5, 0.5), h.x, h.h, h.z, { ry: h.ry }), '#9ab070', 'cloth'); // roof-terrace pergola
    }
    // banquet tables in a square ring, the bandstand on the north side
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      b.add(at(K.box(3, 0.42, 0.6), Math.sin(a) * 2.6, 0, Math.cos(a) * 2.6, { ry: a + Math.PI / 2 }), '#f4ece0', 'cloth');
      for (let j = 0; j < 6; j++) b.add(at(K.cyl(0.05, 0.04, 0.1, 6), Math.sin(a) * 2.6 + Math.cos(a) * (j - 2.5) * 0.45, 0.42, Math.cos(a) * 2.6 - Math.sin(a) * (j - 2.5) * 0.45), '#d3a53a', 'gold');
    }
    b.add(at(K.cyl(1.0, 1.1, 0.4, 16), 0, 0, -3.9), '#e8dcc4', 'stone');
    b.add(at(K.dome(1.1, 16, 0.5, 0.5), 0, 1.6, -3.9), '#c8573a', 'cloth');
    for (let i = 0; i < 6; i++) b.add(at(K.cyl(0.03, 0.03, 1.2, 5), Math.sin(i * 1.05) * 1.0, 0.4, -3.9 + Math.cos(i * 1.05) * 1.0), '#f4ece0', 'wood');
    // clock tower
    K.tower(b, { x: 0, y, z: -6.5, r: 0.7, h: 6, sides: 4, top: 'pyramid', color: '#ecdcbc', topColor: '#c4704a', bands: 2, bandColor: '#d8c8a4', rng });
    b.add(at(K.cyl(0.45, 0.45, 0.04, 20), 0, 5.0, -5.78, { rx: Math.PI / 2 }), '#f8f2e0', 'ceramic');
    // the clockmaker: twenty small clock faces and a grandfather clock
    b.add(at(K.box(2.2, 2.6, 1.4), -5, 0, -3.9), '#e4d0b0', 'plaster');
    for (let i = 0; i < 20; i++) b.add(at(K.cyl(0.11, 0.11, 0.03, 12), -5.85 + (i % 5) * 0.42, 0.9 + Math.floor(i / 5) * 0.42, -3.17, { rx: Math.PI / 2 }), '#f8f2e0', 'ceramic');
    b.add(at(K.box(0.3, 0.9, 0.22), -4.4, 0, -2.9), '#5a3a28', 'wood');
    // the barber: striped pole, chair, the actor seated with his script
    b.add(at(K.box(2.2, 2.4, 1.4), 5, 0, -3.9), '#f0caa8', 'plaster');
    const pole = K.paintBy(K.cyl(0.07, 0.07, 1.1, 10, false), (px, py, pz, o) => o.set(K.fract(py * 3 + Math.atan2(px, pz) / 6.283) < 0.5 ? '#c8302a' : '#f4f0e8'));
    b.add(at(pole, 4.0, 0, -3.0), null, 'ceramic');
    b.add(at(K.box(0.3, 0.3, 0.3), 5.0, 0, -2.6), '#3a2a20', 'wood');
    // the dairy yard: a fence and a stool
    for (let i = 0; i < 10; i++) b.add(at(K.box(0.05, 0.4, 0.05), -6.5 + Math.cos(i * 0.63) * 1.3, 0, 1.5 + Math.sin(i * 0.63) * 1.3), '#7a5a3a', 'wood');
    b.add(at(K.cyl(0.08, 0.08, 0.15, 6), -6.2, 0, 1.3), '#7a5a3a', 'wood');
    // the theatre on the east
    for (let k = 0; k < 4; k++) b.add(at(new THREE.CylinderGeometry(1.0 + k * 0.4, 1.0 + k * 0.4, 0.14 * (k + 1), 20, 1, false, 0, Math.PI).translate(0, 0.07 * (k + 1), 0), 10.2, 0, 0, { ry: 0 }), '#e8dcc4', 'stone');
    // the confraternity's striped chapels (above) and stone arches (below)
    for (const [x, z] of SHAFTS) {
      if (upper) {
        const drum = K.paintBy(K.cyl(1.2, 1.2, 1.4, 24), (px, _py, pz, o) => o.set(Math.floor((Math.atan2(px, pz) / 6.283 + 1) * 12) % 2 ? '#1e1a18' : '#f2ece0'));
        b.add(at(drum, x, 0, z), null, 'ceramic');
        b.add(at(K.dome(1.25, 20, 1, 0.8), x, 1.4, z), '#f2ece0', 'ceramic');
        b.add(at(K.cone(0.12, 0.6, 8), x, 2.4, z), '#1e1a18', 'metal');
      } else {
        b.add(at(K.archWall(1.8, 1.8, 0.3, 1.0, 1.4), x, 0, z + 1.2), '#8a7a62', 'stone');
      }
    }
  };
  const upperB = new K.Batch(), lowerB = new K.Batch();
  twin(upperB, 0, true);
  twin(lowerB, LOW, false);
  const upper = upperB.build({ name: 'upper' });
  const lower = lowerB.build({ name: 'lower' });
  root.add(upper, lower);
  // bunting over the living city
  const bunt = new K.Batch();
  for (let i = 0; i < 8; i++) {
    const a = Math.PI / 8 + (i * Math.PI) / 4;
    const A = new THREE.Vector3(Math.sin(a) * 3.8, 2.2, Math.cos(a) * 3.8), B = new THREE.Vector3(Math.sin(a) * 9, 3.0, Math.cos(a) * 9);
    if (inWedge(B.x, B.z, 0.5)) continue;
    K.ropePoints(A, B, 0.6, 14).forEach((p, j) => { if (j > 0 && j < 14) bunt.add(K.at(K.cone(0.08, 0.16, 3), p.x, p.y - 0.16, p.z, { rx: Math.PI }), AWN[j % AWN.length], 'cloth'); });
    bunt.add(K.rope(A, B, 0.6, 0.008), '#f4ece0', 'cloth');
  }
  upper.add(bunt.build({ name: 'bunting' }));

  // ---------------------------------------------------------------- spiral shafts with hooded brothers
  const stairs = new K.Batch();
  for (const [x, z] of SHAFTS) stairs.add(K.at(K.spiralStair(0.8, -LOW, 66, 3, 0.6), x, LOW, z), '#9a8a72', 'stone');
  root.add(stairs.build({ name: 'shafts' }));

  // ---------------------------------------------------------------- the living and the dead
  const spots: [number, number][] = [];
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    for (let j = 0; j < 6; j++) for (const sd of [-1, 1]) spots.push([Math.sin(a) * (2.6 + sd * 0.45) + Math.cos(a) * (j - 2.5) * 0.45, Math.cos(a) * (2.6 + sd * 0.45) - Math.sin(a) * (j - 2.5) * 0.45]);
  }
  const vignette: [number, number][] = [[-4.4, -2.6], [5.0, -2.6], [5.3, -2.7], [-6.2, 1.55], [10.2, 0.8]];
  const free = (n: number) => {
    const out: [number, number][] = [];
    while (out.length < n) {
      const a = Math.PI / 8 + rng.int(0, 7) * Math.PI / 4 + rng.float(-0.05, 0.05), r = rng.float(4.6, 15);
      const x = Math.sin(a) * r, z = Math.cos(a) * r;
      if (!inWedge(x, z, 0.3)) out.push([x, z]);
    }
    return out;
  };
  const livePos = [...spots, ...vignette, ...free(380 - spots.length - vignette.length)];
  const deadPos = [...spots, ...vignette, ...free(620 - spots.length - vignette.length)];
  const LIVE = ['#c8573a', '#3a6a8a', '#f4e6c8', '#5a8a5a', '#d3a53a', '#a04a6a', '#e8c0a0'];
  const DEAD = ['#2e4a2a', '#8a1c2b', '#1e1a18', '#6a4a2a', '#9a7ab0', '#d06a86', '#2a3a6a', '#c9a650'];
  const liveMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
  const liveCols = livePos.map(() => K.pickJitter(LIVE, rng));
  const living = K.instanced(K.personGeometry(0.25), liveMat, livePos.length, (i, o, c) => {
    const [x, z] = livePos[i];
    o.position.set(x, i < spots.length ? -0.06 : 0, z);
    o.rotation.y = i < spots.length ? Math.atan2(-x, -z) : rng.angle();
    c.copy(liveCols[i]);
  });
  root.add(living);
  root.add(K.instanced(K.personGeometry(0.25), K.figureMaterial(), deadPos.length, (i, o, c) => {
    const [x, z] = deadPos[i];
    o.position.set(x, LOW + (i < spots.length ? -0.06 : 0), z);
    o.rotation.y = i < spots.length ? Math.atan2(-x, -z) : rng.angle();
    c.copy(K.mix(rng.pick(DEAD), '#c9a650', 0.35));
  }));
  // the heifer: flesh above, bones below
  for (const [y, col] of [[0, '#8a5a3a'], [LOW, '#e8dcb4']] as const) {
    const cow = new THREE.Mesh(K.quadruped({ len: 0.7, h: 0.45, horns: true, tail: 0.2, color: col }), K.figureMaterial());
    cow.position.set(-6.7, y, 1.6);
    cow.rotation.y = 1.2;
    root.add(cow);
  }
  // dancers and trumpeters: whirling above, held still below
  const DN = 16;
  const perfUp = K.instanced(K.personGeometry(0.26), K.figureMaterial(), DN, (i, _o, c) => { c.set(LIVE[i % LIVE.length]); });
  const perfDn = K.instanced(K.personGeometry(0.26), K.figureMaterial(), DN, (i, _o, c) => { c.copy(K.mix(DEAD[i % DEAD.length], '#c9a650', 0.35)); });
  root.add(perfUp, perfDn);
  const setUp = K.instanceSetter(perfUp), setDn = K.instanceSetter(perfDn);
  // clock hands: turning above, stopped below
  const handMat = new THREE.MeshStandardMaterial({ color: '#1e1a18' });
  const hands = [0, LOW].map((y) => { const m = new THREE.Mesh(K.box(0.04, 0.38, 0.02).translate(0, -0.03, 0), handMat); m.position.set(0, y + 5.0, -5.74); root.add(m); return m; });
  hands[1].rotation.z = 2.2;

  // brothers: 3 per shaft, down with a wrapped body, up with a glowing scroll
  const BN = SHAFTS.length * 3;
  const broMat = new THREE.MeshStandardMaterial({ color: '#2a211c', roughness: 0.95 });
  const bros = K.instanced(K.merge([K.personGeometry(0.27), K.at(K.cone(0.055, 0.12, 6), 0, 0.24, 0)]), broMat, BN, undefined, { colors: false });
  const litters = K.instanced(K.at(K.box(0.14, 0.08, 0.5), 0, 0.2, 0), K.M.cloth('#e8dcc0'), SHAFTS.length, undefined, { colors: false });
  root.add(bros, litters);
  const setBro = K.instanceSetter(bros), setLit = K.instanceSetter(litters);
  const scrolls = SHAFTS.map(() => { const s = K.glowSprite('#ffd27a', 0.5, 0.95); root.add(s); return s; });

  // innovations: domes that sprout below first and above a beat later
  const domeGeo = K.dome(0.55, 16, 1, 0.9);
  const domes = [0, LOW].map((y) => {
    const m = K.instanced(domeGeo, K.M.ceramic('#d3a53a'), mutable.length, undefined, { colors: false });
    root.add(m);
    return { m, set: K.instanceSetter(m), y };
  });
  const shimmers = [0, LOW].map((_, i) => { const s = K.glowSprite(i ? '#ffb24f' : '#fff2c8', 2.6, 0); root.add(s); return s; });

  // candles and lanterns below
  const candles: THREE.Vector3[] = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2, r = 6 + (i % 3) * 3.5;
    const x = Math.sin(a) * r, z = Math.cos(a) * r;
    if (inWedge(x, z, -0.5)) continue;
    candles.push(new THREE.Vector3(x, CEIL - 1.4, z));
  }
  for (const s of spots) candles.push(new THREE.Vector3(s[0] * 0.92, LOW + 0.52, s[1] * 0.92));
  for (const h of houses) if (rng.chance(0.25)) candles.push(new THREE.Vector3(h.x + Math.sin(h.ry) * (h.d / 2 + 0.1), LOW + 0.6, h.z + Math.cos(h.ry) * (h.d / 2 + 0.1)));
  root.add(K.glowPoints(candles, '#ffb24f', 0.6, 0.9));
  for (const [x, z] of [[0, -3], [-8, -6], [8, -6], [0, 0]] as const) {
    const pl = new THREE.PointLight('#ffa040', 7, 14, 1.4);
    pl.position.set(x, LOW + 5.5, z);
    root.add(pl);
  }
  root.add(K.particles({ count: 180, center: [0, LOW + 4, -4], radius: 12, y0: LOW + 0.5, y1: CEIL - 0.5, color: '#ffcf8a', size: 0.05, opacity: 0.5, swirl: 0.4, twinkle: 0.6, rng: rng.fork('dust') }));

  // reverse the copy: gold threads and a ghost cast of the upper city
  const pairs: [THREE.Vector3, THREE.Vector3][] = houses.map((h) => [new THREE.Vector3(h.x, LOW + h.h, h.z), new THREE.Vector3(h.x, 0.02, h.z)]);
  const threads = K.lines(pairs, '#ffc864', 0);
  const thrMat = threads.material as THREE.LineBasicMaterial;
  thrMat.transparent = true;
  thrMat.blending = THREE.AdditiveBlending;
  thrMat.color.setRGB(2.4, 1.8, 0.8);
  root.add(threads);
  const ghostMat = new THREE.MeshBasicMaterial({ color: '#ffd8a0', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const ghost = new THREE.Group();
  upper.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) ghost.add(new THREE.Mesh(m.geometry, ghostMat)); });
  root.add(ghost);
  const amber = new THREE.PointLight('#ffa040', 0, 40, 1.2);
  amber.position.set(0, 9, 0);
  root.add(amber);
  const tog = new K.Toggle(0.3);
  const OCHRE = new THREE.Color('#c9a650'), tmp = new THREE.Color();

  const update = (t: number, dt: number) => {
    tog.update(dt);
    const g = tog.value;
    // performers
    for (let i = 0; i < DN; i++) {
      if (i < 12) {
        const pair = Math.floor(i / 2), side = i % 2 ? 1 : -1;
        const a0 = (pair / 6) * Math.PI * 2;
        const au = a0 + t * 0.5, ad = a0 + t * 0.01;
        const spin = t * 3 + pair;
        const cxU = Math.sin(au) * 1.0, czU = Math.cos(au) * 1.0;
        setUp(i, cxU + Math.sin(spin) * 0.13 * side, 0.08, czU + Math.cos(spin) * 0.13 * side, spin + (side > 0 ? Math.PI : 0));
        const cxD = Math.sin(ad) * 1.0, czD = Math.cos(ad) * 1.0;
        setDn(i, cxD + Math.sin(pair) * 0.13 * side, LOW + 0.08, czD + Math.cos(pair) * 0.13 * side, pair + (side > 0 ? Math.PI : 0), 1, 0.15 * side);
      } else {
        const k = i - 12, x = -0.75 + k * 0.5;
        setUp(i, x, 0.4 + Math.abs(Math.sin(t * 4 + k)) * 0.04, -4.1, 0, 1, -0.2 - Math.sin(t * 4 + k) * 0.1);
        setDn(i, x, LOW + 0.4, -4.1, 0, 1, -0.3);
      }
    }
    setUp.done(); setDn.done();
    hands[0].rotation.z = -t * 0.8;
    // brothers on the spiral stairs
    SHAFTS.forEach(([sx, sz], si) => {
      const P = 36, ph = K.fract(t / P + si * 0.27);
      const down = ph < 0.5, s = down ? ph * 2 : 2 - ph * 2; // 0 top .. 1 bottom
      for (let j = 0; j < 3; j++) {
        const sj = K.clamp(s - j * 0.025 * (down ? -1 : 1));
        const a = sj * 3 * Math.PI * 2 * -1 + Math.PI * 6;
        const y = -sj * -LOW;
        const ax = Math.cos(a) * 0.55, az = Math.sin(a) * 0.55;
        setBro(si * 3 + j, sx + ax, y, sz + az, -a + (down ? 0 : Math.PI));
        if (j === 1) {
          if (down) setLit(si, sx + ax, y + 0.05, sz + az, -a);
          else setLit(si, 0, -50, 0, 0, 0);
          scrolls[si].position.set(sx + ax, y + 0.3, sz + az);
          (scrolls[si].material as THREE.SpriteMaterial).opacity = down ? 0 : 0.95;
        }
      }
    });
    setBro.done(); setLit.done();
    // innovations, 20 s apart, below first, above 8 s later; reset over a 10 minute cycle
    const tt = (t + 130) % 600;
    let flashU = 0, flashD = 0;
    domes.forEach(({ set, y }, li) => {
      const lag = li === 0 ? 8 : 0;
      mutable.forEach((h, k) => {
        const on = tt - (20 * k + 10 + lag), off = tt - (300 + 20 * k + 10 + lag);
        const s = K.clamp(on / 1.5) * (1 - K.clamp(off / 1.5));
        set(k, h.x, y + h.h + 0.04, h.z, 0, s * (li === 0 ? 1 - 0.0 * g : 1));
        const f = Math.max(0, 1 - Math.abs(on - 0.5) / 1.5);
        if (f > 0) {
          const sp = shimmers[li];
          sp.position.set(h.x, y + h.h + 0.6, h.z);
          if (li === 0) flashU = f; else flashD = f;
        }
      });
      set.done();
    });
    (shimmers[0].material as THREE.SpriteMaterial).opacity = flashU * 0.9;
    (shimmers[1].material as THREE.SpriteMaterial).opacity = flashD * 0.9;
    // reverse the copy
    const shrink = g < 0.5 ? 1 - K.smoothstep(0, 0.4, g) : K.smoothstep(0.55, 1, g);
    const sy = Math.max(0.001, shrink);
    upper.scale.y = sy;
    domes[0].m.scale.y = sy;
    upper.visible = sy > 0.002;
    ghostMat.opacity = Math.sin(Math.PI * g) * 0.12 + g * 0.06;
    ghost.visible = g > 0.01;
    thrMat.opacity = Math.min(1, g * 1.5) * (0.5 + 0.2 * Math.sin(t * 3));
    threads.visible = g > 0.01;
    amber.intensity = g * 60;
    for (let i = 0; i < liveCols.length; i++) living.setColorAt(i, tmp.copy(liveCols[i]).lerp(OCHRE, g * 0.85));
    if (living.instanceColor) living.instanceColor.needsUpdate = true;
  };
  update(0, 0);

  return {
    root,
    env: {
      skyTop: '#6d8db0',
      skyHorizon: '#f1d29c',
      skyBottom: '#8a7058',
      fog: '#c2ab8a',
      fogNear: 80,
      fogFar: 240,
      sunDir: [-0.55, 0.5, 0.65],
      sunColor: '#ffe0a8',
      sunIntensity: 2.6,
      sunGlow: 0.8,
      sunDisc: 0.6,
      hemiSky: '#a8c0e0',
      hemiGround: '#6a5038',
      hemiIntensity: 0.55,
      envIntensity: 0.6,
      clouds: 0.35,
      cloudColor: '#fff0d8',
      bloomStrength: 0.75,
      bloomThreshold: 0.85,
      bloomRadius: 0.5,
      vignette: 0.4,
      tiltShift: 0.3,
      shadowRadius: 22,
    },
    camera: {
      position: [0, 6.5, 38.4],
      target: [0, -4.5, 0],
      fov: 38,
      minDistance: 12,
      maxDistance: 70,
      autoRotate: 0,
      views: [
        { position: [-22, 24, 26], target: [0, -3, 0] },
        { position: [3.5, -7.2, 11], target: [-1, -9.6, 0] },
      ],
    },
    interaction: {
      label: 'Reverse the Copy',
      activeLabel: 'Restore the sun',
      hint: 'The city above is rebuilt in the image of the one below.',
      set: (on) => tog.set(on),
    },
    update,
  };
};

export default build;
