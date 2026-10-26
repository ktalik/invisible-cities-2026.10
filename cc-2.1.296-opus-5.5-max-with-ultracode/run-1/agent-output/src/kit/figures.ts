// Tiny inhabitants: people, animals, birds, boats. Designed for instancing.
// Scale reference: a person is ~0.25 units tall (default).

import * as THREE from 'three';
import type { ColorLike } from './color';
import { RNG } from './rng';
import { at, box, cone, cyl, merge, paint, sphere, strut, lathe } from './geo';
import { instanced, instanceSetter } from './batch';
import { std } from './materials';

/** A standing person (robe + head), base at y = 0, height h. White vertex colour (tint via instance colour). */
export function personGeometry(h = 0.25): THREE.BufferGeometry {
  const body = cyl(h * 0.11, h * 0.2, h * 0.72, 7);
  const shoulders = at(sphere(h * 0.12, 7, 5), 0, h * 0.7, 0, { s: [1.1, 0.6, 0.9] });
  const head = at(sphere(h * 0.1, 8, 6), 0, h * 0.86, 0);
  return merge([paint(body, '#ffffff'), paint(shoulders, '#ffffff'), paint(head, '#f0d9c4')]);
}

/** A vertex-coloured material for tinted instances (instance colour multiplies vertex colour). */
export function figureMaterial(): THREE.MeshStandardMaterial {
  return std('#ffffff', { roughness: 0.9, vertexColors: true });
}

export interface CrowdOpts {
  count: number;
  /** returns [x, y, z] for person i, or null to skip */
  place: (i: number, rng: RNG) => [number, number, number] | null;
  colors?: ColorLike[];
  h?: number;
  rng?: RNG;
}

/** A static crowd as one InstancedMesh. */
export function crowd(o: CrowdOpts): THREE.InstancedMesh {
  const rng = o.rng ?? new RNG(5);
  const palette = (o.colors ?? ['#7a3b2e', '#2f4b6e', '#c9a35a', '#e8e0d0', '#4a5d3a', '#6d3d5e', '#2b2b2b']).map((c) => new THREE.Color(c));
  return instanced(personGeometry(o.h ?? 0.25), figureMaterial(), o.count, (i, d, c) => {
    const p = o.place(i, rng);
    if (!p) return false;
    d.position.set(p[0], p[1], p[2]);
    d.rotation.y = rng.angle();
    const s = rng.float(0.85, 1.12);
    d.scale.set(s, s, s);
    c.copy(rng.pick(palette));
  });
}

export interface WalkersOpts {
  /** polylines the walkers follow (looping back and forth) */
  paths: THREE.Vector3[][];
  count: number;
  speed?: [number, number];
  colors?: ColorLike[];
  h?: number;
  rng?: RNG;
  /** loop around closed paths instead of ping-ponging */
  closed?: boolean;
  geometry?: THREE.BufferGeometry;
  material?: THREE.Material;
}

/** Animated walkers along paths. Call update(t) every frame. */
export class Walkers {
  readonly mesh: THREE.InstancedMesh;
  private walkers: { path: number; offset: number; speed: number; side: number }[] = [];
  private lengths: number[][] = [];
  private set: ReturnType<typeof instanceSetter>;

  constructor(private o: WalkersOpts) {
    const rng = o.rng ?? new RNG(9);
    const palette = (o.colors ?? ['#7a3b2e', '#2f4b6e', '#c9a35a', '#e8e0d0', '#4a5d3a', '#6d3d5e', '#2b2b2b']).map((c) => new THREE.Color(c));
    this.mesh = instanced(o.geometry ?? personGeometry(o.h ?? 0.25), o.material ?? figureMaterial(), o.count, (_i, _d, c) => {
      c.copy(rng.pick(palette));
    });
    for (const p of o.paths) {
      const acc = [0];
      for (let i = 1; i < p.length; i++) acc.push(acc[i - 1] + p[i].distanceTo(p[i - 1]));
      this.lengths.push(acc);
    }
    for (let i = 0; i < o.count; i++) {
      const path = rng.int(0, o.paths.length - 1);
      const len = this.lengths[path][this.lengths[path].length - 1] || 1;
      this.walkers.push({ path, offset: rng.float(0, len * 2), speed: rng.float(...(o.speed ?? [0.25, 0.5])) * rng.sign(), side: rng.float(-0.12, 0.12) });
    }
    this.set = instanceSetter(this.mesh);
    this.update(0);
  }

