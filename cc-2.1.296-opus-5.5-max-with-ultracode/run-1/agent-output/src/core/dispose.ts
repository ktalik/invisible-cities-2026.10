import * as THREE from 'three';
import { isShared } from '../kit/materials';

/** Dispose all GPU resources under an object (shared cached materials are kept). */
export function disposeObject(root: THREE.Object3D) {
  const mats = new Set<THREE.Material>();
  const geos = new Set<THREE.BufferGeometry>();
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry) geos.add(m.geometry);
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((x) => mats.add(x));
    else if (mat) mats.add(mat);
    if ((o as THREE.InstancedMesh).isInstancedMesh) (o as THREE.InstancedMesh).dispose();
  });
  geos.forEach((g) => g.dispose());
  mats.forEach((m) => {
    if (isShared(m)) return;
    for (const v of Object.values(m)) {
      if (v instanceof THREE.Texture) v.dispose();
    }
    const u = (m as THREE.ShaderMaterial).uniforms;
    if (u) for (const k of Object.keys(u)) if (u[k]?.value instanceof THREE.Texture && k !== 'tDiffuse') (u[k].value as THREE.Texture).dispose();
    m.dispose();
  });
}
