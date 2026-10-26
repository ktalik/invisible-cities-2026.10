// MORIANA - Cities & Eyes 5.
// On one face: alabaster gates translucent in the sun, coral columns holding up
// pediments inlaid with serpentine, villas all of glass like aquariums where the
// shadows of silver-scaled dancers swim under medusa-shaped chandeliers. On the
// other face, which is the same city: rusted sheet metal, sackcloth, planks
// bristling with nails, pipes black with soot, heaps of tins, blind walls with
// faded signs. The city has no thickness; it is a single sheet with two faces.
// Toggle: turn the sheet over.

import * as THREE from 'three';
import * as K from '../kit';
import type { CityBuilder } from '../core/types';

const RAD = 14;
const TH = 0.16; // half thickness of the sheet

const build: CityBuilder = (ctx) => {
  const rng = ctx.rng;
  const root = new THREE.Group();
  const sheet = new THREE.Group();
  root.add(sheet);
  const top = new THREE.Group(), under = new THREE.Group();
  top.position.y = TH;
  under.position.y = -TH;
  under.rotation.x = Math.PI;
  sheet.add(top, under);

  // ---- the sheet itself: thin, cream-edged, a gilt line along the rim
  const pb = new K.Batch();
  pb.add(K.at(K.cyl(RAD, RAD, TH * 2, 128), 0, -TH, 0), '#efe6d2', 'matte');
  for (const y of [TH, -TH]) pb.add(K.at(K.torus(RAD, 0.03, 4, 128), 0, y, 0), '#c9a24c', 'gold');
  sheet.add(pb.build({ name: 'sheet' }));

  // ================================================================ the splendid face
  const a = new K.Batch();
  a.add(K.at(K.disc(RAD - 0.05, 96), 0, 0.006, 0), '#d8cab4', 'stone');
  for (const r of [3.2, 6.2, 9.8]) a.add(K.at(K.ring(r - 0.1, r + 0.1, 96), 0, 0.012, 0), '#3f7a5a', 'polished');
  for (let i = 0; i < 16; i++) {
    const ang = (i / 16) * Math.PI * 2;
    a.add(K.at(K.box(0.12, 0.012, 6.5), Math.cos(ang) * 6.5, 0.008, Math.sin(ang) * 6.5, { ry: -ang + Math.PI / 2 }), '#e9b7a0', 'stone');
  }
  // the great alabaster gate at the centre and four more at the city wall
  const ALAB = '#fbf3e8';
  const gate = (x: number, z: number, ry: number, s: number) => {
    a.add(K.at(K.archWall(3.0 * s, 3.4 * s, 0.5 * s, 1.5 * s, 2.6 * s, 20), x, 0, z, { ry }), ALAB, 'plaster');
    a.add(K.at(K.box(3.3 * s, 0.25 * s, 0.6 * s), x, 3.4 * s, z, { ry }), '#f6ead8', 'stone');
    a.add(K.at(K.archBand(1.5 * s, 0.1 * s, 0.56 * s, 20), x, 2.6 * s - 0.75 * s, z, { ry }), '#3f7a5a', 'polished');
  };
  gate(0, 0, 0, 1);
  K.cityWall(a, { r: 12.6, h: 0.9, thick: 0.3, color: '#f6efe4', finish: 'plaster', crenels: false, gates: [0, Math.PI / 2, Math.PI, Math.PI * 1.5], gateWidth: 2.4 });
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2;
    gate(Math.cos(ang) * 12.6, Math.sin(ang) * 12.6, -ang + Math.PI / 2, 0.62);
  }
  // coral columns in a ring, carrying pediments inlaid with serpentine
  const NC = 16;
  for (let i = 0; i < NC; i++) {
    const ang = (i / NC) * Math.PI * 2 + Math.PI / NC;
    K.column(a, { x: Math.cos(ang) * 4.6, z: Math.sin(ang) * 4.6, h: 2.6, r: 0.16, color: '#ec7a62', finish: 'ceramic', sides: 10 });
    if (i % 2 === 0) {
      const mid = ang + Math.PI / NC;
      const cx = Math.cos(mid) * 4.55, cz = Math.sin(mid) * 4.55;
      const ry = -mid + Math.PI / 2;
      const span = 2 * 4.6 * Math.sin(Math.PI / NC) + 0.5;
      a.add(K.at(K.box(span, 0.22, 0.5), cx, 2.6, cz, { ry }), '#f6ead8', 'stone');
      const ped = K.prism([[-span / 2, -0.25], [span / 2, -0.25], [0, 0.25]], 0.48);
      K.at(ped, 0, 0, 0.24, { rx: -Math.PI / 2 });
      a.add(K.at(ped, cx, 2.82 + 0.25, cz, { ry }), '#3f7a5a', 'polished');
    }
  }
  // glass villas, each an aquarium with a medusa chandelier
  const villas: { x: number; z: number; ry: number }[] = [];
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2 + 0.4;
    villas.push({ x: Math.cos(ang) * 8.2, z: Math.sin(ang) * 8.2, ry: -ang + Math.PI / 2 });
  }
  const medusae: THREE.Vector3[] = [];
  for (const v of villas) {
    const P = (g: THREE.BufferGeometry, y = 0) => K.at(g, v.x, y, v.z, { ry: v.ry });
    a.add(P(K.box(2.4, 0.16, 2.0)), '#f6efe4', 'stone');
    a.add(P(K.box(2.2, 1.7, 1.8), 0.16), '#a9e2e6', 'glass');
    a.add(P(K.box(2.4, 0.14, 2.0), 1.86), '#f6efe4', 'stone');
    for (const [sx, sz] of [[-1.05, -0.85], [1.05, -0.85], [-1.05, 0.85], [1.05, 0.85]]) a.add(K.at(K.cyl(0.05, 0.05, 1.7, 6), v.x + sx * Math.cos(v.ry) + sz * Math.sin(v.ry), 0.16, v.z - sx * Math.sin(v.ry) + sz * Math.cos(v.ry)), '#ec7a62', 'ceramic');
    a.add(P(K.dome(0.7, 16, 1, 0.6), 2.0), '#cfe9ee', 'glass');
    // the medusa: a glowing bell with trailing tentacles
    a.add(K.at(K.dome(0.32, 14, 1, 0.75), v.x, 1.5, v.z), '#bff4ff', 'glow', 1.3);
    for (let k = 0; k < 8; k++) {
      const ta = (k / 8) * Math.PI * 2;
      a.add(K.strut([v.x + Math.cos(ta) * 0.25, 1.5, v.z + Math.sin(ta) * 0.25], [v.x + Math.cos(ta + 0.5) * 0.18, 0.95, v.z + Math.sin(ta + 0.5) * 0.18], 0.012, 3), '#9fe8ff', 'glow', 1.1);
    }
    medusae.push(new THREE.Vector3(v.x, 1.55, v.z));
  }
  for (let i = 0; i < 28; i++) {
    const ang = (i / 28) * Math.PI * 2 + 0.11;
    if ([0, 1, 2, 3, 4].some((g) => Math.abs(Math.sin((ang - (g * Math.PI) / 2) / 2)) < 0.09)) continue;
    const x = Math.cos(ang) * 11.1, z = Math.sin(ang) * 11.1, ry = -ang - Math.PI / 2;
    const h = rng.float(1.2, 1.9);
    K.house(a, { x, z, ry, w: 1.5, d: 1.1, h, roof: 'flat', wall: rng.pick(['#f7efe2', '#f2e4d4', '#fbf5ec']), roofColor: '#efe2cf', lit: 0, rng, cornice: true });
    a.add(K.at(K.dome(0.42, 16, 1, 0.9), x, h + 0.08, z), '#3f7a5a', 'polished');
    for (const sx of [-0.55, 0.55]) a.add(K.at(K.cyl(0.06, 0.06, h, 8), x + Math.cos(ry) * sx - Math.sin(ry) * 0.6, 0, z - Math.sin(ry) * sx - Math.cos(ry) * 0.6), '#ec7a62', 'ceramic');
  }
  K.forest(a, { n: 26, r0: 9.4, r1: 10.3, rng: rng.fork('palms'), kinds: ['palm', 'palm', 'cypress'], h: [1.4, 2.4], avoid: (x, z) => { const ang = Math.atan2(z, x); return [0, 1, 2, 3].some((g) => Math.abs(Math.sin((ang - (g * Math.PI) / 2) / 2)) < 0.12); } });
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
    K.fountain(a, { x: Math.cos(ang) * 2.0, z: Math.sin(ang) * 2.0, r: 0.5, color: '#f6efe4' });
  }
  top.add(a.build({ name: 'moriana-splendid' }));
  top.add(K.glowPoints(medusae, '#9fe8ff', 1.1, 0.35));

  // the silver dancers swimming inside the glass villas
  const ND = villas.length * 3;
  const dancers = K.instanced(K.personGeometry(0.3), K.std('#dfe8ee', { metalness: 0.85, roughness: 0.25, vertexColors: true }), ND);
  top.add(dancers);
  const dset = K.instanceSetter(dancers);
  const strollers = new K.Walkers({
    paths: [3.2, 6.2, 9.8].map((r) => Array.from({ length: 49 }, (_, i) => new THREE.Vector3(Math.cos((i / 48) * Math.PI * 2) * r, 0.02, Math.sin((i / 48) * Math.PI * 2) * r))),
    count: 70, closed: true, rng: rng.fork('stroll'), speed: [0.15, 0.3], colors: ['#f4ead8', '#ec7a62', '#3f7a5a', '#a9d8e0', '#e8c46a'],
  });
  top.add(strollers.mesh);

  // ================================================================ the other face
  const u = new K.Batch();
  u.add(K.paintBy(K.at(K.disc(RAD - 0.05, 96), 0, 0.006, 0), (x, _y, z, o) => o.set('#5e4c3a').multiplyScalar(0.8 + 0.4 * (K.fbm2(x * 0.3, z * 0.3) * 0.5 + 0.5))), null, 'matte');
  const RUST = ['#8a4a2a', '#9b5a32', '#6e3d24', '#7d6a58', '#a0643a', '#5f5348'];
  const shackSpots: [number, number][] = [];
  for (let i = 0; i < 210; i++) {
    const [x, z] = rng.inDisc(12.8);
    if (Math.hypot(x, z) < 1.6) continue;
    shackSpots.push([x, z]);
  }
  const chimneys: THREE.Vector3[] = [];
  for (const [x, z] of shackSpots) {
    const w = rng.float(0.6, 1.2), d = rng.float(0.5, 1.0), h = rng.float(0.45, 1.1);
    const ry = rng.angle();
    const P = (g: THREE.BufferGeometry) => K.at(g, x, 0, z, { ry });
    const kind = rng.next();
    if (kind < 0.55) {
      // shack of rusted sheet metal, a corrugated shed roof
      u.add(P(K.box(w, h, d)), rng.pick(RUST), 'metal');
      for (let k = 0; k < 4; k++) u.add(P(K.at(K.box(0.015, h * 0.95, d + 0.01), -w / 2 + (k + 0.5) * (w / 4), 0, 0)), '#4a2c1c', 'metal');
      u.add(P(K.at(K.shedRoof(w + 0.12, d + 0.12, 0.05, 0.22), 0, h, 0)), rng.pick(RUST), 'metal');
      if (rng.chance(0.4)) u.add(P(K.at(K.box(0.28, 0.4, 0.02), rng.float(-0.2, 0.2), 0.05, d / 2 + 0.01)), '#3a2c22', 'wood');
    } else if (kind < 0.78) {
      // sackcloth tent
      u.add(P(K.gableRoof(w, d * 1.2, h * 0.9, 0.04)), rng.pick(['#a08a62', '#8d7a56', '#b09a70']), 'cloth');
      u.add(P(K.at(K.cyl(0.02, 0.02, h * 0.95, 4), 0, 0, 0)), '#4a3a2a', 'wood');
    } else {
      // planks nailed together into a lean-to
      for (let k = 0; k < 5; k++) u.add(P(K.at(K.box(0.14, h * 1.1, 0.04), -w / 2 + k * (w / 5), 0, 0, { rx: -0.3, rz: rng.float(-0.08, 0.08) })), K.jitter('#6d5a44', rng, 0.02, 0.05, 0.1), 'wood');
      for (let k = 0; k < 6; k++) u.add(P(K.at(K.cyl(0.008, 0.008, 0.06, 3), -w / 2 + rng.float(0, w), rng.float(0.1, h), -0.08, { rx: Math.PI / 2 })), '#2a2a2a', 'metal');
    }
    if (rng.chance(0.22)) {
      const hx = x + rng.float(-0.2, 0.2), hz = z + rng.float(-0.2, 0.2), ph = h + rng.float(0.6, 1.3);
      u.add(K.at(K.cyl(0.06, 0.07, ph, 8), hx, 0, hz), '#1c1a19', 'metal');
      chimneys.push(new THREE.Vector3(hx, ph, hz));
    }
  }
  // heaps of tins
  for (let i = 0; i < 26; i++) {
    const [x, z] = rng.inDisc(12);
    for (let k = 0; k < 14; k++) {
      const [dx, dz] = rng.inDisc(0.35);
      u.add(K.at(K.cyl(0.05, 0.05, 0.1, 7), x + dx, rng.float(0, 0.2), z + dz, { rx: rng.float(-1.5, 1.5), rz: rng.float(-1.5, 1.5) }), rng.pick(['#9aa0a4', '#b2763c', '#7a7f82', '#c9b27a']), 'metal');
    }
  }
  // black pipes snaking between the shacks
  for (let i = 0; i < 14; i++) {
    const pts: THREE.Vector3[] = [];
    let [x, z] = rng.inDisc(11);
    const y = rng.float(0.15, 0.6);
    for (let k = 0; k < 5; k++) {
      pts.push(new THREE.Vector3(x, y + (k % 2) * 0.15, z));
      x += rng.float(-2, 2); z += rng.float(-2, 2);
      const d = Math.hypot(x, z);
      if (d > 12) { x *= 12 / d; z *= 12 / d; }
    }
    u.add(K.tube(pts, 0.05, 30, 6), '#1e1c1b', 'metal');
  }
  // blind walls with faded signs (no words left on them)
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const x = Math.cos(ang) * 5.2, z = Math.sin(ang) * 5.2, ry = -ang - Math.PI / 2;
    u.add(K.at(K.box(3.2, 2.4, 0.3), x, 0, z, { ry }), '#7d6a5a', 'stone');
    const fz = 0.16;
    const sign = new THREE.PlaneGeometry(2.4, 1.0);
    K.at(sign, 0, 1.5, fz);
    u.add(K.at(sign, x, 0, z, { ry }), rng.pick(['#b9a27a', '#a88f88', '#9aa7a0', '#c2a785']), 'matte');
    for (let k = 0; k < 6; k++) {
      const g = new THREE.PlaneGeometry(rng.float(0.15, 0.3), 0.32);
      K.at(g, -0.95 + k * 0.38, 1.5, fz + 0.01);
      u.add(K.at(g, x, 0, z, { ry }), '#d8ccb4', 'matte');
    }
  }
  // the reverse of the central gate: scaffolding and a sagging tarp
  for (const sx of [-1.4, 1.4]) for (const sz of [-0.3, 0.3]) u.add(K.at(K.cyl(0.05, 0.05, 3.4, 5), sx, 0, sz), '#4a3a2a', 'wood');
  for (const y of [1.1, 2.2, 3.3]) u.add(K.at(K.box(3.0, 0.08, 0.7), 0, y, 0), '#5d4a36', 'wood');
  u.add(K.at(K.box(2.6, 1.3, 0.04), 0, 1.6, 0.36, { rx: 0.06 }), '#8d7a56', 'cloth');
  K.forest(u, { n: 16, r0: 9, r1: 12.6, rng: rng.fork('dead'), kinds: ['shrub'], h: [0.4, 0.8], color: '#6a6440' });
  under.add(u.build({ name: 'moriana-reverse' }));
  const smoke = K.smoke({ sources: chimneys, perSource: 14, height: 3.5, color: '#3a3532', opacity: 0.45, size: [0.3, 1.0], life: 6, wind: [0.25, 0.1], additive: false, rng: rng.fork('smoke') });
  under.add(smoke);
  const poor = new K.Walkers({
    paths: [4.0, 7.5, 10.5].map((r) => Array.from({ length: 33 }, (_, i) => new THREE.Vector3(Math.cos((i / 32) * Math.PI * 2) * r, 0.02, Math.sin((i / 32) * Math.PI * 2) * r))),
    count: 50, closed: true, rng: rng.fork('poor'), speed: [0.08, 0.2], colors: ['#4a4038', '#5d5246', '#6b5a48', '#3a3430'],
  });
  under.add(poor.mesh);
  const rats = K.instanced(K.quadruped({ len: 0.16, h: 0.08, tail: 0.12, ears: true }), K.figureMaterial(), 12, (_i, o, c) => {
    const [x, z] = rng.inDisc(11);
    o.position.set(x, 0.01, z);
    o.rotation.y = rng.angle();
    c.set('#4a4440');
  });
  under.add(rats);

  // the air around the sheet
  const flock = new K.Flock({ count: 18, radius: 13, height: 7, color: '#ffffff', span: 0.34, speed: 0.2, rng: rng.fork('birds') });
  root.add(flock.mesh);
  root.add(K.cloudSea({ y: -11, color: '#fbeee2', shadow: '#c4a9b8', opacity: 0.6, coverage: 0.45 }));

  const turn = new K.Toggle(0.3);
  return {
    root,
    env: {
      skyTop: '#6aa3c4',
      skyHorizon: '#f6e4cf',
      skyBottom: '#e9cdbb',
      skyCurve: 0.55,
      fogNear: 80,
      fogFar: 240,
      sunDir: [0.45, 0.75, 0.55],
      sunColor: '#fff0dc',
      sunIntensity: 2.4,
      sunDisc: 1,
      sunGlow: 1.0,
      hemiSky: '#cfe2ee',
      hemiGround: '#b59a88',
      hemiIntensity: 0.8,
      envIntensity: 0.85,
      clouds: 0.35,
      cloudColor: '#fff6ec',
      bloomStrength: 0.4,
      bloomThreshold: 0.92,
      tiltShift: 0.35,
      shadowRadius: 18,
      vignette: 0.3,
      saturation: 1.15,
      contrast: 1.1,
      exposure: 0.92,
    },
    camera: {
      position: [3, 15, 25],
      target: [0, 0.8, 0],
      minDistance: 6,
      maxDistance: 70,
      maxPolar: 1.56,
      autoRotate: 0.22,
      views: [
        { position: [11.5, 3.2, 7.5], target: [7.4, 1.0, 3.2] },
        { position: [25, 0.8, 6], target: [0, 0, 0] },
      ],
    },
    interaction: {
      label: 'Turn the sheet',
      activeLabel: 'Turn it back',
      hint: 'Same city, other face. It has no inside, only a front and a back.',
      set: (on) => turn.set(on),
    },
    update(t, dt) {
      turn.update(dt);
      const v = turn.value;
      sheet.rotation.x = Math.PI * v;
      sheet.position.y = Math.sin(Math.PI * v) * 2.0;
      smoke.visible = v > 0.85;
      // dancers swim slow circles around each medusa, rising and sinking
      for (let i = 0; i < ND; i++) {
        const vi = Math.floor(i / 3), k = i % 3;
        const vl = villas[vi];
        const ang = t * 0.5 + (k / 3) * Math.PI * 2 + vi;
        const x = vl.x + Math.cos(ang) * 0.62, z = vl.z + Math.sin(ang) * 0.52;
        dset(i, x, 0.2 + 0.35 + Math.sin(t * 1.3 + i) * 0.25, z, -ang, 1, Math.sin(t * 2 + i) * 0.5, 0.6 + Math.sin(t + i) * 0.4);
      }
      dset.done();
      strollers.update(t);
      poor.update(t);
      flock.update(t);
    },
  };
};

export default build;
