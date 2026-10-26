// ARGIA - Cities & the Dead 4.
// A square monolith of earth floating in the night, two faces cut clean like a
// specimen. The section shows a whole city with no air in it: lime walls and floors,
// rooms packed with clay, streets with dirt, a grand stair carrying its own negative in
// darker clay, strata of rock hanging over the roofs with chalk boulders for clouds,
// prone sleepers, roots and worm tunnels. The field on top is deserted, but for a
// listener with his ear to the ground. The section is computed per pixel from one
// procedural 3D city, so the slowly drifting front face scans through it.
// Toggle: ear to the ground, the light fails and only the sound of a door draws the city.

import * as THREE from 'three';
import * as K from '../kit';
import type { CityBuilder } from '../core/types';

const PITCH = 11, BH = 4.3, HP = (2 * BH) / 3, SH = 2.6;
const hash = (i: number, k: number, j: number) => K.fract(i * 0.7548 + k * 0.5698 + j * 0.3183 + i * j * 0.1234);

const GLSL_CITY = /* glsl */ `
uniform vec3 uPal[16];
uniform float uTime, uDark, uSlamT;
uniform vec3 uSlamP, uLantern;
float h1(vec3 i){ return fract(i.x*0.7548 + i.y*0.5698 + i.z*0.3183 + i.x*i.z*0.1234); }
// material ids: 0 dirt 1 clay 2 lime 3 roof 4 step 5 negative 6 sleeper 7 rockA 8 chalk 9 topsoil
// 10 foundation 11 bedrock 12 tunnel 13 root 14 door 15 rockB
int cityMat(vec3 p){
  if (p.y > -0.6) return 9;
  if (p.y > -4.0) {
    vec2 cell = floor((p.xz + 21.0) / 7.0);
    vec2 cc = (cell + 0.5) * 7.0 - 21.0 + (vec2(h1(vec3(cell.x, 1.0, cell.y)), h1(vec3(cell.y, 2.0, cell.x))) - 0.5) * 3.0;
    float cy = -2.6 + (h1(vec3(cell, 3.0)) - 0.5) * 1.0;
    vec3 q = (p - vec3(cc.x, cy, cc.y)) / vec3(1.5 + h1(vec3(cell.x, 4.0, cell.y)), 0.9, 1.4);
    float d = length(q) + 0.28 * snoise(p * 1.1);
    if (h1(vec3(cell, 5.0)) < 0.7 && d < 1.0 && p.y > cy - 0.35) return 8;
    float bnd = (p.y + 0.6) / 0.47 + 0.35 * snoise(p * vec3(0.12, 0.6, 0.12));
    return mod(floor(bnd), 2.0) < 1.0 ? 7 : 15;
  }
  if (p.y < -18.0) return 11;
  if (p.y < -14.5) return 10;
  // the grand stair and its negative
  if (p.z > 12.6 && p.z < 17.2 && p.x > -4.0 && p.x < 2.6) {
    float xr = p.x + 4.0, yr = p.y + 14.5;
    float k = floor(xr / 0.6), top = (k + 1.0) * 0.4;
    if (yr < top) return 4;
    if (yr < xr / 0.6 * 0.4 + 0.95) return 5;
    return 0;
  }
  vec2 bij = clamp(floor((p.xz - 2.5 + 16.5) / ${PITCH}.0), 0.0, 2.0);
  vec2 l = p.xz - 2.5 - (-11.0 + ${PITCH}.0 * bij);
  if (abs(l.x) > ${BH} || abs(l.y) > ${BH}) return (p.x > 2.6 && p.y < -10.1) ? 10 : 0;
  if (bij.x == 1.0 && bij.y == 1.0) {
    vec3 q = p - vec3(2.5, -9.0, 2.5);
    float dd = length(q);
    if (p.y > -9.0) return dd < 2.6 ? (dd > 2.3 ? 2 : 1) : 0;
    float wd = min(3.6 - abs(l.x), 3.0 - abs(l.y));
    if (wd < 0.0) return 0;
    if (wd < 0.3) return (abs(l.x) < 0.6 && p.y < -12.2 && l.y > 0.0) ? 14 : 2;
    if (fract((p.y + 14.5) / 2.75) * 2.75 < 0.15) return 2;
    return 1;
  }
  vec2 hij = clamp(floor((l + ${BH}) / ${HP.toFixed(5)}), 0.0, 2.0);
  vec2 hl = l + ${BH} - (hij + 0.5) * ${HP.toFixed(5)};
  bool upper = p.x - hl.x > 2.6;
  float base = upper ? -10.1 : -14.5;
  vec3 id = vec3(bij.x * 3.0 + hij.x, 0.0, bij.y * 3.0 + hij.y);
  float hs = h1(id);
  float storeys = upper ? 2.0 : (hs < 0.3 ? 2.0 : 3.0);
  float eave = base + storeys * ${SH}, roofH = upper ? 0.9 : 1.2, hw0 = ${(HP / 2).toFixed(5)};
  float yr = p.y - base;
  if (yr < 0.0) return 10;
  vec2 a = abs(hl);
  if (p.y > eave) {
    float rs = eave + roofH * (1.0 - a.y / hw0);
    if (p.y < rs) return rs - p.y < 0.2 ? 3 : 1;
    return 0;
  }
  float wd = hw0 - max(a.x, a.y);
  float st = fract(yr / ${SH}) * ${SH};
  if (wd < 0.22) {
    float along = a.x > a.y ? hl.y : hl.x;
    if (yr < 1.8 && abs(along) < 0.38 && a.y > a.x && hl.y > 0.0) return 14;
    if (yr > ${SH} && st > 0.9 && abs(along) < 0.32 && st < 1.7 + sqrt(max(0.0, 0.1024 - along * along))) return 1;
    return 2;
  }
  if (st < 0.15) return 2;
  float sto = floor(yr / ${SH});
  float hs2 = h1(id + vec3(0.0, sto + 3.0, 0.0));
  if (hs2 < 0.5) {
    vec3 sp = vec3(hl.x - (hs2 - 0.25) * 1.4, st - 0.3, hl.y - (fract(hs2 * 7.0) - 0.5) * 1.2);
    if (length(vec3(max(abs(sp.x) - 0.38, 0.0), sp.y * 1.3, sp.z)) < 0.13) return 6;
  }
  return 1;
}
vec3 shadeCity(vec3 p, vec3 n){
  int m = cityMat(p);
  // tunnels and roots override soft materials
  float t1 = snoise(p * 0.33), t2 = snoise(p * 0.33 + 17.0);
  bool soft = m == 0 || m == 1 || m == 9 || m == 7 || m == 15 || m == 10;
  if (soft && abs(t1) < 0.03 && abs(t2) < 0.03) m = 12;
  if (p.y > -7.0 && soft) {
    for (int i = 0; i < 5; i++) {
      float fi = float(i);
      vec2 rc = vec2(-12.0 + fi * 6.5, -9.0 + mod(fi * 7.0, 15.0)) + vec2(snoise(vec3(p.y * 0.5, fi, 0.0)), snoise(vec3(p.y * 0.5, fi, 9.0))) * 1.2;
      float r = 0.09 * (1.0 + p.y / 8.0) + 0.02;
      float rd = length(p.xz - rc);
      float br = abs(snoise(vec3(p.xz * 0.6, fi * 3.0 + p.y * 0.3)));
      if (rd < r || (rd < 2.5 + p.y * 0.3 && br < 0.025)) m = 13;
    }
  }
  vec3 c = uPal[m];
  float g = snoise(p * 2.7) * 0.5 + snoise(p * 9.0) * 0.25;
  c *= 0.88 + 0.22 * g;
  if (m == 0) c *= 0.85 + 0.6 * step(0.93, fract(sin(dot(floor(p * 9.0), vec3(12.9, 78.2, 37.7))) * 43758.5));
  // light: cool raking moon
  vec3 L = normalize(vec3(0.42, 0.5, 0.76));
  float dif = max(dot(n, L), 0.0);
  c *= (0.2 + 0.95 * dif) * vec3(0.82, 0.88, 1.0);
  // beads of water sliding on the cut faces
  if (n.y < 0.5) {
    vec2 uv = vec2(n.z > 0.5 ? p.x : p.z, p.y) * vec2(1.4, 0.9);
    vec2 ce = floor(uv);
    float hh = fract(sin(dot(ce, vec2(41.3, 17.1))) * 9631.7);
    if (hh < 0.07) {
      vec2 bp = vec2(0.2 + 0.6 * fract(hh * 13.0), fract(hh * 7.0 - uTime * (0.015 + hh * 0.08)));
      float bd = length((fract(uv) - bp) * vec2(1.0, 0.65));
      c += vec3(0.75, 0.85, 1.0) * smoothstep(0.05, 0.0, bd) * 0.45;
    }
  } else {
    // the faint footpath and the listener's lantern
    float path = abs(p.z - 9.0 - 3.0 * sin(p.x * 0.18)) ;
    c *= 1.0 + 0.25 * smoothstep(0.7, 0.0, path) * step(p.x, 15.0);
    c += uPal[14] * 0.6 * exp(-pow(length(p.xz - uLantern.xz) / 1.2, 2.0));
  }
  c *= 1.0 - 0.96 * uDark;
  // the door slam: flash, a sound shell, and walls lit in its wake
  float d = distance(p, uSlamP), r = uSlamT * 6.0;
  bool str = m == 2 || m == 3 || m == 4 || m == 5 || m == 6 || m == 14 || m == 13;
  float fade = exp(-uSlamT * 0.12);
  float ring = exp(-pow((d - r) / 0.14, 2.0));
  float trail = d < r ? exp(-(r - d) * 0.9) : 0.0;
  vec3 amber = vec3(1.6, 0.85, 0.35);
  c += amber * fade * (ring * (0.45 + uDark) + trail * (str ? 1.3 + 2.0 * uDark : 0.06));
  c += amber * 2.5 * exp(-d * 2.5) * exp(-uSlamT * 2.5);
  return c;
}
`;

