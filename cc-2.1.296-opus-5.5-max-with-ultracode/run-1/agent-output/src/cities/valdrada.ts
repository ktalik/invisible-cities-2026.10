// VALDRADA - Cities & Eyes 1.
// A city built on the shore of a lake, houses stacked in terraces of verandas,
// balustrades leaning over the water. The still lake holds a second Valdrada,
// upside down, repeating every gesture of the first. A true mirror (Reflector)
// with a gentle ripple shader. Toggle: trouble the water, and the twin city
// breaks into trembling bands of colour.

import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import * as K from '../kit';
import type { CityBuilder } from '../core/types';

const A0 = Math.PI * 0.97, A1 = Math.PI * 2.03, AMID = Math.PI * 1.5;
const a0 = (k: number) => A0 + k * 0.085, a1 = (k: number) => A1 - k * 0.085;
const NT = 5;
const rIn = (k: number) => 6.5 + k * 2.5;
const yTop = (k: number) => 0.5 + k * 1.35;
const R_OUT = 19.5;
const LAKE_R = 30;

function sector(r0: number, r1: number, a0: number, a1: number): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(Math.cos(a0) * r1, Math.sin(a0) * r1);
  s.absarc(0, 0, r1, a0, a1, false);
  s.lineTo(Math.cos(a1) * r0, Math.sin(a1) * r0);
  s.absarc(0, 0, r0, a1, a0, true);
  return s;
}

