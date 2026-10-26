// ANDRIA - Cities & the Sky 5.
// Every street of Andria runs along the orbit of a planet, with the sun at one
// focus of its ellipse, and every building repeats a constellation: the tallest
// towers stand where the brightest stars shine (a red crown for Antares, gold for
// Capella, white for Alpheratz), and the lamp of the Cepheid house pulses with
// its variable star. Above each street its planet keeps pace with the carriages.
// The citizens change the city freely, and the sky changes with it. Toggle:
// raise a new tower, and a new star blazes into the firmament above it.

import * as THREE from 'three';
import * as K from '../kit';
import type { CityBuilder } from '../core/types';

const SKY_Y = 13.5;
const ORBITS = [3.0, 4.7, 6.4, 8.1, 9.8, 11.5, 13.2];
const PLANETS = ['#d9c2a0', '#f2d9a8', '#7fb3e0', '#e0704a', '#e8c088', '#ead6a6', '#9fd8d6'];
// constellations: [x, z, magnitude 0..1] around an anchor (angle, radius)
const CONS: { a: number; r: number; rot: number; stars: [number, number, number][]; crown?: string; cepheid?: number }[] = [
  { a: 0.3, r: 9.2, rot: 0.4, crown: '#ff5a3a', stars: [[0, 0, 1], [-0.7, 0.7, 0.5], [-1.2, 1.3, 0.45], [0.7, -0.6, 0.55], [1.1, -1.5, 0.5], [0.9, -2.4, 0.45], [0.2, -2.9, 0.4], [-0.6, -2.8, 0.5], [-1.1, -2.2, 0.45]] }, // the scorpion
  { a: 1.35, r: 9.6, rot: 1.2, crown: '#f2f5ff', stars: [[0, 0, 1], [1.2, 0.3, 0.6], [2.4, 0.9, 0.65], [3.3, 1.8, 0.55], [1.3, 1.4, 0.4], [2.2, -0.6, 0.4]] }, // the chained maiden
  { a: 2.4, r: 8.4, rot: 2.0, crown: '#ffd36a', stars: [[0, 0, 1], [1.4, 0.2, 0.55], [1.6, 1.6, 0.5], [0.4, 2.2, 0.45], [-0.6, 1.2, 0.5]] }, // the charioteer
  { a: 3.3, r: 9.8, rot: 0.6, cepheid: 4, stars: [[0, 0, 0.6], [1.1, 0.5, 0.55], [1.9, -0.4, 0.5], [1.0, -1.2, 0.5], [0.1, -0.9, 0.55]] }, // the king, with his variable star
  { a: 4.25, r: 8.8, rot: 1.6, stars: [[0, 0, 0.8], [1.0, 0.8, 0.6], [2.0, 0.1, 0.7], [3.0, 0.9, 0.6], [4.0, 0.2, 0.55]] }, // the queen's chair
  { a: 5.25, r: 9.4, rot: 2.6, stars: [[0, 0, 0.85], [1.0, 0.1, 0.7], [1.9, 0.5, 0.65], [2.7, 0.2, 0.6], [3.0, 1.2, 0.6], [4.1, 1.3, 0.6], [4.2, 0.2, 0.55]] }, // the bear
];

