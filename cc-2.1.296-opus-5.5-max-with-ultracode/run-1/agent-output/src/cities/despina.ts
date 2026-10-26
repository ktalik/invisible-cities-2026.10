// DESPINA - Cities & Desire 3.
// A frontier city on the seam between two deserts, one of sand and one of sea.
// From the plateau the camel driver sees towers, radar masts, red and white
// windsocks and smoking chimneys, and dreams a ship. From the haze the sailor
// sees two dappled humps and a fringed saddle, and dreams a camel.
// Toggle: change traveller. The ghost of each one's desire swaps over the skyline.

import * as THREE from 'three';
import * as K from '../kit';
import type { CityBuilder } from '../core/types';

const GHOST_VERT = /* glsl */ `
  uniform float uTime; uniform float uBillow;
  varying vec3 vN; varying vec3 vV; varying float vY;
  void main() {
    vec3 p = position;
    float b = sin(uv.x * 3.14159) * sin(uv.y * 3.14159);
    p += normal * uBillow * b * (0.85 + 0.15 * sin(uTime * 1.6 + position.y * 0.4));
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
    vY = (modelMatrix * vec4(p, 1.0)).y;
    gl_Position = projectionMatrix * mv;
  }`;
const GHOST_FRAG = /* glsl */ `
  uniform vec3 uColor; uniform float uOpacity; uniform float uTime;
  varying vec3 vN; varying vec3 vV; varying float vY;
  void main() {
    float f = 1.0 - abs(dot(normalize(vN), normalize(vV)));
    float shimmer = 0.85 + 0.15 * sin(vY * 6.0 - uTime * 3.0);
    gl_FragColor = vec4(uColor * (0.16 + 1.8 * f * f) * shimmer * uOpacity, 1.0);
  }`;

