// Material factories. Materials are cached by their parameters, so calling
// M.plaster('#e9dcc3') a hundred times returns the same instance (fewer GPU programs,
// fewer state changes).
//
// Two families:
//   - colour materials:   M.stone('#8a7f70'), M.gold(), M.glow('#ffcc88', 3) ...
//   - finish materials:   finish('plaster') etc. use VERTEX COLOURS (see Batch / paint()),
//                         so one draw call can hold a whole city of differently coloured houses.

import * as THREE from 'three';
import type { ColorLike } from './color';

export type Finish =
  | 'matte'
  | 'plaster'
  | 'stone'
  | 'wood'
  | 'cloth'
  | 'ceramic'
  | 'polished'
  | 'metal'
  | 'gold'
  | 'silver'
  | 'bronze'
  | 'glass'
  | 'glow'
  | 'ghost';

const cache = new Map<string, THREE.Material>();

function key(parts: unknown[]): string {
  return parts.map((p) => (p instanceof THREE.Color ? p.getHexString() : String(p))).join('|');
}

function cached<T extends THREE.Material>(k: string, make: () => T): T {
  let m = cache.get(k) as T | undefined;
  if (!m) {
    m = make();
    (m.userData as { shared?: boolean }).shared = true;
    cache.set(k, m);
  }
  return m;
}

export interface StdOpts {
  roughness?: number;
  metalness?: number;
  emissive?: ColorLike;
  emissiveIntensity?: number;
  flatShading?: boolean;
  side?: THREE.Side;
  transparent?: boolean;
  opacity?: number;
  envMapIntensity?: number;
  depthWrite?: boolean;
  vertexColors?: boolean;
  fog?: boolean;
}

/** A cached MeshStandardMaterial. */
export function std(color: ColorLike, o: StdOpts = {}): THREE.MeshStandardMaterial {
  const c = new THREE.Color(color);
  const k = key(['std', c, o.roughness, o.metalness, o.emissive, o.emissiveIntensity, o.flatShading, o.side, o.transparent, o.opacity, o.envMapIntensity, o.depthWrite, o.vertexColors, o.fog]);
  return cached(k, () => {
    const m = new THREE.MeshStandardMaterial({
      color: c,
      roughness: o.roughness ?? 0.85,
      metalness: o.metalness ?? 0,
      flatShading: o.flatShading ?? false,
      side: o.side ?? THREE.FrontSide,
      transparent: o.transparent ?? false,
      opacity: o.opacity ?? 1,
      vertexColors: o.vertexColors ?? false,
      fog: o.fog ?? true,
    });
    if (o.emissive !== undefined) {
      m.emissive = new THREE.Color(o.emissive);
      m.emissiveIntensity = o.emissiveIntensity ?? 1;
    }
    if (o.envMapIntensity !== undefined) m.envMapIntensity = o.envMapIntensity;
    if (o.depthWrite !== undefined) m.depthWrite = o.depthWrite;
    return m;
  });
}