const build: CityBuilder = (ctx) => {
  const rng = ctx.rng;
  const root = new THREE.Group();
  const isl = K.island({ radius: 15.6, flat: 14.4, depth: 7.5, top: '#6d7a6a', edge: '#5f6a5c', cliff: '#4a4f48', under: '#1c2428', strata: '#5a6152', seed: 55, hills: 0.15 });
  root.add(isl.mesh);
  root.add(K.cloudSea({ y: -6.5, color: '#2c5d63', shadow: '#0a1a20', opacity: 0.7, coverage: 0.45 }));
  const b = new K.Batch();

  // ---- the orbit streets: ellipses with the sun at a focus
  const orbit = ORBITS.map((a, i) => ({ a, e: 0.05 + (i % 3) * 0.025, w: i * 0.9 }));
  const orbitPt = (k: number, th: number, y = 0.02) => {
    const { a, e, w } = orbit[k];
    const r = (a * (1 - e * e)) / (1 + e * Math.cos(th - w));
    return new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r);
  };
  const paths: THREE.Vector3[][] = [];
  orbit.forEach((_, k) => {
    const pts = Array.from({ length: 97 }, (_, i) => orbitPt(k, (i / 96) * Math.PI * 2));
    paths.push(pts);
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i - 1], q = pts[i];
      b.add(K.at(K.box(0.55, 0.02, p.distanceTo(q) + 0.04), (p.x + q.x) / 2, 0.004 + k * 0.001, (p.z + q.z) / 2, { ry: Math.atan2(q.x - p.x, q.z - p.z) }), '#b7a98e', 'stone');
    }
  });
  const nearStreet = (x: number, z: number, d: number) => {
    const th = Math.atan2(z, x), r = Math.hypot(x, z);
    return orbit.some((_, k) => Math.abs(orbitPt(k, th).length() - r) < d);
  };

  // ---- the sun at the focus: a golden rotunda
  b.add(K.at(K.cyl(1.9, 2.0, 0.2, 48), 0, 0, 0), '#d8cdb0', 'stone');
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; K.column(b, { x: Math.cos(a) * 1.55, y: 0.2, z: Math.sin(a) * 1.55, h: 1.6, r: 0.09, color: '#e8dfc8' }); }
  b.add(K.at(K.cyl(1.7, 1.7, 0.2, 40), 0, 1.8, 0), '#e2d8bf', 'stone');
  b.add(K.at(K.dome(1.6, 32), 0, 2.0, 0), '#e2b552', 'gold');
  b.add(K.at(K.sphere(0.35, 16, 12), 0, 3.85, 0), '#ffd27a', 'glow', 3);

  // ---- buildings that repeat the constellations; their crowns are the stars below the stars
  const crowns: THREE.Vector3[] = [], crownCols: string[] = [];
  const skyStars: THREE.Vector3[] = [], skyCols: string[] = [];
  const pairs: [THREE.Vector3, THREE.Vector3][] = [];
  let cepheid = new THREE.Vector3();
  const copper = ['#5f9f8a', '#4f8f7f', '#6aab92'];
  const walls = ['#c98a63', '#d19b72', '#b9785a', '#d8ae86', '#c48f6e'];
  const taken: [number, number][] = [];
  CONS.forEach((c) => {
    const cx = Math.cos(c.a) * c.r, cz = Math.sin(c.a) * c.r;
    const cs = Math.cos(c.rot), sn = Math.sin(c.rot);
    const pos: THREE.Vector3[] = [];
    c.stars.forEach(([u, v, m], si) => {
      let x = cx + (u * cs - v * sn) * 1.15, z = cz + (u * sn + v * cs) * 1.15;
      // nudge off the streets, keeping the figure
      for (let k = 0; k < 8 && nearStreet(x, z, 0.75); k++) { const s = 1 + (k % 2 ? 0.035 : -0.03) * (k + 1); x *= s; z *= s; }
      const h = 1.2 + m * m * 5.2;
      const ry = rng.angle();
      const wcol = K.pickJitter(walls, rng);
      if (m > 0.9) {
        K.tower(b, { x, z, r: 0.45, h, sides: 8, top: 'dome', topH: 0.6, color: wcol, topColor: '#4f8f7f', topFinish: 'metal', bands: 1.2, bandColor: '#e6d2b0', lit: 0.35, litColor: '#ffd59a', rng });
      } else {
        K.house(b, { x, z, ry, w: 0.75, d: 0.75, h, roof: m > 0.55 ? 'dome' : 'pyramid', roofH: 0.5, wall: wcol, roofColor: K.pickJitter(copper, rng), roofFinish: 'metal', lit: 0.3, glow: 1.6, litColor: '#ffd59a', rng });
      }
      const top = new THREE.Vector3(x, h + (m > 0.9 ? 1.3 : 0.75), z);
      b.add(K.at(K.cyl(0.02, 0.02, 0.3, 5), x, top.y - 0.3, z), '#c9a24c', 'gold');
      const col = si === 0 && c.crown ? c.crown : '#fff1d0';
      crowns.push(top); crownCols.push(col);
      const s = new THREE.Vector3(x, SKY_Y + (h - 1.2) * 0.15, z);
      skyStars.push(s); skyCols.push(col);
      if (c.cepheid === si) cepheid = top;
      pos.push(s);
      taken.push([x, z]);
    });
    for (let i = 1; i < pos.length; i++) pairs.push([pos[i - 1], pos[i]]);
  });
  // ordinary houses in the bands between the orbits
  for (let k = 0; k < ORBITS.length - 1; k++) {
    const n = Math.floor(ORBITS[k] * 4.2);
    for (let i = 0; i < n; i++) {
      const th = (i / n) * Math.PI * 2 + k * 0.3;
      const p = orbitPt(k, th).lerp(orbitPt(k + 1, th), 0.5);
      if (taken.some(([x, z]) => Math.hypot(x - p.x, z - p.z) < 1.0) || rng.chance(0.18)) continue;
      K.house(b, { x: p.x, z: p.z, ry: -th + Math.PI / 2, w: 0.7, d: 0.65, h: rng.float(0.5, 0.95), roof: 'hip', wall: K.pickJitter(walls, rng), roofColor: K.pickJitter(['#8a4a3a', '#7a4234', '#94563e'], rng), lit: 0.22, glow: 1.5, litColor: '#ffcf8a', rng });
    }
  }
  K.forest(b, { n: 36, r0: 13.9, r1: 15, rng, kinds: ['cypress', 'round', 'poplar'], h: [1.0, 2.0], color: '#2f5a4a' });

  // ---- the new tower the citizens will raise, and the empty plot waiting for it
  const NEW = orbitPt(2, 3.9).lerp(orbitPt(3, 3.9), 0.5);
  b.add(K.at(K.cyl(0.75, 0.75, 0.06, 24), NEW.x, 0, NEW.z), '#a89a80', 'stone');
  root.add(b.build({ name: 'andria' }));
  const nb = new K.Batch();
  K.tower(nb, { r: 0.5, h: 6.5, sides: 12, top: 'spire', topH: 1.5, color: '#e6d6b8', topColor: '#7fd1c4', topFinish: 'metal', bands: 1.0, bandColor: '#c9a24c', lit: 0.6, litColor: '#bff3ff', rng });
  const newTower = nb.build({ name: 'newTower' });
  newTower.position.set(NEW.x, 0, NEW.z);
  root.add(newTower);
  const NOVA = new THREE.Vector3(NEW.x, SKY_Y + 1.5, NEW.z);
  const nova = K.glowSprite('#bff3ff', 6, 0);
  nova.position.copy(NOVA);
  const novaRing = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 64), new THREE.MeshBasicMaterial({ color: '#bff3ff', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  novaRing.position.copy(NOVA);
  novaRing.rotation.x = -Math.PI / 2;
  root.add(nova, novaRing);
  // the sky reorders itself: the nearest stars link to the new one
  const near = skyStars.map((s, i) => ({ i, d: s.distanceTo(NOVA) })).sort((p, q) => p.d - q.d).slice(0, 3);
  const novaLines = K.lines(near.map((n) => [NOVA, skyStars[n.i]] as [THREE.Vector3, THREE.Vector3]), '#bff3ff', 0);
  const novaBeam = K.lines([[new THREE.Vector3(NEW.x, 0.2, NEW.z), NOVA]], '#bff3ff', 0);
  root.add(novaLines, novaBeam);

  // ---- glowing crowns, their stars above, and threads joining them
  const crownGlow = K.glowPoints(crowns, '#fff1d0', 0.8, 0.95, crownCols);
  const stars = K.glowPoints(skyStars, '#fff1d0', 0.9, 0.95, skyCols);
  const consLines = K.lines(pairs, '#ffe6b8', 0.35);
  const threads = K.lines(crowns.map((c, i) => [c, skyStars[i]] as [THREE.Vector3, THREE.Vector3]), '#ffe6b8', 0.04);
  root.add(crownGlow, stars, consLines, threads);
  const cephGlow = K.glowSprite('#ffb86a', 1.6, 0.8);
  cephGlow.position.copy(cepheid);
  const cephSky = K.glowSprite('#ffb86a', 2.2, 0.8);
  cephSky.position.set(cepheid.x, SKY_Y + 0.6, cepheid.z);
  root.add(cephGlow, cephSky);

  // ---- planets riding above their streets, carriages on the streets
  const planetMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const planets = K.instanced(K.sphere(0.32, 16, 12), planetMat, ORBITS.length, (i, o, c) => { c.set(PLANETS[i]).multiplyScalar(1.6); }, { castShadow: false });
  const setP = K.instanceSetter(planets);
  root.add(planets);
  const planetPos = ORBITS.map(() => new THREE.Vector3());
  const planetHalo = K.glowPoints(planetPos, '#ffffff', 1.4, 0.6, PLANETS);
  planetHalo.frustumCulled = false;
  root.add(planetHalo);
  const haloAttr = planetHalo.geometry.getAttribute('position') as THREE.BufferAttribute;
  const orbitRing = K.lines(paths.flatMap((p) => p.slice(1).map((q, i) => [new THREE.Vector3(p[i].x, SKY_Y - 1, p[i].z), new THREE.Vector3(q.x, SKY_Y - 1, q.z)] as [THREE.Vector3, THREE.Vector3])), '#7fd1c4', 0.12);
  root.add(orbitRing);
  const walkers = new K.Walkers({ paths, count: 150, closed: true, rng: rng.fork('w'), speed: [0.15, 0.35], colors: ['#e8dcc4', '#2f5a6a', '#8a3a2e', '#c9a24c', '#3a3a4a'] });
  root.add(walkers.mesh);
  root.add(K.particles({ count: 200, radius: 15, y0: 0.4, y1: 10, color: '#bfe8e0', size: 0.04, opacity: 0.45, swirl: 0.5, twinkle: 0.9, rng: rng.fork('m') }));

  const tog = new K.Toggle(0.3);
  return {
    root,
    env: {
      skyTop: '#03121a', skyHorizon: '#2d6a6c', skyBottom: '#0b1d22', skyCurve: 0.4,
      fog: '#1f4a50', fogNear: 80, fogFar: 230,
      sunDir: [-0.5, 0.45, 0.6], sunColor: '#bfe0e0', sunIntensity: 1.5, sunDisc: 0, sunGlow: 0.3,
      moon: { dir: [-0.5, 0.45, 0.6], size: 0.8, color: '#e8f2ee' },
      hemiSky: '#84b8c0', hemiGround: '#4a3a30', hemiIntensity: 1.0, envIntensity: 0.9,
      stars: 0.9, clouds: 0.08, cloudColor: '#3a7070',
      bloomStrength: 0.85, bloomThreshold: 0.78, bloomRadius: 0.55,
      tiltShift: 0.35, shadowRadius: 17, vignette: 0.45, saturation: 1.05,
    },
    camera: {
      position: [27, 8.5, 31], target: [0, 5.5, 0], minDistance: 7, maxDistance: 75, autoRotate: 0.25,
      views: [
        { position: [0, 40, 6], target: [0, 4, 0] },
        { position: [4.6, 2.2, 5.4], target: [8, 3.5, 3] },
      ],
    },
    interaction: {
      label: 'Raise a new tower',
      activeLabel: 'Take it down',
      hint: 'The city changes, and the sky changes with it.',
      camera: { position: [NEW.x * 3.6 + 6, 6, NEW.z * 3.6 - 6], target: [NEW.x * 0.5, 8.6, NEW.z * 0.5] },
      set: (on) => tog.set(on),
    },
    update(t, dt) {
      tog.update(dt);
      const v = tog.value;
      // planets keep pace with their streets (inner ones faster)
      for (let k = 0; k < ORBITS.length; k++) {
        const th = t * (0.5 / Math.pow(ORBITS[k] / 3, 1.5)) + k * 1.7;
        const p = orbitPt(k, th, SKY_Y - 1);
        planetPos[k].copy(p);
        setP(k, p.x, p.y, p.z, 0, 0.7 + k * 0.08);
        haloAttr.setXYZ(k, p.x, p.y, p.z);
      }
      setP.done();
      haloAttr.needsUpdate = true;
      walkers.update(t);
      // the Cepheid pulses
      const ceph = 0.5 + 0.5 * Math.sin(t * 1.4);
      (cephGlow.material as THREE.SpriteMaterial).opacity = 0.3 + ceph * 0.7;
      (cephSky.material as THREE.SpriteMaterial).opacity = 0.3 + ceph * 0.7;
      cephSky.scale.setScalar(1.6 + ceph * 1.4);
      (stars.material as THREE.PointsMaterial).opacity = 0.85 + 0.1 * Math.sin(t * 2.1);
      // the new tower rises, and a new star blazes
      newTower.scale.set(1, Math.max(0.001, K.smoothstep(0, 0.75, v)), 1);
      newTower.visible = v > 0.001;
      const n = K.smoothstep(0.6, 1, v);
      const burst = n * (1 + 1.5 * Math.exp(-Math.max(0, tog.raw - 0.8) * 8) * (tog.target ? 1 : 0));
      (nova.material as THREE.SpriteMaterial).opacity = Math.min(1, burst * 0.9);
      nova.scale.setScalar(3 + burst * 3 + Math.sin(t * 3) * 0.3 * n);
      const ringT = ((t * 0.5) % 1);
      novaRing.scale.setScalar(1 + ringT * 5);
      (novaRing.material as THREE.MeshBasicMaterial).opacity = n * (1 - ringT) * 0.5;
      (novaLines.material as THREE.LineBasicMaterial).opacity = n * 0.6;
      (novaBeam.material as THREE.LineBasicMaterial).opacity = n * 0.25;
      (consLines.material as THREE.LineBasicMaterial).opacity = 0.35 + v * 0.2;
    },
  };
};

export default build;