const build: CityBuilder = (ctx) => {
  const rng = ctx.rng;
  const root = new THREE.Group();
  const b = new K.Batch();

  // ---- terraces climbing from the water in a wide amphitheatre
  for (let k = 0; k < NT; k++) {
    const y = yTop(k);
    const g = K.extrudeUp(sector(rIn(k), R_OUT, a0(k), a1(k)), y + 0.6, 64);
    b.add(K.at(g, 0, -0.6, 0), K.shade('#bba383', 0.92 + k * 0.03), 'stone');
    // paved promenade strip on top
    b.add(K.at(K.extrudeUp(sector(rIn(k) + 0.02, rIn(k) + 2.5, a0(k), a1(k)), 0.04, 64), 0, y, 0), '#d8c6a6', 'stone');
    // a coping band on the retaining wall
    const cop = new THREE.TorusGeometry(rIn(k) + 0.03, 0.06, 4, 96, a1(k) - a0(k)).rotateX(Math.PI / 2).rotateY(-a0(k));
    b.add(K.at(cop, 0, y - 0.12, 0), '#e7d9bf', 'stone');
    // balustrade: rail + balusters along the edge
    const rail = new THREE.TorusGeometry(rIn(k) + 0.1, 0.03, 4, 128, a1(k) - a0(k)).rotateX(Math.PI / 2).rotateY(-a0(k));
    b.add(K.at(rail, 0, y + 0.3, 0), '#f2e8d6', 'stone');
    const rr = rIn(k) + 0.1;
    const n = Math.floor(((a1(k) - a0(k)) * rr) / 0.16);
    for (let i = 0; i <= n; i++) {
      const a = a0(k) + (i / n) * (a1(k) - a0(k));
      if (Math.abs(a - AMID) * rr < 0.85) continue; // stair opening
      b.add(K.at(K.cyl(0.025, 0.035, 0.28, 5), Math.cos(a) * rr, y + 0.02, Math.sin(a) * rr), '#efe4d0', 'stone');
    }
    // arched niches in the retaining wall (reflect as a rhythm in the lake)
    const ra = rIn(k) - 0.02;
    const na = Math.floor(((a1(k) - a0(k)) * ra) / 1.6);
    for (let i = 0; i < na; i++) {
      const a = a0(k) + ((i + 0.5) / na) * (a1(k) - a0(k));
      if (Math.abs(a - AMID) * ra < 1.2) continue;
      const nh = Math.min(1.0, y + 0.3);
      const niche = K.box(0.55, nh, 0.05);
      K.at(niche, 0, Math.max(-0.3, y - 0.2 - nh), 0, { ry: -a + Math.PI / 2 });
      b.add(K.at(niche, Math.cos(a) * ra, 0, Math.sin(a) * ra), '#6f5f4e', 'matte');
    }
  }

  // ---- the grand stair on the axis, flight after flight up to the palazzo
  for (let k = 0; k < NT; k++) {
    const base = k === 0 ? -0.05 : yTop(k - 1);
    const rise = yTop(k) - base;
    const run = k === 0 ? 1.4 : 1.6;
    const st = K.stairs(8, 1.5, rise / 8, run / 8);
    b.add(K.at(st, 0, base, -(rIn(k) - run), { ry: Math.PI }), '#e6d7bb', 'stone');
  }

  // ---- houses all verandas, one row per terrace, facing the lake
  const walls = ['#f1e4cf', '#ebcdb4', '#f4dccb', '#dcbca2', '#efe6d8', '#e7c9a6', '#d9c4b0'];
  const roofs = ['#b5654a', '#a35a41', '#c27a55', '#94503c'];
  const awnings = ['#3f6c78', '#b9583f', '#e0b35c', '#5f7d57', '#7a4f6b'];
  for (let k = 0; k < NT; k++) {
    const r = rIn(k) + 1.75;
    const y = yTop(k) + 0.04;
    const span = (a1(k) - a0(k)) * r;
    const n = Math.floor(span / 1.42);
    for (let i = 0; i < n; i++) {
      const a = a0(k) + ((i + 0.5) / n) * (a1(k) - a0(k)) + rng.float(-0.006, 0.006);
      const gap = k === NT - 1 ? 3.2 : 1.3;
      if (Math.abs(a - AMID) * r < gap) continue;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const ry = Math.atan2(-Math.cos(a), -Math.sin(a));
      const st = rng.int(2, 3) + (k === NT - 1 ? 1 : 0);
      const sh = 0.72;
      const w = rng.float(1.05, 1.3), d = 1.0, h = st * sh;
      const wall = rng.pick(walls);
      K.house(b, { x, y, z, ry, w, d, h, roof: rng.pick(['hip', 'gable', 'flat', 'hip'] as const), roofH: 0.42, wall, roofColor: rng.pick(roofs), lit: 0.18, glow: 2.4, cornice: true, rng });
      const place = (g: THREE.BufferGeometry) => K.at(g, x, y, z, { ry });
      // verandas on each upper storey, and a loggia on the ground floor
      for (let s = 1; s <= st - 1 + (rng.chance(0.5) ? 1 : 0); s++) {
        const vy = Math.min(s, st) * sh - (s === st ? sh * 0.05 : 0);
        if (s === st) continue;
        const vd = 0.36;
        b.add(place(K.at(K.box(w * 0.92, 0.05, vd), 0, vy, d / 2 + vd / 2)), K.shade(wall, 0.92), 'plaster');
        b.add(place(K.at(K.box(w * 0.92, 0.035, 0.035), 0, vy + 0.24, d / 2 + vd - 0.02)), '#f6efe2', 'stone');
        for (let p = 0; p < 7; p++) b.add(place(K.at(K.box(0.02, 0.22, 0.02), -w * 0.42 + (p / 6) * w * 0.84, vy + 0.03, d / 2 + vd - 0.02)), '#f6efe2', 'stone');
        for (const sx of [-1, 1]) b.add(place(K.at(K.box(0.035, sh - 0.05, 0.035), sx * w * 0.43, vy + 0.05, d / 2 + vd - 0.02)), K.shade(wall, 0.85), 'plaster');
        if (rng.chance(0.45)) b.add(place(K.at(K.shedRoof(w * 0.9, vd + 0.05, 0.03, 0.12), 0, vy + sh - 0.17, d / 2 + vd / 2)), rng.pick(awnings), 'cloth');
        if (rng.chance(0.35)) b.add(place(K.at(K.sphere(0.08, 6, 5), rng.float(-0.3, 0.3) * w, vy + 0.3, d / 2 + vd - 0.05)), '#4f7a3d', 'matte');
      }
    }
  }

  // ---- the palazzo and campanile crowning the amphitheatre
  const PZ = -(rIn(NT - 1) + 1.6), PY = yTop(NT - 1) + 0.04;
  K.house(b, { x: 0, y: PY, z: PZ, w: 4.6, d: 1.8, h: 2.6, roof: 'hip', roofH: 0.7, wall: '#f4e6cf', roofColor: '#a6553d', lit: 0.3, glow: 2.6, cornice: true, rng });
  K.arcade(b, { x: 0, y: PY, z: PZ + 1.05, n: 6, span: 0.74, h: 1.1, d: 0.25, color: '#f6ecda' });
  b.add(K.at(K.box(4.6, 0.06, 0.6), 0, PY + 1.1, PZ + 1.1), '#efe2c8', 'stone');
  K.tower(b, { x: 2.7, y: PY, z: PZ - 0.2, r: 0.55, h: 6.4, sides: 4, top: 'pyramid', color: '#ead6b8', topColor: '#9c513a', bands: 1.6, bandColor: '#dcc6a4', rng, lit: 0.3 });
  b.add(K.at(K.dome(0.9, 24, 1, 0.9), 0, PY + 2.6 + 0.7, PZ), '#cfd8d6', 'silver');
  b.add(K.at(K.cyl(0.95, 0.95, 0.3, 24), 0, PY + 2.6 + 0.4, PZ), '#efe2c8', 'stone');

  // ---- cypresses and garden trees on the upper edge and the flanks
  K.forest(b, { n: 46, r0: R_OUT - 0.7, r1: R_OUT - 0.2, rng: rng.fork('trees'), kinds: ['cypress', 'cypress', 'cypress', 'round'], h: [1.6, 3.0], y: () => yTop(NT - 1),
    avoid: (x, z) => { const a = Math.atan2(z, x) + (z < 0 ? Math.PI * 2 : 0); return a < a0(NT - 1) + 0.04 || a > a1(NT - 1) - 0.04 || (Math.abs(x) < 3.5 && z < 0); } });
  for (let k = 0; k < NT - 1; k++) {
    for (const a of [a0(k) + 0.042, a1(k) - 0.042]) {
      for (let r = rIn(k + 1) + 0.6; r < R_OUT - 0.4; r += 1.3) {
        K.tree(b, { x: Math.cos(a) * r, y: yTop(k) + 0.04, z: Math.sin(a) * r, kind: rng.chance(0.7) ? 'cypress' : 'round', h: rng.float(1.3, 2.3), rng });
      }
    }
  }

  // ---- quay: striped mooring poles and moored boats along the waterline
  const poleR = rIn(0) - 0.6;
  for (let i = 0; i < 26; i++) {
    const a = A0 + 0.1 + (i / 25) * (A1 - A0 - 0.2);
    if (Math.abs(a - AMID) * poleR < 1.2) continue;
    const x = Math.cos(a) * poleR, z = Math.sin(a) * poleR;
    for (let s = 0; s < 5; s++) b.add(K.at(K.cyl(0.05, 0.05, 0.3, 6), x, -0.1 + s * 0.3, z), s % 2 ? '#f3efe6' : (i % 3 ? '#2f5d7a' : '#b5402c'), 'wood');
    b.add(K.at(K.sphere(0.07, 6, 5), x, 1.42, z), '#c9a24c', 'gold');
  }
  for (let i = 0; i < 12; i++) {
    const a = A0 + 0.2 + rng.float(0, A1 - A0 - 0.4);
    if (Math.abs(a - AMID) * poleR < 1.5) continue;
    const r = poleR - 0.35;
    b.add(K.at(K.boatGeometry(1.0, rng.pick(['#1d1b1a', '#3b2a22', '#2a3640'])), Math.cos(a) * r, 0.0, Math.sin(a) * r, { ry: -a }), null, 'wood');
  }

  root.add(b.build({ name: 'valdrada' }));

  // ---- the lake: a true mirror with a gentle ripple
  const FOG = '#d8c9c6';
  const shader = {
    name: 'ValdradaMirror',
    uniforms: {
      color: { value: null },
      tDiffuse: { value: null },
      textureMatrix: { value: null },
      uTime: { value: 0 },
      uAmp: { value: 0 },
      uDeep: { value: new THREE.Color('#2f5560') },
      uFog: { value: new THREE.Color(FOG) },
      uR: { value: LAKE_R },
    },
    vertexShader: /* glsl */ `
      uniform mat4 textureMatrix;
      varying vec4 vUv;
      varying vec3 vW;
      void main() {
        vUv = textureMatrix * vec4(position, 1.0);
        vW = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 color;
      uniform sampler2D tDiffuse;
      uniform float uTime, uAmp, uR;
      uniform vec3 uDeep, uFog;
      varying vec4 vUv;
      varying vec3 vW;
      ${K.GLSL_NOISE}
      void main() {
        vec2 p = vW.xz;
        float n1 = snoise(vec3(p * vec2(0.18, 0.9), uTime * 0.22));
        float n2 = snoise(vec3(p * vec2(0.6, 2.4) + 5.0, uTime * 0.5));
        float d = length(p - vec2(-1.5, 3.0));
        float ring = sin(d * 2.6 - uTime * 3.2) * exp(-d * 0.06);
        float calm = 0.0025 + 0.0015 * n2;
        vec2 off = vec2(n1 * 0.35 + n2 * 0.25, n2 * 0.9 + n1 * 0.3) * (calm + uAmp * 0.035) + vec2(ring * 0.3, ring) * uAmp * 0.03;
        vec4 uv = vUv;
        uv.xy += off * uv.w;
        vec3 refl = texture2DProj(tDiffuse, uv).rgb;
        vec3 c = mix(refl * color, uDeep, 0.1 + uAmp * 0.35);
        c += vec3(0.9, 0.85, 0.75) * smoothstep(0.55, 0.95, n2) * (0.03 + uAmp * 0.08);
        float e = smoothstep(uR * 0.62, uR, length(p));
        gl_FragColor = vec4(mix(c, uFog, e), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  };
  const ds = ctx.renderer.getDrawingBufferSize(new THREE.Vector2());
  const q = ctx.quality === 'low' ? 0.5 : 0.8;
  const mirror = new Reflector(new THREE.CircleGeometry(LAKE_R, 96), {
    color: '#c7dade',
    textureWidth: Math.max(512, Math.floor(ds.x * q)),
    textureHeight: Math.max(320, Math.floor(ds.y * q)),
    clipBias: 0.003,
    shader,
  });
  mirror.rotation.x = -Math.PI / 2;
  root.add(mirror);
  const mU = (mirror.material as THREE.ShaderMaterial).uniforms;

  // ---- boats gliding across the lake (doubled by the mirror)
  const NB = 7;
  const boatMat = K.figureMaterial();
  const boats = K.instanced(K.boatGeometry(1.1, '#ffffff'), boatMat, NB, (i, _o, c) => { c.set(i % 2 ? '#2a2420' : '#3a3f48'); });
  const rowers = K.instanced(K.personGeometry(0.24), K.figureMaterial(), NB, (i, _o, c) => { c.set(['#b5402c', '#2f5d7a', '#e8e0d0', '#c9a35a'][i % 4]); });
  root.add(boats, rowers);
  const boatSet = K.instanceSetter(boats), rowSet = K.instanceSetter(rowers);
  const boatData = Array.from({ length: NB }, (_, i) => ({ r: rng.float(2.5, 12.5), ph: rng.angle(), sp: rng.float(0.012, 0.03) * (i % 2 ? 1 : -1), cz: rng.float(4, 8) }));

  // ---- people strolling the promenades
  const paths: THREE.Vector3[][] = [];
  for (let k = 0; k < NT; k++) {
    const r = rIn(k) + 0.55;
    const p: THREE.Vector3[] = [];
    for (let i = 0; i <= 40; i++) {
      const a = a0(k) + 0.08 + (i / 40) * (a1(k) - a0(k) - 0.16);
      p.push(new THREE.Vector3(Math.cos(a) * r, yTop(k) + 0.04, Math.sin(a) * r));
    }
    paths.push(p);
  }
  const walkers = new K.Walkers({ paths, count: 150, rng: rng.fork('walk'), speed: [0.12, 0.3], colors: ['#7a3b2e', '#2f4b6e', '#e8e0d0', '#c9a35a', '#5a3b5e', '#3f6c78', '#f0e6d0'] });
  root.add(walkers.mesh);

  // ---- swallows wheeling over the water
  const flock = new K.Flock({ count: 26, center: [0, 0, -4], radius: 11, height: 9, color: '#2b2a30', span: 0.32, speed: 0.3, rng: rng.fork('birds') });
  root.add(flock.mesh);
  root.add(K.particles({ count: 160, radius: 18, y0: 0.3, y1: 7, color: '#fff1d6', size: 0.05, opacity: 0.45, swirl: 0.5, twinkle: 0.7, rng: rng.fork('motes') }));

  const stir = new K.Toggle(0.4);
  return {
    root,
    env: {
      skyTop: '#5b7fa6',
      skyHorizon: '#f2d3b6',
      skyBottom: '#c9b4b0',
      skyCurve: 0.5,
      fog: FOG,
      fogNear: 70,
      fogFar: 230,
      sunDir: [0.55, 0.42, 0.75],
      sunColor: '#ffd2a0',
      sunIntensity: 2.6,
      sunDisc: 1,
      sunGlow: 1.0,
      hemiSky: '#a8bdd6',
      hemiGround: '#8a7568',
      hemiIntensity: 0.7,
      envIntensity: 0.8,
      clouds: 0.4,
      cloudColor: '#fbe3cc',
      bloomStrength: 0.45,
      bloomThreshold: 0.85,
      tiltShift: 0.35,
      shadowRadius: 23,
      vignette: 0.35,
      saturation: 1.05,
    },
    camera: {
      position: [4, 9.5, 31],
      target: [0, 2.6, -5],
      minDistance: 10,
      maxDistance: 70,
      maxPolar: 1.5,
      autoRotate: 0.18,
      views: [
        { position: [-27, 21, 16], target: [0, 2, -6] },
        { position: [7, 1.3, 7], target: [-2, 1.8, -10] },
      ],
    },
    interaction: {
      label: 'Trouble the water',
      activeLabel: 'Let the lake settle',
      hint: 'Without its double the city loses half of what it does.',
      set: (on) => stir.set(on),
    },
    update(t, dt) {
      stir.update(dt);
      mU.uTime.value = t;
      mU.uAmp.value = stir.value;
      for (let i = 0; i < NB; i++) {
        const d = boatData[i];
        const a = d.ph + t * d.sp;
        const x = Math.cos(a) * d.r * 1.1;
        const z = Math.sin(a) * d.r * 0.55 + d.cz;
        const ry = Math.atan2(-Math.sin(a) * 1.1 * Math.sign(d.sp), Math.cos(a) * 0.55 * Math.sign(d.sp));
        boatSet(i, x, 0.02 + Math.sin(t * 1.3 + i) * 0.015, z, ry);
        rowSet(i, x, 0.06, z, ry);
      }
      boatSet.done();
      rowSet.done();
      walkers.update(t);
      flock.update(t);
    },
    dispose() {
      mirror.dispose();
    },
  };
};

export default build;
