// ISAURA - Thin Cities 1.
// The city of a thousand wells stands over a buried lake and reaches exactly as far
// as its shafts find water: the green edge of the town traces the unseen shore.
// A wedge is cut from the limestone island so the sunlit city and the black lake
// below are seen together. A swell crossing the lake sends pulses up the shafts and
// the machinery above answers. Toggle: the gods below (rock turns smoky, lake glows).

import * as THREE from 'three';
import * as K from '../kit';
import type { CityBuilder } from '../core/types';

const TAU = Math.PI * 2;
const WC = Math.PI / 2, HW = 0.87; // wedge centre (+z, towards the camera) and half width
const A0 = WC + HW, A1 = WC - HW + TAU; // solid angular range
const LAKE_Y = -7, FLOOR_Y = -8.5, BOTTOM = -18;
const rim = (a: number) => 22.6 + 0.7 * Math.sin(5 * a + 1) + 0.4 * Math.sin(11 * a + 2);
const L = (a: number) => 14.6 + 2.4 * Math.sin(2 * a + 0.7) + 1.4 * Math.sin(3 * a + 2.1) + 0.6 * Math.sin(7 * a + 0.3);
const rc = (a: number) => L(a) + 0.3;
const ceilY = (r: number, a: number) => -2.6 - 2.4 * Math.min(1, r / rc(a)) ** 2;
const rOut = (y: number, a: number) => {
  const n = K.noise3(Math.cos(a) * 2, Math.sin(a) * 2, y * 0.25);
  const f = y > -9 ? 1 + y * 0.005 : 0.955 * (1 - Math.pow(Math.min(1, (-y - 9) / 9), 1.7));
  return Math.max(0, rim(a) * f * (1 + 0.035 * n));
};
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const since = (x: number, t: number) => 9 * K.fract(t / 9 - (x + 22) / 44);
const ARRIVE = 5 / 3; // seconds for a pulse to climb from the ceiling to the surface
const lift = (k: number) => (k < 0 ? 0 : k < 0.35 ? K.easeOut(k / 0.35) : k < 1.5 ? 1 : Math.max(0, 1 - (k - 1.5) / 3));

function grid(nu: number, nv: number, f: (u: number, v: number) => [number, number, number]) {
  const g = new THREE.PlaneGeometry(1, 1, nu, nv);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) { const q = f(uv.getX(i), uv.getY(i)); p.setXYZ(i, q[0], q[1], q[2]); }
  g.computeVertexNormals();
  return g;
}
function orientUp(g: THREE.BufferGeometry) {
  const n = g.attributes.normal; let s = 0;
  for (let i = 0; i < n.count; i++) s += n.getY(i);
  if (s < 0) { const ix = g.index!.array as Uint16Array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } g.computeVertexNormals(); }
  return g;
}
const angU = (u: number) => A0 + u * (A1 - A0);
const P = (r: number, a: number, y: number): [number, number, number] => [Math.cos(a) * r, y, Math.sin(a) * r];
const loc = (x: number, z: number, yaw: number, lx: number, ly: number, lz: number): [number, number, number] =>
  [x + lx * Math.cos(yaw) + lz * Math.sin(yaw), ly, z - lx * Math.sin(yaw) + lz * Math.cos(yaw)];

const VS = /* glsl */ `varying vec3 vW; varying vec3 vN; varying vec3 vCol; varying float vE;
attribute float aEdge;
void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vE = aEdge;
#ifdef USE_COLOR
vCol = color;
#else
vCol = vec3(1.0);
#endif
gl_Position = projectionMatrix * viewMatrix * w; }`;
const HEAD = /* glsl */ `uniform float uT; uniform float uRev; varying vec3 vW; varying vec3 vN; varying vec3 vCol; varying float vE;
const vec3 AQUA = vec3(0.48, 0.85, 0.82);
float pulse(){ float s = 9.0 * fract(uT / 9.0 - (vW.x + 22.0) / 44.0); return exp(-pow((vW.y - (-5.0 + 3.0 * s)) / 0.45, 2.0)) * step(s, 2.0); }
${K.GLSL_NOISE}`;

