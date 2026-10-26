// PERINTHIA - Cities & the Sky 4.
// Astronomers fixed every line of Perinthia by the stars: twelve streets to the
// twelve signs, a meridian of gold, the temple turned to the rising of the
// brightest star, an observatory with its armillary sphere. The city was meant
// to mirror the harmony of the firmament, yet those born in it are strange
// beings: stilt-legged, double-headed, horned, winged, shell-backed. Toggle:
// read the sky again. The tidy constellations twist into the same creatures,
// as if the order of the heavens had always been reflected exactly.

import * as THREE from 'three';
import * as K from '../kit';
import type { CityBuilder } from '../core/types';

const MARBLE = ['#eef0f2', '#e4e6ea', '#f4f1ea', '#dfe2e8'];
const LAPIS = '#22408a', GOLD = '#d9b24c';

const build: CityBuilder = (ctx) => {
  const rng = ctx.rng;
  const root = new THREE.Group();
  const isl = K.island({ radius: 15, flat: 13.6, depth: 7, top: '#c9ccd2', edge: '#aeb2bb', cliff: '#7d8291', under: '#2c3044', strata: '#9ea3b2', seed: 47, hills: 0.15 });
  root.add(isl.mesh);
  root.add(K.cloudSea({ y: -6.5, color: '#5a6a9a', shadow: '#141a33', opacity: 0.7, coverage: 0.5 }));
  const b = new K.Batch();

  // ---- the astronomical plan: concentric rings, twelve streets, a golden meridian
  b.add(K.at(K.disc(13.4, 96), 0, 0.006, 0), '#cfd2d9', 'stone');
  for (const r of [3.6, 7.6, 11.2]) b.add(K.at(K.ring(r - 0.32, r + 0.32, 120), 0, 0.012, 0), '#9aa0b0', 'stone');
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    b.add(K.at(K.box(0.55, 0.02, 9.6), Math.cos(a) * 8.4, 0.01, Math.sin(a) * 8.4, { ry: -a + Math.PI / 2 }), '#a3a9b8', 'stone');
    // the sign's obelisk at the rim
    const x = Math.cos(a) * 12.6, z = Math.sin(a) * 12.6;
    b.add(K.at(K.box(0.6, 0.3, 0.6), x, 0, z, { ry: -a }), '#e8e9ee', 'stone');
    b.add(K.at(K.ngon(0.2, 2.4, 4, 0.1), x, 0.3, z, { ry: -a + Math.PI / 4 }), '#eef0f4', 'stone');
    b.add(K.at(K.pyramid(0.2, 0.2, 0.3), x, 2.7, z, { ry: -a }), GOLD, 'gold');
  }
  b.add(K.at(K.box(0.12, 0.02, 26.4), 0, 0.022, 0), GOLD, 'gold'); // the meridian
  for (let k = -12; k <= 12; k++) if (k !== 0) b.add(K.at(K.box(0.4, 0.02, 0.05), 0, 0.024, k), GOLD, 'gold');

  // ---- marble houses with lapis domes in the sectors between the streets
  const onStreet = (a: number, r: number) => {
    const sector = (a / (Math.PI * 2)) * 12;
    return Math.abs(sector - Math.round(sector)) * ((Math.PI * 2 * r) / 12) < 0.7;
  };
  const housePts: [number, number][] = [];
  for (const [r0, r1, n] of [[4.5, 6.9, 44], [8.4, 10.5, 66]] as const) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + 0.02;
      const r = (i % 2 ? r0 + 0.55 : r1 - 0.55) + rng.float(-0.1, 0.1);
      if (onStreet(a, r)) continue;
      const x = Math.cos(a) * r, z = Math.sin(a) * r, h = rng.float(1.0, 1.8);
      const domed = i % 3 === 0;
      K.house(b, { x, z, ry: -a + Math.PI / 2, w: 0.95, d: 0.95, h, roof: domed ? 'dome' : 'flat', roofH: 0.45, wall: K.pickJitter(MARBLE, rng), roofColor: domed ? LAPIS : '#d8dbe2', roofFinish: domed ? 'ceramic' : 'stone', lit: 0.35, glow: 2.2, litColor: '#ffd9a0', cornice: true, rng });
      if (domed) b.add(K.at(K.cone(0.04, 0.22, 6), x, h + 0.45, z), GOLD, 'gold');
      housePts.push([x, z]);
    }
  }

  // ---- the temple, turned to the rising of the brightest star
  K.temple(b, { x: 0, z: -5.2, ry: 0, w: 2.6, d: 3.6, h: 2.0, color: '#f1f2f5', roofColor: '#e3e5ea', cols: 6 });
  // ---- the observatory with its armillary sphere
  K.domeHall(b, { x: 5.4, z: 1.6, r: 1.3, h: 1.8, color: '#eef0f3', domeColor: LAPIS, domeFinish: 'ceramic', drum: true });
  K.tower(b, { x: -5.6, z: 1.9, r: 0.8, h: 5.2, sides: 12, top: 'flat', color: '#eceef2', bands: 1.3, bandColor: '#cfd3dc', lit: 0.4, litColor: '#ffd9a0', rng });
  b.add(K.at(K.cyl(1.0, 0.95, 0.25, 24), -5.6, 5.2, 1.9), '#e2e5ea', 'stone');
  b.add(K.at(K.cyl(0.08, 0.12, 0.7, 10), -5.6, 5.45, 1.9), GOLD, 'gold');
  // the great gnomon at the centre, with an hour circle
  b.add(K.at(K.cyl(2.2, 2.4, 0.18, 48), 0, 0, 0), '#e9ebef', 'stone');
  b.add(K.at(K.ngon(0.28, 4.6, 4, 0.06), 0, 0.18, 0, { ry: Math.PI / 4 }), '#f4f4f6', 'stone');
  b.add(K.at(K.pyramid(0.12, 0.12, 0.25), 0, 4.78, 0), GOLD, 'gold');
  for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; b.add(K.at(K.box(0.05, 0.03, i % 2 ? 0.3 : 0.55), Math.cos(a) * 1.85, 0.18, Math.sin(a) * 1.85, { ry: -a + Math.PI / 2 }), LAPIS, 'ceramic'); }
  K.forest(b, { n: 30, r0: 13.6, r1: 14.5, rng, kinds: ['cypress'], h: [1.4, 2.4] });
  root.add(b.build({ name: 'perinthia' }));

  // the armillary sphere: three rings that turn
  const armillary = new THREE.Group();
  const ab = new K.Batch();
  ab.add(K.torus(0.85, 0.035, 6, 48), GOLD, 'gold');
  ab.add(K.at(K.torus(0.78, 0.03, 6, 48), 0, 0, 0, { rx: Math.PI / 2 }), GOLD, 'gold');
  ab.add(K.at(K.torus(0.7, 0.03, 6, 48), 0, 0, 0, { rz: 0.41 }), '#e8cf86', 'gold');
  ab.add(K.sphere(0.14, 14, 10), LAPIS, 'polished');
  armillary.add(ab.build({ name: 'armillary' }));
  armillary.position.set(-5.6, 6.95, 1.9);
  root.add(armillary);
  const rings = armillary.children[0];

  // ---- the inhabitants: strange beings (imaginary chimeras, all of the same dusk-dark bronze)
  const P = (g: THREE.BufferGeometry) => K.paint(g, '#ffffff');
  const stilt = K.merge([P(K.strut([-0.04, 0, 0], [0, 0.42, 0], 0.012, 5)), P(K.strut([0.04, 0, 0], [0, 0.42, 0], 0.012, 5)), P(K.at(K.sphere(0.06, 8, 6), 0, 0.46, 0, { s: [1, 1.4, 1] })), P(K.strut([0, 0.5, 0], [0, 0.62, 0.06], 0.012, 5)), P(K.at(K.sphere(0.03, 6, 5), 0, 0.64, 0.08)), P(K.strut([0.05, 0.48, 0], [0.12, 0.2, 0.02], 0.008, 4)), P(K.strut([-0.05, 0.48, 0], [-0.12, 0.2, 0.02], 0.008, 4))]);
  const shell = K.merge([P(K.at(K.dome(0.13, 10, 1, 1.1), 0, 0.05, -0.02)), P(K.at(K.box(0.03, 0.06, 0.03), 0.07, 0, 0.05)), P(K.at(K.box(0.03, 0.06, 0.03), -0.07, 0, 0.05)), P(K.at(K.box(0.03, 0.06, 0.03), 0, 0, -0.1)), P(K.at(K.sphere(0.04, 8, 6), 0, 0.12, 0.13)), P(K.strut([0, 0.14, 0.15], [0.05, 0.22, 0.2], 0.006, 4)), P(K.strut([0, 0.14, 0.15], [-0.05, 0.22, 0.2], 0.006, 4))]);
  const twin = K.merge([P(K.cyl(0.05, 0.09, 0.2, 7)), P(K.at(K.sphere(0.07, 8, 6), 0, 0.22, 0, { s: [1.5, 0.8, 1] })), P(K.strut([0.05, 0.25, 0], [0.11, 0.36, 0], 0.012, 5)), P(K.strut([-0.05, 0.25, 0], [-0.11, 0.36, 0], 0.012, 5)), P(K.at(K.sphere(0.04, 7, 5), 0.12, 0.39, 0)), P(K.at(K.sphere(0.035, 7, 5), -0.12, 0.38, 0))]);
  const horned = K.merge([P(K.cyl(0.04, 0.08, 0.24, 7)), P(K.at(K.sphere(0.045, 8, 6), 0, 0.29, 0)), ...[-1, 1].flatMap((s) => [P(K.strut([s * 0.03, 0.31, 0], [s * 0.1, 0.42, -0.02], 0.007, 4)), P(K.strut([s * 0.07, 0.37, -0.01], [s * 0.13, 0.4, 0.03], 0.005, 4)), P(K.strut([s * 0.1, 0.42, -0.02], [s * 0.09, 0.5, -0.05], 0.005, 4))])]);
  const winged = K.merge([P(K.cyl(0.035, 0.06, 0.22, 7)), P(K.at(K.sphere(0.04, 8, 6), 0, 0.27, 0, { s: [1, 1, 1.5] })), ...[-1, 1].map((s) => P(K.prism([[0, 0], [s * 0.26, 0.12], [s * 0.2, -0.04], [s * 0.1, -0.08]], 0.01).translate(0, 0.2, -0.03)))]);
  const kinds = [stilt, shell, twin, horned, winged];
  kinds.forEach((g) => g.scale(1.35, 1.35, 1.35));
  const paths: THREE.Vector3[][] = [];
  for (const r of [3.6, 7.6, 11.2]) paths.push(Array.from({ length: 61 }, (_, i) => new THREE.Vector3(Math.cos((i / 60) * Math.PI * 2) * r, 0.02, Math.sin((i / 60) * Math.PI * 2) * r)));
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; paths.push([new THREE.Vector3(Math.cos(a) * 2.6, 0.02, Math.sin(a) * 2.6), new THREE.Vector3(Math.cos(a) * 12.2, 0.02, Math.sin(a) * 12.2)]); }
  const crowds = kinds.map((g, k) => new K.Walkers({ paths, count: 34, geometry: g, rng: rng.fork('k' + k), speed: [0.12, 0.3], closed: false, colors: ['#3a3440', '#4a3a3a', '#2e3a4a', '#5a4a3e', '#3e4a3a'] }));
  crowds.forEach((c) => root.add(c.mesh));

  // ---- lamps along the rings, the moonlit haze
  const lampPos: THREE.Vector3[] = [];
  for (const r of [3.95, 7.95, 11.55]) for (let i = 0; i < 24; i++) { const a = ((i + 0.5) / 24) * Math.PI * 2; lampPos.push(new THREE.Vector3(Math.cos(a) * r, 0.75, Math.sin(a) * r)); }
  const lb = new K.Batch();
  for (const p of lampPos) { lb.add(K.at(K.cyl(0.02, 0.025, 0.7, 5), p.x, 0, p.z), '#3a3a44', 'metal'); lb.add(K.at(K.sphere(0.05, 8, 6), p.x, 0.75, p.z), '#ffd8a0', 'glow', 3); }
  root.add(lb.build({ name: 'lamps', castShadow: false }));
  root.add(K.glowPoints(lampPos, '#ffcf90', 0.6, 0.7));
  root.add(K.particles({ count: 180, radius: 14, y0: 0.5, y1: 8, color: '#cfe0ff', size: 0.04, opacity: 0.45, swirl: 0.4, twinkle: 0.9, rng: rng.fork('m') }));

  // ---- the constellations: perfect figures that can twist into creatures
  const N = 28;
  interface Cons { c: THREE.Vector3; R: number; rot: number; lumps: [number, number, number][]; squash: number }
  const cons: Cons[] = [];
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2 + 0.4;
    const lumps: [number, number, number][] = [];
    const nl = 3 + (k % 3);
    for (let j = 0; j < nl; j++) lumps.push([rng.angle(), rng.float(0.5, 1.2) * (j === 0 ? 1.4 : 1), rng.float(0.22, 0.45)]);
    cons.push({ c: new THREE.Vector3(Math.cos(a) * 13, 11.2 + (k % 2) * 2.0, Math.sin(a) * 13), R: rng.float(2.0, 2.6), rot: rng.angle(), lumps, squash: rng.float(0.55, 0.8) });
  }
  const nPairs = cons.length * N * 2; // outline + spokes to an inner star
  const linePos = new Float32Array(nPairs * 6);
  const starPos: THREE.Vector3[] = [];
  for (let i = 0; i < cons.length * N; i++) starPos.push(new THREE.Vector3());
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
  const lineMat = new THREE.LineBasicMaterial({ color: '#ffe3a0', transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending });
  const consLines = new THREE.LineSegments(lineGeo, lineMat);
  consLines.frustumCulled = false;
  const stars = K.glowPoints(starPos, '#fff1cf', 0.5, 0.9);
  stars.frustumCulled = false;
  root.add(consLines, stars);
  const pt = (c: Cons, i: number, m: number, out: THREE.Vector3, inner = false) => {
    const th = (i / N) * Math.PI * 2;
    let rPerfect = i % 2 ? 0.62 : 1; // a perfect star polygon
    if (inner) rPerfect = 0.3;
    let rMon = 0.75 + 0.12 * Math.sin(th * 3 + c.rot);
    for (const [la, amp, w] of c.lumps) { const d = Math.atan2(Math.sin(th - la), Math.cos(th - la)); rMon += amp * Math.exp(-(d * d) / (w * w)) * (inner ? 0.2 : 1); }
    if (inner) rMon = 0.25 + 0.15 * Math.sin(th * 2 + c.rot);
    const r = K.lerp(rPerfect, rMon, m) * c.R;
    const sq = K.lerp(1, c.squash, m);
    const u = Math.cos(th + c.rot * 0.3) * r, w = Math.sin(th + c.rot * 0.3) * r * sq;
    const wob = m * 0.4 * Math.sin(th * 5 + c.rot);
    // drawn on an upright plane facing the city centre
    const len = Math.hypot(c.c.x, c.c.z), tx = -c.c.z / len, tz = c.c.x / len, nx = c.c.x / len, nz = c.c.z / len;
    out.set(c.c.x + tx * u + nx * wob, c.c.y + w, c.c.z + tz * u + nz * wob);
  };
  const A = new THREE.Vector3(), B = new THREE.Vector3();
  const starAttr = (stars.geometry as THREE.BufferGeometry).getAttribute('position') as THREE.BufferAttribute;
  const drawCons = (m: number) => {
    let o = 0;
    cons.forEach((c, ci) => {
      for (let i = 0; i < N; i++) {
        pt(c, i, m, A); pt(c, (i + 1) % N, m, B);
        linePos.set([A.x, A.y, A.z, B.x, B.y, B.z], o); o += 6;
        starAttr.setXYZ(ci * N + i, A.x, A.y, A.z);
        if (i % 4 === 0) { pt(c, i + 2, m, B, true); linePos.set([A.x, A.y, A.z, B.x, B.y, B.z], o); } else linePos.fill(0, o, o + 6);
        o += 6;
      }
    });
    lineGeo.attributes.position.needsUpdate = true;
    starAttr.needsUpdate = true;
  };
  drawCons(0);

  const tog = new K.Toggle(0.3);
  let last = -1;
  return {
    root,
    env: {
      skyTop: '#070d26', skyHorizon: '#3d5784', skyBottom: '#141a33', skyCurve: 0.45,
      fog: '#2c3a5e', fogNear: 75, fogFar: 220,
      sunDir: [0.75, 0.3, 0.45], sunColor: '#c9d8ff', sunIntensity: 1.6, sunDisc: 0, sunGlow: 0.4,
      moon: { dir: [0.75, 0.3, 0.45], size: 1.2, color: '#f2f0e6' },
      hemiSky: '#7d8fc4', hemiGround: '#40384a', hemiIntensity: 0.9, envIntensity: 0.9,
      stars: 1, clouds: 0.1, cloudColor: '#5a6a9a',
      bloomStrength: 0.85, bloomThreshold: 0.78, bloomRadius: 0.5,
      tiltShift: 0.4, shadowRadius: 16, vignette: 0.45, saturation: 1.0,
    },
    camera: {
      position: [24, 9.5, 28], target: [0, 4.2, 0], minDistance: 6, maxDistance: 70, autoRotate: 0.25,
      views: [
        { position: [0, 34, 10], target: [0, 0, 0] },
        { position: [1.8, 1.3, 3.3], target: [-1.5, 0.6, 0.4] },
      ],
    },
    interaction: {
      label: 'Read the sky again',
      activeLabel: 'Trust the calculations',
      hint: 'Perhaps the order of the heavens is reflected exactly.',
      camera: { position: [25, 7, 29], target: [0, 8, 0] },
      set: (on) => tog.set(on),
    },
    update(t, dt) {
      tog.update(dt);
      const v = tog.value;
      if (v !== last) { drawCons(v); last = v; }
      lineMat.opacity = 0.35 + v * 0.35 + 0.05 * Math.sin(t * 1.5);
      (stars.material as THREE.PointsMaterial).opacity = 0.8 + 0.15 * Math.sin(t * 2.3);
      rings.rotation.y = t * 0.3;
      armillary.rotation.x = Math.sin(t * 0.2) * 0.3;
      armillary.rotation.z = t * 0.12;
      crowds.forEach((c) => c.update(t));
    },
  };
};

export default build;
