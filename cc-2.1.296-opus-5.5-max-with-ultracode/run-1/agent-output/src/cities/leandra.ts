// LEANDRA - Cities & Names 2.
// A night neighbourhood of dollhouse cutaways. Two species of household gods, too
// small to see and too many to count, shown as glowing dust: silver-cyan Penates by
// every front door (they follow the family when it moves) and ember Lares under the
// pots, up the chimney hood and in the broom closet (they stay with the house).
// Mixed files of both stroll along cornices and radiator pipes, fading to one pale
// white in line. Toggle: moving day, every family on the move at once.

import * as THREE from 'three';
import * as K from '../kit';
import type { CityBuilder } from '../core/types';

const TAU = Math.PI * 2;
const RING = 11;
const NH = 18; // dwellings
const NF = 17; // families (one house always empty)

type V = { x: number; y: number; z: number };
function pathPos(f: V, t: V, p: number, out: THREE.Vector3) {
  const r0 = Math.hypot(f.x, f.z), r2 = Math.hypot(t.x, t.z);
  const a0 = Math.atan2(f.z, f.x), a2 = Math.atan2(t.z, t.x);
  let da = a2 - a0;
  da = ((da + Math.PI) % TAU + TAU) % TAU - Math.PI;
  const L1 = Math.abs(r0 - RING), L2 = RING * Math.abs(da), L3 = Math.abs(r2 - RING);
  const s = p * (L1 + L2 + L3);
  let r: number, a: number;
  if (s < L1) { r = r0 + (RING - r0) * (s / L1); a = a0; }
  else if (s < L1 + L2) { r = RING; a = a0 + da * ((s - L1) / Math.max(1e-4, L2)); }
  else { r = RING + (r2 - RING) * ((s - L1 - L2) / Math.max(1e-4, L3)); a = a2; }
  return out.set(Math.cos(a) * r, 0, Math.sin(a) * r);
}

const MOTE_VERT = /* glsl */ `
  attribute vec4 aData; attribute vec3 aB; attribute vec3 aTint;
  uniform float uTime; uniform float uSize;
  uniform vec3 uFrom[${NF}]; uniform vec3 uTo[${NF}]; uniform float uProg[${NF}]; uniform float uFlare[${NH + 2}];
  varying vec3 vCol;
  vec3 pathPos(vec3 f, vec3 t, float p) {
    float r0 = length(f.xz), r2 = length(t.xz), a0 = atan(f.z, f.x), a2 = atan(t.z, t.x);
    float da = mod(a2 - a0 + 3.14159265, 6.2831853) - 3.14159265;
    float L1 = abs(r0 - ${RING.toFixed(1)}), L2 = ${RING.toFixed(1)} * abs(da), L3 = abs(r2 - ${RING.toFixed(1)});
    float s = p * (L1 + L2 + L3); float r; float a;
    if (s < L1) { r = mix(r0, ${RING.toFixed(1)}, s / max(L1, 1e-4)); a = a0; }
    else if (s < L1 + L2) { r = ${RING.toFixed(1)}; a = a0 + da * (s - L1) / max(L2, 1e-4); }
    else { r = mix(${RING.toFixed(1)}, r2, (s - L1 - L2) / max(L3, 1e-4)); a = a2; }
    return vec3(cos(a) * r, 0.0, sin(a) * r);
  }
  void main() {
    float kind = aData.x; int idx = int(aData.y + 0.5); float seed = aData.z; float temper = aData.w;
    float T = uTime;
    float hs = aData.y * 1.37 + kind * 3.1;
    float talk = 0.45 + 1.0 * max(0.0, sin(T * 2.1 + hs) * sin(T * 5.3 + hs * 2.3 + seed * 0.8));
    float jit = 0.016; float bright = 1.0;
    vec3 pos; vec3 col;
    if (kind < 0.5) {
      vec3 f = uFrom[idx]; vec3 tt = uTo[idx]; float pr = uProg[idx];
      float pt = clamp(pr * 1.15 - seed * 0.15, 0.0, 1.0);
      vec3 home = pt >= 1.0 ? tt : f;
      vec3 d = normalize(vec3(home.x, 0.0, home.z)); vec3 tg = vec3(d.z, 0.0, -d.x);
      pos = home + tg * position.x + d * position.z + vec3(0.0, position.y, 0.0);
      if (pr > 0.0 && pt > 0.0 && pt < 1.0) {
        pos = pathPos(f, tt, pt) + vec3(position.x * 0.5, 0.18 + position.y * 0.9, (seed - 0.5) * 0.35);
        bright = 1.25; jit = 0.03;
      }
      col = aTint * 2.3;
    } else if (kind < 1.5) {
      pos = position; col = vec3(1.0, 0.42, 0.13) * 3.6;
      if (temper > 1.5) { jit = 0.03; talk *= 0.4 + 1.0 * step(0.45, fract(sin(floor(T * 11.0 + seed * 7.0)) * 43758.5)); }
      else if (temper > 0.5) { jit = 0.006; talk = 0.8 + 0.3 * sin(T * 0.6 + hs); col = vec3(1.0, 0.32, 0.08) * 2.4; }
      bright *= 1.0 + 2.5 * uFlare[idx];
      if (idx == ${NH}) bright *= 0.5;
    } else {
      float f = fract(T * 0.035 * (0.6 + seed) + seed * 7.0);
      pos = mix(position, aB, f);
      float w = smoothstep(0.0, 0.18, f) * smoothstep(1.0, 0.82, f);
      col = mix(aTint * 2.3, vec3(1.0, 0.97, 0.93) * 2.0, w);
      talk = 0.9;
    }
    pos += jit * vec3(sin(T * 7.3 + seed * 91.0) + sin(T * 3.1 + seed * 17.0), sin(T * 6.1 + seed * 37.0), sin(T * 8.7 + seed * 13.0) + sin(T * 2.3 + seed * 5.0));
    float laugh = step(0.9, fract(sin(floor(T * 0.6) + aData.y * 12.9 + kind) * 43758.5)) * (0.5 + 0.5 * sin(T * 31.0));
    vCol = col * talk * bright * (1.0 + laugh);
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = uSize * (0.7 + 0.6 * fract(seed * 13.0)) * (abs(kind - 1.0) < 0.5 ? 1.4 : 1.0) / -mv.z;
    gl_Position = projectionMatrix * mv;
  }`;
