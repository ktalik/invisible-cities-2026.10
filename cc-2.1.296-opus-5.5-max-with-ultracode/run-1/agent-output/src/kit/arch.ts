// Architecture generators. Each function adds pieces to a Batch (so a whole city
// merges into a handful of draw calls). All take world-space placement (x, y, z, ry).
//
//   const b = new Batch();
//   house(b, { x: 2, z: 3, w: 1.6, d: 1.4, h: 2.2, roof: 'gable', wall: '#e7d6b8', roofColor: '#9b4a32' });
//   tower(b, { x: 0, z: 0, r: 0.8, h: 7, top: 'onion', color: '#d8cbb0', topColor: '#c9a24c', topFinish: 'gold' });
//   root.add(b.build());

import * as THREE from 'three';
import type { Batch } from './batch';
import type { ColorLike } from './color';
import type { Finish } from './materials';
import { RNG } from './rng';
import {
  at, box, cyl, cone, dome, onion, pyramid, gableRoof, hipRoof, shedRoof, wallPlane, archWall, archBand,
  crenelRing, ngon, sphere, strut, torus, lathe, merge,
} from './geo';

export type RoofKind = 'gable' | 'hip' | 'flat' | 'dome' | 'pyramid' | 'shed' | 'onion' | 'cone' | 'none';

export interface Place {
  x?: number;
  y?: number;
  z?: number;
  /** rotation around y (radians) */
  ry?: number;
}

export interface HouseOpts extends Place {
  w: number;
  d: number;
  h: number;
  roof?: RoofKind;
  roofH?: number;
  wall?: ColorLike;
  wallFinish?: Finish;
  roofColor?: ColorLike;
  roofFinish?: Finish;
  /** window grid on all facades (default true) */
  windows?: boolean;
  windowColor?: ColorLike;
  /** fraction of windows lit (0 = all dark, 1 = all glowing) */
  lit?: number;
  /** HDR intensity of lit windows (default 3) */
  glow?: number;
  litColor?: ColorLike;
  door?: boolean;
  /** cornice band under the roof */
  cornice?: boolean;
  rng?: RNG;
}

const _fallbackRng = new RNG(7);

/** Window/door decals on the four facades of a w x d x h block (local coordinates). */
function facadeDecals(b: Batch, o: HouseOpts, place: (g: THREE.BufferGeometry) => THREE.BufferGeometry) {
  const rng = o.rng ?? _fallbackRng;
  const rows = Math.max(1, Math.floor(o.h / 0.85));
  const lit = o.lit ?? 0;
  const winDark = o.windowColor ?? '#2a2622';
  const litCol = o.litColor ?? '#ffc777';
  const glow = o.glow ?? 3;
  const faces: [number, number, number, number][] = [
    // [width along face, offset x, offset z, rotation]
    [o.w, 0, o.d / 2, 0],
    [o.w, 0, -o.d / 2, Math.PI],
    [o.d, o.w / 2, 0, Math.PI / 2],
    [o.d, -o.w / 2, 0, -Math.PI / 2],
  ];
  for (let fi = 0; fi < faces.length; fi++) {
    const [fw, ox, oz, rot] = faces[fi];
    const cols = Math.max(1, Math.floor(fw / 0.7));
    const ww = Math.min(0.26, (fw / cols) * 0.45);
    const wh = Math.min(0.38, (o.h / rows) * 0.45);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const isDoor = o.door !== false && fi === 0 && r === 0 && c === Math.floor(cols / 2);
        const lx = -fw / 2 + (c + 0.5) * (fw / cols);
        const ly = isDoor ? 0 : (r + 0.5) * (o.h / rows) - wh / 2 + 0.05;
        const g = wallPlane(isDoor ? ww * 1.25 : ww, isDoor ? Math.min(0.55, o.h * 0.4) : wh);
        at(g, lx, ly, 0.012);
        at(g, ox, 0, oz, { ry: rot });
        const on = !isDoor && rng.chance(lit);
        b.add(place(g), on ? litCol : winDark, on ? 'glow' : 'matte', on ? glow : 1);
      }
    }
  }
}

function placer(o: Place) {
  return (g: THREE.BufferGeometry) => at(g, o.x ?? 0, o.y ?? 0, o.z ?? 0, { ry: o.ry ?? 0 });
}

