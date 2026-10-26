// BAUCIS - Cities & Eyes 3.
// After seven days through woodland the traveller cannot see the city: it stands
// above the clouds on slender stilts, far apart, which climb out of the trees.
// The inhabitants seldom come down; they have all they need up there, and they
// spend long hours at their spyglasses, studying the earth from which they are
// absent. Toggle: descend below the clouds; the cloud layer thins, a basket
// lowers on its rope, and the untouched forest is seen from among the stilts.

import * as THREE from 'three';
import * as K from '../kit';
import type { CityBuilder } from '../core/types';

const CLOUD_Y = 8.5;

const build: CityBuilder = (ctx) => {
  const rng = ctx.rng;
  const root = new THREE.Group();

  // ---- the earth: a wooded island the city never touches
  const isl = K.island({ radius: 19, flat: 15, depth: 8, top: '#4f7a3a', edge: '#5c7f3e', cliff: '#7a6a52', under: '#3f3a34', strata: '#8c7a5c', hills: 0.6, seed: 31 });
  root.add(isl.mesh);
  const gb = new K.Batch();
  const ponds: [number, number, number][] = [[-6, 5, 2.4], [7, -4, 1.8], [2, 9, 1.4]];
  const nearPond = (x: number, z: number) => ponds.some(([px, pz, pr]) => Math.hypot(x - px, z - pz) < pr + 0.4);
  // decks: [x, z, radius, height]
  const decks: [number, number, number, number][] = [[0, 0, 3.6, 17]];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const r = i % 2 ? 9.2 : 8.2;
    decks.push([Math.cos(a) * r, Math.sin(a) * r, rng.float(2.0, 2.7), 15.4 + rng.float(-0.9, 1.3)]);
  }
  K.forest(gb, { n: 260, r1: 16, rng: rng.fork('wood'), kinds: ['pine', 'pine', 'round', 'poplar', 'olive'], h: [1.0, 2.4], color: undefined, avoid: nearPond, y: (x, z) => isl.heightAt(x, z) });
  for (let i = 0; i < 30; i++) {
    const [x, z] = rng.inDisc(15);
    if (nearPond(x, z)) continue;
    K.rock(gb, { x, z, y: isl.heightAt(x, z), r: rng.float(0.2, 0.5), color: '#8a8478', rng });
  }
  for (const [px, pz, pr] of ponds) gb.add(K.at(K.disc(pr + 0.25, 32), px, 0.01, pz), '#6b6a4a', 'matte');
  root.add(gb.build({ name: 'earth' }));
  for (const [px, pz, pr] of ponds) root.add(K.waterDisc(pr, 0.04, { color: '#3d6f7c' }, 40).translateX(px).translateZ(pz));
  const deer = K.instanced(K.quadruped({ len: 0.32, h: 0.26, horns: true, tail: 0.04 }), K.figureMaterial(), 9, (i, o, c) => {
    const [px, pz, pr] = ponds[i % 3];
    const a = rng.angle();
    o.position.set(px + Math.cos(a) * (pr + 0.5), 0.02, pz + Math.sin(a) * (pr + 0.5));
    o.rotation.y = a + Math.PI / 2;
    c.set(rng.pick(['#8a5a34', '#7a4e2c', '#a06a3e']));
  });
  root.add(deer);

  // ---- stilts: slender legs climbing from the trees, braced every few metres
  const sb = new K.Batch();
  const STILT = '#d9cfbf';
  for (const [dx, dz, dr, dy] of decks) {
    const n = dr > 3 ? 6 : 4;
    const feet: THREE.Vector3[] = [], tops: THREE.Vector3[] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rng.float(-0.1, 0.1);
      const ft = new THREE.Vector3(dx + Math.cos(a) * dr * 1.05, 0, dz + Math.sin(a) * dr * 1.05);
      ft.y = isl.heightAt(ft.x, ft.z) - 0.1;
      const tp = new THREE.Vector3(dx + Math.cos(a) * dr * 0.7, dy - 0.2, dz + Math.sin(a) * dr * 0.7);
      feet.push(ft); tops.push(tp);
      sb.add(K.strut(ft, tp, 0.06, 6), STILT, 'wood');
      sb.add(K.strut(tp, new THREE.Vector3(dx + Math.cos(a) * dr * 0.2, dy - 1.4, dz + Math.sin(a) * dr * 0.2), 0.035, 5), STILT, 'wood');
      sb.add(K.at(K.cyl(0.12, 0.16, 0.25, 6), ft.x, ft.y, ft.z), '#a89a85', 'stone');
    }
    for (const f of [0.38, 0.82]) {
      for (let i = 0; i < n; i++) {
        const p = feet[i].clone().lerp(tops[i], f), q = feet[(i + 1) % n].clone().lerp(tops[(i + 1) % n], f);
        sb.add(K.strut(p, q, 0.018, 4), '#c9bda8', 'wood');
      }
    }
  }
  root.add(sb.build({ name: 'stilts' }));

  // ---- the high city: decks, houses, railings, catwalks, spyglasses
  const b = new K.Batch();
  const walls = ['#ece3d2', '#e2d6c0', '#d5dfe2', '#e8d8bc', '#d9cfbd'];
  const roofs = ['#6d8ea6', '#4f6f86', '#a8653f', '#7d9aa8'];
  const scopes: { x: number; y: number; z: number; a: number }[] = [];
  const watchers: [number, number, number][] = [];
  decks.forEach(([dx, dz, dr, dy], di) => {
    b.add(K.at(K.cyl(dr, dr * 0.92, 0.3, 40), dx, dy - 0.3, dz), '#a9845c', 'wood');
    b.add(K.at(K.ring(dr * 0.2, dr - 0.05, 40), dx, dy + 0.005, dz), '#c7a77c', 'wood');
    b.add(K.at(K.torus(dr - 0.05, 0.025, 4, 64), dx, dy + 0.32, dz), '#efe6d4', 'wood');
    const np = Math.floor(dr * 9);
    for (let i = 0; i < np; i++) {
      const a = (i / np) * Math.PI * 2;
      b.add(K.at(K.cyl(0.015, 0.015, 0.32, 4), dx + Math.cos(a) * (dr - 0.05), dy, dz + Math.sin(a) * (dr - 0.05)), '#efe6d4', 'wood');
    }
    if (di === 0) {
      // the central belvedere: a round hall with a lantern dome
      K.domeHall(b, { x: dx, y: dy, z: dz, r: 1.5, h: 1.6, color: '#e9e0cf', domeColor: '#5d7f99' });
      K.tower(b, { x: dx + 1.9, y: dy, z: dz - 1.2, r: 0.32, h: 3.6, sides: 8, top: 'cone', color: '#efe8da', topColor: '#4f6f86', rng });
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + 0.6;
        K.house(b, { x: dx + Math.cos(a) * 2.5, y: dy, z: dz + Math.sin(a) * 2.5, ry: -a + Math.PI / 2, w: 0.85, d: 0.7, h: 0.8, roof: 'hip', roofH: 0.35, wall: rng.pick(walls), roofColor: rng.pick(roofs), lit: 0.2, glow: 2, rng });
      }
    } else {
      const nh = dr > 2.4 ? 4 : 3;
      for (let i = 0; i < nh; i++) {
        const a = (i / nh) * Math.PI * 2 + rng.float(0, 1);
        const r = dr * 0.45;
        const h = rng.float(0.8, 1.5);
        K.house(b, { x: dx + Math.cos(a) * r, y: dy, z: dz + Math.sin(a) * r, ry: -a + Math.PI / 2, w: rng.float(0.8, 1.1), d: rng.float(0.7, 0.95), h, roof: rng.pick(['hip', 'gable', 'pyramid'] as const), roofH: 0.4, wall: rng.pick(walls), roofColor: rng.pick(roofs), lit: 0.2, glow: 2, rng });
      }
      K.flag(b, { x: dx, y: dy, z: dz, h: 2.3, w: 0.5, color: rng.pick(['#c0563a', '#e0b35c', '#4f6f86']) });
      // catwalk to the centre
      const a = Math.atan2(dz, dx);
      K.bridge(b, { from: [Math.cos(a) * 3.55, 17 - 0.02, Math.sin(a) * 3.55], to: [dx - Math.cos(a) * (dr - 0.1), dy - 0.02, dz - Math.sin(a) * (dr - 0.1)], width: 0.45, color: '#b89468', finish: 'wood', hump: 0.25 });
    }
    // spyglasses on tripods at the rim, aimed at the earth
    const ns = di === 0 ? 4 : 2;
    for (let i = 0; i < ns; i++) {
      const a = (i / ns) * Math.PI * 2 + (di === 0 ? 0.2 : Math.atan2(dz, dx) + Math.PI / 2);
      const r = dr - 0.35;
      const x = dx + Math.cos(a) * r, z = dz + Math.sin(a) * r;
      for (let l = 0; l < 3; l++) {
        const la = (l / 3) * Math.PI * 2;
        b.add(K.strut([x + Math.cos(la) * 0.16, dy, z + Math.sin(la) * 0.16], [x, dy + 0.42, z], 0.012, 4), '#5a4632', 'wood');
      }
      scopes.push({ x, y: dy + 0.44, z, a });
      watchers.push([x - Math.cos(a) * 0.32, dy, z - Math.sin(a) * 0.32]);
    }
  });
  root.add(b.build({ name: 'baucis' }));

  // the spyglasses themselves (instanced, they sweep slowly over the earth)
  const tube = K.merge([
    K.paint(K.at(K.cyl(0.05, 0.035, 0.7, 10), 0, 0, -0.2, { rx: Math.PI / 2 }), '#ffffff'),
    K.paint(K.at(K.cyl(0.065, 0.065, 0.06, 10), 0, 0, 0.47, { rx: Math.PI / 2 }), '#ffffff'),
    K.paint(K.at(K.cyl(0.03, 0.03, 0.06, 8), 0, 0, -0.23, { rx: Math.PI / 2 }), '#ffffff'),
  ]);
  const scopeMesh = K.instanced(tube, K.std('#c9a24c', { metalness: 0.9, roughness: 0.3 }), scopes.length);
  root.add(scopeMesh);
  const dummy = new THREE.Object3D();
  dummy.rotation.order = 'YXZ';
  const scopePh = scopes.map(() => rng.float(0, 10));
  root.add(K.crowd({ count: watchers.length, place: (i) => watchers[i], colors: ['#6d2f2a', '#2e4a6b', '#e8e0d0', '#5a3b5e', '#3f6c78'], rng: rng.fork('watch') }));

  // people strolling on the catwalks and decks
  const paths: THREE.Vector3[][] = decks.slice(1).map(([dx, dz, dr, dy]) => {
    const a = Math.atan2(dz, dx);
    const p: THREE.Vector3[] = [];
    for (let i = 0; i <= 12; i++) {
      const f = i / 12;
      const r0 = 3.55, r1 = Math.hypot(dx, dz) - dr + 0.1;
      const r = r0 + (r1 - r0) * f;
      p.push(new THREE.Vector3(Math.cos(a) * r, 17 + (dy - 17) * f + 0.25 * 4 * f * (1 - f), Math.sin(a) * r));
    }
    return p;
  });
  const walkers = new K.Walkers({ paths, count: 26, rng: rng.fork('walk'), speed: [0.15, 0.3], colors: ['#6d2f2a', '#2e4a6b', '#e8e0d0', '#c9a35a'] });
  root.add(walkers.mesh);

  // ---- the basket that is (rarely) lowered to the ground
  const BX = 3.3, BZ = 1.6;
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 4).translate(0, -0.5, 0), K.std('#6b5338'));
  rope.position.set(BX, 17, BZ);
  root.add(rope);
  const bk = new K.Batch();
  bk.add(K.cyl(0.22, 0.17, 0.28, 10), '#9a7448', 'wood');
  bk.add(K.at(K.torus(0.22, 0.02, 4, 16), 0, 0.28, 0), '#6b5338', 'wood');
  bk.add(K.at(K.personGeometry(0.24), 0, 0.12, 0), '#3f6c78', 'cloth');
  const basket = bk.build();
  root.add(basket);
  const pulley = new K.Batch();
  pulley.add(K.strut([BX - 0.5, 17, BZ - 0.3], [BX + 0.15, 17.9, BZ], 0.03, 5), '#8a6a48', 'wood');
  pulley.add(K.at(K.torus(0.12, 0.03, 6, 16), BX, 17.9, BZ, { rx: Math.PI / 2 }), '#5a4632', 'wood');
  root.add(pulley.build());

  // ---- clouds: a sea with gaps, plus soft puffs among the stilts
  const clouds = K.cloudSea({ y: CLOUD_Y, radius: 90, color: '#ffffff', shadow: '#9fb0c8', opacity: 0.85, coverage: 0.58, scale: 0.07, speed: 0.012 });
  root.add(clouds);
  const cU = (clouds.material as THREE.ShaderMaterial).uniforms;
  const puffs = K.particles({ count: 220, radius: 22, y0: CLOUD_Y - 1.2, y1: CLOUD_Y + 1.6, color: '#ffffff', colors: ['#eef2f8', '#dfe6f0'], size: 2.0, opacity: 0.16, swirl: 1.4, velocity: [0.15, 0, 0.05], additive: false, rng: rng.fork('puffs') });
  root.add(puffs);
  const pU = (puffs.material as THREE.ShaderMaterial).uniforms;
  const flock = new K.Flock({ count: 18, center: [0, 0, 0], radius: 12, height: 4.5, color: '#2a2a2a', span: 0.35, speed: 0.2, rng: rng.fork('birds') });
  root.add(flock.mesh);
  const flock2 = new K.Flock({ count: 10, center: [0, 0, 0], radius: 14, height: 20, color: '#f4f4f4', span: 0.4, speed: 0.12, rng: rng.fork('gulls') });
  root.add(flock2.mesh);

  const down = new K.Toggle(0.35);
  return {
    root,
    env: {
      skyTop: '#2f68b0',
      skyHorizon: '#c3d8ec',
      skyBottom: '#d9e4ef',
      skyCurve: 0.5,
      fog: '#b4cbe2',
      fogNear: 90,
      fogFar: 260,
      sunDir: [0.6, 0.55, 0.35],
      sunColor: '#fff1dc',
      sunIntensity: 2.4,
      sunDisc: 1,
      sunGlow: 1.0,
      hemiSky: '#c4dbf2',
      hemiGround: '#8f9a84',
      hemiIntensity: 0.75,
      envIntensity: 0.85,
      clouds: 0.25,
      cloudColor: '#ffffff',
      bloomStrength: 0.35,
      bloomThreshold: 0.9,
      tiltShift: 0.35,
      shadowRadius: 21,
      vignette: 0.3,
      saturation: 1.1,
      contrast: 1.08,
    },
    camera: {
      position: [19, 23, 25],
      target: [0, 12.5, 0],
      minDistance: 8,
      maxDistance: 75,
      maxPolar: 1.5,
      autoRotate: 0.25,
      views: [
        { position: [-6, 19.5, 9], target: [1, 16.5, 0] },
        { position: [24, 9.5, -16], target: [0, 7, 0] },
      ],
    },
    interaction: {
      label: 'Descend below the clouds',
      activeLabel: 'Climb back above',
      hint: 'Down here the forest grows as if no city had ever been built.',
      set: (on) => down.set(on),
      camera: { position: [17, 4.2, 15], target: [0, 3.0, 0] },
    },
    update(t, dt) {
      down.update(dt);
      const d = down.value;
      cU.uOpacity.value = 0.85 * (1 - d * 0.75);
      pU.uOpacity.value = 0.16 * (1 - d * 0.7);
      // the basket descends on its rope
      const by = K.lerp(16.2, 0.3 + isl.heightAt(BX, BZ), d) + Math.sin(t * 0.9) * 0.06;
      basket.position.set(BX, by, BZ);
      basket.rotation.y = Math.sin(t * 0.4) * 0.3;
      rope.scale.y = Math.max(0.01, 17.9 - by - 0.28);
      rope.position.y = 17.9;
      for (let i = 0; i < scopes.length; i++) {
        const s = scopes[i];
        const yaw = s.a + Math.sin(t * 0.15 + scopePh[i]) * 0.5;
        dummy.position.set(s.x, s.y, s.z);
        dummy.rotation.set(0.55 + Math.sin(t * 0.21 + scopePh[i] * 2) * 0.12, Math.PI / 2 - yaw, 0);
        dummy.updateMatrix();
        scopeMesh.setMatrixAt(i, dummy.matrix);
      }
      scopeMesh.instanceMatrix.needsUpdate = true;
      walkers.update(t);
      flock.update(t);
      flock2.update(t);
    },
  };
};

export default build;
