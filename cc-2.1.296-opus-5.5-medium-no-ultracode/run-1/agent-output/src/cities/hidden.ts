import * as THREE from 'three';
import { B, TAU, V, clamp, smooth } from '../engine/kit';
import type { Gen } from './types';
import { animatedPoints, crowd, dynamicLines } from './util';

// ---------------------------------------------------------------- Olinda
// A pinhead city grows within the old one, ring by ring, until it pushes the old one out.
const olinda: Gen = (b, ctx) => {
  b.ground(11.6, '#9a8e74');
  const K = 5;
  const rings: B[] = [];
  const palettes = [
    ['#e8c8a0', '#a04a32'],
    ['#d8d0c0', '#5a6a8a'],
    ['#f0dcc0', '#8a5a3a'],
    ['#e0e0d0', '#4a7a5a'],
    ['#e8d0b8', '#9a3a4a'],
  ];
  for (let k = 0; k < K; k++) {
    const r = b.sub({ unique: true });
    const [wall, roof] = palettes[k];
    // a complete little city at unit radius 10: roofs, antennas, skylights, gardens
    r.ring(0, 0.01, 0, 9.4, 10, '#c8b896', { seg: 64 });
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * TAU;
      r.house(Math.cos(a) * 8.4, Math.sin(a) * 8.4, 1.4, 1.2, 1.2 + (i % 3) * 0.5, { ry: -a, wall, roof, roofType: i % 2 ? 'hip' : 'flat', lit: 0.6 });
      if (i % 4 === 0) r.beam(V(Math.cos(a) * 8.4, 1.8, Math.sin(a) * 8.4), V(Math.cos(a) * 8.4, 2.8, Math.sin(a) * 8.4), 0.03, '#5a5a5a');
    }
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU + 0.3;
      r.tree(Math.cos(a) * 6.6, Math.sin(a) * 6.6, 1.4, '#4a7a3a');
    }
    r.mats.solid.transparent = true;
    r.mats.glow.transparent = true;
    rings.push(r);
  }
  // the magnifying glass that finds the point
  const lens = b.sub({ y: 4.5 });
  lens.torus(0, 0, 0, 1.4, 0.1, '#c9a44a', { kind: 'gold', rx: Math.PI / 2, seg: 32, tube: 6 });
  lens.cyl(0, -0.03, 0, 1.38, 0.06, '#d8f0ff', { kind: 'glass', seg: 32 });
  lens.beam(V(1.4, 0, 0), V(3.2, 0.6, 0), 0.1, '#5a3a22');
  lens.on((t) => {
    lens.group.position.set(Math.sin(t * 0.13) * 1.2, 4.5 + Math.sin(t * 0.4) * 0.3, Math.cos(t * 0.11) * 1.2);
    lens.group.rotation.y = t * 0.05;
  });
  // the seed: a bright pinpoint at the center
  b.sphere(0, 0.1, 0, 0.08, '#fff2c0', { kind: 'glow', i: 3, seg: 8 });
  b.on((t) => {
    for (let k = 0; k < K; k++) {
      const ph = (t * 0.025 + k / K) % 1;
      const s = Math.max(0.002, Math.pow(ph, 1.7) * 1.15);
      rings[k].group.scale.set(s, Math.min(1, s * 1.6), s);
      // the oldest is squeezed against the rim and crushed out
      const fade = 1 - smooth(clamp((ph - 0.82) / 0.18, 0, 1));
      rings[k].mats.solid.opacity = fade;
      rings[k].mats.glow.opacity = fade;
      rings[k].group.visible = s * 10 < 12.2;
    }
  });
  ctx.view.elev = 0.62;
};