/** Add a roof of the given kind on top of a w x d footprint at height y0 (local coords). */
export function roof(b: Batch, kind: RoofKind, w: number, d: number, y0: number, h: number, color: ColorLike, fin: Finish, place: (g: THREE.BufferGeometry) => THREE.BufferGeometry) {
  let g: THREE.BufferGeometry | null = null;
  const r = Math.min(w, d) / 2;
  switch (kind) {
    case 'gable': g = gableRoof(w, d, h); break;
    case 'hip': g = hipRoof(w, d, h); break;
    case 'pyramid': g = pyramid(w * 1.08, d * 1.08, h); break;
    case 'shed': g = shedRoof(w + 0.1, d + 0.1, 0.08, h); break;
    case 'dome': g = dome(r * 0.95, 18, 1, h / Math.max(0.01, r)); break;
    case 'onion': g = onion(r * 0.8, h * 1.6, 16); break;
    case 'cone': g = cone(r * 1.1, h, 16); break;
    case 'flat': g = box(w + 0.08, 0.08, d + 0.08); break;
    case 'none': g = null; break;
  }
  if (g) b.add(place(at(g, 0, y0, 0)), color, fin);
}

/** A house: block body, roof, optional windows and door. */
export function house(b: Batch, o: HouseOpts) {
  const place = placer(o);
  b.add(place(box(o.w, o.h, o.d)), o.wall ?? '#e6d8bd', o.wallFinish ?? 'plaster');
  if (o.cornice) b.add(place(at(box(o.w + 0.08, 0.07, o.d + 0.08), 0, o.h - 0.07, 0)), o.wall ?? '#e6d8bd', o.wallFinish ?? 'plaster');
  const kind = o.roof ?? 'gable';
  const rh = o.roofH ?? (kind === 'flat' ? 0.08 : Math.min(o.w, o.d) * 0.45);
  roof(b, kind, o.w, o.d, o.h, rh, o.roofColor ?? '#9c4f36', o.roofFinish ?? 'ceramic', place);
  if (o.windows !== false && o.h > 0.5) facadeDecals(b, o, place);
}

export interface TowerOpts extends Place {
  r: number;
  h: number;
  /** 4 = square, 6/8 = polygonal, >= 12 round */
  sides?: number;
  top?: 'cone' | 'dome' | 'onion' | 'crenel' | 'flat' | 'spire' | 'pyramid' | 'none';
  topH?: number;
  color?: ColorLike;
  finish?: Finish;
  topColor?: ColorLike;
  topFinish?: Finish;
  /** taper factor for the shaft (1 = straight) */
  taper?: number;
  /** horizontal bands every n units */
  bands?: number;
  bandColor?: ColorLike;
  /** slit windows */
  windows?: boolean;
  lit?: number;
  litColor?: ColorLike;
  rng?: RNG;
}

