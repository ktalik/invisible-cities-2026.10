// ZENOBIA - Thin Cities 2.
// Built on dry ground, Zenobia stands on very tall pilings: bamboo and zinc houses on
// platforms and balconies at every height, linked by ladders and hanging sidewalks,
// crowned by cone-roofed belvederes, water barrels and weather vanes, bristling with
// pulleys, fishing poles and cranes. Nobody remembers why. Fishing lines hang into the
// dust, and an older plan, bleached and illegible, lies under the city.
// Toggle: the happy life an inhabitant imagines is the same kit of parts recombined:
// every module glides to a second arrangement spiralling higher, and only cloth is added.
//
// Technique: every module (deck, stilt, house, ladder ...) has an index; a float texture
// holds one matrix per module and the vertex shader places each vertex with it, so the
// whole city is a handful of draw calls and can rearrange itself on the GPU.

import * as THREE from 'three';
import * as K from '../kit';
import type { CityBuilder } from '../core/types';

type V3 = THREE.Vector3;
type Fin = 'pole' | 'wood' | 'zinc' | 'shine' | 'cloth';
const FINS: Fin[] = ['pole', 'wood', 'zinc', 'shine', 'cloth'];
const UP = new THREE.Vector3(0, 1, 0);
const WIND = new THREE.Vector3(1, 0, 0.35).normalize();
const WIND_YAW = Math.atan2(WIND.z, -WIND.x); // local +x of a vane points into the wind
const TOTAL = 4.6; // seconds of the dream transformation

// ---------------------------------------------------------------- palette
const PAL = {
  oldPole: '#8c877b',
  newPole: '#d9c07c',
  dust: '#b48a5b',
  oldPlank: '#8e877b',
  newPlank: '#d0b477',
  zinc: ['#a9b1b5', '#9aa3a8', '#bcc1c0', '#8c959a', '#b2b6b1'],
  shine: ['#d6dde0', '#c9d1d5', '#e2e6e4'],
  rust: ['#9b5e3c', '#a96c42', '#81523a'],
  slat: ['#c9ad70', '#bfa064', '#d3b87c', '#c2a873'],
  slatOld: ['#968c79', '#8b816e', '#a0927a'],
  door: ['#3b3029', '#4a3a2e', '#a8432e', '#3f6684', '#6b7a4c', '#c2862f'],
  rope: '#5f4e3b',
  iron: '#4b4643',
  barrel: '#7b5636',
  rag: ['#4d6a8c', '#b35a3f', '#cf9c45', '#ebe2cc', '#7d8c5e', '#a8a29a', '#d2452d'],
  cloth: ['#e0452b', '#f2a93b', '#2fb3a8', '#f6f1e4'],
  people: ['#d2452d', '#e8dcc0', '#3e5f80', '#7a5c3a', '#c99a3e', '#5d6b4a', '#2f2a26', '#efe7d6', '#8a4a3a'],
};

// ---------------------------------------------------------------- geometry accumulator
interface Proto { pos: Float32Array; nrm: Float32Array; n: number }
function proto(g: THREE.BufferGeometry): Proto {
  const ng = g.index ? g.toNonIndexed() : g;
  if (!ng.attributes.normal) ng.computeVertexNormals();
  return { pos: ng.attributes.position.array as Float32Array, nrm: ng.attributes.normal.array as Float32Array, n: ng.attributes.position.count };
}

type ColFn = (x: number, y: number, z: number, out: THREE.Color) => void;
type FluFn = (x: number, y: number, z: number) => number;
const _nm = new THREE.Matrix3();
const _cc = new THREE.Color();

class Acc {
  n = 0;
  cap = 16384;
  pos = new Float32Array(this.cap * 3);
  nrm = new Float32Array(this.cap * 3);
  col = new Float32Array(this.cap * 3);
  mod = new Float32Array(this.cap);
  flu = new Float32Array(this.cap);
  private grow(k: number) {
    if (this.n + k <= this.cap) return;
    let c = this.cap;
    while (this.n + k > c) c *= 2;
    const g = (a: Float32Array, s: number) => {
      const b = new Float32Array(c * s);
      b.set(a);
      return b;
    };
    this.pos = g(this.pos, 3);
    this.nrm = g(this.nrm, 3);
    this.col = g(this.col, 3);
    this.mod = g(this.mod, 1);
    this.flu = g(this.flu, 1);
    this.cap = c;
  }
  add(p: Proto, m: THREE.Matrix4, c: THREE.Color, mod: number, cf?: ColFn, fl?: FluFn) {
    this.grow(p.n);
    const e = m.elements;
    _nm.getNormalMatrix(m);
    const q = _nm.elements;
    const P = this.pos, N = this.nrm, C = this.col, M = this.mod, F = this.flu;
    const pp = p.pos, pn = p.nrm;
    let o = this.n;
    for (let i = 0; i < p.n; i++, o++) {
      const i3 = i * 3, o3 = o * 3;
      const x = pp[i3], y = pp[i3 + 1], z = pp[i3 + 2];
      P[o3] = e[0] * x + e[4] * y + e[8] * z + e[12];
      P[o3 + 1] = e[1] * x + e[5] * y + e[9] * z + e[13];
      P[o3 + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
      const a = pn[i3], b = pn[i3 + 1], d = pn[i3 + 2];
      const nx = q[0] * a + q[3] * b + q[6] * d, ny = q[1] * a + q[4] * b + q[7] * d, nz = q[2] * a + q[5] * b + q[8] * d;
      const l = Math.hypot(nx, ny, nz) || 1;
      N[o3] = nx / l;
      N[o3 + 1] = ny / l;
      N[o3 + 2] = nz / l;
      if (cf) {
        _cc.copy(c);
        cf(x, y, z, _cc);
        C[o3] = _cc.r;
        C[o3 + 1] = _cc.g;
        C[o3 + 2] = _cc.b;
      } else {
        C[o3] = c.r;
        C[o3 + 1] = c.g;
        C[o3 + 2] = c.b;
      }
      M[o] = mod;
      F[o] = fl ? fl(x, y, z) : 0;
    }
    this.n = o;
  }
  geometry(flutter: boolean): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos.slice(0, this.n * 3), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(this.nrm.slice(0, this.n * 3), 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.col.slice(0, this.n * 3), 3));
    g.setAttribute('aMod', new THREE.BufferAttribute(this.mod.slice(0, this.n), 1));
    if (flutter) g.setAttribute('aFlu', new THREE.BufferAttribute(this.flu.slice(0, this.n), 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 10, 0), 80);
    return g;
  }
}

