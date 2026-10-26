// THEKLA - Cities & the Sky 3.
// Nothing in Thekla is ever finished: walls rise behind scaffolding, cranes swing
// their loads, ropes and pulleys hang everywhere, and the builders keep working
// so that ruin can never begin. Asked for the plan, they wait for sunset, when
// work stops and the night sky spreads over the yards. Toggle: the blueprint.
// The stars above connect into the city's plan, and the finished city appears
// as a pale line drawing over every unfinished site.

import * as THREE from 'three';
import * as K from '../kit';
import type { CityBuilder } from '../core/types';

const WOOD = '#9a6e43', WOOD2 = '#7f5833', ROPE = '#c9b087', STONE = ['#cdb48c', '#c2a77d', '#d6c09a', '#b99f78'];

interface Site { x: number; z: number; w: number; d: number; built: number; full: number; ry: number; roof: 'gable' | 'pyramid' | 'dome' }

const build: CityBuilder = (ctx) => {
  const rng = ctx.rng;
  const root = new THREE.Group();
  const isl = K.island({ radius: 15, flat: 13.2, depth: 7, top: '#9d8664', edge: '#8a7353', cliff: '#6e5a44', under: '#3a3038', strata: '#86704f', seed: 7, hills: 0.3 });
  root.add(isl.mesh);
  root.add(K.cloudSea({ y: -6, color: '#3a4778', shadow: '#151a35', opacity: 0.75, coverage: 0.45 }));
  const b = new K.Batch();

  // ---- scaffolding around a block
  const scaffold = (s: Site) => {
    const lx = s.w / 2 + 0.28, lz = s.d / 2 + 0.28, H = s.built + 0.9;
    const c = Math.cos(s.ry), sn = Math.sin(s.ry);
    const P = (u: number, y: number, v: number): [number, number, number] => [s.x + u * c + v * sn, y, s.z - u * sn + v * c];
    const poles: [number, number][] = [];
    for (const side of [-1, 1]) {
      const nx = Math.max(2, Math.round((lx * 2) / 0.8));
      for (let i = 0; i <= nx; i++) poles.push([-lx + (i / nx) * lx * 2, side * lz]);
      const nz = Math.max(2, Math.round((lz * 2) / 0.8));
      for (let i = 1; i < nz; i++) poles.push([side * lx, -lz + (i / nz) * lz * 2]);
    }
    for (const [u, v] of poles) K.timber(b, P(u, 0, v), P(u, H, v), 0.025, WOOD2);
    for (let y = 0.6; y <= H - 0.2; y += 0.6) {
      const corners: [number, number][] = [[-lx, -lz], [lx, -lz], [lx, lz], [-lx, lz]];
      for (let k = 0; k < 4; k++) {
        const [u0, v0] = corners[k], [u1, v1] = corners[(k + 1) % 4];
        K.timber(b, P(u0, y, v0), P(u1, y, v1), 0.02, WOOD);
        if (rng.chance(0.55)) { // planks
          const mx = (u0 + u1) / 2, mz = (v0 + v1) / 2, len = Math.hypot(u1 - u0, v1 - v0);
          const along = Math.abs(u1 - u0) > 0.01;
          const pp = P(mx * (along ? 1 : 1.0), y + 0.02, mz);
          b.add(K.at(K.box(along ? len : 0.3, 0.03, along ? 0.3 : len), pp[0], pp[1], pp[2], { ry: s.ry }), K.jitter('#b88a55', rng, 0.01, 0.05, 0.06), 'wood');
        }
        if (rng.chance(0.35)) K.timber(b, P(u0, y - 0.6, v0), P(u1, y, v1), 0.015, WOOD2); // braces
      }
    }
    // a ladder
    const lu = -lx + 0.2;
    for (const off of [0, 0.22]) K.timber(b, P(lu + off, 0, lz + 0.12), P(lu + off, H, lz + 0.12), 0.015, '#a87c4c');
    for (let y = 0.2; y < H; y += 0.2) K.timber(b, P(lu, y, lz + 0.12), P(lu + 0.22, y, lz + 0.12), 0.01, '#a87c4c');
    return P;
  };

  // ---- unfinished walls: courses of stone with a ragged top
  const walls = (s: Site) => {
    const course = 0.22, c = STONE;
    const n = Math.floor(s.built / course);
    const faces: [number, number, number, number][] = [[s.w, 0, s.d / 2, 0], [s.w, 0, -s.d / 2, 0], [s.d, s.w / 2, 0, Math.PI / 2], [s.d, -s.w / 2, 0, Math.PI / 2]];
    for (const [len, ox, oz, rot] of faces) {
      const segs = Math.max(2, Math.round(len / 0.45));
      for (let k = 0; k < segs; k++) {
        const top = n - (rng.chance(0.5) ? rng.int(0, 3) : 0) - (k === Math.floor(segs / 2) ? Math.min(n, 4) : 0);
        const hseg = Math.max(0, top) * course;
        if (hseg <= 0) continue;
        const u = -len / 2 + (k + 0.5) * (len / segs);
        const g = K.at(K.box(len / segs - 0.02, hseg, 0.16), u, 0, 0);
        K.paintBy(g, (_x, y, _z, out) => out.copy(K.col(c[Math.floor(y / course + k) % c.length])));
        K.at(g, ox, 0, oz, { ry: rot });
        b.add(K.at(g, s.x, 0, s.z, { ry: s.ry }), null, 'stone');
      }
    }
  };

  // ---- the sites
  const sites: Site[] = [];
  const DOME: Site = { x: 0, z: 0, w: 4.2, d: 4.2, built: 2.4, full: 3.4, ry: 0, roof: 'dome' };
  for (let i = 0; i < 400 && sites.length < 22; i++) {
    const [x, z] = rng.inRing(4.6, 11.8);
    const w = rng.float(1.3, 2.4), d = rng.float(1.3, 2.2);
    if (sites.some((s) => Math.hypot(s.x - x, s.z - z) < (Math.max(s.w, s.d) + Math.max(w, d)) * 0.62 + 0.5)) continue;
    const full = rng.float(2.2, 4.8);
    sites.push({ x, z, w, d, full, built: full * rng.float(0.25, 0.7), ry: -Math.atan2(z, x) + Math.PI / 2 + rng.float(-0.15, 0.15), roof: rng.pick(['gable', 'pyramid', 'gable'] as const) });
  }
  const lampPos: THREE.Vector3[] = [];
  const workers: [number, number, number][] = [];
  for (const s of [...sites, DOME]) {
    if (s !== DOME) walls(s);
    const P = scaffold(s);
    lampPos.push(new THREE.Vector3(...P(s.w / 2 + 0.28, s.built + 0.95, s.d / 2 + 0.28)));
    for (let k = 0; k < 2; k++) workers.push(P(rng.float(-s.w / 2, s.w / 2), Math.floor(rng.float(1, (s.built + 0.6) / 0.6)) * 0.6 + 0.04, (rng.chance(0.5) ? 1 : -1) * (s.d / 2 + 0.28)));
  }
  // the great dome: a drum and only some of its ribs
  b.add(K.at(K.cyl(2.1, 2.1, 2.4, 32, true), 0, 0, 0), '#d0b88f', 'stone');
  b.add(K.at(K.torus(2.1, 0.12, 6, 48), 0, 2.4, 0), '#c7ad82', 'stone');
  for (let i = 0; i < 16; i++) {
    if (i % 4 === 3) continue;
    const a = (i / 16) * Math.PI * 2, frac = i % 2 ? 0.55 : 1;
    const pts: [number, number, number][] = [];
    for (let k = 0; k <= 10; k++) { const t = (k / 10) * frac * Math.PI / 2; pts.push([Math.cos(a) * 2.1 * Math.cos(t), 2.4 + 2.1 * Math.sin(t) * 1.1, Math.sin(a) * 2.1 * Math.cos(t)]); }
    b.add(K.tube(pts, 0.07, 14, 5), i % 2 ? WOOD : '#d4bd96', i % 2 ? 'wood' : 'stone');
  }
  b.add(K.at(K.torus(0.5, 0.1, 6, 24), 0, 4.7, 0), '#d4bd96', 'stone'); // lantern ring waiting for its ribs
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.4; K.timber(b, [Math.cos(a) * 1.9, 0, Math.sin(a) * 1.9], [0, 4.7, 0], 0.05, WOOD2); }

  // ---- builders' yard: stacks of beams, blocks, sand
  for (let i = 0; i < 30; i++) {
    const [x, z] = rng.inRing(3, 13);
    if (sites.some((s) => Math.hypot(s.x - x, s.z - z) < Math.max(s.w, s.d) * 0.8 + 0.4)) continue;
    const ry = rng.angle(), kind = rng.int(0, 2);
    if (kind === 0) for (let k = 0; k < 6; k++) b.add(K.at(K.box(1.4, 0.09, 0.09), x, 0.09 * Math.floor(k / 3), z + (k % 3) * 0.1, { ry }), K.jitter('#a07a4a', rng), 'wood');
    else if (kind === 1) for (let k = 0; k < 5; k++) b.add(K.at(K.box(0.3, 0.22, 0.3), x + (k % 3) * 0.32 - 0.3, k > 2 ? 0.22 : 0, z, { ry }), K.pickJitter(STONE, rng), 'stone');
    else b.add(K.at(K.cone(0.5, 0.35, 12), x, 0, z), '#c9b28a', 'matte');
  }
  K.forest(b, { n: 22, r0: 13, r1: 14.2, rng, kinds: ['cypress', 'pine'], h: [1.2, 2.2] });

  // ---- treadwheel cranes (static frame, turning wheel)
  const wheels: THREE.Group[] = [];
  for (const [x, z, ry] of [[-3.6, 3.4, 0.6], [3.8, -3.2, 2.4]] as const) {
    const c = Math.cos(ry), s = Math.sin(ry);
    const L = (u: number, y: number, v: number): [number, number, number] => [x + u * c + v * s, y, z - u * s + v * c];
    for (const v of [-0.45, 0.45]) { K.timber(b, L(-0.9, 0, v), L(0, 3.4, v * 0.3), 0.06, WOOD2); K.timber(b, L(0.9, 0, v), L(0, 3.4, v * 0.3), 0.06, WOOD2); }
    K.timber(b, L(0, 3.3, 0), L(2.6, 4.6, 0), 0.07, WOOD);
    const wg = new THREE.Group();
    const wb = new K.Batch();
    wb.add(K.torus(0.85, 0.05, 6, 32), WOOD, 'wood');
    for (let k = 0; k < 8; k++) wb.add(K.at(K.box(0.04, 0.04, 1.7), 0, 0, 0, { ry: (k / 8) * Math.PI }), WOOD2, 'wood');
    wg.add(wb.build({ name: 'wheel' }));
    wg.rotation.set(Math.PI / 2, 0, -ry);
    wg.position.set(...L(-0.2, 0.95, 0.75));
    root.add(wg);
    wheels.push(wg);
    b.add(K.rope(L(0, 3.4, 0), L(2.6, 4.6, 0), 0.05, 0.015), ROPE, 'cloth');
  }
  root.add(b.build({ name: 'thekla' }));

  // ---- tower cranes with swinging jibs and hanging loads
  interface Crane { jib: THREE.Group; load: THREE.Object3D; rope: THREE.Mesh; tip: number; base: number; ph: number; sp: number }
  const cranes: Crane[] = [];
  const ropeMat = new THREE.MeshStandardMaterial({ color: ROPE, roughness: 0.9 });
  const cranePos: [number, number, number][] = [[1.2, -6.4, 7.5], [-7.8, -1.6, 6.2], [6.6, 4.8, 6.8], [-2.4, 8.4, 5.6], [9.6, -5.8, 5.2]];
  for (const [x, z, H] of cranePos) {
    const mb = new K.Batch();
    for (const [u, v] of [[-0.18, -0.18], [0.18, -0.18], [0.18, 0.18], [-0.18, 0.18]]) K.timber(mb, [x + u, 0, z + v], [x + u * 0.6, H, z + v * 0.6], 0.035, WOOD2);
    for (let y = 0; y < H - 0.5; y += 0.7) { K.timber(mb, [x - 0.17, y, z - 0.17], [x + 0.15, y + 0.7, z + 0.15], 0.015, WOOD); K.timber(mb, [x + 0.17, y, z - 0.17], [x - 0.15, y + 0.7, z + 0.15], 0.015, WOOD); }
    root.add(mb.build({ name: 'mast' }));
    const jib = new THREE.Group();
    const jb = new K.Batch();
    const tip = 3.6;
    K.timber(jb, [-1.4, 0, 0], [tip, 0, 0], 0.05, WOOD);
    K.timber(jb, [0, 0.9, 0], [tip, 0.05, 0], 0.025, WOOD2);
    K.timber(jb, [0, 0.9, 0], [-1.4, 0.05, 0], 0.025, WOOD2);
    K.timber(jb, [0, 0, 0], [0, 0.9, 0], 0.04, WOOD2);
    jb.add(K.at(K.box(0.5, 0.45, 0.4), -1.3, -0.45, 0), '#8a7a66', 'stone');
    jb.add(K.at(K.cyl(0.08, 0.08, 0.12, 10), tip, -0.06, 0, { rx: Math.PI / 2 }), WOOD2, 'wood');
    jib.add(jb.build({ name: 'jib' }));
    jib.position.set(x, H, z);
    const rope = new THREE.Mesh(K.cyl(0.012, 0.012, 1, 4), ropeMat);
    jib.add(rope);
    const load = rng.chance(0.5)
      ? new THREE.Mesh(K.at(K.box(0.42, 0.3, 0.42), 0, -0.3, 0), K.std('#cbb289', { roughness: 0.9 }))
      : new THREE.Mesh(K.at(K.box(1.0, 0.16, 0.24), 0, -0.16, 0), K.std('#a87c4c', { roughness: 0.8 }));
    load.castShadow = true;
    jib.add(load);
    root.add(jib);
    cranes.push({ jib, load, rope, tip, base: H, ph: rng.float(0, 6), sp: rng.float(0.12, 0.22) });
  }

  // ---- lanterns, workers, smoke from a lime kiln
  root.add(K.glowPoints(lampPos, '#ffbe6e', 0.9, 0.9));
  const lampSpheres = K.instanced(K.sphere(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2, 1) }), lampPos.length, (i, o) => { o.position.copy(lampPos[i]); }, { castShadow: false });
  root.add(lampSpheres);
  root.add(K.crowd({ count: workers.length, place: (i) => workers[i], colors: ['#6b4a2e', '#3a4a5e', '#c9b48a', '#7a3a2a'], rng: rng.fork('c') }));
  const paths: THREE.Vector3[][] = [];
  for (let i = 0; i < 10; i++) { const a = sites[i % sites.length], c = sites[(i * 7 + 3) % sites.length]; paths.push([new THREE.Vector3(a.x, 0.02, a.z).multiplyScalar(1.0), new THREE.Vector3(0, 0.02, 0).lerp(new THREE.Vector3(a.x + c.x, 0, a.z + c.z), 0.25), new THREE.Vector3(c.x, 0.02, c.z)]); }
  const walkers = new K.Walkers({ paths, count: 70, rng: rng.fork('w'), speed: [0.2, 0.4], colors: ['#6b4a2e', '#3a4a5e', '#c9b48a', '#7a3a2a', '#4a4a3a'] });
  root.add(walkers.mesh);
  root.add(K.smoke({ sources: [[-10.5, 0.8, -4], [5, 0.5, 10.2]], perSource: 22, height: 4, color: '#c8c2c8', opacity: 0.3, size: [0.3, 1.0], life: 8, wind: [0.2, 0.1], rng: rng.fork('s') }));
  root.add(K.particles({ count: 200, radius: 13, y0: 0.3, y1: 5, color: '#e8d2a8', size: 0.04, opacity: 0.45, swirl: 0.4, rng: rng.fork('d') }));

  // ---- the blueprint: in the sky (stars at the corners) and over every site (finished outlines)
  const SKY_Y = 17, SK = 1.25;
  const pairs: [THREE.Vector3, THREE.Vector3][] = [];
  const vertices: THREE.Vector3[] = [];
  const outline: number[] = [];
  const addBox = (s: Site, toSky: boolean) => {
    const c = Math.cos(s.ry), sn = Math.sin(s.ry);
    const corner = (u: number, v: number) => [s.x + u * c + v * sn, s.z - u * sn + v * c];
    const cs = [[-s.w / 2, -s.d / 2], [s.w / 2, -s.d / 2], [s.w / 2, s.d / 2], [-s.w / 2, s.d / 2]].map(([u, v]) => corner(u, v));
    for (let k = 0; k < 4; k++) {
      const [ax, az] = cs[k], [bx, bz] = cs[(k + 1) % 4];
      if (toSky) { const A = new THREE.Vector3(ax * SK, SKY_Y, az * SK), B = new THREE.Vector3(bx * SK, SKY_Y, bz * SK); pairs.push([A, B]); vertices.push(A); }
      else {
        outline.push(ax, 0, az, ax, s.full, az, ax, s.full, az, bx, s.full, bz);
        const [mx, mz] = [(cs[0][0] + cs[2][0]) / 2, (cs[0][1] + cs[2][1]) / 2];
        if (s.roof === 'pyramid') outline.push(ax, s.full, az, mx, s.full + Math.min(s.w, s.d) * 0.6, mz);
      }
    }
    if (!toSky && s.roof === 'gable') {
      const r0 = corner(-s.w / 2, 0), r1 = corner(s.w / 2, 0), hh = s.full + s.d * 0.4;
      outline.push(r0[0], hh, r0[1], r1[0], hh, r1[1]);
      for (const [u, v] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) { const p = corner((u * s.w) / 2, (v * s.d) / 2), q = corner((u * s.w) / 2, 0); outline.push(p[0], s.full, p[1], q[0], hh, q[1]); }
    }
  };
  for (const s of sites) { addBox(s, true); addBox(s, false); }
  for (let i = 0; i < 48; i++) { // the dome, finished, and its ring roads in the sky
    const a0 = (i / 48) * Math.PI * 2, a1 = ((i + 1) / 48) * Math.PI * 2;
    for (const r of [2.1, 12.5]) pairs.push([new THREE.Vector3(Math.cos(a0) * r * SK, SKY_Y, Math.sin(a0) * r * SK), new THREE.Vector3(Math.cos(a1) * r * SK, SKY_Y, Math.sin(a1) * r * SK)]);
    if (i % 3 === 0) {
      for (let k = 0; k < 8; k++) { const t0 = (k / 8) * Math.PI / 2, t1 = ((k + 1) / 8) * Math.PI / 2; outline.push(Math.cos(a0) * 2.1 * Math.cos(t0), 2.4 + 2.3 * Math.sin(t0), Math.sin(a0) * 2.1 * Math.cos(t0), Math.cos(a0) * 2.1 * Math.cos(t1), 2.4 + 2.3 * Math.sin(t1), Math.sin(a0) * 2.1 * Math.cos(t1)); }
      vertices.push(new THREE.Vector3(Math.cos(a0) * 12.5 * SK, SKY_Y, Math.sin(a0) * 12.5 * SK));
    }
  }
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; pairs.push([new THREE.Vector3(Math.cos(a) * 2.1 * SK, SKY_Y, Math.sin(a) * 2.1 * SK), new THREE.Vector3(Math.cos(a) * 12.5 * SK, SKY_Y, Math.sin(a) * 12.5 * SK)]); }
  outline.push(0, 4.7, 0, 0, 5.6, 0);
  const skyLines = K.lines(pairs, '#9fd0ff', 0);
  const skyStars = K.glowPoints(vertices, '#eaf2ff', 0.55, 0.55);
  const og = new THREE.BufferGeometry();
  og.setAttribute('position', new THREE.Float32BufferAttribute(outline, 3));
  const outlineMat = new THREE.LineBasicMaterial({ color: '#8fd2ff', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const outlines = new THREE.LineSegments(og, outlineMat);
  root.add(skyLines, skyStars, outlines);

  const tog = new K.Toggle(0.32);
  let wt = 0;
  return {
    root,
    env: {
      skyTop: '#0a1330', skyHorizon: '#b06e66', skyBottom: '#1e1d3a', skyCurve: 0.3,
      fog: '#3e4068', fogNear: 70, fogFar: 200,
      sunDir: [-0.8, 0.14, -0.4], sunColor: '#ffad7a', sunIntensity: 2.2, sunDisc: 0, sunGlow: 1.4,
      hemiSky: '#7f93d6', hemiGround: '#4a3c3a', hemiIntensity: 1.0, envIntensity: 0.75,
      stars: 0.85, clouds: 0.15, cloudColor: '#c0889a',
      bloomStrength: 0.8, bloomThreshold: 0.8, bloomRadius: 0.5,
      tiltShift: 0.4, shadowRadius: 17, vignette: 0.42, saturation: 1.05,
    },
    camera: {
      position: [22, 13, 26], target: [0, 2.6, 0], minDistance: 7, maxDistance: 70, autoRotate: 0.25,
      views: [
        { position: [-8, 30, 12], target: [0, 4, 0] },
        { position: [6.2, 3.4, 5.4], target: [1.5, 2.8, -1.5] },
      ],
    },
    interaction: {
      label: 'Show the blueprint',
      activeLabel: 'Back to work',
      hint: 'Work stops at nightfall; the plan is written in the stars.',
      camera: { position: [29, 4, 32], target: [0, 9, 0] },
      set: (on) => tog.set(on),
    },
    update(t, dt) {
      tog.update(dt);
      const v = tog.value;
      const work = 1 - v * 0.9;
      wt += dt * work;
      for (const c of cranes) {
        c.jib.rotation.y = Math.sin(wt * c.sp + c.ph) * 1.4 + c.ph;
        const drop = 1.2 + (0.5 + 0.5 * Math.sin(wt * c.sp * 2.3 + c.ph)) * (c.base - 2.0);
        const sway = Math.sin(t * 1.3 + c.ph) * 0.06 * work;
        c.load.position.set(c.tip + sway * drop * 0.3, -drop, sway);
        c.rope.position.set(c.tip, -drop, 0);
        c.rope.scale.set(1, drop, 1);
      }
      wheels.forEach((w, i) => (w.rotation.y = wt * 0.4 * (i ? -1 : 1)));
      walkers.update(wt);
      (skyLines.material as THREE.LineBasicMaterial).opacity = K.smoothstep(0.3, 1, v) * 0.55;
      (skyStars.material as THREE.PointsMaterial).opacity = 0.45 + v * 0.5 + 0.08 * Math.sin(t * 1.7);
      outlineMat.opacity = K.smoothstep(0.1, 0.8, v) * (0.6 + 0.1 * Math.sin(t * 2));
    },
  };
};

export default build;