/** A tower (round, square or polygonal) with a choice of crowns. */
export function tower(b: Batch, o: TowerOpts) {
  const place = placer(o);
  const sides = o.sides ?? 12;
  const taper = o.taper ?? 1;
  const col = o.color ?? '#d9ccb2';
  const fin = o.finish ?? 'stone';
  const rTop = o.r * taper;
  b.add(place(ngon(o.r, o.h, sides, rTop)), col, fin);
  if (o.bands) {
    for (let y = o.bands; y < o.h - 0.2; y += o.bands) {
      const rr = o.r + (rTop - o.r) * (y / o.h);
      b.add(place(at(ngon(rr * 1.06, 0.1, sides), 0, y, 0)), o.bandColor ?? col, fin);
    }
  }
  if (o.windows !== false) {
    const rng = o.rng ?? _fallbackRng;
    const n = Math.max(2, Math.min(8, Math.floor(sides / 2)));
    for (let y = 0.8; y < o.h - 0.6; y += 1.1) {
      for (let i = 0; i < n; i++) {
        if (!rng.chance(0.6)) continue;
        const a = (i / n) * Math.PI * 2 + y;
        const rr = (o.r + (rTop - o.r) * (y / o.h)) * (sides <= 8 ? Math.cos(Math.PI / sides) : 1) + 0.01;
        const g = wallPlane(0.12, 0.34);
        at(g, 0, 0, rr);
        at(g, 0, y, 0, { ry: a });
        const on = rng.chance(o.lit ?? 0);
        b.add(place(g), on ? (o.litColor ?? '#ffc777') : '#2a2420', on ? 'glow' : 'matte', on ? 3 : 1);
      }
    }
  }
  const top = o.top ?? 'cone';
  const tc = o.topColor ?? '#8f4a35';
  const tf = o.topFinish ?? 'ceramic';
  const th = o.topH ?? rTop * 2;
  switch (top) {
    case 'cone': b.add(place(at(cone(rTop * 1.18, th, Math.max(sides, 8)), 0, o.h, 0)), tc, tf); break;
    case 'spire': b.add(place(at(cone(rTop * 0.7, th * 2.2, Math.max(sides, 8)), 0, o.h, 0)), tc, tf); break;
    case 'pyramid': b.add(place(at(pyramid(rTop * 2.1, rTop * 2.1, th), 0, o.h, 0)), tc, tf); break;
    case 'dome': b.add(place(at(dome(rTop * 1.02, 18, 1, th / (rTop * 1.02) * 0.6), 0, o.h, 0)), tc, tf); break;
    case 'onion': {
      b.add(place(at(onion(rTop * 1.1, th * 1.4, 18), 0, o.h, 0)), tc, tf);
      b.add(place(at(cyl(0.02, 0.02, th * 0.5, 4), 0, o.h + th * 1.35, 0)), tc, tf);
      break;
    }
    case 'crenel': {
      b.add(place(at(ngon(rTop * 1.12, 0.25, Math.max(sides, 8)), 0, o.h, 0)), col, fin);
      const n = Math.max(6, Math.round(rTop * 7));
      b.add(place(crenelRing(rTop * 1.05, o.h + 0.25, n, (Math.PI * 2 * rTop) / n * 0.5, 0.25, 0.15)), col, fin);
      break;
    }
    case 'flat': b.add(place(at(ngon(rTop * 1.08, 0.12, sides), 0, o.h, 0)), tc, tf); break;
    case 'none': break;
  }
}

export interface WallOpts extends Place {
  r: number;
  h: number;
  thick?: number;
  seg?: number;
  color?: ColorLike;
  finish?: Finish;
  crenels?: boolean;
  /** number of round bastion towers spaced around the wall */
  towers?: number;
  towerColor?: ColorLike;
  towerTop?: TowerOpts['top'];
  towerTopColor?: ColorLike;
  /** angles (radians) where gates are cut */
  gates?: number[];
  gateWidth?: number;
}

