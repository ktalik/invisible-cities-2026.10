// ZIRMA - Cities & Signs 3.
// A redundant city: three tower designs stamped out again and again, a lunatic on
// every cornice, blind men tapping canes on the cobbles, girls leading pumas, a whole
// street of identical tattoo parlours, dirigibles crossing at window level in every
// direction, and crammed trains in the humid tubes under the plinth (seen through the
// cut-away south face). Toggle: the city the companions swear they saw, one of each.

import * as THREE from 'three';
import * as K from '../kit';
import type { CityBuilder } from '../core/types';

const PITCH = 4.2;
const LOTS = [-3, -2, -1, 0, 1, 2, 3].map((i) => i * PITCH);
const STREETS = [-14.9, -10.5, -6.3, -2.1, 2.1, 6.3, 10.5, 14.9];
const HALF = 16;

const build: CityBuilder = (ctx) => {
  const rng = ctx.rng;
  const root = new THREE.Group();
  const FACADE = ['#d9cbab', '#e2d4b4', '#cdbd9b', '#d6c4a0', '#e6dcc4'];
  const TEAL = '#3d7f78';
  const VERM = '#cc4f38';

  // ---------------------------------------------------------------- plinth with cut-away south face
  const pb = new K.Batch();
  const SEC = 13; // z of the back wall of the section
  pb.add(K.at(K.box(32, 4, SEC + HALF), 0, -4, (SEC - HALF) / 2), '#4b4643', 'stone');
  pb.add(K.at(K.box(32, 0.55, HALF - SEC), 0, -0.55, (SEC + HALF) / 2), '#5a524c', 'stone'); // street slab
  pb.add(K.at(K.box(32, 0.45, HALF - SEC), 0, -2.25, (SEC + HALF) / 2), '#5a524c', 'stone'); // between tubes
  pb.add(K.at(K.box(32, 0.3, HALF - SEC), 0, -4, (SEC + HALF) / 2), '#3e3936', 'stone'); // floor
  for (const sx of [-1, 1]) pb.add(K.at(K.box(0.5, 4, HALF - SEC), sx * 15.75, -4, (SEC + HALF) / 2), '#4b4643', 'stone');
  // tiled tube walls (cream with a green-gold dado) and rails
  for (const [y0, y1] of [[-1.8, -0.55], [-3.7, -2.25]]) {
    const wall = K.paintBy(K.at(K.plane(31, y1 - y0, 62, 6), 0, 0, 0, { rx: Math.PI / 2 }), (x, y, _z, out) => {
      const row = Math.floor((y + 10) * 5), colI = Math.floor((x + 40) * 2);
      out.set(y < -(y1 - y0) * 0.15 ? '#6f8b5c' : '#d8cfa6').multiplyScalar(0.85 + 0.15 * ((row + colI) % 2));
    });
    pb.add(K.at(wall, 0, (y0 + y1) / 2, SEC + 0.01), null, 'ceramic');
    for (const dz of [13.7, 14.4]) pb.add(K.at(K.box(31, 0.05, 0.06), 0, y0, dz), '#8a8d90', 'metal');
    for (let x = -14; x <= 14; x += 4) {
      pb.add(K.at(K.box(1.4, 0.06, 0.2), x, y1 - 0.06, SEC + 0.6), '#fff0b8', 'glow', 2.2);
      pb.add(K.at(K.box(0.7, 0.45, 0.02), x + 2, y0 + 0.45, SEC + 0.02), rng.pick(['#cc4f38', '#3d7f78', '#e3b04a', '#2b3f66']), 'matte');
    }
  }
  // bronze frame of the glazed section
  for (let x = -16; x <= 16; x += 4) pb.add(K.at(K.box(0.12, 4, 0.12), x, -4, HALF - 0.06), '#7d5a35', 'bronze');
  for (const y of [-0.1, -2.05, -3.75]) pb.add(K.at(K.box(32.2, 0.12, 0.14), 0, y, HALF - 0.06), '#7d5a35', 'bronze');
  // platform at the front left of the upper tube, with benches
  pb.add(K.at(K.box(7, 0.3, 1.1), -11.5, -1.8, 15.35), '#cfc6ad', 'stone');
  for (const x of [-13.5, -11.5, -9.5]) pb.add(K.at(K.box(0.8, 0.12, 0.25), x, -1.32, 15.7), '#6b4a30', 'wood'), pb.add(K.at(K.box(0.8, 0.18, 0.04), x, -1.32, 15.84), '#6b4a30', 'wood');
  root.add(pb.build({ name: 'plinth' }));

  // cobbled streets: a canvas of small setts over the whole top
  const cobble = K.canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#3d3936';
    g.fillRect(0, 0, w, h);
    const r = new K.RNG(77);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const l = 70 + r.int(0, 30);
      g.fillStyle = `rgb(${l + 6},${l},${l - 6})`;
      g.fillRect(x * 16 + (y % 2) * 8 + 1, y * 16 + 1, 14, 14);
    }
  });
  cobble.wrapS = cobble.wrapT = THREE.RepeatWrapping;
  cobble.repeat.set(16, 16);
  const ground = new THREE.Mesh(K.plane(32, 32), new THREE.MeshStandardMaterial({ map: cobble, roughness: 0.8, metalness: 0.15 }));
  ground.receiveShadow = true;
  ground.position.y = 0.002;
  root.add(ground);

  // ---------------------------------------------------------------- towers: three designs, stamped
  const b = new K.Batch();
  const winB = new K.Batch();
  const winMat = new THREE.MeshBasicMaterial({ vertexColors: true, color: '#000000' });
  const win = (g: THREE.BufferGeometry) => {
    const on = rng.chance(0.5);
    winB.addWith(K.paint(g, on ? K.jitter('#ffc86e', rng, 0.02, 0.1, 0.1) : '#262a33', on ? 1.15 : 1), winMat);
  };
  // ribbons of windows on a w x d box (local frame centred at cx,cz), y0..y1
  const ribbons = (cx: number, cz: number, w: number, d: number, y0: number, y1: number, col: string) => {
    const faces: [number, number, number, number][] = [[w, 0, d / 2, 0], [w, 0, -d / 2, Math.PI], [d, w / 2, 0, Math.PI / 2], [d, -w / 2, 0, -Math.PI / 2]];
    for (const [fw, ox, oz, rot] of faces) {
      const n = Math.max(2, Math.floor(fw / 0.45));
      for (let i = 0; i < n; i++) {
        const lx = -fw / 2 + (i + 0.5) * (fw / n);
        const g = K.at(K.wallPlane(0.2, y1 - y0 - 0.5), lx, y0 + 0.25, 0.012);
        win(K.at(g, cx + ox, 0, cz + oz, { ry: rot }));
      }
      for (let y = y0 + 0.55; y < y1 - 0.3; y += 0.55) b.add(K.at(K.box(fw * 0.96, 0.13, 0.05), 0, y, 0, {}).translate(0, 0, 0.02).applyMatrix4(new THREE.Matrix4().makeRotationY(rot)).translate(cx + ox, 0, cz + oz), K.shade(col, 0.92), 'plaster');
    }
  };
  const spire = (x: number, y: number, z: number, h: number) => {
    b.add(K.at(K.cyl(0.18, 0.28, 0.4, 8), x, y, z), '#bfc4c8', 'silver');
    b.add(K.at(K.cone(0.12, h, 8), x, y + 0.4, z), '#d6dadd', 'silver');
    b.add(K.at(K.sphere(0.09, 8, 6), x, y + 0.4 + h * 0.35, z), VERM, 'ceramic');
  };
  type Perch = { x: number; y: number; z: number; dx: number; dz: number };
  const perches: Perch[] = [];
  const tops: [number, number, number][] = [];
  const side = () => rng.pick([[1, 0], [-1, 0], [0, 1], [0, -1]] as const);

  for (let ix = 0; ix < 7; ix++) for (let iz = 0; iz < 7; iz++) {
    let x = LOTS[ix];
    const z = LOTS[iz];
    const dc = Math.hypot(x, z) / 18;
    const h = K.clamp(17 - dc * 11 + rng.float(-1.5, 1.5), 7, 17.5);
    const col = rng.pick(FACADE);
    const east = ix === 6;
    const kind = east ? 1 : (ix * 3 + iz * 5 + (ix * iz)) % 3;
    const hasSpire = rng.chance(0.62);
    b.add(K.at(K.box(3.0, 0.08, 3.0), x, 0, z), '#a59c8c', 'stone'); // pavement of the lot
    if (kind === 0) {
      // A: stepped ziggurat with a cornice at each setback
      const lv = [[2.8, 0, 0.45], [2.1, 0.45, 0.75], [1.4, 0.75, 1]];
      for (const [w, a, c] of lv) {
        b.add(K.at(K.box(w, h * (c - a), w), x, h * a, z), col, 'plaster');
        b.add(K.at(K.box(w + 0.22, 0.16, w + 0.22), x, h * c - 0.08, z), K.shade(col, 0.85), 'stone');
        ribbons(x, z, w, w, h * a + 0.2, h * c - 0.1, col);
      }
      const [sx, sz] = side();
      perches.push({ x: x + sx * 1.22, y: h * 0.45 + 0.08, z: z + sz * 1.22, dx: sx, dz: sz });
      if (hasSpire) spire(x, h + 0.08, z, rng.float(1.5, 3.5));
      tops.push([x, h, z]);
    } else if (kind === 1) {
      // B: finned slab
      const w = east ? 2.2 : 3.0, d = east ? 3.0 : 2.2;
      if (east) x -= 0.4;
      b.add(K.at(K.box(w, h, d), x, 0, z), col, 'plaster');
      ribbons(x, z, w, d, 0.9, h - 0.4, col);
      for (let i = 0; i < 5; i++) {
        const f = -1 + (i / 4) * 2;
        for (const s of [-1, 1]) {
          if (w > d) b.add(K.at(K.box(0.07, h - 0.6, 0.18), x + f * (w / 2 - 0.1), 0.6, z + s * (d / 2 + 0.09)), TEAL, 'ceramic');
          else b.add(K.at(K.box(0.18, h - 0.6, 0.07), x + s * (w / 2 + 0.09), 0.6, z + f * (d / 2 - 0.1)), TEAL, 'ceramic');
        }
      }
      b.add(K.at(K.box(w + 0.3, 0.2, d + 0.3), x, h, z), K.shade(col, 0.85), 'stone');
      b.add(K.at(K.box(w * 0.6, 0.9, d * 0.6), x, h + 0.2, z), col, 'plaster');
      b.add(K.at(K.box(w * 0.6 + 0.12, 0.1, d * 0.6 + 0.12), x, h + 1.1, z), TEAL, 'ceramic');
      const along = w > d;
      const s = rng.sign();
      perches.push({ x: x + (along ? 0 : s * (w / 2 + 0.05)), y: h + 0.2, z: z + (along ? s * (d / 2 + 0.05) : 0), dx: along ? 0 : s, dz: along ? s : 0 });
      if (hasSpire) spire(x, h + 1.2, z, rng.float(1.5, 3));
      tops.push([x, h + 1.2, z]);
    } else {
      // C: crowned drum
      const r = 1.3;
      b.add(K.at(K.cyl(r, r, h * 0.8, 24), x, 0, z), col, 'plaster');
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        win(K.at(K.wallPlane(0.22, h * 0.8 - 1.2), 0, 0.8, r + 0.012, {}).applyMatrix4(new THREE.Matrix4().makeRotationY(a)).translate(x, 0, z));
      }
      for (let y = 1.4; y < h * 0.8 - 0.3; y += 0.55) b.add(K.at(K.torus(r + 0.02, 0.05, 4, 24), x, y, z, { rx: Math.PI / 2 }), K.shade(col, 0.9), 'plaster');
      b.add(K.at(K.cyl(r + 0.22, r + 0.22, 0.18, 24), x, h * 0.8, z), K.shade(col, 0.85), 'stone');
      b.add(K.at(K.cyl(0.9, 0.95, h * 0.2, 16), x, h * 0.8 + 0.18, z), col, 'plaster');
      b.add(K.radial(() => K.at(K.box(0.08, 1.2, 0.35), 0, 0, 0), 12, 0.95, h + 0.18, 0).translate(x, 0, z), TEAL, 'ceramic');
      b.add(K.at(K.dome(0.9, 16, 1, 0.8), x, h + 0.18, z), '#c9a24c', 'gold');
      const a = rng.angle();
      perches.push({ x: x + Math.cos(a) * 1.4, y: h * 0.8 + 0.18, z: z + Math.sin(a) * 1.4, dx: Math.cos(a), dz: Math.sin(a) });
      if (hasSpire) spire(x, h + 0.85, z, rng.float(1.5, 3.5));
      tops.push([x, h + 0.9, z]);
    }
  }

  // ---------------------------------------------------------------- the tattoo street (east face, 14 identical parlours)
  const tatMat = new THREE.MeshBasicMaterial({ color: '#4f7cff' });
  const tatB = new K.Batch();
  const shops: [number, number][] = [];
  for (const z0 of LOTS) for (const dz of [-0.72, 0.72]) shops.push([13.75, z0 + dz]);
  for (const [sx, sz] of shops) {
    b.add(K.at(K.box(0.7, 0.85, 1.36), sx, 0, sz), '#2e3a4a', 'plaster');
    b.add(K.at(K.box(0.3, 0.04, 1.3), sx + 0.45, 0.78, sz, { rz: -0.35 }), VERM, 'cloth');
    tatB.addWith(K.at(K.wallPlane(0.9, 0.5), 0, 0.14, 0, { ry: Math.PI / 2 }).translate(sx + 0.362, 0, sz), tatMat);
  }
  root.add(tatB.build({ castShadow: false }));
  const sailors = K.crowd({ count: shops.length, place: (i) => [shops[i][0] + 0.48, 0.0, shops[i][1] + 0.15], colors: ['#f2efe6', '#1f2c4a'], h: 0.24, rng: rng.fork('sail') });
  root.add(sailors);
  // the lone artist's bench (one of each)
  const lone = new THREE.Group();
  const lb = new K.Batch();
  const [bx, bz] = shops[9];
  lb.add(K.at(K.box(0.25, 0.22, 0.7), bx + 0.62, 0, bz), '#6b4a30', 'wood');
  for (let i = 0; i < 5; i++) lb.add(K.at(K.cyl(0.025, 0.025, 0.06, 6), bx + 0.62, 0.22, bz - 0.25 + i * 0.12), ['#1c2a6a', '#b2232a', '#121212', '#2e7d4a', '#e3b04a'][i], 'glass');
  lb.add(K.at(K.box(0.18, 0.005, 0.22), bx + 0.62, 0.225, bz + 0.18), '#efe6cf', 'cloth');
  lone.add(lb.build());
  lone.add(K.crowd({ count: 1, place: () => [bx + 0.85, 0, bz], colors: ['#20242c'], h: 0.26 }));
  const loneGlow = K.glowSprite('#ffd07c', 1.6, 0.9);
  loneGlow.position.set(bx + 0.7, 0.5, bz);
  lone.add(loneGlow);
  root.add(lone);

  root.add(b.build({ name: 'zirma' }));
  root.add(winB.build({ castShadow: false, receiveShadow: false }));

  // ---------------------------------------------------------------- lunatics, one on every cornice
  const lunatics = K.instanced(K.personGeometry(0.42), K.figureMaterial(), perches.length, (_i, _o, c) => { c.set('#fff8ec'); }, { receiveShadow: false });
  root.add(lunatics);
  const setLun = K.instanceSetter(lunatics);
  const lunPhase = perches.map(() => rng.float(0, 10));
  const keepLun = perches.reduce((best, p, i) => (p.x > 0 && p.z > 0 && p.y > perches[best].y ? i : best), 0);

  // ---------------------------------------------------------------- dirigibles at window level
  const hullParts: THREE.BufferGeometry[] = [
    K.paint(K.at(K.sphere(1, 20, 12), 0, 0, 0, { s: [0.3, 0.3, 1] }), '#aab2ba'),
    K.paint(K.at(K.torus(0.29, 0.035, 5, 24), 0, 0, 0.32), VERM),
    K.paint(K.at(K.torus(0.29, 0.035, 5, 24), 0, 0, -0.32), VERM),
    K.paint(K.at(K.box(0.12, 0.08, 0.42), 0, -0.36, 0.05), '#3a3a3e'),
    K.paint(K.at(K.box(0.02, 0.06, 0.14), 0, -0.29, 0.05), '#3a3a3e'),
  ];
  for (let i = 0; i < 4; i++) hullParts.push(K.paint(K.at(K.box(0.02, 0.32, 0.3), 0, 0.12, -0.8, {}).applyMatrix4(new THREE.Matrix4().makeRotationZ((i * Math.PI) / 2)), VERM));
  const hullGeo = K.merge(hullParts);
  const NB = 24;
  type Ship = { axis: 0 | 1; c: number; dir: number; y: number; s: number; u0: number; v: number };
  const ships: Ship[] = [];
  for (let i = 0; i < NB; i++) {
    ships.push({ axis: (i % 2) as 0 | 1, c: STREETS[(i * 3) % 8], dir: i % 4 < 2 ? 1 : -1, y: i % 3 === 0 ? 11 + ((i * 5) % 7) * 0.8 : 4 + ((i * 7) % 13) * 0.5, s: rng.float(1.2, 1.5), u0: rng.float(-18, 18), v: rng.float(0.7, 1.2) });
  }
  const shipMat = K.std('#ffffff', { vertexColors: true, metalness: 0.55, roughness: 0.35 });
  const shipMesh = K.instanced(hullGeo, shipMat, NB, undefined, { colors: false });
  const echoMat = new THREE.MeshBasicMaterial({ color: '#ffffff', vertexColors: true, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending });
  const echoMesh = K.instanced(hullGeo, echoMat, NB * 2, (i, _o, c) => { c.setScalar(i < NB ? 0.6 : 0.3); }, { castShadow: false, receiveShadow: false });
  root.add(shipMesh, echoMesh);
  const setShip = K.instanceSetter(shipMesh);
  const setEcho = K.instanceSetter(echoMesh);
  const ONE: [number, number, number] = [2.1, 15.5, 2.1];

  // ---------------------------------------------------------------- people of the cobbles
  type Mover = { axis: 0 | 1; c: number; u0: number; v: number };
  const mover = (): Mover => ({ axis: rng.chance(0.5) ? 0 : 1, c: rng.pick(STREETS.slice(1, 7)) + rng.pick([-0.4, 0.4]), u0: rng.float(-15, 15), v: rng.float(0.15, 0.3) * rng.sign() });
  const wrap = (u: number) => ((((u + 15.5) % 31) + 31) % 31) - 15.5;
  const moverPos = (m: Mover, t: number, ahead = 0): [number, number, number] => {
    const u = wrap(m.u0 + m.v * t + Math.sign(m.v) * ahead);
    const ry = m.axis === 0 ? (m.v > 0 ? Math.PI / 2 : -Math.PI / 2) : m.v > 0 ? 0 : Math.PI;
    return m.axis === 0 ? [u, m.c, ry] : [m.c, u, ry];
  };
  const blindGeo = K.merge([K.personGeometry(0.25), K.paint(K.strut([0.06, 0.15, 0.04], [0.1, 0, 0.16], 0.008, 4), '#ffffff')]);
  const blind = Array.from({ length: 30 }, mover);
  const blindMesh = K.instanced(blindGeo, K.figureMaterial(), blind.length, (_i, _o, c) => { c.set('#2a2523'); });
  const girls = Array.from({ length: 14 }, mover);
  const girlMesh = K.instanced(K.personGeometry(0.22), K.figureMaterial(), girls.length, (_i, _o, c) => { c.set(rng.pick(['#cc4f38', '#e8d9b5', '#3d7f78'])); });
  const pumaMesh = K.instanced(K.quadruped({ len: 0.35, h: 0.2, color: '#c38a4c', tail: 0.18, ears: true }), K.figureMaterial(), girls.length);
  root.add(blindMesh, girlMesh, pumaMesh);
  const setBlind = K.instanceSetter(blindMesh), setGirl = K.instanceSetter(girlMesh), setPuma = K.instanceSetter(pumaMesh);
  const paths: THREE.Vector3[][] = [];
  for (const c of STREETS.slice(1, 7)) {
    paths.push([new THREE.Vector3(-15, 0.01, c + 0.3), new THREE.Vector3(15, 0.01, c + 0.3)]);
    paths.push([new THREE.Vector3(c - 0.3, 0.01, -15), new THREE.Vector3(c - 0.3, 0.01, 15)]);
  }
  const walkers = new K.Walkers({ paths, count: 120, rng: rng.fork('walk'), speed: [0.15, 0.35], colors: ['#5b4a3e', '#2f3d55', '#8a6d4f', '#3a3a3a', '#7a4636', '#b9ab8e'] });
  root.add(walkers.mesh);

  // ---------------------------------------------------------------- underground trains
  const trains: { g: THREE.Group; riders: THREE.InstancedMesh; y: number; phase: number }[] = [];
  for (const [ty, phase] of [[-1.8, 0], [-3.7, 9]] as const) {
    const g = new THREE.Group();
    const tb = new K.Batch();
    for (let c = 0; c < 5; c++) {
      const cx = (c - 2) * 2.08;
      tb.add(K.at(K.box(2.0, 0.12, 0.8), cx, 0.06, 0), '#3b4a3f', 'metal');
      tb.add(K.at(K.box(2.0, 0.1, 0.84), cx, 0.82, 0), '#7f8f6a', 'metal');
      tb.add(K.at(K.box(2.0, 0.7, 0.04), cx, 0.12, -0.38), '#a9b07a', 'metal');
      for (const ex of [-0.98, 0.98]) tb.add(K.at(K.box(0.04, 0.7, 0.8), cx + ex, 0.12, 0), '#a9b07a', 'metal');
      for (let p = -2; p <= 2; p++) tb.add(K.at(K.box(0.05, 0.6, 0.05), cx + p * 0.45, 0.18, 0.38), '#a9b07a', 'metal');
      tb.add(K.at(K.box(1.9, 0.04, 0.6), cx, 0.78, 0), '#fff0b0', 'glow', 1.8);
    }
    g.add(tb.build());
    const riders = K.instanced(K.personGeometry(0.42), K.figureMaterial(), 5 * 7, (i, o, c) => {
      const car = Math.floor(i / 7), k = i % 7;
      o.position.set((car - 2) * 2.08 - 0.8 + k * 0.27, 0.12, (k % 2) * 0.22 - 0.08);
      o.scale.set(1.5, 1, 1.4);
      o.rotation.y = rng.float(-0.6, 0.6);
      c.set(rng.pick(['#c66b5a', '#e0b65a', '#8fa3c8', '#b98aa8', '#e9dcc0']));
    }, { castShadow: false });
    g.add(riders);
    g.position.set(0, ty + 0.06, 14.05);
    root.add(g);
    trains.push({ g, riders, y: ty, phase });
  }
  const fatWoman = K.instanced(K.personGeometry(0.45), K.figureMaterial(), 1, (_i, o, c) => {
    o.scale.set(1.8, 1, 1.6);
    c.set('#d97a6a');
  });
  const fatG = new THREE.Group();
  fatG.position.set(-11.5, -1.5, 15.45);
  fatG.add(fatWoman);
  root.add(fatG);
  const fan = new THREE.Mesh(new THREE.CircleGeometry(0.12, 12, 0, Math.PI), new THREE.MeshStandardMaterial({ color: '#f2d27a', side: THREE.DoubleSide }));
  fan.position.set(-11.3, -1.15, 15.62);
  root.add(fan);
  root.add(K.smoke({ sources: [[-14, -1.75, 14.4], [-6, -1.75, 14.4], [3, -1.75, 14.4], [11, -1.75, 14.4], [-9, -3.65, 14.4], [1, -3.65, 14.4], [9, -3.65, 14.4]], perSource: 14, height: 1.1, color: '#e8e6c4', opacity: 0.22, size: [0.3, 1.0], life: 5, wind: [0.25, 0], rng: rng.fork('steam') }));
  for (const y of [-1.2, -3.0]) {
    for (const lx of [-8, 8]) {
      const l = new THREE.PointLight('#d8d070', 10, 18, 1.4);
      l.position.set(lx, y, 15.2);
      root.add(l);
    }
  }

  // humid apricot haze
  root.add(K.particles({ count: 220, radius: 16, y0: 1, y1: 16, color: '#ffd9a8', size: 0.07, opacity: 0.4, swirl: 0.5, twinkle: 0.5, rng: rng.fork('haze') }));

  const tog = new K.Toggle(0.4);
  const pulseAt = (t: number) => { const p = (t + 7) % 13; return K.smoothstep(0, 0.35, p) * (1 - K.smoothstep(1.0, 2.2, p)); };

  return {
    root,
    env: {
      skyTop: '#26365a', skyHorizon: '#eaa477', skyBottom: '#5a4250', skyCurve: 0.5,
      fog: '#c99786', fogNear: 90, fogFar: 230,
      sunDir: [-0.55, 0.32, 0.75], sunColor: '#ffb27a', sunIntensity: 2.1, sunDisc: 1, sunGlow: 1.2,
      hemiSky: '#9aa3c8', hemiGround: '#6a4c42', hemiIntensity: 0.6, envIntensity: 0.6, exposure: 0.92, contrast: 1.08,
      stars: 0.15, clouds: 0.3, cloudColor: '#f6c39a',
      bloomStrength: 0.45, bloomThreshold: 0.95, bloomRadius: 0.5,
      tiltShift: 0.35, shadowRadius: 24, vignette: 0.35, saturation: 1.05,
    },
    camera: {
      position: [14, 8.5, 40],
      target: [0, 3.2, 0],
      minDistance: 10, maxDistance: 75, maxPolar: 1.55, autoRotate: 0.25,
      views: [
        { position: [-26, 30, 22], target: [0, 6, 0] },
        { position: [-6, 0.6, 25], target: [-6, -1.8, 14] },
      ],
    },
    interaction: {
      label: 'One of each',
      activeLabel: 'Repeat everything',
      hint: 'The city your companions swear they saw: one dirigible, one tattooist, one fat woman.',
      set: (on) => tog.set(on),
    },
    update(t, dt) {
      tog.update(dt);
      const k = tog.value;
      const pulse = pulseAt(t);
      winMat.color.setScalar(K.smoothstep(0.5, 1.5, t) * (1 - 0.35 * k));
      // dirigibles: crossing the grid; in the sworn version they converge into one
      for (let i = 0; i < NB; i++) {
        const s = ships[i];
        const u = (((s.u0 + s.dir * s.v * t + 19) % 38) + 38) % 38 - 19;
        const fade = 1 - K.smoothstep(15.5, 18.5, Math.abs(u));
        const ry = s.axis === 0 ? (s.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : s.dir > 0 ? 0 : Math.PI;
        const bob = Math.sin(t * 0.7 + i) * 0.12;
        let x = s.axis === 0 ? u : s.c, z = s.axis === 0 ? s.c : u, y = s.y + bob;
        const keep = i === 0 ? 1 : 1 - K.smoothstep(0.55, 1, k);
        x = K.lerp(x, ONE[0], k); y = K.lerp(y, ONE[1] + bob, k); z = K.lerp(z, ONE[2], k);
        const sc = K.lerp(s.s * fade, 2.0, i === 0 ? k : 0) * keep;
        setShip(i, x, y, z, K.lerp(ry, 0.6, k), sc, Math.sin(t * 0.5 + i) * 0.05);
        for (let e = 0; e < 2; e++) {
          const back = (e + 1) * 0.55 * (1 - k);
          const ex = s.axis === 0 ? x - s.dir * back : x, ez = s.axis === 0 ? z : z - s.dir * back;
          setEcho(i + e * NB, ex, y, ez, ry, sc * (1 - k));
        }
      }
      setShip.done(); setEcho.done();
      // lunatics teeter, then lean out together on the pulse
      for (let i = 0; i < perches.length; i++) {
        const p = perches[i];
        const lean = 0.12 * Math.sin(t * 1.7 + lunPhase[i]) + 0.05 * Math.sin(t * 3.1 + lunPhase[i] * 2) + pulse * 0.45;
        const s = i === keepLun ? 1 : 1 - k;
        setLun(i, p.x, p.y, p.z, 0, s, lean * p.dz, -lean * p.dx);
      }
      setLun.done();
      // blind men tap in unison on the pulse; girls lead their pumas
      const tap = pulse * 0.15;
      for (let i = 0; i < blind.length; i++) {
        const [x, z, ry] = moverPos(blind[i], t);
        setBlind(i, x, 0.01 + Math.abs(Math.sin(t * 3 + i)) * 0.01, z, ry, i === 0 ? 1 : 1 - k, tap);
      }
      for (let i = 0; i < girls.length; i++) {
        const s = i === 0 ? 1 : 1 - k;
        const [x, z, ry] = moverPos(girls[i], t);
        const [px, pz] = moverPos(girls[i], t, 0.45);
        setGirl(i, x, 0.01, z, ry, s);
        setPuma(i, px, 0.01, pz, ry, s * (1 + Math.sin(t * 6 + i) * 0.02));
      }
      setBlind.done(); setGirl.done(); setPuma.done();
      walkers.update(t);
      // tattoo windows flicker together; in the sworn city only the one bench remains lit
      tatMat.color.set('#4f7cff').multiplyScalar((1.5 + pulse * 1.5 * (0.6 + 0.4 * Math.sin(t * 40))) * (1 - 0.85 * k));
      sailors.scale.y = Math.max(0.001, 1 - k);
      lone.visible = k > 0.01;
      lone.scale.setScalar(Math.max(0.001, k));
      lone.position.set(bx * (1 - k), 0, bz * (1 - k));
      // trains shuttle with a dwell at each end; riders vanish one of each
      for (const tr of trains) {
        const c = ((t + tr.phase) % 18) / 18;
        const m = c < 0.5 ? K.smoothstep(0.08, 0.42, c) : 1 - K.smoothstep(0.58, 0.92, c);
        tr.g.position.x = K.lerp(-9.5, 9.5, m);
        tr.riders.scale.y = Math.max(0.001, 1 - k);
        tr.riders.visible = k < 0.99;
      }
      fatG.scale.setScalar(Math.max(0.001, k));
      fan.visible = k > 0.05;
      fan.rotation.z = Math.sin(t * 9) * 0.5;
    },
  };
};

export default build;