  update(t: number) {
    const p = new THREE.Vector3();
    const dir = new THREE.Vector3();
    for (let i = 0; i < this.walkers.length; i++) {
      const w = this.walkers[i];
      const path = this.o.paths[w.path];
      const acc = this.lengths[w.path];
      const len = acc[acc.length - 1] || 1;
      let s = w.offset + w.speed * t;
      let forward = true;
      if (this.o.closed) {
        s = ((s % len) + len) % len;
      } else {
        const period = len * 2;
        s = ((s % period) + period) % period;
        if (s > len) {
          s = period - s;
          forward = false;
        }
      }
      let k = 1;
      while (k < acc.length - 1 && acc[k] < s) k++;
      const seg = Math.max(1e-6, acc[k] - acc[k - 1]);
      const f = Math.min(1, Math.max(0, (s - acc[k - 1]) / seg));
      p.lerpVectors(path[k - 1], path[k], f);
      dir.subVectors(path[k], path[k - 1]).normalize();
      if (!forward) dir.negate();
      if (w.speed < 0) dir.negate();
      const ry = Math.atan2(dir.x, dir.z);
      const bob = Math.abs(Math.sin((t * Math.abs(w.speed) * 18 + i) )) * 0.012;
      this.set(i, p.x + Math.cos(ry) * w.side, p.y + bob, p.z - Math.sin(ry) * w.side, ry);
    }
    this.set.done();
  }
}

// ---------------------------------------------------------------- animals

export interface QuadOpts {
  len?: number;
  h?: number;
  color?: ColorLike;
  hump?: boolean;
  horns?: boolean;
  longNeck?: boolean;
  tail?: number;
  ears?: boolean;
}