/** Circular city wall with optional bastions, crenels and gates. */
export function cityWall(b: Batch, o: WallOpts) {
  const seg = o.seg ?? 64;
  const thick = o.thick ?? 0.4;
  const col = o.color ?? '#cbb999';
  const fin = o.finish ?? 'stone';
  const gw = o.gateWidth ?? 1.4;
  const gates = o.gates ?? [];
  const cx = o.x ?? 0, cz = o.z ?? 0, cy = o.y ?? 0;
  const arcLen = (Math.PI * 2 * o.r) / seg;
  const inGate = (a: number) =>
    gates.some((g) => {
      const d = Math.abs(((a - g + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      return d * o.r < gw / 2;
    });
  for (let i = 0; i < seg; i++) {
    const a = ((i + 0.5) / seg) * Math.PI * 2;
    const gx = cx + Math.cos(a) * o.r, gz = cz + Math.sin(a) * o.r;
    if (inGate(a)) {
      // lintel over the gate
      b.add(at(box(arcLen * 1.04, o.h * 0.3, thick * 1.1), gx, cy + o.h * 0.7, gz, { ry: -a + Math.PI / 2 }), col, fin);
      continue;
    }
    b.add(at(box(arcLen * 1.04, o.h, thick), gx, cy, gz, { ry: -a + Math.PI / 2 }), col, fin);
    if (o.crenels !== false && i % 2 === 0) {
      b.add(at(box(arcLen * 0.55, 0.22, thick * 1.05), gx, cy + o.h, gz, { ry: -a + Math.PI / 2 }), col, fin);
    }
  }
  const nT = o.towers ?? 0;
  for (let i = 0; i < nT; i++) {
    const a = (i / nT) * Math.PI * 2;
    if (inGate(a)) continue;
    tower(b, {
      x: cx + Math.cos(a) * o.r, z: cz + Math.sin(a) * o.r, y: cy,
      r: thick * 1.6, h: o.h * 1.35, sides: 12,
      top: o.towerTop ?? 'crenel', color: o.towerColor ?? col, finish: fin,
      topColor: o.towerTopColor ?? '#8f4a35', windows: false,
    });
  }
}

export interface ColumnOpts extends Place {
  h: number;
  r?: number;
  color?: ColorLike;
  finish?: Finish;
  /** fluted look via polygonal shaft */
  sides?: number;
}

/** Classical column: base, shaft, capital. */
export function column(b: Batch, o: ColumnOpts) {
  const place = placer(o);
  const r = o.r ?? 0.12;
  const col = o.color ?? '#efe6d6';
  const fin = o.finish ?? 'stone';
  b.add(place(box(r * 2.8, r * 0.6, r * 2.8)), col, fin);
  b.add(place(at(ngon(r, o.h - r * 1.6, o.sides ?? 12, r * 0.85), 0, r * 0.6, 0)), col, fin);
  b.add(place(at(cyl(r * 1.5, r * 0.9, r * 0.5, 12), 0, o.h - r, 0)), col, fin);
  b.add(place(at(box(r * 3, r * 0.5, r * 3), 0, o.h - r * 0.5, 0)), col, fin);
}

export interface TempleOpts extends Place {
  w: number;
  d: number;
  h: number;
  color?: ColorLike;
  roofColor?: ColorLike;
  cols?: number;
}

/** Classical temple: stepped podium, peristyle, pediment roof. */
export function temple(b: Batch, o: TempleOpts) {
  const place = placer(o);
  const col = o.color ?? '#efe6d6';
  const steps = 3;
  for (let i = 0; i < steps; i++) {
    const g = box(o.w + (steps - i) * 0.3, 0.15, o.d + (steps - i) * 0.3);
    b.add(place(at(g, 0, i * 0.15, 0)), col, 'stone');
  }
  const y0 = steps * 0.15;
  const n = o.cols ?? Math.max(4, Math.round(o.w / 0.6));
  const m = Math.max(3, Math.round((o.d / o.w) * n));
  const ch = o.h * 0.75;
  const r = Math.min(o.w / n, o.d / m) * 0.18;
  for (let i = 0; i < n; i++) {
    for (const zz of [-o.d / 2 + r * 2, o.d / 2 - r * 2]) {
      columnInto(b, place, -o.w / 2 + r * 2 + (i / (n - 1)) * (o.w - r * 4), y0, zz, ch, r, col);
    }
  }
  for (let j = 1; j < m - 1; j++) {
    for (const xx of [-o.w / 2 + r * 2, o.w / 2 - r * 2]) {
      columnInto(b, place, xx, y0, -o.d / 2 + r * 2 + (j / (m - 1)) * (o.d - r * 4), ch, r, col);
    }
  }
  b.add(place(at(box(o.w * 0.7, ch, o.d * 0.7), 0, y0, 0)), col, 'stone'); // cella
  b.add(place(at(box(o.w + 0.1, o.h * 0.08, o.d + 0.1), 0, y0 + ch, 0)), col, 'stone'); // entablature
  const roofG = gableRoof(o.d + 0.1, o.w + 0.1, o.h * 0.22, 0.05);
  at(roofG, 0, y0 + ch + o.h * 0.08, 0, { ry: Math.PI / 2 });
  b.add(place(roofG), o.roofColor ?? col, 'stone');
}

function columnInto(b: Batch, place: (g: THREE.BufferGeometry) => THREE.BufferGeometry, x: number, y: number, z: number, h: number, r: number, col: ColorLike) {
  b.add(place(at(ngon(r, h, 10, r * 0.85), x, y, z)), col, 'stone');
  b.add(place(at(box(r * 2.6, r * 0.6, r * 2.6), x, y + h - r * 0.6, z)), col, 'stone');
}

export interface DomeHallOpts extends Place {
  r: number;
  h: number;
  color?: ColorLike;
  domeColor?: ColorLike;
  domeFinish?: Finish;
  drum?: boolean;
  lantern?: boolean;
}

/** A domed hall (mosque, basilica, observatory). */
export function domeHall(b: Batch, o: DomeHallOpts) {
  const place = placer(o);
  const col = o.color ?? '#e9dcc4';
  b.add(place(ngon(o.r, o.h, 8)), col, 'plaster');
  let y = o.h;
  if (o.drum !== false) {
    b.add(place(at(cyl(o.r * 0.78, o.r * 0.8, o.r * 0.35, 20), 0, y, 0)), col, 'plaster');
    y += o.r * 0.35;
  }
  b.add(place(at(dome(o.r * 0.8, 24), 0, y, 0)), o.domeColor ?? '#b9c4c9', o.domeFinish ?? 'metal');
  if (o.lantern !== false) {
    b.add(place(at(cyl(o.r * 0.1, o.r * 0.12, o.r * 0.3, 8), 0, y + o.r * 0.78, 0)), col, 'plaster');
    b.add(place(at(cone(o.r * 0.13, o.r * 0.35, 8), 0, y + o.r * 1.07, 0)), o.domeColor ?? '#b9c4c9', o.domeFinish ?? 'metal');
  }
}

export interface MinaretOpts extends Place {
  h: number;
  r?: number;
  color?: ColorLike;
  topColor?: ColorLike;
  topFinish?: Finish;
}

/** Slender minaret with balconies and a pointed cap. */
export function minaret(b: Batch, o: MinaretOpts) {
  const place = placer(o);
  const r = o.r ?? 0.22;
  const col = o.color ?? '#efe3cc';
  b.add(place(ngon(r, o.h, 10, r * 0.85)), col, 'plaster');
  for (const f of [0.55, 0.85]) {
    b.add(place(at(cyl(r * 1.5, r * 1.1, 0.12, 12), 0, o.h * f, 0)), col, 'plaster');
  }
  b.add(place(at(cyl(r * 0.7, r * 0.7, 0.4, 10), 0, o.h, 0)), col, 'plaster');
  b.add(place(at(cone(r * 0.9, r * 3, 10), 0, o.h + 0.4, 0)), o.topColor ?? '#3f6f6a', o.topFinish ?? 'ceramic');
}

export interface BridgeOpts {
  from: [number, number, number];
  to: [number, number, number];
  width?: number;
  /** arch rise under the deck (0 for a flat beam bridge) */
  rise?: number;
  color?: ColorLike;
  finish?: Finish;
  rails?: boolean;
  /** humped deck height at the middle */
  hump?: number;
}

/** A small bridge between two points (deck + optional arch + parapets). */
export function bridge(b: Batch, o: BridgeOpts) {
  const A = new THREE.Vector3(...o.from), B = new THREE.Vector3(...o.to);
  const len = A.distanceTo(B);
  const w = o.width ?? 1;
  const col = o.color ?? '#cdbb9a';
  const fin = o.finish ?? 'stone';
  const ang = Math.atan2(B.x - A.x, B.z - A.z);
  const mid = new THREE.Vector3().addVectors(A, B).multiplyScalar(0.5);
  const hump = o.hump ?? 0;
  const n = 10;
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n;
    const y0 = A.y + (B.y - A.y) * t0 + hump * 4 * t0 * (1 - t0);
    const y1 = A.y + (B.y - A.y) * t1 + hump * 4 * t1 * (1 - t1);
    const zc = -len / 2 + ((t0 + t1) / 2) * len;
    const seg = box(w, 0.14, len / n + 0.02);
    const slope = Math.atan2(y1 - y0, len / n);
    at(seg, 0, -0.07, 0, { rx: -slope });
    at(seg, 0, (y0 + y1) / 2, zc);
    b.add(at(seg, mid.x, 0, mid.z, { ry: ang }), col, fin);
    if (o.rails !== false) {
      for (const sx of [-w / 2 + 0.04, w / 2 - 0.04]) {
        const r = box(0.07, 0.22, len / n + 0.02);
        at(r, 0, 0, 0, { rx: -slope });
        at(r, sx, (y0 + y1) / 2, zc);
        b.add(at(r, mid.x, 0, mid.z, { ry: ang }), col, fin);
      }
    }
  }
  const rise = o.rise ?? 0;
  if (rise > 0) {
    const arch = archBand(len * 0.8, 0.18, w * 0.95, 16, (rise * 2) / (len * 0.8));
    const baseY = Math.min(A.y, B.y) - rise - 0.07;
    at(arch, 0, baseY, 0, { ry: Math.PI / 2 });
    b.add(at(arch, mid.x, 0, mid.z, { ry: ang }), col, fin);
  }
}

export interface LampOpts extends Place {
  h?: number;
  color?: ColorLike;
  glow?: ColorLike;
  intensity?: number;
}

/** Street lamp: pole + glowing head (goes to the 'glow' finish, blooms at night). */
export function lamp(b: Batch, o: LampOpts) {
  const place = placer(o);
  const h = o.h ?? 1.2;
  b.add(place(cyl(0.025, 0.035, h, 6)), o.color ?? '#2c2a28', 'metal');
  b.add(place(at(sphere(0.07, 8, 6), 0, h + 0.05, 0)), o.glow ?? '#ffd08a', 'glow', o.intensity ?? 4);
}

/** Simple arcade: a row of arches (archWall slabs) along x. */
export function arcade(b: Batch, o: Place & { n: number; span: number; h: number; d?: number; color?: ColorLike; finish?: Finish }) {
  const place = placer(o);
  const d = o.d ?? 0.4;
  for (let i = 0; i < o.n; i++) {
    const g = archWall(o.span, o.h, d, o.span * 0.62, o.h * 0.78);
    b.add(place(at(g, (i - (o.n - 1) / 2) * o.span, 0, 0)), o.color ?? '#e2d3b5', o.finish ?? 'stone');
  }
}

/** A flag or pennant on a pole (cloth finish). */
export function flag(b: Batch, o: Place & { h?: number; w?: number; color?: ColorLike; poleColor?: ColorLike }) {
  const place = placer(o);
  const h = o.h ?? 1.2;
  const w = o.w ?? 0.45;
  b.add(place(cyl(0.015, 0.015, h, 5)), o.poleColor ?? '#3a3330', 'metal');
  const g = new THREE.PlaneGeometry(w, w * 0.6);
  at(g, w / 2, h - w * 0.3, 0);
  b.add(place(g), o.color ?? '#b5402c', 'cloth');
}

/** Market stall / tent: four poles and a cloth canopy. */
export function stall(b: Batch, o: Place & { w?: number; d?: number; h?: number; cloth?: ColorLike; stripes?: ColorLike }) {
  const place = placer(o);
  const w = o.w ?? 0.9, d = o.d ?? 0.7, h = o.h ?? 0.7;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add(place(at(cyl(0.015, 0.015, h, 4), (sx * w) / 2, 0, (sz * d) / 2)), '#4b3a2c', 'wood');
  const roofG = gableRoof(w, d, 0.22, 0.06);
  b.add(place(at(roofG, 0, h, 0)), o.cloth ?? '#c8573a', 'cloth');
  b.add(place(at(box(w * 0.9, 0.08, d * 0.5), 0, h * 0.45, 0)), o.stripes ?? '#8a6a4a', 'wood');
}

/** Chimney with optional cap. */
export function chimney(b: Batch, o: Place & { h?: number; w?: number; color?: ColorLike }) {
  const place = placer(o);
  const w = o.w ?? 0.14, h = o.h ?? 0.5;
  b.add(place(box(w, h, w)), o.color ?? '#7a5a48', 'stone');
  b.add(place(at(box(w * 1.3, 0.04, w * 1.3), 0, h, 0)), o.color ?? '#7a5a48', 'stone');
}

/** Water well with a little roof and windlass. */
export function well(b: Batch, o: Place & { r?: number; color?: ColorLike; roofColor?: ColorLike }) {
  const place = placer(o);
  const r = o.r ?? 0.3;
  b.add(place(cyl(r, r, 0.3, 14, true)), o.color ?? '#b7a68a', 'stone');
  b.add(place(at(torus(r, 0.04, 6, 18), 0, 0.3, 0)), o.color ?? '#b7a68a', 'stone');
  for (const s of [-1, 1]) b.add(place(at(box(0.04, 0.7, 0.04), s * r, 0, 0)), '#4f3c2c', 'wood');
  b.add(place(at(cyl(0.025, 0.025, r * 2.1, 6), 0, 0.55, 0, { rz: Math.PI / 2 })), '#4f3c2c', 'wood');
  b.add(place(at(gableRoof(r * 2.4, r * 1.8, 0.25, 0.04), 0, 0.7, 0)), o.roofColor ?? '#8d4b33', 'ceramic');
}

/** Statue on a plinth: an abstract figure (column of stacked solids). */
export function statue(b: Batch, o: Place & { h?: number; color?: ColorLike; finish?: Finish; plinthColor?: ColorLike }) {
  const place = placer(o);
  const h = o.h ?? 1;
  b.add(place(box(h * 0.4, h * 0.35, h * 0.4)), o.plinthColor ?? '#d7ccb8', 'stone');
  const c = o.color ?? '#8a6a3c';
  const f = o.finish ?? 'bronze';
  b.add(place(at(cyl(h * 0.09, h * 0.13, h * 0.38, 8), 0, h * 0.35, 0)), c, f);
  b.add(place(at(cyl(h * 0.11, h * 0.08, h * 0.2, 8), 0, h * 0.73, 0)), c, f);
  b.add(place(at(sphere(h * 0.07, 8, 6), 0, h * 0.99, 0)), c, f);
  b.add(place(strut([h * 0.08, h * 0.88, 0], [h * 0.2, h * 1.05, 0.02], h * 0.025, 5)), c, f);
}

/** Fountain: stepped basin + jet column. Pair with fx.fountainJets for spray. */
export function fountain(b: Batch, o: Place & { r?: number; color?: ColorLike }) {
  const place = placer(o);
  const r = o.r ?? 0.8;
  const c = o.color ?? '#d9cdb7';
  b.add(place(lathe([[r, 0], [r, 0.25], [r * 0.92, 0.25], [r * 0.92, 0.1], [0.01, 0.1]], 28)), c, 'stone');
  b.add(place(at(cyl(r * 0.08, r * 0.1, r * 0.6, 10), 0, 0.1, 0)), c, 'stone');
  b.add(place(at(lathe([[r * 0.35, 0], [r * 0.38, 0.08], [r * 0.3, 0.1], [0.01, 0.04]], 20), 0, r * 0.68, 0)), c, 'stone');
}

/** Merge helper exposed for convenience (re-export). */
export { merge };

/** A cluster of houses on a square plot, packed with small random variation. */
export function block(b: Batch, o: Place & {
  w: number; d: number; rng: RNG; minH?: number; maxH?: number;
  walls?: ColorLike[]; roofs?: ColorLike[]; roof?: RoofKind | RoofKind[]; lit?: number; cell?: number;
}) {
  const cell = o.cell ?? 1.3;
  const nx = Math.max(1, Math.floor(o.w / cell));
  const nz = Math.max(1, Math.floor(o.d / cell));
  const cw = o.w / nx, cd = o.d / nz;
  const ry = o.ry ?? 0;
  const cos = Math.cos(ry), sin = Math.sin(ry);
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nz; j++) {
      if (i > 0 && i < nx - 1 && j > 0 && j < nz - 1 && o.rng.chance(0.5)) continue; // courtyards
      const lx = -o.w / 2 + (i + 0.5) * cw, lz = -o.d / 2 + (j + 0.5) * cd;
      const x = (o.x ?? 0) + lx * cos + lz * sin;
      const z = (o.z ?? 0) - lx * sin + lz * cos;
      const roofs = Array.isArray(o.roof) ? o.roof : [o.roof ?? 'gable'];
      house(b, {
        x, z, y: o.y, ry: ry + (o.rng.chance(0.5) ? 0 : Math.PI / 2),
        w: cw * o.rng.float(0.78, 0.96), d: cd * o.rng.float(0.78, 0.96),
        h: o.rng.float(o.minH ?? 0.9, o.maxH ?? 2.2),
        roof: o.rng.pick(roofs),
        wall: o.rng.pick(o.walls ?? ['#e8dcc4', '#dccbb0', '#efe4cf', '#d8c2a2']),
        roofColor: o.rng.pick(o.roofs ?? ['#a24f35', '#8f4630', '#b0623f']),
        lit: o.lit ?? 0, rng: o.rng,
      });
    }
  }
}

/** Utility: a strut between points added to a batch. */
export function timber(b: Batch, a: [number, number, number], c: [number, number, number], r: number, color: ColorLike, fin: Finish = 'wood') {
  b.add(strut(a, c, r, 6), color, fin);
}
