// Colour helpers. All inputs accept anything THREE.Color accepts ('#aabbcc', 0xaabbcc, 'skyblue').

import * as THREE from 'three';
import type { RNG } from './rng';

export type ColorLike = THREE.ColorRepresentation;

const _c = new THREE.Color();
const _hsl = { h: 0, s: 0, l: 0 };

export function col(c: ColorLike): THREE.Color {
  return new THREE.Color(c);
}

/** Linear interpolation between two colours (in working/linear space). */
export function mix(a: ColorLike, b: ColorLike, t: number): THREE.Color {
  return new THREE.Color(a).lerp(_c.set(b), t);
}

/** Multiply lightness: f < 1 darkens, f > 1 lightens (HSL). */
export function shade(c: ColorLike, f: number): THREE.Color {
  const out = new THREE.Color(c);
  out.getHSL(_hsl);
  out.setHSL(_hsl.h, _hsl.s, Math.min(1, Math.max(0, _hsl.l * f)));
  return out;
}

/** Return a slightly varied copy of a colour: hue shift dh (0..1 turns), sat/light deltas. */
export function jitter(c: ColorLike, rng: RNG, dh = 0.02, ds = 0.05, dl = 0.06): THREE.Color {
  const out = new THREE.Color(c);
  out.getHSL(_hsl);
  out.setHSL(
    (_hsl.h + rng.float(-dh, dh) + 1) % 1,
    Math.min(1, Math.max(0, _hsl.s + rng.float(-ds, ds))),
    Math.min(1, Math.max(0, _hsl.l + rng.float(-dl, dl))),
  );
  return out;
}

/** HSL constructor (h in turns 0..1). */
export function hsl(h: number, s: number, l: number): THREE.Color {
  return new THREE.Color().setHSL(((h % 1) + 1) % 1, s, l);
}

/** Pick one colour from a list and jitter it. */
export function pickJitter(list: readonly ColorLike[], rng: RNG, dh = 0.015, ds = 0.04, dl = 0.05): THREE.Color {
  return jitter(rng.pick(list), rng, dh, ds, dl);
}