/** Generic low-poly quadruped facing +z, base at y = 0 (dog, goat, camel, cat, rat, horse...). */
export function quadruped(o: QuadOpts = {}): THREE.BufferGeometry {
  const L = o.len ?? 0.3;
  const H = o.h ?? 0.2;
  const legH = H * 0.5;
  const parts: THREE.BufferGeometry[] = [];
  parts.push(at(box(L * 0.4, H * 0.35, L), 0, legH, 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push(at(box(L * 0.08, legH, L * 0.08), sx * L * 0.13, 0, sz * L * 0.38));
  const neckTop: [number, number, number] = o.longNeck ? [0, H * 1.25, L * 0.62] : [0, H * 0.95, L * 0.55];
  parts.push(strut([0, legH + H * 0.25, L * 0.4], neckTop, L * 0.06, 5));
  parts.push(at(box(L * 0.16, L * 0.14, L * 0.26), neckTop[0], neckTop[1] - L * 0.05, neckTop[2] + L * 0.08));
  if (o.hump) parts.push(at(sphere(L * 0.2, 7, 5), 0, legH + H * 0.32, -L * 0.05, { s: [0.8, 0.9, 1.1] }));
  if (o.horns) for (const sx of [-1, 1]) parts.push(strut([sx * L * 0.04, neckTop[1] + L * 0.04, neckTop[2]], [sx * L * 0.09, neckTop[1] + L * 0.16, neckTop[2] - L * 0.08], L * 0.015, 4));
  if (o.ears) for (const sx of [-1, 1]) parts.push(at(cone(L * 0.04, L * 0.09, 4), sx * L * 0.05, neckTop[1] + L * 0.02, neckTop[2] + L * 0.02));
  if ((o.tail ?? 0) > 0) parts.push(strut([0, legH + H * 0.25, -L * 0.5], [0, legH + H * 0.1, -L * 0.5 - (o.tail ?? 0)], L * 0.02, 4));
  const g = merge(parts);
  return paint(g, o.color ?? '#ffffff');
}

/** A bird with wings spread (V shape), centred, facing +z. Use instance scale.y to flap. */
export function birdGeometry(span = 0.3): THREE.BufferGeometry {
  const w = span / 2;
  const pos = new Float32Array([
    // left wing
    0, 0, 0.05 * span, -w, 0.12 * span, -0.05 * span, 0, 0, -0.12 * span,
    // right wing
    0, 0, 0.05 * span, 0, 0, -0.12 * span, w, 0.12 * span, -0.05 * span,
  ]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return paint(g, '#ffffff');
}

export interface FlockOpts {
  count: number;
  center?: [number, number, number];
  radius?: number;
  height?: number;
  color?: ColorLike;
  span?: number;
  speed?: number;
  rng?: RNG;
}

/** A flock of birds circling lazily. Call update(t). */
export class Flock {
  readonly mesh: THREE.InstancedMesh;
  private birds: { r: number; y: number; phase: number; speed: number; flap: number; wob: number }[] = [];
  private set: ReturnType<typeof instanceSetter>;
  constructor(private o: FlockOpts) {
    const rng = o.rng ?? new RNG(21);
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(o.color ?? '#2a2622'), side: THREE.DoubleSide });
    this.mesh = instanced(birdGeometry(o.span ?? 0.3), mat, o.count, undefined, { castShadow: false, receiveShadow: false, colors: false });
    for (let i = 0; i < o.count; i++) {
      this.birds.push({
        r: (o.radius ?? 10) * rng.float(0.5, 1.2),
        y: (o.height ?? 8) + rng.float(-1.5, 1.5),
        phase: rng.angle(),
        speed: (o.speed ?? 0.25) * rng.float(0.7, 1.3),
        flap: rng.float(7, 11),
        wob: rng.float(0, 10),
      });
    }
    this.set = instanceSetter(this.mesh);
    this.update(0);
  }
  update(t: number) {
    const c = this.o.center ?? [0, 0, 0];
    for (let i = 0; i < this.birds.length; i++) {
      const b = this.birds[i];
      const a = b.phase + t * b.speed;
      const x = c[0] + Math.cos(a) * b.r + Math.sin(t * 0.3 + b.wob) * 0.8;
      const z = c[2] + Math.sin(a) * b.r;
      const y = c[1] + b.y + Math.sin(t * 0.7 + b.wob) * 0.5;
      const flap = Math.sin(t * b.flap + b.wob);
      this.set(i, x, y, z, -a, [1, flap, 1], 0, 0.3);
    }
    this.set.done();
  }
}

// ---------------------------------------------------------------- boats & vehicles

/** A gondola-like boat facing +z, base at water level y = 0. */
export function boatGeometry(len = 0.9, color: ColorLike = '#1d1b1a'): THREE.BufferGeometry {
  const hull = lathe([[0.001, -0.06], [0.08, -0.03], [0.1, 0.04], [0.09, 0.08]], 10);
  hull.scale(1, 1, (len / 0.2) * 1.0);
  const prow = strut([0, 0.05, len * 0.48], [0, 0.22, len * 0.55], 0.015, 4);
  const stern = strut([0, 0.05, -len * 0.48], [0, 0.16, -len * 0.53], 0.015, 4);
  return paint(merge([hull, prow, stern]), color);
}

/** A sailing boat facing +z (hull + mast + triangular sail). */
export function sailboatGeometry(len = 1.2, hullColor: ColorLike = '#5a3e2b', sailColor: ColorLike = '#efe4cc'): THREE.BufferGeometry {
  const hull = paint(at(lathe([[0.001, -0.1], [0.12, -0.05], [0.16, 0.06], [0.15, 0.1]], 10), 0, 0, 0, { s: [1, 1, len / 0.32] }), hullColor);
  const mast = paint(at(cyl(0.015, 0.02, len * 1.1, 5), 0, 0.08, 0), '#3b2c22');
  const sailShape = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(len * 0.5, 0), new THREE.Vector2(0, len * 0.95)]);
  const sail = paint(at(new THREE.ShapeGeometry(sailShape), 0, 0.2, 0, { ry: Math.PI / 2 }), sailColor);
  return merge([hull, mast, sail]);
}
