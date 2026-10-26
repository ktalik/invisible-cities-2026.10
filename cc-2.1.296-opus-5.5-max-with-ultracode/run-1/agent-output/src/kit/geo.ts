// Geometry primitives and helpers.
//
// CONVENTIONS
//  - Standing solids (box, cyl, cone, pyramid, roofs, dome, onion, lathe, prism, extrudeUp ...)
//    are BASE-ANCHORED: they sit on y = 0 and are centred on x/z.
//  - Spheres and tori are centred on the origin.
//  - Every function returns a fresh BufferGeometry you may mutate.
//  - at(geo, x, y, z, {ry, s ...}) transforms in place and returns the geometry (chainable).
//  - paint(geo, colour, intensity) writes a vertex colour attribute (used by Batch + finish()).

import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import type { ColorLike } from './color';

export type V3 = THREE.Vector3 | [number, number, number];
export const v3 = (p: V3): THREE.Vector3 => (Array.isArray(p) ? new THREE.Vector3(p[0], p[1], p[2]) : p.clone());

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();

export interface AtOpts {
  rx?: number;
  ry?: number;
  rz?: number;
  /** uniform scale, or per-axis [sx, sy, sz] */
  s?: number | [number, number, number];
}

/** Transform a geometry in place: scale, then rotate (XYZ euler), then translate. */
export function at<G extends THREE.BufferGeometry>(geo: G, x = 0, y = 0, z = 0, o: AtOpts = {}): G {
  const s = o.s ?? 1;
  if (typeof s === 'number') _s.set(s, s, s);
  else _s.set(s[0], s[1], s[2]);
  _e.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0);
  _q.setFromEuler(_e);
  _p.set(x, y, z);
  _m.compose(_p, _q, _s);
  geo.applyMatrix4(_m);
  return geo;
}

/** Apply an arbitrary matrix in place. */
export function apply<G extends THREE.BufferGeometry>(geo: G, m: THREE.Matrix4): G {
  geo.applyMatrix4(m);
  return geo;
}

/**
 * Write a uniform vertex colour. intensity > 1 is allowed (HDR) and is useful with
 * finish('glow') to make windows, lamps and embers bloom.
 */
export function paint<G extends THREE.BufferGeometry>(geo: G, color: ColorLike, intensity = 1): G {
  const c = new THREE.Color(color).multiplyScalar(intensity);
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

/** Vertex colour as a function of vertex position (e.g. gradients, weathering). */
export function paintBy<G extends THREE.BufferGeometry>(geo: G, fn: (x: number, y: number, z: number, out: THREE.Color) => void): G {
  const pos = geo.attributes.position;
  const arr = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    c.setRGB(1, 1, 1);
    fn(pos.getX(i), pos.getY(i), pos.getZ(i), c);
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

/**
 * Normalise a geometry for merging: non-indexed, only position/normal/color
 * (+ uv kept when keepUv). Missing colours become white.
 */
export function normalize(geo: THREE.BufferGeometry, keepUv = false): THREE.BufferGeometry {
  let g = geo.index ? geo.toNonIndexed() : geo;
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.color) paint(g, '#ffffff');
  for (const name of Object.keys(g.attributes)) {
    if (name === 'position' || name === 'normal' || name === 'color') continue;
    if (keepUv && name === 'uv') continue;
    g.deleteAttribute(name);
  }
  if (keepUv && !g.attributes.uv) {
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  }
  g.morphAttributes = {};
  g.clearGroups();
  return g;
}

/** Merge geometries (normalising them first). Returns an empty geometry for an empty list. */
export function merge(geos: THREE.BufferGeometry[], keepUv = false): THREE.BufferGeometry {
  if (geos.length === 0) return new THREE.BufferGeometry();
  const list = geos.map((g) => normalize(g, keepUv));
  const out = mergeGeometries(list, false);
  if (!out) throw new Error('merge(): incompatible geometries');
  return out;
}

/** Re-index a merged geometry and recompute smooth normals (use for organic shapes). */
export function smooth(geo: THREE.BufferGeometry, tolerance = 1e-4): THREE.BufferGeometry {
  geo.deleteAttribute('normal');
  const g = mergeVertices(geo, tolerance);
  g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------- primitives

/** Box, base-anchored. */
export function box(w: number, h: number, d: number): THREE.BufferGeometry {
  return new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0);
}

/** Box centred on the origin. */
export function boxC(w: number, h: number, d: number): THREE.BufferGeometry {
  return new THREE.BoxGeometry(w, h, d);
}

/** Cylinder / truncated cone, base-anchored. */
export function cyl(rTop: number, rBottom: number, h: number, seg = 16, open = false): THREE.BufferGeometry {
  return new THREE.CylinderGeometry(rTop, rBottom, h, seg, 1, open).translate(0, h / 2, 0);
}

/** Cone, base-anchored. */
export function cone(r: number, h: number, seg = 16): THREE.BufferGeometry {
  return new THREE.ConeGeometry(r, h, seg).translate(0, h / 2, 0);
}

/** Square pyramid with base w x d, base-anchored. */
export function pyramid(w: number, d: number, h: number): THREE.BufferGeometry {
  const g = new THREE.ConeGeometry(Math.SQRT1_2, h, 4, 1).rotateY(Math.PI / 4).translate(0, h / 2, 0);
  g.scale(w, 1, d);
  return g;
}

/** Sphere centred on the origin. */
export function sphere(r: number, wSeg = 16, hSeg = 12): THREE.BufferGeometry {
  return new THREE.SphereGeometry(r, wSeg, hSeg);
}

/** Hemispherical (or partial) dome, base-anchored. frac = 1 is a half sphere. */
export function dome(r: number, seg = 20, frac = 1, heightScale = 1): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(r, seg, Math.max(4, Math.round(seg / 2)), 0, Math.PI * 2, 0, (Math.PI / 2) * frac);
  if (heightScale !== 1) g.scale(1, heightScale, 1);
  return g;
}