function ghostMat(color: string, billow = 0) {
  return new THREE.ShaderMaterial({
    vertexShader: GHOST_VERT, fragmentShader: GHOST_FRAG,
    uniforms: { uTime: K.U.time, uBillow: { value: billow }, uColor: { value: new THREE.Color(color) }, uOpacity: { value: 0 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
}

const build: CityBuilder = (ctx) => {
  const rng = ctx.rng;
  const root = new THREE.Group();

  // ---- the two deserts: dunes to the west, sea to the east
  const coastX = (z: number) => 4.8 + 1.1 * Math.sin(z * 0.13);
  const height = (x: number, z: number) => {
    const cx = coastX(z);
    if (x > cx) return -1.8 * K.smoothstep(cx, cx + 3, x);
    const ramp = K.smoothstep(-8.5, -22, x);
    const crest = 0.5 + 0.5 * Math.sin(x * 0.42 + 1.2 * Math.sin(z * 0.11) + K.fbm2(x * 0.05, z * 0.05) * 3);
    return ramp * (2.4 + Math.pow(crest, 2.2) * 1.3) + K.smoothstep(-8.5, -12, x) * K.fbm2(x * 0.3, z * 0.3) * 0.15;
  };
  const sandLo = new THREE.Color('#c98c4c'), sandHi = new THREE.Color('#f0c886'), wet = new THREE.Color('#a77d52'), deep = new THREE.Color('#3f7c86');
  root.add(K.terrain({
    width: 170, depth: 170, seg: 200, height,
    color: (x, y, z, out) => {
      if (y < -0.1) out.copy(wet).lerp(deep, K.clamp(-y / 1.6));
      else out.copy(sandLo).lerp(sandHi, K.clamp(((y % 1.3) + 1.3) % 1.3 / 1.3 * 0.6 + K.noise2(x * 0.4, z * 0.4) * 0.2 + 0.2));
      if (x > -9 && x < coastX(z) && y > -0.1) out.lerp(new THREE.Color('#d6b98e'), 0.6);
    },
  }));
  root.add(K.waterRect(90, 180, 47, -0.22, 0, 0, { color: '#1f6489', amp: 0.28, scale: 0.9, speed: 0.4 }));

  const b = new K.Batch();
  // quay along the shore
  for (let z = -15; z <= 15; z += 1) b.add(K.at(K.box(1.4, 0.35, 1.02), coastX(z) - 0.4, -0.1, z), '#cbb593', 'stone');

  // ---- landward: the hull podium carrying seven towers in a fore-and-aft row
  const PX = -4;
  const hull = K.prism([[-2.25, 13], [2.25, 13], [2.4, -8], [1.2, -13], [0, -15.5], [-1.2, -13], [-2.4, -8]], 2.4);
  b.add(K.at(hull, PX, 0, 0), '#d9c8a8', 'stone');
  b.add(K.at(K.prism([[-2.35, 13.1], [2.35, 13.1], [2.5, -8], [1.25, -13.1], [0, -15.7], [-1.25, -13.1], [-2.5, -8]], 0.18), PX, 2.4, 0), '#8c4a32', 'ceramic');
  for (let z = -11.5; z < 12.6; z += 0.55) for (const s of [-1, 1]) {
    b.add(K.at(K.box(0.04, 0.42, 0.3), PX + s * (Math.abs(z) < 8 ? 2.33 : 2.35 - (z < -8 ? (-8 - z) * 0.23 : 0)), 0.35, z), '#ffcf7a', 'glow', rng.chance(0.8) ? 2.6 : 0.4);
  }
  const H = [11, 15, 18, 17, 14, 12, 9];
  const TZ = H.map((_, i) => -10.5 + i * 3.5);
  for (let i = 0; i < 7; i++) {
    const h = H[i] - 2.4, z = TZ[i], w = 0.62 + (h / 18) * 0.2;
    b.add(K.at(K.ngon(w * 1.41, h, 4, w * 1.1), PX, 2.4, z, { ry: Math.PI / 4 }), '#efe6d6', 'plaster');
    for (let y = 3.2; y < 2.4 + h - 0.6; y += 0.62) {
      const k = 1 - (y - 2.4) / h * 0.22;
      b.add(K.at(K.box(w * 2 * k + 0.04, 0.2, w * 2 * k + 0.04), PX, y, z), '#4a5f6c', 'stone');
      if (rng.chance(0.25)) b.add(K.at(K.box(w * 2 * k + 0.06, 0.12, 0.25), PX, y + 0.04, z + rng.float(-0.3, 0.3)), '#ffd889', 'glow', 2.2);
    }
    b.add(K.at(K.cyl(0.06, 0.12, 2.6, 6), PX, 2.4 + h, z), '#c9c2b5', 'metal');
    b.add(K.at(K.cone(0.05, 0.6, 6), PX, 2.4 + h + 2.6, z), '#e2463a', 'ceramic');
    // skybridges with rolled awnings, like yards with furled sails
    if (i < 6) {
      const hm = Math.min(H[i], H[i + 1]) - 1.5;
      for (const y of [hm * 0.45, hm * 0.68, hm * 0.9]) {
        b.add(K.at(K.box(0.5, 0.3, 3.5 - 1.3), PX, y, z + 1.75), '#d8cfbf', 'plaster');
        b.add(K.at(K.cyl(0.17, 0.17, 2.2, 10), PX - 0.35, y + 0.42, z + 1.75, { rx: Math.PI / 2 }).translate(0, 0, 0), '#f5ecd8', 'cloth');
      }
    }
  }
  // four banded chimneys (a steamer's funnels)
  const chimTop: THREE.Vector3[] = [];
  for (const [cz, ch] of [[-7.5, 8.5], [-4, 9], [4.2, 8.6], [8.5, 8]] as const) {
    const cx = PX + 1.55;
    for (let k = 0; k < 6; k++) b.add(K.at(K.cyl(0.36, 0.38, (ch - 2.4) / 6, 14), cx, 2.4 + (k * (ch - 2.4)) / 6, cz), k % 2 ? '#f4efe6' : '#c8372c', 'ceramic');
    b.add(K.at(K.torus(0.38, 0.05, 6, 16), cx, ch, cz), '#2c2a28', 'metal');
    chimTop.push(new THREE.Vector3(cx, ch + 0.1, cz));
  }

  // ---- seaward: two dappled domes (the humps) and the saddle bazaar between
  const domes = [{ x: 2.1, z: -6.8 }, { x: 2.1, z: 5.6 }];
  const dappleA = new THREE.Color('#f3eadb'), ochre = new THREE.Color('#d39a4c'), terra = new THREE.Color('#b0583a');
  for (const [di, d] of domes.entries()) {
    const g = K.dome(3.9, 56, 1, 1.12);
    K.paintBy(g, (x, y, z, out) => {
      const n = K.noise3(x * 0.55 + di * 9, y * 0.55, z * 0.55);
      const n2 = K.noise3(x * 1.6, y * 1.6 + 4, z * 1.6);
      out.copy(dappleA);
      out.lerp(ochre, K.smoothstep(0.15, 0.4, n) * 0.85);
      out.lerp(terra, K.smoothstep(0.35, 0.6, n2) * 0.75);
    });
    b.add(K.at(g, d.x, 2.1, d.z), null, 'plaster');
    b.add(K.at(K.cyl(4.0, 4.3, 2.1, 40), d.x, 0, d.z), '#ece2cf', 'plaster');
    for (let k = 0; k < 28; k++) {
      const a = (k / 28) * Math.PI * 2;
      b.add(K.at(K.archWall(0.34, 0.75, 0.06, 0.2, 0.5, 6), d.x + Math.cos(a) * 4.17, 0.6, d.z + Math.sin(a) * 4.17, { ry: Math.PI / 2 - a }), '#e3d6bd', 'plaster');
      b.add(K.at(K.box(0.2, 0.45, 0.04), d.x + Math.cos(a) * 4.16, 0.6, d.z + Math.sin(a) * 4.16, { ry: Math.PI / 2 - a }), k % 3 ? '#3a2e28' : '#ffcc7a', k % 3 ? 'matte' : 'glow', 2);
    }
    b.add(K.at(K.torus(4.12, 0.08, 6, 64), d.x, 2.1, d.z), '#d8c7a6', 'stone');
    b.add(K.at(K.cone(0.12, 0.8, 8), d.x, 2.1 + 3.9 * 1.12, d.z), '#c79a3e', 'gold');
    for (let k = 0; k < 70; k++) { // dark window dots on the hump
      const a = rng.angle(), el = rng.float(0.15, 1.1);
      const nx = Math.cos(a) * Math.cos(el), ny = Math.sin(el), nz = Math.sin(a) * Math.cos(el);
      b.add(K.at(K.box(0.14, 0.2, 0.14), d.x + nx * 3.92, 2.1 + ny * 3.9 * 1.12, d.z + nz * 3.92, { ry: -a }), rng.chance(0.3) ? '#ffcc7a' : '#3a2e28', rng.chance(0.3) ? 'glow' : 'matte', 1.8);
    }
    // whitewashed cubes stepping up to the hump
    for (let k = 0; k < 46; k++) {
      const a = rng.angle(), r = rng.float(4.2, 5.6);
      const x = d.x + Math.cos(a) * r, z = d.z + Math.sin(a) * r;
      if (x < PX + 3.2 || x > coastX(z) - 0.9 || Math.abs(z + 0.6) < 2.1) continue;
      K.house(b, { x, z, ry: rng.float(-0.2, 0.2), w: rng.float(0.6, 1.1), d: rng.float(0.6, 1.1), h: (6 - r) * rng.float(0.8, 1.4) + 0.4, roof: 'flat', wall: rng.pick(['#f3eadb', '#efe4cf', '#e8dcc4']), lit: 0.3, glow: 2, rng });
    }
  }
  // saddle: terraces under embroidered canopies
  const cloths = ['#b3243a', '#e8a33a', '#2e3a7a', '#b3243a', '#e8a33a'];
  for (let k = 0; k < 4; k++) {
    const x = 0.2 + k * 1.15, hgt = 2.6 - k * 0.45;
    b.add(K.at(K.box(1.1, hgt, 4.2), x, 0, -0.6), '#efe4cf', 'plaster');
    for (let j = 0; j < 3; j++) {
      const c = K.at(K.box(1.2, 0.05, 1.35), x + 0.1, hgt + 0.55, -2 + j * 1.4, { rz: -0.18 });
      b.add(c, cloths[(k + j) % cloths.length], 'cloth');
      for (const pz of [-0.6, 0.6]) b.add(K.at(K.cyl(0.025, 0.025, 0.55, 5), x + 0.5, hgt, -2 + j * 1.4 + pz), '#6b4a2a', 'wood');
    }
  }
  // the glittering fringe: strings of brass lamps and sequins along the seaward edge
  const fringeA: THREE.Vector3[] = [], fringeB: THREE.Vector3[] = [];
  for (let s = 0; s < 5; s++) {
    const y = 2.2 + s * 0.45;
    const pts = K.ropePoints([5.4, y + 0.4, -3.4], [5.4, y + 0.4, 2.4], 0.7 + s * 0.1, 40);
    pts.forEach((p, i) => {
      (i % 2 ? fringeA : fringeB).push(p);
      b.add(K.at(K.sphere(0.04, 6, 4), p.x, p.y, p.z), '#d6a640', 'gold');
      if (i % 3 === 0) b.add(K.at(K.box(0.012, 0.3, 0.012), p.x, p.y - 0.3, p.z), '#d6a640', 'gold');
    });
    b.add(K.rope([5.4, y + 0.4, -3.4], [5.4, y + 0.4, 2.4], 0.7 + s * 0.1, 0.012), '#5a4630', 'wood');
  }

  // ---- causeway (the neck) to a lighthouse (the head), and a short jetty
  const neck: THREE.Vector3[] = [];
  for (let i = 0; i <= 20; i++) {
    const u = i / 20;
    neck.push(new THREE.Vector3(3.5 + u * 5 + Math.sin(u * 3) * 0.8, 0, -10.2 - u * 8.5));
  }
  for (let i = 0; i < neck.length - 1; i++) {
    const a = neck[i], c = neck[i + 1];
    const len = a.distanceTo(c), ang = Math.atan2(c.x - a.x, c.z - a.z);
    b.add(K.at(K.box(1.1, 0.6, len + 0.05), (a.x + c.x) / 2, -0.35, (a.z + c.z) / 2, { ry: ang }), '#cbb593', 'stone');
  }
  const LH = neck[neck.length - 1];
  K.tower(b, { x: LH.x, z: LH.z, r: 0.55, h: 4.6, sides: 12, top: 'none', color: '#f1ebe0', bands: 0.9, bandColor: '#c8372c', taper: 0.75 });
  b.add(K.at(K.cyl(0.45, 0.45, 0.6, 12), LH.x, 4.6, LH.z), '#fff1c4', 'glow', 3);
  b.add(K.at(K.dome(0.5, 12), LH.x, 5.2, LH.z), '#2c2a28', 'metal');
  b.add(K.at(K.box(0.8, 0.3, 7), 8.4, -0.2, 9.5), '#8a6a48', 'wood');

  // little ships at anchor and a caravan's tents on the dunes
  const boatGeos: THREE.Object3D[] = [];
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(i % 2 ? K.sailboatGeometry(1.3, '#5a3e2b', '#f1e6cc') : K.boatGeometry(0.9, '#3a2a20'), K.figureMaterial());
    m.position.set(9 + rng.float(0, 7), -0.22, rng.float(-12, 14));
    m.rotation.y = rng.float(0, Math.PI * 2);
    root.add(m); boatGeos.push(m);
  }
  for (let i = 0; i < 9; i++) {
    const x = rng.float(-26, -12), z = rng.float(-20, 20);
    K.tree(b, { x, z, y: height(x, z) - 0.05, kind: 'shrub', h: 0.5, rng, color: '#7a7a45' });
  }

  root.add(b.build({ name: 'despina' }));

  // ---- windsocks on outriggers (instanced, flapping seaward)
  const sockGeo = K.cyl(0.13, 0.05, 0.95, 10, true);
  K.at(sockGeo, 0, 0, 0, { rz: -Math.PI / 2 });
  K.paintBy(sockGeo, (x, _y, _z, out) => { out.set(Math.floor(x / 0.19) % 2 ? '#f6f1e8' : '#e2463a'); });
  const sockMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide });
  const socks: THREE.Vector3[] = [];
  const poleB = new K.Batch();
  for (let k = 0; k < 12; k++) {
    const i = k % 7, s = k < 7 ? 1 : -1;
    const y = 2.4 + (H[i] - 2.4) * (k < 7 ? 0.82 : 0.55);
    const x0 = PX + s * 0.7, x1 = PX + s * 1.8;
    poleB.add(K.strut([x0, y, TZ[i]], [x1, y, TZ[i]], 0.03), '#3a3a3a', 'metal');
    poleB.add(K.strut([x1, y, TZ[i]], [x1, y + 0.6, TZ[i]], 0.025), '#3a3a3a', 'metal');
    socks.push(new THREE.Vector3(x1, y + 0.55, TZ[i]));
  }
  root.add(poleB.build());
  const sockMesh = K.instanced(sockGeo, sockMat, socks.length, undefined, { colors: false });
  root.add(sockMesh);
  const setSock = K.instanceSetter(sockMesh);

  // radar antennae on four towers
  const radars: THREE.Group[] = [];
  for (const i of [1, 2, 3, 5]) {
    const rb = new K.Batch();
    rb.add(K.at(K.box(1.5, 0.12, 0.14), 0, 0, 0), '#e9e6df', 'metal');
    rb.add(K.at(K.box(0.1, 0.35, 0.1), 0, -0.3, 0), '#9a9a9a', 'metal');
    rb.add(K.at(K.sphere(0.06, 8, 6), 0.75, 0.06, 0), '#ff6040', 'glow', 3);
    const g = rb.build();
    g.position.set(PX, H[i] + 1.4, TZ[i]);
    root.add(g); radars.push(g);
  }

  root.add(K.smoke({ sources: chimTop, perSource: 26, height: 7, color: '#c9bba8', opacity: 0.45, size: [0.6, 2.4], life: 7, wind: [1.4, 0.2], rng: rng.fork('smoke') }));
  const fringeHalosA = K.glowPoints(fringeA, '#ffd57a', 0.45, 0.8);
  const fringeHalosB = K.glowPoints(fringeB, '#ffe9b0', 0.35, 0.8);
  root.add(fringeHalosA, fringeHalosB);
  const lhBeam = K.beam([0, 0, 0], [12, -1.5, 0], 0.2, 2.4, '#fff1c4', 0.12);
  const beamPivot = new THREE.Group();
  beamPivot.position.set(LH.x, 4.9, LH.z);
  beamPivot.add(lhBeam);
  root.add(beamPivot);
  const lhGlow = K.glowSprite('#fff1c4', 2.4, 0.8);
  lhGlow.position.set(LH.x, 4.9, LH.z);
  root.add(lhGlow);

  // ---- the caravan crossing the dunes, and the camel driver on the tableland
  const camelGeo = K.quadruped({ len: 0.5, h: 0.42, color: '#a7764a', hump: true, longNeck: true, tail: 0.1 });
  const caravanPath: THREE.Vector3[] = [];
  for (let i = 0; i <= 30; i++) {
    const x = -9 - i * 1.2, z = -6 + Math.sin(i * 0.3) * 4;
    caravanPath.push(new THREE.Vector3(x, height(x, z) + 0.01, z));
  }
  const caravan = new K.Walkers({ paths: [caravanPath], count: 9, geometry: camelGeo, speed: [0.35, 0.35], rng: rng.fork('car'), colors: ['#a7764a', '#8c6440', '#b98a5a'] });
  root.add(caravan.mesh);
  const quay: THREE.Vector3[] = [];
  for (let z = -14; z <= 14; z += 1) quay.push(new THREE.Vector3(coastX(z) - 0.4, 0.26, z));
  const people = new K.Walkers({ paths: [quay], count: 40, rng: rng.fork('ppl'), speed: [0.15, 0.35], colors: ['#3a4f6b', '#e8e0d0', '#8a3a2e', '#2f2a26', '#c79a3e'] });
  root.add(people.mesh);
  const driverX = -27, driverZ = 10;
  const driver = new THREE.Mesh(K.quadruped({ len: 0.7, h: 0.6, color: '#9c6c42', hump: true, longNeck: true, tail: 0.1 }), K.figureMaterial());
  driver.position.set(driverX, height(driverX, driverZ), driverZ);
  driver.rotation.y = Math.PI / 2 + 0.3;
  root.add(driver);
  root.add(K.crowd({ count: 1, place: () => [driverX + 0.4, height(driverX + 0.4, driverZ - 0.5), driverZ - 0.5], colors: ['#e9e1cf'], h: 0.3 }));

  const gulls = new K.Flock({ count: 18, center: [10, 0, 0], radius: 9, height: 9, color: '#f4f0e6', span: 0.35, speed: 0.4, rng: rng.fork('gull') });
  root.add(gulls.mesh);
  root.add(K.particles({ count: 400, radius: 30, y0: 0.2, y1: 6, color: '#f7deb0', size: 0.05, opacity: 0.45, velocity: [0.9, 0, 0.1], swirl: 0.4, twinkle: 0.3, rng: rng.fork('dust') }));

  // ---- the desires: a ghost windjammer over the towers, a ghost camel over the domes
  const shipSail = ghostMat('#fff0d8', 0.7), shipFrame = ghostMat('#ffd9a0');
  const camelBody = ghostMat('#ffd0a0');
  const ship = new THREE.Group();
  const sailEdges: [K.V3, K.V3][] = [];
  for (let i = 0; i < 7; i++) {
    const top = H[i] + 1.5;
    const n = H[i] > 14 ? 4 : 3;
    for (let s = 0; s < n; s++) {
      const y0 = 4.2 + (s * (top - 4.2)) / n, y1 = 4.2 + ((s + 1) * (top - 4.2)) / n - 0.25;
      const wdt = 3.3 - s * 0.35;
      const sail = new THREE.Mesh(new THREE.PlaneGeometry(wdt, y1 - y0, 8, 6), shipSail);
      sail.rotation.y = -Math.PI / 2;
      sail.position.set(PX - 1.25, (y0 + y1) / 2, TZ[i]);
      ship.add(sail);
      const zx = TZ[i], hw = wdt / 2, xs = PX - 1.25;
      sailEdges.push([[xs, y0, zx - hw], [xs, y0, zx + hw]], [[xs, y1, zx - hw], [xs, y1, zx + hw]]);
      for (let q = 0; q < 6; q++) {
        const ya = y0 + ((y1 - y0) * q) / 6, yb = y0 + ((y1 - y0) * (q + 1)) / 6;
        const ba = Math.sin((q / 6) * Math.PI) * 0.55, bb = Math.sin(((q + 1) / 6) * Math.PI) * 0.55;
        sailEdges.push([[xs - ba, ya, zx], [xs - bb, yb, zx]], [[xs, ya, zx - hw], [xs, yb, zx - hw]], [[xs, ya, zx + hw], [xs, yb, zx + hw]]);
      }
      const yard = new THREE.Mesh(K.at(K.cyl(0.05, 0.05, wdt + 0.4, 5), 0, 0, 0, { rx: Math.PI / 2 }), shipFrame);
      yard.position.set(PX - 1.25, y1 + 0.12, TZ[i] - 0.0);
      yard.geometry.translate(0, 0, 0);
      ship.add(yard);
    }
  }
  const shipHull = new THREE.Mesh(K.at(K.prism([[-3.4, 15], [3.4, 15], [3.6, -9], [1.6, -15], [0, -18], [-1.6, -15], [-3.6, -9]], 3.6), PX, -0.6, 0), shipFrame);
  ship.add(shipHull);
  ship.add(new THREE.Mesh(K.strut([PX, 3.4, -17.5], [PX, 7.5, -24], 0.08), shipFrame));
  // far ports shimmering above the sea horizon: cranes, tavern lights
  for (let k = 0; k < 7; k++) {
    const z = -30 + k * 10, x = 70;
    ship.add(new THREE.Mesh(K.merge([K.at(K.box(0.7, 9, 0.7), x, 0, z), K.at(K.box(9, 0.6, 0.6), x - 2, 9, z, { ry: 0.3 * k }), K.at(K.box(3, 2 + (k % 3), 6), x + 3, 0, z + 3)]), shipFrame));
  }
  const edgeLines = K.lines(sailEdges, '#fff4dc', 0.8);
  ship.add(edgeLines);
  root.add(ship);

  const camel = new THREE.Group();
  const cg = (g: THREE.BufferGeometry) => camel.add(new THREE.Mesh(g, camelBody));
  cg(K.at(K.sphere(1, 24, 16), 2.1, 4.2, -0.6, { s: [3.6, 2.6, 9.5] }));
  for (const d of domes) cg(K.at(K.sphere(1, 20, 14), d.x, 6.2, d.z, { s: [3.0, 2.4, 3.6] }));
  cg(K.tube([[2.6, 4.4, -9.2], [4.6, 3.8, -12.5], [6.4, 5.6, -15.5], [LH.x, 6.6, LH.z + 0.6]], 1.0, 24, 10));
  cg(K.at(K.sphere(1, 16, 12), LH.x + 0.3, 6.8, LH.z - 0.6, { s: [1.3, 1.1, 2.4] }));
  for (const [lx, lz] of [[0.6, -6.5], [3.6, -6.5], [0.6, 5.2], [3.6, 5.2]]) cg(K.at(K.cyl(0.55, 0.42, 3.4, 10), lx, -0.4, lz));
  cg(K.tube([[2.1, 4.6, 8.8], [2.1, 3.0, 10.2], [2.0, 1.8, 10.6]], 0.25, 10, 6));
  // the mirage caravan heading for palm shade and whitewashed courts on the tableland
  for (let k = 0; k < 8; k++) {
    const x = -48 + rng.float(-3, 3), z = -24 + k * 6.5;
    const parts = [K.at(K.cyl(0.25, 0.35, 7, 6), x, 2, z, { rz: rng.float(-0.15, 0.15) })];
    for (let f = 0; f < 6; f++) parts.push(K.at(K.box(4, 0.15, 0.8), x + Math.cos(f) * 1.6, 9 - 0.6 * Math.abs(Math.sin(f)), z + Math.sin(f) * 1.6, { ry: f, rz: 0.4 }));
    parts.push(K.at(K.box(4, 2.6, 4), x + 3.5, 2.5, z + 2.4));
    camel.add(new THREE.Mesh(K.merge(parts), camelBody));
  }
  root.add(camel);

  const traveller = new K.Toggle(0.4);

  return {
    root,
    env: {
      skyTop: '#7f9cbc', skyHorizon: '#f4cc95', skyBottom: '#d9b07c', skyCurve: 0.5,
      fog: '#ecc99c', fogNear: 55, fogFar: 160,
      sunDir: [-0.85, 0.3, 0.3], sunColor: '#ffc27a', sunIntensity: 2.8, sunDisc: 1, sunGlow: 1.4,
      hemiSky: '#a9bcd0', hemiGround: '#b8875a', hemiIntensity: 0.7, envIntensity: 0.8,
      clouds: 0.2, cloudColor: '#ffe2bc',
      bloomStrength: 0.65, bloomThreshold: 0.85, bloomRadius: 0.5,
      tiltShift: 0.4, shadowRadius: 26, vignette: 0.35, saturation: 1.08,
    },
    camera: {
      position: [-36, 9.5, 17], target: [0, 5.2, 0], fov: 40,
      minDistance: 12, maxDistance: 80, maxPolar: 1.48, autoRotate: 0.15,
      views: [
        { position: [36, 3, -9], target: [1, 4.5, 0] },
        { position: [-10, 34, 26], target: [0, 2, -1] },
      ],
    },
    interaction: {
      label: 'Arrive by sea',
      activeLabel: 'Arrive by camel',
      hint: 'Each traveller sees in the city the vessel of his own escape.',
      camera: { position: [36, 3, -9], target: [1, 4.5, 0] },
      set: (on) => traveller.set(on),
    },
    update(t, dt) {
      traveller.update(dt);
      const v = traveller.value;
      const breathe = 0.85 + 0.15 * Math.sin(t * 0.7);
      shipSail.uniforms.uOpacity.value = (1 - v) * 0.32 * breathe;
      shipFrame.uniforms.uOpacity.value = (1 - v) * 0.28 * breathe;
      shipSail.uniforms.uBillow.value = 0.55 + 0.25 * Math.sin(t * 0.9);
      ship.position.y = Math.sin(t * 9) * 0.02 * (1 - v);
      ship.visible = v < 0.999;
      (edgeLines.material as THREE.LineBasicMaterial).opacity = (1 - v) * 0.7;
      camelBody.uniforms.uOpacity.value = v * 0.6 * breathe;
      camel.visible = v > 0.001;
      camel.rotation.z = Math.sin(t * 1.1) * 0.012;
      camel.position.y = Math.abs(Math.sin(t * 1.1)) * 0.15;
      // windsocks stream seaward and flap
      socks.forEach((p, i) => {
        const f = Math.sin(t * 5 + i * 1.7);
        setSock(i, p.x, p.y, p.z, 0.15 * f + Math.sin(t * 0.4 + i) * 0.2, [1 + 0.06 * f, 1, 1], 0, -0.12 + 0.08 * Math.sin(t * 3.1 + i));
      });
      setSock.done();
      radars.forEach((r, i) => (r.rotation.y = t * (0.9 + i * 0.25) + i));
      beamPivot.rotation.y = -t * 0.6;
      lhGlow.material.opacity = 0.55 + 0.35 * Math.max(0, Math.cos(t * 0.6 + 0.0));
      (fringeHalosA.material as THREE.PointsMaterial).opacity = 0.45 + 0.4 * Math.max(0, Math.sin(t * 3.1));
      (fringeHalosB.material as THREE.PointsMaterial).opacity = 0.45 + 0.4 * Math.max(0, Math.sin(t * 2.3 + 2));
      boatGeos.forEach((m, i) => {
        m.position.y = -0.24 + Math.sin(t * 1.3 + i) * 0.05;
        m.rotation.z = Math.sin(t * 1.1 + i * 2) * 0.06;
      });
      caravan.update(t);
      people.update(t);
      gulls.update(t);
    },
  };
};

export default build;
