// EUPHEMIA - Trading Cities 1.
// Merchants of seven nations meet at every solstice and equinox. By day the wares
// change hands on yellow mats; by night, around seven fires, one man says a word
// and every fire answers with its own story of it. Luminous word-glyphs rise from
// the flames and drift in a carousel above the market, slowly redrawing themselves,
// and some leave with the caravan and the junk, already different.
// Toggle: the noon fair of goods (fires sink, glyphs fade, the sky turns white-gold).

import * as THREE from 'three';
import * as K from '../kit';
import type { CityBuilder } from '../core/types';

type P2 = [number, number];
// Glyphs of the six words, drawn on a unit square: points + edges.
const WORDS: { pts: P2[]; edges: [number, number][] }[] = [
  { // wolf, howling
    pts: [[-1, -0.1], [-0.55, 0.15], [0.05, 0.2], [0.3, 0.5], [0.62, 0.98], [0.5, 0.6], [0.38, 0.82], [0.22, -0.15], [0.3, -0.9], [-0.45, -0.9], [-0.35, -0.3], [0.05, -0.9]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 3], [3, 6], [2, 7], [7, 8], [7, 11], [1, 10], [10, 9], [10, 7]],
  },
  { // sister in a long dress
    pts: [[0, 0.9], [0, 0.62], [-0.28, 0.5], [0.28, 0.5], [0, 0.1], [-0.55, -0.9], [0.55, -0.9], [-0.38, 0.0], [0.38, 0.0], [0, -0.9]],
    edges: [[0, 1], [1, 2], [1, 3], [2, 7], [3, 8], [1, 4], [4, 5], [4, 6], [5, 9], [9, 6], [2, 4], [3, 4]],
  },
  { // a chest with a spark inside
    pts: [[-0.8, -0.7], [0.8, -0.7], [0.8, 0.1], [-0.8, 0.1], [-0.8, 0.35], [0, 0.6], [0.8, 0.35], [0, 0.15], [0, 0.95], [-0.25, 0.75], [0.25, 0.75]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5], [5, 6], [6, 2], [7, 8], [9, 10], [7, 0], [7, 1]],
  },
  { // battle: two crossed spears
    pts: [[-0.9, -0.9], [0.75, 0.75], [0.95, 0.95], [0.6, 0.95], [0.95, 0.6], [0.9, -0.9], [-0.75, 0.75], [-0.95, 0.95], [-0.6, 0.95], [-0.95, 0.6], [0, 0]],
    edges: [[0, 10], [10, 1], [1, 3], [3, 2], [2, 4], [4, 1], [5, 10], [10, 6], [6, 8], [8, 7], [7, 9], [9, 6]],
  },
  { // scabies: a scatter of specks
    pts: [[-0.7, 0.6], [-0.5, 0.75], [0.1, 0.5], [0.3, 0.7], [0.75, 0.2], [-0.2, 0], [0, -0.15], [-0.8, -0.3], [0.5, -0.4], [0.7, -0.55], [-0.3, -0.75], [0.05, -0.8]],
    edges: [[0, 1], [2, 3], [5, 6], [8, 9], [10, 11], [4, 3], [7, 5]],
  },
  { // lovers: two heads in profile, leaning together
    pts: [[-0.45, 0.6], [-0.15, 0.55], [-0.4, 0.2], [-0.7, -0.9], [-0.1, -0.9], [0.45, 0.6], [0.15, 0.55], [0.4, 0.2], [0.7, -0.9], [0.1, -0.9], [0, 0.85]],
    edges: [[0, 1], [1, 2], [2, 0], [2, 3], [2, 4], [5, 6], [6, 7], [7, 5], [7, 8], [7, 9], [1, 10], [6, 10], [4, 9]],
  },
];
const MAXP = 12, MAXE = 13;
const NATIONS = ['#e2a93b', '#a8442f', '#34407a', '#3f8f80', '#6b3f6b', '#efe3c6', '#c0653a'];
const GLOWCOL = ['#ffc24a', '#ff6a45', '#7d8cff', '#5fe0c6', '#d07ad8', '#fff2d0', '#ff8a4a'];