/** Torus centred on the origin, lying flat (ring in the x/z plane). */
export function torus(R: number, r: number, radialSeg = 8, tubularSeg = 32, arc = Math.PI * 2): THREE.BufferGeometry {
  return new THREE.TorusGeometry(R, r, radialSeg, tubularSeg, arc).rotateX(Math.PI / 2);
}

/** Lathe from a profile of [radius, y] pairs (bottom to top), base-anchored as given. */
export function lathe(profile: [number, number][], seg = 20): THREE.BufferGeometry {
  const pts = profile.map(([r, y]) => new THREE.Vector2(Math.max(0, r), y));
  return new THREE.LatheGeometry(pts, seg);
}

/** Onion dome of radius r and total height h (including the finial point), base-anchored. */
export function onion(r: number, h: number, seg = 20): THREE.BufferGeometry {
  const prof: [number, number][] = [];
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    // bulb that swells past r then narrows into a point
    const rad = r * (Math.sin(Math.PI * Math.min(1, t * 1.25)) * 1.12 + 0.0001) * (1 - t * 0.15);
    prof.push([t > 0.8 ? rad * (1 - (t - 0.8) / 0.2) : rad, t * h]);
  }
  prof[0] = [r * 0.98, 0];
  return lathe(prof, seg);
}

/** Flat horizontal plane at y = 0 (normal up). */
export function plane(w: number, d: number, segW = 1, segD = 1): THREE.BufferGeometry {
  return new THREE.PlaneGeometry(w, d, segW, segD).rotateX(-Math.PI / 2);
}

/** Flat horizontal disc at y = 0 (normal up). */
export function disc(r: number, seg = 48): THREE.BufferGeometry {
  return new THREE.CircleGeometry(r, seg).rotateX(-Math.PI / 2);
}

/** Flat horizontal ring at y = 0 (normal up). */
export function ring(r0: number, r1: number, seg = 48): THREE.BufferGeometry {
  return new THREE.RingGeometry(r0, r1, seg).rotateX(-Math.PI / 2);
}

/** Vertical plane facing +z, base-anchored. */
export function wallPlane(w: number, h: number): THREE.BufferGeometry {
  return new THREE.PlaneGeometry(w, h).translate(0, h / 2, 0);
}

