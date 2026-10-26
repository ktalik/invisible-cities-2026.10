// EUDOXIA - Cities & the Sky 1.
// A sprawling city of crooked alleys, stairways and many-coloured houses. In a
// pavilion at its centre a carpet is kept whose symmetrical weave shows the true
// form of the city: concentric bands, radiating lanes, a medallion. An oracle
// said that one of the two holds the shape the gods gave to the starry sky.
// Toggle: the city gives up its disorder and every house glides to its place in
// the carpet's design, while the same pattern is drawn in stars above.

import * as THREE from 'three';
import * as K from '../kit';
import type { CityBuilder } from '../core/types';

const CARPET = { madder: '#a3302a', indigo: '#273463', saffron: '#dca435', ivory: '#efe3c4', teal: '#2f6e69', rose: '#c9726a' };
const RINGS = [3.8, 5.0, 7.4, 8.6, 9.8, 12.2, 13.4, 14.6];
const STREETS = [6.2, 11.0];
const SPOKES = 8;

interface Slot { x: number; z: number; ry: number; h: number; color: THREE.Color; a: number; r: number }

const build: CityBuilder = (ctx) => {
  const rng = ctx.rng;
  const root = new THREE.Group();

  // ---- the carpet's design: rings of cells interrupted by eight lanes
  const ringCol = [CARPET.saffron, CARPET.teal, CARPET.madder, CARPET.ivory, CARPET.indigo, CARPET.madder, CARPET.saffron, CARPET.teal];
  const slots: Slot[] = [];
  RINGS.forEach((r, ri) => {
    const n = Math.floor((Math.PI * 2 * r) / 1.1);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const sector = (a / (Math.PI * 2)) * SPOKES;
      const fromLane = Math.abs(sector - Math.round(sector)) * ((Math.PI * 2 * r) / SPOKES);
      if (fromLane < 0.6) continue;
      const petal = 0.5 + 0.5 * Math.cos(a * SPOKES * 2 + ri * Math.PI);
      const c = K.col(ringCol[ri]);
      if (petal > 0.8) c.lerp(K.col(ri % 2 ? CARPET.ivory : CARPET.rose), 0.55);
      slots.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, ry: -a + Math.PI / 2, h: 0.55 + petal * 0.9 + (ri === 0 ? 0.8 : 0) + (ri === 7 ? 0.4 : 0), color: c, a, r });
    }
  });
  const N = slots.length;

  // ---- the canvas of the carpet (drawn from the same design)
  const tex = K.canvasTexture(1024, 1024, (g, w) => {
    const s = w / 2 / 16.2, c = w / 2;
    g.fillStyle = CARPET.indigo; g.fillRect(0, 0, w, w);
    // border: two bands with a running diamond
    g.fillStyle = CARPET.madder; g.fillRect(24, 24, w - 48, w - 48);
    g.fillStyle = CARPET.indigo; g.fillRect(52, 52, w - 104, w - 104);
    g.fillStyle = CARPET.saffron;
    for (let i = 0; i < 24; i++) {
      for (const [x, y] of [[38 + i * ((w - 76) / 23), 38], [38 + i * ((w - 76) / 23), w - 38], [38, 38 + i * ((w - 76) / 23)], [w - 38, 38 + i * ((w - 76) / 23)]]) {
        g.beginPath(); g.moveTo(x, y - 9); g.lineTo(x + 9, y); g.lineTo(x, y + 9); g.lineTo(x - 9, y); g.fill();
      }
    }
    g.fillStyle = CARPET.madder; g.beginPath(); g.arc(c, c, 15.6 * s, 0, Math.PI * 2); g.fill();
    g.strokeStyle = CARPET.saffron; g.lineWidth = 6; g.beginPath(); g.arc(c, c, 15.6 * s, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = CARPET.ivory;
    for (const r of STREETS) { g.lineWidth = 0.7 * s; g.beginPath(); g.arc(c, c, r * s, 0, Math.PI * 2); g.stroke(); }
    g.lineWidth = 0.55 * s;
    for (let i = 0; i < SPOKES; i++) {
      const a = (i / SPOKES) * Math.PI * 2;
      g.beginPath(); g.moveTo(c + Math.cos(a) * 3.2 * s, c + Math.sin(a) * 3.2 * s); g.lineTo(c + Math.cos(a) * 15.2 * s, c + Math.sin(a) * 15.2 * s); g.stroke();
    }
    for (const sl of slots) {
      g.save(); g.translate(c + sl.x * s, c + sl.z * s); g.rotate(sl.a);
      g.fillStyle = '#' + sl.color.getHexString(); g.fillRect(-0.4 * s, -0.38 * s, 0.8 * s, 0.76 * s); g.restore();
    }
    // the medallion: an eight pointed star
    g.fillStyle = CARPET.saffron; g.beginPath();
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, rr = (i % 2 ? 1.4 : 3.0) * s; g.lineTo(c + Math.cos(a) * rr, c + Math.sin(a) * rr); }
    g.fill();
    g.fillStyle = CARPET.ivory; g.beginPath(); g.arc(c, c, 0.9 * s, 0, Math.PI * 2); g.fill();
  });
  tex.anisotropy = 8;

  // ---- ground
  const isl = K.island({ radius: 17.5, flat: 16, depth: 9, top: '#b99a72', edge: '#a3845f', cliff: '#8a6b52', under: '#3e2f33', strata: '#a07650', seed: 11, hills: 0.2 });
  root.add(isl.mesh);
  root.add(K.cloudSea({ y: -7.5, color: '#d9a5a0', shadow: '#4b3d63', opacity: 0.7, coverage: 0.5 }));

  const b = new K.Batch();

  // ---- crooked alleys: streamlines of a noise flow field
  const flow = (x: number, z: number) => K.fbm2(x * 0.075 + 3.1, z * 0.075 - 1.7, 3) * 7;
  const alleys: THREE.Vector3[][] = [];
  const alleyPts: [number, number][] = [];
  for (let k = 0; k < 16; k++) {
    const [sx, sz] = rng.inRing(4, 14);
    const pts: THREE.Vector3[] = [];
    for (const dir of [-1, 1]) {
      let x = sx, z = sz;
      const run: THREE.Vector3[] = [];
      for (let s = 0; s < 30; s++) {
        const a = flow(x, z);
        x += Math.cos(a) * 0.45 * dir; z += Math.sin(a) * 0.45 * dir;
        const r = Math.hypot(x, z);
        if (r > 15.2 || r < 3.3) break;
        run.push(new THREE.Vector3(x, 0.02, z));
      }
      if (dir < 0) pts.push(...run.reverse()); else pts.push(new THREE.Vector3(sx, 0.02, sz), ...run);
    }
    if (pts.length < 6) continue;
    alleys.push(pts);
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i - 1], q = pts[i];
      const len = p.distanceTo(q);
      b.add(K.at(K.box(0.5, 0.02, len + 0.12), (p.x + q.x) / 2, 0.004 + (k % 3) * 0.002, (p.z + q.z) / 2, { ry: Math.atan2(q.x - p.x, q.z - p.z) }), K.jitter('#ddc9a2', rng, 0.01, 0.03, 0.04), 'stone');
      alleyPts.push([p.x, p.z]);
    }
  }

  // ---- the city as it appears: houses packed between the alleys
  interface H { x: number; z: number; ry: number; w: number; d: number; h: number; color: THREE.Color; roof: THREE.Color }
  const houses: H[] = [];
  const cell = new Map<string, [number, number][]>();
  const key = (x: number, z: number) => `${Math.floor(x)},${Math.floor(z)}`;
  for (const [x, z] of alleyPts) { const k = key(x, z); (cell.get(k) ?? cell.set(k, []).get(k)!).push([x, z]); }
  const near = (x: number, z: number, d: number) => {
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++)
      for (const p of cell.get(`${Math.floor(x) + i},${Math.floor(z) + j}`) ?? []) if (Math.hypot(p[0] - x, p[1] - z) < d) return true;
    return false;
  };
  const housePts: [number, number][] = [];
  const hcell = new Map<string, [number, number][]>();
  const tooClose = (x: number, z: number) => {
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++)
      for (const p of hcell.get(`${Math.floor(x) + i},${Math.floor(z) + j}`) ?? []) if (Math.hypot(p[0] - x, p[1] - z) < 0.86) return true;
    return false;
  };
  const wallCols = ['#dcb98d', '#c9805e', '#ead9b6', '#a8b596', '#d7a29a', '#9eb2c2', '#e3c46e', '#c79a6b', '#b7878f'];
  const roofCols = ['#9a4a33', '#a85b3a', '#6f5a4a', '#7e3f30', '#b07548'];
  let tries = 0;
  while (houses.length < N && tries < 90000) {
    tries++;
    const [x, z] = rng.inRing(3.4, 15.3);
    if (near(x, z, 0.62) || tooClose(x, z)) continue;
    const r = Math.hypot(x, z);
    const k = key(x, z);
    (hcell.get(k) ?? hcell.set(k, []).get(k)!).push([x, z]);
    housePts.push([x, z]);
    houses.push({
      x, z, ry: -flow(x, z) + rng.float(-0.2, 0.2), w: rng.float(0.55, 0.8), d: rng.float(0.6, 0.95),
      h: rng.float(0.45, 1.7) * (1.25 - r / 30) * (rng.chance(0.06) ? 1.8 : 1),
      color: K.pickJitter(wallCols, rng), roof: K.pickJitter(roofCols, rng),
    });
  }
  const H_N = Math.min(houses.length, N);

  // match houses and slots by angle so that each house travels a short way
  const byA = (x: number, z: number) => (Math.atan2(z, x) + Math.PI * 2) % (Math.PI * 2);
  const hi = houses.slice(0, H_N).map((h, i) => ({ i, a: byA(h.x, h.z) })).sort((p, q) => p.a - q.a);
  const si = slots.map((s, i) => ({ i, a: s.a })).sort((p, q) => p.a - q.a);
  const target: Slot[] = new Array(H_N);
  hi.forEach((h, k) => (target[h.i] = slots[si[Math.floor((k * N) / H_N)].i]));

  const bodyMat = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0 });
  const roofMat = new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0 });
  const bodies = K.instanced(K.box(1, 1, 1), bodyMat, H_N, (i, o, c) => { c.copy(houses[i].color); });
  const roofs = K.instanced(K.gableRoof(1, 1, 0.42, 0.06), roofMat, H_N, (i, o, c) => { c.copy(houses[i].roof); });
  // windows: small panes on the long faces, some lit for the evening
  const paneGeo = K.merge([-0.22, 0.22].flatMap((x) => [0.505, -0.505].flatMap((z) => [0.32, 0.68].map((y) => K.at(K.wallPlane(0.16, 0.14), x, y, z, { ry: z < 0 ? Math.PI : 0 })))));
  const panes = K.instanced(paneGeo, new THREE.MeshBasicMaterial({ color: '#ffffff' }), H_N, (i, o, c) => { if (rng.chance(0.4)) c.setRGB(2.4, 1.5, 0.7); else c.setRGB(0.13, 0.1, 0.1); }, { castShadow: false });
  root.add(bodies, roofs, panes);
  const setB = K.instanceSetter(bodies), setR = K.instanceSetter(roofs), setP = K.instanceSetter(panes);
  const tmpC = new THREE.Color();
  const delay = houses.slice(0, H_N).map((h) => (Math.hypot(h.x, h.z) / 16) * 0.35 + rng.float(0, 0.1));
  const placeHouses = (v: number) => {
    for (let i = 0; i < H_N; i++) {
      const h = houses[i], s = target[i];
      const k = K.easeInOut(K.clamp((v - delay[i]) / 0.55));
      const x = K.lerp(h.x, s.x, k), z = K.lerp(h.z, s.z, k);
      let dr = s.ry - h.ry; dr = Math.atan2(Math.sin(dr), Math.cos(dr));
      const ry = h.ry + dr * k;
      const lift = Math.sin(Math.PI * k) * 1.6;
      const w = K.lerp(h.w, 0.78, k), d = K.lerp(h.d, 0.74, k), hh = K.lerp(h.h, s.h, k);
      setB(i, x, lift, z, ry, [w, hh, d]);
      setR(i, x, lift + hh, z, ry, [w, 1, d]);
      setP(i, x, lift, z, ry, [w, hh, d]);
      tmpC.copy(h.color).lerp(s.color, k); setB.color(i, tmpC);
      tmpC.copy(h.roof).lerp(K.shade(s.color, 0.62), k); setR.color(i, tmpC);
    }
    setB.done(); setR.done(); setP.done();
  };
  placeHouses(0);

  // ---- the pavilion where the carpet is kept
  b.add(K.at(K.cyl(2.9, 3.05, 0.28, 48), 0, 0, 0), '#e6d6b4', 'stone');
  b.add(K.at(K.cyl(2.6, 2.6, 0.06, 48), 0, 0.28, 0), '#d8c49c', 'stone');
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    K.column(b, { x: Math.cos(a) * 2.55, y: 0.28, z: Math.sin(a) * 2.55, h: 2.2, r: 0.11, color: '#efe5cf' });
  }
  b.add(K.at(K.torus(2.55, 0.13, 6, 64), 0, 2.55, 0), '#e9dcc0', 'stone');
  b.add(K.at(K.torus(2.55, 0.05, 6, 64), 0, 2.72, 0), '#d2a54a', 'gold');
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    b.add(K.at(K.cone(0.12, 0.45, 8), Math.cos(a) * 2.55, 2.62, Math.sin(a) * 2.55), '#d2a54a', 'gold');
    // steps where the lanes meet the pavilion
    b.add(K.at(K.box(0.9, 0.14, 0.5), Math.cos(a) * 3.1, 0, Math.sin(a) * 3.1, { ry: -a + Math.PI / 2 }), '#d9c7a3', 'stone');
  }
  const carpetMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.12 });
  const carpet = new THREE.Mesh(K.at(K.plane(3.4, 3.4), 0, 0.355, 0, { ry: Math.PI / 8 }), carpetMat);
  carpet.receiveShadow = true;
  root.add(carpet);
  // two guardians of the carpet
  root.add(K.crowd({ count: 6, place: (i) => { const a = (i / 6) * Math.PI * 2 + 0.3; return [Math.cos(a) * 2.2, 0.34, Math.sin(a) * 2.2]; }, colors: ['#3a2e4a', '#7a2f2a', '#e8dcc4'], h: 0.27, rng: rng.fork('g') }));

  // ---- rim: cypresses, a few minarets, lanterns
  K.forest(b, { n: 46, r0: 15.6, r1: 16.8, rng, kinds: ['cypress', 'cypress', 'olive', 'round'], h: [1.0, 2.2] });
  for (const a of [0.7, 2.6, 4.4]) K.minaret(b, { x: Math.cos(a) * 15.9, z: Math.sin(a) * 15.9, h: 5.5, r: 0.32, color: '#e4d2ae' });
  root.add(b.build({ name: 'eudoxia' }));

  const lanterns: THREE.Vector3[] = [];
  const lanCols: string[] = [];
  alleys.forEach((p, k) => p.forEach((q, i) => { if (i % 5 === 2) { lanterns.push(new THREE.Vector3(q.x + 0.25, 0.75, q.z)); lanCols.push(k % 3 ? '#ffc070' : '#ff8a5a'); } }));
  const lanternGlow = K.glowPoints(lanterns, '#ffb060', 0.55, 0.85, lanCols);
  root.add(lanternGlow);

  // ---- life: people in the alleys, swallows, dust
  const walkers = new K.Walkers({ paths: alleys, count: 160, rng: rng.fork('w'), speed: [0.16, 0.36], colors: ['#7a2f2a', '#27345f', '#e8dcc4', '#cf9a3a', '#3d5e4f', '#5a3b5e'] });
  root.add(walkers.mesh);
  const flock = new K.Flock({ count: 26, center: [0, 0, 0], radius: 12, height: 9, color: '#2a2230', rng: rng.fork('b') });
  root.add(flock.mesh);
  root.add(K.particles({ count: 220, radius: 16, y0: 0.4, y1: 7, color: '#ffd9a8', size: 0.05, opacity: 0.5, swirl: 0.5, twinkle: 0.7, rng: rng.fork('m') }));

  // ---- the heavens drawn with the same design (appears with the toggle)
  const sky = new THREE.Group();
  sky.position.y = 17;
  const starPts = slots.map((s) => new THREE.Vector3(s.x * 0.95, 0, s.z * 0.95));
  const stars = K.glowPoints(starPts, '#fff4d8', 0.55, 0, slots.map((s) => K.mix(s.color, '#ffffff', 0.55)));
  const pairs: [THREE.Vector3, THREE.Vector3][] = [];
  for (const r of [...STREETS, 15.4]) for (let i = 0; i < 96; i++) {
    const a0 = (i / 96) * Math.PI * 2, a1 = ((i + 1) / 96) * Math.PI * 2;
    pairs.push([new THREE.Vector3(Math.cos(a0) * r * 0.95, 0, Math.sin(a0) * r * 0.95), new THREE.Vector3(Math.cos(a1) * r * 0.95, 0, Math.sin(a1) * r * 0.95)]);
  }
  for (let i = 0; i < SPOKES; i++) {
    const a = (i / SPOKES) * Math.PI * 2;
    pairs.push([new THREE.Vector3(Math.cos(a) * 3, 0, Math.sin(a) * 3), new THREE.Vector3(Math.cos(a) * 14.6, 0, Math.sin(a) * 14.6)]);
  }
  const constellation = K.lines(pairs, '#ffe6b0', 0);
  sky.add(stars, constellation);
  sky.visible = false;
  root.add(sky);

  // the ground of the ordered city becomes the carpet itself
  const floorMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, transparent: true, opacity: 0, depthWrite: false });
  const floor = new THREE.Mesh(K.at(K.disc(16.1, 96), 0, 0.03, 0), floorMat);
  floor.receiveShadow = true;
  root.add(floor);

  const tog = new K.Toggle(0.3);
  let last = -1;

  return {
    root,
    env: {
      skyTop: '#1d2150', skyHorizon: '#eaa77f', skyBottom: '#4a3a5c', skyCurve: 0.5,
      fog: '#c99089', fogNear: 80, fogFar: 240,
      sunDir: [0.75, 0.32, -0.45], sunColor: '#ffd2a6', sunIntensity: 2.3, sunDisc: 0.8, sunGlow: 1.2,
      hemiSky: '#9aa0d0', hemiGround: '#6b4a3c', hemiIntensity: 0.7, envIntensity: 0.8,
      stars: 0.5, clouds: 0.25, cloudColor: '#f2b998',
      bloomStrength: 0.65, bloomThreshold: 0.82, bloomRadius: 0.5,
      tiltShift: 0.45, shadowRadius: 19, vignette: 0.38, saturation: 1.1,
    },
    camera: {
      position: [23, 19, 27], target: [0, 0.8, 0], minDistance: 8, maxDistance: 75, autoRotate: 0.25,
      views: [
        { position: [2, 38, 9], target: [0, 0, 0] },
        { position: [3.4, 5.2, 4.6], target: [0, 0.4, 0] },
      ],
    },
    interaction: {
      label: 'Unroll the carpet',
      activeLabel: 'Return to the alleys',
      hint: 'The tangle of streets settles into the pattern of the weave, and the sky repeats it.',
      camera: { position: [3, 36, 16], target: [0, 2, 0] },
      set: (on) => tog.set(on),
    },
    update(t, dt) {
      tog.update(dt);
      const v = tog.value;
      if (v !== last) { placeHouses(v); last = v; }
      walkers.mesh.visible = v < 0.15;
      floorMat.opacity = K.smoothstep(0.55, 1, v);
      floor.visible = v > 0.001;
      sky.visible = v > 0.001;
      sky.rotation.y = t * 0.02;
      (stars.material as THREE.PointsMaterial).opacity = K.smoothstep(0.3, 1, v) * (0.85 + 0.15 * Math.sin(t * 2));
      (constellation.material as THREE.LineBasicMaterial).opacity = K.smoothstep(0.5, 1, v) * 0.22;
      carpetMat.emissiveIntensity = 0.12 + 0.08 * Math.sin(t * 1.3) + v * 0.4;
      (lanternGlow.material as THREE.PointsMaterial).opacity = 0.75 + 0.15 * Math.sin(t * 3.1);
      walkers.update(t);
      flock.update(t);
    },
  };
};

export default build;