const build: CityBuilder = (ctx) => {
  const rng = ctx.rng;
  const root = new THREE.Group();
  const uT = { value: 0 }, uRev = { value: 0 };
  const shader = (frag: string, o: Partial<THREE.ShaderMaterialParameters> = {}, extra: Record<string, THREE.IUniform> = {}) =>
    new THREE.ShaderMaterial({ uniforms: { uT, uRev, ...extra }, vertexShader: VS, fragmentShader: HEAD + frag, ...o });
  const withEdge = (g: THREE.BufferGeometry, v = 0) => { g.setAttribute('aEdge', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count).fill(v), 1)); return g; };

  // ---------------------------------------------------------------- the rock (own material: turns smoky)
  const cCream = K.col('#e8dfc6'), cBuff = K.col('#b89a6c'), cDeep = K.col('#6d604f'), cSoil = K.col('#8a7550');
  const strata = (x: number, y: number, z: number, out: THREE.Color) => {
    const a = Math.atan2(z, x);
    const n = K.noise2(Math.cos(a) * 3 + y * 0.1, Math.sin(a) * 3 + Math.hypot(x, z) * 0.15);
    const band = 0.5 + 0.5 * Math.sin(y * 3.1 + n * 1.6), fine = 0.5 + 0.5 * Math.sin(y * 11 + n * 3);
    out.copy(cCream).lerp(cBuff, K.smoothstep(0.3, 0.7, band)).multiplyScalar(0.92 + 0.1 * fine);
    out.lerp(cDeep, K.clamp((-y - 3) / 15) * 0.8);
    if (y > -0.4) out.lerp(cSoil, 0.6);
  };
  const cliff = grid(220, 48, (u, v) => { const a = angU(u), y = BOTTOM * (1 - v); return P(rOut(y, a), a, y); });
  const faces: THREE.BufferGeometry[] = [];
  const faceInfo: { a: number; off: THREE.Vector3; inward: THREE.Vector3 }[] = [];
  for (const [a, sgn] of [[A0, 1], [A1, -1]] as const) {
    const pts: THREE.Vector2[] = [new THREE.Vector2(0, 0)];
    for (let i = 0; i <= 40; i++) { const y = (BOTTOM * i) / 40; pts.push(new THREE.Vector2(rOut(y, a), y)); }
    pts.push(new THREE.Vector2(0, FLOOR_Y), new THREE.Vector2(rc(a), FLOOR_Y));
    for (let i = 0; i <= 24; i++) { const r = rc(a) * (1 - i / 24); pts.push(new THREE.Vector2(r, ceilY(r, a))); }
    const g = new THREE.ShapeGeometry(new THREE.Shape(pts));
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const r = p.getX(i), y = p.getY(i); p.setXYZ(i, Math.cos(a) * r, y, Math.sin(a) * r); }
    g.computeVertexNormals();
    faces.push(g);
    const off = new THREE.Vector3(Math.sin(a), 0, -Math.cos(a)).multiplyScalar(sgn); // towards the wedge
    faceInfo.push({ a, off, inward: off.clone().negate() });
  }
  const rockGeo = K.paintBy(K.merge([cliff, ...faces]), strata);
  const rockMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.93, side: THREE.DoubleSide, transparent: true });
  const rock = new THREE.Mesh(rockGeo, rockMat);
  rock.castShadow = rock.receiveShadow = true;
  root.add(rock);
  // the lake in section, behind the cut faces like an aquarium pane
  const paneMat = new THREE.MeshStandardMaterial({ color: '#06121a', roughness: 0.12, metalness: 0.3, emissive: '#1d5f5a', emissiveIntensity: 0 });
  for (const f of faceInfo) {
    const w = rc(f.a);
    const pane = new THREE.Mesh(K.at(K.box(w, LAKE_Y - FLOOR_Y, 0.02), Math.cos(f.a) * w / 2 + f.off.x * 0.02, FLOOR_Y, Math.sin(f.a) * w / 2 + f.off.z * 0.02, { ry: -f.a }), paneMat);
    root.add(pane);
  }

  // ---------------------------------------------------------------- the cave: ceiling, stalactites, walls, lake
  const ceilParts: THREE.BufferGeometry[] = [K.paint(grid(160, 30, (u, v) => { const a = angU(u), r = v * rc(a); return P(r, a, ceilY(r, a)); }), '#cfc3a6')];
  for (let i = 0; i < 320; i++) {
    const a = angU(rng.float(0.02, 0.98)), r = rc(a) * Math.sqrt(rng.float(0.01, 0.9));
    const [x, , z] = P(r, a, 0);
    ceilParts.push(K.paint(K.at(K.cone(rng.float(0.05, 0.13), rng.float(0.2, 0.75), 6), x, ceilY(r, a) + 0.05, z, { rx: Math.PI }), K.jitter('#d8ccae', rng)));
  }
  ceilParts.push(K.paint(grid(160, 6, (u, v) => { const a = angU(u), r = rc(a); return P(r, a, LAKE_Y - 0.3 + v * (ceilY(r, a) - LAKE_Y + 0.35)); }), '#bfb294'));
  const caveMat = shader(/* glsl */ `void main(){
    vec3 base = vCol * 0.3;
    float c1 = 1.0 - abs(snoise(vec3(vW.xz * 0.55, uT * 0.35)));
    float c2 = 1.0 - abs(snoise(vec3(vW.xz * 1.1 + 3.0, uT * 0.5)));
    float caus = pow(c1, 10.0) + pow(c2, 10.0) * 0.6;
    float nearW = clamp(1.0 - (vW.y - ${LAKE_Y.toFixed(1)}) / 5.0, 0.0, 1.0);
    vec3 col = base + AQUA * caus * (0.16 + 0.3 * nearW);
    col *= 1.0 + uRev * 0.8;
    gl_FragColor = vec4(col, 1.0 - 0.45 * uRev);
    #include <colorspace_fragment>
  }`, { vertexColors: true, side: THREE.DoubleSide, transparent: true });
  const cave = new THREE.Mesh(withEdge(K.merge(ceilParts)), caveMat);
  cave.renderOrder = 1;
  root.add(cave);

  const drops: THREE.Vector4[] = [];
  const dropInfo: { x: number; z: number; y0: number; per: number; ph: number; fall: number }[] = [];
  for (let i = 0; i < 16; i++) {
    const a = WC + Math.PI + rng.float(-1.3, 1.3), r = rc(a) * Math.sqrt(rng.float(0.05, 0.75));
    const [x, , z] = P(r, a, 0), y0 = ceilY(r, a);
    const per = rng.float(2.2, 4.5), ph = rng.float(0, per);
    drops.push(new THREE.Vector4(x, z, per, ph));
    dropInfo.push({ x, z, y0, per, ph, fall: Math.sqrt((2 * (y0 - LAKE_Y)) / 9.8) });
  }
  const lakeGeo = grid(180, 40, (u, v) => { const a = angU(u); return P(v * rc(a), a, LAKE_Y); });
  const uvs = lakeGeo.attributes.uv;
  const edge = new Float32Array(uvs.count);
  for (let i = 0; i < uvs.count; i++) edge[i] = uvs.getY(i);
  lakeGeo.setAttribute('aEdge', new THREE.BufferAttribute(edge, 1));
  const lakeMat = shader(/* glsl */ `uniform vec4 uDrops[16]; void main(){
    float n = snoise(vec3(vW.xz * 0.7, uT * 0.25));
    float n2 = snoise(vec3(vW.xz * 2.3, uT * 0.5));
    vec3 col = vec3(0.022, 0.045, 0.06);
    float glint = pow(max(0.0, n2 * 0.5 + n * 0.5), 5.0);
    float xc = -22.0 + 44.0 * fract(uT / 9.0);
    float crest = exp(-pow((vW.x - xc) / 1.6, 2.0));
    float rip = 0.0;
    for (int i = 0; i < 16; i++) { vec4 d = uDrops[i]; float age = mod(uT + d.w, d.z); float r = length(vW.xz - d.xy);
      rip += exp(-pow((r - age * 0.9) / 0.07, 2.0)) * exp(-age * 1.1); }
    col += AQUA * (glint * 0.5 + crest * (0.14 + 0.1 * n) + rip * 0.8);
    col += AQUA * uRev * (0.1 + 0.16 * (0.5 + 0.5 * n) + 1.6 * pow(vE, 10.0));
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }`, {}, { uDrops: { value: drops } });
  root.add(new THREE.Mesh(lakeGeo, lakeMat));

  // ---------------------------------------------------------------- placement on the surface
  const occ = new Map<string, [number, number, number][]>();
  const free = (x: number, z: number, r: number) => {
    const i0 = Math.floor(x / 2), j0 = Math.floor(z / 2);
    for (let i = i0 - 2; i <= i0 + 2; i++) for (let j = j0 - 2; j <= j0 + 2; j++) {
      for (const q of occ.get(i + ',' + j) ?? []) if (Math.hypot(q[0] - x, q[1] - z) < r + q[2]) return false;
    }
    return true;
  };
  const put = (x: number, z: number, r: number) => { const k = Math.floor(x / 2) + ',' + Math.floor(z / 2); if (!occ.has(k)) occ.set(k, []); occ.get(k)!.push([x, z, r]); };
  const solidDist = (x: number, z: number) => { const d = Math.abs(wrap(Math.atan2(z, x) - WC)); return d <= HW ? -1 : Math.hypot(x, z) * Math.sin(Math.min(d - HW, Math.PI / 2)); };
  const inCity = (x: number, z: number, m: number) => Math.hypot(x, z) < L(Math.atan2(z, x)) - 0.7 - m && solidDist(x, z) > m + 0.1;
  const spot = (r: number, tries = 400): [number, number] | null => {
    for (let i = 0; i < tries; i++) {
      const x = rng.float(-19, 19), z = rng.float(-19, 19);
      if (inCity(x, z, r) && free(x, z, r)) { put(x, z, r); return [x, z]; }
    }
    return null;
  };

  const b = new K.Batch();
  const pipeParts: THREE.BufferGeometry[] = [];

  // the ground: irrigated green inside the shore line, bare limestone outside
  const gIn = K.col('#9ab56c'), gIn2 = K.col('#7fa257'), gEdge = K.col('#55793f'), gOut = K.col('#dacda9'), gOut2 = K.col('#c4b48c');
  const top = orientUp(grid(240, 70, (u, v) => { const a = angU(u); return P(v * rim(a), a, 0); }));
  K.paintBy(top, (x, _y, z, out) => {
    const a = Math.atan2(z, x), d = Math.hypot(x, z) - L(a), n = K.fbm2(x * 0.35, z * 0.35, 3);
    if (d < 0.25) out.copy(gIn).lerp(gIn2, K.clamp(0.5 + n)).lerp(gEdge, K.smoothstep(-1.4, 0, d));
    else out.copy(gOut).lerp(gOut2, K.clamp(0.5 + n * 1.2)).lerp(gEdge, 1 - K.smoothstep(0.25, 0.7, d));
  });
  b.add(top, null, 'matte');

  // the green border: hedges and small trees exactly along the buried shore
  for (let a = A0 + 0.01; a < A1 - 0.01; a += 0.42 / L(a)) {
    for (const [dr, k] of [[0, 0], [-0.5, 1]] as const) {
      const r = L(a) + dr + rng.float(-0.12, 0.12), [x, , z] = P(r, a, 0);
      if (solidDist(x, z) < 0.45) continue;
      const tall = k === 0 && rng.chance(0.3);
      K.tree(b, { x, z, kind: tall ? rng.pick(['round', 'cypress'] as const) : 'shrub', h: tall ? rng.float(1.2, 2) : rng.float(0.45, 0.75), color: K.jitter(tall ? '#3f7a3c' : '#4d8a45', rng), rng });
    }
  }
  for (let i = 0; i < 46; i++) {
    const a = angU(rng.float(0.02, 0.98)), r = rng.float(L(a) + 1.2, rim(a) - 0.8), [x, , z] = P(r, a, 0);
    if (solidDist(x, z) > 0.8) K.rock(b, { x, z, r: rng.float(0.15, 0.5), color: '#cbbd98', rng });
  }

  // central cistern with a column of water, and three aqueducts converging on it
  const C: [number, number] = [0.5, -6.5];
  put(C[0], C[1], 2.1);
  b.add(K.at(K.cyl(1.6, 1.7, 0.7, 40), C[0], 0, C[1]), '#e4dac2', 'stone');
  b.add(K.at(K.torus(1.6, 0.08, 6, 48), C[0], 0.7, C[1], { rx: Math.PI / 2 }), '#d6caae', 'stone');
  b.add(K.at(K.disc(1.55, 40), C[0], 0.62, C[1]), '#2d5a6b', 'polished');
  pipeParts.push(K.at(K.cyl(0.16, 0.2, 4.2, 12), C[0], 0.6, C[1]));
  b.add(K.at(K.cyl(0.45, 0.35, 0.35, 16), C[0], 4.8, C[1]), '#9a6640', 'bronze');
  for (const [ak, h] of [[Math.PI + 0.2, 1.6], [-Math.PI / 2 - 0.95, 1.9], [-0.15, 1.4]] as const) {
    const rr = L(ak) - 1.0, sx = Math.cos(ak) * rr, sz = Math.sin(ak) * rr;
    const dx = C[0] - sx, dz = C[1] - sz, len = Math.hypot(dx, dz) - 2.0;
    const n = Math.floor(len / 0.9), ux = dx / Math.hypot(dx, dz), uz = dz / Math.hypot(dx, dz);
    const mx = sx + ux * (n * 0.9) / 2, mz = sz + uz * (n * 0.9) / 2, ry = -Math.atan2(uz, ux);
    K.arcade(b, { x: mx, z: mz, ry, n, span: 0.9, h, d: 0.32, color: '#e9e0c9' });
    b.add(K.at(K.box(n * 0.9, 0.16, 0.42), mx, h, mz, { ry }), '#ddd2b6', 'stone');
    b.add(K.at(K.box(n * 0.9, 0.02, 0.22), mx, h + 0.16, mz, { ry }), '#3f7c8a', 'polished');
    for (let k = 0; k <= n; k++) put(sx + ux * k * 0.9, sz + uz * k * 0.9, 0.55);
  }

  // airy scaffold towers crowned by weathercocks (the tallest near the centre)
  const cocks: [number, number, number][] = [];
  const scaff: [number, number, number][] = [[3.3, -8.8, 10]];
  put(3.3, -8.8, 1.1);
  for (let i = 0; i < 4; i++) { const s = spot(0.8); if (s) scaff.push([s[0], s[1], rng.float(6, 8.5)]); }
  for (const [x, z, H] of scaff) {
    const yaw = rng.angle(), c0 = 0.55, c1 = 0.3, lv = Math.round(H);
    const corner = (k: number, y: number) => { const c = c0 + (c1 - c0) * (y / H); const sx = k & 1 ? c : -c, sz = k & 2 ? c : -c; return loc(x, z, yaw, sx, y, sz); };
    const ord = [0, 1, 3, 2];
    for (let k = 0; k < 4; k++) K.timber(b, corner(k, 0), corner(k, H), 0.045, '#8b6a48');
    for (let l = 1; l <= lv; l++) {
      const y0 = (H * (l - 1)) / lv, y1 = (H * l) / lv;
      for (let k = 0; k < 4; k++) {
        const a = ord[k], c = ord[(k + 1) % 4];
        K.timber(b, corner(a, y1), corner(c, y1), 0.022, '#9a7a56');
        K.timber(b, corner(l % 2 ? a : c, y0), corner(l % 2 ? c : a, y1), 0.016, '#9a7a56');
      }
    }
    b.add(K.at(K.box(0.75, 0.06, 0.75), x, H, z, { ry: yaw }), '#7d5c3c', 'wood');
    b.add(K.at(K.cyl(0.22, 0.22, 0.4, 12), x, H + 0.06, z), '#9a6640', 'bronze');
    b.add(K.at(K.cyl(0.025, 0.025, 1.1, 6), x, H + 0.46, z), '#6e6a63', 'metal');
    pipeParts.push(K.at(K.cyl(0.05, 0.05, H, 8), ...corner(1, 0)));
    cocks.push([x, H + 1.5, z]);
  }

  // norias with capstans, drilling trestles, windpumps
  const norias: { x: number; z: number; yaw: number; R: number }[] = [];
  for (let i = 0; i < 8; i++) { const s = spot(1.5); if (s) norias.push({ x: s[0], z: s[1], yaw: rng.angle(), R: rng.float(0.9, 1.3) }); }
  for (const n of norias) {
    const hy = n.R * 0.85;
    b.add(K.at(K.box(2 * n.R + 0.4, 0.03, 0.55), n.x, 0.005, n.z, { ry: n.yaw }), '#2c4f58', 'polished');
    for (const sz of [-0.3, 0.3]) for (const sx of [-0.75, 0.75]) K.timber(b, loc(n.x, n.z, n.yaw, sx, 0, sz), loc(n.x, n.z, n.yaw, 0, hy, sz), 0.05, '#7a5a3a');
    K.timber(b, loc(n.x, n.z, n.yaw, 0, 0, 1.5), loc(n.x, n.z, n.yaw, 0, 0.75, 1.5), 0.08, '#6f5034');
    K.timber(b, loc(n.x, n.z, n.yaw, 0, 0.6, 1.5), loc(n.x, n.z, n.yaw, 0, hy, 0.3), 0.04, '#6f5034');
    b.add(K.at(K.box(0.4, 0.25, 0.6), ...loc(n.x, n.z, n.yaw, n.R + 0.4, 0, 0), { ry: n.yaw }), '#ddd2b6', 'stone');
  }
  const trestles: { x: number; z: number; H: number }[] = [];
  for (let i = 0; i < 5; i++) { const s = spot(1.15); if (s) trestles.push({ x: s[0], z: s[1], H: rng.float(3, 5) }); }
  for (const t of trestles) {
    const yaw = rng.angle(), apex = loc(t.x, t.z, yaw, 0, t.H, 0);
    const feet = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => loc(t.x, t.z, yaw, sx, 0, sz));
    for (const f of feet) K.timber(b, f, apex, 0.05, '#7d5a38');
    for (const k of [0.3, 0.6]) for (let i = 0; i < 4; i++) {
      const p = (f: number[]) => [f[0] + (apex[0] - f[0]) * k, apex[1] * k, f[2] + (apex[2] - f[2]) * k] as [number, number, number];
      K.timber(b, p(feet[i]), p(feet[(i + 1) % 4]), 0.03, '#8b6a48');
    }
    b.add(K.at(K.torus(0.25, 0.04, 6, 16), apex[0], apex[1] - 0.25, apex[2], { ry: yaw }), '#6e6a63', 'metal');
    b.add(K.at(K.ring(0.15, 0.45, 20), t.x, 0.01, t.z), '#8a7550', 'matte');
  }
  const WIND = 0.7;
  const pumps: { x: number; z: number; H: number; R: number; yaw: number }[] = [];
  for (let i = 0; i < 14; i++) { const s = spot(0.6); if (s) pumps.push({ x: s[0], z: s[1], H: rng.float(2.5, 4), R: rng.float(0.6, 0.9), yaw: WIND + rng.float(-0.12, 0.12) }); }
  for (const w of pumps) {
    const leg = (k: number, y: number) => { const c = 0.42 + (0.12 - 0.42) * (y / w.H); return loc(w.x, w.z, w.yaw, k & 1 ? c : -c, y, k & 2 ? c : -c); };
    const ord = [0, 1, 3, 2];
    for (let k = 0; k < 4; k++) K.timber(b, leg(k, 0), leg(k, w.H), 0.025, '#6f7b80', 'metal');
    for (let l = 1; l <= 4; l++) for (let k = 0; k < 4; k++) {
      const y0 = (w.H * (l - 1)) / 4, y1 = (w.H * l) / 4, a = ord[k], c = ord[(k + 1) % 4];
      K.timber(b, leg(a, y1), leg(c, y1), 0.012, '#7c878b', 'metal');
      K.timber(b, leg(a, y0), leg(c, y1), 0.01, '#7c878b', 'metal');
    }
    b.add(K.at(K.box(0.03, 0.36, 0.75), ...loc(w.x, w.z, w.yaw, 0, w.H + 0.05, -0.6), { ry: w.yaw }), '#d9d2c2', 'metal');
    b.add(K.at(K.box(0.6, 0.18, 0.3), w.x, 0, w.z, { ry: w.yaw }), '#9a6640', 'wood');
    pipeParts.push(K.at(K.cyl(0.03, 0.03, w.H, 6), w.x, 0, w.z));
  }

  // whitewashed flat-roofed houses, some with reservoirs on stilts
  const houses: { x: number; z: number; w: number; d: number; h: number; ry: number }[] = [];
  for (let i = 0; i < 85; i++) {
    const w = rng.float(0.7, 1.15), d = rng.float(0.7, 1.15), s = spot(Math.max(w, d) * 0.5, 300);
    if (s) houses.push({ x: s[0], z: s[1], w, d, h: rng.float(0.5, 1.3), ry: rng.angle() });
  }
  for (const h of houses) K.house(b, { ...h, roof: 'flat', wall: rng.pick(['#f1ebdc', '#ece3cf', '#f6f2e8', '#e6dbc3']), roofColor: '#ddd3bd', windows: true, lit: 0, rng });
  for (const h of houses.slice(0, 36)) {
    const lh = rng.float(0.8, 1.2), y0 = h.h + 0.08;
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) K.timber(b, [h.x + sx * 0.22, y0, h.z + sz * 0.22], [h.x + sx * 0.2, y0 + lh, h.z + sz * 0.2], 0.025, '#6d4e33');
    b.add(K.at(K.cyl(0.35, 0.35, 0.5, 16), h.x, y0 + lh, h.z), K.jitter('#8a5a35', rng), 'wood');
    for (const yy of [0.1, 0.38]) b.add(K.at(K.torus(0.355, 0.018, 4, 20), h.x, y0 + lh + yy, h.z, { rx: Math.PI / 2 }), '#7a5a2e', 'bronze');
    b.add(K.at(K.cone(0.4, 0.22, 16), h.x, y0 + lh + 0.5, h.z), '#9a6640', 'wood');
    pipeParts.push(K.at(K.cyl(0.03, 0.03, y0 + lh, 6), h.x + 0.24, 0, h.z));
  }

  // the thousand wells: some along the cut faces (their shafts show in section)
  type Well = { x: number; z: number; kind: 0 | 1 | 2; yaw: number };
  const wells: Well[] = [];
  const faceShafts: THREE.BufferGeometry[] = [];
  for (const f of faceInfo) {
    for (let r = 1.4; r < L(f.a) - 0.9; r += rng.float(0.45, 0.7)) {
      const x = Math.cos(f.a) * r + f.inward.x * 0.3, z = Math.sin(f.a) * r + f.inward.z * 0.3;
      if (!free(x, z, 0.16)) continue;
      put(x, z, 0.16); wells.push({ x, z, kind: 0, yaw: rng.angle() });
      const cy = ceilY(r, f.a);
      faceShafts.push(K.at(K.box(0.06, -cy, 0.01), Math.cos(f.a) * r + f.off.x * 0.03, cy, Math.sin(f.a) * r + f.off.z * 0.03, { ry: -f.a }));
    }
  }
  for (const [kind, rad, n] of [[1, 0.34, 120], [2, 0.26, 60], [0, 0.135, 2000]] as const) {
    let made = 0;
    for (let i = 0; i < 200000 && made < n && wells.length < 1000; i++) {
      const x = rng.float(-20, 20), z = rng.float(-20, 20);
      if (inCity(x, z, rad) && free(x, z, rad)) { put(x, z, rad); wells.push({ x, z, kind, yaw: rng.angle() }); made++; }
    }
  }
  const curbGeo = K.merge([K.paint(K.cyl(0.14, 0.15, 0.15, 10), '#ffffff'), K.paint(K.at(K.disc(0.11, 10), 0, 0.152, 0), '#151d20')]);
  root.add(K.instanced(curbGeo, K.finish('stone'), wells.length, (i, o, c) => {
    o.position.set(wells[i].x, 0, wells[i].z); o.scale.setScalar(rng.float(0.78, 0.95)); c.copy(K.jitter('#e2d8c0', rng, 0.01, 0.04, 0.08));
  }));
  const windl = wells.filter((w) => w.kind === 1), pumpW = wells.filter((w) => w.kind === 2);
  for (const w of windl) {
    for (const s of [-0.22, 0.22]) b.add(K.at(K.box(0.04, 0.6, 0.04), ...loc(w.x, w.z, w.yaw, s, 0, 0), { ry: w.yaw }), '#7a5a3a', 'wood');
    b.add(K.at(K.cyl(0.03, 0.03, 0.5, 6), w.x, 0.58, w.z, { rz: Math.PI / 2, ry: w.yaw }), '#6a4c30', 'wood');
  }
  for (const w of pumpW) {
    b.add(K.at(K.box(0.09, 0.48, 0.09), w.x, 0, w.z, { ry: w.yaw }), '#4f5a5e', 'metal');
    b.add(K.at(K.box(0.18, 0.04, 0.04), ...loc(w.x, w.z, w.yaw, -0.1, 0.32, 0), { ry: w.yaw }), '#4f5a5e', 'metal');
  }

  root.add(b.build({ name: 'isaura' }));
  const pipeMat = shader(/* glsl */ `void main(){
    float l = 0.5 + 0.5 * max(dot(normalize(vN), normalize(vec3(0.35, 0.9, 0.55))), 0.0);
    float py = fract(uT * 0.3 + vW.x * 0.13 + vW.z * 0.07) * 12.0;
    float p = exp(-pow((vW.y - py) / 0.35, 2.0));
    gl_FragColor = vec4(vec3(0.62, 0.38, 0.22) * l + AQUA * p * 2.6, 1.0);
    #include <colorspace_fragment>
  }`);
  root.add(new THREE.Mesh(withEdge(K.merge(pipeParts)), pipeMat));

  // shafts: threads in the cut faces (always visible) and inside the rock (seen when it turns smoky)
  root.add(new THREE.Mesh(withEdge(K.merge(faceShafts)), shader(`void main(){ float p = pulse();
    gl_FragColor = vec4(mix(vec3(0.2, 0.17, 0.13), AQUA * 0.7, uRev) + AQUA * p * 3.0, 1.0);
    #include <colorspace_fragment>
  }`)));
  const lp = new Float32Array(wells.length * 6);
  wells.forEach((w, i) => { const a = Math.atan2(w.z, w.x); lp.set([w.x, -0.05, w.z, w.x, ceilY(Math.hypot(w.x, w.z), a), w.z], i * 6); });
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.BufferAttribute(lp, 3));
  lg.setAttribute('aEdge', new THREE.BufferAttribute(new Float32Array(wells.length * 2), 1));
  const shaftLines = new THREE.LineSegments(lg, shader(`void main(){ float p = pulse();
    gl_FragColor = vec4(AQUA * (0.5 + 2.5 * p), uRev * 0.14 + p * uRev * 0.6);
    #include <colorspace_fragment>
  }`, { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  shaftLines.renderOrder = 2;
  root.add(shaftLines);
  // shaft mouths studding the cave ceiling, and thin streams seeping down the walls
  root.add(K.glowPoints(wells.filter((_, i) => i % 6 === 0).map((w) => [w.x, ceilY(Math.hypot(w.x, w.z), Math.atan2(w.z, w.x)) - 0.04, w.z] as [number, number, number]), '#bff3ee', 0.35, 0.65));
  const sb = new K.Batch();
  for (const da of [-0.9, -0.35, 0.3, 0.85]) {
    const a = -Math.PI / 2 + da, r = rc(a) - 0.06;
    const pts: [number, number, number][] = [];
    for (let k = 0; k <= 8; k++) { const y = ceilY(r, a) + 0.1 - (k / 8) * (ceilY(r, a) - LAKE_Y + 0.1); const aa = a + Math.sin(k * 1.7 + da * 5) * 0.004; pts.push(P(r - 0.05 * Math.sin(k), aa, y)); }
    sb.add(K.tube(pts, 0.035, 24, 4), '#8ff0e4', 'glow', 2.2);
  }
  root.add(sb.build());

  // ---------------------------------------------------------------- moving machinery (instanced)
  const sMat = K.finish('metal'), wMat = K.finish('wood');
  const buckets = K.instanced(K.paint(K.cyl(0.075, 0.055, 0.12, 8), '#ffffff'), sMat, windl.length, (_i, _o, c) => { c.set('#8a6a44'); });
  const ropes = K.instanced(K.paint(K.box(0.012, 1, 0.012), '#ffffff'), wMat, windl.length, (_i, _o, c) => { c.set('#c8b48a'); }, { castShadow: false });
  const handles = K.instanced(K.paint(K.at(K.boxC(0.34, 0.03, 0.03), 0.15, 0, 0), '#ffffff'), sMat, pumpW.length, (_i, _o, c) => { c.set('#3e474b'); });
  const wheelGeo: THREE.BufferGeometry[] = [];
  for (const z of [-0.1, 0.1]) wheelGeo.push(K.at(K.torus(1, 0.035, 5, 40), 0, 0, z));
  for (let k = 0; k < 4; k++) wheelGeo.push(K.at(K.boxC(2, 0.04, 0.04), 0, 0, 0, { rz: (k * Math.PI) / 4 }));
  wheelGeo.push(K.at(K.cyl(0.06, 0.06, 0.5, 8), 0, -0.25, 0, { rx: Math.PI / 2 }));
  const potGeo: THREE.BufferGeometry[] = [];
  for (let k = 0; k < 18; k++) { const a = (k / 18) * TAU; potGeo.push(K.at(K.cyl(0.07, 0.05, 0.16, 7), Math.cos(a), Math.sin(a), 0, { rz: a })); }
  const wheels = K.instanced(K.paint(K.merge(wheelGeo), '#ffffff'), wMat, norias.length, (_i, _o, c) => { c.set('#7a5636'); });
  const pots = K.instanced(K.paint(K.merge(potGeo), '#ffffff'), K.finish('ceramic'), norias.length, (_i, _o, c) => { c.set('#b5653f'); });
  const arms = K.instanced(K.paint(K.boxC(2.2, 0.05, 0.05), '#ffffff'), wMat, norias.length, (_i, _o, c) => { c.set('#6f5034'); });
  const bladeG: THREE.BufferGeometry[] = [K.at(K.cyl(0.08, 0.08, 0.12, 8), 0, 0, -0.06, { rx: Math.PI / 2 })];
  for (let k = 0; k < 18; k++) bladeG.push(K.at(K.boxC(0.1, 0.62, 0.012), 0, 0, 0, { ry: 0.35 }).translate(0, 0.62, 0).rotateZ((k / 18) * TAU));
  const rotors = K.instanced(K.paint(K.merge(bladeG), '#ffffff'), sMat, pumps.length, (_i, _o, c) => { c.set('#e6e0d2'); });
  const augerPts: [number, number, number][] = [];
  for (let k = 0; k <= 72; k++) augerPts.push([Math.cos(k * 0.5) * 0.15, k / 72, Math.sin(k * 0.5) * 0.15]);
  const augers = K.instanced(K.paint(K.merge([K.tube(augerPts, 0.03, 120, 4), K.cyl(0.04, 0.04, 1, 6)]), '#ffffff'), sMat, trestles.length, (_i, _o, c) => { c.set('#8f9497'); });
  const cockG = [K.boxC(0.9, 0.03, 0.03), K.at(K.cone(0.07, 0.2, 6), 0.5, 0, 0, { rz: -Math.PI / 2 }), K.at(K.boxC(0.05, 0.2, 0.22), -0.45, 0, 0, { ry: Math.PI / 2 }),
    K.at(K.sphere(0.12, 8, 6), 0, 0.2, 0, { s: [1.3, 1, 0.6] }), K.at(K.sphere(0.06, 8, 6), 0.14, 0.33, 0), K.at(K.boxC(0.16, 0.2, 0.03), -0.14, 0.3, 0, { rz: 0.5 })];
  const weather = K.instanced(K.paint(K.merge(cockG), '#ffffff'), K.finish('gold'), cocks.length, (_i, _o, c) => { c.set('#e3b450'); });
  const dropMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#bff6ee').multiplyScalar(2.2) });
  const dropMesh = K.instanced(K.sphere(0.05, 6, 4), dropMat, dropInfo.length, undefined, { castShadow: false, receiveShadow: false, colors: false });
  for (const m of [buckets, ropes, handles, wheels, pots, arms, rotors, augers, weather, dropMesh]) root.add(m);
  const set = [buckets, ropes, handles, wheels, pots, arms, rotors, augers, weather, dropMesh].map((m) => K.instanceSetter(m));

  // spray of droplets lifting from each wellhead as the pulse arrives
  const sp = new Float32Array(wells.length * 3), seed = new Float32Array(wells.length);
  wells.forEach((w, i) => { sp.set([w.x, 0.18, w.z], i * 3); seed[i] = rng.next(); });
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  sg.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  root.add(new THREE.Points(sg, new THREE.ShaderMaterial({
    uniforms: { uT }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float uT; attribute float aSeed; varying float vA;
      void main(){ vec3 p = position; float k = (9.0 * fract(uT / 9.0 - (p.x + 22.0) / 44.0) - ${ARRIVE.toFixed(3)}) / 1.4;
        float on = step(0.0, k) * step(k, 1.0); p.y += k * (0.6 + 0.6 * aSeed) * on; vA = on * (1.0 - k);
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = on * (0.22 + 0.14 * aSeed) * projectionMatrix[1][1] * 400.0 / -mv.z;
        gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vec3(0.75, 1.0, 0.97) * 1.6, smoothstep(0.5, 0.1, d) * vA);
      #include <colorspace_fragment>
    }`,
  })));

  // people at the wellheads and capstans, birds, droplets rising into the sky
  const workW = [...windl, ...pumpW];
  root.add(K.crowd({ count: 130, rng: rng.fork('people'), colors: ['#f1ece0', '#9a6640', '#3f5a6e', '#c9a35a', '#6d3d2e', '#e2d6b8'], place: (i, r) => {
    if (i < norias.length) return loc(norias[i].x, norias[i].z, norias[i].yaw, 1.0, 0, 1.5);
    const w = r.pick(workW), a = r.angle(); return [w.x + Math.cos(a) * 0.32, 0, w.z + Math.sin(a) * 0.32];
  } }));
  const flock = new K.Flock({ count: 14, center: [0, 11, -4], radius: 12, color: '#3a3530', rng: rng.fork('birds') });
  root.add(flock.mesh);
  root.add(K.particles({ count: 320, center: [0, 0, -6], radius: 10, disc: true, y0: 0.3, y1: 13, velocity: [0, 0.7, 0], color: '#cff7f1', size: 0.05, opacity: 0.45, swirl: 0.3, twinkle: 0.6, rng: rng.fork('mist') }));

  const tog = new K.Toggle(0.4);
  const rev = (t: number) => { uT.value = t; };
  return {
    root,
    env: {
      skyTop: '#4b7fae', skyHorizon: '#dfe2d6', skyBottom: '#cfc9b2', skyCurve: 0.5,
      fog: '#ccd6d8', fogNear: 85, fogFar: 260,
      sunDir: [0.35, 0.9, 0.55], sunColor: '#fff4e2', sunIntensity: 3.0, sunDisc: 0, sunGlow: 0.6,
      hemiSky: '#bcd2e6', hemiGround: '#a89c80', hemiIntensity: 0.75, envIntensity: 0.8,
      clouds: 0.3, cloudColor: '#ffffff', bloomStrength: 0.6, bloomThreshold: 0.85, bloomRadius: 0.5,
      tiltShift: 0.3, shadowRadius: 25, vignette: 0.3, saturation: 1.05,
    },
    camera: {
      position: [0, 13, 43], target: [0, -2.6, 0], fov: 35, minDistance: 12, maxDistance: 90, maxPolar: 1.7, autoRotate: 0,
      views: [
        { position: [27, 30, 34], target: [0, -1, -2] },
        { position: [9, 1.2, 29], target: [-1, -5.5, -3] },
      ],
    },
    interaction: {
      label: 'Gods below', activeLabel: 'Gods above',
      hint: 'The rock thins to smoke and the black lake shines through its thousand threads.',
      set: (on) => tog.set(on),
      camera: { position: [0, -2, 40], target: [0, -4.5, 0] },
    },
    update(t, dt) {
      rev(t);
      tog.update(dt);
      const r = tog.value;
      uRev.value = r;
      rockMat.opacity = 1 - 0.68 * r;
      rockMat.depthWrite = r < 0.3;
      paneMat.emissiveIntensity = r * 0.35;
      windl.forEach((w, i) => {
        const y = 0.05 + 0.38 * lift(since(w.x, t) - ARRIVE);
        set[0](i, w.x, y, w.z, w.yaw);
        set[1](i, w.x, y + 0.12, w.z, 0, [1, Math.max(0.01, 0.58 - y - 0.12), 1]);
      });
      pumpW.forEach((w, i) => set[2](i, ...loc(w.x, w.z, w.yaw, 0, 0.5, 0), w.yaw, 1, 0, -0.35 + 0.65 * lift(since(w.x, t) - ARRIVE)));
      norias.forEach((n, i) => {
        const spin = t * 0.35 + i;
        set[3](i, n.x, n.R * 0.85, n.z, n.yaw, n.R, 0, spin);
        set[4](i, n.x, n.R * 0.85, n.z, n.yaw, n.R, 0, spin);
        set[5](i, ...loc(n.x, n.z, n.yaw, 0, 0.62, 1.5), t * 0.35 + i);
      });
      pumps.forEach((w, i) => set[6](i, ...loc(w.x, w.z, w.yaw, 0, w.H + 0.12, 0.2), w.yaw, w.R, 0, t * (2.2 + 0.6 * Math.sin(i)) + 1.5 * Math.sin(t * 0.4 + i)));
      trestles.forEach((tr, i) => set[7](i, tr.x, -0.3, tr.z, -t * 1.6 + i, [1, tr.H * 0.75, 1]));
      cocks.forEach((c, i) => set[8](i, c[0], c[1], c[2], WIND + Math.PI / 2 + 0.5 * Math.sin(t * 0.3 + i * 1.3) + 0.15 * Math.sin(t * 1.7 + i)));
      dropInfo.forEach((d, i) => {
        const tt = K.fract((t + d.ph) / d.per) * d.per, f0 = d.per - d.fall;
        const y = tt < f0 ? d.y0 - 0.04 : d.y0 - 4.9 * (tt - f0) ** 2;
        set[9](i, d.x, Math.max(LAKE_Y, y), d.z, 0, tt < f0 ? 0.6 + 0.4 * (tt / f0) : 1);
      });
      set.forEach((s) => s.done());
      flock.update(t);
    },
  };
};

export default build;