/** Gable roof: triangular prism, ridge along x, base w (x) by d (z), height h. */
export function gableRoof(w: number, d: number, h: number, overhang = 0.08): THREE.BufferGeometry {
  const hw = w / 2 + overhang;
  const hd = d / 2 + overhang;
  const shape = new THREE.Shape();
  shape.moveTo(-hd, 0);
  shape.lineTo(hd, 0);
  shape.lineTo(0, h);
  shape.lineTo(-hd, 0);
  const g = new THREE.ExtrudeGeometry(shape, { depth: hw * 2, bevelEnabled: false });
  g.translate(0, 0, -hw);
  g.rotateY(Math.PI / 2);
  return g;
}

/** Hip roof: like a pyramid with a ridge (ridge = fraction of width). */
export function hipRoof(w: number, d: number, h: number, ridge = 0.4, overhang = 0.08): THREE.BufferGeometry {
  const hw = w / 2 + overhang, hd = d / 2 + overhang;
  const rw = (w / 2) * ridge;
  const v = [
    [-hw, 0, -hd], [hw, 0, -hd], [hw, 0, hd], [-hw, 0, hd],
    [-rw, h, 0], [rw, h, 0],
  ];
  const f = [
    [0, 4, 5], [0, 5, 1], // back
    [2, 5, 4], [2, 4, 3], // front
    [1, 5, 2], // right
    [3, 4, 0], // left
    [0, 1, 2], [0, 2, 3], // bottom
  ];
  const pos: number[] = [];
  for (const tri of f) for (const i of tri) pos.push(...v[i]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/** Shed (mono-pitch) roof slab. */
export function shedRoof(w: number, d: number, hLow: number, hHigh: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-d / 2, 0);
  shape.lineTo(d / 2, 0);
  shape.lineTo(d / 2, hLow);
  shape.lineTo(-d / 2, hHigh);
  shape.lineTo(-d / 2, 0);
  const g = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false });
  g.translate(0, 0, -w / 2);
  g.rotateY(Math.PI / 2);
  return g;
}

/** Extrude a 2D shape upward: shape (x, y) maps to world (x, z = y), height 0..h. */
export function extrudeUp(shape: THREE.Shape | THREE.Shape[], h: number, curveSegments = 12): THREE.BufferGeometry {
  const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments });
  g.rotateX(Math.PI / 2);
  g.translate(0, h, 0);
  return g;
}

/** Extrude a 2D shape along z (shape stays upright in the x/y plane), centred in depth. */
export function extrudeZ(shape: THREE.Shape | THREE.Shape[], depth: number, curveSegments = 12): THREE.BufferGeometry {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments });
  g.translate(0, 0, -depth / 2);
  return g;
}

/** Prism over a polygon footprint given as [x, z] points. */
export function prism(points: [number, number][], h: number): THREE.BufferGeometry {
  const s = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, z)));
  return extrudeUp(s, h);
}

/** Regular n-gon prism (e.g. an octagonal tower), base-anchored. */
export function ngon(r: number, h: number, sides = 8, rTop = r): THREE.BufferGeometry {
  return new THREE.CylinderGeometry(rTop, r, h, sides, 1).translate(0, h / 2, 0);
}

/**
 * A wall slab of width w, height h, depth d with an arched opening of width ow and
 * height oh (spring of the arch at oh - ow/2). Faces +z; base-anchored.
 */
export function archWall(w: number, h: number, d: number, ow: number, oh: number, seg = 12): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(w / 2, 0);
  s.lineTo(w / 2, h);
  s.lineTo(-w / 2, h);
  s.lineTo(-w / 2, 0);
  const r = ow / 2;
  const spring = Math.max(0.0001, oh - r);
  const hole = new THREE.Path();
  hole.moveTo(-r, 0);
  hole.lineTo(-r, spring);
  hole.absarc(0, spring, r, Math.PI, 0, true);
  hole.lineTo(r, 0);
  hole.lineTo(-r, 0);
  s.holes.push(hole);
  return extrudeZ(s, d, seg);
}

