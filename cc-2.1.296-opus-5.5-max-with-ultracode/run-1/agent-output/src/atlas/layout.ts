// Geometry of the Khan's atlas: a rose window of 11 sectors (the thematic series)
// and 5 rings (the five appearances of each series, growing outward from the centre).
// Read in the book's order, the cities trace nine spiral arms: the chapters.

import { CITIES } from '../data/cities';
import { SERIES_BY_ID } from '../data/series';
import type { CityMeta } from '../core/types';

export const RING_R = [5.0, 8.3, 12.1, 16.7, 22.1];
export const MEDAL_R = [1.12, 1.5, 1.95, 2.4, 2.8];
export const BOARD_R = 27.6;
export const SECTORS = 11;

export interface Slot {
  meta: CityMeta;
  x: number;
  z: number;
  /** angle of the sector centre (radians, atan2(z, x) convention) */
  angle: number;
  ring: number;
  r: number;
  /** medallion radius */
  m: number;
}

/** Sector centre angle: sector 0 (memory) at the top of the board (towards -z), going clockwise as seen from above. */
export function sectorAngle(index: number): number {
  return -Math.PI / 2 + ((index + 0.5) / SECTORS) * Math.PI * 2 - Math.PI / SECTORS;
}

export function sectorBounds(index: number): [number, number] {
  const a = sectorAngle(index);
  return [a - Math.PI / SECTORS, a + Math.PI / SECTORS];
}

export const SLOTS: Slot[] = CITIES.map((meta) => {
  const s = SERIES_BY_ID[meta.series];
  const ring = meta.number - 1;
  const angle = sectorAngle(s.index);
  const r = RING_R[ring];
  return { meta, ring, r, angle, m: MEDAL_R[ring], x: Math.cos(angle) * r, z: Math.sin(angle) * r };
});

export const SLOT_BY_ID: Record<string, Slot> = Object.fromEntries(SLOTS.map((s) => [s.meta.id, s]));

export const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
