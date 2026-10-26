// CECILIA - Continuous Cities 4.
// A green upland where a goatherd grazes his goats, and a grey city of
// warehouses, walls and blocks advancing across it lot by lot, its cranes at the
// front. The goatherd has lost his way: the grass between the streets is
// shrinking. Toggle: years pass, the city devours the last pasture, and the old
// goatherd and his goats stand in a yard of warehouses and walls.

import * as THREE from 'three';
import * as K from '../kit';
import type { CityBuilder } from '../core/types';

const S = 1.7; // lot pitch
const RMAX = 17;
const C0 = 0.54, C1 = 1.08;

type Item = { x: number; y: number; z: number; ry: number; sx: number; sy: number; sz: number; g: number; col: THREE.Color };

const build: CityBuilder = (ctx) => {
  const rng = ctx.rng;
  const root = new THREE.Group();

  // ---- the upland: a green island
  const isl = K.island({ radius: 20, flat: 18.6, depth: 10, top: '#7ea352', edge: '#6f9148', cliff: '#8b7a5e', under: '#4a4038', strata: '#a08c6a', seed: 31, hills: 0.25 });
  root.add(isl.mesh);
  root.add(K.cloudSea({ y: -9, color: '#eef2e4', shadow: '#7f8c86', opacity: 0.7, coverage: 0.5 }));
  // ---- growth: when (0..1) each place is reached by the city
  const GX = 8.2, GZ = 7.4; // the goatherd's last patch
  const growth = (x: number, z: number) => {
    const u = ((x + z) / Math.SQRT2 + RMAX) / (2 * RMAX);
    const n = K.fbm2(x * 0.12 + 5, z * 0.12 - 3, 3);
    const near = Math.hypot(x - GX, z - GZ);
    return K.clamp(0.85 * u + 0.18 * n + 0.04 + (near < 4 ? (4 - near) * 0.03 : 0), 0, 1.02);
  };

  // ---- lots: warehouses, blocks, walled yards, and the pavement under them
  const pave: Item[] = [], ware: Item[] = [], blocks: Item[] = [], walls: Item[] = [], chim: Item[] = [];
  const IT = (x: number, y: number, z: number, ry: number, sx: number, sy: number, sz: number, g: number, c: K.ColorLike): Item => ({ x, y, z, ry, sx, sy, sz, g, col: K.col(c) });
  const wareCols = ['#b9b2a6', '#a49a8a', '#a5674a', '#c9bfa8', '#8d949b', '#b58a62', '#9aa29a'];
  const blockCols = ['#c4bcae', '#b0a99c', '#d1c7b4', '#a39b8f', '#b98e74'];
  const n = Math.ceil(RMAX / S);
  for (let i = -n; i <= n; i++) {
    for (let j = -n; j <= n; j++) {
      const x = i * S, z = j * S;
      if (Math.hypot(x, z) > RMAX) continue;
      const g = growth(x, z);
      const gp = g - 0.03;
      pave.push(IT(x, 0.012, z, 0, S, 1, S, gp, rng.pick(['#8f8b84', '#97928a', '#88847e'])));
      if (Math.hypot(x - GX, z - GZ) < 1.3) continue; // the yard where the goats will stand
      const kind = rng.weighted(['ware', 'block', 'yard'] as const, [0.55, 0.25, 0.2]);
      const ry = rng.chance(0.5) ? 0 : Math.PI / 2;
      if (kind === 'ware') {
        const w = rng.float(1.1, 1.45), d = rng.float(0.7, 1.3), h = rng.float(0.45, 0.9);
        ware.push(IT(x, 0, z, ry, w, h, d, g, K.pickJitter(wareCols, rng)));
        if (rng.chance(0.25)) chim.push(IT(x + 0.4, 0, z + 0.3, 0, 1, rng.float(1.4, 2.4), 1, g + 0.01, rng.pick(['#8a5a46', '#9b9286'])));
      } else if (kind === 'block') {
        const w = rng.float(0.9, 1.3), d = rng.float(0.8, 1.2), h = rng.float(1.2, 2.6) * (g < 0.4 ? 1.3 : 1);
        blocks.push(IT(x, 0, z, ry, w, h, d, g, K.pickJitter(blockCols, rng)));
      }
      if (kind === 'yard' || rng.chance(0.25)) {
        const c = rng.pick(['#bdb3a2', '#a9a091', '#c8bda9']);
        const hw = rng.float(0.25, 0.45);
        for (const [dx, dz, r] of [[0, -0.72, 0], [0, 0.72, 0], [-0.72, 0, Math.PI / 2], [0.72, 0, Math.PI / 2]] as const) {
          if (rng.chance(0.2)) continue;
          walls.push(IT(x + dx, 0, z + dz, r, 1.42, hw, 0.08, g + 0.01, c));
        }
      }
    }
  }

  // ---- the pasture's things, which vanish when the city arrives
  const trees: Item[] = [], flowers: Item[] = [], stones: Item[] = [];
  for (let i = 0; i < 90; i++) {
    const [x, z] = rng.inDisc(17.5);
    if (Math.hypot(x - GX, z - GZ) < 1.6) continue;
    trees.push(IT(x, 0, z, rng.angle(), 1, rng.float(0.8, 1.4), 1, growth(x, z) - 0.04, K.pickJitter(['#4f7d34', '#5c8a3a', '#46703a'], rng)));
  }
  for (let i = 0; i < 900; i++) {
    const [x, z] = rng.inDisc(17.5);
    flowers.push(IT(x, 0.03, z, 0, 1, 1, 1, growth(x, z) - 0.05, rng.pick(['#f4f0e0', '#f2d24a', '#e7a0c0', '#b9a2e8', '#ffffff'])));
  }
  // dry-stone pasture walls, crossing the upland in long lines
  for (const [x0, z0, x1, z1] of [[-15, 4, 3, 15], [2, -15, 14, 4], [-6, -3, 12, -9], [-14, -6, -2, -15]] as const) {
    const L = Math.hypot(x1 - x0, z1 - z0);
    for (let s = 0; s < L; s += 0.42) {
      const x = x0 + ((x1 - x0) * s) / L + rng.float(-0.03, 0.03), z = z0 + ((z1 - z0) * s) / L;
      if (Math.hypot(x, z) > 17.5) continue;
      stones.push(IT(x, 0, z, Math.atan2(x1 - x0, z1 - z0) + Math.PI / 2, 0.44, rng.float(0.18, 0.24), 0.18, growth(x, z) - 0.05, K.pickJitter(['#a49c8c', '#948c7c', '#b4ac9a'], rng)));
    }
  }

  // ---- instancing helpers
  const wareGeo = K.merge([K.paint(K.at(K.box(1, 1, 1), 0, 0, 0), '#ffffff'), K.paint(K.at(K.gableRoof(1, 1, 0.35, 0.04), 0, 1, 0), '#8b9096'), K.paint(K.at(K.box(0.3, 0.45, 0.02), 0, 0, 0.505), '#4a4a48')]);
  const blockGeo = (() => {
    const parts = [K.paint(K.box(1, 1, 1), '#ffffff')];
    for (let k = 0; k < 6; k++) for (const [rx, rz, ry] of [[0, 0.505, 0], [0, -0.505, Math.PI], [0.505, 0, Math.PI / 2], [-0.505, 0, -Math.PI / 2]] as const) parts.push(K.paint(K.at(K.wallPlane(0.8, 0.06), rx, 0.1 + k * 0.15, rz, { ry }), '#4e5358'));
    parts.push(K.paint(K.at(K.box(1.04, 0.04, 1.04), 0, 1, 0), '#8a8278'));
    return K.merge(parts);
  })();
  const treeGeo = K.merge([K.paint(K.cyl(0.05, 0.07, 0.5, 5), '#5b4532'), K.paint(K.wobble(K.at(K.sphere(0.45, 9, 7), 0, 0.85, 0), 0.08, 2, 4), '#ffffff')]);
  const mat = (o: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ roughness: 0.85, vertexColors: true, ...o });
  const groups: { mesh: THREE.InstancedMesh; items: Item[]; mode: 'up' | 'flat' | 'shrink'; set: ReturnType<typeof K.instanceSetter> }[] = [];
  const add = (geo: THREE.BufferGeometry, items: Item[], mode: 'up' | 'flat' | 'shrink', m: THREE.Material, shadow = true) => {
    if (!geo.getAttribute('color')) K.paint(geo, '#ffffff');
    const mesh = K.instanced(geo, m, items.length, (i, _o, c) => { c.copy(items[i].col); }, { castShadow: shadow });
    root.add(mesh);
    groups.push({ mesh, items, mode, set: K.instanceSetter(mesh) });
  };
  add(K.box(1, 0.012, 1), pave, 'flat', mat({ roughness: 0.95 }), false);
  add(wareGeo, ware, 'up', mat());
  add(blockGeo, blocks, 'up', mat());
  add(K.box(1, 1, 1), walls, 'up', mat());
  add(K.cyl(0.07, 0.1, 1, 8), chim, 'up', mat());
  add(treeGeo, trees, 'shrink', mat());
  add(K.sphere(0.035, 5, 4), flowers, 'shrink', mat({ roughness: 0.6 }), false);
  add(K.wobble(K.box(1, 1, 1), 0.05, 4, 2), stones, 'shrink', mat());
  const applyCity = (c: number) => {
    for (const gr of groups) {
      for (let i = 0; i < gr.items.length; i++) {
        const it = gr.items[i];
        if (gr.mode === 'shrink') {
          const k = 1 - K.smoothstep(it.g - 0.04, it.g, c);
          gr.set(i, it.x, it.y, it.z, it.ry, [it.sx * k, it.sy * k, it.sz * k]);
        } else {
          const k = K.smoothstep(it.g, it.g + 0.05, c);
          if (k < 0.002) gr.set(i, it.x, -1, it.z, 0, 0);
          else if (gr.mode === 'flat') gr.set(i, it.x, it.y, it.z, it.ry, [it.sx * k, it.sy, it.sz * k]);
          else gr.set(i, it.x, it.y, it.z, it.ry, [it.sx, it.sy * k, it.sz]);
        }
      }
      gr.set.done();
    }
  };

  // ---- cranes at the advancing front
  const craneGeo = K.merge([
    K.paint(K.at(K.box(0.12, 3.2, 0.12), 0, 0, 0), '#e0a52c'),
    K.paint(K.at(K.box(2.6, 0.1, 0.1), 0.7, 3.2, 0), '#e0a52c'),
    K.paint(K.at(K.box(0.3, 0.25, 0.25), -0.5, 3.0, 0), '#6b6f73'),
    K.paint(K.at(K.box(0.02, 1.2, 0.02), 1.7, 2.0, 0), '#333333'),
    K.paint(K.at(K.box(0.18, 0.12, 0.18), 1.7, 1.88, 0), '#8a8f94'),
  ]);
  const cranes = K.instanced(craneGeo, mat({ roughness: 0.6 }), 4, undefined, { colors: false });
  root.add(cranes);
  const setCrane = K.instanceSetter(cranes);
  const craneT = [-9, -3, 3, 9]; // positions along the front line

  // ---- the goatherd and his goats
  const goatGeo = K.quadruped({ len: 0.34, h: 0.26, horns: true, ears: true, tail: 0.05, color: '#ffffff' });
  const NG = 16;
  const goats = K.instanced(goatGeo, mat({ roughness: 0.9 }), NG, (_i, _o, c) => { c.set(rng.pick(['#f2efe6', '#e8e2d2', '#6a4a32', '#2e2a26', '#c9a77c', '#f2efe6'])); });
  root.add(goats);
  const setGoat = K.instanceSetter(goats);
  const goatP = Array.from({ length: NG }, () => ({ r: rng.float(0.5, 2.2), a: rng.angle(), w: rng.float(0.05, 0.14) * rng.sign(), ph: rng.angle() }));
  const herd = new THREE.Group();
  const hb = new K.Batch();
  hb.add(K.cyl(0.07, 0.11, 0.26, 8), '#6b5236', 'cloth');
  hb.add(K.at(K.sphere(0.065, 8, 6), 0, 0.3, 0), '#e2b994', 'matte');
  hb.add(K.at(K.cone(0.09, 0.07, 10), 0, 0.33, 0), '#5a4a30', 'cloth');
  hb.add(K.at(K.cyl(0.11, 0.11, 0.015, 12), 0, 0.33, 0), '#5a4a30', 'cloth');
  hb.add(K.strut([0.12, 0, 0.05], [0.14, 0.48, 0.02], 0.012, 5), '#7a5a3a', 'wood');
  herd.add(hb.build({ name: 'goatherd' }));
  const beard = new THREE.Mesh(K.at(K.cone(0.04, 0.09, 8), 0, 0.2, 0.045, { rx: Math.PI }), new THREE.MeshStandardMaterial({ color: '#5a3e28', roughness: 0.9 }));
  beard.position.y = 0.06;
  herd.add(beard);
  herd.position.set(GX, 0, GZ);
  herd.scale.setScalar(1.6);
  herd.rotation.y = -2.4;
  root.add(herd);
  const beardMat = beard.material as THREE.MeshStandardMaterial;

  // ---- life: smoke from the old factories, swallows over the meadow
  const smokeSrc = chim.filter((c) => c.g < C0 - 0.05).slice(0, 8).map((c) => [c.x, c.sy + 0.05, c.z] as [number, number, number]);
  if (smokeSrc.length) root.add(K.smoke({ sources: smokeSrc, perSource: 16, height: 3.5, color: '#d8d6d0', opacity: 0.35, size: [0.25, 0.8], wind: [0.3, 0.1], rng: rng.fork('smoke') }));
  const birds = new K.Flock({ count: 22, center: [4, 0, 5], radius: 8, height: 5, color: '#2b2b30', span: 0.25, speed: 0.4, rng: rng.fork('birds') });
  root.add(birds.mesh);

  const tog = new K.Toggle(0.22);
  let lastC = -1;
  const front = new THREE.Vector2(1, 1).normalize();
  return {
    root,
    env: {
      skyTop: '#5a8cc6', skyHorizon: '#e6eadb', skyBottom: '#b4bcae', skyCurve: 0.5,
      fog: '#dfe3d4', fogNear: 70, fogFar: 200,
      sunDir: [0.55, 0.62, 0.35], sunColor: '#fff0d6', sunIntensity: 2.9, sunDisc: 0.7, sunGlow: 0.7,
      hemiSky: '#c4d6e8', hemiGround: '#6d7a4c', hemiIntensity: 0.7, envIntensity: 0.7,
      clouds: 0.5, cloudColor: '#ffffff', stars: 0,
      bloomStrength: 0.3, bloomThreshold: 0.9, tiltShift: 0.45, shadowRadius: 21, vignette: 0.3, saturation: 1.05, contrast: 1.05,
    },
    camera: {
      position: [21, 15, 23], target: [1.5, 0.8, 1.5], minDistance: 3, maxDistance: 70, autoRotate: 0.25,
      views: [
        { position: [GX + 2.6, 1.3, GZ + 2.8], target: [GX - 1.5, 0.7, GZ - 2] },
        { position: [-4, 34, 10], target: [0, 0, 0] },
      ],
    },
    interaction: {
      label: 'Let the years pass',
      activeLabel: 'Remember the pasture',
      hint: 'The city spreads over every pasture; the goatherd grows old in it.',
      set: (on) => tog.set(on),
    },
    update(t, dt) {
      tog.update(dt);
      const v = tog.value;
      const c = K.lerp(C0, C1, v);
      if (Math.abs(c - lastC) > 1e-4) {
        lastC = c;
        applyCity(c);
        beardMat.color.set('#5a3e28').lerp(new THREE.Color('#eeeae2'), v);
        herd.rotation.x = 0;
        herd.scale.set(1.6, 1.6 * (1 - 0.1 * v), 1.6);
      }
      // cranes sit where the growth front is now, and swing their jibs
      const fu = Math.min(c, 0.98) * 2 * RMAX - RMAX; // distance of the front along the diagonal
      for (let i = 0; i < 4; i++) {
        const along = craneT[i];
        const x = front.x * (fu + 1.2) - front.y * along, z = front.y * (fu + 1.2) + front.x * along;
        const vis = Math.hypot(x, z) < RMAX - 1 && c < 1.0 ? 1 : 0;
        setCrane(i, x, 0, z, t * 0.25 * (i % 2 ? 1 : -1) + i, vis);
      }
      setCrane.done();
      // goats graze, wandering around the goatherd
      for (let i = 0; i < NG; i++) {
        const g = goatP[i];
        const a = g.a + t * g.w;
        const r = g.r * 1.25 * (1 - 0.35 * v) + Math.sin(t * 0.3 + g.ph) * 0.2;
        const x = GX + Math.cos(a) * r, z = GZ + Math.sin(a) * r;
        const bob = Math.max(0, Math.sin(t * 1.1 + g.ph)) * 0.25;
        setGoat(i, x, 0, z, -a + (g.w > 0 ? 0 : Math.PI), 1.35, bob);
      }
      setGoat.done();
      birds.update(t);
    },
  };
};

export default build;
