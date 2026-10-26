// DIOMIRA - Cities & Memory 1.
// Sixty silver domes, bronze statues of all the gods, streets paved with lead,
// a crystal theatre, a golden cock that crows on a tower. On a September evening
// the coloured lamps above the food stalls light all at once, and a woman's cry
// rises from a terrace: the traveller envies those who believe they have lived
// an evening identical to this one. Toggle: the remembered evening, a golden
// ghost of the same city superimposed on the present one.

import * as THREE from 'three';
import * as K from '../kit';
import type { CityBuilder } from '../core/types';

const build: CityBuilder = (ctx) => {
  const rng = ctx.rng;
  const root = new THREE.Group();
  const city = new THREE.Group();
  root.add(city);

  // ---- ground: a floating island of pale stone
  const isl = K.island({ radius: 17, flat: 14.5, depth: 11, top: '#c9b796', edge: '#b39d78', cliff: '#9a876c', under: '#4d4038', strata: '#b8a07a', seed: 4 });
  root.add(isl.mesh);
  root.add(K.cloudSea({ y: -9, color: '#f0c9a4', shadow: '#7a6378', opacity: 0.75, coverage: 0.5 }));

  const b = new K.Batch();

  // ---- streets paved with lead: three ring streets + eight avenues
  const LEAD = '#5d6268';
  for (const r of [4.6, 8.6, 12.4]) b.add(K.at(K.ring(r - 0.5, r + 0.5, 96), 0, 0.012, 0), LEAD, 'metal');
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    b.add(K.at(K.box(0.9, 0.02, 10), Math.cos(a) * 9, 0, Math.sin(a) * 9, { ry: -a + Math.PI / 2 }), LEAD, 'metal');
  }
  b.add(K.at(K.disc(3.9, 64), 0, 0.011, 0), '#6a6f74', 'metal'); // the leaden plaza

  // ---- houses in the ring blocks; sixty of them carry silver domes
  const walls = ['#efe2c8', '#e6d2ae', '#f3e9d6', '#dcc39c', '#e9d7b9'];
  const avenue = (a: number) => {
    for (let i = 0; i < 8; i++) {
      const aa = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const d = Math.abs(((a - aa + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (d < 0.09) return true;
    }
    return false;
  };
  const houses: { x: number; z: number; w: number; d: number; h: number; ry: number }[] = [];
  for (const [r0, r1, n] of [[5.4, 7.8, 46], [9.4, 11.6, 64], [13.2, 14.6, 70]] as const) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rng.float(-0.01, 0.01);
      if (avenue(a)) continue;
      const r = rng.float(r0 + 0.3, r1 - 0.3);
      const w = rng.float(0.7, 1.05);
      houses.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, w, d: rng.float(0.8, 1.3), h: rng.float(0.9, 2.1) * (r0 < 6 ? 1.25 : 1), ry: -a + Math.PI / 2 });
    }
  }
  rng.shuffle(houses);
  const domed = new Set(houses.slice(0, 60));
  for (const h of houses) {
    const isDomed = domed.has(h);
    K.house(b, {
      x: h.x, z: h.z, ry: h.ry, w: h.w, d: h.d, h: h.h,
      roof: isDomed ? 'none' : rng.pick(['flat', 'flat', 'hip'] as const),
      wall: rng.pick(walls), roofColor: '#b0704e', lit: 0.28, glow: 1.7, rng,
    });
    if (isDomed) {
      const r = Math.min(h.w, h.d) * 0.48;
      b.add(K.at(K.cyl(r, r, 0.18, 18), h.x, h.h, h.z), '#e4d6bb', 'plaster');
      b.add(K.at(K.dome(r, 20, 1, 1.15), h.x, h.h + 0.18, h.z), '#dfe4ea', 'silver');
      b.add(K.at(K.cone(0.05, 0.3, 6), h.x, h.h + 0.18 + r * 1.15, h.z), '#dfe4ea', 'silver');
    }
  }

  // ---- the crystal theatre at the centre: stepped tiers of glass in a horseshoe
  for (let tier = 0; tier < 6; tier++) {
    const r0 = 1.2 + tier * 0.38;
    const seat = new THREE.RingGeometry(r0, r0 + 0.36, 48, 1, Math.PI * 0.15, Math.PI * 1.7).rotateX(-Math.PI / 2);
    b.add(K.at(seat, 0, 0.2 + tier * 0.2, 0), '#cfeaf2', 'glass');
    const riser = new THREE.CylinderGeometry(r0 + 0.36, r0 + 0.36, 0.2, 48, 1, true, Math.PI * 0.15 + Math.PI / 2, Math.PI * 1.7);
    b.add(K.at(riser, 0, 0.1 + tier * 0.2, 0), '#bfe3ee', 'glass');
  }
  b.add(K.at(K.cyl(1.0, 1.0, 0.2, 32), 0, 0, 0), '#e9f6fa', 'polished'); // the stage
  // crystal colonnade ring and a glass canopy
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    b.add(K.at(K.ngon(0.07, 2.4, 6), Math.cos(a) * 3.65, 0, Math.sin(a) * 3.65), '#d8f1f7', 'glass');
  }
  b.add(K.at(K.torus(3.65, 0.08, 6, 64), 0, 2.45, 0), '#e8f7fb', 'glass');
  b.add(K.at(K.dome(3.7, 40, 0.55, 0.45), 0, 2.4, 0), '#d6eef5', 'glass');

  // ---- bronze statues of the gods around the plaza
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + 0.13;
    K.statue(b, { x: Math.cos(a) * 4.25, z: Math.sin(a) * 4.25, ry: -a - Math.PI / 2, h: rng.float(0.9, 1.25), color: '#8d5f34', finish: 'bronze', plinthColor: '#d8ccb6' });
  }

  // ---- the tower with the golden cock
  const TX = 7.2, TZ = -6.1;
  K.tower(b, { x: TX, z: TZ, r: 0.75, h: 10.5, sides: 4, top: 'flat', color: '#dccaa6', topColor: '#cdb791', bands: 2.6, bandColor: '#c8b28a', rng, lit: 0.4 });
  b.add(K.at(K.box(1.5, 0.9, 1.5), TX, 10.5, TZ), '#e3d3b3', 'stone');
  b.add(K.at(K.pyramid(1.7, 1.7, 1.4), TX, 11.4, TZ), '#7d8a8f', 'silver');
  b.add(K.at(K.cyl(0.03, 0.03, 1.2, 6), TX, 12.8, TZ), '#c9a24c', 'gold');

  // ---- food stalls along the middle ring (their lamps light all at once)
  const stallAngles: number[] = [];
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2 + 0.05;
    if (avenue(a)) continue;
    stallAngles.push(a);
    K.stall(b, { x: Math.cos(a) * 9.35, z: Math.sin(a) * 9.35, ry: -a + Math.PI / 2, w: 0.8, d: 0.5, h: 0.55, cloth: rng.pick(['#a8432f', '#2f5d7a', '#c58b2c', '#6b3f6f', '#3f6b4a']) });
  }

  // ---- trees and plants on the outer rim
  K.forest(b, { n: 40, r0: 14.8, r1: 16.2, rng, kinds: ['cypress', 'cypress', 'olive'], h: [1.2, 2.4] });

  city.add(b.build({ name: 'diomira' }));

  // the golden cock: a little weathervane rooster that turns in the wind
  const cock = new THREE.Group();
  const cb = new K.Batch();
  cb.add(K.at(K.sphere(0.32, 12, 8), 0, 0, 0, { s: [0.75, 0.8, 1.2] }), '#e7b84f', 'gold');
  cb.add(K.at(K.sphere(0.16, 10, 8), 0, 0.38, 0.32), '#e7b84f', 'gold');
  cb.add(K.at(K.cone(0.06, 0.16, 6), 0, 0.33, 0.5, { rx: Math.PI / 2 }), '#e7b84f', 'gold');
  for (let i = 0; i < 5; i++) cb.add(K.at(K.box(0.03, 0.12 + i * 0.02, 0.07), 0, 0.5 + Math.sin(i) * 0.02, 0.24 + i * 0.05), '#d9543a', 'ceramic');
  for (let i = 0; i < 7; i++) {
    const g = K.box(0.04, 0.55, 0.12);
    K.at(g, 0, 0, 0, { rx: -0.9 + i * 0.2 });
    cb.add(K.at(g, 0, 0.05, -0.32), '#e7b84f', 'gold');
  }
  cb.add(K.at(K.cyl(0.02, 0.02, 0.35, 5), 0, -0.45, 0), '#e7b84f', 'gold');
  cock.add(cb.build({ castShadow: true }));
  cock.position.set(TX, 13.75, TZ);
  cock.scale.setScalar(1.25);
  root.add(cock);
  const cockGlow = K.glowSprite('#ffd27a', 3.2, 0.35);
  cockGlow.position.set(TX, 13.8, TZ);
  root.add(cockGlow);

  // ---- multicoloured lamps above the stall doors (one InstancedMesh + halos)
  const LAMP_COLORS = ['#ff5f4a', '#ffc04a', '#58d0ff', '#9cff6a', '#ff7ad6', '#ffe9a8'];
  const lampPos: THREE.Vector3[] = [];
  const lampCol: string[] = [];
  for (const a of stallAngles) {
    for (const off of [-0.25, 0.25]) {
      const r = 9.35 - 0.4;
      const p = new THREE.Vector3(Math.cos(a + off * 0.05) * r, 0.9, Math.sin(a + off * 0.05) * r);
      lampPos.push(p);
      lampCol.push(LAMP_COLORS[lampPos.length % LAMP_COLORS.length]);
    }
  }
  // strings of lamps across the avenues too
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    for (let k = 0; k < 7; k++) {
      const r = 5.2 + k * 1.1;
      lampPos.push(new THREE.Vector3(Math.cos(a) * r, 1.6 + Math.sin(k) * 0.1, Math.sin(a) * r));
      lampCol.push(LAMP_COLORS[(i + k) % LAMP_COLORS.length]);
    }
  }
  const lampMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const lamps = K.instanced(K.sphere(0.075, 8, 6), lampMat, lampPos.length, (i, o, c) => {
    o.position.copy(lampPos[i]);
    c.set(lampCol[i]);
  }, { castShadow: false, receiveShadow: false });
  root.add(lamps);
  const halos = K.glowPoints(lampPos, '#ffffff', 0.9, 0.0, lampCol);
  root.add(halos);
  const lampLight = new THREE.PointLight('#ffb36b', 0, 26, 1.6);
  lampLight.position.set(0, 3, 0);
  root.add(lampLight);

  // ---- people strolling on the lead streets
  const paths: THREE.Vector3[][] = [];
  for (const r of [4.6, 8.6, 12.4]) {
    const p: THREE.Vector3[] = [];
    for (let i = 0; i <= 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      p.push(new THREE.Vector3(Math.cos(a) * r, 0.02, Math.sin(a) * r));
    }
    paths.push(p);
  }
  const walkers = new K.Walkers({ paths, count: 140, closed: true, rng: rng.fork('walk'), speed: [0.18, 0.4], colors: ['#6d2f2a', '#2e4a6b', '#d8c7a5', '#3c3a36', '#8a5a2b', '#5a3b5e'] });
  root.add(walkers.mesh);

  // ---- the woman on a terrace whose cry rises over the city
  const terrace = houses.find((h) => Math.hypot(h.x, h.z) > 9.5 && Math.hypot(h.x, h.z) < 11.6 && h.z > 2) ?? houses[0];
  const woman = K.crowd({ count: 1, place: () => [terrace.x, terrace.h + 0.08, terrace.z], colors: ['#f2ead8'], h: 0.3 });
  root.add(woman);
  const cryRings: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const ringMesh = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 4, 64), new THREE.MeshBasicMaterial({ color: '#fff2d6', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    ringMesh.position.set(terrace.x, terrace.h + 0.35, terrace.z);
    ringMesh.rotation.x = Math.PI / 2;
    root.add(ringMesh);
    cryRings.push(ringMesh);
  }

  // ---- the remembered evening: a golden ghost of the same city, slightly displaced
  const ghost = new THREE.Group();
  const ghostMat = new THREE.MeshBasicMaterial({ color: '#ffcf8a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  city.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      const gm = new THREE.Mesh(m.geometry, ghostMat);
      gm.matrixAutoUpdate = false;
      gm.matrix.copy(m.matrixWorld);
      ghost.add(gm);
    }
  });
  ghost.visible = false;
  root.add(ghost);
  const remember = new K.Toggle(0.5);

  // ---- warm fireflies of dust in the evening air
  root.add(K.particles({ count: 260, radius: 16, y0: 0.5, y1: 9, color: '#ffd9a0', size: 0.06, opacity: 0.55, swirl: 0.6, twinkle: 0.8, rng: rng.fork('motes') }));

  const LIGHT_UP = 3.2;
  return {
    root,
    env: {
      skyTop: '#27305a',
      skyHorizon: '#f0b386',
      skyBottom: '#5b4a62',
      skyCurve: 0.45,
      fog: '#d9a088',
      fogNear: 75,
      fogFar: 240,
      sunDir: [-0.85, 0.16, 0.35],
      sunColor: '#ffb27a',
      sunIntensity: 2.4,
      sunDisc: 1,
      sunGlow: 1.3,
      hemiSky: '#8a8fc0',
      hemiGround: '#6b5045',
      hemiIntensity: 0.6,
      envIntensity: 0.75,
      stars: 0.25,
      clouds: 0.35,
      cloudColor: '#f7c9a4',
      bloomStrength: 0.7,
      bloomThreshold: 0.8,
      bloomRadius: 0.55,
      tiltShift: 0.5,
      shadowRadius: 20,
      vignette: 0.4,
      saturation: 1.08,
    },
    camera: {
      position: [25, 16.5, 29],
      target: [1.2, 3.4, -1.2],
      minDistance: 9,
      maxDistance: 70,
      autoRotate: 0.3,
      views: [
        { position: [-14, 26, -8], target: [0, 1, 0] },
        { position: [10.5, 3.2, 3.5], target: [4.5, 2.2, -4] },
      ],
    },
    interaction: {
      label: 'Remember this evening',
      activeLabel: 'Return to the present',
      hint: 'An evening identical to this one, lived before.',
      set: (on) => remember.set(on),
    },
    update(t, dt) {
      // the weathervane cock turns slowly
      cock.rotation.y = Math.sin(t * 0.21) * 1.2 + t * 0.05;
      // all lamps light at the same instant
      const on = K.smoothstep(LIGHT_UP, LIGHT_UP + 0.25, t);
      const flare = Math.exp(-Math.max(0, t - LIGHT_UP) * 1.5) * on;
      lampMat.color.setScalar(0.15 + on * 3.2 + flare * 2.5);
      (halos.material as THREE.PointsMaterial).opacity = on * 0.85 + flare * 0.3;
      lampLight.intensity = on * 14;
      // the cry: rings spreading from the terrace every 11 seconds
      const cycle = (t - LIGHT_UP - 1.2) % 11;
      cryRings.forEach((r, i) => {
        const k = cycle - i * 0.35;
        const vis = t > LIGHT_UP + 1.2 && k > 0 && k < 3;
        const s = 0.2 + Math.max(0, k) * 2.2;
        r.scale.set(s, s, s);
        (r.material as THREE.MeshBasicMaterial).opacity = vis ? (1 - k / 3) * 0.28 : 0;
      });
      walkers.update(t);
      remember.update(dt);
      const g = remember.value;
      ghost.visible = g > 0.001;
      ghostMat.opacity = g * (0.07 + 0.025 * Math.sin(t * 2.3));
      ghost.position.set(Math.sin(t * 0.4) * 0.15 * g, 0.35 * g, Math.cos(t * 0.33) * 0.15 * g);
      ghost.rotation.y = 0.035 * g;
    },
  };
};

export default build;