// ---------------------------------------------------------------- Raissa
// An unhappy city in which, at every moment, an invisible thread binds one small joy to the next.
const raissa: Gen = (b, ctx) => {
  b.ground(11.6, '#6a6a6e');
  // a river with railings
  b.box(0, 0.01, 2.6, 22.6, 0.03, 1.6, '#3a4a58', { kind: 'water' });
  for (let x = -10; x <= 10; x += 0.6) {
    b.box(x, 0, 1.7, 0.04, 0.5, 0.04, '#2a2a2a', { kind: 'metal' });
    b.box(x, 0, 3.5, 0.04, 0.5, 0.04, '#2a2a2a', { kind: 'metal' });
  }
  b.box(0, 0.5, 1.7, 21, 0.04, 0.06, '#2a2a2a', { kind: 'metal' });
  b.box(0, 0.5, 3.5, 21, 0.04, 0.06, '#2a2a2a', { kind: 'metal' });
  // gray houses
  const windows: THREE.Vector3[] = [];
  for (let k = 0; k < 40; k++) {
    const x = b.r(-10, 10);
    const z = b.r(-10, 10);
    if (Math.hypot(x, z) > 10.4 || Math.abs(z - 2.6) < 1.6) continue;
    const h = 1.2 + b.r(2.6);
    b.house(x, z, 1.2, 1.0, h, { wall: b.jit('#8a8a90', 0.01, 0.03, 0.08), roof: '#4a4a52', roofType: 'gable', win: '#8a8aa0', lit: 0.25 });
    windows.push(V(x + b.r(-0.3, 0.3), b.r(0.6, h - 0.3), z + 0.52));
  }
  // the people, bent over, wringing their hands
  const N = 24;
  const people = crowd(b, N, () => '#3a3a42');
  const ps = Array.from({ length: N }, () => ({ x: b.r(-9, 9), z: b.chance(0.5) ? 1.3 : 3.9, sp: b.r(0.1, 0.25) * (b.chance(0.5) ? 1 : -1) }));
  // the golden thread: a child laughs at a dog that leaps for a scrap a mason dropped...
  const moments: THREE.Vector3[] = [];
  for (let k = 0; k < 16; k++) moments.push(windows[(k * 7) % windows.length]);
  const thread = dynamicLines(b, 200, 1);
  const gold = new THREE.Color('#ffcf6a').multiplyScalar(1.6);
  const sparks = animatedPoints(
    b,
    moments.map((m) => m.clone()),
    () => '#ffe2a0',
    0.6,
    (i, t) => {
      const head = (t * 0.6) % moments.length;
      const d = (head - i + moments.length) % moments.length;
      return d < 1 ? 2.2 * (1 - d) + 0.1 : d < 4 ? 0.5 * (1 - (d - 1) / 3) : 0.02;
    },
  );
  const TP = 90;
  const beads = animatedPoints(b, Array.from({ length: TP }, () => V(0, -9, 0)), () => '#ffd27a', 0.32, (i) => 2.2 * Math.pow(1 - i / TP, 1.3));
  b.on((t) => {
    ps.forEach((p, i) => {
      const x = (((p.x + t * p.sp) % 20) + 30) % 20 - 10;
      people.set(i, x, 0.02, p.z, 1, p.sp > 0 ? Math.PI / 2 : -Math.PI / 2, 0.8);
    });
    people.commit();
    // draw the thread from the latest moment backwards, fading
    thread.begin();
    const head = (t * 0.6) % moments.length;
    const steps = 60;
    for (let s = 0; s < steps; s++) {
      const u0 = head - (s / steps) * 4;
      const u1 = head - ((s + 1) / steps) * 4;
      const P = (u: number) => {
        const uu = ((u % moments.length) + moments.length) % moments.length;
        const i0 = Math.floor(uu);
        const f = uu - i0;
        const a = moments[i0];
        const c = moments[(i0 + 1) % moments.length];
        return V(a.x + (c.x - a.x) * f, a.y + (c.y - a.y) * f + Math.sin(f * Math.PI) * 1.4, a.z + (c.z - a.z) * f);
      };
      const A = P(u0);
      const C = P(u1);
      if (s === 0) {
        const bp = beads.points?.geometry.attributes.position as THREE.BufferAttribute | undefined;
        if (bp) {
          for (let k = 0; k < TP; k++) {
            const Q = P(head - (k / TP) * 4);
            bp.setXYZ(k, Q.x, Q.y, Q.z);
          }
          bp.needsUpdate = true;
        }
      }
      const k = Math.pow(1 - s / steps, 1.5);
      thread.seg(A.x, A.y, A.z, C.x, C.y, C.z, gold.r * k, gold.g * k, gold.b * k);
    }
    thread.end();
  });
  void sparks;
  ctx.view.elev = 0.45;
};

