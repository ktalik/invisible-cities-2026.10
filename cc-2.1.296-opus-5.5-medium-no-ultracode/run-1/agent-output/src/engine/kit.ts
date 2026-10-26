import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// A small procedural construction kit. Every city is assembled from primitives that
// are colored per vertex and merged by material, so a whole city costs a few draw calls.

export type Kind = 'solid' | 'metal' | 'glow' | 'glass' | 'ghost' | 'water' | 'cloth' | 'gold';
export type Col = THREE.ColorRepresentation;

export interface Materials {
  solid: THREE.MeshStandardMaterial;
  metal: THREE.MeshStandardMaterial;
  gold: THREE.MeshStandardMaterial;
  cloth: THREE.MeshStandardMaterial;
  glass: THREE.MeshStandardMaterial;
  water: THREE.MeshStandardMaterial;
  glow: THREE.MeshBasicMaterial;
  ghost: THREE.MeshBasicMaterial;
  line: THREE.LineBasicMaterial;
  points: THREE.PointsMaterial;
}

let dotTexture: THREE.Texture | null = null;
export function getDotTexture(): THREE.Texture {
  if (dotTexture) return dotTexture;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.25, 'rgba(255,255,255,0.85)');
  grd.addColorStop(0.6, 'rgba(255,255,255,0.18)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  dotTexture = new THREE.CanvasTexture(c);
  dotTexture.colorSpace = THREE.SRGBColorSpace;
  return dotTexture;
}

export function makeMaterials(): Materials {
  return {
    solid: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.84, metalness: 0.02 }),
    metal: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.26, metalness: 0.92 }),
    gold: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 1, emissive: 0x3a2508, emissiveIntensity: 0.6 }),
    cloth: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, side: THREE.DoubleSide }),
    glass: new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 0.06, metalness: 0.4, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide,
    }),
    water: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.12, metalness: 0.45, transparent: true, opacity: 0.92 }),
    glow: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
    ghost: new THREE.MeshBasicMaterial({
      vertexColors: true, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide,
    }),
    line: new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85, toneMapped: false }),
    points: new THREE.PointsMaterial({
      vertexColors: true, size: 0.5, sizeAttenuation: true, transparent: true, depthWrite: false, map: getDotTexture(), blending: THREE.AdditiveBlending, toneMapped: false,
    }),
  };
}

let SHARED: Materials | null = null;
export function sharedMaterials(): Materials {
  if (!SHARED) SHARED = makeMaterials();
  return SHARED;
}

function cloneMaterials(m: Materials): Materials {
  const o: any = {};
  for (const k of Object.keys(m)) o[k] = (m as any)[k].clone();
  return o as Materials;
}

// ---------------------------------------------------------------- base geometries
const cache = new Map<string, THREE.BufferGeometry>();
function cached(key: string, make: () => THREE.BufferGeometry) {
  let g = cache.get(key);
  if (!g) {
    g = make();
    cache.set(key, g);
  }
  return g;
}

const unitBox = () => cached('box', () => new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0));
const unitCyl = (seg: number, rt: number, open: boolean) =>
  cached(`cyl${seg}_${rt}_${open}`, () => new THREE.CylinderGeometry(rt, 1, 1, seg, 1, open).translate(0, 0.5, 0));
const unitCone = (seg: number) => cached(`cone${seg}`, () => new THREE.ConeGeometry(1, 1, seg).translate(0, 0.5, 0));
const unitSphere = (seg: number) => cached(`sph${seg}`, () => new THREE.SphereGeometry(1, seg, Math.max(3, Math.round(seg * 0.6))));
const unitDome = (seg: number) =>
  cached(`dome${seg}`, () => new THREE.SphereGeometry(1, seg, Math.max(3, Math.round(seg / 3)), 0, Math.PI * 2, 0, Math.PI / 2));
const unitPrism = () =>
  cached('prism', () => {
    const s = new THREE.Shape();
    s.moveTo(-0.5, 0);
    s.lineTo(0.5, 0);
    s.lineTo(0, 1);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false });
    g.translate(0, 0, -0.5);
    return g;
  });
const unitPyramid = () => cached('pyr', () => new THREE.ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4).translate(0, 0.5, 0));
const unitPlane = () => cached('plane', () => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2));
const unitCircle = (seg: number) => cached(`circ${seg}`, () => new THREE.CircleGeometry(1, seg).rotateX(-Math.PI / 2));

