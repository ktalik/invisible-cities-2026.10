// LAUDOMIA - Cities & the Dead 5.
// A colossal hourglass that no one turns: the upper bulb is the house of the unborn,
// a marble funnel of tiered niches dusted with countless trembling motes and one last
// grain on the rim; the living Laudomia sits at the narrow waist around an open well;
// the lower bulb is the stepped heap of the dead, windowless blocks faced with name
// slabs. Grains fall through the well and each one lights a slab below.
// Toggle: the infinite unborn, the glass dissolves and funnels open into funnels.

import * as THREE from 'three';
import * as K from '../kit';
import type { CityBuilder } from '../core/types';

const TIERS = 18, F_Y0 = 3, F_Y1 = 18, F_R0 = 0.35, F_R1 = 14;
const tierR = (k: number) => F_R0 + ((F_R1 - F_R0) * k) / TIERS;
const tierY = (k: number) => F_Y0 + ((F_Y1 - F_Y0) * k) / TIERS;
const HEAP = 12, H_R0 = 1.5, H_R1 = 14, H_Y0 = -2.5, H_Y1 = -21.2;
const heapR = (k: number) => H_R0 + ((H_R1 - H_R0) * (k + 1)) / HEAP;
const heapY = (k: number) => H_Y0 + ((H_Y1 - H_Y0) * k) / HEAP;