// ---------------------------------------------------------------- Marozia
// The city of the rat, crowded and furtive; for an instant a wall opens on the city of the swallow.
const marozia: Gen = (b, ctx) => {
  b.ground(11.6, '#3a3634');
  // cramped dark blocks and corridors
  for (let i = -5; i <= 5; i++)
    for (let j = -5; j <= 5; j++) {
      const x = i * 1.9 + (j % 2) * 0.4;
      const z = j * 1.9;
      if (Math.hypot(x, z) > 10.4) continue;
      if (Math.hypot(x - 2.2, z + 1.6) < 2.6) continue; // the place where the wall opens
      const h = 1.5 + b.r(3.2);
      b.box(x, 0, z, 1.5, h, 1.5, b.jit('#4a4440', 0.01, 0.04, 0.06));
      b.windows(x, 0, z, 1.5, 1.5, h, 0, '#c8803a', 0.12, 0.12);
    }
  // the rats in the corridors
  const ratGeo = new THREE.SphereGeometry(0.1, 6, 4).scale(1, 0.7, 2.2).translate(0, 0.08, 0);
  const R = 60;
  const rats = crowd(b, R, () => '#5a5250', { geo: ratGeo });
  const rs = Array.from({ length: R }, () => ({ lane: b.ri(-5, 4), horiz: b.chance(0.5), ph: b.r(1), sp: b.r(0.06, 0.16) * (b.chance(0.5) ? 1 : -1) }));
  // the city of the swallow: a bright opening with sky and birds
  const open = b.sub({ unique: true, x: 2.2, z: -1.6 });
  open.cyl(0, 0, 0, 2.2, 0.03, '#f0e8c8', { kind: 'glow', i: 1.1, seg: 32 });
  open.cyl(0, 0, 0, 2.2, 7, '#bfe0ff', { kind: 'ghost', seg: 32, open: true });
  open.mats.ghost.opacity = 0;
  const birdGeo = new THREE.ConeGeometry(0.12, 0.45, 3).rotateX(Math.PI / 2).scale(1.8, 0.3, 1);
  const S = 14;
  const swallows = crowd(b, S, () => '#1a1a2a', { geo: birdGeo });
  b.on((t) => {
    rs.forEach((r, i) => {
      const u = (((r.ph + t * r.sp) % 1) + 1) % 1;
      const along = -10 + u * 20;
      const across = (r.lane + 0.5) * 1.9;
      const x = r.horiz ? along : across;
      const z = r.horiz ? across : along;
      const ok = Math.hypot(x, z) < 10.6;
      rats.set(i, x, 0.01, z, ok ? 1 : 0.0001, r.horiz ? (r.sp > 0 ? Math.PI / 2 : -Math.PI / 2) : r.sp > 0 ? 0 : Math.PI);
    });
    rats.commit();
    // every so often, the wall opens for a moment
    const c = (t * 0.07) % 1;
    const o = c < 0.6 ? 0 : c < 0.68 ? smooth((c - 0.6) / 0.08) : c < 0.9 ? 1 : 1 - smooth((c - 0.9) / 0.1);
    open.mats.glow.color.setScalar(o);
    open.mats.ghost.opacity = o * 0.22;
    for (let i = 0; i < S; i++) {
      const a = t * (0.8 + (i % 3) * 0.2) + i;
      const r = 1 + (i % 4) * 0.5;
      swallows.set(i, 2.2 + Math.cos(a) * r, 2 + (i % 5) * 0.9 + Math.sin(a * 2) * 0.3, -1.6 + Math.sin(a) * r, o > 0.05 ? o * 1.2 : 0.0001, -a);
    }
    swallows.commit();
  });
  ctx.view.elev = 0.62;
};

