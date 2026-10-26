// BERENICE - Hidden Cities 5.
// The unjust city: crimson palaces with gilded domes, steaming baths, banquet
// tables heavy with gold, servants hurrying along the rings. At its heart a great
// golden dome, and light leaking from its seams: inside it lies the just city, white
// houses and gardens where everyone sits at one round table. At the heart of the
// just city, a smaller gilded dome: the seed of a new injustice, which holds a still
// smaller just garden, and in that a glowing seed again. Every future Berenice is
// already here, one inside the other.
// Toggle: open the nesting (the domes bloom open one after another).

import * as THREE from 'three';
import * as K from '../kit';
import type { CityBuilder } from '../core/types';

const RIN = 7, ROUT = 14; // every layer template is built as a ring RIN..ROUT, then scaled by 1/2 per level
const PETALS = 10;
const LEVELS = 4;

const build: CityBuilder = (ctx) => {
  const rng = ctx.rng;
  const root = new THREE.Group();

  const isl = K.island({ radius: 16, flat: 14.6, depth: 10, top: '#8a6a4a', edge: '#7d5c40', cliff: '#9a7a5a', under: '#3d2d28', strata: '#b08e66', seed: 55 });
  root.add(isl.mesh);
  root.add(K.cloudSea({ y: -8, color: '#f0b98a', shadow: '#6a4a5a', opacity: 0.75, coverage: 0.5 }));

  // ---------------------------------------------------------------- the unjust template
  const U = new THREE.Group();
  {
    const b = new K.Batch();
    const g = K.paintBy(new THREE.RingGeometry(RIN - 0.05, ROUT + 0.2, 160, 8).rotateX(-Math.PI / 2), (x, _y, z, out) => {
      const r = Math.hypot(x, z), a = Math.atan2(z, x);
      const chk = (Math.floor(r / 0.6) + Math.floor((a / Math.PI) * 40)) & 1;
      out.set(chk ? '#8e3b3a' : '#b4774a');
      if (r < RIN + 0.35) out.set('#d4a03c');
    });
    b.add(K.at(g, 0, 0.012, 0), null, 'polished');
    K.cityWall(b, { r: ROUT - 0.25, h: 1.7, thick: 0.45, seg: 96, color: '#8c2f38', towers: 8, towerTop: 'onion', towerTopColor: '#d4a03c' });
    // colonnade of gilded columns around the great dome
    for (let i = 0; i < 30; i++) {
      const a = (i / 30) * Math.PI * 2;
      K.column(b, { x: Math.cos(a) * 7.75, z: Math.sin(a) * 7.75, h: 2.2, r: 0.14, color: '#d9a943', finish: 'gold', sides: 10 });
    }
    b.add(K.at(K.torus(7.75, 0.16, 6, 96), 0, 2.3, 0), '#d4a03c', 'gold');
    // eight palaces with gold and purple domes
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
      const x = Math.cos(a) * 11, z = Math.sin(a) * 11, ry = -a + Math.PI / 2;
      K.house(b, { x, z, ry, w: 2.7, d: 2.2, h: 3.0, roof: 'none', wall: rng.pick(['#9a3a40', '#a8484a', '#8a2f45']), cornice: true, lit: 0.55, glow: 2.4, litColor: '#ffbe5c', windowColor: '#3a1a1a', rng });
      b.add(K.at(K.box(2.85, 0.18, 2.35), x, 3.0, z, { ry }), '#d4a03c', 'gold');
      const dc = k % 2 ? '#d4a03c' : '#6a3a8a';
      b.add(K.at(K.onion(0.95, 2.0, 20), x, 3.18, z), dc, k % 2 ? 'gold' : 'ceramic');
      b.add(K.at(K.cyl(0.03, 0.03, 0.6, 6), x, 5.1, z), '#d4a03c', 'gold');
      K.arcade(b, { x: x - Math.cos(a) * 1.45, z: z - Math.sin(a) * 1.45, ry, n: 5, span: 0.55, h: 1.3, d: 0.5, color: '#e8c58a', finish: 'stone' });
      for (const s of [-1.9, 1.9]) K.tree(b, { x: x + Math.cos(a + Math.PI / 2) * s, z: z + Math.sin(a + Math.PI / 2) * s, kind: 'palm', h: 2.6, rng });
    }
    // banquets between the palaces: long red tables loaded with gold
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      const x = Math.cos(a) * 11, z = Math.sin(a) * 11, ry = -a;
      b.add(K.at(K.box(0.7, 0.42, 2.6), x, 0, z, { ry }), '#b0232f', 'cloth');
      for (let i = 0; i < 7; i++) {
        const t = -1.1 + i * 0.37;
        b.add(K.at(K.sphere(0.07, 8, 6), x + Math.sin(ry) * t, 0.48, z + Math.cos(ry) * t), '#ffd36a', 'glow', 2.2);
      }
      for (const s of [-0.65, 0.65]) b.add(K.at(K.box(0.4, 0.28, 2.6), x + Math.cos(ry) * s, 0, z - Math.sin(ry) * s, { ry }), '#5a2a5a', 'cloth');
      b.add(K.at(K.box(2.6, 2.4, 0.08), x + Math.cos(a) * 1.4, 0, z + Math.sin(a) * 1.4, { ry: ry + Math.PI / 2 }), '#e8c58a', 'cloth');
    }
    // the baths: marble basins with gold rims
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2;
      const x = Math.cos(a) * 11, z = Math.sin(a) * 11;
      b.add(K.at(K.box(2.9, 0.3, 2.0), x, 0, z, { ry: -a }), '#efe0cf', 'polished');
      b.add(K.at(K.box(2.5, 0.02, 1.6), x, 0.29, z, { ry: -a }), '#4fa6b0', 'glow', 0.9);
      for (const s of [-1, 1]) b.add(K.at(K.cyl(0.08, 0.08, 1.6, 8), x + Math.cos(a + Math.PI / 2) * s * 1.35, 0.3, z + Math.sin(a + Math.PI / 2) * s * 1.35), '#d4a03c', 'gold');
    }
    U.add(b.build({ name: 'berenice-unjust' }));
    // reclining banqueters
    const diners: [number, number, number][] = [];
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      for (let i = 0; i < 6; i++) for (const s of [-0.65, 0.65]) {
        const t = -1.0 + i * 0.4;
        diners.push([Math.cos(a) * 11 + Math.cos(-a) * s + Math.sin(-a) * t, 0.26, Math.sin(a) * 11 - Math.sin(-a) * s + Math.cos(-a) * t]);
      }
    }
    U.add(K.crowd({ count: diners.length, place: (i) => diners[i], colors: ['#e8c58a', '#c9a0d8', '#f2e2c8', '#d98a6a'], rng: rng.fork('diners') }));
  }

  // ---------------------------------------------------------------- the just template
  const J = new THREE.Group();
  {
    const b = new K.Batch();
    const g = K.paintBy(new THREE.RingGeometry(RIN - 0.05, ROUT + 0.2, 160, 10).rotateX(-Math.PI / 2), (x, _y, z, out) => {
      const r = Math.hypot(x, z);
      out.set('#8fb070');
      if (Math.sin(r * 9) > 0.35 && r > 12.8) out.set('#6f9a52');
      if (Math.abs(r - 10.75) < 1.0 || Math.abs(r - RIN - 0.45) < 0.4) out.set('#e6dcc4');
    });
    b.add(K.at(g, 0, 0.012, 0), null, 'matte');
    // a low hedge instead of a wall
    b.add(K.at(new THREE.TorusGeometry(ROUT - 0.3, 0.3, 6, 96).rotateX(Math.PI / 2).scale(1, 1.6, 1), 0, 0.3, 0), '#5a7d45', 'matte');
    // the round table where everyone sits as equals
    b.add(K.at(K.ring(10.45, 11.05, 128), 0, 0.42, 0), '#f6f2e8', 'cloth');
    b.add(K.at(new THREE.CylinderGeometry(11.05, 11.05, 0.1, 128, 1, true), 0, 0.37, 0), '#f6f2e8', 'cloth');
    b.add(K.at(new THREE.CylinderGeometry(10.45, 10.45, 0.1, 128, 1, true), 0, 0.37, 0), '#f6f2e8', 'cloth');
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      b.add(K.at(K.sphere(0.06, 8, 6), Math.cos(a) * 10.75, 0.47, Math.sin(a) * 10.75), '#fff1c8', 'glow', 1.6);
      b.add(K.at(K.cyl(0.06, 0.07, 0.15, 8), Math.cos(a + 0.07) * 10.75, 0.42, Math.sin(a + 0.07) * 10.75), '#b8d0a0', 'ceramic');
    }
    // plain white houses with blue doors, two rings
    for (const [r, n] of [[8.6, 22], [12.6, 30]] as const) {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + (r > 10 ? 0.05 : 0);
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        if (i % 4 === 2) { K.tree(b, { x, z, kind: rng.pick(['round', 'olive'] as const), h: rng.float(1.4, 2.0), rng, color: '#6f9a45' }); continue; }
        K.house(b, { x, z, ry: -a - Math.PI / 2 + (r > 10 ? Math.PI : 0), w: 1.3, d: 1.1, h: 1.35, roof: 'gable', roofH: 0.55, wall: '#f4f1ea', roofColor: rng.pick(['#c9b27a', '#bfa86e']), roofFinish: 'cloth', lit: 0.4, glow: 1.8, litColor: '#fff0c8', windowColor: '#4b6a8a', rng });
      }
    }
    J.add(b.build({ name: 'berenice-just' }));
    const seats: [number, number, number][] = [];
    const n = 60;
    for (let i = 0; i < n; i++) for (const r of [10.15, 11.35]) {
      const a = (i / n) * Math.PI * 2 + (r > 11 ? 0.05 : 0);
      seats.push([Math.cos(a) * r, 0, Math.sin(a) * r]);
    }
    J.add(K.crowd({ count: seats.length, place: (i) => seats[i], colors: ['#f2efe6', '#a9c4d8', '#c6d8a8', '#e8d6b0', '#d8b8a8'], rng: rng.fork('seats') }));
  }

  // ---------------------------------------------------------------- the nested levels with blooming domes
  const petalGeo = () => {
    const w = (Math.PI * 2) / PETALS;
    const g = new THREE.SphereGeometry(RIN - 0.12, 10, 12, Math.PI - w * 0.49, w * 0.98, 0, Math.PI / 2);
    g.scale(1, 0.82, 1).translate(-(RIN - 0.12), 0, 0);
    return g;
  };
  const goldDome = new THREE.MeshStandardMaterial({ color: '#d6a240', metalness: 0.95, roughness: 0.28, side: THREE.DoubleSide, envMapIntensity: 1.3 });
  const whiteDome = new THREE.MeshStandardMaterial({ color: '#f1eee6', roughness: 0.75, side: THREE.DoubleSide, emissive: '#2a3324' });
  interface Level { g: THREE.Group; petals: THREE.InstancedMesh; set: ReturnType<typeof K.instanceSetter>; glow: THREE.Sprite }
  const levels: Level[] = [];
  for (let k = 0; k < LEVELS; k++) {
    const g = new THREE.Group();
    const unjust = k % 2 === 0;
    g.add((unjust ? U : J).clone(true));
    g.scale.setScalar(Math.pow(0.5, k));
    const petals = K.instanced(petalGeo(), unjust ? goldDome : whiteDome, PETALS, undefined, { colors: false });
    g.add(petals);
    // the light of the city hidden under this dome
    const glow = K.glowSprite(unjust ? '#f2ffe0' : '#ffb04a', 9, 0.5);
    glow.position.set(0, 1.5, 0);
    g.add(glow);
    root.add(g);
    levels.push({ g, petals, set: K.instanceSetter(petals), glow });
  }
  const seed = K.glowSprite('#ff6a3a', 0.5, 0.9);
  seed.position.set(0, 0.06, 0);
  root.add(seed);
  const seedCore = new THREE.Mesh(K.sphere(0.035, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffb080' }));
  seedCore.position.set(0, 0.05, 0);
  root.add(seedCore);
  const finial = new THREE.Mesh(K.merge([K.cone(0.35, 1.2, 12), K.at(K.sphere(0.25, 12, 9), 0, 1.3, 0)]), new THREE.MeshStandardMaterial({ color: '#e0b04a', metalness: 1, roughness: 0.25 }));
  root.add(finial);

  // ---- life: servants hurrying along the rings, steam from the baths, birds
  const ring = (r: number) => Array.from({ length: 73 }, (_, i) => new THREE.Vector3(Math.cos((i / 72) * Math.PI * 2) * r, 0.02, Math.sin((i / 72) * Math.PI * 2) * r));
  const servants = new K.Walkers({ paths: [ring(8.6), ring(12.9)], closed: true, count: 90, rng: rng.fork('serv'), speed: [0.3, 0.55], colors: ['#4a3a32', '#5a4a3a', '#3d3530', '#6a5a48'] });
  root.add(servants.mesh);
  root.add(K.smoke({ sources: [0, 1, 2, 3].map((k) => [Math.cos((k / 4) * Math.PI * 2) * 11, 0.35, Math.sin((k / 4) * Math.PI * 2) * 11] as [number, number, number]), perSource: 40, height: 3, color: '#fff4e8', opacity: 0.3, size: [0.5, 1.4], life: 5, wind: [0.15, 0.1], rng: rng.fork('steam') }));
  const flock = new K.Flock({ count: 18, radius: 12, height: 10, color: '#3a2a30', speed: 0.2, rng: rng.fork('birds') });
  root.add(flock.mesh);
  root.add(K.particles({ count: 200, radius: 15, disc: true, y0: 0.5, y1: 8, color: '#ffd9a0', size: 0.06, opacity: 0.5, swirl: 0.6, twinkle: 0.8, rng: rng.fork('motes') }));

  const open = new K.Toggle(0.3);
  return {
    root,
    env: {
      skyTop: '#3a3060',
      skyHorizon: '#f0a070',
      skyBottom: '#6a4060',
      skyCurve: 0.45,
      fog: '#d89a7a',
      fogNear: 75,
      fogFar: 240,
      sunDir: [-0.7, 0.32, 0.55],
      sunColor: '#ffbf80',
      sunIntensity: 2.6,
      sunDisc: 1,
      sunGlow: 1.2,
      hemiSky: '#a8a0d0',
      hemiGround: '#6a4a3a',
      hemiIntensity: 0.7,
      envIntensity: 0.8,
      stars: 0.2,
      clouds: 0.35,
      cloudColor: '#ffc8a0',
      bloomStrength: 0.7,
      bloomThreshold: 0.85,
      bloomRadius: 0.55,
      tiltShift: 0.45,
      shadowRadius: 18,
      vignette: 0.4,
      saturation: 1.08,
    },
    camera: {
      position: [21, 17, 23],
      target: [0, 2, 0],
      minDistance: 4,
      maxDistance: 70,
      autoRotate: 0.25,
      views: [
        { position: [6.5, 7.5, 8], target: [0, 1, 0] },
        { position: [17, 5, 7], target: [5, 2, 0] },
      ],
    },
    interaction: {
      label: 'Open the nesting',
      activeLabel: 'Close the domes',
      hint: 'Inside the unjust city a just one; inside that, the seed of another.',
      set: (on) => open.set(on),
      camera: { position: [11, 18, 13.5], target: [0, 0.5, 0] },
    },
    update(t, dt) {
      open.update(dt);
      const s = open.raw;
      for (let k = 0; k < LEVELS; k++) {
        const L = levels[k];
        const o = K.easeInOut(K.clamp(s * 2.6 - k * 0.5));
        const breathe = 0.035 + 0.02 * Math.sin(t * 0.9 + k);
        const ang = breathe * (1 - o) + o * 1.05;
        const lift = o * 0.25;
        for (let i = 0; i < PETALS; i++) {
          const phi = (i / PETALS) * Math.PI * 2;
          L.set(i, Math.cos(phi) * (RIN - 0.12), lift, -Math.sin(phi) * (RIN - 0.12), phi, 1, 0, -ang);
        }
        L.set.done();
        // inner levels turn slowly, alternating
        if (k > 0) L.g.rotation.y = (k % 2 ? 1 : -1) * t * 0.03 * k;
        (L.glow.material as THREE.SpriteMaterial).opacity = (0.2 + 0.08 * Math.sin(t * 1.3 + k)) * (1 - 0.6 * o);
      }
      const o0 = K.easeInOut(K.clamp(s * 2.6));
      finial.position.set(0, 5.62 + o0 * 6, 0);
      finial.scale.setScalar(1 - o0);
      finial.visible = o0 < 0.98;
      const p = 0.75 + 0.25 * Math.sin(t * 2.2);
      seed.scale.setScalar(0.35 + p * 0.3);
      (seedCore.material as THREE.MeshBasicMaterial).color.setRGB(2.5 * p + 0.6, 1.0 * p + 0.3, 0.5 * p);
      servants.update(t);
      flock.update(t);
    },
  };
};

export default build;
