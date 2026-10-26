// Animated water: a MeshStandardMaterial whose normals are perturbed by moving
// noise (so it reflects the sky environment and the sun like real water).

import * as THREE from 'three';
import type { ColorLike } from './color';
import { U } from './globals';
import { GLSL_NOISE } from './noise';

export interface WaterOpts {
  color?: ColorLike;
  opacity?: number;
  roughness?: number;
  /** wave normal strength (default 0.35) */
  amp?: number;
  /** wave pattern scale in world units^-1 (default 0.6) */
  scale?: number;
  /** wave speed (default 0.35) */
  speed?: number;
  metalness?: number;
  envMapIntensity?: number;
  side?: THREE.Side;
}

const waterCache = new Map<string, THREE.MeshStandardMaterial>();

/** A water material (cached by parameters). */
export function waterMaterial(o: WaterOpts = {}): THREE.MeshStandardMaterial {
  const k = JSON.stringify(o);
  const hit = waterCache.get(k);
  if (hit) return hit;
  const m = new THREE.MeshStandardMaterial({
    color: new THREE.Color(o.color ?? '#2d5a6b'),
    roughness: o.roughness ?? 0.06,
    metalness: o.metalness ?? 0.05,
    transparent: (o.opacity ?? 1) < 1,
    opacity: o.opacity ?? 1,
    side: o.side ?? THREE.FrontSide,
  });
  m.envMapIntensity = o.envMapIntensity ?? 1.2;
  const amp = (o.amp ?? 0.35).toFixed(4);
  const scale = (o.scale ?? 0.6).toFixed(4);
  const speed = (o.speed ?? 0.35).toFixed(4);
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = U.time;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <fog_vertex>', '#include <fog_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nuniform float uTime;\n' + GLSL_NOISE)
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        {
          vec2 wp = vWPos.xz * ${scale};
          float t = uTime * ${speed};
          float e = 0.07;
          float h0 = snoise(vec3(wp, t)) + 0.5 * snoise(vec3(wp * 2.7, t * 1.6));
          float hx = snoise(vec3(wp + vec2(e, 0.0), t)) + 0.5 * snoise(vec3((wp + vec2(e, 0.0)) * 2.7, t * 1.6));
          float hz = snoise(vec3(wp + vec2(0.0, e), t)) + 0.5 * snoise(vec3((wp + vec2(0.0, e)) * 2.7, t * 1.6));
          vec3 nW = normalize(vec3(-(hx - h0) / e * ${amp}, 1.0, -(hz - h0) / e * ${amp}));
          normal = normalize((viewMatrix * vec4(nW, 0.0)).xyz);
        }`,
      );
  };
  m.customProgramCacheKey = () => 'water|' + amp + scale + speed;
  (m.userData as { shared?: boolean }).shared = true;
  waterCache.set(k, m);
  return m;
}

/** Circular water surface at height y. */
export function waterDisc(radius: number, y = 0, o: WaterOpts = {}, seg = 96): THREE.Mesh {
  const geo = new THREE.CircleGeometry(radius, seg).rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, waterMaterial(o));
  mesh.position.y = y;
  mesh.receiveShadow = true;
  mesh.name = 'water';
  return mesh;
}

/** Rectangular water surface at height y (e.g. a canal), optionally rotated. */
export function waterRect(w: number, d: number, x = 0, y = 0, z = 0, ry = 0, o: WaterOpts = {}): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, waterMaterial(o));
  mesh.position.set(x, y, z);
  mesh.rotation.y = ry;
  mesh.receiveShadow = true;
  mesh.name = 'water';
  return mesh;
}

/** Water over an arbitrary geometry (e.g. a ring-shaped canal from geo.ring()). */
export function waterMesh(geo: THREE.BufferGeometry, o: WaterOpts = {}): THREE.Mesh {
  const mesh = new THREE.Mesh(geo, waterMaterial(o));
  mesh.receiveShadow = true;
  mesh.name = 'water';
  return mesh;
}