// ---------------------------------------------------------------- Theodora
// Purged of every animal; then, from the bestiaries in the library cellars, the fabulous beasts return.
const theodora: Gen = (b, ctx) => {
  b.ground(11.6, '#d8d4cc');
  // the sterile city, white and orderly
  for (let k = 0; k < 36; k++) {
    const a = (k / 36) * TAU;
    const r = k % 2 ? 8.8 : 6.4;
    b.house(Math.cos(a) * r, Math.sin(a) * r, 1.1, 1.0, 1.0 + (k % 3) * 0.5, { ry: -a, wall: '#f4f2ee', roof: '#c8ccd0', roofType: 'flat', lit: 0.35, win: '#d8ecff' });
  }
  // the library, cut open to show the cellar of bestiaries
  b.box(0, 0, -3.4, 0.25, 2.6, 4.2, '#e8e4dc');
  b.box(0, 2.6, 0, 4.6, 0.2, 7.2, '#c8c4bc');
  for (let k = 0; k < 6; k++) b.cyl(-2.1, 0, -3 + k * 1.2, 0.12, 2.6, '#f4f2ee', { seg: 8 });
  for (let k = 0; k < 6; k++) b.cyl(2.1, 0, -3 + k * 1.2, 0.12, 2.6, '#f4f2ee', { seg: 8 });
  b.prism(0, 2.8, 0, 5, 0.9, 7.4, '#e8e4dc');
  // the cellar: a lit pit with shelves of old books
  b.box(0, -0.02, 0, 3.4, 0.03, 5.6, '#2a1a10');
  for (let s = 0; s < 3; s++)
    for (let k = 0; k < 14; k++) b.box(-1.5 + (k % 2) * 3, 0.1 + s * 0.35, -2.4 + Math.floor(k / 2) * 0.7, 0.25, 0.3, 0.12, b.pick(['#7a2a1a', '#2a4a6a', '#5a4a1a', '#3a5a3a']));
  b.cyl(0, 0, 0, 0.9, 0.06, '#ffcf8a', { kind: 'glow', i: 1.6, seg: 16 });
  // the beasts, rising from the books and circling the city
  const beasts = b.sub();
  const gold = new THREE.Color(ctx.accent).lerp(new THREE.Color('#ffd890'), 0.4);
  const kind = 'gold' as const;
  // dragon: a serpentine body with wings
  const dragon = beasts.sub();
  const body: THREE.Vector3[] = [];
  for (let k = 0; k < 12; k++) body.push(V(Math.sin(k * 0.7) * 0.5, Math.cos(k * 0.5) * 0.3, -k * 0.35));
  dragon.tube(body, 0.14, gold, { kind, seg: 40, radial: 6 });
  dragon.cone(0, 0.0, 0.4, 0.18, 0.5, gold, { kind, rx: Math.PI / 2, seg: 6 });
  for (const s of [-1, 1]) dragon.add(new THREE.CircleGeometry(1.2, 3), new THREE.Matrix4().compose(V(s * 0.6, 0.2, -0.8), new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, s * 0.3)), V(1, 0.6, 1)), '#c86a3a', 'cloth');
  // griffin
  const griffin = beasts.sub();
  griffin.sphere(0, 0, 0, 0.4, gold, { kind, sz: 1.6, seg: 10 });
  griffin.sphere(0, 0.3, 0.6, 0.22, gold, { kind, seg: 8 });
  griffin.cone(0, 0.28, 0.85, 0.07, 0.25, '#e0a030', { rx: Math.PI / 2, seg: 4 });
  for (const s of [-1, 1]) griffin.box(s * 0.8, 0.2, 0, 1.2, 0.04, 0.5, '#f0e8d0', { rz: s * 0.3, kind: 'cloth' });
  // unicorn
  const unicorn = beasts.sub();
  unicorn.sphere(0, 0, 0, 0.35, '#f8f6f0', { sz: 1.8, seg: 10 });
  unicorn.sphere(0, 0.35, 0.65, 0.18, '#f8f6f0', { sz: 1.4, seg: 8 });
  unicorn.cone(0, 0.5, 0.85, 0.04, 0.5, gold, { kind, rx: 1.0, seg: 5 });
  for (const [x, z] of [[0.15, 0.4], [-0.15, 0.4], [0.15, -0.4], [-0.15, -0.4]]) unicorn.cyl(x, -0.75, z, 0.04, 0.6, '#f0ece4', { seg: 4 });
  // sphinx
  const sphinx = beasts.sub();
  sphinx.sphere(0, 0, 0, 0.4, '#d8b070', { sz: 1.8, sy: 0.7, seg: 10 });
  sphinx.sphere(0, 0.4, 0.6, 0.2, '#e8c890', { seg: 8 });
  sphinx.cyl(0, 0.5, 0.6, 0.24, 0.3, '#3a5aa0', { seg: 8, rt: 0.5 });
  for (const s of [-1, 1]) sphinx.box(s * 0.7, 0.2, -0.1, 1.0, 0.04, 0.6, '#d8b070', { rz: s * 0.4, kind: 'cloth' });
  // hydra: many necks
  const hydra = beasts.sub();
  hydra.sphere(0, 0, 0, 0.45, '#4a8a5a', { seg: 10 });
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI - Math.PI / 2;
    const neck = [V(0, 0.2, 0), V(Math.sin(a) * 0.4, 0.7, 0.3), V(Math.sin(a) * 0.6, 1.1, 0.5 + Math.cos(a) * 0.2)];
    hydra.tube(neck, 0.05, '#4a8a5a', { seg: 8, radial: 4 });
    hydra.sphere(neck[2].x, neck[2].y, neck[2].z, 0.09, '#6aaa6a', { seg: 6 });
  }
  const all = [dragon, griffin, unicorn, sphinx, hydra];
  beasts.on((t) => {
    all.forEach((m, i) => {
      // each emerges from the cellar, climbs and circles, then goes back to its page
      const c = (t * 0.04 + i / all.length) % 1;
      const rise = smooth(clamp(c / 0.25, 0, 1));
      const sink = smooth(clamp((c - 0.85) / 0.15, 0, 1));
      const a = c * TAU * 1.5 + i;
      const r = rise * (5 + i * 0.6) * (1 - sink);
      m.group.position.set(Math.cos(a) * r, 0.3 + rise * (3.5 + (i % 3) * 1.2) * (1 - sink) + Math.sin(t * 2 + i) * 0.15, Math.sin(a) * r);
      m.group.rotation.y = -a + (rise < 1 ? 0 : Math.PI);
      m.group.scale.setScalar(0.5 + rise * 1.5 * (1 - sink * 0.7));
      m.group.lookAt(m.group.position.x - Math.sin(a) * 10, m.group.position.y, m.group.position.z + Math.cos(a) * 10);
    });
  });
  ctx.view.elev = 0.45;
  ctx.view.ty = 2.5;
};

