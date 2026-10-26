// VENICE - the city Marco Polo never names, because it is implicit in all the
// others. A lagoon at dawn: San Marco's five domes, the campanile, the Doge's
// palace, the Salute, the Rialto, gondolas and mooring poles; over the water
// fifty-five small lights circle slowly, one for each city he described.

import * as THREE from 'three';
import * as K from '../kit';
import type { CityBuilder, CityMeta } from '../core/types';
import { FRAME } from '../data/frame';

export const VENICE: CityMeta = {
  id: 'venice',
  name: 'Venice',
  order: 0,
  chapter: 0,
  series: 'memory',
  number: 0,
  get caption() {
    return FRAME.veniceNote;
  },
  motto: 'The first city, from which every other is told.',
};
import { CITIES } from '../data/cities';
import { SERIES_BY_ID } from '../data/series';

const build: CityBuilder = (ctx) => {
  const rng = ctx.rng;
  const root = new THREE.Group();

  // ---- the lagoon
  root.add(K.waterDisc(160, 0, { color: '#4f6a70', roughness: 0.16, amp: 0.1, scale: 0.16, speed: 0.18, envMapIntensity: 1.0 }, 128));
  root.add(K.cloudSea({ y: 0.35, radius: 120, color: '#f4e6dc', shadow: '#b9a6ad', opacity: 0.32, coverage: 0.42, scale: 0.06, speed: 0.008 }));

  const b = new K.Batch();
  const walls = ['#e9c9a8', '#dca98d', '#e4d2b4', '#c98f74', '#efe1c8', '#d9b48f', '#b8775f'];
  const WATER_STONE = '#cfc3ad';

  // islands (insulae) cut by the Grand Canal, an S-curve from north-west to south-east
  const canal = (x: number) => Math.sin(x * 0.18) * 4.2 - x * 0.12;
  const onCanal = (x: number, z: number) => Math.abs(z - canal(x)) < 1.6;
  const inCity = (x: number, z: number) => Math.hypot(x * 0.8, z) < 15 && z > -10.5;
  const lots: { x: number; z: number; w: number; d: number; h: number }[] = [];
  for (let x = -17; x <= 17; x += 1.15) {
    for (let z = -11; z <= 12; z += 1.25) {
      const jx = x + rng.float(-0.12, 0.12), jz = z + rng.float(-0.12, 0.12);
      if (!inCity(jx, jz) || onCanal(jx, jz)) continue;
      if (rng.chance(0.16)) continue; // campi and small rii
      if (Math.abs(((jx + 40) % 5.75) - 2.9) < 0.3 && Math.abs(jz - canal(jx)) > 3) continue; // narrow rii crossing the islands
      if (Math.hypot(jx - 1.5, jz - 7.5) < 3.3) continue; // piazza San Marco
      if (Math.hypot(jx + 6, jz + 4.5) < 2.4) continue; // the Salute's place
      lots.push({ x: jx, z: jz, w: rng.float(0.8, 1.02), d: rng.float(0.9, 1.15), h: rng.float(1.2, 2.9) * (Math.abs(jz - canal(jx)) < 2.9 ? 1.25 : 1) });
    }
  }
  // the city platform (fondamenta) just above the water
  for (const l of lots) b.add(K.at(K.box(l.w + 0.25, 0.22, l.d + 0.25), l.x, -0.05, l.z), WATER_STONE, 'stone');
  for (const l of lots) {
    const canalSide = Math.abs(l.z - canal(l.x)) < 2.5;
    if (canalSide && rng.chance(0.75)) {
      // a palazzo on the Grand Canal: taller, stone trim, a row of glowing Gothic arches
      const h = rng.float(2.2, 3.2);
      const wall = rng.pick(['#e7b9a2', '#efd9bf', '#d99c86', '#e9cfae', '#c98a73']);
      b.add(K.at(K.box(l.w, h, l.d), l.x, 0.17, l.z), wall, 'plaster');
      b.add(K.at(K.box(l.w + 0.08, 0.08, l.d + 0.08), l.x, 0.17 + h, l.z), '#f1e9dc', 'stone');
      b.add(K.at(K.box(l.w + 0.05, 0.06, l.d + 0.05), l.x, 0.17 + h * 0.36, l.z), '#f1e9dc', 'stone');
      const face = l.z > canal(l.x) ? -1 : 1; // facade towards the canal
      for (let k = 0; k < 3; k++) {
        const wx = l.x - l.w / 2 + (k + 0.5) * (l.w / 3);
        for (const [y0, hh] of [[0.17 + h * 0.42, h * 0.22], [0.17 + h * 0.7, h * 0.18]] as const) {
          const win = K.wallPlane(l.w / 3 * 0.55, hh);
          K.at(win, 0, 0, 0, { ry: face > 0 ? 0 : Math.PI });
          const lit = rng.chance(0.45);
          b.add(K.at(win, wx, y0, l.z + face * (l.d / 2 + 0.012)), lit ? '#ffc98a' : '#3a2c26', lit ? 'glow' : 'matte', lit ? 1.7 : 1);
        }
      }
      b.add(K.at(K.box(l.w * 0.9, 0.04, 0.16), l.x, 0.17 + h * 0.42, l.z + face * (l.d / 2 + 0.08)), '#f1e9dc', 'stone'); // balcony
      continue;
    }
    K.house(b, {
      x: l.x, z: l.z, w: l.w, d: l.d, h: l.h, y: 0.17,
      roof: rng.pick(['hip', 'gable', 'flat'] as const), roofH: 0.32, wall: rng.pick(walls), roofColor: rng.pick(['#b2603f', '#a4553a', '#bf7350']),
      lit: 0.18, glow: 1.6, litColor: '#ffcf8f', rng, cornice: true,
    });
    // Venetian funnel chimneys
    if (rng.chance(0.55)) {
      const cx = l.x + rng.float(-0.3, 0.3), cz = l.z + rng.float(-0.3, 0.3), cy = 0.17 + l.h;
      b.add(K.at(K.cyl(0.05, 0.05, 0.45, 6), cx, cy, cz), '#b58a6e', 'stone');
      b.add(K.at(K.cyl(0.13, 0.05, 0.2, 8), cx, cy + 0.45, cz), '#b58a6e', 'stone');
    }
  }

  // ---- Piazza San Marco: the basilica's five domes, the campanile, the Doge's palace, the two columns
  const SM = { x: 1.5, z: 6.8 };
  b.add(K.at(K.box(6.4, 0.06, 5.2), SM.x, 0.12, SM.z + 0.6), '#d9cdb8', 'stone'); // pavement
  b.add(K.at(K.box(3.2, 1.9, 2.6), SM.x, 0.17, SM.z - 2.3), '#e6d6bd', 'plaster');
  b.add(K.at(K.box(3.6, 0.3, 0.12), SM.x, 1.6, SM.z - 0.98), '#e9c66d', 'gold'); // mosaic band
  for (const [dx, dz, r] of [[0, 0, 0.62], [-1.1, 0, 0.45], [1.1, 0, 0.45], [0, -0.95, 0.45], [0, 0.95, 0.45]] as const) {
    const x = SM.x + dx, z = SM.z - 2.3 + dz;
    b.add(K.at(K.cyl(r * 0.9, r * 0.9, 0.25, 16), x, 2.07, z), '#e6d6bd', 'plaster');
    b.add(K.at(K.onion(r, r * 1.6, 18), x, 2.32, z), '#8fa49a', 'metal');
    b.add(K.at(K.cyl(0.02, 0.02, 0.3, 4), x, 2.32 + r * 1.55, z), '#e8c46a', 'gold');
  }
  for (let i = 0; i < 5; i++) {
    const g = K.archWall(0.58, 1.1, 0.1, 0.42, 0.95);
    b.add(K.at(g, SM.x - 1.2 + i * 0.6, 0.17, SM.z - 0.95), '#efe2cb', 'stone');
    b.add(K.at(K.wallPlane(0.36, 0.5), SM.x - 1.2 + i * 0.6, 0.62, SM.z - 0.99), '#f2c25d', 'glow', 1.6);
  }
  // campanile: brick shaft, white belfry, green pyramid, golden angel
  const CX = SM.x + 2.4, CZ = SM.z - 0.3;
  b.add(K.at(K.box(0.85, 6.4, 0.85), CX, 0.17, CZ), '#b3644b', 'stone');
  b.add(K.at(K.box(0.95, 0.9, 0.95), CX, 6.57, CZ), '#ece0c8', 'stone');
  b.add(K.at(K.box(1.0, 0.5, 1.0), CX, 7.47, CZ), '#e5d7bd', 'stone');
  b.add(K.at(K.pyramid(0.9, 0.9, 2.0), CX, 7.97, CZ), '#7fa392', 'metal');
  b.add(K.at(K.sphere(0.09, 8, 6), CX, 10.05, CZ), '#f0c45e', 'gold');
  // Doge's palace: pink and white, arcades below, loggia above
  const DX = SM.x + 1.7, DZ = SM.z + 2.9;
  b.add(K.at(K.box(4.4, 1.15, 1.9), DX, 1.37, DZ), '#e8b7a7', 'plaster');
  for (let i = 0; i < 9; i++) {
    b.add(K.at(K.archWall(0.49, 0.6, 0.12, 0.34, 0.5), DX - 1.96 + i * 0.49, 0.17, DZ + 0.92), '#f1e8da', 'stone');
    b.add(K.at(K.archWall(0.49, 0.6, 0.12, 0.26, 0.48), DX - 1.96 + i * 0.49, 0.77, DZ + 0.92), '#f1e8da', 'stone');
  }
  b.add(K.at(K.box(4.4, 1.2, 1.7), DX, 0.17, DZ), '#f0e4d2', 'stone');
  for (let i = 0; i < 14; i++) b.add(K.at(K.box(0.12, 0.16, 0.12), DX - 2.1 + i * 0.32, 2.52, DZ + 0.9), '#f1e8da', 'stone');
  // the two columns of the Piazzetta
  for (const [x, z] of [[SM.x - 0.6, SM.z + 4.6], [SM.x + 0.6, SM.z + 4.6]] as const) {
    K.column(b, { x, z, y: 0.17, h: 2.6, r: 0.12, color: '#d9cfc0' });
    b.add(K.at(K.box(0.3, 0.22, 0.42), x, 2.77, z), '#8a6a3a', 'bronze');
  }

  // ---- Santa Maria della Salute across the canal: octagon, great dome, volutes
  const SAL = { x: -6, z: -4.5 };
  b.add(K.at(K.ngon(1.7, 1.6, 8), SAL.x, 0.17, SAL.z), '#f0e7d6', 'stone');
  b.add(K.at(K.cyl(1.25, 1.3, 0.7, 24), SAL.x, 1.77, SAL.z), '#f0e7d6', 'stone');
  b.add(K.at(K.dome(1.3, 28, 1, 1.15), SAL.x, 2.47, SAL.z), '#e3ddd2', 'stone');
  b.add(K.at(K.cyl(0.25, 0.3, 0.5, 10), SAL.x, 3.95, SAL.z), '#f0e7d6', 'stone');
  b.add(K.at(K.onion(0.25, 0.5, 10), SAL.x, 4.45, SAL.z), '#d8d0c2', 'stone');
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    b.add(K.at(K.sphere(0.24, 8, 6), SAL.x + Math.cos(a) * 1.45, 1.85, SAL.z + Math.sin(a) * 1.45, { s: [0.7, 1, 0.7] }), '#e9e1d3', 'stone');
  }
  b.add(K.at(K.stairs(5, 2.4, 0.06, 0.18), SAL.x + 0.6, 0.11, SAL.z + 1.7, { ry: 0.6 }), '#e9e1d3', 'stone');

  // ---- the Rialto: a covered stone arch over the Grand Canal
  const RX = 4.5, RZ = canal(4.5);
  K.bridge(b, { from: [RX, 0.17, RZ - 2.2], to: [RX, 0.17, RZ + 2.2], width: 1.4, hump: 0.75, rise: 0.4, color: '#efe6d6' });
  b.add(K.at(K.box(0.9, 0.45, 1.2), RX, 0.95, RZ), '#efe6d6', 'stone');
  b.add(K.at(K.gableRoof(0.9, 1.25, 0.3), RX, 1.4, RZ, { ry: Math.PI / 2 }), '#b2603f', 'ceramic');

  // ---- San Giorgio Maggiore on its island across the basin
  const SG = { x: -11, z: 17 };
  b.add(K.at(K.box(6.5, 0.3, 4.2), SG.x, -0.1, SG.z), WATER_STONE, 'stone');
  b.add(K.at(K.box(3.2, 1.7, 2.2), SG.x - 0.6, 0.2, SG.z), '#f2ece2', 'stone');
  b.add(K.at(K.gableRoof(2.2, 3.2, 0.6), SG.x - 0.6, 1.9, SG.z, { ry: Math.PI / 2 }), '#f2ece2', 'stone');
  b.add(K.at(K.cyl(0.75, 0.78, 0.5, 20), SG.x + 0.4, 1.9, SG.z - 0.3), '#f2ece2', 'stone');
  b.add(K.at(K.dome(0.78, 22, 1, 1.2), SG.x + 0.4, 2.4, SG.z - 0.3), '#e6e0d6', 'stone');
  b.add(K.at(K.box(0.55, 4.2, 0.55), SG.x + 2.1, 0.2, SG.z + 0.6), '#c98a73', 'stone');
  b.add(K.at(K.cone(0.42, 1.3, 8), SG.x + 2.1, 4.4, SG.z + 0.6), '#7fa392', 'metal');
  for (let i = 0; i < 4; i++) b.add(K.at(K.ngon(0.07, 1.2, 8), SG.x - 1.9 + i * 0.42, 0.2, SG.z + 1.12), '#f7f2ea', 'stone');
  K.forest(b, { n: 8, cx: SG.x - 1.5, cz: SG.z - 1.2, r1: 1.4, rng, kinds: ['cypress'], h: [1, 1.6], y: () => 0.2 });

  // ---- bricole (clusters of mooring poles) marking the channels in the lagoon
  for (let i = 0; i < 46; i++) {
    const a = (i / 46) * Math.PI * 2;
    const r = 19 + Math.sin(i * 1.7) * 2.5;
    const x = Math.cos(a) * r, z = Math.sin(a) * r * 0.85;
    for (let k = 0; k < 3; k++) {
      const p = K.cyl(0.07, 0.08, 1.5, 6);
      b.add(K.at(p, x + Math.cos(k * 2.1) * 0.12, -0.3, z + Math.sin(k * 2.1) * 0.12, { rz: (k - 1) * 0.12 }), '#4e3b2b', 'wood');
    }
  }
  // mooring poles with stripes along the canal
  for (let x = -15; x < 15; x += 1.4) {
    for (const side of [-1, 1]) {
      const z = canal(x) + side * 1.25;
      if (!inCity(x, z)) continue;
      b.add(K.at(K.cyl(0.035, 0.035, 0.9, 5), x, -0.1, z), rng.pick(['#2d4f7a', '#b13a2e', '#e8dfcf']), 'wood');
    }
  }

  root.add(b.build({ name: 'venice' }));

  // ---- the Grand Canal water is the lagoon itself; gondolas glide along it
  const gondolaGeo = K.boatGeometry(1.0, '#141212');
  const gMat = K.std('#1a1817', { roughness: 0.35 });
  const N_G = 14;
  const gondolas = K.instanced(gondolaGeo, gMat, N_G, undefined, { castShadow: true });
  root.add(gondolas);
  const gSet = K.instanceSetter(gondolas);
  const gData = Array.from({ length: N_G }, (_, i) => ({ off: i / N_G, speed: rng.float(0.006, 0.012) * rng.sign() }));
  // a few lantern boats out in the lagoon
  const lanterns = K.glowPoints(Array.from({ length: 10 }, () => {
    const a = rng.angle(), r = rng.float(17, 26);
    return [Math.cos(a) * r, 0.5, Math.sin(a) * r] as [number, number, number];
  }), '#ffcb86', 0.9, 0.8);
  root.add(lanterns);

  // ---- fifty-five lights for the fifty-five cities, circling over the water
  const lightPos: [number, number, number][] = [];
  const lightCol: string[] = [];
  for (const c of CITIES) {
    lightPos.push([0, 0, 0]);
    lightCol.push(SERIES_BY_ID[c.series].color);
  }
  const cityLights = K.glowPoints(lightPos, '#ffffff', 2.6, 1.0, lightCol);
  root.add(cityLights);
  const cityPos = cityLights.geometry.attributes.position as THREE.BufferAttribute;
  const cityCores = K.instanced(K.sphere(0.11, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' }), CITIES.length, (i, _o, c) => {
    c.set(lightCol[i]).multiplyScalar(2.5);
  }, { castShadow: false, receiveShadow: false });
  root.add(cityCores);
  const coreSet = K.instanceSetter(cityCores);

  const gulls = new K.Flock({ count: 18, center: [0, 0, 0], radius: 12, height: 7, color: '#3b3433', span: 0.35, rng: rng.fork('gulls') });
  root.add(gulls.mesh);

  return {
    root,
    env: {
      skyTop: '#8193b0',
      skyHorizon: '#f2d6c4',
      skyBottom: '#c9b6b0',
      skyCurve: 0.55,
      fog: '#e9d4c6',
      fogNear: 30,
      fogFar: 150,
      sunDir: [0.9, 0.12, -0.35],
      sunColor: '#ffc9a0',
      sunIntensity: 2.2,
      sunDisc: 1,
      sunGlow: 1.4,
      hemiSky: '#bcc6dc',
      hemiGround: '#6f6a64',
      hemiIntensity: 0.65,
      envIntensity: 0.8,
      clouds: 0.3,
      cloudColor: '#f6e2d6',
      bloomStrength: 0.6,
      bloomThreshold: 0.82,
      tiltShift: 0.45,
      shadowRadius: 22,
    },
    camera: {
      position: [15, 12.5, 29],
      target: [1, 1.2, 4],
      minDistance: 8,
      maxDistance: 70,
      maxPolar: 1.42,
      autoRotate: 0.22,
    },
    update(t) {
      // gondolas along the Grand Canal
      for (let i = 0; i < N_G; i++) {
        const d = gData[i];
        const u = (((d.off + t * d.speed) % 1) + 1) % 1;
        const x = -16 + u * 32;
        const z = canal(x) + (i % 2 ? 0.45 : -0.45);
        const dz = Math.cos(x * 0.18) * 4.2 * 0.18 - 0.12;
        const dir = d.speed > 0 ? 1 : -1;
        const ry = Math.atan2(dir, dir * dz);
        gSet(i, x, 0.05 + Math.sin(t * 1.3 + i) * 0.02, z, ry, 1, 0, Math.sin(t * 0.9 + i) * 0.03);
      }
      gSet.done();
      // the cities circling over the lagoon in the order of narration
      for (let i = 0; i < CITIES.length; i++) {
        const a = (i / CITIES.length) * Math.PI * 2 + t * 0.02;
        const r = 21 + Math.sin(i * 2.3) * 2;
        const y = 2.5 + Math.sin(t * 0.4 + i) * 0.6 + (i % 5) * 0.35;
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        cityPos.setXYZ(i, x, y, z);
        coreSet(i, x, y, z);
      }
      cityPos.needsUpdate = true;
      coreSet.done();
      gulls.update(t);
    },
  };
};

export default build;
