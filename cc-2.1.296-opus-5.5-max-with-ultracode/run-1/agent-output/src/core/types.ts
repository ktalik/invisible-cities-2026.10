// The contract between the engine and the 55 city modules.
//
// A city module lives in src/cities/<id>.ts and default-exports a builder:
//
//   import * as THREE from 'three';
//   import * as K from '../kit';
//   import type { CityBuilder } from '../core/types';
//
//   const build: CityBuilder = (ctx) => {
//     const root = new THREE.Group();
//     ...
//     return { root, env: {...}, camera: {...}, update(t, dt) {...}, interaction: {...} };
//   };
//   export default build;

import type * as THREE from 'three';
import type { RNG } from '../kit/rng';

export type SeriesId =
  | 'memory'
  | 'desire'
  | 'signs'
  | 'thin'
  | 'trading'
  | 'eyes'
  | 'names'
  | 'dead'
  | 'sky'
  | 'continuous'
  | 'hidden';

export interface CityMeta {
  id: string;
  name: string;
  /** 1..55 in the book's order of narration */
  order: number;
  /** 1..9 */
  chapter: number;
  series: SeriesId;
  /** 1..5 within the series */
  number: number;
  caption: string;
  motto: string;
}

export interface SeriesMeta {
  id: SeriesId;
  name: string;
  /** index 0..10 (sector in the atlas) */
  index: number;
  color: string;
  blurb: string;
}

/** Lighting, sky and post-processing settings for a city. All fields optional in a city's `env`. */
export interface EnvSpec {
  /** sky gradient */
  skyTop: THREE.ColorRepresentation;
  skyHorizon: THREE.ColorRepresentation;
  skyBottom: THREE.ColorRepresentation;
  /** how quickly the sky turns from horizon to top colour (default 0.6; lower = more top colour) */
  skyCurve: number;
  /** fog colour (defaults to skyHorizon) */
  fog: THREE.ColorRepresentation | null;
  fogNear: number;
  fogFar: number;
  /** direction TOWARDS the sun/moon light (need not be normalised) */
  sunDir: [number, number, number];
  sunColor: THREE.ColorRepresentation;
  /** directional light intensity */
  sunIntensity: number;
  /** visible sun disc in the sky: 0 none, 1 normal; draws at sunDir */
  sunDisc: number;
  /** halo around the sun in the sky (0..2) */
  sunGlow: number;
  /** a moon disc (independent of the light) */
  moon: { dir: [number, number, number]; size: number; color: THREE.ColorRepresentation } | null;
  hemiSky: THREE.ColorRepresentation;
  hemiGround: THREE.ColorRepresentation;
  hemiIntensity: number;
  /** image based lighting strength from the sky (scene.environmentIntensity) */
  envIntensity: number;
  /** star field density/brightness 0..1 */
  stars: number;
  /** procedural clouds in the sky dome 0..1 */
  clouds: number;
  cloudColor: THREE.ColorRepresentation;
  /** tone mapping exposure */
  exposure: number;
  bloomStrength: number;
  bloomRadius: number;
  bloomThreshold: number;
  vignette: number;
  grain: number;
  saturation: number;
  contrast: number;
  /** colour multiplied over the final image (e.g. warm '#fff3e0') */
  tint: THREE.ColorRepresentation;
  /** miniature tilt-shift blur at the top/bottom of the frame 0..1 */
  tiltShift: number;
  /** half-size of the shadow camera frustum (world units) */
  shadowRadius: number;
  shadowBias: number;
  /** cast shadows at all */
  shadows: boolean;
}

export interface CameraView {
  position: [number, number, number];
  target: [number, number, number];
}

export interface CameraSpec extends CameraView {
  fov?: number;
  minDistance?: number;
  maxDistance?: number;
  /** min/max polar angle from the zenith (radians). maxPolar ~1.45 keeps the camera above the ground */
  minPolar?: number;
  maxPolar?: number;
  /** auto-rotation speed when idle (default 0.35; 0 disables) */
  autoRotate?: number;
  /** extra named views used by the journey and screenshots */
  views?: CameraView[];
}

export interface CityInteraction {
  /** button label to activate, e.g. 'Look down' */
  label: string;
  /** button label while active, e.g. 'Look up' (defaults to label) */
  activeLabel?: string;
  /** one line shown while active (optional) */
  hint?: string;
  /** called when toggled; animate the change in update() */
  set(active: boolean): void;
  /** optional camera to move to while active */
  camera?: CameraView;
}

export interface CityInstance {
  root: THREE.Object3D;
  env?: Partial<EnvSpec>;
  camera?: CameraSpec;
  /** t = seconds since the city appeared, dt = frame delta (both deterministic in screenshots) */
  update?(t: number, dt: number): void;
  interaction?: CityInteraction;
  /** extra cleanup beyond geometry/material/texture disposal (which is automatic) */
  dispose?(): void;
}

export interface CityContext {
  meta: CityMeta;
  /** deterministic RNG seeded by the city id */
  rng: RNG;
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  /** 'high' on desktop GPUs, 'low' on weak devices: scale counts accordingly */
  quality: 'low' | 'high';
}

export type CityBuilder = (ctx: CityContext) => CityInstance | Promise<CityInstance>;