const build: CityBuilder = (ctx) => {
  const rng = ctx.rng;
  const root = new THREE.Group();

  // ---------------------------------------------------------------- shared layout (mirrors the shader)
  interface H { x: number; z: number; base: number; eave: number; rh: number }
  const houses: H[] = [];
  for (let bi = 0; bi < 3; bi++) for (let bj = 0; bj < 3; bj++) {
    if (bi === 1 && bj === 1) continue;
    for (let hi = 0; hi < 3; hi++) for (let hj = 0; hj < 3; hj++) {
      const x = 2.5 - 11 + PITCH * bi - BH + (hi + 0.5) * HP, z = 2.5 - 11 + PITCH * bj - BH + (hj + 0.5) * HP;
      if (z > 12.6 && x > -4 - HP / 2 && x < 2.6 + HP / 2) continue;
      const upper = x > 2.6;
      const base = upper ? -10.1 : -14.5;
      const st = upper ? 2 : hash(bi * 3 + hi, 0, bj * 3 + hj) < 0.3 ? 2 : 3;
      houses.push({ x, z, base, eave: base + st * SH, rh: upper ? 0.9 : 1.2 });
    }
  }

  // ---------------------------------------------------------------- the monolith (section shader)
  const PAL = ['#3a2f24', '#7b4931', '#d5cab4', '#8a8478', '#e2d8c2', '#5a1f1c', '#efe8da', '#4d5a6c', '#e8e6e0', '#3d3a2c', '#5e564c', '#2a2a2e', '#0c0a08', '#5a3a22', '#f2c48d', '#6a6478'];
  const uniforms = {
    uPal: { value: PAL.map((c) => new THREE.Color(c)) },
    uTime: K.U.time,
    uDark: { value: 0 },
    uSlamT: { value: 100 },
    uSlamP: { value: new THREE.Vector3() },
    uLantern: { value: new THREE.Vector3(12.6, 0, 9.4) },
  };
  const blockMat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      varying vec3 vW; varying vec3 vN;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        vN = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: K.GLSL_NOISE + GLSL_CITY + /* glsl */ `
      varying vec3 vW; varying vec3 vN;
      void main() { gl_FragColor = vec4(shadeCity(vW, normalize(vN)), 1.0); }`,
  });
  const block = new THREE.Mesh(new THREE.BoxGeometry(34, 23, 34).translate(0, -11.5, 0), blockMat);
  root.add(block);
  // ragged underside
  const under = K.wobble(K.at(K.cone(23.5, 9, 4), 0, -23, 0, { rx: Math.PI, ry: Math.PI / 4 }), 0.9, 0.35, 5);
  K.paintBy(under, (_x, y, _z, o) => o.set(K.mix('#1e1c1e', '#3a3430', K.clamp((y + 32) / 9))));
  const ub = new K.Batch();
  ub.add(under, null, 'stone');

  // ---------------------------------------------------------------- the deserted surface
  for (let i = 0; i < 30; i++) K.rock(ub, { x: rng.float(-15.5, 15.5), z: rng.float(-15.5, 12.5), r: rng.float(0.12, 0.4), color: '#6a645a', rng, flat: 0.6 });
  // two visitors near the front-right corner and a lantern
  const LX = 12.6, LZ = 9.4;
  ub.add(K.at(K.box(0.12, 0.18, 0.1), LX + 0.15, 0, LZ), '#4a3a2a', 'wood');
  root.add(ub.build({ name: 'surface' }));
  const lantern = K.glowSprite('#f2c48d', 1.1, 0.9);
  lantern.position.set(LX + 0.15, 0.28, LZ);
  root.add(lantern);
  const figMat = new THREE.MeshStandardMaterial({ color: '#4a4e58', roughness: 0.9, vertexColors: true });
  const standing = new THREE.Mesh(K.personGeometry(0.27), figMat);
  standing.position.set(LX + 0.7, 0, LZ - 0.6);
  standing.rotation.set(0.12, -2.4, 0);
  root.add(standing);
  const arm = new THREE.Mesh(K.at(K.cyl(0.012, 0.012, 0.16, 4), 0, 0, 0, { rx: 1.0 }), figMat);
  arm.position.set(LX + 0.62, 0.2, LZ - 0.52);
  arm.rotation.y = -2.4;
  root.add(arm);
  const listener = new THREE.Group();
  const lb = new THREE.Mesh(K.personGeometry(0.26), new THREE.MeshStandardMaterial({ color: '#6a5a48', roughness: 0.9, vertexColors: true }));
  lb.rotation.x = 1.25;
  lb.position.y = 0.04;
  listener.add(lb);
  listener.position.set(LX - 0.1, 0, LZ + 0.15);
  listener.rotation.y = 0.6;
  root.add(listener);

  // dry grass: a fixed field behind the drifting face and a strip that the face cuts
  const ZMIN = 13.0;
  const grassGeo = K.at(K.cone(0.025, 0.2, 3), 0, 0, 0);
  const grassMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, vertexColors: false });
  const GN = 14000;
  root.add(K.instanced(grassGeo, grassMat, GN, (_i, o, c) => {
    o.position.set(rng.float(-16.9, 16.9), 0, rng.float(-16.9, ZMIN));
    o.rotation.set(rng.float(-0.35, 0.35), rng.angle(), rng.float(-0.35, 0.35));
    o.scale.setScalar(rng.float(0.6, 1.5));
    c.copy(K.pickJitter(['#5a5236', '#6a6040', '#4a4630', '#7a6e4a'], rng));
  }, { castShadow: false }));
  const SN = 2200;
  const strip = Array.from({ length: SN }, () => [rng.float(-16.9, 16.9), rng.float(ZMIN, 16.9), rng.angle(), rng.float(0.6, 1.5)]);
  const stripMesh = K.instanced(grassGeo, grassMat, SN, (i, _o, c) => { c.copy(K.pickJitter(['#5a5236', '#6a6040', '#4a4630'], rng)); void i; }, { castShadow: false });
  root.add(stripMesh);
  const setStrip = K.instanceSetter(stripMesh);

  // ---------------------------------------------------------------- the city drawn by sound (listening mode)
  const segs: number[] = [];
  const seg = (a: number[], b: number[]) => segs.push(...a, ...b);
  for (const h of houses) {
    const hw = HP / 2 - 0.05;
    const cs = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => [h.x + sx * hw, h.z + sz * hw]);
    for (let i = 0; i < 4; i++) {
      const [ax, az] = cs[i], [bx, bz] = cs[(i + 1) % 4];
      seg([ax, h.base, az], [bx, h.base, bz]);
      seg([ax, h.eave, az], [bx, h.eave, bz]);
      seg([ax, h.base, az], [ax, h.eave, az]);
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) seg([h.x + sx * hw, h.eave, h.z + sz * hw], [h.x + sx * hw, h.eave + h.rh, h.z]);
    seg([h.x - hw, h.eave + h.rh, h.z], [h.x + hw, h.eave + h.rh, h.z]);
    seg([h.x - 0.38, h.base, h.z + hw], [h.x - 0.38, h.base + 1.8, h.z + hw]);
    seg([h.x + 0.38, h.base, h.z + hw], [h.x + 0.38, h.base + 1.8, h.z + hw]);
    seg([h.x - 0.38, h.base + 1.8, h.z + hw], [h.x + 0.38, h.base + 1.8, h.z + hw]);
    if (hash(h.x, 7, h.z) < 0.5) seg([h.x - 0.25, h.base + 0.24, h.z], [h.x + 0.25, h.base + 0.24, h.z]);
  }
  for (let k = 0; k < 11; k++) for (const z of [12.6, 14.8, 16.9]) {
    seg([-4 + k * 0.6, -14.5 + k * 0.4, z], [-4 + k * 0.6, -14.1 + k * 0.4, z]);
    seg([-4 + k * 0.6, -14.1 + k * 0.4, z], [-3.4 + k * 0.6, -14.1 + k * 0.4, z]);
  }
  seg([-4, -13.55, 14.8], [2.6, -9.15, 14.8]);
  for (let i = 0; i < 24; i++) {
    const a0 = (i / 24) * Math.PI * 2, a1 = ((i + 1) / 24) * Math.PI * 2;
    for (const e of [0, 0.5, 1.0]) {
      const rr = 2.45 * Math.cos(e), yy = -9 + 2.45 * Math.sin(e);
      seg([2.5 + Math.cos(a0) * rr, yy, 2.5 + Math.sin(a0) * rr], [2.5 + Math.cos(a1) * rr, yy, 2.5 + Math.sin(a1) * rr]);
    }
  }
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(segs, 3));
  const lineU = { uSlamP: uniforms.uSlamP, uSlamT: uniforms.uSlamT, uOn: { value: 0 } };
  const lineMat = new THREE.ShaderMaterial({
    uniforms: lineU,
    vertexShader: /* glsl */ `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uSlamP; uniform float uSlamT, uOn; varying vec3 vW;
      void main(){
        float d = distance(vW, uSlamP), r = uSlamT * 6.0;
        float a = (exp(-pow((d - r) / 0.5, 2.0)) * 1.4 + (d < r ? exp(-(r - d) * 0.15) * 0.8 : 0.0)) * exp(-uSlamT * 0.06) + 0.06;
        gl_FragColor = vec4(vec3(1.0, 0.62, 0.28) * 1.6, a * uOn);
      }`,
    transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const cityLines = new THREE.LineSegments(lineGeo, lineMat);
  cityLines.frustumCulled = false;
  cityLines.renderOrder = 10;
  root.add(cityLines);

  // the ripple through the grass when a sound reaches the surface
  const rippleMat = new THREE.MeshBasicMaterial({ color: '#c8b48a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const ripple = new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 4, 64).rotateX(Math.PI / 2), rippleMat);
  ripple.visible = false;
  root.add(K.particles({ count: 260, center: [0, 0.6, 0], radius: 22, y0: 0.05, y1: 1.4, color: '#8a94a8', size: 0.22, opacity: 0.12, swirl: 1.2, twinkle: 0.2, rng: rng.fork('mist') }));
  const crumbs = K.particles({ count: 90, center: [0, -11.5, 15], radius: 16, y0: -23, y1: 0, color: '#6a4a32', size: 0.05, opacity: 0.8, velocity: [0, -0.6, 0], rng: rng.fork('crumbs') });
  root.add(crumbs);

  // ---------------------------------------------------------------- door slams (deterministic schedule)
  const doors = houses.map((h) => new THREE.Vector3(h.x, h.base + 0.9, h.z + HP / 2));
  const slams: { t: number; p: THREE.Vector3 }[] = [];
  let acc = 2.2;
  for (let i = 0; i < 60; i++) {
    slams.push({ t: acc, p: rng.pick(doors) });
    acc += rng.float(7, 15);
  }
  const CYCLE = acc;
  const tog = new K.Toggle(0.4);

  const update = (t: number, dt: number) => {
    tog.update(dt);
    const g = tog.value;
    // the slow slice
    const zf = 15 + 2 * Math.cos((t / 90) * Math.PI * 2);
    block.scale.z = (zf + 17) / 34;
    block.position.z = (zf - 17) / 2;
    crumbs.position.z = zf - 15;
    for (let i = 0; i < SN; i++) {
      const [x, z, ry, s] = strip[i];
      setStrip(i, x, 0, z, ry, z < zf - 0.05 ? s : 0);
    }
    setStrip.done();
    // which slam is sounding; in listening mode the city answers more often
    let sT: number, sP: THREE.Vector3;
    if (g > 0.5) {
      const k = Math.floor(t / 4.5);
      sT = t - k * 4.5;
      sP = doors[Math.floor(hash(k, 3, 1) * doors.length) % doors.length];
    } else {
      const tc = t % CYCLE;
      let cur = slams[slams.length - 1], prevT = slams[slams.length - 1].t - CYCLE;
      for (const s of slams) if (s.t <= tc) { cur = s; prevT = s.t; }
      sT = tc - prevT;
      sP = cur.p;
    }
    uniforms.uSlamT.value = sT;
    uniforms.uSlamP.value.copy(sP);
    uniforms.uDark.value = g;
    lineU.uOn.value = g;
    cityLines.visible = g > 0.01;
    // the ripple at the surface and the listener's twitch
    const r = sT * 6;
    const rr = r > -sP.y ? Math.sqrt(r * r - sP.y * sP.y) : 0;
    ripple.position.set(sP.x, 0.06, sP.z);
    ripple.scale.setScalar(Math.max(0.01, rr));
    rippleMat.opacity = rr > 0 && rr < 26 ? 0.35 * Math.exp(-rr * 0.08) : 0;
    const arrive = Math.hypot(LX - sP.x, -sP.y, LZ - sP.z) / 6;
    const tw = Math.exp(-Math.pow((sT - arrive) / 0.25, 2));
    listener.rotation.z = tw * 0.15;
    (lantern.material as THREE.SpriteMaterial).opacity = 0.9 * (0.85 + 0.15 * Math.sin(t * 9) * Math.sin(t * 5.3));
  };
  update(0, 0);

  return {
    root,
    env: {
      skyTop: '#0a0d13',
      skyHorizon: '#252b37',
      skyBottom: '#0c0f14',
      fog: '#14181f',
      fogNear: 70,
      fogFar: 200,
      sunDir: [0.42, 0.5, 0.76],
      sunColor: '#b8c4dc',
      sunIntensity: 1.1,
      sunDisc: 0,
      sunGlow: 0.2,
      moon: { dir: [-0.6, 0.18, -0.8], size: 1.6, color: '#e8e4d8' },
      hemiSky: '#4a5468',
      hemiGround: '#2a2620',
      hemiIntensity: 0.6,
      envIntensity: 0.5,
      stars: 0,
      clouds: 0.1,
      cloudColor: '#3a4050',
      bloomStrength: 0.8,
      bloomThreshold: 0.8,
      bloomRadius: 0.5,
      vignette: 0.5,
      tiltShift: 0.25,
      shadowRadius: 26,
      saturation: 1.0,
    },
    camera: {
      position: [40.3, 10.5, 40.3],
      target: [0, -8, 0],
      fov: 35,
      minDistance: 10,
      maxDistance: 80,
      autoRotate: 0,
      views: [
        { position: [22, 20, 34], target: [0, -6, 0] },
        { position: [9, -9.5, 26], target: [2, -11.5, 15] },
      ],
    },
    interaction: {
      label: 'Ear to the Ground',
      activeLabel: 'Look again',
      hint: 'In the dark, only a door slamming somewhere below draws the city.',
      set: (on) => tog.set(on),
      camera: { position: [16, 2.8, 13], target: [0, -8, -1] },
    },
    update,
  };
};

export default build;