/** Material presets with a fixed colour. */
export const M = {
  matte: (c: ColorLike, rough = 0.95) => std(c, { roughness: rough }),
  plaster: (c: ColorLike) => std(c, { roughness: 0.92 }),
  stone: (c: ColorLike) => std(c, { roughness: 0.82 }),
  wood: (c: ColorLike) => std(c, { roughness: 0.75 }),
  cloth: (c: ColorLike, side: THREE.Side = THREE.DoubleSide) => std(c, { roughness: 0.95, side }),
  ceramic: (c: ColorLike) => std(c, { roughness: 0.35 }),
  polished: (c: ColorLike) => std(c, { roughness: 0.18, envMapIntensity: 1.3 }),
  metal: (c: ColorLike, rough = 0.35) => std(c, { roughness: rough, metalness: 0.9 }),
  gold: (c: ColorLike = '#e0b04f', rough = 0.28) => std(c, { roughness: rough, metalness: 1, envMapIntensity: 1.4 }),
  silver: (c: ColorLike = '#d9dde3', rough = 0.22) => std(c, { roughness: rough, metalness: 1, envMapIntensity: 1.4 }),
  bronze: (c: ColorLike = '#9c6b3d', rough = 0.4) => std(c, { roughness: rough, metalness: 0.85 }),
  copper: (c: ColorLike = '#b87050', rough = 0.35) => std(c, { roughness: rough, metalness: 0.9 }),
  aluminium: (c: ColorLike = '#c9cdd2', rough = 0.3) => std(c, { roughness: rough, metalness: 0.95, envMapIntensity: 1.2 }),
  /** Cheap glass: transparent, glossy, no transmission pass. */
  glass: (c: ColorLike = '#bfe3f0', opacity = 0.28) =>
    std(c, { roughness: 0.05, metalness: 0.1, transparent: true, opacity, depthWrite: false, envMapIntensity: 1.6, side: THREE.DoubleSide }),
  /** Unlit, bright: drives the bloom. intensity > 1 pushes into HDR. */
  glow: (c: ColorLike, intensity = 2.5) => {
    const base = new THREE.Color(c);
    return cached(key(['glow', base, intensity]), () => new THREE.MeshBasicMaterial({ color: base.clone().multiplyScalar(intensity) }));
  },
  /** Unlit, additive, for halos, beams and ghosts. */
  additive: (c: ColorLike, opacity = 0.5) => {
    const base = new THREE.Color(c);
    return cached(
      key(['add', base, opacity]),
      () =>
        new THREE.MeshBasicMaterial({
          color: base,
          transparent: true,
          opacity,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
          fog: true,
        }),
    );
  },
  /** Lit but self-luminous (windows that still receive some shading). */
  emissive: (c: ColorLike, intensity = 1.5, base: ColorLike = '#222222') =>
    std(base, { roughness: 0.6, emissive: c, emissiveIntensity: intensity }),
  /** Translucent unlit surface (ghost cities, memories, projections). */
  ghost: (c: ColorLike, opacity = 0.35) => {
    const base = new THREE.Color(c);
    return cached(
      key(['ghost', base, opacity]),
      () => new THREE.MeshBasicMaterial({ color: base, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide }),
    );
  },
  basic: (c: ColorLike, side: THREE.Side = THREE.FrontSide) => {
    const base = new THREE.Color(c);
    return cached(key(['basic', base, side]), () => new THREE.MeshBasicMaterial({ color: base, side }));
  },
  line: (c: ColorLike, opacity = 1) => {
    const base = new THREE.Color(c);
    return cached(
      key(['line', base, opacity]),
      () => new THREE.LineBasicMaterial({ color: base, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 }),
    );
  },
};

const FINISH_PARAMS: Record<Finish, () => THREE.Material> = {
  matte: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }),
  plaster: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }),
  stone: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }),
  wood: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72 }),
  cloth: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, side: THREE.DoubleSide }),
  ceramic: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35 }),
  polished: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.15, envMapIntensity: 1.3 }),
  metal: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.9 }),
  gold: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.26, metalness: 1, envMapIntensity: 1.4 }),
  silver: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.2, metalness: 1, envMapIntensity: 1.4 }),
  bronze: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.85 }),
  glass: () =>
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.05,
      metalness: 0.1,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      side: THREE.DoubleSide,
      envMapIntensity: 1.6,
    }),
  // Unlit; vertex colours may exceed 1.0 to drive bloom (see paint(geo, c, intensity)).
  glow: () => new THREE.MeshBasicMaterial({ vertexColors: true }),
  ghost: () =>
    new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }),
};

/** A cached vertex-coloured material with the given finish. */
export function finish(kind: Finish): THREE.Material {
  return cached('finish|' + kind, FINISH_PARAMS[kind]);
}

/** True when a material comes from the shared cache (must not be mutated by a city). */
export function isShared(m: THREE.Material): boolean {
  return !!(m.userData as { shared?: boolean }).shared;
}