const build: CityBuilder = (ctx) => {
  const rng = ctx.rng;
  const root = new THREE.Group();
  const R = 21;
  const isl = K.island({ radius: R, flat: 19.2, depth: 9, hills: 0, top: '#b88a52', edge: '#a77a46', cliff: '#8e6640', under: '#4a3428', strata: '#b08050', seed: 7 });
  root.add(isl.mesh);
  root.add(K.cloudSea({ y: -8, color: '#c98f74', shadow: '#3c2e4a', opacity: 0.7, coverage: 0.5 }));
  const b = new K.Batch();

  // ---- ground texture: trampled earth patches
  for (let i = 0; i < 70; i++) {
    const [x, z] = rng.inDisc(18);
    b.add(K.at(K.disc(rng.float(0.6, 1.8), 12), x, 0.008, z, { s: [1, 1, rng.float(0.5, 1)], ry: rng.angle() }), K.jitter('#b0834e', rng, 0.01, 0.04, 0.04), 'matte');
  }

  // ---- the river on the west: an arc of a large circle centred far to the west
  const RC = -31, RR = 14.5, RW = 1.5;
  const river = new THREE.BufferGeometry();
  const rp: number[] = [], bank: THREE.BufferGeometry[] = [];
  const riverAt = (phi: number, off = 0): [number, number] => [RC + (RR + off) * Math.cos(phi), (RR + off) * Math.sin(phi)];
  const phis: number[] = [];
  for (let i = 0; i <= 80; i++) {
    const phi = -1.0 + (2 * i) / 80;
    const [x, z] = riverAt(phi, RW);
    const [x2, z2] = riverAt(phi, -RW);
    if (Math.hypot(x, z) > isl.rimAt(Math.atan2(z, x)) - 0.5 || Math.hypot(x2, z2) > isl.rimAt(Math.atan2(z2, x2)) - 0.5) continue;
    phis.push(phi);
  }
  for (let i = 0; i < phis.length - 1; i++) {
    const [a0x, a0z] = riverAt(phis[i], -RW), [b0x, b0z] = riverAt(phis[i], RW);
    const [a1x, a1z] = riverAt(phis[i + 1], -RW), [b1x, b1z] = riverAt(phis[i + 1], RW);
    rp.push(a0x, 0.05, a0z, a1x, 0.05, a1z, b0x, 0.05, b0z, b0x, 0.05, b0z, a1x, 0.05, a1z, b1x, 0.05, b1z);
    for (const s of [-1, 1]) {
      const [p0x, p0z] = riverAt(phis[i], s * (RW + 0.15)), [p1x, p1z] = riverAt(phis[i + 1], s * (RW + 0.15));
      bank.push(K.strut([p0x, 0.04, p0z], [p1x, 0.04, p1z], 0.22, 5));
    }
  }
  {
    // make sure the strip faces up
    const ux = rp[3] - rp[0], uz = rp[5] - rp[2], vx = rp[6] - rp[0], vz = rp[8] - rp[2];
    if (uz * vx - ux * vz < 0) for (let i = 0; i < rp.length; i += 9) for (let c = 0; c < 3; c++) { const tmp = rp[i + 3 + c]; rp[i + 3 + c] = rp[i + 6 + c]; rp[i + 6 + c] = tmp; }
  }
  river.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3));
  river.computeVertexNormals();
  const riverMesh = K.waterMesh(river, { color: '#2d3a5e', amp: 0.1, scale: 0.35, speed: 0.2 });
  root.add(riverMesh);
  b.add(K.merge(bank), '#7d6448', 'stone');
  // the riverbed shows as a dark strip under the water
  // timber wharf on the inner bank
  const wharfPhi = 0;
  const [wx] = riverAt(wharfPhi, RW);
  for (let i = 0; i < 12; i++) b.add(K.at(K.box(1.4, 0.08, 0.46), wx - 0.25, 0.22, -3 + i * 0.5), K.jitter('#6e4a2c', rng), 'wood');
  for (let i = 0; i < 7; i++) for (const dx of [-0.85, 0.35]) b.add(K.at(K.cyl(0.06, 0.06, 0.6, 6), wx + dx, -0.3, -3 + i * 1), '#4a3220', 'wood');
  for (let i = 0; i < 6; i++) b.add(K.at(K.box(0.4, 0.35, 0.4), wx + 0.1, 0.26, -2.6 + i * 0.95, { ry: rng.float(-0.3, 0.3) }), rng.pick(['#e9e2cf', '#d9b27a', '#8d9a4a']), 'cloth');

  // ---- the market: 7 x 6 yellow mats heaped with goods, 14 striped awnings
  const GOODS = ['#e8c992', '#f2efe6', '#8fae4a', '#7e8a9a', '#7a4d2c', '#3b2230', '#e7b84a', '#c0472c', '#d98c2b'];
  b.add(K.at(K.box(13, 0.03, 12.4), 0, 0, 0), '#a7804c', 'matte');
  const mats: [number, number][] = [];
  for (let r = 0; r < 7; r++) for (let c = 0; c < 6; c++) {
    const x = -5 + c * 2, z = -4.8 + r * 1.6;
    mats.push([x, z]);
    b.add(K.at(K.box(1.25, 0.04, 0.85), x, 0.03, z, { ry: rng.float(-0.05, 0.05) }), K.jitter('#e2b03c', rng, 0.01, 0.05, 0.05), 'cloth');
    const g = rng.pick(GOODS);
    for (let k = 0; k < 4; k++) {
      const hx = x + rng.float(-0.4, 0.4), hz = z + rng.float(-0.22, 0.22);
      const kind = rng.int(0, 2);
      const geo = kind === 0 ? K.dome(rng.float(0.14, 0.22), 10, 1, 0.8) : kind === 1 ? K.cyl(0.11, 0.14, 0.26, 8) : K.box(0.24, 0.16, 0.18);
      b.add(K.at(geo, hx, 0.07, hz, { ry: rng.angle() }), K.jitter(k === 0 ? g : rng.pick(GOODS), rng), kind === 1 ? 'cloth' : 'matte');
    }
  }
  rng.shuffle(mats);
  for (let i = 0; i < 14; i++) {
    const [x, z] = mats[i];
    const c1 = NATIONS[i % 7], c2 = '#efe6cf';
    for (const sx of [-0.78, 0.78]) for (const sz of [-0.55, 0.55]) b.add(K.at(K.cyl(0.025, 0.025, 0.9, 5), x + sx, 0, z + sz), '#4b3a2c', 'wood');
    for (let s = 0; s < 6; s++) b.add(K.at(K.box(1.7 / 6, 0.03, 1.25), x - 0.85 + (s + 0.5) * (1.7 / 6), 0.9 + s * 0.02, z, { rz: -0.07 }), s % 2 ? c2 : c1, 'cloth');
  }

  // ---- seven fires at radius 9, seven camps behind them
  const fireA = (k: number) => (k / 7) * Math.PI * 2 + Math.PI / 14;
  const fires: THREE.Vector3[] = [];
  const seats: [number, number, number][] = [];
  for (let k = 0; k < 7; k++) {
    const a = fireA(k), fx = Math.cos(a) * 9, fz = Math.sin(a) * 9;
    fires.push(new THREE.Vector3(fx, 0, fz));
    b.add(K.at(K.ring(0.32, 0.48, 14), fx, 0.02, fz), '#5d5048', 'stone');
    for (let s = 0; s < 9; s++) b.add(K.at(K.sphere(0.09, 6, 5), fx + Math.cos(s * 0.7) * 0.4, 0.04, fz + Math.sin(s * 0.7) * 0.4), '#6c625a', 'stone');
    for (let l = 0; l < 4; l++) b.add(K.at(K.cyl(0.04, 0.04, 0.5, 6), fx, 0.06, fz, { rz: Math.PI / 2, ry: l * 0.8 }), '#3a2618', 'wood');
    b.add(K.at(K.disc(0.28, 12), fx, 0.05, fz), '#ff7a2a', 'glow', 2.5);
    const n = 6 + (k % 3);
    for (let s = 0; s < n; s++) {
      const sa = (s / n) * Math.PI * 2 + k;
      const sx = fx + Math.cos(sa) * 1.0, sz = fz + Math.sin(sa) * 1.0;
      const seat = s % 3;
      if (seat === 0) b.add(K.at(K.cyl(0.13, 0.15, 0.24, 8), sx, 0, sz), '#7a5532', 'wood');
      else if (seat === 1) b.add(K.at(K.dome(0.17, 8, 1, 1.2), sx, 0, sz), '#c8b48a', 'cloth');
      else for (let c = 0; c < 3; c++) b.add(K.at(K.box(0.45, 0.07, 0.3), sx, c * 0.07, sz, { ry: sa + c * 0.3 }), rng.pick(['#8a2f2a', '#3b4a7a', '#b7792a', '#5a3b5e']), 'cloth');
      seats.push([sx, seat === 2 ? 0.21 : 0.22, sz]);
    }
    // the camp: three tents and a banner in the nation's colour
    for (let t = 0; t < 3; t++) {
      const ta = a + (t - 1) * 0.16, tr = 12 + (t % 2) * 1.3;
      const tx = Math.cos(ta) * tr, tz = Math.sin(ta) * tr, h = rng.float(0.8, 1.2);
      const kind = (k + t) % 3, cc = K.jitter(NATIONS[k], rng);
      if (kind === 0) b.add(K.at(K.cone(0.75, h * 1.2, 10), tx, 0, tz), cc, 'cloth');
      else if (kind === 1) b.add(K.at(K.dome(0.75, 14, 1, h / 0.75), tx, 0, tz), cc, 'cloth');
      else {
        b.add(K.at(K.box(1.2, 0.3, 0.9), tx, 0, tz, { ry: -ta }), cc, 'cloth');
        b.add(K.at(K.gableRoof(1.2, 0.9, h - 0.3, 0.02), tx, 0.3, tz, { ry: -ta }), cc, 'cloth');
      }
      b.add(K.at(K.wallPlane(0.3, 0.45), tx + Math.cos(ta) * -0.76, 0.01, tz + Math.sin(ta) * -0.76, { ry: -ta - Math.PI / 2 }), '#2a1e18', 'matte');
    }
    K.flag(b, { x: Math.cos(a) * 11, z: Math.sin(a) * 11, ry: rng.angle(), h: 2.2, w: 0.7, color: NATIONS[k], poleColor: '#3a2a20' });
  }

  // ---- dunes on the east
  for (let i = 0; i < 9; i++) {
    const a = -1.0 + (i / 8) * 2.0 + rng.float(-0.06, 0.06);
    if (Math.abs(a) < 0.16) continue;
    const r = rng.float(15.5, 18), dx = Math.cos(a) * r, dz = Math.sin(a) * r;
    const g = K.wobble(K.dome(rng.float(2.0, 2.6), 32, 1, 1), 0.12, 0.9, i);
    K.at(g, 0, 0, 0, { s: [1.5, rng.float(0.35, 0.55), 0.75], ry: a + 0.5 });
    b.add(K.paintBy(K.at(g, dx, -0.05, dz), (x, y, z, out) => {
      out.set('#ddb57a').lerp(new THREE.Color('#c79858'), 0.35 + 0.35 * Math.sin((x - z) * 5 + y * 2));
    }), null, 'matte');
  }
  for (let i = 0; i < 18; i++) b.add(K.at(K.box(0.18, 0.02, 0.7), 7 + i * 0.7, 0.012, rng.float(-0.4, 0.4), { ry: rng.float(-0.2, 0.2) }), '#9a7044', 'matte'); // track

  // ---- palms along the river and scrub on the open ground
  for (let i = 0; i < 16; i++) {
    const phi = K.lerp(phis[0], phis[phis.length - 1], (i + 0.5) / 16);
    const [px, pz] = riverAt(phi, RW + rng.float(0.8, 2.2));
    if (Math.abs(pz) < 3.6) continue;
    K.tree(b, { x: px, z: pz, kind: 'palm', h: rng.float(1.6, 2.6), rng });
  }
  K.forest(b, { n: 40, r0: 10, r1: 19, rng, kinds: ['shrub'], h: [0.25, 0.5], color: '#7d7a3e', avoid: (x, z) => x > 12 || x < -11 || Math.abs(z) < 1.5 && x > 0 });

  // ---- the sky ring of solstices and equinoxes
  const ring = new THREE.Group();
  ring.position.set(0, 17, 0);
  ring.rotation.set(23.5 * Math.PI / 180, 0, 0.2);
  const rb = new K.Batch();
  rb.add(K.torus(17, 0.06, 6, 160), '#d9b25a', 'gold');
  for (let i = 0; i < 4; i++) rb.add(K.at(K.sphere(0.35, 12, 8), Math.cos(i * Math.PI / 2) * 17, 0, Math.sin(i * Math.PI / 2) * 17), i === 0 ? '#ffd890' : '#a88a4a', i === 0 ? 'glow' : 'gold', i === 0 ? 4 : 1);
  ring.add(rb.build({ castShadow: false }));
  const sunBead = K.glowSprite('#ffe2a0', 1.6, 0.9);
  ring.add(sunBead);
  const lampHalo = K.glowSprite('#ffd890', 3, 0.7);
  lampHalo.position.set(17, 0, 0);
  ring.add(lampHalo);
  root.add(ring);
  root.add(b.build({ name: 'euphemia' }));

  // ---- junks: one moored at the wharf, one arriving and departing
  const jb = new K.Batch();
  jb.add(K.prism([[0, 1.7], [0.45, 1.1], [0.55, -1.2], [0.4, -1.55], [-0.4, -1.55], [-0.55, -1.2], [-0.45, 1.1]], 0.45), '#5a3a26', 'wood');
  jb.add(K.at(K.box(1.0, 0.45, 0.7), 0, 0.45, -1.15), '#6e4a30', 'wood');
  jb.add(K.at(K.box(0.6, 0.3, 0.8), 0, 0.45, 0.2), '#d9c08a', 'cloth');
  for (const [mz, h] of [[0.6, 2.4], [-0.6, 2.0]] as const) {
    jb.add(K.at(K.cyl(0.04, 0.05, h + 0.6, 6), 0, 0.4, mz), '#3b2a1e', 'wood');
    jb.add(K.at(K.box(0.02, h, 1.3), 0, 0.75, mz - 0.55), '#a4472e', 'cloth');
    for (let s = 0; s <= 5; s++) jb.add(K.at(K.box(0.05, 0.03, 1.36), 0.02, 0.75 + (s * h) / 5, mz - 0.55), '#2a1c14', 'wood');
  }
  const junkA = jb.build();
  const junkB = junkA.clone();
  const [jx, jz] = riverAt(0, 0.1);
  junkA.position.set(jx, -0.08, jz + 0.5);
  root.add(junkA, junkB);

  // ---- camels with saddlebags and their drivers
  const camelGeo = K.merge([
    K.quadruped({ len: 0.95, h: 0.8, hump: true, longNeck: true, tail: 0.12, color: '#c39a62' }),
    K.paint(K.at(K.box(0.52, 0.22, 0.26), 0, 0.38, 0.02), '#e2b03c'),
    K.paint(K.at(K.box(0.44, 0.14, 0.5), 0, 0.62, -0.05), '#8a2f2a'),
  ]);
  const camels = K.instanced(camelGeo, K.figureMaterial(), 8, undefined, { colors: false });
  const drivers = K.instanced(K.personGeometry(0.26), K.figureMaterial(), 3, (_i, _o, c) => { c.set(rng.pick(['#e9dfc7', '#34407a', '#7a3b2e'])); });
  root.add(camels, drivers);
  const setC = K.instanceSetter(camels), setD = K.instanceSetter(drivers);

  // ---- merchants: seated around the fires, haggling by day
  const sitters = K.crowd({ count: seats.length, rng: rng.fork('sit'), place: (i) => seats[i], colors: NATIONS, h: 0.2 });
  root.add(sitters);
  const aisles: THREE.Vector3[][] = [];
  for (let c = 0; c < 5; c++) aisles.push([new THREE.Vector3(-4 + c * 2, 0.03, -5.5), new THREE.Vector3(-4 + c * 2, 0.03, 5.5)]);
  for (let r = 0; r < 3; r++) aisles.push([new THREE.Vector3(-6, 0.03, -4 + r * 3.2), new THREE.Vector3(6, 0.03, -4 + r * 3.2)]);
  const hagglers = new K.Walkers({ paths: aisles, count: 70, rng: rng.fork('walk'), speed: [0.15, 0.35], colors: NATIONS, h: 0.24 });
  root.add(hagglers.mesh);

  // ---- fire flames (own material, flickering), embers and smoke
  const flameMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff8e3a').multiplyScalar(3.2), transparent: true, opacity: 0.92, depthWrite: false });
  const flames = K.instanced(K.cone(0.22, 0.72, 7), flameMat, 21, undefined, { castShadow: false, receiveShadow: false, colors: false });
  root.add(flames);
  const setF = K.instanceSetter(flames);
  const fireHalos = K.glowPoints(fires.map((f) => [f.x, 0.5, f.z] as [number, number, number]), '#ff9a4a', 3.2, 0.8);
  root.add(fireHalos);
  root.add(K.smoke({ sources: fires.map((f) => [f.x, 0.5, f.z] as [number, number, number]), perSource: 14, height: 6, color: '#ffb060', opacity: 0.9, size: [0.06, 0.03], life: 4, wind: [0.5, 0.4], additive: true, rng: rng.fork('emb') }));
  root.add(K.smoke({ sources: fires.map((f) => [f.x, 0.6, f.z] as [number, number, number]), perSource: 16, height: 5, color: '#6d5a5a', opacity: 0.22, size: [0.4, 1.6], life: 8, wind: [0.6, 0.5], rng: rng.fork('smk') }));
  const fireLight = new THREE.PointLight('#ff9a50', 60, 28, 1.4);
  fireLight.position.set(0, 3, 0);
  root.add(fireLight);
  const flies = K.particles({ count: 220, radius: 6, y0: 0.2, y1: 1.4, color: '#1d1712', size: 0.035, opacity: 0, swirl: 0.5, rng: rng.fork('fly') });
  root.add(flies);

  // ---- day state: a warm sun, a pale sky veil, cargo hopping between junk and wharf
  const daySun = new THREE.DirectionalLight('#fff1d0', 0);
  daySun.position.set(4, 30, 6);
  const dayHemi = new THREE.HemisphereLight('#fff4dc', '#b88a52', 0);
  const veilMat = new THREE.MeshBasicMaterial({ color: '#f4e2b8', side: THREE.BackSide, transparent: true, opacity: 0, fog: false, depthWrite: false });
  const veil = new THREE.Mesh(new THREE.SphereGeometry(170, 24, 12), veilMat);
  veil.renderOrder = -10;
  root.add(daySun, daySun.target, dayHemi, veil);
  const cargo = K.instanced(K.box(0.3, 0.25, 0.3), K.figureMaterial(), 6, (i, _o, c) => { c.set(['#e8c992', '#f2efe6', '#8fae4a', '#7e8a9a', '#e8c992', '#f2efe6'][i]); }, { castShadow: false });
  root.add(cargo);
  const setG = K.instanceSetter(cargo);

  // ---- word-glyphs: one LineSegments + one Points, rebuilt each frame
  const NG = 16;
  const variants = WORDS.map((w, wi) => NATIONS.map((_, ni) => {
    const vr = new K.RNG(wi * 31 + ni * 7 + 3);
    return w.pts.map(([x, y]) => [x + vr.float(-0.22, 0.22), y + vr.float(-0.22, 0.22)] as P2);
  }));
  const lpos = new Float32Array(NG * MAXE * 6), lcol = new Float32Array(NG * MAXE * 6);
  const ppos = new Float32Array(NG * MAXP * 3), pcol = new Float32Array(NG * MAXP * 3);
  const lgeo = new THREE.BufferGeometry();
  lgeo.setAttribute('position', new THREE.BufferAttribute(lpos, 3));
  lgeo.setAttribute('color', new THREE.BufferAttribute(lcol, 3));
  const glyphLines = new THREE.LineSegments(lgeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  const pgeo = new THREE.BufferGeometry();
  pgeo.setAttribute('position', new THREE.BufferAttribute(ppos, 3));
  pgeo.setAttribute('color', new THREE.BufferAttribute(pcol, 3));
  const glyphPts = new THREE.Points(pgeo, new THREE.PointsMaterial({ size: 0.42, map: K.glowTexture(), vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  glyphLines.frustumCulled = glyphPts.frustumCulled = false;
  root.add(glyphLines, glyphPts);
  const camPos = new THREE.Vector3(), tmpC = new THREE.Color(), tmpP: P2[] = [];
  const drawGlyph = (slot: number, word: number, nation: number, cx: number, cy: number, cz: number, size: number, bright: number, morph: number) => {
    const w = WORDS[word], vs = variants[word];
    const m = Math.floor(morph), f = K.easeInOut(K.fract(morph));
    const A = vs[(nation + m) % 7], B = vs[(nation + m + 1) % 7];
    let rx = camPos.z - cz, rz = -(camPos.x - cx);
    const rl = Math.hypot(rx, rz) || 1;
    rx /= rl; rz /= rl;
    tmpC.set(GLOWCOL[nation]).multiplyScalar(bright * 2.2);
    for (let i = 0; i < MAXP; i++) {
      const o = (slot * MAXP + i) * 3;
      if (i < w.pts.length && bright > 0) {
        const px = K.lerp(A[i][0], B[i][0], f), py = K.lerp(A[i][1], B[i][1], f);
        tmpP[i] = [px, py];
        ppos[o] = cx + rx * px * size; ppos[o + 1] = cy + py * size; ppos[o + 2] = cz + rz * px * size;
        pcol[o] = tmpC.r; pcol[o + 1] = tmpC.g; pcol[o + 2] = tmpC.b;
      } else pcol[o] = pcol[o + 1] = pcol[o + 2] = 0;
    }
    for (let e = 0; e < MAXE; e++) {
      const o = (slot * MAXE + e) * 6;
      if (e < w.edges.length && bright > 0) {
        for (let s = 0; s < 2; s++) {
          const pi = (slot * MAXP + w.edges[e][s]) * 3;
          lpos[o + s * 3] = ppos[pi]; lpos[o + s * 3 + 1] = ppos[pi + 1]; lpos[o + s * 3 + 2] = ppos[pi + 2];
          lcol[o + s * 3] = tmpC.r * 0.8; lcol[o + s * 3 + 1] = tmpC.g * 0.8; lcol[o + s * 3 + 2] = tmpC.b * 0.8;
        }
      } else lcol.fill(0, o, o + 6);
    }
  };

  const day = new K.Toggle(0.4);
  const ORBIT = (Math.PI * 2) / 60;
  const orbitPos = (k: number, t: number, gen: number) => {
    const a = fireA(k) + t * ORBIT + gen * 0.45;
    return [Math.cos(a) * 6.8, 4.6 + 1.3 * Math.sin(k * 2.1 + gen * 1.7), Math.sin(a) * 6.8];
  };
  const camelX = (tt: number) => (tt < 25 ? K.lerp(21, 7.5, K.easeOut(tt / 25)) : tt < 55 ? 7.5 : tt < 85 ? K.lerp(7.5, 28, (tt - 55) / 30) : 30);
  let lastLead = new THREE.Vector3();

  return {
    root,
    env: {
      skyTop: '#1b1f45', skyHorizon: '#e09a5b', skyBottom: '#3a2a3e', skyCurve: 0.4,
      fog: '#7a5560', fogNear: 70, fogFar: 230,
      sunDir: [-0.9, 0.12, -0.35], sunColor: '#ffb070', sunIntensity: 1.3, sunDisc: 0, sunGlow: 1.0,
      hemiSky: '#6d74b0', hemiGround: '#6b4a38', hemiIntensity: 0.75, envIntensity: 0.6,
      stars: 0.7, clouds: 0.15, cloudColor: '#e0a07a',
      bloomStrength: 0.85, bloomThreshold: 0.75, bloomRadius: 0.5,
      tiltShift: 0.4, shadowRadius: 23, vignette: 0.4, saturation: 1.08,
    },
    camera: {
      position: [13, 21, 31],
      target: [0, 1.5, 0],
      minDistance: 10, maxDistance: 80, autoRotate: 0.08,
      views: [
        { position: [-30, 14, 10], target: [-8, 1, 0] },
        { position: [6, 3.2, 12], target: [-1, 3.8, 4] },
      ],
    },
    interaction: {
      label: 'Wares by daylight',
      activeLabel: 'Night of stories',
      hint: 'By noon only goods change hands, and they leave exactly as they came.',
      set: (on) => day.set(on),
    },
    update(t, dt) {
      day.update(dt);
      const d = day.value, night = 1 - d;
      ctx.camera.getWorldPosition(camPos);
      // fires
      const spk = Math.floor(t / 10) % 7;
      for (let k = 0; k < 7; k++) {
        const f = fires[k];
        const since = t - Math.floor(t / 10) * 10 - 0.5 - ((k - spk + 7) % 7) * 0.6;
        const flare = since > 0 ? Math.exp(-since * 1.2) : 0;
        for (let j = 0; j < 3; j++) {
          const fl = (0.75 + 0.3 * Math.sin(t * (9 + j * 3) + k * 2 + j) + 0.6 * flare) * (0.15 + 0.85 * night);
          setF(k * 3 + j, f.x + Math.cos(j * 2.1) * 0.1, 0.05, f.z + Math.sin(j * 2.1) * 0.1, t * 0.5 + j, [1 - j * 0.15, fl * (1.3 - j * 0.25), 1 - j * 0.15]);
        }
      }
      setF.done();
      (fireHalos.material as THREE.PointsMaterial).opacity = 0.8 * night + 0.05 * Math.sin(t * 13);
      fireLight.intensity = (55 + 10 * Math.sin(t * 11) + 6 * Math.sin(t * 17)) * night;
      // glyphs: every 10 s a word; the speaker's fire first, then the others 0.6 s apart
      const n = Math.floor(t / 10);
      for (let gen = 0; gen < 2; gen++) {
        const cyc = n - gen;
        for (let j = 0; j < 7; j++) {
          const slot = gen * 7 + j;
          const k = (((cyc % 7) + 7) % 7 + j) % 7;
          const age = t - (cyc * 10 + 0.5 + j * 0.6);
          const word = (((cyc % 6) + 6) % 6);
          if (age < 0) { drawGlyph(slot, word, k, 0, -50, 0, 0, 0, 0); continue; }
          const u = K.smoothstep(0, 3.5, age);
          const o = orbitPos(k, t, ((cyc % 2) + 2) % 2);
          const f = fires[k];
          const x = K.lerp(f.x, o[0], u), z = K.lerp(f.z, o[2], u), y = K.lerp(0.9, o[1], u) + Math.sin(u * Math.PI) * 1.2;
          const bright = K.smoothstep(0, 0.6, age) * (1 - K.smoothstep(15, 20, age)) * night;
          drawGlyph(slot, word, k, x, y, z, K.lerp(0.4, 1.6, u), bright, age * 0.12 + k);
        }
      }
      // caravan on a 90 s loop
      const tt = (t + 30) % 90;
      const kneel = tt > 27 && tt < 53 ? K.smoothstep(27, 29, tt) * (1 - K.smoothstep(51, 53, tt)) : 0;
      const lx = camelX(tt);
      for (let i = 0; i < 8; i++) {
        const x = lx + i * 1.05 + (kneel > 0 ? (i % 2) * 0.2 : 0), z = (i % 2 ? 0.35 : -0.35) * kneel + Math.sin(i * 1.7) * 0.08;
        const gait = kneel > 0.5 || tt < 25 && tt > 24 ? 0 : Math.sin(t * Math.PI * 2 / 1.2 + i);
        const vis = x < 19.8 ? 1 : 0;
        setC(i, x, -0.22 * kneel + Math.abs(gait) * 0.03, z, tt < 25 ? -Math.PI / 2 : Math.PI / 2, [vis, vis * (1 - 0.35 * kneel), vis], 0, gait * 0.04);
      }
      setC.done();
      for (let i = 0; i < 3; i++) {
        const x = lx + i * 3.2 - 0.6, vis = x < 19.8 ? 1 : 0;
        setD(i, x, 0, 0.55, tt < 25 ? -Math.PI / 2 : Math.PI / 2, vis);
      }
      setD.done();
      lastLead.set(lx + 3, 2.6, 0);
      // the second junk slips along the river on its own 90 s loop
      const jt = ((t + 50) % 90) / 90;
      const phi = K.lerp(phis[0] + 0.05, phis[phis.length - 1] - 0.05, jt);
      const [bx, bz] = riverAt(phi, -0.6);
      junkB.position.set(bx, -0.08 + Math.sin(t * 1.3) * 0.03, bz);
      junkB.rotation.y = Math.atan2(Math.cos(phi), -Math.sin(phi)) + Math.PI;
      junkB.scale.setScalar(K.smoothstep(0, 0.06, jt) * (1 - K.smoothstep(0.94, 1, jt)) + 1e-3);
      junkA.rotation.z = Math.sin(t * 1.1) * 0.025;
      junkA.position.y = -0.08 + Math.sin(t * 0.9) * 0.02;
      // the travellers' glyphs: they keep changing as they go
      const leaving = tt > 55 && tt < 85 ? K.smoothstep(55, 58, tt) * (1 - K.smoothstep(78, 85, tt)) : 0;
      drawGlyph(14, (n + 3) % 6, 2, lastLead.x, lastLead.y, lastLead.z, 0.8, leaving * night, t * 0.35);
      drawGlyph(15, (n + 1) % 6, 5, bx, 3.4, bz, 0.8, K.smoothstep(0.45, 0.55, jt) * (1 - K.smoothstep(0.85, 0.95, jt)) * night, t * 0.35);
      lgeo.attributes.position.needsUpdate = lgeo.attributes.color.needsUpdate = true;
      pgeo.attributes.position.needsUpdate = pgeo.attributes.color.needsUpdate = true;
      // the sun-bead creeps along the ring
      const sa = 0.4 + t * 0.01;
      sunBead.position.set(Math.cos(sa) * 17, 0, Math.sin(sa) * 17);
      (lampHalo.material as THREE.SpriteMaterial).opacity = 0.55 + 0.2 * Math.sin(t * 1.5);
      // daylight
      daySun.intensity = 1.7 * d;
      dayHemi.intensity = 1.1 * d;
      veilMat.opacity = 0.88 * d;
      veil.visible = d > 0.001;
      ((flies.material as THREE.ShaderMaterial).uniforms.uOpacity.value as number) = 0.8 * d;
      hagglers.mesh.visible = d > 0.05;
      if (hagglers.mesh.visible) hagglers.update(t);
      sitters.visible = d < 0.95;
      for (let i = 0; i < 6; i++) {
        const p = K.fract(t * 0.35 + i / 6), dir = i % 2 ? 1 : -1;
        const sx = jx + 0.1, ex = wx - 0.2;
        const x = dir > 0 ? K.lerp(sx, ex, p) : K.lerp(ex, sx, p);
        setG(i, x, 0.4 + Math.sin(p * Math.PI) * 0.9, jz + 0.5 + (i - 2.5) * 0.35, p * 3, d > 0.05 ? 1 : 0);
      }
      setG.done();
    },
  };
};

export default build;
