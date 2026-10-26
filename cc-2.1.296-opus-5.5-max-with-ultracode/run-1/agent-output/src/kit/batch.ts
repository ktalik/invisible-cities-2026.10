// Batch: the main tool for building static city geometry efficiently.
//
//   const b = new Batch();
//   b.add(at(box(2, 3, 2), x, 0, z), '#e8d8bc', 'plaster');      // colour + finish
//   b.add(at(gableRoof(2, 2, 1), x, 3, z), '#a0482e', 'ceramic');
//   b.add(windowsGeo, '#ffcf7a', 'glow', 3);                       // HDR glow for bloom
//   root.add(b.build());                                           // ~1 draw call per finish
//
// Pieces with the same finish are merged into one mesh with vertex colours.

import * as THREE from 'three';
import { finish, type Finish } from './materials';
import { merge, paint } from './geo';
import type { ColorLike } from './color';

export interface BatchBuildOpts {
  castShadow?: boolean;
  receiveShadow?: boolean;
  name?: string;
}

export class Batch {
  private groups = new Map<string, { finish: Finish | null; material: THREE.Material | null; geos: THREE.BufferGeometry[] }>();

  /**
   * Add a geometry painted with `color` (multiplied by `intensity`) using a shared
   * vertex-coloured material of the given finish. If color is null the geometry's
   * own vertex colours are kept (e.g. after paintBy()).
   */
  add(geo: THREE.BufferGeometry, color: ColorLike | null, kind: Finish = 'matte', intensity = 1): this {
    if (color !== null) paint(geo, color, intensity);
    const k = 'f:' + kind;
    let g = this.groups.get(k);
    if (!g) {
      g = { finish: kind, material: null, geos: [] };
      this.groups.set(k, g);
    }
    g.geos.push(geo);
    return this;
  }

  /** Add a geometry that should use a specific (non vertex coloured) material. */
  addWith(geo: THREE.BufferGeometry, material: THREE.Material): this {
    const k = 'm:' + material.uuid;
    let g = this.groups.get(k);
    if (!g) {
      g = { finish: null, material, geos: [] };
      this.groups.set(k, g);
    }
    g.geos.push(geo);
    return this;
  }

  get size(): number {
    let n = 0;
    for (const g of this.groups.values()) n += g.geos.length;
    return n;
  }

  /** Merge everything into a Group of meshes (one per finish/material). */
  build(o: BatchBuildOpts = {}): THREE.Group {
    const group = new THREE.Group();
    group.name = o.name ?? 'batch';
    for (const g of this.groups.values()) {
      if (g.geos.length === 0) continue;
      const geo = merge(g.geos);
      geo.computeBoundingSphere();
      const mat = g.material ?? finish(g.finish!);
      const mesh = new THREE.Mesh(geo, mat);
      const unlit = g.finish === 'glow' || g.finish === 'ghost' || g.finish === 'glass';
      mesh.castShadow = (o.castShadow ?? true) && !unlit;
      mesh.receiveShadow = (o.receiveShadow ?? true) && !unlit;
      mesh.name = (o.name ?? 'batch') + ':' + (g.finish ?? 'custom');
      group.add(mesh);
    }
    this.groups.clear();
    return group;
  }
}

// ---------------------------------------------------------------- instancing

const _dummy = new THREE.Object3D();
const _col = new THREE.Color();

/**
 * Create an InstancedMesh and fill it with a callback.
 *   instanced(geo, mat, 500, (i, o, c) => { o.position.set(...); o.rotation.y = ...; c.set('#fff'); })
 * Return false from the callback to hide an instance (scaled to zero).
 * Per-instance colours are enabled when the callback writes to `c`.
 */
export function instanced(
  geo: THREE.BufferGeometry,
  material: THREE.Material,
  count: number,
  fill?: (i: number, o: THREE.Object3D, c: THREE.Color) => void | false,
  opts: { castShadow?: boolean; receiveShadow?: boolean; colors?: boolean } = {},
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geo, material, count);
  mesh.castShadow = opts.castShadow ?? true;
  mesh.receiveShadow = opts.receiveShadow ?? true;
  const useColors = opts.colors ?? true;
  if (fill) {
    for (let i = 0; i < count; i++) {
      _dummy.position.set(0, 0, 0);
      _dummy.rotation.set(0, 0, 0);
      _dummy.scale.set(1, 1, 1);
      _col.setRGB(1, 1, 1);
      const r = fill(i, _dummy, _col);
      if (r === false) _dummy.scale.set(0, 0, 0);
      _dummy.updateMatrix();
      mesh.setMatrixAt(i, _dummy.matrix);
      if (useColors) mesh.setColorAt(i, _col);
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
  // Instances move around in many cities; avoid wrong culling.
  mesh.frustumCulled = false;
  return mesh;
}

/**
 * Helper to animate an InstancedMesh each frame:
 *   const set = instanceSetter(mesh);
 *   set(i, x, y, z, ry, s); ... set.done();
 */
export function instanceSetter(mesh: THREE.InstancedMesh) {
  const fn = (i: number, x: number, y: number, z: number, ry = 0, s: number | [number, number, number] = 1, rx = 0, rz = 0) => {
    _dummy.position.set(x, y, z);
    _dummy.rotation.set(rx, ry, rz);
    if (typeof s === 'number') _dummy.scale.set(s, s, s);
    else _dummy.scale.set(s[0], s[1], s[2]);
    _dummy.updateMatrix();
    mesh.setMatrixAt(i, _dummy.matrix);
  };
  const setter = fn as typeof fn & { done: () => void; color: (i: number, c: ColorLike) => void };
  setter.done = () => {
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };
  setter.color = (i: number, c: ColorLike) => {
    mesh.setColorAt(i, _col.set(c));
  };
  return setter;
}