/** a view-dependent cutaway: fragments on the camera's side of the axis are discarded */
function cutaway(mat: THREE.MeshStandardMaterial) {
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = 'varying vec3 vWp;\n' + sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
      vec4 cw = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        cw = instanceMatrix * cw;
      #endif
      vWp = (modelMatrix * cw).xyz;`);
    sh.fragmentShader = 'varying vec3 vWp;\n' + sh.fragmentShader.replace('void main() {', `void main() {
      if (length(vWp.xz) > 0.6 && dot(normalize(vWp.xz), normalize(cameraPosition.xz)) > 0.42) discard;`);
  };
  return mat;
}

const build: CityBuilder = (ctx) => {
  const rng = ctx.rng;
  const root = new THREE.Group();
  const b = new K.Batch();

  // ---------------------------------------------------------------- frame: walnut discs, brass rims and turned columns
  const frame = new THREE.Group();
  const walnut = new THREE.MeshStandardMaterial({ color: '#4a2e1e', roughness: 0.55, transparent: true });
  const brass = new THREE.MeshStandardMaterial({ color: '#c49a4a', roughness: 0.3, metalness: 1, transparent: true });
  for (const y of [24, -21.6]) {
    frame.add(new THREE.Mesh(K.at(K.cyl(17, 17, 0.8, 72), 0, y - 0.4, 0), walnut));
    for (const dy of [-0.4, 0.4]) frame.add(new THREE.Mesh(K.at(K.torus(17.02, 0.12, 6, 72), 0, y + dy, 0), brass));
  }
  const colProfile: [number, number][] = [[0.5, -21.2], [0.5, -20.6], [0.3, -20.2]];
  for (let i = 0; i <= 16; i++) { const y = -19.8 + (i / 16) * 43; colProfile.push([0.26 + 0.1 * Math.abs(Math.sin(i * 1.3)), y]); }
  colProfile.push([0.5, 23.2], [0.5, 23.6]);
  for (const a of [45, 135, 225, 315]) frame.add(new THREE.Mesh(K.at(K.lathe(colProfile, 12), Math.cos(a * Math.PI / 180) * 16.5, 0, Math.sin(a * Math.PI / 180) * 16.5), brass));
  frame.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
  root.add(frame);

  // ---------------------------------------------------------------- glass (fresnel rim only)
  const glassMat = new THREE.ShaderMaterial({
    uniforms: { uOp: { value: 1 } },
    vertexShader: /* glsl */ `varying vec3 vN; varying vec3 vV;
      void main(){ vec4 w = modelMatrix * vec4(position,1.0); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `uniform float uOp; varying vec3 vN; varying vec3 vV;
      void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 3.0); gl_FragColor = vec4(vec3(1.0, 0.97, 0.9) * (0.25 + 0.8 * f), (0.03 + 0.4 * f) * uOp); }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  });
  const glass = new THREE.Mesh(K.lathe([[11, 23.5], [15, 18], [15.5, 12], [12, 5], [7.6, 0], [12, -5], [15.5, -12], [15.2, -19], [14.8, -21.2]].reverse().map(([r, y]) => [r, y] as [number, number]), 72), glassMat);
  glass.renderOrder = 5;
  root.add(glass);

  // ---------------------------------------------------------------- house of the unborn: the marble funnel
  const marble = cutaway(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, side: THREE.DoubleSide }));
  const fb = new K.Batch();
  const prof: [number, number][] = [];
  for (let k = 0; k < TIERS; k++) prof.push([tierR(k), tierY(k)], [tierR(k), tierY(k + 1)]);
  prof.push([F_R1 + 0.4, F_Y1]);
  const vein = (x: number, y: number, z: number, o: THREE.Color) => {
    const n = K.noise3(x * 0.25, y * 0.25, z * 0.25);
    o.set(K.mix('#eee7da', '#d7c6a5', K.clamp(0.5 + K.noise3(x * 0.8, y, z * 0.8) * 0.4)));
    if (Math.abs(n) < 0.035) o.lerp(K.col('#4c2a49'), 0.75);
  };
  fb.addWith(K.paintBy(K.lathe(prof, 96), vein), marble);
  fb.addWith(K.paintBy(K.lathe([[F_R0 + 0.3, F_Y0 - 0.6], [F_R1 + 0.5, F_Y1 - 0.5], [F_R1 + 0.5, F_Y1 + 0.3]], 96), vein), marble);
  fb.addWith(K.paint(K.at(K.cyl(0.45, 0.35, 1.2, 16, true), 0, F_Y0 - 1.0, 0), '#d7c6a5'), marble);
  // niches with brackets, capitals and plinths on every riser
  const ledges: { a: number; k: number }[] = [];
  for (let k = 1; k < TIERS; k++) {
    const r = tierR(k), hgt = tierY(k + 1) - tierY(k);
    const n = Math.floor((Math.PI * 2 * r) / 0.78);
    for (let i = 0; i < n; i++) {
      const a = ((i + 0.5) / n) * Math.PI * 2;
      const x = Math.cos(a) * (r - 0.02), z = Math.sin(a) * (r - 0.02), ry = -a - Math.PI / 2;
      fb.addWith(K.paint(K.at(K.archWall(0.7, hgt * 0.92, 0.06, 0.4, hgt * 0.7, 6), x, tierY(k), z, { ry }), '#e6dccb'), marble);
      fb.addWith(K.paint(K.at(K.box(0.36, hgt * 0.7, 0.02), Math.cos(a) * (r + 0.02), tierY(k), Math.sin(a) * (r + 0.02), { ry }), '#8a7a6a'), marble);
      fb.addWith(K.paint(K.at(K.box(0.18, 0.06, 0.14), Math.cos(a) * (r - 0.1), tierY(k) + hgt * 0.32, Math.sin(a) * (r - 0.1), { ry }), '#f4efe4'), marble);
      ledges.push({ a, k });
    }
  }
  // the coffered dome: ribs and rings
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const pts: THREE.Vector3[] = [];
    for (let j = 0; j <= 10; j++) { const e = (j / 10) * Math.PI / 2; pts.push(new THREE.Vector3(Math.cos(a) * 14.3 * Math.cos(e), F_Y1 + 5 * Math.sin(e), Math.sin(a) * 14.3 * Math.cos(e))); }
    fb.addWith(K.paint(K.tube(pts, 0.1, 16, 5), '#e6dccb'), marble);
  }
  for (const e of [0.25, 0.55, 0.85]) fb.addWith(K.paint(K.at(K.torus(14.3 * Math.cos(e * Math.PI / 2), 0.09, 5, 72), 0, F_Y1 + 5 * Math.sin(e * Math.PI / 2), 0), '#e6dccb'), marble);
  const funnel = fb.build({ name: 'funnel', castShadow: false });
  root.add(funnel);

  // ---------------------------------------------------------------- the unborn: motes on every ledge
  const moteMat = (size: number) => new THREE.ShaderMaterial({
    uniforms: { uTime: K.U.time, uSize: { value: size }, uOp: { value: 1 }, uCut: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute float aSeed; attribute float aKind;
      uniform float uTime, uSize, uCut; varying float vA; varying vec3 vC;
      void main(){
        vec3 p = position;
        if (aKind > 0.5) { float a = uTime * 0.02 * (0.5 + aSeed); float c = cos(a), s = sin(a); p.xz = mat2(c, -s, s, c) * p.xz; }
        float tw = pow(max(0.0, sin(uTime * (1.2 + aSeed * 3.0) + aSeed * 40.0)), 14.0);
        p.y += tw * 0.1;
        vec4 wp = modelMatrix * vec4(p, 1.0);
        vA = (uCut > 0.5 && length(wp.xz) > 0.6 && dot(normalize(wp.xz), normalize(cameraPosition.xz)) > 0.42) ? 0.0 : 1.0;
        vec4 mv = viewMatrix * wp;
        gl_PointSize = max(1.2, uSize * (1.0 + tw) * 420.0 * projectionMatrix[1][1] / -mv.z);
        gl_Position = projectionMatrix * mv;
        vC = aKind > 1.5 ? vec3(2.4, 2.1, 1.5) : aKind > 0.5 ? (aSeed > 0.5 ? vec3(0.6, 0.25, 0.7) : vec3(0.95, 0.6, 0.3)) : vec3(1.6, 1.4, 1.05);
      }`,
    fragmentShader: /* glsl */ `uniform float uOp; varying float vA; varying vec3 vC;
      void main(){ if (vA < 0.5) discard; float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(vC, (1.0 - d * 2.0) * uOp); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const pointsOf = (pos: number[], seed: number[], kind: number[], mat: THREE.ShaderMaterial) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 1));
    g.setAttribute('aKind', new THREE.Float32BufferAttribute(kind, 1));
    const p = new THREE.Points(g, mat);
    p.frustumCulled = false;
    return p;
  };
  const mp: number[] = [], ms: number[] = [], mk: number[] = [];
  for (let k = 0; k < TIERS; k++) {
    const r0 = tierR(k), r1 = tierR(k + 1), y = tierY(k + 1);
    for (let i = 0; i < 2000; i++) {
      const a = rng.angle(), r = rng.float(r0 + 0.04, r1 + 0.1);
      mp.push(Math.cos(a) * r, y + 0.03, Math.sin(a) * r); ms.push(rng.next()); mk.push(0);
    }
  }
  for (const { a, k } of ledges) for (let j = 0; j < 3; j++) {
    const r = tierR(k) - 0.12;
    mp.push(Math.cos(a) * r + rng.float(-0.06, 0.06), tierY(k) + (tierY(k + 1) - tierY(k)) * 0.32 + 0.07, Math.sin(a) * r + rng.float(-0.06, 0.06)); ms.push(rng.next()); mk.push(0);
  }
  for (let i = 0; i < 4000; i++) { // processions along the veins
    const k = rng.int(2, TIERS - 1), a = rng.angle(), r = tierR(k) + 0.25;
    mp.push(Math.cos(a) * r, tierY(k + 1) + 0.04, Math.sin(a) * r); ms.push(rng.next()); mk.push(1);
  }
  const unbornMat = moteMat(0.075);
  root.add(pointsOf(mp, ms, mk, unbornMat));
  // the last grain, alone on the rim
  const lastGrain = K.glowSprite('#fff3cf', 0.9, 1);
  lastGrain.position.set(Math.cos(2.2) * (F_R1 - 0.3), F_Y1 + 0.12, Math.sin(2.2) * (F_R1 - 0.3));
  root.add(lastGrain);

  // ---------------------------------------------------------------- the living city at the waist
  b.add(K.lathe([[0.35, 0], [0.35, -1], [6.9, -1], [7.4, -0.6], [7.4, 0], [0.35, 0]] as [number, number][], 72), '#d7c6a5', 'stone');
  b.add(K.at(K.ring(0.35, 1.4, 32), 0, 0.012, 0), '#e8dcc4', 'stone');
  b.add(K.at(K.torus(0.42, 0.07, 6, 20), 0, 0.07, 0), '#cbb999', 'stone');
  for (const r of [3.0, 5.2]) b.add(K.at(K.ring(r - 0.25, r + 0.25, 64), 0, 0.01, 0), '#b8a888', 'stone');
  K.cityWall(b, { r: 7.1, h: 1.0, thick: 0.3, color: '#cbb999', gates: [0, Math.PI / 2, Math.PI, Math.PI * 1.5], gateWidth: 0.9, seg: 72 });
  const WALLS = ['#eee7da', '#e8d6b6', '#d7c6a5', '#f0e0c8', '#e0cdb0', '#c8b496'];
  for (let i = 0; i < 160; i++) {
    const a = rng.angle(), r = rng.float(1.9, 6.6);
    const ka = ((a / (Math.PI / 4)) % 1 + 1) % 1;
    if (Math.abs(ka - 0.5) * (Math.PI / 4) * r < 0.45) continue;
    if (Math.abs(r - 3.0) < 0.55 || Math.abs(r - 5.2) < 0.55) continue;
    const w = rng.float(0.7, 1.2);
    const st = rng.int(2, 5);
    K.house(b, { x: Math.cos(a) * r, z: Math.sin(a) * r, ry: -a + Math.PI / 2, w, d: w * rng.float(0.8, 1.1), h: st * 0.45, roof: rng.pick(['flat', 'gable', 'hip'] as const), wall: rng.pick(WALLS), roofColor: rng.pick(['#a0583a', '#8a4a32', '#b86a46']), lit: 0.1, glow: 2, rng });
    if (st >= 3 && rng.chance(0.5)) b.add(K.at(K.box(w * 0.6, 0.04, 0.18), Math.cos(a) * (r - w * 0.5), 0.9, Math.sin(a) * (r - w * 0.5), { ry: -a + Math.PI / 2 }), '#6a4a3a', 'wood');
  }
  // two stairs spiral down from the north and south gates to the heap
  const stairPath = (a0: number) => (s: number) => {
    const a = a0 + s * 1.3, r = 7.45 + s * 2.4;
    return new THREE.Vector3(Math.cos(a) * r, -s * 12.4, Math.sin(a) * r);
  };
  const stairs = [stairPath(-Math.PI / 2), stairPath(Math.PI / 2)];
  for (const sp of stairs) for (let i = 0; i < 64; i++) {
    const p = sp(i / 63), q = sp(Math.min(1, (i + 1) / 63));
    b.add(K.at(K.box(0.7, 0.12, 0.42), p.x, p.y - 0.12, p.z, { ry: -Math.atan2(q.z - p.z, q.x - p.x) }), '#cbb999', 'stone');
  }

  // ---------------------------------------------------------------- the heap of the dead
  const ALLEYS = 8;
  const slabs: { x: number; y: number; z: number; ry: number }[] = [];
  for (let k = 0; k < HEAP; k++) {
    const rIn = k === 0 ? 0 : heapR(k - 1), rOut = heapR(k), top = heapY(k);
    const gap = 0.2 / rOut;
    for (let s = 0; s < ALLEYS; s++) {
      const a0 = (s / ALLEYS) * Math.PI * 2 + gap + Math.PI / 8, a1 = ((s + 1) / ALLEYS) * Math.PI * 2 - gap + Math.PI / 8;
      const sh = new THREE.Shape();
      const N = 10;
      for (let i = 0; i <= N; i++) { const a = a0 + ((a1 - a0) * i) / N; const v = [Math.cos(a) * rOut, Math.sin(a) * rOut]; if (i === 0) sh.moveTo(v[0], v[1]); else sh.lineTo(v[0], v[1]); }
      if (rIn === 0) sh.lineTo(0, 0);
      else for (let i = N; i >= 0; i--) { const a = a0 + ((a1 - a0) * i) / N; sh.lineTo(Math.cos(a) * rIn, Math.sin(a) * rIn); }
      b.add(K.at(K.extrudeUp(sh, top - H_Y1, 2), 0, H_Y1, 0), K.jitter('#b8aec4', rng, 0.01, 0.03, 0.04), 'stone');
      // name slabs on the riser below this terrace's rim
      const rows = 4, cols = Math.floor(((a1 - a0) * rOut) / 0.36);
      if (k < HEAP - 1) for (let rr = 0; rr < rows; rr++) for (let c = 0; c < cols; c++) {
        const a = a0 + ((c + 0.5) / cols) * (a1 - a0);
        slabs.push({ x: Math.cos(a) * (rOut + 0.02), y: heapY(k + 1) + 0.18 + rr * 0.34, z: Math.sin(a) * (rOut + 0.02), ry: -a + Math.PI / 2 });
      }
    }
  }
  const SLABS = Math.min(2600, slabs.length);
  rng.shuffle(slabs);
  const slabMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 });
  const slabMesh = K.instanced(K.box(0.3, 0.24, 0.03), slabMat, SLABS, (i, o, c) => {
    const s = slabs[i];
    o.position.set(s.x, s.y, s.z);
    o.rotation.y = s.ry;
    c.copy(K.jitter('#ddd6e4', rng, 0.01, 0.03, 0.05));
  }, { castShadow: false });
  root.add(slabMesh);
  // visitors reading names, and the gravedigger's cart
  const vis: [number, number, number, number][] = [];
  for (let i = 0; i < 20; i++) {
    const k = rng.int(2, HEAP - 2), a = rng.angle(), r = heapR(k) + 0.45;
    vis.push([Math.cos(a) * r, heapY(k + 1), Math.sin(a) * r, a]);
  }
  root.add(K.instanced(K.personGeometry(0.28), K.figureMaterial(), vis.length, (i, o, c) => {
    const [x, y, z, a] = vis[i];
    o.position.set(x, y, z);
    o.rotation.y = -a - Math.PI / 2;
    c.copy(K.pickJitter(['#4c2a49', '#2e3a4a', '#7a5a3a', '#e8e0d0'], rng));
  }));
  const ca = 0.7, cr = heapR(5) + 0.5;
  b.add(K.at(K.box(0.5, 0.18, 0.28), Math.cos(ca) * cr, heapY(6) + 0.12, Math.sin(ca) * cr, { ry: -ca }), '#5a3a28', 'wood');

  // ---------------------------------------------------------------- inhabitants of the living city
  const paths: THREE.Vector3[][] = [];
  for (const r of [3.0, 5.2]) paths.push(Array.from({ length: 41 }, (_, i) => new THREE.Vector3(Math.cos((i / 40) * Math.PI * 2) * r, 0.02, Math.sin((i / 40) * Math.PI * 2) * r)));
  for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + (i * Math.PI) / 4; paths.push([new THREE.Vector3(Math.cos(a) * 1.5, 0.02, Math.sin(a) * 1.5), new THREE.Vector3(Math.cos(a) * 6.8, 0.02, Math.sin(a) * 6.8)]); }
  const walkers = new K.Walkers({ paths, count: 260, h: 0.24, rng: rng.fork('walk'), speed: [0.15, 0.35], colors: ['#4c2a49', '#b88a3f', '#2e4a6b', '#e8e0d0', '#7a3b2e', '#5a6a3a'] });
  root.add(walkers.mesh);
  // lives in passing: a grain stops in the piazza, walks out and down, and is filed below
  const PASS = 6, PER = 30;
  const passMat = new THREE.MeshStandardMaterial({ color: '#fff3cf', emissive: '#b88a3f', emissiveIntensity: 0.6, roughness: 0.6 });
  const passers = K.instanced(K.personGeometry(0.26), passMat, PASS, undefined, { colors: false });
  root.add(passers);
  const setPass = K.instanceSetter(passers);
  const passPath = (i: number) => {
    const sp = stairs[i % 2], g = i % 2 ? Math.PI / 2 : -Math.PI / 2;
    const pts = [new THREE.Vector3(0.9 * Math.cos(g + 0.5), 0.02, 0.9 * Math.sin(g + 0.5)), new THREE.Vector3(Math.cos(g) * 7.3, 0.02, Math.sin(g) * 7.3)];
    for (let j = 1; j <= 12; j++) pts.push(sp(j / 12));
    return pts;
  };
  const passPaths = Array.from({ length: PASS }, (_, i) => passPath(i));
  const flash = K.glowSprite('#fff3cf', 1.6, 0);
  flash.position.set(0, 0.3, 0);
  root.add(flash);

  // ---------------------------------------------------------------- the falling thread of grains
  const GN = 90;
  const gp: number[] = [], gs: number[] = [], gk: number[] = [];
  for (let i = 0; i < GN; i++) { gp.push(rng.float(-0.04, 0.04), 0, rng.float(-0.04, 0.04)); gs.push(i / GN); gk.push(2); }
  const grainGeo = new THREE.BufferGeometry();
  grainGeo.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3));
  grainGeo.setAttribute('aSeed', new THREE.Float32BufferAttribute(gs, 1));
  const grainMat = new THREE.ShaderMaterial({
    uniforms: { uTime: K.U.time, uThick: { value: 0 } },
    vertexShader: /* glsl */ `attribute float aSeed; uniform float uTime, uThick; varying float vA;
      void main(){ float f = fract(aSeed + uTime * 0.07); vec3 p = position * (1.0 + uThick * 4.0); p.y = ${(F_Y0 - 1).toFixed(2)} - f * f * ${(F_Y0 + 0.5).toFixed(2)};
        vA = step(fract(aSeed * 7.31), 0.55 + uThick);
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = max(1.5, 0.09 * 420.0 * projectionMatrix[1][1] / -mv.z); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */ `varying float vA; void main(){ if (vA < 0.5) discard; float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(vec3(2.6, 2.3, 1.6), 1.0 - d * 2.0); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const grains = new THREE.Points(grainGeo, grainMat);
  grains.frustumCulled = false;
  root.add(grains);
  const apexGlow = K.glowSprite('#fff3cf', 1.4, 0.7);
  apexGlow.position.set(0, H_Y0 + 0.2, 0);
  root.add(apexGlow);

  // ---------------------------------------------------------------- infinite unborn: funnels opening into funnels
  const subGeo = K.paint(K.lathe(Array.from({ length: 13 }, (_, i) => { const k = Math.floor(i / 2); return [0.05 + (k + (i % 2)) * 0.16, (k + (i % 2 ? 1 : 0)) * 0.16] as [number, number]; }), 20), '#eee7da');
  const subMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, side: THREE.DoubleSide, emissive: '#8a7a68', emissiveIntensity: 0.6 });
  const subs: { p: THREE.Vector3; s: number; lv: number; tilt: number; a: number }[] = [];
  const spawn = (n: number, r0: number, r1: number, y0: number, y1: number, s: number, lv: number) => {
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + rng.float(-0.1, 0.1); const r = rng.float(r0, r1); subs.push({ p: new THREE.Vector3(Math.cos(a) * r, rng.float(y0, y1), Math.sin(a) * r), s: s * rng.float(0.8, 1.2), lv, tilt: rng.float(0.3, 0.7), a }); }
  };
  spawn(16, 15, 19, 19, 24, 3.2, 0);
  spawn(48, 21, 30, 23, 33, 1.3, 1);
  spawn(144, 30, 46, 28, 44, 0.55, 2);
  const subMesh = K.instanced(subGeo, subMat, subs.length, () => false, { castShadow: false });
  root.add(subMesh);
  const setSub = K.instanceSetter(subMesh);
  const sp2: number[] = [], ss2: number[] = [], sk2: number[] = [];
  for (const s of subs) for (let j = 0; j < 60; j++) {
    const a = rng.angle(), h = rng.float(0, 1), r = (0.1 + h * 0.95) * s.s;
    const v = new THREE.Vector3(Math.cos(a) * r, h * 0.95 * s.s, Math.sin(a) * r).applyAxisAngle(new THREE.Vector3(-Math.sin(s.a), 0, Math.cos(s.a)), s.tilt).add(s.p);
    sp2.push(v.x, v.y, v.z); ss2.push(rng.next()); sk2.push(0);
  }
  for (let i = 0; i < 12000; i++) { const v = new THREE.Vector3(rng.float(-1, 1), rng.float(-0.4, 1), rng.float(-1, 1)).normalize().multiplyScalar(rng.float(22, 70)); sp2.push(v.x, v.y + 14, v.z); ss2.push(rng.next()); sk2.push(rng.chance(0.15) ? 1 : 0); }
  const galaxyMat = moteMat(0.06);
  galaxyMat.uniforms.uCut.value = 0;
  const galaxy = pointsOf(sp2, ss2, sk2, galaxyMat);
  root.add(galaxy);

  root.add(K.particles({ count: 200, center: [0, 10, 0], radius: 12, y0: 4, y1: 18, color: '#fff3cf', size: 0.07, opacity: 0.35, swirl: 0.8, twinkle: 0.7, disc: true, rng: rng.fork('dust') }));
  root.add(b.build({ name: 'laudomia' }));

  const tog = new K.Toggle(0.35);
  let lastLit = -1;
  const LIT = new THREE.Color('#fff3cf').multiplyScalar(1.8), UNLIT = new THREE.Color('#ddd6e4');
  const update = (t: number, dt: number) => {
    tog.update(dt);
    const g = tog.value;
    walkers.update(t);
    // a slab lights for every grain that lands; the heap fills, then the cycle starts again
    const nLit = Math.floor((t * 1.2) % SLABS) + 400;
    if (nLit !== lastLit) {
      const from = lastLit < 0 || nLit < lastLit ? 0 : lastLit;
      if (from === 0) for (let i = 0; i < SLABS; i++) slabMesh.setColorAt(i, i < nLit ? LIT : UNLIT);
      else for (let i = from; i < nLit; i++) slabMesh.setColorAt(i, LIT);
      if (slabMesh.instanceColor) slabMesh.instanceColor.needsUpdate = true;
      lastLit = nLit;
    }
    // lives in passing
    let fl = 0;
    for (let i = 0; i < PASS; i++) {
      const ph = K.fract(t / PER + i / PASS), pts = passPaths[i];
      if (ph < 0.06) { fl = Math.max(fl, 1 - ph / 0.06); setPass(i, 0, -80, 0, 0, 0); continue; }
      const s = K.clamp((ph - 0.06) / 0.9) * (pts.length - 1);
      const j = Math.min(pts.length - 2, Math.floor(s)), f = s - j;
      const p = pts[j].clone().lerp(pts[j + 1], f);
      const sc = ph > 0.93 ? (1 - (ph - 0.93) / 0.07) : Math.min(1, (ph - 0.06) * 30);
      setPass(i, p.x, p.y, p.z, Math.atan2(pts[j + 1].x - pts[j].x, pts[j + 1].z - pts[j].z), Math.max(0.001, sc));
    }
    setPass.done();
    (flash.material as THREE.SpriteMaterial).opacity = fl * 0.9;
    // the last grain pulses every four seconds; it disappears when there is no last one
    const pulse = Math.exp(-Math.pow((t % 4) / 0.35, 2));
    lastGrain.scale.setScalar(0.8 + pulse * 0.9);
    (lastGrain.material as THREE.SpriteMaterial).opacity = (0.75 + 0.25 * pulse) * (1 - g);
    // infinite unborn
    glassMat.uniforms.uOp.value = 1 - g;
    walnut.opacity = brass.opacity = 1 - g;
    frame.visible = g < 0.98;
    glass.visible = g < 0.98;
    grainMat.uniforms.uThick.value = g;
    galaxyMat.uniforms.uOp.value = g;
    galaxy.visible = g > 0.01;
    subMesh.visible = g > 0.01;
    if (g > 0.001) {
      subs.forEach((s, i) => {
        const grow = K.easeInOutSine(K.clamp(g * 3 - s.lv));
        setSub(i, s.p.x, s.p.y, s.p.z, 0, s.s * grow, 0, 0);
        subMesh.getMatrixAt(i, _m);
        _m.premultiply(_r.makeTranslation(-s.p.x, -s.p.y, -s.p.z)).premultiply(_r2.makeRotationAxis(_ax.set(-Math.sin(s.a), 0, Math.cos(s.a)), s.tilt)).premultiply(_r.makeTranslation(s.p.x, s.p.y, s.p.z));
        subMesh.setMatrixAt(i, _m);
      });
      setSub.done();
    }
  };
  const _m = new THREE.Matrix4(), _r = new THREE.Matrix4(), _r2 = new THREE.Matrix4(), _ax = new THREE.Vector3();
  update(0, 0);

  return {
    root,
    env: {
      skyTop: '#4a4468',
      skyHorizon: '#e8d6b6',
      skyBottom: '#8a7e98',
      skyCurve: 0.5,
      fog: '#aa9db2',
      fogNear: 90,
      fogFar: 260,
      sunDir: [0.75, 0.42, 0.5],
      sunColor: '#ffd8a0',
      sunIntensity: 2.6,
      sunDisc: 0.6,
      sunGlow: 0.9,
      hemiSky: '#c8c0e0',
      hemiGround: '#6a5a78',
      hemiIntensity: 0.7,
      envIntensity: 0.8,
      clouds: 0.25,
      cloudColor: '#f4e6d0',
      bloomStrength: 0.75,
      bloomThreshold: 0.85,
      bloomRadius: 0.5,
      vignette: 0.4,
      tiltShift: 0.2,
      shadowRadius: 26,
    },
    camera: {
      position: [0, 11, 71.3],
      target: [0, 1, 0],
      fov: 42,
      minDistance: 18,
      maxDistance: 80,
      autoRotate: 0.33,
      views: [
        { position: [30, 34, 40], target: [0, 6, 0] },
        { position: [9, 4.5, 14], target: [0, -0.5, 0] },
      ],
    },
    interaction: {
      label: 'Infinite Unborn',
      activeLabel: 'Close the glass',
      hint: 'Every niche opens into another funnel; there is no last grain.',
      set: (on) => tog.set(on),
    },
    update,
  };
};

export default build;