// ---------------------------------------------------------------- helpers
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _c = new THREE.Color();

export interface Xf {
  ry?: number;
  rx?: number;
  rz?: number;
  kind?: Kind;
}

export function mat(x: number, y: number, z: number, sx: number, sy: number, sz: number, rx = 0, ry = 0, rz = 0) {
  _e.set(rx, ry, rz, 'YXZ');
  _q.setFromEuler(_e);
  _p.set(x, y, z);
  _s.set(sx, sy, sz);
  return new THREE.Matrix4().compose(_p, _q, _s);
}

export function rngFrom(seed: number) {
  let a = seed >>> 0 || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export type Updater = (t: number, dt: number) => void;

/** Where the viewer is, updated by the main loop, for cities that change with the beholder. */
export const VIEW = { cam: new THREE.Vector3(), target: new THREE.Vector3() };

export interface HouseOpts {
  y?: number;
  ry?: number;
  wall?: Col;
  roof?: Col;
  roofType?: 'gable' | 'hip' | 'flat' | 'dome' | 'cone' | 'none';
  roofH?: number;
  win?: Col | false;
  lit?: number; // fraction of lit windows
  kind?: Kind;
  roofKind?: Kind;
}

// ---------------------------------------------------------------- the builder
export class B {
  group = new THREE.Group();
  mats: Materials;
  rng: () => number;
  /** optional transform applied to every color added through this builder */
  tint: ((c: THREE.Color) => void) | null = null;
  updaters: Updater[] = [];
  children: B[] = [];
  private bins = new Map<Kind, THREE.BufferGeometry[]>();
  private linePos: number[] = [];
  private lineCol: number[] = [];
  private ptsPos: number[] = [];
  private ptsCol: number[] = [];
  private ptsSize = 0.5;
  meshes: Partial<Record<Kind, THREE.Mesh>> = {};
  lines: THREE.LineSegments | null = null;
  points: THREE.Points | null = null;

  constructor(rng: () => number, mats?: Materials) {
    this.rng = rng;
    this.mats = mats ?? sharedMaterials();
  }

  /** Child builder whose group can be animated independently. */
  sub(opts: { unique?: boolean; x?: number; y?: number; z?: number } = {}): B {
    const c = new B(this.rng, opts.unique ? cloneMaterials(this.mats) : this.mats);
    c.tint = this.tint;
    c.group.position.set(opts.x ?? 0, opts.y ?? 0, opts.z ?? 0);
    this.children.push(c);
    this.group.add(c.group);
    return c;
  }

  on(fn: Updater) {
    this.updaters.push(fn);
  }

  // random helpers
  r(a = 1, b?: number) {
    return b === undefined ? this.rng() * a : a + this.rng() * (b - a);
  }
  ri(a: number, b: number) {
    return Math.floor(this.r(a, b + 1));
  }
  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.rng() * arr.length)];
  }
  chance(p: number) {
    return this.rng() < p;
  }
  jit(color: Col, h = 0.02, s = 0.06, l = 0.06): THREE.Color {
    const c = new THREE.Color(color);
    c.offsetHSL((this.rng() - 0.5) * h * 2, (this.rng() - 0.5) * s * 2, (this.rng() - 0.5) * l * 2);
    return c;
  }

  // ------------------------------------------------------------ core add
  add(geo: THREE.BufferGeometry, m: THREE.Matrix4, color: Col, kind: Kind = 'solid', intensity = 1) {
    let g = geo.clone();
    g.applyMatrix4(m);
    if (!g.index) {
      const n = g.attributes.position.count;
      const idx = new Array(n);
      for (let i = 0; i < n; i++) idx[i] = i;
      g.setIndex(idx);
    }
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    if (!g.attributes.normal) g.computeVertexNormals();
    _c.set(color);
    if (this.tint) this.tint(_c);
    const n = g.attributes.position.count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      arr[i * 3] = _c.r * intensity;
      arr[i * 3 + 1] = _c.g * intensity;
      arr[i * 3 + 2] = _c.b * intensity;
    }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    let bin = this.bins.get(kind);
    if (!bin) this.bins.set(kind, (bin = []));
    bin.push(g);
    return g;
  }

  // ------------------------------------------------------------ primitives (y = base unless noted)
  box(x: number, y: number, z: number, w: number, h: number, d: number, color: Col, o: Xf & { i?: number } = {}) {
    return this.add(unitBox(), mat(x, y, z, w, h, d, o.rx ?? 0, o.ry ?? 0, o.rz ?? 0), color, o.kind, o.i ?? 1);
  }
  cyl(x: number, y: number, z: number, r: number, h: number, color: Col, o: Xf & { rt?: number; seg?: number; open?: boolean; i?: number } = {}) {
    const g = unitCyl(o.seg ?? 12, o.rt ?? 1, !!o.open);
    return this.add(g, mat(x, y, z, r, h, r, o.rx ?? 0, o.ry ?? 0, o.rz ?? 0), color, o.kind, o.i ?? 1);
  }
  cone(x: number, y: number, z: number, r: number, h: number, color: Col, o: Xf & { seg?: number; i?: number } = {}) {
    return this.add(unitCone(o.seg ?? 12), mat(x, y, z, r, h, r, o.rx ?? 0, o.ry ?? 0, o.rz ?? 0), color, o.kind, o.i ?? 1);
  }
  /** centered sphere */
  sphere(x: number, y: number, z: number, r: number, color: Col, o: Xf & { seg?: number; sy?: number; sx?: number; sz?: number; i?: number } = {}) {
    return this.add(unitSphere(o.seg ?? 12), mat(x, y, z, r * (o.sx ?? 1), r * (o.sy ?? 1), r * (o.sz ?? 1), o.rx ?? 0, o.ry ?? 0, o.rz ?? 0), color, o.kind, o.i ?? 1);
  }
  dome(x: number, y: number, z: number, r: number, color: Col, o: Xf & { seg?: number; sy?: number; i?: number } = {}) {
    return this.add(unitDome(o.seg ?? 16), mat(x, y, z, r, r * (o.sy ?? 1), r, o.rx ?? 0, o.ry ?? 0, o.rz ?? 0), color, o.kind, o.i ?? 1);
  }
  prism(x: number, y: number, z: number, w: number, h: number, d: number, color: Col, o: Xf = {}) {
    return this.add(unitPrism(), mat(x, y, z, w, h, d, o.rx ?? 0, o.ry ?? 0, o.rz ?? 0), color, o.kind);
  }
  pyramid(x: number, y: number, z: number, w: number, h: number, d: number, color: Col, o: Xf = {}) {
    return this.add(unitPyramid(), mat(x, y, z, w, h, d, o.rx ?? 0, o.ry ?? 0, o.rz ?? 0), color, o.kind);
  }
  plane(x: number, y: number, z: number, w: number, d: number, color: Col, o: Xf & { i?: number } = {}) {
    return this.add(unitPlane(), mat(x, y, z, w, 1, d, o.rx ?? 0, o.ry ?? 0, o.rz ?? 0), color, o.kind ?? 'cloth', o.i ?? 1);
  }
  disc(x: number, y: number, z: number, r: number, color: Col, o: Xf & { seg?: number; i?: number } = {}) {
    return this.add(unitCircle(o.seg ?? 32), mat(x, y, z, r, 1, r, o.rx ?? 0, o.ry ?? 0, o.rz ?? 0), color, o.kind ?? 'solid', o.i ?? 1);
  }
  torus(x: number, y: number, z: number, R: number, r: number, color: Col, o: Xf & { arc?: number; seg?: number; tube?: number; i?: number } = {}) {
    const arc = o.arc ?? Math.PI * 2;
    const g = cached(`tor${r / R}_${arc}_${o.seg ?? 32}_${o.tube ?? 6}`, () => new THREE.TorusGeometry(1, r / R, o.tube ?? 6, o.seg ?? 32, arc));
    return this.add(g, mat(x, y, z, R, R, R, o.rx ?? 0, o.ry ?? 0, o.rz ?? 0), color, o.kind, o.i ?? 1);
  }
  ring(x: number, y: number, z: number, rIn: number, rOut: number, color: Col, o: Xf & { seg?: number; i?: number } = {}) {
    const g = new THREE.RingGeometry(rIn, rOut, o.seg ?? 48).rotateX(-Math.PI / 2);
    return this.add(g, mat(x, y, z, 1, 1, 1, o.rx ?? 0, o.ry ?? 0, o.rz ?? 0), color, o.kind ?? 'solid', o.i ?? 1);
  }
  /** a beam between two points */
  beam(a: THREE.Vector3Like, b: THREE.Vector3Like, r: number, color: Col, o: { kind?: Kind; seg?: number; i?: number } = {}) {
    const va = new THREE.Vector3(a.x, a.y, a.z);
    const vb = new THREE.Vector3(b.x, b.y, b.z);
    const dir = vb.clone().sub(va);
    const len = dir.length();
    if (len < 1e-5) return;
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    const m = new THREE.Matrix4().compose(va, q, new THREE.Vector3(r, len, r));
    return this.add(unitCyl(o.seg ?? 5, 1, false), m, color, o.kind, o.i ?? 1);
  }
  tube(points: THREE.Vector3[], r: number, color: Col, o: { kind?: Kind; seg?: number; radial?: number; closed?: boolean; i?: number } = {}) {
    const curve = new THREE.CatmullRomCurve3(points, !!o.closed);
    const g = new THREE.TubeGeometry(curve, o.seg ?? points.length * 6, r, o.radial ?? 5, !!o.closed);
    return this.add(g, new THREE.Matrix4(), color, o.kind, o.i ?? 1);
  }
  lathe(points: [number, number][], x: number, y: number, z: number, color: Col, o: Xf & { seg?: number; s?: number; i?: number } = {}) {
    const g = new THREE.LatheGeometry(points.map(([a, b]) => new THREE.Vector2(a, b)), o.seg ?? 16);
    const s = o.s ?? 1;
    return this.add(g, mat(x, y, z, s, s, s, o.rx ?? 0, o.ry ?? 0, o.rz ?? 0), color, o.kind, o.i ?? 1);
  }
  extrude(shape: THREE.Shape, depth: number, m: THREE.Matrix4, color: Col, kind: Kind = 'solid') {
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 8 });
    return this.add(g, m, color, kind);
  }

  // ------------------------------------------------------------ lines and points
  line(a: THREE.Vector3Like, b: THREE.Vector3Like, color: Col, i = 1) {
    _c.set(color);
    if (this.tint) this.tint(_c);
    this.linePos.push(a.x, a.y, a.z, b.x, b.y, b.z);
    this.lineCol.push(_c.r * i, _c.g * i, _c.b * i, _c.r * i, _c.g * i, _c.b * i);
  }
  polyline(pts: THREE.Vector3Like[], color: Col, i = 1, closed = false) {
    for (let k = 0; k < pts.length - 1; k++) this.line(pts[k], pts[k + 1], color, i);
    if (closed && pts.length > 2) this.line(pts[pts.length - 1], pts[0], color, i);
  }
  /** a sagging rope between two points */
  rope(a: THREE.Vector3Like, b: THREE.Vector3Like, sag: number, color: Col, i = 1, n = 10) {
    const pts: THREE.Vector3[] = [];
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      pts.push(new THREE.Vector3(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t - Math.sin(t * Math.PI) * sag, a.z + (b.z - a.z) * t));
    }
    this.polyline(pts, color, i);
    return pts;
  }
  point(x: number, y: number, z: number, color: Col, i = 1) {
    _c.set(color);
    if (this.tint) this.tint(_c);
    this.ptsPos.push(x, y, z);
    this.ptsCol.push(_c.r * i, _c.g * i, _c.b * i);
  }
  pointSize(s: number) {
    this.ptsSize = s;
  }

  // ------------------------------------------------------------ compound pieces
  house(x: number, z: number, w: number, d: number, h: number, o: HouseOpts = {}) {
    const y = o.y ?? 0;
    const ry = o.ry ?? 0;
    const wall = o.wall ?? '#d8c7a8';
    const roof = o.roof ?? '#9a4e35';
    const kind = o.kind ?? 'solid';
    this.box(x, y, z, w, h, d, wall, { ry, kind });
    const rt = o.roofType ?? 'gable';
    const rh = o.roofH ?? Math.min(w, d) * 0.55;
    const rk = o.roofKind ?? kind;
    if (rt === 'gable') {
      if (w >= d) this.prism(x, y + h, z, d * 1.08, rh, w * 1.06, roof, { ry: ry + Math.PI / 2, kind: rk });
      else this.prism(x, y + h, z, w * 1.08, rh, d * 1.06, roof, { ry, kind: rk });
    } else if (rt === 'hip') this.pyramid(x, y + h, z, w * 1.1, rh, d * 1.1, roof, { ry, kind: rk });
    else if (rt === 'dome') this.dome(x, y + h, z, Math.min(w, d) * 0.5, roof, { kind: rk, seg: 10 });
    else if (rt === 'cone') this.cone(x, y + h, z, Math.min(w, d) * 0.62, rh * 1.6, roof, { kind: rk, seg: 8 });
    else if (rt === 'flat') this.box(x, y + h, z, w * 1.04, 0.08, d * 1.04, roof, { ry, kind: rk });
    if (o.win !== false) this.windows(x, y, z, w, d, h, ry, o.win ?? '#ffcf7a', o.lit ?? 0.5);
  }

  /** small glowing window panes on the faces of a box */
  windows(x: number, y: number, z: number, w: number, d: number, h: number, ry: number, color: Col, lit = 0.5, size = 0.16) {
    const floors = Math.max(1, Math.floor(h / 0.9));
    const cos = Math.cos(ry);
    const sin = Math.sin(ry);
    const faces: [number, number, number, number][] = [
      [0, d / 2, w, 0],
      [0, -d / 2, w, Math.PI],
      [w / 2, 0, d, Math.PI / 2],
      [-w / 2, 0, d, -Math.PI / 2],
    ];
    for (const [fx, fz, len, rot] of faces) {
      const cols = Math.max(1, Math.floor(len / 0.8));
      for (let f = 0; f < floors; f++) {
        for (let c = 0; c < cols; c++) {
          if (this.rng() > lit) continue;
          const u = (c + 0.5) / cols - 0.5;
          const ox = rot === 0 || rot === Math.PI ? u * len : fx;
          const oz = rot === 0 || rot === Math.PI ? fz : u * len;
          const ex = ox * cos + oz * sin;
          const ez = -ox * sin + oz * cos;
          const nx = Math.sin(ry + rot) * 0.012;
          const nz = Math.cos(ry + rot) * 0.012;
          const wy = y + (f + 0.45) * (h / floors);
          this.box(x + ex + nx, wy, z + ez + nz, size, size * 1.5, 0.03, this.jit(color, 0.02, 0.1, 0.12), {
            ry: ry + rot,
            kind: 'glow',
            i: 1.4 + this.rng() * 0.8,
          });
        }
      }
    }
  }

  tower(x: number, z: number, r: number, h: number, color: Col, o: { y?: number; cap?: 'cone' | 'dome' | 'flat' | 'spire' | 'crenel' | 'none'; capColor?: Col; seg?: number; kind?: Kind; capKind?: Kind; win?: boolean } = {}) {
    const y = o.y ?? 0;
    const seg = o.seg ?? 10;
    this.cyl(x, y, z, r, h, color, { seg, kind: o.kind });
    const cc = o.capColor ?? color;
    const ck = o.capKind ?? o.kind;
    switch (o.cap ?? 'cone') {
      case 'cone':
        this.cone(x, y + h, z, r * 1.25, r * 2.2, cc, { seg, kind: ck });
        break;
      case 'spire':
        this.cone(x, y + h, z, r * 0.9, r * 5, cc, { seg: 6, kind: ck });
        break;
      case 'dome':
        this.dome(x, y + h, z, r * 1.05, cc, { seg, kind: ck });
        break;
      case 'flat':
        this.cyl(x, y + h, z, r * 1.15, 0.12, cc, { seg, kind: ck });
        break;
      case 'crenel': {
        this.cyl(x, y + h, z, r * 1.12, 0.15, cc, { seg, kind: ck });
        const n = Math.max(6, Math.round(r * 8));
        for (let i = 0; i < n; i += 2) {
          const a = (i / n) * Math.PI * 2;
          this.box(x + Math.cos(a) * r, y + h + 0.15, z + Math.sin(a) * r, r * 0.35, r * 0.35, r * 0.35, cc, { ry: -a, kind: ck });
        }
        break;
      }
    }
    if (o.win) {
      for (let k = 0; k < Math.floor(h / 1.2); k++) {
        const a = this.r(Math.PI * 2);
        this.box(x + Math.cos(a) * r, y + 0.6 + k * 1.2, z + Math.sin(a) * r, 0.14, 0.28, 0.05, '#ffd38a', { ry: -a + Math.PI / 2, kind: 'glow', i: 1.6 });
      }
    }
  }

  /** a tiny person */
  figure(x: number, y: number, z: number, s: number, color: Col, o: { kind?: Kind; head?: Col; ry?: number } = {}) {
    this.cyl(x, y, z, 0.12 * s, 0.55 * s, color, { rt: 0.45, seg: 6, kind: o.kind });
    this.sphere(x, y + 0.66 * s, z, 0.1 * s, o.head ?? '#e2c4a6', { seg: 6, kind: o.kind });
  }

  tree(x: number, z: number, s: number, color: Col = '#4f6b3a', o: { y?: number; type?: 'round' | 'cone' | 'cypress' } = {}) {
    const y = o.y ?? 0;
    this.cyl(x, y, z, 0.06 * s, 0.6 * s, '#5a4231', { seg: 5 });
    const t = o.type ?? 'round';
    if (t === 'round') this.sphere(x, y + 0.85 * s, z, 0.42 * s, this.jit(color), { seg: 7 });
    else if (t === 'cone') this.cone(x, y + 0.4 * s, z, 0.4 * s, 1.2 * s, this.jit(color), { seg: 7 });
    else this.sphere(x, y + 1.0 * s, z, 0.22 * s, this.jit(color), { seg: 7, sy: 3 });
  }

  /** ground disc of a given radius whose top surface is at y */
  ground(r: number, color: Col, y = 0, h = 0.25, kind: Kind = 'solid', seg = 48) {
    this.cyl(0, y - h, 0, r, h, color, { seg, kind });
  }

  stairs(x: number, y: number, z: number, w: number, steps: number, rise: number, run: number, color: Col, ry = 0) {
    const c = Math.cos(ry);
    const s = Math.sin(ry);
    for (let i = 0; i < steps; i++) {
      const dz = i * run;
      this.box(x + s * dz, y, z + c * dz, w, rise * (i + 1), run, color, { ry });
    }
  }

  arch(x: number, y: number, z: number, w: number, h: number, depth: number, color: Col, o: Xf = {}) {
    const ry = o.ry ?? 0;
    const pw = w * 0.16;
    const c = Math.cos(ry);
    const s = Math.sin(ry);
    const off = w / 2 - pw / 2;
    this.box(x + c * off, y, z - s * off, pw, h, depth, color, { ry, kind: o.kind });
    this.box(x - c * off, y, z + s * off, pw, h, depth, color, { ry, kind: o.kind });
    this.torus(x, y + h, z, w / 2 - pw / 2, pw / 2, color, { arc: Math.PI, ry, seg: 10, tube: 4, kind: o.kind });
  }

  // ------------------------------------------------------------ finalize
  finalize(castShadow = true) {
    for (const [kind, geos] of this.bins) {
      if (!geos.length) continue;
      const merged = mergeGeometries(geos, false);
      if (!merged) continue;
      for (const g of geos) g.dispose();
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, this.mats[kind]);
      const opaque = kind === 'solid' || kind === 'metal' || kind === 'cloth' || kind === 'gold';
      mesh.castShadow = castShadow && opaque;
      mesh.receiveShadow = opaque || kind === 'water';
      if (kind === 'ghost' || kind === 'glass') mesh.renderOrder = 2;
      this.group.add(mesh);
      this.meshes[kind] = mesh;
    }
    this.bins.clear();
    if (this.linePos.length) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(this.linePos, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(this.lineCol, 3));
      this.lines = new THREE.LineSegments(g, this.mats.line);
      this.group.add(this.lines);
    }
    if (this.ptsPos.length) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(this.ptsPos, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(this.ptsCol, 3));
      let m = this.mats.points;
      if (this.ptsSize !== m.size) {
        m = m.clone();
        m.size = this.ptsSize;
      }
      this.points = new THREE.Points(g, m);
      this.points.renderOrder = 3;
      this.group.add(this.points);
    }
    for (const c of this.children) c.finalize(castShadow);
  }

  allUpdaters(out: Updater[] = []): Updater[] {
    out.push(...this.updaters);
    for (const c of this.children) c.allUpdaters(out);
    return out;
  }
}

export const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
export const TAU = Math.PI * 2;
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const smooth = (t: number) => t * t * (3 - 2 * t);
