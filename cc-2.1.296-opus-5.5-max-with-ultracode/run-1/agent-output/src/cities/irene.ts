// IRENE - Cities & Names 5.
// Seen only from the rim of a plateau at lamp-lighting time: far below, in a dark
// valley walled by pale fluted clay gullies, the city exists almost only as light,
// a rose of windows dense at the heart, fraying along eleven petals into dim lanes,
// pocked by gardens, pricked by towers with signal fires. On the rim, a traveller,
// a shepherd and his flock, a bird-catcher with his nets and a hermit all look down
// and guess: tonight a festival, tonight a war, tonight nothing. Nobody goes down.
// Toggle: go down, and the rose comes apart into some other city.

import * as THREE from 'three';
import * as K from '../kit';
import type { CityBuilder } from '../core/types';

const TAU = Math.PI * 2;
const CZ = -6; // city centre z

function H(x: number, z: number): number {
  const rimZ = 14 + 1.2 * K.noise2(x * 0.15, 3.1) + 0.6 * Math.sin(x * 0.4);
  const t = K.smoothstep(4.5, rimZ, z + 1.2 * Math.sin(x * 0.27));
  let h = 9 * t;
  const flute = Math.pow(0.5 + 0.5 * Math.cos(x * 1.5 + K.noise2(x * 0.18, z * 0.25) * 3.5), 1.6);
  h -= flute * 2.6 * Math.min(1, t * (1 - t) * 4.5);
  h += 0.25 * K.ridged2(x * 0.12, z * 0.12, 3) * t;
  if (t > 0.98) h += 0.15 * K.fbm2(x * 0.3, z * 0.3, 2);
  if (t < 0.02) h += 0.08 * K.fbm2(x * 0.2, z * 0.2, 2);
  const rr = Math.hypot(x / 22.5, (z - 1) / 24);
  return K.lerp(h, -5, K.smoothstep(0.93, 1.02, rr));
}

const PT_VERT = /* glsl */ `
  attribute vec3 aOther; attribute vec4 aInfo; attribute vec3 aCol;
  uniform float uDown; uniform float uLight; uniform float uSize; uniform float uTime; uniform float uDrum;
  varying vec3 vCol; varying float vA;
  void main() {
    float d = smoothstep(aInfo.z * 0.5, 0.5 + aInfo.z * 0.5, uDown);
    vec3 p = mix(position, aOther, d);
    p.y += sin(d * 3.14159) * 1.5 * aInfo.w;
    float on = smoothstep(aInfo.x, aInfo.x + 0.04, uLight);
    float tw = 0.85 + 0.15 * sin(uTime * (1.0 + aInfo.w * 3.0) + aInfo.w * 40.0);
    vec3 cool = vec3(0.85, 0.9, 1.0) * 1.3;
    vCol = mix(aCol * aInfo.y * (1.0 + uDrum * 0.35), cool * (0.4 + 0.6 * aInfo.w), d) * tw;
    vA = on;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * (0.6 + 0.8 * aInfo.w) / -mv.z;
    gl_Position = projectionMatrix * mv;
  }`;
const PT_FRAG = /* glsl */ `
  varying vec3 vCol; varying float vA;
  void main() {
    float r = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, r) * vA;
    gl_FragColor = vec4(vCol * a, a);
  }`;

