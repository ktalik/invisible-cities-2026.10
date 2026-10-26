// Build a city module into a World the stage can display.

import * as THREE from 'three';
import * as K from '../kit';
import { loadCity } from '../cities/registry';
import { disposeObject } from './dispose';
import { resolveEnv } from './sky';
import type { World } from './stage';
import type { CameraSpec, CameraView, CityBuilder, CityContext, CityInstance, CityMeta, EnvSpec } from './types';
import type { Stage } from './stage';

export const DEFAULT_CAMERA: CameraSpec = {
  position: [30, 22, 42],
  target: [0, 2, 0],
  fov: 40,
  minDistance: 8,
  maxDistance: 120,
  maxPolar: 1.45,
  autoRotate: 0.35,
};

export interface CityWorld {
  world: World;
  instance: CityInstance;
  buildMs: number;
}

/** A modest stand-in used while a city module does not exist yet. */
function placeholder(ctx: CityContext): CityInstance {
  const root = new THREE.Group();
  const isl = K.island({ radius: 14, seed: ctx.meta.order, top: '#b9ad92', edge: '#a99878' });
  root.add(isl.mesh);
  const b = new K.Batch();
  const rng = ctx.rng;
  for (let i = 0; i < 40; i++) {
    const [x, z] = rng.inDisc(9);
    K.house(b, { x, z, ry: rng.angle(), w: rng.float(0.8, 1.6), d: rng.float(0.8, 1.6), h: rng.float(0.8, 3), rng, roof: rng.pick(['gable', 'flat', 'dome'] as const) });
  }
  root.add(b.build());
  const label = K.textSprite(ctx.meta.name, 2.2, { italic: true, color: '#3a2e22' });
  label.position.set(0, 8, 0);
  root.add(label);
  return { root, env: { skyTop: '#9fb0bf', skyHorizon: '#efe6d6', skyBottom: '#d9cfc0' } };
}

/** Compute a generic alternative view around a camera spec. */
export function derivedView(spec: CameraSpec, which: number): CameraView {
  const views = spec.views ?? [];
  if (which > 0 && views[which - 1]) return views[which - 1];
  if (which === 0) return { position: spec.position, target: spec.target };
  const t = new THREE.Vector3(...spec.target);
  const p = new THREE.Vector3(...spec.position).sub(t);
  const s = new THREE.Spherical().setFromVector3(p);
  if (which === 1) {
    s.theta += (Math.PI * 2) / 3;
    s.phi *= 0.55;
    s.radius *= 1.1;
  } else {
    s.theta -= (Math.PI * 2) / 3;
    s.phi = Math.min(spec.maxPolar ?? 1.45, s.phi * 1.25);
    s.radius *= 0.55;
  }
  const np = new THREE.Vector3().setFromSpherical(s).add(t);
  return { position: [np.x, np.y, np.z], target: spec.target };
}

export async function createCityWorld(meta: CityMeta, stage: Stage, quality: 'low' | 'high', direct?: CityBuilder): Promise<CityWorld> {
  const builder = direct ?? (await loadCity(meta.id));
  const ctx: CityContext = { meta, rng: new K.RNG(meta.id), renderer: stage.renderer, camera: stage.camera, quality };
  const t0 = performance.now();
  let instance: CityInstance;
  try {
    instance = builder ? await builder(ctx) : placeholder(ctx);
  } catch (e) {
    // a broken city must never break the atlas: show a stand-in and report
    console.error(`city ${meta.id} failed to build`, e);
    instance = placeholder(ctx);
  }
  const buildMs = performance.now() - t0;
  const env: EnvSpec = resolveEnv(instance.env);
  const camera: CameraSpec = { ...DEFAULT_CAMERA, ...(instance.camera ?? {}) };
  const world: World = {
    root: instance.root,
    env,
    camera,
    update: instance.update ? (t, dt) => instance.update!(t, dt) : undefined,
    dispose() {
      try {
        instance.dispose?.();
      } finally {
        disposeObject(instance.root);
      }
    },
  };
  return { world, instance, buildMs };
}