/** A semicircular arch band (voussoirs): span = inner width, thickness radial, depth along z. */
export function archBand(span: number, thickness: number, depth: number, seg = 16, rise = 1): THREE.BufferGeometry {
  const r0 = span / 2;
  const r1 = r0 + thickness;
  const s = new THREE.Shape();
  s.moveTo(-r1, 0);
  s.absarc(0, 0, r1, Math.PI, 0, true);
  s.lineTo(r0, 0);
  s.absarc(0, 0, r0, 0, Math.PI, false);
  s.lineTo(-r1, 0);
  const g = extrudeZ(s, depth, seg);
  if (rise !== 1) g.scale(1, rise, 1);
  return g;
}

/** Straight flight of stairs climbing along +z. */
export function stairs(n: number, w: number, stepH: number, stepD: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < n; i++) parts.push(at(box(w, stepH * (i + 1), stepD), 0, 0, i * stepD + stepD / 2));
  return merge(parts);
}

/** Spiral staircase around the y axis: steps wind upward, optional central column. */
export function spiralStair(r: number, h: number, steps: number, turns = 1.5, stepW = r * 0.9, column = true): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const stepH = h / steps;
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * turns * Math.PI * 2;
    const g = box(stepW, stepH * 0.6, (Math.PI * 2 * r * turns) / steps * 1.15);
    at(g, r - stepW / 2, 0, 0);
    at(g, 0, i * stepH, 0, { ry: -a });
    parts.push(g);
  }
  if (column) parts.push(cyl(r * 0.12, r * 0.12, h + stepH, 10));
  return merge(parts);
}

/** Cylinder between two points (struts, poles, ropes, beams). */
export function strut(a: V3, b: V3, r: number, seg = 6): THREE.BufferGeometry {
  const A = v3(a), B = v3(b);
  const dir = new THREE.Vector3().subVectors(B, A);
  const len = dir.length();
  const g = new THREE.CylinderGeometry(r, r, Math.max(len, 1e-4), seg, 1, true);
  g.translate(0, len / 2, 0);
  _q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  _m.compose(A, _q, _s.set(1, 1, 1));
  g.applyMatrix4(_m);
  return g;
}

/** Tube along a smooth curve through points. */
export function tube(points: V3[], r: number, segments = 32, radial = 6, closed = false): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points.map(v3), closed, 'centripetal');
  return new THREE.TubeGeometry(curve, segments, r, radial, closed);
}

/** A sagging rope / cable between two points (catenary-ish), as a thin tube. */
export function rope(a: V3, b: V3, sag: number, r = 0.02, segments = 12, radial = 4): THREE.BufferGeometry {
  return tube(ropePoints(a, b, sag, segments), r, segments, radial);
}

/** Points of a sagging line between a and b (for Line/LineSegments or tubes). */
export function ropePoints(a: V3, b: V3, sag: number, segments = 12): THREE.Vector3[] {
  const A = v3(a), B = v3(b);
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const p = new THREE.Vector3().lerpVectors(A, B, t);
    p.y -= sag * 4 * t * (1 - t);
    pts.push(p);
  }
  return pts;
}

/** Crenellated parapet ring (merlons) on top of a circular wall. */
export function crenelRing(r: number, y: number, n: number, mw: number, mh: number, md: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    parts.push(at(box(mw, mh, md), Math.cos(a) * r, y, Math.sin(a) * r, { ry: -a + Math.PI / 2 }));
  }
  return merge(parts);
}

/** Arrange copies of a geometry around a circle (facing outward). */
export function radial(make: (i: number) => THREE.BufferGeometry, n: number, r: number, y = 0, phase = 0): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < n; i++) {
    const a = phase + (i / n) * Math.PI * 2;
    parts.push(at(make(i), Math.cos(a) * r, y, Math.sin(a) * r, { ry: -a + Math.PI / 2 }));
  }
  return merge(parts);
}

/** Bounding radius in the x/z plane of a geometry (after computeBoundingBox). */
export function footprintRadius(geo: THREE.BufferGeometry): number {
  geo.computeBoundingBox();
  const b = geo.boundingBox!;
  return Math.max(Math.abs(b.min.x), Math.abs(b.max.x), Math.abs(b.min.z), Math.abs(b.max.z));
}
