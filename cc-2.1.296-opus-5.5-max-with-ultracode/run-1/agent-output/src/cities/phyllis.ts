// PHYLLIS - Cities & Eyes 4.
// A city of canals crossed by bridges of every kind (humpbacked, covered, on
// pillars, on barges, suspended, with openwork railings) and fronted by windows
// of every kind (mullioned, Moorish, lancet, crowned with lunettes or stained
// glass roses), paved in cobbles, slabs, gravel and blue and white tiles.
// Toggle: live here a while. The city drains to pale paper and only the few
// routes an inhabitant walks every day (home, work, market, a friend) remain.

import * as THREE from 'three';
import * as K from '../kit';
import type { CityBuilder } from '../core/types';
import type { Finish } from '../kit';

const R = 15;
const QY = 0.3; // quay height
const WY = 0.14; // water level
const CX = [-6, 6]; // canals running along z
const CZ = [-7, 0, 7]; // canals running along x

// ---- materials that can fade into habit (one shared uniform)
const makeFade = (fade: { value: number }) => {
  const patch = (m: THREE.Material, key: string) => {
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uFade = fade;
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uFade;')
        .replace('#include <color_fragment>', `#include <color_fragment>
          float lum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.80, 0.81, 0.84) * (0.78 + 0.3 * lum), uFade);`);
    };
    m.customProgramCacheKey = () => 'phyllis-fade-' + key;
    return m;
  };
  return {
    rough: patch(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }), 'r'),
    shiny: patch(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.5 }), 's'),
    glow: patch(new THREE.MeshBasicMaterial({ vertexColors: true }), 'g'),
  };
};