// ---------------------------------------------------------------- Berenice
// Within the unjust city a just one, within it an unjust one, and so on: all the Berenices folded together.
const berenice: Gen = (b, ctx) => {
  b.ground(11.6, '#3a3632');
  const gear = (s: B, R: number, teeth: number, y: number, col: string) => {
    s.cyl(0, y, 0, R, 0.25, col, { kind: 'metal', seg: 32 });
    for (let k = 0; k < teeth; k++) {
      const a = (k / teeth) * TAU;
      s.box(Math.cos(a) * R, y, Math.sin(a) * R, 0.3 * (R / 3), 0.25, 0.3 * (R / 3) + 0.08, col, { ry: -a, kind: 'metal' });
    }
  };
  const levels: B[] = [];
  let scale = 1;
  for (let L = 0; L < 5; L++) {
    const s = b.sub();
    s.group.scale.setScalar(scale);
    const unjust = L % 2 === 0;
    if (unjust) {
      // the unjust: iron, gears, hydraulic machines, towers of the masters
      s.ring(0, 0.01, 0, 6.6, 11, '#2a2624', { seg: 64 });
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * TAU;
        const x = Math.cos(a) * 9;
        const z = Math.sin(a) * 9;
        s.box(x, 0, z, 1.3, 2.4 + (k % 3) * 1.2, 1.3, '#4a4440', { ry: -a, kind: 'metal' });
        s.cyl(x + 0.3, 2.4 + (k % 3) * 1.2, z, 0.15, 1.4, '#2a2220', { seg: 6 });
        // pistons
        s.cyl(Math.cos(a + 0.3) * 7.4, 0, Math.sin(a + 0.3) * 7.4, 0.22, 1.6, '#6a6a70', { kind: 'metal', seg: 8 });
      }
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * TAU + 0.15;
        s.box(Math.cos(a) * 7.4, 0, Math.sin(a) * 7.4, 0.5, 0.9, 0.5, '#c8402a', { kind: 'glow', i: 0.25, ry: -a });
      }
      const g1 = s.sub({ x: 7.6, z: 0 });
      gear(g1, 1.4, 14, 0.2, '#8a7a5a');
      const g2 = s.sub({ x: -7.0, z: 3.6 });
      gear(g2, 1.0, 10, 0.2, '#7a6a4a');
      g1.on((t) => (g1.group.rotation.y = t * 0.5));
      g2.on((t) => (g2.group.rotation.y = -t * 0.7));
    } else {
      // the just: a hidden garden, a seed of furtive happiness
      s.ring(0, 0.02, 0, 6.6, 11, '#5a7a42', { seg: 64 });
      for (let k = 0; k < 18; k++) {
        const a = (k / 18) * TAU;
        const x = Math.cos(a) * 8.8;
        const z = Math.sin(a) * 8.8;
        if (k % 2) s.tree(x, z, 1.6, '#5a9a4a');
        else s.house(x, z, 1.1, 1.0, 1.0, { ry: -a, wall: '#f0dcc0', roof: '#c06a3a', roofType: 'hip', lit: 0.8 });
      }
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * TAU + 0.2;
        s.sphere(Math.cos(a) * 7.3, 0.3, Math.sin(a) * 7.3, 0.25, '#ffd88a', { kind: 'glow', i: 1.4, seg: 8 });
      }
    }
    // the boundary between one Berenice and the next
    s.cyl(0, 0, 0, 6.6, 0.5, unjust ? '#5a5048' : '#c8b88a', { seg: 64, open: true });
    levels.push(s);
    scale *= 0.58;
  }
  // a seed of light at the heart
  b.sphere(0, 0.4, 0, 0.18, '#fff0c0', { kind: 'glow', i: 2.5, seg: 10 });
  b.on((t) => {
    levels.forEach((s, L) => {
      s.group.rotation.y = t * 0.03 * (L % 2 ? -1 : 1) * (1 + L * 0.5);
    });
  });
  ctx.view.elev = 0.7;
  ctx.view.dist = 30;
};

export const hidden: Record<string, Gen> = { olinda, raissa, marozia, theodora, berenice };
