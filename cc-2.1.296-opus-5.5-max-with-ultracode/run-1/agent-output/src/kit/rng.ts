// Seeded randomness. Every city gets its own deterministic RNG so that a city
// always looks the same, in the atlas thumbnails, in screenshots and in the journey.

export function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export class RNG {
  private s: number;

  constructor(seed: number | string = 1) {
    this.s = (typeof seed === 'string' ? hashString(seed) : seed >>> 0) || 0x9e3779b9;
  }

  /** Uniform float in [0, 1). mulberry32. */
  next(): number {
    let t = (this.s = (this.s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Uniform float in [a, b). */
  float(a = 0, b = 1): number {
    return a + (b - a) * this.next();
  }

  /** Alias of float(a, b). */
  range(a: number, b: number): number {
    return a + (b - a) * this.next();
  }

  /** Uniform integer in [a, b] (inclusive). */
  int(a: number, b: number): number {
    return Math.floor(a + (b - a + 1) * this.next());
  }

  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  /** Weighted pick: weights need not sum to 1. */
  weighted<T>(items: readonly T[], weights: readonly number[]): T {
    let total = 0;
    for (const w of weights) total += w;
    let r = this.next() * total;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i];
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  sign(): 1 | -1 {
    return this.next() < 0.5 ? -1 : 1;
  }

  /** Normal distribution (Box-Muller). */
  gauss(mean = 0, sd = 1): number {
    const u = 1 - this.next();
    const v = this.next();
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  angle(): number {
    return this.next() * Math.PI * 2;
  }

  /** Uniform point in a disc of radius r: [x, z]. */
  inDisc(r: number): [number, number] {
    const a = this.angle();
    const d = Math.sqrt(this.next()) * r;
    return [Math.cos(a) * d, Math.sin(a) * d];
  }

  /** Uniform point in an annulus between r0 and r1: [x, z]. */
  inRing(r0: number, r1: number): [number, number] {
    const a = this.angle();
    const d = Math.sqrt(this.float(r0 * r0, r1 * r1));
    return [Math.cos(a) * d, Math.sin(a) * d];
  }

  /** Uniform direction on the unit sphere: [x, y, z]. */
  onSphere(): [number, number, number] {
    const z = this.float(-1, 1);
    const a = this.angle();
    const r = Math.sqrt(1 - z * z);
    return [r * Math.cos(a), z, r * Math.sin(a)];
  }

  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      const t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
    return arr;
  }

  /** Derive an independent generator (stable for a given label). */
  fork(label: string | number): RNG {
    return new RNG((hashString(String(label)) ^ Math.floor(this.next() * 4294967296)) >>> 0);
  }
}