// prototypes (unit sized, transformed per use)
const PB = proto(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0));
const PBC = proto(new THREE.BoxGeometry(1, 1, 1));
const PPL = proto(new THREE.PlaneGeometry(1, 1));
const PSPH = proto(new THREE.SphereGeometry(1, 10, 7));
const _cyl = new Map<string, Proto>();
function PCYL(seg: number, open = false, rTop = 1): Proto {
  const k = seg + ':' + open + ':' + rTop;
  let p = _cyl.get(k);
  if (!p) {
    p = proto(new THREE.CylinderGeometry(rTop, 1, 1, seg, 1, open).translate(0, 0.5, 0));
    _cyl.set(k, p);
  }
  return p;
}
function PCONE(seg: number): Proto {
  const k = 'cone' + seg;
  let p = _cyl.get(k);
  if (!p) {
    p = proto(new THREE.ConeGeometry(1, 1, seg, 1, false).translate(0, 0.5, 0));
    _cyl.set(k, p);
  }
  return p;
}
// a wedge filling the gable of a shed roof: base 1 x 1, high (y = 1) along z = -0.5
const PWEDGE = (() => {
  const v = [
    [-0.5, 0, 0.5], [0.5, 0, 0.5], [0.5, 0, -0.5], [-0.5, 0, -0.5], [-0.5, 1, -0.5], [0.5, 1, -0.5],
  ];
  const f = [
    [0, 1, 5], [0, 5, 4], // sloped top
    [3, 4, 5], [3, 5, 2], // back
    [0, 4, 3], // left
    [1, 2, 5], // right
    [0, 3, 2], [0, 2, 1], // bottom
  ];
  const pos: number[] = [];
  for (const t of f) for (const i of t) pos.push(...v[i]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return proto(g);
})();
// a bulging barrel (lathe)
const PBARREL = proto(K.lathe([[0.001, 0], [0.86, 0], [0.92, 0.12], [1, 0.5], [0.92, 0.88], [0.86, 1], [0.001, 1]], 12));
// bucket: tapered open cup
const PBUCKET = proto(new THREE.CylinderGeometry(1, 0.78, 1, 10, 1, false).translate(0, 0.5, 0));

// ---------------------------------------------------------------- matrices
const _m4 = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _eu = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _x = new THREE.Vector3();
const _y = new THREE.Vector3();
const _z = new THREE.Vector3();
const AX = new THREE.Vector3(1, 0, 0);
const AZ = new THREE.Vector3(0, 0, 1);

function mtx(x: number, y: number, z: number, sx: number, sy: number, sz: number, ry = 0, rx = 0, rz = 0): THREE.Matrix4 {
  _eu.set(rx, ry, rz, 'YXZ');
  _q.setFromEuler(_eu);
  return _m4.compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
}
/** Columns x*rx, y*L, z*rz from a to b (a unit-Y prototype stretched along a segment). */
function segMtx(out: THREE.Matrix4, a: V3, b: V3, r: number, hint: V3 = AZ): THREE.Matrix4 {
  _y.subVectors(b, a);
  const L = _y.length() || 1e-4;
  _y.divideScalar(L);
  _x.crossVectors(_y, hint);
  if (_x.lengthSq() < 1e-6) _x.crossVectors(_y, Math.abs(_y.x) < 0.9 ? AX : AZ);
  _x.normalize();
  _z.crossVectors(_x, _y);
  return out.set(_x.x * r, _y.x * L, _z.x * r, a.x, _x.y * r, _y.y * L, _z.y * r, a.y, _x.z * r, _y.z * L, _z.z * r, a.z, 0, 0, 0, 1);
}
/** Unit-Z prototype spanning a -> b, x horizontal, y up-ish (walkways). */
function spanMtx(out: THREE.Matrix4, a: V3, b: V3): THREE.Matrix4 {
  _z.subVectors(b, a);
  const L = _z.length() || 1e-4;
  _z.divideScalar(L);
  _x.crossVectors(UP, _z);
  if (_x.lengthSq() < 1e-6) _x.set(1, 0, 0);
  _x.normalize();
  _y.crossVectors(_z, _x);
  return out.set(_x.x, _y.x, _z.x * L, a.x, _x.y, _y.y, _z.y * L, a.y, _x.z, _y.z, _z.z * L, a.z, 0, 0, 0, 1);
}

// ---------------------------------------------------------------- layout primitives
interface Place { x: number; y: number; z: number; ry: number }
interface Rect { x: number; z: number; hw: number; hd: number }
type Side = 0 | 1 | 2 | 3; // +z, -z, +x, -x edges of a deck (local)

function toW(P: Place, lx: number, ly: number, lz: number, out = new THREE.Vector3()): V3 {
  const c = Math.cos(P.ry), s = Math.sin(P.ry);
  return out.set(P.x + lx * c + lz * s, P.y + ly, P.z - lx * s + lz * c);
}
function toL(P: Place, wx: number, wz: number): [number, number] {
  const dx = wx - P.x, dz = wz - P.z, c = Math.cos(P.ry), s = Math.sin(P.ry);
  return [dx * c - dz * s, dx * s + dz * c];
}
function dirW(P: Place, lx: number, lz: number, out = new THREE.Vector3()): V3 {
  const c = Math.cos(P.ry), s = Math.sin(P.ry);
  return out.set(lx * c + lz * s, 0, -lx * s + lz * c);
}
function obbOverlap(P1: Place, hw1: number, hd1: number, P2: Place, hw2: number, hd2: number, m: number): boolean {
  const c1 = Math.cos(P1.ry), s1 = Math.sin(P1.ry), c2 = Math.cos(P2.ry), s2 = Math.sin(P2.ry);
  const axes = [[c1, -s1], [s1, c1], [c2, -s2], [s2, c2]];
  const dx = P2.x - P1.x, dz = P2.z - P1.z;
  for (const [ax, az] of axes) {
    const r1 = hw1 * Math.abs(c1 * ax - s1 * az) + hd1 * Math.abs(s1 * ax + c1 * az);
    const r2 = hw2 * Math.abs(c2 * ax - s2 * az) + hd2 * Math.abs(s2 * ax + c2 * az);
    if (Math.abs(dx * ax + dz * az) > r1 + r2 + m) return false;
  }
  return true;
}
function rectHit(a: Rect, b: Rect, m: number): boolean {
  return Math.abs(a.x - b.x) < a.hw + b.hw + m && Math.abs(a.z - b.z) < a.hd + b.hd + m;
}
function sideInfo(side: Side, hw: number, hd: number, t: number): { lx: number; lz: number; nx: number; nz: number } {
  switch (side) {
    case 0: return { lx: t, lz: hd, nx: 0, nz: 1 };
    case 1: return { lx: t, lz: -hd, nx: 0, nz: -1 };
    case 2: return { lx: hw, lz: t, nx: 1, nz: 0 };
    default: return { lx: -hw, lz: t, nx: -1, nz: 0 };
  }
}

// ---------------------------------------------------------------- shader chunks
const MOD_PARS = /* glsl */ `
attribute float aMod;
uniform highp sampler2D uModTex;
uniform float uTime;
mat4 zenMat(float fi) {
  int j = int(fi + 0.5) * 4;
  int yy = j / 1024;
  int xx = j - yy * 1024;
  return mat4(texelFetch(uModTex, ivec2(xx, yy), 0), texelFetch(uModTex, ivec2(xx + 1, yy), 0),
              texelFetch(uModTex, ivec2(xx + 2, yy), 0), texelFetch(uModTex, ivec2(xx + 3, yy), 0));
}
`;
const FLU_PARS = /* glsl */ `
attribute float aFlu;
`;
const MOD_NORMAL = /* glsl */ `
mat4 zM = zenMat(aMod);
mat3 zB = mat3(zM);
vec3 objectNormal = normal / vec3(dot(zB[0], zB[0]), dot(zB[1], zB[1]), dot(zB[2], zB[2]));
objectNormal = zB * objectNormal;
#ifdef USE_TANGENT
vec3 objectTangent = vec3(tangent.xyz);
#endif
`;
const MOD_BEGIN = /* glsl */ `
vec3 transformed = (zM * vec4(position, 1.0)).xyz;
`;
const FLU_BEGIN = /* glsl */ `
vec3 zp = position;
float zph = aMod * 1.618 + dot(position, vec3(2.3, 1.1, 1.9));
float zs = sin(uTime * 5.3 + zph) * 0.65 + sin(uTime * 8.7 + zph * 1.7) * 0.35;
zp += normal * (zs * 0.06 * aFlu);
vec3 transformed = (zM * vec4(zp, 1.0)).xyz;
`;
const BAND_FRAG = /* glsl */ `
{
  float bb = fract(vBand / 0.58 + vSeed);
  float ring = smoothstep(0.0, 0.03, bb) * (1.0 - smoothstep(0.03, 0.085, bb));
  float sheen = smoothstep(0.1, 0.3, bb) * (1.0 - smoothstep(0.3, 0.8, bb));
  diffuseColor.rgb *= (1.0 - 0.34 * ring) * (1.0 + 0.07 * sheen);
}
`;

const FIN_PARAMS: Record<Fin, { r: number; m: number; env?: number }> = {
  pole: { r: 0.55, m: 0 },
  wood: { r: 0.82, m: 0 },
  zinc: { r: 0.5, m: 0.55, env: 0.9 },
  shine: { r: 0.22, m: 0.9, env: 1.35 },
  cloth: { r: 0.95, m: 0 },
};

// ---------------------------------------------------------------- ground shader
const GROUND_FN = /* glsl */ `
uniform vec3 uGDark, uGLight, uGCrack, uGBleach, uGPale;
vec2 zh2(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}
vec3 zvor(vec2 x) {
  vec2 n = floor(x), f = fract(x);
  vec2 mg = vec2(0.0), mr = vec2(0.0);
  float md = 8.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 g = vec2(float(i), float(j));
    vec2 o = zh2(n + g);
    vec2 r = g + o - f;
    float d = dot(r, r);
    if (d < md) { md = d; mr = r; mg = g; }
  }
  md = 8.0;
  for (int j = -2; j <= 2; j++) for (int i = -2; i <= 2; i++) {
    vec2 g = mg + vec2(float(i), float(j));
    vec2 o = zh2(n + g);
    vec2 r = g + o - f;
    if (dot(mr - r, mr - r) > 0.00001) md = min(md, dot(0.5 * (mr + r), normalize(r - mr)));
  }
  return vec3(md, zh2(n + mg));
}
vec3 zenGround(vec2 p) {
  float fw = length(fwidth(p));
  float n1 = snoise(vec3(p * 0.03, 1.7)) * 0.55 + snoise(vec3(p * 0.11, 4.2)) * 0.3 + snoise(vec3(p * 0.45, 9.1)) * 0.15;
  vec3 c = mix(uGDark, uGLight, smoothstep(-0.55, 0.6, n1));
  float pale = smoothstep(0.25, 0.75, snoise(vec3(p * 0.018, 3.3)));
  c = mix(c, uGPale, pale * 0.35);
  float detail = 1.0 - smoothstep(0.04, 0.22, fw);
  // large cracked mud cells
  vec2 q = p * 0.9 + 0.3 * vec2(snoise(vec3(p * 0.4, 2.0)), snoise(vec3(p * 0.4, 5.0)));
  vec3 v = zvor(q);
  float e = v.x / 0.9;
  float crack = 1.0 - smoothstep(0.018, 0.018 + fw * 1.3 + 0.012, e);
  float rim = 1.0 - smoothstep(0.02, 0.16, e);
  c *= 0.93 + 0.13 * v.y;
  c = mix(c, c * 1.09 + 0.012, rim * detail * 0.75);
  c = mix(c, uGCrack, crack * detail * 0.8);
  // fine secondary cracks
  vec3 v2 = zvor(p * 2.6 + 11.0);
  float e2 = v2.x / 2.6;
  float crack2 = 1.0 - smoothstep(0.008, 0.008 + fw * 1.2 + 0.006, e2);
  float detail2 = 1.0 - smoothstep(0.02, 0.08, fw);
  c = mix(c, uGCrack, crack2 * detail2 * 0.35);
  // the first plan: bleached rings and a skewed grid, half erased by dust
  float L = length(p);
  float ringD = min(min(abs(L - 6.0), abs(L - 11.0)), abs(L - 16.0));
  float ca = 0.95630, sa = 0.29237;
  vec2 g = vec2(ca * p.x - sa * p.y, sa * p.x + ca * p.y);
  vec2 gf = abs(fract(g / 3.7) - 0.5) * 3.7;
  float gridD = min(gf.x, gf.y);
  float lineW = 0.07;
  float ring = 1.0 - smoothstep(lineW, lineW + fw + 0.05, ringD);
  float grid = (1.0 - smoothstep(lineW * 0.8, lineW * 0.8 + fw + 0.05, gridD)) * 0.8;
  float erase = smoothstep(-0.15, 0.35, snoise(vec3(p * 0.09, 3.1))) * smoothstep(-0.35, 0.25, snoise(vec3(p * 0.55, 7.7)));
  float limit = 1.0 - smoothstep(17.0, 19.5, L);
  float plan = max(ring, grid) * erase * limit;
  c = mix(c, uGBleach, plan * 0.6);
  return c;
}
`;

// ---------------------------------------------------------------- the city
interface Deck {
  k: number;
  w: number;
  d: number;
  A: Place;
  B: Place;
  age: number;
  hub: number;
  crown: boolean;
  role: 'belv' | 'crane' | 'none';
  freeA: number;
  occ: Rect[];
  gaps: [number, number][][]; // railing gaps per side: [t0, t1]
  rails: boolean[];
  arm: number;
  mod: Mod | null;
  stilts: Stilt[];
}
interface Stilt { deck: Deck; lx: number; lz: number; r: number; topA: V3; footA: V3; topB: V3; footB: V3; post: boolean; mod: Mod | null }
interface Ladder { lenA: number; a: V3; b: V3; fa: V3; aB: V3; bB: V3; fB: V3; mod: Mod | null }
interface Walk { lenA: number; a: V3; b: V3; aB: V3; bB: V3; sag: number; mod: Mod | null }
interface Mod {
  idx: number;
  kind: number; // 0 rigid, 1 strut (unit Y), 2 span (unit Z), 3 computed elsewhere
  pA: V3; qA: THREE.Quaternion; pB: V3; qB: THREE.Quaternion;
  aA: V3; bA: V3; aB: V3; bB: V3; hA: V3; hB: V3;
  delay: number; dur: number; lift: number; liftA: number; swirl: number; tumble: number; axis: V3;
  m: THREE.Matrix4;
  e: number;
}

const build: CityBuilder = (ctx) => {
  const rng = ctx.rng;
  const low = ctx.quality === 'low';
  const root = new THREE.Group();
  root.name = 'zenobia';

  const R = {
    hub: rng.fork('hubs'),
    deck: rng.fork('decks'),
    stilt: rng.fork('stilts'),
    link: rng.fork('links'),
    dream: rng.fork('dream'),
    house: rng.fork('houses'),
    geo: rng.fork('geo'),
    misc: rng.fork('misc'),
    anim: rng.fork('anim'),
  };

  // ============================================================ LAYOUT A: the real Zenobia
  const blobR = (a: number) => 12.2 + 1.7 * K.noise2(Math.cos(a) * 1.1 + 3.3, Math.sin(a) * 1.1 - 1.7) + 0.7 * K.noise2(Math.cos(a) * 2.6, Math.sin(a) * 2.6 + 9.1);
  interface Hub { x: number; z: number; top: number; ry: number }
  const hubs: Hub[] = [];
  {
    const r = R.hub;
    hubs.push({ x: r.float(-1.2, 1.2), z: r.float(-3.4, -1.6), top: 17.6, ry: r.float(-0.3, 0.3) });
    let tries = 0;
    while (hubs.length < 11 && tries++ < 6000) {
      const x = r.float(-11.5, 11.5), z = r.float(-11.5, 11.5);
      const d = Math.hypot(x, z);
      if (d > blobR(Math.atan2(z, x)) - 2.6) continue;
      if (hubs.some((h) => Math.hypot(h.x - x, h.z - z) < 4.5)) continue;
      const north = K.clamp(0.5 - z / 18);
      if (!r.chance(0.3 + 0.7 * north)) continue;
      const top = K.clamp(7.2 + 9.5 * north * (1 - (0.3 * d) / 11) + r.float(-0.8, 2.2), 7.2, 16.8);
      hubs.push({ x, z, top, ry: r.float(-0.55, 0.55) });
    }
  }

  const decks: Deck[] = [];
  const mkDeck = (x: number, y: number, z: number, w: number, d: number, ry: number, hub: number, crown: boolean): Deck | null => {
    const P: Place = { x, y, z, ry };
    if (Math.hypot(x, z) > blobR(Math.atan2(z, x)) + 0.5) return null;
    for (const o of decks) {
      if (!obbOverlap(P, w / 2, d / 2, o.A, o.w / 2, o.d / 2, 0.32)) continue;
      if (Math.abs(o.A.y - y) < (crown || o.crown ? 2.9 : 2.0)) return null;
    }
    const D: Deck = {
      k: decks.length, w, d, A: P, B: { x: 0, y: 0, z: 0, ry: 0 }, age: 0, hub, crown, role: 'none', freeA: Infinity,
      occ: [], gaps: [[], [], [], []], rails: [false, false, false, false], arm: -1, mod: null, stilts: [],
    };
    decks.push(D);
    return D;
  };
  {
    const r = R.deck;
    hubs.forEach((h, hi) => {
      let y = r.float(4.3, 5.8);
      while (y < h.top - 1.6) {
        const n = r.chance(0.6) ? 2 : 1;
        for (let k = 0; k < n; k++) {
          for (let a = 0; a < 14; a++) {
            const ang = r.angle(), off = r.float(0.4, 2.7);
            const big = r.chance(0.62);
            const w = big ? r.float(2.1, 3.5) : r.float(1.3, 2.1);
            const d = big ? r.float(1.5, 2.6) : r.float(1.05, 1.6);
            const ry = h.ry + r.pick([0, Math.PI / 2]) + r.float(-0.2, 0.2);
            if (mkDeck(h.x + Math.cos(ang) * off, y + r.float(-0.4, 0.4), h.z + Math.sin(ang) * off, w, d, ry, hi, false)) break;
          }
        }
        y += r.float(2.1, 3.2);
      }
      for (let a = 0; a < 12; a++) {
        if (mkDeck(h.x + r.float(-0.6, 0.6), h.top + r.float(-0.2, 0.3), h.z + r.float(-0.6, 0.6), 1.6, 1.6, h.ry + r.float(-0.25, 0.25), hi, true)) break;
      }
    });
    // lone low platforms around the edge
    let tries = 0, made = 0;
    while (made < 11 && tries++ < 800) {
      const a = r.angle();
      const rr = blobR(a) * r.float(0.72, 0.98);
      const big = r.chance(0.5);
      if (mkDeck(Math.cos(a) * rr, r.float(4.3, 8.5), Math.sin(a) * rr, big ? r.float(1.9, 3.0) : r.float(1.3, 1.9), big ? r.float(1.4, 2.2) : r.float(1.0, 1.5), r.angle(), -1, false)) made++;
    }
  }
  // clearance above each deck, age, roles
  for (const D of decks) {
    for (const o of decks) {
      if (o === D || o.A.y <= D.A.y) continue;
      if (obbOverlap(D.A, D.w / 2, D.d / 2, o.A, o.w / 2, o.d / 2, 0.0)) D.freeA = Math.min(D.freeA, o.A.y - D.A.y);
    }
    D.age = K.clamp(K.smoothstep(5, 16, D.A.y) + R.deck.float(-0.18, 0.18));
  }
  {
    const tops = decks.filter((d) => d.freeA > 3.2).sort((a, b) => b.A.y - a.A.y);
    const belv: Deck[] = [];
    for (const d of tops) {
      if (belv.length >= 9) break;
      if (d.w > 2.4 || d.d > 2.4) continue;
      if (belv.some((b) => Math.hypot(b.A.x - d.A.x, b.A.z - d.A.z) < 2.6)) continue;
      d.role = 'belv';
      belv.push(d);
    }
    // fill up to nine with the next best tops if needed
    for (const d of tops) {
      if (belv.length >= 9) break;
      if (d.role === 'belv') continue;
      if (belv.some((b) => Math.hypot(b.A.x - d.A.x, b.A.z - d.A.z) < 2.4)) continue;
      d.role = 'belv';
      belv.push(d);
    }
    let cranes = 0;
    for (const d of tops) {
      if (cranes >= 4) break;
      if (d.role !== 'none' || d.A.y < 9 || d.w < 1.8) continue;
      d.role = 'crane';
      cranes++;
    }
  }

  // ---- A helpers
  const inDeck = (P: Place, D: Deck, wx: number, wz: number, m: number) => {
    const [lx, lz] = toL(P, wx, wz);
    return Math.abs(lx) <= D.w / 2 + m && Math.abs(lz) <= D.d / 2 + m;
  };
  const lay = (D: Deck, L: 'A' | 'B') => (L === 'A' ? D.A : D.B);
  /** highest deck surface strictly below y at (x, z) in layout L (0 = ground). */
  const floorAt = (L: 'A' | 'B', x: number, z: number, below: number, skip?: Deck, m = 0.05): { y: number; deck: Deck | null } => {
    let best = 0, bd: Deck | null = null;
    for (const D of decks) {
      if (D === skip) continue;
      const P = lay(D, L);
      if (P.y >= below - 0.05 || P.y <= best) continue;
      if (inDeck(P, D, x, z, m)) {
        best = P.y;
        bd = D;
      }
    }
    return { y: best, deck: bd };
  };
  const segBlocked = (L: 'A' | 'B', a: V3, b: V3, skip: Deck[], pad = 0.1, band = 1.7): boolean => {
    const n = Math.max(4, Math.ceil(a.distanceTo(b) / 0.4));
    const p = new THREE.Vector3();
    for (let i = 0; i <= n; i++) {
      p.lerpVectors(a, b, i / n);
      for (const D of decks) {
        if (skip.includes(D)) continue;
        const P = lay(D, L);
        if (p.y < P.y - 0.3 || p.y > P.y + band) continue;
        if (inDeck(P, D, p.x, p.z, pad)) return true;
      }
    }
    return false;
  };
  const addGap = (D: Deck, side: Side, t: number, hw: number) => D.gaps[side].push([t - hw, t + hw]);
  const occupyEdge = (D: Deck, side: Side, t: number) => {
    const s = sideInfo(side, D.w / 2, D.d / 2, t);
    D.occ.push({ x: s.lx - s.nx * 0.28, z: s.lz - s.nz * 0.28, hw: 0.3, hd: 0.3 });
  };

  // ---- A stilts
  const stilts: Stilt[] = [];
  for (const D of decks) {
    const r = R.stilt;
    const hw = D.w / 2 - 0.14, hd = D.d / 2 - 0.14;
    const pts: [number, number][] = D.w * D.d < 2.1 ? [[-hw, -hd], [hw, -hd], [0, hd]] : [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]];
    if (D.w > 2.9) pts.push([0, -hd], [0, hd]);
    for (const [lx, lz] of pts) {
      const topA = toW(D.A, lx, -0.17, lz);
      const fl = floorAt('A', topA.x, topA.z, D.A.y - 0.4, D, 0.08);
      const S: Stilt = { deck: D, lx, lz, r: r.float(0.052, 0.078) + (D.age < 0.35 ? 0.008 : 0), topA, footA: new THREE.Vector3(topA.x, fl.y, topA.z), topB: new THREE.Vector3(), footB: new THREE.Vector3(), post: !!fl.deck, mod: null };
      if (fl.deck) {
        const [ex, ez] = toL(fl.deck.A, topA.x, topA.z);
        fl.deck.occ.push({ x: ex, z: ez, hw: 0.12, hd: 0.12 });
      } else if (topA.y > 3.2 && r.chance(0.38)) {
        // leaning: splayed outward, or crossing under the deck
        const theta = r.float(0.07, 0.21);
        const out = new THREE.Vector3(topA.x - D.A.x, 0, topA.z - D.A.z).normalize();
        const cross = r.chance(0.35);
        const dir = cross ? out.clone().negate() : out.applyAxisAngle(UP, r.float(-0.7, 0.7));
        const off = topA.y * Math.tan(theta);
        const foot = new THREE.Vector3(topA.x + dir.x * off, 0, topA.z + dir.z * off);
        if (!segBlocked('A', foot, topA.clone().add(new THREE.Vector3(0, -0.3, 0)), [D], 0.12, 1.75)) S.footA.copy(foot);
      }
      D.stilts.push(S);
      stilts.push(S);
    }
  }

  // ---- A ladders
  const ladders: Ladder[] = [];
  {
    const r = R.link;
    const order = r.shuffle(decks.slice());
    for (const U of order) {
      if (ladders.length >= 52) break;
      let made = 0;
      for (const L of r.shuffle(decks.slice())) {
        if (made >= (U.role === 'belv' ? 1 : 2) || L === U) continue;
        const dy = U.A.y - L.A.y;
        if (dy < 1.4 || dy > 4.4) continue;
        if (!obbOverlap(U.A, U.w / 2, U.d / 2, L.A, L.w / 2, L.d / 2, 0.8)) continue;
        for (const side of r.shuffle([0, 1, 2, 3] as Side[])) {
          const len = side < 2 ? U.w : U.d;
          const t = r.float(-0.3, 0.3) * len;
          const s = sideInfo(side, U.w / 2, U.d / 2, t);
          const top = toW(U.A, s.lx + s.nx * 0.06, 0, s.lz + s.nz * 0.06);
          const foot = toW(U.A, s.lx + s.nx * 0.42, 0, s.lz + s.nz * 0.42);
          foot.y = L.A.y;
          if (!inDeck(L.A, L, foot.x, foot.z, -0.18)) continue;
          const [fx, fz] = toL(L.A, foot.x, foot.z);
          const fr: Rect = { x: fx, z: fz, hw: 0.2, hd: 0.2 };
          if (L.occ.some((o) => rectHit(o, fr, 0.05))) continue;
          if (floorAt('A', foot.x, foot.z, U.A.y - 0.2, undefined, 0.02).deck !== L) continue;
          if (segBlocked('A', foot.clone().setY(L.A.y + 0.3), top.clone().setY(U.A.y - 0.3), [U, L], 0.05, 1.2)) continue;
          L.occ.push(fr);
          addGap(U, side, t, 0.22);
          occupyEdge(U, side, t);
          const face = dirW(U.A, -s.nx, -s.nz);
          ladders.push({ lenA: dy, a: foot, b: top, fa: face, aB: new THREE.Vector3(), bB: new THREE.Vector3(), fB: new THREE.Vector3(), mod: null });
          made++;
          break;
        }
      }
    }
    // a few ladders from the dust to the lowest platforms
    let g = 0;
    for (const U of r.shuffle(decks.slice())) {
      if (g >= 6) break;
      if (U.A.y > 7.2) continue;
      for (const side of r.shuffle([0, 1, 2, 3] as Side[])) {
        const len = side < 2 ? U.w : U.d;
        const t = r.float(-0.25, 0.25) * len;
        const s = sideInfo(side, U.w / 2, U.d / 2, t);
        const top = toW(U.A, s.lx + s.nx * 0.06, 0, s.lz + s.nz * 0.06);
        const lean = U.A.y * 0.16;
        const foot = toW(U.A, s.lx + s.nx * (0.1 + lean), 0, s.lz + s.nz * (0.1 + lean));
        foot.y = 0;
        if (floorAt('A', foot.x, foot.z, U.A.y, undefined, 0.2).deck) continue;
        if (segBlocked('A', foot, top.clone().setY(U.A.y - 0.3), [U], 0.08, 1.2)) continue;
        addGap(U, side, t, 0.22);
        occupyEdge(U, side, t);
        ladders.push({ lenA: top.distanceTo(foot), a: foot, b: top, fa: dirW(U.A, -s.nx, -s.nz), aB: new THREE.Vector3(), bB: new THREE.Vector3(), fB: new THREE.Vector3(), mod: null });
        g++;
        break;
      }
    }
  }

  // ---- A hanging sidewalks
  const walks: Walk[] = [];
  const edgeToward = (P: Place, D: Deck, tx: number, tz: number): { lx: number; lz: number; side: Side; t: number } => {
    let [lx, lz] = toL(P, tx, tz);
    const l = Math.hypot(lx, lz) || 1;
    lx /= l;
    lz /= l;
    const hw = D.w / 2, hd = D.d / 2;
    const sx = Math.abs(lx) > 1e-6 ? hw / Math.abs(lx) : Infinity;
    const sz = Math.abs(lz) > 1e-6 ? hd / Math.abs(lz) : Infinity;
    const s = Math.min(sx, sz);
    const px = lx * s, pz = lz * s;
    if (sx < sz) return { lx: px, lz: K.clamp(pz, -hd + 0.3, hd - 0.3), side: lx > 0 ? 2 : 3, t: K.clamp(pz, -hd + 0.3, hd - 0.3) };
    return { lx: K.clamp(px, -hw + 0.3, hw - 0.3), lz: pz, side: lz > 0 ? 0 : 1, t: K.clamp(px, -hw + 0.3, hw - 0.3) };
  };
  {
    const r = R.link;
    const cands: { P: Deck; Q: Deck; len: number }[] = [];
    for (let i = 0; i < decks.length; i++) {
      for (let j = i + 1; j < decks.length; j++) {
        const P = decks[i], Q = decks[j];
        if (Math.abs(P.A.y - Q.A.y) > 1.25) continue;
        const dc = Math.hypot(P.A.x - Q.A.x, P.A.z - Q.A.z);
        if (dc < 2.4 || dc > 10) continue;
        cands.push({ P, Q, len: dc });
      }
    }
    r.shuffle(cands);
    const used = new Map<Deck, number>();
    for (const c of cands) {
      if (walks.length >= 22) break;
      if ((used.get(c.P) ?? 0) >= 2 || (used.get(c.Q) ?? 0) >= 2) continue;
      const eP = edgeToward(c.P.A, c.P, c.Q.A.x, c.Q.A.z);
      const eQ = edgeToward(c.Q.A, c.Q, c.P.A.x, c.P.A.z);
      const a = toW(c.P.A, eP.lx, 0, eP.lz), b = toW(c.Q.A, eQ.lx, 0, eQ.lz);
      const span = Math.hypot(a.x - b.x, a.z - b.z);
      if (span < 1.6 || span > 7.6) continue;
      const sag = 0.05 + span * 0.06;
      // test the span (lowered by its sag) against other decks
      const am = a.clone(), bm = b.clone();
      const mid = am.clone().lerp(bm, 0.5);
      mid.y -= sag;
      if (segBlocked('A', am.clone().lerp(mid, 0.08), mid, [c.P, c.Q], 0.12, 1.75) || segBlocked('A', mid, bm.clone().lerp(mid, 0.08), [c.P, c.Q], 0.12, 1.75)) continue;
      if (walks.some((w) => {
        const wm = w.a.clone().lerp(w.b, 0.5);
        return wm.distanceTo(mid) < 1.2;
      })) continue;
      const rp: Rect = { x: eP.lx, z: eP.lz, hw: 0.32, hd: 0.32 }, rq: Rect = { x: eQ.lx, z: eQ.lz, hw: 0.32, hd: 0.32 };
      if (c.P.occ.some((o) => rectHit(o, rp, 0)) || c.Q.occ.some((o) => rectHit(o, rq, 0))) continue;
      addGap(c.P, eP.side, eP.t, 0.3);
      addGap(c.Q, eQ.side, eQ.t, 0.3);
      occupyEdge(c.P, eP.side, eP.t);
      occupyEdge(c.Q, eQ.side, eQ.t);
      used.set(c.P, (used.get(c.P) ?? 0) + 1);
      used.set(c.Q, (used.get(c.Q) ?? 0) + 1);
      walks.push({ lenA: a.distanceTo(b), a, b, aB: new THREE.Vector3(), bB: new THREE.Vector3(), sag, mod: null });
    }
  }

  // ============================================================ LAYOUT B: the dreamed Zenobia
  {
    const r = R.dream;
    const belv = decks.filter((d) => d.role === 'belv');
    const ringR = 3.3;
    belv.forEach((d, k) => {
      const a = (k / belv.length) * Math.PI * 2 + 0.4;
      d.B = { x: Math.cos(a) * ringR, y: 22.2 + (k % 2) * 0.9, z: Math.sin(a) * ringR, ry: -a + Math.PI / 2 };
    });
    const others = decks.filter((d) => d.role !== 'belv');
    // newer planks rise toward the crown, with plenty of shuffling
    const key = new Map<Deck, number>();
    for (const d of others) key.set(d, d.age + r.float(-0.45, 0.45));
    others.sort((a, b) => (key.get(b) ?? 0) - (key.get(a) ?? 0));
    const arms: Deck[][] = [[], [], []];
    others.forEach((d, i) => arms[i % 3].push(d));
    const rIn = 6.6, b = 3.75 / ((Math.PI * 2) / 3);
    let rMax = rIn;
    const placedB: { d: Deck; r: number; gapBefore: number }[] = [];
    arms.forEach((list, ai) => {
      const th0 = (ai / 3) * Math.PI * 2 + 0.95;
      let th = th0;
      let prevHalf = 0;
      list.forEach((d, j) => {
        d.arm = ai;
        const gap = j === 0 ? 0 : j % 3 === 1 ? r.float(2.0, 3.4) : r.float(0.75, 1.05);
        let s = j === 0 ? 0 : prevHalf + gap + d.w / 2;
        // advance theta by arc length s along r = rIn + b (th - th0)
        while (s > 0) {
          const rr = rIn + b * (th - th0);
          const dth = Math.min(0.01, s / Math.hypot(rr, b));
          th += dth;
          s -= dth * Math.hypot(rr, b);
        }
        const rr = rIn + b * (th - th0);
        const tx = b * Math.cos(th) - rr * Math.sin(th), tz = b * Math.sin(th) + rr * Math.cos(th);
        d.B = { x: Math.cos(th) * rr, y: 0, z: Math.sin(th) * rr, ry: Math.atan2(-tz, tx) };
        rMax = Math.max(rMax, rr);
        placedB.push({ d, r: rr, gapBefore: gap });
        prevHalf = d.w / 2;
      });
    });
    for (const p of placedB) p.d.B.y = 20.4 - ((p.r - rIn) / Math.max(1, rMax - rIn)) * 15.2;
  }

  // ---- B stilts: every deck stands on the ground again, from the same corners
  for (const S of stilts) {
    const D = S.deck;
    S.topB = toW(D.B, S.lx, -0.17, S.lz);
    S.footB.set(S.topB.x, 0, S.topB.z);
    if (R.stilt.chance(0.18)) {
      const out = new THREE.Vector3(S.topB.x - D.B.x, 0, S.topB.z - D.B.z).normalize();
      const off = S.topB.y * Math.tan(R.stilt.float(0.04, 0.09));
      const f = new THREE.Vector3(S.topB.x + out.x * off, 0, S.topB.z + out.z * off);
      if (!segBlocked('B', f, S.topB.clone().setY(S.topB.y - 0.3), [D], 0.12, 1.75)) S.footB.copy(f);
    }
  }

  // ---- B ladders: between the arms, from a lower deck up to a higher neighbour
  {
    const r = R.dream;
    const cands: { a: V3; b: V3; f: V3; len: number }[] = [];
    const usedTop = new Map<Deck, number>();
    for (const D of r.shuffle(decks.slice())) {
      if (D.role === 'belv') continue;
      for (const E of decks) {
        if (E === D) continue;
        const dy = E.B.y - D.B.y;
        if (dy < 1.8 || dy > 6.5) continue;
        const dc = Math.hypot(E.B.x - D.B.x, E.B.z - D.B.z);
        if (dc > 5.2) continue;
        if ((usedTop.get(E) ?? 0) >= 2) continue;
        const eE = edgeToward(E.B, E, D.B.x, D.B.z);
        const top = toW(E.B, eE.lx, 0, eE.lz);
        const nOut = new THREE.Vector3(D.B.x - E.B.x, 0, D.B.z - E.B.z).normalize();
        const [fx0, fz0] = toL(D.B, top.x, top.z);
        void fx0;
        void fz0;
        // foot: the point of D closest to the top edge, pulled inside D
        const eD = edgeToward(D.B, D, top.x, top.z);
        const footEdge = toW(D.B, eD.lx, 0, eD.lz);
        const inward = new THREE.Vector3(D.B.x - footEdge.x, 0, D.B.z - footEdge.z).normalize();
        const foot = footEdge.clone().addScaledVector(inward, 0.35);
        foot.y = D.B.y;
        const horiz = Math.hypot(top.x - foot.x, top.z - foot.z);
        if (horiz / dy > 0.6 || horiz < 0.2) continue;
        const [lx, lz] = toL(D.B, foot.x, foot.z);
        const fr: Rect = { x: lx, z: lz, hw: 0.22, hd: 0.22 };
        if (D.occ.some((o) => rectHit(o, fr, 0.05))) continue;
        if (segBlocked('B', foot.clone().setY(D.B.y + 0.35), top.clone().setY(E.B.y - 0.35), [D, E], 0.05, 1.2)) continue;
        D.occ.push(fr);
        addGap(D, eD.side, eD.t, 0.24);
        addGap(E, eE.side, eE.t, 0.22);
        occupyEdge(E, eE.side, eE.t);
        usedTop.set(E, (usedTop.get(E) ?? 0) + 1);
        cands.push({ a: foot, b: top.clone().addScaledVector(nOut, 0.06), f: nOut.clone().negate(), len: top.distanceTo(foot) });
        break;
      }
      if (cands.length >= ladders.length) break;
    }
    // rank-match the real ladders to dream placements by length
    const lA = ladders.slice().sort((p, q) => p.lenA - q.lenA);
    cands.sort((p, q) => p.len - q.len);
    // pad with ground ladders on the outer low decks if the dream has fewer placements
    let gi = 0;
    const outer = decks.filter((d) => d.role !== 'belv').sort((p, q) => p.B.y - q.B.y);
    while (cands.length < lA.length && gi < outer.length * 4) {
      const U = outer[gi % outer.length];
      gi++;
      const side = (gi % 4) as Side;
      const len = side < 2 ? U.w : U.d;
      const t = r.float(-0.25, 0.25) * len;
      const s = sideInfo(side, U.w / 2, U.d / 2, t);
      const top = toW(U.B, s.lx + s.nx * 0.06, 0, s.lz + s.nz * 0.06);
      const lean = Math.min(1.6, U.B.y * 0.14);
      const foot = toW(U.B, s.lx + s.nx * (0.1 + lean), 0, s.lz + s.nz * (0.1 + lean));
      foot.y = 0;
      if (U.B.y > 12) continue;
      if (segBlocked('B', foot, top.clone().setY(U.B.y - 0.3), [U], 0.08, 1.2)) continue;
      addGap(U, side, t, 0.22);
      occupyEdge(U, side, t);
      cands.push({ a: foot, b: top, f: dirW(U.B, -s.nx, -s.nz), len: top.distanceTo(foot) });
    }
    cands.sort((p, q) => p.len - q.len);
    lA.forEach((L, i) => {
      const c = cands[Math.min(i, cands.length - 1)];
      L.aB.copy(c.a);
      L.bB.copy(c.b);
      L.fB.copy(c.f);
    });
  }

  // ---- B walkways: the wide gaps along each arm become suspended stairways
  {
    const pairs: { P: Deck; Q: Deck; len: number }[] = [];
    for (let ai = 0; ai < 3; ai++) {
      const list = decks.filter((d) => d.arm === ai);
      // decks were pushed in arm order; recover that order via distance from the centre
      list.sort((p, q) => Math.hypot(p.B.x, p.B.z) - Math.hypot(q.B.x, q.B.z));
      for (let j = 0; j + 1 < list.length; j++) {
        const P = list[j], Q = list[j + 1];
        const len = Math.hypot(P.B.x - Q.B.x, P.B.z - Q.B.z) - (P.w + Q.w) / 2;
        pairs.push({ P, Q, len });
      }
    }
    pairs.sort((p, q) => q.len - p.len);
    const chosen = pairs.slice(0, walks.length).sort((p, q) => p.len - q.len);
    const wA = walks.slice().sort((p, q) => p.lenA - q.lenA);
    wA.forEach((W, i) => {
      const c = chosen[Math.min(i, chosen.length - 1)];
      const eP = edgeToward(c.P.B, c.P, c.Q.B.x, c.Q.B.z);
      const eQ = edgeToward(c.Q.B, c.Q, c.P.B.x, c.P.B.z);
      W.aB.copy(toW(c.P.B, eP.lx, 0, eP.lz));
      W.bB.copy(toW(c.Q.B, eQ.lx, 0, eQ.lz));
      addGap(c.P, eP.side, eP.t, 0.3);
      addGap(c.Q, eQ.side, eQ.t, 0.3);
      occupyEdge(c.P, eP.side, eP.t);
      occupyEdge(c.Q, eQ.side, eQ.t);
    });
  }

  // ============================================================ MODULES
  const mods: Mod[] = [];
  const newMod = (kind: number): Mod => {
    const M: Mod = {
      idx: mods.length + 1, kind,
      pA: new THREE.Vector3(), qA: new THREE.Quaternion(), pB: new THREE.Vector3(), qB: new THREE.Quaternion(),
      aA: new THREE.Vector3(), bA: new THREE.Vector3(), aB: new THREE.Vector3(), bB: new THREE.Vector3(),
      hA: new THREE.Vector3(0, 0, 1), hB: new THREE.Vector3(0, 0, 1),
      delay: 0, dur: 2, lift: 0, liftA: 0, swirl: 0, tumble: 0, axis: new THREE.Vector3(1, 0, 0),
      m: new THREE.Matrix4(), e: -1,
    };
    mods.push(M);
    return M;
  };
  const anim = R.anim;
  const rigidOn = (D: Deck, lx: number, ly: number, lz: number, lry: number, delay: number): Mod => {
    const M = newMod(0);
    toW(D.A, lx, ly, lz, M.pA);
    toW(D.B, lx, ly, lz, M.pB);
    M.qA.setFromAxisAngle(UP, D.A.ry + lry);
    M.qB.setFromAxisAngle(UP, D.B.ry + lry);
    M.delay = delay;
    M.dur = anim.float(1.6, 2.1);
    M.lift = anim.float(1.2, 3.2);
    M.swirl = anim.float(0.5, 1.1);
    M.tumble = anim.float(-0.6, 0.6);
    M.axis.set(anim.float(-1, 1), 0, anim.float(-1, 1)).normalize();
    return M;
  };

  // ---- geometry helpers (module-local coordinates)
  const ACC: Record<Fin, Acc> = { pole: new Acc(), wood: new Acc(), zinc: new Acc(), shine: new Acc(), cloth: new Acc() };
  let CUR = 0;
  const C = (c: THREE.ColorRepresentation) => (c instanceof THREE.Color ? c : new THREE.Color(c));
  const box = (f: Fin, c: THREE.ColorRepresentation, w: number, h: number, d: number, x: number, y: number, z: number, ry = 0, rx = 0, rz = 0) =>
    ACC[f].add(PB, mtx(x, y, z, w, h, d, ry, rx, rz), C(c), CUR);
  const boxC = (f: Fin, c: THREE.ColorRepresentation, w: number, h: number, d: number, x: number, y: number, z: number, ry = 0, rx = 0, rz = 0) =>
    ACC[f].add(PBC, mtx(x, y, z, w, h, d, ry, rx, rz), C(c), CUR);
  const _a3 = new THREE.Vector3(), _b3 = new THREE.Vector3(), _mm = new THREE.Matrix4();
  const rod = (f: Fin, c: THREE.ColorRepresentation, ax: number, ay: number, az: number, bx: number, by: number, bz: number, r: number, seg = 5, cf?: ColFn) =>
    ACC[f].add(PCYL(seg), segMtx(_mm, _a3.set(ax, ay, az), _b3.set(bx, by, bz), r), C(c), CUR, cf);
  const cone = (f: Fin, c: THREE.ColorRepresentation, r: number, h: number, x: number, y: number, z: number, seg = 12, ry = 0) =>
    ACC[f].add(PCONE(seg), mtx(x, y, z, r, h, r, ry), C(c), CUR);
  const cyl = (f: Fin, c: THREE.ColorRepresentation, r: number, h: number, x: number, y: number, z: number, seg = 10, rx = 0, rz = 0, ry = 0) =>
    ACC[f].add(PCYL(seg), mtx(x, y, z, r, h, r, ry, rx, rz), C(c), CUR);
  const sph = (f: Fin, c: THREE.ColorRepresentation, r: number, x: number, y: number, z: number, sy = 1) => ACC[f].add(PSPH, mtx(x, y, z, r, r * sy, r), C(c), CUR);
  const quad = (f: Fin, c: THREE.ColorRepresentation, w: number, h: number, x: number, y: number, z: number, ry = 0, rx = 0, fl?: FluFn) =>
    ACC[f].add(PPL, mtx(x, y, z, w, h, 1, ry, rx), C(c), CUR, undefined, fl);
  const jit = (c: THREE.ColorRepresentation, r: K.RNG, dl = 0.05) => K.jitter(c, r, 0.012, 0.04, dl);
  const ageCol = (a: THREE.ColorRepresentation, b: THREE.ColorRepresentation, t: number, r: K.RNG, dl = 0.05) => jit(K.mix(a, b, t), r, dl);

  // ---- decks
  const g = R.geo;
  const dustCol = new THREE.Color(PAL.dust);
  for (const D of decks) {
    const delay = 0.85 + anim.float(0, 0.85);
    const M = newMod(0);
    toW(D.A, 0, 0, 0, M.pA);
    toW(D.B, 0, 0, 0, M.pB);
    M.qA.setFromAxisAngle(UP, D.A.ry);
    M.qB.setFromAxisAngle(UP, D.B.ry);
    M.delay = delay;
    M.dur = anim.float(1.8, 2.2);
    M.lift = anim.float(1.5, 3.5);
    M.swirl = anim.float(0.4, 0.9);
    M.tumble = anim.float(-0.25, 0.25);
    M.axis.set(anim.float(-1, 1), 0, anim.float(-1, 1)).normalize();
    D.mod = M;
    CUR = M.idx;
    const hw = D.w / 2, hd = D.d / 2;
    const alongZ = g.chance(0.5);
    const span = alongZ ? D.w : D.d, len = alongZ ? D.d : D.w;
    const n = Math.max(4, Math.round(span / 0.21));
    const pw = span / n;
    const baseC = K.mix(PAL.oldPlank, PAL.newPlank, D.age);
    for (let i = 0; i < n; i++) {
      if (D.age < 0.4 && g.chance(0.05) && i > 0 && i < n - 1) continue; // a split, missing plank
      const patch = g.chance(0.08);
      const c = patch ? jit(K.mix(PAL.oldPlank, PAL.newPlank, 1 - D.age), g, 0.06) : jit(baseC, g, 0.06);
      const off = -span / 2 + (i + 0.5) * pw;
      const l = len + g.float(-0.05, 0.08);
      if (alongZ) box('wood', c, pw - 0.016, 0.05, l, off, -0.05, g.float(-0.03, 0.03));
      else box('wood', c, l, 0.05, pw - 0.016, g.float(-0.03, 0.03), -0.05, off);
    }
    const jc = K.shade(baseC, 0.72);
    // joists under the planks
    const nj = Math.max(2, Math.round(len / 0.9));
    for (let j = 0; j < nj; j++) {
      const o = -len / 2 + 0.12 + (j / (nj - 1)) * (len - 0.24);
      if (alongZ) box('wood', jc, D.w - 0.04, 0.1, 0.08, 0, -0.16, o);
      else box('wood', jc, 0.08, 0.1, D.d - 0.04, o, -0.16, 0);
    }
    // railings
    const railC = K.shade(K.mix(PAL.oldPole, PAL.newPole, D.age), 0.95);
    const railH = 0.19;
    for (let side = 0 as Side; side < 4; side = (side + 1) as Side) {
      if (!g.chance(D.role === 'belv' ? 0.15 : 0.62)) continue;
      D.rails[side] = true;
      const L = side < 2 ? D.w : D.d;
      const segs: [number, number][] = [];
      let t0 = -L / 2 + 0.05;
      const gs = D.gaps[side].slice().sort((p, q) => p[0] - q[0]);
      for (const [a, b] of gs) {
        if (a > t0 + 0.15) segs.push([t0, a]);
        t0 = Math.max(t0, b);
      }
      if (L / 2 - 0.05 > t0 + 0.15) segs.push([t0, L / 2 - 0.05]);
      for (const [a, b] of segs) {
        const s0 = sideInfo(side, hw - 0.03, hd - 0.03, a), s1 = sideInfo(side, hw - 0.03, hd - 0.03, b);
        rod('wood', railC, s0.lx, railH, s0.lz, s1.lx, railH, s1.lz, 0.018, 4);
        const np = Math.max(2, Math.round((b - a) / 0.5) + 1);
        for (let k = 0; k < np; k++) {
          const tt = a + ((b - a) * k) / (np - 1);
          const sp = sideInfo(side, hw - 0.03, hd - 0.03, tt);
          box('wood', railC, 0.03, railH, 0.03, sp.lx, 0, sp.lz);
        }
      }
    }
  }

  // ---- stilts (unit-Y struts that telescope)
  const oldPole = new THREE.Color(PAL.oldPole), newPole = new THREE.Color(PAL.newPole);
  const tubeProto = (r: number, ys: number[], seg = 7): Proto => {
    const pos: number[] = [], nrm: number[] = [];
    for (let k = 0; k + 1 < ys.length; k++) {
      for (let i = 0; i < seg; i++) {
        const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
        const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
        const y0 = ys[k], y1 = ys[k + 1];
        const v = [[c0, y0, s0], [c1, y0, s1], [c1, y1, s1], [c0, y0, s0], [c1, y1, s1], [c0, y1, s0]];
        // winding: outward facing (counter-clockwise seen from outside)
        const order = [0, 2, 1, 3, 5, 4];
        for (const o of order) {
          const [cx, yy, sz] = v[o];
          pos.push(cx * r, yy, sz * r);
          nrm.push(cx, 0, sz);
        }
      }
    }
    return { pos: new Float32Array(pos), nrm: new Float32Array(nrm), n: pos.length / 3 };
  };
  const ID = new THREE.Matrix4();
  for (const S of stilts) {
    const D = S.deck;
    const M = newMod(1);
    M.aA.copy(S.footA);
    M.bA.copy(S.topA);
    M.aB.copy(S.footB);
    M.bB.copy(S.topB);
    M.delay = 0.1 + anim.float(0, 0.75);
    M.dur = anim.float(1.6, 2.0);
    M.swirl = anim.float(0.3, 0.8);
    M.lift = anim.float(0, 0.6);
    S.mod = M;
    CUR = M.idx;
    const lenA = S.topA.distanceTo(S.footA);
    const dustTop = S.post ? 0 : Math.min(0.45, 0.55 / Math.max(lenA, 0.5));
    const ys = dustTop > 0 ? [0, dustTop, 1] : [0, 1];
    const base = ageCol(oldPole, newPole, K.clamp(D.age + g.float(-0.12, 0.12)), g, 0.05);
    const p = tubeProto(S.r, ys, 7);
    ACC.pole.add(p, ID, base, CUR, (_x0, y, _z0, out) => {
      if (dustTop > 0 && y < dustTop * 0.5) out.lerp(dustCol, 0.55);
      if (y > 0.999) out.multiplyScalar(0.92);
    });
    // a rope lashing at the top of most stilts
    if (g.chance(0.7)) {
      const lt = 1 - Math.min(0.06, 0.16 / Math.max(lenA, 1));
      ACC.wood.add(tubeProto(S.r * 1.25, [lt, 1 - 0.002], 7), ID, C(PAL.rope), CUR);
    }
  }

  // ---- braces between stilts (computed from stilt endpoints)
  interface Brace { mod: Mod; s1: Stilt; t1: number; s2: Stilt; t2: number }
  const braces: Brace[] = [];
  for (const D of decks) {
    const gs = D.stilts.filter((s) => !s.post && s.topA.y - s.footA.y > 4.5);
    if (gs.length < 2) continue;
    const pairs = Math.min(gs.length - 1, g.chance(0.5) ? 2 : 1);
    for (let k = 0; k < pairs; k++) {
      const s1 = gs[k], s2 = gs[(k + 1) % gs.length];
      const L = s1.topA.y;
      const levels = L > 10 ? [[0.12, 0.42], [0.5, 0.82]] : [[0.15, 0.6]];
      for (const [t1, t2] of levels) {
        for (const flip of [false, true]) {
          const M = newMod(3);
          CUR = M.idx;
          const base = ageCol(oldPole, newPole, D.age * 0.8, g, 0.06);
          ACC.pole.add(tubeProto(0.032, [0, 1], 5), ID, base, CUR);
          braces.push(flip ? { mod: M, s1: s2, t1, s2: s1, t2 } : { mod: M, s1, t1, s2, t2 });
        }
      }
    }
  }

  // ---- ladders (unit-Y struts with rungs)
  for (const L of ladders) {
    const M = newMod(1);
    M.aA.copy(L.a);
    M.bA.copy(L.b);
    M.hA.copy(L.fa);
    M.aB.copy(L.aB);
    M.bB.copy(L.bB);
    M.hB.copy(L.fB);
    M.delay = 1.7 + anim.float(0, 0.7);
    M.dur = anim.float(1.6, 2.0);
    M.lift = anim.float(1.0, 2.5);
    M.liftA = M.lift;
    M.swirl = anim.float(0.4, 0.9);
    L.mod = M;
    CUR = M.idx;
    const rc = ageCol(oldPole, newPole, g.float(0.2, 0.9), g, 0.05);
    ACC.pole.add(PCYL(5, true), mtx(-0.15, 0, 0, 0.022, 1, 0.022), rc, CUR);
    ACC.pole.add(PCYL(5, true), mtx(0.15, 0, 0, 0.022, 1, 0.022), rc, CUR);
    const n = Math.max(4, Math.round(L.lenA / 0.25));
    const th = 0.026 / Math.max(L.lenA, 0.5);
    for (let k = 0; k < n; k++) {
      const yk = (k + 0.6) / (n + 0.2);
      box('wood', K.shade(rc, 0.85), 0.31, th, 0.026, 0, yk, 0);
    }
  }

  // ---- hanging sidewalks (unit-Z spans)
  for (const W of walks) {
    const M = newMod(2);
    M.aA.copy(W.a);
    M.bA.copy(W.b);
    M.aB.copy(W.aB);
    M.bB.copy(W.bB);
    M.delay = 1.75 + anim.float(0, 0.7);
    M.dur = anim.float(1.6, 2.0);
    M.lift = anim.float(1.2, 2.8);
    M.liftA = M.lift;
    M.swirl = anim.float(0.4, 0.9);
    W.mod = M;
    CUR = M.idx;
    const n = Math.max(8, Math.round(W.lenA / 0.13));
    const dz = 0.085 / W.lenA;
    const age = g.float(0.2, 1);
    const pc = K.mix(PAL.oldPlank, PAL.newPlank, age);
    const sagAt = (z: number) => -W.sag * 4 * z * (1 - z);
    for (let k = 0; k < n; k++) {
      const z = (k + 0.5) / n;
      if (age < 0.45 && g.chance(0.06)) continue;
      box('wood', jit(pc, g, 0.07), 0.46, 0.028, dz, g.float(-0.01, 0.01), sagAt(z) - 0.028, z);
    }
    const rc = PAL.rope;
    const segs = 10;
    for (const sx of [-0.24, 0.24]) {
      for (let k = 0; k < segs; k++) {
        const z0 = k / segs, z1 = (k + 1) / segs;
        rod('wood', rc, sx, sagAt(z0) * 0.8 + 0.28, z0, sx, sagAt(z1) * 0.8 + 0.28, z1, 0.011, 4);
      }
      for (let k = 1; k < 6; k++) {
        const z = k / 6;
        rod('wood', rc, sx, sagAt(z) - 0.01, z, sx, sagAt(z) * 0.8 + 0.28, z, 0.007, 3);
      }
    }
  }

  // ---- houses, belvederes and the rest of the deck furniture
  const freeSpot = (D: Deck, hw: number, hd: number, m: number, tries = 30, r: K.RNG = R.house): [number, number] | null => {
    const ax = D.w / 2 - hw - 0.07, az = D.d / 2 - hd - 0.07;
    if (ax < 0 || az < 0) return null;
    for (let i = 0; i < tries; i++) {
      const x = r.float(-ax, ax), z = r.float(-az, az);
      const rr: Rect = { x, z, hw, hd };
      if (D.occ.some((o) => rectHit(o, rr, m))) continue;
      return [x, z];
    }
    return null;
  };
  interface HouseRec { D: Deck; mod: Mod; w: number; d: number; h: number; lx: number; lz: number; lry: number; roofTop: number; flat: boolean }
  const houses: HouseRec[] = [];
  interface Vane { mod: Mod; parent: Mod; lx: number; ly: number; lz: number; ph: number }
  const vanes: Vane[] = [];
  const belvs: { D: Deck; mod: Mod; s: number; ph: number; roofY: number }[] = [];

  const buildHouse = (D: Deck, lx: number, lz: number, lry: number, w: number, d: number, h: number, flat: boolean) => {
    const delay = (D.mod?.delay ?? 1) + 0.25 + anim.float(0, 0.45);
    const M = rigidOn(D, lx, 0.004, lz, lry, delay);
    CUR = M.idx;
    const r = R.geo;
    const old = D.age < 0.45;
    const kind = r.weighted(['slat', 'zinc', 'mixed'] as const, old ? [0.35, 0.4, 0.25] : [0.55, 0.25, 0.2]);
    const slatC = jit(r.pick(old ? PAL.slatOld : PAL.slat), r, 0.04);
    const zincC = jit(r.pick(PAL.zinc), r, 0.05);
    const bodyFin: Fin = kind === 'zinc' ? 'zinc' : 'wood';
    const bodyC = kind === 'zinc' ? zincC : slatC;
    box(bodyFin, bodyC, w, h, d, 0, 0, 0);
    if (kind === 'slat' || kind === 'mixed') {
      // vertical battens on the facades
      const bc = K.shade(slatC, 1.12);
      for (const [fw, nx, nz, ry] of [[w, 0, d / 2, 0], [w, 0, -d / 2, Math.PI], [d, w / 2, 0, Math.PI / 2], [d, -w / 2, 0, -Math.PI / 2]] as [number, number, number, number][]) {
        const nb = Math.max(2, Math.round(fw / 0.16));
        for (let i = 0; i < nb; i++) {
          if (r.chance(0.25)) continue;
          const t = -fw / 2 + ((i + 0.5) / nb) * fw;
          const ox = Math.cos(ry) * t + nx + Math.sin(ry) * 0.008, oz = -Math.sin(ry) * t + nz + Math.cos(ry) * 0.008;
          box('wood', jit(bc, r, 0.05), 0.035, h * r.float(0.92, 1), 0.016, ox, 0, oz, ry);
        }
      }
      if (kind === 'mixed') {
        // a zinc panel patched over one wall
        const pw = w * r.float(0.4, 0.7);
        box('zinc', jit(r.pick([...PAL.zinc, ...PAL.rust]), r, 0.05), pw, h * r.float(0.45, 0.8), 0.02, r.float(-(w - pw) / 2, (w - pw) / 2), h * 0.1, -d / 2 - 0.012);
      }
    } else {
      // corrugation ridges on zinc walls
      for (const [fw, nx, nz, ry] of [[w, 0, d / 2, 0], [d, w / 2, 0, Math.PI / 2], [d, -w / 2, 0, -Math.PI / 2]] as [number, number, number, number][]) {
        const nb = Math.max(2, Math.round(fw / 0.22));
        for (let i = 0; i < nb; i++) {
          const t = -fw / 2 + ((i + 0.5) / nb) * fw;
          const ox = Math.cos(ry) * t + nx + Math.sin(ry) * 0.006, oz = -Math.sin(ry) * t + nz + Math.cos(ry) * 0.006;
          box('zinc', K.shade(zincC, 1.1), 0.025, h, 0.012, ox, 0, oz, ry);
        }
      }
    }
    // door and window
    const doorC = r.chance(0.35) ? r.pick(PAL.door.slice(2)) : r.pick(PAL.door.slice(0, 2));
    const dx = r.float(-w * 0.25, w * 0.25);
    quad('wood', doorC, 0.2, Math.min(0.42, h * 0.7), dx, Math.min(0.42, h * 0.7) / 2, d / 2 + 0.014);
    if (r.chance(0.75)) {
      const sx = r.sign();
      quad('wood', '#2c2520', 0.15, 0.13, (w / 2 + 0.014) * sx, h * 0.6, r.float(-d * 0.2, d * 0.2), (sx * Math.PI) / 2);
    }
    // roof: a shed of corrugated zinc sheets, or a flat roof carrying a water barrel
    let roofTop = h;
    if (!flat) {
      const rise = r.float(0.18, 0.3);
      const back = r.chance(0.5) ? 1 : -1;
      // gable wedge under the roof
      ACC[bodyFin].add(PWEDGE, mtx(0, h, 0, w, rise, d, back > 0 ? 0 : Math.PI), bodyC, CUR);
      const ov = 0.09;
      const lenR = Math.hypot(d + ov * 2, rise);
      const pitch = Math.atan2(rise, d) * back;
      const ns = Math.max(3, Math.round((w + ov * 2) / 0.26));
      const sw = (w + ov * 2) / ns;
      const roofBase = r.pick(old ? [...PAL.zinc, ...PAL.rust] : [...PAL.zinc, ...PAL.shine]);
      for (let i = 0; i < ns; i++) {
        const sx = -w / 2 - ov + (i + 0.5) * sw;
        const rust = r.chance(old ? 0.22 : 0.06);
        const bright = !rust && r.chance(old ? 0.08 : 0.3);
        const c = rust ? jit(r.pick(PAL.rust), r) : bright ? jit(r.pick(PAL.shine), r, 0.03) : jit(roofBase, r, 0.045);
        boxC(bright ? 'shine' : 'zinc', c, sw - 0.012, 0.022, lenR, sx, h + rise / 2 + 0.03 + r.float(-0.004, 0.004), 0, 0, pitch);
      }
      roofTop = h + rise;
      if (r.chance(0.3)) {
        // a stovepipe
        const px = r.float(-w * 0.3, w * 0.3), pz = r.float(-d * 0.25, d * 0.25);
        cyl('zinc', '#5a5753', 0.035, 0.45, px, h + rise * 0.5, pz, 6);
        cone('zinc', '#5a5753', 0.07, 0.06, px, h + rise * 0.5 + 0.45, pz, 6);
      }
    } else {
      box('zinc', jit(r.pick(PAL.zinc), r), w + 0.12, 0.05, d + 0.12, 0, h, 0);
      roofTop = h + 0.05;
    }
    return { M, roofTop };
  };

  const buildBarrel = (s: number) => {
    // a water barrel on a little four legged stand (module-local, origin at the foot)
    const lc = '#6a5641';
    for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) box('wood', lc, 0.03 * s, 0.3 * s, 0.03 * s, x * 0.13 * s, 0, z * 0.13 * s);
    box('wood', lc, 0.36 * s, 0.03 * s, 0.36 * s, 0, 0.3 * s, 0);
    const bc = jit(PAL.barrel, R.geo, 0.06);
    ACC.wood.add(PBARREL, mtx(0, 0.33 * s, 0, 0.18 * s, 0.42 * s, 0.18 * s), bc, CUR);
    for (const y of [0.4, 0.66]) cyl('zinc', PAL.iron, 0.192 * s, 0.022 * s, 0, y * s, 0, 12);
  };

  const buildVane = (parent: Mod, lx: number, ly: number, lz: number, pole: number) => {
    // static pole + cardinal cross on the parent; the rotating arrow is its own module
    CUR = parent.idx;
    rod('zinc', PAL.iron, lx, ly, lz, lx, ly + pole, lz, 0.012, 4);
    rod('zinc', PAL.iron, lx - 0.16, ly + pole - 0.18, lz, lx + 0.16, ly + pole - 0.18, lz, 0.007, 3);
    rod('zinc', PAL.iron, lx, ly + pole - 0.18, lz - 0.16, lx, ly + pole - 0.18, lz + 0.16, 0.007, 3);
    const V = newMod(3);
    CUR = V.idx;
    const vc = R.geo.chance(0.5) ? '#3d3a38' : '#8a5a3a';
    box('zinc', vc, 0.5, 0.018, 0.018, 0.03, -0.009, -0.009);
    cone('zinc', vc, 0.05, 0.13, 0.3, 0, 0, 3, 0);
    ACC.zinc.add(PCONE(3), mtx(0.33, 0, 0, 0.055, 0.13, 0.012, 0, 0, -Math.PI / 2), C(vc), CUR);
    box('zinc', vc, 0.16, 0.13, 0.01, -0.17, -0.02, -0.005);
    vanes.push({ mod: V, parent, lx, ly: ly + pole, lz, ph: R.anim.float(0, 10) });
  };

  // belvederes on the crowns
  for (const D of decks) {
    if (D.role !== 'belv') continue;
    const M = rigidOn(D, 0, 0.004, 0, 0, (D.mod?.delay ?? 1) + 0.3 + anim.float(0, 0.4));
    CUR = M.idx;
    const r = R.geo;
    const s = r.float(0.5, 0.6);
    const ph = r.float(1.05, 1.25);
    const pc = jit(PAL.newPole, r, 0.05);
    box('wood', jit(PAL.newPlank, r), s * 2 + 0.16, 0.06, s * 2 + 0.16, 0, 0, 0);
    for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      ACC.pole.add(PCYL(6), mtx(x * s, 0.06, z * s, 0.035, ph, 0.035), C(pc), CUR);
    }
    const openSide = r.int(0, 3);
    const corners: [number, number][] = [[-s, s], [s, s], [s, -s], [-s, -s]];
    for (let i = 0; i < 4; i++) {
      const [ax, az] = corners[i], [bx, bz] = corners[(i + 1) % 4];
      rod('wood', pc, ax, ph + 0.06, az, bx, ph + 0.06, bz, 0.03, 4);
      if (i !== openSide) {
        rod('wood', pc, ax, 0.36, az, bx, 0.36, bz, 0.02, 4);
        rod('wood', pc, ax, 0.2, az, bx, 0.2, bz, 0.012, 4);
      }
    }
    const rr = s * 1.5, rh = r.float(0.72, 0.85);
    const roofC = jit(r.pick(PAL.shine), r, 0.03);
    ACC.shine.add(PCONE(14), mtx(0, ph + 0.08, 0, rr, rh, rr), roofC, CUR);
    cyl('zinc', K.shade(roofC, 0.8), rr * 1.0, 0.04, 0, ph + 0.06, 0, 14);
    sph('shine', roofC, 0.05, 0, ph + 0.08 + rh, 0);
    belvs.push({ D, mod: M, s, ph: r.float(0, 10), roofY: ph + 0.08 + rh });
    buildVane(M, 0, ph + 0.08 + rh, 0, 0.55);
  }

  // houses on decks
  for (const D of decks) {
    if (D.role === 'belv') continue;
    const r = R.house;
    if (D.freeA < 1.8) continue;
    const area = D.w * D.d;
    const want = D.role === 'crane' ? 1 : area < 2.2 ? (r.chance(0.75) ? 1 : 0) : area < 4.6 ? r.int(1, 2) : r.int(2, 3);
    for (let k = 0; k < want; k++) {
      for (let a = 0; a < 18; a++) {
        const w = r.float(0.78, Math.min(1.45, D.w - 0.3)), d = r.float(0.68, Math.min(1.2, D.d - 0.25));
        if (w < 0.6 || d < 0.55) break;
        const rot = r.int(0, 3);
        const swap = rot % 2 === 1;
        const hw = (swap ? d : w) / 2, hd = (swap ? w : d) / 2;
        const sp = freeSpot(D, hw, hd, 0.1, 6, r);
        if (!sp) continue;
        const h = r.float(0.56, Math.min(0.88, D.freeA - 0.75));
        const flat = r.chance(0.16);
        const { M, roofTop } = buildHouse(D, sp[0], sp[1], (rot * Math.PI) / 2, w, d, h, flat);
        D.occ.push({ x: sp[0], z: sp[1], hw, hd });
        houses.push({ D, mod: M, w, d, h, lx: sp[0], lz: sp[1], lry: (rot * Math.PI) / 2, roofTop, flat });
        break;
      }
    }
  }

  // water barrels: on flat roofs and on stands on the decks
  let barrels = 0;
  for (const H of houses) {
    if (!H.flat) continue;
    const M = rigidOn(H.D, H.lx, H.roofTop + 0.004, H.lz, R.misc.angle(), H.mod.delay + 0.2);
    CUR = M.idx;
    buildBarrel(1);
    barrels++;
  }
  for (const D of R.misc.shuffle(decks.slice())) {
    if (barrels >= 30) break;
    if (D.role === 'belv') continue;
    const sp = freeSpot(D, 0.2, 0.2, 0.06, 12, R.misc);
    if (!sp) continue;
    D.occ.push({ x: sp[0], z: sp[1], hw: 0.2, hd: 0.2 });
    const M = rigidOn(D, sp[0], 0.004, sp[1], R.misc.angle(), (D.mod?.delay ?? 1) + 0.3 + anim.float(0, 0.4));
    CUR = M.idx;
    buildBarrel(R.misc.float(0.9, 1.15));
    barrels++;
  }

  // weather vanes on a few high roofs (the belvederes already carry nine)
  {
    const tall = houses.filter((h) => !h.flat && h.D.freeA > 3).sort((a, b) => b.D.A.y - a.D.A.y);
    let n = 0;
    for (const H of tall) {
      if (n >= 3) break;
      buildVane(H.mod, 0, H.roofTop - 0.05, 0, R.misc.float(1.0, 1.4));
      n++;
    }
  }

  // ---- edge equipment: pulleys, fishing poles, cranes
  const edgeSpot = (D: Deck, need: (tip: (L: 'A' | 'B') => V3) => boolean, reach: number, r: K.RNG) => {
    for (const side of r.shuffle([0, 1, 2, 3] as Side[])) {
      const len = side < 2 ? D.w : D.d;
      for (let k = 0; k < 3; k++) {
        const t = r.float(-0.32, 0.32) * len;
        const s = sideInfo(side, D.w / 2, D.d / 2, t);
        const rr: Rect = { x: s.lx - s.nx * 0.15, z: s.lz - s.nz * 0.15, hw: 0.18, hd: 0.18 };
        if (D.occ.some((o) => rectHit(o, rr, 0.02))) continue;
        if (D.gaps[side].some(([a, b]) => t > a - 0.2 && t < b + 0.2)) continue;
        const tip = (L: 'A' | 'B') => toW(lay(D, L), s.lx + s.nx * reach, 0, s.lz + s.nz * reach);
        if (!need(tip)) continue;
        D.occ.push(rr);
        return { side, t, s };
      }
    }
    return null;
  };
  interface Bucket { mod: Mod; parent: Mod; tip: V3; floorA: number; floorB: number; period: number; ph: number; basket: boolean }
  const buckets: Bucket[] = [];
  {
    const r = R.misc;
    for (const D of r.shuffle(decks.slice())) {
      if (buckets.length >= 16) break;
      if (D.role === 'belv' || D.A.y < 6) continue;
      const reach = r.float(0.8, 1.4);
      const spot = edgeSpot(D, (tip) => {
        const a = tip('A'), b = tip('B');
        const fa = floorAt('A', a.x, a.z, D.A.y - 0.2, undefined, 0.15).y, fb = floorAt('B', b.x, b.z, D.B.y - 0.2, undefined, 0.15).y;
        return D.A.y - fa > 2.2 && D.B.y - fb > 2.2 && !segBlocked('A', a.clone().setY(fa + 0.4), a.clone().setY(D.A.y - 0.3), [D], 0.15, 1.6);
      }, reach, r);
      if (!spot) continue;
      const { s } = spot;
      const yaw = Math.atan2(s.nx, s.nz); // local yaw that maps +z to the outward normal
      const M = rigidOn(D, s.lx, 0.004, s.lz, yaw, (D.mod?.delay ?? 1) + 0.3 + anim.float(0, 0.4));
      CUR = M.idx;
      const wc = jit(PAL.newPole, r, 0.06);
      box('wood', wc, 0.06, 0.95, 0.06, 0, 0, -0.05);
      box('wood', wc, 0.06, 0.06, reach + 0.15, 0, 0.95, reach / 2 - 0.05);
      rod('wood', wc, 0, 0.5, -0.03, 0, 0.93, reach * 0.55, 0.022, 4);
      cyl('zinc', PAL.iron, 0.07, 0.035, -0.0175, 0.88, reach, 10, 0, Math.PI / 2);
      const fa = floorAt('A', 0, 0, 0).y;
      void fa;
      const tipA = toW(D.A, s.lx + s.nx * reach, 0, s.lz + s.nz * reach), tipB = toW(D.B, s.lx + s.nx * reach, 0, s.lz + s.nz * reach);
      const B = newMod(3);
      CUR = B.idx;
      const basket = r.chance(0.35);
      if (basket) {
        ACC.wood.add(PBUCKET, mtx(0, 0, 0, 0.12, 0.16, 0.12), C(jit('#a8874f', r)), CUR);
        rod('wood', '#6d5532', -0.1, 0.16, 0, 0.1, 0.16, 0, 0.008, 3);
      } else {
        ACC.zinc.add(PBUCKET, mtx(0, 0, 0, 0.1, 0.17, 0.1), C(jit(r.pick(PAL.zinc), r)), CUR);
      }
      buckets.push({
        mod: B, parent: M, tip: new THREE.Vector3(0, 0.88, reach),
        floorA: floorAt('A', tipA.x, tipA.z, D.A.y - 0.2, undefined, 0.15).y,
        floorB: floorAt('B', tipB.x, tipB.z, D.B.y - 0.2, undefined, 0.15).y,
        period: r.float(8, 14), ph: r.float(0, 1), basket,
      });
    }
  }
  interface Rod { mod: Mod; parent: Mod; tip: V3; period: number; ph: number; amp: number; hookY: number }
  const rods: Rod[] = [];
  {
    const r = R.misc;
    const cands = decks.filter((d) => d.A.y >= 9 && d.role !== 'belv').sort((a, b) => b.A.y - a.A.y);
    for (const D of r.shuffle(cands)) {
      if (rods.length >= 14) break;
      const L = r.float(2.6, 3.9), ang = r.float(0.2, 0.45);
      const reach = 0.1 + L * Math.cos(ang);
      const spot = edgeSpot(D, (tip) => {
        for (const lay2 of ['A', 'B'] as const) {
          const p = tip(lay2);
          const P = lay(D, lay2);
          if (floorAt(lay2, p.x, p.z, P.y + 2, undefined, 0.3).y > 0) return false;
          if (segBlocked(lay2, p.clone().setY(0.4), p.clone().setY(P.y), [D], 0.2, 1.8)) return false;
        }
        return true;
      }, reach, r);
      if (!spot) continue;
      const { s } = spot;
      const yaw = Math.atan2(s.nx, s.nz);
      const M = rigidOn(D, s.lx, 0.004, s.lz, yaw, (D.mod?.delay ?? 1) + 0.3 + anim.float(0, 0.4));
      CUR = M.idx;
      box('wood', '#6b5a44', 0.05, 0.32, 0.05, 0, 0, -0.06);
      const tipY = 0.25 + L * Math.sin(ang), tipZ = reach;
      ACC.pole.add(PCYL(5, false, 0.35), segMtx(_mm, _a3.set(0, 0.22, -0.12), _b3.set(0, tipY, tipZ), 0.022), C(jit('#b89a5c', r)), CUR);
      cyl('wood', '#3c3632', 0.03, 0.05, 0, 0.3 + 0.11 * Math.sin(ang), 0.11 * Math.cos(ang) - 0.12, 8, Math.PI / 2 - ang);
      const H = newMod(3);
      CUR = H.idx;
      sph('wood', '#d2452d', 0.05, 0, 0.62, 0, 1.25);
      sph('wood', '#f2ece0', 0.032, 0, 0.67, 0);
      rod('zinc', '#3a3634', 0, 0.06, 0, 0, 0.0, 0, 0.012, 4);
      ACC.zinc.add(PSPH, mtx(0, 0.08, 0, 0.022, 0.03, 0.022), C('#4a4642'), CUR);
      rods.push({ mod: H, parent: M, tip: new THREE.Vector3(0, tipY, tipZ), period: r.float(4, 6), ph: r.float(0, Math.PI * 2), amp: r.float(0.02, 0.04), hookY: r.float(0.15, 0.3) });
    }
  }
  interface Crane { base: Mod; jib: Mod; load: Mod; pivot: V3; tip: V3; amp: number; period: number; ph: number; yaw0: number; rope: number }
  const cranes: Crane[] = [];
  for (const D of decks) {
    if (D.role !== 'crane') continue;
    const r = R.misc;
    const sp = freeSpot(D, 0.25, 0.25, 0.05, 20, r);
    if (!sp) continue;
    D.occ.push({ x: sp[0], z: sp[1], hw: 0.25, hd: 0.25 });
    const M = rigidOn(D, sp[0], 0.004, sp[1], r.angle(), (D.mod?.delay ?? 1) + 0.3 + anim.float(0, 0.4));
    CUR = M.idx;
    const tc = jit('#8a6a45', r, 0.05);
    const mastH = r.float(1.9, 2.3);
    for (const [x, z] of [[-0.22, -0.22], [0.22, -0.22], [0, 0.26]]) rod('wood', tc, x, 0, z, 0, 0.7, 0, 0.025, 4);
    box('wood', tc, 0.1, mastH, 0.1, 0, 0, 0);
    for (let k = 1; k < 7; k++) box('wood', K.shade(tc, 0.8), 0.14, 0.02, 0.02, 0, (k / 7) * mastH, 0.06);
    const J = newMod(3);
    CUR = J.idx;
    const jl = r.float(2.3, 2.7);
    const jibEnd = new THREE.Vector3(Math.cos(0.32) * jl, Math.sin(0.32) * jl + 0.12, 0);
    rod('wood', tc, 0, 0.12, 0, jibEnd.x, jibEnd.y, 0, 0.04, 5);
    rod('wood', tc, 0, 0.12, 0, -0.75, 0.05, 0, 0.035, 5);
    box('wood', '#6f6a62', 0.3, 0.25, 0.25, -0.8, -0.2, 0);
    box('wood', tc, 0.08, 0.5, 0.08, 0, 0, 0);
    rod('wood', PAL.rope, 0, 0.5, 0, jibEnd.x, jibEnd.y, 0, 0.008, 3);
    rod('wood', PAL.rope, 0, 0.5, 0, -0.75, 0.05, 0, 0.008, 3);
    cyl('zinc', PAL.iron, 0.06, 0.03, jibEnd.x, jibEnd.y - 0.06, -0.015, 8, Math.PI / 2);
    const Ld = newMod(3);
    CUR = Ld.idx;
    // a bundle of new bamboo on its way up: the city is still being superimposed
    for (let k = 0; k < 5; k++) {
      const ox = (k % 3) * 0.06 - 0.06, oy = Math.floor(k / 3) * 0.055;
      ACC.pole.add(PCYL(6), mtx(-0.75, -0.25 + oy, ox, 0.03, 1.5, 0.03, 0, 0, -Math.PI / 2), C(jit(PAL.newPole, r, 0.05)), CUR);
    }
    rod('wood', PAL.rope, -0.3, -0.2, 0, 0, 0, 0, 0.007, 3);
    rod('wood', PAL.rope, 0.3, -0.2, 0, 0, 0, 0, 0.007, 3);
    cranes.push({ base: M, jib: J, load: Ld, pivot: new THREE.Vector3(0, mastH, 0), tip: jibEnd, amp: r.float(0.35, 0.5), period: r.float(18, 28), ph: r.float(0, Math.PI * 2), yaw0: r.angle(), rope: r.float(1.2, 2.2) });
  }

  // ---- laundry lines with rags, flicking in the wind
  {
    const r = R.misc;
    let n = 0;
    for (const D of r.shuffle(decks.slice())) {
      if (n >= 12) break;
      if (D.role === 'belv' || D.w < 1.8) continue;
      const sp = freeSpot(D, 0.6, 0.06, 0.04, 14, r);
      if (!sp) continue;
      D.occ.push({ x: sp[0], z: sp[1], hw: 0.6, hd: 0.08 });
      const M = rigidOn(D, sp[0], 0.004, sp[1], r.chance(0.5) ? 0 : Math.PI, (D.mod?.delay ?? 1) + 0.3 + anim.float(0, 0.4));
      CUR = M.idx;
      const pc = jit('#7d6a4f', r);
      box('wood', pc, 0.03, 0.62, 0.03, -0.58, 0, 0);
      box('wood', pc, 0.03, 0.62, 0.03, 0.58, 0, 0);
      rod('wood', PAL.rope, -0.58, 0.58, 0, 0.58, 0.58, 0, 0.006, 3);
      const nr = r.int(3, 5);
      for (let k = 0; k < nr; k++) {
        const x = -0.45 + (k / Math.max(1, nr - 1)) * 0.9 + r.float(-0.04, 0.04);
        const rw = r.float(0.12, 0.22), rh = r.float(0.14, 0.3);
        ACC.cloth.add(PPL, mtx(x, 0.58 - rh / 2, 0, rw, rh, 1), C(jit(r.pick(PAL.rag), r, 0.05)), CUR, undefined, (_x0, y) => K.clamp(0.5 - y));
      }
      n++;
    }
  }

  // ============================================================ GPU module matrices
  const nMods = mods.length + 1;
  const rows = Math.ceil((nMods * 4) / 1024);
  const texData = new Float32Array(1024 * rows * 4);
  for (let i = 0; i < 1024 * rows; i++) {
    // identity everywhere by default
    const o = i * 4;
    const col = i % 4;
    texData[o + col] = 1;
  }
  const modTex = new THREE.DataTexture(texData, 1024, rows, THREE.RGBAFormat, THREE.FloatType);
  modTex.minFilter = THREE.NearestFilter;
  modTex.magFilter = THREE.NearestFilter;
  modTex.generateMipmaps = false;
  modTex.needsUpdate = true;
  const modTexU = { value: modTex };

  const extraMats: THREE.Material[] = [];
  for (const f of FINS) {
    const acc = ACC[f];
    if (acc.n === 0) continue;
    const geo = acc.geometry(f === 'cloth');
    const P = FIN_PARAMS[f];
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: P.r, metalness: P.m, side: f === 'cloth' ? THREE.DoubleSide : THREE.FrontSide });
    if (P.env) mat.envMapIntensity = P.env;
    const bands = f === 'pole', flut = f === 'cloth';
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uModTex = modTexU;
      sh.uniforms.uTime = K.U.time;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\n' + MOD_PARS + (flut ? FLU_PARS : '') + (bands ? 'varying float vBand; varying float vSeed;\n' : ''))
        .replace('#include <beginnormal_vertex>', MOD_NORMAL)
        .replace('#include <begin_vertex>', (flut ? FLU_BEGIN : MOD_BEGIN) + (bands ? 'vBand = position.y * length(zM[1].xyz); vSeed = fract(aMod * 0.6180339);\n' : ''));
      if (bands) {
        sh.fragmentShader = sh.fragmentShader
          .replace('#include <common>', '#include <common>\nvarying float vBand; varying float vSeed;\n')
          .replace('#include <color_fragment>', '#include <color_fragment>\n' + BAND_FRAG);
      }
    };
    mat.customProgramCacheKey = () => 'zenobia-mod-' + f;
    const depth = new THREE.MeshDepthMaterial();
    depth.onBeforeCompile = (sh) => {
      sh.uniforms.uModTex = modTexU;
      sh.uniforms.uTime = K.U.time;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\n' + MOD_PARS + (flut ? FLU_PARS : ''))
        .replace('#include <begin_vertex>', 'mat4 zM = zenMat(aMod);\n' + (flut ? FLU_BEGIN : MOD_BEGIN));
    };
    depth.customProgramCacheKey = () => 'zenobia-depth-' + f;
    extraMats.push(depth);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.customDepthMaterial = depth;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    mesh.name = 'zenobia:' + f;
    root.add(mesh);
  }

  // ---- matrix evaluation
  const _pp = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _h = new THREE.Vector3();
  const _qq = new THREE.Quaternion(), _qs = new THREE.Quaternion();
  const ONE = new THREE.Vector3(1, 1, 1);
  const swirlLift = (out: V3, ang: number, lift: number) => {
    if (ang !== 0) {
      const c = Math.cos(ang), s = Math.sin(ang);
      const x = out.x, z = out.z;
      out.x = x * c + z * s;
      out.z = -x * s + z * c;
    }
    out.y += lift;
  };
  const evalMod = (M: Mod, T: number) => {
    const s = K.clamp((T - M.delay) / M.dur);
    const e = s * s * s * (s * (s * 6 - 15) + 10);
    M.e = e;
    const k = Math.sin(Math.PI * e);
    if (M.kind === 0) {
      _pp.lerpVectors(M.pA, M.pB, e);
      swirlLift(_pp, M.swirl * k, M.lift * k);
      _qq.slerpQuaternions(M.qA, M.qB, e);
      if (M.swirl) _qq.premultiply(_qs.setFromAxisAngle(UP, M.swirl * k));
      if (M.tumble) _qq.multiply(_qs.setFromAxisAngle(M.axis, M.tumble * k));
      M.m.compose(_pp, _qq, ONE);
    } else if (M.kind === 1 || M.kind === 2) {
      _a.lerpVectors(M.aA, M.aB, e);
      swirlLift(_a, M.swirl * k, M.liftA * k);
      _b.lerpVectors(M.bA, M.bB, e);
      swirlLift(_b, M.swirl * k, M.lift * k);
      if (M.kind === 1) {
        _h.lerpVectors(M.hA, M.hB, e);
        if (_h.lengthSq() < 1e-4) _h.copy(AZ);
        _h.normalize();
        if (M.swirl) swirlLift(_h, M.swirl * k, 0);
        segMtx(M.m, _a, _b, 1, _h);
      } else spanMtx(M.m, _a, _b);
    }
    M.m.toArray(texData, M.idx * 16);
  };
  const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3();
  const evalBraces = () => {
    for (const B of braces) {
      _v1.set(0, B.t1, 0).applyMatrix4(B.s1.mod!.m);
      _v2.set(0, B.t2, 0).applyMatrix4(B.s2.mod!.m);
      segMtx(B.mod.m, _v1, _v2, 1, AZ);
      B.mod.m.toArray(texData, B.mod.idx * 16);
    }
  };
  const yawOf = (m: THREE.Matrix4) => Math.atan2(m.elements[8], m.elements[0]);

  // ============================================================ GROUND
  {
    const geo = new THREE.CircleGeometry(340, 120).rotateX(-Math.PI / 2);
    geo.deleteAttribute('uv');
    const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, metalness: 0 });
    const gu = {
      uGDark: { value: new THREE.Color('#ad7c4b') },
      uGLight: { value: new THREE.Color('#cf9e63') },
      uGCrack: { value: new THREE.Color('#5e4128') },
      uGBleach: { value: new THREE.Color('#ecd8ae') },
      uGPale: { value: new THREE.Color('#d9b583') },
    };
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, gu);
      sh.uniforms.uTime = K.U.time;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vGW;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vGW;\nuniform float uTime;\n' + K.GLSL_NOISE + GROUND_FN)
        .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = zenGround(vGW.xz);');
    };
    mat.customProgramCacheKey = () => 'zenobia-ground';
    const ground = new THREE.Mesh(geo, mat);
    ground.receiveShadow = true;
    ground.name = 'zenobia:ground';
    root.add(ground);
  }

  // stumps of older pilings on the bleached grid, rocks and dry tufts (static, they never move)
  {
    const b = new K.Batch();
    const r = R.misc;
    const ca = Math.cos((17 * Math.PI) / 180), sa = Math.sin((17 * Math.PI) / 180);
    const feet = stilts.flatMap((s) => [s.footA, s.footB]);
    for (let i = -5; i <= 5; i++) {
      for (let j = -5; j <= 5; j++) {
        if (!r.chance(0.3)) continue;
        const gx = i * 3.7, gz = j * 3.7;
        const x = ca * gx + sa * gz, z = -sa * gx + ca * gz;
        if (Math.hypot(x, z) > 17.5) continue;
        if (feet.some((f) => Math.hypot(f.x - x, f.z - z) < 0.35)) continue;
        const n = r.chance(0.3) ? 2 : 1;
        for (let k = 0; k < n; k++) {
          const h = r.float(0.06, 0.38);
          const rr = r.float(0.06, 0.1);
          b.add(K.at(K.cyl(rr * 0.9, rr, h, 7), x + k * 0.2, 0, z + k * 0.1, { rx: r.float(-0.12, 0.12), rz: r.float(-0.12, 0.12) }), K.jitter('#a29a8a', r, 0.01, 0.03, 0.05), 'wood');
        }
      }
    }
    for (let i = 0; i < 26; i++) {
      const [x, z] = r.inRing(15, 60);
      K.rock(b, { x, z, r: r.float(0.12, 0.45), color: '#9b7b58', rng: r, flat: 0.55 });
    }
    for (let i = 0; i < 70; i++) {
      const [x, z] = r.inRing(6, 70);
      if (feet.some((f) => Math.hypot(f.x - x, f.z - z) < 0.4)) continue;
      const h = r.float(0.12, 0.3);
      const tuft = K.wobble(K.sphere(h, 6, 4), h * 0.3, 4, r.float(0, 50));
      b.add(K.at(tuft, x, h * 0.25, z, { s: [1.2, 0.7, 1.2] }), K.jitter(r.pick(['#a08a55', '#8f7f52', '#b39a63']), r, 0.01, 0.05, 0.05), 'matte');
    }
    // a fallen ladder and loose planks in the dust under the city
    for (let i = 0; i < 9; i++) {
      const [x, z] = r.inDisc(10);
      if (feet.some((f) => Math.hypot(f.x - x, f.z - z) < 1.2)) continue;
      const ry = r.angle();
      b.add(K.at(K.box(r.float(0.9, 1.8), 0.035, 0.18), x, 0, z, { ry }), K.jitter(PAL.oldPlank, r), 'wood');
    }
    root.add(b.build({ name: 'zenobia:dust' }));
  }

  // ============================================================ PEOPLE
  interface Person { mod: Mod; kind: 0 | 1 | 2; lx: number; ly: number; lz: number; yaw: number; speed: number; ph: number; range: number; side: number }
  const people: Person[] = [];
  {
    const r = R.misc;
    for (const D of r.shuffle(decks.slice())) {
      if (people.length >= 38) break;
      const sp = freeSpot(D, 0.1, 0.1, 0.05, 10, r);
      if (!sp) continue;
      people.push({ mod: D.mod!, kind: 0, lx: sp[0], ly: 0, lz: sp[1], yaw: r.angle(), speed: r.chance(0.4) ? r.float(0.05, 0.12) : 0, ph: r.float(0, 10), range: r.float(0.1, 0.35), side: 0 });
    }
    for (const B of belvs) {
      if (r.chance(0.55)) people.push({ mod: B.mod, kind: 0, lx: r.float(-0.25, 0.25), ly: 0.06, lz: r.float(-0.25, 0.25), yaw: r.angle(), speed: 0, ph: 0, range: 0, side: 0 });
    }
    for (const W of walks) {
      if (r.chance(0.3)) continue;
      const n = r.chance(0.3) ? 2 : 1;
      for (let k = 0; k < n; k++) people.push({ mod: W.mod!, kind: 1, lx: r.float(-0.1, 0.1), ly: W.sag, lz: 0, yaw: 0, speed: r.float(0.05, 0.09) * r.sign(), ph: r.float(0, 1), range: 0, side: 0 });
    }
    for (const L of r.shuffle(ladders.slice())) {
      if (people.filter((p) => p.kind === 2).length >= 9) break;
      people.push({ mod: L.mod!, kind: 2, lx: 0, ly: 0, lz: -0.09, yaw: 0, speed: r.float(0.05, 0.08), ph: r.float(0, 1), range: 0, side: 0 });
    }
  }
  const pal = PAL.people.map((c) => new THREE.Color(c));
  const personMesh = K.instanced(K.personGeometry(0.25), K.figureMaterial(), people.length, (i, _o, c) => {
    c.copy(pal[i % pal.length]);
  });
  personMesh.name = 'zenobia:people';
  root.add(personMesh);
  const setPerson = K.instanceSetter(personMesh);

  // ============================================================ LINES (fishing lines, pulley ropes, crane ropes)
  const nLines = rods.length + buckets.length + cranes.length;
  const linePos = new Float32Array(nLines * 6);
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
  const lineMat = new THREE.LineBasicMaterial({ color: '#3a2f27', transparent: true, opacity: 0.85 });
  const lineMesh = new THREE.LineSegments(lineGeo, lineMat);
  lineMesh.frustumCulled = false;
  lineMesh.name = 'zenobia:lines';
  root.add(lineMesh);

  // ============================================================ DREAM CLOTH (exists only in the dreamed arrangement)
  const clothPos: number[] = [], clothNrm: number[] = [], clothCol: number[] = [], clothAnc: number[] = [], clothFlu: number[] = [], clothSeed: number[] = [];
  const pushTri = (a: V3, b: V3, c: V3, col: THREE.Color, fa: number, fb: number, fc: number, anc: V3, seed: number) => {
    const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize();
    for (const [p, f] of [[a, fa], [b, fb], [c, fc]] as [V3, number][]) {
      clothPos.push(p.x, p.y, p.z);
      clothNrm.push(n.x, n.y, n.z);
      clothCol.push(col.r, col.g, col.b);
      clothAnc.push(anc.x, anc.y, anc.z);
      clothFlu.push(f);
      clothSeed.push(seed);
    }
  };
  const clothPal = PAL.cloth.map((c) => new THREE.Color(c));
  const dreamR = R.dream;
  // pennant string between two points
  const pennants = (a: V3, b: V3, sag: number, seed: number) => {
    const L = a.distanceTo(b);
    const n = Math.max(4, Math.round(L / 0.32));
    const side = new THREE.Vector3().subVectors(b, a).cross(UP).normalize().multiplyScalar(0.012);
    const pt = (t: number) => new THREE.Vector3().lerpVectors(a, b, t).add(new THREE.Vector3(0, -sag * 4 * t * (1 - t), 0));
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n;
      const p0 = pt(t0), p1 = pt(t1);
      // the string itself (thin ribbon)
      const sc = clothPal[3];
      pushTri(p0.clone().add(side), p1.clone().add(side), p1.clone().sub(side), sc, 0, 0, 0, a, seed);
      pushTri(p0.clone().add(side), p1.clone().sub(side), p0.clone().sub(side), sc, 0, 0, 0, a, seed);
      // the flag
      const q0 = pt(t0 + 0.12 / n), q1 = pt(t1 - 0.12 / n);
      const tip = pt((t0 + t1) / 2).add(new THREE.Vector3(0, -0.19, 0)).addScaledVector(WIND, 0.04);
      const col = clothPal[(i + seed) % 4];
      const anc = q0.clone().lerp(q1, 0.5);
      pushTri(q0, q1, tip, col, 0, 0, 1, anc, seed + t0 * 0.6);
    }
  };
  // a ribbon streaming from a point
  const ribbon = (a: V3, len: number, w: number, col: THREE.Color, seed: number, droop = 0.35) => {
    const n = 14;
    const side = new THREE.Vector3().crossVectors(WIND, UP).normalize();
    let prev = a.clone();
    for (let i = 0; i < n; i++) {
      const t1 = (i + 1) / n;
      const p1 = a.clone().addScaledVector(WIND, len * t1).add(new THREE.Vector3(0, -droop * len * t1 * t1, 0));
      const w0 = w * (1 - (i / n) * 0.4), w1 = w * (1 - t1 * 0.4);
      const sideA = new THREE.Vector3(0, 1, 0).multiplyScalar(w0 / 2), sideB = new THREE.Vector3(0, 1, 0).multiplyScalar(w1 / 2);
      void side;
      pushTri(prev.clone().add(sideA), p1.clone().add(sideB), p1.clone().sub(sideB), col, i / n, t1, t1, a, seed);
      pushTri(prev.clone().add(sideA), p1.clone().sub(sideB), prev.clone().sub(sideA), col, i / n, t1, i / n, a, seed);
      prev = p1;
    }
  };
  // a banner hanging from a deck edge
  const banner = (top: V3, along: V3, w: number, h: number, col: THREE.Color, seed: number) => {
    const nx = 2, ny = 4;
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const p = (u: number, v: number) => top.clone().addScaledVector(along, (u - 0.5) * w).add(new THREE.Vector3(0, -v * h, 0));
        const u0 = i / nx, u1 = (i + 1) / nx, v0 = j / ny, v1 = (j + 1) / ny;
        const c = j === ny - 1 && i % 2 === 0 ? clothPal[3] : col;
        pushTri(p(u0, v0), p(u1, v0), p(u1, v1), c, v0, v0, v1, top, seed);
        pushTri(p(u0, v0), p(u1, v1), p(u0, v1), c, v0, v1, v1, top, seed);
      }
    }
  };
  {
    // crown: pennants around the ring of belvederes, ribbons from every cone
    const bl = belvs.slice().sort((p, q) => Math.atan2(p.D.B.z, p.D.B.x) - Math.atan2(q.D.B.z, q.D.B.x));
    bl.forEach((B, i) => {
      const N = bl[(i + 1) % bl.length];
      const eave = (X: typeof B) => toW(X.D.B, 0, X.mod ? 1.2 : 1.2, 0);
      const a = eave(B), b = eave(N);
      pennants(a, b, 0.35, i);
      const apex = toW(B.D.B, 0, B.roofY + 0.5, 0);
      for (let k = 0; k < 3; k++) ribbon(apex.clone().add(new THREE.Vector3(0, -k * 0.06, 0)), dreamR.float(2.2, 3.6), 0.07, clothPal[(i + k) % 4], 0.2 + k * 0.1, dreamR.float(0.2, 0.4));
    });
    // maypole streamers: from the crown down to decks along the arms
    const armDecks = decks.filter((d) => d.arm >= 0);
    bl.forEach((B, i) => {
      const apex = toW(B.D.B, 0, B.roofY + 0.3, 0);
      const targets = armDecks.filter((d) => Math.hypot(d.B.x - B.D.B.x, d.B.z - B.D.B.z) > 3 && Math.hypot(d.B.x - B.D.B.x, d.B.z - B.D.B.z) < 9);
      if (!targets.length) return;
      const T = targets[(i * 7) % targets.length];
      pennants(apex, toW(T.B, 0, 0.25, 0), 0.6, i + 2);
    });
    // pennants above every dreamed walkway
    for (const W of walks) pennants(W.aB.clone().add(new THREE.Vector3(0, 0.48, 0)), W.bB.clone().add(new THREE.Vector3(0, 0.48, 0)), W.sag + 0.1, Math.floor(dreamR.float(0, 4)));
    // banners on outward deck edges
    let nb = 0;
    for (const D of dreamR.shuffle(decks.filter((d) => d.arm >= 0))) {
      if (nb >= 36) break;
      const outward = new THREE.Vector3(D.B.x, 0, D.B.z).normalize();
      const e = edgeToward(D.B, D, D.B.x + outward.x * 50, D.B.z + outward.z * 50);
      const top = toW(D.B, e.lx, 0.0, e.lz).addScaledVector(outward, 0.04);
      const along = new THREE.Vector3().crossVectors(UP, outward).normalize();
      for (const off of [-0.5, 0.5]) {
        banner(top.clone().addScaledVector(along, off * Math.min(1.2, D.w * 0.5)), along, 0.3, dreamR.float(0.7, 1.1), clothPal[(nb + (off > 0 ? 1 : 0)) % 3], 0.3 + dreamR.float(0, 0.5));
      }
      nb++;
    }
    // ribbons tied to the crane jibs and fishing poles of the dream
    for (const S of dreamR.shuffle(stilts.slice()).slice(0, 28)) ribbon(S.topB.clone().add(new THREE.Vector3(0, -0.1, 0)), dreamR.float(1.0, 1.9), 0.055, clothPal[Math.floor(dreamR.float(0, 4))], 0.4 + dreamR.float(0, 0.4), 0.5);
  }
  const clothGeo = new THREE.BufferGeometry();
  clothGeo.setAttribute('position', new THREE.Float32BufferAttribute(clothPos, 3));
  clothGeo.setAttribute('normal', new THREE.Float32BufferAttribute(clothNrm, 3));
  clothGeo.setAttribute('color', new THREE.Float32BufferAttribute(clothCol, 3));
  clothGeo.setAttribute('aAnc', new THREE.Float32BufferAttribute(clothAnc, 3));
  clothGeo.setAttribute('aFlu', new THREE.Float32BufferAttribute(clothFlu, 1));
  clothGeo.setAttribute('aSeed', new THREE.Float32BufferAttribute(clothSeed, 1));
  const reveal = { value: 0 };
  const clothMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide });
  clothMat.onBeforeCompile = (sh) => {
    sh.uniforms.uReveal = reveal;
    sh.uniforms.uTime = K.U.time;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 aAnc; attribute float aFlu; attribute float aSeed; uniform float uReveal; uniform float uTime;')
      .replace('#include <begin_vertex>', /* glsl */ `
        float rv = clamp(uReveal * 1.6 - aSeed * 0.6, 0.0, 1.0);
        rv = rv * rv * (3.0 - 2.0 * rv);
        vec3 transformed = mix(aAnc, position, rv);
        float ph = dot(position, vec3(1.7, 0.9, 1.3)) + aSeed * 13.0;
        float wv = sin(uTime * 6.2 - aFlu * 5.0 + ph) * 0.7 + sin(uTime * 10.3 + ph * 1.9) * 0.3;
        transformed += (normal * wv * 0.09 + vec3(0.0, wv * 0.04, 0.0)) * aFlu * rv;
      `);
  };
  clothMat.customProgramCacheKey = () => 'zenobia-dreamcloth';
  const clothMesh = new THREE.Mesh(clothGeo, clothMat);
  clothMesh.frustumCulled = false;
  clothMesh.visible = false;
  clothMesh.name = 'zenobia:dreamcloth';
  root.add(clothMesh);

  // honey light and sky for the dream
  const honey = new THREE.DirectionalLight('#ffbf6a', 0);
  honey.position.set(-60, 45, -30);
  root.add(honey, honey.target);
  const tintMat = new THREE.MeshBasicMaterial({ color: '#ffb547', transparent: true, opacity: 0, side: THREE.BackSide, depthWrite: false, fog: false });
  const tint = new THREE.Mesh(new THREE.SphereGeometry(240, 32, 16), tintMat);
  tint.visible = false;
  tint.name = 'zenobia:honeysky';
  root.add(tint);
  const motes = K.particles({ count: low ? 120 : 260, radius: 20, y0: 2, y1: 30, color: '#ffe09a', colors: ['#fff1c4', '#ffc46a'], size: 0.12, opacity: 0, velocity: [0.15, 0.35, 0.05], swirl: 0.8, twinkle: 0.7, rng: R.misc.fork('motes') });
  root.add(motes);
  const motesMat = motes.material as THREE.ShaderMaterial;

  // ============================================================ ATMOSPHERE: dust, a dust devil, birds
  root.add(K.particles({ count: low ? 260 : 520, radius: 32, y0: 0.05, y1: 5, color: '#f1dcb0', colors: ['#e6c48f', '#fff0d0'], size: 0.07, opacity: 0.4, velocity: [1.1, 0.04, 0.38], swirl: 0.35, twinkle: 0.4, rng: R.misc.fork('dust') }));
  root.add(K.particles({ count: low ? 80 : 160, radius: 28, y0: 3, y1: 22, color: '#f6e2b8', size: 0.05, opacity: 0.3, velocity: [0.6, 0.02, 0.2], swirl: 0.8, twinkle: 0.6, rng: R.misc.fork('haze') }));
  const devilC = { value: new THREE.Vector3(-20, 0, -4) };
  {
    const n = low ? 220 : 460;
    const r = R.misc.fork('devil');
    const pos = new Float32Array(n * 3), h = new Float32Array(n), a = new Float32Array(n), rr = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      h[i] = r.next();
      a[i] = r.angle();
      rr[i] = r.float(0.6, 1.25);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aH', new THREE.BufferAttribute(h, 1));
    geo.setAttribute('aA', new THREE.BufferAttribute(a, 1));
    geo.setAttribute('aR', new THREE.BufferAttribute(rr, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: K.U.time, uC: devilC, uScale: { value: 600 }, uCol: { value: new THREE.Color('#d8b07a') } },
      vertexShader: /* glsl */ `
        attribute float aH; attribute float aA; attribute float aR;
        uniform float uTime, uScale; uniform vec3 uC;
        varying float vA;
        void main() {
          float h = fract(aH + uTime * 0.06);
          float ang = aA + uTime * (2.2 + 2.0 * (1.0 - h));
          float r = (0.12 + h * h * 2.2) * aR;
          vec3 p = uC + vec3(cos(ang) * r, h * 9.0, sin(ang) * r);
          p.x += sin(h * 2.5 + uTime * 0.7) * 0.6 * h;
          p.z += cos(h * 2.1 + uTime * 0.5) * 0.4 * h;
          vA = smoothstep(0.0, 0.06, h) * (1.0 - smoothstep(0.45, 1.0, h));
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = (0.25 + h * 0.9) * aR * uScale / max(0.001, -mv.z);
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uCol; varying float vA;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.05, d);
          gl_FragColor = vec4(uCol, a * vA * 0.22);
        }`,
      transparent: true,
      depthWrite: false,
    });
    const devil = new THREE.Points(geo, mat);
    devil.frustumCulled = false;
    devil.onBeforeRender = (renderer) => {
      const hh = renderer.getRenderTarget()?.height ?? renderer.domElement.height;
      mat.uniforms.uScale.value = hh * 0.9;
    };
    devil.name = 'zenobia:devil';
    root.add(devil);
  }
  const flock = new K.Flock({ count: 7, center: [2, 0, -2], radius: 15, height: 25, color: '#3a2f27', span: 0.55, speed: 0.16, rng: R.misc.fork('birds') });
  root.add(flock.mesh);

  // ============================================================ ANIMATION
  const tog = new K.Toggle(1 / TOTAL);
  let lastT = -1;
  const _w = new THREE.Vector3(), _w2 = new THREE.Vector3(), _mq = new THREE.Matrix4(), _mr = new THREE.Matrix4();
  let li = 0;
  const line = (a: V3, b: V3) => {
    linePos[li++] = a.x;
    linePos[li++] = a.y;
    linePos[li++] = a.z;
    linePos[li++] = b.x;
    linePos[li++] = b.y;
    linePos[li++] = b.z;
  };
  const update = (t: number, dt: number) => {
    tog.update(dt);
    const T = tog.raw * TOTAL;
    if (T !== lastT) {
      for (const M of mods) if (M.kind !== 3) evalMod(M, T);
      evalBraces();
      lastT = T;
    }
    li = 0;
    // weather vanes swing in the gusts
    for (const V of vanes) {
      _w.set(V.lx, V.ly, V.lz).applyMatrix4(V.parent.m);
      const ang = WIND_YAW + 0.35 * Math.sin(t * 0.7 + V.ph) + 0.18 * Math.sin(t * 2.3 + V.ph * 2.0) + 0.08 * Math.sin(t * 5.1 + V.ph);
      _qq.setFromAxisAngle(UP, ang);
      V.mod.m.compose(_w, _qq, ONE);
      V.mod.m.toArray(texData, V.mod.idx * 16);
    }
    // buckets ride the pulleys
    for (const B of buckets) {
      _w.copy(B.tip).applyMatrix4(B.parent.m);
      const floor = K.lerp(B.floorA, B.floorB, B.parent.e < 0 ? 0 : B.parent.e) + 0.05;
      const span = Math.max(0.3, _w.y - 0.3 - floor);
      const p = K.fract(t / B.period + B.ph);
      const k = p < 0.35 ? K.smoothstep(0, 0.35, p) : p < 0.5 ? 1 : p < 0.85 ? 1 - K.smoothstep(0.5, 0.85, p) : 0;
      const drop = 0.25 + k * span;
      _w2.set(_w.x + Math.sin(t * 1.3 + B.ph * 6) * 0.02, _w.y - drop, _w.z);
      _qq.setFromAxisAngle(UP, B.ph * 6 + t * 0.2);
      B.mod.m.compose(_w2, _qq, ONE);
      B.mod.m.toArray(texData, B.mod.idx * 16);
      line(_w, _w2.clone().add(new THREE.Vector3(0, B.basket ? 0.16 : 0.17, 0)));
    }
    // fishing lines sway like slow pendulums, hooks skimming the dust
    for (const F of rods) {
      _w.copy(F.tip).applyMatrix4(F.parent.m);
      const L = Math.max(0.5, _w.y - F.hookY);
      const th = F.amp * Math.sin((t * Math.PI * 2) / F.period + F.ph) + 0.012;
      const th2 = F.amp * 0.4 * Math.sin((t * Math.PI * 2) / (F.period * 1.37) + F.ph * 2.0);
      _w2.set(_w.x + WIND.x * Math.sin(th) * L - WIND.z * Math.sin(th2) * L, _w.y - L * Math.cos(th) * Math.cos(th2), _w.z + WIND.z * Math.sin(th) * L + WIND.x * Math.sin(th2) * L);
      F.mod.m.makeTranslation(_w2.x, _w2.y, _w2.z);
      F.mod.m.toArray(texData, F.mod.idx * 16);
      line(_w, _w2.clone().add(new THREE.Vector3(0, 0.06, 0)));
    }
    // cranes slew slowly, a bundle of bamboo swinging under the jib
    for (const Cr of cranes) {
      const slew = Cr.yaw0 + Cr.amp * Math.sin((t * Math.PI * 2) / Cr.period + Cr.ph);
      _mq.makeRotationY(slew);
      _mr.makeTranslation(Cr.pivot.x, Cr.pivot.y, Cr.pivot.z);
      Cr.jib.m.copy(Cr.base.m).multiply(_mr).multiply(_mq);
      Cr.jib.m.toArray(texData, Cr.jib.idx * 16);
      _w.copy(Cr.tip).setY(Cr.tip.y - 0.08).applyMatrix4(Cr.jib.m);
      const rope = Cr.rope + 0.3 * Math.sin(t * 0.21 + Cr.ph);
      _w2.set(_w.x + Math.sin(t * 0.9 + Cr.ph) * 0.05, _w.y - rope, _w.z + Math.cos(t * 0.7 + Cr.ph) * 0.05);
      _qq.setFromAxisAngle(UP, slew + yawOf(Cr.base.m) + Math.sin(t * 0.4) * 0.1);
      Cr.load.m.compose(_w2, _qq, ONE);
      Cr.load.m.toArray(texData, Cr.load.idx * 16);
      line(_w, _w2);
    }
    lineGeo.attributes.position.needsUpdate = true;
    modTex.needsUpdate = true;

    // people: standing, strolling on their decks, crossing walkways, climbing ladders
    for (let i = 0; i < people.length; i++) {
      const P = people[i];
      const m = P.mod.m;
      if (P.kind === 0) {
        const off = P.speed ? Math.sin(t * P.speed * 6 + P.ph) * P.range : 0;
        _w.set(P.lx + off, P.ly, P.lz).applyMatrix4(m);
        setPerson(i, _w.x, _w.y, _w.z, yawOf(m) + P.yaw + (P.speed ? (Math.cos(t * P.speed * 6 + P.ph) > 0 ? Math.PI / 2 : -Math.PI / 2) : 0));
      } else if (P.kind === 1) {
        const z = 0.06 + 0.88 * K.pingpong(t * Math.abs(P.speed) + P.ph * 2, 1);
        const sag = -P.ly * 4 * z * (1 - z);
        _w.set(P.lx, sag, z).applyMatrix4(m);
        const dir = Math.cos(Math.PI * (t * Math.abs(P.speed) + P.ph * 2)) >= 0 ? 0 : Math.PI;
        _w2.set(0, 0, 1).transformDirection(m);
        setPerson(i, _w.x, _w.y, _w.z, Math.atan2(_w2.x, _w2.z) + dir);
      } else {
        const s = 0.04 + 0.8 * K.pingpong(t * P.speed + P.ph * 2, 1);
        _w.set(0, s, P.lz).applyMatrix4(m);
        _w2.set(0, 0, 1).transformDirection(m);
        setPerson(i, _w.x, _w.y - 0.12, _w.z, Math.atan2(_w2.x, _w2.z));
      }
    }
    setPerson.done();

    // the dream: cloth, honey light, golden motes
    const dream = K.smoothstep(0.82, 1, tog.raw);
    reveal.value = dream;
    clothMesh.visible = dream > 0.001;
    const warm = K.smoothstep(0.4, 1, tog.raw);
    honey.intensity = warm * 1.4;
    tintMat.opacity = warm * 0.3;
    tint.visible = warm > 0.001;
    motesMat.uniforms.uOpacity.value = warm * 0.85;

    // the dust devil wanders across the plain
    devilC.value.set(-21 + Math.sin(t * 0.045) * 7, 0, -3 + Math.sin(t * 0.07 + 1) * 5);
    flock.update(t);
  };
  update(0, 0);

  // camera: a low three-quarter view from the south-west, looking up at the pilings
  const fishView = rods.length ? (() => {
    const F = rods.reduce((best, f) => {
      const p = f.tip.clone().applyMatrix4(f.parent.m);
      const bp = best.tip.clone().applyMatrix4(best.parent.m);
      return p.x - p.z < bp.x - bp.z ? f : best;
    }, rods[0]);
    const p = F.tip.clone().applyMatrix4(F.parent.m);
    return { position: [p.x - 3.6, 1.1, p.z + 4.6] as [number, number, number], target: [p.x + 0.4, 3.2, p.z - 0.5] as [number, number, number] };
  })() : { position: [-6, 1.5, 10] as [number, number, number], target: [0, 4, 0] as [number, number, number] };

  return {
    root,
    env: {
      skyTop: '#3b74a3',
      skyHorizon: '#f0d3a0',
      skyBottom: '#d9b98a',
      skyCurve: 0.5,
      fog: '#e2c391',
      fogNear: 60,
      fogFar: 175,
      sunDir: [-0.74, 0.42, -0.52],
      sunColor: '#ffd59c',
      sunIntensity: 3.1,
      sunDisc: 1,
      sunGlow: 1.2,
      hemiSky: '#a7bfd4',
      hemiGround: '#c49a62',
      hemiIntensity: 0.7,
      envIntensity: 0.6,
      clouds: 0.12,
      cloudColor: '#fff2dc',
      bloomStrength: 0.35,
      bloomThreshold: 0.9,
      bloomRadius: 0.5,
      tiltShift: 0.3,
      vignette: 0.32,
      grain: 0.035,
      saturation: 1.06,
      contrast: 1.07,
      shadowRadius: 27,
    },
    camera: {
      position: [-31, 7.5, 34],
      target: [0, 9.5, 0],
      fov: 40,
      minDistance: 10,
      maxDistance: 110,
      maxPolar: 1.64,
      autoRotate: 0.25,
      views: [
        { position: [27, 31, 33], target: [0, 7, 0] },
        fishView,
      ],
    },
    interaction: {
      label: 'Dream a happy life',
      activeLabel: 'Wake in Zenobia',
      hint: 'The happy city they picture: the same poles, barrels and stairs, rearranged and hung with ribbons.',
      set: (on) => tog.set(on),
      camera: { position: [-40, 16, 46], target: [0, 12, 0] },
    },
    update,
    dispose() {
      modTex.dispose();
      for (const m of extraMats) m.dispose();
    },
  };
};

export default build;
