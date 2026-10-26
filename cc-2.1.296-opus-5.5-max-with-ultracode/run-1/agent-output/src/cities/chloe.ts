// CHLOE - Trading Cities 2.
// A great city of strangers who never greet or touch. Around a carousel bandstand
// the crowd circulates in rings; glances flash as luminous threads from head to head,
// close into triangles and stars, and snap a second later. Nothing physical ever
// connects. Toggle: live the dreams - the threads harden into cords, the carousel
// stops, and the stories of pursuit and quarrel begin.

import * as THREE from 'three';
import * as K from '../kit';
import type { CityBuilder } from '../core/types';

const hash = (a: number, b: number) => {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x6d2b79f5, 0xc2b2ae35);
  h ^= h >>> 15; h = Math.imul(h, 0x27d4eb2f); h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
};

const build: CityBuilder = (ctx) => {
  const rng = ctx.rng;
  const root = new THREE.Group();
  const isl = K.island({ radius: 20, flat: 18.5, depth: 8, hills: 0, top: '#3a3946', edge: '#34333f', cliff: '#4a4450', under: '#241f2a', strata: '#5a5060', seed: 2 });
  root.add(isl.mesh);
  root.add(K.cloudSea({ y: -7, color: '#b98a9a', shadow: '#2b1e3f', opacity: 0.65, coverage: 0.5 }));
  const b = new K.Batch();

  // ---- wet cobbles: piazza rings, puddles (glossy own material)
  for (let r = 1.8; r < 8.6; r += 0.55) b.add(K.at(K.ring(r, r + 0.5, 72), 0, 0.01, 0), K.jitter('#4b4856', rng, 0.01, 0.04, 0.06), 'stone');
  const wet = new THREE.MeshStandardMaterial({ color: '#232230', roughness: 0.08, metalness: 0.6, envMapIntensity: 1.4 });
  const pud: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 46; i++) {
    const [x, z] = rng.inDisc(17);
    pud.push(K.at(K.disc(rng.float(0.4, 1.4), 18), x, 0.022, z, { s: [1, 1, rng.float(0.4, 0.9)], ry: rng.angle() }));
  }
  const puddles = new THREE.Mesh(K.merge(pud), wet);
  puddles.receiveShadow = true;
  root.add(puddles);

  // ---- the bandstand: a carousel pavilion
  b.add(K.ngon(1.6, 0.35, 8), '#e8d8c4', 'stone');
  b.add(K.at(K.ngon(1.7, 0.06, 8), 0, 0.35, 0), '#c98868', 'stone');
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    b.add(K.at(K.cyl(0.045, 0.05, 1.3, 8), Math.cos(a) * 1.45, 0.4, Math.sin(a) * 1.45), '#efe3d0', 'polished');
  }
  b.add(K.at(K.torus(1.5, 0.05, 6, 48), 0, 1.72, 0), '#d9b25a', 'gold');
  for (let g = 0; g < 16; g++) {
    const gore = new THREE.ConeGeometry(1.85, 0.95, 2, 1, true, (g / 16) * Math.PI * 2, Math.PI / 8).translate(0, 0.475, 0);
    b.add(K.at(gore, 0, 1.7, 0), g % 2 ? '#f3e6d2' : '#e97a68', 'cloth');
  }
  for (let g = 0; g < 16; g++) {
    const a = (g / 16) * Math.PI * 2;
    b.add(K.at(K.sphere(0.07, 8, 6), Math.cos(a) * 1.83, 1.68, Math.sin(a) * 1.83), '#ffd9a0', 'glow', 2.2);
  }
  b.add(K.at(K.sphere(0.12, 10, 8), 0, 2.68, 0), '#d9b25a', 'gold');
  b.add(K.at(K.cone(0.05, 0.4, 6), 0, 2.76, 0), '#d9b25a', 'gold');

  // ---- arcade on the north arc (radius 10, about 110 degrees, 11 arches, two storeys above)
  const AR = 10, A0 = -Math.PI / 2 - 0.96, A1 = -Math.PI / 2 + 0.96;
  const arcLamps: [number, number, number][] = [];
  for (let i = 0; i < 11; i++) {
    const a = K.lerp(A0, A1, (i + 0.5) / 11), span = ((A1 - A0) / 11) * AR * 1.02;
    const x = Math.cos(a) * AR, z = Math.sin(a) * AR, ry = Math.atan2(-Math.cos(a), -Math.sin(a));
    b.add(K.at(K.archWall(span, 1.0, 0.2, span * 0.62, 0.85), x, 0, z, { ry }), '#c98868', 'plaster');
    b.add(K.at(K.box(span, 1.0, 0.2), Math.cos(a) * (AR + 1), 0, Math.sin(a) * (AR + 1), { ry }), '#9a6650', 'plaster');
    K.house(b, { x: Math.cos(a) * (AR + 0.5), z: Math.sin(a) * (AR + 0.5), y: 1.0, ry, w: span, d: 1.2, h: 1.3, roof: i % 2 ? 'flat' : 'gable', wall: i % 2 ? '#d29a7c' : '#c98868', roofColor: '#6b3c3a', lit: 0.5, glow: 2.2, rng, door: false, cornice: true });
    b.add(K.at(K.box(span, 0.03, 1.0), Math.cos(a) * (AR + 0.5), 0.99, Math.sin(a) * (AR + 0.5), { ry }), '#7a4a3a', 'plaster');
    arcLamps.push([Math.cos(a) * (AR + 0.5), 0.78, Math.sin(a) * (AR + 0.5)]);
    b.add(K.at(K.sphere(0.06, 8, 6), ...arcLamps[i]), '#ffcf9e', 'glow', 4);
  }

  // ---- the bazaar awning in the south-east
  const AX = 6.3, AZ = 6.3, ary = -Math.PI / 4;
  const loc = (lx: number, lz: number): [number, number] => [AX + lx * Math.cos(ary) + lz * Math.sin(ary), AZ - lx * Math.sin(ary) + lz * Math.cos(ary)];
  for (const lx of [-3, 0, 3]) for (const lz of [-2, 2]) { const [x, z] = loc(lx, lz); b.add(K.at(K.cyl(0.04, 0.04, 1.35, 6), x, 0, z), '#4b3a2c', 'wood'); }
  for (let s = 0; s < 12; s++) {
    const lx = -3 + (s + 0.5) * 0.5, [x, z] = loc(lx, 0);
    b.add(K.at(K.box(0.5, 0.04, 4.2), x, 1.35 + Math.sin(s * 0.8) * 0.03, z, { ry: ary, rx: 0 }), s % 2 ? '#f0e2c8' : '#4a5d73', 'cloth');
    for (const sz of [-1, 1]) { const [vx, vz] = loc(lx, sz * 2.1); b.add(K.at(K.cone(0.25, 0.22, 3), vx, 1.12, vz, { ry: ary, rx: Math.PI }), s % 2 ? '#f0e2c8' : '#4a5d73', 'cloth'); }
  }
  for (let i = 0; i < 5; i++) {
    const [x, z] = loc(-2.4 + i * 1.2, -1.2);
    b.add(K.at(K.box(0.9, 0.45, 0.5), x, 0, z, { ry: ary }), '#6e4a30', 'wood');
    for (let g = 0; g < 4; g++) b.add(K.at(K.sphere(0.08, 6, 5), x + rng.float(-0.3, 0.3), 0.5, z + rng.float(-0.15, 0.15)), rng.pick(['#e2b03c', '#c0472c', '#8fae4a', '#efe3c6']), 'ceramic');
  }

  // ---- six streets, lined by tall narrow houses
  const streets = [0.17, 1.48, 2.27, 3.05, -2.7, -0.42];
  const nearStreet = (a: number, r: number) => streets.some((s) => Math.abs(Math.atan2(Math.sin(a - s), Math.cos(a - s))) * r < 1.3);
  const inArc = (a: number) => a > A0 - 0.05 && a < A1 + 0.05;
  const inAwning = (x: number, z: number) => Math.hypot(x - AX, z - AZ) < 4.4;
  for (const [r, dh] of [[12, 0], [13.6, 0.4], [15.2, 0.8], [16.8, 1.1]] as const) {
    const n = Math.floor((Math.PI * 2 * r) / 1.25);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (nearStreet(a, r) || inAwning(x, z) || Math.hypot(x, z) > isl.rimAt(a) - 1.2) continue;
      const storeys = rng.int(3, 5) + (inArc(a) ? 1 : 0);
      K.house(b, {
        x, z, ry: Math.atan2(-Math.cos(a), -Math.sin(a)), w: rng.float(0.9, 1.2), d: rng.float(1.0, 1.4), h: storeys * 0.4 + dh,
        roof: rng.pick(['gable', 'hip', 'flat'] as const), wall: rng.pick(['#8c6a6e', '#a07c74', '#6f6578', '#b0907a', '#7d6a60']),
        roofColor: rng.pick(['#4a3a44', '#5a4048', '#3e3a48']), lit: 0.35, glow: 2.6, litColor: '#ffcf9e', rng,
      });
    }
  }
  // lamps on the piazza rim, with warm pools on the wet stone
  const lampPos: [number, number, number][] = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + 0.1, x = Math.cos(a) * 8.4, z = Math.sin(a) * 8.4;
    K.lamp(b, { x, z, h: 1.1, glow: '#ffcf9e', intensity: 5 });
    lampPos.push([x, 1.17, z]);
  }
  root.add(b.build({ name: 'chloe' }));
  root.add(K.glowPoints([...lampPos, ...arcLamps], '#ffcf9e', 1.5, 0.75));
  const pools = K.merge([...lampPos, ...arcLamps].map(([x, , z]) => new THREE.PlaneGeometry(3.2, 3.2).rotateX(-Math.PI / 2).translate(x, 0.035, z)), true);
  root.add(new THREE.Mesh(pools, new THREE.MeshBasicMaterial({ map: K.glowTexture(), color: '#ffb47a', transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false })));

  // ---- the crowd: three rings of strangers turning like a carousel
  type F = { r: number; a0: number; w: number; h: number; sway: number };
  const figs: F[] = [];
  const RINGS = [3.4, 5.2, 7.0];
  const N = 160;
  for (let i = 0; i < N; i++) {
    const ri = i < 34 ? 0 : i < 86 ? 1 : 2, cnt = [34, 52, 74][ri], k = i - [0, 34, 86][ri];
    const dir = ri % 2 ? -1 : 1, v = rng.float(0.32, 0.42);
    figs.push({ r: RINGS[ri] + rng.float(-0.3, 0.3), a0: (k / cnt) * Math.PI * 2 + rng.float(-0.03, 0.03), w: (dir * v) / RINGS[ri], h: rng.float(0.27, 0.33), sway: rng.angle() });
  }
  const crowd = K.instanced(K.personGeometry(1), K.figureMaterial(), N, (_i, _o, c) => { c.copy(K.pickJitter(['#9a96a2', '#6a7f98', '#9a7a66', '#b0a6b6', '#5e5866', '#a88c78'], rng)); });
  root.add(crowd);
  const setP = K.instanceSetter(crowd);

  // ---- the named strangers
  const chars: { g: THREE.Group; f: F; extra?: THREE.Object3D }[] = [];
  const person = (bb: K.Batch, h: number, body: string, head = '#e2c4a8', wide = 1) => {
    bb.add(K.at(K.cyl(h * 0.11 * wide, h * 0.2 * wide, h * 0.72, 10), 0, 0, 0), body, 'cloth');
    bb.add(K.at(K.sphere(h * 0.12, 8, 6), 0, h * 0.7, 0, { s: [1.1 * wide, 0.6, 0.9 * wide] }), body, 'cloth');
    bb.add(K.at(K.sphere(h * 0.1, 10, 8), 0, h * 0.86, 0), head, 'matte');
  };
  const addChar = (ri: number, a0: number, make: (bb: K.Batch) => void, h = 0.26) => {
    const bb = new K.Batch();
    make(bb);
    const g = bb.build();
    g.scale.setScalar(1.25);
    root.add(g);
    const dir = ri % 2 ? -1 : 1;
    const f: F = { r: RINGS[ri] + 0.15, a0, w: (dir * 0.36) / RINGS[ri], h: h * 1.25, sway: a0 };
    chars.push({ g, f });
    return chars[chars.length - 1];
  };
  const parasol = new THREE.Mesh(K.paint(K.cone(0.17, 0.07, 10), '#f6d4dc'), K.figureMaterial());
  const c0 = addChar(2, 0.3, (bb) => person(bb, 0.26, '#e6a6b4'));
  parasol.position.set(0.05, 0.33, 0); parasol.rotation.z = -0.3; c0.g.add(parasol);
  addChar(1, 1.1, (bb) => { person(bb, 0.27, '#18161c', '#2a2630'); bb.add(K.at(K.cone(0.05, 0.14, 8), 0, 0.22, 0), '#2a2630', 'cloth'); });
  addChar(0, 2.0, (bb) => {
    person(bb, 0.42, '#6d4a3a', '#c79a7a');
    for (let i = 0; i < 6; i++) bb.add(K.at(K.box(0.012, 0.012, 0.13), Math.sin(i) * 0.05, 0.12 + i * 0.04, 0.072 - i * 0.004, { ry: i * 0.6 }), '#7ff0ff', 'glow', 3);
  }, 0.42);
  addChar(2, 2.7, (bb) => { person(bb, 0.27, '#3a4a6a'); bb.add(K.at(K.sphere(0.03, 10, 8), 0, 0.245, -0.004, { s: [1, 0.85, 1.05] }), '#f4f2ee', 'matte'); });
  addChar(1, 3.3, (bb) => person(bb, 0.15, '#6b3f5e'), 0.15);
  addChar(2, 4.1, (bb) => person(bb, 0.25, '#ff7f6a'));
  addChar(2, 4.17, (bb) => person(bb, 0.25, '#ff7f6a'));
  const blind = addChar(1, 4.9, (bb) => { person(bb, 0.27, '#5a5048'); bb.add(K.strut([0.06, 0.13, 0.05], [0.12, 0, 0.16], 0.006, 4), '#e8e0d0', 'wood'); });
  const cheetah = new THREE.Mesh(K.quadruped({ len: 0.34, h: 0.17, tail: 0.18, ears: true, color: '#d9a64a' }), K.figureMaterial());
  cheetah.castShadow = true;
  cheetah.scale.setScalar(1.25);
  root.add(cheetah);
  const fanMesh = new THREE.Mesh(K.paint(new THREE.CircleGeometry(0.1, 12, 0, Math.PI), '#fbf3ea'), new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.8 }));
  const cour = addChar(0, 5.4, (bb) => person(bb, 0.27, '#8a2f4a'));
  fanMesh.position.set(0.08, 0.2, 0.06); cour.g.add(fanMesh);
  addChar(2, 5.9, (bb) => person(bb, 0.27, '#ece2d0'));
  addChar(1, 0.2, (bb) => person(bb, 0.25, '#b56a5a', '#e2c4a8', 2), 0.25);
  // the band
  root.add(K.crowd({ count: 6, rng: rng.fork('band'), h: 0.22, colors: ['#2b2b3a', '#6b3a3a'], place: (i) => [Math.cos(i * 1.047) * 0.9, 0.41, Math.sin(i * 1.047) * 0.9] }));
  root.add(K.glowPoints(Array.from({ length: 6 }, (_, i) => [Math.cos(i * 1.047) * 0.82, 0.58, Math.sin(i * 1.047) * 0.82] as [number, number, number]), '#ffd27a', 0.25, 0.9));

  // street traffic
  const paths = streets.map((s) => [new THREE.Vector3(Math.cos(s) * 9, 0.02, Math.sin(s) * 9), new THREE.Vector3(Math.cos(s) * 18, 0.02, Math.sin(s) * 18)]);
  const walkers = new K.Walkers({ paths, count: 36, rng: rng.fork('w'), speed: [0.25, 0.45], colors: ['#6b6872', '#4a5d73', '#6d5446', '#3e3a44'] });
  root.add(walkers.mesh);

  // ---- glance threads: thin instanced bars with HDR colour
  const NT = 56;
  const threadMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const threadGeo = new THREE.BoxGeometry(0.009, 0.009, 1).translate(0, 0, 0.5);
  const threads = K.instanced(threadGeo, threadMat, NT, undefined, { castShadow: false, receiveShadow: false });
  for (let i = 0; i < NT; i++) threads.setColorAt(i, new THREE.Color(0, 0, 0));
  root.add(threads);
  const cordMat = new THREE.MeshStandardMaterial({ color: '#b8352e', roughness: 0.6, transparent: true, opacity: 0 });
  const NC = 40;
  const cords = K.instanced(K.cyl(0.02, 0.02, 1, 5).rotateX(Math.PI / 2), cordMat, NC, undefined, { colors: false });
  root.add(cords);
  const setC = K.instanceSetter(cords);
  const flashPos = new Float32Array(12 * 3);
  const flashGeo = new THREE.BufferGeometry();
  flashGeo.setAttribute('position', new THREE.BufferAttribute(flashPos, 3));
  const flashMat = new THREE.PointsMaterial({ size: 0.7, map: K.glowTexture(), color: '#ff9a80', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 });
  const flashes = new THREE.Points(flashGeo, flashMat);
  flashes.frustumCulled = false;
  root.add(flashes);

  // drizzle, mist, band ripples
  const rain = K.particles({ count: 1400, radius: 16, y0: 0, y1: 10, color: '#c8d4ec', size: 0.03, opacity: 0, velocity: [0.4, -7, 0.2], rng: rng.fork('rain') });
  root.add(rain);
  root.add(K.particles({ count: 120, radius: 14, y0: 0.2, y1: 2.5, color: '#e8c8d8', size: 0.5, opacity: 0.06, swirl: 1, rng: rng.fork('mist') }));
  const ripMat = new THREE.MeshBasicMaterial({ color: '#ffcf9e', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const ripples = [0, 1, 2].map(() => { const m = new THREE.Mesh(K.ring(0.97, 1, 64).translate(0, 0.035, 0), ripMat); root.add(m); return m; });

  const dream = new K.Toggle(0.4);
  let clk = 0;
  const P = new THREE.Vector3(), Q = new THREE.Vector3(), O = new THREE.Object3D();
  const all = (): F[] => figs.concat(chars.map((c) => c.f));
  const F_ALL = all();
  const NA = F_ALL.length;
  const px = new Float32Array(NA), pz = new Float32Array(NA), py = new Float32Array(NA);
  const place = () => {
    for (let i = 0; i < NA; i++) {
      const f = F_ALL[i], a = f.a0 + f.w * clk, r = f.r + Math.sin(clk * 0.3 + f.sway) * 0.15;
      px[i] = Math.cos(a) * r; pz[i] = Math.sin(a) * r; py[i] = f.h * 0.88;
    }
  };
  const near = (i: number, salt: number) => {
    for (let k = 0; k < 10; k++) {
      const j = Math.floor(hash(i * 13 + k, salt) * NA);
      if (j !== i && Math.hypot(px[i] - px[j], pz[i] - pz[j]) < 5.5) return j;
    }
    return (i + 1) % NA;
  };
  const tc = new THREE.Color();
  const setThread = (s: number, i: number, j: number, grow: number, bright: number, col: string) => {
    P.set(px[i], py[i], pz[i]); Q.set(px[j], py[j], pz[j]);
    const len = P.distanceTo(Q) * grow;
    O.position.copy(P); O.scale.set(1, 1, 1); O.updateMatrixWorld(); O.lookAt(Q); O.scale.set(1, 1, Math.max(1e-4, len)); O.updateMatrix();
    threads.setMatrixAt(s, O.matrix);
    threads.setColorAt(s, tc.set(col).multiplyScalar(bright));
  };

  return {
    root,
    env: {
      skyTop: '#2b1e3f', skyHorizon: '#e3a091', skyBottom: '#3a2a46', skyCurve: 0.45,
      fog: '#8a6a82', fogNear: 60, fogFar: 200,
      sunDir: [-0.8, 0.14, 0.3], sunColor: '#ffb8a0', sunIntensity: 0.9, sunDisc: 0, sunGlow: 0.9,
      hemiSky: '#8a84b8', hemiGround: '#4a3a46', hemiIntensity: 0.8, envIntensity: 0.9,
      stars: 0.35, clouds: 0.3, cloudColor: '#d8a0a8',
      bloomStrength: 0.95, bloomThreshold: 0.72, bloomRadius: 0.5,
      tiltShift: 0.35, shadowRadius: 21, vignette: 0.42, saturation: 1.05,
    },
    camera: {
      position: [-12.5, 10.5, 13],
      target: [0, 0.8, 0],
      minDistance: 6, maxDistance: 60, autoRotate: 0.2,
      views: [
        { position: [0, 30, 8], target: [0, 0, 0] },
        { position: [4.5, 1.6, 6.5], target: [-1, 0.8, -1] },
      ],
    },
    interaction: {
      label: 'Live the dreams',
      activeLabel: 'Let them pass',
      hint: 'Every phantom becomes a person, and the carousel stops.',
      set: (on) => dream.set(on),
    },
    update(t, dt) {
      dream.update(dt);
      const d = dream.value, chaste = 1 - d;
      clk += dt * (1 - 0.985 * d);
      place();
      for (let i = 0; i < N; i++) {
        const f = figs[i];
        setP(i, px[i], 0.02, pz[i], -(f.a0 + f.w * clk) + (f.w < 0 ? Math.PI : 0), f.h);
      }
      setP.done();
      chars.forEach((c, k) => {
        const i = N + k, f = c.f;
        c.g.position.set(px[i], 0.02, pz[i]);
        c.g.rotation.y = -(f.a0 + f.w * clk) + (f.w < 0 ? Math.PI : 0) + (k % 4 === 1 ? d * Math.PI : 0);
      });
      const ba = blind.f.a0 + blind.f.w * clk + 0.13 * Math.sign(blind.f.w);
      cheetah.position.set(Math.cos(ba) * blind.f.r, 0.02, Math.sin(ba) * blind.f.r);
      cheetah.rotation.y = blind.g.rotation.y + Math.sin(t * 3) * 0.08;
      parasol.rotation.y = t * 4;
      fanMesh.scale.set(1, 0.3 + 0.7 * K.wave(t, 1.6), 1);
      // glances
      const shimmer = 0.85 + 0.15 * Math.sin(t * Math.PI * 2 * 7);
      for (let s = 0; s < 40; s++) {
        const per = 1.2 + hash(s, 1) * 1.4, ph = hash(s, 2) * per;
        const c = Math.floor((t + ph) / per), age = t + ph - c * per;
        const i = Math.floor(hash(s, c * 7 + 3) * NA), j = near(i, c * 31 + s);
        const grow = K.smoothstep(0, 0.12, age), life = per * 0.8;
        const br = grow * (1 - K.smoothstep(life - 0.15, life, age)) * (age < life ? 1 : 0);
        setThread(s, i, j, grow, br * 2.0 * shimmer * chaste, s % 3 ? '#ff9a8a' : '#ffcf9e');
      }
      // figures: every 3 s a triangle or a star among nearby strangers
      const sc = Math.floor(t / 3), sage = t - sc * 3;
      const seed = Math.floor(hash(sc, 99) * NA);
      const pts = [seed];
      for (let k = 0; pts.length < (sc % 2 ? 5 : 3) && k < 40; k++) {
        const j = Math.floor(hash(sc * 17 + k, 5) * NA);
        if (!pts.includes(j) && Math.hypot(px[j] - px[seed], pz[j] - pz[seed]) < 4.5) pts.push(j);
      }
      const star = pts.length === 5;
      const fb = sage < 1.6 ? K.smoothstep(0, 0.3, sage) * (1 - K.smoothstep(1.0, 1.6, sage)) : 0;
      for (let e = 0; e < 16; e++) {
        const s = 40 + e;
        if (e < pts.length) {
          const a = pts[e], bIdx = pts[(e + (star ? 2 : 1)) % pts.length];
          setThread(s, a, bIdx, K.smoothstep(e * 0.08, e * 0.08 + 0.12, sage), fb * 3.2 * shimmer * chaste, '#ff7a64');
        } else threads.setColorAt(s, tc.setRGB(0, 0, 0));
      }
      threads.instanceMatrix.needsUpdate = true;
      if (threads.instanceColor) threads.instanceColor.needsUpdate = true;
      pts.forEach((p, k) => flashPos.set([px[p], py[p] + 0.03, pz[p]], k * 3));
      for (let k = pts.length; k < 12; k++) flashPos.set([0, -40, 0], k * 3);
      flashGeo.attributes.position.needsUpdate = true;
      flashMat.opacity = fb * 0.9 * chaste;
      // living the dreams: cords bind pairs
      cordMat.opacity = d;
      cords.visible = d > 0.01;
      for (let k = 0; k < NC; k++) {
        const i = (k * 4) % NA, j = near(i, 777);
        P.set(px[i], py[i] * 0.7, pz[i]); Q.set(px[j], py[j] * 0.7, pz[j]);
        O.position.copy(P); O.scale.set(1, 1, 1); O.updateMatrixWorld(); O.lookAt(Q); O.scale.set(1, 1, P.distanceTo(Q) * d + 1e-4); O.updateMatrix();
        cords.setMatrixAt(k, O.matrix);
      }
      setC.done();
      walkers.update(clk);
      // rain showers every 40 s; band ripples on the puddles
      const rc = t % 40, shower = K.smoothstep(24, 27, rc) * (1 - K.smoothstep(34, 37, rc));
      ((rain.material as THREE.ShaderMaterial).uniforms.uOpacity.value as number) = 0.55 * shower;
      ripples.forEach((m, k) => {
        const p = K.fract(clk * 0.5 + k / 3);
        m.scale.setScalar(2 + p * 6);
        m.visible = true;
      });
      ripMat.opacity = 0.07 * chaste;
    },
  };
};

export default build;