const build: CityBuilder = (ctx) => {
  const rng = ctx.rng;
  const root = new THREE.Group();

  // ---- valley, gullies, plateau: one heightfield
  const terr = K.terrain({
    width: 46, depth: 48, seg: 190,
    height: (x, z) => H(x, z + 1),
    color: (x, y, z, out) => {
      const zw = z + 1;
      if (y < 0.4 && zw < 9) out.set('#1b1f2c').lerp(K.col('#262b38'), K.clamp(K.fbm2(x * 0.3, zw * 0.3, 2) + 0.5));
      else if (y > 8.6 && zw > 12) out.set('#3a4333').lerp(K.col('#56603f'), K.clamp(0.5 + K.fbm2(x * 0.4, zw * 0.4, 3)));
      else out.set('#cdb6a2').lerp(K.col('#8f7563'), K.clamp(0.4 - (y / 9) * 0.3 + 0.4 * K.ridged2(x * 0.5, y * 0.8, 2)));
      if (y < -0.5) out.set('#3a3138');
    },
  });
  terr.position.z = 1;
  root.add(terr);
  const under = K.lathe([[0.01, -12], [10, -9], [18, -5], [22.5, -4.5]], 64);
  K.paintBy(under, (_x, y, _z, out) => out.set('#3b3036').lerp(K.col('#6a5550'), K.clamp(1 + y / 8)));
  const ub = new K.Batch();
  ub.add(K.at(K.wobble(under, 0.8, 0.25, 4), 0, 0, 1, { s: [1, 1, 1.07] }), null, 'stone');

  // switchback roads, empty, down the escarpment
  for (const [rx, n] of [[-9, 7], [10, 8]] as const) {
    const pts: THREE.Vector3[] = [];
    for (let k = 0; k <= n; k++) {
      const z = 15 - (k / n) * 10.5, x = rx + (k % 2 ? 1.6 : -1.6);
      const prev = pts[pts.length - 1];
      if (prev) for (let s = 1; s <= 6; s++) { const xx = K.lerp(prev.x, x, s / 6), zz = K.lerp(prev.z, z, s / 6); pts.push(new THREE.Vector3(xx, H(xx, zz) + 0.1, zz)); }
      else pts.push(new THREE.Vector3(x, H(x, z) + 0.1, z));
    }
    ub.add(K.tube(pts, 0.07, pts.length * 3, 4), '#d9c9b4', 'matte');
  }
  // rocks along the rim, a stone hut
  for (let i = 0; i < 40; i++) {
    const x = rng.float(-18, 18), z = 14.5 + rng.float(0, 2.5);
    const y = H(x, z);
    if (y > 8.3) K.rock(ub, { x, y: y - 0.05, z, r: rng.float(0.12, 0.4), color: '#7d7468', rng });
  }
  const HUT = [6, H(6, 19), 19] as const;
  ub.add(K.at(K.cyl(0.55, 0.65, 0.7, 10), HUT[0], HUT[1] - 0.05, HUT[2]), '#8a8174', 'stone');
  ub.add(K.at(K.cone(0.75, 0.55, 10), HUT[0], HUT[1] + 0.62, HUT[2]), '#6d665c', 'stone');
  ub.add(K.at(K.wallPlane(0.22, 0.38), HUT[0], HUT[1], HUT[2] - 0.6, { ry: Math.PI }), '#ffb066', 'glow', 2);
  // bird-catcher's poles
  const BC = new THREE.Vector3(-9.5, 0, 15.2);
  BC.y = H(BC.x, BC.z);
  for (let i = 0; i < 4; i++) ub.add(K.at(K.cyl(0.025, 0.03, 2.5, 5), BC.x + i * 1.0, BC.y - 0.05, BC.z), '#4a3a2c', 'wood');
  root.add(ub.build({ name: 'land' }));

  // ---- the city: dark low blocks, gardens, towers
  const voids: [number, number, number][] = [];
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + 0.3, r = rng.float(3.5, 8); voids.push([Math.cos(a) * r, CZ + Math.sin(a) * r, rng.float(0.8, 1.5)]); }
  const inVoid = (x: number, z: number) => voids.some(([vx, vz, vr]) => Math.hypot(x - vx, z - vz) < vr);
  const rosePick = (): [number, number, number] => {
    for (;;) {
      const r = Math.sqrt(rng.next()) * 11.5, th = rng.angle();
      const tw = th + r * 0.06;
      const petal = Math.pow(0.5 + 0.5 * Math.cos(11 * tw), 6);
      const dens = Math.exp(-r / 1.6) * 1.2 + petal * Math.exp(-r / 7) * 1.0 + 0.012;
      const x = Math.cos(th) * r, z = CZ + Math.sin(th) * r;
      if (rng.next() < dens && !inVoid(x, z)) return [x, z, r];
    }
  };
  const cb = new K.Batch();
  for (let i = 0; i < 520; i++) {
    const [x, z, r] = rosePick();
    cb.add(K.at(K.box(rng.float(0.25, 0.6), rng.float(0.15, 0.5) * (1.4 - r / 14), rng.float(0.25, 0.6)), x, 0, z, { ry: rng.angle() }), K.pickJitter(['#1d2133', '#262a3c', '#20243a'], rng), 'matte');
  }
  for (const [vx, vz, vr] of voids) for (let k = 0; k < 7; k++) { const [dx, dz] = rng.inDisc(vr * 0.8); K.tree(cb, { x: vx + dx, z: vz + dz, kind: rng.pick(['round', 'cypress'] as const), h: rng.float(0.5, 0.9), color: '#121a1a', trunkColor: '#0e1012', rng }); }
  const fires: THREE.Vector3[] = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU + 0.5, r = i === 0 ? 0.6 : rng.float(2.5, 8.5), x = Math.cos(a) * r, z = CZ + Math.sin(a) * r, h = rng.float(1.5, 2.5);
    cb.add(K.at(K.ngon(0.14, h, 6, 0.1), x, 0, z), '#2a2d3e', 'stone');
    cb.add(K.at(K.cyl(0.18, 0.12, 0.1, 8), x, h, z), '#2a2d3e', 'stone');
    fires.push(new THREE.Vector3(x, h + 0.2, z));
  }
  root.add(cb.build({ name: 'city', castShadow: false }));

  // ---- 9000 windows: the rose, and the other city they become
  const N = 9000;
  const pos = new Float32Array(N * 3), oth = new Float32Array(N * 3), info = new Float32Array(N * 4), col = new Float32Array(N * 3);
  const roseCol = [K.col('#ffc68e'), K.col('#f5b4c3'), K.col('#ffd9a8'), K.col('#ff9f7a')];
  // brighter clusters: 11 petals x 5 = 55 (one for each city of the book)
  const clusters: [number, number][] = [];
  for (let p = 0; p < 11; p++) for (let k = 0; k < 5; k++) {
    const r = 2.2 + k * 1.75, th = ((p + 0.0) / 11) * TAU - r * 0.06;
    clusters.push([Math.cos(th) * r, CZ + Math.sin(th) * r]);
  }
  const GR = 0.42;
  for (let i = 0; i < N; i++) {
    let x: number, z: number, r: number;
    if (i < 55 * 22) { const [cx, cz] = clusters[i % 55]; const [dx, dz] = rng.inDisc(0.32); x = cx + dx; z = cz + dz; r = Math.hypot(x, z - CZ); }
    else [x, z, r] = rosePick();
    pos.set([x, rng.float(0.05, 0.45) * (1.3 - r / 14), z], i * 3);
    // the other city: an irregular grid of plain streets, rotated, with no petals
    const u = rng.float(-12, 12), lane = Math.round(rng.float(-12, 12) / 1.7) * 1.7 + rng.float(-0.12, 0.12);
    const along = rng.chance(0.5);
    let ox = along ? u : lane, oz = along ? lane : u;
    ox += Math.sin(oz * 0.3) * 0.8; oz += Math.sin(ox * 0.25) * 0.6;
    const qx = ox * Math.cos(GR) - oz * Math.sin(GR), qz = ox * Math.sin(GR) + oz * Math.cos(GR);
    const sc = Math.min(1, 12.5 / Math.max(1e-3, Math.hypot(qx, qz)));
    oth.set([qx * sc, rng.float(0.05, 0.9), CZ + qz * sc], i * 3);
    const bright = (i < 55 * 22 ? 2.6 : 1.6) * (0.55 + 1.1 * Math.exp(-r / 4));
    info.set([Math.min(0.95, r / 12 + rng.float(0, 0.06)), bright, rng.next(), rng.next()], i * 4);
    const c = rng.pick(roseCol);
    col.set([c.r, c.g, c.b], i * 3);
  }
  const wg = new THREE.BufferGeometry();
  wg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  wg.setAttribute('aOther', new THREE.BufferAttribute(oth, 3));
  wg.setAttribute('aInfo', new THREE.BufferAttribute(info, 4));
  wg.setAttribute('aCol', new THREE.BufferAttribute(col, 3));
  const winMat = new THREE.ShaderMaterial({
    vertexShader: PT_VERT, fragmentShader: PT_FRAG,
    uniforms: { uDown: { value: 0 }, uLight: { value: 1 }, uSize: { value: 120 }, uTime: K.U.time, uDrum: { value: 0 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const windows = new THREE.Points(wg, winMat);
  windows.frustumCulled = false;
  root.add(windows);
  const cityGlow = K.glowSprite('#f5a0a8', 16, 0.18);
  cityGlow.position.set(0, 0.5, CZ);
  root.add(cityGlow);
  const fireSprites = fires.map((p) => { const s = K.glowSprite('#ff6a2b', 1.2, 0.9); s.position.copy(p); root.add(s); return s; });

  // ---- mist at the foot of the gullies
  const mist: THREE.Sprite[] = [];
  for (let i = 0; i < 16; i++) {
    const s = K.glowSprite('#e8e2f1', rng.float(4, 7), 0);
    s.position.set(rng.float(-16, 16), rng.float(0.5, 1.8), rng.float(3.5, 7.5));
    root.add(s); mist.push(s);
  }

  // ---- what the wind brings: festival or war (CPU-animated point sets)
  const FEST = 420;
  const fpos = new Float32Array(FEST * 3), fcol = new Float32Array(FEST * 3);
  const festColors = ['#ff5f6a', '#ffd25a', '#6ad0ff', '#a6ff7a', '#ff8ae0'].map((c) => K.col(c));
  const fBase: THREE.Vector3[] = [];
  for (let i = 0; i < 240; i++) { // arches of lights over six main streets
    const s = i % 6, k = Math.floor(i / 6) / 40, a = (s / 6) * TAU + 0.2, r = 1 + k * 9;
    fBase.push(new THREE.Vector3(Math.cos(a) * r, 0.45 + Math.abs(Math.sin(k * Math.PI * 6)) * 0.5, CZ + Math.sin(a) * r));
  }
  const sparkDir: THREE.Vector3[] = [];
  for (let i = 240; i < FEST; i++) { const [x, y, z] = rng.onSphere(); sparkDir.push(new THREE.Vector3(x, Math.abs(y), z)); }
  for (let i = 0; i < FEST; i++) { const c = festColors[i % 5]; fcol.set([c.r * 2.5, c.g * 2.5, c.b * 2.5], i * 3); }
  const fg = new THREE.BufferGeometry();
  fg.setAttribute('position', new THREE.BufferAttribute(fpos, 3));
  fg.setAttribute('color', new THREE.BufferAttribute(fcol, 3));
  const festMat = new THREE.PointsMaterial({ size: 0.22, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, map: K.glowTexture() });
  const fest = new THREE.Points(fg, festMat);
  fest.frustumCulled = false;
  root.add(fest);
  const sulphur = K.glowSprite('#e3bd52', 30, 0);
  sulphur.position.set(0, 3, CZ);
  root.add(sulphur);
  const warFires = Array.from({ length: 7 }, () => { const [x, z] = rosePick(); const s = K.glowSprite('#ff7a2a', 2.2, 0); s.position.set(x, 0.6, z); root.add(s); return s; });
  const flashMat = new THREE.PointsMaterial({ size: 0.25, color: '#fff3c0', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, map: K.glowTexture() });
  const gunPts: THREE.Vector3[] = [];
  for (let row = 0; row < 5; row++) { const [x, z] = rosePick(); const a = rng.angle(); for (let k = 0; k < 8; k++) gunPts.push(new THREE.Vector3(x + Math.cos(a) * k * 0.18, 0.4, z + Math.sin(a) * k * 0.18)); }
  const guns = new THREE.Points(new THREE.BufferGeometry().setFromPoints(gunPts), flashMat);
  root.add(guns);
  const MAG = new THREE.Vector3(4.5, 0.5, CZ - 3);
  const boom = K.glowSprite('#ffffff', 1, 0);
  boom.position.copy(MAG);
  root.add(boom);
  const ringMat = new THREE.MeshBasicMaterial({ color: '#fff0c8', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.04, 4, 64).rotateX(Math.PI / 2), ringMat);
  ring.position.copy(MAG);
  root.add(ring);
  const plume = Array.from({ length: 10 }, (_, i) => { const s = K.glowSprite('#9a8a80', 1.5 + i * 0.3, 0); root.add(s); return s; });

  // ---- the watchers on the rim
  const figMat = K.figureMaterial();
  const watchers = K.instanced(K.personGeometry(0.4), figMat, 4, undefined, { castShadow: true });
  root.add(watchers);
  const setW = K.instanceSetter(watchers);
  const rimAt = (x: number) => { let z = 13; while (H(x, z) < 8.7 && z < 20) z += 0.1; return z + 0.3; };
  const WP = [[-3, rimAt(-3)], [3.5, rimAt(3.5)], [BC.x + 1.5, BC.z + 0.4], [HUT[0] - 0.9, HUT[2] - 0.8]].map(([x, z]) => new THREE.Vector3(x, H(x, z) - 0.02, z));
  WP.forEach((p, i) => { const l = K.glowSprite('#ffc68e', 0.6, 0.85); l.position.set(p.x + 0.15, p.y + 0.3, p.z - 0.05); if (i !== 2) root.add(l); });
  ['#5a4636', '#6b5a3a', '#3e4a3a', '#7a6a58'].forEach((c, i) => watchers.setColorAt(i, K.col(c)));
  const pb = new K.Batch();
  pb.add(K.strut([WP[0].x + 0.12, WP[0].y, WP[0].z - 0.05], [WP[0].x + 0.1, WP[0].y + 0.42, WP[0].z], 0.012, 4), '#4a3a2a', 'wood');
  pb.add(K.strut([WP[1].x - 0.12, WP[1].y, WP[1].z], [WP[1].x - 0.15, WP[1].y + 0.45, WP[1].z - 0.05], 0.012, 4), '#4a3a2a', 'wood');
  pb.add(K.at(K.torus(0.05, 0.01, 4, 8, Math.PI), WP[1].x - 0.1, WP[1].y + 0.45, WP[1].z - 0.05, { rx: Math.PI / 2 }), '#4a3a2a', 'wood');
  root.add(pb.build());
  // nets between the bird-catcher's poles (they sway)
  const netTex = K.canvasTexture(128, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(220,214,200,0.75)'; g.lineWidth = 1.5;
    for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 16, 0); g.lineTo(i * 16, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 16); g.lineTo(w, i * 16); g.stroke(); }
  });
  const netMat = new THREE.MeshBasicMaterial({ map: netTex, transparent: true, side: THREE.DoubleSide, depthWrite: false, opacity: 0.8 });
  const nets: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 2.0).translate(0, -1.0, 0), netMat);
    m.position.set(BC.x + 0.5 + i, BC.y + 2.4, BC.z);
    root.add(m); nets.push(m);
  }
  // the flock drifting west
  const flockN = 18;
  const animals = K.instanced(K.quadruped({ len: 0.3, h: 0.22, color: '#ffffff', horns: true, tail: 0.05 }), K.std('#ffffff', { vertexColors: true, roughness: 0.9 }), flockN, (i, _o, c) => { c.copy(K.jitter(i % 4 ? '#d9d2c2' : '#5a4a3a', rng)); });
  root.add(animals);
  const setA = K.instanceSetter(animals);
  const flockOff = Array.from({ length: flockN }, () => [rng.float(-1.6, 1.6), rng.float(17.2, 20.5), rng.float(0, 10)]);
  // grass on the plateau, bending in the wind
  const grassMat = K.std('#ffffff', { roughness: 0.9 }).clone();
  grassMat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = K.U.time;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;').replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
      float ph = instanceMatrix[3].x * 0.6 + instanceMatrix[3].z * 0.4;
      transformed.x += sin(uTime * 1.6 + ph) * 0.35 * position.y;
      #endif`);
  };
  let gi = 0;
  const grass = K.instanced(K.cone(0.035, 1, 3), grassMat, 2600, (_i, o, c) => {
    for (let tries = 0; tries < 20; tries++) {
      const x = rng.float(-20, 20), z = rng.float(13.5, 23.5), y = H(x, z);
      if (y < 8.6 || Math.hypot(x / 22.5, (z - 1) / 24) > 0.92) continue;
      o.position.set(x, y - 0.02, z);
      o.scale.set(0.8, rng.float(0.06, 0.16), 0.8);
      o.rotation.y = rng.angle();
      c.copy(K.jitter('#7a8a55', rng, 0.03, 0.1, 0.12));
      gi++;
      return;
    }
    return false;
  }, { castShadow: false });
  root.add(grass);

  // ---- the name, existing only from up here
  const letters = 'IRENE'.split('').map((ch, i) => {
    const s = K.textSprite(ch, 1.6, { color: '#f3d68f', px: 128, weight: 500 });
    s.position.set((i - 2) * 1.5, 6, CZ + 2);
    (s.material as THREE.SpriteMaterial).transparent = true;
    root.add(s);
    return s;
  });

  root.add(K.particles({ count: 160, radius: 18, y0: 9, y1: 12, center: [0, 0, 18], color: '#f5b4c3', size: 0.05, opacity: 0.5, swirl: 0.6, twinkle: 1, rng: rng.fork('fireflies') }));

  // =============================================================== animation
  const down = new K.Toggle(0.28);
  const LOOP = 90;

  return {
    root,
    env: {
      skyTop: '#0e1534', skyHorizon: '#ca8189', skyBottom: '#1a1a30', skyCurve: 0.38,
      fog: '#2c3259', fogNear: 55, fogFar: 150,
      sunDir: [0.15, 0.12, -1], sunColor: '#f0a0a0', sunIntensity: 1.3, sunDisc: 0, sunGlow: 0.9,
      moon: { dir: [-0.5, 0.5, -0.7], size: 1.0, color: '#f2ecff' },
      hemiSky: '#5a66a8', hemiGround: '#2a2a3a', hemiIntensity: 1.25, envIntensity: 0.6,
      stars: 0.8, clouds: 0.12, cloudColor: '#ca8189',
      bloomStrength: 0.95, bloomThreshold: 0.6, bloomRadius: 0.6,
      shadowRadius: 26, vignette: 0.5, saturation: 1.05, tiltShift: 0.35,
    },
    camera: {
      position: [0, 19, 23], target: [0, 0, -6], fov: 42,
      minDistance: 8, maxDistance: 70, maxPolar: 1.4, autoRotate: 0.12,
      views: [
        { position: [-14, 28, 4], target: [0, 0, -6] },
        { position: [-12, 11.5, 20], target: [-3, 3, -2] },
      ],
    },
    interaction: {
      label: 'Go down to Irene',
      activeLabel: 'Climb back to the rim',
      hint: 'Up close the rose comes apart: another city.',
      set: (on) => down.set(on),
      camera: { position: [8, 2.4, 3.2], target: [0, 0.4, -7] },
    },
    update(t, dt) {
      down.update(dt);
      const dv = down.value;
      winMat.uniforms.uDown.value = dv;
      // lamp-lighting loop: lights come on from the heart outward, then fade to dusk
      const n = Math.floor((t + 14) / LOOP), ph = (t + 14) % LOOP;
      const light = ph < 15 ? ph / 15 : ph < 75 ? 1 : 1 - (ph - 75) / 15;
      winMat.uniforms.uLight.value = 0.02 + light * 0.98;
      (cityGlow.material as THREE.SpriteMaterial).opacity = 0.2 * light * (1 - dv * 0.6);
      fireSprites.forEach((s, i) => { (s.material as THREE.SpriteMaterial).opacity = (0.65 + 0.35 * Math.sin(t * 9 + i * 2) * Math.sin(t * 5.3 + i)) * light * (1 - dv); s.scale.setScalar(1.1 + 0.2 * Math.sin(t * 7 + i)); });
      const misty = n % 2 === 1 ? Math.sin(Math.PI * K.clamp(ph / LOOP)) : 0.15;
      mist.forEach((s, i) => ((s.material as THREE.SpriteMaterial).opacity = misty * (0.1 + 0.05 * Math.sin(t * 0.3 + i)) * (1 - dv)));
      // what the wind brings this loop
      const ev = n === 0 ? 0 : [0, 1, 2, 1, 0, 2][(n * 7 + 3) % 6];
      const win = K.smoothstep(16, 20, ph) * (1 - K.smoothstep(68, 74, ph)) * (1 - dv);
      const drum = Math.pow(Math.max(0, Math.sin(t * Math.PI * 2.2)), 8);
      winMat.uniforms.uDrum.value = ev === 0 ? drum * win : 0;
      festMat.opacity = ev === 0 ? win : 0;
      if (ev === 0 && win > 0) {
        for (let i = 0; i < 240; i++) fpos.set([fBase[i].x, fBase[i].y, fBase[i].z], i * 3);
        for (let i = 240; i < FEST; i++) {
          const ci = (i - 240) % 10, period = 3.1 + ci * 0.37, k = ((t + ci * 1.3) % period) / period;
          const cr = new K.RNG(ci * 97 + Math.floor((t + ci * 1.3) / period) * 13);
          const [cx, cz] = cr.inDisc(8);
          const d = sparkDir[i - 240], rr = Math.sqrt(k) * 1.1;
          fpos.set([cx + d.x * rr, 2.0 + d.y * rr - k * k * 0.8, CZ + cz + d.z * rr], i * 3);
        }
        fg.attributes.position.needsUpdate = true;
      }
      const war = ev === 1 ? win : 0;
      (sulphur.material as THREE.SpriteMaterial).opacity = war * 0.32;
      warFires.forEach((s, i) => ((s.material as THREE.SpriteMaterial).opacity = war * (0.6 + 0.4 * Math.sin(t * 6 + i * 3))));
      flashMat.opacity = war * (Math.sin(t * 37) > 0.3 && Math.sin(t * 1.7) > 0 ? 1 : 0);
      const bk = ph - 44;
      const bOn = ev === 1 && bk > 0 && bk < 12 ? 1 - dv : 0;
      (boom.material as THREE.SpriteMaterial).opacity = bOn * Math.exp(-bk * 1.4) * 1.2;
      boom.scale.setScalar(2 + bk * 4);
      ringMat.opacity = bOn * Math.max(0, 1 - bk / 4) * 0.8;
      ring.scale.setScalar(0.3 + bk * 2.2);
      plume.forEach((s, i) => { (s.material as THREE.SpriteMaterial).opacity = bOn * K.smoothstep(0, 1, bk - i * 0.3) * (1 - bk / 12) * 0.35; s.position.set(MAG.x + Math.sin(i) * 0.3, MAG.y + 0.5 + i * 0.4 + bk * 0.25, MAG.z); });
      // the name rises like breath, scatters when you go down
      letters.forEach((s, i) => {
        const m = s.material as THREE.SpriteMaterial;
        m.opacity = (0.55 + 0.25 * Math.sin(t * 0.5 + i)) * (1 - dv);
        s.position.set((i - 2) * 1.5 + dv * Math.sin(i * 2.3) * 8, 6 + Math.sin(t * 0.4 + i * 0.8) * 0.2 + dv * (2 + i), CZ + 2 + dv * Math.cos(i * 1.7) * 6);
      });
      // watchers: heads turn toward the events; hermit stoops; nets sway; the flock drifts west
      const look = Math.sin(t * 0.3) * 0.25;
      WP.forEach((p, i) => setW(i, p.x, p.y, p.z, Math.PI + look * (i % 2 ? 1 : -1), 1, i === 3 ? 0.35 + 0.3 * Math.sin(t * 0.7) : 0));
      setW.done();
      nets.forEach((m, i) => (m.rotation.x = Math.sin(t * 0.9 + i) * 0.12));
      for (let i = 0; i < flockN; i++) {
        const [ox, oz, o] = flockOff[i];
        const x = 12 - ((t * 0.12 + o * 2.4) % 24) + ox * 0.5;
        const z = oz, y = H(x, z);
        setA(i, x, y - 0.02, z, -Math.PI / 2 + Math.sin(t + i) * 0.3, y > 8.5 ? 1 : 0);
      }
      setA.done();
      void gi;
    },
  };
};

export default build;