const MOTE_FRAG = /* glsl */ `
  varying vec3 vCol;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.05, d);
    gl_FragColor = vec4(vCol * a, a);
  }`;

interface Dwelling { x: number; z: number; a: number; door: THREE.Vector3; kind: 'house' | 'palace' | 'shack' }

const build: CityBuilder = (ctx) => {
  const rng = ctx.rng;
  const root = new THREE.Group();
  const b = new K.Batch();

  // ---- island of dark cobbles, ring street, cross streets, piazza
  const isl = K.island({ radius: 20, flat: 18.5, depth: 7, top: '#6a5c50', edge: '#54483e', cliff: '#3a3330', under: '#1c1a22', strata: '#51463c', hills: 0.1, seed: 3 });
  root.add(isl.mesh);
  b.add(K.at(K.ring(RING - 0.75, RING + 0.75, 128), 0, 0.012, 0), '#877b6f', 'polished');
  const C = 0.245; // camera azimuth: everything is composed around it
  const du = [Math.cos(C), Math.sin(C)], dv = [-Math.sin(C), Math.cos(C)];
  const W = (u: number, v: number): [number, number] => [du[0] * u + dv[0] * v, du[1] * u + dv[1] * v];
  const P = W(3.4, 0);
  b.add(K.at(K.box(1.4, 0.02, 2 * RING), P[0], 0.005, P[1], { ry: -C }), '#5f564e', 'polished');
  { const m = W((3.4 + RING) / 2, 0); b.add(K.at(K.box(RING - 3.4, 0.02, 1.4), m[0], 0.006, m[1], { ry: -C + Math.PI / 2 }), '#5f564e', 'polished'); }
  b.add(K.at(K.disc(2.2, 40), P[0], 0.015, P[1]), '#71675d', 'polished');
  const lampPos: THREE.Vector3[] = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + Math.PI / 4 - C;
    const x = P[0] + Math.cos(a) * 1.9, z = P[1] + Math.sin(a) * 1.9;
    K.lamp(b, { x, z, h: 0.9, glow: '#ffd59a', intensity: 4 });
    lampPos.push(new THREE.Vector3(x, 0.96, z));
  }
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU + 0.12;
    const x = Math.cos(a) * (RING - 0.85), z = Math.sin(a) * (RING - 0.85);
    K.lamp(b, { x, z, h: 0.8, glow: '#ffcf8a', intensity: 3 });
    lampPos.push(new THREE.Vector3(x, 0.86, z));
  }

  // ---- particle buffers
  const mPos: number[] = [], mB: number[] = [], mData: number[] = [], mTint: number[] = [];
  const addMote = (p: [number, number, number], kind: number, idx: number, temper: number, tint: THREE.Color, bEnd: [number, number, number] = [0, 0, 0]) => {
    mPos.push(...p); mB.push(...bEnd); mData.push(kind, idx, rng.next(), temper); mTint.push(tint.r, tint.g, tint.b);
  };
  const LARE = new THREE.Color('#ff7934');
  const scatter = (cx: number, cy: number, cz: number, sx: number, sy: number, sz: number): [number, number, number] =>
    [cx + rng.float(-sx, sx), cy + rng.float(0, sy), cz + rng.float(-sz, sz)];

  // ---- the cutaway dwellings
  const dwell: Dwelling[] = [];
  const glowGeos: THREE.BufferGeometry[][] = [];
  const strollLines: [THREE.Vector3, THREE.Vector3][] = [];
  const stuccoBy = (base: string, peel: string, seed: number) => (geo: THREE.BufferGeometry) =>
    K.paintBy(geo, (x, y, z, out) => { const n = K.fbm2(x * 1.7 + seed, (y + z) * 1.7, 3); out.copy(K.mix(base, peel, K.smoothstep(0.05, 0.35, n))); });

  function cutaway(kind: Dwelling['kind'], a: number, r: number, Wd: number, D: number, floors: number, fh: number) {
    const hi = dwell.length;
    const X = Math.cos(a) * r, Z = Math.sin(a) * r, ry = Math.PI / 2 - a;
    const L = (g: THREE.BufferGeometry, lx: number, ly: number, lz: number, o: K.AtOpts = {}) => K.at(K.at(g, lx, ly, lz, o), X, 0, Z, { ry });
    const toW = (lx: number, ly: number, lz: number) => new THREE.Vector3(lx, ly, lz).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry).add(new THREE.Vector3(X, 0, Z));
    const H = floors * fh;
    const glows: THREE.BufferGeometry[] = [];
    glowGeos.push(glows);
    const wallC = kind === 'palace' ? '#c99a52' : kind === 'shack' ? '#7d8288' : rng.pick(['#b89a78', '#a88d74', '#c2a684', '#9c8670']);
    const wallF = kind === 'shack' ? 'metal' : 'plaster';
    const ext = kind === 'palace' ? stuccoBy('#c99a52', '#8f8577', hi * 7) : (g: THREE.BufferGeometry) => K.paint(g, wallC);
    // shell: back (street) wall, two side walls, floor slabs
    b.add(ext(L(K.box(Wd, H, 0.1), 0, 0, -D / 2 + 0.05)), null, wallF);
    for (const s of [-1, 1]) b.add(ext(L(K.box(0.1, H, D), s * (Wd / 2 - 0.05), 0, 0)), null, wallF);
    for (let k = 0; k <= floors; k++) b.add(L(K.box(Wd, 0.06, D), 0, k === 0 ? 0 : k * fh - 0.03, 0), k === floors ? '#5a4c40' : '#6b4a32', 'wood');
    if (kind === 'shack') {
      for (let i = 0; i < 9; i++) b.add(L(K.box(0.03, H, 0.03), -Wd / 2 + 0.07 + i * (Wd - 0.14) / 8, 0, -D / 2 - 0.01), '#6a6f74', 'metal');
      b.add(L(K.shedRoof(Wd + 0.15, D + 0.1, 0.06, 0.22), 0, H, 0), '#8e7a66', 'metal');
      b.add(L(K.cyl(0.04, 0.04, 0.7, 6), Wd / 4, H, -D / 4), '#3e3b39', 'metal');
    } else {
      b.add(L(K.hipRoof(Wd + 0.2, D + 0.2, kind === 'palace' ? 0.5 : 0.7, 0.5), 0, H + 0.03, 0), kind === 'palace' ? '#6f5446' : '#7a3f2e', 'ceramic');
      for (let k = 1; k <= floors; k++) {
        const deep = kind === 'palace' ? 0.18 : 0.08;
        b.add(ext(L(K.box(Wd + deep * 2, deep * 0.8, 0.1 + deep), 0, k * fh - deep * 0.8, -D / 2 - deep / 2)), null, 'plaster');
      }
      b.add(L(K.box(0.18, 0.5, 0.18), Wd / 4, H + 0.1, -D / 4), '#5a4337', 'stone');
    }
    // street facade: door and windows (lit)
    const doorX = kind === 'shack' ? -Wd / 5 : -Wd / 4;
    const doorH = kind === 'shack' ? 0.45 : 0.45;
    b.add(L(K.at(K.wallPlane(0.26, doorH), 0, 0.06, 0), doorX, 0, -D / 2 - 0.012, { ry: Math.PI }), '#3b2418', 'wood');
    for (let k = 0; k < floors; k++) {
      const n = Math.max(1, Math.floor(Wd / 0.75));
      for (let i = 0; i < n; i++) {
        const lx = -Wd / 2 + (i + 0.5) * (Wd / n);
        if (k === 0 && Math.abs(lx - doorX) < 0.35) continue;
        glows.push(K.paint(L(K.at(K.wallPlane(0.2, fh * 0.42), 0, k * fh + fh * 0.3, 0), lx, 0, -D / 2 - 0.013, { ry: Math.PI }), '#ffb867', 1.6));
      }
    }
    // interiors: warm lamp-lit wall faces (own material per house so a vacated house can dim)
    for (let k = 0; k < floors; k++) {
      const tone = rng.pick(['#e6a35c', '#d98f52', '#eab070', '#c98e5c']);
      glows.push(K.paint(L(K.at(K.wallPlane(Wd - 0.2, fh - 0.07), 0, k * fh + 0.04, 0), 0, 0, -D / 2 + 0.104), tone, 0.75));
      for (const s of [-1, 1]) glows.push(K.paint(L(K.at(K.wallPlane(D - 0.12, fh - 0.07), 0, k * fh + 0.04, 0), s * (Wd / 2 - 0.104), 0, 0, { ry: -s * Math.PI / 2 }), tone, 0.5));
      glows.push(K.paint(L(K.plane(Wd - 0.22, D - 0.12), 0, k === 0 ? 0.066 : k * fh + 0.036, 0.02), K.mix(tone, '#7a4a2a', 0.35), 0.42));
      glows.push(K.paint(L(K.at(K.sphere(0.045, 8, 6), 0, (k + 1) * fh - 0.1, 0), (k % 2 ? 0.3 : -0.3) * Wd / 2, 0, 0), '#fff0c8', 4));
      if (kind !== 'shack') {
        // cornice moulding and radiator pipe along the back wall
        b.add(L(K.box(Wd - 0.22, 0.04, 0.05), 0, (k + 1) * fh - 0.08, -D / 2 + 0.13), '#efe3cc', 'plaster');
        b.add(L(K.cyl(0.015, 0.015, Wd - 0.3, 6), 0, k * fh + 0.13, -D / 2 + 0.16, { rz: Math.PI / 2 }), '#9c9a96', 'metal');
        if (k > 0) {
          b.add(L(K.box(0.4, 0.17, 0.25), -Wd / 4, k * fh + 0.03, 0), '#5b3a26', 'wood');
          b.add(L(K.box(0.5, 0.12, 0.32), Wd / 4, k * fh + 0.03, 0.15), '#d8cfc0', 'cloth');
        }
        if (k === Math.min(1, floors - 1)) {
          strollLines.push([toW(-Wd / 2 + 0.15, (k + 1) * fh - 0.04, -D / 2 + 0.16), toW(Wd / 2 - 0.15, (k + 1) * fh - 0.04, -D / 2 + 0.16)]);
          strollLines.push([toW(Wd / 2 - 0.2, k * fh + 0.16, -D / 2 + 0.19), toW(-Wd / 2 + 0.2, k * fh + 0.16, -D / 2 + 0.19)]);
        }
      }
    }
    // ground floor: hall with coat rack and umbrella stand; kitchen with stove, pots, hood, flue, broom closet
    const fy = 0.06;
    if (kind !== 'shack') b.add(L(K.box(0.05, fh - 0.06, D * 0.7), 0.02, fy, -D * 0.15), '#d6c0a0', 'plaster');
    const crX = doorX - 0.32, usX = doorX + 0.3, bz = kind === 'shack' ? -D / 2 + 0.3 : 0.1;
    b.add(L(K.cyl(0.012, 0.018, 0.38, 5), crX, fy, bz), '#3a2416', 'wood');
    for (let i = 0; i < 3; i++) b.add(L(K.sphere(0.05, 6, 4), crX + Math.cos(i * 2.1) * 0.04, fy + 0.32, bz + Math.sin(i * 2.1) * 0.04, { s: [0.8, 1.5, 0.8] }), rng.pick(['#5a2f2a', '#2d3d55', '#4a4a3a']), 'cloth');
    b.add(L(K.cyl(0.045, 0.04, 0.12, 8), usX, fy, bz), '#4a5560', 'ceramic');
    b.add(L(K.cyl(0.008, 0.008, 0.24, 4), usX, fy, bz, { rz: 0.15 }), '#2b2b2b', 'metal');
    const kx = kind === 'shack' ? Wd / 5 : Wd / 4;
    b.add(L(K.box(0.42, 0.22, 0.26), kx, fy, bz), '#2c2a2a', 'metal');
    for (let i = 0; i < 3; i++) b.add(L(K.cyl(0.045, 0.04, 0.06, 8), kx - 0.13 + i * 0.13, fy + 0.22, bz), '#7a4a32', 'metal');
    b.add(L(K.pyramid(0.46, 0.3, 0.18), kx, fy + 0.4, bz), '#4a4744', 'metal');
    b.add(L(K.box(0.1, H - fy - 0.58, 0.1), kx, fy + 0.58, bz), '#4a4744', 'metal');
    const clX = kind === 'shack' ? Wd / 2 - 0.2 : Wd / 2 - 0.22;
    b.add(L(K.box(0.24, 0.48, 0.22), clX, fy, -D / 2 + 0.6), '#6a4a34', 'wood');
    b.add(L(K.box(0.2, 0.44, 0.015), clX - 0.08, fy, -D / 2 + 0.8, { ry: -0.9 }), '#7d583e', 'wood');
    b.add(L(K.strut([0, 0, 0], [0.05, 0.46, 0], 0.008, 4), clX + 0.05, fy, -D / 2 + 0.6), '#a07a46', 'wood');
    // the Lares of this kitchen
    const temper = kind === 'palace' ? 1 : kind === 'shack' ? 2 : 0;
    const nL = kind === 'palace' ? 200 : kind === 'shack' ? 80 : 150;
    for (let i = 0; i < nL; i++) {
      const w = rng.next();
      const lp = w < 0.45 ? scatter(kx, fy + 0.02, bz, 0.2, 0.18, 0.1) : w < 0.75 ? scatter(kx, fy + 0.45, bz, 0.18, 0.4, 0.08) : scatter(clX, fy, -D / 2 + 0.6, 0.1, 0.46, 0.09);
      const v = toW(lp[0], lp[1], lp[2]);
      addMote([v.x, v.y, v.z], 1, hi, temper, LARE);
    }
    const door = toW(doorX, 0, -D / 2);
    dwell.push({ x: X, z: Z, a, door, kind });
  }

  // twelve houses round the ring (two of them decayed palaces), six tin shacks to the south-east
  for (let i = 0; i < 12; i++) {
    const a = 1.85 + i * 0.445;
    if (i === 3 || i === 8) cutaway('palace', a, RING + 0.9 + 1.3, 5.2, 2.6, 4, 0.78);
    else { const D = 2.0; cutaway('house', a, RING + 0.9 + D / 2, 3, D, rng.pick([2, 3, 3]), 0.82); }
  }
  for (let i = 0; i < 6; i++) {
    const a = 0.95 + (i % 3) * 0.18 + (i >= 3 ? 0.09 : 0);
    cutaway('shack', a + rng.float(-0.02, 0.02), RING + 1.6 + (i >= 3 ? 1.6 : 0), 1.2, 1.2, 1, 0.8);
  }
  root.add(b.build({ name: 'leandra' }));
  const houseMats = glowGeos.map((gs) => {
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true, color: '#ffffff' });
    root.add(new THREE.Mesh(K.merge(gs), mat));
    return mat;
  });

  // ---- the fifty-family block, cut open toward the camera like a honeycomb
  const bb = new K.Batch();
  const blockGlow: THREE.BufferGeometry[] = [];
  const BU = -4.8, BL = 11, BD = 3.5, BH = 3.5, bays = 10, fl = 5, bw = BL / bays, bfh = BH / fl;
  const BX = W(BU, 0), Bry = -C + Math.PI / 2; // local x along v, local +z toward camera
  const BLc = (g: THREE.BufferGeometry, lx: number, ly: number, lz: number, o: K.AtOpts = {}) => K.at(K.at(g, lx, ly, lz, o), BX[0], 0, BX[1], { ry: Bry });
  const btoW = (lx: number, ly: number, lz: number) => new THREE.Vector3(lx, ly, lz).applyAxisAngle(new THREE.Vector3(0, 1, 0), Bry).add(new THREE.Vector3(BX[0], 0, BX[1]));
  bb.add(BLc(K.box(BL + 0.2, 0.12, BD + 0.2), 0, BH, 0), '#7c7068', 'stone');
  bb.add(BLc(K.box(BL, BH, 0.12), 0, 0, -BD / 2 + 0.06), '#9b8e80', 'plaster');
  for (let k = 0; k < fl; k++) bb.add(BLc(K.box(BL, 0.07, BD), 0, k * bfh, 0), '#6d5a48', 'wood');
  for (let i = 0; i <= bays; i++) bb.add(BLc(K.box(0.07, BH, BD), -BL / 2 + i * bw, 0, 0), '#a39686', 'plaster');
  for (let k = 0; k < fl; k++) {
    for (let i = 0; i < bays; i++) {
      const lx = -BL / 2 + (i + 0.5) * bw, ly = k * bfh + 0.07;
      blockGlow.push(K.paint(BLc(K.at(K.wallPlane(bw - 0.1, bfh - 0.1), 0, ly, 0), lx, 0, -BD / 2 + 0.125), rng.pick(['#e09a52', '#d88a4a', '#eaa865']), 0.7));
      blockGlow.push(K.paint(BLc(K.plane(bw - 0.12, BD - 0.1), lx, ly + 0.006, 0.03), '#b0703c', 0.45));
      blockGlow.push(K.paint(BLc(K.at(K.wallPlane(0.32, bfh * 0.42), 0, ly + bfh * 0.28, 0), lx, 0, -BD / 2 - 0.012, { ry: Math.PI }), '#ffb35e', 2.2));
      bb.add(BLc(K.box(0.36, 0.2, 0.2), lx + 0.2, ly, 0.5), '#2c2a2a', 'metal');
      bb.add(BLc(K.box(0.3, 0.16, 0.36), lx - 0.25, ly, -0.6), '#5b3a26', 'wood');
      for (let j = 0; j < 40; j++) {
        const v = btoW(lx + 0.2 + rng.float(-0.18, 0.18), ly + rng.float(0.05, 0.45), 0.5 + rng.float(-0.1, 0.1));
        addMote([v.x, v.y, v.z], 1, NH, 0, LARE);
      }
    }
  }
  root.add(bb.build({ name: 'block' }));
  root.add(new THREE.Mesh(K.merge(blockGlow), new THREE.MeshBasicMaterial({ vertexColors: true })));

  // ---- the vacant lot: weeds and a rusty can full of Lares waiting for a house
  const LOT = W(1.2, 5.6);
  const lb = new K.Batch();
  lb.add(K.at(K.box(4, 0.03, 4), LOT[0], 0, LOT[1], { ry: -C }), '#3d3a2c', 'matte');
  lb.add(K.at(K.cyl(0.075, 0.075, 0.15, 12, true), LOT[0] + 0.3, 0.03, LOT[1] - 0.2, { rz: 0.25 }), '#8a4a26', 'metal');
  root.add(lb.build());
  root.add(K.instanced(K.cone(0.04, 1, 4), K.std('#4f5a34', { roughness: 0.9 }), 260, (_i, o, c) => {
    const [x, z] = rng.inDisc(1.95);
    o.position.set(LOT[0] + x, 0.02, LOT[1] + z);
    o.scale.set(rng.float(0.6, 1.4), rng.float(0.15, 0.55), rng.float(0.6, 1.4));
    o.rotation.set(rng.float(-0.25, 0.25), rng.angle(), rng.float(-0.25, 0.25));
    c.copy(K.jitter('#5c6a3a', rng, 0.04, 0.1, 0.1));
  }));
  for (let j = 0; j < 120; j++) addMote([LOT[0] + 0.3 + rng.float(-0.06, 0.06), 0.05 + rng.float(0, 0.18), LOT[1] - 0.2 + rng.float(-0.06, 0.06)], 1, NH + 1, 1, LARE);

  // ---- families and their Penates
  const fams = Array.from({ length: NF }, (_, f) => ({ house: f, to: f, prog: 0, dur: 1, wait: 0, tint: K.hsl(0.52 + rng.float(-0.06, 0.06), rng.float(0.45, 0.85), rng.float(0.7, 0.82)) }));
  // house NF (the 18th dwelling) begins empty
  for (let f = 0; f < NF; f++) {
    const n = dwell[f].kind === 'palace' ? 150 : dwell[f].kind === 'shack' ? 60 : 100;
    for (let i = 0; i < n; i++) addMote([rng.float(-0.38, 0.38), rng.float(0.03, 0.42), rng.float(0.15, 0.85)], 0, f, 0, fams[f].tint);
  }
  // strolling files along cornices and radiator pipes
  strollLines.forEach(([A, B], li) => {
    for (let i = 0; i < 30; i++) addMote([A.x, A.y, A.z], 2, li % NH, 0, i % 2 ? LARE : fams[li % NF].tint, [B.x, B.y, B.z]);
  });
  const mg = new THREE.BufferGeometry();
  mg.setAttribute('position', new THREE.Float32BufferAttribute(mPos, 3));
  mg.setAttribute('aB', new THREE.Float32BufferAttribute(mB, 3));
  mg.setAttribute('aData', new THREE.Float32BufferAttribute(mData, 4));
  mg.setAttribute('aTint', new THREE.Float32BufferAttribute(mTint, 3));
  const uFrom = dwell.slice(0, NF).map((d) => d.door.clone());
  const uTo = dwell.slice(0, NF).map((d) => d.door.clone());
  const uProg = new Array(NF).fill(0);
  const uFlare = new Array(NH + 2).fill(0);
  const moteMat = new THREE.ShaderMaterial({
    vertexShader: MOTE_VERT, fragmentShader: MOTE_FRAG,
    uniforms: { uTime: K.U.time, uSize: { value: 190 }, uFrom: { value: uFrom }, uTo: { value: uTo }, uProg: { value: uProg }, uFlare: { value: uFlare } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const motes = new THREE.Points(mg, moteMat);
  motes.frustumCulled = false;
  root.add(motes);

  // the families themselves, with handcarts (visible only while moving)
  const people = K.instanced(K.personGeometry(0.25), K.figureMaterial(), NF * 3, (i, o, c) => { o.scale.setScalar(0); c.copy(K.pickJitter(['#7a3b2e', '#2f4b6e', '#c9a35a', '#e8e0d0', '#4a5d3a'], rng)); });
  root.add(people);
  const cartGeo = K.merge([
    K.paint(K.box(0.3, 0.1, 0.2), '#6b4a30'), K.paint(K.at(K.box(0.24, 0.12, 0.16), 0, 0.1, 0), '#c9b28a'),
    K.paint(K.at(K.torus(0.06, 0.015, 4, 10), 0, 0.02, 0.11, { rx: 0 }), '#2b2420'),
  ]);
  const carts = K.instanced(cartGeo, K.std('#ffffff', { vertexColors: true, roughness: 0.8 }), NF, (_i, o) => { o.scale.setScalar(0); }, { colors: false });
  root.add(carts);
  const setP = K.instanceSetter(people), setC = K.instanceSetter(carts);

  const walkers = new K.Walkers({
    paths: [Array.from({ length: 65 }, (_, i) => new THREE.Vector3(Math.cos((i / 64) * TAU) * (RING + 0.35), 0.02, Math.sin((i / 64) * TAU) * (RING + 0.35)))],
    count: 22, closed: true, rng: rng.fork('walk'), speed: [0.15, 0.3], colors: ['#3e3a46', '#5a4636', '#6a6a72', '#7a3b2e'],
  });
  root.add(walkers.mesh);
  root.add(K.glowPoints(lampPos, '#ffcf8a', 0.9, 0.75));
  root.add(K.particles({ count: 220, radius: 18, y0: 0.05, y1: 0.8, color: '#6f86b8', size: 0.5, opacity: 0.08, swirl: 0.6, velocity: [0.05, 0, 0.02], rng: rng.fork('mist') }));

  // ---- moving logic
  const occupancy = new Array(NH).fill(0);
  for (let f = 0; f < NF; f++) occupancy[f] = 1;
  const lit = new Array(NH).fill(1);
  lit[NF] = 0.3;
  const moving = new K.Toggle(0.4);
  let nextMove = 1, moveCount = 0;
  const mvRng = rng.fork('moves');
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  const start = (f: number, to: number) => {
    const fm = fams[f];
    fm.to = to;
    occupancy[fm.house]--; occupancy[to]++;
    uFrom[f].copy(dwell[fm.house].door); uTo[f].copy(dwell[to].door);
    const len = Math.abs(Math.hypot(uFrom[f].x, uFrom[f].z) - RING) * 2 + RING * Math.abs(((Math.atan2(uTo[f].z, uTo[f].x) - Math.atan2(uFrom[f].z, uFrom[f].x) + Math.PI * 3) % TAU) - Math.PI);
    fm.dur = Math.max(5, len / 0.75);
    fm.prog = 1e-4;
  };

  return {
    root,
    env: {
      skyTop: '#10142b', skyHorizon: '#3d3150', skyBottom: '#15142a', skyCurve: 0.5,
      fog: '#272943', fogNear: 55, fogFar: 150,
      sunDir: [0.3, 0.75, -0.5], sunColor: '#9fb4ff', sunIntensity: 1.1, sunDisc: 0, sunGlow: 0,
      moon: { dir: [-0.4, 0.45, -0.8], size: 1.2, color: '#e8ecff' },
      hemiSky: '#4a5a96', hemiGround: '#3a2a2a', hemiIntensity: 1.6, envIntensity: 0.8,
      stars: 0.85, clouds: 0.15, cloudColor: '#3a3a5a',
      bloomStrength: 0.95, bloomThreshold: 0.7, bloomRadius: 0.5,
      shadowRadius: 21, vignette: 0.45, saturation: 1.05, tiltShift: 0.55, exposure: 1.1,
    },
    camera: {
      position: [W(26, 0)[0], 5.6, W(26, 0)[1]], target: [W(3, 0)[0], 1.3, W(3, 0)[1]], fov: 35,
      minDistance: 6, maxDistance: 60, maxPolar: 1.42, autoRotate: 0.26,
      views: [
        { position: [-8, 30, 12], target: [0, 0, 0] },
        { position: [dwell[10].x * 1.36, 1.5, dwell[10].z * 1.36], target: [dwell[10].x * 0.97, 0.55, dwell[10].z * 0.97] },
      ],
    },
    interaction: {
      label: 'Moving day',
      activeLabel: 'Settle in',
      hint: 'The door gods go with the family; the kitchen gods stay put.',
      set: (on) => moving.set(on),
      camera: { position: [Math.cos(C + 0.4) * 22, 17, Math.sin(C + 0.4) * 22], target: [0, 0.5, 0] },
    },
    update(t, dt) {
      moving.update(dt);
      walkers.update(t);
      const mass = moving.target > 0.5;
      // one family moves now and then; on moving day everyone keeps moving
      if (!mass && t >= nextMove) {
        nextMove = t + 25;
        const empty = occupancy.findIndex((o) => o === 0);
        const idle = fams.map((_, i) => i).filter((i) => fams[i].prog === 0);
        if (empty >= 0 && idle.length) {
          const f = idle[(moveCount++ * 7 + mvRng.int(0, 3)) % idle.length];
          start(f, empty);
        }
      }
      for (let f = 0; f < NF; f++) {
        const fm = fams[f];
        if (fm.prog > 0) {
          fm.prog += dt / fm.dur;
          if (fm.prog >= 1.12) {
            fm.prog = 0; fm.house = fm.to;
            uFrom[f].copy(dwell[fm.house].door); uTo[f].copy(uFrom[f]);
            uFlare[fm.house] = 1;
            fm.wait = 1 + ((f * 0.37) % 1) * 2.5;
          }
        } else if (mass) {
          fm.wait -= dt;
          if (fm.wait <= 0) start(f, (fm.house + 5) % NH);
        }
        uProg[f] = Math.min(1, fm.prog / 1.0);
        // the family walking ahead of its Penates
        for (let k = 0; k < 3; k++) {
          const p = fm.prog > 0 ? K.clamp(fm.prog * 1.15 - 0.02 - k * 0.012, 0, 1) : 0;
          if (fm.prog > 0 && p > 0 && p < 1) {
            pathPos(uFrom[f], uTo[f], p, tmp);
            pathPos(uFrom[f], uTo[f], Math.min(1, p + 0.01), tmp2);
            const ry = Math.atan2(tmp2.x - tmp.x, tmp2.z - tmp.z);
            setP(f * 3 + k, tmp.x + Math.cos(ry) * (k - 1) * 0.12, Math.abs(Math.sin(t * 9 + k)) * 0.015, tmp.z - Math.sin(ry) * (k - 1) * 0.12, ry, k === 2 ? 0.65 : 1);
            if (k === 0) setC(f, tmp2.x, 0, tmp2.z, ry);
          } else {
            setP(f * 3 + k, 0, -50, 0, 0, 0);
            if (k === 0) setC(f, 0, -50, 0, 0, 0);
          }
        }
      }
      setP.done(); setC.done();
      for (let h = 0; h < NH + 2; h++) uFlare[h] *= Math.exp(-dt * 1.3);
      for (let h = 0; h < NH; h++) {
        lit[h] = K.damp(lit[h], occupancy[h] > 0 ? 1 : 0.28, 1.5, dt);
        houseMats[h].color.setScalar(lit[h]);
      }
    },
  };
};

export default build;
