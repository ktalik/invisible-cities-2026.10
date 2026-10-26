// Trees, rocks and other natural props. Tree/rock functions add to a Batch.

import * as THREE from 'three';
import type { Batch } from './batch';
import type { ColorLike } from './color';
import { jitter } from './color';
import { RNG } from './rng';
import { noise3 } from './noise';
import { at, cyl, cone, lathe, sphere, tube, box, smooth } from './geo';

export type TreeKind = 'cypress' | 'round' | 'palm' | 'pine' | 'poplar' | 'olive' | 'willow' | 'shrub';

export interface TreeOpts {
  x: number;
  z: number;
  y?: number;
  kind?: TreeKind;
  /** total height */
  h?: number;
  color?: ColorLike;
  trunkColor?: ColorLike;
  rng?: RNG;
}

const _rng = new RNG(11);

/** Displace a geometry's vertices along their normals with 3D noise (organic blobs). */
export function wobble(geo: THREE.BufferGeometry, amount: number, freq = 1.5, seed = 0): THREE.BufferGeometry {
  const g = smooth(geo);
  const pos = g.attributes.position;
  const nrm = g.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const n = noise3(x * freq + seed, y * freq + seed * 1.7, z * freq - seed);
    pos.setXYZ(i, x + nrm.getX(i) * n * amount, y + nrm.getY(i) * n * amount, z + nrm.getZ(i) * n * amount);
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

/** Add one tree to a batch. */
export function tree(b: Batch, o: TreeOpts) {
  const rng = o.rng ?? _rng;
  const kind = o.kind ?? 'round';
  const h = o.h ?? 1.6;
  const y = o.y ?? 0;
  const leaf = jitter(o.color ?? (kind === 'cypress' ? '#2f4a33' : kind === 'palm' ? '#5a7a3a' : '#4f6e3a'), rng, 0.02, 0.06, 0.05);
  const trunk = o.trunkColor ?? '#5b4532';
  switch (kind) {
    case 'cypress': {
      b.add(at(cyl(0.04, 0.05, h * 0.15, 5), o.x, y, o.z), trunk, 'wood');
      const prof: [number, number][] = [[0.001, 0], [h * 0.09, h * 0.05], [h * 0.11, h * 0.25], [h * 0.09, h * 0.55], [h * 0.05, h * 0.8], [0.001, h * 0.95]];
      b.add(at(lathe(prof, 7), o.x, y + h * 0.08, o.z, { ry: rng.angle() }), leaf, 'matte');
      break;
    }
    case 'poplar': {
      b.add(at(cyl(0.04, 0.05, h * 0.2, 5), o.x, y, o.z), trunk, 'wood');
      b.add(at(sphere(h * 0.16, 7, 6), o.x, y + h * 0.58, o.z, { s: [1, 2.6, 1] }), leaf, 'matte');
      break;
    }
    case 'pine': {
      b.add(at(cyl(0.04, 0.06, h * 0.3, 5), o.x, y, o.z), trunk, 'wood');
      for (let i = 0; i < 3; i++) {
        const r = h * (0.32 - i * 0.07);
        b.add(at(cone(r, h * 0.38, 7), o.x, y + h * (0.22 + i * 0.22), o.z, { ry: rng.angle() }), leaf, 'matte');
      }
      break;
    }
    case 'palm': {
      const lean = rng.float(-0.25, 0.25), lean2 = rng.float(-0.25, 0.25);
      const top: [number, number, number] = [o.x + lean * h, y + h, o.z + lean2 * h];
      b.add(tube([[o.x, y, o.z], [o.x + lean * h * 0.3, y + h * 0.5, o.z + lean2 * h * 0.3], top], h * 0.03, 8, 5), trunk, 'wood');
      const n = 7;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rng.float(0, 0.4);
        const frond = box(h * 0.08, 0.01, h * 0.42);
        at(frond, 0, 0, h * 0.2, { rx: 0.5 });
        at(frond, top[0], top[1], top[2], { ry: a });
        b.add(frond, leaf, 'cloth');
      }
      break;
    }
    case 'olive': {
      b.add(at(cyl(0.05, 0.08, h * 0.4, 6), o.x, y, o.z, { rz: rng.float(-0.2, 0.2) }), trunk, 'wood');
      const g = wobble(sphere(h * 0.32, 10, 8), h * 0.08, 3, rng.float(0, 100));
      b.add(at(g, o.x, y + h * 0.62, o.z, { s: [1.3, 0.75, 1.3] }), jitter(o.color ?? '#7d8a5c', rng), 'matte');
      break;
    }
    case 'willow': {
      b.add(at(cyl(0.05, 0.08, h * 0.45, 6), o.x, y, o.z), trunk, 'wood');
      const g = lathe([[0.001, h * 0.95], [h * 0.3, h * 0.85], [h * 0.42, h * 0.55], [h * 0.4, h * 0.2], [h * 0.36, h * 0.15]], 9);
      b.add(at(g, o.x, y, o.z), leaf, 'cloth');
      break;
    }
    case 'shrub': {
      const g = wobble(sphere(h * 0.5, 8, 6), h * 0.12, 3, rng.float(0, 100));
      b.add(at(g, o.x, y + h * 0.3, o.z, { s: [1, 0.7, 1] }), leaf, 'matte');
      break;
    }
    case 'round':
    default: {
      b.add(at(cyl(0.04, 0.06, h * 0.45, 6), o.x, y, o.z), trunk, 'wood');
      const g = wobble(sphere(h * 0.3, 10, 8), h * 0.07, 2.5, rng.float(0, 100));
      b.add(at(g, o.x, y + h * 0.65, o.z), leaf, 'matte');
      break;
    }
  }
}

/** Add a low-poly rock (noise-displaced icosahedron). */
export function rock(b: Batch, o: { x: number; y?: number; z: number; r?: number; color?: ColorLike; rng?: RNG; flat?: number }) {
  const rng = o.rng ?? _rng;
  const r = o.r ?? 0.4;
  const g = new THREE.IcosahedronGeometry(r, 1);
  const pos = g.attributes.position;
  const seed = rng.float(0, 100);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const n = 1 + 0.35 * noise3(x * 2 / r + seed, y * 2 / r, z * 2 / r);
    pos.setXYZ(i, x * n, y * n * (o.flat ?? 0.7), z * n);
  }
  g.computeVertexNormals();
  b.add(at(g, o.x, o.y ?? 0, o.z, { ry: rng.angle() }), jitter(o.color ?? '#8b8174', rng, 0.01, 0.03, 0.05), 'stone');
}

/** Scatter n trees in an annulus/disc, avoiding a predicate. */
export function forest(b: Batch, o: {
  n: number; r0?: number; r1: number; cx?: number; cz?: number; rng: RNG; kinds?: TreeKind[];
  h?: [number, number]; color?: ColorLike; avoid?: (x: number, z: number) => boolean; y?: (x: number, z: number) => number;
}) {
  let placed = 0, tries = 0;
  while (placed < o.n && tries < o.n * 20) {
    tries++;
    const [dx, dz] = o.rng.inRing(o.r0 ?? 0, o.r1);
    const x = (o.cx ?? 0) + dx, z = (o.cz ?? 0) + dz;
    if (o.avoid && o.avoid(x, z)) continue;
    tree(b, { x, z, y: o.y ? o.y(x, z) : 0, kind: o.rng.pick(o.kinds ?? ['round']), h: o.rng.float(...(o.h ?? [1, 1.8])), color: o.color, rng: o.rng });
    placed++;
  }
}