const build: CityBuilder = (ctx) => {
  const rng = ctx.rng;
  const root = new THREE.Group();
  const FADE = { value: 0 };
  const mats = makeFade(FADE);
  // a Batch whose pieces all land in the fading materials (kit generators work unchanged)
  class FadeBatch extends K.Batch {
    add(geo: THREE.BufferGeometry, color: K.ColorLike | null, kind: Finish = 'matte', intensity = 1): this {
      if (color !== null) K.paint(geo, color, intensity);
      const m = kind === 'glow' || kind === 'ghost' ? mats.glow : ['polished', 'metal', 'gold', 'silver', 'bronze', 'glass'].includes(kind) ? mats.shiny : mats.rough;
      return this.addWith(geo, m);
    }
  }
  const b = new FadeBatch();
  const keep = new K.Batch(); // what stays vivid: the places of one life

  const isl = K.island({ radius: R + 1.6, flat: R + 1, depth: 7, top: '#7d7466', edge: '#b9ab92', cliff: '#9a8a70', under: '#4a4038', strata: '#c7b38f', seed: 8 });
  root.add(isl.mesh);
  root.add(K.waterDisc(R + 0.9, WY, { color: '#2f6170', amp: 0.12, scale: 0.9 }));

  // ---- blocks between the canals: raised quays clipped to the circle
  const xs: [number, number][] = [[-R, CX[0] - 0.8], [CX[0] + 0.8, CX[1] - 0.8], [CX[1] + 0.8, R]];
  const zs: [number, number][] = [[-R, CZ[0] - 0.8], [CZ[0] + 0.8, CZ[1] - 0.8], [CZ[1] + 0.8, CZ[2] - 0.8], [CZ[2] + 0.8, R]];
  const clip = (x: number, z: number): [number, number] => { const d = Math.hypot(x, z); return d > R ? [(x / d) * R, (z / d) * R] : [x, z]; };
  for (const [x0, x1] of xs) for (const [z0, z1] of zs) {
    const pts: THREE.Vector2[] = [];
    const N = 24;
    const edge = (ax: number, az: number, bx: number, bz: number) => { for (let i = 0; i < N; i++) { const [x, z] = clip(ax + ((bx - ax) * i) / N, az + ((bz - az) * i) / N); pts.push(new THREE.Vector2(x, z)); } };
    edge(x0, z0, x1, z0); edge(x1, z0, x1, z1); edge(x1, z1, x0, z1); edge(x0, z1, x0, z0);
    const g = K.extrudeUp(new THREE.Shape(pts), QY + 0.3);
    b.add(K.at(g, 0, -0.3, 0), '#b7a68c', 'stone');
  }

  // ---- pavements of every kind (four piazzas)
  const pav = (cx: number, cz: number, kind: number) => {
    if (kind === 0) { // blue and white tiles
      for (let i = 0; i < 10; i++) for (let j = 0; j < 10; j++) b.add(K.at(K.box(0.27, 0.02, 0.27), cx - 1.35 + i * 0.3, QY, cz - 1.35 + j * 0.3), (i + j) % 2 ? '#f4f1ea' : '#2f5f9e', 'ceramic');
    } else if (kind === 1) { // big slabs
      for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) b.add(K.at(K.box(0.56, 0.025, 0.7), cx - 1.2 + i * 0.6, QY, cz - 1.1 + j * 0.74), K.jitter('#d8cdb8', rng, 0.01, 0.03, 0.06), 'stone');
    } else if (kind === 2) { // cobbles
      for (let i = 0; i < 160; i++) { const [dx, dz] = rng.inDisc(1.5); b.add(K.at(K.box(0.15, 0.03, 0.15), cx + dx, QY, cz + dz, { ry: rng.angle() }), K.jitter('#77736d', rng, 0.01, 0.04, 0.1), 'stone'); }
    } else { // gravel
      b.add(K.paintBy(K.at(K.disc(1.5, 32), cx, QY + 0.01, cz), (x, _y, z, o) => o.set('#cbb994').multiplyScalar(0.85 + 0.3 * K.fract(Math.sin(x * 91.7 + z * 47.3) * 4373.1))), null, 'matte');
    }
  };
  pav(-10.5, -3.5, 0); pav(10.5, 3.5, 1); pav(-1.5, 3.5, 2); pav(10.5, -3.5, 3);

  // ---- routes of one inhabitant: home, work, market, a friend
  const V = (x: number, z: number) => new THREE.Vector3(x, QY + 0.06, z);
  const HOME = V(-10, 2.4), WORK = V(10.6, -3.8), MARKET = V(0.2, -3.2), FRIEND = V(-10.6, -10.2);
  const routes: THREE.Vector3[][] = [
    [HOME, V(-10, 1.05), V(-7.05, 1.05), V(-7.05, 3.5), V(-4.95, 3.5), V(-4.95, 1.05), V(3, 1.05), V(3, -1.05), V(4.95, -1.05), V(4.95, -3.5), V(7.05, -3.5), WORK],
    [V(-3, 1.05), V(-3, -1.05), V(0.2, -1.05), MARKET],
    [V(-10, 1.05), V(-11, 1.05), V(-11, -1.05), V(-11.6, -2.0), V(-11.6, -5.0), V(-11, -5.95), V(-11, -8.05), FRIEND],
  ];
  const life = [V(HOME.x, HOME.z + 0.9), V(WORK.x + 1, WORK.z), V(FRIEND.x, FRIEND.z - 0.9), MARKET];
  const nearRoute = (x: number, z: number, d: number) => life.some((p) => Math.hypot(x - p.x, z - p.z) < 1.9) || routes.some((r) => r.some((p, i) => {
    if (i === 0) return false;
    const a = r[i - 1], ab = new THREE.Vector2(p.x - a.x, p.z - a.z), ap = new THREE.Vector2(x - a.x, z - a.z);
    const t = K.clamp(ap.dot(ab) / Math.max(1e-6, ab.lengthSq()));
    return Math.hypot(ap.x - ab.x * t, ap.y - ab.y * t) < d;
  }));

  // ---- bridges of every kind
  type BKind = 'hump' | 'covered' | 'pillars' | 'barges' | 'suspended' | 'lattice';
  const bridges: { a: THREE.Vector3; c: THREE.Vector3; kind: BKind }[] = [];
  const kinds: BKind[] = ['hump', 'covered', 'pillars', 'barges', 'suspended', 'lattice'];
  let ki = 0;
  const overX = (x: number, cz: number, k?: BKind) => bridges.push({ a: new THREE.Vector3(x, QY, cz - 1.1), c: new THREE.Vector3(x, QY, cz + 1.1), kind: k ?? kinds[ki++ % 6] });
  const overZ = (z: number, cx: number, k?: BKind) => bridges.push({ a: new THREE.Vector3(cx - 1.1, QY, z), c: new THREE.Vector3(cx + 1.1, QY, z), kind: k ?? kinds[ki++ % 6] });
  overX(-11, 0, 'hump'); overX(-3, 0, 'covered'); overX(3, 0, 'suspended'); overX(11, 0, 'barges');
  overX(-11, -7, 'pillars'); overX(3, -7, 'lattice'); overX(9.5, -7, 'hump'); overX(-3, 7, 'barges'); overX(8, 7, 'covered'); overX(-9.5, 7, 'lattice');
  overZ(3.5, -6, 'hump'); overZ(-11, -6, 'suspended'); overZ(-3.5, 6, 'pillars'); overZ(3.5, 6, 'lattice'); overZ(11, 6, 'hump'); overZ(-11, 6, 'covered'); overZ(-3.5, -6, 'barges'); overZ(11, -6, 'pillars');
  for (const { a, c, kind } of bridges) {
    const dir = new THREE.Vector3().subVectors(c, a).normalize();
    const side = new THREE.Vector3(-dir.z, 0, dir.x);
    const mid = a.clone().add(c).multiplyScalar(0.5);
    const ry = Math.atan2(dir.x, dir.z);
    const P = (t: number, s: number, y: number): [number, number, number] => [a.x + (c.x - a.x) * t + side.x * s, y, a.z + (c.z - a.z) * t + side.z * s];
    if (kind === 'hump') K.bridge(b, { from: [a.x, a.y, a.z], to: [c.x, c.y, c.z], width: 0.85, hump: 0.42, rise: 0.2, color: '#d9c9a8' });
    else if (kind === 'covered') {
      K.bridge(b, { from: [a.x, a.y, a.z], to: [c.x, c.y, c.z], width: 0.9, hump: 0.05, color: '#a07a52', finish: 'wood', rails: false });
      for (const t of [0.02, 0.35, 0.65, 0.98]) for (const s of [-0.42, 0.42]) b.add(K.at(K.box(0.07, 0.75, 0.07), ...P(t, s, QY)), '#7a5a3a', 'wood');
      b.add(K.at(K.hipRoof(1.05, 2.45, 0.42, 0.3), mid.x, QY + 0.75, mid.z, { ry }), '#4f7a6a', 'ceramic');
    } else if (kind === 'pillars') {
      K.bridge(b, { from: [a.x, a.y + 0.08, a.z], to: [c.x, c.y + 0.08, c.z], width: 0.8, color: '#c8c2b6' });
      for (const t of [0.33, 0.67]) b.add(K.at(K.cyl(0.13, 0.16, 0.5, 10), ...P(t, 0, 0)), '#bdb6a8', 'stone');
          } else if (kind === 'barges') {
      for (const t of [0.25, 0.5, 0.75]) b.add(K.at(K.boatGeometry(1.1, '#3b2a22'), ...P(t, 0, WY), { ry: ry + Math.PI / 2 }), null, 'wood');
      b.add(K.at(K.box(0.75, 0.06, 2.3), mid.x, WY + 0.16, mid.z, { ry }), '#a98a62', 'wood');
      for (const s of [-0.36, 0.36]) b.add(K.at(K.box(0.03, 0.03, 2.2), ...P(0.5, s, WY + 0.42), { ry }), '#7a5a3a', 'wood');
      for (const t of [0.05, 0.3, 0.55, 0.8, 0.98]) for (const s of [-0.36, 0.36]) b.add(K.at(K.box(0.03, 0.26, 0.03), ...P(t, s, WY + 0.19)), '#7a5a3a', 'wood');
    } else if (kind === 'suspended') {
      K.bridge(b, { from: [a.x, a.y + 0.05, a.z], to: [c.x, c.y + 0.05, c.z], width: 0.6, color: '#8e6b48', finish: 'wood', rails: false });
      for (const t of [-0.08, 1.08]) for (const s of [-0.38, 0.38]) b.add(K.at(K.box(0.06, 1.3, 0.06), ...P(t, s, QY)), '#cfc5b5', 'stone');
      for (const s of [-0.38, 0.38]) {
        const A = new THREE.Vector3(...P(-0.08, s, QY + 1.28)), C = new THREE.Vector3(...P(1.08, s, QY + 1.28));
        b.add(K.rope(A, C, 0.95, 0.018, 14, 4), '#3a332c', 'metal');
        const pts = K.ropePoints(A, C, 0.95, 14);
        for (let i = 2; i < pts.length - 2; i++) b.add(K.strut(pts[i], [pts[i].x, QY + 0.1, pts[i].z], 0.007, 3), '#3a332c', 'metal');
      }
    } else {
      K.bridge(b, { from: [a.x, a.y + 0.05, a.z], to: [c.x, c.y + 0.05, c.z], width: 0.8, color: '#5d6a70', finish: 'metal', rails: false });
      for (const s of [-0.38, 0.38]) {
        for (let i = 0; i < 10; i++) {
          const t0 = i / 10, t1 = (i + 1) / 10;
          b.add(K.strut(P(t0, s, QY + 0.1), P(t1, s, QY + 0.42), 0.01, 3), '#2f3a40', 'metal');
          b.add(K.strut(P(t0, s, QY + 0.42), P(t1, s, QY + 0.1), 0.01, 3), '#2f3a40', 'metal');
        }
        b.add(K.strut(P(0, s, QY + 0.43), P(1, s, QY + 0.43), 0.018, 4), '#2f3a40', 'metal');
      }
    }
  }
  const nearBridge = (x: number, z: number, d: number) => bridges.some(({ a, c }) => Math.min(Math.hypot(x - a.x, z - a.z), Math.hypot(x - c.x, z - c.z)) < d);

  // ---- canal-front houses with windows of every kind
  const walls = ['#e7c3a6', '#d99a7a', '#efdcb8', '#c9705a', '#e9d3c0', '#b9a07a', '#e2b98e', '#f0e6d6'];
  type WKind = 'mullion' | 'moorish' | 'lancet' | 'lunette' | 'rose';
  const wkinds: WKind[] = ['mullion', 'moorish', 'lancet', 'lunette', 'rose'];
  const lancetShape = (w: number, h: number) => {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h - w * 0.7);
    s.quadraticCurveTo(w / 2, h - w * 0.15, 0, h); s.quadraticCurveTo(-w / 2, h - w * 0.15, -w / 2, h - w * 0.7);
    return new THREE.ShapeGeometry(s, 6);
  };
  const GLASS = ['#d6453a', '#e8b53c', '#3f74c4', '#4fa36a', '#9b4fb0'];
  const DARK = '#2a2526';
  const windowAt = (place: (g: THREE.BufferGeometry) => THREE.BufferGeometry, kind: WKind, lx: number, y: number, fz: number, trim: string) => {
    const z = fz + 0.012;
    if (kind === 'mullion') {
      for (const sx of [-0.075, 0.075]) b.add(place(K.at(lancetShape(0.12, 0.42), lx + sx, y, z)), DARK, 'matte');
      b.add(place(K.at(K.cyl(0.012, 0.012, 0.36, 5), lx, y, z + 0.01)), '#f4efe6', 'stone');
      b.add(place(K.at(K.box(0.34, 0.03, 0.06), lx, y - 0.03, fz + 0.03)), '#f4efe6', 'stone');
    } else if (kind === 'moorish') {
      b.add(place(K.at(K.box(0.22, 0.26, 0.01), lx, y, z)), DARK, 'matte');
      b.add(place(K.at(new THREE.CircleGeometry(0.13, 16), lx, y + 0.28, z)), DARK, 'matte');
      b.add(place(K.at(new THREE.RingGeometry(0.13, 0.17, 18, 1, -0.6, Math.PI + 1.2), lx, y + 0.28, z + 0.005)), trim, 'ceramic');
    } else if (kind === 'lancet') {
      b.add(place(K.at(lancetShape(0.16, 0.55), lx, y, z)), DARK, 'matte');
      b.add(place(K.at(K.box(0.04, 0.6, 0.03), lx - 0.1, y, fz + 0.01)), trim, 'stone');
      b.add(place(K.at(K.box(0.04, 0.6, 0.03), lx + 0.1, y, fz + 0.01)), trim, 'stone');
    } else if (kind === 'lunette') {
      b.add(place(K.at(K.box(0.24, 0.32, 0.01), lx, y, z)), DARK, 'matte');
      b.add(place(K.at(new THREE.CircleGeometry(0.12, 12, 0, Math.PI), lx, y + 0.36, z)), rng.pick(GLASS), 'glow', 1.6);
      b.add(place(K.at(K.box(0.3, 0.03, 0.04), lx, y + 0.33, fz + 0.02)), '#f4efe6', 'stone');
    } else {
      for (let s = 0; s < 8; s++) b.add(place(K.at(new THREE.CircleGeometry(0.16, 3, (s / 8) * Math.PI * 2, Math.PI / 4), lx, y + 0.2, z)), GLASS[s % GLASS.length], 'glow', 1.7);
      b.add(place(K.at(new THREE.RingGeometry(0.16, 0.2, 24), lx, y + 0.2, z + 0.004)), '#f4efe6', 'stone');
      b.add(place(K.at(new THREE.CircleGeometry(0.04, 10), lx, y + 0.2, z + 0.006)), '#f4efe6', 'stone');
    }
  };
  const fronts: { x: number; z: number; ry: number }[] = [];
  const addFront = (x: number, z: number, ry: number) => {
    if (Math.hypot(x, z) > R - 1.1 || nearBridge(x, z, 1.45) || nearRoute(x, z, 0.6)) return;
    fronts.push({ x, z, ry });
  };
  for (const cz of CZ) for (const s of [-1, 1]) for (let x = -R + 0.8; x < R; x += 1.35) {
    if (CX.some((cx) => Math.abs(x - cx) < 2.0)) continue;
    addFront(x, cz + s * 2.4, s < 0 ? 0 : Math.PI);
  }
  for (const cx of CX) for (const s of [-1, 1]) for (let z = -R + 0.8; z < R; z += 1.35) {
    if (CZ.some((cz) => Math.abs(z - cz) < 2.7)) continue;
    addFront(cx + s * 2.4, z, s < 0 ? Math.PI / 2 : -Math.PI / 2);
  }
  for (const f of fronts) {
    const w = 1.3, d = 1.8, st = rng.int(2, 5), sh = 0.72, h = st * sh + 0.15;
    const wall = rng.pick(walls), trim = rng.pick(['#2f5f9e', '#3f8f84', '#b5402c', '#e0b35c']);
    const wk = rng.pick(wkinds);
    K.house(b, { x: f.x, y: QY, z: f.z, ry: f.ry, w, d, h, roof: rng.pick(['hip', 'gable', 'flat'] as const), roofH: 0.45, wall, roofColor: rng.pick(['#a8553a', '#94503c', '#b8663f']), windows: false, cornice: true });
    const place = (g: THREE.BufferGeometry) => K.at(g, f.x, QY, f.z, { ry: f.ry });
    b.add(place(K.at(K.archWall(w * 0.95, 0.55, 0.04, 0.36, 0.48), 0, 0, d / 2 + 0.02)), K.shade(wall, 0.88), 'plaster');
    b.add(place(K.at(K.box(0.36, 0.46, 0.01), 0, 0, d / 2 + 0.005)), DARK, 'matte');
    for (let s = 1; s < st; s++) for (const lx of [-0.3, 0.3]) windowAt(place, wk, lx, 0.15 + s * sh + 0.06, d / 2, trim);
  }
  // inner houses (plain), leaving lanes for the daily routes and courtyards
  const piazzas = [[-10.5, -3.5], [10.5, 3.5], [-1.5, 3.5], [10.5, -3.5]];
  for (let x = -R + 1; x < R; x += 1.4) for (let z = -R + 1; z < R; z += 1.4) {
    if (Math.hypot(x, z) > R - 1.0 || CX.some((c) => Math.abs(x - c) < 3.4) || CZ.some((c) => Math.abs(z - c) < 3.4)) continue;
    if (nearRoute(x, z, 0.95) || piazzas.some(([px, pz]) => Math.hypot(x - px, z - pz) < 2.1) || rng.chance(0.12)) continue;
    K.house(b, { x, y: QY, z, w: 1.3, d: 1.3, h: rng.float(1.0, 2.4), roof: rng.pick(['hip', 'gable'] as const), ry: rng.chance(0.5) ? 0 : Math.PI / 2, roofH: 0.45, wall: rng.pick(walls), roofColor: rng.pick(['#a8553a', '#94503c', '#b8663f']), rng });
  }

  // ---- the places of one life (they stay in colour)
  K.house(keep, { x: HOME.x, y: QY, z: HOME.z + 0.9, w: 1.4, d: 1.2, h: 2.2, roof: 'gable', wall: '#e38b5d', roofColor: '#8e3b2a', lit: 0.4, rng });
  K.house(keep, { x: WORK.x + 1.0, y: QY, z: WORK.z, ry: -Math.PI / 2, w: 2.2, d: 1.6, h: 2.6, roof: 'hip', wall: '#e2c46a', roofColor: '#8e3b2a', lit: 0.4, rng });
  K.house(keep, { x: FRIEND.x, y: QY, z: FRIEND.z - 0.9, w: 1.3, d: 1.1, h: 1.9, roof: 'gable', wall: '#7fa8b8', roofColor: '#8e3b2a', lit: 0.4, rng });
  for (let i = 0; i < 4; i++) K.stall(keep, { x: MARKET.x - 1.2 + i * 0.8, y: QY, z: MARKET.z - 0.9, w: 0.7, d: 0.5, h: 0.55, cloth: ['#c0563a', '#e0b35c', '#3f74c4', '#4fa36a'][i] });
  root.add(b.build({ name: 'phyllis' }));
  root.add(keep.build({ name: 'phyllis-life' }));

  // ---- glowing routes
  const routeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffb54a').multiplyScalar(3), transparent: true, opacity: 0, depthWrite: false });
  for (const r of routes) {
    const pts = r.map((p) => p.clone().setY(p.y + 0.02));
    const curve = new THREE.CurvePath<THREE.Vector3>();
    for (let i = 1; i < pts.length; i++) curve.add(new THREE.LineCurve3(pts[i - 1], pts[i]));
    const m = new THREE.Mesh(new THREE.TubeGeometry(curve, pts.length * 12, 0.045, 5), routeMat);
    root.add(m);
  }
  const marks = K.glowPoints([HOME, WORK, MARKET, FRIEND].map((p) => p.clone().setY(p.y + 0.4)), '#ffcf7a', 1.2, 0);
  root.add(marks);

  // ---- walkers: the crowd of strangers on the quays, and the inhabitant on the routes
  const quays: THREE.Vector3[][] = [];
  for (const cz of CZ) for (const s of [-1, 1]) {
    const lim = Math.sqrt(R * R - (cz + s) ** 2) - 1;
    quays.push([V(-lim, cz + s * 1.05), V(lim, cz + s * 1.05)]);
  }
  for (const cx of CX) for (const s of [-1, 1]) {
    const lim = Math.sqrt(R * R - (cx + s) ** 2) - 1;
    quays.push([V(cx + s * 1.05, -lim), V(cx + s * 1.05, lim)]);
  }
  const crowdMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, transparent: true, opacity: 1 });
  const crowd = new K.Walkers({ paths: quays, count: 120, rng: rng.fork('crowd'), speed: [0.2, 0.45], material: crowdMat });
  root.add(crowd.mesh);
  const me = new K.Walkers({ paths: routes, count: 7, rng: rng.fork('me'), speed: [0.35, 0.5], colors: ['#b5402c', '#2f5f9e'], h: 0.28 });
  root.add(me.mesh);

  // ---- gondolas in the canals
  const NB = 8;
  const boats = K.instanced(K.boatGeometry(0.9, '#1d1b1a'), K.figureMaterial(), NB);
  root.add(boats);
  const bset = K.instanceSetter(boats);
  const bdat = Array.from({ length: NB }, (_, i) => ({ alongX: i < 5, c: i < 5 ? CZ[i % 3] : CX[i % 2], off: rng.float(0, 30), sp: rng.float(0.25, 0.5) * rng.sign() }));
  const flock = new K.Flock({ count: 20, radius: 11, height: 7, color: '#f2f0ea', span: 0.35, speed: 0.22, rng: rng.fork('gulls') });
  root.add(flock.mesh);

  const live = new K.Toggle(0.35);
  return {
    root,
    env: {
      skyTop: '#5d8fc4',
      skyHorizon: '#e6e9e8',
      skyBottom: '#cdd3d6',
      skyCurve: 0.5,
      fogNear: 80,
      fogFar: 240,
      sunDir: [-0.55, 0.6, 0.5],
      sunColor: '#ffe2b8',
      sunIntensity: 2.7,
      sunDisc: 1,
      sunGlow: 0.9,
      hemiSky: '#b9cfe6',
      hemiGround: '#8c7a64',
      hemiIntensity: 0.7,
      envIntensity: 0.8,
      clouds: 0.4,
      cloudColor: '#fff4e4',
      bloomStrength: 0.5,
      bloomThreshold: 0.85,
      tiltShift: 0.4,
      shadowRadius: 18,
      vignette: 0.32,
      saturation: 1.08,
    },
    camera: {
      position: [16, 17, 21],
      target: [0, 0, 0],
      minDistance: 4,
      maxDistance: 60,
      autoRotate: 0.25,
      views: [
        { position: [1.5, 2.6, 4.6], target: [2.5, 0.6, -0.5] },
        { position: [2, 30, 9], target: [0, 0, -0.5] },
      ],
    },
    interaction: {
      label: 'Live here a while',
      activeLabel: 'Arrive as a stranger',
      hint: 'Habit keeps a few threads of street; the rest goes pale.',
      set: (on) => live.set(on),
      camera: { position: [3, 27, 13], target: [-1, 0, -2] },
    },
    update(t, dt) {
      live.update(dt);
      const v = live.value;
      FADE.value = v;
      routeMat.opacity = v * (0.85 + 0.15 * Math.sin(t * 2.4));
      (marks.material as THREE.PointsMaterial).opacity = v * 0.9;
      crowdMat.opacity = 1 - v * 0.85;
      crowd.update(t);
      me.update(t);
      for (let i = 0; i < NB; i++) {
        const d = bdat[i];
        const span = 2 * Math.sqrt(R * R - d.c * d.c) - 3;
        const s = K.pingpong(d.off + t * Math.abs(d.sp), span) * span - span / 2;
        const back = Math.floor((d.off + t * Math.abs(d.sp)) / span) % 2 === 1;
        const ry = (d.alongX ? Math.PI / 2 : 0) + (back ? Math.PI : 0);
        if (d.alongX) bset(i, s, WY, d.c + 0.25, ry);
        else bset(i, d.c - 0.25, WY, s, ry);
      }
      bset.done();
      flock.update(t);
    },
  };
};

export default build;
