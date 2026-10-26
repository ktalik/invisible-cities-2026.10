import type * as THREE from 'three';
import type { B } from '../engine/kit';
import type { City } from '../data/cities';

export interface Ctx {
  city: City;
  accent: THREE.Color;
  /** time-of-focus helpers, set by the atlas */
  focus: { value: number };
  /** preferred camera framing when visiting this city */
  view: CityView;
  /** depth below the lagoon this city needs; opens a shaft in the water */
  below: number;
}

export interface CityView {
  dist?: number;
  elev?: number; // radians above the horizon
  yaw?: number; // radians, 0 = looking north from the south
  ty?: number; // target height
}

export type Gen = (b: B, ctx: Ctx) => void;
